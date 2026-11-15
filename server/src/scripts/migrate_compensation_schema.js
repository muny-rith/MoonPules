const db = require('../config/db');

const migrateCompensationSchema = async () => {
  try {
    console.log('--- Applying compensation and missed deliverable schema updates ---');

    await db.query(`
      -- 1. Update slot_status constraint to include 'compensated' and 'waived'
      ALTER TABLE tb_brand_mission_slot 
        DROP CONSTRAINT IF EXISTS tb_brand_mission_slot_slot_status_check;

      ALTER TABLE tb_brand_mission_slot 
        ADD CONSTRAINT tb_brand_mission_slot_slot_status_check 
        CHECK (slot_status IN ('planned', 'scheduled', 'completed', 'compensated', 'missed', 'waived'));

      -- 2. Add compensation & missed classification columns to tb_brand_mission_slot
      ALTER TABLE tb_brand_mission_slot
        ADD COLUMN IF NOT EXISTS is_compensated BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS compensated_at TIMESTAMP WITH TIME ZONE NULL,
        ADD COLUMN IF NOT EXISTS missed_reason VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL;

      -- 3. Add lookup index on mission slot compensation
      CREATE INDEX IF NOT EXISTS idx_slots_uncompensated 
        ON tb_brand_mission_slot(mission_id, slot_status, is_compensated);

      -- 4. Add compensation_for_slot_id to tb_post_tracker
      ALTER TABLE tb_post_tracker
        ADD COLUMN IF NOT EXISTS compensation_for_slot_id INT 
        REFERENCES tb_brand_mission_slot(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_post_compensation_slot 
        ON tb_post_tracker(compensation_for_slot_id);
    `);

    console.log('--- Successfully applied compensation and missed schema updates! ---');
  } catch (err) {
    console.error('Migration error applying compensation schema:', err);
  } finally {
    process.exit(0);
  }
};

migrateCompensationSchema();
