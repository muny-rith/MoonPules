import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useUrlFilters } from '../../../shared/hooks/useUrlFilters';
import {
  BarChart2, Package, Calendar, ExternalLink, ArrowLeft, Tag, Search,
  RefreshCw, ChevronDown, Filter, Eye, Heart, MessageCircle, Share2, Trophy, Download, X,
  Layers, Image, Video, Radio, Globe, RotateCcw, Target, Plus, Edit3, ChevronLeft, ChevronRight, Check, AlertTriangle
} from 'lucide-react';
import {
  Select,
  Input,
  Button,
  Modal,
  DateRangeFilter,
  SortableHeader,
  SafeImage,
  Skeleton
} from '../../../shared/components/ui';
import {
  BrandDetailHeroSkeleton,
  BrandDetailAnalyticsSkeleton,
  BrandDetailTrackedPostsSkeleton,
  BrandMissionPanelSkeleton
} from '../../../shared/components/skeletons';
import {
  getBrandDetail,
  getCombinedBrandDetail,
  getCachedBrandDetail,
  clearBrandCache
} from '../services/brandStatsService';
import { BrandInsightsChart } from '../components/BrandInsightsChart';
import { syncPosts, refreshPostById } from '../../postTracker/api/postTrackerApi';
import { ExportModal } from '../components/ExportModal';
import { useSortableTable } from '../../../shared/hooks/useSortableTable';
import { isPostInDateRange, DATE_PRESETS } from '../../../shared/components/ui/DateRangeFilter';
import { getFacebookPostUrl } from '../../../shared/utils/facebookUrl';
import * as missionApi from '../../missions/api/missionApi';
import { SlotDatePopover } from '../../missions/components/SlotDatePopover';
import { AddSlotModal } from '../../missions/components/AddSlotModal';
import { SetMissionModal } from '../../missions/components/SetMissionModal';

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

  // ==================== MISSION / DELIVERABLES STATE ====================
  const [missionMonth, setMissionMonth] = useState(() => new Date().getMonth() + 1);
  const [missionYear, setMissionYear] = useState(() => new Date().getFullYear());
  const initialMissionCache = (() => {
    if (!id || id === 'combined') return null;
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const item = window.__moonpulse_mission_cache?.get(`${id}_${m}_${y}`);
    return item && Date.now() - item.timestamp < 300000 ? item.data : null;
  })();
  const [brandMission, setBrandMission] = useState(() => initialMissionCache || null);
  const [missionLoading, setMissionLoading] = useState(false);

  // Modals for slot & blueprint control
  const [activeSlotPopover, setActiveSlotPopover] = useState({ isOpen: false, slot: null });
  const [activeAddSlotModal, setActiveAddSlotModal] = useState({ isOpen: false });
  const [activeBlueprintModal, setActiveBlueprintModal] = useState({ isOpen: false });

  const loadBrandMission = useCallback(async () => {
    if (!id || id === 'combined') {
      setBrandMission(null);
      return;
    }
    if (!window.__moonpulse_mission_cache) {
      window.__moonpulse_mission_cache = new Map();
    }
    const cacheKey = `${id}_${missionMonth}_${missionYear}`;
    const cached = window.__moonpulse_mission_cache.get(cacheKey);
    const isFresh = cached && Date.now() - cached.timestamp < 300000;

    if (!isFresh) {
      setMissionLoading(true);
    }
    try {
      const data = await missionApi.getMission(id, missionMonth, missionYear);
      setBrandMission(data);
      window.__moonpulse_mission_cache.set(cacheKey, { data, timestamp: Date.now() });
    } catch (err) {
      console.error('Failed to load brand mission:', err);
      if (!isFresh) setBrandMission(null);
    } finally {
      setMissionLoading(false);
    }
  }, [id, missionMonth, missionYear]);

  useEffect(() => {
    loadBrandMission();
  }, [loadBrandMission]);

  // Smart sync: when timeFilter or customStart changes, align missionMonth and missionYear
  useEffect(() => {
    const now = new Date();
    if (timeFilter === 'this_month' || timeFilter === 'today' || timeFilter === 'yesterday' || timeFilter === 'this_week') {
      setMissionMonth(now.getMonth() + 1);
      setMissionYear(now.getFullYear());
    } else if (timeFilter === 'last_month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setMissionMonth(prevDate.getMonth() + 1);
      setMissionYear(prevDate.getFullYear());
    } else if (timeFilter === 'custom' && customStart) {
      const parts = customStart.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          setMissionMonth(m);
          setMissionYear(y);
        }
      }
    }
  }, [timeFilter, customStart]);

  const missionMonthLabel = useMemo(() => {
    const d = new Date(missionYear, missionMonth - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [missionMonth, missionYear]);

  // Smart Filtered Slots: follows timeFilter, customRange, and formatFilter
  const filteredSlots = useMemo(() => {
    if (!brandMission || !brandMission.slots) return [];
    let slots = [...brandMission.slots];

    // 1. Format Filter
    if (formatFilter !== 'all') {
      slots = slots.filter((slot) => {
        const ct = (slot.content_type || '').toLowerCase();
        if (formatFilter === 'photo') return ct === 'poster' || ct === 'photo';
        if (formatFilter === 'video') return ct === 'video' || ct === 'reel';
        if (formatFilter === 'live') return ct === 'live';
        return true;
      });
    }

    // 2. Date Range Filter
    if (timeFilter === 'this_month' || timeFilter === 'last_month') {
      return slots;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (timeFilter === 'today') {
      const todayStr = toYMD(now);
      slots = slots.filter((s) => s.planned_date_str === todayStr);
    } else if (timeFilter === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toYMD(yest);
      slots = slots.filter((s) => s.planned_date_str === yestStr);
    } else if (timeFilter === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      const startStr = toYMD(monday);
      const endStr = toYMD(sunday);
      slots = slots.filter((s) => s.planned_date_str >= startStr && s.planned_date_str <= endStr);
    } else if (timeFilter === 'custom') {
      if (customRange.start && customRange.end) {
        slots = slots.filter((s) => s.planned_date_str >= customRange.start && s.planned_date_str <= customRange.end);
      } else if (customRange.start) {
        slots = slots.filter((s) => s.planned_date_str >= customRange.start);
      } else if (customRange.end) {
        slots = slots.filter((s) => s.planned_date_str <= customRange.end);
      }
    }

    return slots;
  }, [brandMission, formatFilter, timeFilter, customRange]);

  const handleSaveSlot = async (slotData) => {
    await missionApi.updateSlot(slotData.id, {
      planned_date: slotData.planned_date,
      content_type: slotData.content_type,
      time_window: slotData.time_window,
      notes: slotData.notes,
    });
    await loadBrandMission();
    await fetchDetail(true);
  };

  const handleDeleteSlot = async (slotId) => {
    await missionApi.deleteSlot(slotId);
    await loadBrandMission();
    await fetchDetail(true);
  };

  const handleAddSlot = async (newSlot) => {
    await missionApi.createSlot(newSlot);
    await loadBrandMission();
    await fetchDetail(true);
  };

  const getDeliverableChipStyle = (contentType) => {
    switch (contentType) {
      case 'poster':
      case 'photo':
        return {
          bg: '#f0fdf4',
          border: '#bbf7d0',
          text: '#16a34a',
          label: 'Poster',
        };
      case 'video':
      case 'reel':
        return {
          bg: '#faf5ff',
          border: '#e9d5ff',
          text: '#7e22ce',
          label: 'Video',
        };
      case 'live':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1d4ed8',
          label: 'Live',
        };
      default:
        return {
          bg: '#f8fafc',
          border: '#e2e8f0',
          text: '#475569',
          label: 'Content',
        };
    }
  };

  // ==================== DATE FILTER HANDLERS ====================
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

  // ==================== FILTER OPTIONS (FOR GLOBAL SELECTS) ====================
  const platformOptions = useMemo(() => [
    { value: 'all', label: 'All Platforms', icon: <Globe size={14} /> },
    {
      value: 'facebook',
      label: 'Facebook',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#1877f2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      value: 'tiktok',
      label: 'TikTok',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46v-7.05a8.28 8.28 0 0 0 5.77 2.29V11.9a4.84 4.84 0 0 1-3-1.07 4.82 4.82 0 0 1-1.39-2.14h4.39v-2z" />
        </svg>
      ),
    },
  ], []);

  const formatOptions = useMemo(() => [
    { value: 'all', label: 'All Formats', icon: <Layers size={14} /> },
    { value: 'photo', label: 'Photo', icon: <Image size={14} /> },
    { value: 'video', label: 'Video', icon: <Video size={14} /> },
    { value: 'live', label: 'Live Stream', icon: <Radio size={14} /> },
  ], []);

  // Dynamically derive available pages from brand posts
  const availablePages = useMemo(() => {
    if (!detail || !detail.posts) return [];
    const map = new Map();
    detail.posts.forEach((p) => {
      if (p.page_id && p.page_name && !map.has(String(p.page_id))) {
        map.set(String(p.page_id), {
          id: String(p.page_id),
          name: p.page_name,
          platform: p.platform || 'facebook',
        });
      }
    });
    let pages = Array.from(map.values());
    if (platformFilter !== 'all') {
      pages = pages.filter(
        (pg) => pg.platform.toLowerCase() === platformFilter.toLowerCase()
      );
    }
    return pages;
  }, [detail, platformFilter]);

  const pageOptions = useMemo(() => [
    { value: 'all', label: 'All Pages' },
    ...availablePages.map((p) => ({
      value: p.id,
      label: p.name,
      icon:
        p.platform === 'tiktok' ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46v-7.05a8.28 8.28 0 0 0 5.77 2.29V11.9a4.84 4.84 0 0 1-3-1.07 4.82 4.82 0 0 1-1.39-2.14h4.39v-2z" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#1877f2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        ),
    })),
  ], [availablePages]);

  // Dynamically derive products from brand details
  const availableProducts = useMemo(() => {
    if (!detail || !detail.products) return [];
    return detail.products.map((prod) => ({
      id: String(prod.id),
      name: prod.product_name,
      image: prod.image_url,
    }));
  }, [detail]);

  const productOptions = useMemo(() => [
    { value: 'all', label: `All Products (${availableProducts.length})` },
    ...availableProducts.map((prod) => ({
      value: prod.id,
      label: prod.name,
      icon: prod.image ? (
        <img
          src={prod.image}
          alt={prod.name}
          style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }}
        />
      ) : (
        <Package size={14} color="#64748b" />
      ),
    })),
  ], [availableProducts]);

  const currentPlatformLabel =
    platformOptions.find((o) => o.value === platformFilter)?.label || 'All Platforms';
  const currentPageLabel =
    pageFilter === 'all'
      ? 'All Pages'
      : availablePages.find((p) => p.id === String(pageFilter))?.name || 'Selected Page';
  const currentProductLabel =
    productFilter === 'all'
      ? 'All Products'
      : availableProducts.find((p) => p.id === String(productFilter))?.name || 'Selected Product';
  const currentFormatLabel =
    formatOptions.find((f) => f.value === formatFilter)?.label || 'All Formats';

  // ==================== FETCH BRAND DETAIL ====================
  const fetchDetail = async (force = false) => {
    try {
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
      const filterParams = {
        range: timeFilter,
        startDate: customRange.start || undefined,
        endDate: customRange.end || undefined,
        timezone: tz,
      };
      const idsParam = searchParams.get('ids');
      const currentCacheKey =
        id === 'combined' || idsParam
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
          const combinedData = await getCombinedBrandDetail(brandIds, filterParams, force);
          setDetail(combinedData);
        }
      } else {
        const data = await getBrandDetail(id, filterParams, force);
        if (data && data.posts) {
          data.posts = data.posts.map((p) => ({
            ...p,
            brand_name: p.brand_name || data.brand_name,
            brand_id: p.brand_id || data.brand_id,
          }));
        }
        setDetail(data);
      }
      setError(null);
    } catch (err) {
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
      const filterParams = {
        range: timeFilter,
        startDate: customRange.start || undefined,
        endDate: customRange.end || undefined,
        timezone: tz,
      };
      const idsParam = searchParams.get('ids');
      const currentCacheKey =
        id === 'combined' || idsParam
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
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
      const idsParam = searchParams.get('ids');
      const targetBrandIds =
        id === 'combined' || idsParam
          ? idsParam
            ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
            : []
          : id && id !== 'all'
            ? [id]
            : [];

      await syncPosts({
        brandIds: targetBrandIds,
        brandId:
          targetBrandIds.length === 1
            ? targetBrandIds[0]
            : id !== 'combined'
              ? id
              : undefined,
        range: timeFilter,
        startDate: customRange?.start || undefined,
        endDate: customRange?.end || undefined,
        platform: platformFilter !== 'all' ? platformFilter : undefined,
        pageId: pageFilter !== 'all' ? pageFilter : undefined,
        productIds: productFilter !== 'all' ? [productFilter] : undefined,
        timezone: tz,
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
    let posts = detail.posts.filter(
      (p) => p.status === 'published' || p.published_time
    );

    // 1. Time filter
    posts = posts.filter((p) =>
      isPostInDateRange(p, timeFilter, customRange.start, customRange.end)
    );

    // 2. Platform filter
    if (platformFilter !== 'all') {
      posts = posts.filter(
        (p) =>
          (p.platform || 'facebook').toLowerCase() ===
          platformFilter.toLowerCase()
      );
    }

    // 3. Page filter
    if (pageFilter !== 'all') {
      posts = posts.filter((p) => String(p.page_id) === String(pageFilter));
    }

    // 4. Product filter
    if (productFilter !== 'all') {
      posts = posts.filter((p) => String(p.product_id) === String(productFilter));
    }

    // 5. Format filter
    if (formatFilter !== 'all') {
      posts = posts.filter((p) => {
        const m = (p.media_type || 'photo').toLowerCase();
        if (formatFilter === 'live') return m === 'live' || m.includes('live');
        if (formatFilter === 'video')
          return (
            (m === 'video' || m === 'reel') &&
            m !== 'live' &&
            !m.includes('live')
          );
        return m === formatFilter.toLowerCase();
      });
    }

    // 6. Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      posts = posts.filter(
        (p) =>
          (p.product_name && p.product_name.toLowerCase().includes(q)) ||
          (p.page_name && p.page_name.toLowerCase().includes(q)) ||
          (p.fb_post_id && p.fb_post_id.toLowerCase().includes(q))
      );
    }

    return posts;
  }, [
    detail,
    timeFilter,
    customRange,
    platformFilter,
    pageFilter,
    productFilter,
    formatFilter,
    searchTerm,
  ]);

  const {
    sortedItems: sortedPosts,
    sortConfig,
    requestSort,
  } = useSortableTable(
    filteredPosts,
    { key: 'published_time', direction: 'desc' },
    {
      product_name: (p) => (p.product_name || '').toLowerCase(),
      channel: (p) => (p.page_name || '').toLowerCase(),
      format: (p) => {
        const m = (p.media_type || 'photo').toLowerCase();
        if (m === 'live' || m.includes('live')) return 'live';
        if (m === 'video' || m === 'reel') return 'video';
        return 'photo';
      },
      published_time: (p) =>
        p.published_time
          ? new Date(p.published_time).getTime()
          : p.scheduled_time
            ? new Date(p.scheduled_time).getTime()
            : 0,
      engagement: (p) =>
        (Number(p.views_count) || 0) +
        (Number(p.reach_count) || 0) +
        (Number(p.likes_count) || 0) +
        (Number(p.comments_count) || 0) +
        (Number(p.shares_count) || 0),
    }
  );

  const exportDateRange = useMemo(() => {
    const KHMER_MONTHS = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ',
    ];
    const formatDateKhmer = (d) => {
      if (!d) return '';
      if (typeof d === 'string' && d.includes('-')) {
        const parts = d.split('T')[0].split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (m >= 0 && m < 12) {
            return `${day} ${KHMER_MONTHS[m]} ${y}`;
          }
        }
      }
      const dateObj = d instanceof Date ? d : new Date(d);
      if (!dateObj || isNaN(dateObj.getTime())) return '';
      return `${dateObj.getDate()} ${KHMER_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    };

    const now = new Date();

    if (timeFilter === 'today') {
      const todayStr = formatDateKhmer(now);
      return { label: todayStr, start: todayStr, end: todayStr };
    }

    if (timeFilter === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + diffToMonday
      );
      const end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 6
      );
      const startStr = formatDateKhmer(start);
      const endStr = formatDateKhmer(end);
      return {
        label: `${startStr} រហូតដល់ ${endStr}`,
        start: startStr,
        end: endStr,
      };
    }

    if (timeFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = formatDateKhmer(start);
      const endStr = formatDateKhmer(end);
      return {
        label: `${startStr} រហូតដល់ ${endStr}`,
        start: startStr,
        end: endStr,
      };
    }

    if (timeFilter === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = formatDateKhmer(start);
      const endStr = formatDateKhmer(end);
      return {
        label: `${startStr} រហូតដល់ ${endStr}`,
        start: startStr,
        end: endStr,
      };
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
      return { label: 'ចន្លោះកាលបរិច្ឆេទកំណត់', start: '', end: '' };
    }

    return { label: 'គ្រប់ពេលវេលា', start: 'គ្រប់ពេលវេលា', end: 'គ្រប់ពេលវេលា' };
  }, [timeFilter, customRange]);

  const exportPageName = useMemo(() => {
    if (pageFilter !== 'all') {
      const selected = availablePages.find((p) => p.id === String(pageFilter));
      if (selected) return selected.name;
    }
    const uniquePages = Array.from(
      new Set((filteredPosts || []).map((p) => p.page_name).filter(Boolean))
    );
    if (uniquePages.length === 1) return uniquePages[0];
    if (uniquePages.length > 1) return uniquePages.join(', ');
    if (availablePages.length === 1) return availablePages[0].name;
    return detail?.brand_name || 'All Pages';
  }, [pageFilter, availablePages, filteredPosts, detail]);

  const topPost = useMemo(() => {
    if (!filteredPosts || filteredPosts.length === 0) return null;
    return [...filteredPosts].sort((a, b) => {
      const aEng = a.reach_count
        ? (a.likes_count + a.comments_count + a.shares_count) / a.reach_count
        : 0;
      const bEng = b.reach_count
        ? (b.likes_count + b.comments_count + b.shares_count) / b.reach_count
        : 0;
      if (bEng !== aEng) return bEng - aEng;
      return (b.views_count || 0) - (a.views_count || 0);
    })[0];
  }, [filteredPosts]);

  const getFormatBadge = (mediaType) => {
    const m = (mediaType || 'photo').toLowerCase();
    if (m === 'live' || m.includes('live')) {
      return (
        <span className="format-pill-tag format-live">
          <Radio size={11} /> Live
        </span>
      );
    }
    if (m === 'video' || m === 'reel') {
      return (
        <span className="format-pill-tag format-video">
          <Video size={11} /> Video
        </span>
      );
    }
    return (
      <span className="format-pill-tag format-photo">
        <Image size={11} /> Photo
      </span>
    );
  };

  const getChannelBadge = (post) => {
    const platform = (post.platform || 'facebook').toLowerCase();
    const pageName = post.page_name || 'Facebook Page';
    return (
      <span className="channel-page-badge" title={`${pageName} (${platform})`}>
        {platform === 'tiktok' ? (
          <svg style={{ flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46v-7.05a8.28 8.28 0 0 0 5.77 2.29V11.9a4.84 4.84 0 0 1-3-1.07 4.82 4.82 0 0 1-1.39-2.14h4.39v-2z" />
          </svg>
        ) : (
          <svg style={{ flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="#1877f2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        )}
        <span>{pageName}</span>
      </span>
    );
  };

  return (
    <div className="brand-detail-page-container page-container product-page-container">
      {/* Breadcrumb & Back */}
      <div className="brand-detail-breadcrumb-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={handleBackToBrands}
          className="btn-secondary brand-detail-back-btn"
          style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}
          title="Back to Brands"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="page-breadcrumb" style={{ margin: 0 }}>
          <span style={{ cursor: 'pointer' }} onClick={handleBackToBrands}>Brands</span> / <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{id === 'combined' || (searchParams.get('ids') && searchParams.get('ids').includes(',')) ? 'Combined Detail' : 'Detail'}</span>
        </div>
      </div>

      {error && (
        <div className="alert-error-banner" style={{ marginBottom: '16px' }}>
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
          {/* ==================== 1. HERO HEADER CARD ==================== */}
          <div className="card brand-detail-hero-card" style={{ marginBottom: '16px' }}>
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
                    <h1 style={{ margin: 0, fontSize: '30px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {detail.brand_name}
                    </h1>
                    {detail.logos && detail.logos.length > 1 ? (
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Combined ({detail.logos.length} Brands)
                      </span>
                    ) : detail.total_products > 0 ? (
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active</span>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', color: '#64748b', fontSize: '13.5px', fontWeight: '500', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={15} color="#94a3b8" /> {detail.total_products} Linked
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart2 size={15} color="#94a3b8" /> {detail.total_posts} Published
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Right) using Global Button */}
              <div className="brand-detail-hero-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Button
                  variant="outline"
                  startIcon={<Download size={15} />}
                  onClick={() => setShowExportModal(true)}
                  style={{ height: '38px', borderRadius: '8px', fontSize: '13px' }}
                >
                  Export
                </Button>
                <Button
                  variant="outline"
                  startIcon={<RefreshCw size={15} className={isSyncing ? "spin-animation" : ""} />}
                  onClick={handleSync}
                  disabled={isSyncing}
                  style={{ height: '38px', borderRadius: '8px', fontSize: '13px' }}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Data'}
                </Button>
              </div>

            </div>
          </div>

          {/* ==================== 2. UNIFIED CAMPAIGN & ANALYTICS HUB (SIDE-BY-SIDE) ==================== */}
          <div className="card brand-unified-hub-card" style={{ marginBottom: '20px' }}>
            <div className="analytics-filter-container">
              {/* Header: Title + Post Count + Actions on top right */}
              <div
                className="analytics-filter-header"
                style={{
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div className="analytics-title-group">
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    Campaign Performance & Deliverables
                  </h3>
                  <span
                    className="analytics-post-count-badge"
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#64748b',
                    }}
                  >
                    Showing {filteredPosts.length} of {detail.posts?.length || 0} published posts
                  </span>
                </div>

                {/* Top Right Action Buttons */}
                {id !== 'combined' && (
                  <div className="analytics-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      startIcon={<Plus size={13} />}
                      onClick={() => setActiveAddSlotModal({ isOpen: true })}
                      style={{ height: '34px', fontSize: '12px', borderRadius: '8px', padding: '0 12px' }}
                    >
                      Add Date
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      startIcon={<Edit3 size={13} />}
                      onClick={() => setActiveBlueprintModal({ isOpen: true })}
                      style={{ height: '34px', fontSize: '12px', borderRadius: '8px', padding: '0 12px' }}
                    >
                      Edit Blueprint
                    </Button>
                  </div>
                )}
              </div>

              {/* Filter Toolbar: Design System Global Selects + Smart DateRangeFilter */}
              <div
                className="analytics-filter-toolbar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                {/* 1. Smart Date Range Dropdown */}
                <DateRangeFilter
                  value={timeFilter}
                  onChange={handleTimeFilterChange}
                  customRange={customRange}
                  onCustomRangeChange={handleCustomRangeChange}
                  minWidth="145px"
                  align="left"
                />

                {/* 2. Platform Dropdown */}
                <div style={{ minWidth: '150px' }}>
                  <Select
                    value={platformFilter}
                    options={platformOptions}
                    onChange={(e) => {
                      const val = e?.target?.value || e;
                      let updates = { platform: val };
                      if (pageFilter !== 'all') {
                        const pg = availablePages.find((p) => p.id === String(pageFilter));
                        if (
                          pg &&
                          val !== 'all' &&
                          pg.platform.toLowerCase() !== val.toLowerCase()
                        ) {
                          updates.page_id = 'all';
                        }
                      }
                      setFilters(updates);
                    }}
                    placeholder="Platform"
                    isClearable={false}
                    maxVisibleItems={5.5}
                  />
                </div>

                {/* 3. Page Dropdown */}
                <div style={{ minWidth: '170px' }}>
                  <Select
                    value={pageFilter}
                    options={pageOptions}
                    onChange={(e) => {
                      const val = e?.target?.value || e;
                      setFilter('page_id', val);
                    }}
                    placeholder="All Pages"
                    isClearable={false}
                    maxVisibleItems={5.5}
                  />
                </div>

                {/* 4. Product Dropdown */}
                <div style={{ minWidth: '180px' }}>
                  <Select
                    value={productFilter}
                    options={productOptions}
                    onChange={(e) => {
                      const val = e?.target?.value || e;
                      setFilter('product', val);
                    }}
                    placeholder="All Products"
                    isClearable={false}
                    maxVisibleItems={5.5}
                  />
                </div>

                {/* 5. Format Dropdown */}
                <div style={{ minWidth: '145px' }}>
                  <Select
                    value={formatFilter}
                    options={formatOptions}
                    onChange={(e) => {
                      const val = e?.target?.value || e;
                      setFilter('format', val);
                    }}
                    placeholder="All Formats"
                    isClearable={false}
                    maxVisibleItems={5.5}
                  />
                </div>

                {/* Reset button if active filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    startIcon={<RotateCcw size={12} />}
                    onClick={resetAllFilters}
                    style={{ height: '38px', color: '#dc2626', fontSize: '12.5px' }}
                    title="Reset all filters"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Main 2-Column Responsive Body Grid */}
            <div
              className="brand-unified-grid"
              style={id === 'combined' ? { gridTemplateColumns: '1fr' } : {}}
            >
              {/* LEFT COLUMN: Campaign Mission & Deliverables Hub (~360px) */}
              {id !== 'combined' && (
                <div className="brand-mission-sidebar-panel">
                  {/* Panel Header: Title + Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '7px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Target size={15} color="#2563eb" />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
                          Campaign Mission
                        </h4>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                          Monthly Contract • {missionMonthLabel}
                        </div>
                      </div>
                    </div>

                    {/* Monthly Health Status Badge */}
                    {brandMission && (brandMission.total_slots > 0 || (brandMission.slots && brandMission.slots.length > 0)) && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 9px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor:
                            brandMission.completion_rate === 100
                              ? '#f0fdf4'
                              : brandMission.missed_slots > 0
                                ? '#fef2f2'
                                : '#eff6ff',
                          color:
                            brandMission.completion_rate === 100
                              ? '#16a34a'
                              : brandMission.missed_slots > 0
                                ? '#dc2626'
                                : '#2563eb',
                          border: `1px solid ${brandMission.completion_rate === 100
                            ? '#bbf7d0'
                            : brandMission.missed_slots > 0
                              ? '#fecaca'
                              : '#bfdbfe'
                            }`,
                        }}
                      >
                        {brandMission.completion_rate === 100 ? (
                          <>✓ 100% Done</>
                        ) : brandMission.missed_slots > 0 ? (
                          <>⚠️ {brandMission.missed_slots} Missed</>
                        ) : (
                          <>🎯 On Track</>
                        )}
                      </span>
                    )}
                  </div>

                  {missionLoading ? (
                    <BrandMissionPanelSkeleton />
                  ) : brandMission && (brandMission.total_slots > 0 || (brandMission.slots && brandMission.slots.length > 0)) ? (
                    <>
                      {/* Progress Bar & Quota Status */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Deliverables Done
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                            {brandMission.completed_slots} / {brandMission.total_slots} ({brandMission.completion_rate}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${brandMission.completion_rate}%`,
                              height: '100%',
                              backgroundColor:
                                brandMission.completion_rate === 100
                                  ? '#16a34a'
                                  : brandMission.missed_slots > 0
                                    ? '#ef4444'
                                    : '#2563eb',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>

                      {/* Quota Breakdown Pills */}
                      {brandMission.breakdown && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#15803d',
                              backgroundColor: (formatFilter === 'all' || formatFilter === 'photo') ? '#ffffff' : '#f8fafc',
                              border: `1px solid ${formatFilter === 'photo' ? '#16a34a' : '#bbf7d0'}`,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              opacity: (formatFilter === 'all' || formatFilter === 'photo') ? 1 : 0.45,
                              boxShadow: formatFilter === 'photo' ? '0 1px 3px rgba(22, 163, 74, 0.2)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Posters: <strong>{brandMission.breakdown.posters?.completed || 0}/{brandMission.breakdown.posters?.target || 0}</strong>
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#1d4ed8',
                              backgroundColor: (formatFilter === 'all' || formatFilter === 'live') ? '#ffffff' : '#f8fafc',
                              border: `1px solid ${formatFilter === 'live' ? '#2563eb' : '#bfdbfe'}`,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              opacity: (formatFilter === 'all' || formatFilter === 'live') ? 1 : 0.45,
                              boxShadow: formatFilter === 'live' ? '0 1px 3px rgba(37, 99, 235, 0.2)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Live: <strong>{brandMission.breakdown.lives?.completed || 0}/{brandMission.breakdown.lives?.target || 0}</strong>
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#7e22ce',
                              backgroundColor: (formatFilter === 'all' || formatFilter === 'video') ? '#ffffff' : '#f8fafc',
                              border: `1px solid ${formatFilter === 'video' ? '#9333ea' : '#e9d5ff'}`,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              opacity: (formatFilter === 'all' || formatFilter === 'video') ? 1 : 0.45,
                              boxShadow: formatFilter === 'video' ? '0 1px 3px rgba(147, 51, 234, 0.2)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Videos: <strong>{brandMission.breakdown.videos?.completed || 0}/{brandMission.breakdown.videos?.target || 0}</strong>
                          </span>
                        </div>
                      )}

                      {/* Deliverables Timeline Feed */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} color="#64748b" /> Schedule Timeline
                            {(timeFilter !== 'this_month' && timeFilter !== 'last_month' || formatFilter !== 'all') && (
                              <span style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: '600', marginLeft: '4px' }}>
                                • {timeFilter === 'today' ? 'Today' : timeFilter === 'yesterday' ? 'Yesterday' : timeFilter === 'this_week' ? 'This Week' : formatFilter !== 'all' ? (formatFilter === 'photo' ? 'Posters' : formatFilter === 'live' ? 'Live' : 'Videos') : 'Filtered'} ({filteredSlots.length})
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            Click slot to edit
                          </span>
                        </div>

                        {filteredSlots.length === 0 ? (
                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '20px 14px',
                              backgroundColor: '#ffffff',
                              border: '1px dashed #cbd5e1',
                              borderRadius: '8px',
                              textAlign: 'center',
                              gap: '6px',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                              {timeFilter === 'today'
                                ? 'No deliverables scheduled for Today'
                                : timeFilter === 'yesterday'
                                  ? 'No deliverables scheduled for Yesterday'
                                  : timeFilter === 'this_week'
                                    ? 'No deliverables scheduled for This Week'
                                    : formatFilter !== 'all'
                                      ? `No ${formatFilter === 'photo' ? 'Poster' : formatFilter === 'live' ? 'Live' : 'Video'} deliverables in this period`
                                      : 'No deliverables match this filter'}
                            </div>
                            {brandMission.slots && brandMission.slots.length > 0 && (
                              <>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  Monthly contract has <strong>{brandMission.slots.length}</strong> planned deliverable{brandMission.slots.length === 1 ? '' : 's'} total
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFilters({ range: 'this_month', start: '', end: '', format: 'all' })}
                                  style={{
                                    marginTop: '4px',
                                    fontSize: '11.5px',
                                    fontWeight: '600',
                                    color: '#2563eb',
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  View All This Month ({brandMission.slots.length})
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="deliverable-slots-scroll-list">
                            {filteredSlots.map((slot) => {
                              const style = getDeliverableChipStyle(slot.content_type);
                              const isDone = slot.computed_status === 'completed';
                              const isMissed = slot.computed_status === 'missed';

                              const dateObj = slot.planned_date_str
                                ? new Date(slot.planned_date_str + 'T00:00:00')
                                : null;
                              const formattedDate =
                                dateObj && !isNaN(dateObj.getTime())
                                  ? dateObj.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                  : slot.planned_date_str || 'No date';

                              return (
                                <div
                                  key={slot.id}
                                  onClick={() => setActiveSlotPopover({ isOpen: true, slot })}
                                  className="deliverable-slot-item"
                                  style={{
                                    backgroundColor: isMissed ? '#fef2f2' : isDone ? '#f0fdf4' : '#ffffff',
                                    border: `1px solid ${isMissed ? '#fca5a5' : isDone ? '#bbf7d0' : '#e2e8f0'}`,
                                    cursor: 'pointer',
                                  }}
                                  title={
                                    isMissed
                                      ? '⚠️ Missed deliverable! Click to reschedule date'
                                      : isDone
                                        ? '✓ Completed deliverable'
                                        : 'Scheduled deliverable. Click to edit'
                                  }
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                      style={{
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        fontSize: '10.5px',
                                        fontWeight: '700',
                                        backgroundColor: style.bg,
                                        border: `1px solid ${style.border}`,
                                        color: style.text,
                                      }}
                                    >
                                      {style.label}
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: isMissed ? '#b91c1c' : '#1e293b' }}>
                                      {formattedDate}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {isMissed && (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: '700',
                                          color: '#b91c1c',
                                          backgroundColor: '#fee2e2',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        ⚠️ Missed
                                      </span>
                                    )}
                                    {isDone && (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: '700',
                                          color: '#15803d',
                                          backgroundColor: '#dcfce7',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                        }}
                                      >
                                        <Check size={11} strokeWidth={3} /> Done
                                      </span>
                                    )}
                                    {!isMissed && !isDone && (
                                      <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                                        Scheduled
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Empty Blueprint State */
                    <div
                      style={{
                        flex: 1,
                        padding: '24px 14px',
                        backgroundColor: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b' }}>
                          No Blueprint for {missionMonthLabel}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Set contract quotas for posters, videos, and live streams.
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        startIcon={<Plus size={12} />}
                        onClick={() => setActiveBlueprintModal({ isOpen: true })}
                        style={{ fontSize: '11.5px', height: '32px' }}
                      >
                        Create Blueprint
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* RIGHT COLUMN: Analytics Overview & Insights Chart */}
              <div className="brand-analytics-chart-col" style={{ minWidth: 0 }}>
                <BrandInsightsChart
                  detail={detail}
                  posts={filteredPosts}
                  timeFilter={timeFilter}
                  onResetFilter={() => setFilters({ range: 'this_month', start: '', end: '' })}
                />
              </div>
            </div>
          </div>

          {/* ==================== 4. TOP PERFORMING POST HIGHLIGHT ==================== */}
          {topPost && (
            <div
              className="top-performing-banner"
              style={{
                backgroundColor: '#fffbeb',
                borderRadius: '12px',
                padding: '14px 20px',
                border: '1px solid #fde68a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fbbf24',
                    flexShrink: 0,
                  }}
                >
                  <Trophy size={20} color="#d97706" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '14px', color: '#92400e', fontWeight: 700 }}>
                    Top Performing Post
                  </h4>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#b45309' }}>
                    <strong style={{ color: '#92400e' }}>{topPost.product_name}</strong> •{' '}
                    {topPost.views_count?.toLocaleString() || 0} Views •{' '}
                    {topPost.reach_count > 0
                      ? (
                        ((topPost.likes_count +
                          topPost.comments_count +
                          topPost.shares_count) /
                          topPost.reach_count) *
                        100
                      ).toFixed(1)
                      : 0}
                    % Engagement
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                startIcon={<ExternalLink size={13} />}
                onClick={() =>
                  window.open(
                    getFacebookPostUrl(
                      topPost.fb_post_id,
                      topPost.post_url,
                      topPost.page_id || topPost.fb_page_id
                    ),
                    '_blank'
                  )
                }
                style={{
                  backgroundColor: '#d97706',
                  borderColor: '#d97706',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                View Post
              </Button>
            </div>
          )}

          {/* ==================== 5. TRACKED POSTS TABLE CARD ==================== */}
          <div
            className="table-card brand-posts-table-card"
            style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Toolbar Header Row inside table-card */}
            <div
              className="toolbar-header-row"
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                backgroundColor: '#ffffff',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '15px', margin: 0, fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                  Tracked Posts
                </h3>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sortedPosts.length}
                </span>
              </div>

              {/* Global Input for Search */}
              <div style={{ flex: 1, maxWidth: '340px' }}>
                <Input
                  placeholder="Search posts by product name..."
                  value={searchTerm}
                  onChange={(e) => setFilter('search', e.target.value)}
                  prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
                  isClearable
                  onClear={() => setFilter('search', '')}
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Desktop Table */}
            <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <SortableHeader label="Linked Product" sortKey="product_name" currentSort={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Channel & Page" sortKey="channel" currentSort={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Format" sortKey="format" currentSort={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Published Date" sortKey="published_time" currentSort={sortConfig} onSort={requestSort} defaultDirection="desc" />
                    <SortableHeader label="Engagement" sortKey="engagement" currentSort={sortConfig} onSort={requestSort} defaultDirection="desc" />
                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPosts.map((post) => (
                    <tr key={post.id}>
                      <td data-label="Linked Product">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SafeImage
                              src={
                                post.thumbnail_url ||
                                post.media_url ||
                                post.product_image ||
                                detail?.image_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`
                              }
                              fallbackSrc={
                                post.product_image ||
                                detail?.image_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`
                              }
                              poster={post.thumbnail_url}
                              alt={post.product_name || 'thumbnail'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              fallbackText=""
                            />
                          </div>
                          <span className="product-table-name" style={{ fontWeight: 600, color: '#0f172a' }}>{post.product_name}</span>
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
                          style={{ color: post.published_time ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Calendar size={12} color="#94a3b8" />
                          {post.published_time
                            ? new Date(post.published_time).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                            : 'Not published'}
                        </span>
                      </td>
                      <td data-label="Engagement">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 58px)', alignItems: 'center', gap: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1e293b', fontWeight: 600 }} title="Views">
                            <Eye size={13} color="#6366f1" /> {post.views_count ? post.views_count.toLocaleString() : '-'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1e293b', fontWeight: 600 }} title="Reach">
                            <Eye size={13} color="#0ea5e9" /> {post.reach_count ? post.reach_count.toLocaleString() : '-'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1e293b', fontWeight: 600 }} title="Likes">
                            <Heart size={13} color="#f43f5e" /> {post.likes_count ? post.likes_count.toLocaleString() : '-'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1e293b', fontWeight: 600 }} title="Comments">
                            <MessageCircle size={13} color="#8b5cf6" /> {post.comments_count ? post.comments_count.toLocaleString() : '-'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#1e293b', fontWeight: 600 }} title="Shares">
                            <Share2 size={13} color="#10b981" /> {post.shares_count ? post.shares_count.toLocaleString() : '-'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            startIcon={<RefreshCw size={12} className={refreshingPostId === post.id ? "spin-animation" : ""} />}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleRefreshSinglePost(post.id);
                            }}
                            disabled={refreshingPostId === post.id}
                            style={{ height: '30px', fontSize: '12px', padding: '0 8px' }}
                            title="Refresh metrics for this post directly from Facebook"
                          >
                            {refreshingPostId === post.id ? 'Refreshing...' : 'Refresh'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            startIcon={<ExternalLink size={12} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                getFacebookPostUrl(
                                  post.fb_post_id,
                                  post.post_url,
                                  post.page_id || post.fb_page_id
                                ),
                                '_blank'
                              );
                            }}
                            style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                          >
                            View Post
                          </Button>
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
                            {hasActiveFilters
                              ? 'No posts match the selected filters.'
                              : searchTerm
                                ? 'No posts match your search.'
                                : 'No posts have been tracked for this brand yet.'}
                          </span>
                          {hasActiveFilters && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetAllFilters}
                              style={{ marginTop: '8px' }}
                            >
                              Reset all filters
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
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
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '62px', height: '62px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SafeImage
                        src={
                          post.thumbnail_url ||
                          post.media_url ||
                          post.product_image ||
                          detail?.image_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`
                        }
                        fallbackSrc={
                          post.product_image ||
                          detail?.image_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'PR')}&background=c7d2fe&color=3730a3&rounded=false`
                        }
                        poster={post.thumbnail_url}
                        alt={post.product_name || 'thumbnail'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        fallbackText=""
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1, justifyContent: 'center' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        {getChannelBadge(post)}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    backgroundColor: '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
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

                  {/* Footer Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#64748b' }}>
                      <Calendar size={12} color="#94a3b8" />
                      {post.published_time
                        ? new Date(post.published_time).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                        : 'Not published'}
                    </span>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        startIcon={<RefreshCw size={11} className={refreshingPostId === post.id ? "spin-animation" : ""} />}
                        disabled={refreshingPostId === post.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleRefreshSinglePost(post.id);
                        }}
                        style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                      >
                        {refreshingPostId === post.id ? 'Syncing...' : 'Sync'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        startIcon={<ExternalLink size={11} />}
                        onClick={() =>
                          window.open(
                            getFacebookPostUrl(
                              post.fb_post_id,
                              post.post_url,
                              post.page_id || post.fb_page_id
                            ),
                            '_blank'
                          )
                        }
                        style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {hasActiveFilters
                    ? 'No posts match the selected filters.'
                    : searchTerm
                      ? 'No posts match your search.'
                      : 'No posts have been tracked for this brand yet.'}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== MODALS & POPOVERS ==================== */}

      {/* 1. Slot Popover (Reschedule date, edit format, delete) */}
      <SlotDatePopover
        isOpen={activeSlotPopover.isOpen}
        slot={activeSlotPopover.slot}
        brandName={detail?.brand_name}
        onClose={() => setActiveSlotPopover({ isOpen: false, slot: null })}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
      />

      {/* 2. Add Slot Date Modal */}
      <AddSlotModal
        isOpen={activeAddSlotModal.isOpen}
        brandId={id}
        brandName={detail?.brand_name}
        month={missionMonth}
        year={missionYear}
        onClose={() => setActiveAddSlotModal({ isOpen: false })}
        onSave={handleAddSlot}
      />

      {/* 3. Set / Edit Monthly Blueprint Modal */}
      <SetMissionModal
        isOpen={activeBlueprintModal.isOpen}
        initialBrandId={id}
        initialMonth={missionMonth}
        initialYear={missionYear}
        onClose={() => setActiveBlueprintModal({ isOpen: false })}
        onSaved={async () => {
          await loadBrandMission();
          await fetchDetail(true);
        }}
      />

      {/* 4. Export Modal */}
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

export default BrandDetailPage;
