import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

interface CartItemCardProps {
  item: {
    product_id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
      image: string;
      brand?: string;
    };
  };
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: item.product.image }} style={styles.image} />
      <View style={styles.info}>
        {item.product.brand && <Text style={styles.brand}>{item.product.brand}</Text>}
        <Text style={styles.name} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.price}>
          {"\u20B9"}{item.product.price.toLocaleString('en-IN')}
        </Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => onUpdateQuantity(item.quantity - 1)}
          >
            <Ionicons name="remove" size={18} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => onUpdateQuantity(item.quantity + 1)}
          >
            <Ionicons name="add" size={18} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.lightGray,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  brand: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  price: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  removeBtn: {
    padding: 8,
  },
});
