const productsService = require('../products/products.service');
const postTrackerService = require('../postTracker/postTracker.service');
const { getDateRangeBounds, isPostInPlatform, isPostInRange, calcTrend } = require('../../utils/filterUtils');

const getBrandStats = async () => {
  const brands = await productsService.listBrands();
  const products = await productsService.listProducts();
  const posts = await postTrackerService.listPosts();

  const brandMap = {}; 

  // Initialize with all brands from IMS
  brands.forEach(b => {
    brandMap[b.brand_id] = {
      brand_id: b.brand_id,
      brand_name: b.brand_name,
      total_products: 0,
      total_posts: 0
    };
  });

  products.forEach(p => {
    const bId = p.brand_id || 'unbranded';
    const bName = p.brand_name || 'Unbranded';
    
    if (!brandMap[bId]) {
      brandMap[bId] = {
        brand_id: bId === 'unbranded' ? null : bId,
        brand_name: bName,
        total_products: 0,
        total_posts: 0
      };
    }
    
    brandMap[bId].total_products += 1;
  });

  posts.forEach(post => {
    const product = products.find(p => String(p.id) === String(post.product_id));
    if (product) {
      const bId = product.brand_id || 'unbranded';
      if (brandMap[bId]) {
        brandMap[bId].total_posts += 1;
      }
    }
  });

  return Object.values(brandMap).sort((a, b) => b.total_posts - a.total_posts);
};

const getBrandDetail = async (brandId) => {
  const brands = await productsService.listBrands();
  const products = await productsService.listProducts();
  const posts = await postTrackerService.listPosts();

  const brandProducts = products.filter(p => String(p.brand_id || 'unbranded') === String(brandId));
  
  let brandName = 'Unknown Brand';
  let brandImage = null;
  
  const foundBrand = brands.find(b => String(b.brand_id) === String(brandId) || String(b.id) === String(brandId));
  if (foundBrand) {
    brandName = foundBrand.brand_name || foundBrand.name;
    brandImage = foundBrand.image_url || null;
  } else if (brandProducts.length > 0) {
    brandName = brandProducts[0].brand_name;
  }
  const productIds = new Set(brandProducts.map(p => String(p.id)));
  const brandPosts = posts.filter(post => productIds.has(String(post.product_id)) && post.status === 'published');

  const enrichedPosts = brandPosts.map(post => {
     const prod = brandProducts.find(p => String(p.id) === String(post.product_id));
     return {
       ...post,
       platform: post.platform || 'facebook',
       media_type: post.media_type || 'photo',
       product_name: prod ? prod.product_name : 'Unknown Product',
       product_image: prod ? prod.image_url : null
     };
  });

  const totalLikes = enrichedPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const totalComments = enrichedPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const totalShares = enrichedPosts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
  const totalViews = enrichedPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalReach = enrichedPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0);

  return {
    brand_id: brandId === 'unbranded' ? null : brandId,
    brand_name: brandName,
    image_url: brandImage,
    total_products: brandProducts.length,
    total_posts: brandPosts.length,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: totalShares,
    total_views: totalViews,
    total_reach: totalReach,
    products: brandProducts,
    posts: enrichedPosts
  };
};

const getDashboardStats = async (filters = {}) => {
  const { platform = 'all', range = 'this_week' } = filters;
  const posts = await postTrackerService.listPosts();
  const products = await productsService.listProducts();
  
  const { start, end, prevStart, prevEnd } = getDateRangeBounds(range);

  const filteredPosts = posts.filter(p => isPostInPlatform(p, platform) && isPostInRange(p, start, end));
  const prevPosts = prevStart ? posts.filter(p => isPostInPlatform(p, platform) && isPostInRange(p, prevStart, prevEnd)) : [];

  const totalViews = filteredPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalReach = filteredPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0);
  const totalLikes = filteredPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const totalComments = filteredPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const totalShares = filteredPosts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
  
  const engagementRate = totalReach > 0 
    ? (((totalLikes + totalComments + totalShares) / totalReach) * 100).toFixed(1)
    : 0;

  // Previous period metrics for trend calculation
  const prevViews = prevPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const prevReach = prevPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0);
  const prevLikes = prevPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const prevComments = prevPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const prevShares = prevPosts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
  const prevEngagementRate = prevReach > 0 
    ? (((prevLikes + prevComments + prevShares) / prevReach) * 100).toFixed(1)
    : 0;

  const viewsTrend = calcTrend(totalViews, prevViews);
  const reachTrend = calcTrend(totalReach, prevReach);
  const engagementTrend = calcTrend(parseFloat(engagementRate), parseFloat(prevEngagementRate));
    
  const enrichedPosts = filteredPosts.map(post => {
     const prod = products.find(p => String(p.id) === String(post.product_id));
     return {
       ...post,
       product_name: prod ? prod.product_name : 'Unknown Product'
     };
  });
    
  const recentPosts = enrichedPosts.slice(0, 6);

  return {
    total_views: totalViews,
    total_reach: totalReach,
    total_likes: totalLikes,
    engagement_rate: parseFloat(engagementRate),
    views_trend: viewsTrend,
    reach_trend: reachTrend,
    engagement_trend: engagementTrend,
    recent_posts: recentPosts,
    filters: { platform, range },
    all_posts_metrics: filteredPosts.map(p => ({
      id: p.id,
      published_time: p.published_time,
      scheduled_time: p.scheduled_time,
      views_count: p.views_count,
      reach_count: p.reach_count,
    }))
  };
};

module.exports = {
  getBrandStats,
  getBrandDetail,
  getDashboardStats
};
