import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Package, Eye, Tag, Search, Layers, Hash, DollarSign } from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { getBrandProfitability } from '../services/brandStatsService';

export const BrandStatsPage = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getBrandProfitability();
        setBrands(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch brand statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const stats = useMemo(() => {
    const totalBrands = brands.length;
    const activeBrands = brands.filter(b => b.total_products > 0).length;
    const totalPosts = brands.reduce((sum, b) => sum + (b.total_posts || 0), 0);
    const topBrand = [...brands].sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))[0];
    
    return {
      totalBrands,
      activeBrands,
      totalPosts,
      topBrandName: topBrand && topBrand.total_posts > 0 ? topBrand.brand_name : 'N/A'
    };
  }, [brands]);

  const filteredBrands = useMemo(() => {
    if (!searchTerm) return brands;
    return brands.filter(b => b.brand_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [brands, searchTerm]);

  return (
    <div className="product-page-container">
      <div className="product-page-header">
        <div>
          <div className="page-breadcrumb">
            <span>Statistics</span> / <span>Brands</span>
          </div>
          <h1 className="page-title">Brand Statistics</h1>
          <p className="page-subtitle">
            Track social media post volume grouped by product brands.
          </p>
        </div>
      </div>

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
            <span>Active (With Products)</span>
          </div>
          <div className="stat-value">{stats.activeBrands}</div>
        </div>
        
        <div className="stat-divider" />
        
        <div className="stat-item">
          <div className="stat-header">
            <Hash size={18} className="icon-purple" />
            <span>Total Tracked Posts</span>
          </div>
          <div className="stat-value">{stats.totalPosts}</div>
        </div>
        
        <div className="stat-divider" />
        
        <div className="stat-item">
          <div className="stat-header">
            <DollarSign size={18} style={{ color: '#f59e0b' }} />
            <span>Top Brand (Profit)</span>
          </div>
          <div className="stat-value" style={{ fontSize: '20px' }}>{stats.topBrandName}</div>
        </div>
      </div>

      <div className="product-toolbar-card card" style={{ marginBottom: '24px' }}>
        <div className="product-toolbar-top" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search brands by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="toolbar-search-input"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error-banner">
          <span>Error loading stats: {error}</span>
        </div>
      )}

      <div className="table-card product-table-card">
        <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Brand Name</th>
                <th>Posts / Products</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
                <th style={{ textAlign: 'right' }}>Spend</th>
                <th style={{ textAlign: 'center' }}>ROI</th>
                <th style={{ textAlign: 'right' }}>Net Profit</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td data-label="Brand Name">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Skeleton width={32} height={32} borderRadius={6} />
                        <Skeleton width="120px" height={16} />
                      </div>
                    </td>
                    <td data-label="Posts / Products">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Skeleton width="60px" height={16} />
                        <Skeleton width="80px" height={14} />
                      </div>
                    </td>
                    <td data-label="Revenue" style={{ textAlign: 'right' }}><Skeleton width="90px" height={18} style={{ marginLeft: 'auto' }} /></td>
                    <td data-label="Spend" style={{ textAlign: 'right' }}><Skeleton width="80px" height={18} style={{ marginLeft: 'auto' }} /></td>
                    <td data-label="ROI" style={{ textAlign: 'center' }}><Skeleton width="60px" height={24} borderRadius={12} style={{ margin: '0 auto' }} /></td>
                    <td data-label="Net Profit" style={{ textAlign: 'right' }}><Skeleton width="90px" height={18} style={{ marginLeft: 'auto' }} /></td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}><Skeleton width="70px" height={24} borderRadius={6} style={{ marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : filteredBrands.map((brand) => (
                  <tr key={brand.brand_id || 'unbranded'}>
                    <td data-label="Brand Name">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    <td data-label="Posts / Products">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="product-table-qty" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                          <BarChart2 size={12} style={{marginRight: '4px'}}/>
                          {brand.total_posts} posts
                        </span>
                        <span className="product-table-qty" style={{ color: 'var(--text-muted)' }}>
                          <Package size={12} style={{marginRight: '4px'}}/>
                          {brand.total_products || 0} products
                        </span>
                      </div>
                    </td>
                    <td data-label="Revenue" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                      ${(brand.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td data-label="Spend" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                      ${(brand.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td data-label="ROI" style={{ textAlign: 'center' }}>
                      <span className={`roi-badge ${(brand.roi || 0) >= 0 ? 'roi-badge-positive' : 'roi-badge-negative'}`}>
                        {(brand.roi || 0) >= 0 ? '+' : ''}{(brand.roi || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td data-label="Net Profit" style={{ textAlign: 'right' }}>
                      <span className={`profit-col-positive ${(brand.net_profit || 0) >= 0 ? 'profit-col-positive' : 'profit-col-negative'}`}>
                        ${(brand.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <button 
                        className="btn-primary-soft"
                        onClick={() => navigate(`/stats/brands/${brand.brand_id || 'unbranded'}`)}
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredBrands.length === 0 && (
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
              [1, 2, 3].map(i => (
                <div key={`skeleton-mob-${i}`} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <Skeleton width="100%" height={150} />
                </div>
              ))
            ) : filteredBrands.map((brand) => (
              <div key={`mob-${brand.brand_id || 'unbranded'}`} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                      <img src={brand.logo_url || brand.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.brand_name || 'Brand')}&background=e0e7ff&color=3730a3&bold=true&size=128`} alt={brand.brand_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>{brand.brand_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <Package size={12} /> {brand.total_products || 0} Products
                      </div>
                    </div>
                  </div>
                </div>
  
                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posts</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#6366f1' }}>{brand.total_posts?.toLocaleString() || '0'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#10b981' }}>${(brand.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spend</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>${(brand.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit / ROI</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: (brand.net_profit || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                        ${(brand.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '11px', color: (brand.roi || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600, backgroundColor: (brand.roi || 0) >= 0 ? '#d1fae5' : '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        {(brand.roi || 0) >= 0 ? '+' : ''}{(brand.roi || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
  
                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button 
                    className="btn-primary-soft"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    onClick={() => navigate(`/stats/brands/${brand.brand_id || 'unbranded'}`)}
                  >
                    <Eye size={14} style={{ marginRight: '6px' }} />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
            {!loading && filteredBrands.length === 0 && (
               <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                 No brands found matching your criteria.
               </div>
            )}
          </div>
        </div>
    </div>
  );
};
