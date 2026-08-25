require('dotenv').config();
const fbClient = require('./src/modules/facebook/facebook.client');
const db = require('./src/config/db');

async function testFb() {
  const result = await db.query(`SELECT fb_post_id, page_id, access_token FROM tb_post_tracker JOIN tb_fb_page ON tb_post_tracker.page_id = tb_fb_page.id WHERE status = 'published' LIMIT 1`);
  const post = result.rows[0];
  
  const testMetric = async (metric) => {
    try {
      console.log(`Testing ${metric}...`);
      const data = await fbClient.getFbData(`/${post.fb_post_id}/insights?metric=${metric}`, post.access_token);
      console.log(`${metric} SUCCESS!`, JSON.stringify(data).substring(0, 100));
    } catch(e) {
      console.error(`Error ${metric}:`, e.message);
    }
  };

  await testMetric('views');
  await testMetric('post_views');
  await testMetric('reach');
  
  process.exit();
}
testFb();
