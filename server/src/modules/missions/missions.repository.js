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
 * Get slot by ID with mission info
 */
const getSlotById = async (slotId) => {
  const result = await db.query(
    `SELECT s.*, m.brand_id, m.month, m.year 
     FROM tb_brand_mission_slot s
     JOIN tb_brand_mission m ON m.id = s.mission_id
     WHERE s.id = $1`,
    [slotId]
  );
  return result.rows[0] || null;
};

/**
 * Recalculate master mission target counts based on current slots
 */
const recalculateMissionTargets = async (missionId) => {
  await db.query(
    `UPDATE tb_brand_mission m
     SET target_posters = (SELECT COUNT(*) FROM tb_brand_mission_slot WHERE mission_id = m.id AND content_type = 'photo'),
         target_live_streams = (SELECT COUNT(*) FROM tb_brand_mission_slot WHERE mission_id = m.id AND content_type = 'live'),
         target_videos = (SELECT COUNT(*) FROM tb_brand_mission_slot WHERE mission_id = m.id AND content_type = 'video'),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [missionId]
  );
};

/**
 * Update single slot fields (date, type, notes, etc.)
 */
const updateSlot = async (slotId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.planned_date !== undefined) {
    fields.push(`planned_date = $${idx++}`);
    values.push(data.planned_date);
  }
  if (data.content_type !== undefined) {
    fields.push(`content_type = $${idx++}`);
    values.push(data.content_type);
  }
  if (data.time_window !== undefined) {
    fields.push(`time_window = $${idx++}`);
    values.push(data.time_window);
  }
  if (data.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(data.notes);
  }
  if (data.slot_status !== undefined) {
    fields.push(`slot_status = $${idx++}`);
    values.push(data.slot_status);
  }

  if (fields.length === 0) return getSlotById(slotId);

  values.push(slotId);
  const queryStr = `UPDATE tb_brand_mission_slot SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const result = await db.query(queryStr, values);
  return result.rows[0] || null;
};

/**
 * Create a single deliverable slot
 */
const createSlot = async (missionId, { planned_date, content_type = 'photo', time_window = null, notes = null }) => {
  const result = await db.query(
    `INSERT INTO tb_brand_mission_slot (mission_id, planned_date, content_type, time_window, notes, slot_status)
     VALUES ($1, $2, $3, $4, $5, 'planned')
     RETURNING *`,
    [missionId, planned_date, content_type, time_window, notes]
  );
  await recalculateMissionTargets(missionId);
  return result.rows[0];
};

/**
 * Delete a single deliverable slot
 */
const deleteSlot = async (slotId) => {
  const slot = await getSlotById(slotId);
  if (!slot) return null;
  await db.query(`DELETE FROM tb_brand_mission_slot WHERE id = $1`, [slotId]);
  await recalculateMissionTargets(slot.mission_id);
  return slot;
};

/**
 * Helper to compute [startOfMonth, startOfNextMonth] ISO range strings
 */
const getMonthDateRange = (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const startStr = `${y}-${String(m).padStart(2, '0')}-01 00:00:00`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;
  return { startStr, endStr };
};

/**
 * Get published/scheduled posts for brand in given month/year using high-speed B-Tree index
 */
const getBrandPostsForMonth = async (brandId, month, year) => {
  const { startStr, endStr } = getMonthDateRange(month, year);

  let queryStr = `
    SELECT id, brand_id, product_id, status, media_type, published_time, scheduled_time, message, media_url, thumbnail_url, fb_post_id, page_id, post_url
    FROM tb_post_tracker
    WHERE (
      (published_time IS NOT NULL AND published_time >= $1 AND published_time < $2)
      OR
      (scheduled_time IS NOT NULL AND scheduled_time >= $1 AND scheduled_time < $2)
    )
  `;
  const params = [startStr, endStr];

  if (brandId && brandId !== 'all') {
    params.push(brandId);
    queryStr += ` AND brand_id = $${params.length}`;
  }

  const result = await db.query(queryStr, params);
  return result.rows;
};

/**
 * Find first unlinked planned slot matching post's brand, date, and content_type
 */
const findUnlinkedSlotForPost = async ({ brand_id, planned_date, content_type }) => {
  let normalizedType = 'photo';
  const t = (content_type || '').toLowerCase();
  if (t === 'live') normalizedType = 'live';
  else if (t === 'video' || t === 'reel') normalizedType = 'video';
  else normalizedType = 'photo';

  const result = await db.query(
    `SELECT s.*, m.brand_id, m.brand_name
     FROM tb_brand_mission_slot s
     JOIN tb_brand_mission m ON m.id = s.mission_id
     WHERE m.brand_id = $1
       AND s.planned_date = $2
       AND s.content_type = $3
       AND s.linked_post_id IS NULL
     ORDER BY s.id ASC
     LIMIT 1`,
    [brand_id, planned_date, normalizedType]
  );
  return result.rows[0] || null;
};

/**
 * Persistently link a slot to a post with updated status
 */
const linkSlotToPost = async (slotId, postId, status = 'completed') => {
  const result = await db.query(
    `UPDATE tb_brand_mission_slot
     SET linked_post_id = $1,
         slot_status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [postId, status, slotId]
  );
  return result.rows[0] || null;
};

/**
 * Unlink any slots currently linked to a specific post ID (e.g. on post delete or reschedule)
 */
const unlinkSlotByPostId = async (postId) => {
  const result = await db.query(
    `UPDATE tb_brand_mission_slot
     SET linked_post_id = NULL,
         slot_status = 'planned',
         updated_at = CURRENT_TIMESTAMP
     WHERE linked_post_id = $1
     RETURNING *`,
    [postId]
  );
  return result.rows;
};

/**
 * Get slot linked to a specific post ID
 */
const getSlotByLinkedPostId = async (postId) => {
  const result = await db.query(
    `SELECT * FROM tb_brand_mission_slot WHERE linked_post_id = $1 LIMIT 1`,
    [postId]
  );
  return result.rows[0] || null;
};

/**
 * Fetch all slots for all missions in a month with 1 batch query (Eliminating N+1 in audit)
 */
const getAllSlotsWithMissionsForMonth = async (month, year) => {
  const result = await db.query(
    `SELECT s.*, 
            m.brand_id, m.brand_name,
            p.id as post_id, p.fb_post_id, p.status as post_status, p.published_time, p.scheduled_time, 
            p.message as post_message, p.media_url, p.thumbnail_url, p.page_id, p.post_url, p.media_type
     FROM tb_brand_mission_slot s
     JOIN tb_brand_mission m ON m.id = s.mission_id
     LEFT JOIN tb_post_tracker p ON p.id = s.linked_post_id
     WHERE m.month = $1 AND m.year = $2
     ORDER BY s.planned_date ASC, s.id ASC`,
    [parseInt(month, 10), parseInt(year, 10)]
  );
  return result.rows;
};

module.exports = {
  getMission,
  getAllMissionsForMonth,
  upsertMission,
  getSlotsByMissionId,
  getSlotsForBrandAndMonth,
  saveMissionSlots,
  getBrandPostsForMonth,
  getSlotById,
  updateSlot,
  createSlot,
  deleteSlot,
  recalculateMissionTargets,
  getMonthDateRange,
  findUnlinkedSlotForPost,
  linkSlotToPost,
  unlinkSlotByPostId,
  getSlotByLinkedPostId,
  getAllSlotsWithMissionsForMonth,
};

