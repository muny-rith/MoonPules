const db = require('../../config/db');

/**
 * Get mission by brand, month, year
 */
const getMission = async (brandId, month, year) => {
  const result = await db.query(
    `SELECT * FROM tb_brand_mission 
     WHERE brand_id = $1 AND month = $2 AND year = $3`,
    [brandId, month, year]
  );
  return result.rows[0] || null;
};

/**
 * Get all missions for a specific month/year
 */
const getAllMissionsForMonth = async (month, year) => {
  const result = await db.query(
    `SELECT * FROM tb_brand_mission 
     WHERE month = $1 AND year = $2
     ORDER BY brand_name ASC`,
    [month, year]
  );
  return result.rows;
};

/**
 * Upsert master mission
 */
const upsertMission = async ({
  brand_id,
  brand_name,
  month,
  year,
  target_posters = 0,
  target_live_streams = 0,
  target_videos = 0,
  target_status_posts = 0,
  notes = null
}) => {
  const result = await db.query(
    `INSERT INTO tb_brand_mission 
       (brand_id, brand_name, month, year, target_posters, target_live_streams, target_videos, target_status_posts, notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
     ON CONFLICT (brand_id, month, year) DO UPDATE
     SET brand_name = EXCLUDED.brand_name,
         target_posters = EXCLUDED.target_posters,
         target_live_streams = EXCLUDED.target_live_streams,
         target_videos = EXCLUDED.target_videos,
         target_status_posts = EXCLUDED.target_status_posts,
         notes = COALESCE(EXCLUDED.notes, tb_brand_mission.notes),
         updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [brand_id, brand_name, month, year, target_posters, target_live_streams, target_videos, target_status_posts, notes]
  );
  return result.rows[0];
};

/**
 * Get day slots for a mission
 */
const getSlotsByMissionId = async (missionId) => {
  const result = await db.query(
    `SELECT s.*, 
            p.fb_post_id, p.status as post_status, p.published_time, p.scheduled_time, p.message as post_message
     FROM tb_brand_mission_slot s
     LEFT JOIN tb_post_tracker p ON p.id = s.linked_post_id
     WHERE s.mission_id = $1
     ORDER BY s.planned_date ASC, s.id ASC`,
    [missionId]
  );
  return result.rows;
};

/**
 * Get all slots for a brand in a date range or month
 */
const getSlotsForBrandAndMonth = async (brandId, month, year) => {
  let queryStr = `
    SELECT s.*, m.brand_id, m.brand_name,
           p.fb_post_id, p.status as post_status, p.published_time, p.scheduled_time, p.message as post_message, p.media_url
    FROM tb_brand_mission_slot s
    JOIN tb_brand_mission m ON m.id = s.mission_id
    LEFT JOIN tb_post_tracker p ON p.id = s.linked_post_id
    WHERE m.month = $1 AND m.year = $2
  `;
  const params = [month, year];

  if (brandId && brandId !== 'all') {
    params.push(brandId);
    queryStr += ` AND m.brand_id = $${params.length}`;
  }

  queryStr += ` ORDER BY s.planned_date ASC, s.id ASC`;

  const result = await db.query(queryStr, params);
  return result.rows;
};

/**
 * Bulk save / replace slots for a mission
 */
const saveMissionSlots = async (missionId, slots = []) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Remove existing slots for this mission
    await client.query('DELETE FROM tb_brand_mission_slot WHERE mission_id = $1', [missionId]);

    const insertedSlots = [];
    for (const slot of slots) {
      const res = await client.query(
        `INSERT INTO tb_brand_mission_slot 
           (mission_id, planned_date, content_type, time_window, notes, linked_post_id, slot_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          missionId,
          slot.planned_date,
          slot.content_type || 'photo',
          slot.time_window || null,
          slot.notes || null,
          slot.linked_post_id || null,
          slot.slot_status || 'planned'
        ]
      );
      insertedSlots.push(res.rows[0]);
    }

    // Auto-update master mission target counts based on slots
    const posterCount = slots.filter(s => s.content_type === 'photo').length;
    const liveCount = slots.filter(s => s.content_type === 'live').length;
    const videoCount = slots.filter(s => s.content_type === 'video').length;

    await client.query(
      `UPDATE tb_brand_mission
       SET target_posters = $1,
           target_live_streams = $2,
           target_videos = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [posterCount, liveCount, videoCount, missionId]
    );

    await client.query('COMMIT');
    return insertedSlots;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get published/scheduled posts for brand in given month/year
 */
const getBrandPostsForMonth = async (brandId, month, year) => {
  let queryStr = `
    SELECT id, brand_id, product_id, status, media_type, published_time, scheduled_time, message, media_url
    FROM tb_post_tracker
    WHERE (
      (published_time IS NOT NULL AND EXTRACT(MONTH FROM published_time) = $1 AND EXTRACT(YEAR FROM published_time) = $2)
      OR
      (scheduled_time IS NOT NULL AND EXTRACT(MONTH FROM scheduled_time) = $1 AND EXTRACT(YEAR FROM scheduled_time) = $2)
    )
  `;
  const params = [month, year];

  if (brandId && brandId !== 'all') {
    params.push(brandId);
    queryStr += ` AND brand_id = $${params.length}`;
  }

  const result = await db.query(queryStr, params);
  return result.rows;
};

module.exports = {
  getMission,
  getAllMissionsForMonth,
  upsertMission,
  getSlotsByMissionId,
  getSlotsForBrandAndMonth,
  saveMissionSlots,
  getBrandPostsForMonth
};

