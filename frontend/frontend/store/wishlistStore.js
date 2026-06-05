import { create } from 'zustand';
import api from '../lib/api';

export const useWishlistStore = create((set, get) => ({
  wishlistItems: [],
  isLoading: false,
  error: null,

  fetchWishlist: async () => {
    // Only fetch if authenticated (checked via useAuthStore or header check)
    // If no header token is set, do not call to avoid 401 warnings
    if (!api.defaults.headers.common['Authorization']) {
      set({ wishlistItems: [] });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/wishlist');
      set({ wishlistItems: data, isLoading: false });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load wishlist';
      set({ error: message, isLoading: false });
    }
  },

  toggleWishlist: async (productId) => {
    if (!api.defaults.headers.common['Authorization']) {
      return { success: false, message: 'Please login to add items to your wishlist.' };
    }

    set({ isLoading: true, error: null });
    const isFav = get().isInWishlist(productId);

    try {
      if (isFav) {
        await api.delete(`/wishlist/${productId}`);
      } else {
        await api.post(`/wishlist/${productId}`);
      }
      
      // Refresh items list
      await get().fetchWishlist();
      return { success: true, added: !isFav };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update wishlist';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  isInWishlist: (productId) => {
    return get().wishlistItems.some(item => item.id === parseInt(productId));
  }
}));
