import api from '../../../shared/utils/apiClient';

/**
 * Brand Statistics API Service
 * Clean stateless API service. Caching is handled exclusively by TanStack Query.
 */

// Legacy helper for backwards compatibility (no-op since TanStack Query manages cache)
export const clearBrandCache = () => {};
export const getCachedBrandStats = () => null;
export const getCachedBrandDetail = () => null;

/**
 * Fetch all brand statistics from API
 */
export const getBrandStats = async (params = {}) => {
  const actualParams = typeof params === 'boolean' ? {} : params;
  const response = await api.get('/statistics/brands', { params: actualParams });
  return response.data?.data || [];
};

/**
 * Fetch single brand detail from API
 */
export const getBrandDetail = async (id, params = {}) => {
  const actualParams = typeof params === 'boolean' ? {} : params;
  const response = await api.get(`/statistics/brands/${id}`, { params: actualParams });
  return response.data?.data || null;
};

/**
 * Fetch combined brand details by aggregating multiple brands
 */
export const getCombinedBrandDetail = async (brandIds, params = {}) => {
  const actualParams = typeof params === 'boolean' ? {} : params;
  const sortedIds = [...brandIds].sort();

  // Fetch details for all selected brands in parallel
  const allDetails = await Promise.all(sortedIds.map((bId) => getBrandDetail(bId, actualParams)));
  const validDetails = allDetails.filter(Boolean);

  if (validDetails.length === 0) {
    throw new Error('No brand details found for selected IDs');
  }

  // Deduplicate products across combined brands by ID
  const productMap = new Map();
  validDetails.forEach((d) => {
    (d.products || []).forEach((prod) => {
      if (!productMap.has(String(prod.id))) {
        productMap.set(String(prod.id), prod);
      }
    });
  });
  const combinedProducts = Array.from(productMap.values());

  // Deduplicate posts across combined brands by ID
  const postMap = new Map();
  validDetails.forEach((d) => {
    (d.posts || []).forEach((p) => {
      if (!postMap.has(p.id)) {
        postMap.set(p.id, {
          ...p,
          brand_name: p.brand_name || d.brand_name,
          brand_id: p.brand_id || d.brand_id,
        });
      }
    });
  });
  const combinedPosts = Array.from(postMap.values());

  const totalLikes = combinedPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const totalComments = combinedPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const totalShares = combinedPosts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
  const totalViews = combinedPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalReach = combinedPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0);

  return {
    brand_id: 'combined',
    brand_name: validDetails.map((d) => d.brand_name).filter(Boolean).join(' & '),
    image_url: validDetails[0]?.image_url || validDetails[0]?.logo_url,
    logo_url: validDetails[0]?.logo_url || validDetails[0]?.image_url,
    logos: validDetails.map((d) => ({
      id: d.brand_id,
      name: d.brand_name,
      url: d.logo_url || d.image_url,
    })),
    total_products: combinedProducts.length,
    total_posts: combinedPosts.length,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: totalShares,
    total_views: totalViews,
    total_reach: totalReach,
    products: combinedProducts,
    posts: combinedPosts,
  };
};

export const getBrandProfitability = async () => {
  const response = await api.get('/profit/brands');
  return response.data?.data || [];
};
