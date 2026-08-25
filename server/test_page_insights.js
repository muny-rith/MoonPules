require('dotenv').config();
const fbClient = require('./src/modules/facebook/facebook.client');
const db = require('./src/config/db');

async function testFb() {
  const result = await db.query(`SELECT fb_page_id, access_token FROM tb_fb_page WHERE id = 3 LIMIT 1`);
  const page = result.rows[0];
  
  const testPageMetric = async (metric) => {
    try {
      console.log(`Testing page metric: ${metric}...`);
      const data = await fbClient.getFbData(`/${page.fb_page_id}/insights?metric=${metric}`, page.access_token);
      console.log(`${metric} SUCCESS!`);
    } catch(e) {
      console.error(`Error ${metric}:`, e.message);
    }
  };

  await testPageMetric('page_impressions');
  await testPageMetric('page_post_engagements');
  
  process.exit();
}
testFb();
