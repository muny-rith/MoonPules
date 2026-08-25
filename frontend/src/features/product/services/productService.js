import apiClient from '../../../shared/utils/apiClient';

export const fetchProducts = async (params = {}) => {
  const response = await apiClient.get('/products', { params });
  return response.data;
};

export const fetchProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const fetchProductCategories = async () => {
  const response = await apiClient.get('/products/categories');
  return response.data;
};
