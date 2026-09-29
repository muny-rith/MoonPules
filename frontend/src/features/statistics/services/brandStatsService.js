import api from '../../../shared/utils/apiClient';

// In-memory cache storage for Brand Statistics
const brandCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache lifetime

/**
 * Retrieve cached brand stats if valid
 */
export const getCachedBrandStats = () => {
  const item = brandCache.get('brand_stats');
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
};

/**
 * Retrieve cached brand detail by ID or combined key if valid
 */
export const getCachedBrandDetail = (key) => {
  const cacheKey = `brand_detail_${key}`;
  const item = brandCache.get(cacheKey);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
};

/**
 * Clear all brand caches (used when user clicks Sync)
 */
export const clearBrandCache = () => {
  brandCache.clear();
};

/**
 * Fetch all brand statistics (served from memory cache if fresh, otherwise from API)
 */
export const getBrandStats = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedBrandStats();
    if (cached) return cached;
  }

  const response = await api.get('/statistics/brands');
  const data = response.data.data;
  brandCache.set('brand_stats', { data, timestamp: Date.now() });
  return data;
};

/**
 * Fetch single brand detail with caching
 */
export const getBrandDetail = async (id, forceRefresh = false) => {
  const cacheKey = `brand_detail_${id}`;
  if (!forceRefresh) {
    const cached = getCachedBrandDetail(id);
    if (cached) return cached;
  }

  const response = await api.get(`/statistics/brands/${id}`);
  const data = response.data.data;
  brandCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

/**
 * Fetch combined brand details with caching
 */
export const getCombinedBrandDetail = async (brandIds, forceRefresh = false) => {
  const sortedIds = [...brandIds].sort();
  const cacheKey = `brand_detail_combined_${sortedIds.join(',')}`;

  if (!forceRefresh) {
    const cached = brandCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Fetch details for all selected brands in parallel (each utilizing its own cache)
  const allDetails = await Promise.all(sortedIds.map((bId) => getBrandDetail(bId, forceRefresh)));
  const validDetails = allDetails.filter(Boolean);

  if (validDetails.length === 0) {
    throw new Error('No brand details found for selected IDs');
  }

  const combinedDetail = {
    brand_id: 'combined',
    brand_name: validDetails.map((d) => d.brand_name).filter(Boolean).join(' & '),
    image_url: validDetails[0]?.image_url || validDetails[0]?.logo_url,
    logo_url: validDetails[0]?.logo_url || validDetails[0]?.image_url,
    logos: validDetails.map((d) => ({
      id: d.brand_id,
      name: d.brand_name,
      url: d.logo_url || d.image_url,
    })),
    total_products: validDetails.reduce((sum, d) => sum + (d.total_products || 0), 0),
    total_posts: validDetails.reduce((sum, d) => sum + (d.total_posts || 0), 0),
    total_likes: validDetails.reduce((sum, d) => sum + (d.total_likes || 0), 0),
    total_comments: validDetails.reduce((sum, d) => sum + (d.total_comments || 0), 0),
    total_shares: validDetails.reduce((sum, d) => sum + (d.total_shares || 0), 0),
    total_views: validDetails.reduce((sum, d) => sum + (d.total_views || 0), 0),
    total_reach: validDetails.reduce((sum, d) => sum + (d.total_reach || 0), 0),
    products: validDetails.flatMap((d) => d.products || []),
    posts: validDetails.flatMap((d) =>
      (d.posts || []).map((p) => ({
        ...p,
        brand_name: p.brand_name || d.brand_name,
        brand_id: p.brand_id || d.brand_id,
      }))
    ),
  };

  brandCache.set(cacheKey, { data: combinedDetail, timestamp: Date.now() });
  return combinedDetail;
};

export const getBrandProfitability = async () => {
  const response = await api.get('/profit/brands');
  return response.data.data;
};
