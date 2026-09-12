require('dotenv').config();
const db = require('../config/db');
const facebookService = require('../modules/facebook/facebook.service');
const storageService = require('../modules/storage/supabaseStorage.service');
const repository = require('../modules/postTracker/postTracker.repository');

async function migratePostMedia() {
  console.log('========================================================');
  console.log('🔄 MoonPulse Post Media Migration & Healing Tool');
  console.log('========================================================\n');

  try {
    const result = await db.query(`
      SELECT pt.id, pt.fb_post_id, pt.page_id, pt.media_url, pt.status, fp.page_name
      FROM tb_post_tracker pt
      JOIN tb_fb_page fp ON pt.page_id = fp.id
      WHERE pt.fb_post_id IS NOT NULL
      ORDER BY pt.id DESC
    `);

    const posts = result.rows;
    console.log(`Found ${posts.length} tracked Facebook posts.`);

    let healedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const post of posts) {
      const isLegacyUpload = post.media_url && (post.media_url.startsWith('/uploads/') || post.media_url.startsWith('["'));
      const isMissing = !post.media_url;

      if (!isLegacyUpload && !isMissing && post.media_url.startsWith('http')) {
        // Already has valid web URL
        skippedCount++;
        continue;
      }

      console.log(`\n[Post #${post.id}] (FB ID: ${post.fb_post_id}, Page: ${post.page_name})`);
      console.log(`Current media_url: ${post.media_url ? (post.media_url.length > 60 ? post.media_url.slice(0, 60) + '...' : post.media_url) : 'NULL'}`);

      try {
        const fbMedia = await facebookService.getPostMedia(post.fb_post_id, post.page_id);
        if (!fbMedia?.primaryUrl) {
          console.warn(`⚠️ No media found on Facebook for post ${post.id}. Skipping.`);
          failedCount++;
          continue;
        }

        console.log(`Found Facebook image: ${fbMedia.primaryUrl.slice(0, 70)}...`);
        console.log(`Caching to Supabase Storage...`);
        const permanentUrl = await storageService.syncImageFromUrl(
          fbMedia.primaryUrl,
          `fb_${post.fb_post_id}_cover.jpg`
        );

        if (permanentUrl) {
          await repository.updateTrackedPostData(post.id, { media_url: permanentUrl });
          console.log(`✅ Successfully updated Post #${post.id} with permanent URL: ${permanentUrl}`);
          healedCount++;
        }
      } catch (err) {
        console.error(`❌ Failed to heal Post #${post.id}:`, err.message);
        failedCount++;
      }
    }

    console.log('\n========================================================');
    console.log(`🎉 Migration Completed!`);
    console.log(`✅ Healed:  ${healedCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`❌ Failed:  ${failedCount}`);
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('Fatal Migration Error:', error);
    process.exit(1);
  }
}

migratePostMedia();
