const repository = require('./postTracker.repository');

const listPosts = async () => {
  return await repository.getAllTrackedPosts();
};

const markPost = async (postData) => {
  if (!postData.product_id || !postData.page_id || !postData.fb_post_id) {
    throw new Error('Missing required fields');
  }
  return await repository.createTrackedPost({
    ...postData,
    status: 'scheduled',
  });
};

const getScheduledPosts = async () => {
  return await repository.getTrackedPostsByStatus('scheduled');
};

const setPostPublished = async (id) => {
  return await repository.updateTrackedPostStatus(id, 'published', new Date());
};

module.exports = {
  listPosts,
  markPost,
  getScheduledPosts,
  setPostPublished,
};
