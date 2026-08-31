import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Tag, Package, AlertCircle } from 'lucide-react';
import * as productService from '../services/productService';

export const ProductPicker = ({ value, onChange, placeholder = 'Select a product...' }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productService.fetchProducts();
        if (isMounted) {
          setProducts(data || []);
        }
      } catch (err) {
        console.error('Failed to load products for picker:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (value && products.length > 0) {
      const match = products.find(p => String(p.product_id) === String(value));
      setSelectedProduct(match || null);
    } else if (!value) {
      setSelectedProduct(null);
    }
  }, [value, products]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.product_name?.toLowerCase().includes(q) ||
      p.category_name?.toLowerCase().includes(q) ||
      String(p.product_id).includes(q)
    );
  });

  const handleSelect = (product) => {
    setSelectedProduct(product);
    onChange(product.product_id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedProduct(null);
    onChange('');
  };

  return (
    <div className="product-picker-container" ref={dropdownRef}>
      {selectedProduct && !isOpen ? (
        <div className="product-picker-selected" onClick={() => setIsOpen(true)}>
          <img
            src={selectedProduct.image_url}
            alt={selectedProduct.product_name}
            className="product-picker-thumb"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
            }}
          />
          <div className="product-picker-selected-info">
            <div className="product-picker-selected-name">{selectedProduct.product_name}</div>
            <div className="product-picker-selected-meta">
              <span className="product-code-chip"><Tag size={10} /> #{selectedProduct.product_id}</span>
              <span className="product-picker-price">${Number(selectedProduct.unit_price).toFixed(2)}</span>
            </div>
          </div>
          <button type="button" className="product-picker-clear-btn" onClick={handleClear} title="Clear product selection">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          className={`product-picker-input-trigger ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(true)}
        >
          <Package size={16} className="text-muted" />
          <span className="product-picker-placeholder-text">
            {selectedProduct ? selectedProduct.product_name : placeholder}
          </span>
          <ChevronDown size={16} className={`picker-arrow ${isOpen ? 'open' : ''}`} />
        </div>
      )}

      {isOpen && (
        <div className="product-picker-dropdown">
          <div className="product-picker-search-box">
            <Search size={14} className="picker-search-icon" />
            <input
              type="text"
              className="product-picker-search-input"
              placeholder="Search by name, SKU or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                type="button"
                className="picker-search-clear"
                onClick={() => setSearch('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="product-picker-list">
            {loading ? (
              <div className="product-picker-empty">Loading Moon IMS products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="product-picker-empty">
                <AlertCircle size={16} />
                <span>No matching products found</span>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedProduct && String(selectedProduct.product_id) === String(p.product_id);
                return (
                  <div
                    key={p.product_id}
                    className={`product-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(p)}
                  >
                    <img
                      src={p.image_url}
                      alt={p.product_name}
                      className="product-picker-item-thumb"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="product-picker-item-details">
                      <div className="product-picker-item-title">{p.product_name}</div>
                      <div className="product-picker-item-sub">
                        <span className="sku">#{p.product_id}</span>
                        <span className="dot">•</span>
                        <span className="cat">{p.category_name}</span>
                        <span className="dot">•</span>
                        <span className="price">${Number(p.unit_price).toFixed(2)}</span>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="picker-item-check" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
