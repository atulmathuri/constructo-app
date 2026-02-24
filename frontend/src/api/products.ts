import api from './client';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  sku: string;
  image: string;
  images: string[];
  rating: number;
  review_count: number;
  stock: number;
  brand?: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  description?: string;
}

export const productsApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data;
  },

  getProducts: async (params?: {
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    sort_by?: string;
  }): Promise<Product[]> => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getFeaturedProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products/featured');
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
};
