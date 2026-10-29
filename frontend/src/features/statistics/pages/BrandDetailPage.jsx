import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useUrlFilters } from '../../../shared/hooks/useUrlFilters';
import {
  BarChart2, Package, Calendar, ExternalLink, ArrowLeft, Tag, Search,
  RefreshCw, ChevronDown, Filter, Eye, Heart, MessageCircle, Share2, Trophy, Download, X,
  Layers, Image, Video, Radio, Globe, RotateCcw
} from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { BrandDetailHeroSkeleton, BrandDetailAnalyticsSkeleton, BrandDetailTrackedPostsSkeleton } from '../../../shared/components/skeletons';
import {
  getBrandDetail,
  getCombinedBrandDetail,
  getCachedBrandDetail,
  clearBrandCache
} from '../services/brandStatsService';
import { BrandInsightsChart } from '../components/BrandInsightsChart';
import { syncPosts, refreshPostById } from '../../postTracker/api/postTrackerApi';
import { ExportModal } from '../components/ExportModal';
import { SortableHeader } from '../../../shared/components/ui/SortableHeader';
import { useSortableTable } from '../../../shared/hooks/useSortableTable';
import { DateRangeFilter, isPostInDateRange, DATE_PRESETS } from '../../../shared/components/ui/DateRangeFilter';
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';
import { SafeImage } from '../../../shared/components/ui/SafeImage';

export const BrandDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Compute cache key for instant initial render
  const idsParam = searchParams.get('ids');
  const initialCacheKey = (id === 'combined' || idsParam)
    ? `combined_${(idsParam ? idsParam.split(',').filter(Boolean) : [id]).sort().join(',')}`
    : id;

  const initialCached = getCachedBrandDetail(initialCacheKey);
  const [detail, setDetail] = useState(() => initialCached || null);
  const [loading, setLoading] = useState(() => !initialCached);
  const [error, setError] = useState(null);
  const location = useLocation();

  // Professional URL-synced multi-filter hook
  const { filters, setFilter, setFilters, resetFilters } = useUrlFilters({
    range: 'this_month',
    start: '',
    end: '',
    platform: 'all',
    page_id: 'all',
    product: 'all',
    format: 'all',
    search: '',
  }, {
    debouncedKeys: ['search'],
    debounceDelay: 300,
    pageKey: null,
  });

  const {
    range: timeFilter,
    start: customStart,
    end: customEnd,
    platform: platformFilter,
    page_id: pageFilter,
    product: productFilter,
    format: formatFilter,
    search: searchTerm,
  } = filters;

  const customRange = useMemo(() => ({
    start: customStart,
    end: customEnd,
  }), [customStart, customEnd]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshingPostId, setRefreshingPostId] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Multi-Filter States
  const [openDropdown, setOpenDropdown] = useState(null); // 'platform' | 'page' | 'product' | 'format' | null
  const filterToolbarRef = useRef(null);

  const handleTimeFilterChange = (newVal) => {
    if (newVal === 'custom') {
      setFilter('range', 'custom');
    } else {
      setFilters({ range: newVal, start: '', end: '' });
    }
  };

  const handleCustomRangeChange = (range) => {
    setFilters({ start: range.start || '', end: range.end || '' });
  };

  const handleBackToBrands = () => {
    if (location.state?.from) {
      return navigate(location.state.from);
    }
    const params = new URLSearchParams();
    if (timeFilter !== 'this_month') {
      params.set('range', timeFilter);
      if (timeFilter === 'custom') {
        if (customStart) params.set('start', customStart);
        if (customEnd) params.set('end', customEnd);
      }
    }
    const q = params.toString() ? `?${params.toString()}` : '';
    navigate(`/stats/brands${q}`);
  };

  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('.filter-dropdown-group') &&
        !event.target.closest('.date-range-filter-container')
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (name) => {
    setOpenDropdown(prev => prev === name ? null : name);
  };

  const platformOptions = [
    { value: 'all', label: 'All Platforms', isAll: true },
    { value: 'facebook', label: 'Facebook', isFb: true },
    { value: 'tiktok', label: 'TikTok', isTiktok: true }
  ];

  const formatOptions = [
    { value: 'all', label: 'All Formats', icon: Layers },
    { value: 'photo', label: 'Photo', icon: Image },
    { value: 'video', label: 'Video', icon: Video },
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

  const currentPlatformLabel = platformOptions.find(o => o.value === platformFilter)?.label || 'All Platforms';
  const currentPageLabel = pageFilter === 'all'
    ? 'All Pages'
    : (availablePages.find(p => p.id === String(pageFilter))?.name || 'Selected Page');
  const currentProductLabel = productFilter === 'all'
    ? 'All Products'
    : (availableProducts.find(p => p.id === String(productFilter))?.name || 'Selected Product');
  const currentFormatLabel = formatOptions.find(f => f.value === formatFilter)?.label || 'All Formats';

  const fetchDetail = async (force = false) => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
      const filterParams = {
        range: timeFilter,
        startDate: customRange.start || undefined,
        endDate: customRange.end || undefined,
        timezone: tz
      };
      const idsParam = searchParams.get('ids');
      const currentCacheKey = (id === 'combined' || idsParam)
        ? `combined_${(idsParam ? idsParam.split(',').filter(Boolean) : [id]).sort().join(',')}`
        : id;
      const currentCache = getCachedBrandDetail(currentCacheKey, filterParams);

      if (!currentCache || force) {
        setLoading(true);
      }

      if (id === 'combined' || idsParam) {
        const brandIds = idsParam ? idsParam.split(',').filter(Boolean) : [id];
        if (brandIds.length === 1 && brandIds[0] !== 'combined') {
          const data = await getBrandDetail(brandIds[0], filterParams, force);
          setDetail(data);
        } else {
          const combinedData = await getCombinedBrandDetail(brandIds, force);
          setDetail(combinedData);
        }
      } else {
        const data = await getBrandDetail(id, filterParams, force);
        if (data && data.posts) {
          data.posts = data.posts.map(p => ({
            ...p,
            brand_name: p.brand_name || data.brand_name,
            brand_id: p.brand_id || data.brand_id
          }));
        }
        setDetail(data);
      }
      setError(null);
    } catch (err) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
      const filterParams = {
        range: timeFilter,
        startDate: customRange.start || undefined,
        endDate: customRange.end || undefined,
        timezone: tz
      };
      const idsParam = searchParams.get('ids');
      const currentCacheKey = (id === 'combined' || idsParam)
        ? `combined_${(idsParam ? idsParam.split(',').filter(Boolean) : [id]).sort().join(',')}`
        : id;
      if (!getCachedBrandDetail(currentCacheKey, filterParams)) {
        setError(err.message || 'Failed to fetch brand details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncPosts({
        brandId: id !== 'combined' ? id : undefined,
        startDate: customRange?.start || undefined,
        endDate: customRange?.end || undefined,
      });
      clearBrandCache();
      await fetchDetail(true);
    } catch (err) {
      console.error('Failed to sync posts', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshSinglePost = async (postId) => {
    try {
      setRefreshingPostId(postId);
      await refreshPostById(postId);
      clearBrandCache();
      await fetchDetail(true);
    } catch (err) {
      console.error('Failed to refresh post', err);
    } finally {
      setRefreshingPostId(null);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id, searchParams.get('ids'), timeFilter, customRange.start, customRange.end]);

  // Ensure BrandDetailPage always opens at the top
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      const scrollEl = document.querySelector('.content-scroll');
      if (scrollEl) {
        scrollEl.scrollTop = 0;
      }
    };
    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    const timer = setTimeout(resetScroll, 30);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [id]);

  const resetAllFilters = () => {
    resetFilters();
  };

  const hasActiveFilters =
    timeFilter !== 'this_month' ||
    customStart !== '' ||
    customEnd !== '' ||
    platformFilter !== 'all' ||
    pageFilter !== 'all' ||
    productFilter !== 'all' ||
    formatFilter !== 'all' ||
    Boolean(searchTerm);

  const filteredPosts = useMemo(() => {
    if (!detail || !detail.posts) return [];
    let posts = detail.posts.filter(p => p.status === 'published' || p.published_time);

    // 1. Time filter using isPostInDateRange
    posts = posts.filter(p => isPostInDateRange(p, timeFilter, customRange.start, customRange.end));

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
  }, [detail, timeFilter, customRange, platformFilter, pageFilter, productFilter, formatFilter, searchTerm]);

  const { sortedItems: sortedPosts, sortConfig, requestSort } = useSortableTable(
    filteredPosts,
    { key: 'published_time', direction: 'desc' },
    {
      product_name: (p) => (p.product_name || '').toLowerCase(),
      channel: (p) => (p.page_name || '').toLowerCase(),
      format: (p) => (p.media_type || 'photo').toLowerCase(),
      published_time: (p) => (p.published_time ? new Date(p.published_time).getTime() : (p.scheduled_time ? new Date(p.scheduled_time).getTime() : 0)),
      engagement: (p) => (Number(p.views_count) || 0) + (Number(p.reach_count) || 0) + (Number(p.likes_count) || 0) + (Number(p.comments_count) || 0) + (Number(p.shares_count) || 0),
    }
  );

  const exportDateRange = useMemo(() => {
    const KHMER_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    const formatDateKhmer = (d) => {
      if (isNaN(d.getTime())) return '';
      return `${d.getDate()} ${KHMER_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    };

    const now = new Date();

    if (timeFilter === 'today') {
      const todayStr = formatDateKhmer(now);
      return { label: todayStr, start: todayStr, end: todayStr };
    }

    if (timeFilter === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      const startStr = formatDateKhmer(start);
      const endStr = formatDateKhmer(end);
      return { label: `${startStr} រហូតដល់ ${endStr}`, start: startStr, end: endStr };
    }

    if (timeFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = formatDateKhmer(start);
      const endStr = formatDateKhmer(end);
      return { label: `${startStr} រហូតដល់ ${endStr}`, start: startStr, end: endStr };
    }

    if (timeFilter === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = formatDateKhmer(start);
      const endStr = formatDateKhmer(end);
      return { label: `${startStr} រហូតដល់ ${endStr}`, start: startStr, end: endStr };
    }

    if (timeFilter === 'custom') {
      const startStr = customRange.start ? formatDateKhmer(customRange.start) : '';
      const endStr = customRange.end ? formatDateKhmer(customRange.end) : '';
      if (startStr && endStr) {
        return { label: `${startStr} រហូតដល់ ${endStr}`, start: startStr, end: endStr };
      }
      if (startStr) {
        return { label: `ចាប់ពី ${startStr}`, start: startStr, end: '' };
      }
      if (endStr) {
        return { label: `រហូតដល់ ${endStr}`, start: '', end: endStr };
      }
    }

    // Default / 'all' - All Time
    return { label: 'គ្រប់ពេលវេលា', start: 'គ្រប់ពេលវេលា', end: 'គ្រប់ពេលវេលា' };
  }, [timeFilter, customRange]);

  const exportPageName = useMemo(() => {
    if (pageFilter !== 'all') {
      const selected = availablePages.find(p => p.id === String(pageFilter));
      if (selected) return selected.name;
    }
    const uniquePages = Array.from(new Set((filteredPosts || []).map(p => p.page_name).filter(Boolean)));
    if (uniquePages.length === 1) return uniquePages[0];
    if (uniquePages.length > 1) return uniquePages.join(', ');
    if (availablePages.length === 1) return availablePages[0].name;
    return detail?.brand_name || 'All Pages';
  }, [pageFilter, availablePages, filteredPosts, detail]);

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
    if (m === 'video' || m === 'reel') {
      return <span className="format-pill-tag format-video"><Video size={11} /> Video</span>;
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


  const handleExportCSV = () => {
    if (!filteredPosts || filteredPosts.length === 0) return;
    const headers = ['Linked Product', 'Platform', 'Page', 'Format', 'Published Date', 'Views', 'Reach', 'Likes', 'Comments', 'Shares', 'FB Post ID'];
    const rows = filteredPosts.map(p => [
      `"${(p.product_name || '').replace(/"/g, '""')}"`,
      p.platform || 'facebook',
      `"${(p.page_name || '').replace(/"/g, '""')}"`,
      (p.media_type === 'video' || p.media_type === 'reel') ? 'video' : (p.media_type || 'photo'),
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
    <div className="brand-detail-page-container page-container product-page-container">
      {/* Breadcrumb & Back */}
      <div className="brand-detail-breadcrumb-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleBackToBrands}
          className="btn-secondary brand-detail-back-btn"
          style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer' }}
          title="Back to Brands"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="page-breadcrumb" style={{ margin: 0 }}>
          <span style={{ cursor: 'pointer' }} onClick={handleBackToBrands}>Brands</span> / <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{id === 'combined' || (searchParams.get('ids') && searchParams.get('ids').includes(',')) ? 'Combined Detail' : 'Detail'}</span>
        </div>
      </div>

      {error && (
        <div className="alert-error-banner">
          <span>Error loading details: {error}</span>
        </div>
      )}

      {loading ? (
        <>
          <BrandDetailHeroSkeleton />
          <BrandDetailAnalyticsSkeleton />
          <BrandDetailTrackedPostsSkeleton />
        </>
      ) : detail && (
        <>
          {/* Hero Header with Overview Integrated */}
          <div className="card brand-detail-hero-card">
            <div className="brand-detail-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%', position: 'relative', zIndex: 1 }}>

              {/* Brand Info (Left) */}
              <div className="brand-detail-hero-info" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {detail.logos && detail.logos.length > 1 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.02)' }}>
                    {detail.logos.map((lg, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && (
                          <div style={{ width: '1.5px', height: '32px', backgroundColor: '#cbd5e1', margin: '0 8px', borderRadius: '1px', flexShrink: 0 }} />
                        )}
                        <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={lg.name}>
                          <img
                            src={lg.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(lg.name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`}
                            alt={lg.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="brand-detail-logo-box" style={{ padding: '6px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.02)' }}>
                    <img
                      className="brand-detail-logo-img"
                      src={detail.logo_url || detail.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.brand_name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`}
                      alt={detail.brand_name}
                      style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {detail.brand_name}
                    </h1>
                    {detail.logos && detail.logos.length > 1 ? (
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Combined ({detail.logos.length} Brands)
                      </span>
                    ) : detail.total_products > 0 ? (
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#64748b', fontSize: '14px', fontWeight: '500', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={16} color="#94a3b8" /> {detail.total_products} Linked
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart2 size={16} color="#94a3b8" /> {detail.total_posts} Published
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Right) */}
              <div className="brand-detail-hero-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary hero-action-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', backgroundColor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => setShowExportModal(true)}
                >
                  <Download size={16} /> <span>Export</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary hero-action-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', backgroundColor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: isSyncing ? 0.7 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw size={16} className={isSyncing ? "spin-animation" : ""} /> <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
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
                <DateRangeFilter
                  value={timeFilter}
                  onChange={handleTimeFilterChange}
                  customRange={customRange}
                  onCustomRangeChange={handleCustomRangeChange}
                  minWidth="145px"
                  align="left"
                  isOpen={openDropdown === 'date'}
                  onOpenChange={(open) => setOpenDropdown(open ? 'date' : null)}
                />

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
                            let updates = { platform: opt.value };
                            if (pageFilter !== 'all') {
                              const pg = availablePages.find(p => p.id === String(pageFilter));
                              if (pg && opt.value !== 'all' && pg.platform.toLowerCase() !== opt.value.toLowerCase()) {
                                updates.page_id = 'all';
                              }
                            }
                            setFilters(updates);
                            setOpenDropdown(null);
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
                        onClick={() => { setFilter('page_id', 'all'); setOpenDropdown(null); }}
                        className={`filter-dropdown-item ${pageFilter === 'all' ? 'selected' : ''}`}
                      >
                        All Pages
                      </div>
                      {availablePages.map(page => (
                        <div
                          key={page.id}
                          onClick={() => { setFilter('page_id', page.id); setOpenDropdown(null); }}
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
                        onClick={() => { setFilter('product', 'all'); setOpenDropdown(null); }}
                        className={`filter-dropdown-item ${productFilter === 'all' ? 'selected' : ''}`}
                      >
                        All Products ({availableProducts.length})
                      </div>
                      {availableProducts.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => { setFilter('product', prod.id); setOpenDropdown(null); }}
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
                            onClick={() => { setFilter('format', opt.value); setOpenDropdown(null); }}
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
                  {(timeFilter !== 'this_month' || customRange.start !== '' || customRange.end !== '') && (
                    <span className="active-filter-tag">
                      <span>Date: {timeFilter === 'custom' ? `${customRange.start || 'Start'} to ${customRange.end || 'End'}` : (DATE_PRESETS.find(p => p.id === timeFilter)?.label || timeFilter)}</span>
                      <button type="button" onClick={() => { setFilters({ range: 'this_month', start: '', end: '' }); }}><X size={12} /></button>
                    </span>
                  )}
                  {platformFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Platform: {currentPlatformLabel}</span>
                      <button type="button" onClick={() => setFilter('platform', 'all')}><X size={12} /></button>
                    </span>
                  )}
                  {pageFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Page: {currentPageLabel}</span>
                      <button type="button" onClick={() => setFilter('page_id', 'all')}><X size={12} /></button>
                    </span>
                  )}
                  {productFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Product: {currentProductLabel}</span>
                      <button type="button" onClick={() => setFilter('product', 'all')}><X size={12} /></button>
                    </span>
                  )}
                  {formatFilter !== 'all' && (
                    <span className="active-filter-tag">
                      <span>Format: {currentFormatLabel}</span>
                      <button type="button" onClick={() => setFilter('format', 'all')}><X size={12} /></button>
                    </span>
                  )}
                  {searchTerm && (
                    <span className="active-filter-tag">
                      <span>Search: "{searchTerm}"</span>
                      <button type="button" onClick={() => setFilter('search', '')}><X size={12} /></button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Recharts Insights Component */}
            <BrandInsightsChart detail={detail} posts={filteredPosts} />

          </div>

          {/* Top Performing Post Highlight (if available) */}
          {topPost && (
            <div className="top-performing-banner" style={{
              backgroundColor: '#fef3c7',
              borderRadius: '12px',
              padding: '14px 20px',
              border: '1px solid #fde68a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ backgroundColor: '#fffbeb', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fbbf24', flexShrink: 0 }}>
                  <Trophy size={20} color="#d97706" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '14px', color: '#92400e', fontWeight: 600 }}>Top Performing Post</h4>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#b45309' }}>
                    <strong style={{ color: '#92400e' }}>{topPost.product_name}</strong> • {topPost.views_count?.toLocaleString() || 0} Views • {topPost.reach_count > 0 ? (((topPost.likes_count + topPost.comments_count + topPost.shares_count) / topPost.reach_count) * 100).toFixed(1) : 0}% Engagement
                  </p>
                </div>
              </div>
              <a
                href={getFacebookPostUrl(topPost.fb_post_id, topPost.post_url, topPost.page_id || topPost.fb_page_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ backgroundColor: '#d97706', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12.5px', fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <ExternalLink size={13} />
                <span>View Post</span>
              </a>
            </div>
          )}

          {/* Unified Table Card (Matching BrandStatsPage / Tasks Pic 2) */}
          <div className="table-card brand-posts-table-card" style={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            overflow: 'hidden'
          }}>
            {/* Toolbar Header Row inside table-card */}
            <div className="toolbar-header-row" style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '15px', margin: 0, fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                  Tracked Posts
                </h3>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap'
                }}>
                  {sortedPosts.length}
                </span>
              </div>

              <div className="search-input-wrap" style={{ flex: 1, maxWidth: '360px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search posts by product name..."
                  value={searchTerm}
                  onChange={(e) => setFilter('search', e.target.value)}
                  style={{
                    fontSize: '13px',
                    width: '100%',
                    padding: '9px 14px 9px 38px',
                    borderRadius: '24px',
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

                  {/* Data Table */}
                  <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <SortableHeader label="Linked Product" sortKey="product_name" currentSort={sortConfig} onSort={requestSort} />
                          <SortableHeader label="Channel & Page" sortKey="channel" currentSort={sortConfig} onSort={requestSort} />
                          <SortableHeader label="Format" sortKey="format" currentSort={sortConfig} onSort={requestSort} />
                          <SortableHeader label="Published Date" sortKey="published_time" currentSort={sortConfig} onSort={requestSort} defaultDirection="desc" />
                          <SortableHeader label="Engagement" sortKey="engagement" currentSort={sortConfig} onSort={requestSort} defaultDirection="desc" />
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPosts.map((post) => (
                          <tr key={post.id}>
                            <td data-label="Linked Product">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <SafeImage
                                    src={post.thumbnail_url || post.media_url || post.product_image || (detail?.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`}
                                    fallbackSrc={post.product_image || (detail?.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`}
                                    poster={post.thumbnail_url}
                                    alt={post.product_name || 'thumbnail'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    fallbackText=""
                                  />
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
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    padding: '6px 10px',
                                    cursor: refreshingPostId === post.id ? 'not-allowed' : 'pointer',
                                    opacity: refreshingPostId === post.id ? 0.7 : 1,
                                    borderRadius: '6px',
                                  }}
                                  disabled={refreshingPostId === post.id}
                                  title="Refresh metrics for this post directly from Facebook"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await handleRefreshSinglePost(post.id);
                                  }}
                                >
                                  <RefreshCw size={12} className={refreshingPostId === post.id ? "spin-animation" : ""} />
                                  <span>{refreshingPostId === post.id ? 'Refreshing...' : 'Refresh'}</span>
                                </button>
                                <a
                                  href={getFacebookPostUrl(post.fb_post_id, post.post_url, post.page_id || post.fb_page_id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-secondary"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px', padding: '6px 12px' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink size={12} />
                                  <span>View Post</span>
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredPosts.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
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
                  <div className="mobile-only" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc' }}>
                    {sortedPosts.map((post) => (
                      <div
                        key={`mob-${post.id}`}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        {/* Header: Left = Larger Image (54x54), Right = 2 Rows (Title+Format, Page badge) */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {/* Post Creative Thumbnail (matching Post Tracker) */}
                          <div style={{ width: '62px', height: '62px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SafeImage
                              src={post.thumbnail_url || post.media_url || post.product_image || (detail?.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`}
                              fallbackSrc={post.product_image || (detail?.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`}
                              poster={post.thumbnail_url}
                              alt={post.product_name || 'thumbnail'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              fallbackText=""
                            />
                          </div>

                          {/* Right: 2 Rows */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1, justifyContent: 'center' }}>
                            {/* Row 1: Product Name & Format Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={post.product_name}
                              >
                                {post.product_name || 'Untitled Product'}
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                {getFormatBadge(post.media_type)}
                              </div>
                            </div>

                            {/* Row 2: Connected Page Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                              {getChannelBadge(post)}
                            </div>
                          </div>
                        </div>

                        {/* Metrics Grid: 3-Column Compact */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          backgroundColor: '#f8fafc',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9'
                        }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Views</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', marginTop: '1px' }}>{post.views_count?.toLocaleString() || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Reach</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0ea5e9', marginTop: '1px' }}>{post.reach_count?.toLocaleString() || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Engage</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Heart size={11} color="#f43f5e" /> {post.likes_count?.toLocaleString() || 0}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><MessageCircle size={11} color="#f59e0b" /> {post.comments_count?.toLocaleString() || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Action Row: Date on Left, Compact View Post on Right */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#64748b' }}>
                            <Calendar size={12} color="#94a3b8" />
                            {post.published_time ? new Date(post.published_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not published'}
                          </span>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                borderRadius: '6px',
                                cursor: refreshingPostId === post.id ? 'not-allowed' : 'pointer',
                                opacity: refreshingPostId === post.id ? 0.7 : 1,
                              }}
                              disabled={refreshingPostId === post.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleRefreshSinglePost(post.id);
                              }}
                            >
                              <RefreshCw size={11} className={refreshingPostId === post.id ? "spin-animation" : ""} />
                              <span>{refreshingPostId === post.id ? 'Syncing...' : 'Sync'}</span>
                            </button>
                            <a
                              href={getFacebookPostUrl(post.fb_post_id, post.post_url, post.page_id || post.fb_page_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary-soft"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                textDecoration: 'none'
                              }}
                            >
                              <span>View Post</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredPosts.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {hasActiveFilters ? 'No posts match the selected filters.' : (searchTerm ? 'No posts match your search.' : 'No posts have been tracked for this brand yet.')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        posts={filteredPosts}
        brandName={detail?.brand_name}
        pageName={exportPageName}
        dateRangeText={exportDateRange.label}
        startMonth={exportDateRange.start}
        endMonth={exportDateRange.end}
        clientLogo={detail?.logo_url || detail?.image_url}
        clientLogos={detail?.logos}
      />
    </div>
  );
};
