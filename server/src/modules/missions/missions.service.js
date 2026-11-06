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
 * Uses high-speed B-Tree range query and pre-linked persistent relational data
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

    // 1. If slot is persistently linked to a post in the database (Direct 0ms match)
    if (slot.linked_post_id && slot.fb_post_id !== undefined) {
      const isPublished = slot.post_status === 'published';
      const isScheduled = slot.post_status === 'scheduled';
      let computedStatus = isPublished ? 'completed' : isScheduled ? 'scheduled' : (slotDateStr < todayStr ? 'missed' : 'planned');

      return {
        ...slot,
        planned_date_str: slotDateStr,
        computed_status: computedStatus,
        linked_post: {
          id: slot.linked_post_id,
          status: slot.post_status,
          media_type: slot.media_type || slot.content_type,
          published_time: slot.published_time,
          scheduled_time: slot.scheduled_time,
          message: slot.post_message,
          media_url: slot.media_url,
          thumbnail_url: slot.thumbnail_url,
          fb_post_id: slot.fb_post_id,
          page_id: slot.page_id,
          post_url: slot.post_url,
        },
        is_planned_slot: true,
      };
    }

    // 2. Fallback: Dynamic matching if not yet persistently linked
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
      is_planned_slot: true,
    };
  });
};

/**
 * Get Month-End Audit for all brands
 * HIGH-SCALE BATCH ARCHITECTURE: Eliminates N+1 loop using parallel batch queries & in-memory Hash Map
 */
const getMonthAudit = async (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  // Parallel Batch Fetch (1 single roundtrip instead of 150 sequential queries)
  const [missions, allSlots, allPosts] = await Promise.all([
    missionsRepo.getAllMissionsForMonth(m, y),
    missionsRepo.getAllSlotsWithMissionsForMonth(m, y),
    missionsRepo.getBrandPostsForMonth('all', m, y),
  ]);

  if (!missions || missions.length === 0) {
    return [];
  }

  const todayStr = formatLocalDateStr(new Date());

  // Group slots by mission_id
  const slotsByMissionId = new Map();
  allSlots.forEach((slot) => {
    if (!slotsByMissionId.has(slot.mission_id)) {
      slotsByMissionId.set(slot.mission_id, []);
    }
    slotsByMissionId.get(slot.mission_id).push(slot);
  });

  // Group actual posts by `${brand_id}_${dateStr}`
  const postsByBrandAndDate = new Map();
  allPosts.forEach((post) => {
    const dStr = formatLocalDateStr(post.published_time || post.scheduled_time);
    const key = `${post.brand_id}_${dStr}`;
    if (!postsByBrandAndDate.has(key)) {
      postsByBrandAndDate.set(key, []);
    }
    postsByBrandAndDate.get(key).push(post);
  });

  const auditList = [];

  for (const mission of missions) {
    const slots = slotsByMissionId.get(mission.id) || [];
    let completedSlots = 0;
    let missedSlots = 0;
    let plannedSlots = 0;

    const enrichedSlots = slots.map((slot) => {
      const slotDateStr = formatLocalDateStr(slot.planned_date);

      // Check persistent link first
      if (slot.linked_post_id && slot.post_status) {
        const isPublished = slot.post_status === 'published';
        const isScheduled = slot.post_status === 'scheduled';
        const status = isPublished ? 'completed' : isScheduled ? 'scheduled' : (slotDateStr < todayStr ? 'missed' : 'planned');

        if (status === 'completed') completedSlots += 1;
        else if (status === 'missed') missedSlots += 1;
        else plannedSlots += 1;

        return {
          ...slot,
          planned_date_str: slotDateStr,
          computed_status: status,
          linked_post: {
            id: slot.linked_post_id,
            status: slot.post_status,
            media_type: slot.media_type || slot.content_type,
            published_time: slot.published_time,
            scheduled_time: slot.scheduled_time,
            message: slot.post_message,
            media_url: slot.media_url,
            thumbnail_url: slot.thumbnail_url,
            fb_post_id: slot.fb_post_id,
            page_id: slot.page_id,
            post_url: slot.post_url,
          },
        };
      }

      // Dynamic fallback matching
      const key = `${mission.brand_id}_${slotDateStr}`;
      const dayPosts = postsByBrandAndDate.get(key) || [];

      const matchingPost = dayPosts.find((p) => {
        const type = (p.media_type || '').toLowerCase();
        const slotType = (slot.content_type || '').toLowerCase();
        if (slotType === 'live') return type === 'live';
        if (slotType === 'video') return type === 'video' || type === 'reel';
        if (slotType === 'photo') return type === 'photo' || type === 'image';
        return true;
      });

      let status = 'planned';
      let linkedPost = null;

      if (matchingPost && matchingPost.status === 'published') {
        status = 'completed';
        completedSlots += 1;
        linkedPost = matchingPost;
      } else if (matchingPost && matchingPost.status === 'scheduled') {
        status = 'scheduled';
        linkedPost = matchingPost;
      } else if (slotDateStr < todayStr) {
        status = 'missed';
        missedSlots += 1;
      } else {
        plannedSlots += 1;
      }

      return {
        ...slot,
        planned_date_str: slotDateStr,
        computed_status: status,
        linked_post: linkedPost,
      };
    });

    const totalSlots = enrichedSlots.length;
    const completionRate = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

    let statusLabel = 'in_progress';
    if (totalSlots > 0 && completionRate === 100) {
      statusLabel = 'completed';
    } else if (missedSlots > 0) {
      statusLabel = 'incomplete';
    }

    const postersTarget = enrichedSlots.filter((s) => s.content_type === 'photo').length;
    const postersCompleted = enrichedSlots.filter((s) => s.content_type === 'photo' && s.computed_status === 'completed').length;

    const livesTarget = enrichedSlots.filter((s) => s.content_type === 'live').length;
    const livesCompleted = enrichedSlots.filter((s) => s.content_type === 'live' && s.computed_status === 'completed').length;

    const videosTarget = enrichedSlots.filter((s) => s.content_type === 'video').length;
    const videosCompleted = enrichedSlots.filter((s) => s.content_type === 'video' && s.computed_status === 'completed').length;

    auditList.push({
      brand_id: mission.brand_id,
      brand_name: mission.brand_name,
      month: mission.month,
      year: mission.year,
      total_slots: totalSlots,
      completed_slots: completedSlots,
      missed_slots: missedSlots,
      planned_slots: plannedSlots,
      completion_rate: completionRate,
      status: statusLabel,
      breakdown: {
        posters: { target: postersTarget, completed: postersCompleted },
        lives: { target: livesTarget, completed: livesCompleted },
        videos: { target: videosTarget, completed: videosCompleted },
      },
      slots: enrichedSlots,
    });
  }

  return auditList;
};

/**
 * EVENT-DRIVEN AUTO-RECONCILIATION ENGINE
 * Called when a post is created, published, scheduled, or synced from ANY channel (Planner, Task, Facebook Native)
 */
const reconcilePostWithMission = async (post) => {
  if (!post || !post.id || !post.brand_id) return null;

  try {
    const rawDate = post.published_time || post.scheduled_time;
    const postDateStr = formatLocalDateStr(rawDate);
    if (!postDateStr) return null;

    const targetStatus = post.status === 'published' ? 'completed' : post.status === 'scheduled' ? 'scheduled' : 'planned';

    // 1. Check if post is already linked to an existing slot
    const existingSlot = await missionsRepo.getSlotByLinkedPostId(post.id);
    if (existingSlot) {
      const existingDateStr = formatLocalDateStr(existingSlot.planned_date);
      // If brand, date, and content_type are still aligned, just update status
      if (existingDateStr === postDateStr && String(existingSlot.brand_id || '') === String(post.brand_id || '')) {
        return await missionsRepo.linkSlotToPost(existingSlot.id, post.id, targetStatus);
      }
      // If rescheduled to a new date or brand changed, unlink from old slot first
      await missionsRepo.unlinkSlotByPostId(post.id);
    }

    // 2. Find an unlinked planned slot matching post's brand, planned date, and media format
    const matchingSlot = await missionsRepo.findUnlinkedSlotForPost({
      brand_id: post.brand_id,
      planned_date: postDateStr,
      content_type: post.media_type || 'photo',
    });

    if (matchingSlot) {
      return await missionsRepo.linkSlotToPost(matchingSlot.id, post.id, targetStatus);
    }

    return null; // Post is an extra/unplanned post for this day
  } catch (err) {
    console.error(`[reconcilePostWithMission] Error reconciling post #${post.id} with mission:`, err.message);
    return null; // Graceful fallback
  }
};

/**
 * Unlink post from any mission slot (e.g. when post is deleted)
 */
const unreconcilePost = async (postId) => {
  if (!postId) return null;
  try {
    return await missionsRepo.unlinkSlotByPostId(postId);
  } catch (err) {
    console.error(`[unreconcilePost] Error unlinking post #${postId}:`, err.message);
    return null;
  }
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
  reconcilePostWithMission,
  unreconcilePost,
};

