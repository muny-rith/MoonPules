const db = require('./src/config/db');

const migrate = async () => {
  try {
    console.log('[migrate_profit] Adding cost columns to tb_post_tracker...');
    
    await db.query(`ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS content_cost NUMERIC(12,2) DEFAULT 0`);
    await db.query(`ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS ad_spend NUMERIC(12,2) DEFAULT 0`);
    await db.query(`ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS attribution_window_days INT DEFAULT 7`);
    
    console.log('[migrate_profit] Done! Columns added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[migrate_profit] Error:', err.message);
    process.exit(1);
  }
};

migrate();
