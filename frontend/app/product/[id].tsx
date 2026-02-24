import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi, Product } from '../../src/api/products';
import { cartApi } from '../../src/api/cart';
import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { token } = useAuthStore();
  const { setCart } = useCartStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getProduct(id as string);
      setProduct(data);
    } catch (error) {
      console.log('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!token) {
      Alert.alert('Login Required', 'Please login to add items to cart', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }

    try {
      setAddingToCart(true);
      await cartApi.addToCart(product!.id, quantity);
      const cart = await cartApi.getCart();
      setCart(cart.items, cart.total);
      Alert.alert('Success', 'Item added to cart!');
    } catch (error) {
      console.log('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    if (token) {
      router.push('/checkout');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <Text style={styles.name}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={COLORS.white} />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.reviewCount}>{product.review_count} reviews</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{"\u20B9"}{product.price.toLocaleString('en-IN')}</Text>
            {product.original_price && (
              <Text style={styles.originalPrice}>
                {"\u20B9"}{product.original_price.toLocaleString('en-IN')}
              </Text>
            )}
            {discount > 0 && (
              <Text style={styles.savings}>You save {"\u20B9"}{(product.original_price! - product.price).toLocaleString('en-IN')}</Text>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockRow}>
            {product.stock > 10 ? (
              <View style={[styles.stockBadge, styles.inStock]}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={[styles.stockText, { color: COLORS.success }]}>In Stock</Text>
              </View>
            ) : product.stock > 0 ? (
              <View style={[styles.stockBadge, styles.lowStock]}>
                <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
                <Text style={[styles.stockText, { color: COLORS.warning }]}>Only {product.stock} left</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.outOfStock]}>
                <Ionicons name="close-circle" size={16} color={COLORS.error} />
                <Text style={[styles.stockText, { color: COLORS.error }]}>Out of Stock</Text>
              </View>
            )}
          </View>

          {/* SKU */}
          <Text style={styles.sku}>SKU: {product.sku}</Text>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={18} color={COLORS.success} />
              <Text style={styles.featureText}>Free delivery on orders above \u20B95,000</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={18} color={COLORS.success} />
              <Text style={styles.featureText}>Easy 7 days return policy</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={18} color={COLORS.success} />
              <Text style={styles.featureText}>Cash on Delivery available</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Ionicons name="remove" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
          >
            <Ionicons name="add" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, addingToCart && styles.disabledBtn]}
          onPress={handleAddToCart}
          disabled={addingToCart || product.stock === 0}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="cart-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addToCartText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowBtn, product.stock === 0 && styles.disabledBtn]}
          onPress={handleBuyNow}
          disabled={addingToCart || product.stock === 0}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: SIZES.lg,
    color: COLORS.gray,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.white,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  infoContainer: {
    padding: 16,
  },
  brand: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ratingText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '700',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  price: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: SIZES.lg,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginLeft: 12,
  },
  savings: {
    fontSize: SIZES.sm,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 12,
  },
  stockRow: {
    marginBottom: 8,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inStock: {},
  lowStock: {},
  outOfStock: {},
  stockText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  sku: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: SIZES.md,
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    paddingBottom: 24,
    ...SHADOWS.medium,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    marginRight: 12,
  },
  addToCartText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '700',
    marginLeft: 6,
  },
  buyNowBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  buyNowText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
