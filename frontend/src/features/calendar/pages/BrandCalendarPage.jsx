import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  RefreshCw,
  Clock,
  ExternalLink,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Download,
  Sparkles,
  Filter,
  Check,
  LayoutGrid,
  Radio,
  Image,
  Video,
  FileText,
  Target,
  X
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import * as missionApi from '../../missions/api/missionApi';
import { useBrands, usePages, useCalendarSlots, useMonthAudit } from '../../../shared/hooks/queries';
import { queryKeys } from '../../../shared/utils/queryKeys';
import { invalidatePostAndMissionCaches, invalidateMissionCaches } from '../../../shared/utils/cacheSync';
import { usePostTracker } from '../../postTracker/hooks/usePostTracker';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { Select, Button, Modal } from '../../../shared/components/ui';
import { resolveAllMediaUrls } from '../../../shared/utils/mediaUrl';
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';
import { FaFacebook } from 'react-icons/fa';
import { SetMissionModal } from '../../missions/components/SetMissionModal';
import '../../postTracker/planner.css';
import '../calendar.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MISSION_STATUS_TABS = [
  {
    key: 'all',
    label: 'All Missions',
    icon: Target,
    title: 'Show all planned brand deliverables',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    title: 'Show only delivered/published posts',
  },
  {
    key: 'pending',
    label: 'Pending',
    icon: Clock,
    title: 'Show pending brand deliverables',
  },
];

const isPostCompatibleWithSlot = (slotContentType, postMediaType) => {
  const sType = (slotContentType || '').toLowerCase();
  const pType = (postMediaType || '').toLowerCase();
  const isLive = pType === 'live';
  const isVideo = pType === 'video' || pType === 'reel';
  const isPhoto = !isLive && !isVideo;

  if (sType === 'live') return isLive;
  if (sType === 'video') return isVideo;
  if (sType === 'photo' || sType === 'poster') return isPhoto || isVideo;
  return true;
};

const findMatchingPostForSlot = (slot, posts = []) => {
  if (slot.linked_post) return slot.linked_post;
  const slotBrandId = slot.brand_id ? String(slot.brand_id) : '';
  return (posts || []).find((p) => {
    const postBrandId = p.brand_id ? String(p.brand_id) : '';
    if (slotBrandId && postBrandId !== slotBrandId) return false;
    if (p.status !== 'published' && p.status !== 'scheduled') return false;
    return isPostCompatibleWithSlot(slot.content_type, p.media_type);
  }) || null;
};

const getContentTypeInfo = (contentType, isSpecial = false) => {
  const type = (contentType || '').toLowerCase();
  if (type === 'video' || type === 'reel') {
    return { label: 'Video', icon: Video, variant: 'video' }; // Purple for video/reels
  }
  if (type === 'live') {
    return {
      label: isSpecial ? 'Payday Live' : 'Live Stream',
      icon: Radio,
      variant: isSpecial ? 'payday' : 'live', // Amber/Sky Blue for live
    };
  }
  return { label: 'Poster', icon: Image, variant: 'poster' }; // Indigo for poster (NEVER green!)
};

/**
 * Derive visual state and matched post metadata for a planned mission slot.
 */
const resolveSlotDisplay = (slot, dateKey, todayKey, posts) => {
  const isSpecial =
    (slot.time_window || '').includes('04:00PM') ||
    (slot.notes || '').toLowerCase().includes('payday');
  const typeInfo = getContentTypeInfo(slot.content_type, isSpecial);
  const linked = findMatchingPostForSlot(slot, posts);

  const isCompleted = slot.computed_status === 'completed' || linked?.status === 'published';
  const isScheduled =
    !isCompleted && (slot.computed_status === 'scheduled' || linked?.status === 'scheduled');
  const isMissed =
    !isCompleted && !isScheduled && (slot.computed_status === 'missed' || (dateKey < todayKey && !linked));

  const stateClass = isCompleted
    ? 'is-completed'
    : isScheduled
      ? 'is-scheduled'
      : isMissed
        ? 'is-missed'
        : 'is-planned';

  const statusSummary = isCompleted
    ? 'Live on Facebook'
    : isScheduled
      ? 'Scheduled'
      : isMissed
        ? 'Overdue'
        : 'Planned deliverable';

  return { typeInfo, linked, isCompleted, isScheduled, isMissed, stateClass, statusSummary };
};

export const BrandCalendarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const brandParam = searchParams.get('brand_id') || searchParams.get('brand') || 'all';
  const monthParam = parseInt(searchParams.get('month'), 10);
  const yearParam = parseInt(searchParams.get('year'), 10);

  // Active Month & Year
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    if (!isNaN(monthParam) && monthParam >= 1 && monthParam <= 12) {
      d.setMonth(monthParam - 1);
    }
    if (!isNaN(yearParam) && yearParam >= 2000) {
      d.setFullYear(yearParam);
    }
    return d;
  });

  const monthNumber = currentDate.getMonth() + 1;
  const yearNumber = currentDate.getFullYear();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filters (synced with URL)
  const [selectedBrandId, setSelectedBrandIdState] = useState(brandParam);

  const setSelectedBrandId = (newId) => {
    setSelectedBrandIdState(newId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newId && newId !== 'all') {
        next.set('brand_id', newId);
      } else {
        next.delete('brand_id');
      }
      return next;
    }, { replace: true });
  };

  const [selectedPageId, setSelectedPageId] = useState('all');   // 'all' shows all pages
  const [missionStatusFilter, setMissionStatusFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [selectedContentType, setSelectedContentType] = useState('all');

  // TanStack Query: Cached & deduplicated brands and pages lists
  const { data: brands = [] } = useBrands();
  const { data: pages = [] } = usePages();

  // Formatted options for global UI Select components
  const brandOptions = useMemo(() => {
    const list = [{ value: 'all', label: '🌟 All Brands (Master Schedule)' }];
    (brands || []).forEach((b) => {
      const id = String(b.brand_id || b.id);
      const name = b.brand_name || b.name || `Brand #${id}`;
      list.push({ value: id, label: name });
    });
    return list;
  }, [brands]);

  const pageOptions = useMemo(() => {
    const list = [{ value: 'all', label: `📄 All Pages ${pages.length > 0 ? `(${pages.length})` : ''}` }];
    (pages || []).forEach((p) => {
      const id = String(p.id);
      const name = p.page_name || `Page #${id}`;
      list.push({ value: id, label: name });
    });
    return list;
  }, [pages]);

  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null); // Day Detail Modal state

  // TanStack Query: Cached calendar slots & monthly audit (0ms instant render on back navigation)
  const { data: calendarSlots = [], isLoading: slotsLoading } = useCalendarSlots(selectedBrandId, monthNumber, yearNumber);
  const { data: auditSummary = [], isLoading: auditLoading } = useMonthAudit(monthNumber, yearNumber);
  const loading = slotsLoading || auditLoading;

  // Load tracked posts from PostTracker
  const { posts } = usePostTracker({ range: 'all' });

  const handleRefresh = async () => {
    await invalidatePostAndMissionCaches();
  };

  // Date Navigation with URL preservation
  const updateDateAndUrl = (newDate) => {
    setCurrentDate(newDate);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('month', String(newDate.getMonth() + 1));
      next.set('year', String(newDate.getFullYear()));
      return next;
    }, { replace: true });
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    updateDateAndUrl(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    updateDateAndUrl(next);
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    d.setDate(1);
    updateDateAndUrl(d);
  };

  // Build Calendar Matrix for the active month (Monday to Sunday)
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday
    const leadingDaysCount = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const cells = [];

    // Leading days from previous month
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = leadingDaysCount - 1; i >= 0; i--) {
      const day = prevMonthLastDate - i;
      const d = new Date(year, month - 1, day);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNumber: day,
        dateKey,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const d = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNumber: day,
        dateKey,
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month to fill grid (35 or 42 cells)
    const targetLength = cells.length > 35 ? 42 : 35;
    let nextDay = 1;
    while (cells.length < targetLength) {
      const d = new Date(year, month + 1, nextDay++);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        date: d,
        dayNumber: d.getDate(),
        dateKey,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentDate]);

  // Today's dateKey string ("YYYY-MM-DD") for active date highlighting
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Group planned slots and actual posts by dateKey ("YYYY-MM-DD")
  const itemsByDate = useMemo(() => {
    const map = new Map();

    // 1. Add planned slots
    calendarSlots.forEach((slot) => {
      // If page filter is active and slot is linked to a post, check page match
      if (selectedPageId !== 'all') {
        if (slot.linked_post) {
          const slotPageId = String(slot.linked_post.page_id || slot.linked_post.fb_page_id || '');
          if (slotPageId !== String(selectedPageId)) return;
        }
      }

      const key = slot.planned_date_str;
      if (key) {
        if (!map.has(key)) map.set(key, { slots: [], posts: [] });
        map.get(key).slots.push(slot);
      }
    });

    // 2. Add tracked posts that match the active brand & page filters
    (posts || []).forEach((post) => {
      const rawDate = post.published_time || post.scheduled_time;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Brand filter
      if (selectedBrandId !== 'all') {
        const postBrandId = post.brand_id ? String(post.brand_id) : '';
        if (postBrandId !== String(selectedBrandId)) return;
      }

      // Page filter
      if (selectedPageId !== 'all') {
        const postPageId = String(post.page_id || post.fb_page_id || '');
        if (postPageId !== String(selectedPageId)) return;
      }

      if (!map.has(key)) map.set(key, { slots: [], posts: [] });
      map.get(key).posts.push(post);
    });

    return map;
  }, [calendarSlots, posts, selectedBrandId, selectedPageId]);

  // Helper to get clean, deduplicated post label & time
  const getPostCleanLabel = (p) => {
    const brand = (p.brand_name || '').trim();
    const product = (p.product_name || '').trim();

    let namePart = '';
    if (brand && product) {
      if (brand.toLowerCase() === product.toLowerCase()) {
        namePart = brand;
      } else {
        namePart = `${brand} • ${product}`;
      }
    } else {
      namePart = brand || product || (p.message ? (p.message.slice(0, 24) + '...') : 'Post');
    }

    const dateStr = p.published_time || p.scheduled_time || p.created_at;
    let timeStr = '';
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }

    return { namePart, timeStr };
  };

  return (
    <div className="page-container brand-calendar-page">
      {/* Main Header Row */}
      <div className="planner-header-row">
        <div className="planner-header-title-wrap">
          <h1 className="brand-cal-title">
            <CalendarIcon size={28} className="brand-cal-title-icon" /> Brand Calendar
          </h1>
          <p>Monthly client campaign roadmap & deliverable tracking for all contracted brands.</p>
        </div>

        <div className="planner-header-actions">
          <a
            href="/K-FREE_October_2026_Schedule.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="planner-btn-secondary brand-cal-export-btn"
            title="Download or Print PDF Calendar"
          >
            <Download size={15} /> Export PDF
          </a>

          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setIsModalOpen(true)}
          >
            Plan Brand Blueprint
          </Button>
        </div>
      </div>

      {/* Toolbar: Navigation, Month Picker, Brand Filter */}
      <div className="planner-toolbar-card brand-cal-toolbar">
        {/* Navigation Group */}
        <div className="planner-nav-group">
          <div className="planner-nav-btns">
            <button className="planner-nav-btn" onClick={handlePrevMonth} title="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <button className="planner-today-btn" onClick={handleCurrentMonth}>
              This Month
            </button>
            <button className="planner-nav-btn" onClick={handleNextMonth} title="Next Month">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="planner-current-period">
            <span className="brand-cal-month-title">{monthName}</span>
          </div>
        </div>

        {/* Filters Group */}
        <div className="brand-cal-filters-group">
          {/* Brand Filter */}
          <div className="brand-cal-filter-select">
            <Select
              value={selectedBrandId}
              options={brandOptions}
              onChange={setSelectedBrandId}
              placeholder="Select Brand..."
            />
          </div>

          {/* Page Filter */}
          <div className="brand-cal-filter-select">
            <Select
              value={selectedPageId}
              options={pageOptions}
              onChange={setSelectedPageId}
              placeholder="Select Page..."
            />
          </div>

          {/* Deliverables Status Filter */}
          <div className="brand-cal-status-tabs">
            {MISSION_STATUS_TABS.map(({ key, label, icon: TabIcon, title }) => {
              const isActive = missionStatusFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMissionStatusFilter(key)}
                  className={`brand-cal-status-tab is-${key} ${isActive ? 'is-active' : ''}`}
                  title={title}
                >
                  <TabIcon size={13} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Refresh */}
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={13} className={loading ? 'spin-animation' : ''} />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ALL-BRANDS MISSION PROGRESS OVERVIEW BAR */}
      <div className="brand-cal-audit-card">
        <div className="brand-cal-audit-header">
          <div className="brand-cal-audit-title-group">
            <span className="brand-cal-audit-title">
              🎯 {monthName} — Monthly Missions for All Brands
            </span>
            <span className="brand-cal-audit-count">
              ({auditSummary.length} brands planned)
            </span>
          </div>

          <div className="brand-cal-audit-actions">
            <button
              onClick={() => navigate('/stats/brands?tab=missions')}
              className="brand-cal-link-btn"
              title="Open the full 500-brand deliverables matrix"
            >
              <span>Manage in Brands Hub</span> →
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="brand-cal-link-btn"
            >
              <Plus size={14} /> Add / Edit Blueprint
            </button>
          </div>
        </div>

        {auditSummary.length === 0 ? (
          <div className="brand-cal-audit-empty">
            No brand schedule blueprint has been saved yet for {monthName}. Click <strong>+ Plan Schedule Blueprint</strong> to set posting days.
          </div>
        ) : (
          <div className="brand-cal-audit-grid">
            {auditSummary.map((b) => {
              const is100 = b.completion_rate === 100 && b.total_slots > 0;
              const hasMissed = b.missed_slots > 0;
              const statusClass = is100 ? 'is-done' : (hasMissed ? 'is-missed' : 'is-progress');

              return (
                <div
                  key={b.brand_id}
                  className={`brand-cal-audit-item ${statusClass}`}
                >
                  <div>
                    <div className="brand-cal-audit-brand">
                      {b.brand_name}
                    </div>
                    <div className="brand-cal-audit-subtext">
                      {b.completed_slots} / {b.total_slots} days published
                    </div>
                  </div>

                  <div>
                    {is100 ? (
                      <span className="brand-cal-audit-pill is-done">
                        100% DONE 🏆
                      </span>
                    ) : hasMissed ? (
                      <span className="brand-cal-audit-pill is-missed">
                        {b.missed_slots} Missed ⚠️
                      </span>
                    ) : (
                      <span className="brand-cal-audit-pill is-progress">
                        {b.completion_rate}% In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====================================================================
          MASTER CALENDAR GRID (Monday to Sunday - All Brands)
         ==================================================================== */}
      <div className="brand-cal-grid-wrapper">
        {/* Days of week Header (Modern Executive Royal Blue Bar) */}
        <div className="brand-cal-weekdays-bar">
          {DAY_NAMES.map((d, index) => (
            <div
              key={d}
              className={`brand-cal-weekday-cell ${index >= 5 ? 'is-weekend' : ''}`}
            >
              {d.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Calendar Cells Grid — Crisp 1px #cbd5e1 dividers so every cell is clearly framed */}
        <div className="brand-cal-days-grid">
          {calendarCells.map((cell, idx) => {
            const data = itemsByDate.get(cell.dateKey) || { slots: [], posts: [] };
            const daySlots = data.slots;
            const dayPosts = data.posts;

            const isCurrentMonth = cell.isCurrentMonth;
            const isToday = cell.dateKey === todayKey;

            return (
              <div
                key={idx}
                className={`brand-cal-day-cell ${!isCurrentMonth ? 'is-other-month' : ''} ${isToday && isCurrentMonth ? 'is-today' : ''}`}
              >
                {/* Day Number Header */}
                <div className={`brand-cal-day-header ${!isCurrentMonth ? 'is-other-month' : ''}`}>
                  <div className="brand-cal-day-num-wrap">
                    {isCurrentMonth && cell.dayNumber === 1 && (
                      <span className="brand-cal-month-first-badge">
                        {currentDate.toLocaleString('default', { month: 'short' })} 01
                      </span>
                    )}
                    {!(isCurrentMonth && cell.dayNumber === 1) && (
                      isToday && isCurrentMonth ? (
                        <span className="brand-cal-today-badge">
                          {cell.dayNumber}
                        </span>
                      ) : (
                        <span className={`brand-cal-day-num ${!isCurrentMonth ? 'is-other-month' : ''}`}>
                          {cell.dayNumber < 10 ? `0${cell.dayNumber}` : cell.dayNumber}
                        </span>
                      )
                    )}
                  </div>

                  {/* Quick Add Button */}
                  {isCurrentMonth && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/planner/create?date=${cell.dateKey}`, {
                          state: {
                            from: location.pathname,
                            ...(selectedBrandId !== 'all' ? { prefillBrandId: selectedBrandId } : {}),
                          },
                        })
                      }
                      className="brand-cal-quick-add-btn"
                      title={`Schedule post for ${cell.dateKey}`}
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>

                {/* Event Badges List for this day */}
                <div className="brand-cal-slots-list">
                  {/* Strict Client Deliverables — Display planned brand mission slots */}
                  {isCurrentMonth && (() => {
                    const filteredSlots = daySlots.filter((slot) => {
                      const slotLinked = findMatchingPostForSlot(slot, dayPosts);
                      const completed = slot.computed_status === 'completed' || slotLinked?.status === 'published';
                      if (missionStatusFilter === 'completed') return completed;
                      if (missionStatusFilter === 'pending') return !completed;
                      return true;
                    });

                    // Flexible 4/5 overflow logic:
                    // If total slots <= 5, display all normally
                    // If total slots > 5, display 4 items and show "+ X more ..." as the 5th item
                    const hasOverflow = filteredSlots.length > 5;
                    const visibleSlots = hasOverflow ? filteredSlots.slice(0, 4) : filteredSlots;
                    const remainingCount = hasOverflow ? filteredSlots.length - 4 : 0;

                    return (
                      <>
                        {visibleSlots.map((slot, sIdx) => {
                          const {
                            typeInfo,
                            linked,
                            isCompleted,
                            isScheduled,
                            isMissed,
                            statusSummary,
                          } = resolveSlotDisplay(slot, cell.dateKey, todayKey, dayPosts);

                          return (
                            <div
                              key={`slot-${slot.id || sIdx}`}
                              onClick={() => {
                                if (linked?.id) {
                                  navigate(`/planner/edit/${linked.id}`);
                                } else {
                                  navigate(`/planner/create?date=${cell.dateKey}`, {
                                    state: {
                                      from: location.pathname,
                                      prefillBrandId: slot.brand_id,
                                      prefillDate: cell.dateKey,
                                      prefillType: slot.content_type
                                    }
                                  });
                                }
                              }}
                              className={`brand-cal-slot-card ${isScheduled ? 'is-scheduled' : ''}`}
                              title={`Click to ${linked?.id ? 'view post' : 'create post'} for ${slot.brand_name} (${statusSummary})`}
                            >
                              <div className="brand-cal-slot-main">
                                <span
                                  className={`brand-cal-slot-accent is-${typeInfo.variant}`}
                                  title={`${typeInfo.label} deliverable`}
                                />

                                <span className="brand-cal-slot-brand">
                                  {slot.brand_name || 'Brand'}
                                </span>

                                <span className="brand-cal-slot-dot">·</span>

                                <span className="brand-cal-slot-type">
                                  {typeInfo.label}
                                </span>
                              </div>

                              <div className="brand-cal-slot-status-wrap">
                                {isCompleted && (
                                  <span
                                    className="brand-cal-status-pill is-live"
                                    title="Delivered & Live on Facebook"
                                  >
                                    <Check size={8.5} strokeWidth={3} /> LIVE
                                  </span>
                                )}

                                {isScheduled && (
                                  <span
                                    className="brand-cal-status-pill is-scheduled"
                                    title="Scheduled on Facebook"
                                  >
                                    <Clock size={8.5} strokeWidth={2.5} /> {slot.time_window || 'QUEUED'}
                                  </span>
                                )}

                                {isMissed && (
                                  <span
                                    className="brand-cal-status-pill is-missed"
                                    title="Overdue / Missed deliverable date"
                                  >
                                    <AlertTriangle size={8.5} strokeWidth={2.5} /> MISSED
                                  </span>
                                )}

                                {!isCompleted && !isScheduled && !isMissed && (
                                  <span
                                    className="brand-cal-status-pill is-planned"
                                    title="Planned deliverable (click to create post)"
                                  >
                                    {slot.time_window || 'Planned'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {remainingCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDayDetail({
                                dateKey: cell.dateKey,
                                dayNumber: cell.dayNumber,
                                slots: filteredSlots,
                                posts: dayPosts,
                              });
                            }}
                            className="brand-cal-more-btn"
                          >
                            +{remainingCount} more ...
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Set Blueprint Modal */}
      <SetMissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialMonth={monthNumber}
        initialYear={yearNumber}
        initialBrandId={selectedBrandId !== 'all' ? selectedBrandId : (brands[0] ? String(brands[0].brand_id || brands[0].id) : '')}
        onSaved={() => {
          invalidateMissionCaches();
        }}
      />

      {/* Day Detail Modal */}
      <Modal
        isOpen={Boolean(selectedDayDetail)}
        onClose={() => setSelectedDayDetail(null)}
        size="md"
      >
        {selectedDayDetail && (
          <>
            <Modal.Header
              title={new Date(selectedDayDetail.dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              description={`${selectedDayDetail.slots.length} Planned Target${selectedDayDetail.slots.length === 1 ? '' : 's'} • ${selectedDayDetail.posts.length} Published Post${selectedDayDetail.posts.length === 1 ? '' : 's'}`}
              onClose={() => setSelectedDayDetail(null)}
            />

            <Modal.Body className="brand-cal-modal-body">
              {/* Planned Targets */}
              {selectedDayDetail.slots.length > 0 && (
                <div>
                  <h4 className="brand-cal-modal-section-title">
                    🎯 Planned Schedule Targets
                  </h4>
                  <div className="brand-cal-modal-list">
                    {selectedDayDetail.slots.map((slot, sIdx) => {
                      const {
                        typeInfo,
                        linked,
                        isCompleted,
                        isScheduled,
                        isMissed,
                        stateClass,
                      } = resolveSlotDisplay(
                        slot,
                        selectedDayDetail.dateKey,
                        todayKey,
                        selectedDayDetail.posts
                      );

                      let thumbUrl = null;
                      let fbUrl = null;
                      if (linked) {
                        const media = resolveAllMediaUrls(linked.media_url);
                        thumbUrl = linked.thumbnail_url || media[0] || linked.product_image;
                        fbUrl = getFacebookPostUrl(linked.fb_post_id, linked.post_url, linked.page_id || linked.fb_page_id);
                      }

                      const IconComp = typeInfo.icon;
                      const isActiveState = isCompleted || isScheduled || isMissed;

                      return (
                        <div
                          key={`modal-slot-${slot.id || sIdx}`}
                          className={`brand-cal-modal-slot ${stateClass}`}
                        >
                          <div className="brand-cal-modal-slot-left">
                            {isCompleted && thumbUrl ? (
                              <div className="brand-cal-modal-thumb-wrap">
                                <SafeImage
                                  src={thumbUrl}
                                  alt="Post thumbnail"
                                  className="brand-cal-modal-thumb-img"
                                  fallbackText="FB"
                                />
                                <div className="brand-cal-modal-fb-corner">
                                  <FaFacebook size={12} />
                                </div>
                              </div>
                            ) : isCompleted ? (
                              <div className="brand-cal-modal-icon-box is-completed">
                                <Check size={20} strokeWidth={3} />
                              </div>
                            ) : isScheduled ? (
                              <div className="brand-cal-modal-icon-box is-scheduled">
                                <Clock size={20} />
                              </div>
                            ) : isMissed ? (
                              <div className="brand-cal-modal-icon-box is-missed">
                                <AlertTriangle size={20} />
                              </div>
                            ) : (
                              <div className="brand-cal-modal-icon-box">
                                <IconComp size={18} />
                              </div>
                            )}

                            <div className="brand-cal-modal-slot-info">
                              <div className="brand-cal-modal-slot-meta">
                                <span className={`brand-cal-modal-slot-brand ${isActiveState ? 'is-active-state' : ''}`}>
                                  {slot.brand_name || 'Brand'}
                                </span>

                                <span className="brand-cal-modal-slot-dot">·</span>

                                {isCompleted && (
                                  <span className="brand-cal-modal-badge is-live">
                                    <Check size={9} strokeWidth={3} /> LIVE ON FB
                                  </span>
                                )}

                                {isScheduled && (
                                  <span className="brand-cal-modal-badge is-scheduled">
                                    <Clock size={9} strokeWidth={2.5} /> SCHEDULED
                                  </span>
                                )}

                                {isMissed && (
                                  <span className="brand-cal-modal-badge is-missed">
                                    <AlertTriangle size={9} strokeWidth={2.5} /> MISSED
                                  </span>
                                )}

                                {!isActiveState && (
                                  <span className="brand-cal-modal-badge is-planned">
                                    PLANNED
                                  </span>
                                )}
                              </div>

                              <div className="brand-cal-modal-slot-subtitle">
                                {typeInfo.label} {slot.time_window ? `(${slot.time_window})` : ''}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="brand-cal-modal-actions">
                            {fbUrl && (
                              <a
                                href={fbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="brand-cal-modal-fb-btn"
                                title="Open post on Facebook"
                              >
                                <FaFacebook size={12} /> View on FB
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDayDetail(null);
                                if (linked?.id) {
                                  navigate(`/planner/edit/${linked.id}`);
                                } else {
                                  navigate(`/planner/create?date=${selectedDayDetail.dateKey}`, {
                                    state: {
                                      returnPath: '/calendar',
                                      from: location.pathname,
                                      prefillBrandId: slot.brand_id,
                                      prefillDate: selectedDayDetail.dateKey,
                                      prefillType: slot.content_type,
                                      defaultBrandId: slot.brand_id,
                                      defaultContentType: slot.content_type,
                                      defaultTime: slot.time_window,
                                      plannedSlotId: slot.id,
                                    }
                                  });
                                }
                              }}
                              className={`brand-cal-modal-action-btn ${isCompleted ? 'is-completed' : isScheduled ? 'is-scheduled' : ''}`}
                            >
                              {linked?.id ? 'Edit in Planner' : '+ Create Post'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDayDetail.slots.length === 0 && (
                <div className="brand-cal-modal-empty">
                  <p className="brand-cal-modal-empty-title">
                    No client deliverables scheduled for this day.
                  </p>
                  <p className="brand-cal-modal-empty-desc">
                    General store posts and non-brand organic content are managed on the <strong>Planner</strong> page.
                  </p>
                </div>
              )}

              {/* Related Delivered Brand Posts */}
              {(() => {
                const brandPosts = (selectedDayDetail.posts || []).filter(p => p.brand_id || selectedDayDetail.slots.some(s => s.linked_post?.id === p.id));
                if (brandPosts.length === 0) return null;

                return (
                  <div className={`brand-cal-related-posts ${selectedDayDetail.slots.length > 0 ? 'has-slots' : ''}`}>
                    <h4 className="brand-cal-modal-section-title">
                      📄 Delivered Brand Posts ({brandPosts.length})
                    </h4>
                    <div className="brand-cal-modal-list">
                      {brandPosts.map((p) => {
                        const { namePart, timeStr } = getPostCleanLabel(p);
                        const allMedia = resolveAllMediaUrls(p.media_url);
                        const thumb = p.thumbnail_url || allMedia[0] || p.product_image;
                        const fbUrl = getFacebookPostUrl(p.fb_post_id, p.post_url, p.page_id || p.fb_page_id);

                        return (
                          <div
                            key={`modal-post-${p.id}`}
                            onClick={() => {
                              setSelectedDayDetail(null);
                              navigate(`/planner/edit/${p.id}`);
                            }}
                            className="brand-cal-related-post-card"
                          >
                            <div className="brand-cal-related-post-left">
                              {thumb ? (
                                <SafeImage
                                  src={thumb}
                                  alt="thumb"
                                  className="brand-cal-related-thumb"
                                />
                              ) : (
                                <div className="brand-cal-related-thumb-placeholder">
                                  <Tag size={16} />
                                </div>
                              )}
                              <div className="brand-cal-related-info">
                                <div className="brand-cal-related-header">
                                  <span className="brand-cal-related-title">
                                    {namePart}
                                  </span>
                                  {timeStr && (
                                    <span className="brand-cal-related-time">
                                      <Clock size={11} /> {timeStr}
                                    </span>
                                  )}
                                </div>
                                {p.message && (
                                  <p className="brand-cal-related-msg">
                                    {p.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="brand-cal-related-actions">
                              {fbUrl && fbUrl !== '#' && (
                                <a
                                  href={fbUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="brand-cal-related-fb-link"
                                  title="Open on Facebook"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDayDetail(null)}
              >
                Close
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
};

