import api from './client';

export interface RazorpayOrder {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id: string;
}

export const paymentsApi = {
  createRazorpayOrder: async (amount: number): Promise<RazorpayOrder> => {
    const response = await api.post('/payments/create-order', { amount });
    return response.data;
  },

  verifyPayment: async (data: VerifyPaymentData) => {
    const response = await api.post('/payments/verify', data);
    return response.data;
  },

  getRazorpayKey: async (): Promise<{ key_id: string }> => {
    const response = await api.get('/payments/key');
    return response.data;
  },
};
