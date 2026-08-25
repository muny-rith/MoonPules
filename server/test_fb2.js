require('dotenv').config();
const fbClient = require('./src/modules/facebook/facebook.client');
const db = require('./src/config/db');

async function testFb() {
  const result = await db.query(`SELECT fb_post_id, page_id, access_token FROM tb_post_tracker JOIN tb_fb_page ON tb_post_tracker.page_id = tb_fb_page.id WHERE status = 'published' LIMIT 1`);
  const post = result.rows[0];
  
  const testField = async (field) => {
    try {
      console.log(`Testing ${field}...`);
      const data = await fbClient.getFbData(`/${post.fb_post_id}?fields=${field}`, post.access_token);
      console.log(`${field}:`, data);
    } catch(e) {
      console.error(`Error ${field}`);
    }
  };

  await testField('likes.summary(true)');
  await testField('comments.summary(true)');
  await testField('shares');
  
  process.exit();
}
testFb();
