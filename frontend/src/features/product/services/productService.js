import apiClient from '../../../shared/utils/apiClient';

/**
 * Product Catalog API Service
 * Clean stateless API service. Caching is managed by TanStack Query.
 */

// Legacy helper stubs for backwards compatibility
export const getCachedProducts = () => null;
export const getCachedProductCategories = () => null;
export const clearProductCache = () => {};

export const fetchProducts = async (params = {}) => {
  const response = await apiClient.get('/products', { params });
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const fetchProductCategories = async () => {
  const response = await apiClient.get('/products/categories');
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchBrands = async () => {
  const response = await apiClient.get('/products/brands');
  return Array.isArray(response.data) ? response.data : [];
};
