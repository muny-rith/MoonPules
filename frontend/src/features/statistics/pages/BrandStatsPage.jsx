import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart2, Eye, Tag, Search, Layers, TrendingUp, Heart, RotateCcw, Flame } from 'lucide-react';
import { BrandStatsTopBannerSkeleton, BrandStatsTableSkeleton, BrandStatsMobileSkeleton } from '../../../shared/components/skeletons';
import { getBrandStats } from '../services/brandStatsService';
import { SortableHeader } from '../../../shared/components/ui/SortableHeader';
import { useSortableTable } from '../../../shared/hooks/useSortableTable';
import { DateRangeFilter, isPostInDateRange } from '../../../shared/components/ui/DateRangeFilter';

export const BrandStatsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(() => searchParams.get('range') || 'all');
  const [customRange, setCustomRange] = useState(() => ({
    start: searchParams.get('start') || '',
    end: searchParams.get('end') || ''
  }));

  const handleDateFilterChange = (newVal) => {
    setDateFilter(newVal);
    const params = new URLSearchParams(searchParams);
    if (newVal === 'all') {
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
    setDateFilter('all');
    setCustomRange({ start: '', end: '' });
    setSearchTerm('');
    setSearchParams({}, { replace: true });
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
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getBrandStats();
        setBrands(data || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch brand statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
                <SortableHeader label="Brand Name" sortKey="brand_name" currentSort={sortConfig} onSort={requestSort} />
                <SortableHeader label="Posts" sortKey="posts_count" currentSort={sortConfig} onSort={requestSort} defaultDirection="desc" />
                <SortableHeader label="Views" sortKey="views_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" />
                <SortableHeader label="Reach" sortKey="reach_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" />
                <SortableHeader label="Engagement" sortKey="engagement_count" currentSort={sortConfig} onSort={requestSort} align="right" defaultDirection="desc" />
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <BrandStatsTableSkeleton rowCount={5} />
              ) : sortedBrands.map((brand) => (
                <tr key={brand.brand_id || 'unbranded'}>
                  <td data-label="Brand Name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={brand.logo_url || brand.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.brand_name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`}
                          alt={brand.brand_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div className="product-table-name-wrap">
                        <span className="product-table-name">
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
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <button
                      className="btn-primary-soft"
                      onClick={() => handleNavigateToBrand(brand.brand_id)}
                    >
                      <Eye size={12} />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && sortedBrands.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
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
          ) : sortedBrands.map((brand) => (
            <div key={`mob-${brand.brand_id || 'unbranded'}`} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                    <img src={brand.logo_url || brand.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.brand_name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`} alt={brand.brand_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>{brand.brand_name}</div>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
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
          ))}
          {!loading && sortedBrands.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No brands found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
