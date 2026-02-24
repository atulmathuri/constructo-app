import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    original_price?: number;
    image: string;
    rating: number;
    review_count: number;
    brand?: string;
  };
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={COLORS.star} />
          <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
          <Text style={styles.reviews}>({product.review_count})</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{"\u20B9"}{product.price.toLocaleString('en-IN')}</Text>
          {product.original_price && (
            <Text style={styles.originalPrice}>
              {"\u20B9"}{product.original_price.toLocaleString('en-IN')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    width: '48%',
    marginBottom: 16,
    ...SHADOWS.small,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.lightGray,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    padding: 12,
  },
  brand: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rating: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 4,
  },
  reviews: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
});
