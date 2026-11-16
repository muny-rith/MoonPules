const missionsRepo = require('./missions.repository');

const APP_TIME_ZONE = 'Asia/Phnom_Penh';
const appDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Format dates consistently in agency local time (UTC+7) regardless of server TZ (e.g. Render UTC)
const formatLocalDateStr = (d) => {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
    return d.trim();
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const parts = appDateFormatter.formatToParts(dateObj);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return y && m && day ? `${y}-${m}-${day}` : '';
};

/**
 * Workflow matching rule:
 * - When slot is 'photo': can be fulfilled by 'photo' OR 'video' post
 * - When slot is 'video': can ONLY be fulfilled by 'video'/'reel' post
 * - When slot is 'live': can ONLY be fulfilled by 'live' post
 */
const isMediaTypeCompatibleWithSlot = (slotType, postMediaType) => {
  const sType = (slotType || '').toLowerCase();
  const pType = (postMediaType || '').toLowerCase();
  const isLive = pType === 'live';
  const isVideo = pType === 'video' || pType === 'reel';
  const isPhoto = !isLive && !isVideo;

  if (sType === 'live') return isLive;
  if (sType === 'video') return isVideo;
  if (sType === 'photo' || sType === 'poster') return isPhoto || isVideo;
  return true;
};

/**
 * Deterministic helper to match an unlinked slot with available posts on that date:
 * Prioritizes exact matches before fallback upgrades (e.g. video fulfilling photo).
 */
const findMatchingPostForSlot = (slot, dayPosts, usedPostIds = new Set()) => {
  const slotType = (slot.content_type || '').toLowerCase();
  const available = dayPosts.filter((p) => !usedPostIds.has(p.id));

  if (slotType === 'live') {
    return available.find((p) => (p.media_type || '').toLowerCase() === 'live') || null;
  }
  if (slotType === 'video') {
    return available.find((p) => {
      const t = (p.media_type || '').toLowerCase();
      return t === 'video' || t === 'reel';
    }) || null;
  }
  if (slotType === 'photo' || slotType === 'poster') {
    // 1. Exact match first: photo
    const exactPhoto = available.find((p) => {
      const t = (p.media_type || '').toLowerCase();
      return t === 'photo' || t === 'image' || (t !== 'live' && t !== 'video' && t !== 'reel');
    });
    if (exactPhoto) return exactPhoto;

    // 2. Allowed workflow upgrade: video post fulfills photo slot
    const videoPost = available.find((p) => {
      const t = (p.media_type || '').toLowerCase();
      return t === 'video' || t === 'reel';
    });
    return videoPost || null;
  }

  return available[0] || null;
};

/**
 * Get mission details and calculate day-by-day execution status
 */
const getMissionWithProgress = async (brandId, month, year) => {
  if (brandId && brandId !== 'all') {
    try {
      await autoReconcileBrandSlots(brandId);
    } catch (err) {
      console.error(`[getMissionWithProgress] Auto-reconcile error for brand ${brandId}:`, err.message);
    }
  }

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

  const usedPostIds = new Set();
  // Sort slots so that live and video claim matching posts first, then photo
  const sortedSlotIndices = slots
    .map((s, idx) => ({ s, idx }))
    .sort((a, b) => {
      const order = { live: 1, video: 2, photo: 3 };
      const oA = order[a.s.content_type?.toLowerCase()] || 3;
      const oB = order[b.s.content_type?.toLowerCase()] || 3;
      return oA - oB;
    });

  const matchingPostsBySlotId = new Map();
  for (const { s } of sortedSlotIndices) {
    const slotDateStr = formatLocalDateStr(s.planned_date);
    const dayPosts = postsByDate[slotDateStr] || [];
    const match = findMatchingPostForSlot(s, dayPosts, usedPostIds);
    if (match) {
      usedPostIds.add(match.id);
      matchingPostsBySlotId.set(s.id, match);
    }
  }

  let completedSlots = 0;
  let missedSlots = 0;
  let plannedSlots = 0;

  const enrichedSlots = slots.map((slot) => {
    const slotDateStr = formatLocalDateStr(slot.planned_date);
    const matchingPost = matchingPostsBySlotId.get(slot.id);

    let computedStatus = 'planned';
    let linkedPost = null;

    if (slot.linked_post_id && slot.post_status) {
      const isPublished = slot.post_status === 'published';
      const isScheduled = slot.post_status === 'scheduled';
      const isCompensated = slot.is_compensated === true || slot.slot_status === 'compensated';
      computedStatus = isPublished
        ? (isCompensated ? 'compensated' : 'completed')
        : isScheduled
        ? 'scheduled'
        : (slotDateStr < todayStr ? 'missed' : 'planned');

      if (computedStatus === 'completed' || computedStatus === 'compensated') {
        completedSlots += 1;
      } else if (computedStatus === 'missed') {
        missedSlots += 1;
      } else {
        plannedSlots += 1;
      }

      linkedPost = {
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
      };
    } else if (matchingPost && matchingPost.status === 'published') {
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
      is_compensated: slot.is_compensated === true || slot.slot_status === 'compensated',
      linked_post: linkedPost,
    };
  });

  const totalSlots = enrichedSlots.length;
  const completionRate = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  // Breakdown by format
  const postersTarget = enrichedSlots.filter((s) => s.content_type === 'photo').length;
  const postersCompleted = enrichedSlots.filter((s) => s.content_type === 'photo' && (s.computed_status === 'completed' || s.computed_status === 'compensated')).length;

  const livesTarget = enrichedSlots.filter((s) => s.content_type === 'live').length;
  const livesCompleted = enrichedSlots.filter((s) => s.content_type === 'live' && (s.computed_status === 'completed' || s.computed_status === 'compensated')).length;

  const videosTarget = enrichedSlots.filter((s) => s.content_type === 'video').length;
  const videosCompleted = enrichedSlots.filter((s) => s.content_type === 'video' && (s.computed_status === 'completed' || s.computed_status === 'compensated')).length;
  const compensatedCount = enrichedSlots.filter((s) => s.computed_status === 'compensated').length;

  return {
    ...mission,
    total_slots: totalSlots,
    completed_slots: completedSlots,
    compensated_slots: compensatedCount,
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
  if (brand_id) {
    try {
      await autoReconcileBrandSlots(brand_id);
    } catch (err) {
      console.error(`[saveMissionWithSlots] Auto-reconcile error for brand ${brand_id}:`, err.message);
    }
  }
  return getMissionWithProgress(brand_id, month, year);
};

/**
 * Get all planned slots for a brand or all brands in a month (for calendar integration)
 * Uses high-speed B-Tree range query and pre-linked persistent relational data
 */
const getCalendarSlots = async (brandId, month, year) => {
  if (brandId && brandId !== 'all') {
    try {
      await autoReconcileBrandSlots(brandId);
    } catch (err) {
      console.error(`[getCalendarSlots] Auto-reconcile error for brand ${brandId}:`, err.message);
    }
  }
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

  const usedPostIds = new Set();
  slots.forEach((s) => {
    if (s.linked_post_id) usedPostIds.add(s.linked_post_id);
  });

  // For unlinked slots, sort by [live, video, photo] so specific slots claim matches first
  const unlinkedSlots = slots.filter((s) => !s.linked_post_id || s.fb_post_id === undefined);
  const sortedUnlinked = [...unlinkedSlots].sort((a, b) => {
    const order = { live: 1, video: 2, photo: 3 };
    const oA = order[a.content_type?.toLowerCase()] || 3;
    const oB = order[b.content_type?.toLowerCase()] || 3;
    return oA - oB;
  });

  const fallbackMatchBySlotId = new Map();
  for (const slot of sortedUnlinked) {
    const slotDateStr = formatLocalDateStr(slot.planned_date);
    const key = `${slot.brand_id}_${slotDateStr}`;
    const dayPosts = postsByDateAndBrand[key] || [];
    const match = findMatchingPostForSlot(slot, dayPosts, usedPostIds);
    if (match) {
      usedPostIds.add(match.id);
      fallbackMatchBySlotId.set(slot.id, match);
    }
  }

  return slots.map((slot) => {
    const slotDateStr = formatLocalDateStr(slot.planned_date);

    // 1. If slot is persistently linked to a post in the database (Direct 0ms match)
    if (slot.linked_post_id && (slot.fb_post_id !== undefined || slot.post_status !== undefined)) {
      const isPublished = slot.post_status === 'published';
      const isScheduled = slot.post_status === 'scheduled';
      const isCompensated = slot.is_compensated === true || slot.slot_status === 'compensated';
      let computedStatus = isPublished
        ? (isCompensated ? 'compensated' : 'completed')
        : isScheduled
        ? 'scheduled'
        : (slotDateStr < todayStr ? 'missed' : 'planned');

      return {
        ...slot,
        planned_date_str: slotDateStr,
        computed_status: computedStatus,
        is_compensated: isCompensated,
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
        },
        is_planned_slot: true,
      };
    }

    // 2. Fallback: Dynamic matching if not yet persistently linked
    const matchingPost = fallbackMatchBySlotId.get(slot.id);

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

    const usedPostIds = new Set();
    slots.forEach((s) => {
      if (s.linked_post_id) usedPostIds.add(s.linked_post_id);
    });

    const unlinkedSlots = slots.filter((s) => !s.linked_post_id || !s.post_status);
    const sortedUnlinked = [...unlinkedSlots].sort((a, b) => {
      const order = { live: 1, video: 2, photo: 3 };
      const oA = order[a.content_type?.toLowerCase()] || 3;
      const oB = order[b.content_type?.toLowerCase()] || 3;
      return oA - oB;
    });

    const fallbackMatchBySlotId = new Map();
    for (const slot of sortedUnlinked) {
      const slotDateStr = formatLocalDateStr(slot.planned_date);
      const key = `${mission.brand_id}_${slotDateStr}`;
      const dayPosts = postsByBrandAndDate.get(key) || [];
      const match = findMatchingPostForSlot(slot, dayPosts, usedPostIds);
      if (match) {
        usedPostIds.add(match.id);
        fallbackMatchBySlotId.set(slot.id, match);
      }
    }

    const enrichedSlots = slots.map((slot) => {
      const slotDateStr = formatLocalDateStr(slot.planned_date);

      // Check persistent link first
      if (slot.linked_post_id && slot.post_status) {
        const isPublished = slot.post_status === 'published';
        const isScheduled = slot.post_status === 'scheduled';
        const isCompensated = slot.is_compensated === true || slot.slot_status === 'compensated';
        const status = isPublished
          ? (isCompensated ? 'compensated' : 'completed')
          : isScheduled
          ? 'scheduled'
          : (slotDateStr < todayStr ? 'missed' : 'planned');

        if (status === 'completed' || status === 'compensated') completedSlots += 1;
        else if (status === 'missed') missedSlots += 1;
        else plannedSlots += 1;

        return {
          ...slot,
          planned_date_str: slotDateStr,
          computed_status: status,
          is_compensated: isCompensated,
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
          },
        };
      }

      // Dynamic fallback matching
      const matchingPost = fallbackMatchBySlotId.get(slot.id);

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
    const postersCompleted = enrichedSlots.filter((s) => s.content_type === 'photo' && (s.computed_status === 'completed' || s.computed_status === 'compensated')).length;

    const livesTarget = enrichedSlots.filter((s) => s.content_type === 'live').length;
    const livesCompleted = enrichedSlots.filter((s) => s.content_type === 'live' && (s.computed_status === 'completed' || s.computed_status === 'compensated')).length;

    const videosTarget = enrichedSlots.filter((s) => s.content_type === 'video').length;
    const videosCompleted = enrichedSlots.filter((s) => s.content_type === 'video' && (s.computed_status === 'completed' || s.computed_status === 'compensated')).length;
    const compensatedCount = enrichedSlots.filter((s) => s.computed_status === 'compensated' || s.is_compensated).length;
    const completedOnTimeCount = enrichedSlots.filter((s) => s.computed_status === 'completed' && !s.is_compensated).length;
    const waivedCount = enrichedSlots.filter((s) => s.computed_status === 'waived' || s.slot_status === 'waived').length;
    const onTimeRate = totalSlots > 0 ? Math.round((completedOnTimeCount / totalSlots) * 100) : 0;

    auditList.push({
      brand_id: mission.brand_id,
      brand_name: mission.brand_name,
      month: mission.month,
      year: mission.year,
      total_slots: totalSlots,
      completed_slots: completedSlots,
      completed_on_time_slots: completedOnTimeCount,
      compensated_slots: compensatedCount,
      missed_slots: missedSlots,
      waived_slots: waivedCount,
      planned_slots: plannedSlots,
      completion_rate: completionRate,
      on_time_rate: onTimeRate,
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

    // 0. Explicit Compensation Linking (Highest Priority)
    if (post.compensation_for_slot_id) {
      const targetSlot = await missionsRepo.getSlotById(post.compensation_for_slot_id);
      if (targetSlot) {
        const brandMatches = String(targetSlot.brand_id || '') === String(post.brand_id || '');
        if (brandMatches) {
          const finalStatus = post.status === 'published' ? 'compensated' : post.status === 'scheduled' ? 'scheduled' : 'planned';
          return await missionsRepo.linkSlotToPost(targetSlot.id, post.id, finalStatus, true);
        }
      }
    }

    // 1. Check if post is already linked to an existing slot
    const existingSlot = await missionsRepo.getSlotByLinkedPostId(post.id);
    if (existingSlot) {
      // If this existing link is a compensation link, preserve it if brand still matches
      if (existingSlot.is_compensated) {
        const brandMatches = String(existingSlot.brand_id || '') === String(post.brand_id || '');
        if (brandMatches) {
          const finalStatus = post.status === 'published' ? 'compensated' : post.status === 'scheduled' ? 'scheduled' : 'planned';
          return await missionsRepo.linkSlotToPost(existingSlot.id, post.id, finalStatus, true);
        }
        // Brand changed during edit: unlink old compensation slot
        await missionsRepo.unlinkSlotByPostId(post.id);
        const postTrackerRepo = require('../postTracker/postTracker.repository');
        await postTrackerRepo.updateTrackedPostData(post.id, { compensation_for_slot_id: null });
      }

      const existingDateStr = formatLocalDateStr(existingSlot.planned_date);
      const brandMatches = String(existingSlot.brand_id || '') === String(post.brand_id || '');
      const dateMatches = existingDateStr === postDateStr;
      const typeMatches = isMediaTypeCompatibleWithSlot(existingSlot.content_type, post.media_type);

      // If brand, date, and content_type are still aligned/compatible, just update status
      if (brandMatches && dateMatches && typeMatches) {
        return await missionsRepo.linkSlotToPost(existingSlot.id, post.id, targetStatus, false);
      }
      // If rescheduled to a new date, brand changed, or media format no longer satisfies slot, unlink
      await missionsRepo.unlinkSlotByPostId(post.id);
    }

    // 2. Find an unlinked planned slot matching post's brand, planned date, and media format
    const matchingSlot = await missionsRepo.findUnlinkedSlotForPost({
      brand_id: post.brand_id,
      planned_date: postDateStr,
      content_type: post.media_type || 'photo',
    });

    if (matchingSlot) {
      return await missionsRepo.linkSlotToPost(matchingSlot.id, post.id, targetStatus, false);
    }

    return null; // Post is an extra/unplanned post for this day
  } catch (err) {
    console.error(`[reconcilePostWithMission] Error reconciling post #${post.id} with mission:`, err.message);
    return null; // Graceful fallback
  }
};

/**
 * RETROACTIVE AUTO-RECONCILIATION ENGINE
 * Ensures unlinked slots for a brand are automatically linked to any existing tracked posts
 * that match the slot's planned date and media format (e.g., when schedules are created mid-month).
 */
const autoReconcileBrandSlots = async (brandId) => {
  if (!brandId) return [];

  try {
    // 1. Get all unlinked, uncompensated slots for this brand
    const slots = await missionsRepo.getUnlinkedSlotsForBrand(brandId);
    if (!slots || slots.length === 0) return [];

    // 2. Get all tracked posts for this brand (published or scheduled)
    const postTrackerRepo = require('../postTracker/postTracker.repository');
    const posts = await postTrackerRepo.getTrackedPostsForBrand(brandId);
    if (!posts || posts.length === 0) return [];

    // 3. Collect post IDs that are already claimed by existing slots or marked as compensation
    const linkedSlots = await missionsRepo.getLinkedSlotsForBrand(brandId);
    const usedPostIds = new Set(linkedSlots.map((s) => s.linked_post_id).filter(Boolean));

    posts.forEach((p) => {
      if (p.compensation_for_slot_id) {
        usedPostIds.add(p.id);
      }
    });

    // 4. Group available posts by local date string "YYYY-MM-DD"
    const postsByDate = {};
    posts.forEach((p) => {
      const dStr = formatLocalDateStr(p.published_time || p.scheduled_time);
      if (dStr) {
        if (!postsByDate[dStr]) postsByDate[dStr] = [];
        postsByDate[dStr].push(p);
      }
    });

    // 5. Sort unlinked slots so specific formats (live, video) claim matching posts before photo
    const sortedSlots = [...slots].sort((a, b) => {
      const order = { live: 1, video: 2, photo: 3, poster: 3 };
      const oA = order[a.content_type?.toLowerCase()] || 3;
      const oB = order[b.content_type?.toLowerCase()] || 3;
      return oA - oB;
    });

    // 6. Match and persistently link
    const reconciled = [];
    for (const slot of sortedSlots) {
      const slotDateStr = formatLocalDateStr(slot.planned_date);
      const dayPosts = postsByDate[slotDateStr] || [];
      const match = findMatchingPostForSlot(slot, dayPosts, usedPostIds);

      if (match) {
        usedPostIds.add(match.id);
        const targetStatus = match.status === 'published' ? 'completed' : 'scheduled';
        const updatedSlot = await missionsRepo.linkSlotToPost(slot.id, match.id, targetStatus, false);
        reconciled.push({ slot: updatedSlot, post: match });
      }
    }

    return reconciled;
  } catch (err) {
    console.error(`[autoReconcileBrandSlots] Error reconciling slots for brand #${brandId}:`, err.message);
    return [];
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

  const bId = brand_id || (slot && slot.brand_id);
  if (bId) {
    try {
      await autoReconcileBrandSlots(bId);
    } catch (err) {
      console.error(`[createSlot] Auto-reconcile error for brand ${bId}:`, err.message);
    }
  }

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

const getSlotById = async (slotId) => {
  const slot = await missionsRepo.getSlotById(slotId);
  if (!slot) return null;
  return {
    ...slot,
    planned_date_str: formatLocalDateStr(slot.planned_date),
  };
};

/**
 * Get unresolved missed slots for a brand to offer compensation options
 */
const getMissedSlotsForCompensation = async (brandId) => {
  if (!brandId) return [];
  try {
    await autoReconcileBrandSlots(brandId);
  } catch (err) {
    console.error(`[getMissedSlotsForCompensation] Auto-reconcile error for brand ${brandId}:`, err.message);
  }
  const todayStr = formatLocalDateStr(new Date());
  const missed = await missionsRepo.getUnresolvedMissedSlotsForBrand(brandId, todayStr);
  return missed.map((s) => ({
    ...s,
    planned_date_str: formatLocalDateStr(s.planned_date),
  }));
};

/**
 * Link an existing tracked post to a missed slot as compensation (reconciliation)
 */
const linkPostToSlot = async (slotId, postId) => {
  const slot = await missionsRepo.getSlotById(slotId);
  if (!slot) {
    throw new Error('Mission slot not found');
  }

  const postTrackerRepo = require('../postTracker/postTracker.repository');
  const post = await postTrackerRepo.getTrackedPostById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  // 0. If this post was previously linked to another mission slot, unlink it first
  await missionsRepo.unlinkSlotByPostId(postId);

  // 1. Assign compensation_for_slot_id to the post
  await postTrackerRepo.updateTrackedPostData(postId, { compensation_for_slot_id: slot.id });

  // 2. Link the slot to this post with compensated status
  const finalStatus = post.status === 'published' ? 'compensated' : post.status === 'scheduled' ? 'scheduled' : 'planned';
  const updatedSlot = await missionsRepo.linkSlotToPost(slot.id, post.id, finalStatus, true);

  return {
    slot: {
      ...updatedSlot,
      brand_id: slot.brand_id,
      brand_name: slot.brand_name,
      planned_date_str: formatLocalDateStr(updatedSlot.planned_date || slot.planned_date),
      computed_status: finalStatus,
      is_compensated: true,
      linked_post: {
        id: post.id,
        status: post.status,
        media_type: post.media_type || slot.content_type,
        published_time: post.published_time,
        scheduled_time: post.scheduled_time,
        message: post.message,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url,
        fb_post_id: post.fb_post_id,
        post_url: post.post_url,
        page_id: post.page_id,
      },
    },
    post,
  };
};

/**
 * Unlink a post from a slot, resetting slot back to planned/missed and clearing post's compensation_for_slot_id
 */
const unlinkPostFromSlot = async (slotId) => {
  const slot = await missionsRepo.getSlotById(slotId);
  if (!slot) {
    throw new Error('Mission slot not found');
  }

  const postTrackerRepo = require('../postTracker/postTracker.repository');
  if (slot.linked_post_id) {
    await postTrackerRepo.updateTrackedPostData(slot.linked_post_id, { compensation_for_slot_id: null });
  }

  const updatedSlot = await missionsRepo.unlinkSlotBySlotId(slot.id);
  return {
    ...updatedSlot,
    brand_id: slot.brand_id,
    brand_name: slot.brand_name,
    planned_date_str: formatLocalDateStr(updatedSlot.planned_date || slot.planned_date),
    computed_status: 'missed',
    is_compensated: false,
    linked_post: null,
  };
};

module.exports = {
  formatLocalDateStr,
  getMissionWithProgress,
  saveMissionWithSlots,
  getCalendarSlots,
  getMonthAudit,
  updateSlot,
  createSlot,
  deleteSlot,
  getSlotById,
  reconcilePostWithMission,
  autoReconcileBrandSlots,
  unreconcilePost,
  getMissedSlotsForCompensation,
  linkPostToSlot,
  unlinkPostFromSlot,
};

