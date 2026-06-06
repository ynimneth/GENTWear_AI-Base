import { create } from 'zustand';
import api from '../lib/api';

export const useOrderStore = create((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/orders');
      set({ orders: data, isLoading: false });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch orders';
      set({ error: message, isLoading: false });
    }
  },

  createOrder: async (checkoutData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/orders', checkoutData);
      set({ currentOrder: data, isLoading: false });
      return { success: true, order: data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to place order';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  createPaymentIntent: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/payments/intent', { orderId });
      set({ isLoading: false });
      return { success: true, data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to initialize payment gateway';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  clearCurrentOrder: () => set({ currentOrder: null })
}));
export default useOrderStore;
