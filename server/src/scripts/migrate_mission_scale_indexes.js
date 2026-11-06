const db = require('../config/db');

const migrateMissionScaleIndexes = async () => {
  try {
    console.log('--- Applying high-scale indexes for missions and post_tracker ---');

    await db.query(`
      -- 1. Composite indexes on tb_post_tracker for brand + date queries
      CREATE INDEX IF NOT EXISTS idx_post_tracker_brand_pub ON tb_post_tracker(brand_id, published_time);
      CREATE INDEX IF NOT EXISTS idx_post_tracker_brand_sched ON tb_post_tracker(brand_id, scheduled_time);
      CREATE INDEX IF NOT EXISTS idx_post_tracker_pub_range ON tb_post_tracker(published_time);
      CREATE INDEX IF NOT EXISTS idx_post_tracker_sched_range ON tb_post_tracker(scheduled_time);

      -- 2. Performance indexes on tb_brand_mission_slot for fast matching & JOINs
      CREATE INDEX IF NOT EXISTS idx_mission_slot_lookup ON tb_brand_mission_slot(mission_id, planned_date, content_type);
      CREATE INDEX IF NOT EXISTS idx_mission_slot_linked_post ON tb_brand_mission_slot(linked_post_id);
      CREATE INDEX IF NOT EXISTS idx_mission_slot_status ON tb_brand_mission_slot(slot_status);
    `);

    console.log('--- Successfully applied high-scale indexes! ---');
  } catch (err) {
    console.error('Migration error applying scale indexes:', err);
  } finally {
    process.exit(0);
  }
};

migrateMissionScaleIndexes();

