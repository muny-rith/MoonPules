const repository = require('./postTracker.repository');
const facebookService = require('../facebook/facebook.service');
const productsService = require('../products/products.service');
const publishScheduler = require('./publishScheduler.service');

const listPosts = async () => {
  const posts = await repository.getAllTrackedPosts();
  const products = await productsService.listProducts();
  const brands = await productsService.listBrands();
  
  return posts.map(post => {
    const prod = post.product_id ? products.find(p => String(p.id) === String(post.product_id)) : null;
    const brand = post.brand_id ? brands.find(b => String(b.brand_id) === String(post.brand_id) || String(b.id) === String(post.brand_id)) : (prod?.brand_id ? brands.find(b => String(b.brand_id) === String(prod.brand_id) || String(b.id) === String(prod.brand_id)) : null);
    
    const isBrandTracking = post.tracking_type === 'brand' || (!post.product_id && post.brand_id);
    const brandName = brand ? (brand.brand_name || brand.name) : (prod?.brand_name || null);
    const brandImage = brand ? (brand.image_url || null) : null;

    let productName = 'Unknown Target';
    let productImage = null;

    if (isBrandTracking) {
      productName = brandName ? `Brand: ${brandName} (All Products)` : 'Entire Brand Catalog';
      productImage = brandImage;
    } else if (prod) {
      productName = prod.product_name;
      productImage = prod.image_url;
    }

    return {
      ...post,
      product_name: productName,
      product_image: productImage,
      brand_id: post.brand_id || prod?.brand_id || null,
      brand_name: brandName,
      brand_image: brandImage,
      tracking_type: isBrandTracking ? 'brand' : 'product',
    };
  });
};

/**
 * Method 1: Create & Schedule directly from Moon Pulse to Facebook
 */
const createAndSchedulePost = async (postData) => {
  const {
    product_id,
    brand_id,
    tracking_type,
    page_id,
    message,
    media_url,
    scheduled_time,
    publish_now = false,
    content_cost = 0,
    ad_spend = 0,
    attribution_window_days = 7,
    marked_by,
  } = postData;

  const hasProduct = product_id !== undefined && product_id !== null && product_id !== '' && !isNaN(Number(product_id));
  const hasBrand = brand_id !== undefined && brand_id !== null && brand_id !== '' && !isNaN(Number(brand_id));

  if (!hasProduct && !hasBrand) {
    const err = new Error('Either product_id or brand_id must be provided');
    err.status = 400;
    throw err;
  }
  if (!Number.isInteger(Number(page_id))) {
    const err = new Error('page_id must be an integer');
    err.status = 400;
    throw err;
  }

  const targetScheduledTime = publish_now ? new Date() : (scheduled_time ? new Date(scheduled_time) : new Date());

  // Create scheduled record in database
  const created = await repository.createTrackedPost({
    product_id: hasProduct ? parseInt(product_id, 10) : null,
    brand_id: hasBrand ? parseInt(brand_id, 10) : null,
    tracking_type: tracking_type || (hasBrand && !hasProduct ? 'brand' : 'product'),
    page_id,
    fb_post_id: null,
    status: 'scheduled',
    scheduled_time: targetScheduledTime,
    published_time: null,
    marked_by,
    content_cost: parseFloat(content_cost) || 0,
    ad_spend: parseFloat(ad_spend) || 0,
    attribution_window_days: parseInt(attribution_window_days, 10) || 7,

    media_type: media_url ? 'photo' : 'photo',
    message: message || '',
    media_url: media_url || null,
  });

  if (publish_now) {
    // Execute immediate publication and do not swallow errors
    return await publishScheduler.executePublish(created.id);
  } else {
    // If scheduled >= 10 minutes in future, try native Facebook Graph API scheduling
    const targetMs = targetScheduledTime.getTime();
    const nowMs = Date.now();

    if (targetMs >= nowMs + 600 * 1000) {
      try {
        console.log(`[Scheduler] Attempting native Facebook Graph API scheduling for post ${created.id}...`);
        const fbResult = await facebookService.publishPostToPage(page_id, {
          message: created.message,
          mediaUrl: created.media_url,
          scheduledTime: targetScheduledTime,
        });

        if (fbResult && fbResult.fb_post_id) {
          console.log(`[Scheduler] ✅ Natively scheduled on Facebook for post ${created.id}! FB Post ID: ${fbResult.fb_post_id}`);
          await repository.setScheduledPostFbId(created.id, fbResult.fb_post_id);
          return await repository.getTrackedPostById(created.id);
        }
      } catch (fbErr) {
        console.warn(`[Scheduler] Native FB scheduling attempt failed (${fbErr.message}). Falling back to MoonPulse in-memory scheduler.`);
      }
    }

    // Arm precision timer to execute at exact scheduled_time
    publishScheduler.armPostTimer(created);
    return created;
  }
};

/**
 * Legacy: Track an existing Facebook post by pasting URL/ID
 */
const markPost = async (postData) => {
  const { product_id, brand_id, tracking_type, page_id, fb_post_id } = postData;

  const hasProduct = product_id !== undefined && product_id !== null && product_id !== '' && !isNaN(Number(product_id));
  const hasBrand = brand_id !== undefined && brand_id !== null && brand_id !== '' && !isNaN(Number(brand_id));

  if (!hasProduct && !hasBrand) {
    const err = new Error('Either product_id or brand_id must be provided');
    err.status = 400;
    throw err;
  }
  if (!Number.isInteger(Number(page_id))) {
    const err = new Error('page_id must be an integer');
    err.status = 400;
    throw err;
  }
  if (typeof fb_post_id !== 'string' || !/^\d+_\d+$/.test(fb_post_id.trim())) {
    const err = new Error('fb_post_id must be in "{pageId}_{postId}" format — paste the post link again');
    err.status = 400;
    throw err;
  }

  let isPublished = false;
  let createdTime = null;
  let mediaType = 'photo';
  try {
    const fbStatus = await facebookService.checkPublished(fb_post_id, page_id);
    isPublished = fbStatus.is_published;
    createdTime = fbStatus.created_time;
    mediaType = fbStatus.media_type || 'photo';
  } catch (err) {
    isPublished = false;
  }

  const now = new Date();

  const trackedPost = await repository.createTrackedPost({
    ...postData,
    product_id: hasProduct ? parseInt(product_id, 10) : null,
    brand_id: hasBrand ? parseInt(brand_id, 10) : null,
    tracking_type: tracking_type || (hasBrand && !hasProduct ? 'brand' : 'product'),
    status: isPublished ? 'published' : 'scheduled',
    scheduled_time: now,
    published_time: isPublished ? (createdTime || now) : null,
    media_type: mediaType,
  });

  // If already published on Facebook, immediately fetch initial metrics
  if (isPublished) {
    try {
      const metrics = await facebookService.getPostMetrics(fb_post_id, page_id);
      let views = 0;
      let reach = 0;
      try {
        const insights = await facebookService.getInsights(fb_post_id, page_id);
        const viewsData = insights.data?.find(m => m.name === 'post_media_view');
        const reachData = insights.data?.find(m => m.name === 'post_total_media_view_unique');
        views = viewsData?.values?.[0]?.value || 0;
        reach = reachData?.values?.[0]?.value || 0;
      } catch (e) {}

      await repository.updateTrackedPostMetrics(trackedPost.id, metrics.likes, metrics.comments, metrics.shares, views, reach);
      trackedPost.likes_count = metrics.likes;
      trackedPost.comments_count = metrics.comments;
      trackedPost.shares_count = metrics.shares;
      trackedPost.views_count = views;
      trackedPost.reach_count = reach;
    } catch (err) {
      console.warn('Initial metrics sync for marked post failed:', err.message);
    }
  }

  const products = await productsService.listProducts();
  const prod = products.find(p => String(p.id) === String(product_id));

  return {
    ...trackedPost,
    product_name: prod ? prod.product_name : 'Unknown Product',
    product_image: prod ? prod.image_url : null,
  };
};

/**
 * Trigger immediate publication of a scheduled post
 */
const publishNow = async (id) => {
  return await publishScheduler.executePublish(id);
};

const getScheduledPosts = async () => {
  return await repository.getTrackedPostsByStatus('scheduled');
};

const getPublishedPosts = async () => {
  return await repository.getTrackedPostsByStatus('published');
};

const setPostPublished = async (id, publishedTime) => {
  return await repository.updateTrackedPostStatus(id, 'published', publishedTime || new Date());
};

const updatePost = async (id, { status, published_time }) => {
  if (!['scheduled', 'published', 'failed'].includes(status)) {
    const err = new Error('Invalid status value');
    err.status = 400;
    throw err;
  }
  return await repository.updateTrackedPostStatus(id, status, published_time || null);
};

const updateMetrics = async (id, likes, comments, shares, views, reach, mediaType) => {
  return await repository.updateTrackedPostMetrics(id, likes, comments, shares, views, reach, mediaType);
};

const editPostData = async (id, data) => {
  const existing = await repository.getTrackedPostById(id);
  if (!existing) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  // If fb_post_id is being updated/added
  if (data.fb_post_id && data.fb_post_id !== existing.fb_post_id) {
    try {
      const fbStatus = await facebookService.checkPublished(data.fb_post_id, existing.page_id);
      if (fbStatus.is_published) {
        data.status = 'published';
        data.published_time = fbStatus.created_time || new Date();
      }
    } catch (_) {}
  }

  const updated = await repository.updateTrackedPostData(id, data);

  // If fb_post_id is present and published, fetch fresh metrics
  if (updated.fb_post_id && updated.status === 'published') {
    try {
      const metrics = await facebookService.getPostMetrics(updated.fb_post_id, updated.page_id);
      let views = 0;
      let reach = 0;
      try {
        const insights = await facebookService.getInsights(updated.fb_post_id, updated.page_id);
        const viewsData = insights.data?.find(m => m.name === 'post_media_view');
        const reachData = insights.data?.find(m => m.name === 'post_total_media_view_unique');
        views = viewsData?.values?.[0]?.value || 0;
        reach = reachData?.values?.[0]?.value || 0;
      } catch (_) {}

      await repository.updateTrackedPostMetrics(id, metrics.likes, metrics.comments, metrics.shares, views, reach);
      updated.likes_count = metrics.likes;
      updated.comments_count = metrics.comments;
      updated.shares_count = metrics.shares;
      updated.views_count = views;
      updated.reach_count = reach;
    } catch (err) {
      console.warn(`Metrics update after editing post ${id} skipped:`, err.message);
    }
  }

  // If scheduled_time changed for a scheduled post, re-arm the timer
  if (updated.status === 'scheduled') {
    publishScheduler.armPostTimer(updated);
  } else {
    publishScheduler.cancelPostTimer(id);
  }

  return updated;
};

const getPostById = async (id) => {
  const post = await repository.getTrackedPostById(id);
  if (!post) return null;

  const products = await productsService.listProducts();
  const brands = await productsService.listBrands();

  const prod = post.product_id ? products.find(p => String(p.id) === String(post.product_id)) : null;
  const brand = post.brand_id ? brands.find(b => String(b.brand_id) === String(post.brand_id) || String(b.id) === String(post.brand_id)) : (prod?.brand_id ? brands.find(b => String(b.brand_id) === String(prod.brand_id) || String(b.id) === String(prod.brand_id)) : null);

  const isBrandTracking = post.tracking_type === 'brand' || (!post.product_id && post.brand_id);
  const brandName = brand ? (brand.brand_name || brand.name) : (prod?.brand_name || null);
  const brandImage = brand ? (brand.image_url || null) : null;

  let productName = 'Unknown Target';
  let productImage = null;

  if (isBrandTracking) {
    productName = brandName ? `Brand: ${brandName} (All Products)` : 'Entire Brand Catalog';
    productImage = brandImage;
  } else if (prod) {
    productName = prod.product_name;
    productImage = prod.image_url;
  }

  return {
    ...post,
    product_name: productName,
    product_image: productImage,
    brand_id: post.brand_id || prod?.brand_id || null,
    brand_name: brandName,
    brand_image: brandImage,
    tracking_type: isBrandTracking ? 'brand' : 'product',
  };
};

const removePost = async (id) => {
  publishScheduler.cancelPostTimer(id);
  return await repository.deleteTrackedPost(id);
};

const updatePostCosts = async (id, contentCost, adSpend) => {
  return await repository.updateTrackedPostCosts(id, contentCost, adSpend);
};

module.exports = {
  listPosts,
  getPostById,
  createAndSchedulePost,
  markPost,
  publishNow,
  getScheduledPosts,
  getPublishedPosts,
  setPostPublished,
  updatePost,
  updateMetrics,
  editPostData,
  removePost,
  updatePostCosts,
};