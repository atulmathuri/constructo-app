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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi, Product } from '../src/api/products';
import { ProductCard } from '../src/components/ProductCard';
import { SearchBar } from '../src/components/SearchBar';
import { COLORS, SIZES } from '../src/constants/theme';

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState((params.search as string) || '');
  const [selectedCategory, setSelectedCategory] = useState((params.category as string) || '');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getProducts({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      });
      setProducts(data);
    } catch (error) {
      console.log('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [selectedCategory, searchQuery]);

  const handleSearch = async () => {
    await loadProducts();
  };

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <ProductCard product={item} onPress={() => handleProductPress(item)} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedCategory || 'All Products'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
        />
      </View>

      {/* Active Filters */}
      {(searchQuery || selectedCategory) && (
        <View style={styles.filtersRow}>
          {selectedCategory && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedCategory}</Text>
              <TouchableOpacity onPress={() => setSelectedCategory('')}>
                <Ionicons name="close" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}
          {searchQuery && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>"{searchQuery}"</Text>
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFilters}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Products Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{products.length} products found</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={60} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>Try a different search or category</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
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
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  filterChipText: {
    fontSize: SIZES.sm,
    color: COLORS.white,
    marginRight: 4,
  },
  clearFilters: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    fontWeight: '600',
  },
  countRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
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
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.gray,
    marginTop: 8,
  },
  productsList: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  productItem: {
    width: '50%',
    paddingHorizontal: 4,
  },
});
