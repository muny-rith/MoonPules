import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart2, Package, Calendar, ExternalLink, ArrowLeft, Tag, Search,
  RefreshCw, ChevronDown, Filter, Eye, Heart, MessageCircle, Share2, Trophy, Download, X,
  CheckSquare, Square, BarChart, Layers, Image, Video, Radio, Globe, RotateCcw, Smartphone
} from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { getBrandDetail } from '../services/brandStatsService';
import { BrandInsightsChart } from '../components/BrandInsightsChart';
import { syncPosts } from '../../postTracker/api/postTrackerApi';
import { ExportModal } from '../components/ExportModal';

export const BrandDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Multi-Filter States
  const [openDropdown, setOpenDropdown] = useState(null); // 'time' | 'platform' | 'page' | 'product' | 'format' | null
  const [timeFilter, setTimeFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [pageFilter, setPageFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const filterToolbarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterToolbarRef.current && !filterToolbarRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    setOpenDropdown(prev => prev === name ? null : name);
  };

  const filterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last_3_months', label: 'Last 3 Months' }
  ];

  const platformOptions = [
    { value: 'all', label: 'All Platforms', isAll: true },
    { value: 'facebook', label: 'Facebook', isFb: true },
    { value: 'tiktok', label: 'TikTok', isTiktok: true }
  ];

  const formatOptions = [
    { value: 'all', label: 'All Formats', icon: Layers },
    { value: 'photo', label: 'Photo / Album', icon: Image },
    { value: 'video', label: 'Video / Reel', icon: Video },
    { value: 'live', label: 'Live Stream', icon: Radio },
  ];

  // Dynamically derive available pages from brand posts
  const availablePages = useMemo(() => {
    if (!detail || !detail.posts) return [];
    const map = new Map();
    detail.posts.forEach(p => {
      if (p.page_id && p.page_name && !map.has(String(p.page_id))) {
        map.set(String(p.page_id), {
          id: String(p.page_id),
          name: p.page_name,
          platform: p.platform || 'facebook'
        });
      }
    });
    let pages = Array.from(map.values());
    if (platformFilter !== 'all') {
      pages = pages.filter(pg => pg.platform.toLowerCase() === platformFilter.toLowerCase());
    }
    return pages;
  }, [detail, platformFilter]);

  // Dynamically derive products from brand details
  const availableProducts = useMemo(() => {
    if (!detail || !detail.products) return [];
    return detail.products.map(prod => ({
      id: String(prod.id),
      name: prod.product_name,
      image: prod.image_url
    }));
  }, [detail]);

  const currentFilterLabel = filterOptions.find(o => o.value === timeFilter)?.label || 'All Time';
  const currentPlatformLabel = platformOptions.find(o => o.value === platformFilter)?.label || 'All Platforms';
  const currentPageLabel = pageFilter === 'all'
    ? 'All Pages'
    : (availablePages.find(p => p.id === String(pageFilter))?.name || 'Selected Page');
  const currentProductLabel = productFilter === 'all'
    ? 'All Products'
    : (availableProducts.find(p => p.id === String(productFilter))?.name || 'Selected Product');
  const currentFormatLabel = formatOptions.find(f => f.value === formatFilter)?.label || 'All Formats';

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getBrandDetail(id);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch brand details');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncPosts();
      await fetchDetail();
    } catch (err) {
      console.error('Failed to sync posts', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Helper: get date range from filter value
  const getDateRange = (filter) => {
    const now = new Date();
    switch (filter) {
      case 'this_week': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Sunday
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      }
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
      }
      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start, end };
      }
      case 'last_3_months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return { start, end: now };
      }
      default:
        return null; // all time
    }
  };

  const resetAllFilters = () => {
    setTimeFilter('all');
    setPlatformFilter('all');
    setPageFilter('all');
    setProductFilter('all');
    setFormatFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters = timeFilter !== 'all' || platformFilter !== 'all' || pageFilter !== 'all' || productFilter !== 'all' || formatFilter !== 'all' || searchTerm !== '';

  const filteredPosts = useMemo(() => {
    if (!detail || !detail.posts) return [];
    let posts = detail.posts.filter(p => p.status === 'published' || p.published_time);

    // 1. Time filter
    const range = getDateRange(timeFilter);
    if (range) {
      posts = posts.filter(p => {
        const timestamp = p.published_time;
        if (!timestamp) return false;
        const d = new Date(timestamp);
        return d >= range.start && d <= range.end;
      });
    }

    // 2. Platform filter
    if (platformFilter !== 'all') {
      posts = posts.filter(p => (p.platform || 'facebook').toLowerCase() === platformFilter.toLowerCase());
    }

    // 3. Page filter
    if (pageFilter !== 'all') {
      posts = posts.filter(p => String(p.page_id) === String(pageFilter));
    }

    // 4. Product filter (Choice 2)
    if (productFilter !== 'all') {
      posts = posts.filter(p => String(p.product_id) === String(productFilter));
    }

    // 5. Content Format filter (Choice 5)
    if (formatFilter !== 'all') {
      posts = posts.filter(p => {
        const m = (p.media_type || 'photo').toLowerCase();
        if (formatFilter === 'video') return m === 'video' || m === 'reel';
        return m === formatFilter.toLowerCase();
      });
    }

    // 6. Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      posts = posts.filter(p =>
        (p.product_name && p.product_name.toLowerCase().includes(q)) ||
        (p.page_name && p.page_name.toLowerCase().includes(q)) ||
        (p.fb_post_id && p.fb_post_id.toLowerCase().includes(q))
      );
    }

    return posts;
  }, [detail, timeFilter, platformFilter, pageFilter, productFilter, formatFilter, searchTerm]);

  const { exportStart, exportEnd } = useMemo(() => {
    const KHMER_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    const formatDateKhmer = (d) => {
      if (isNaN(d.getTime())) return '';
      return `${d.getDate()} ${KHMER_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    };

    const range = getDateRange(timeFilter);
    if (range) {
      return {
        exportStart: formatDateKhmer(range.start),
        exportEnd: formatDateKhmer(range.end)
      };
    }
    if (filteredPosts && filteredPosts.length > 0) {
      const dates = filteredPosts.map(p => new Date(p.published_time || p.scheduled_time)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        return {
          exportStart: formatDateKhmer(new Date(Math.min(...dates))),
          exportEnd: formatDateKhmer(new Date(Math.max(...dates)))
        };
      }
    }
    return { exportStart: 'N/A', exportEnd: 'N/A' };
  }, [timeFilter, filteredPosts]);

  const topPost = useMemo(() => {
    if (!filteredPosts || filteredPosts.length === 0) return null;
    return [...filteredPosts].sort((a, b) => {
      // Sort by engagement rate first, then views
      const aEng = a.reach_count ? ((a.likes_count + a.comments_count + a.shares_count) / a.reach_count) : 0;
      const bEng = b.reach_count ? ((b.likes_count + b.comments_count + b.shares_count) / b.reach_count) : 0;
      if (bEng !== aEng) return bEng - aEng;
      return (b.views_count || 0) - (a.views_count || 0);
    })[0];
  }, [filteredPosts]);


  const getFormatBadge = (mediaType) => {
    const m = (mediaType || 'photo').toLowerCase();
    if (m === 'video') {
      return <span className="format-pill-tag format-video"><Video size={11} /> Video</span>;
    }
    if (m === 'reel') {
      return <span className="format-pill-tag format-reel"><Smartphone size={11} /> Reel</span>;
    }
    if (m === 'live') {
      return <span className="format-pill-tag format-live"><Radio size={11} /> Live</span>;
    }
    return <span className="format-pill-tag format-photo"><Image size={11} /> Photo</span>;
  };

  const getChannelBadge = (post) => {
    const platform = (post.platform || 'facebook').toLowerCase();
    const pageName = post.page_name || 'Facebook Page';
    return (
      <span className="channel-page-badge" title={`${pageName} (${platform})`}>
        {platform === 'tiktok' ? (
          <svg style={{ flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46v-7.05a8.28 8.28 0 0 0 5.77 2.29V11.9a4.84 4.84 0 0 1-3-1.07 4.82 4.82 0 0 1-1.39-2.14h4.39v-2z"/></svg>
        ) : (
          <svg style={{ flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        )}
        <span>{pageName}</span>
      </span>
    );
  };

  const handleSelectPost = (postId) => {
    setSelectedPosts(prev => {
      if (prev.includes(postId)) return prev.filter(id => id !== postId);
      if (prev.length >= 2) return [prev[1], postId];
      return [...prev, postId];
    });
  };

  const getEngagementRate = (post) => {
    if (!post || !post.reach_count) return 0;
    return (((post.likes_count + post.comments_count + post.shares_count) / post.reach_count) * 100).toFixed(1);
  };

  const handleExportCSV = () => {
    if (!filteredPosts || filteredPosts.length === 0) return;
    const headers = ['Linked Product', 'Platform', 'Page', 'Format', 'Published Date', 'Views', 'Reach', 'Likes', 'Comments', 'Shares', 'FB Post ID'];
    const rows = filteredPosts.map(p => [
      `"${(p.product_name || '').replace(/"/g, '""')}"`,
      p.platform || 'facebook',
      `"${(p.page_name || '').replace(/"/g, '""')}"`,
      p.media_type || 'photo',
      p.published_time ? new Date(p.published_time).toISOString() : '',
      p.views_count || 0,
      p.reach_count || 0,
      p.likes_count || 0,
      p.comments_count || 0,
      p.shares_count || 0,
      p.fb_post_id
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(detail.brand_name || 'Brand').replace(/\s+/g, '_')}_Analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="product-page-container">
      {/* Breadcrumb & Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/stats/brands')}
          className="btn-secondary"
          style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
          title="Back to Brands"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="page-breadcrumb" style={{ margin: 0 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/stats/brands')}>Brands</span> / <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Detail</span>
        </div>
      </div>

      {error && (
        <div className="alert-error-banner">
          <span>Error loading details: {error}</span>
        </div>
      )}

      {loading ? (
        <>
          {/* Skeleton Hero Header */}
          <div className="brand-hero-card" style={{ marginBottom: '24px', padding: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <div className="hero-brand-info">
              <Skeleton width={64} height={64} borderRadius={16} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Skeleton width="200px" height={28} />
                <div style={{ display: 'flex', gap: '16px' }}>
                  <Skeleton width="120px" height={16} />
                  <Skeleton width="120px" height={16} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Skeleton width="100px" height={36} borderRadius={8} />
              <Skeleton width="100px" height={36} borderRadius={8} />
            </div>
          </div>

          {/* Skeleton Analytics Panel */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <Skeleton width="200px" height={24} />
              <Skeleton width="140px" height={36} borderRadius={8} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <Skeleton width="100%" height={240} borderRadius={12} />
              <Skeleton width="100%" height={120} borderRadius={12} />
            </div>
          </div>
        </>
      ) : detail && (
        <>
          {/* Hero Header with Overview Integrated */}
          <div className="card" style={{ marginBottom: '24px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflow: 'hidden' }}>
            {/* Subtle background decoration */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100px', background: 'linear-gradient(to right, #eff6ff, #f8fafc)', zIndex: 0 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', zIndex: 1 }}>

              {/* Brand Info (Left) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.02)' }}>
                  <img
                    src={detail.logo_url || detail.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.brand_name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`}
                    alt={detail.brand_name}
                    style={{ width: '84px', height: '84px', borderRadius: '14px', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {detail.brand_name}
                    </h1>
                    {detail.total_products > 0 && (
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#64748b', fontSize: '14px', fontWeight: '500', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={16} color="#94a3b8" /> {detail.total_products} Linked Products
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart2 size={16} color="#94a3b8" /> {detail.total_posts} Published Posts
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Right) */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', backgroundColor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => setShowExportModal(true)}>
                  <Download size={16} /> Export
                </button>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', backgroundColor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: isSyncing ? 0.7 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer' }} onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw size={16} className={isSyncing ? "spin-animation" : ""} /> {isSyncing ? 'Syncing...' : 'Sync Data'}
                </button>
              </div>

            </div>
          </div>

          {/* Unified Analytics Panel */}
          <div className="card analytics-overview-card">
            <div className="analytics-filter-container" ref={filterToolbarRef}>
              {/* Header: Title + Post Count */}
              <div className="analytics-filter-header">
                <div className="analytics-title-group">
                  <h3>Analytics Overview</h3>
                  <span className="analytics-post-count-badge">
                    Showing {filteredPosts.length} of {detail.posts?.length || 0} published posts
                  </span>
                </div>
              </div>

              {/* Filter Toolbar: Dropdowns */}
              <div className="analytics-filter-toolbar">
                {/* 1. Date Range Dropdown */}
                <div className="filter-dropdown-group">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('time')}
                    className={`filter-dropdown-btn ${timeFilter !== 'all' ? 'active-filter' : ''}`}
                  >
                    <Calendar size={13} />
                    <span>{currentFilterLabel}</span>
                    <ChevronDown size={13} style={{ transform: openDropdown === 'time' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {openDropdown === 'time' && (
                    <div className="filter-dropdown-menu">
                      {filterOptions.map(opt => (
                        <div
                          key={opt.value}
                          onClick={() => { setTimeFilter(opt.value); setOpenDropdown(null); }}
                          className={`filter-dropdown-item ${timeFilter === opt.value ? 'selected' : ''}`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Platform Dropdown */}
                <div className="filter-dropdown-group">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('platform')}
                    className={`filter-dropdown-btn ${platformFilter !== 'all' ? 'active-filter' : ''}`}
                  >
                    <Globe size={13} />
                    <span>{currentPlatformLabel}</span>
                    <ChevronDown size={13} style={{ transform: openDropdown === 'platform' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {openDropdown === 'platform' && (
                    <div className="filter-dropdown-menu">
                      {platformOptions.map(opt => (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setPlatformFilter(opt.value);
                            setOpenDropdown(null);
                            if (pageFilter !== 'all') {
                              const pg = availablePages.find(p => p.id === String(pageFilter));
                              if (pg && opt.value !== 'all' && pg.platform.toLowerCase() !== opt.value.toLowerCase()) {
                                setPageFilter('all');
                              }
                            }
                          }}
                          className={`filter-dropdown-item ${platformFilter === opt.value ? 'selected' : ''}`}
                        >
                          {opt.isFb && <svg width="12" height="12" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
                          {opt.isTiktok && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46v-7.05a8.28 8.28 0 0 0 5.77 2.29V11.9a4.84 4.84 0 0 1-3-1.07 4.82 4.82 0 0 1-1.39-2.14h4.39v-2z"/></svg>}
                          {opt.isAll && <Globe size={13} />}
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Page Dropdown */}
                <div className="filter-dropdown-group">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('page')}
                    className={`filter-dropdown-btn ${pageFilter !== 'all' ? 'active-filter' : ''}`}
                    title="Filter by connected page"
                  >
                    <Layers size={13} />
                    <span>{currentPageLabel}</span>
                    <ChevronDown size={13} style={{ transform: openDropdown === 'page' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {openDropdown === 'page' && (
                    <div className="filter-dropdown-menu">
                      <div
                        onClick={() => { setPageFilter('all'); setOpenDropdown(null); }}
                        className={`filter-dropdown-item ${pageFilter === 'all' ? 'selected' : ''}`}
                      >
                        All Pages
                      </div>
                      {availablePages.map(page => (
                        <div
                          key={page.id}
                          onClick={() => { setPageFilter(page.id); setOpenDropdown(null); }}
                          className={`filter-dropdown-item ${pageFilter === page.id ? 'selected' : ''}`}
                        >
                          <span>{page.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Product Dropdown (Choice 2) */}
                <div className="filter-dropdown-group">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('product')}
                    className={`filter-dropdown-btn ${productFilter !== 'all' ? 'active-filter' : ''}`}
                    title="Filter by linked product"
                  >
                    <Package size={13} />
                    <span>{currentProductLabel}</span>
                    <ChevronDown size={13} style={{ transform: openDropdown === 'product' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {openDropdown === 'product' && (
                    <div className="filter-dropdown-menu" style={{ minWidth: '220px' }}>
                      <div
                        onClick={() => { setProductFilter('all'); setOpenDropdown(null); }}
                        className={`filter-dropdown-item ${productFilter === 'all' ? 'selected' : ''}`}
                      >
                        All Products ({availableProducts.length})
                      </div>
                      {availableProducts.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => { setProductFilter(prod.id); setOpenDropdown(null); }}
                          className={`filter-dropdown-item ${productFilter === prod.id ? 'selected' : ''}`}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Format Dropdown (Choice 5) */}
                <div className="filter-dropdown-group">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('format')}
                    className={`filter-dropdown-btn ${formatFilter !== 'all' ? 'active-filter' : ''}`}
                    title="Filter by media format"
                  >
                    <Image size={13} />
                    <span>{currentFormatLabel}</span>
                    <ChevronDown size={13} style={{ transform: openDropdown === 'format' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {openDropdown === 'format' && (
                    <div className="filter-dropdown-menu">
                      {formatOptions.map(opt => {
                        const IconComponent = opt.icon;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => { setFormatFilter(opt.value); setOpenDropdown(null); }}
                            className={`filter-dropdown-item ${formatFilter === opt.value ? 'selected' : ''}`}
                          >
                            <IconComponent size={13} />
                            <span>{opt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reset button if active filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="active-filter-reset"
                    title="Reset all filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="active-filters-row">
                  <span className="active-filter-label">Active:</span>
                  {timeFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Date: {currentFilterLabel}</span>
                      <button type="button" onClick={() => setTimeFilter('all')}><X size={12} /></button>
                    </span>
                  )}
                  {platformFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Platform: {currentPlatformLabel}</span>
                      <button type="button" onClick={() => setPlatformFilter('all')}><X size={12} /></button>
                    </span>
                  )}
                  {pageFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Page: {currentPageLabel}</span>
                      <button type="button" onClick={() => setPageFilter('all')}><X size={12} /></button>
                    </span>
                  )}
                  {productFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Product: {currentProductLabel}</span>
                      <button type="button" onClick={() => setProductFilter('all')}><X size={12} /></button>
                    </span>
                  )}
                  {formatFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Format: {currentFormatLabel}</span>
                      <button type="button" onClick={() => setFormatFilter('all')}><X size={12} /></button>
                    </span>
                  )}
                  {searchTerm && (
                    <span className="active-filter-tag">
                      <span>Search: "{searchTerm}"</span>
                      <button type="button" onClick={() => setSearchTerm('')}><X size={12} /></button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Recharts Insights Component */}
            <BrandInsightsChart detail={detail} posts={filteredPosts} />

            {/* Single Column Layout for Main Data */}
            <div className="detail-main-col" style={{ marginTop: '32px' }}>

              <div style={{ padding: 0 }}>
                <div className="card-header" style={{ padding: '0 0 16px 0', margin: 0, borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '600' }}>Tracked Posts</h3>
                    <span className="subtitle">Social media posts linked to this brand's products</span>
                  </div>
                </div>

                {topPost && (
                  <div className="top-performing-banner" style={{ marginTop: '24px', marginBottom: '24px', backgroundColor: '#fef3c7', borderRadius: '12px', padding: '16px 24px', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ backgroundColor: '#fffbeb', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fbbf24' }}>
                        <Trophy size={24} color="#d97706" />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#92400e', fontWeight: 600 }}>Top Performing Post</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#b45309' }}>
                          <strong style={{ color: '#92400e' }}>{topPost.product_name}</strong> • {topPost.views_count?.toLocaleString() || 0} Views • {topPost.reach_count > 0 ? (((topPost.likes_count + topPost.comments_count + topPost.shares_count) / topPost.reach_count) * 100).toFixed(1) : 0}% Engagement
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://facebook.com/${topPost.fb_post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ backgroundColor: '#d97706', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <ExternalLink size={14} />
                      View Post
                    </a>
                  </div>
                )}

                {/* Full Bleed Section for Search & Table */}
                <div style={{ margin: '0 -24px' }}>
                  {/* Search Toolbar for Table */}
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'white', display: 'flex', justifyContent: 'center' }}>
                    <div className="search-input-wrap" style={{ width: '400px', maxWidth: '100%', position: 'relative' }}>
                      <Search size={14} className="search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search posts by product name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="toolbar-search-input"
                        style={{ fontSize: '13px', width: '100%', padding: '10px 16px 10px 40px', borderRadius: '24px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}></th>
                          <th>Linked Product</th>
                          <th>Channel & Page</th>
                          <th>Format</th>
                          <th>Published Date</th>
                          <th>Engagement</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPosts.map((post) => (
                          <tr key={post.id} style={{ backgroundColor: selectedPosts.includes(post.id) ? '#f8fafc' : 'transparent' }}>
                            <td data-label="Select">
                              <div
                                onClick={() => handleSelectPost(post.id)}
                                style={{ cursor: 'pointer', color: selectedPosts.includes(post.id) ? 'var(--color-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                              >
                                {selectedPosts.includes(post.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                              </div>
                            </td>
                            <td data-label="Linked Product">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                                  <img src={post.product_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <span className="product-table-name">{post.product_name}</span>
                              </div>
                            </td>
                            <td data-label="Channel & Page">
                              {getChannelBadge(post)}
                            </td>
                            <td data-label="Format">
                              {getFormatBadge(post.media_type)}
                            </td>
                            <td data-label="Published Date">
                              <span
                                className="product-table-qty"
                                title={post.published_time ? new Date(post.published_time).toLocaleString() : 'No exact time'}
                                style={{ color: post.published_time ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'help' }}
                              >
                                <Calendar size={12} style={{ marginRight: '4px' }} />
                                {post.published_time ? new Date(post.published_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not published'}
                              </span>
                            </td>
                            <td data-label="Engagement">
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 60px)', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }} title="Views">
                                  <Eye size={14} color="#6366f1" /> {post.views_count ? post.views_count.toLocaleString() : '-'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }} title="Reach">
                                  <Eye size={14} color="#0ea5e9" /> {post.reach_count ? post.reach_count.toLocaleString() : '-'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }} title="Likes">
                                  <Heart size={14} color="#f43f5e" /> {post.likes_count ? post.likes_count.toLocaleString() : '-'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }} title="Comments">
                                  <MessageCircle size={14} color="#8b5cf6" /> {post.comments_count ? post.comments_count.toLocaleString() : '-'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }} title="Shares">
                                  <Share2 size={14} color="#10b981" /> {post.shares_count ? post.shares_count.toLocaleString() : '-'}
                                </span>
                              </div>
                            </td>
                            <td data-label="Actions" style={{ textAlign: 'right' }}>
                              <a
                                href={`https://facebook.com/${post.fb_post_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px', padding: '6px 12px' }}
                              >
                                <ExternalLink size={12} />
                                <span>View Post</span>
                              </a>
                            </td>
                          </tr>
                        ))}
                        {filteredPosts.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Filter size={28} style={{ opacity: 0.3 }} />
                                <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                  {hasActiveFilters ? 'No posts match the selected filters.' : (searchTerm ? 'No posts match your search.' : 'No posts have been tracked for this brand yet.')}
                                </span>
                                {hasActiveFilters && (
                                  <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="btn-secondary"
                                    style={{ marginTop: '8px', fontSize: '12px', padding: '6px 14px' }}
                                  >
                                    Reset all filters
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
                  <div className="mobile-only" style={{ padding: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredPosts.map((post) => (
                      <div key={`mob-${post.id}`} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div
                              onClick={() => handleSelectPost(post.id)}
                              style={{ cursor: 'pointer', color: selectedPosts.includes(post.id) ? 'var(--color-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                            >
                              {selectedPosts.includes(post.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                              <img src={post.product_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>{post.product_name}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {getChannelBadge(post)}
                            {getFormatBadge(post.media_type)}
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} color="var(--text-muted)" />
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Published:</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                              {post.published_time ? new Date(post.published_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Views</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#6366f1' }}>{post.views_count?.toLocaleString() || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reach</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0ea5e9' }}>{post.reach_count?.toLocaleString() || '-'}</div>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engagements</div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={12} color="#f43f5e" /> {post.likes_count?.toLocaleString() || 0}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageCircle size={12} color="#f59e0b" /> {post.comments_count?.toLocaleString() || 0}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Share2 size={12} color="#10b981" /> {post.shares_count?.toLocaleString() || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                          <a
                            href={`https://facebook.com/${post.fb_post_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary-soft"
                            style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', padding: '10px' }}
                          >
                            <ExternalLink size={14} style={{ marginRight: '6px' }} />
                            <span>View Post</span>
                          </a>
                        </div>
                      </div>
                    ))}
                    {filteredPosts.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        {hasActiveFilters ? 'No posts match the selected filters.' : (searchTerm ? 'No posts match your search.' : 'No posts have been tracked for this brand yet.')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Compare Action Bar */}
      {selectedPosts.length > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '12px 24px', borderRadius: '32px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1000, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected</span>
          <button
            className="btn-primary"
            disabled={selectedPosts.length !== 2}
            onClick={() => setShowCompareModal(true)}
            style={{ borderRadius: '24px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: selectedPosts.length === 2 ? 1 : 0.5 }}
          >
            <BarChart size={14} /> Compare Posts
          </button>
          <button
            onClick={() => setSelectedPosts([])}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        posts={filteredPosts}
        brandName={detail?.brand_name}
        startMonth={exportStart}
        endMonth={exportEnd}
        clientLogo={detail?.logo_url || detail?.image_url}
      />
      {/* Compare Modal */}
      {showCompareModal && selectedPosts.length === 2 && (() => {
        const p1 = detail.posts.find(p => p.id === selectedPosts[0]);
        const p2 = detail.posts.find(p => p.id === selectedPosts[1]);
        if (!p1 || !p2) return null;

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '800px', maxWidth: '90vw', padding: '32px', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
              <button
                onClick={() => setShowCompareModal(false)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>

              <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600 }}>Compare Posts</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Post 1 */}
                <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 16px', color: 'var(--color-primary)', fontSize: '16px' }}>{p1.product_name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Published: {p1.published_time ? new Date(p1.published_time).toLocaleDateString() : 'N/A'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Views</span>
                      <strong style={{ fontSize: '16px' }}>{p1.views_count?.toLocaleString() || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Reach</span>
                      <strong style={{ fontSize: '16px' }}>{p1.reach_count?.toLocaleString() || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Likes</span>
                      <strong style={{ fontSize: '16px' }}>{p1.likes_count?.toLocaleString() || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Engagement Rate</span>
                      <strong style={{ fontSize: '16px', color: '#d97706' }}>{getEngagementRate(p1)}%</strong>
                    </div>
                  </div>
                  <a href={`https://facebook.com/${p1.fb_post_id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                    View Post 1
                  </a>
                </div>

                {/* Post 2 */}
                <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 16px', color: 'var(--color-primary)', fontSize: '16px' }}>{p2.product_name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Published: {p2.published_time ? new Date(p2.published_time).toLocaleDateString() : 'N/A'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Views</span>
                      <strong style={{ fontSize: '16px' }}>{p2.views_count?.toLocaleString() || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Reach</span>
                      <strong style={{ fontSize: '16px' }}>{p2.reach_count?.toLocaleString() || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Likes</span>
                      <strong style={{ fontSize: '16px' }}>{p2.likes_count?.toLocaleString() || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Engagement Rate</span>
                      <strong style={{ fontSize: '16px', color: '#d97706' }}>{getEngagementRate(p2)}%</strong>
                    </div>
                  </div>
                  <a href={`https://facebook.com/${p2.fb_post_id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                    View Post 2
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
