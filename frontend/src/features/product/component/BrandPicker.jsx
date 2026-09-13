import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Tag, Award, AlertCircle } from 'lucide-react';
import * as productService from '../services/productService';
import { PickerListSkeleton } from '../../../shared/components/skeletons';
import '../product.css';

export const BrandPicker = ({ value, onChange, placeholder = 'Search brand from catalog...' }) => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const loadBrands = async () => {
      try {
        setLoading(true);
        const data = await productService.fetchBrands();
        if (isMounted) {
          setBrands(data || []);
        }
      } catch (err) {
        console.error('Failed to load brands for picker:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBrands();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (value && brands.length > 0) {
      const match = brands.find(
        (b) => String(b.brand_id) === String(value) || String(b.id) === String(value)
      );
      setSelectedBrand(match || null);
    } else if (!value) {
      setSelectedBrand(null);
    }
  }, [value, brands]);

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

  const filteredBrands = brands.filter((b) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (b.brand_name || b.name || '').toLowerCase();
    const id = String(b.brand_id || b.id || '');
    return name.includes(q) || id.includes(q);
  });

  const handleSelect = (brand) => {
    const bId = brand.brand_id || brand.id;
    setSelectedBrand(brand);
    onChange(bId, brand);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedBrand(null);
    onChange('', null);
    setSearch('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const getBrandName = (brand) => brand?.brand_name || brand?.name || 'Unknown Brand';
  const getBrandId = (brand) => brand?.brand_id || brand?.id;

  return (
    <div className="product-picker-container" ref={dropdownRef}>
      {selectedBrand && !isOpen ? (
        <div
          className="product-picker-selected"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          {selectedBrand.image_url ? (
            <div className="brand-picker-selected-logo-box">
              <img
                src={selectedBrand.image_url}
                alt={getBrandName(selectedBrand)}
                className="brand-picker-thumb"
                onError={(e) => {
                  e.target.parentElement.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="brand-picker-avatar-fallback">
              <Award size={18} />
            </div>
          )}
          <div className="product-picker-selected-info">
            <div className="product-picker-selected-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{getBrandName(selectedBrand)}</span>
              <span className="brand-live-tag">Live Target</span>
            </div>
            <div className="product-picker-selected-meta">
              <span className="product-code-chip">
                <Tag size={10} /> Brand #{getBrandId(selectedBrand)}
              </span>
              <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 600 }}>
                ● All Products Tracked
              </span>
            </div>
          </div>
          <button
            type="button"
            className="product-picker-clear-btn"
            onClick={handleClear}
            title="Clear selection and choose another brand"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className={`product-picker-direct-input-wrap ${isOpen ? 'active' : ''}`}>
          <Search size={16} className="picker-direct-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="product-picker-direct-input"
            placeholder={
              selectedBrand
                ? `Selected: ${getBrandName(selectedBrand)} (type to change...)`
                : placeholder
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {search && (
            <button
              type="button"
              className="picker-direct-clear-btn"
              onClick={() => setSearch('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            className="picker-direct-toggle-btn"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
          >
            <ChevronDown size={16} className={`picker-arrow ${isOpen ? 'open' : ''}`} />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="product-picker-dropdown">
          <div className="product-picker-list">
            {loading ? (
              <PickerListSkeleton count={4} />
            ) : filteredBrands.length === 0 ? (
              <div className="product-picker-empty">
                <AlertCircle size={16} />
                <span>No matching brands found</span>
              </div>
            ) : (
              filteredBrands.map((b) => {
                const bId = getBrandId(b);
                const isSelected = selectedBrand && String(getBrandId(selectedBrand)) === String(bId);
                const bName = getBrandName(b);
                return (
                  <div
                    key={bId}
                    className={`product-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(b)}
                  >
                    {b.image_url ? (
                      <div className="brand-picker-logo-box">
                        <img
                          src={b.image_url}
                          alt={bName}
                          className="brand-picker-item-thumb"
                          onError={(e) => {
                            e.target.parentElement.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="brand-picker-avatar-fallback small">
                        <Award size={14} />
                      </div>
                    )}
                    <div className="product-picker-item-details">
                      <div className="product-picker-item-title">{bName}</div>
                      <div className="product-picker-item-sub">
                        <span className="sku">Brand #{bId}</span>
                        {b.product_count !== undefined && (
                          <>
                            <span className="dot">•</span>
                            <span className="cat">{b.product_count} products</span>
                          </>
                        )}
                        {/* <span className="dot">•</span> */}
                        {/* <span style={{ color: '#7c3aed', fontWeight: 600 }}>Live Stream Target</span> */}
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
