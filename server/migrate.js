require('dotenv').config();
const db = require('./src/config/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE tb_post_tracker 
      ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
