import { create } from 'zustand';
import api from '../lib/api';

// Helper to generate a unique guest cart ID if none exists
const getOrCreateGuestCartId = () => {
  let id = localStorage.getItem('guestCartId');
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem('guestCartId', id);
  }
  return id;
};

export const useCartStore = create((set, get) => ({
  cartItems: [],
  isOpen: false,
  isLoading: false,
  error: null,
  guestCartId: getOrCreateGuestCartId(),

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const guestId = get().guestCartId;
      const { data } = await api.get('/cart/items', {
        headers: {
          'x-guest-cart-id': guestId
        }
      });
      set({ cartItems: data, isLoading: false });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load cart';
      set({ error: message, isLoading: false });
    }
  },

  addToCart: async (productId, variantId, quantity = 1) => {
    set({ isLoading: true, error: null });
    try {
      const guestId = get().guestCartId;
      const { data } = await api.post('/cart/items', 
        { productId, variantId, quantity },
        {
          headers: {
            'x-guest-cart-id': guestId
          }
        }
      );
      set({ cartItems: data, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add item to cart';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  updateQuantity: async (productId, variantId, quantity) => {
    if (quantity < 1) return;
    set({ isLoading: true, error: null });
    try {
      const guestId = get().guestCartId;
      const { data } = await api.put('/cart/items', 
        { productId, variantId, quantity },
        {
          headers: {
            'x-guest-cart-id': guestId
          }
        }
      );
      set({ cartItems: data, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update quantity';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  removeFromCart: async (productId, variantId) => {
    set({ isLoading: true, error: null });
    try {
      const guestId = get().guestCartId;
      const { data } = await api.delete('/cart/items', {
        headers: {
          'x-guest-cart-id': guestId
        },
        data: { productId, variantId }
      });
      set({ cartItems: data, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to remove item';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  mergeCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const guestId = get().guestCartId;
      const { data } = await api.post('/cart/merge', { guestCartId: guestId });
      set({ cartItems: data, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to merge cart';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  setIsOpen: (isOpen) => set({ isOpen }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen }))
}));
