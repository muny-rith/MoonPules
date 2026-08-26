const postTrackerService = require('../postTracker/postTracker.service');
const productsService = require('../products/products.service');
const productsClient = require('../products/products.client');

// Fallback sales data when IMS is unavailable
const FALLBACK_SALES = [
  {
    sale_id: 1, sale_code: 'SL-2025-001', sale_date: '2025-10-28',
    customer_name: 'Online Order', sale_status: 'COMPLETED',
    items: [
      { variant_id: 1, qty: 3, unit_price: 18.50, product_name: 'Moon Velvet Matte Lipstick (Cherry Moon)' },
      { variant_id: 2, qty: 1, unit_price: 34.00, product_name: 'Luminous Hydra Glow Serum (50ml)' },
    ]
  },
  {
    sale_id: 2, sale_code: 'SL-2025-002', sale_date: '2025-10-30',
    customer_name: 'Walk-In', sale_status: 'COMPLETED',
    items: [
      { variant_id: 5, qty: 2, unit_price: 68.00, product_name: 'Midnight Bloom Eau de Parfum (100ml)' },
      { variant_id: 3, qty: 1, unit_price: 129.00, product_name: 'Celestial Crescent Moon Pendant (18k Gold)' },
    ]
  },
  {
    sale_id: 3, sale_code: 'SL-2025-003', sale_date: '2025-11-02',
    customer_name: 'Facebook Order', sale_status: 'COMPLETED',
    items: [
      { variant_id: 1, qty: 5, unit_price: 18.50, product_name: 'Moon Velvet Matte Lipstick (Cherry Moon)' },
      { variant_id: 8, qty: 2, unit_price: 28.50, product_name: 'Radiance Peptide Eye Renewal Cream' },
    ]
  },
  {
    sale_id: 4, sale_code: 'SL-2025-004', sale_date: '2025-11-05',
    customer_name: 'Social Media Lead', sale_status: 'COMPLETED',
    items: [
      { variant_id: 4, qty: 1, unit_price: 89.90, product_name: 'Aurora Minimalist Vegan Leather Tote' },
      { variant_id: 7, qty: 2, unit_price: 45.00, product_name: 'Solaris Retro Aviator Sunglasses' },
    ]
  },
  {
    sale_id: 5, sale_code: 'SL-2025-005', sale_date: '2025-11-10',
    customer_name: 'Online Order', sale_status: 'COMPLETED',
    items: [
      { variant_id: 6, qty: 1, unit_price: 195.00, product_name: 'Eclipse Chronograph Watch (Onyx Black)' },
      { variant_id: 2, qty: 3, unit_price: 34.00, product_name: 'Luminous Hydra Glow Serum (50ml)' },
    ]
  }
];

/**
 * Fetch sales data from IMS. Falls back to mock data if IMS is unavailable.
 */
const getSalesData = async () => {
  try {
    const sales = await productsClient.getSalesFromIms();
    if (Array.isArray(sales)) return sales;
    if (sales && Array.isArray(sales.data)) return sales.data;
    return FALLBACK_SALES;
  } catch (err) {
    console.warn(`[ProfitService] IMS Sales API unavailable (${err.message}). Using fallback sales data.`);
    return FALLBACK_SALES;
  }
};

/**
 * Calculate revenue for a specific product within a time window
 */
const getProductRevenue = (sales, productId, products, afterDate, beforeDate) => {
  // Find the product to get its price
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return { revenue: 0, units_sold: 0 };

  let totalRevenue = 0;
  let unitsSold = 0;

  for (const sale of sales) {
    if (sale.sale_status !== 'COMPLETED') continue;

    const saleDate = new Date(sale.sale_date || sale.created_at);
    if (afterDate && saleDate < afterDate) continue;
    if (beforeDate && saleDate > beforeDate) continue;

    if (sale.items && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        // Match by product name (since IMS uses variant_id, not product_id directly)
        const itemProductName = item.product_name || '';
        if (itemProductName && product.product_name &&
            itemProductName.toLowerCase().includes(product.product_name.toLowerCase().substring(0, 20))) {
          totalRevenue += (parseFloat(item.unit_price) || 0) * (parseInt(item.qty) || 0);
          unitsSold += parseInt(item.qty) || 0;
        }
      }
    }
  }

  return { revenue: totalRevenue, units_sold: unitsSold };
};

/**
 * Get profit data for a single post
 */
const getPostProfit = async (postId) => {
  const posts = await postTrackerService.listPosts();
  const post = posts.find(p => String(p.id) === String(postId));
  if (!post) return null;

  const products = await productsService.listProducts();
  const sales = await getSalesData();

  const publishedDate = post.published_time ? new Date(post.published_time) : new Date(post.created_at);
  const windowDays = post.attribution_window_days || 7;
  const windowEnd = new Date(publishedDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const { revenue, units_sold } = getProductRevenue(sales, post.product_id, products, publishedDate, windowEnd);
  const contentCost = parseFloat(post.content_cost) || 0;
  const adSpend = parseFloat(post.ad_spend) || 0;
  const totalCost = contentCost + adSpend;
  const netProfit = revenue - totalCost;
  const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : (revenue > 0 ? 999 : 0);

  return {
    post_id: post.id,
    product_name: post.product_name,
    revenue: Math.round(revenue * 100) / 100,
    content_cost: contentCost,
    ad_spend: adSpend,
    total_cost: Math.round(totalCost * 100) / 100,
    net_profit: Math.round(netProfit * 100) / 100,
    roi: Math.round(roi * 10) / 10,
    units_sold,
    is_profitable: netProfit > 0,
    attribution_window_days: windowDays,
    views_count: post.views_count || 0,
    reach_count: post.reach_count || 0,
    cost_per_view: (post.views_count > 0 && totalCost > 0)
      ? Math.round((totalCost / post.views_count) * 1000) / 1000
      : 0,
  };
};

/**
 * Get overall dashboard profit KPIs
 */
const getDashboardProfit = async () => {
  const posts = await postTrackerService.listPosts();
  const products = await productsService.listProducts();
  const sales = await getSalesData();

  let totalRevenue = 0;
  let totalContentCost = 0;
  let totalAdSpend = 0;
  let totalViews = 0;
  let totalReach = 0;
  let totalEngagement = 0;
  let totalUnitsSold = 0;
  let profitablePosts = 0;

  const postProfits = [];

  for (const post of posts) {
    const publishedDate = post.published_time ? new Date(post.published_time) : new Date(post.created_at);
    const windowDays = post.attribution_window_days || 7;
    const windowEnd = new Date(publishedDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const { revenue, units_sold } = getProductRevenue(sales, post.product_id, products, publishedDate, windowEnd);
    const contentCost = parseFloat(post.content_cost) || 0;
    const adSpend = parseFloat(post.ad_spend) || 0;
    const totalCost = contentCost + adSpend;
    const netProfit = revenue - totalCost;
    const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : (revenue > 0 ? 999 : 0);

    totalRevenue += revenue;
    totalContentCost += contentCost;
    totalAdSpend += adSpend;
    totalViews += (post.views_count || 0);
    totalReach += (post.reach_count || 0);
    totalEngagement += (post.likes_count || 0) + (post.comments_count || 0) + (post.shares_count || 0);
    totalUnitsSold += units_sold;

    if (netProfit > 0) profitablePosts++;

    postProfits.push({
      post_id: post.id,
      product_name: post.product_name,
      revenue: Math.round(revenue * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      roi: Math.round(roi * 10) / 10,
      views_count: post.views_count || 0,
      reach_count: post.reach_count || 0,
      published_time: post.published_time || post.created_at,
    });
  }

  const totalSpend = totalContentCost + totalAdSpend;
  const netProfit = totalRevenue - totalSpend;
  const overallRoi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend * 100) : 0;
  const costPerView = totalViews > 0 && totalSpend > 0 ? totalSpend / totalViews : 0;

  return {
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_content_cost: Math.round(totalContentCost * 100) / 100,
    total_ad_spend: Math.round(totalAdSpend * 100) / 100,
    total_spend: Math.round(totalSpend * 100) / 100,
    net_profit: Math.round(netProfit * 100) / 100,
    overall_roi: Math.round(overallRoi * 10) / 10,
    cost_per_view: Math.round(costPerView * 1000) / 1000,
    total_posts: posts.length,
    profitable_posts: profitablePosts,
    total_units_sold: totalUnitsSold,
    // Funnel data
    funnel: {
      views: totalViews,
      reach: totalReach,
      engagement: totalEngagement,
      sales: totalUnitsSold,
      revenue: Math.round(totalRevenue * 100) / 100,
    },
    // Top performing posts by profit
    top_posts: [...postProfits]
      .sort((a, b) => b.net_profit - a.net_profit)
      .slice(0, 5),
    // All posts profit for the post tracker table
    all_posts_profit: postProfits,
  };
};

/**
 * Get brand-level profitability data
 */
const getBrandProfitability = async () => {
  const posts = await postTrackerService.listPosts();
  const products = await productsService.listProducts();
  const sales = await getSalesData();
  const brands = await productsService.listBrands();

  const brandMap = {};

  // Initialize brands
  brands.forEach(b => {
    brandMap[b.brand_id || b.id] = {
      brand_id: b.brand_id || b.id,
      brand_name: b.brand_name || b.name,
      image_url: b.image_url || b.logo_url || '',
      total_posts: 0,
      total_views: 0,
      total_revenue: 0,
      total_content_cost: 0,
      total_ad_spend: 0,
      total_spend: 0,
      net_profit: 0,
      roi: 0,
    };
  });

  for (const post of posts) {
    const product = products.find(p => String(p.id) === String(post.product_id));
    if (!product) continue;

    const brandId = product.brand_id || 'unbranded';
    if (!brandMap[brandId]) {
      brandMap[brandId] = {
        brand_id: brandId,
        brand_name: product.brand_name || 'Unbranded',
        image_url: product.brand_image || '',
        total_posts: 0, total_views: 0, total_revenue: 0,
        total_content_cost: 0, total_ad_spend: 0, total_spend: 0,
        net_profit: 0, roi: 0,
      };
    }

    const publishedDate = post.published_time ? new Date(post.published_time) : new Date(post.created_at);
    const windowDays = post.attribution_window_days || 7;
    const windowEnd = new Date(publishedDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const { revenue } = getProductRevenue(sales, post.product_id, products, publishedDate, windowEnd);
    const contentCost = parseFloat(post.content_cost) || 0;
    const adSpend = parseFloat(post.ad_spend) || 0;

    brandMap[brandId].total_posts += 1;
    brandMap[brandId].total_views += (post.views_count || 0);
    brandMap[brandId].total_revenue += revenue;
    brandMap[brandId].total_content_cost += contentCost;
    brandMap[brandId].total_ad_spend += adSpend;
    brandMap[brandId].total_spend += contentCost + adSpend;
    brandMap[brandId].net_profit += revenue - contentCost - adSpend;
  }

  // Calculate ROI for each brand
  const result = Object.values(brandMap)
    .filter(b => b.total_posts > 0)
    .map(b => ({
      ...b,
      total_revenue: Math.round(b.total_revenue * 100) / 100,
      total_spend: Math.round(b.total_spend * 100) / 100,
      net_profit: Math.round(b.net_profit * 100) / 100,
      roi: b.total_spend > 0
        ? Math.round(((b.total_revenue - b.total_spend) / b.total_spend * 100) * 10) / 10
        : (b.total_revenue > 0 ? 999 : 0),
    }))
    .sort((a, b) => b.net_profit - a.net_profit);

  return result;
};

module.exports = {
  getSalesData,
  getPostProfit,
  getDashboardProfit,
  getBrandProfitability,
};
