const repository = require('./postTracker.repository');

const listPosts = async () => {
  return await repository.getAllTrackedPosts();
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
  if (typeof fb_post_id !== 'string' || fb_post_id.trim() === '') {
    const err = new Error('fb_post_id is required');
    err.status = 400;
    throw err;
  }

  return await repository.createTrackedPost({ ...postData, status: 'scheduled' });
};

const getScheduledPosts = async () => {
  return await repository.getTrackedPostsByStatus('scheduled');
};

const setPostPublished = async (id) => {
  return await repository.updateTrackedPostStatus(id, 'published', new Date());
};

const updatePost = async (id, { status, published_time }) => {
  if (!['scheduled', 'published'].includes(status)) {
    const err = new Error('Invalid status value');
    err.status = 400;
    throw err;
  }
  return await repository.updateTrackedPostStatus(id, status, published_time || null);
};

module.exports = {
  listPosts,
  markPost,
  getScheduledPosts,
  setPostPublished,
  updatePost, // ← add
};