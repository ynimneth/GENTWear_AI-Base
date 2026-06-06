import { create } from 'zustand';
import api from '../lib/api';

export const useAddressStore = create((set, get) => ({
  addresses: [],
  isLoading: false,
  error: null,

  fetchAddresses: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/addresses');
      set({ addresses: data, isLoading: false });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch addresses';
      set({ error: message, isLoading: false });
    }
  },

  addAddress: async (addressData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/addresses', addressData);
      // Re-fetch to ensure order and defaults are correct
      await get().fetchAddresses();
      set({ isLoading: false });
      return { success: true, data };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to add address';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  updateAddress: async (id, addressData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.put(`/addresses/${id}`, addressData);
      await get().fetchAddresses();
      set({ isLoading: false });
      return { success: true, data };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to update address';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  deleteAddress: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/addresses/${id}`);
      await get().fetchAddresses();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete address';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  }
}));
