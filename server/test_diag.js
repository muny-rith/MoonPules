require('dotenv').config();
const statsService = require('./src/modules/statistics/statistics.service');

async function diagnose() {
  const detail = await statsService.getBrandDetail('2');
  console.log('\n=== getBrandDetail(2) result ===');
  console.log('brand_name:', detail.brand_name);
  console.log('total_posts:', detail.total_posts);
  console.log('total_likes:', detail.total_likes);
  console.log('total_views:', detail.total_views);
  console.log('total_reach:', detail.total_reach);
  console.log('\nPosts:');
  detail.posts.forEach(p => {
    console.log(`  id=${p.id} product_id=${p.product_id} views=${p.views_count} reach=${p.reach_count} likes=${p.likes_count}`);
  });
  process.exit();
}
diagnose().catch(err => { console.error(err); process.exit(1); });
