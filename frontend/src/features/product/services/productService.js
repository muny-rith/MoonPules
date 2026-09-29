import apiClient from '../../../shared/utils/apiClient';

// In-memory cache for Product Catalog
const productCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getCachedProducts = (params = {}) => {
  const key = `products_${JSON.stringify(params)}`;
  const item = productCache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
};

export const getCachedProductCategories = () => {
  const item = productCache.get('product_categories');
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
};

export const clearProductCache = () => {
  productCache.clear();
};

export const fetchProducts = async (params = {}, forceRefresh = false) => {
  const key = `products_${JSON.stringify(params)}`;
  if (!forceRefresh) {
    const cached = getCachedProducts(params);
    if (cached) return cached;
  }

  const response = await apiClient.get('/products', { params });
  productCache.set(key, { data: response.data, timestamp: Date.now() });
  return response.data;
};

export const fetchProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const fetchProductCategories = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedProductCategories();
    if (cached) return cached;
  }

  const response = await apiClient.get('/products/categories');
  productCache.set('product_categories', { data: response.data, timestamp: Date.now() });
  return response.data;
};

export const fetchBrands = async () => {
  const response = await apiClient.get('/products/brands');
  return response.data;
};
