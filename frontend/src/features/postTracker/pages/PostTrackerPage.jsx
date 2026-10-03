import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePostTracker } from '../hooks/usePostTracker';
import { PostStatusBadge } from '../components/PostStatusBadge';
import { InsightPanel } from '../components/InsightPanel';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { PublishConfirmModal } from '../components/PublishConfirmModal';
import { DuplicatePostModal } from '../components/DuplicatePostModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { POST_STATUS } from '../constants';
import { Search, Filter, Calendar, ExternalLink, RefreshCw, BarChart2, DollarSign, Image as ImageIcon, Heart, MessageCircle, Share2, Edit2, Trash2, ChevronLeft, ChevronRight, Users, ChevronDown, Eye, TrendingUp, Send, Award, RotateCcw, Check, Sparkles, X, Copy } from 'lucide-react';
import { FaFacebook, FaTiktok, FaInstagram } from 'react-icons/fa';

import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { PostTrackerTableSkeleton, PostTrackerMobileSkeleton } from '../../../shared/components/skeletons';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { SortableHeader } from '../../../shared/components/ui/SortableHeader';
import { useSortableTable } from '../../../shared/hooks/useSortableTable';
import { DateRangeFilter, isPostInDateRange } from '../../../shared/components/ui/DateRangeFilter';
import axios from 'axios';
import api from '../../../shared/utils/apiClient';
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';

const FacebookIcon = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms', icon: <Sparkles size={14} color="#64748b" /> },
  { value: 'facebook', label: 'Facebook', icon: <FaFacebook size={14} color="#1877F2" /> },
  { value: 'tiktok', label: 'TikTok', icon: <FaTiktok size={14} color="#000000" /> },
  { value: 'instagram', label: 'Instagram', icon: <FaInstagram size={14} color="#E1306C" /> },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses', icon: <Sparkles size={14} color="#64748b" /> },
  { value: 'published', label: 'Published', icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} /> },
  { value: 'scheduled', label: 'Scheduled', icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} /> },
  { value: 'failed', label: 'Failed', icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} /> },
  { value: 'archived', label: 'Archived', icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8', display: 'inline-block' }} /> },
];

const FilterDropdown = ({ icon: Icon, value, options, onChange, minWidth = '130px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];
  const isFiltered = value !== 'all';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: isFiltered ? '1px solid #93c5fd' : '1px solid #e2e8f0',
          fontSize: '13px',
          backgroundColor: isFiltered ? '#eff6ff' : 'white',
          color: isFiltered ? '#1d4ed8' : '#334155',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth,
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          whiteSpace: 'nowrap',
          fontWeight: isFiltered ? 600 : 500,
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedOption.icon ? (
            selectedOption.icon
          ) : Icon ? (
            <Icon size={14} style={{ color: isFiltered ? '#2563eb' : '#64748b' }} />
          ) : null}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: isFiltered ? '#2563eb' : '#94a3b8',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 12px -4px rgba(0, 0, 0, 0.06)',
            minWidth: '180px',
            zIndex: 100,
            overflow: 'hidden',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: isSelected ? '#1d4ed8' : '#334155',
                  backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {option.icon}
                  <span>{option.label}</span>
                </div>
                {isSelected && <Check size={14} color="#2563eb" strokeWidth={2.5} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PostTrackerPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRange = searchParams.get('range') || 'this_month';
  const urlStart = searchParams.get('start') || '';
  const urlEnd = searchParams.get('end') || '';

  const [dateFilter, setDateFilter] = useState(urlRange);
  const [customDateRange, setCustomDateRange] = useState({ start: urlStart, end: urlEnd });

  const queryParams = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
    return {
      range: dateFilter,
      startDate: customDateRange.start || undefined,
      endDate: customDateRange.end || undefined,
      timezone: tz
    };
  }, [dateFilter, customDateRange]);

  const { posts, loading, error, updatePost, deletePost, publishNow, reload, triggerSync } = usePostTracker(queryParams);
  const [publishingId, setPublishingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [postToPublish, setPostToPublish] = useState(null);
  const [postToDuplicate, setPostToDuplicate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [postsProfit, setPostsProfit] = useState({});

  useEffect(() => {
    reload(queryParams);
  }, [queryParams, reload]);

  const handleDateFilterChange = (newVal) => {
    setDateFilter(newVal);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (newVal === 'this_month') {
      params.delete('range');
      params.delete('start');
      params.delete('end');
    } else {
      params.set('range', newVal);
      if (newVal !== 'custom') {
        params.delete('start');
        params.delete('end');
      }
    }
    setSearchParams(params, { replace: true });
  };

  const handleCustomRangeChange = (range) => {
    setCustomDateRange(range);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    if (range.start) params.set('start', range.start);
    else params.delete('start');
    if (range.end) params.set('end', range.end);
    else params.delete('end');
    setSearchParams(params, { replace: true });
  };

  const handlePostClick = (post) => {
    if (post.status === POST_STATUS.PUBLISHED) {
      const url = getFacebookPostUrl(post.fb_post_id, post.post_url, post.page_id || post.fb_page_id);
      if (url && url !== '#') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('This post is marked as published, but no Facebook post link is available.');
      }
    } else {
      // Not yet posted -> ask if you want to publish now!
      setPostToPublish(post);
    }
  };

  const handlePublishConfirm = async (postId) => {
    try {
      setPublishingId(postId);
      await publishNow(postId);
    } finally {
      setPublishingId(null);
    }
  };

  useEffect(() => {
    const fetchProfit = async () => {
      try {
        const rangeParam = dateFilter === 'all' ? 'all' : dateFilter;
        const res = await api.get(`/profit/dashboard?range=${rangeParam}`);
        if (res.data && res.data.data && res.data.data.all_posts_profit) {
          const profitMap = {};
          res.data.data.all_posts_profit.forEach(p => {
            profitMap[p.post_id] = p;
          });
          setPostsProfit(profitMap);
        }
      } catch (err) {
        console.error('Failed to load profit data for posts', err);
      }
    };
    if (posts && posts.length > 0) {
      fetchProfit();
    }
  }, [posts, dateFilter]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    return posts.filter(post => {
      // 1. Search across product name, brand name, page name, message, ID
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || (
        post.product_name?.toLowerCase().includes(q) ||
        post.brand_name?.toLowerCase().includes(q) ||
        post.page_name?.toLowerCase().includes(q) ||
        post.message?.toLowerCase().includes(q) ||
        String(post.id).includes(q) ||
        (post.fb_post_id && String(post.fb_post_id).toLowerCase().includes(q))
      );

      // 2. Status filter
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;

      // 3. Platform filter
      let matchesPlatform = true;
      if (platformFilter !== 'all') {
        const p = (post.platform || 'facebook').toLowerCase();
        const target = platformFilter.toLowerCase();
        matchesPlatform = (target === 'facebook' || target === 'fb')
          ? (p === 'facebook' || p === 'fb')
          : p === target;
      }

      // 4. Date filter (Using robust isPostInDateRange with start/end of day and all post date fields)
      const matchesDate = isPostInDateRange(post, dateFilter, customDateRange.start, customDateRange.end);

      return matchesSearch && matchesStatus && matchesPlatform && matchesDate;
    });
  }, [posts, searchTerm, statusFilter, platformFilter, dateFilter, customDateRange]);

  const isAnyFilterActive = searchTerm !== '' || statusFilter !== 'all' || platformFilter !== 'all' || dateFilter !== 'this_month' || customDateRange.start !== '' || customDateRange.end !== '';

  const resetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPlatformFilter('all');
    setDateFilter('this_month');
    setCustomDateRange({ start: '', end: '' });
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const customAccessors = useMemo(() => ({
    post_content: (p) => (p.brand_name || p.product_name || '').toLowerCase(),
    platform: (p) => (p.platform || 'facebook').toLowerCase(),
    status: (p) => (p.status || 'scheduled').toLowerCase(),
    dates: (p) => (p.published_time ? new Date(p.published_time).getTime() : (p.scheduled_time ? new Date(p.scheduled_time).getTime() : 0)),
    views_count: (p) => Number(p.views_count) || 0,
    reach_count: (p) => Number(p.reach_count) || 0,
    engagements: (p) => (Number(p.likes_count) || 0) + (Number(p.comments_count) || 0) + (Number(p.shares_count) || 0),
    costs: (p) => (parseFloat(p.content_cost) || 0) + (parseFloat(p.ad_spend) || 0),
    revenue: (p) => (postsProfit[p.id]?.revenue !== undefined ? postsProfit[p.id].revenue : 0),
    profit: (p) => {
      const profitData = postsProfit[p.id];
      const totalCost = (parseFloat(p.content_cost) || 0) + (parseFloat(p.ad_spend) || 0);
      const revenue = profitData?.revenue !== undefined ? profitData.revenue : 0;
      return profitData?.net_profit !== undefined ? profitData.net_profit : (revenue - totalCost);
    },
  }), [postsProfit]);

  const { sortedItems: sortedPosts, sortConfig, requestSort } = useSortableTable(
    filteredPosts,
    { key: 'dates', direction: 'desc' },
    customAccessors
  );

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / rowsPerPage));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedPosts.slice(start, start + rowsPerPage);
  }, [sortedPosts, currentPage, rowsPerPage]);

  const summary = useMemo(() => {
    if (!posts) return { total: 0, views: 0, reach: 0, engagements: 0 };
    return posts.reduce((acc, post) => {
      acc.total += 1;
      acc.views += parseInt(post.views_count) || 0;
      acc.reach += parseInt(post.reach_count) || 0;
      acc.engagements += (parseInt(post.likes_count) || 0) + (parseInt(post.comments_count) || 0) + (parseInt(post.shares_count) || 0);
      return acc;
    }, { total: 0, views: 0, reach: 0, engagements: 0 });
  }, [posts]);

  const handleDeletePost = async (id) => {
    try {
      await deletePost(id);
    } catch (err) {
      throw err;
    }
  };

  if (error) return <div className="alert-error-banner" style={{ margin: '24px' }}>Error: {error}</div>;

  return (
    <div>
      <div className="tasks-page-header" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ margin: '0', fontSize: '24px', textAlign: "left", alignSelf: "start" }}>Moon Pulse Tracker</h1>

        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '16px 24px', flexWrap: 'wrap', gap: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' }}>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              <Eye size={16} color="#3b82f6" /> Total Views
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
              {summary.views.toLocaleString()}
            </div>
          </div>

          <div className="desktop-only" style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }}></div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              <Users size={16} color="#8b5cf6" /> Total Reach
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
              {summary.reach.toLocaleString()}
            </div>
          </div>

          <div className="desktop-only" style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }}></div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              <TrendingUp size={16} color="#ef4444" /> Avg. Engagement
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
              {summary.reach > 0 ? ((summary.engagements / summary.reach) * 100).toFixed(1) : '0.0'}%
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: "center", alignSelf: "end" }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', opacity: isSyncing ? 0.7 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer' }} disabled={isSyncing} onClick={async () => {
            setIsSyncing(true);
            await triggerSync();
            setIsSyncing(false);
          }}>
            <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} /> {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            className="btn-primary"
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/tasks/create')}
          >
            <Send size={15} /> Create & Schedule Post
          </button>
        </div>
      </div>

      <div className="table-card" style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff'
      }}>
        <div className="toolbar-header-row" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by product or page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '13px', width: '100%', padding: '10px 16px 10px 40px', borderRadius: '24px', border: '1px solid var(--border-color)' }}
            />
          </div>

          <div className="toolbar-filter-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <FilterDropdown
              value={platformFilter}
              options={PLATFORM_OPTIONS}
              onChange={(val) => { setPlatformFilter(val); setCurrentPage(1); }}
              minWidth="140px"
            />
            <DateRangeFilter
              value={dateFilter}
              onChange={handleDateFilterChange}
              customRange={customDateRange}
              onCustomRangeChange={handleCustomRangeChange}
              minWidth="150px"
            />
            <FilterDropdown
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
              minWidth="135px"
            />
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '7px 11px',
                  fontSize: '12px',
                  color: '#ef4444',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
                title="Reset all active filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="desktop-only" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <SortableHeader label="Post Content" sortKey="post_content" currentSort={sortConfig} onSort={requestSort} thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Platform" sortKey="platform" currentSort={sortConfig} onSort={requestSort} align="center" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={requestSort} thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Dates" sortKey="dates" currentSort={sortConfig} onSort={requestSort} defaultDirection="desc" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '140px', whiteSpace: 'nowrap' }} />
                <SortableHeader label="Views" sortKey="views_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Reach" sortKey="reach_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Engagements" sortKey="engagements" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Costs" sortKey="costs" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Revenue" sortKey="revenue" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <SortableHeader label="Est. Profit" sortKey="profit" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <th style={{ padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (!posts || posts.length === 0) ? (
                <PostTrackerTableSkeleton rowCount={5} />
              ) : paginatedPosts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <tr
                    className="post-tracker-row"
                    style={{
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          backgroundColor: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                        }}>
                          <SafeImage
                            src={post.thumbnail_url || post.media_url || post.product_image || `https://ui-avatars.com/api/?name=${post.product_name || 'PR'}&background=c7d2fe&color=3730a3&rounded=false`}
                            poster={post.thumbnail_url}
                            alt={post.product_name || 'product'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fallbackText=""
                          />
                        </div>
                        <div>
                          <div
                            style={{ fontWeight: 600, color: "var(--text-main)", fontSize: '14px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            {post.tracking_type === 'brand' || (!post.product_id && post.brand_id) ? (
                              <>
                                <span style={{ color: '#16a34a' }}>Brand: </span>
                                <span
                                  className="post-tracker-clickable-name"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePostClick(post);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.stopPropagation();
                                      handlePostClick(post);
                                    }
                                  }}
                                  title={
                                    post.status === POST_STATUS.PUBLISHED
                                      ? 'Click to open this post on Facebook'
                                      : 'Click to publish this post to Facebook now'
                                  }
                                  style={{ fontSize: "16px" }}
                                >
                                  {post.brand_name || post.product_name || 'Brand Catalog'}
                                </span>
                              </>
                            ) : (
                              <span
                                className="post-tracker-clickable-name"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePostClick(post);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.stopPropagation();
                                    handlePostClick(post);
                                  }
                                }}
                                title={
                                  post.status === POST_STATUS.PUBLISHED
                                    ? 'Click to open this post on Facebook'
                                    : 'Click to publish this post to Facebook now'
                                }
                                style={{ fontSize: "16px" }}
                              >
                                {post.product_name || `Target #${post.product_id || post.brand_id}`}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{post.page_name || post.page_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FacebookIcon size={24} />
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}><PostStatusBadge status={post.status} /></td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                          {post.published_time
                            ? new Date(post.published_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : post.scheduled_time
                              ? new Date(post.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '-'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          color: post.status === 'failed' ? '#dc2626' : post.status === 'scheduled' ? '#d97706' : '#94a3b8'
                        }}>
                          {post.status === 'failed'
                            ? <span title={post.publish_error || 'Publishing failed'} style={{ cursor: 'help' }}>⚠️ {post.publish_error ? (post.publish_error.length > 35 ? post.publish_error.slice(0, 35) + '…' : post.publish_error) : 'Failed'}</span>
                            : post.published_time
                              ? new Date(post.published_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                              : post.scheduled_time
                                ? `⏰ ${new Date(post.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                                : 'Pending'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#6366f1' }}>
                        {post.views_count ? post.views_count.toLocaleString() : '-'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0ea5e9' }}>
                        {post.reach_count ? post.reach_count.toLocaleString() : '-'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', fontSize: '13px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Likes"><Heart size={14} color="#f43f5e" /> {post.likes_count || 0}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Comments"><MessageCircle size={14} color="#f59e0b" /> {post.comments_count || 0}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Shares"><Share2 size={14} color="#10b981" /> {post.shares_count || 0}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                          ${((parseFloat(post.content_cost) || 0) + (parseFloat(post.ad_spend) || 0)).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Content: ${parseFloat(post.content_cost || 0).toFixed(0)} | Ads: ${parseFloat(post.ad_spend || 0).toFixed(0)}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                        ${(postsProfit[post.id]?.revenue !== undefined ? postsProfit[post.id].revenue : 0).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      {(() => {
                        const profitData = postsProfit[post.id];
                        const totalCost = (parseFloat(post.content_cost) || 0) + (parseFloat(post.ad_spend) || 0);
                        const revenue = profitData?.revenue !== undefined ? profitData.revenue : 0;
                        const netProfit = profitData?.net_profit !== undefined ? profitData.net_profit : (revenue - totalCost);
                        const roi = profitData?.roi !== undefined
                          ? profitData.roi
                          : (totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : 0);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                              {netProfit < 0 ? `-$${Math.abs(netProfit).toFixed(2)}` : `$${netProfit.toFixed(2)}`}
                            </div>
                            {totalCost > 0 && (
                              <div style={{
                                fontSize: '11px',
                                color: roi >= 0 ? '#10b981' : '#ef4444',
                                fontWeight: 600,
                                backgroundColor: roi >= 0 ? '#d1fae5' : '#fee2e2',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {roi >= 0 ? '+' : ''}{Math.round(roi)}% ROI
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {post.status !== POST_STATUS.PUBLISHED && (
                          <button
                            title={post.status === 'failed' ? 'Retry Publishing to Facebook' : 'Publish to Facebook Now'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPostToPublish(post);
                            }}
                            disabled={publishingId === post.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              color: '#16a34a',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              cursor: publishingId === post.id ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Send size={13} className={publishingId === post.id ? 'spin-animation' : ''} />
                          </button>
                        )}
                        {post.status === POST_STATUS.PUBLISHED && (post.fb_post_id || post.post_url) && (
                          <a
                            href={getFacebookPostUrl(post.fb_post_id, post.post_url, post.page_id || post.fb_page_id)}
                            target="_blank"
                            rel="noreferrer"
                            title="Visit Facebook Post"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#3b82f6', backgroundColor: '#eff6ff', transition: 'all 0.2s' }}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          title="Edit Post"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/edit/${post.id}`);
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#64748b', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          title="Duplicate / Repost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPostToDuplicate(post);
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          title="Delete Post"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPostToDelete(post);
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              {!loading && filteredPosts.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>No posts found</span>
                      <span style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '360px' }}>
                        No content matches your current search or date criteria. Try adjusting or clearing your filters.
                      </span>
                      {isAnyFilterActive && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          style={{
                            marginTop: '6px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="mobile-only" style={{ padding: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && (!posts || posts.length === 0) ? (
            <PostTrackerMobileSkeleton cardCount={6} />
          ) : paginatedPosts.map((post) => {
            const profitData = postsProfit[post.id];
            const totalCost = (parseFloat(post.content_cost) || 0) + (parseFloat(post.ad_spend) || 0);
            const revenue = profitData?.revenue !== undefined ? profitData.revenue : 0;
            const netProfit = profitData?.net_profit !== undefined ? profitData.net_profit : (revenue - totalCost);
            const roi = profitData?.roi !== undefined
              ? profitData.roi
              : (totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : 0);

            return (
              <div
                key={`mob-${post.id}`}
                className="task-mobile-card"
              >
                {/* Header */}
                <div className="task-mob-header">
                  <div className="task-mob-product-wrap">
                    <div className="task-mob-thumb">
                      <SafeImage
                        src={post.thumbnail_url || post.media_url || post.product_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`}
                        poster={post.thumbnail_url}
                        alt={post.product_name || 'product'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        fallbackText=""
                      />
                    </div>
                    <div className="task-mob-info">
                      <div className="task-mob-title">
                        {post.tracking_type === 'brand' || (!post.product_id && post.brand_id) ? (
                          <>
                            <span style={{ color: '#16a34a' }}>Brand: </span>
                            <span
                              className="post-tracker-clickable-name"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePostClick(post);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation();
                                  handlePostClick(post);
                                }
                              }}
                              title={
                                post.status === POST_STATUS.PUBLISHED
                                  ? 'Tap to view this post on Facebook'
                                  : 'Tap to publish this post to Facebook now'
                              }
                            >
                              {post.brand_name || post.product_name || 'Brand Catalog'}
                            </span>
                          </>
                        ) : (
                          <span
                            className="post-tracker-clickable-name"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePostClick(post);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                handlePostClick(post);
                              }
                            }}
                            title={
                              post.status === POST_STATUS.PUBLISHED
                                ? 'Tap to view this post on Facebook'
                                : 'Tap to publish this post to Facebook now'
                            }
                          >
                            {post.product_name || `Target #${post.product_id || post.brand_id}`}
                          </span>
                        )}
                      </div>
                      <div className="task-mob-sub">
                        <FacebookIcon size={13} />
                        <span>{post.page_name || post.page_id}</span>
                      </div>
                    </div>
                  </div>
                  <PostStatusBadge status={post.status} />
                </div>

                {/* Metrics Grid */}
                <div className="task-mob-metrics-grid">
                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Views / Reach</span>
                    <span className="task-mob-metric-val">
                      <span style={{ color: '#6366f1' }}>{post.views_count ? post.views_count.toLocaleString() : '0'}</span>
                      <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                      <span style={{ color: '#0ea5e9' }}>{post.reach_count ? post.reach_count.toLocaleString() : '0'}</span>
                    </span>
                  </div>

                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Engagements</span>
                    <div className="task-mob-engagements">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Heart size={11} color="#f43f5e" /> {post.likes_count || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MessageCircle size={11} color="#f59e0b" /> {post.comments_count || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Share2 size={11} color="#10b981" /> {post.shares_count || 0}</span>
                    </div>
                  </div>

                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Cost / Revenue</span>
                    <span className="task-mob-metric-val">
                      ${totalCost.toFixed(0)}
                      <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                      <span style={{ color: '#10b981' }}>${revenue.toFixed(0)}</span>
                    </span>
                  </div>

                  <div className="task-mob-metric-cell">
                    <span className="task-mob-metric-lbl">Net Profit / ROI</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                        {netProfit < 0 ? `-$${Math.abs(netProfit).toFixed(2)}` : `$${netProfit.toFixed(2)}`}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor: roi >= 0 ? '#ecfdf5' : '#fee2e2',
                        color: roi >= 0 ? '#059669' : '#dc2626'
                      }}>
                        {roi >= 0 ? `+${roi.toFixed(0)}%` : `${roi.toFixed(0)}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Date & Actions */}
                <div className="task-mob-footer">
                  <div className="task-mob-date">
                    <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {post.published_time
                      ? new Date(post.published_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : post.scheduled_time
                        ? `⏰ ${new Date(post.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Pending'}
                  </div>
                  <div className="task-mob-actions" onClick={(e) => e.stopPropagation()}>
                    {post.status !== POST_STATUS.PUBLISHED && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPostToPublish(post);
                        }}
                        className="btn-icon-action"
                        title="Publish to Facebook Now"
                        style={{ color: '#16a34a' }}
                      >
                        <Send size={14} />
                      </button>
                    )}
                    {(post.post_url || post.fb_post_id) && post.status === POST_STATUS.PUBLISHED && (
                      <a href={getFacebookPostUrl(post.fb_post_id, post.post_url, post.page_id || post.fb_page_id)} target="_blank" rel="noopener noreferrer" className="btn-icon-action" title="View on FB" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/tasks/edit/${post.id}`); }} className="btn-icon-action" title="Edit Post">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPostToDuplicate(post);
                      }}
                      className="btn-icon-action"
                      title="Duplicate Post"
                      style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}
                    >
                      <Copy size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setPostToDelete(post); }} className="btn-icon-action delete" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && filteredPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
              No posts matched your criteria.
            </div>
          )}
        </div>

        {filteredPosts.length > 0 && (
          <div className="tasks-pagination-bar" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'white', color: '#334155', fontWeight: 500 }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b' }}>
              <span>
                {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, filteredPosts.length)} of {filteredPosts.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#94a3b8' : '#334155' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{ padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#94a3b8' : '#334155' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        post={postToDelete}
        onConfirm={handleDeletePost}
      />

      <PublishConfirmModal
        isOpen={!!postToPublish}
        onClose={() => setPostToPublish(null)}
        post={postToPublish}
        onConfirm={handlePublishConfirm}
      />

      <DuplicatePostModal
        isOpen={!!postToDuplicate}
        onClose={() => setPostToDuplicate(null)}
        post={postToDuplicate}
        onSuccess={() => reload(queryParams)}
        onCustomize={(p) => navigate('/tasks/create', { state: { duplicatePost: p } })}
      />
    </div>
  );
};
