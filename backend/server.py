from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import hashlib
import secrets
import razorpay
import hmac

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'constructo_db')]

# Razorpay client
razorpay_client = razorpay.Client(
    auth=(os.environ.get('RAZORPAY_KEY_ID', ''), os.environ.get('RAZORPAY_KEY_SECRET', ''))
)

# Create the main app
app = FastAPI(title="Constructo API", description="E-commerce API for construction materials")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(BaseModel):
    user: User
    token: str

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    image: str
    description: Optional[str] = None

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category: str
    sku: str
    image: str
    images: List[str] = []
    rating: float = 0.0
    review_count: int = 0
    stock: int = 100
    brand: Optional[str] = None
    specifications: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class CartItemResponse(BaseModel):
    product_id: str
    quantity: int
    product: Optional[Product] = None

class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    price: float
    quantity: int

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str

class OrderCreate(BaseModel):
    shipping_address: ShippingAddress
    payment_method: str = "cod"  # cod = Cash on Delivery

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[OrderItem]
    shipping_address: ShippingAddress
    payment_method: str
    subtotal: float
    shipping_fee: float = 0.0
    total: float
    status: str = "pending"  # pending, confirmed, shipped, delivered, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    token = credentials.credentials
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    user = await db.users.find_one({"id": session["user_id"]})
    return user

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone
    )
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)
    await db.users.insert_one(user_dict)
    
    # Create session
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user.id,
        "created_at": datetime.utcnow()
    })
    
    return UserResponse(user=user, token=token)

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or user.get("password_hash") != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user["id"],
        "created_at": datetime.utcnow()
    })
    
    return UserResponse(
        user=User(**{k: v for k, v in user.items() if k != "password_hash"}),
        token=token
    )

@api_router.post("/auth/logout")
async def logout(user: dict = Depends(require_auth), credentials: HTTPAuthorizationCredentials = Depends(security)):
    await db.sessions.delete_one({"token": credentials.credentials})
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=User)
async def get_me(user: dict = Depends(require_auth)):
    return User(**{k: v for k, v in user.items() if k != "password_hash"})

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(100)
    return [Category(**cat) for cat in categories]

# ==================== PRODUCT ENDPOINTS ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = "created_at",
    limit: int = 50
):
    query = {}
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}}
        ]
    
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    
    sort_field = sort_by if sort_by in ["price", "rating", "created_at", "name"] else "created_at"
    sort_order = -1 if sort_field in ["rating", "created_at"] else 1
    
    products = await db.products.find(query).sort(sort_field, sort_order).limit(limit).to_list(limit)
    return [Product(**prod) for prod in products]

@api_router.get("/products/featured", response_model=List[Product])
async def get_featured_products():
    products = await db.products.find().sort("rating", -1).limit(8).to_list(8)
    return [Product(**prod) for prod in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

# ==================== CART ENDPOINTS ====================

@api_router.get("/cart")
async def get_cart(user: dict = Depends(require_auth)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        return {"items": [], "total": 0}
    
    # Get product details for each item
    items_with_products = []
    total = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]})
        if product:
            items_with_products.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "product": Product(**product).dict()
            })
            total += product["price"] * item["quantity"]
    
    return {"items": items_with_products, "total": total}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: dict = Depends(require_auth)):
    # Verify product exists
    product = await db.products.find_one({"id": item.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await db.carts.find_one({"user_id": user["id"]})
    
    if not cart:
        # Create new cart
        cart = Cart(user_id=user["id"], items=[item])
        await db.carts.insert_one(cart.dict())
    else:
        # Update existing cart
        existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
        
        if existing_item:
            # Update quantity
            await db.carts.update_one(
                {"user_id": user["id"], "items.product_id": item.product_id},
                {"$set": {"items.$.quantity": existing_item["quantity"] + item.quantity, "updated_at": datetime.utcnow()}}
            )
        else:
            # Add new item
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": item.dict()}, "$set": {"updated_at": datetime.utcnow()}}
            )
    
    return {"message": "Item added to cart"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, user: dict = Depends(require_auth)):
    if item.quantity <= 0:
        # Remove item
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$pull": {"items": {"product_id": item.product_id}}, "$set": {"updated_at": datetime.utcnow()}}
        )
    else:
        # Update quantity
        await db.carts.update_one(
            {"user_id": user["id"], "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity, "updated_at": datetime.utcnow()}}
        )
    
    return {"message": "Cart updated"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(require_auth)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": {"product_id": product_id}}, "$set": {"updated_at": datetime.utcnow()}}
    )
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(user: dict = Depends(require_auth)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$set": {"items": [], "updated_at": datetime.utcnow()}}
    )
    return {"message": "Cart cleared"}

# ==================== ORDER ENDPOINTS ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user: dict = Depends(require_auth)):
    # Get cart
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Build order items
    order_items = []
    subtotal = 0
    
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]})
        if product:
            order_items.append(OrderItem(
                product_id=item["product_id"],
                product_name=product["name"],
                price=product["price"],
                quantity=item["quantity"]
            ))
            subtotal += product["price"] * item["quantity"]
    
    # Calculate shipping (free for orders > 5000)
    shipping_fee = 0 if subtotal > 5000 else 99
    
    # Create order
    order = Order(
        user_id=user["id"],
        items=order_items,
        shipping_address=order_data.shipping_address,
        payment_method=order_data.payment_method,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total=subtotal + shipping_fee
    )
    
    await db.orders.insert_one(order.dict())
    
    # Clear cart
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$set": {"items": [], "updated_at": datetime.utcnow()}}
    )
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user: dict = Depends(require_auth)):
    orders = await db.orders.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user: dict = Depends(require_auth)):
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

# ==================== RAZORPAY PAYMENT ENDPOINTS ====================

class CreateRazorpayOrderRequest(BaseModel):
    amount: float  # Amount in INR (will be converted to paise)

class RazorpayOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int  # Amount in paise
    currency: str
    key_id: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str  # Our internal order ID

@api_router.post("/payments/create-order", response_model=RazorpayOrderResponse)
async def create_razorpay_order(request: CreateRazorpayOrderRequest, user: dict = Depends(require_auth)):
    """Create a Razorpay order for payment"""
    try:
        # Convert to paise (Razorpay uses paise)
        amount_in_paise = int(request.amount * 100)
        
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "payment_capture": 1  # Auto capture payment
        })
        
        # Store payment record
        await db.payments.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "razorpay_order_id": razorpay_order["id"],
            "amount": amount_in_paise,
            "currency": "INR",
            "status": "created",
            "created_at": datetime.utcnow()
        })
        
        return RazorpayOrderResponse(
            razorpay_order_id=razorpay_order["id"],
            amount=amount_in_paise,
            currency="INR",
            key_id=os.environ.get('RAZORPAY_KEY_ID', '')
        )
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

@api_router.post("/payments/verify")
async def verify_payment(request: VerifyPaymentRequest, user: dict = Depends(require_auth)):
    """Verify Razorpay payment signature and update order status"""
    try:
        # Verify signature
        key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
        message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
        
        generated_signature = hmac.new(
            key_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != request.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Update payment record
        await db.payments.update_one(
            {"razorpay_order_id": request.razorpay_order_id},
            {"$set": {
                "razorpay_payment_id": request.razorpay_payment_id,
                "razorpay_signature": request.razorpay_signature,
                "status": "paid",
                "paid_at": datetime.utcnow()
            }}
        )
        
        # Update order status to confirmed
        await db.orders.update_one(
            {"id": request.order_id, "user_id": user["id"]},
            {"$set": {
                "status": "confirmed",
                "payment_method": "razorpay",
                "razorpay_payment_id": request.razorpay_payment_id,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Payment verified successfully", "status": "paid"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@api_router.get("/payments/key")
async def get_razorpay_key():
    """Get Razorpay key ID for frontend"""
    return {"key_id": os.environ.get('RAZORPAY_KEY_ID', '')}

# ==================== REVIEW ENDPOINTS ====================

@api_router.get("/products/{product_id}/reviews", response_model=List[Review])
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}).sort("created_at", -1).to_list(100)
    return [Review(**review) for review in reviews]

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, user: dict = Depends(require_auth)):
    # Check if product exists
    product = await db.products.find_one({"id": review_data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    review = Review(
        product_id=review_data.product_id,
        user_id=user["id"],
        user_name=user["name"],
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.dict())
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review_data.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one(
        {"id": review_data.product_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    return review

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    # Check if already seeded
    existing = await db.products.find_one()
    if existing:
        return {"message": "Database already seeded"}
    
    # Seed categories
    categories = [
        Category(id="cat-power-tools", name="Power Tools", image="https://images.pexels.com/photos/30486981/pexels-photo-30486981.jpeg?w=800", description="Professional grade power tools"),
        Category(id="cat-paints", name="Paints", image="https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?w=800", description="Interior and exterior paints"),
        Category(id="cat-hand-tools", name="Hand Tools", image="https://images.pexels.com/photos/46793/taps-thread-drill-milling-46793.jpeg?w=800", description="Manual hand tools"),
        Category(id="cat-electrical", name="Electrical", image="https://images.unsplash.com/photo-1551868561-f2cdee310ecf?w=800", description="Electrical supplies"),
        Category(id="cat-plumbing", name="Plumbing", image="https://images.pexels.com/photos/830899/pexels-photo-830899.jpeg?w=800", description="Plumbing materials"),
        Category(id="cat-building", name="Building Materials", image="https://images.unsplash.com/photo-1585646578973-cbcf2dfd0c8c?w=800", description="Construction materials"),
    ]
    
    for cat in categories:
        await db.categories.insert_one(cat.dict())
    
    # Seed products
    products = [
        Product(
            name="Bosch Professional Impact Drill",
            description="750W powerful impact drill perfect for heavy duty drilling in concrete, wood and metal. Features variable speed control and reverse function.",
            price=8999,
            original_price=10999,
            category="Power Tools",
            sku="BOSCH-ID-750",
            brand="Bosch",
            image="https://images.unsplash.com/photo-1551868561-7b006235bf22?w=800",
            rating=4.8,
            review_count=45,
            stock=25
        ),
        Product(
            name="Asian Paints Royal Luxury Emulsion",
            description="Premium interior wall paint with superior coverage and washable finish. Low VOC formula for healthier indoor air quality.",
            price=3499,
            original_price=3999,
            category="Paints",
            sku="AP-RLE-20L",
            brand="Asian Paints",
            image="https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?w=800",
            rating=4.7,
            review_count=28,
            stock=50
        ),
        Product(
            name="Stanley Screwdriver Set 6 Piece",
            description="Professional 6-piece screwdriver set with ergonomic handles. Includes Phillips and flathead screwdrivers in various sizes.",
            price=899,
            original_price=1199,
            category="Hand Tools",
            sku="STN-SD-6PC",
            brand="Stanley",
            image="https://images.unsplash.com/photo-1585646578973-cbcf2dfd0c8c?w=800",
            rating=4.3,
            review_count=15,
            stock=100
        ),
        Product(
            name="Makita Angle Grinder 900W",
            description="Heavy duty 900W angle grinder with 100mm disc. Features anti-vibration handle and spindle lock for easy disc changes.",
            price=5499,
            original_price=6499,
            category="Power Tools",
            sku="MKT-AG-900",
            brand="Makita",
            image="https://images.unsplash.com/photo-1562886350-d59f89f568ac?w=800",
            rating=4.8,
            review_count=18,
            stock=30
        ),
        Product(
            name="Berger Weathercoat Exterior Paint",
            description="All weather exterior paint with 7 year warranty. Excellent protection against rain, sun and pollution.",
            price=4299,
            original_price=4999,
            category="Paints",
            sku="BGR-WC-20L",
            brand="Berger",
            image="https://images.pexels.com/photos/1887946/pexels-photo-1887946.jpeg?w=800",
            rating=4.5,
            review_count=31,
            stock=40
        ),
        Product(
            name="Century Plyboards - Marine Grade",
            description="8x4 ft marine grade plywood, waterproof and termite resistant. Ideal for kitchen cabinets and bathrooms.",
            price=4850,
            original_price=5500,
            category="Building Materials",
            sku="CPLY-MR-8X4",
            brand="Century",
            image="https://images.unsplash.com/photo-1585646578973-cbcf2dfd0c8c?w=800",
            rating=4.6,
            review_count=9,
            stock=20
        ),
        Product(
            name="Jaquar Ceramic Wall Tiles",
            description="Premium ceramic wall tiles 30x60cm. Glossy finish with elegant design, suitable for bathrooms and kitchens.",
            price=1850,
            original_price=2200,
            category="Building Materials",
            sku="JQR-WT-3060",
            brand="Jaquar",
            image="https://images.pexels.com/photos/7578995/pexels-photo-7578995.jpeg?w=800",
            rating=4.4,
            review_count=22,
            stock=200
        ),
        Product(
            name="Havells MCB 32A Single Pole",
            description="Miniature circuit breaker 32 Amp single pole. ISI marked with high breaking capacity for residential use.",
            price=349,
            original_price=450,
            category="Electrical",
            sku="HVL-MCB-32A",
            brand="Havells",
            image="https://images.unsplash.com/photo-1551868561-f2cdee310ecf?w=800",
            rating=4.6,
            review_count=67,
            stock=500
        ),
        Product(
            name="Finolex FR Cable 2.5 sqmm",
            description="Fire retardant house wire 2.5 sqmm, 90 meters coil. ISI marked with high conductivity copper.",
            price=3299,
            original_price=3800,
            category="Electrical",
            sku="FNX-FR-25",
            brand="Finolex",
            image="https://images.unsplash.com/photo-1551868561-f2cdee310ecf?w=800",
            rating=4.7,
            review_count=89,
            stock=150
        ),
        Product(
            name="Cera Wall Hung Commode",
            description="Premium wall hung toilet with soft close seat. Contemporary design with dual flush mechanism.",
            price=12999,
            original_price=15000,
            category="Plumbing",
            sku="CERA-WHC-01",
            brand="Cera",
            image="https://images.pexels.com/photos/830899/pexels-photo-830899.jpeg?w=800",
            rating=4.7,
            review_count=14,
            stock=8
        ),
        Product(
            name="Taparia Combination Plier",
            description="8 inch combination plier with insulated handle. Heat treated jaws for durability.",
            price=299,
            original_price=399,
            category="Hand Tools",
            sku="TAP-CP-8",
            brand="Taparia",
            image="https://images.unsplash.com/photo-1585646578973-cbcf2dfd0c8c?w=800",
            rating=4.2,
            review_count=42,
            stock=200
        ),
        Product(
            name="Dewalt Cordless Drill 18V",
            description="Powerful 18V cordless drill with lithium-ion battery. Two speed gearbox with LED work light.",
            price=11999,
            original_price=13999,
            category="Power Tools",
            sku="DWT-CD-18V",
            brand="Dewalt",
            image="https://images.unsplash.com/photo-1551868561-7b006235bf22?w=800",
            rating=4.9,
            review_count=56,
            stock=15
        ),
    ]
    
    for prod in products:
        await db.products.insert_one(prod.dict())
    
    return {"message": "Database seeded successfully", "categories": len(categories), "products": len(products)}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Constructo API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
