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
  Play,
  FileText,
  Target,
  PauseCircle,
  X,
  Link2,
  Settings
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import * as missionApi from '../../missions/api/missionApi';
import { useBrands, usePages, useCalendarSlots, useMissionBrands } from '../../../shared/hooks/queries';
import { queryKeys } from '../../../shared/utils/queryKeys';
import { invalidatePostAndMissionCaches, invalidateMissionCaches } from '../../../shared/utils/cacheSync';
import { usePostTracker } from '../../postTracker/hooks/usePostTracker';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { Select, Button, Modal } from '../../../shared/components/ui';
import { resolveMediaUrl, resolveAllMediaUrls } from '../../../shared/utils/mediaUrl';
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';
import { FaFacebook } from 'react-icons/fa';
import { SetMissionModal } from '../../missions/components/SetMissionModal';
import { CategorizeMissedModal } from '../../missions/components/CategorizeMissedModal';
import { LinkExistingPostModal } from '../../missions/components/LinkExistingPostModal';
import { useToast } from '../../../shared/context/ToastContext';
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
    return { label: type === 'reel' ? 'Reel' : 'Video', icon: Play, variant: 'video' };
  }
  if (type === 'live') {
    return {
      label: isSpecial ? 'Payday Live' : 'Live Stream',
      icon: Radio,
      variant: 'live',
    };
  }
  if (type === 'story') {
    return { label: 'Story', icon: Image, variant: 'story' };
  }
  return { label: 'Poster', icon: Image, variant: 'poster' };
};

/**
 * Derive visual state and matched post metadata for a planned mission slot.
 */
const resolveSlotDisplay = (slot, dateKey, todayKey, posts) => {
  const isSpecial =
    (slot.time_window || '').includes('04:00PM') ||
    (slot.notes || '').toLowerCase().includes('payday');
  const typeInfo = getContentTypeInfo(slot.content_type, isSpecial);
  const isSlotMissed = slot.slot_status === 'missed' || slot.computed_status === 'missed';
  const linked = slot.linked_post || (!isSlotMissed && slot.slot_status !== 'waived' ? findMatchingPostForSlot(slot, posts) : null);

  const isCompensated = slot.computed_status === 'compensated' || slot.is_compensated;
  const isCompleted = !isCompensated && !isSlotMissed && (slot.computed_status === 'completed' || linked?.status === 'published');
  const isScheduled =
    !isCompleted && !isCompensated && !isSlotMissed && (slot.computed_status === 'scheduled' || linked?.status === 'scheduled');
  const isMissed =
    !isCompleted && !isCompensated && !isScheduled && (isSlotMissed || (dateKey < todayKey && !linked));

  const stateClass = isCompensated
    ? 'is-compensated'
    : isCompleted
      ? 'is-completed'
      : isScheduled
        ? 'is-scheduled'
        : isMissed
          ? 'is-missed'
          : 'is-planned';

  const statusSummary = isCompensated
    ? 'Compensated deliverable'
    : isCompleted
      ? 'Live on Facebook'
      : isScheduled
        ? 'Scheduled'
        : isMissed
          ? 'Overdue'
          : 'Planned deliverable';

  return { typeInfo, linked, isCompleted, isCompensated, isScheduled, isMissed, stateClass, statusSummary };
};

export const BrandCalendarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const brandParam = searchParams.get('brand_id') || searchParams.get('brand') || 'all';
  const monthParam = parseInt(searchParams.get('month'), 10);
  const yearParam = parseInt(searchParams.get('year'), 10);
  const pageParam = searchParams.get('page_id') || 'all';
  const statusParam = searchParams.get('status') || 'all';

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

  const [selectedPageId, setSelectedPageIdState] = useState(pageParam);

  const setSelectedPageId = (newPageId) => {
    setSelectedPageIdState(newPageId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPageId && newPageId !== 'all') {
        next.set('page_id', newPageId);
      } else {
        next.delete('page_id');
      }
      return next;
    }, { replace: true });
  };

  const [missionStatusFilter, setMissionStatusFilterState] = useState(statusParam);

  const setMissionStatusFilter = (newStatus) => {
    setMissionStatusFilterState(newStatus);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newStatus && newStatus !== 'all') {
        next.set('status', newStatus);
      } else {
        next.delete('status');
      }
      return next;
    }, { replace: true });
  };

  const [selectedContentType, setSelectedContentType] = useState('all');

  // Synchronize state when URL search params change (e.g. browser back/forward or navigation return)
  useEffect(() => {
    setSelectedBrandIdState(brandParam);
  }, [brandParam]);

  useEffect(() => {
    setSelectedPageIdState(pageParam);
  }, [pageParam]);

  useEffect(() => {
    setMissionStatusFilterState(statusParam);
  }, [statusParam]);

  useEffect(() => {
    if (!isNaN(monthParam) && monthParam >= 1 && monthParam <= 12 && !isNaN(yearParam) && yearParam >= 2000) {
      setCurrentDate((prev) => {
        if (prev.getMonth() + 1 !== monthParam || prev.getFullYear() !== yearParam) {
          return new Date(yearParam, monthParam - 1, 1);
        }
        return prev;
      });
    }
  }, [monthParam, yearParam]);

  // TanStack Query: Cached & deduplicated brands and pages lists
  const { data: brands = [] } = useBrands();
  const { data: pages = [] } = usePages();

  // Contracted client campaign brands (brands that have missions with clients)
  const { data: missionBrands = [], isLoading: missionBrandsLoading } = useMissionBrands(monthNumber, yearNumber);

  // Fast brand logo lookup map by brand_id and normalized brand_name
  const brandLogoMap = useMemo(() => {
    const map = new Map();
    (brands || []).forEach((b) => {
      const bId = String(b.brand_id || b.id || '');
      const img = b.image_url || b.logo_url || b.logo;
      if (bId && img) map.set(bId, img);
      const name = (b.brand_name || b.name || '').toLowerCase().trim();
      if (name && img) map.set(name, img);
    });
    return map;
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
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null); // Day Detail Modal state
  const [dayModalTab, setDayModalTab] = useState('targets'); // 'targets' | 'posts'
  const [categorizeSlot, setCategorizeSlot] = useState(null); // Categorize Missed Reason Modal state
  const [linkPostModalSlot, setLinkPostModalSlot] = useState(null); // Link Existing Post Modal state
  const [unlinkConfirmSlot, setUnlinkConfirmSlot] = useState(null); // Sleek In-App Unlink Confirmation Modal state
  const [isUnlinking, setIsUnlinking] = useState(false);
  // TanStack Query: Cached calendar slots (0ms instant render on back navigation)
  const { data: calendarSlots = [], isLoading: loading } = useCalendarSlots(selectedBrandId, monthNumber, yearNumber);

  // Formatted options for global UI Select components: ONLY brands that have a mission / campaign with clients
  const brandOptions = useMemo(() => {
    const list = [{ value: 'all', label: '🌟 All Brands (Master Schedule)' }];

    // Primary: Brands with campaigns / missions with client
    const availableBrandsMap = new Map();
    (missionBrands || []).forEach((b) => {
      const id = String(b.brand_id || b.id);
      availableBrandsMap.set(id, b.brand_name || b.name || `Brand #${id}`);
    });

    // Safety fallback: any brand with a slot in the current calendar view
    (calendarSlots || []).forEach((s) => {
      const id = String(s.brand_id);
      if (id && !availableBrandsMap.has(id)) {
        availableBrandsMap.set(id, s.brand_name || `Brand #${id}`);
      }
    });

    // Sort alphabetically by brand name
    const sorted = Array.from(availableBrandsMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    sorted.forEach(([id, name]) => {
      list.push({ value: id, label: name });
    });

    return list;
  }, [missionBrands, calendarSlots]);

  const selectedBrand = useMemo(() => {
    if (!selectedBrandId || selectedBrandId === 'all') return null;
    return (
      (missionBrands || []).find((b) => String(b.brand_id || b.id) === String(selectedBrandId)) ||
      brands.find((b) => String(b.brand_id || b.id) === String(selectedBrandId)) ||
      null
    );
  }, [missionBrands, brands, selectedBrandId]);

  // Auto-reset stale selectedBrandId if brand has no active campaign in this month
  useEffect(() => {
    if (selectedBrandId && selectedBrandId !== 'all' && !missionBrandsLoading && !loading) {
      if ((missionBrands && missionBrands.length > 0) || (calendarSlots && calendarSlots.length > 0)) {
        const brandExists = (missionBrands || []).some(
          (b) => String(b.brand_id || b.id) === String(selectedBrandId)
        ) || (calendarSlots || []).some(
          (s) => String(s.brand_id) === String(selectedBrandId)
        );
        if (!brandExists) {
          setSelectedBrandId('all');
        }
      }
    }
  }, [missionBrands, calendarSlots, selectedBrandId, missionBrandsLoading, loading]);

  // Load tracked posts from PostTracker
  const { posts } = usePostTracker({ range: 'all' });

  const handleRefresh = async () => {
    await invalidatePostAndMissionCaches();
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkConfirmSlot?.slot?.id || isUnlinking) return;
    const { slot, linkedPost } = unlinkConfirmSlot;
    const slotIdNum = Number(slot.id);
    setIsUnlinking(true);

    try {
      // 1. Min visual spinner feedback (~400ms) for smooth UX
      await Promise.all([
        missionApi.unlinkPostFromSlot(slot.id),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);

      // 2. Instant 0ms visual update in Day Detail modal
      setSelectedDayDetail((prev) => {
        if (!prev) return prev;
        const existingSlots = prev.slots && prev.slots.length > 0 ? prev.slots : (itemsByDate.get(prev.dateKey)?.slots || []);
        return {
          ...prev,
          slots: existingSlots.map((s) =>
            Number(s.id) === slotIdNum
              ? {
                ...s,
                linked_post_id: null,
                linked_post: null,
                is_compensated: false,
                slot_status: 'missed',
                computed_status: 'missed',
              }
              : s
          ),
        };
      });

      // 3. Instant 0ms visual update in calendar grid slots
      queryClient.setQueriesData({ queryKey: ['missions', 'slots'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((s) =>
          Number(s.id) === slotIdNum
            ? {
              ...s,
              linked_post_id: null,
              linked_post: null,
              is_compensated: false,
              slot_status: 'missed',
              computed_status: 'missed',
            }
            : s
        );
      });

      if (toast?.info) {
        toast.info(`Post #${linkedPost?.id || slot.linked_post_id} unlinked from Slot #${slot.id}`);
      }

      setUnlinkConfirmSlot(null);
      invalidatePostAndMissionCaches().catch(() => { });
    } catch (err) {
      if (toast?.error) {
        toast.error(err.message || 'Failed to unlink slot');
      }
    } finally {
      setIsUnlinking(false);
    }
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

      {/* Toolbar: Navigation, Brand & Status Filters */}
      <div className="planner-toolbar-card brand-cal-toolbar">
        {/* Navigation Group */}
        <div className="planner-nav-group brand-cal-nav-group">
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

            const filteredSlots = daySlots.filter((slot) => {
              const isSlotMissed = slot.slot_status === 'missed' || slot.computed_status === 'missed';
              const slotLinked = slot.linked_post || (!isSlotMissed ? findMatchingPostForSlot(slot, dayPosts) : null);
              const completed = !isSlotMissed && (slot.computed_status === 'completed' || slotLinked?.status === 'published');
              if (missionStatusFilter === 'completed') return completed;
              if (missionStatusFilter === 'pending') return !completed;
              return true;
            });

            return (
              <div
                key={idx}
                className={`brand-cal-day-cell ${!isCurrentMonth ? 'is-other-month' : ''} ${isToday && isCurrentMonth ? 'is-today' : ''}`}
                onClick={() => {
                  if (!isCurrentMonth) return;
                  setSelectedDayDetail({
                    dateKey: cell.dateKey,
                    dayNumber: cell.dayNumber,
                    slots: filteredSlots,
                    posts: dayPosts,
                  });
                  setDayModalTab('targets');
                }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        const returnUrl = location.pathname + location.search;
                        navigate(`/planner/create?date=${cell.dateKey}`, {
                          state: {
                            from: returnUrl,
                            returnPath: returnUrl,
                            ...(selectedBrandId !== 'all' ? { prefillBrandId: selectedBrandId } : {}),
                          },
                        });
                      }}
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
                            isCompensated,
                            isScheduled,
                            isMissed,
                            stateClass,
                            statusSummary,
                          } = resolveSlotDisplay(slot, cell.dateKey, todayKey, dayPosts);

                          const bId = String(slot.brand_id || '');
                          const bName = (slot.brand_name || '').toLowerCase().trim();
                          const brandLogo =
                            (bId ? brandLogoMap.get(bId) : null) ||
                            (bName ? brandLogoMap.get(bName) : null) ||
                            slot.brand_logo ||
                            slot.logo_url ||
                            slot.image_url ||
                            null;

                          return (
                            <div
                              key={`slot-${slot.id || sIdx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDayDetail({
                                  dateKey: cell.dateKey,
                                  dayNumber: cell.dayNumber,
                                  slots: filteredSlots,
                                  posts: dayPosts,
                                });
                                setDayModalTab('targets');
                              }}
                              className={`brand-cal-slot-card ${stateClass}`}
                              title={`View Day Schedule & Manage Actions for ${slot.brand_name} (${statusSummary})`}
                            >
                              <div className="brand-cal-slot-main">
                                {typeInfo.icon && (
                                  <typeInfo.icon
                                    size={12}
                                    className={`brand-cal-slot-type-icon is-${typeInfo.variant}`}
                                    title={`${typeInfo.label} deliverable`}
                                  />
                                )}

                                <span className="brand-cal-slot-brand" title={slot.brand_name || 'Brand'}>
                                  {slot.brand_name || 'Brand'}
                                </span>

                                {brandLogo ? (
                                  <img
                                    src={resolveMediaUrl(brandLogo)}
                                    alt={slot.brand_name || 'Brand'}
                                    className="brand-cal-slot-logo"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : null}
                              </div>

                              <div className="brand-cal-slot-status-wrap">
                                {isCompensated && (
                                  <Sparkles
                                    size={12}
                                    strokeWidth={2.2}
                                    color="#7c3aed"
                                    title={`Compensated Deliverable (Make-Up post ${slot.linked_post_id ? `#${slot.linked_post_id}` : ''})`}
                                  />
                                )}

                                {isCompleted && (
                                  <Check
                                    size={13}
                                    strokeWidth={2.8}
                                    color="#16a34a"
                                    title={`Delivered & Live on Facebook ${linked?.id ? `(#${linked.id})` : ''}`}
                                  />
                                )}

                                {isScheduled && (
                                  <Clock
                                    size={12}
                                    strokeWidth={2.2}
                                    color="#2563eb"
                                    title={`Scheduled on Facebook${slot.time_window ? ` (${slot.time_window})` : ''}`}
                                  />
                                )}

                                {isMissed && (
                                  <AlertTriangle
                                    size={12}
                                    strokeWidth={2.2}
                                    color="#dc2626"
                                    title={`Overdue / Missed deliverable${slot.missed_reason ? `: ${slot.missed_reason.replace('_', ' ')}` : ''}`}
                                  />
                                )}

                                {!isCompleted && !isCompensated && !isScheduled && !isMissed && (
                                  <Clock
                                    size={11.5}
                                    strokeWidth={2}
                                    color="#94a3b8"
                                    title={`Planned deliverable${slot.time_window ? ` (${slot.time_window})` : ''}`}
                                  />
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
                              setDayModalTab('targets');
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
        {selectedDayDetail && (() => {
          // Dynamic Single Source of Truth: derive directly from live itemsByDate and merge with local optimistic state
          const liveData = itemsByDate.get(selectedDayDetail.dateKey);
          const rawSlots = (liveData?.slots && liveData.slots.length > 0)
            ? liveData.slots
            : (selectedDayDetail.slots || []);
          const modalOverrides = selectedDayDetail.slots || [];
          const currentSlots = rawSlots.map((baseSlot) => {
            const override = modalOverrides.find((o) => Number(o.id) === Number(baseSlot.id));
            return override ? { ...baseSlot, ...override } : baseSlot;
          });
          const currentPosts = (liveData?.posts && liveData.posts.length > 0)
            ? liveData.posts
            : (selectedDayDetail.posts || []);

          const brandPosts = currentPosts.filter(
            (p) => p.brand_id || currentSlots.some((s) => s.linked_post?.id === p.id)
          );
          const totalTargets = currentSlots.length;
          const totalPosts = brandPosts.length;
          const activeTab = (dayModalTab === 'targets' && totalTargets === 0 && totalPosts > 0)
            ? 'posts'
            : (dayModalTab === 'posts' && totalPosts === 0 && totalTargets > 0)
              ? 'targets'
              : dayModalTab;

          return (
            <>
              <Modal.Header
                title={new Date(selectedDayDetail.dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                description={`${totalTargets} Planned Target${totalTargets === 1 ? '' : 's'} • ${totalPosts} Delivered Post${totalPosts === 1 ? '' : 's'}`}
                onClose={() => setSelectedDayDetail(null)}
              />

              <Modal.Body className="brand-cal-modal-body">
                {/* Segmented Navigation Tabs */}
                <div className="brand-cal-modal-tabs">
                  <button
                    type="button"
                    className={`brand-cal-modal-tab ${activeTab === 'targets' ? 'is-active' : ''}`}
                    onClick={() => setDayModalTab('targets')}
                  >
                    <Target size={14} className="brand-cal-modal-tab-icon" />
                    <span>Planned Targets</span>
                    <span className="brand-cal-modal-tab-badge">{totalTargets}</span>
                  </button>
                  <button
                    type="button"
                    className={`brand-cal-modal-tab ${activeTab === 'posts' ? 'is-active' : ''}`}
                    onClick={() => setDayModalTab('posts')}
                  >
                    <FileText size={14} className="brand-cal-modal-tab-icon" />
                    <span>Delivered Posts</span>
                    <span className="brand-cal-modal-tab-badge">{totalPosts}</span>
                  </button>
                </div>

                {/* Tab 1: Planned Schedule Targets */}
                {activeTab === 'targets' && (
                  <div>
                    {totalTargets === 0 ? (
                      <div className="brand-cal-modal-empty">
                        <p className="brand-cal-modal-empty-title">
                          No client deliverables scheduled for this day.
                        </p>
                        <p className="brand-cal-modal-empty-desc">
                          General store posts and non-brand organic content are managed on the <strong>Planner</strong> page.
                        </p>
                      </div>
                    ) : (
                      <div className="brand-cal-modal-list">
                        {currentSlots.map((slot, sIdx) => {
                          const {
                            typeInfo,
                            linked,
                            isCompleted,
                            isCompensated,
                            isScheduled,
                            isMissed,
                            stateClass,
                          } = resolveSlotDisplay(
                            slot,
                            selectedDayDetail.dateKey,
                            todayKey,
                            currentPosts
                          );

                          let thumbUrl = null;
                          let fbUrl = null;
                          if (linked) {
                            const media = resolveAllMediaUrls(linked.media_url);
                            thumbUrl = linked.thumbnail_url || media[0] || linked.product_image;
                            fbUrl = getFacebookPostUrl(linked.fb_post_id, linked.post_url, linked.page_id || linked.fb_page_id);
                          }

                          const IconComp = typeInfo.icon;
                          const isActiveState = isCompleted || isCompensated || isScheduled || isMissed;

                          return (
                            <div
                              key={`modal-slot-${slot.id || sIdx}`}
                              className={`brand-cal-modal-slot ${stateClass}`}
                            >
                              <div className="brand-cal-modal-slot-left">
                                {(isCompleted || isCompensated) && thumbUrl ? (
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
                                ) : isCompensated ? (
                                  <div className="brand-cal-modal-icon-box is-compensated">
                                    <Sparkles size={18} strokeWidth={2.5} />
                                  </div>
                                ) : isCompleted ? (
                                  <div className="brand-cal-modal-icon-box is-completed">
                                    <Check size={18} strokeWidth={3} />
                                  </div>
                                ) : isScheduled ? (
                                  <div className="brand-cal-modal-icon-box is-scheduled">
                                    <Clock size={18} />
                                  </div>
                                ) : isMissed ? (
                                  <div className="brand-cal-modal-icon-box is-missed">
                                    <AlertTriangle size={18} />
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

                                    {isCompensated && (
                                      <span className="brand-cal-modal-bare-status is-compensated" title="Compensated deliverable">
                                        <Sparkles size={12} strokeWidth={2.5} />
                                      </span>
                                    )}

                                    {isCompleted && (
                                      <span className="brand-cal-modal-bare-status is-live" title="Live on Facebook">
                                        <Check size={12} strokeWidth={3} />
                                      </span>
                                    )}

                                    {isScheduled && (
                                      <span className="brand-cal-modal-bare-status is-scheduled" title="Scheduled">
                                        <Clock size={12} strokeWidth={2.5} />
                                      </span>
                                    )}

                                    {isMissed && (
                                      <>
                                        <span className="brand-cal-modal-bare-status is-missed" title="Missed deliverable">
                                          <AlertTriangle size={12} strokeWidth={2.5} />
                                        </span>
                                        {slot.missed_reason && (
                                          <span
                                            className="brand-cal-modal-badge has-reason"
                                            title={slot.resolution_notes ? `Notes: ${slot.resolution_notes}` : 'Reason classified'}
                                          >
                                            Reason: {slot.missed_reason.replace('_', ' ')}
                                          </span>
                                        )}
                                      </>
                                    )}

                                    {slot.slot_status === 'waived' && (
                                      <span className="brand-cal-modal-bare-status is-waived" title="Waived">
                                        <PauseCircle size={12} strokeWidth={2.5} />
                                      </span>
                                    )}
                                  </div>

                                  <div className="brand-cal-modal-slot-subtitle">
                                    <IconComp size={13} className={`brand-cal-slot-type-icon is-${typeInfo.variant}`} />
                                    <span>{typeInfo.label}</span>
                                    {slot.time_window && (
                                      <span className="brand-cal-modal-slot-time">({slot.time_window})</span>
                                    )}
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
                                    className="brand-cal-modal-btn-fb"
                                    title="Open post on Facebook"
                                  >
                                    <FaFacebook size={13} />
                                    <span>FB</span>
                                  </a>
                                )}

                                {isMissed && !linked?.id && (
                                  <>
                                    <button
                                      type="button"
                                      className={`brand-cal-modal-btn-secondary ${slot.missed_reason ? 'has-reason' : ''}`}
                                      title="Categorize Root Cause / SLA reason"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCategorizeSlot({
                                          ...slot,
                                          brand_name: slot.brand_name || selectedBrand?.brand_name,
                                        });
                                      }}
                                    >
                                      <Settings size={12} />
                                      <span>{slot.missed_reason ? slot.missed_reason.replace('_', ' ') : 'Reason'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="brand-cal-modal-btn-secondary"
                                      title="Link an already tracked post from this brand"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLinkPostModalSlot({
                                          ...slot,
                                          brand_id: slot.brand_id || selectedBrand?.brand_id || selectedBrand?.id,
                                          brand_name: slot.brand_name || selectedBrand?.brand_name,
                                        });
                                      }}
                                    >
                                      <Link2 size={12} />
                                      <span>Link Post</span>
                                    </button>
                                  </>
                                )}

                                {linked?.id && (
                                  <button
                                    type="button"
                                    className="brand-cal-modal-btn-unlink"
                                    title="Unlink post from slot"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUnlinkConfirmSlot({ slot, linkedPost: linked });
                                    }}
                                  >
                                    <X size={12} />
                                    <span>Unlink</span>
                                  </button>
                                )}

                                {linked?.id ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDayDetail(null);
                                      const returnUrl = location.pathname + location.search;
                                      navigate(`/planner/edit/${linked.id}`, {
                                        state: {
                                          from: returnUrl,
                                          returnPath: returnUrl,
                                        },
                                      });
                                    }}
                                    className="brand-cal-modal-btn-view is-completed"
                                    title={`View Post #${linked.id}`}
                                  >
                                    <ExternalLink size={12} />
                                    <span>#{linked.id}</span>
                                  </button>
                                ) : isMissed ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDayDetail(null);
                                      const isPast = slot.computed_status === 'missed' || selectedDayDetail.dateKey < todayKey;
                                      const returnUrl = location.pathname + location.search;
                                      navigate(`/planner/create?date=${isPast ? todayKey : selectedDayDetail.dateKey}`, {
                                        state: {
                                          returnPath: returnUrl,
                                          from: returnUrl,
                                          prefillBrandId: slot.brand_id,
                                          prefillDate: isPast ? todayKey : selectedDayDetail.dateKey,
                                          prefillType: slot.content_type,
                                          defaultBrandId: slot.brand_id,
                                          defaultContentType: slot.content_type,
                                          defaultTime: slot.time_window,
                                          plannedSlotId: slot.id,
                                          compensationSlotId: isPast ? slot.id : null,
                                          compensationSlotDate: isPast ? selectedDayDetail.dateKey : null,
                                          compensationSlotContentType: isPast ? slot.content_type : null,
                                          compensationBrandName: isPast ? slot.brand_name : null,
                                          compensationNotes: isPast ? (slot.notes || '') : null,
                                        }
                                      });
                                    }}
                                    className="brand-cal-modal-btn-primary"
                                    title="Create make-up post to compensate"
                                  >
                                    <Plus size={13} strokeWidth={2.5} />
                                    <span>Make-Up</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDayDetail(null);
                                      const returnUrl = location.pathname + location.search;
                                      navigate(`/planner/create?date=${selectedDayDetail.dateKey}`, {
                                        state: {
                                          returnPath: returnUrl,
                                          from: returnUrl,
                                          prefillBrandId: slot.brand_id,
                                          prefillDate: selectedDayDetail.dateKey,
                                          prefillType: slot.content_type,
                                          defaultBrandId: slot.brand_id,
                                          defaultContentType: slot.content_type,
                                          defaultTime: slot.time_window,
                                          plannedSlotId: slot.id,
                                        }
                                      });
                                    }}
                                    className="brand-cal-modal-btn-primary"
                                    title="Create post for this deliverable"
                                  >
                                    <Plus size={13} strokeWidth={2.5} />
                                    <span>Create Post</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Delivered Brand Posts */}
                {activeTab === 'posts' && (
                  <div>
                    {totalPosts === 0 ? (
                      <div className="brand-cal-modal-empty">
                        <p className="brand-cal-modal-empty-title">
                          No published brand posts found for this day.
                        </p>
                        <p className="brand-cal-modal-empty-desc">
                          Posts published on this date will appear here automatically.
                        </p>
                      </div>
                    ) : (
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
                                const returnUrl = location.pathname + location.search;
                                navigate(`/planner/edit/${p.id}`, {
                                  state: {
                                    from: returnUrl,
                                    returnPath: returnUrl,
                                  },
                                });
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
                                    className="brand-cal-modal-btn-fb"
                                    title="Open on Facebook"
                                  >
                                    <FaFacebook size={13} />
                                    <span>FB</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  className="brand-cal-modal-btn-view"
                                  title={`Edit Post #${p.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDayDetail(null);
                                    const returnUrl = location.pathname + location.search;
                                    navigate(`/planner/edit/${p.id}`, {
                                      state: {
                                        from: returnUrl,
                                        returnPath: returnUrl,
                                      },
                                    });
                                  }}
                                >
                                  <ExternalLink size={12} />
                                  <span>#{p.id}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
          );
        })()}
      </Modal>

      {/* Root Cause & Missed Reason Modal */}
      <CategorizeMissedModal
        isOpen={Boolean(categorizeSlot)}
        onClose={() => setCategorizeSlot(null)}
        slot={categorizeSlot}
        onSaved={(updated) => {
          setCategorizeSlot(null);
          const targetSlot = updated?.slot || updated;
          const targetId = Number(targetSlot?.id);

          // 1. Instant 0ms visual update in Day Detail modal
          setSelectedDayDetail((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              slots: (prev.slots || []).map((s) => (Number(s.id) === targetId ? { ...s, ...targetSlot } : s)),
            };
          });

          // 2. Instant 0ms visual update to calendar grid slots
          queryClient.setQueriesData({ queryKey: ['missions', 'slots'] }, (old) => {
            if (!Array.isArray(old)) return old;
            return old.map((s) => (Number(s.id) === targetId ? { ...s, ...targetSlot } : s));
          });

          // 3. Background cache sync (non-blocking)
          invalidatePostAndMissionCaches().catch(() => { });
        }}
      />

      {/* Link Existing Tracked Post Modal */}
      <LinkExistingPostModal
        isOpen={Boolean(linkPostModalSlot)}
        onClose={() => setLinkPostModalSlot(null)}
        slot={linkPostModalSlot}
        calendarSlots={calendarSlots}
        onLinked={(updated) => {
          setLinkPostModalSlot(null);
          const targetSlot = updated?.slot || updated;
          const targetId = Number(targetSlot?.id);

          // 1. Instant 0ms visual update in Day Detail modal
          setSelectedDayDetail((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              slots: (prev.slots || []).map((s) => (Number(s.id) === targetId ? { ...s, ...targetSlot } : s)),
            };
          });

          // 2. Instant 0ms visual update to calendar grid slots
          queryClient.setQueriesData({ queryKey: ['missions', 'slots'] }, (old) => {
            if (!Array.isArray(old)) return old;
            return old.map((s) => (Number(s.id) === targetId ? { ...s, ...targetSlot } : s));
          });

          // 3. Background cache sync (non-blocking)
          invalidatePostAndMissionCaches().catch(() => { });
        }}
      />

      {/* Sleek In-App Unlink Confirmation Modal (Zero Native Alerts) */}
      <Modal
        isOpen={Boolean(unlinkConfirmSlot)}
        onClose={() => !isUnlinking && setUnlinkConfirmSlot(null)}
        size="sm"
      >
        <Modal.Header
          title="Unlink Compensated Post"
          description="Revert deliverable back to missed status."
          onClose={() => !isUnlinking && setUnlinkConfirmSlot(null)}
        />
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
            <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to unlink <strong>Post #{unlinkConfirmSlot?.linkedPost?.id || unlinkConfirmSlot?.slot?.linked_post_id}</strong> from{' '}
              <strong>{unlinkConfirmSlot?.slot?.brand_name || 'Brand'}</strong> Slot #{unlinkConfirmSlot?.slot?.id}?
            </p>
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#991b1b',
                fontSize: '12px',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, color: '#dc2626' }} />
              <span>This deliverable will return to <strong>Missed</strong> status and will require make-up compensation.</span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            disabled={isUnlinking}
            onClick={() => setUnlinkConfirmSlot(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isUnlinking}
            disabled={isUnlinking}
            onClick={handleConfirmUnlink}
          >
            {isUnlinking ? 'Unlinking Post...' : 'Unlink Post'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

