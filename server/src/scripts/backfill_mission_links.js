const db = require('../config/db');
const missionsRepo = require('../modules/missions/missions.repository');

const formatLocalDateStr = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const backfillMissionLinks = async () => {
  try {
    console.log('--- Starting Backfill: Auto-Reconciling Existing Mission Slots with Posts ---');

    // Fetch all slots with their brand information
    const slotsRes = await db.query(`
      SELECT s.*, m.brand_id, m.brand_name, m.month, m.year
      FROM tb_brand_mission_slot s
      JOIN tb_brand_mission m ON m.id = s.mission_id
      ORDER BY s.planned_date ASC, s.id ASC
    `);

    const slots = slotsRes.rows;
    console.log(`Found ${slots.length} total mission slots to audit.`);

    // Fetch all posts that have a brand assigned
    const postsRes = await db.query(`
      SELECT id, brand_id, media_type, status, published_time, scheduled_time, message
      FROM tb_post_tracker
      WHERE brand_id IS NOT NULL
      ORDER BY COALESCE(published_time, scheduled_time) ASC, id ASC
    `);

    const posts = postsRes.rows;
    console.log(`Found ${posts.length} tracked posts with brands.`);

    // Group posts by `${brand_id}_${dateStr}`
    const postsByBrandAndDate = new Map();
    posts.forEach((post) => {
      const dStr = formatLocalDateStr(post.published_time || post.scheduled_time);
      if (!dStr) return;
      const key = `${post.brand_id}_${dStr}`;
      if (!postsByBrandAndDate.has(key)) postsByBrandAndDate.set(key, []);
      postsByBrandAndDate.get(key).push(post);
    });

    const usedPostIds = new Set();
    let reconciledCount = 0;
    let alreadyLinkedCount = 0;

    // Sort slots so specific types (live, video) claim exact matching posts first
    const sortedSlots = [...slots].sort((a, b) => {
      const order = { live: 1, video: 2, photo: 3 };
      const oA = order[a.content_type?.toLowerCase()] || 3;
      const oB = order[b.content_type?.toLowerCase()] || 3;
      return oA - oB;
    });

    for (const slot of sortedSlots) {
      const slotDateStr = formatLocalDateStr(slot.planned_date);
      const key = `${slot.brand_id}_${slotDateStr}`;
      const dayPosts = postsByBrandAndDate.get(key) || [];

      // If slot is already linked to a post that still exists
      if (slot.linked_post_id) {
        usedPostIds.add(slot.linked_post_id);
        alreadyLinkedCount += 1;
        continue;
      }

      // Find an unused post matching format according to workflow rules:
      // Photo slot can be fulfilled by photo OR video. Video/Live must be exact.
      const slotType = (slot.content_type || '').toLowerCase();
      let match = null;

      if (slotType === 'live') {
        match = dayPosts.find((p) => !usedPostIds.has(p.id) && (p.media_type || '').toLowerCase() === 'live');
      } else if (slotType === 'video') {
        match = dayPosts.find((p) => {
          if (usedPostIds.has(p.id)) return false;
          const t = (p.media_type || '').toLowerCase();
          return t === 'video' || t === 'reel';
        });
      } else if (slotType === 'photo' || slotType === 'poster') {
        // 1. Exact match first: photo
        match = dayPosts.find((p) => {
          if (usedPostIds.has(p.id)) return false;
          const t = (p.media_type || '').toLowerCase();
          return t === 'photo' || t === 'image' || (t !== 'live' && t !== 'video' && t !== 'reel');
        });
        // 2. Fallback: video fulfills photo quota
        if (!match) {
          match = dayPosts.find((p) => {
            if (usedPostIds.has(p.id)) return false;
            const t = (p.media_type || '').toLowerCase();
            return t === 'video' || t === 'reel';
          });
        }
      }

      if (match) {
        usedPostIds.add(match.id);
        const targetStatus = match.status === 'published' ? 'completed' : match.status === 'scheduled' ? 'scheduled' : 'planned';
        await missionsRepo.linkSlotToPost(slot.id, match.id, targetStatus);
        console.log(`✅ Reconciled Slot #${slot.id} [${slot.brand_name} ${slot.content_type} on ${slotDateStr}] -> Post #${match.id} (${match.status})`);
        reconciledCount += 1;
      }
    }

    console.log('----------------------------------------------------');
    console.log(`Backfill Summary:`);
    console.log(`• Total slots checked: ${slots.length}`);
    console.log(`• Already linked: ${alreadyLinkedCount}`);
    console.log(`• Newly reconciled & persistently linked: ${reconciledCount}`);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Backfill error:', err);
  } finally {
    process.exit(0);
  }
};

backfillMissionLinks();

