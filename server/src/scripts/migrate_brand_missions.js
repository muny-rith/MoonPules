const db = require('../config/db');

const migrateBrandMissions = async () => {
  try {
    console.log('--- Creating tb_brand_mission and tb_brand_mission_slot tables ---');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS tb_brand_mission (
          id SERIAL PRIMARY KEY,
          brand_id INT NOT NULL,
          brand_name VARCHAR(255) NOT NULL,
          month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
          year INT NOT NULL,
          target_posters INT DEFAULT 0,
          target_live_streams INT DEFAULT 0,
          target_videos INT DEFAULT 0,
          target_status_posts INT DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_brand_monthly_mission UNIQUE (brand_id, month, year)
      );

      CREATE INDEX IF NOT EXISTS idx_brand_mission_lookup ON tb_brand_mission(brand_id, year, month);

      CREATE TABLE IF NOT EXISTS tb_brand_mission_slot (
          id SERIAL PRIMARY KEY,
          mission_id INT NOT NULL REFERENCES tb_brand_mission(id) ON DELETE CASCADE,
          planned_date DATE NOT NULL,
          content_type VARCHAR(50) NOT NULL,
          time_window VARCHAR(50) NULL,
          notes TEXT,
          linked_post_id INT REFERENCES tb_post_tracker(id) ON DELETE SET NULL,
          slot_status VARCHAR(20) DEFAULT 'planned' CHECK (slot_status IN ('planned', 'scheduled', 'completed', 'missed')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_mission_slots_date ON tb_brand_mission_slot(planned_date);
      CREATE INDEX IF NOT EXISTS idx_mission_slots_mission ON tb_brand_mission_slot(mission_id);
    `);

    console.log('--- Tables tb_brand_mission and tb_brand_mission_slot created successfully! ---');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
};

migrateBrandMissions();

