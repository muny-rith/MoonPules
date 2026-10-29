const db = require('../../config/db');
const facebookService = require('../facebook/facebook.service');
const postTrackerRepository = require('../postTracker/postTracker.repository');

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN || 'moonpulse_webhook_secret_token';

/**
 * Meta Webhook Challenge Verification (GET /api/webhooks/facebook)
 */
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Webhook] ✅ Meta Webhook successfully verified challenge!');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Webhook] ❌ Verification failed: token mismatch');
      return res.sendStatus(403);
    }
  }

  return res.sendStatus(400);
};

/**
 * Meta Webhook Event Handler (POST /api/webhooks/facebook)
 * Receives real-time events for reactions, comments, shares on Page feed/videos
 */
const handleWebhookEvent = async (req, res) => {
  const body = req.body;

  // Immediately respond 200 to Meta to acknowledge receipt within 5s SLA
  res.status(200).send('EVENT_RECEIVED');

  if (body.object !== 'page') return;

  try {
    for (const entry of body.entry || []) {
      const pageFbId = entry.id;
      for (const change of entry.changes || []) {
        const val = change.value;
        if (!val) continue;

        // Extract possible post/video identifiers from the webhook event
        const candidateIds = [
          val.post_id,
          val.video_id,
          val.photo_id,
          val.parent_id,
        ].filter(Boolean).map(String);

        if (candidateIds.length === 0) continue;

        console.log(`[Webhook] Event '${change.field}' item '${val.item}' verb '${val.verb}' for target:`, candidateIds);

        // Find if this post is tracked in MoonPulse
        const matchQuery = `
          SELECT pt.id, pt.fb_post_id, pt.page_id, pt.likes_count, pt.comments_count, pt.shares_count
          FROM tb_post_tracker pt
          JOIN tb_fb_page fp ON pt.page_id = fp.id
          WHERE pt.fb_post_id = ANY($1) 
             OR pt.fb_post_id LIKE '%' || $2 || '%'
          LIMIT 1
        `;
        const matched = await db.query(matchQuery, [candidateIds, candidateIds[0]]);
        if (matched.rows.length === 0) continue;

        const post = matched.rows[0];
        console.log(`[Webhook] 🎯 Matched tracked post ID ${post.id} (${post.fb_post_id}). Refreshing engagement...`);

        // Asynchronously update engagement metrics for this single post with 0 full-polling overhead
        (async () => {
          try {
            const metrics = await facebookService.getPostMetrics(post.fb_post_id, post.page_id);
            const insights = await facebookService.getInsights(post.fb_post_id, post.page_id);
            const viewsData = insights.data?.find(m => m.name === 'post_media_view');
            const reachData = insights.data?.find(m => m.name === 'post_total_media_view_unique');
            const views = viewsData?.values?.[0]?.value ?? null;
            const reach = reachData?.values?.[0]?.value ?? null;

            await postTrackerRepository.updateTrackedPostMetrics(
              post.id,
              metrics.likes,
              metrics.comments,
              metrics.shares,
              views,
              reach
            );
            console.log(`[Webhook] ✅ Updated post ${post.id}: Likes=${metrics.likes}, Comments=${metrics.comments}, Shares=${metrics.shares}`);
          } catch (err) {
            console.warn(`[Webhook] Background sync for post ${post.id} failed:`, err.message);
          }
        })();
      }
    }
  } catch (err) {
    console.error('[Webhook] Error processing webhook event:', err);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhookEvent,
};
