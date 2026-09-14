/**
 * Filter utilities for dashboard date ranges and platforms
 */

const getTimezoneOffsetMinutes = (date, timeZone) => {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
  } catch {
    return 0;
  }
};

const zonedToUtc = (year, month, day, hour, minute, second, ms, timeZone) => {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const approx = new Date(utcMs);
  const offset = getTimezoneOffsetMinutes(approx, timeZone);
  return new Date(utcMs + offset * 60000);
};

const getZonedNowParts = (timeZone) => {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      year: parseInt(map.year, 10),
      month: parseInt(map.month, 10),
      day: parseInt(map.day, 10),
      weekday: weekdayMap[map.weekday] ?? 0
    };
  } catch {
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      weekday: now.getDay()
    };
  }
};

const getDateRangeBounds = (range, clientTimezone) => {
  const tz = clientTimezone || process.env.TZ || 'Asia/Phnom_Penh';
  const parts = getZonedNowParts(tz);

  let start = null;
  let end = null;
  let prevStart = null;
  let prevEnd = null;

  if (range === 'this_week') {
    const day = parts.weekday; // 0 is Sunday, 1 is Monday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const startCal = new Date(parts.year, parts.month - 1, parts.day + diffToMonday);
    const endCal = new Date(startCal.getFullYear(), startCal.getMonth(), startCal.getDate() + 6);

    start = zonedToUtc(startCal.getFullYear(), startCal.getMonth() + 1, startCal.getDate(), 0, 0, 0, 0, tz);
    end = zonedToUtc(endCal.getFullYear(), endCal.getMonth() + 1, endCal.getDate(), 23, 59, 59, 999, tz);

    const prevStartCal = new Date(startCal.getFullYear(), startCal.getMonth(), startCal.getDate() - 7);
    const prevEndCal = new Date(endCal.getFullYear(), endCal.getMonth(), endCal.getDate() - 7);

    prevStart = zonedToUtc(prevStartCal.getFullYear(), prevStartCal.getMonth() + 1, prevStartCal.getDate(), 0, 0, 0, 0, tz);
    prevEnd = zonedToUtc(prevEndCal.getFullYear(), prevEndCal.getMonth() + 1, prevEndCal.getDate(), 23, 59, 59, 999, tz);
  } else if (range === 'this_month') {
    const lastDayOfMonth = new Date(parts.year, parts.month, 0).getDate();
    start = zonedToUtc(parts.year, parts.month, 1, 0, 0, 0, 0, tz);
    end = zonedToUtc(parts.year, parts.month, lastDayOfMonth, 23, 59, 59, 999, tz);

    const prevMonthDate = new Date(parts.year, parts.month - 2, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

    prevStart = zonedToUtc(prevYear, prevMonth, 1, 0, 0, 0, 0, tz);
    prevEnd = zonedToUtc(prevYear, prevMonth, lastDayOfPrevMonth, 23, 59, 59, 999, tz);
  } else if (range === 'last_month') {
    const targetMonthDate = new Date(parts.year, parts.month - 2, 1);
    const tYear = targetMonthDate.getFullYear();
    const tMonth = targetMonthDate.getMonth() + 1;
    const lastDay = new Date(tYear, tMonth, 0).getDate();

    start = zonedToUtc(tYear, tMonth, 1, 0, 0, 0, 0, tz);
    end = zonedToUtc(tYear, tMonth, lastDay, 23, 59, 59, 999, tz);

    const prevTargetMonthDate = new Date(parts.year, parts.month - 3, 1);
    const ptYear = prevTargetMonthDate.getFullYear();
    const ptMonth = prevTargetMonthDate.getMonth() + 1;
    const ptLastDay = new Date(ptYear, ptMonth, 0).getDate();

    prevStart = zonedToUtc(ptYear, ptMonth, 1, 0, 0, 0, 0, tz);
    prevEnd = zonedToUtc(ptYear, ptMonth, ptLastDay, 23, 59, 59, 999, tz);
  } else if (range === 'three_months') {
    const start3m = new Date(parts.year, parts.month - 3, 1);
    const endMonth = new Date(parts.year, parts.month, 0);

    start = zonedToUtc(start3m.getFullYear(), start3m.getMonth() + 1, 1, 0, 0, 0, 0, tz);
    end = zonedToUtc(parts.year, parts.month, endMonth.getDate(), 23, 59, 59, 999, tz);

    const prevStart3m = new Date(parts.year, parts.month - 6, 1);
    const prevEnd3m = new Date(parts.year, parts.month - 3, 0);

    prevStart = zonedToUtc(prevStart3m.getFullYear(), prevStart3m.getMonth() + 1, 1, 0, 0, 0, 0, tz);
    prevEnd = zonedToUtc(prevEnd3m.getFullYear(), prevEnd3m.getMonth() + 1, prevEnd3m.getDate(), 23, 59, 59, 999, tz);
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
