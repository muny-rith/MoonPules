const db = require('../src/config/db');
const fbClient = require('../src/modules/facebook/facebook.client');

async function run() {
  try {
    await db.query('ALTER TABLE tb_fb_page ADD COLUMN IF NOT EXISTS picture_url TEXT;');
    const res = await db.query('SELECT id, page_name, fb_page_id, access_token FROM tb_fb_page WHERE is_active = true');
    for (const row of res.rows) {
      try {
        const picRes = await fbClient.getFbData(`/${row.fb_page_id}/picture?redirect=false&height=100&width=100`, row.access_token);
        const picUrl = picRes?.data?.url;
        if (picUrl) {
          await db.query('UPDATE tb_fb_page SET picture_url = $1 WHERE id = $2', [picUrl, row.id]);
          console.log('Successfully updated picture for:', row.page_name);
        }
      } catch (err) {
        console.error('Failed to get picture for', row.page_name, err.message);
      }
    }
    const check = await db.query('SELECT id, page_name, fb_page_id, picture_url FROM tb_fb_page');
    console.log('Current pages in database:', check.rows);
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    process.exit(0);
  }
}

run();
