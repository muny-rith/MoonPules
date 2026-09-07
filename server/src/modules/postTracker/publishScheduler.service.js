const repository = require('./postTracker.repository');
const facebookService = require('../facebook/facebook.service');

// Map of active in-memory timers: postId -> TimeoutId
const activeTimers = new Map();

/**
 * Executes the publication of a scheduled post to Facebook
 */
const executePublish = async (postId) => {
  cancelPostTimer(postId);

  const post = await repository.getTrackedPostById(postId);
  if (!post) {
    console.warn(`[Scheduler] Post ${postId} not found.`);
    return null;
  }

  if (post.status !== 'scheduled') {
    console.log(`[Scheduler] Post ${postId} is already ${post.status}. Skipping.`);
    return post;
  }

  console.log(`[Scheduler] 🚀 Publishing post ${postId} (Product: ${post.product_id}, Page: ${post.page_name}) to Facebook at ${new Date().toISOString()}...`);

  try {
    const published = await facebookService.publishPostToPage(post.page_id, {
      message: post.message,
      mediaUrl: post.media_url,
    });

    const permanentFbPostId = published.fb_post_id;
    if (!permanentFbPostId) {
      throw new Error('Facebook did not return a permanent post ID');
    }

    console.log(`[Scheduler] ✅ Successfully published post ${postId}! Permanent FB Post ID: ${permanentFbPostId}`);

    // Update database to published
    const updatedPost = await repository.markPostAsPublished(post.id, permanentFbPostId, new Date());

    // Fetch initial metrics
    try {
      const metrics = await facebookService.getPostMetrics(permanentFbPostId, post.page_id);
      let views = 0;
      let reach = 0;
      try {
        const insights = await facebookService.getInsights(permanentFbPostId, post.page_id);
        const viewsData = insights.data?.find((m) => m.name === 'post_media_view');
        const reachData = insights.data?.find((m) => m.name === 'post_total_media_view_unique');
        views = viewsData?.values?.[0]?.value || 0;
        reach = reachData?.values?.[0]?.value || 0;
      } catch (_) {}

      await repository.updateTrackedPostMetrics(
        post.id,
        metrics.likes,
        metrics.comments,
        metrics.shares,
        views,
        reach,
        post.media_url ? 'photo' : 'photo'
      );
    } catch (metricErr) {
      console.warn(`[Scheduler] Initial metric sync for post ${postId} skipped:`, metricErr.message);
    }

    return updatedPost;
  } catch (err) {
    console.error(`[Scheduler] ❌ Failed to publish post ${postId}:`, err.message);
    await repository.markPostAsFailed(post.id, err.message);
    throw err;
  }
};

/**
 * Arms a high-precision timer to fire exactly when scheduled_time arrives
 */
const armPostTimer = (post) => {
  if (!post || !post.id) return;

  // Cancel any existing timer for this post
  cancelPostTimer(post.id);

  if (post.status !== 'scheduled') return;

  const targetTime = post.scheduled_time ? new Date(post.scheduled_time).getTime() : Date.now();
  const delay = targetTime - Date.now();

  if (delay <= 0) {
    // Due now or in the past: publish immediately
    console.log(`[Scheduler] Post ${post.id} is due immediately. Publishing now.`);
    executePublish(post.id).catch((e) => console.error(`Publish error on post ${post.id}:`, e.message));
  } else if (delay <= 2147483647) { // Max setTimeout delay (~24.8 days)
    console.log(`[Scheduler] ⏱️ Armed precision timer for post ${post.id}: fires in ${Math.round(delay / 1000)}s (at ${new Date(targetTime).toISOString()})`);
    const timer = setTimeout(() => {
      executePublish(post.id).catch((e) => console.error(`Publish error on post ${post.id}:`, e.message));
    }, delay);
    activeTimers.set(post.id, timer);
  }
};

/**
 * Cancels an active timer
 */
const cancelPostTimer = (postId) => {
  if (activeTimers.has(postId)) {
    clearTimeout(activeTimers.get(postId));
    activeTimers.delete(postId);
  }
};

/**
 * Initializes the scheduler on server startup
 */
const initScheduler = async () => {
  console.log('[Scheduler] Initializing precision publish scheduler...');

  try {
    // 1. Process any posts that became due while server was offline
    const duePosts = await repository.getDueScheduledPosts();
    if (duePosts.length > 0) {
      console.log(`[Scheduler] Found ${duePosts.length} overdue posts. Publishing now...`);
      for (const post of duePosts) {
        await executePublish(post.id).catch((e) => console.error(`Error processing overdue post ${post.id}:`, e.message));
      }
    }

    // 2. Arm timers for upcoming scheduled posts
    const upcomingPosts = await repository.getUpcomingScheduledPosts();
    console.log(`[Scheduler] Found ${upcomingPosts.length} upcoming scheduled posts. Arming precision timers...`);
    for (const post of upcomingPosts) {
      armPostTimer(post);
    }

    // 3. Fallback safety sweep every 1 minute to ensure nothing is ever missed
    setInterval(async () => {
      try {
        const missedPosts = await repository.getDueScheduledPosts();
        for (const p of missedPosts) {
          if (!activeTimers.has(p.id)) {
            console.log(`[Scheduler Safety Sweep] Picking up missed post ${p.id}`);
            await executePublish(p.id).catch((e) => console.error(`Safety sweep publish error on post ${p.id}:`, e.message));
          }
        }
      } catch (sweepErr) {
        console.error('[Scheduler Safety Sweep Error]:', sweepErr.message);
      }
    }, 60000);

    console.log('[Scheduler] Precision scheduler ready.');
  } catch (err) {
    console.error('[Scheduler] Initialization failed:', err);
  }
};

module.exports = {
  executePublish,
  armPostTimer,
  cancelPostTimer,
  initScheduler,
};
