import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      // Store token in memory only (NOT localStorage)
      set({ user: data.user, accessToken: data.accessToken, isLoading: false });
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  logout: async () => {
    await api.post('/auth/logout').catch(() => {});
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null, error: null });
  },

  refreshToken: async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      set({ user: data.user, accessToken: data.accessToken });
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      return data.accessToken;
    } catch {
      get().logout();
      return null;
    }
  },

  clearError: () => set({ error: null })
}));