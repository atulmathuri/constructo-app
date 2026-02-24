import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, ShippingAddress } from '../src/api/orders';
import { paymentsApi } from '../src/api/payments';
import { useCartStore } from '../src/store/cartStore';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('razorpay');
  const [address, setAddress] = useState<ShippingAddress>({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const shippingFee = total > 5000 ? 0 : 99;
  const grandTotal = total + shippingFee;

  const validateAddress = () => {
    if (!address.full_name || !address.phone || !address.address_line1 || 
        !address.city || !address.state || !address.pincode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (address.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }

    if (address.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return false;
    }

    return true;
  };

  const handleRazorpayPayment = async (orderId: string) => {
    try {
      // Create Razorpay order
      const razorpayOrder = await paymentsApi.createRazorpayOrder(grandTotal);
      
      // Check if we're on web or native
      if (Platform.OS === 'web') {
        // For web, use Razorpay checkout.js
        const options = {
          key: razorpayOrder.key_id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Constructo',
          description: 'Construction Materials Purchase',
          order_id: razorpayOrder.razorpay_order_id,
          handler: async function (response: any) {
            try {
              // Verify payment
              await paymentsApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: orderId,
              });
              
              clearCart();
              Alert.alert(
                'Payment Successful!',
                `Your order #${orderId.slice(0, 8)} has been placed successfully.`,
                [
                  {
                    text: 'View Order',
                    onPress: () => router.replace(`/order/${orderId}`),
                  },
                ]
              );
            } catch (error) {
              console.log('Payment verification failed:', error);
              Alert.alert('Payment Verification Failed', 'Please contact support.');
            }
          },
          prefill: {
            name: address.full_name,
            contact: address.phone,
          },
          theme: {
            color: COLORS.primary,
          },
        };
        
        // Load Razorpay script and open checkout
        if (typeof window !== 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => {
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          };
          document.body.appendChild(script);
        }
      } else {
        // For native, use react-native-razorpay
        try {
          const RazorpayCheckout = require('react-native-razorpay').default;
          
          const options = {
            description: 'Construction Materials Purchase',
            image: 'https://constructor-app.preview.emergentagent.com/icon.png',
            currency: razorpayOrder.currency,
            key: razorpayOrder.key_id,
            amount: razorpayOrder.amount,
            name: 'Constructo',
            order_id: razorpayOrder.razorpay_order_id,
            prefill: {
              contact: address.phone,
              name: address.full_name,
            },
            theme: { color: COLORS.primary },
          };
          
          const response = await RazorpayCheckout.open(options);
          
          // Verify payment
          await paymentsApi.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            order_id: orderId,
          });
          
          clearCart();
          Alert.alert(
            'Payment Successful!',
            `Your order #${orderId.slice(0, 8)} has been placed successfully.`,
            [
              {
                text: 'View Order',
                onPress: () => router.replace(`/order/${orderId}`),
              },
            ]
          );
        } catch (error: any) {
          console.log('Razorpay error:', error);
          if (error.code !== 'PAYMENT_CANCELLED') {
            Alert.alert('Payment Failed', error.description || 'Something went wrong');
          }
        }
      }
    } catch (error) {
      console.log('Error creating Razorpay order:', error);
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;

    try {
      setLoading(true);
      
      // Create order first
      const order = await ordersApi.createOrder({
        shipping_address: address,
        payment_method: paymentMethod,
      });
      
      if (paymentMethod === 'razorpay') {
        // Handle Razorpay payment
        await handleRazorpayPayment(order.id);
      } else {
        // COD - order already created
        clearCart();
        Alert.alert(
          'Order Placed!',
          `Your order #${order.id.slice(0, 8)} has been placed successfully.`,
          [
            {
              text: 'View Order',
              onPress: () => router.replace(`/order/${order.id}`),
            },
          ]
        );
      }
    } catch (error: any) {
      console.log('Error placing order:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Shipping Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={18} color={COLORS.primary} /> Shipping Address
            </Text>
            <View style={styles.formCard}>
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                placeholderTextColor={COLORS.gray}
                value={address.full_name}
                onChangeText={(text) => setAddress({ ...address, full_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number *"
                placeholderTextColor={COLORS.gray}
                value={address.phone}
                onChangeText={(text) => setAddress({ ...address, phone: text })}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="Address Line 1 *"
                placeholderTextColor={COLORS.gray}
                value={address.address_line1}
                onChangeText={(text) => setAddress({ ...address, address_line1: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Address Line 2 (Optional)"
                placeholderTextColor={COLORS.gray}
                value={address.address_line2 || ''}
                onChangeText={(text) => setAddress({ ...address, address_line2: text })}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="City *"
                  placeholderTextColor={COLORS.gray}
                  value={address.city}
                  onChangeText={(text) => setAddress({ ...address, city: text })}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="State *"
                  placeholderTextColor={COLORS.gray}
                  value={address.state}
                  onChangeText={(text) => setAddress({ ...address, state: text })}
                />
              </View>
              <TextInput
                style={[styles.input, { width: '50%' }]}
                placeholder="Pincode *"
                placeholderTextColor={COLORS.gray}
                value={address.pincode}
                onChangeText={(text) => setAddress({ ...address, pincode: text })}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="wallet" size={18} color={COLORS.primary} /> Payment Method
            </Text>
            <View style={styles.paymentCard}>
              {/* Razorpay Option */}
              <TouchableOpacity 
                style={styles.paymentOption}
                onPress={() => setPaymentMethod('razorpay')}
              >
                <View style={paymentMethod === 'razorpay' ? styles.radioSelected : styles.radio}>
                  {paymentMethod === 'razorpay' && <View style={styles.radioInner} />}
                </View>
                <Ionicons name="card-outline" size={24} color={COLORS.primary} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Pay Online</Text>
                  <Text style={styles.paymentSubtitle}>UPI, Cards, Net Banking, Wallets</Text>
                </View>
                <View style={styles.razorpayBadge}>
                  <Text style={styles.razorpayText}>Razorpay</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.paymentDivider} />

              {/* COD Option */}
              <TouchableOpacity 
                style={styles.paymentOption}
                onPress={() => setPaymentMethod('cod')}
              >
                <View style={paymentMethod === 'cod' ? styles.radioSelected : styles.radio}>
                  {paymentMethod === 'cod' && <View style={styles.radioInner} />}
                </View>
                <Ionicons name="cash-outline" size={24} color={COLORS.success} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtitle}>Pay when you receive</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="receipt" size={18} color={COLORS.primary} /> Order Summary
            </Text>
            <View style={styles.summaryCard}>
              {items.map((item) => (
                <View key={item.product_id} style={styles.orderItem}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>
                    {"\u20B9"}{(item.product.price * item.quantity).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{"\u20B9"}{total.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={[styles.summaryValue, shippingFee === 0 && styles.freeText]}>
                  {shippingFee === 0 ? 'FREE' : `\u20B9${shippingFee}`}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{"\u20B9"}{grandTotal.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Place Order Button */}
        <View style={styles.bottomContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.bottomTotalLabel}>Total</Text>
            <Text style={styles.bottomTotalValue}>{"\u20B9"}{grandTotal.toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, loading && styles.disabledBtn]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.placeOrderText}>
                {paymentMethod === 'razorpay' ? 'Pay Now' : 'Place Order'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
  },
  shopButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    marginTop: 24,
  },
  shopButtonText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
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
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: SIZES.md,
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  paymentSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
  },
  razorpayBadge: {
    backgroundColor: '#072654',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  razorpayText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    ...SHADOWS.small,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.text.secondary,
  },
  itemQty: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 12,
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
  totalContainer: {
    marginRight: 16,
  },
  bottomTotalLabel: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
  },
  bottomTotalValue: {
    fontSize: SIZES.xl,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  placeOrderBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.radiusLg,
    alignItems: 'center',
  },
  placeOrderText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
