// server/src/modules/facebook/facebook.service.js
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
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
  const postIdStr = String(postId).trim();
  const isVideoId = !postIdStr.includes('_');

  if (isVideoId) {
    try {
      const data = await fbClient.getFbData(
        `/${postIdStr}?fields=id,published,status,created_time,picture,description,permalink_url`,
        access_token
      );
      const isPublished = data.published === true || data.status?.publishing_phase?.publish_status === 'published';
      const publishTimeStr = data.status?.publishing_phase?.publish_time || data.created_time;
      const createdDate = publishTimeStr ? new Date(publishTimeStr) : null;
      return {
        is_published: isPublished,
        created_time: createdDate,
        media_type: 'video',
        picture_url: data.picture || null,
      };
    } catch (err) {
      console.warn(`[checkPublished] Video query failed for ${postIdStr}: ${err.message}. Trying feed post check...`);
    }
  }

  try {
    const data = await fbClient.getFbData(
      `/${postIdStr}?fields=is_published,created_time,status_type,full_picture,attachments{media_type,type,media,subattachments,target{id}}`,
      access_token
    );
    const createdDate = data.created_time ? new Date(data.created_time) : null;
    // Facebook may omit is_published on standard published feed posts. If created_time exists and is in the past, it's published.
    const isPublished = data.is_published === true || (data.is_published !== false && createdDate !== null && createdDate <= new Date());

    let mediaType = 'photo';
    const attMedia = data.attachments?.data?.[0]?.media_type?.toLowerCase();
    const statusType = data.status_type?.toLowerCase();
    const targetId = data.attachments?.data?.[0]?.target?.id || postIdStr.split('_')[1];

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

    const pictureUrl = data.full_picture || data.attachments?.data?.[0]?.media?.image?.src || null;

    return {
      is_published: isPublished,
      created_time: createdDate,
      media_type: mediaType,
      picture_url: pictureUrl,
    };
  } catch (feedErr) {
    if (feedErr.message?.includes('is_published') || feedErr.message?.includes('status_type') || feedErr.message?.includes('nonexisting field')) {
      try {
        const data = await fbClient.getFbData(
          `/${postIdStr}?fields=id,published,status,created_time,picture,description,permalink_url`,
          access_token
        );
        const isPublished = data.published === true || data.status?.publishing_phase?.publish_status === 'published';
        const publishTimeStr = data.status?.publishing_phase?.publish_time || data.created_time;
        const createdDate = publishTimeStr ? new Date(publishTimeStr) : null;
        return {
          is_published: isPublished,
          created_time: createdDate,
          media_type: 'video',
          picture_url: data.picture || null,
        };
      } catch (_) {}
    }
    throw feedErr;
  }
};

const getPostMedia = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const postIdStr = String(postId).trim();
  const isVideoId = !postIdStr.includes('_');

  if (isVideoId) {
    try {
      const data = await fbClient.getFbData(`/${postIdStr}?fields=picture`, access_token);
      return {
        primaryUrl: data.picture || null,
        allUrls: data.picture ? [data.picture] : [],
      };
    } catch (vidErr) {
      console.warn(`[getPostMedia] Video media query failed for ${postIdStr}:`, vidErr.message);
    }
  }

  try {
    const data = await fbClient.getFbData(
      `/${postIdStr}?fields=full_picture,attachments{media_type,type,media,subattachments}`,
      access_token
    );
    const primaryUrl = data.full_picture || data.attachments?.data?.[0]?.media?.image?.src || null;
    const subList = data.attachments?.data?.[0]?.subattachments?.data || [];
    const allUrls = subList.map((item) => item.media?.image?.src).filter(Boolean);
    if (primaryUrl && !allUrls.includes(primaryUrl)) {
      allUrls.unshift(primaryUrl);
    }
    return {
      primaryUrl,
      allUrls: allUrls.length > 0 ? allUrls : (primaryUrl ? [primaryUrl] : []),
    };
  } catch (err) {
    try {
      const data = await fbClient.getFbData(`/${postIdStr}?fields=picture`, access_token);
      if (data?.picture) {
        return { primaryUrl: data.picture, allUrls: [data.picture] };
      }
    } catch (_) {}

    console.warn(`[getPostMedia] Failed for ${postIdStr}:`, err.message);
    return { primaryUrl: null, allUrls: [] };
  }
};

const getPostMediaType = async (postId, pageId) => {
  const postIdStr = String(postId).trim();
  if (!postIdStr.includes('_')) {
    return 'video';
  }
  try {
    const { access_token } = await getPageCredentials(pageId);
    const data = await fbClient.getFbData(`/${postIdStr}?fields=status_type,attachments{media_type,type,target{id}}`, access_token);
    const attMedia = data.attachments?.data?.[0]?.media_type?.toLowerCase();
    const statusType = data.status_type?.toLowerCase();
    const targetId = data.attachments?.data?.[0]?.target?.id || postIdStr.split('_')[1];

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
    if (err.message?.includes('status_type') || err.message?.includes('attachments') || err.message?.includes('nonexisting field')) {
      return 'video';
    }
    console.warn(`[getPostMediaType] failed for ${postIdStr}:`, err.message);
    return 'photo';
  }
};

const getInsights = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const postIdStr = String(postId).trim();
  const isVideoId = !postIdStr.includes('_');

  if (isVideoId) {
    try {
      let views = null;
      let reach = null;

      try {
        const vidData = await fbClient.getFbData(`/${postIdStr}?fields=views`, access_token);
        if (vidData.views != null) views = vidData.views;
      } catch (_) {}

      try {
        const vi = await fbClient.getFbData(`/${postIdStr}/video_insights`, access_token);
        const reachItem = vi.data?.find((m) => m.name === 'post_impressions_unique');
        if (reachItem?.values?.[0]?.value != null) {
          reach = reachItem.values[0].value;
        }
        const playsItem = vi.data?.find((m) => m.name === 'fb_reels_total_plays' || m.name === 'blue_reels_play_count');
        if (views == null && playsItem?.values?.[0]?.value != null) {
          views = playsItem.values[0].value;
        }
      } catch (_) {}

      return {
        data: [
          { name: 'post_media_view', values: [{ value: views }] },
          { name: 'post_total_media_view_unique', values: [{ value: reach }] },
        ],
      };
    } catch (err) {
      console.warn(`[getInsights] Video insights query failed for ${postIdStr}: ${err.message}`);
    }
  }

  const metrics = 'post_media_view,post_total_media_view_unique';
  try {
    return await fbClient.getFbData(`/${postIdStr}/insights?metric=${metrics}`, access_token);
  } catch (err) {
    if (err.message?.includes('insights') || err.message?.includes('nonexisting field')) {
      try {
        const vidData = await fbClient.getFbData(`/${postIdStr}?fields=views`, access_token);
        const vi = await fbClient.getFbData(`/${postIdStr}/video_insights`, access_token);
        const reachItem = vi.data?.find((m) => m.name === 'post_impressions_unique');
        return {
          data: [
            { name: 'post_media_view', values: [{ value: vidData.views ?? null }] },
            { name: 'post_total_media_view_unique', values: [{ value: reachItem?.values?.[0]?.value ?? null }] },
          ],
        };
      } catch (_) {}
    }
    console.warn(`[getInsights] Insights query failed for ${postIdStr}: ${err.message}`);
    return { data: [] };
  }
};

const getPostMetrics = async (postId, pageId) => {
  const { access_token } = await getPageCredentials(pageId);
  const postIdStr = String(postId).trim();
  const isVideoId = !postIdStr.includes('_');

  if (isVideoId) {
    try {
      const data = await fbClient.getFbData(
        `/${postIdStr}?fields=likes.summary(true),comments.summary(true)`,
        access_token
      );
      const likes = data.likes?.summary?.total_count ?? 0;
      const comments = data.comments?.summary?.total_count ?? 0;
      return { likes, comments, shares: 0 };
    } catch (err) {
      console.warn(`[getPostMetrics] Video metrics query failed for ${postIdStr}: ${err.message}`);
    }
  }

  let likes = 0;
  let comments = 0;
  let shares = 0;

  try {
    const data = await fbClient.getFbData(
      `/${postIdStr}?fields=reactions.summary(true),likes.summary(true),comments.summary(true),shares`,
      access_token
    );
    likes = data.reactions?.summary?.total_count ?? data.likes?.summary?.total_count ?? 0;
    comments = data.comments?.summary?.total_count ?? 0;
    shares = data.shares?.count ?? 0;
    return { likes, comments, shares };
  } catch (err) {
    console.warn(`[getPostMetrics] Combined query failed for ${postIdStr}: ${err.message}. Trying individual fields...`);
  }

  // Fallback: try individual fields so one field error doesn't drop the rest
  try {
    const rx = await fbClient.getFbData(`/${postIdStr}?fields=reactions.summary(true)`, access_token);
    likes = rx.reactions?.summary?.total_count ?? 0;
  } catch (e) {
    try {
      const lk = await fbClient.getFbData(`/${postIdStr}?fields=likes.summary(true)`, access_token);
      likes = lk.likes?.summary?.total_count ?? 0;
    } catch (_) { }
  }

  try {
    const cm = await fbClient.getFbData(`/${postIdStr}?fields=comments.summary(true)`, access_token);
    comments = cm.comments?.summary?.total_count ?? 0;
  } catch (_) { }

  try {
    const sh = await fbClient.getFbData(`/${postIdStr}?fields=shares`, access_token);
    shares = sh.shares?.count ?? 0;
  } catch (_) { }

  return { likes, comments, shares };
};

const getPages = async () => {
  const pages = await repository.listPages();
  for (const p of pages) {
    const isStale = !p.picture_url || !p.updated_at || (Date.now() - new Date(p.updated_at).getTime() > 6 * 60 * 60 * 1000);
    if (isStale) {
      try {
        const creds = await getPageCredentials(p.id);
        const picRes = await fbClient.getFbData(`/${creds.fb_page_id}/picture?redirect=false&height=100&width=100`, creds.access_token);
        if (picRes?.data?.url) {
          await db.query('UPDATE tb_fb_page SET picture_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [picRes.data.url, p.id]);
          p.picture_url = picRes.data.url;
        }
      } catch (err) {
        console.warn(`[getPages] Failed to refresh picture for page ${p.id}:`, err.message);
      }
    }
  }
  return pages;
};

const resolveLocalUploadPath = (mediaUrl) => {
  if (!mediaUrl) return null;
  if (path.isAbsolute(mediaUrl) && fs.existsSync(mediaUrl)) return mediaUrl;

  const cleanPath = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl;

  // Check MoonPulse/server/uploads
  const serverPath = path.join(__dirname, '../../../', cleanPath);
  if (fs.existsSync(serverPath)) return serverPath;

  // Check MoonPulse/uploads (root uploads)
  const rootPath = path.join(__dirname, '../../../../', cleanPath);
  if (fs.existsSync(rootPath)) return rootPath;

  // Check cwd relative
  const cwdPath = path.resolve(process.cwd(), cleanPath);
  if (fs.existsSync(cwdPath)) return cwdPath;

  return null;
};

const publishPostToPage = async (pageId, { message, mediaUrl, scheduledTime }) => {
  const { access_token, fb_page_id } = await getPageCredentials(pageId);

  // Check if native Facebook scheduling is requested (FB requires scheduled_publish_time >= 10m in the future)
  let isScheduled = false;
  let scheduledPublishTime = null;
  if (scheduledTime) {
    const targetTimestamp = Math.floor(new Date(scheduledTime).getTime() / 1000);
    const nowTimestamp = Math.floor(Date.now() / 1000);
    // 10 minutes = 600s. Give a small buffer of 610s
    if (targetTimestamp >= nowTimestamp + 600) {
      isScheduled = true;
      scheduledPublishTime = targetTimestamp;
    }
  }

  // Step 1: If mediaUrl is provided (Photo feed post / Create Post - supports single or multiple photos)
  if (mediaUrl) {
    let mediaUrls = [];
    if (Array.isArray(mediaUrl)) {
      mediaUrls = mediaUrl;
    } else if (typeof mediaUrl === 'string' && mediaUrl.trim()) {
      try {
        const parsed = JSON.parse(mediaUrl);
        if (Array.isArray(parsed)) mediaUrls = parsed;
        else mediaUrls = [mediaUrl];
      } catch {
        mediaUrls = [mediaUrl];
      }
    }

    // Check if media contains a video
    const videoUrlItem = mediaUrls.find((url) => {
      if (!url || typeof url !== 'string') return false;
      const clean = url.split('?')[0].split('#')[0].toLowerCase();
      return /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(clean);
    });

    if (videoUrlItem) {
      const isRemoteUrl = videoUrlItem.startsWith('http://') || videoUrlItem.startsWith('https://');
      const localPath = !isRemoteUrl ? resolveLocalUploadPath(videoUrlItem) : null;

      try {
        if (localPath && fs.existsSync(localPath)) {
          const formData = new FormData();
          formData.append('source', fs.createReadStream(localPath));
          formData.append('description', message || '');
          if (isScheduled) {
            formData.append('published', 'false');
            formData.append('scheduled_publish_time', String(scheduledPublishTime));
          } else {
            formData.append('published', 'true');
          }
          const videoRes = await fbClient.postFbData(`/${fb_page_id}/videos`, access_token, formData, formData.getHeaders());
          return { fb_post_id: videoRes.id, is_scheduled: isScheduled, media_type: 'video' };
        } else if (isRemoteUrl) {
          const videoPayload = {
            file_url: videoUrlItem,
            description: message || '',
            published: !isScheduled,
          };
          if (isScheduled) {
            videoPayload.scheduled_publish_time = scheduledPublishTime;
          }
          const videoRes = await fbClient.postFbData(`/${fb_page_id}/videos`, access_token, videoPayload);
          return { fb_post_id: videoRes.id, is_scheduled: isScheduled, media_type: 'video' };
        }
      } catch (videoErr) {
        console.error(`Failed to publish video ${videoUrlItem} to Facebook:`, videoErr);
        throw videoErr;
      }
    }

    const photoIds = [];

    for (const urlItem of mediaUrls) {
      if (!urlItem) continue;
      const isRemoteUrl = urlItem.startsWith('http://') || urlItem.startsWith('https://');
      const localPath = !isRemoteUrl ? resolveLocalUploadPath(urlItem) : null;

      try {
        if (localPath && fs.existsSync(localPath)) {
          const formData = new FormData();
          formData.append('source', fs.createReadStream(localPath));
          formData.append('published', 'false');

          const photoRes = await fbClient.postFbData(`/${fb_page_id}/photos`, access_token, formData, formData.getHeaders());
          if (photoRes?.id) photoIds.push(photoRes.id);
        } else if (isRemoteUrl) {
          const photoPayload = {
            url: urlItem,
            published: false,
          };

          const photoRes = await fbClient.postFbData(`/${fb_page_id}/photos`, access_token, photoPayload);
          if (photoRes?.id) photoIds.push(photoRes.id);
        }
      } catch (uploadErr) {
        console.error(`Failed to upload media item ${urlItem} to Facebook:`, uploadErr);
      }
    }

    if (photoIds.length > 0) {
      // Step 2: Publish/Schedule as a true Feed Post with attached_media
      const feedPayload = {
        message: message || '',
        attached_media: photoIds.map(id => ({ media_fbid: id })),
      };

      if (isScheduled) {
        feedPayload.published = false;
        feedPayload.scheduled_publish_time = scheduledPublishTime;
        feedPayload.unpublished_content_type = 'SCHEDULED';
      } else {
        feedPayload.published = true;
      }

      const feedRes = await fbClient.postFbData(`/${fb_page_id}/feed`, access_token, feedPayload);
      return { fb_post_id: feedRes.id, photo_ids: photoIds, is_scheduled: isScheduled };
    }
  }

  // Step 2: Text-only post
  const feedPayload = {
    message: message || '',
  };

  if (isScheduled) {
    feedPayload.published = false;
    feedPayload.scheduled_publish_time = scheduledPublishTime;
    feedPayload.unpublished_content_type = 'SCHEDULED';
  } else {
    feedPayload.published = true;
  }

  const res = await fbClient.postFbData(`/${fb_page_id}/feed`, access_token, feedPayload);
  return { fb_post_id: res.id, is_scheduled: isScheduled };
};

module.exports = {
  getPageCredentials,
  getScheduledPosts,
  getRecentPosts,
  checkPublished,
  getPostMediaType,
  getPostMedia,
  getInsights,
  getPostMetrics,
  getPages,
  publishPostToPage,
};