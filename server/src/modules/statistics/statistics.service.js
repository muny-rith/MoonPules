const productsService = require('../products/products.service');
const postTrackerService = require('../postTracker/postTracker.service');

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
  const brandPosts = posts.filter(post => productIds.has(String(post.product_id)));

  const enrichedPosts = brandPosts.map(post => {
     const prod = brandProducts.find(p => String(p.id) === String(post.product_id));
     return {
       ...post,
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

const getDashboardStats = async () => {
  const posts = await postTrackerService.listPosts();
  const products = await productsService.listProducts();
  
  const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalReach = posts.reduce((sum, p) => sum + (p.reach_count || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.shares_count || 0), 0);
  
  const engagementRate = totalReach > 0 
    ? (((totalLikes + totalComments + totalShares) / totalReach) * 100).toFixed(1)
    : 0;
    
  const enrichedPosts = posts.map(post => {
     const prod = products.find(p => String(p.id) === String(post.product_id));
     return {
       ...post,
       product_name: prod ? prod.product_name : 'Unknown Product'
     };
  });
    
  const recentPosts = enrichedPosts.slice(0, 5);

  return {
    total_views: totalViews,
    total_reach: totalReach,
    total_likes: totalLikes,
    engagement_rate: parseFloat(engagementRate),
    recent_posts: recentPosts,
    all_posts_metrics: posts.map(p => ({
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
