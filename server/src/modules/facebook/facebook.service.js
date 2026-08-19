const fbClient = require('./facebook.client');
const db = require('../../config/db');
const repository = require('./facebook.repository');

const getPages = async () => {
  return await repository.listPages();
};
const getPageCredentials = async (pageId) => {
  const result = await db.query(
    'SELECT access_token, fb_page_id FROM tb_fb_page WHERE id = $1',
    [pageId]
  );
  if (result.rows.length === 0) throw new Error('Page not found');
  return result.rows[0]; // { access_token, fb_page_id }
};

const getScheduledPosts = async (pageId) => {
  const { access_token, fb_page_id } = await getPageCredentials(pageId);
  return await fbClient.getFbData(
    `/${fb_page_id}/scheduled_posts?fields=id,message,created_time`,
    access_token
  );
};

const checkPublished = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const data = await fbClient.getFbData(`/${postId}?fields=is_published`, access_token);
  return data.is_published;
};

const getInsights = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const metrics = 'post_impressions,post_impressions_unique,post_engaged_users';
  return await fbClient.getFbData(`/${postId}/insights?metric=${metrics}`, access_token);
};

module.exports = {
  getPageCredentials,
  getScheduledPosts,
  checkPublished,
  getInsights,
  getPages,
};