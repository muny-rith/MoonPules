const service = require('./postTracker.service');

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
      marked_by: req.user.id,
    };
    const newPost = await service.markPost(postData);
    res.status(201).json(newPost);
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

module.exports = { getPosts, createPost, updatePost }; // ← add updatePost