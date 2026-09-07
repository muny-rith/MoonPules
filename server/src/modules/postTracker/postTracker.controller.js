const service = require('./postTracker.service');
const { syncPostStatus } = require('../../jobs/syncPostStatus.job');

const getPosts = async (req, res, next) => {
  try {
    const posts = await service.listPosts();
    res.json(posts);
  } catch (error) {
    next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const postData = {
      ...req.body,
      marked_by: req.user?.id || 1,
    };

    // If direct scheduling / publishing mode (Method 1)
    if (req.body.mode === 'schedule' || !req.body.fb_post_id) {
      const newPost = await service.createAndSchedulePost(postData);
      return res.status(201).json(newPost);
    }

    // Legacy: tracking existing post by pasting Facebook URL
    const newPost = await service.markPost(postData);
    res.status(201).json(newPost);
  } catch (error) {
    next(error);
  }
};

const publishNow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const published = await service.publishNow(id);
    res.json(published);
  } catch (error) {
    next(error);
  }
};

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const relativePath = `/uploads/posts/${req.file.filename}`;
    res.json({
      url: relativePath,
      filename: req.file.filename,
    });
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await service.updatePost(id, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const updatePostData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await service.editPostData(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await service.removePost(id);
    if (!deleted) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted successfully', deleted });
  } catch (error) {
    next(error);
  }
};

const updatePostCosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content_cost, ad_spend } = req.body;
    const updated = await service.updatePostCosts(id, content_cost || 0, ad_spend || 0);
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const triggerSync = async (req, res, next) => {
  try {
    await syncPostStatus();
    res.json({ message: 'Sync completed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPosts,
  createPost,
  publishNow,
  uploadImage,
  updatePost,
  updatePostData,
  deletePost,
  updatePostCosts,
  triggerSync,
};