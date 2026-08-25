require('dotenv').config();
const axios = require('axios');
const db = require('./src/config/db');

// Test with multiple API versions
const API_VERSIONS = ['v26.0'];

// Old deprecated metrics (expected to fail)
const OLD_POST_METRICS = [
  'post_impressions',
  'post_impressions_unique',
  'post_engaged_users',
];

// New replacement metrics (June 2026 framework)
const NEW_POST_METRICS = [
  'post_media_view',
  'post_total_media_view_unique',
  'post_clicks',
  'post_reactions_like_total',
  'post_activity',
];

// Old page metrics (expected to fail)
const OLD_PAGE_METRICS = [
  'page_impressions',
  'page_impressions_unique',
];

// New page replacement metrics
const NEW_PAGE_METRICS = [
  'page_media_view',
  'page_total_media_view_unique',
  'page_post_engagements',
  'page_fan_adds',
  'page_views_total',
];

const getFbData = async (version, endpoint, accessToken) => {
  try {
    const url = `https://graph.facebook.com/${version}${endpoint}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code,
      subcode: error.response?.data?.error?.error_subcode,
    };
  }
};

async function testPostMetrics(post) {
  console.log('\n' + '='.repeat(70));
  console.log('POST-LEVEL METRICS TEST');
  console.log(`Post ID: ${post.fb_post_id}`);
  console.log('='.repeat(70));

  for (const version of API_VERSIONS) {
    console.log(`\n--- API ${version} ---`);
    
    console.log('\n[OLD/DEPRECATED metrics]:');
    for (const metric of OLD_POST_METRICS) {
      const result = await getFbData(version, `/${post.fb_post_id}/insights?metric=${metric}`, post.access_token);
      if (result.success) {
        const dataStr = JSON.stringify(result.data?.data?.[0]?.values || result.data).substring(0, 150);
        console.log(`  ✅ ${metric}: ${dataStr}`);
      } else {
        console.log(`  ❌ ${metric}: ${result.error}`);
      }
    }

    console.log('\n[NEW REPLACEMENT metrics]:');
    for (const metric of NEW_POST_METRICS) {
      const result = await getFbData(version, `/${post.fb_post_id}/insights?metric=${metric}`, post.access_token);
      if (result.success) {
        const dataStr = JSON.stringify(result.data?.data?.[0]?.values || result.data).substring(0, 150);
        console.log(`  ✅ ${metric}: ${dataStr}`);
      } else {
        console.log(`  ❌ ${metric}: ${result.error}`);
      }
    }
  }
}

async function testPageMetrics(page) {
  console.log('\n' + '='.repeat(70));
  console.log('PAGE-LEVEL METRICS TEST');
  console.log(`Page ID: ${page.fb_page_id}`);
  console.log('='.repeat(70));

  for (const version of API_VERSIONS) {
    console.log(`\n--- API ${version} ---`);
    
    console.log('\n[OLD/DEPRECATED metrics]:');
    for (const metric of OLD_PAGE_METRICS) {
      const result = await getFbData(version, `/${page.fb_page_id}/insights?metric=${metric}&period=day`, page.access_token);
      if (result.success) {
        const dataStr = JSON.stringify(result.data?.data?.[0]?.values || result.data).substring(0, 150);
        console.log(`  ✅ ${metric}: ${dataStr}`);
      } else {
        console.log(`  ❌ ${metric}: ${result.error}`);
      }
    }

    console.log('\n[NEW REPLACEMENT metrics]:');
    for (const metric of NEW_PAGE_METRICS) {
      const result = await getFbData(version, `/${page.fb_page_id}/insights?metric=${metric}&period=day`, page.access_token);
      if (result.success) {
        const dataStr = JSON.stringify(result.data?.data?.[0]?.values || result.data).substring(0, 150);
        console.log(`  ✅ ${metric}: ${dataStr}`);
      } else {
        console.log(`  ❌ ${metric}: ${result.error}`);
      }
    }
  }
}

async function testDirectPostFields(post) {
  console.log('\n' + '='.repeat(70));
  console.log('DIRECT POST FIELDS TEST (not /insights)');
  console.log('='.repeat(70));

  // Also test reading fields directly from the post object (not insights endpoint)
  const directFields = ['shares', 'reactions.summary(true)', 'comments.summary(true)', 'likes.summary(true)'];
  
  for (const version of API_VERSIONS) {
    console.log(`\n--- API ${version} ---`);
    const result = await getFbData(version, `/${post.fb_post_id}?fields=${directFields.join(',')}`, post.access_token);
    if (result.success) {
      console.log(`  ✅ Direct fields:`, JSON.stringify(result.data, null, 2).substring(0, 300));
    } else {
      console.log(`  ❌ Direct fields: ${result.error}`);
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  Facebook Graph API - New vs Old Metrics Comprehensive Test         ║');
  console.log('║  Testing deprecated metrics AND new June 2026 replacements          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`Test run at: ${new Date().toISOString()}\n`);

  try {
    // Get a published post
    const postResult = await db.query(`
      SELECT t.fb_post_id, t.page_id, p.access_token, p.fb_page_id 
      FROM tb_post_tracker t 
      JOIN tb_fb_page p ON t.page_id = p.id 
      WHERE t.status = 'published' 
      LIMIT 1
    `);

    if (postResult.rows.length === 0) {
      console.log('❌ No published posts found in database!');
      process.exit(1);
    }

    const post = postResult.rows[0];
    console.log(`Found post: ${post.fb_post_id}`);
    console.log(`Page: ${post.fb_page_id}`);

    // Run all tests
    await testPostMetrics(post);
    await testPageMetrics(post);
    await testDirectPostFields(post);

    console.log('\n' + '='.repeat(70));
    console.log('TEST COMPLETE');
    console.log('='.repeat(70));
    console.log('\nLegend: ✅ = API returned data, ❌ = API returned error');
    console.log('Look for ✅ in the NEW REPLACEMENT sections to see what works.\n');

  } catch (err) {
    console.error('Fatal error:', err);
  }

  process.exit();
}

main();
