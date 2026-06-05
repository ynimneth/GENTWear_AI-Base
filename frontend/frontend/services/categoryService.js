import api from '../lib/api';

export const categoryService = {
  getCategories: async () => {
    const { data } = await api.get('/categories');
    return data;
  },

  createCategory: async (categoryData) => {
    const { data } = await api.post('/categories', categoryData);
    return data;
  },

  updateCategory: async (id, categoryData) => {
    const { data } = await api.put(`/categories/${id}`, categoryData);
    return data;
  },

  deleteCategory: async (id) => {
    const { data } = await api.delete(`/categories/${id}`);
    return data;
  }
};
