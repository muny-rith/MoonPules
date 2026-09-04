const repository = require('./postTracker.repository');
const facebookService = require('../facebook/facebook.service');
const productsService = require('../products/products.service');

const listPosts = async () => {
  const posts = await repository.getAllTrackedPosts();
  const products = await productsService.listProducts();
  
  return posts.map(post => {
    const prod = products.find(p => String(p.id) === String(post.product_id));
    return {
      ...post,
      product_name: prod ? prod.product_name : 'Unknown Product',
      product_image: prod ? prod.image_url : null
    };
  });
};

const markPost = async (postData) => {
  const { product_id, page_id, fb_post_id } = postData;

  if (!Number.isInteger(Number(product_id))) {
    const err = new Error('product_id must be an integer');
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
  try {
    const fbStatus = await facebookService.checkPublished(fb_post_id, page_id);
    isPublished = fbStatus.is_published;
    createdTime = fbStatus.created_time;
  } catch (err) {
    isPublished = false;
  }

  const now = new Date();

  const trackedPost = await repository.createTrackedPost({
    ...postData,
    status: isPublished ? 'published' : 'scheduled',
    scheduled_time: now,          // ← always set — "when we marked it"
    published_time: isPublished ? (createdTime || now) : null,
  });

  // If already published on Facebook, immediately fetch initial metrics so data is available right away
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
      } catch (e) {
        // Fallback or restricted
      }

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
  if (!['scheduled', 'published'].includes(status)) {
    const err = new Error('Invalid status value');
    err.status = 400;
    throw err;
  }
  return await repository.updateTrackedPostStatus(id, status, published_time || null);
};

const updateMetrics = async (id, likes, comments, shares, views, reach) => {
  return await repository.updateTrackedPostMetrics(id, likes, comments, shares, views, reach);
};

const editPostData = async (id, data) => {
  return await repository.updateTrackedPostData(id, data);
};

const removePost = async (id) => {
  return await repository.deleteTrackedPost(id);
};

const updatePostCosts = async (id, contentCost, adSpend) => {
  return await repository.updateTrackedPostCosts(id, contentCost, adSpend);
};

module.exports = {
  listPosts,
  markPost,
  getScheduledPosts,
  getPublishedPosts,
  setPostPublished,
  updatePost,
  updateMetrics,
  editPostData,
  removePost,
  updatePostCosts,
};