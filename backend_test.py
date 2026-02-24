#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

# API Base URL from frontend environment
API_BASE_URL = "https://constructor-app.preview.emergentagent.com/api"

class ConstructoAPITester:
    def __init__(self):
        self.base_url = API_BASE_URL
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        self.products = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
            
        except requests.exceptions.Timeout:
            return None, "Request timeout"
        except requests.exceptions.ConnectionError:
            return None, "Connection error"
        except Exception as e:
            return None, str(e)
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if self.auth_token:
            return {"Authorization": f"Bearer {self.auth_token}"}
        return {}
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = self.make_request('GET', '/health')
        
        if isinstance(response, tuple):
            self.log_result("Health Check", False, response[1])
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'healthy':
                self.log_result("Health Check", True, "API is healthy")
                return True
            else:
                self.log_result("Health Check", False, f"Unexpected response: {data}")
        else:
            self.log_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
        
        return False
    
    def test_categories_api(self):
        """Test categories API"""
        response = self.make_request('GET', '/categories')
        
        if isinstance(response, tuple):
            self.log_result("Categories API", False, response[1])
            return False
            
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("Categories API", True, f"Retrieved {len(data)} categories")
                return True
            else:
                self.log_result("Categories API", False, f"No categories found or invalid format: {data}")
        else:
            self.log_result("Categories API", False, f"HTTP {response.status_code}: {response.text}")
        
        return False
    
    def test_products_api(self):
        """Test products API endpoints"""
        success_count = 0
        total_tests = 5
        
        # Test 1: Get all products
        response = self.make_request('GET', '/products')
        if isinstance(response, tuple):
            self.log_result("Products API - List All", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.products = data  # Store for later use
                self.log_result("Products API - List All", True, f"Retrieved {len(data)} products")
                success_count += 1
            else:
                self.log_result("Products API - List All", False, f"No products found: {data}")
        else:
            self.log_result("Products API - List All", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 2: Filter by category
        response = self.make_request('GET', '/products', params={'category': 'Power Tools'})
        if isinstance(response, tuple):
            self.log_result("Products API - Filter Category", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                filtered_products = [p for p in data if p.get('category') == 'Power Tools']
                if len(filtered_products) > 0:
                    self.log_result("Products API - Filter Category", True, f"Found {len(filtered_products)} Power Tools")
                    success_count += 1
                else:
                    self.log_result("Products API - Filter Category", True, "No Power Tools found (acceptable)")
                    success_count += 1
            else:
                self.log_result("Products API - Filter Category", False, f"Invalid response format: {data}")
        else:
            self.log_result("Products API - Filter Category", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 3: Search products
        response = self.make_request('GET', '/products', params={'search': 'drill'})
        if isinstance(response, tuple):
            self.log_result("Products API - Search", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Products API - Search", True, f"Search returned {len(data)} results")
                success_count += 1
            else:
                self.log_result("Products API - Search", False, f"Invalid response format: {data}")
        else:
            self.log_result("Products API - Search", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 4: Featured products
        response = self.make_request('GET', '/products/featured')
        if isinstance(response, tuple):
            self.log_result("Products API - Featured", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Products API - Featured", True, f"Retrieved {len(data)} featured products")
                success_count += 1
            else:
                self.log_result("Products API - Featured", False, f"Invalid response format: {data}")
        else:
            self.log_result("Products API - Featured", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 5: Single product detail
        if self.products:
            product_id = self.products[0]['id']
            response = self.make_request('GET', f'/products/{product_id}')
            if isinstance(response, tuple):
                self.log_result("Products API - Single Product", False, response[1])
            elif response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and data.get('id') == product_id:
                    self.log_result("Products API - Single Product", True, f"Retrieved product: {data.get('name', 'Unknown')}")
                    success_count += 1
                else:
                    self.log_result("Products API - Single Product", False, f"Invalid product data: {data}")
            else:
                self.log_result("Products API - Single Product", False, f"HTTP {response.status_code}: {response.text}")
        else:
            self.log_result("Products API - Single Product", False, "No products available for testing")
        
        return success_count == total_tests
    
    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "email": "testuser@constructo.com",
            "password": "testpass123",
            "name": "Test User",
            "phone": "9876543210"
        }
        
        response = self.make_request('POST', '/auth/register', data=user_data)
        
        if isinstance(response, tuple):
            self.log_result("User Registration", False, response[1])
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get('token') and data.get('user'):
                self.auth_token = data['token']
                self.user_id = data['user']['id']
                self.log_result("User Registration", True, f"User registered successfully: {data['user']['name']}")
                return True
            else:
                self.log_result("User Registration", False, f"Invalid response format: {data}")
        elif response.status_code == 400:
            # User might already exist, try login instead
            return self.test_user_login_existing()
        else:
            self.log_result("User Registration", False, f"HTTP {response.status_code}: {response.text}")
        
        return False
    
    def test_user_login_existing(self):
        """Test login with existing user"""
        login_data = {
            "email": "testuser@constructo.com",
            "password": "testpass123"
        }
        
        response = self.make_request('POST', '/auth/login', data=login_data)
        
        if isinstance(response, tuple):
            self.log_result("User Login (Existing)", False, response[1])
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get('token') and data.get('user'):
                self.auth_token = data['token']
                self.user_id = data['user']['id']
                self.log_result("User Login (Existing)", True, f"Login successful: {data['user']['name']}")
                return True
            else:
                self.log_result("User Login (Existing)", False, f"Invalid response format: {data}")
        else:
            self.log_result("User Login (Existing)", False, f"HTTP {response.status_code}: {response.text}")
        
        return False
    
    def test_user_login(self):
        """Test user login with new credentials"""
        login_data = {
            "email": "testuser@constructo.com",
            "password": "testpass123"
        }
        
        response = self.make_request('POST', '/auth/login', data=login_data)
        
        if isinstance(response, tuple):
            self.log_result("User Login", False, response[1])
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get('token') and data.get('user'):
                self.log_result("User Login", True, f"Login successful: {data['user']['name']}")
                return True
            else:
                self.log_result("User Login", False, f"Invalid response format: {data}")
        else:
            self.log_result("User Login", False, f"HTTP {response.status_code}: {response.text}")
        
        return False
    
    def test_cart_operations(self):
        """Test cart API operations"""
        if not self.auth_token:
            self.log_result("Cart Operations", False, "No auth token available")
            return False
            
        if not self.products:
            self.log_result("Cart Operations", False, "No products available for testing")
            return False
        
        headers = self.get_auth_headers()
        success_count = 0
        total_tests = 5
        
        # Test 1: Get empty cart
        response = self.make_request('GET', '/cart', headers=headers)
        if isinstance(response, tuple):
            self.log_result("Cart - Get Empty", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'items' in data:
                self.log_result("Cart - Get Empty", True, f"Retrieved cart with {len(data['items'])} items")
                success_count += 1
            else:
                self.log_result("Cart - Get Empty", False, f"Invalid cart format: {data}")
        else:
            self.log_result("Cart - Get Empty", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 2: Add item to cart
        product_id = self.products[0]['id']
        cart_item = {
            "product_id": product_id,
            "quantity": 2
        }
        
        response = self.make_request('POST', '/cart/add', data=cart_item, headers=headers)
        if isinstance(response, tuple):
            self.log_result("Cart - Add Item", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if data.get('message'):
                self.log_result("Cart - Add Item", True, "Item added to cart successfully")
                success_count += 1
            else:
                self.log_result("Cart - Add Item", False, f"Unexpected response: {data}")
        else:
            self.log_result("Cart - Add Item", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 3: Get cart with items
        response = self.make_request('GET', '/cart', headers=headers)
        if isinstance(response, tuple):
            self.log_result("Cart - Get With Items", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and len(data.get('items', [])) > 0:
                self.log_result("Cart - Get With Items", True, f"Cart has {len(data['items'])} items, total: ₹{data.get('total', 0)}")
                success_count += 1
            else:
                self.log_result("Cart - Get With Items", False, f"Cart should have items: {data}")
        else:
            self.log_result("Cart - Get With Items", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 4: Update cart item
        update_item = {
            "product_id": product_id,
            "quantity": 3
        }
        
        response = self.make_request('PUT', '/cart/update', data=update_item, headers=headers)
        if isinstance(response, tuple):
            self.log_result("Cart - Update Item", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if data.get('message'):
                self.log_result("Cart - Update Item", True, "Item quantity updated successfully")
                success_count += 1
            else:
                self.log_result("Cart - Update Item", False, f"Unexpected response: {data}")
        else:
            self.log_result("Cart - Update Item", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 5: Remove item from cart
        response = self.make_request('DELETE', f'/cart/remove/{product_id}', headers=headers)
        if isinstance(response, tuple):
            self.log_result("Cart - Remove Item", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if data.get('message'):
                self.log_result("Cart - Remove Item", True, "Item removed from cart successfully")
                success_count += 1
            else:
                self.log_result("Cart - Remove Item", False, f"Unexpected response: {data}")
        else:
            self.log_result("Cart - Remove Item", False, f"HTTP {response.status_code}: {response.text}")
        
        return success_count == total_tests
    
    def test_orders_operations(self):
        """Test orders API operations"""
        if not self.auth_token:
            self.log_result("Orders Operations", False, "No auth token available")
            return False
            
        if not self.products:
            self.log_result("Orders Operations", False, "No products available for testing")
            return False
        
        headers = self.get_auth_headers()
        success_count = 0
        total_tests = 3
        
        # First, add items to cart for order creation
        product_id = self.products[0]['id']
        cart_item = {
            "product_id": product_id,
            "quantity": 2
        }
        
        add_response = self.make_request('POST', '/cart/add', data=cart_item, headers=headers)
        if isinstance(add_response, tuple) or add_response.status_code != 200:
            self.log_result("Orders - Setup Cart", False, "Failed to add items to cart for order test")
            return False
        
        # Test 1: Create order
        order_data = {
            "shipping_address": {
                "full_name": "Raj Kumar",
                "phone": "9876543210",
                "address_line1": "123 Construction Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            },
            "payment_method": "cod"
        }
        
        response = self.make_request('POST', '/orders', data=order_data, headers=headers)
        order_id = None
        
        if isinstance(response, tuple):
            self.log_result("Orders - Create Order", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if data.get('id') and data.get('total'):
                order_id = data['id']
                self.log_result("Orders - Create Order", True, f"Order created successfully: ₹{data['total']}")
                success_count += 1
            else:
                self.log_result("Orders - Create Order", False, f"Invalid order response: {data}")
        else:
            self.log_result("Orders - Create Order", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 2: Get orders list
        response = self.make_request('GET', '/orders', headers=headers)
        if isinstance(response, tuple):
            self.log_result("Orders - List Orders", False, response[1])
        elif response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Orders - List Orders", True, f"Retrieved {len(data)} orders")
                success_count += 1
            else:
                self.log_result("Orders - List Orders", False, f"Invalid orders list format: {data}")
        else:
            self.log_result("Orders - List Orders", False, f"HTTP {response.status_code}: {response.text}")
        
        # Test 3: Get single order
        if order_id:
            response = self.make_request('GET', f'/orders/{order_id}', headers=headers)
            if isinstance(response, tuple):
                self.log_result("Orders - Get Single Order", False, response[1])
            elif response.status_code == 200:
                data = response.json()
                if data.get('id') == order_id:
                    self.log_result("Orders - Get Single Order", True, f"Retrieved order details: {data.get('status', 'unknown status')}")
                    success_count += 1
                else:
                    self.log_result("Orders - Get Single Order", False, f"Order ID mismatch: {data}")
            else:
                self.log_result("Orders - Get Single Order", False, f"HTTP {response.status_code}: {response.text}")
        else:
            self.log_result("Orders - Get Single Order", False, "No order ID available for testing")
        
        return success_count == total_tests
    
    def run_all_tests(self):
        """Run all API tests"""
        print("=" * 60)
        print("CONSTRUCTO.IN BACKEND API TEST SUITE")
        print("=" * 60)
        print(f"Testing API at: {self.base_url}")
        print()
        
        test_results = {}
        
        # Run tests in sequence
        test_results['health'] = self.test_health_check()
        test_results['categories'] = self.test_categories_api()
        test_results['products'] = self.test_products_api()
        test_results['registration'] = self.test_user_registration()
        test_results['login'] = self.test_user_login()
        test_results['cart'] = self.test_cart_operations()
        test_results['orders'] = self.test_orders_operations()
        
        # Print summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
        
        print(f"\nOverall: {passed}/{total} test groups passed")
        
        # Print failed tests details
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print(f"\nFAILED TESTS ({len(failed_tests)}):")
            print("-" * 40)
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['message']}")
                if test.get('details'):
                    print(f"   Details: {test['details']}")
        
        return passed == total

def main():
    """Main test runner"""
    tester = ConstructoAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  SOME TESTS FAILED. Check the details above.")
        sys.exit(1)

if __name__ == "__main__":
    main()