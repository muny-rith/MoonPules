const cron = require('node-cron');
const postTrackerService = require('../modules/postTracker/postTracker.service');
const facebookService = require('../modules/facebook/facebook.service');

/**
 * Check if scheduled posts on Facebook have become published
 */
const checkScheduledPosts = async () => {
  const scheduledRows = await postTrackerService.getScheduledPosts();
  if (scheduledRows.length === 0) return;

  console.log(`[Cron] Checking ${scheduledRows.length} scheduled posts...`);
  for (const row of scheduledRows) {
    if (!row.fb_post_id) continue;
    try {
      const fbStatus = await facebookService.checkPublished(row.fb_post_id, row.page_id);
      if (fbStatus.is_published) {
        await postTrackerService.setPostPublished(row.id, fbStatus.created_time);
        console.log(`[Cron] Post ${row.id} (${row.fb_post_id}) marked as published.`);
      }
    } catch (err) {
      if (err.isTokenExpired) {
        console.error(`[Cron] TOKEN EXPIRED for post ${row.id} (page_id ${row.page_id}) — needs manual reconnect.`);
      } else if (err.isPostDeleted) {
        console.warn(`[Cron] Post ${row.id} no longer exists on Facebook — marking as archived.`);
        await postTrackerService.updatePost(row.id, { status: 'archived' });
      } else {
        console.error(`[Cron] Error checking scheduled post ${row.id}:`, err.message);
      }
    }
  }
};

/**
 * Efficiently syncs an array of posts using Meta Batch API (up to 25 posts / 50 sub-requests per HTTP call)
 */
const syncPostsList = async (posts, label = 'Sync') => {
  if (!posts || posts.length === 0) {
    console.log(`[Cron ${label}] No posts to sync in this tier.`);
    return;
  }

  console.log(`[Cron ${label}] Starting batch sync for ${posts.length} posts...`);

  // Group posts by page_id for Meta Batch API
  const pageMap = new Map();
  posts.forEach((p) => {
    if (!p.fb_post_id) return;
    if (!pageMap.has(p.page_id)) pageMap.set(p.page_id, []);
    pageMap.get(p.page_id).push(p);
  });

  for (const [pageId, pagePosts] of pageMap.entries()) {
    try {
      const batchedResults = await facebookService.syncPostsBatchForPage(pageId, pagePosts);
      for (const res of batchedResults) {
        await postTrackerService.updateMetrics(
          res.post.id,
          res.likes,
          res.comments,
          res.shares,
          res.views,
          res.reach,
          res.mediaType
        );
      }
      console.log(`[Cron ${label}] ✅ Page ${pageId}: Synced ${batchedResults.length} posts via Meta Batch API.`);
    } catch (err) {
      console.error(`[Cron ${label}] ❌ Failed batch sync for page ${pageId}:`, err.message);
    }
  }
};

/**
 * HOT TIER: Syncs every 30 minutes (posts ≤ 3 days old + active ads with ad_spend > 0)
 */
const syncHotTier = async () => {
  console.log(`[Cron HotTier] Starting run at ${new Date().toISOString()}`);
  try {
    await checkScheduledPosts();
    const hotPosts = await postTrackerService.getHotPublishedPosts(3);
    await syncPostsList(hotPosts, 'HotTier (0-3d)');
  } catch (err) {
    console.error('[Cron HotTier] Error during sync:', err.message);
  }
};

/**
 * WARM TIER: Syncs 2x daily at 09:00 and 21:00 (posts 4-14 days old)
 */
const syncWarmTier = async () => {
  console.log(`[Cron WarmTier] Starting run at ${new Date().toISOString()}`);
  try {
    const warmPosts = await postTrackerService.getWarmPublishedPosts(3, 14);
    await syncPostsList(warmPosts, 'WarmTier (4-14d)');
  } catch (err) {
    console.error('[Cron WarmTier] Error during sync:', err.message);
  }
};

/**
 * COOL TIER: Syncs once weekly on Sunday at 03:00 (posts 15-30 days old)
 */
const syncCoolTier = async () => {
  console.log(`[Cron CoolTier] Starting run at ${new Date().toISOString()}`);
  try {
    const coolPosts = await postTrackerService.getCoolPublishedPosts(14, 30);
    await syncPostsList(coolPosts, 'CoolTier (15-30d)');
  } catch (err) {
    console.error('[Cron CoolTier] Error during sync:', err.message);
  }
};

/**
 * Scoped manual sync (called when user clicks "Sync Data" or refreshes a post in UI)
 */
const syncPostStatus = async (filters = {}) => {
  console.log(`[ScopedSync] Triggered with filters:`, filters);
  try {
    const postsToSync = await postTrackerService.getPostsForScopedSync(filters);
    await syncPostsList(postsToSync, 'UserScoped');
    return { count: postsToSync.length };
  } catch (err) {
    console.error('[ScopedSync] Error during scoped sync:', err);
    throw err;
  }
};

const startJob = () => {
  // Hot Tier: Every 30 minutes
  cron.schedule('*/30 * * * *', syncHotTier);

  // Warm Tier: Twice daily (09:00 and 21:00)
  cron.schedule('0 9,21 * * *', syncWarmTier);

  // Cool Tier: Weekly (Sunday 03:00 AM)
  cron.schedule('0 3 * * 0', syncCoolTier);

  console.log('[Cron] Tiered sync jobs scheduled: Hot (every 30m), Warm (2x/day), Cool (weekly).');
};

module.exports = {
  startJob,
  syncHotTier,
  syncWarmTier,
  syncCoolTier,
  syncPostStatus,
};