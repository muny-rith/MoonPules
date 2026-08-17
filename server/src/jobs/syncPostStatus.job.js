const cron = require('node-cron');
const postTrackerService = require('../modules/postTracker/postTracker.service');
const facebookService = require('../modules/facebook/facebook.service');

const syncPostStatus = async () => {
  console.log(`[Cron] Starting syncPostStatus job at ${new Date().toISOString()}`);
  try {
    const scheduledRows = await postTrackerService.getScheduledPosts();
    console.log(`[Cron] Found ${scheduledRows.length} scheduled posts to check.`);

    for (const row of scheduledRows) {
      try {
        const isPublished = await facebookService.checkPublished(row.fb_post_id, row.page_id);
        if (isPublished) {
          await postTrackerService.setPostPublished(row.id);
          console.log(`[Cron] Post ${row.id} marked as published.`);
        }
      } catch (err) {
        console.error(`[Cron] Error checking post ${row.id}:`, err.message);
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
