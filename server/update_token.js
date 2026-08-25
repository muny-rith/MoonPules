require('dotenv').config();
const db = require('./src/config/db');

const token = process.argv[2];

if (!token) {
  console.log("❌ Please provide a token! Example: node update_token.js \"YOUR_LONG_TOKEN\"");
  process.exit(1);
}

async function updateToken() {
  try {
    // Update the database with the new token
    await db.query(`UPDATE tb_fb_page SET access_token = $1`, [token]);
    console.log("✅ Token updated successfully in the database!");
    
    // Automatically trigger the background sync to test it
    console.log("🔄 Running background sync to fetch your real data from Facebook...");
    const syncJob = require('./src/jobs/syncPostStatus.job');
    await syncJob.syncPostStatus();
    
    console.log("🎉 Sync complete! Check your browser to see your real insights!");
  } catch(e) {
    console.error("❌ Error:", e);
  } finally {
    process.exit();
  }
}

updateToken();
