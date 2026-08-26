import React from 'react';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../component/ProductCard';
import { ProductTable } from '../component/ProductTable';
import { 
  Package, 
  Search, 
  LayoutGrid, 
  List, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Boxes, 
  DollarSign, 
  Share2, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Product = () => {
  const navigate = useNavigate();
  const {
    products,
    categories,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    stockFilter,
    setStockFilter,
    viewMode,
    setViewMode,
    stats,
    reload,
  } = useProducts();

  return (
    <div className="product-page-container">
      {/* Page Header */}
      <div className="product-page-header">
        <div>
          <div className="page-breadcrumb">
            <span>Inventory</span> / <span>Moon IMS</span>
          </div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">
            Browse and manage products synced from Moon IMS to link with social media campaigns.
          </p>
        </div>

        <div className="page-actions-group">
          <button 
            className="btn-secondary" 
            onClick={reload} 
            disabled={loading}
            title="Refresh product list from Moon IMS"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Sync IMS</span>
          </button>
          <button 
            className="btn-primary"
            onClick={() => navigate('/tasks')}
          >
            <Share2 size={15} />
            <span>Open Post Tracker</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="product-kpi-grid">
        <div className="card product-kpi-card">
          <div className="kpi-icon-wrap bg-blue-subtle">
            <Package size={20} className="icon-blue" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Products</span>
            <div className="kpi-number">{stats.total}</div>
          </div>
        </div>

        <div className="card product-kpi-card">
          <div className="kpi-icon-wrap bg-green-subtle">
            <CheckCircle2 size={20} style={{ color: '#10b981' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">In Stock</span>
            <div className="kpi-number">{stats.inStock}</div>
          </div>
        </div>

        <div className="card product-kpi-card">
          <div className="kpi-icon-wrap bg-amber-subtle">
            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Low Stock (≤20)</span>
            <div className="kpi-number">{stats.lowStock}</div>
          </div>
        </div>

        <div className="card product-kpi-card">
          <div className="kpi-icon-wrap bg-purple-subtle">
            <Boxes size={20} className="icon-purple" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Units</span>
            <div className="kpi-number">{stats.totalInventoryUnits}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category Chips, Stock Filter & View Toggle */}
      <div className="product-toolbar-card card">
        <div className="product-toolbar-top">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search products by name, SKU, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="toolbar-search-input"
            />
            {searchTerm && (
              <button 
                type="button" 
                className="btn-clear-search" 
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="toolbar-controls-right">
            <div className="filter-select-wrap">
              <SlidersHorizontal size={14} className="filter-icon" />
              <select 
                value={stockFilter} 
                onChange={(e) => setStockFilter(e.target.value)}
                className="custom-select"
              >
                <option value="all">All Stock Statuses</option>
                <option value="in_stock">In Stock Only</option>
                <option value="low_stock">Low Stock (≤20)</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            <div className="view-mode-toggle desktop-only">
              <button 
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="category-pills-row">
          <button 
            className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button 
              key={cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert-error-banner">
          <AlertTriangle size={18} />
          <span>Error loading products: {error}</span>
          <button onClick={reload} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Loading & Content View */}
      {loading ? (
        <div className="product-loading-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="product-card-skeleton card">
              <div className="skeleton-image" />
              <div className="skeleton-content">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="desktop-only" style={{ width: '100%' }}>
            {viewMode === 'grid' ? (
              products.length > 0 ? (
                <div className="product-grid">
                  {products.map((product) => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="product-empty-state card">
                  <Package size={48} className="empty-icon" />
                  <h3>No products found</h3>
                  <p>Try adjusting your search keywords or active category filters.</p>
                  <button 
                    className="btn-secondary" 
                    onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setStockFilter('all'); }}
                  >
                    Reset Filters
                  </button>
                </div>
              )
            ) : (
              <ProductTable products={products} />
            )}
          </div>
          
          <div className="mobile-only" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {products.length > 0 ? (
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>
            ) : (
              <div className="product-empty-state card">
                <Package size={48} className="empty-icon" />
                <h3>No products found</h3>
                <p>Try adjusting your search keywords or active category filters.</p>
                <button 
                  className="btn-secondary" 
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setStockFilter('all'); }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
