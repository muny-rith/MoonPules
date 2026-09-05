// server/src/modules/facebook/facebook.service.js
const fbClient = require('./facebook.client');
const db = require('../../config/db');
const repository = require('./facebook.repository');

const getPageCredentials = async (pageId) => {
  const result = await db.query(
    'SELECT access_token, fb_page_id FROM tb_fb_page WHERE fb_page_id = $1 OR id::text = $1',
    [String(pageId)]
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

const getRecentPosts = async (pageId) => {
  const { access_token, fb_page_id } = await getPageCredentials(pageId);
  return await fbClient.getFbData(
    `/${fb_page_id}/posts?fields=id,message,created_time&limit=10`,
    access_token
  );
};

const checkPublished = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const data = await fbClient.getFbData(`/${postId}?fields=is_published,created_time,status_type,attachments{media_type,type}`, access_token);
  const createdDate = data.created_time ? new Date(data.created_time) : null;
  // Facebook may omit is_published on standard published feed posts. If created_time exists and is in the past, it's published.
  const isPublished = data.is_published === true || (data.is_published !== false && createdDate !== null && createdDate <= new Date());

  let mediaType = 'photo';
  const attMedia = data.attachments?.data?.[0]?.media_type?.toLowerCase();
  const attType = data.attachments?.data?.[0]?.type?.toLowerCase();
  const statusType = data.status_type?.toLowerCase();
  // Check live BEFORE video — a completed live stream's attachments.media_type
  // becomes "video" after it ends, which would otherwise shadow the live check.
  if (statusType === 'live_video_broadcast') {
    mediaType = 'live';
  } else if (attMedia === 'video' || statusType === 'added_video') {
    mediaType = (attType === 'reel' || statusType === 'created_reel') ? 'reel' : 'video';
  }

  return {
    is_published: isPublished,
    created_time: createdDate,
    media_type: mediaType
  };
};

const getPostMediaType = async (postId, pageId) => {
  try {
    const { access_token } = await getPageCredentials(pageId);
    const data = await fbClient.getFbData(`/${postId}?fields=status_type,attachments{media_type,type}`, access_token);
    const attMedia = data.attachments?.data?.[0]?.media_type?.toLowerCase();
    const attType = data.attachments?.data?.[0]?.type?.toLowerCase();
    const statusType = data.status_type?.toLowerCase();
    // Same ordering fix as checkPublished above.
    if (statusType === 'live_video_broadcast') {
      return 'live';
    }
    if (attMedia === 'video' || statusType === 'added_video') {
      return (attType === 'reel' || statusType === 'created_reel') ? 'reel' : 'video';
    }
    return 'photo';
  } catch (err) {
    console.warn(`[getPostMediaType] failed for ${postId}:`, err.message);
    return 'photo';
  }
};

const getInsights = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const metrics = 'post_engaged_users,views';
  return await fbClient.getFbData(`/${postId}/insights?metric=${metrics}`, access_token);
};

const getPostMetrics = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const data = await fbClient.getFbData(
    `/${postId}?fields=likes.summary(true),comments.summary(true),shares`,
    access_token
  );
  return {
    likes: data.likes?.summary?.total_count || 0,
    comments: data.comments?.summary?.total_count || 0,
    shares: data.shares?.count || 0,
  };
};

const getPages = async () => {
  return await repository.listPages();
};

module.exports = {
  getPageCredentials,
  getScheduledPosts,
  getRecentPosts,
  checkPublished,
  getPostMediaType,
  getInsights,
  getPostMetrics,
  getPages,
};