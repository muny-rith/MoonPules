import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronLeft,
  Eye,
  TrendingUp,
  Maximize2,
  Minimize2,
  Edit3,
} from 'lucide-react';
import { Input, Select, Button } from '../../../shared/components/ui';
import * as missionApi from '../api/missionApi';
import * as productService from '../../product/services/productService';
import * as brandStatsService from '../../statistics/services/brandStatsService';
import { SetMissionModal } from './SetMissionModal';
import { SlotDatePopover } from './SlotDatePopover';
import { AddSlotModal } from './AddSlotModal';

export const BrandUnifiedExpandableHub = () => {
  const navigate = useNavigate();

  // Active Month & Year
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active_brands'); // 'active_brands' | 'planned' | 'on_track' | 'at_risk' | 'completed' | 'all'
  const [sortBy, setSortBy] = useState('views_desc'); // 'views_desc' | 'reach_desc' | 'brand_name' | 'completion' | 'slots'
  const [loading, setLoading] = useState(false);

  // Expanded Rows State (Set of brand_ids)
  const [expandedBrandIds, setExpandedBrandIds] = useState(() => new Set());

  // Raw data from APIs
  const [allMasterBrands, setAllMasterBrands] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [statsList, setStatsList] = useState([]);

  // Modals & Popovers
  const [activeBlueprintModal, setActiveBlueprintModal] = useState({ isOpen: false, brandId: null });
  const [activeSlotPopover, setActiveSlotPopover] = useState({ isOpen: false, slot: null, brandName: '' });
  const [activeAddSlotModal, setActiveAddSlotModal] = useState({ isOpen: false, brandId: null, brandName: '', initialDate: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

      const [brands, audit, slots, stats] = await Promise.all([
        productService.fetchBrands().catch(() => []),
        missionApi.getMonthAudit(month, year).catch(() => []),
        missionApi.getCalendarSlots('all', month, year).catch(() => []),
        brandStatsService.getBrandStats({ startDate: startOfMonth, endDate: endOfMonth }).catch(() => []),
      ]);

      setAllMasterBrands(brands || []);
      setAuditList(audit || []);
      setAllSlots(slots || []);
      setStatsList(stats || []);

      // Default state is collapsed
      setExpandedBrandIds(new Set());
    } catch (err) {
      console.error('Failed to load unified brand hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  // Merge Brands, Missions, and Performance Analytics
  const mergedBrands = useMemo(() => {
    const auditMap = new Map();
    auditList.forEach((a) => {
      auditMap.set(String(a.brand_id), a);
    });

    const statsMap = new Map();
    statsList.forEach((s) => {
      statsMap.set(String(s.brand_id || s.id), s);
    });

    const slotsMap = new Map();
    allSlots.forEach((slot) => {
      const bId = String(slot.brand_id);
      if (!slotsMap.has(bId)) slotsMap.set(bId, []);
      slotsMap.get(bId).push(slot);
    });

    const list = allMasterBrands.map((b) => {
      const bId = String(b.brand_id || b.id);
      const audit = auditMap.get(bId);
      const stats = statsMap.get(bId);
      const slots = slotsMap.get(bId) || [];

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
          slots,
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
        slots,
        has_blueprint: false,
        posts_count: postsCount,
        views_count: viewsCount,
        reach_count: reachCount,
        engagement_count: engagementCount,
      };
    });

    return list;
  }, [allMasterBrands, auditList, allSlots, statsList, month, year]);

  // Filtered & Sorted Brands
  const filteredBrands = useMemo(() => {
    let result = [...mergedBrands];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((b) => (b.brand_name || '').toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter === 'active_brands') {
      // Brand ទាំងអស់ដែលមានការផុស ឬមាន Plan ក្នុងខែនេះ
      result = result.filter((b) => (b.posts_count > 0) || (b.has_blueprint && b.total_slots > 0));
    } else if (statusFilter === 'planned' || statusFilter === 'active') {
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

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'views_desc') return (b.views_count || 0) - (a.views_count || 0);
      if (sortBy === 'reach_desc') return (b.reach_count || 0) - (a.reach_count || 0);
      if (sortBy === 'completion') return (b.completion_rate || 0) - (a.completion_rate || 0);
      if (sortBy === 'slots') return (b.total_slots || 0) - (a.total_slots || 0);
      return (a.brand_name || '').localeCompare(b.brand_name || '');
    });
  }, [mergedBrands, searchTerm, statusFilter, sortBy]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const activeBrands = mergedBrands.filter((b) => (b.posts_count > 0) || (b.has_blueprint && b.total_slots > 0));
    const planned = mergedBrands.filter((b) => b.has_blueprint && b.total_slots > 0);
    const completed = planned.filter((b) => b.completion_rate === 100);
    const atRisk = planned.filter((b) => b.missed_slots > 0 || (b.completion_rate === 0 && b.total_slots > 0));
    const onTrack = planned.filter((b) => b.has_blueprint && b.missed_slots === 0 && b.completion_rate < 100 && b.total_slots > 0);
    const totalSlots = planned.reduce((acc, b) => acc + (b.total_slots || 0), 0);
    const completedSlots = planned.reduce((acc, b) => acc + (b.completed_slots || 0), 0);

    const totalViews = mergedBrands.reduce((acc, b) => acc + (b.views_count || 0), 0);
    const totalReach = mergedBrands.reduce((acc, b) => acc + (b.reach_count || 0), 0);
    const totalEngagement = mergedBrands.reduce((acc, b) => acc + (b.engagement_count || 0), 0);

    return {
      totalBrands: mergedBrands.length,
      activeBrandsCount: activeBrands.length,
      plannedBrands: planned.length,
      completedBrands: completed.length,
      atRiskBrands: atRisk.length,
      onTrackBrands: onTrack.length,
      totalSlots,
      completedSlots,
      totalViews,
      totalReach,
      totalEngagement,
    };
  }, [mergedBrands]);

  // Dropdown options for enterprise Select component
  const statusOptions = useMemo(() => [
    { value: 'active_brands', label: `Active Brands (${stats.activeBrandsCount})` },
    { value: 'planned', label: `With Campaign Plan (${stats.plannedBrands})` },
    { value: 'on_track', label: `On Track (${stats.onTrackBrands})` },
    { value: 'at_risk', label: `At Risk / Behind (${stats.atRiskBrands})` },
    { value: 'completed', label: `Completed 100% (${stats.completedBrands})` },
    { value: 'all', label: `All Brands Catalog (${mergedBrands.length})` },
  ], [stats, mergedBrands.length]);

  const sortOptions = useMemo(() => [
    { value: 'views_desc', label: 'Sort: Most Views' },
    { value: 'reach_desc', label: 'Sort: Most Reach' },
    { value: 'brand_name', label: 'Sort: Brand (A-Z)' },
    { value: 'completion', label: 'Sort: Completion Rate' },
    { value: 'slots', label: 'Sort: Most Deliverables' },
  ], []);

  // Pagination Slice
  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage) || 1;
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBrands.slice(start, start + itemsPerPage);
  }, [filteredBrands, currentPage, itemsPerPage]);

  // Row Expand/Collapse Handler
  const toggleRowExpand = (brandId) => {
    const idStr = String(brandId);
    setExpandedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set(paginatedBrands.map((b) => String(b.brand_id)));
    setExpandedBrandIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedBrandIds(new Set());
  };

  // Deliverable Slot Mutations (Optimistic UI)
  const handleSaveSlot = async (slotData) => {
    await missionApi.updateSlot(slotData.id, {
      planned_date: slotData.planned_date,
      content_type: slotData.content_type,
      time_window: slotData.time_window,
      notes: slotData.notes,
    });
    setAllSlots((prev) =>
      prev.map((s) =>
        s.id === slotData.id
          ? {
            ...s,
            planned_date: slotData.planned_date,
            planned_date_str: slotData.planned_date,
            content_type: slotData.content_type,
            time_window: slotData.time_window,
            notes: slotData.notes,
          }
          : s
      )
    );
  };

  const handleDeleteSlot = async (slotId) => {
    await missionApi.deleteSlot(slotId);
    setAllSlots((prev) => prev.filter((s) => s.id !== slotId));
    setAuditList((prev) =>
      prev.map((a) => {
        if (a.total_slots > 0) {
          const newTotal = Math.max(0, a.total_slots - 1);
          return {
            ...a,
            total_slots: newTotal,
            completion_rate: newTotal > 0 ? Math.round((a.completed_slots / newTotal) * 100) : 0,
          };
        }
        return a;
      })
    );
  };

  const handleAddSlot = async (slotData) => {
    const res = await missionApi.createSlot(slotData);
    if (res?.data) {
      setAllSlots((prev) => [...prev, res.data]);
    }
    const updatedAudit = await missionApi.getMonthAudit(month, year);
    if (updatedAudit) setAuditList(updatedAudit);
  };

  // Month Navigation
  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
    setCurrentPage(1);
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentDate(d);
    setCurrentPage(1);
  };

  // Helper Badge Style for deliverables chips
  const getDeliverableChipStyle = (contentType) => {
    if (contentType === 'photo') {
      return { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', dot: '#16a34a', label: 'Poster' };
    }
    if (contentType === 'live') {
      return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', dot: '#2563eb', label: 'Live' };
    }
    if (contentType === 'video') {
      return { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8', dot: '#9333ea', label: 'Video' };
    }
    return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', dot: '#ef4444', label: 'Post' };
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* OPERATIONS & PERFORMANCE KPI BANNER */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Active Brands */}
        <div style={{ padding: '14px 18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748b' }}>Active Brands</span>
            <Target size={17} color="#2563eb" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {stats.activeBrandsCount} <span style={{ fontSize: '12px', fontWeight: '500', color: '#94a3b8' }}>/ {stats.totalBrands} Total</span>
          </div>
        </div>

        {/* 100% Completed */}
        <div style={{ padding: '14px 18px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#16a34a' }}>100% Completed</span>
            <CheckCircle2 size={17} color="#16a34a" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
            {stats.completedBrands} <span style={{ fontSize: '12px', fontWeight: '500' }}>brands</span>
          </div>
        </div>

        {/* Deliverables Done */}
        <div style={{ padding: '14px 18px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#1d4ed8' }}>Deliverables Done</span>
            <Clock size={17} color="#2563eb" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e40af', marginTop: '4px' }}>
            {stats.completedSlots} <span style={{ fontSize: '12px', fontWeight: '500', color: '#60a5fa' }}>/ {stats.totalSlots} scheduled</span>
          </div>
        </div>

        {/* Total Views */}
        <div style={{ padding: '14px 18px', backgroundColor: '#faf5ff', borderRadius: '12px', border: '1px solid #e9d5ff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#7e22ce' }}>Total Views</span>
            <Eye size={17} color="#9333ea" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#581c87', marginTop: '4px' }}>
            {stats.totalViews.toLocaleString()}
          </div>
        </div>

        {/* Total Engagement */}
        <div style={{ padding: '14px 18px', backgroundColor: '#fff1f2', borderRadius: '12px', border: '1px solid #fecdd3', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#be123c' }}>Total Engagement</span>
            <TrendingUp size={17} color="#e11d48" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#9f1239', marginTop: '4px' }}>
            {stats.totalEngagement.toLocaleString()}
          </div>
        </div>
      </div>

      {/* MASTER CARD WITH INTEGRATED TOOLBAR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* TOOLBAR HEADER ROW */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Left: Search & Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px', maxWidth: '280px' }}>
              <Input
                type="search"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                isClearable
                onClear={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="m-0"
                style={{ height: '38px', fontSize: '13px' }}
              />
            </div>

            {/* Status Dropdown */}
            <div style={{ minWidth: '210px' }}>
              <Select
                value={statusFilter}
                options={statusOptions}
                onChange={(e) => {
                  const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="Campaign Status"
              />
            </div>

            {/* Sort Dropdown */}
            <div style={{ minWidth: '190px' }}>
              <Select
                value={sortBy}
                options={sortOptions}
                onChange={(e) => {
                  const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                  setSortBy(val);
                }}
                placeholder="Sort by"
              />
            </div>
          </div>

          {/* Right: Month Navigation, Expand/Collapse Toggle & Blueprint Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Expand / Collapse All */}
            <Button
              variant="outline"
              size="sm"
              onClick={expandedBrandIds.size > 0 ? handleCollapseAll : handleExpandAll}
              startIcon={expandedBrandIds.size > 0 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              style={{
                width: '125px',
                minWidth: '125px',
                height: '38px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                justifyContent: 'center',
              }}
              title={expandedBrandIds.size > 0 ? 'Collapse all deliverable cards' : 'Expand all deliverable cards'}
            >
              {expandedBrandIds.size > 0 ? 'Collapse All' : 'Expand All'}
            </Button>

            {/* Month & Year Navigation (Fixed width so it doesn't jump or resize between months) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                height: '38px',
                width: '185px',
                minWidth: '185px',
                padding: '0 4px',
                boxSizing: 'border-box',
              }}
            >
              <Button
                variant="text"
                size="sm"
                onClick={handlePrevMonth}
                style={{ minWidth: '28px', height: '28px', padding: '0 6px', color: '#475569' }}
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </Button>
              <span
                onClick={handleCurrentMonth}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '0 4px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: '#1e293b',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
                title="Click to reset to current month"
              >
                {monthNames[month - 1]} {year}
              </span>
              <Button
                variant="text"
                size="sm"
                onClick={handleNextMonth}
                style={{ minWidth: '28px', height: '28px', padding: '0 6px', color: '#475569' }}
                title="Next Month"
              >
                <ChevronRight size={15} />
              </Button>
            </div>

            {/* Plan Brand Blueprint Button */}
            <Button
              variant="primary"
              size="sm"
              startIcon={<Plus size={14} />}
              onClick={() => setActiveBlueprintModal({ isOpen: true, brandId: null })}
              style={{ height: '38px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600' }}
            >
              Plan Blueprint
            </Button>
          </div>
        </div>

        {/* UNIFIED EXPANDABLE MASTER TABLE */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#2563eb' }} />
              Loading unified operations & performance matrix for {monthNames[month - 1]} {year}...
            </div>
          ) : paginatedBrands.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
              <Target size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                {statusFilter === 'active_brands'
                  ? `No active brands (posts or plans) found for ${monthNames[month - 1]} ${year}`
                  : statusFilter === 'planned'
                    ? `No campaign blueprints set for ${monthNames[month - 1]} ${year}`
                    : 'No brands match your filter'}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', maxWidth: '420px', margin: '4px auto 16px' }}>
                {statusFilter === 'active_brands' || statusFilter === 'planned'
                  ? 'Click below to set up a brand schedule blueprint, or switch to view the entire brand catalog.'
                  : 'Try adjusting your search query or filter.'}
              </div>
              {(statusFilter === 'active_brands' || statusFilter === 'planned') && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Button
                    variant="primary"
                    startIcon={<Plus size={14} />}
                    onClick={() => setActiveBlueprintModal({ isOpen: true, brandId: null })}
                  >
                    Plan a Campaign Blueprint
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStatusFilter('all')}
                  >
                    View All Catalog Brands ({mergedBrands.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 14px', width: '38px', textAlign: 'center' }}></th>
                  <th style={{ padding: '12px 16px', minWidth: '200px' }}>Brand</th>
                  <th style={{ padding: '12px 16px', minWidth: '180px' }}>Campaign Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', width: '90px' }}>Posts</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Views</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Reach</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Engagement</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBrands.map((brand) => {
                  const bId = String(brand.brand_id);
                  const isExpanded = expandedBrandIds.has(bId);
                  const hasBlueprint = brand.has_blueprint && brand.total_slots > 0;
                  const isCompleted = brand.completion_rate === 100 && hasBlueprint;
                  const isAtRisk = hasBlueprint && brand.missed_slots > 0;
                  const brandSlots = brand.slots || [];

                  return (
                    <React.Fragment key={bId}>
                      {/* MAIN COMPACT ROW */}
                      <tr
                        onClick={() => toggleRowExpand(bId)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = '#fafafa';
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        {/* 1. Expand Toggle Button */}
                        <td style={{ padding: '14px 10px', textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); toggleRowExpand(bId); }}>
                          <button
                            type="button"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isExpanded ? '#2563eb' : '#94a3b8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                            title={isExpanded ? 'Collapse deliverables' : 'Expand deliverable dates'}
                          >
                            <ChevronRight size={18} strokeWidth={2.5} />
                          </button>
                        </td>

                        {/* 2. Brand & Logo */}
                        <td style={{ padding: '14px 16px' }}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/stats/brands/${brand.brand_id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '12px',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                            title={`Click to view ${brand.brand_name} analytics detail`}
                          >
                            {/* Brand Logo Avatar */}
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

                            {/* Brand Name */}
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '14.5px' }}>
                              {brand.brand_name}
                            </span>
                          </div>
                        </td>

                        {/* 3. Campaign Status & Progress */}
                        <td style={{ padding: '14px 16px' }}>
                          {hasBlueprint ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: isCompleted ? '#16a34a' : (isAtRisk ? '#dc2626' : '#2563eb'),
                                }}>
                                  {isCompleted ? '✓ Completed' : (isAtRisk ? `⚠️ ${brand.missed_slots} Missed` : '🎯 On Track')}
                                </span>
                                <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#1e293b' }}>
                                  {brand.completed_slots} / {brand.total_slots} ({brand.completion_rate}%)
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${brand.completion_rate}%`,
                                    height: '100%',
                                    backgroundColor: isCompleted ? '#16a34a' : (isAtRisk ? '#ef4444' : '#2563eb'),
                                    borderRadius: '4px',
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>—</span>
                          )}
                        </td>

                        {/* 4. Posts */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>
                          {(brand.posts_count || 0).toLocaleString()}
                        </td>

                        {/* 5. Views */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>
                          {(brand.views_count || 0).toLocaleString()}
                        </td>

                        {/* 6. Reach */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#16a34a' }}>
                          {(brand.reach_count || 0).toLocaleString()}
                        </td>

                        {/* 7. Engagement */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', color: '#db2777' }}>
                          {(brand.engagement_count || 0).toLocaleString()}
                        </td>

                        {/* 8. Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              startIcon={<Eye size={12} />}
                              onClick={() => navigate(`/stats/brands/${brand.brand_id}`)}
                              style={{ height: '30px', fontSize: '11.5px', padding: '0 10px', borderRadius: '6px' }}
                              title="View full Brand Detail Analytics"
                            >
                              Details
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE ACCORDION DRAWER (DELIVERABLES TIMELINE & CHIPS) */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <td colSpan="8" style={{ padding: '0 24px 20px 52px' }}>
                            <div
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '16px 20px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                              }}
                            >
                              {/* Accordion Header: Format Breakdown & Actions */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  marginBottom: '14px',
                                  borderBottom: '1px solid #f1f5f9',
                                  paddingBottom: '12px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Target size={15} color="#2563eb" />
                                    <span>{monthNames[month - 1]} Campaign Deliverables</span>
                                  </div>

                                  {/* Format Quotas Breakdown */}
                                  {brand.breakdown && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px' }}>
                                        Posters: {brand.breakdown.posters.completed} / {brand.breakdown.posters.target}
                                      </span>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px' }}>
                                        Live: {brand.breakdown.lives.completed} / {brand.breakdown.lives.target}
                                      </span>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b21a8', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', padding: '2px 8px', borderRadius: '12px' }}>
                                        Videos: {brand.breakdown.videos.completed} / {brand.breakdown.videos.target}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    startIcon={<Plus size={13} />}
                                    onClick={() =>
                                      setActiveAddSlotModal({
                                        isOpen: true,
                                        brandId: brand.brand_id,
                                        brandName: brand.brand_name,
                                        initialDate: '',
                                      })
                                    }
                                    style={{ height: '28px', fontSize: '11.5px', padding: '0 8px', borderRadius: '6px' }}
                                  >
                                    Add Date
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    startIcon={<Edit3 size={12} />}
                                    onClick={() =>
                                      setActiveBlueprintModal({
                                        isOpen: true,
                                        brandId: brand.brand_id,
                                      })
                                    }
                                    style={{ height: '28px', fontSize: '11.5px', padding: '0 8px', borderRadius: '6px' }}
                                  >
                                    Edit Blueprint
                                  </Button>
                                </div>
                              </div>

                              {/* Deliverable Date Chips (Interactive Click-to-Reschedule) */}
                              {brandSlots.length === 0 ? (
                                <div style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                                  No deliverable dates scheduled yet for this month. Click <strong>+ Add Date</strong> or <strong>Edit Blueprint</strong> to schedule content posts.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                  {brandSlots.map((slot) => {
                                    const style = getDeliverableChipStyle(slot.content_type);
                                    const isDone = slot.computed_status === 'completed';
                                    const isMissed = slot.computed_status === 'missed';

                                    const dateObj = slot.planned_date_str ? new Date(slot.planned_date_str + 'T00:00:00') : null;
                                    const formattedDate = dateObj && !isNaN(dateObj.getTime())
                                      ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                      : (slot.planned_date_str || 'No date');

                                    return (
                                      <div
                                        key={slot.id}
                                        onClick={() =>
                                          setActiveSlotPopover({
                                            isOpen: true,
                                            slot,
                                            brandName: brand.brand_name,
                                          })
                                        }
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '5px 10px',
                                          borderRadius: '8px',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          backgroundColor: isDone ? '#dcfce7' : (isMissed ? '#fee2e2' : style.bg),
                                          border: `1px solid ${isDone ? '#86efac' : (isMissed ? '#fca5a5' : style.border)}`,
                                          color: isDone ? '#15803d' : (isMissed ? '#b91c1c' : style.color),
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                          transition: 'all 0.15s ease',
                                        }}
                                        title={`Click to reschedule or change deliverable format (${style.label})`}
                                      >
                                        <span
                                          style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: isDone ? '#16a34a' : (isMissed ? '#dc2626' : style.dot),
                                          }}
                                        />
                                        <span>
                                          [{style.label}] {formattedDate}
                                        </span>
                                        {isDone && <span style={{ fontSize: '11px' }}>✅</span>}
                                        {isMissed && <span style={{ fontSize: '11px' }}>⚠️</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {!loading && filteredBrands.length > itemsPerPage && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ fontSize: '12.5px', color: '#64748b' }}>
              Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredBrands.length)}</strong> of <strong>{filteredBrands.length}</strong> brands
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ height: '30px', fontSize: '12px', padding: '0 12px' }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ height: '30px', fontSize: '12px', padding: '0 12px' }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* POPUP: Reschedule Slot Popover */}
      <SlotDatePopover
        isOpen={activeSlotPopover.isOpen}
        slot={activeSlotPopover.slot}
        brandName={activeSlotPopover.brandName}
        onClose={() => setActiveSlotPopover({ isOpen: false, slot: null, brandName: '' })}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
      />

      {/* MODAL: Add Single Deliverable Slot */}
      <AddSlotModal
        isOpen={activeAddSlotModal.isOpen}
        brandId={activeAddSlotModal.brandId}
        brandName={activeAddSlotModal.brandName}
        month={month}
        year={year}
        initialDate={activeAddSlotModal.initialDate}
        onClose={() => setActiveAddSlotModal({ isOpen: false, brandId: null, brandName: '', initialDate: '' })}
        onSave={handleAddSlot}
      />

      {/* MODAL: Configure Brand Blueprint */}
      <SetMissionModal
        isOpen={activeBlueprintModal.isOpen}
        initialBrandId={activeBlueprintModal.brandId}
        initialMonth={month}
        initialYear={year}
        onClose={() => setActiveBlueprintModal({ isOpen: false, brandId: null })}
        onSaved={() => {
          loadData();
        }}
      />
    </div>
  );
};
