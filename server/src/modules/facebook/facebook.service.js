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
  const data = await fbClient.getFbData(`/${postId}?fields=is_published,created_time,status_type,attachments{media_type,type,target{id}}`, access_token);
  const createdDate = data.created_time ? new Date(data.created_time) : null;
  // Facebook may omit is_published on standard published feed posts. If created_time exists and is in the past, it's published.
  const isPublished = data.is_published === true || (data.is_published !== false && createdDate !== null && createdDate <= new Date());

  let mediaType = 'photo';
  const attMedia = data.attachments?.data?.[0]?.media_type?.toLowerCase();
  const statusType = data.status_type?.toLowerCase();
  const targetId = data.attachments?.data?.[0]?.target?.id || postId.split('_')[1];

  if (statusType === 'live_video_broadcast') {
    mediaType = 'live';
  } else if (attMedia === 'video' || statusType === 'added_video') {
    mediaType = 'video';
    if (targetId) {
      try {
        const vid = await fbClient.getFbData(`/${targetId}?fields=live_status`, access_token);
        if (vid.live_status === 'VOD' || vid.live_status === 'LIVE') {
          mediaType = 'live';
        }
      } catch (_) {}
    }
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
    const data = await fbClient.getFbData(`/${postId}?fields=status_type,attachments{media_type,type,target{id}}`, access_token);
    const attMedia = data.attachments?.data?.[0]?.media_type?.toLowerCase();
    const statusType = data.status_type?.toLowerCase();
    const targetId = data.attachments?.data?.[0]?.target?.id || postId.split('_')[1];

    if (statusType === 'live_video_broadcast') {
      return 'live';
    }
    if (attMedia === 'video' || statusType === 'added_video') {
      if (targetId) {
        try {
          const vid = await fbClient.getFbData(`/${targetId}?fields=live_status`, access_token);
          if (vid.live_status === 'VOD' || vid.live_status === 'LIVE') {
            return 'live';
          }
        } catch (_) {}
      }
      return 'video';
    }
    return 'photo';
  } catch (err) {
    console.warn(`[getPostMediaType] failed for ${postId}:`, err.message);
    return 'photo';
  }
};

const getInsights = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const metrics = 'post_media_view,post_total_media_view_unique';
  try {
    return await fbClient.getFbData(`/${postId}/insights?metric=${metrics}`, access_token);
  } catch (err) {
    console.warn(`[getInsights] Insights query failed for ${postId}: ${err.message}`);
    return { data: [] };
  }
};

const getPostMetrics = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  let likes = 0;
  let comments = 0;
  let shares = 0;

  try {
    const data = await fbClient.getFbData(
      `/${postId}?fields=reactions.summary(true),likes.summary(true),comments.summary(true),shares`,
      access_token
    );
    likes = data.reactions?.summary?.total_count ?? data.likes?.summary?.total_count ?? 0;
    comments = data.comments?.summary?.total_count ?? 0;
    shares = data.shares?.count ?? 0;
    return { likes, comments, shares };
  } catch (err) {
    console.warn(`[getPostMetrics] Combined query failed for ${postId}: ${err.message}. Trying individual fields...`);
  }

  // Fallback: try individual fields so one field error doesn't drop the rest
  try {
    const rx = await fbClient.getFbData(`/${postId}?fields=reactions.summary(true)`, access_token);
    likes = rx.reactions?.summary?.total_count ?? 0;
  } catch (e) {
    try {
      const lk = await fbClient.getFbData(`/${postId}?fields=likes.summary(true)`, access_token);
      likes = lk.likes?.summary?.total_count ?? 0;
    } catch (_) { }
  }

  try {
    const cm = await fbClient.getFbData(`/${postId}?fields=comments.summary(true)`, access_token);
    comments = cm.comments?.summary?.total_count ?? 0;
  } catch (_) { }

  try {
    const sh = await fbClient.getFbData(`/${postId}?fields=shares`, access_token);
    shares = sh.shares?.count ?? 0;
  } catch (_) { }

  return { likes, comments, shares };
};

const getPages = async () => {
  return await repository.listPages();
};

module.exports = {
  getPageCredentials,
  getScheduledPosts,
  getRecentPosts, // ← new
  checkPublished,
  getPostMediaType,
  getInsights,
  getPostMetrics,
  getPages,
};