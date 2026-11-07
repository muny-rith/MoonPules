import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight,
  Calendar, Filter, Search, Plus, Sparkles, ExternalLink, RefreshCw,
  LayoutGrid, ListOrdered, Edit3, ArrowRight, Eye, Layers, TrendingUp,
  BarChart2, Heart, Share2, ArrowUpDown, SlidersHorizontal
} from 'lucide-react';
import * as missionApi from '../api/missionApi';
import * as productService from '../../product/services/productService';
import { getBrandStats } from '../../statistics/services/brandStatsService';
import { SetMissionModal } from './SetMissionModal';
import { SlotDatePopover } from './SlotDatePopover';
import { AddSlotModal } from './AddSlotModal';
import { Button } from '../../../shared/components/ui';
import { invalidateMissionCaches } from '../../../shared/utils/cacheSync';

export const BrandDeliverablesHub = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  // View state
  const [viewMode, setViewMode] = useState('by_brand'); // 'by_brand' | 'by_date'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'on_track' | 'at_risk' | 'completed' | 'all'
  const [sortBy, setSortBy] = useState('brand_name');

  // Data
  const [allMasterBrands, setAllMasterBrands] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [statsList, setStatsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [activeBlueprintModal, setActiveBlueprintModal] = useState({ isOpen: false, brandId: null });
  const [activeSlotPopover, setActiveSlotPopover] = useState({ isOpen: false, slot: null, brandName: '' });
  const [activeAddSlotModal, setActiveAddSlotModal] = useState({ isOpen: false, brandId: null, brandName: '', initialDate: '' });

  // Pagination for 100-500 brands
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch Master Brands + Mission Audit + Performance Analytics
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [brandsData, auditData, statsData] = await Promise.all([
        productService.fetchBrands().catch(() => []),
        missionApi.getMonthAudit(month, year).catch(() => []),
        getBrandStats({ range: 'this_month' }).catch(() => []),
      ]);
      setAllMasterBrands(brandsData || []);
      setAuditList(auditData || []);
      setStatsList(statsData || []);
    } catch (err) {
      console.error('Failed to load unified deliverables hub data:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine Master Brands + Mission Audit + Social Performance into one unified entity
  const mergedBrands = useMemo(() => {
    const auditMap = new Map();
    auditList.forEach((a) => {
      auditMap.set(String(a.brand_id), a);
    });

    const statsMap = new Map();
    statsList.forEach((s) => {
      statsMap.set(String(s.brand_id || s.id), s);
    });

    const list = allMasterBrands.map((b) => {
      const bId = String(b.brand_id || b.id);
      const audit = auditMap.get(bId);
      const stats = statsMap.get(bId);

      const postsCount = stats ? (stats.posts_count || stats.total_posts || 0) : 0;
      const viewsCount = stats ? (stats.views_count || stats.total_views || 0) : 0;
      const reachCount = stats ? (stats.reach_count || stats.total_reach || 0) : 0;
      const engagementCount = stats ? (stats.engagement_count || stats.total_engagement || 0) : 0;

      const imageUrl = b.image_url || b.logo_url || b.logo || (stats && (stats.image_url || stats.logo_url));

      if (audit) {
        return {
          ...audit,
          brand_id: bId,
          brand_name: audit.brand_name || b.brand_name || b.name,
          image_url: imageUrl || audit.image_url,
          has_blueprint: true,
          posts_count: postsCount,
          views_count: viewsCount,
          reach_count: reachCount,
          engagement_count: engagementCount,
        };
      }

      return {
        brand_id: bId,
        brand_name: b.brand_name || b.name || `Brand #${bId}`,
        image_url: imageUrl,
        month,
        year,
        total_slots: 0,
        completed_slots: 0,
        missed_slots: 0,
        completion_rate: 0,
        status: 'unplanned',
        breakdown: {
          posters: { target: 0, completed: 0 },
          lives: { target: 0, completed: 0 },
          videos: { target: 0, completed: 0 },
        },
        slots: [],
        has_blueprint: false,
        posts_count: postsCount,
        views_count: viewsCount,
        reach_count: reachCount,
        engagement_count: engagementCount,
      };
    });

    // Also include any brands in audit or stats that might not be in master brands
    auditList.forEach((a) => {
      const aId = String(a.brand_id);
      if (!list.some((item) => item.brand_id === aId)) {
        const stats = statsMap.get(aId);
        list.push({
          ...a,
          brand_id: aId,
          has_blueprint: true,
          posts_count: stats ? (stats.posts_count || stats.total_posts || 0) : 0,
          views_count: stats ? (stats.views_count || stats.total_views || 0) : 0,
          reach_count: stats ? (stats.reach_count || stats.total_reach || 0) : 0,
          engagement_count: stats ? (stats.engagement_count || stats.total_engagement || 0) : 0,
        });
      }
    });

    return list;
  }, [allMasterBrands, auditList, statsList, month, year]);

  // Filtered & Sorted Brands
  const filteredBrands = useMemo(() => {
    let result = mergedBrands;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((b) => (b.brand_name || '').toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((b) => b.has_blueprint && b.total_slots > 0);
    } else if (statusFilter === 'completed') {
      result = result.filter((b) => b.has_blueprint && b.completion_rate === 100 && b.total_slots > 0);
    } else if (statusFilter === 'at_risk') {
      result = result.filter((b) => b.has_blueprint && (b.missed_slots > 0 || (b.completion_rate === 0 && b.total_slots > 0)));
    } else if (statusFilter === 'on_track') {
      result = result.filter((b) => b.has_blueprint && b.missed_slots === 0 && b.completion_rate < 100 && b.total_slots > 0);
    } else if (statusFilter === 'unplanned') {
      result = result.filter((b) => !b.has_blueprint || b.total_slots === 0);
    }

    // Unified Sorting
    return result.sort((a, b) => {
      if (sortBy === 'views') {
        return (b.views_count || 0) - (a.views_count || 0);
      }
      if (sortBy === 'engagement') {
        return (b.engagement_count || 0) - (a.engagement_count || 0);
      }
      if (sortBy === 'completion') {
        return (b.completion_rate || 0) - (a.completion_rate || 0);
      }
      if (sortBy === 'slots') {
        return (b.total_slots || 0) - (a.total_slots || 0);
      }
      if (sortBy === 'at_risk') {
        return (b.missed_slots || 0) - (a.missed_slots || 0);
      }
      // Default: brand_name (with planned blueprints first)
      if (a.has_blueprint && !b.has_blueprint) return -1;
      if (!a.has_blueprint && b.has_blueprint) return 1;
      return (a.brand_name || '').localeCompare(b.brand_name || '');
    });
  }, [mergedBrands, searchTerm, statusFilter, sortBy]);

  // Pagination slice
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBrands.slice(start, start + pageSize);
  }, [filteredBrands, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredBrands.length / pageSize) || 1;

  // Combined KPI Calculations (Operations + Social Reach)
  const stats = useMemo(() => {
    const total = mergedBrands.length;
    const planned = mergedBrands.filter((b) => b.has_blueprint && b.total_slots > 0).length;
    const completed = mergedBrands.filter((b) => b.has_blueprint && b.completion_rate === 100 && b.total_slots > 0).length;
    const atRisk = mergedBrands.filter((b) => b.has_blueprint && b.missed_slots > 0).length;

    let totalSlotsCount = 0;
    let completedSlotsCount = 0;
    let totalViewsCount = 0;
    let totalEngagementCount = 0;
    let totalPostsCount = 0;

    mergedBrands.forEach((b) => {
      totalSlotsCount += b.total_slots || 0;
      completedSlotsCount += b.completed_slots || 0;
      totalViewsCount += b.views_count || 0;
      totalEngagementCount += b.engagement_count || 0;
      totalPostsCount += b.posts_count || 0;
    });

    return {
      totalBrands: total,
      plannedBrands: planned,
      unplannedBrands: total - planned,
      completedBrands: completed,
      atRiskBrands: atRisk,
      totalDeliverables: totalSlotsCount,
      completedDeliverables: completedSlotsCount,
      totalViews: totalViewsCount,
      totalEngagement: totalEngagementCount,
      totalPosts: totalPostsCount,
    };
  }, [mergedBrands]);

  // Handle slot update (reschedule)
  const handleSaveSlot = async (slotData) => {
    await missionApi.updateSlot(slotData.id, {
      planned_date: slotData.planned_date,
      content_type: slotData.content_type,
      time_window: slotData.time_window,
      notes: slotData.notes,
    });
    await invalidateMissionCaches();
    await loadData();
  };

  // Handle slot delete
  const handleDeleteSlot = async (slotId) => {
    await missionApi.deleteSlot(slotId);
    await invalidateMissionCaches();
    await loadData();
  };

  // Handle slot create
  const handleCreateSlot = async (payload) => {
    await missionApi.createSlot(payload);
    await invalidateMissionCaches();
    await loadData();
  };

  // Date Navigation
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setCurrentPage(1);
  };

  const handleCurrentMonth = () => {
    setMonth(today.getMonth() + 1);
    setYear(today.getFullYear());
    setCurrentPage(1);
  };

  // Build By-Date Agenda list for the month
  const dateAgenda = useMemo(() => {
    if (viewMode !== 'by_date') return [];

    const allSlots = [];
    mergedBrands.forEach((b) => {
      if (b.slots && b.slots.length > 0) {
        b.slots.forEach((s) => {
          allSlots.push({
            ...s,
            brand_id: b.brand_id,
            brand_name: b.brand_name,
          });
        });
      }
    });

    const slotsByDate = {};
    allSlots.forEach((s) => {
      const dStr = s.planned_date_str;
      if (!slotsByDate[dStr]) slotsByDate[dStr] = [];
      slotsByDate[dStr].push(s);
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const result = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      const dateKey = `${year}-${mStr}-${dayStr}`;
      const dateObj = new Date(year, month - 1, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const daySlots = slotsByDate[dateKey] || [];
      result.push({
        dateStr: dateKey,
        dayNumber: day,
        dayName,
        slots: daySlots,
      });
    }

    return result;
  }, [mergedBrands, month, year, viewMode]);

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* OPERATIONS KPI BANNER */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Active Campaigns */}
        <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Active Campaigns</span>
            <Target size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {stats.plannedBrands} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>/ {stats.totalBrands} Total Brands</span>
          </div>
        </div>

        {/* 100% Completed */}
        <div style={{ padding: '16px 20px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>100% Completed</span>
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803d', marginTop: '6px' }}>
            {stats.completedBrands} <span style={{ fontSize: '13px', fontWeight: '500' }}>brands</span>
          </div>
        </div>

        {/* At Risk / Behind */}
        <div style={{ padding: '16px 20px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>At Risk / Incomplete</span>
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#b91c1c', marginTop: '6px' }}>
            {stats.atRiskBrands} <span style={{ fontSize: '13px', fontWeight: '500' }}>brands</span>
          </div>
        </div>

        {/* Deliverables Finished */}
        <div style={{ padding: '16px 20px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8' }}>Deliverables Done</span>
            <Clock size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e40af', marginTop: '6px' }}>
            {stats.completedDeliverables} <span style={{ fontSize: '14px', fontWeight: '500', color: '#3b82f6' }}>/ {stats.totalDeliverables}</span>
          </div>
        </div>
      </div>

      {/* UNIFIED MASTER TABLE CONTAINER */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
        }}
      >
        {/* Unified Toolbar Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Left: Search, Status, and Sort Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '20px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: '600',
                backgroundColor: statusFilter === 'active' ? '#eff6ff' : '#ffffff',
                color: statusFilter === 'active' ? '#1d4ed8' : '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="active">Active Campaigns ({stats.plannedBrands})</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk / Behind ({stats.atRiskBrands})</option>
              <option value="completed">Completed (100%)</option>
              <option value="all">All Brands Catalog ({mergedBrands.length})</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: '600',
                backgroundColor: '#ffffff',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="brand_name">Sort: Brand (A-Z)</option>
              <option value="completion">Sort: Completion Rate</option>
              <option value="slots">Sort: Most Deliverables</option>
              <option value="at_risk">Sort: Most Behind / Missed</option>
            </select>
          </div>

          {/* Right: Month Navigation, Perspective Switcher & Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Month & Year Navigation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{ padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontWeight: 'bold' }}
                title="Previous Month"
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={handleCurrentMonth}
                style={{ padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: '700', color: '#1e293b' }}
              >
                {monthNames[month - 1]} {year}
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{ padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontWeight: 'bold' }}
                title="Next Month"
              >
                &gt;
              </button>
            </div>

            {/* View Mode Toggle: By Brand vs By Date */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('by_brand')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'by_brand' ? '#ffffff' : 'transparent',
                  color: viewMode === 'by_brand' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'by_brand' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'by_brand' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <LayoutGrid size={13} />
                <span>By Brand</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('by_date')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'by_date' ? '#ffffff' : 'transparent',
                  color: viewMode === 'by_date' ? '#0f172a' : '#64748b',
                  fontWeight: viewMode === 'by_date' ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'by_date' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ListOrdered size={13} />
                <span>By Date</span>
              </button>
            </div>

            {/* Plan Brand Blueprint Button */}
            <Button
              variant="primary"
              onClick={() => setActiveBlueprintModal({ isOpen: true, brandId: null })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12.5px',
                padding: '7px 12px',
              }}
            >
              <Plus size={14} />
              <span>Plan Blueprint</span>
            </Button>
          </div>
        </div>

        {/* PERSPECTIVE 1: MASTER MATRIX */}
        {viewMode === 'by_brand' && (
          <div>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#2563eb' }} />
                Loading brand campaign roadmap for {monthNames[month - 1]} {year}...
              </div>
            ) : paginatedBrands.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <Target size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                  {statusFilter === 'active' ? `No active client campaigns set for ${monthNames[month - 1]} ${year}` : 'No brands match your filter'}
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', maxWidth: '420px', margin: '4px auto 16px' }}>
                  {statusFilter === 'active' ? 'Click below to set up a brand schedule blueprint, or switch to view the entire brand catalog.' : 'Try adjusting your search query or filter.'}
                </div>
                {statusFilter === 'active' && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <Button
                      variant="primary"
                      onClick={() => setActiveBlueprintModal({ isOpen: true, brandId: null })}
                    >
                      <Plus size={14} style={{ marginRight: '6px' }} /> Plan a Campaign Blueprint
                    </Button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      View All Catalog Brands ({mergedBrands.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 16px', minWidth: '180px' }}>Brand & Quota</th>
                      <th style={{ padding: '12px 16px', minWidth: '150px' }}>Progress</th>
                      <th style={{ padding: '12px 16px', minWidth: '130px' }}>Status</th>
                      <th style={{ padding: '12px 16px', minWidth: '380px' }}>Scheduled Deliverables (Click to edit)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '160px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBrands.map((brand) => {
                      const hasBlueprint = brand.has_blueprint && brand.total_slots > 0;
                      const isCompleted = brand.completion_rate === 100 && hasBlueprint;
                      const isAtRisk = hasBlueprint && brand.missed_slots > 0;

                      return (
                        <tr
                          key={brand.brand_id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '13px',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {/* 1. Brand & Quota */}
                          <td style={{ padding: '14px 16px' }}>
                            <div
                              onClick={() => navigate(`/stats/brands/${brand.brand_id}`)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                              title={`Click to view ${brand.brand_name} analytics detail`}
                            >
                              {brand.image_url ? (
                                <img
                                  src={brand.image_url}
                                  alt={brand.brand_name}
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    objectFit: 'contain',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    padding: '2px',
                                    flexShrink: 0,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextSibling) {
                                      e.currentTarget.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  backgroundColor: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#2563eb',
                                  fontWeight: '800',
                                  fontSize: '13px',
                                  display: brand.image_url ? 'none' : 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  textTransform: 'uppercase',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                }}
                              >
                                {(brand.brand_name || 'B').slice(0, 2).trim()}
                              </div>

                              <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                                {brand.brand_name}
                              </span>
                            </div>
                          </td>

                          {/* 2. Progress */}
                          <td style={{ padding: '14px 16px' }}>
                            {hasBlueprint ? (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <div style={{ flex: 1, height: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${brand.completion_rate}%`,
                                        height: '100%',
                                        backgroundColor: isCompleted ? '#16a34a' : (isAtRisk ? '#ef4444' : '#2563eb'),
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                                    {brand.completion_rate}%
                                  </span>
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                  <strong>{brand.completed_slots}</strong> of {brand.total_slots} finished
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          {/* 3. Status */}
                          <td style={{ padding: '14px 16px' }}>
                            {!hasBlueprint ? (
                              <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                ⚪ Unplanned
                              </span>
                            ) : isCompleted ? (
                              <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                ✅ Done
                              </span>
                            ) : isAtRisk ? (
                              <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                                ⚠️ At Risk (-{brand.missed_slots})
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                                ⏳ On Track
                              </span>
                            )}
                          </td>

                          {/* 4. Scheduled Deliverables & Inline Date Chips */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                              {brand.slots && brand.slots.length > 0 ? (
                                brand.slots.map((s) => {
                                  const isDone = s.computed_status === 'completed';
                                  const isMissed = s.computed_status === 'missed';
                                  const isScheduled = s.computed_status === 'scheduled';
                                  const formatIcon = s.content_type === 'live' ? '🎥' : (s.content_type === 'video' ? '🎬' : '🖼️');

                                  const dateParts = (s.planned_date_str || '').split('-');
                                  const labelDate = dateParts.length === 3 ? `${monthNames[parseInt(dateParts[1], 10) - 1]?.slice(0, 3)} ${dateParts[2]}` : s.planned_date_str;

                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => setActiveSlotPopover({ isOpen: true, slot: s, brandName: brand.brand_name })}
                                      title="Click to reschedule or edit this deliverable slot"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: `1px solid ${isDone ? '#86efac' : (isMissed ? '#fca5a5' : (isScheduled ? '#93c5fd' : '#cbd5e1'))}`,
                                        backgroundColor: isDone ? '#f0fdf4' : (isMissed ? '#fef2f2' : (isScheduled ? '#eff6ff' : '#f8fafc')),
                                        color: isDone ? '#166534' : (isMissed ? '#991b1b' : (isScheduled ? '#1e40af' : '#334155')),
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      <span>{formatIcon}</span>
                                      <span>{labelDate}</span>
                                      <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                        {isDone ? '✓' : (isMissed ? '✕' : (isScheduled ? '🕒' : ''))}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                  No dates scheduled
                                </span>
                              )}

                              {/* + Add Slot Button */}
                              <button
                                type="button"
                                onClick={() => setActiveAddSlotModal({ isOpen: true, brandId: brand.brand_id, brandName: brand.brand_name, initialDate: '' })}
                                title="Add deliverable date for this brand"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: '600',
                                  backgroundColor: '#f1f5f9',
                                  border: '1px dashed #cbd5e1',
                                  color: '#475569',
                                  cursor: 'pointer',
                                }}
                              >
                                <Plus size={13} />
                                <span>Add Date</span>
                              </button>
                            </div>
                          </td>

                          {/* 5. Actions */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setActiveBlueprintModal({ isOpen: true, brandId: brand.brand_id })}
                                title="Configure full monthly blueprint"
                                style={{
                                  padding: '5px 9px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#334155',
                                  cursor: 'pointer',
                                }}
                              >
                                Blueprint
                              </button>

                              <button
                                type="button"
                                onClick={() => navigate(`/calendar?brand=${brand.brand_id}`)}
                                title="View in Brand Calendar"
                                style={{
                                  padding: '5px 9px',
                                  backgroundColor: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                }}
                              >
                                Calendar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, filteredBrands.length)}</strong> of{' '}
                  <strong>{filteredBrands.length}</strong> brands
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff',
                      color: currentPage === 1 ? '#94a3b8' : '#334155',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: '700', padding: '0 6px' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                      color: currentPage === totalPages ? '#94a3b8' : '#334155',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PERSPECTIVE 2: BY DATE DAILY AGENDA */}
        {viewMode === 'by_date' && (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748b' }}>
              Chronological daily breakdown for <strong>{monthNames[month - 1]} {year}</strong>. Spot empty days and balance deliverable volume across clients.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dateAgenda.map((dayItem) => {
                const hasSlots = dayItem.slots.length > 0;
                const isToday =
                  today.getDate() === dayItem.dayNumber &&
                  today.getMonth() + 1 === month &&
                  today.getFullYear() === year;

                return (
                  <div
                    key={dayItem.dateStr}
                    style={{
                      borderRadius: '10px',
                      border: `1px solid ${isToday ? '#93c5fd' : '#e2e8f0'}`,
                      backgroundColor: isToday ? '#f0f9ff' : '#ffffff',
                      padding: '12px 16px',
                      boxShadow: isToday ? '0 2px 4px rgba(59, 130, 246, 0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasSlots ? '10px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: isToday ? '#2563eb' : (hasSlots ? '#f1f5f9' : '#f8fafc'),
                            color: isToday ? '#ffffff' : (hasSlots ? '#0f172a' : '#94a3b8'),
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '14px',
                            lineHeight: 1,
                          }}
                        >
                          <span>{dayItem.dayNumber}</span>
                          <span style={{ fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>
                            {dayItem.dayName}
                          </span>
                        </div>

                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                            {monthNames[month - 1]} {dayItem.dayNumber}, {year}
                            {isToday && (
                              <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '10.5px', fontWeight: '700' }}>
                                TODAY
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: hasSlots ? '#2563eb' : '#94a3b8', fontWeight: hasSlots ? 600 : 400 }}>
                            {hasSlots ? `${dayItem.slots.length} deliverable${dayItem.slots.length > 1 ? 's' : ''} scheduled` : 'No deliverables scheduled'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveAddSlotModal({ isOpen: true, brandId: null, brandName: '', initialDate: dayItem.dateStr })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px dashed #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={13} />
                        <span>Schedule Brand</span>
                      </button>
                    </div>

                    {/* Day Deliverables Cards */}
                    {hasSlots && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', marginTop: '8px' }}>
                        {dayItem.slots.map((s) => {
                          const isDone = s.computed_status === 'completed';
                          const isMissed = s.computed_status === 'missed';
                          const isScheduled = s.computed_status === 'scheduled';
                          const formatIcon = s.content_type === 'live' ? '🎥' : (s.content_type === 'video' ? '🎬' : '🖼️');

                          return (
                            <div
                              key={s.id}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: `1px solid ${isDone ? '#bbf7d0' : (isMissed ? '#fecaca' : (isScheduled ? '#bfdbfe' : '#e2e8f0'))}`,
                                backgroundColor: isDone ? '#f0fdf4' : (isMissed ? '#fef2f2' : (isScheduled ? '#eff6ff' : '#ffffff')),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                                  {s.brand_name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{formatIcon}</span>
                                  <span style={{ textTransform: 'capitalize' }}>{s.content_type || 'Poster'}</span>
                                  {s.time_window && <span style={{ color: '#64748b' }}>• {s.time_window}</span>}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setActiveSlotPopover({ isOpen: true, slot: s, brandName: s.brand_name })}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: '#334155',
                                  cursor: 'pointer',
                                }}
                              >
                                Edit / Move
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Blueprint Planning Modal */}
      <SetMissionModal
        isOpen={activeBlueprintModal.isOpen}
        onClose={() => setActiveBlueprintModal({ isOpen: false, brandId: null })}
        onSaved={loadData}
        initialMonth={month}
        initialYear={year}
        initialBrandId={activeBlueprintModal.brandId || ''}
      />

      {/* Inline Slot Date Reschedule Popover */}
      <SlotDatePopover
        slot={activeSlotPopover.slot}
        isOpen={activeSlotPopover.isOpen}
        onClose={() => setActiveSlotPopover({ isOpen: false, slot: null, brandName: '' })}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
        brandName={activeSlotPopover.brandName}
      />

      {/* Add Slot Modal */}
      <AddSlotModal
        isOpen={activeAddSlotModal.isOpen}
        onClose={() => setActiveAddSlotModal({ isOpen: false, brandId: null, brandName: '', initialDate: '' })}
        onSave={handleCreateSlot}
        brandId={activeAddSlotModal.brandId}
        brandName={activeAddSlotModal.brandName}
        month={month}
        year={year}
        initialDate={activeAddSlotModal.initialDate}
      />
    </div>
  );
};
