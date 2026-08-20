// server/src/modules/facebook/facebook.controller.js
const service = require('./facebook.service');

const getPages = async (req, res, next) => {
  try {
    const pages = await service.getPages();
    res.json(pages);
  } catch (error) {
    next(error);
  }
};

const getScheduledPosts = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const data = await service.getScheduledPosts(pageId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getRecentPosts = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const data = await service.getRecentPosts(pageId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getInsights = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { pageId } = req.query;
    if (!pageId) return res.status(400).json({ error: 'pageId query parameter required' });
    const data = await service.getInsights(postId, pageId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPages,
  getScheduledPosts,
  getRecentPosts, // ← new
  getInsights,
};