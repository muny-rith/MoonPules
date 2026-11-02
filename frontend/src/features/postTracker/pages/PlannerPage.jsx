import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Target
} from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import { usePostTracker } from '../hooks/usePostTracker';
import * as api from '../api/postTrackerApi';
import { fetchBrands } from '../../product/services/productService';
import * as missionApi from '../../missions/api/missionApi';
import { MissionProgressCard, SetMissionModal } from '../../missions';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
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

export const PlannerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Load all tracked posts
  const { posts, loading, reload, triggerSync } = usePostTracker({ range: 'all' });

  // URL-synced filters
  const { filters, setFilter } = useUrlFilters({
    view: 'week',
    page_id: '',
    brand_id: '',
    type: 'all',
    search: '',
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

  // Brand and Mission Blueprint states
  const [brands, setBrands] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [calendarSlots, setCalendarSlots] = useState([]);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);

  // Navigation states
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekMonday(new Date()));
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // Filter & Search states: immediately initialize pages & page 1 from cache to prevent any flash
  const cachedPagesInitial = useMemo(() => api.getCachedPages() || [], []);
  const [pages, setPages] = useState(cachedPagesInitial);

  const selectedPageId = useMemo(() => {
    if (selectedPageFilter) return selectedPageFilter;
    if (cachedPagesInitial.length > 0) return cachedPagesInitial[0].id;
    if (pages.length > 0) return pages[0].id;
    return 'loading';
  }, [selectedPageFilter, cachedPagesInitial, pages]);

  const userSelectedPageRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'page' | 'contentType' | null
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

  // Load Facebook Pages for dropdown & ensure default to page 1
  useEffect(() => {
    api.fetchPages()
      .then((data) => {
        const pageList = data || [];
        setPages(pageList);
      })
      .catch((err) => {
        console.error('Failed to load FB pages:', err);
      });
  }, []);

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
  }, [posts, selectedPageId, contentTypeFilter, searchQuery]);

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

  // Date Navigation Handlers
  const handlePrev = () => {
    if (viewMode === 'week') {
      const prev = new Date(currentWeekStart);
      prev.setDate(prev.getDate() - 7);
      setCurrentWeekStart(prev);
    } else {
      const prev = new Date(currentMonthDate);
      prev.setMonth(prev.getMonth() - 1);
      setCurrentMonthDate(prev);
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const next = new Date(currentWeekStart);
      next.setDate(next.getDate() + 7);
      setCurrentWeekStart(next);
    } else {
      const next = new Date(currentMonthDate);
      next.setMonth(next.getMonth() + 1);
      setCurrentMonthDate(next);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentWeekStart(getWeekMonday(today));
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentMonthDate(firstOfCurrentMonth);
  };

  // Sync with Facebook
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      await reload({ range: 'all' }, true);
    } catch (err) {
      console.error('Sync failed:', err);
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

  // Load brands list on mount
  useEffect(() => {
    let isMounted = true;
    fetchBrands().then((list) => {
      if (isMounted) setBrands(list || []);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const activeMonthNumber = useMemo(() => {
    if (viewMode === 'week' && weekDays[0]?.date) {
      return weekDays[0].date.getMonth() + 1;
    }
    return currentMonthDate.getMonth() + 1;
  }, [viewMode, weekDays, currentMonthDate]);

  const activeYearNumber = useMemo(() => {
    if (viewMode === 'week' && weekDays[0]?.date) {
      return weekDays[0].date.getFullYear();
    }
    return currentMonthDate.getFullYear();
  }, [viewMode, weekDays, currentMonthDate]);

  const activeMonthName = useMemo(() => {
    const d = new Date(activeYearNumber, activeMonthNumber - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [activeMonthNumber, activeYearNumber]);

  const selectedBrand = useMemo(() => {
    return brands.find((b) => String(b.brand_id || b.id) === String(brandFilter)) || null;
  }, [brands, brandFilter]);

  const brandLabel = useMemo(() => {
    if (selectedBrand) return selectedBrand.brand_name || selectedBrand.name;
    if (brandFilter && brandFilter !== 'all') return `Brand #${brandFilter}`;
    return 'All Brands';
  }, [selectedBrand, brandFilter]);

  // Load mission & slots whenever month, year, or brand changes
  const loadMissionData = async () => {
    try {
      const slotsData = await missionApi.getCalendarSlots(brandFilter || 'all', activeMonthNumber, activeYearNumber);
      setCalendarSlots(slotsData || []);

      if (brandFilter && brandFilter !== 'all') {
        const m = await missionApi.getMission(brandFilter, activeMonthNumber, activeYearNumber);
        setActiveMission(m);
      } else {
        if (brands.length > 0) {
          const kfree = brands.find((b) => (b.brand_name || b.name || '').toUpperCase().includes('FREE'));
          const targetId = kfree ? (kfree.brand_id || kfree.id) : (brands[0].brand_id || brands[0].id);
          const m = await missionApi.getMission(targetId, activeMonthNumber, activeYearNumber);
          setActiveMission(m);
        } else {
          setActiveMission(null);
        }
      }
    } catch (err) {
      console.error('Failed to load mission data:', err);
    }
  };

  useEffect(() => {
    loadMissionData();
  }, [brandFilter, activeMonthNumber, activeYearNumber, brands]);

  // Group slots by planned_date_str
  const slotsByDate = useMemo(() => {
    const map = new Map();
    calendarSlots.forEach((slot) => {
      const key = slot.planned_date_str;
      if (key) {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(slot);
      }
    });
    return map;
  }, [calendarSlots]);

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
          <button
            className="planner-btn-secondary"
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync latest post metrics with Facebook"
          >
            <RefreshCw size={15} className={isSyncing ? 'spin-animation' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>

          <button
            className="planner-btn-primary"
            onClick={() => navigate('/planner/create', { state: { from: location.pathname + location.search } })}
          >
            <Plus size={16} /> Schedule Post
          </button>
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
          <div className="planner-search-wrap">
            <Search size={14} className="planner-search-icon" />
            <input
              type="text"
              placeholder="Search post content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="planner-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="planner-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Facebook Page Filter Dropdown */}
          <div className="planner-dropdown-group">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'page' ? null : 'page')}
              className={`planner-dropdown-btn ${selectedPageId !== 'all' && selectedPageId !== 'loading' ? 'active-filter' : ''}`}
              title="Filter by Facebook Page"
            >
              {selectedPageId === 'loading' ? (
                <RefreshCw size={13} className="planner-dropdown-btn-icon spin-animation" />
              ) : selectedPageId !== 'all' ? (
                <FaFacebook size={13} color="#1877F2" className="planner-dropdown-btn-icon" />
              ) : (
                <Layers size={13} className="planner-dropdown-btn-icon" />
              )}
              <span className="planner-dropdown-label">{pageLabel}</span>
              <ChevronDown
                size={13}
                className="planner-dropdown-chevron"
                style={{
                  transform: openDropdown === 'page' ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {openDropdown === 'page' && (
              <div className="planner-dropdown-menu">
                {pages.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      userSelectedPageRef.current = true;
                      setFilter('page_id', p.id);
                      setOpenDropdown(null);
                    }}
                    className={`planner-dropdown-item ${String(selectedPageId) === String(p.id) ? 'selected' : ''}`}
                    title={p.page_name}
                  >
                    <FaFacebook size={13} color="#1877F2" className="planner-dropdown-item-icon" />
                    <span className="planner-dropdown-item-text">{p.page_name}</span>
                    {String(selectedPageId) === String(p.id) && <Check size={14} className="planner-dropdown-check" />}
                  </div>
                ))}

                {pages.length > 0 && <div className="planner-dropdown-divider" />}

                <div
                  onClick={() => {
                    userSelectedPageRef.current = true;
                    setFilter('page_id', 'all');
                    setOpenDropdown(null);
                  }}
                  className={`planner-dropdown-item ${selectedPageId === 'all' ? 'selected' : ''}`}
                >
                  <Layers size={13} className="planner-dropdown-item-icon" />
                  <span className="planner-dropdown-item-text">All Pages</span>
                  {pages.length > 0 && <span className="planner-dropdown-badge">{pages.length}</span>}
                  {selectedPageId === 'all' && <Check size={14} className="planner-dropdown-check" />}
                </div>
              </div>
            )}
          </div>

          {/* Brand Filter Dropdown */}
          <div className="planner-dropdown-group">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'brand' ? null : 'brand')}
              className={`planner-dropdown-btn ${brandFilter && brandFilter !== 'all' ? 'active-filter' : ''}`}
              title="Filter by Brand"
            >
              <Tag size={13} color="#2563eb" className="planner-dropdown-btn-icon" />
              <span className="planner-dropdown-label">{brandLabel}</span>
              <ChevronDown
                size={13}
                className="planner-dropdown-chevron"
                style={{
                  transform: openDropdown === 'brand' ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {openDropdown === 'brand' && (
              <div className="planner-dropdown-menu">
                <div
                  onClick={() => {
                    setBrandFilter('');
                    setOpenDropdown(null);
                  }}
                  className={`planner-dropdown-item ${!brandFilter || brandFilter === 'all' ? 'selected' : ''}`}
                >
                  <Tag size={13} className="planner-dropdown-item-icon" />
                  <span className="planner-dropdown-item-text">All Brands</span>
                  {(!brandFilter || brandFilter === 'all') && <Check size={14} className="planner-dropdown-check" />}
                </div>

                {brands.length > 0 && <div className="planner-dropdown-divider" />}

                {brands.map((b) => {
                  const bId = String(b.brand_id || b.id);
                  const bName = b.brand_name || b.name || `Brand #${bId}`;
                  const isSelected = String(brandFilter) === bId;

                  return (
                    <div
                      key={bId}
                      onClick={() => {
                        setBrandFilter(bId);
                        setOpenDropdown(null);
                      }}
                      className={`planner-dropdown-item ${isSelected ? 'selected' : ''}`}
                      title={bName}
                    >
                      <Tag size={13} color="#2563eb" className="planner-dropdown-item-icon" />
                      <span className="planner-dropdown-item-text">{bName}</span>
                      {isSelected && <Check size={14} className="planner-dropdown-check" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Content Type Filter Dropdown */}
          <div className="planner-dropdown-group">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'contentType' ? null : 'contentType')}
              className={`planner-dropdown-btn ${contentTypeFilter !== 'all' ? 'active-filter' : ''}`}
              title="Filter by content type"
            >
              <currentContentType.icon size={13} color={currentContentType.color} className="planner-dropdown-btn-icon" />
              <span className="planner-dropdown-label">{currentContentType.label}</span>
              <ChevronDown
                size={13}
                className="planner-dropdown-chevron"
                style={{
                  transform: openDropdown === 'contentType' ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {openDropdown === 'contentType' && (
              <div className="planner-dropdown-menu">
                {CONTENT_TYPE_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = contentTypeFilter === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        setContentTypeFilter(opt.value);
                        setOpenDropdown(null);
                      }}
                      className={`planner-dropdown-item ${isSelected ? 'selected' : ''}`}
                    >
                      <IconComp
                        size={13}
                        color={opt.color}
                        className="planner-dropdown-item-icon"
                      />
                      <span className="planner-dropdown-item-text">{opt.label}</span>
                      {isSelected && <Check size={14} className="planner-dropdown-check" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brand Mission & Schedule Blueprint Banner */}
      <MissionProgressCard
        mission={activeMission}
        brandName={brandLabel}
        monthName={activeMonthName}
        onOpenModal={() => setIsMissionModalOpen(true)}
      />

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

                return (
                  <div
                    key={`head-${day.dateKey}`}
                    className={`planner-day-col-header ${day.isToday ? 'is-today' : ''}`}
                  >
                    <div className="planner-day-header-top">
                      {day.isToday ? (
                        <div className="planner-today-pill">
                          <span className="day-name">{day.dayName}</span>
                          <span className="day-number">{day.dayNumber}</span>
                        </div>
                      ) : (
                        <div className="planner-day-label">
                          <span className="day-name">{day.dayName}</span>
                          <span className="day-number">{day.dayNumber}</span>
                        </div>
                      )}

                      {/* Quick Add Button */}
                      <button
                        className="planner-day-add-btn"
                        title={`Schedule post for ${day.dayName} ${day.dayNumber}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/planner/create?date=${day.dateKey}`);
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Daily Count Indicator Badge */}
                    {(loading && posts.length === 0) || selectedPageId === 'loading' ? (
                      <span className="planner-day-count-badge loading">...</span>
                    ) : dayPosts.length > 0 ? (
                      <span className="planner-day-count-badge">
                        {dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}
                      </span>
                    ) : (
                      <span className="planner-day-count-zero">0 posts</span>
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
                const uncompletedSlots = daySlots.filter((s) => s.computed_status !== 'completed');

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
                    ) : (dayPosts.length === 0 && uncompletedSlots.length === 0) ? (
                      <div
                        className="planner-empty-day"
                        onClick={() => navigate(`/planner/create?date=${day.dateKey}`, { state: { from: location.pathname + location.search } })}
                      >
                        <Plus size={18} />
                        <span>Schedule post</span>
                      </div>
                    ) : (
                      <>
                        {/* Planned Blueprint Slots for this day */}
                        {uncompletedSlots.map((slot, sIdx) => {
                          const isMissed = slot.computed_status === 'missed';
                          return (
                            <div
                              key={`planned-${slot.id || sIdx}`}
                              style={{
                                border: `2px dashed ${isMissed ? '#fca5a5' : '#93c5fd'}`,
                                backgroundColor: isMissed ? '#fef2f2' : '#f0f9ff',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                marginBottom: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => navigate(`/planner/create?date=${day.dateKey}`, {
                                state: {
                                  from: location.pathname + location.search,
                                  prefillBrandId: slot.brand_id,
                                  prefillDate: slot.planned_date_str,
                                  prefillType: slot.content_type,
                                }
                              })}
                              title="Click to create post for this planned day"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: isMissed ? '#b91c1c' : '#0369a1', textTransform: 'uppercase' }}>
                                  🎯 {slot.brand_name || 'Planned'} {slot.content_type === 'live' ? 'Live Stream' : (slot.content_type === 'video' ? 'Video' : 'Poster')}
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  color: isMissed ? '#dc2626' : '#0284c7',
                                  backgroundColor: isMissed ? '#fee2e2' : '#e0f2fe',
                                  padding: '1px 5px',
                                  borderRadius: '4px'
                                }}>
                                  {isMissed ? 'Missed' : 'Planned'}
                                </span>
                              </div>
                              {slot.time_window && (
                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginTop: '3px' }}>
                                  ⏰ {slot.time_window}
                                </div>
                              )}
                              {slot.notes && (
                                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                                  "{slot.notes}"
                                </div>
                              )}
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Plus size={12} /> Create post
                              </div>
                            </div>
                          );
                        })}

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
                            onClick={() => navigate(`/planner/edit/${post.id}`, { state: { from: location.pathname + location.search } })}
                            title="Click to view & edit post"
                          >
                            {/* Time & Status Row */}
                            <div className="planner-card-time-row">
                              <span className="planner-time-pill">
                                <Clock size={11} /> {timeStr || '12:00 AM'}
                              </span>
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
              const uncompletedCellSlots = cellSlots.filter((s) => s.computed_status !== 'completed');

              return (
                <div
                  key={idx}
                  className={`planner-month-cell ${!cell.isCurrentMonth ? 'outside-month' : ''
                    } ${cell.isToday ? 'is-today' : ''}`}
                >
                  <div className="planner-month-cell-header">
                    <span className="planner-month-day-num">{cell.dayNumber}</span>
                    {(cellPosts.length > 0 || uncompletedCellSlots.length > 0) && (
                      <span className="planner-day-count-badge">
                        {cellPosts.length + uncompletedCellSlots.length}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '110px' }}>
                    {/* Uncompleted Planned Target Slots in Month View */}
                    {uncompletedCellSlots.map((slot, sIdx) => {
                      const isMissed = slot.computed_status === 'missed';
                      return (
                        <div
                          key={`month-slot-${slot.id || sIdx}`}
                          className="planner-month-post-chip"
                          style={{
                            backgroundColor: isMissed ? '#fef2f2' : '#eff6ff',
                            border: `1px dashed ${isMissed ? '#f87171' : '#60a5fa'}`,
                            color: isMissed ? '#b91c1c' : '#1d4ed8',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/planner/create?date=${cell.dateKey}`, {
                            state: {
                              from: location.pathname + location.search,
                              prefillBrandId: slot.brand_id,
                              prefillDate: slot.planned_date_str,
                              prefillType: slot.content_type,
                            }
                          })}
                          title={`Planned ${slot.content_type}: Click to create post`}
                        >
                          <Target size={11} style={{ flexShrink: 0, color: isMissed ? '#ef4444' : '#2563eb' }} />
                          <span className="planner-chip-text" style={{ fontWeight: '700' }}>
                            🎯 {slot.content_type === 'live' ? 'Live' : (slot.content_type === 'video' ? 'Video' : 'Poster')}
                            {slot.time_window ? ` (${slot.time_window})` : ''}
                          </span>
                        </div>
                      );
                    })}

                    {cellPosts.slice(0, 3).map((post) => {
                      const allMedia = resolveAllMediaUrls(post.media_url);
                      const thumb = post.thumbnail_url || allMedia[0] || post.product_image;
                      const postTime = formatTime(post.published_time || post.scheduled_time || post.created_at);

                      return (
                        <div
                          key={post.id}
                          className="planner-month-post-chip"
                          onClick={() => navigate(`/planner/edit/${post.id}`, { state: { from: location.pathname + location.search } })}
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

                    {cellPosts.length > 3 && (
                      <div
                        style={{ fontSize: '10px', color: '#2563eb', fontWeight: 600, padding: '2px 4px', cursor: 'pointer' }}
                        onClick={() => {
                          // Switch to week view centered on this day
                          setCurrentWeekStart(getWeekMonday(cell.date));
                          setViewMode('week');
                        }}
                      >
                        +{cellPosts.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Set Mission & Blueprint Modal */}
      <SetMissionModal
        isOpen={isMissionModalOpen}
        onClose={() => setIsMissionModalOpen(false)}
        initialMonth={activeMonthNumber}
        initialYear={activeYearNumber}
        initialBrandId={brandFilter || (brands[0] ? String(brands[0].brand_id || brands[0].id) : '')}
        onSaved={() => {
          loadMissionData();
        }}
      />
    </div>
  );
};
