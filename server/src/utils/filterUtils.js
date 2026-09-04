/**
 * Filter utilities for dashboard date ranges and platforms
 */

const getDateRangeBounds = (range) => {
  const now = new Date();
  let start = null;
  let end = null;
  let prevStart = null;
  let prevEnd = null;

  if (range === 'this_week') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const day = today.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start = new Date(today);
    start.setDate(today.getDate() + diffToMonday);

    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - 7);
  } else if (range === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (range === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
  } else if (range === 'three_months') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    prevStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59, 999);
  }

  return { start, end, prevStart, prevEnd };
};

const getPostDate = (post) => {
  const d = post.published_time || post.scheduled_time || post.created_at;
  return d ? new Date(d) : null;
};

const isPostInPlatform = (post, platform) => {
  if (!platform || platform === 'all') return true;
  const p = (post.platform || 'facebook').toLowerCase();
  const target = platform.toLowerCase();
  if (target === 'fb' || target === 'facebook') {
    return p === 'facebook' || p === 'fb';
  }
  return p === target;
};

const isPostInRange = (post, start, end) => {
  if (!start && !end) return true;
  const d = getPostDate(post);
  if (!d) return true;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

const calcTrend = (current, previous) => {
  if (previous === undefined || previous === null || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
};

module.exports = {
  getDateRangeBounds,
  getPostDate,
  isPostInPlatform,
  isPostInRange,
  calcTrend
};
