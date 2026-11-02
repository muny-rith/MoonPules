const db = require('../config/db');

const seedKFreeOctober = async () => {
  try {
    console.log('--- Checking existing brands or products ---');
    const brandRes = await db.query('SELECT DISTINCT brand_id FROM tb_post_tracker WHERE brand_id IS NOT NULL LIMIT 5');
    console.log('Post tracker brands:', brandRes.rows);

    const brandId = brandRes.rows[0]?.brand_id || 1;
    const brandName = 'K-FREE';
    const month = 10;
    const year = 2026;

    console.log(`--- Seeding Master Mission for ${brandName} (${month}/${year}) ---`);
    const missionRes = await db.query(`
      INSERT INTO tb_brand_mission (brand_id, brand_name, month, year, target_posters, target_live_streams, target_videos, notes)
      VALUES ($1, $2, $3, $4, 4, 3, 0, 'Official October 2026 K-FREE Schedule')
      ON CONFLICT (brand_id, month, year) DO UPDATE
      SET brand_name = EXCLUDED.brand_name,
          target_posters = EXCLUDED.target_posters,
          target_live_streams = EXCLUDED.target_live_streams,
          updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `, [brandId, brandName, month, year]);

    const missionId = missionRes.rows[0].id;

    console.log(`--- Seeding Day-by-Day Planned Slots for Mission #${missionId} ---`);
    await db.query('DELETE FROM tb_brand_mission_slot WHERE mission_id = $1', [missionId]);

    const slots = [
      { planned_date: '2026-10-04', content_type: 'photo', time_window: null, notes: 'Hero Poster' },
      { planned_date: '2026-10-09', content_type: 'live', time_window: '01:00PM - 05:00PM', notes: 'Friday Afternoon Live Stream' },
      { planned_date: '2026-10-12', content_type: 'photo', time_window: null, notes: 'Product Poster' },
      { planned_date: '2026-10-21', content_type: 'photo', time_window: null, notes: 'Mid-Month Feature Poster' },
      { planned_date: '2026-10-23', content_type: 'live', time_window: '01:00PM - 05:00PM', notes: 'Friday Afternoon Live Stream' },
      { planned_date: '2026-10-27', content_type: 'photo', time_window: null, notes: 'Payday Teaser Poster' },
      { planned_date: '2026-10-30', content_type: 'live', time_window: '04:00PM', notes: 'Month-End Payday Mega Live Stream' },
    ];

    for (const s of slots) {
      await db.query(`
        INSERT INTO tb_brand_mission_slot (mission_id, planned_date, content_type, time_window, notes, slot_status)
        VALUES ($1, $2, $3, $4, $5, 'planned')
      `, [missionId, s.planned_date, s.content_type, s.time_window, s.notes]);
    }

    console.log('--- Successfully seeded 7 planned days for K-FREE October 2026! ---');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    process.exit(0);
  }
};

seedKFreeOctober();

