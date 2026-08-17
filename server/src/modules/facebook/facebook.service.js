const fbClient = require('./facebook.client');
const db = require('../../config/db');

const getPageAccessToken = async (pageId) => {
  const result = await db.query('SELECT access_token FROM tb_fb_page WHERE id = $1', [pageId]);
  if (result.rows.length === 0) throw new Error('Page not found');
  return result.rows[0].access_token;
};

const getScheduledPosts = async (pageId) => {
  const token = await getPageAccessToken(pageId);
  return await fbClient.getFbData(`/${pageId}/scheduled_posts?fields=id,message,created_time`, token);
};

const checkPublished = async (postId, pageId) => {
  const token = await getPageAccessToken(pageId);
  const data = await fbClient.getFbData(`/${postId}?fields=is_published`, token);
  return data.is_published;
};

const getInsights = async (postId, pageId) => {
  const token = await getPageAccessToken(pageId);
  const metrics = 'post_impressions,post_impressions_unique,post_engaged_users';
  return await fbClient.getFbData(`/${postId}/insights?metric=${metrics}`, token);
};

module.exports = {
  getPageAccessToken,
  getScheduledPosts,
  checkPublished,
  getInsights,
};
