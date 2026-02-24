import api from './client';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  shipping_address: ShippingAddress;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  created_at: string;
}

export interface CreateOrderData {
  shipping_address: ShippingAddress;
  payment_method: string;
}

export const ordersApi = {
  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
};
