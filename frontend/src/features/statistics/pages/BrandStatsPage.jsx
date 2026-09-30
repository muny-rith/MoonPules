import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart2, Eye, Tag, Search, Layers, TrendingUp, Heart, RotateCcw, Flame, ChevronRight } from 'lucide-react';
import { BrandStatsTopBannerSkeleton, BrandStatsTableSkeleton, BrandStatsMobileSkeleton } from '../../../shared/components/skeletons';
import { getBrandStats, getCachedBrandStats } from '../services/brandStatsService';
import { SortableHeader } from '../../../shared/components/ui/SortableHeader';
import { useSortableTable } from '../../../shared/hooks/useSortableTable';
import { DateRangeFilter, isPostInDateRange } from '../../../shared/components/ui/DateRangeFilter';

export const BrandStatsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCached = getCachedBrandStats();
  const [brands, setBrands] = useState(() => initialCached || []);
  const [loading, setLoading] = useState(() => !initialCached);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(() => searchParams.get('range') || 'this_month');
  const [customRange, setCustomRange] = useState(() => ({
    start: searchParams.get('start') || '',
    end: searchParams.get('end') || ''
  }));

  const handleDateFilterChange = (newVal) => {
    setDateFilter(newVal);
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
    setCustomRange(range);
    const params = new URLSearchParams(searchParams);
    if (range.start) params.set('start', range.start);
    else params.delete('start');
    if (range.end) params.set('end', range.end);
    else params.delete('end');
    setSearchParams(params, { replace: true });
  };

  const handleResetFilters = () => {
    setDateFilter('this_month');
    setCustomRange({ start: '', end: '' });
    setSearchTerm('');
    setSearchParams({}, { replace: true });
  };

  const [selectedBrandIds, setSelectedBrandIds] = useState([]);

  const handleToggleBrand = (brandId) => {
    const idStr = String(brandId || 'unbranded');
    setSelectedBrandIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  const handleSelectAll = () => {
    if (selectedBrandIds.length === sortedBrands.length) {
      setSelectedBrandIds([]);
    } else {
      setSelectedBrandIds(sortedBrands.map((b) => String(b.brand_id || 'unbranded')));
    }
  };

  const handleViewCombined = () => {
    if (selectedBrandIds.length === 0) return;
    const params = new URLSearchParams();
    if (dateFilter !== 'all') {
      params.set('range', dateFilter);
      if (dateFilter === 'custom') {
        if (customRange.start) params.set('start', customRange.start);
        if (customRange.end) params.set('end', customRange.end);
      }
    }

    if (selectedBrandIds.length === 1) {
      const q = params.toString() ? `?${params.toString()}` : '';
      navigate(`/stats/brands/${selectedBrandIds[0]}${q}`);
    } else {
      params.set('ids', selectedBrandIds.join(','));
      navigate(`/stats/brands/combined?${params.toString()}`);
    }
  };

  const handleNavigateToBrand = (brandId) => {
    const params = new URLSearchParams();
    if (dateFilter !== 'all') {
      params.set('range', dateFilter);
      if (dateFilter === 'custom') {
        if (customRange.start) params.set('start', customRange.start);
        if (customRange.end) params.set('end', customRange.end);
      }
    }
    const q = params.toString() ? `?${params.toString()}` : '';
    navigate(`/stats/brands/${brandId || 'unbranded'}${q}`);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Phnom_Penh';
      const params = {
        range: dateFilter,
        startDate: customRange.start || undefined,
        endDate: customRange.end || undefined,
        timezone: tz
      };
      const hasCached = !!getCachedBrandStats(params);
      if (!hasCached) {
        setLoading(true);
      }
      try {
        const data = await getBrandStats(params);
        if (isMounted) {
          setBrands(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted && !hasCached) {
          setError(err.message || 'Failed to fetch brand statistics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [dateFilter, customRange.start, customRange.end]);

  // Dynamically compute social performance metrics per brand based on selected date range
  const brandsWithCalculatedMetrics = useMemo(() => {
    return brands.map(brand => {
      if (dateFilter === 'all') {
        return {
          ...brand,
          posts_count: brand.total_posts || 0,
          views_count: brand.total_views || 0,
          reach_count: brand.total_reach || 0,
          engagement_count: brand.total_engagement || 0
        };
      }

      // Filter brand posts according to the date range
      const matchingPosts = (brand.posts || []).filter(p =>
        isPostInDateRange(p, dateFilter, customRange.start, customRange.end)
      );

      const views = matchingPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const reach = matchingPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0);
      const engagement = matchingPosts.reduce((sum, p) => sum + (p.engagement || 0), 0);

      return {
        ...brand,
        posts_count: matchingPosts.length,
        views_count: views,
        reach_count: reach,
        engagement_count: engagement
      };
    });
  }, [brands, dateFilter, customRange]);

  const stats = useMemo(() => {
    const totalBrands = brandsWithCalculatedMetrics.length;
    const activeBrands = brandsWithCalculatedMetrics.filter(b => (b.posts_count || 0) > 0).length;
    const totalPosts = brandsWithCalculatedMetrics.reduce((sum, b) => sum + (b.posts_count || 0), 0);
    const totalViews = brandsWithCalculatedMetrics.reduce((sum, b) => sum + (b.views_count || 0), 0);
    const topBrand = [...brandsWithCalculatedMetrics].sort((a, b) => (b.views_count || 0) - (a.views_count || 0))[0];

    return {
      totalBrands,
      activeBrands,
      totalPosts,
      totalViews,
      topBrandName: topBrand && topBrand.posts_count > 0 ? topBrand.brand_name : 'N/A'
    };
  }, [brandsWithCalculatedMetrics]);

  const filteredBrands = useMemo(() => {
    if (!searchTerm) return brandsWithCalculatedMetrics;
    const q = searchTerm.toLowerCase();
    return brandsWithCalculatedMetrics.filter(b => (b.brand_name || '').toLowerCase().includes(q));
  }, [brandsWithCalculatedMetrics, searchTerm]);

  const { sortedItems: sortedBrands, sortConfig, requestSort } = useSortableTable(
    filteredBrands,
    { key: 'brand_name', direction: 'asc' },
    {
      brand_name: (b) => (b.brand_name || '').toLowerCase(),
      posts_count: (b) => Number(b.posts_count) || 0,
      views_count: (b) => Number(b.views_count) || 0,
      reach_count: (b) => Number(b.reach_count) || 0,
      engagement_count: (b) => Number(b.engagement_count) || 0,
    }
  );

  const hasActiveFilters = dateFilter !== 'all' || searchTerm.trim() !== '';

  return (
    <div className="product-page-container">
      <div className="product-page-header">
        <div>
          <div className="page-breadcrumb">
            <span>Statistics</span> / <span>Brands</span>
          </div>
          <h1 className="page-title">Brand Statistics</h1>
          <p className="page-subtitle">
            Track social media content performance and audience engagement across all brands.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ marginBottom: '24px' }}>
          <BrandStatsTopBannerSkeleton count={5} />
        </div>
      ) : (
        <div className="card stat-card-group" style={{ marginBottom: '24px' }}>
          <div className="stat-item">
            <div className="stat-header">
              <Tag size={18} className="icon-blue" />
              <span>Total Brands</span>
            </div>
            <div className="stat-value">{stats.totalBrands}</div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item">
            <div className="stat-header">
              <Layers size={18} style={{ color: '#10b981' }} />
              <span>Active Brands</span>
            </div>
            <div className="stat-value">{stats.activeBrands}</div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item">
            <div className="stat-header">
              <BarChart2 size={18} className="icon-purple" />
              <span>Tracked Posts</span>
            </div>
            <div className="stat-value">{stats.totalPosts}</div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item">
            <div className="stat-header">
              <Eye size={18} style={{ color: '#6366f1' }} />
              <span>Total Views</span>
            </div>
            <div className="stat-value" style={{ fontSize: '20px' }}>{stats.totalViews.toLocaleString()}</div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item">
            <div className="stat-header">
              <Flame size={18} style={{ color: '#f59e0b' }} />
              <span>Top Brand (Views)</span>
            </div>
            <div className="stat-value" style={{ fontSize: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stats.topBrandName}>
              {stats.topBrandName}
            </div>
          </div>
        </div>
      )}

      {/* TOOLBAR: Search + Date Range Filter + Reset */}
      <div className="product-toolbar-card card" style={{ marginBottom: '24px' }}>
        <div className="product-toolbar-top" style={{ borderBottom: 'none', paddingBottom: '0', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ flex: '1 1 280px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search brands by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="toolbar-search-input"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <DateRangeFilter
              value={dateFilter}
              onChange={handleDateFilterChange}
              customRange={customRange}
              onCustomRangeChange={handleCustomRangeChange}
              minWidth="160px"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  cursor: 'pointer'
                }}
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error-banner">
          <span>Error loading stats: {error}</span>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="table-card product-table-card">
        <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={sortedBrands.length > 0 && selectedBrandIds.length === sortedBrands.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#3b82f6' }}
                    title="Select All"
                  />
                </th>
                <SortableHeader label="Brand Name" sortKey="brand_name" currentSort={sortConfig} onSort={requestSort} />
                <SortableHeader label="Posts" sortKey="posts_count" currentSort={sortConfig} onSort={requestSort} defaultDirection="desc" thStyle={{ width: '140px' }} />
                <SortableHeader label="Views" sortKey="views_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ width: '130px' }} />
                <SortableHeader label="Reach" sortKey="reach_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ width: '130px' }} />
                <SortableHeader label="Engagement" sortKey="engagement_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" thStyle={{ width: '150px' }} />
                <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <BrandStatsTableSkeleton rowCount={5} />
              ) : sortedBrands.map((brand) => {
                const bIdStr = String(brand.brand_id || 'unbranded');
                const isSelected = selectedBrandIds.includes(bIdStr);
                return (
                  <tr
                    key={bIdStr}
                    onClick={() => handleToggleBrand(brand.brand_id)}
                    className={`brand-table-row ${isSelected ? 'is-selected' : ''}`}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === ' ') {
                        e.preventDefault();
                        handleToggleBrand(brand.brand_id);
                      }
                    }}
                    title={`Click row to ${isSelected ? 'deselect' : 'select'} ${brand.brand_name}`}
                  >
                    <td style={{ width: '48px', textAlign: 'center', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleBrand(brand.brand_id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#3b82f6' }}
                        title={`Select ${brand.brand_name}`}
                      />
                    </td>
                    <td data-label="Brand Name">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                        {/* Logo clickable only */}
                        <div
                          className="brand-logo-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToBrand(brand.brand_id);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              handleNavigateToBrand(brand.brand_id);
                            }
                          }}
                          title={`View ${brand.brand_name} performance details`}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <img
                            src={brand.logo_url || brand.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.brand_name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`}
                            alt={brand.brand_name}
                            draggable={false}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', pointerEvents: 'none' }}
                          />
                        </div>

                        {/* Name text clickable only */}
                        <div className="product-table-name-wrap">
                          <span
                            className="product-table-name brand-clickable-name"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToBrand(brand.brand_id);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                handleNavigateToBrand(brand.brand_id);
                              }
                            }}
                            title={`View ${brand.brand_name} performance details`}
                            style={{ cursor: 'pointer', textDecoration: 'none' }}
                          >
                            {brand.brand_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Posts">
                      <span className="product-table-qty" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        <BarChart2 size={12} style={{ marginRight: '4px' }} />
                        {brand.posts_count} posts
                      </span>
                    </td>
                    <td data-label="Views" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <Eye size={12} style={{ color: '#6366f1' }} />
                        {(brand.views_count || 0).toLocaleString()}
                      </span>
                    </td>
                    <td data-label="Reach" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <TrendingUp size={12} style={{ color: '#10b981' }} />
                        {(brand.reach_count || 0).toLocaleString()}
                      </span>
                    </td>
                    <td data-label="Engagement" style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: (brand.engagement_count || 0) > 0 ? '#fdf2f8' : '#f8fafc',
                        color: (brand.engagement_count || 0) > 0 ? '#db2777' : '#94a3b8',
                        fontWeight: 600
                      }}>
                        <Heart size={12} />
                        {(brand.engagement_count || 0).toLocaleString()}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-primary-soft brand-action-view-btn"
                        onClick={() => handleNavigateToBrand(brand.brand_id)}
                        title={`View ${brand.brand_name} Performance`}
                      >
                        <Eye size={12} />
                        <span>View</span>
                        <ChevronRight size={13} className="brand-action-chevron" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && sortedBrands.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No brands found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="mobile-only" style={{ padding: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <BrandStatsMobileSkeleton cardCount={3} />
          ) : sortedBrands.map((brand) => {
            const bIdStr = String(brand.brand_id || 'unbranded');
            const isSelected = selectedBrandIds.includes(bIdStr);
            return (
              <div
                key={`mob-${bIdStr}`}
                onClick={() => handleToggleBrand(brand.brand_id)}
                style={{
                  backgroundColor: 'white',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  cursor: 'pointer'
                }}
                title={`Tap card to ${isSelected ? 'deselect' : 'select'} ${brand.brand_name}`}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleBrand(brand.brand_id)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#3b82f6' }}
                      />
                    </div>
                    {/* Logo only */}
                    <div
                      className="brand-logo-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToBrand(brand.brand_id);
                      }}
                      style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                      title={`View ${brand.brand_name} details`}
                    >
                      <img src={brand.logo_url || brand.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.brand_name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`} alt={brand.brand_name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', pointerEvents: 'none' }} />
                    </div>
                    {/* Name only */}
                    <div>
                      <span
                        className="brand-clickable-name"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToBrand(brand.brand_id);
                        }}
                        style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px', cursor: 'pointer', textDecoration: 'none' }}
                        title={`View ${brand.brand_name} details`}
                      >
                        {brand.brand_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posts</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary)' }}>{brand.posts_count?.toLocaleString() || '0'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Views</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#6366f1' }}>{(brand.views_count || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reach</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#10b981' }}>{(brand.reach_count || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engagement</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#db2777' }}>{(brand.engagement_count || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-primary-soft"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    onClick={() => handleNavigateToBrand(brand.brand_id)}
                  >
                    <Eye size={14} style={{ marginRight: '6px' }} />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && sortedBrands.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No brands found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* FLOATING ACTION BAR FOR MULTI-SELECT */}
      {selectedBrandIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          zIndex: 1000,
          maxWidth: '92vw',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              {selectedBrandIds.length}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' }}>
              {selectedBrandIds.length === 1 ? 'Brand Selected' : 'Brands Selected'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleViewCombined}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Layers size={15} />
              <span>{selectedBrandIds.length > 1 ? 'View Combined Detail' : 'View Detail'}</span>
            </button>

            <button
              onClick={() => setSelectedBrandIds([])}
              style={{
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: 'none',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
