const cron = require('node-cron');
const postTrackerService = require('../modules/postTracker/postTracker.service');
const facebookService = require('../modules/facebook/facebook.service');

const syncPostStatus = async () => {
  console.log(`[Cron] Starting syncPostStatus & Insights job at ${new Date().toISOString()}`);
  try {
    // 1. Check Scheduled Posts
    const scheduledRows = await postTrackerService.getScheduledPosts();
    console.log(`[Cron] Found ${scheduledRows.length} scheduled posts to check.`);

    for (const row of scheduledRows) {
      try {
        const fbStatus = await facebookService.checkPublished(row.fb_post_id, row.page_id);
        if (fbStatus.is_published) {
          await postTrackerService.setPostPublished(row.id, fbStatus.created_time);
          console.log(`[Cron] Post ${row.id} marked as published.`);
        }
      } catch (err) {
        if (err.isTokenExpired) {
          console.error(`[Cron] TOKEN EXPIRED for post ${row.id} (page_id ${row.page_id}) — needs manual reconnect.`);
        } else {
          console.error(`[Cron] Error checking post ${row.id}:`, err.message);
        }
      }
    }

    // 2. Sync Metrics for Published Posts
    const publishedRows = await postTrackerService.getPublishedPosts();
    console.log(`[Cron] Found ${publishedRows.length} published posts to sync metrics.`);
    for (const row of publishedRows) {
      try {
        const metrics = await facebookService.getPostMetrics(row.fb_post_id, row.page_id);
        const mediaType = await facebookService.getPostMediaType(row.fb_post_id, row.page_id);

        let views = 0;
        let reach = 0;
        try {
          const insights = await facebookService.getInsights(row.fb_post_id, row.page_id);
          const viewsData = insights.data?.find(m => m.name === 'post_media_view');
          const reachData = insights.data?.find(m => m.name === 'post_total_media_view_unique');
          views = viewsData?.values?.[0]?.value || 0;
          reach = reachData?.values?.[0]?.value || 0;
        } catch (e) {
          if (e.isTokenExpired) {
            console.error(`[Cron] TOKEN EXPIRED fetching insights for post ${row.id} (page_id ${row.page_id}) — needs manual reconnect.`);
          } else {
            console.error(`[Cron] Error fetching insights for post ${row.id}:`, e.message);
          }
        }

        await postTrackerService.updateMetrics(row.id, metrics.likes, metrics.comments, metrics.shares, views, reach, mediaType);
        console.log(`[Cron] Metrics updated for post ${row.id}: L=${metrics.likes} C=${metrics.comments} S=${metrics.shares} V=${views} R=${reach} Format=${mediaType}`);
      } catch (err) {
        if (err.isTokenExpired) {
          console.error(`[Cron] TOKEN EXPIRED syncing metrics for post ${row.id} (page_id ${row.page_id}) — needs manual reconnect.`);
        } else {
          console.error(`[Cron] Error syncing metrics for post ${row.id}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error(`[Cron] Error in syncPostStatus job:`, error);
  }
};

const startJob = () => {
  cron.schedule('*/30 * * * *', syncPostStatus);
  console.log('[Cron] syncPostStatus job scheduled (every 30 mins).');
};

module.exports = {
  startJob,
  syncPostStatus,
};