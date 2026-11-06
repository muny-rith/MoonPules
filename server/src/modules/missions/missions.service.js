const missionsRepo = require('./missions.repository');

const formatLocalDateStr = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Get mission details and calculate day-by-day execution status
 */
const getMissionWithProgress = async (brandId, month, year) => {
  const mission = await missionsRepo.getMission(brandId, month, year);
  if (!mission) {
    return null;
  }

  const slots = await missionsRepo.getSlotsByMissionId(mission.id);
  const posts = await missionsRepo.getBrandPostsForMonth(brandId, month, year);

  const todayStr = formatLocalDateStr(new Date());

  // Group actual posts by date string "YYYY-MM-DD"
  const postsByDate = {};
  posts.forEach((post) => {
    const dStr = formatLocalDateStr(post.published_time || post.scheduled_time);
    if (!postsByDate[dStr]) postsByDate[dStr] = [];
    postsByDate[dStr].push(post);
  });

  let completedSlots = 0;
  let missedSlots = 0;
  let plannedSlots = 0;

  const enrichedSlots = slots.map((slot) => {
    const slotDateStr = formatLocalDateStr(slot.planned_date);
    const dayPosts = postsByDate[slotDateStr] || [];

    // Find a matching post on this day
    const matchingPost = dayPosts.find((p) => {
      const type = (p.media_type || '').toLowerCase();
      const slotType = (slot.content_type || '').toLowerCase();
      if (slotType === 'live') return type === 'live';
      if (slotType === 'video') return type === 'video' || type === 'reel';
      if (slotType === 'photo') return type === 'photo' || type === 'image';
      return true;
    });

    let computedStatus = 'planned';
    let linkedPost = null;

    if (matchingPost && matchingPost.status === 'published') {
      computedStatus = 'completed';
      completedSlots += 1;
      linkedPost = {
        id: matchingPost.id,
        status: matchingPost.status,
        media_type: matchingPost.media_type,
        published_time: matchingPost.published_time,
        message: matchingPost.message,
        media_url: matchingPost.media_url,
        thumbnail_url: matchingPost.thumbnail_url,
        fb_post_id: matchingPost.fb_post_id,
        page_id: matchingPost.page_id,
        post_url: matchingPost.post_url,
      };
    } else if (matchingPost && matchingPost.status === 'scheduled') {
      computedStatus = 'scheduled';
      linkedPost = {
        id: matchingPost.id,
        status: matchingPost.status,
        scheduled_time: matchingPost.scheduled_time,
        media_url: matchingPost.media_url,
        thumbnail_url: matchingPost.thumbnail_url,
        fb_post_id: matchingPost.fb_post_id,
        page_id: matchingPost.page_id,
        post_url: matchingPost.post_url,
      };
    } else if (slotDateStr < todayStr) {
      computedStatus = 'missed';
      missedSlots += 1;
    } else {
      computedStatus = 'planned';
      plannedSlots += 1;
    }

    return {
      ...slot,
      planned_date_str: slotDateStr,
      computed_status: computedStatus,
      linked_post: linkedPost,
    };
  });

  const totalSlots = enrichedSlots.length;
  const completionRate = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  // Breakdown by format
  const postersTarget = enrichedSlots.filter((s) => s.content_type === 'photo').length;
  const postersCompleted = enrichedSlots.filter((s) => s.content_type === 'photo' && s.computed_status === 'completed').length;

  const livesTarget = enrichedSlots.filter((s) => s.content_type === 'live').length;
  const livesCompleted = enrichedSlots.filter((s) => s.content_type === 'live' && s.computed_status === 'completed').length;

  const videosTarget = enrichedSlots.filter((s) => s.content_type === 'video').length;
  const videosCompleted = enrichedSlots.filter((s) => s.content_type === 'video' && s.computed_status === 'completed').length;

  return {
    ...mission,
    total_slots: totalSlots,
    completed_slots: completedSlots,
    missed_slots: missedSlots,
    planned_slots: plannedSlots,
    completion_rate: completionRate,
    breakdown: {
      posters: { target: postersTarget, completed: postersCompleted },
      lives: { target: livesTarget, completed: livesCompleted },
      videos: { target: videosTarget, completed: videosCompleted },
    },
    slots: enrichedSlots,
  };
};

/**
 * Save / Update mission and its day-by-day slots
 */
const saveMissionWithSlots = async ({
  brand_id,
  brand_name,
  month,
  year,
  slots = [],
  notes = null,
}) => {
  const mission = await missionsRepo.upsertMission({
    brand_id,
    brand_name,
    month,
    year,
    notes,
  });

  const savedSlots = await missionsRepo.saveMissionSlots(mission.id, slots);
  return getMissionWithProgress(brand_id, month, year);
};

/**
 * Get all planned slots for a brand or all brands in a month (for calendar integration)
 */
const getCalendarSlots = async (brandId, month, year) => {
  const slots = await missionsRepo.getSlotsForBrandAndMonth(brandId, month, year);
  const posts = await missionsRepo.getBrandPostsForMonth(brandId, month, year);

  const todayStr = formatLocalDateStr(new Date());

  const postsByDateAndBrand = {};
  posts.forEach((post) => {
    const dStr = formatLocalDateStr(post.published_time || post.scheduled_time);
    const key = `${post.brand_id}_${dStr}`;
    if (!postsByDateAndBrand[key]) postsByDateAndBrand[key] = [];
    postsByDateAndBrand[key].push(post);
  });

  return slots.map((slot) => {
    const slotDateStr = formatLocalDateStr(slot.planned_date);
    const key = `${slot.brand_id}_${slotDateStr}`;
    const dayPosts = postsByDateAndBrand[key] || [];

    const matchingPost = dayPosts.find((p) => {
      const type = (p.media_type || '').toLowerCase();
      const slotType = (slot.content_type || '').toLowerCase();
      if (slotType === 'live') return type === 'live';
      if (slotType === 'video') return type === 'video' || type === 'reel';
      if (slotType === 'photo') return type === 'photo' || type === 'image';
      return true;
    });

    let computedStatus = 'planned';
    let linkedPost = null;
    if (matchingPost && matchingPost.status === 'published') {
      computedStatus = 'completed';
      linkedPost = {
        id: matchingPost.id,
        status: matchingPost.status,
        media_type: matchingPost.media_type,
        published_time: matchingPost.published_time,
        message: matchingPost.message,
        media_url: matchingPost.media_url,
        thumbnail_url: matchingPost.thumbnail_url,
        fb_post_id: matchingPost.fb_post_id,
        page_id: matchingPost.page_id,
        post_url: matchingPost.post_url,
      };
    } else if (matchingPost && matchingPost.status === 'scheduled') {
      computedStatus = 'scheduled';
      linkedPost = {
        id: matchingPost.id,
        status: matchingPost.status,
        scheduled_time: matchingPost.scheduled_time,
        media_url: matchingPost.media_url,
        thumbnail_url: matchingPost.thumbnail_url,
        fb_post_id: matchingPost.fb_post_id,
        page_id: matchingPost.page_id,
        post_url: matchingPost.post_url,
      };
    } else if (slotDateStr < todayStr) {
      computedStatus = 'missed';
    }

    return {
      ...slot,
      planned_date_str: slotDateStr,
      computed_status: computedStatus,
      linked_post: linkedPost,
      is_planned_slot: true, // Marker for frontend calendar rendering
    };
  });
};

/**
 * Get Month-End Audit for all brands
 */
const getMonthAudit = async (month, year) => {
  const missions = await missionsRepo.getAllMissionsForMonth(month, year);
  const auditList = [];

  for (const m of missions) {
    const full = await getMissionWithProgress(m.brand_id, month, year);
    if (full) {
      let statusLabel = 'in_progress';
      if (full.completion_rate === 100) {
        statusLabel = 'completed';
      } else if (full.missed_slots > 0) {
        statusLabel = 'incomplete';
      }

      auditList.push({
        brand_id: full.brand_id,
        brand_name: full.brand_name,
        month: full.month,
        year: full.year,
        total_slots: full.total_slots,
        completed_slots: full.completed_slots,
        missed_slots: full.missed_slots,
        completion_rate: full.completion_rate,
        status: statusLabel,
        breakdown: full.breakdown,
        slots: full.slots,
      });
    }
  }

  return auditList;
};

/**
 * Update a single deliverable slot (e.g. reschedule date, change format)
 */
const updateSlot = async (slotId, data) => {
  const existing = await missionsRepo.getSlotById(slotId);
  if (!existing) {
    const err = new Error('Slot not found');
    err.status = 404;
    throw err;
  }
  const updated = await missionsRepo.updateSlot(slotId, data);
  if (data.content_type && data.content_type !== existing.content_type) {
    await missionsRepo.recalculateMissionTargets(existing.mission_id);
  }
  return {
    ...updated,
    planned_date_str: formatLocalDateStr(updated.planned_date),
  };
};

/**
 * Add a single deliverable slot to an existing or new mission
 */
const createSlot = async ({
  mission_id,
  brand_id,
  brand_name,
  month,
  year,
  planned_date,
  content_type = 'photo',
  time_window = null,
  notes = null,
}) => {
  let targetMissionId = mission_id;
  if (!targetMissionId) {
    if (!brand_id || !month || !year) {
      const err = new Error('mission_id or (brand_id, month, year) required to create slot');
      err.status = 400;
      throw err;
    }
    let mission = await missionsRepo.getMission(brand_id, month, year);
    if (!mission) {
      mission = await missionsRepo.upsertMission({
        brand_id,
        brand_name: brand_name || `Brand #${brand_id}`,
        month,
        year,
      });
    }
    targetMissionId = mission.id;
  }

  const slot = await missionsRepo.createSlot(targetMissionId, {
    planned_date,
    content_type,
    time_window,
    notes,
  });

  return {
    ...slot,
    planned_date_str: formatLocalDateStr(slot.planned_date),
  };
};

/**
 * Delete a single deliverable slot
 */
const deleteSlot = async (slotId) => {
  const deleted = await missionsRepo.deleteSlot(slotId);
  if (!deleted) {
    const err = new Error('Slot not found');
    err.status = 404;
    throw err;
  }
  return deleted;
};

module.exports = {
  getMissionWithProgress,
  saveMissionWithSlots,
  getCalendarSlots,
  getMonthAudit,
  updateSlot,
  createSlot,
  deleteSlot,
};

