import api from '../lib/api';

export const productService = {
  getProducts: async (params) => {
    const { data } = await api.get('/products', { params });
    return data;
  },

  getProductById: async (idOrSlug) => {
    const { data } = await api.get(`/products/${idOrSlug}`);
    return data;
  },

  createProduct: async (formData) => {
    const { data } = await api.post('/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },

  updateProduct: async (id, formData) => {
    const { data } = await api.put(`/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  },

  deleteProduct: async (id) => {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  }
};
