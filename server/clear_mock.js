require('dotenv').config();
const db = require('./src/config/db');

async function clearMockData() {
  try {
    await db.query(`
      UPDATE tb_post_tracker 
      SET likes_count = 0, comments_count = 0, shares_count = 0, views_count = 0, reach_count = 0
    `);
    console.log("Mock data cleared! All metrics reset to 0.");
  } catch (err) {
    console.error("Failed to clear data:", err);
  } finally {
    process.exit(0);
  }
}

clearMockData();
