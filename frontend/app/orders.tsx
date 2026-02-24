import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, Order } from '../src/api/orders';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

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
    month: 'short',
    year: 'numeric',
  });
};

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getOrders();
      setOrders(data);
    } catch (error) {
      console.log('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsText} numberOfLines={2}>
          {item.items.map(i => i.product_name).join(', ')}
        </Text>
        <Text style={styles.itemsCount}>{item.items.length} item(s)</Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>{"\u20B9"}{item.total.toLocaleString('en-IN')}</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Start shopping to see your orders here</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
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
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  orderDate: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  orderItems: {
    marginBottom: 12,
  },
  itemsText: {
    fontSize: SIZES.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  itemsCount: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: SIZES.md,
    color: COLORS.gray,
  },
  totalValue: {
    flex: 1,
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
});
