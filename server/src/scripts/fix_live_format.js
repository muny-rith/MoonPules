require('dotenv').config();
const db = require('../config/db');
const facebookService = require('../modules/facebook/facebook.service');

async function fixLiveFormat() {
  console.log('========================================================');
  console.log('🔄 MoonPulse Live Stream Format Restoration Tool');
  console.log('========================================================\n');

  try {
    const result = await db.query(`
      SELECT pt.id, pt.fb_post_id, pt.page_id, pt.media_type, pt.tracking_type, pt.published_time, fp.page_name
      FROM tb_post_tracker pt
      JOIN tb_fb_page fp ON pt.page_id = fp.id
      WHERE pt.fb_post_id IS NOT NULL
      ORDER BY pt.id DESC
    `);

    const posts = result.rows;
    console.log(`Found ${posts.length} tracked Facebook posts.`);

    let restoredCount = 0;
    let alreadyLiveCount = 0;
    let unchangedCount = 0;

    for (const post of posts) {
      if (post.media_type === 'live') {
        alreadyLiveCount++;
        continue;
      }

      try {
        const detectedType = await facebookService.getPostMediaType(post.fb_post_id, post.page_id);
        const shouldBeLive = detectedType === 'live' || (post.tracking_type === 'brand' && detectedType === 'video');

        if (shouldBeLive) {
          await db.query(`UPDATE tb_post_tracker SET media_type = 'live', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [post.id]);
          console.log(`✅ [Post #${post.id}] (${post.fb_post_id}) restored to 'live' format.`);
          restoredCount++;
        } else {
          unchangedCount++;
        }
      } catch (err) {
        console.warn(`⚠️ Post #${post.id} check failed:`, err.message);
        unchangedCount++;
      }
    }

    console.log('\n========================================================');
    console.log(`🎉 Live Format Restoration Completed!`);
    console.log(`✅ Restored to Live: ${restoredCount}`);
    console.log(`⏩ Already Live:     ${alreadyLiveCount}`);
    console.log(`⏺️ Other Posts:      ${unchangedCount}`);
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
}

fixLiveFormat();

