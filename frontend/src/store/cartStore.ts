import { create } from 'zustand';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  brand?: string;
}

interface CartItem {
  product_id: string;
  quantity: number;
  product: Product;
}

interface CartState {
  items: CartItem[];
  total: number;
  setCart: (items: CartItem[], total: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,

  setCart: (items: CartItem[], total: number) => {
    set({ items, total });
  },

  clearCart: () => {
    set({ items: [], total: 0 });
  },
}));
