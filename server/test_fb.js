require('dotenv').config();
const facebookService = require('./src/modules/facebook/facebook.service');
const db = require('./src/config/db');

async function testFb() {
  const result = await db.query(`SELECT fb_post_id, page_id FROM tb_post_tracker WHERE status = 'published' LIMIT 1`);
  const post = result.rows[0];
  
  try {
    console.log("Testing getPostMetrics...");
    const metrics = await facebookService.getPostMetrics(post.fb_post_id, post.page_id);
    console.log("Metrics:", metrics);
  } catch(e) {
    console.error("Error getPostMetrics", e);
  }
  
  try {
    console.log("Testing getInsights...");
    const insights = await facebookService.getInsights(post.fb_post_id, post.page_id);
    console.log("Insights:", insights);
  } catch(e) {
    console.error("Error getInsights", e);
  }
  process.exit();
}
testFb();
