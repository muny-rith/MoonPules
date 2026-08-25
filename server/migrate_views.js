require('dotenv').config();
const db = require('./src/config/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE tb_post_tracker 
      ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reach_count INTEGER DEFAULT 0;
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
