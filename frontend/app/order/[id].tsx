import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, Order } from '../../src/api/orders';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return COLORS.warning;
    case 'confirmed':
      return COLORS.primary;
    case 'shipped':
      return '#3B82F6';
    case 'delivered':
      return COLORS.success;
    case 'cancelled':
      return COLORS.error;
    default:
      return COLORS.gray;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getOrder(id as string);
      setOrder(data);
    } catch (error) {
      console.log('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const steps = ['pending', 'confirmed', 'shipped', 'delivered'];
  const currentStep = steps.indexOf(order.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order ID & Status */}
        <View style={styles.section}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.orderDate}>Placed on {formatDate(order.created_at)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Progress */}
        {order.status !== 'cancelled' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Progress</Text>
            <View style={styles.progressContainer}>
              {steps.map((step, index) => (
                <View key={step} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    index <= currentStep && styles.progressDotActive,
                  ]}>
                    {index <= currentStep && (
                      <Ionicons name="checkmark" size={14} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={[
                    styles.progressLabel,
                    index <= currentStep && styles.progressLabelActive,
                  ]}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </Text>
                  {index < steps.length - 1 && (
                    <View style={[
                      styles.progressLine,
                      index < currentStep && styles.progressLineActive,
                    ]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          <View style={styles.itemsCard}>
            {order.items.map((item, index) => (
              <View
                key={item.product_id}
                style={[
                  styles.orderItem,
                  index < order.items.length - 1 && styles.itemBorder,
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {"\u20B9"}{(item.price * item.quantity).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{order.shipping_address.full_name}</Text>
              <Text style={styles.addressPhone}>{order.shipping_address.phone}</Text>
              <Text style={styles.addressText}>
                {order.shipping_address.address_line1}
                {order.shipping_address.address_line2 && `, ${order.shipping_address.address_line2}`}
              </Text>
              <Text style={styles.addressText}>
                {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentCard}>
            <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            <Text style={styles.paymentText}>Cash on Delivery</Text>
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Details</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {"\u20B9"}{order.subtotal.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={[styles.summaryValue, order.shipping_fee === 0 && styles.freeText]}>
                {order.shipping_fee === 0 ? 'FREE' : `\u20B9${order.shipping_fee}`}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {"\u20B9"}{order.total.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Need Help */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.helpCard}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.helpText}>Need help with this order?</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: SIZES.radiusLg,
    ...SHADOWS.small,
  },
  orderId: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  orderDate: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: SIZES.radiusLg,
    ...SHADOWS.small,
  },
  progressStep: {
    alignItems: 'center',
    position: 'relative',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: COLORS.success,
  },
  progressLabel: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
  },
  progressLabelActive: {
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  progressLine: {
    position: 'absolute',
    top: 14,
    left: 28,
    width: 50,
    height: 2,
    backgroundColor: COLORS.lightGray,
  },
  progressLineActive: {
    backgroundColor: COLORS.success,
  },
  itemsCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  itemQty: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
  },
  itemPrice: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  addressInfo: {
    marginLeft: 12,
    flex: 1,
  },
  addressName: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  addressPhone: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    marginTop: 2,
  },
  addressText: {
    fontSize: SIZES.sm,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  paymentText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: SIZES.md,
    color: COLORS.gray,
  },
  summaryValue: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  freeText: {
    color: COLORS.success,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  totalValue: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  helpText: {
    flex: 1,
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 12,
  },
});
