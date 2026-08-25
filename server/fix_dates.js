require('dotenv').config();
const db = require('./src/config/db');
const facebookService = require('./src/modules/facebook/facebook.service');

async function fixDates() {
  try {
    const result = await db.query(`SELECT id, fb_post_id, page_id FROM tb_post_tracker WHERE status = 'published'`);
    const posts = result.rows;
    console.log(`Found ${posts.length} published posts to fix.`);

    for (const post of posts) {
      try {
        const fbStatus = await facebookService.checkPublished(post.fb_post_id, post.page_id);
        if (fbStatus.is_published && fbStatus.created_time) {
          await db.query(`UPDATE tb_post_tracker SET published_time = $1 WHERE id = $2`, [fbStatus.created_time, post.id]);
          console.log(`Fixed post ${post.id}: published_time = ${fbStatus.created_time}`);
        }
      } catch (e) {
        console.error(`Error fixing post ${post.id}:`, e.message);
      }
    }
    console.log("Done fixing dates!");
  } catch (err) {
    console.error("Failed to run script:", err);
  } finally {
    process.exit(0);
  }
}

fixDates();
