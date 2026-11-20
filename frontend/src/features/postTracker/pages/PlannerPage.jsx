import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../../shared/context/ToastContext';
import { queryKeys } from '../../../shared/utils/queryKeys';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Layers,
  ExternalLink,
  Play,
  Tag,
  LayoutGrid,
  Image,
  Video,
  Radio,
  FileText,
  Target,
  Sparkles,
  AlertTriangle,
  PauseCircle,
  Link2
} from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import { usePostTracker } from '../hooks/usePostTracker';
import * as api from '../api/postTrackerApi';
import * as missionApi from '../../missions/api/missionApi';
import { CategorizeMissedModal } from '../../missions/components/CategorizeMissedModal';
import { LinkExistingPostModal } from '../../missions/components/LinkExistingPostModal';
import { useBrands, usePages } from '../../../shared/hooks/queries';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { Select, Input, Button } from '../../../shared/components/ui';
import { resolveAllMediaUrls, isVideoMedia } from '../../../shared/utils/mediaUrl';
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';
import { useUrlFilters } from '../../../shared/hooks/useUrlFilters';
import '../planner.css';

// Helper to get local date key "YYYY-MM-DD"
const getDateKey = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse local "YYYY-MM-DD" date string
const parseLocalDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
};

// Helper to get post time formatted "12:01 AM"
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Helper to calculate Monday of current week
const getWeekMonday = (baseDate) => {
  const d = new Date(baseDate);
  const day = d.getDay();
  // Adjust when day is Sunday (0) to treat Monday as start of week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper to determine a post's content type
const getPostContentType = (post) => {
  if (!post) return 'photo';
  const m = (post.media_type || post.format || '').toLowerCase();
  if (m === 'live' || m.includes('live')) return 'live';
  if (m === 'video' || m === 'reel') return 'video';
  if (m === 'photo') return 'photo';
  if (m === 'status' || m === 'text') return 'status';

  // Fallback heuristics
  if (post.thumbnail_url && isVideoMedia(post.thumbnail_url)) return 'video';
  if (post.media_url && isVideoMedia(post.media_url)) return 'video';
  if (post.media_url || post.product_image) return 'photo';
  return 'status';
};

// Helper to get styling for planned mission slot badges (matches BrandCalendarPage)
const getSlotBadgeStyle = (contentType, isSpecial = false) => {
  const type = (contentType || '').toLowerCase();
  if (type === 'photo' || type === 'poster') {
    return {
      bg: '#f0fdf4',
      borderColor: '#bbf7d0',
      barColor: '#16a34a',
      textColor: '#0f172a',
      label: 'Poster',
    };
  }
  if (type === 'live') {
    return {
      bg: isSpecial ? '#fefce8' : '#eff6ff',
      borderColor: isSpecial ? '#fef08a' : '#bfdbfe',
      barColor: isSpecial ? '#ca8a04' : '#2563eb',
      textColor: '#0f172a',
      label: isSpecial ? 'Payday Live' : 'Live Stream',
    };
  }
  if (type === 'video' || type === 'reel') {
    return {
      bg: '#fdf4ff',
      borderColor: '#f5d0fe',
      barColor: '#c026d3',
      textColor: '#0f172a',
      label: 'Short Video',
    };
  }
  return {
    bg: '#f8fafc',
    borderColor: '#e2e8f0',
    barColor: '#64748b',
    textColor: '#0f172a',
    label: 'Status Post',
  };
};

// Helper to determine if a planned blueprint slot has already been posted/completed
const isSlotPostedReady = (slot, dayPosts = []) => {
  // If backend marked it completed or linked to a post
  if (slot.computed_status === 'completed' || slot.linked_post?.id) {
    return true;
  }
  // Check if an actual post in dayPosts belongs to this brand and matches content type
  const matching = dayPosts.some((p) => {
    const postBrandId = p.brand_id ? String(p.brand_id) : '';
    const slotBrandId = slot.brand_id ? String(slot.brand_id) : '';
    if (slotBrandId && postBrandId && postBrandId !== slotBrandId) {
      return false;
    }
    const postType = getPostContentType(p);
    const slotType = (slot.content_type || '').toLowerCase();
    if (slotType === 'photo' || slotType === 'poster') {
      // Photo slot can be fulfilled by photo OR video
      return postType === 'photo' || postType === 'poster' || postType === 'video' || postType === 'reel';
    }
    if (slotType === 'video' || slotType === 'reel') {
      // Video slot must be video
      return postType === 'video' || postType === 'reel';
    }
    if (slotType === 'live') {
      // Live slot must be live
      return postType === 'live';
    }
    return true;
  });
  return matching;
};

export const PlannerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Load all tracked posts
  const { posts, loading, reload, triggerSync } = usePostTracker({ range: 'all' });

  // URL-synced filters
  const { filters, setFilter } = useUrlFilters({
    view: 'week',
    page_id: '',
    brand_id: '',
    type: 'all',
    search: '',
    date: '',
  }, {
    debouncedKeys: ['search'],
    debounceDelay: 300,
    pageKey: null,
  });

  const viewMode = filters.view || 'week';
  const selectedPageFilter = filters.page_id || '';
  const brandFilter = filters.brand_id || '';
  const contentTypeFilter = filters.type || 'all';
  const searchQuery = filters.search || '';

  const setViewMode = (mode) => setFilter('view', mode);
  const setBrandFilter = (bId) => setFilter('brand_id', bId);
  const setContentTypeFilter = (type) => setFilter('type', type);
  const setSearchQuery = (q) => setFilter('search', q);

  // TanStack Query: Cached & deduplicated brands and pages lists
  const { data: brands = [] } = useBrands();
  const { data: pages = [] } = usePages();

  // Navigation states (synchronized with URL 'date' param)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const parsed = parseLocalDate(filters.date);
    return getWeekMonday(parsed || new Date());
  });
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const parsed = parseLocalDate(filters.date);
    const d = parsed || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Synchronize calendar dates when date param changes in URL (e.g. browser navigation or returning from create)
  useEffect(() => {
    const parsed = parseLocalDate(filters.date);
    if (parsed) {
      const mon = getWeekMonday(parsed);
      setCurrentWeekStart((prev) => (getDateKey(prev) !== getDateKey(mon) ? mon : prev));
      const firstOfMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      setCurrentMonthDate((prev) => (getDateKey(prev) !== getDateKey(firstOfMonth) ? firstOfMonth : prev));
    } else {
      const today = new Date();
      const mon = getWeekMonday(today);
      setCurrentWeekStart((prev) => (getDateKey(prev) !== getDateKey(mon) ? mon : prev));
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setCurrentMonthDate((prev) => (getDateKey(prev) !== getDateKey(firstOfMonth) ? firstOfMonth : prev));
    }
  }, [filters.date]);

  const selectedPageId = useMemo(() => {
    if (selectedPageFilter) return selectedPageFilter;
    if (pages.length > 0) return pages[0].id;
    return 'loading';
  }, [selectedPageFilter, pages]);

  const userSelectedPageRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'page' | 'contentType' | null
  const [categorizeSlot, setCategorizeSlot] = useState(null); // Missed Reason Categorization Modal
  const [linkPostModalSlot, setLinkPostModalSlot] = useState(null); // Link Existing Post Modal
  const controlsRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const CONTENT_TYPE_OPTIONS = useMemo(() => [
    { value: 'all', label: 'All Content Types', icon: LayoutGrid, color: '#64748b' },
    { value: 'photo', label: 'Photo', icon: Image, color: '#0284c7' },
    { value: 'video', label: 'Video', icon: Video, color: '#7c3aed' },
    { value: 'live', label: 'Live Video', icon: Radio, color: '#dc2626' },
    { value: 'status', label: 'Text / Status', icon: FileText, color: '#64748b' },
  ], []);

  const pageOptions = useMemo(() => {
    const list = pages.map((p) => ({
      value: String(p.id),
      label: p.page_name,
      icon: <FaFacebook size={13} color="#1877F2" />,
    }));
    return [
      {
        value: 'all',
        label: pages.length > 0 ? `All Pages (${pages.length})` : 'All Pages',
        icon: <Layers size={13} color="#64748b" />,
      },
      ...list,
    ];
  }, [pages]);

  const brandOptions = useMemo(() => {
    const list = brands.map((b) => {
      const bId = String(b.brand_id || b.id);
      const bName = b.brand_name || b.name || `Brand #${bId}`;
      return {
        value: bId,
        label: bName,
        icon: <Tag size={13} color="#2563eb" />,
      };
    });
    return [
      {
        value: 'all',
        label: 'All Brands',
        icon: <Tag size={13} color="#64748b" />,
      },
      ...list,
    ];
  }, [brands]);

  const contentTypeOptions = useMemo(() => {
    return CONTENT_TYPE_OPTIONS.map((opt) => {
      const IconComp = opt.icon;
      return {
        value: opt.value,
        label: opt.label,
        icon: <IconComp size={13} color={opt.color} />,
      };
    });
  }, [CONTENT_TYPE_OPTIONS]);

  const selectedPage = useMemo(
    () => pages.find((p) => String(p.id) === String(selectedPageId)),
    [pages, selectedPageId]
  );
  const pageLabel = useMemo(() => {
    if (selectedPage) return selectedPage.page_name;
    if (selectedPageId === 'loading' || pages.length === 0) return 'Loading Page...';
    if (selectedPageId === 'all') {
      return pages.length > 0 ? `All Pages (${pages.length})` : 'All Pages';
    }
    return 'All Pages';
  }, [selectedPage, selectedPageId, pages.length]);

  const currentContentType = useMemo(
    () => CONTENT_TYPE_OPTIONS.find((t) => t.value === contentTypeFilter) || CONTENT_TYPE_OPTIONS[0],
    [CONTENT_TYPE_OPTIONS, contentTypeFilter]
  );

  // Format today's date key for highlighting
  const todayKey = useMemo(() => getDateKey(new Date()), []);

  // Compute 7 days for the active week
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      days.push({
        date: d,
        dayName: DAY_NAMES[i],
        dayNumber: d.getDate(),
        dateKey: getDateKey(d),
        isToday: getDateKey(d) === todayKey,
      });
    }
    return days;
  }, [currentWeekStart, todayKey]);

  // Compute full month calendar grid cells (42 cells: 6 weeks x 7 days)
  const monthDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday as day 0
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Previous month padding days
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({
        date: d,
        dayNumber: d.getDate(),
        dateKey: getDateKey(d),
        isCurrentMonth: false,
        isToday: getDateKey(d) === todayKey,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({
        date: d,
        dayNumber: day,
        dateKey: getDateKey(d),
        isCurrentMonth: true,
        isToday: getDateKey(d) === todayKey,
      });
    }

    // Next month padding days to fill 35 or 42 cells
    const targetLength = cells.length > 35 ? 42 : 35;
    let nextDay = 1;
    while (cells.length < targetLength) {
      const d = new Date(year, month + 1, nextDay++);
      cells.push({
        date: d,
        dayNumber: d.getDate(),
        dateKey: getDateKey(d),
        isCurrentMonth: false,
        isToday: getDateKey(d) === todayKey,
      });
    }

    return cells;
  }, [currentMonthDate, todayKey]);

  // Filter posts based on search, page, and status
  const filteredPosts = useMemo(() => {
    if (!posts || !Array.isArray(posts)) return [];

    return posts.filter((post) => {
      // Page filter: if page 1 is still resolving, do not leak/flash posts from other pages
      if (selectedPageId === 'loading') {
        return false;
      }
      if (selectedPageId !== 'all') {
        const matchesPage =
          String(post.page_id) === String(selectedPageId) ||
          String(post.fb_page_id) === String(selectedPageId);
        if (!matchesPage) return false;
      }

      // Content Type filter
      if (contentTypeFilter !== 'all') {
        const type = getPostContentType(post);
        if (type !== contentTypeFilter) return false;
      }

      // Brand filter
      if (brandFilter && brandFilter !== 'all') {
        const postBrandId = post.brand_id ? String(post.brand_id) : '';
        if (postBrandId !== String(brandFilter)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const msgMatch = (post.message || '').toLowerCase().includes(query);
        const prodMatch = (post.product_name || '').toLowerCase().includes(query);
        const brandMatch = (post.brand_name || '').toLowerCase().includes(query);
        const pageMatch = (post.page_name || '').toLowerCase().includes(query);
        if (!msgMatch && !prodMatch && !brandMatch && !pageMatch) return false;
      }

      return true;
    });
  }, [posts, selectedPageId, contentTypeFilter, brandFilter, searchQuery]);

  // Group filtered posts by local dateKey "YYYY-MM-DD"
  const postsByDate = useMemo(() => {
    const map = new Map();
    filteredPosts.forEach((post) => {
      const rawDate = post.published_time || post.scheduled_time || post.created_at;
      const key = getDateKey(rawDate);
      if (key) {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(post);
      }
    });

    // Sort posts chronologically within each day
    map.forEach((list) => {
      list.sort((a, b) => {
        const timeA = new Date(a.published_time || a.scheduled_time || a.created_at).getTime();
        const timeB = new Date(b.published_time || b.scheduled_time || b.created_at).getTime();
        return timeA - timeB;
      });
    });

    return map;
  }, [filteredPosts]);

  // Visible Month/Year combinations for fetching planned deliverable slots
  const visibleMonthYears = useMemo(() => {
    if (viewMode === 'week') {
      const start = weekDays[0]?.date || currentWeekStart;
      const end = weekDays[6]?.date || new Date(currentWeekStart.getTime() + 6 * 86400000);
      const m1 = { month: start.getMonth() + 1, year: start.getFullYear() };
      const m2 = { month: end.getMonth() + 1, year: end.getFullYear() };
      if (m1.month === m2.month && m1.year === m2.year) return [m1];
      return [m1, m2];
    } else {
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth() + 1;
      return [{ month, year }];
    }
  }, [viewMode, weekDays, currentWeekStart, currentMonthDate]);

  // Fetch planned slots from backend mission module with TanStack Query caching
  const { data: calendarSlots = [], refetch: refetchPlannedSlots } = useQuery({
    queryKey: ['missions', 'planner-slots', { brandFilter: brandFilter || 'all', visibleMonthYears }],
    queryFn: async () => {
      const promises = visibleMonthYears.map(({ month, year }) =>
        missionApi.getCalendarSlots(brandFilter || 'all', month, year).catch(() => [])
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Group planned slots by local dateKey "YYYY-MM-DD"
  const slotsByDate = useMemo(() => {
    const map = new Map();
    (calendarSlots || []).forEach((slot) => {
      // Content Type filter
      if (contentTypeFilter !== 'all') {
        const slotType = (slot.content_type || '').toLowerCase();
        if (contentTypeFilter === 'photo' && slotType !== 'photo' && slotType !== 'poster') return;
        if (contentTypeFilter === 'video' && slotType !== 'video' && slotType !== 'reel') return;
        if (contentTypeFilter === 'live' && slotType !== 'live') return;
        if (contentTypeFilter === 'status' && slotType !== 'status' && slotType !== 'text') return;
      }

      // Brand filter
      if (brandFilter && brandFilter !== 'all') {
        if (String(slot.brand_id) !== String(brandFilter)) return;
      }

      // Page filter (if slot is linked to a post and page filter is active)
      if (selectedPageId && selectedPageId !== 'all' && selectedPageId !== 'loading') {
        if (slot.linked_post) {
          const slotPageId = String(slot.linked_post.page_id || slot.linked_post.fb_page_id || '');
          if (slotPageId !== String(selectedPageId)) return;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const brandMatch = (slot.brand_name || '').toLowerCase().includes(q);
        const noteMatch = (slot.notes || '').toLowerCase().includes(q);
        const typeMatch = (slot.content_type || '').toLowerCase().includes(q);
        if (!brandMatch && !noteMatch && !typeMatch) return;
      }

      const key = slot.planned_date_str;
      if (key) {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(slot);
      }
    });

    return map;
  }, [calendarSlots, contentTypeFilter, brandFilter, selectedPageId, searchQuery]);

  // Click handler for a planned target slot chip
  const handleSlotClick = (slot, dateKey) => {
    const returnUrl = location.pathname + location.search;
    if (slot.linked_post?.id) {
      navigate(`/planner/edit/${slot.linked_post.id}`, {
        state: { from: returnUrl, returnPath: returnUrl },
      });
    } else {
      const isMissed = slot.computed_status === 'missed' || dateKey < todayKey;
      navigate(`/planner/create?date=${isMissed ? todayKey : dateKey}`, {
        state: {
          from: returnUrl,
          returnPath: returnUrl,
          prefillBrandId: slot.brand_id,
          prefillDate: isMissed ? todayKey : dateKey,
          prefillType: slot.content_type,
          prefillNotes: slot.notes || '',
          compensationSlotId: isMissed ? slot.id : null,
          compensationSlotDate: isMissed ? dateKey : null,
          compensationSlotContentType: isMissed ? slot.content_type : null,
          compensationBrandName: isMissed ? slot.brand_name : null,
          compensationNotes: isMissed ? (slot.notes || '') : null,
        },
      });
    }
  };

  const navigateToCreate = (dateKey = '') => {
    const url = dateKey ? `/planner/create?date=${dateKey}` : '/planner/create';
    const returnUrl = location.pathname + location.search;
    navigate(url, {
      state: {
        from: returnUrl,
        returnPath: returnUrl,
        ...(brandFilter && brandFilter !== 'all' ? { prefillBrandId: brandFilter } : {}),
      },
    });
  };

  // Date Navigation Handlers
  const handlePrev = () => {
    if (viewMode === 'week') {
      const prev = new Date(currentWeekStart);
      prev.setDate(prev.getDate() - 7);
      setCurrentWeekStart(prev);
      setFilter('date', getDateKey(prev));
    } else {
      const prev = new Date(currentMonthDate);
      prev.setMonth(prev.getMonth() - 1);
      setCurrentMonthDate(prev);
      setFilter('date', getDateKey(prev));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const next = new Date(currentWeekStart);
      next.setDate(next.getDate() + 7);
      setCurrentWeekStart(next);
      setFilter('date', getDateKey(next));
    } else {
      const next = new Date(currentMonthDate);
      next.setMonth(next.getMonth() + 1);
      setCurrentMonthDate(next);
      setFilter('date', getDateKey(next));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentWeekStart(getWeekMonday(today));
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentMonthDate(firstOfCurrentMonth);
    setFilter('date', '');
  };

  // Sync with Facebook & refresh planned deliverable slots
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      await refetchPlannedSlots();
      toast.success('Synced latest Facebook data successfully!');
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Failed to sync data with Facebook.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Current period display text
  const periodDisplayText = useMemo(() => {
    if (viewMode === 'week') {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      const monthName = first.toLocaleDateString('en-US', { month: 'long' });
      const year = first.getFullYear();
      const firstStr = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastStr = last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return {
        title: `${monthName} ${year}`,
        range: `${firstStr} – ${lastStr}`,
      };
    } else {
      const title = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { title, range: '' };
    }
  }, [viewMode, weekDays, currentMonthDate]);

  const selectedBrand = useMemo(() => {
    return brands.find((b) => String(b.brand_id || b.id) === String(brandFilter)) || null;
  }, [brands, brandFilter]);

  const brandLabel = useMemo(() => {
    if (selectedBrand) return selectedBrand.brand_name || selectedBrand.name;
    if (brandFilter && brandFilter !== 'all') return `Brand #${brandFilter}`;
    return 'All Brands';
  }, [selectedBrand, brandFilter]);

  return (
    <div className="page-container planner-container">
      {/* Header Row */}
      <div className="planner-header-row">
        <div className="planner-header-title-wrap">
          <h1>
            <CalendarIcon size={28} color="#1877f2" /> Content Planner
          </h1>
          <p>Schedule, organize, and monitor daily content performance across all Facebook pages.</p>
        </div>

        <div className="planner-header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            loading={isSyncing}
            icon={<RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />}
            title="Sync latest post metrics with Facebook"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => navigateToCreate()}
          >
            Schedule Post
          </Button>
        </div>
      </div>

      {/* Toolbar: Navigation, View Toggle & Filters */}
      <div className="planner-toolbar-card">
        {/* Navigation Group */}
        <div className="planner-nav-group">
          <div className="planner-nav-btns">
            <button className="planner-nav-btn" onClick={handlePrev} title="Previous">
              <ChevronLeft size={18} />
            </button>
            <button className="planner-today-btn" onClick={handleToday}>
              Today
            </button>
            <button className="planner-nav-btn" onClick={handleNext} title="Next">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="planner-current-period">
            <span>{periodDisplayText.title}</span>
            {periodDisplayText.range && (
              <span className="planner-current-range">({periodDisplayText.range})</span>
            )}
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="planner-toolbar-controls" ref={controlsRef}>
          {/* Week / Month Switcher */}
          <div className="planner-view-toggle">
            <button
              className={`planner-view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`planner-view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>

          {/* Search Box */}
          <div style={{ width: '220px' }}>
            <Input
              type="search"
              placeholder="Search post content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              isClearable
              onClear={() => setSearchQuery('')}
            />
          </div>

          {/* Facebook Page Filter */}
          <div style={{ minWidth: '170px' }}>
            <Select
              value={selectedPageId}
              options={pageOptions}
              onChange={(val) => {
                const cleanVal = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                userSelectedPageRef.current = true;
                setFilter('page_id', cleanVal);
              }}
              placeholder="All Pages"
            />
          </div>

          {/* Brand Filter */}
          <div style={{ minWidth: '160px' }}>
            <Select
              value={brandFilter || 'all'}
              options={brandOptions}
              onChange={(val) => {
                const cleanVal = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                setBrandFilter(cleanVal === 'all' ? '' : cleanVal);
              }}
              placeholder="All Brands"
              isSearchable
            />
          </div>

          {/* Content Type Filter */}
          <div style={{ minWidth: '160px' }}>
            <Select
              value={contentTypeFilter}
              options={contentTypeOptions}
              onChange={(val) => {
                const cleanVal = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                setContentTypeFilter(cleanVal);
              }}
              placeholder="All Content Types"
            />
          </div>
        </div>
      </div>

      {/* ====================================================================
          WEEK VIEW: 7 Unified Columns with Pinned Sticky Headers (Full Page Scroll)
         ==================================================================== */}
      {viewMode === 'week' && (
        <div className="planner-week-wrapper">
          {/* Unified Scrollable Container: Contains both sticky header row and body grid */}
          <div className="planner-week-body-scroll">
            {/* 1. Day Headers Row (Sticky at top, perfectly aligned down to 0.0px) */}
            <div className="planner-week-header-row">
              {weekDays.map((day) => {
                const dayPosts = postsByDate.get(day.dateKey) || [];
                const daySlots = slotsByDate.get(day.dateKey) || [];
                // Separating compensated deliverables from pending/missed deliverables
                const compensatedSlots = daySlots.filter((slot) => slot.is_compensated || slot.computed_status === 'compensated');
                const pendingSlots = daySlots.filter((slot) => !isSlotPostedReady(slot, dayPosts) && !slot.is_compensated && slot.computed_status !== 'compensated');

                return (
                  <div
                    key={`head-${day.dateKey}`}
                    className={`planner-day-col-header ${day.isToday ? 'is-today' : ''}`}
                  >
                    <div className="planner-day-header-top">
                      <div className={`planner-day-label ${day.isToday ? 'is-today' : ''}`}>
                        <span className="day-name">{day.dayName}</span>
                        {day.isToday ? (
                          <span className="day-number-circle">{day.dayNumber}</span>
                        ) : (
                          <span className="day-number">{day.dayNumber}</span>
                        )}
                      </div>

                      {/* Quick Add Button */}
                      <button
                        className="planner-day-add-btn"
                        title={`Schedule post for ${day.dayName} ${day.dayNumber}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToCreate(day.dateKey);
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Daily Indicators: Sleek Modern Non-Card Typography Row */}
                    {(loading && posts.length === 0) || selectedPageId === 'loading' ? (
                      <span className="planner-day-count-zero">...</span>
                    ) : (
                      <div className="planner-day-metrics-row">
                        <span className={dayPosts.length > 0 ? 'planner-metric-posts' : 'planner-metric-zero'}>
                          {dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}
                        </span>

                        {pendingSlots.length > 0 && (() => {
                          const isMissed = day.dateKey < todayKey;
                          return (
                            <span
                              className={`planner-metric-item ${isMissed ? 'is-missed' : 'is-planned'}`}
                              title={
                                isMissed
                                  ? `${pendingSlots.length} overdue / missed deliverable${pendingSlots.length > 1 ? 's' : ''}`
                                  : `${pendingSlots.length} deliverable${pendingSlots.length > 1 ? 's' : ''} waiting to be posted`
                              }
                            >
                              <span className="planner-metric-separator">·</span>
                              <span className={`planner-metric-dot ${isMissed ? 'red' : 'blue'}`} />
                              <span>{pendingSlots.length} {isMissed ? 'missed' : `plan${pendingSlots.length > 1 ? 's' : ''}`}</span>
                            </span>
                          );
                        })()}

                        {compensatedSlots.length > 0 && (
                          <span
                            className="planner-metric-item is-compensated"
                            title={`${compensatedSlots.length} deliverable${compensatedSlots.length > 1 ? 's' : ''} missed on this day but compensated`}
                          >
                            <span className="planner-metric-separator">·</span>
                            <span className="planner-metric-dot purple" />
                            <span>{compensatedSlots.length} make-up</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. Columns Body Grid */}
            <div className="planner-week-body-grid">
              {weekDays.map((day) => {
                const dayPosts = postsByDate.get(day.dateKey) || [];
                const daySlots = slotsByDate.get(day.dateKey) || [];
                // Separating compensated deliverables from pending/missed deliverables
                const compensatedSlots = daySlots.filter((slot) => slot.is_compensated || slot.computed_status === 'compensated');
                const pendingSlots = daySlots.filter((slot) => !isSlotPostedReady(slot, dayPosts) && !slot.is_compensated && slot.computed_status !== 'compensated');
                const hasContent = dayPosts.length > 0 || pendingSlots.length > 0 || compensatedSlots.length > 0;

                return (
                  <div
                    key={`body-${day.dateKey}`}
                    className={`planner-day-col-body ${day.isToday ? 'is-today' : ''}`}
                  >
                    {(loading && posts.length === 0) || selectedPageId === 'loading' ? (
                      <div className="planner-col-loading-card">
                        <div className="planner-skeleton-line short" />
                        <div className="planner-skeleton-thumb" />
                        <div className="planner-skeleton-line" />
                      </div>
                    ) : !hasContent ? (
                      <div
                        className="planner-empty-day"
                        onClick={() => navigateToCreate(day.dateKey)}
                      >
                        <Plus size={18} />
                        <span>Schedule post</span>
                      </div>
                    ) : (
                      <>
                        {/* Published & Scheduled Posts */}
                        {dayPosts.map((post) => {
                          const allMedia = resolveAllMediaUrls(post.media_url);
                          const postDateStr = post.published_time || post.scheduled_time || post.created_at;
                          const timeStr = formatTime(postDateStr);
                          const firstMedia = post.thumbnail_url || allMedia[0] || post.product_image;
                          const isVideo = isVideoMedia(post.thumbnail_url || allMedia[0] || '');
                          const photoCount = allMedia.length;
                          const postType = getPostContentType(post);
                          const fbPostUrl = getFacebookPostUrl(
                            post.fb_post_id,
                            post.post_url,
                            post.page_id || post.fb_page_id
                          );

                          return (
                            <div
                              key={post.id}
                              className="planner-post-card"
                              onClick={() => {
                                const returnUrl = location.pathname + location.search;
                                navigate(`/planner/edit/${post.id}`, { state: { from: returnUrl, returnPath: returnUrl } });
                              }}
                              title="Click to view & edit post"
                            >
                              {/* Time & Status Row */}
                              <div className="planner-card-time-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span className="planner-time-pill">
                                    <Clock size={11} /> {timeStr || '12:00 AM'}
                                  </span>
                                  {post.compensation_for_slot_id && (
                                    <span
                                      className="planner-compensation-pill"
                                      title="Make-up post fulfilling a previous deliverable"
                                      style={{
                                        fontSize: '9.5px',
                                        fontWeight: 700,
                                        color: '#7c3aed',
                                        backgroundColor: '#f5f3ff',
                                        border: '1px solid #ddd6fe',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <Sparkles size={9} /> Make-Up
                                    </span>
                                  )}
                                </div>
                                {post.status === 'published' && fbPostUrl && fbPostUrl !== '#' && (
                                  <a
                                    href={fbPostUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="planner-card-action-btn"
                                    title="Open on Facebook"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>

                              {/* Media Thumbnail */}
                              <div className="planner-card-media-wrap">
                                <SafeImage
                                  src={
                                    firstMedia ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      post.page_name || 'FB'
                                    )}&background=e2e8f0&color=475569`
                                  }
                                  poster={post.thumbnail_url}
                                  alt={post.message || 'post'}
                                  className="planner-card-img"
                                  fallbackText="No Image"
                                />

                                {/* Brand Tag Badge on Top-Left of Photo */}
                                {(post.brand_name || post.product_name) && (
                                  <div
                                    className="planner-card-brand-badge"
                                    title={post.brand_name || post.product_name}
                                  >
                                    <Tag size={10} color="#2563eb" />
                                    <span>{post.brand_name || post.product_name}</span>
                                  </div>
                                )}

                                {/* Content Type Icon Badge in Top-Right Corner */}
                                {postType === 'live' ? (
                                  <div className="planner-type-badge type-live" title="Live Video">
                                    <Radio size={11} />
                                  </div>
                                ) : postType === 'video' || isVideo ? (
                                  <div className="planner-type-badge type-video" title="Video">
                                    <Play size={10} fill="#ffffff" />
                                  </div>
                                ) : photoCount > 1 ? (
                                  <div className="planner-type-badge type-photo multi" title={`${photoCount} Photos`}>
                                    <Layers size={11} />
                                    <span>{photoCount}</span>
                                  </div>
                                ) : postType === 'photo' ? (
                                  <div className="planner-type-badge type-photo" title="Photo">
                                    <Image size={11} />
                                  </div>
                                ) : (
                                  <div className="planner-type-badge type-status" title="Text Post">
                                    <FileText size={11} />
                                  </div>
                                )}

                                {/* Platform Icon Badge on Bottom-Right */}
                                <div
                                  className="planner-platform-badge"
                                  title={post.page_name || 'Facebook'}
                                >
                                  <FaFacebook size={14} color="#1877F2" />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Pending Planned Posts (Styled like general post card) */}
                        {pendingSlots.map((slot, sIdx) => {
                          const isSpecial = (slot.time_window || '').includes('04:00PM') || (slot.notes || '').toLowerCase().includes('payday');
                          const badge = getSlotBadgeStyle(slot.content_type, isSpecial);
                          const isMissed = slot.computed_status === 'missed' || day.dateKey < todayKey;

                          return (
                            <div
                              key={`plan-${slot.id || sIdx}`}
                              className={`planner-post-card planner-planned-card ${isMissed ? 'is-missed' : ''}`}
                              onClick={() => handleSlotClick(slot, day.dateKey)}
                              title={`[${isMissed ? 'MISSED Deliverable' : 'Planned Post'}] ${slot.brand_name || 'Brand'} · ${badge.label}${slot.notes ? ` (${slot.notes})` : ''} · Click to ${isMissed ? 'backfill post' : 'create & post'}`}
                            >
                              {/* Time & Status Row */}
                              <div className="planner-card-time-row">
                                <span className={`planner-time-pill planner-planned-time ${isMissed ? 'is-missed' : ''}`} title={slot.time_window ? `Target time: ${slot.time_window}` : undefined}>
                                  {isMissed ? <AlertTriangle size={11} strokeWidth={2.5} /> : <Clock size={11} />}
                                  <span>{isMissed ? 'Overdue' : (slot.time_window || 'Planned')}</span>
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {isMissed && slot.missed_reason && (
                                    <span
                                      className="planner-plan-badge"
                                      style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' }}
                                      title={slot.resolution_notes ? `Notes: ${slot.resolution_notes}` : 'Reason classified'}
                                    >
                                      {slot.missed_reason.replace('_', ' ')}
                                    </span>
                                  )}
                                  {isMissed && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCategorizeSlot(slot);
                                        }}
                                        className="planner-card-action-btn"
                                        title="Categorize Root Cause / Reason"
                                        style={{ padding: '2px', display: 'inline-flex', alignItems: 'center', color: '#64748b' }}
                                      >
                                        ⚙
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLinkPostModalSlot(slot);
                                        }}
                                        className="planner-card-action-btn"
                                        title="Link existing tracked post to this missed slot"
                                        style={{ padding: '2px', display: 'inline-flex', alignItems: 'center', color: '#4f46e5' }}
                                      >
                                        <Link2 size={12} />
                                      </button>
                                    </>
                                  )}
                                  {slot.slot_status === 'waived' && (
                                    <span className="planner-plan-badge" style={{ backgroundColor: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>
                                      <PauseCircle size={9.5} strokeWidth={2.5} /> WAIVED
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Media Wrap (Planned Deliverable Blueprint Preview) */}
                              <div className={`planner-card-media-wrap planner-planned-media-wrap type-${slot.content_type || 'photo'} ${isMissed ? 'is-missed' : ''}`}>
                                {/* Brand Tag Badge on Top-Left (Identical to published posts) */}
                                {slot.brand_name && (
                                  <div className="planner-card-brand-badge" title={slot.brand_name}>
                                    <Tag size={10} color={isMissed ? '#dc2626' : '#2563eb'} />
                                    <span>{slot.brand_name}</span>
                                  </div>
                                )}

                                {/* Clean Format Icon Badge on Top-Right (Just icon - clean & unified) */}
                                {slot.content_type === 'live' ? (
                                  <div className="planner-type-badge type-live" title="Live Video Deliverable">
                                    <Radio size={11} />
                                  </div>
                                ) : slot.content_type === 'video' || slot.content_type === 'reel' ? (
                                  <div className="planner-type-badge type-video" title="Video Deliverable">
                                    <Play size={10} fill="#ffffff" />
                                  </div>
                                ) : (
                                  <div className="planner-type-badge type-photo" title={badge.label || 'Poster / Photo Deliverable'}>
                                    <Image size={11} />
                                  </div>
                                )}

                                {/* Body: Note & Action Link */}
                                <div className="planner-planned-media-body">
                                  <span className="planner-planned-note" title={slot.notes || badge.label}>
                                    {slot.notes || badge.label}
                                  </span>
                                  <span className={`planner-planned-subtext ${isMissed ? 'is-missed' : ''}`}>
                                    {isMissed ? '+ Backfill / Create post' : '+ Click to create post'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Compensated Deliverables (ផុសសងរួច) */}
                        {compensatedSlots.map((slot, sIdx) => {
                          const badge = getSlotBadgeStyle(slot.content_type);
                          return (
                            <div
                              key={`comp-${slot.id || sIdx}`}
                              className="planner-post-card planner-planned-card is-compensated"
                              onClick={() => handleSlotClick(slot, day.dateKey)}
                              title={`[Compensated Deliverable] ${slot.brand_name || 'Brand'} · ${badge.label} · Missed on ${day.dateKey} but compensated by linked post. Click to view.`}
                            >
                              <div className="planner-card-time-row">
                                <span className="planner-time-pill" style={{ color: '#7c3aed', backgroundColor: '#f5f3ff' }}>
                                  <Sparkles size={11} /> Make-Up
                                </span>
                                {slot.linked_post_id && (
                                  <span
                                    className="planner-card-action-btn"
                                    title={`View linked post #${slot.linked_post_id}`}
                                    style={{ color: '#7c3aed', display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    <Link2 size={12} />
                                  </span>
                                )}
                              </div>

                              <div
                                className={`planner-card-media-wrap planner-planned-media-wrap type-${slot.content_type || 'photo'}`}
                              >
                                {/* Brand Tag Badge on Top-Left */}
                                {slot.brand_name && (
                                  <div className="planner-card-brand-badge" title={slot.brand_name}>
                                    <Tag size={10} color="#7c3aed" />
                                    <span>{slot.brand_name}</span>
                                  </div>
                                )}

                                {/* Clean Format Icon Badge on Top-Right */}
                                {slot.content_type === 'live' ? (
                                  <div className="planner-type-badge type-live" title="Live Video">
                                    <Radio size={11} />
                                  </div>
                                ) : slot.content_type === 'video' || slot.content_type === 'reel' ? (
                                  <div className="planner-type-badge type-video" title="Video">
                                    <Play size={10} fill="#ffffff" />
                                  </div>
                                ) : (
                                  <div className="planner-type-badge type-photo" title={badge.label || 'Poster / Photo'}>
                                    <Image size={11} />
                                  </div>
                                )}

                                {/* Body: Note & Action Link */}
                                <div className="planner-planned-media-body">
                                  <span className="planner-planned-note" title={slot.notes || badge.label} style={{ color: '#5b21b6' }}>
                                    {slot.notes || badge.label}
                                  </span>
                                  <span className="planner-planned-subtext" style={{ color: '#7c3aed', fontWeight: 600 }}>
                                    ✓ Fulfilled {slot.linked_post_id ? `(#${slot.linked_post_id})` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Subtle extra post button when only plans exist */}
                        {dayPosts.length === 0 && (
                          <div
                            className="planner-empty-day-compact"
                            onClick={() => navigateToCreate(day.dateKey)}
                            title={`Schedule extra post for ${day.dayName}`}
                          >
                            <Plus size={13} />
                            <span>+ Extra post</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MONTH VIEW: 7 Column Calendar Grid
         ==================================================================== */}
      {viewMode === 'month' && (
        <div className="planner-month-card">
          <div className="planner-month-header-row">
            {DAY_NAMES.map((name) => (
              <div key={name} className="planner-month-col-title">
                {name}
              </div>
            ))}
          </div>

          <div className="planner-month-grid">
            {monthDays.map((cell, idx) => {
              const cellPosts = postsByDate.get(cell.dateKey) || [];
              const cellSlots = slotsByDate.get(cell.dateKey) || [];
              const cellCompensated = cellSlots.filter((slot) => slot.is_compensated || slot.computed_status === 'compensated');
              // When posted ready, don't show the plan
              const pendingSlots = cellSlots.filter((slot) => !isSlotPostedReady(slot, cellPosts) && !slot.is_compensated && slot.computed_status !== 'compensated');

              return (
                <div
                  key={idx}
                  className={`planner-month-cell ${!cell.isCurrentMonth ? 'outside-month' : ''
                    } ${cell.isToday ? 'is-today' : ''}`}
                >
                  <div className="planner-month-cell-header">
                    <span className="planner-month-day-num">{cell.dayNumber}</span>
                    <div className="planner-month-metrics-wrap">
                      {cellPosts.length > 0 && (
                        <span className="planner-month-metric-posts" title={`${cellPosts.length} posts`}>
                          {cellPosts.length}p
                        </span>
                      )}
                      {pendingSlots.length > 0 && (() => {
                        const isMissed = cell.dateKey < todayKey;
                        return (
                          <span
                            className={`planner-month-metric-item ${isMissed ? 'is-missed' : 'is-planned'}`}
                            title={
                              isMissed
                                ? `${pendingSlots.length} overdue / missed deliverables`
                                : `${pendingSlots.length} planned deliverables`
                            }
                          >
                            <span className={`planner-metric-dot ${isMissed ? 'red' : 'blue'}`} />
                            <span>{pendingSlots.length}</span>
                          </span>
                        );
                      })()}
                      {cellCompensated.length > 0 && (
                        <span
                          className="planner-month-metric-item is-compensated"
                          title={`${cellCompensated.length} compensated deliverables`}
                        >
                          <span className="planner-metric-dot purple" />
                          <span>{cellCompensated.length}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '110px' }}>
                    {/* Published / Scheduled Posts */}
                    {cellPosts.slice(0, 3).map((post) => {
                      const allMedia = resolveAllMediaUrls(post.media_url);
                      const thumb = post.thumbnail_url || allMedia[0] || post.product_image;
                      const postTime = formatTime(post.published_time || post.scheduled_time || post.created_at);

                      return (
                        <div
                          key={post.id}
                          className="planner-month-post-chip"
                          onClick={() => {
                            const returnUrl = location.pathname + location.search;
                            navigate(`/planner/edit/${post.id}`, { state: { from: returnUrl, returnPath: returnUrl } });
                          }}
                          title={`${postTime} · ${post.message || 'Post'}`}
                        >
                          {thumb ? (
                            <SafeImage
                              src={thumb}
                              alt=""
                              className="planner-chip-thumb"
                              fallbackText=""
                            />
                          ) : (
                            <FaFacebook size={12} color="#1877F2" style={{ flexShrink: 0 }} />
                          )}
                          <span className="planner-chip-time">{postTime}</span>
                          <span className="planner-chip-text">
                            {post.message || post.product_name || 'Post'}
                          </span>
                        </div>
                      );
                    })}

                    {/* Pending Planned Posts (Styled like general post chip) */}
                    {pendingSlots.slice(0, Math.max(1, 3 - cellPosts.length)).map((slot, sIdx) => {
                      const badge = getSlotBadgeStyle(slot.content_type);
                      const isMissed = slot.computed_status === 'missed' || cell.dateKey < todayKey;
                      const timeStr = slot.time_window
                        ? slot.time_window.split('-')[0].trim()
                        : isMissed
                          ? 'Missed'
                          : 'Plan';

                      return (
                        <div
                          key={`month-plan-${slot.id || sIdx}`}
                          className={`planner-month-post-chip planner-month-plan-chip ${isMissed ? 'is-missed' : ''}`}
                          onClick={() => handleSlotClick(slot, cell.dateKey)}
                          title={`[${isMissed ? 'MISSED Deliverable' : 'Planned Post'}] ${slot.brand_name || 'Brand'} · ${badge.label}${slot.notes ? ` (${slot.notes})` : ''} · Click to create post`}
                        >
                          <div
                            className={`planner-month-plan-icon ${isMissed ? 'is-missed' : ''}`}
                            style={
                              isMissed
                                ? { backgroundColor: '#fef2f2', border: '1px solid #fecaca' }
                                : { backgroundColor: badge.bg, border: `1px solid ${badge.borderColor}` }
                            }
                          >
                            {isMissed ? (
                              <AlertTriangle size={10} color="#dc2626" strokeWidth={2.5} />
                            ) : (
                              <Target size={11} color={badge.barColor} />
                            )}
                          </div>
                          <span className={`planner-chip-time ${isMissed ? 'is-missed' : ''}`} style={{ color: isMissed ? '#dc2626' : '#2563eb' }}>
                            {timeStr}
                          </span>
                          <span
                            className="planner-chip-text"
                            style={{ fontStyle: 'italic', color: isMissed ? '#991b1b' : '#475569' }}
                          >
                            [{slot.brand_name || 'Brand'}] {badge.label}
                          </span>
                        </div>
                      );
                    })}

                    {cellPosts.length + pendingSlots.length > 3 && (
                      <div
                        style={{ fontSize: '10px', color: '#2563eb', fontWeight: 600, padding: '2px 4px', cursor: 'pointer' }}
                        onClick={() => {
                          // Switch to week view centered on this day
                          setCurrentWeekStart(getWeekMonday(cell.date));
                          setViewMode('week');
                        }}
                      >
                        +{cellPosts.length + pendingSlots.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Root Cause & Missed Reason Modal */}
      <CategorizeMissedModal
        isOpen={Boolean(categorizeSlot)}
        onClose={() => setCategorizeSlot(null)}
        slot={categorizeSlot}
        onSaved={async () => {
          setCategorizeSlot(null);
          await invalidatePostAndMissionCaches();
        }}
      />

      {/* Link Existing Tracked Post Modal */}
      <LinkExistingPostModal
        isOpen={Boolean(linkPostModalSlot)}
        onClose={() => setLinkPostModalSlot(null)}
        slot={linkPostModalSlot}
        onLinked={async () => {
          setLinkPostModalSlot(null);
          await invalidatePostAndMissionCaches();
        }}
      />
    </div>
  );
};
