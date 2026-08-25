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
              [1, 2, 3, 4, 5].map(i => (
                <tr key={`skeleton-${i}`}>
                  <td><Skeleton width="120px" height={20} /></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Skeleton width="80px" height={16} />
                      <Skeleton width="100px" height={14} />
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}><Skeleton width="80px" height={18} style={{ marginLeft: 'auto' }} /></td>
                  <td style={{ textAlign: 'right' }}><Skeleton width="80px" height={18} style={{ marginLeft: 'auto' }} /></td>
                  <td style={{ textAlign: 'center' }}><Skeleton width="60px" height={24} borderRadius={12} style={{ margin: '0 auto' }} /></td>
                  <td style={{ textAlign: 'right' }}><Skeleton width="90px" height={18} style={{ marginLeft: 'auto' }} /></td>
                  <td style={{ textAlign: 'right' }}><Skeleton width="70px" height={24} borderRadius={6} style={{ marginLeft: 'auto' }} /></td>
                </tr>
              ))
            ) : filteredBrands.map((brand) => (
                <tr key={brand.brand_id || 'unbranded'}>
                  <td>
                    <div className="product-table-name-wrap">
                      <span className="product-table-name">
                        <Tag size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--color-primary)' }}/>
                        {brand.brand_name}
                      </span>
                    </div>
                  </td>
                  <td>
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
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                    ${(brand.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                    ${(brand.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`roi-badge ${(brand.roi || 0) >= 0 ? 'roi-badge-positive' : 'roi-badge-negative'}`}>
                      {(brand.roi || 0) >= 0 ? '+' : ''}{(brand.roi || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`profit-col-positive ${(brand.net_profit || 0) >= 0 ? 'profit-col-positive' : 'profit-col-negative'}`}>
                      ${(brand.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
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
    </div>
  );
};
