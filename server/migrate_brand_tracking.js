const db = require('./src/config/db');

const migrate = async () => {
  try {
    console.log('[migrate_brand_tracking] Starting migration for brand tracking on tb_post_tracker...');

    // 1. Drop NOT NULL on product_id so posts can track an entire brand
    await db.query(`ALTER TABLE tb_post_tracker ALTER COLUMN product_id DROP NOT NULL;`);
    console.log('✅ product_id is now nullable');

    // 2. Add brand_id column
    await db.query(`ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS brand_id INT NULL;`);
    console.log('✅ brand_id column added');

    // 3. Add tracking_type column
    await db.query(`ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(20) DEFAULT 'product';`);
    console.log('✅ tracking_type column added');

    // 4. Add check constraint (drop first if exists to be idempotent)
    await db.query(`ALTER TABLE tb_post_tracker DROP CONSTRAINT IF EXISTS chk_post_tracker_target;`);
    await db.query(`
      ALTER TABLE tb_post_tracker 
      ADD CONSTRAINT chk_post_tracker_target 
      CHECK (product_id IS NOT NULL OR brand_id IS NOT NULL);
    `);
    console.log('✅ chk_post_tracker_target constraint added');

    // 5. Add index on brand_id
    await db.query(`CREATE INDEX IF NOT EXISTS idx_post_tracker_brand ON tb_post_tracker(brand_id);`);
    console.log('✅ idx_post_tracker_brand index created');

    console.log('[migrate_brand_tracking] Migration completed successfully! 🎉');
    process.exit(0);
  } catch (err) {
    console.error('[migrate_brand_tracking] Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
