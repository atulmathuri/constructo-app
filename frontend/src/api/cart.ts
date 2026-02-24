import api from './client';

export interface CartItem {
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    image: string;
    brand?: string;
  };
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export const cartApi = {
  getCart: async (): Promise<Cart> => {
    const response = await api.get('/cart');
    return response.data;
  },

  addToCart: async (product_id: string, quantity: number = 1) => {
    const response = await api.post('/cart/add', { product_id, quantity });
    return response.data;
  },

  updateCartItem: async (product_id: string, quantity: number) => {
    const response = await api.put('/cart/update', { product_id, quantity });
    return response.data;
  },

  removeFromCart: async (product_id: string) => {
    const response = await api.delete(`/cart/remove/${product_id}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await api.delete('/cart/clear');
    return response.data;
  },
};
