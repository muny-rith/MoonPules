import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
import * as missionApi from '../../missions/api/missionApi';
import { useBrands, usePages } from '../../../shared/hooks/queries';
import { usePostTracker } from '../../postTracker/hooks/usePostTracker';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { Select, Button, Modal } from '../../../shared/components/ui';
import { resolveAllMediaUrls } from '../../../shared/utils/mediaUrl';
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';
import { SetMissionModal } from '../../missions/components/SetMissionModal';
import '../../postTracker/planner.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const BrandCalendarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Active Month & Year
  const [currentDate, setCurrentDate] = useState(() => {
    // Default to October 2026 if today is in late 2026, or current real month
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const monthNumber = currentDate.getMonth() + 1;
  const yearNumber = currentDate.getFullYear();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filters
  const [selectedBrandId, setSelectedBrandId] = useState('all'); // 'all' shows all brands
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

  // Data states
  const [calendarSlots, setCalendarSlots] = useState([]);
  const [auditSummary, setAuditSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null); // Day Detail Modal state

  // Load tracked posts from PostTracker
  const { posts, reload: reloadPosts } = usePostTracker({ range: 'all' });

  // Fetch slots and audit for the month
  const loadData = async () => {
    try {
      setLoading(true);
      const [slotsData, auditData] = await Promise.all([
        missionApi.getCalendarSlots(selectedBrandId, monthNumber, yearNumber),
        missionApi.getMonthAudit(monthNumber, yearNumber)
      ]);
      setCalendarSlots(slotsData || []);
      setAuditSummary(auditData || []);
    } catch (err) {
      console.error('Failed to load brand calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadData();
    if (reloadPosts) {
      await reloadPosts();
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBrandId, monthNumber, yearNumber]);

  // Date Navigation
  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentDate(d);
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

  // Option 2: Content Type Info (Icon & Label)
  const getContentTypeInfo = (contentType, isSpecial = false) => {
    const type = (contentType || '').toLowerCase();
    if (type === 'video' || type === 'reel') {
      return { label: 'Video', icon: Video, color: '#9333ea' };
    }
    if (type === 'live') {
      return { label: isSpecial ? 'Payday Live' : 'Live Stream', icon: Radio, color: isSpecial ? '#d97706' : '#2563eb' };
    }
    return { label: 'Poster', icon: Image, color: '#059669' };
  };

  // Option 2: State-Driven Card Styles (Instant Scanability)
  const getSlotCardStyle = (slot) => {
    const isCompleted = slot.computed_status === 'completed';
    const isScheduled = slot.computed_status === 'scheduled';
    const isMissed = slot.computed_status === 'missed';

    if (isCompleted) {
      return {
        cardBg: '#ecfdf5',
        cardBorder: '1px solid #10b981',
        barColor: '#059669',
        badgeBg: '#10b981',
        badgeColor: '#ffffff',
        badgeText: 'DONE',
        badgeIcon: 'check',
        brandColor: '#065f46',
        labelColor: '#047857',
        isDashed: false,
      };
    }

    if (isScheduled) {
      return {
        cardBg: '#eff6ff',
        cardBorder: '1px solid #3b82f6',
        barColor: '#2563eb',
        badgeBg: '#3b82f6',
        badgeColor: '#ffffff',
        badgeText: slot.time_window || 'QUEUED',
        badgeIcon: 'clock',
        brandColor: '#1e40af',
        labelColor: '#1d4ed8',
        isDashed: false,
      };
    }

    if (isMissed) {
      return {
        cardBg: '#fef2f2',
        cardBorder: '1px solid #ef4444',
        barColor: '#dc2626',
        badgeBg: '#ef4444',
        badgeColor: '#ffffff',
        badgeText: 'MISSED',
        badgeIcon: 'alert',
        brandColor: '#991b1b',
        labelColor: '#b91c1c',
        isDashed: false,
      };
    }

    // Default: Planned / To Do (Not done yet)
    return {
      cardBg: '#ffffff',
      cardBorder: '1.5px dashed #94a3b8',
      barColor: '#cbd5e1',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      badgeText: slot.time_window || 'To Do',
      badgeIcon: 'todo',
      brandColor: '#334155',
      labelColor: '#475569',
      isDashed: true,
    };
  };

  return (
    <div className="page-container brand-calendar-page" style={{ paddingBottom: '60px' }}>
      {/* Main Header Row */}
      <div className="planner-header-row">
        <div className="planner-header-title-wrap">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarIcon size={28} color="#2563eb" /> Brand Calendar
          </h1>
          <p>Monthly client campaign roadmap & deliverable tracking for all contracted brands.</p>
        </div>

        <div className="planner-header-actions">
          <a
            href="/K-FREE_October_2026_Schedule.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="planner-btn-secondary"
            title="Download or Print PDF Calendar"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
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
      <div className="planner-toolbar-card" style={{ marginBottom: '16px' }}>
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
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{monthName}</span>
          </div>
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Brand Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '220px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Brand:</span>
            <div style={{ width: '220px' }}>
              <Select
                value={selectedBrandId}
                options={brandOptions}
                onChange={setSelectedBrandId}
                placeholder="Select Brand..."
              />
            </div>
          </div>

          {/* Page Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '220px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Page:</span>
            <div style={{ width: '220px' }}>
              <Select
                value={selectedPageId}
                options={pageOptions}
                onChange={setSelectedPageId}
                placeholder="Select Page..."
              />
            </div>
          </div>

          {/* Deliverables Status Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1'
          }}>
            <button
              type="button"
              onClick={() => setMissionStatusFilter('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: missionStatusFilter === 'all' ? '700' : '500',
                backgroundColor: missionStatusFilter === 'all' ? '#ffffff' : 'transparent',
                color: missionStatusFilter === 'all' ? '#1d4ed8' : '#64748b',
                boxShadow: missionStatusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Show all planned brand deliverables"
            >
              <Target size={13} color={missionStatusFilter === 'all' ? '#2563eb' : '#64748b'} />
              <span>All Missions</span>
            </button>
            <button
              type="button"
              onClick={() => setMissionStatusFilter('completed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: missionStatusFilter === 'completed' ? '700' : '500',
                backgroundColor: missionStatusFilter === 'completed' ? '#ffffff' : 'transparent',
                color: missionStatusFilter === 'completed' ? '#16a34a' : '#64748b',
                boxShadow: missionStatusFilter === 'completed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Show only delivered/published posts"
            >
              <CheckCircle2 size={13} color={missionStatusFilter === 'completed' ? '#16a34a' : '#64748b'} />
              <span>Completed</span>
            </button>
            <button
              type="button"
              onClick={() => setMissionStatusFilter('pending')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: missionStatusFilter === 'pending' ? '700' : '500',
                backgroundColor: missionStatusFilter === 'pending' ? '#ffffff' : 'transparent',
                color: missionStatusFilter === 'pending' ? '#d97706' : '#64748b',
                boxShadow: missionStatusFilter === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Show pending brand deliverables"
            >
              <Clock size={13} color={missionStatusFilter === 'pending' ? '#d97706' : '#64748b'} />
              <span>Pending</span>
            </button>
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
      <div style={{
        padding: '14px 20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        marginBottom: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
              🎯 {monthName} — Monthly Missions for All Brands
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              ({auditSummary.length} brands planned)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/stats/brands?tab=missions')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Open the full 500-brand deliverables matrix"
            >
              <span>Manage in Brands Hub</span> →
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={14} /> Add / Edit Blueprint
            </button>
          </div>
        </div>

        {auditSummary.length === 0 ? (
          <div style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>
            No brand schedule blueprint has been saved yet for {monthName}. Click <strong>+ Plan Schedule Blueprint</strong> to set posting days.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {auditSummary.map((b) => {
              const is100 = b.completion_rate === 100 && b.total_slots > 0;
              const hasMissed = b.missed_slots > 0;

              return (
                <div
                  key={b.brand_id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: is100 ? '#f0fdf4' : (hasMissed ? '#fef2f2' : '#f8fafc'),
                    border: `1px solid ${is100 ? '#bbf7d0' : (hasMissed ? '#fecaca' : '#e2e8f0')}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      {b.brand_name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      {b.completed_slots} / {b.total_slots} days published
                    </div>
                  </div>

                  <div>
                    {is100 ? (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '12px' }}>
                        100% DONE 🏆
                      </span>
                    ) : hasMissed ? (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '12px' }}>
                        {b.missed_slots} Missed ⚠️
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', backgroundColor: '#dbeafe', padding: '3px 8px', borderRadius: '12px' }}>
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
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        marginBottom: '24px'
      }}>
        {/* Days of week Header (Solid Black bar like original photo) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#000000',
          color: '#ffffff',
          textAlign: 'center',
          fontWeight: '900',
          fontSize: '12px',
          letterSpacing: '0.8px',
          padding: '8px 0'
        }}>
          {DAY_NAMES.map((d) => (
            <div key={d}>{d.toUpperCase()}</div>
          ))}
        </div>

        {/* Calendar Cells Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#cbd5e1',
          gap: '1px'
        }}>
          {calendarCells.map((cell, idx) => {
            const data = itemsByDate.get(cell.dateKey) || { slots: [], posts: [] };
            const daySlots = data.slots;
            const dayPosts = data.posts;

            const isCurrentMonth = cell.isCurrentMonth;

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: isCurrentMonth ? '#ffffff' : '#f8fafc',
                  minHeight: '140px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {/* Day Number */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: isCurrentMonth ? '#1e293b' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isCurrentMonth && cell.dayNumber === 1 && (
                      <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase' }}>
                        {currentDate.toLocaleString('default', { month: 'short' })}
                      </span>
                    )}
                    {cell.dayNumber < 10 ? `0${cell.dayNumber}` : cell.dayNumber}
                  </span>

                  {/* Quick Add Button */}
                  {isCurrentMonth && (
                    <button
                      onClick={() => navigate(`/planner/create?date=${cell.dateKey}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={`Schedule post for ${cell.dateKey}`}
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>

                {/* Event Badges List for this day */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  {/* Option A: Strict Client Deliverables — Display planned brand mission slots */}
                  {isCurrentMonth && (() => {
                    const filteredSlots = daySlots.filter((slot) => {
                      if (missionStatusFilter === 'completed') return slot.computed_status === 'completed';
                      if (missionStatusFilter === 'pending') return slot.computed_status !== 'completed';
                      return true;
                    });

                    const maxSlotsToShow = 3;
                    const visibleSlots = filteredSlots.slice(0, maxSlotsToShow);
                    const remainingCount = filteredSlots.length - maxSlotsToShow;

                    return (
                      <>
                        {visibleSlots.map((slot, sIdx) => {
                          const isSpecial = (slot.time_window || '').includes('04:00PM') || (slot.notes || '').toLowerCase().includes('payday');
                          const typeInfo = getContentTypeInfo(slot.content_type, isSpecial);
                          const cardStyle = getSlotCardStyle(slot);
                          const IconComp = typeInfo.icon;

                          return (
                            <div
                              key={`slot-${slot.id || sIdx}`}
                              onClick={() => {
                                if (slot.linked_post?.id) {
                                  navigate(`/planner/edit/${slot.linked_post.id}`);
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
                              style={{
                                backgroundColor: cardStyle.cardBg,
                                borderRadius: '6px',
                                padding: '3px 7px',
                                fontSize: '11px',
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                                boxShadow: cardStyle.isDashed ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                                cursor: 'pointer',
                                position: 'relative',
                                border: cardStyle.cardBorder,
                                transition: 'all 0.15s ease'
                              }}
                              title={`Click to ${slot.linked_post?.id ? 'view post' : 'create post'} for ${slot.brand_name} (${cardStyle.badgeText})`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                {/* Content Type Icon */}
                                <IconComp size={12} color={typeInfo.color} style={{ flexShrink: 0 }} />

                                {/* Brand Name */}
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px',
                                  flexShrink: 0,
                                  color: cardStyle.brandColor
                                }}>
                                  [{slot.brand_name || 'BRAND'}]
                                </span>

                                {/* Content Label */}
                                <span style={{
                                  fontWeight: '600',
                                  fontSize: '10.5px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: cardStyle.labelColor
                                }}>
                                  {typeInfo.label}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                <span
                                  style={{
                                    backgroundColor: cardStyle.badgeBg,
                                    color: cardStyle.badgeColor,
                                    fontSize: '8.5px',
                                    fontWeight: '700',
                                    padding: '1.5px 6px',
                                    borderRadius: '9999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2.5px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px',
                                    border: cardStyle.isDashed ? '1px solid #cbd5e1' : 'none',
                                    boxShadow: cardStyle.isDashed ? 'none' : '0 1px 2px rgba(0,0,0,0.12)',
                                  }}
                                >
                                  {cardStyle.badgeIcon === 'check' && <Check size={9} strokeWidth={3} />}
                                  {cardStyle.badgeIcon === 'clock' && <Clock size={9} strokeWidth={2.5} />}
                                  {cardStyle.badgeIcon === 'alert' && <AlertTriangle size={9} strokeWidth={2.5} />}
                                  <span>{cardStyle.badgeText}</span>
                                </span>
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
                            style={{
                              backgroundColor: '#e2e8f0',
                              color: '#1e293b',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              marginTop: '2px',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#cbd5e1'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                          >
                            + {remainingCount} more deliverables
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

      {/* ====================================================================
          BRAND DELIVERABLES & OPERATIONS HUB LINK BANNER
         ==================================================================== */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px 20px',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e40af' }}>
              Full Brand Quotas & Deliverables Hub
            </div>
            <div style={{ fontSize: '12.5px', color: '#3b82f6', marginTop: '2px' }}>
              Looking to audit contract quotas, view agency daily agendas, or inline-reschedule dates across 100–500 clients?
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/stats/brands?tab=missions')}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#93c5fd',
            color: '#1d4ed8',
            fontWeight: '700',
            fontSize: '13px',
            padding: '8px 16px',
          }}
        >
          Open Brand Deliverables Hub →
        </Button>
      </div>

      {/* Set Blueprint Modal */}
      <SetMissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialMonth={monthNumber}
        initialYear={yearNumber}
        initialBrandId={selectedBrandId !== 'all' ? selectedBrandId : (brands[0] ? String(brands[0].brand_id || brands[0].id) : '')}
        onSaved={() => {
          loadData();
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

            <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Planned Targets */}
              {selectedDayDetail.slots.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🎯 Planned Schedule Targets
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDayDetail.slots.map((slot, sIdx) => {
                      const isSpecial = (slot.time_window || '').includes('04:00PM') || (slot.notes || '').toLowerCase().includes('payday');
                      const typeInfo = getContentTypeInfo(slot.content_type, isSpecial);
                      const cardStyle = getSlotCardStyle(slot);
                      const IconComp = typeInfo.icon;

                      return (
                        <div
                          key={`modal-slot-${slot.id || sIdx}`}
                          style={{
                            backgroundColor: cardStyle.cardBg,
                            border: cardStyle.cardBorder,
                            borderRadius: '8px',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: cardStyle.isDashed ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: cardStyle.isDashed ? '#f1f5f9' : cardStyle.badgeBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <IconComp size={16} color={cardStyle.isDashed ? typeInfo.color : '#ffffff'} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.4px', textTransform: 'uppercase', color: '#64748b' }}>
                                  [{slot.brand_name || 'Brand'}]
                                </span>
                                <span style={{
                                  backgroundColor: cardStyle.badgeBg,
                                  color: cardStyle.badgeColor,
                                  fontSize: '9.5px',
                                  fontWeight: '700',
                                  padding: '1px 7px',
                                  borderRadius: '9999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  textTransform: 'uppercase',
                                  border: cardStyle.isDashed ? '1px solid #cbd5e1' : 'none',
                                }}>
                                  {cardStyle.badgeIcon === 'check' && <Check size={9} strokeWidth={3} />}
                                  {cardStyle.badgeIcon === 'clock' && <Clock size={9} strokeWidth={2.5} />}
                                  {cardStyle.badgeIcon === 'alert' && <AlertTriangle size={9} strokeWidth={2.5} />}
                                  <span>{cardStyle.badgeText}</span>
                                </span>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px', color: '#0f172a' }}>
                                {typeInfo.label} {slot.time_window ? `(${slot.time_window})` : ''}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDayDetail(null);
                              if (slot.linked_post?.id) {
                                navigate(`/planner/edit/${slot.linked_post.id}`);
                              } else {
                                navigate(`/planner/create?date=${selectedDayDetail.dateKey}`, {
                                  state: {
                                    returnPath: '/calendar',
                                    defaultBrandId: slot.brand_id,
                                    defaultContentType: slot.content_type,
                                    defaultTime: slot.time_window,
                                    plannedSlotId: slot.id,
                                  }
                                });
                              }
                            }}
                            style={{
                              backgroundColor: slot.linked_post?.id ? '#ecfdf5' : '#ffffff',
                              color: slot.linked_post?.id ? '#059669' : '#2563eb',
                              border: slot.linked_post?.id ? '1px solid #10b981' : '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '7px 14px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                          >
                            {slot.linked_post?.id ? 'View Post' : '+ Create Post'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDayDetail.slots.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                    No client deliverables scheduled for this day.
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    General store posts and non-brand organic content are managed on the <strong>Planner</strong> page.
                  </p>
                </div>
              )}

              {/* Related Delivered Brand Posts */}
              {(() => {
                const brandPosts = (selectedDayDetail.posts || []).filter(p => p.brand_id || selectedDayDetail.slots.some(s => s.linked_post?.id === p.id));
                if (brandPosts.length === 0) return null;

                return (
                  <div style={{ marginTop: selectedDayDetail.slots.length > 0 ? '16px' : '0' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📄 Delivered Brand Posts ({brandPosts.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            style={{
                              padding: '10px 14px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#eff6ff';
                              e.currentTarget.style.borderColor = '#bfdbfe';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              {thumb ? (
                                <SafeImage
                                  src={thumb}
                                  alt="thumb"
                                  style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                                />
                              ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Tag size={16} color="#64748b" />
                                </div>
                              )}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {namePart}
                                  </span>
                                  {timeStr && (
                                    <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Clock size={11} /> {timeStr}
                                    </span>
                                  )}
                                </div>
                                {p.message && (
                                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {fbUrl && fbUrl !== '#' && (
                                <a
                                  href={fbUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    padding: '6px',
                                    color: '#1877f2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '6px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0'
                                  }}
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

