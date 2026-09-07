require('dotenv').config();
const db = require('../config/db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting scheduler migration on tb_post_tracker...');
    await client.query('BEGIN');

    // 1. Make fb_post_id nullable
    await client.query(`ALTER TABLE tb_post_tracker ALTER COLUMN fb_post_id DROP NOT NULL;`);
    console.log('✓ Made fb_post_id nullable');

    // 2. Drop unique constraint if exists
    const res = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'tb_post_tracker'::regclass AND contype = 'u'
    `);
    for (const row of res.rows) {
      console.log(`Dropping unique constraint: ${row.conname}`);
      await client.query(`ALTER TABLE tb_post_tracker DROP CONSTRAINT IF EXISTS "${row.conname}";`);
    }

    // 3. Create partial unique index
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_post_tracker_fb_post_id 
      ON tb_post_tracker(fb_post_id) 
      WHERE fb_post_id IS NOT NULL;
    `);
    console.log('✓ Created partial unique index on fb_post_id (non-null)');

    // 4. Add columns if not exist
    await client.query(`
      ALTER TABLE tb_post_tracker
      ADD COLUMN IF NOT EXISTS message TEXT,
      ADD COLUMN IF NOT EXISTS media_url TEXT,
      ADD COLUMN IF NOT EXISTS publish_error TEXT;
    `);
    console.log('✓ Added message, media_url, publish_error columns');

    // 5. Update status check constraint to allow 'failed'
    const checkConstraints = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'tb_post_tracker'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%'
    `);
    for (const row of checkConstraints.rows) {
      console.log(`Dropping status check constraint: ${row.conname}`);
      await client.query(`ALTER TABLE tb_post_tracker DROP CONSTRAINT IF EXISTS "${row.conname}";`);
    }
    await client.query(`
      ALTER TABLE tb_post_tracker
      ADD CONSTRAINT tb_post_tracker_status_check
      CHECK (status IN ('scheduled', 'published', 'failed'));
    `);
    console.log('✓ Updated status check constraint to allow (scheduled, published, failed)');

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
