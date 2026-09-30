const productsService = require('../products/products.service');
const postTrackerService = require('../postTracker/postTracker.service');
const { getDateRangeBounds, isPostInPlatform, isPostInRange, calcTrend } = require('../../utils/filterUtils');

const getBrandStats = async (filters = {}) => {
  const brands = await productsService.listBrands();
  const products = await productsService.listProducts();
  const posts = await postTrackerService.listPosts(filters);

  const brandMap = {}; 

  // Initialize with all brands from IMS
  brands.forEach(b => {
    const bId = String(b.brand_id || b.id);
    brandMap[bId] = {
      brand_id: b.brand_id || b.id,
      brand_name: b.brand_name || b.name,
      logo_url: b.logo_url || b.image_url || '',
      image_url: b.image_url || b.logo_url || '',
      total_products: 0,
      total_posts: 0,
      total_views: 0,
      total_reach: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
      total_engagement: 0,
      posts: []
    };
  });

  const productToBrandMap = {};
  products.forEach(p => {
    const bId = p.brand_id ? String(p.brand_id) : 'unbranded';
    const bName = p.brand_name || 'Unbranded';
    productToBrandMap[String(p.id)] = bId;
    
    if (!brandMap[bId]) {
      brandMap[bId] = {
        brand_id: bId === 'unbranded' ? null : bId,
        brand_name: bName,
        logo_url: p.brand_image || '',
        image_url: p.brand_image || '',
        total_products: 0,
        total_posts: 0,
        total_views: 0,
        total_reach: 0,
        total_likes: 0,
        total_comments: 0,
        total_shares: 0,
        total_engagement: 0,
        posts: []
      };
    }
    
    brandMap[bId].total_products += 1;
  });

  posts.forEach(post => {
    let bId = post.brand_id ? String(post.brand_id) : null;
    if (!bId && post.product_id) {
      bId = productToBrandMap[String(post.product_id)] || null;
    }
    if (bId && brandMap[bId]) {
      const views = Number(post.views_count) || 0;
      const reach = Number(post.reach_count) || 0;
      const likes = Number(post.likes_count) || 0;
      const comments = Number(post.comments_count) || 0;
      const shares = Number(post.shares_count) || 0;
      const engagement = likes + comments + shares;

      brandMap[bId].total_posts += 1;
      brandMap[bId].total_views += views;
      brandMap[bId].total_reach += reach;
      brandMap[bId].total_likes += likes;
      brandMap[bId].total_comments += comments;
      brandMap[bId].total_shares += shares;
      brandMap[bId].total_engagement += engagement;

      brandMap[bId].posts.push({
        id: post.id,
        published_time: post.published_time,
        scheduled_time: post.scheduled_time,
        created_at: post.created_at,
        platform: post.platform,
        status: post.status,
        views_count: views,
        reach_count: reach,
        likes_count: likes,
        comments_count: comments,
        shares_count: shares,
        engagement: engagement
      });
    }
  });

  return Object.values(brandMap).sort((a, b) => (a.brand_name || '').localeCompare(b.brand_name || ''));
};

const getBrandDetail = async (brandId, filters = {}) => {
  const brands = await productsService.listBrands();
  const products = await productsService.listProducts();
  const posts = await postTrackerService.listPosts(filters);

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
  const brandPosts = posts.filter(post => 
    (String(post.brand_id) === String(brandId) || productIds.has(String(post.product_id))) && 
    post.status === 'published'
  );

  const enrichedPosts = brandPosts.map(post => {
     const prod = post.product_id ? brandProducts.find(p => String(p.id) === String(post.product_id)) : null;
     const isBrandPost = post.tracking_type === 'brand' || (!post.product_id && post.brand_id);
     return {
       ...post,
       platform: post.platform || 'facebook',
       media_type: post.media_type || 'photo',
       product_name: isBrandPost ? (brandName || 'Brand Catalog') : (prod ? prod.product_name : 'Unknown Product'),
       product_image: isBrandPost ? brandImage : (prod ? prod.image_url : null)
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
  const { platform = 'all', range = 'this_week', timezone } = filters;
  const posts = await postTrackerService.listPosts();
  const products = await productsService.listProducts();
  
  const { start, end, prevStart, prevEnd } = getDateRangeBounds(range, timezone);

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
