// server/src/modules/facebook/facebook.service.js
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
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
        const reachItem = vi.data?.find((m) =>
          m.name === 'post_impressions_unique' ||
          m.name === 'total_video_views_unique' ||
          m.name === 'blue_reels_play_count' ||
          m.name === 'post_total_media_view_unique'
        );
        if (reachItem?.values?.[0]?.value != null) {
          reach = reachItem.values[0].value;
        }
        const playsItem = vi.data?.find((m) =>
          m.name === 'fb_reels_total_plays' ||
          m.name === 'total_video_views' ||
          m.name === 'blue_reels_play_count'
        );
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
        const reachItem = vi.data?.find((m) =>
          m.name === 'post_impressions_unique' ||
          m.name === 'total_video_views_unique' ||
          m.name === 'blue_reels_play_count' ||
          m.name === 'post_total_media_view_unique'
        );
        const playsItem = vi.data?.find((m) =>
          m.name === 'fb_reels_total_plays' ||
          m.name === 'total_video_views' ||
          m.name === 'blue_reels_play_count'
        );
        return {
          data: [
            { name: 'post_media_view', values: [{ value: vidData.views ?? playsItem?.values?.[0]?.value ?? null }] },
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
      let likes = data.likes?.summary?.total_count ?? 0;
      let comments = data.comments?.summary?.total_count ?? 0;
      let shares = 0;

      try {
        const vi = await fbClient.getFbData(`/${postIdStr}/video_insights`, access_token);
        const rxItem = vi.data?.find((m) => m.name === 'post_video_likes_by_reaction_type');
        if (rxItem?.values?.[0]?.value && typeof rxItem.values[0].value === 'object') {
          const totalRx = Object.values(rxItem.values[0].value).reduce((a, b) => a + (Number(b) || 0), 0);
          if (totalRx > likes) likes = totalRx;
        }
        const actionItem = vi.data?.find((m) => m.name === 'post_video_social_actions');
        if (actionItem?.values?.[0]?.value?.SHARE != null) {
          shares = Number(actionItem.values[0].value.SHARE) || 0;
        }
      } catch (_) {}

      return { likes, comments, shares };
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

const publishPostToPage = async (pageId, { message, mediaUrl, scheduledTime, thumbnailUrl }) => {
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
        let videoRes = null;
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
          videoRes = await fbClient.postFbData(`/${fb_page_id}/videos`, access_token, formData, formData.getHeaders());
        } else if (isRemoteUrl) {
          const videoPayload = {
            file_url: videoUrlItem,
            description: message || '',
            published: !isScheduled,
          };
          if (isScheduled) {
            videoPayload.scheduled_publish_time = scheduledPublishTime;
          }
          videoRes = await fbClient.postFbData(`/${fb_page_id}/videos`, access_token, videoPayload);
        }

        if (videoRes && videoRes.id) {
          // If a custom thumbnail was chosen, upload to Facebook Video Thumbnails edge
          if (thumbnailUrl) {
            try {
              console.log(`[FB Video] Uploading preferred thumbnail for video ${videoRes.id}...`);
              let thumbBuffer = null;
              if (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) {
                const imgRes = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });
                thumbBuffer = Buffer.from(imgRes.data);
              } else {
                const localThumbPath = resolveLocalUploadPath(thumbnailUrl);
                if (localThumbPath && fs.existsSync(localThumbPath)) {
                  thumbBuffer = fs.readFileSync(localThumbPath);
                }
              }

              if (thumbBuffer) {
                const thumbFormData = new FormData();
                thumbFormData.append('source', thumbBuffer, { filename: 'thumbnail.jpg', contentType: 'image/jpeg' });
                thumbFormData.append('is_preferred', 'true');
                await fbClient.postFbData(`/${videoRes.id}/thumbnails`, access_token, thumbFormData, thumbFormData.getHeaders());
                console.log(`[FB Video] ✅ Custom thumbnail successfully attached to video ${videoRes.id}!`);
              }
            } catch (thumbErr) {
              console.warn(`[FB Video] Could not attach thumbnail to video ${videoRes.id}:`, thumbErr.message);
            }
          }

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
          formData.append('temporary', 'true');

          const photoRes = await fbClient.postFbData(`/${fb_page_id}/photos?published=false&temporary=true`, access_token, formData, formData.getHeaders());
          if (photoRes?.id) photoIds.push(photoRes.id);
        } else if (isRemoteUrl) {
          try {
            const photoPayload = {
              url: urlItem,
              published: false,
              temporary: true,
            };

            const photoRes = await fbClient.postFbData(`/${fb_page_id}/photos?published=false&temporary=true`, access_token, photoPayload);
            if (photoRes?.id) photoIds.push(photoRes.id);
          } catch (urlUploadErr) {
            console.warn(`[FB Photos] Direct URL upload to Facebook failed for ${urlItem} (${urlUploadErr.message}). Retrying via buffer stream...`);
            const imgRes = await axios.get(urlItem, { responseType: 'arraybuffer', timeout: 15000 });
            const formData = new FormData();
            formData.append('source', Buffer.from(imgRes.data), { filename: 'upload.jpg' });
            formData.append('published', 'false');
            formData.append('temporary', 'true');
            const streamRes = await fbClient.postFbData(`/${fb_page_id}/photos?published=false&temporary=true`, access_token, formData, formData.getHeaders());
            if (streamRes?.id) photoIds.push(streamRes.id);
          }
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

const deletePostFromPage = async (pageId, fbPostId) => {
  if (!fbPostId) return { success: false, reason: 'No fbPostId provided' };
  try {
    const { access_token } = await getPageCredentials(pageId);
    const postIdStr = String(fbPostId).trim();
    try {
      const res = await fbClient.deleteFbData(`/${postIdStr}`, access_token);
      return { success: res?.success ?? true };
    } catch (err) {
      if (postIdStr.includes('_')) {
        const singleId = postIdStr.split('_')[1];
        try {
          const res = await fbClient.deleteFbData(`/${singleId}`, access_token);
          return { success: res?.success ?? true };
        } catch (innerErr) {
          throw err;
        }
      }
      throw err;
    }
  } catch (err) {
    if (err.isPostDeleted) {
      return { success: true, alreadyDeleted: true };
    }
    console.warn(`[deletePostFromPage] Failed to delete FB post ${fbPostId} on page ${pageId}:`, err.message);
    return { success: false, error: err.message };
  }
};

const syncPostsBatchForPage = async (pageId, posts) => {
  if (!posts || posts.length === 0) return [];
  const { access_token } = await getPageCredentials(pageId);

  const results = [];
  // Chunk into groups of 25 posts (each post generates 2 requests: metrics + insights = 50 sub-requests max)
  const chunkSize = 25;
  for (let i = 0; i < posts.length; i += chunkSize) {
    const chunk = posts.slice(i, i + chunkSize);
    const batchOps = [];

    chunk.forEach((p, idx) => {
      const postIdStr = String(p.fb_post_id).trim();
      const isVideoId = !postIdStr.includes('_');
      if (isVideoId) {
        batchOps.push({
          method: 'GET',
          relative_url: `${postIdStr}?fields=views,likes.summary(true),comments.summary(true)`,
          name: `metrics_${idx}`,
        });
        batchOps.push({
          method: 'GET',
          relative_url: `${postIdStr}/video_insights`,
          name: `insights_${idx}`,
        });
      } else {
        batchOps.push({
          method: 'GET',
          relative_url: `${postIdStr}?fields=reactions.summary(true),likes.summary(true),comments.summary(true),shares,status_type,attachments{media_type,type,target{id}}`,
          name: `metrics_${idx}`,
        });
        batchOps.push({
          method: 'GET',
          relative_url: `${postIdStr}/insights?metric=post_media_view,post_total_media_view_unique`,
          name: `insights_${idx}`,
        });
      }
    });

    let batchRes = [];
    try {
      batchRes = await fbClient.postFbBatch(batchOps, access_token);
    } catch (batchErr) {
      console.warn(`[syncPostsBatchForPage] Batch call failed for page ${pageId}:`, batchErr.message);
    }

    // Process results for each post in chunk
    chunk.forEach((p, idx) => {
      const metricsRes = batchRes[idx * 2];
      const insightsRes = batchRes[idx * 2 + 1];

      const postIdStr = String(p.fb_post_id).trim();
      const isVideoId = !postIdStr.includes('_');

      let likes = p.likes_count || 0;
      let comments = p.comments_count || 0;
      let shares = p.shares_count || 0;
      let views = p.views_count ?? null;
      let reach = p.reach_count ?? null;
      let mediaType = p.media_type || (isVideoId ? 'video' : 'photo');

      if (metricsRes && metricsRes.code === 200 && metricsRes.data) {
        const md = metricsRes.data;
        if (isVideoId) {
          likes = md.likes?.summary?.total_count ?? likes;
          comments = md.comments?.summary?.total_count ?? comments;
          if (md.views != null) views = md.views;
        } else {
          likes = md.reactions?.summary?.total_count ?? md.likes?.summary?.total_count ?? likes;
          comments = md.comments?.summary?.total_count ?? comments;
          shares = md.shares?.count ?? shares;

          const attMedia = md.attachments?.data?.[0]?.media_type?.toLowerCase();
          const statusType = md.status_type?.toLowerCase();
          if (statusType === 'live_video_broadcast') {
            mediaType = 'live';
          } else if (attMedia === 'video' || statusType === 'added_video') {
            mediaType = 'video';
          } else {
            mediaType = 'photo';
          }
        }
      }

      if (insightsRes && insightsRes.code === 200 && insightsRes.data) {
        const id = insightsRes.data;
        if (isVideoId) {
          const reachItem = id.data?.find((m) =>
            m.name === 'post_impressions_unique' ||
            m.name === 'total_video_views_unique' ||
            m.name === 'blue_reels_play_count' ||
            m.name === 'post_total_media_view_unique'
          );
          if (reachItem?.values?.[0]?.value != null) {
            reach = reachItem.values[0].value;
          }
          const playsItem = id.data?.find((m) =>
            m.name === 'fb_reels_total_plays' ||
            m.name === 'total_video_views' ||
            m.name === 'blue_reels_play_count'
          );
          if (views == null && playsItem?.values?.[0]?.value != null) {
            views = playsItem.values[0].value;
          }

          const rxItem = id.data?.find((m) => m.name === 'post_video_likes_by_reaction_type');
          if (rxItem?.values?.[0]?.value && typeof rxItem.values[0].value === 'object') {
            const totalRx = Object.values(rxItem.values[0].value).reduce((a, b) => a + (Number(b) || 0), 0);
            if (totalRx > likes) likes = totalRx;
          }
          const actionItem = id.data?.find((m) => m.name === 'post_video_social_actions');
          if (actionItem?.values?.[0]?.value?.SHARE != null) {
            shares = Number(actionItem.values[0].value.SHARE) || 0;
          }
        } else {
          const viewsData = id.data?.find(m => m.name === 'post_media_view');
          const reachData = id.data?.find(m => m.name === 'post_total_media_view_unique');
          if (viewsData?.values?.[0]?.value != null) views = viewsData.values[0].value;
          if (reachData?.values?.[0]?.value != null) reach = reachData.values[0].value;
        }
      }

      results.push({
        post: p,
        likes,
        comments,
        shares,
        views,
        reach,
        mediaType,
      });
    });

    if (i + chunkSize < posts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
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
  deletePostFromPage,
  syncPostsBatchForPage,
};