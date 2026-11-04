import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search, Check, Square } from 'lucide-react';
import Skeleton from '../Skeleton';
import './MultiSelect.css';

export const MultiSelectSkeleton = ({
  label,
  width,
  style = {},
  className = '',
}) => (
  <div
    className={`multiselect multiselect--skeleton ${className}`.trim()}
    style={{
      ...(width ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
      ...style,
    }}
  >
    <div
      className="multiselect__trigger multiselect__trigger--skeleton"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        height: '38px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        {label && <Skeleton variant="text" width={55} height={16} />}
        <Skeleton variant="rounded" width={80} height={24} style={{ borderRadius: '6px' }} />
      </div>
      <Skeleton variant="rounded" width={16} height={16} style={{ borderRadius: '4px' }} />
    </div>
  </div>
);

/**
 * Enterprise MultiSelect Component
 * Features dual tabs ('All' vs 'Selected'), tag pills, live search, and mobile 3-step cycle.
 */
const MultiSelect = ({
  label,
  placeholder = 'All',
  options = [],
  selectedValues = [],
  onChange,
  maxTagsVisible = 1,
  maxVisibleItems,
  width,
  popoverWidth,
  className = '',
  style = {},
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'selected'
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileStep, setMobileStep] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const isKeyboardDismissingRef = useRef(false);

  // Responsive device detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isKeyboardDismissingRef.current) return;
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setMobileStep(0);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setMobileStep(0);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Desktop: Auto-focus search input immediately on 1st click
  useEffect(() => {
    if (isOpen) {
      if (!isMobile) {
        setSearchQuery('');
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      setSearchQuery('');
      setMobileStep(0);
    }
  }, [isOpen, isMobile]);

  const handleTriggerClick = (e) => {
    if (!isMobile) {
      if (
        e.target.closest('.multiselect__search-cancel') ||
        e.target.closest('.multiselect__tag-remove')
      ) {
        return;
      }

      if (isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      } else {
        setIsOpen(true);
      }
      return;
    }

    if (
      e.target.closest('.multiselect__search-cancel') ||
      e.target.closest('.multiselect__tag-remove')
    ) {
      return;
    }

    if (!isOpen || mobileStep === 0) {
      setIsOpen(true);
      setMobileStep(1);
      setSearchQuery('');
    } else if (mobileStep === 1) {
      setMobileStep(2);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setIsOpen(false);
      setMobileStep(0);
      setSearchQuery('');
    }
  };

  const handleArrowClick = (e) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setMobileStep(0);
      setSearchQuery('');
    } else {
      setIsOpen(true);
      if (isMobile) {
        setMobileStep(1);
      }
    }
  };

  // Lookup map for fast label & icon resolution
  const optionMap = useMemo(() => {
    const map = new Map();
    (options || []).forEach((opt) => {
      const val = opt.value !== undefined ? opt.value : opt.id || opt.brand_id;
      const lbl = opt.label !== undefined ? opt.label : opt.name || opt.brand_name;
      map.set(String(val), { label: lbl, icon: opt.icon || opt.original?.icon });
    });
    return map;
  }, [options]);

  const selectedCount = selectedValues.length;

  const handleToggle = (value) => {
    const strVal = String(value);
    const isSelected = selectedValues.some((v) => String(v) === strVal);
    let nextValues;

    if (isSelected) {
      nextValues = selectedValues.filter((v) => String(v) !== strVal);
    } else {
      nextValues = [...selectedValues, value];
    }

    onChange(nextValues);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
    setSearchQuery('');
    setActiveTab('all');
    searchInputRef.current?.focus();
  };

  const visibleOptions = useMemo(() => {
    let list = (options || []).map((opt) => ({
      value: opt.value !== undefined ? opt.value : opt.id || opt.brand_id,
      label: opt.label !== undefined ? opt.label : opt.name || opt.brand_name || String(opt.value || opt.id),
      original: opt,
    }));

    if (activeTab === 'selected') {
      list = list.filter((opt) =>
        selectedValues.some((v) => String(v) === String(opt.value))
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((opt) => opt.label.toLowerCase().includes(q));
    }
    return list;
  }, [activeTab, options, selectedValues, searchQuery]);

  const visibleTags = useMemo(() => {
    return selectedValues.slice(0, maxTagsVisible);
  }, [selectedValues, maxTagsVisible]);

  const listStyle = useMemo(() => {
    const totalCount = visibleOptions.length;
    let targetCount =
      maxVisibleItems !== undefined ? Number(maxVisibleItems) : 5.5;

    if (!targetCount || targetCount <= 0) return undefined;

    if (Number.isInteger(targetCount) && totalCount > targetCount) {
      targetCount += 0.5;
    }

    const calculatedMaxHeight = Math.round(targetCount * 38 + 12);
    return { maxHeight: `${calculatedMaxHeight}px` };
  }, [maxVisibleItems, visibleOptions.length]);

  const overflowCount = selectedCount - maxTagsVisible;

  if (loading) {
    return (
      <MultiSelectSkeleton
        label={label}
        width={width}
        style={style}
        className={className}
      />
    );
  }

  return (
    <div
      className={`multiselect ${className}`.trim()}
      ref={containerRef}
      style={{
        ...(width ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
        ...style,
      }}
    >
      {/* Trigger Box */}
      <div
        className={`multiselect__trigger ${isOpen ? 'multiselect__trigger--open' : ''} ${
          selectedCount > 0 ? 'multiselect__trigger--active' : ''
        }`}
        onClick={handleTriggerClick}
      >
        <div className="multiselect__trigger-content">
          {!isMobile ? (
            // ==================== DESKTOP VIEW ====================
            !isOpen ? (
              <div className="multiselect__tags-view">
                {label && <span className="multiselect__trigger-label">{label}:</span>}

                {selectedCount === 0 ? (
                  <span className="multiselect__placeholder">{placeholder || 'All'}</span>
                ) : (
                  <>
                    {visibleTags.map((val) => {
                      const itemData = optionMap.get(String(val));
                      const text = typeof itemData?.label === 'string'
                        ? itemData.label
                        : (typeof itemData === 'string' ? itemData : (typeof val === 'string' ? val : String(val ?? '')));
                      const icon = itemData?.icon;

                      return (
                        <span key={String(val)} className="multiselect__tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {icon && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                              {icon}
                            </span>
                          )}
                          <span className="multiselect__tag-text" title={text}>
                            {text}
                          </span>
                          <span
                            className="multiselect__tag-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(val);
                            }}
                            title={`Remove ${text}`}
                            role="button"
                            aria-label={`Remove ${text}`}
                          >
                            <X size={11} />
                          </span>
                        </span>
                      );
                    })}

                    {overflowCount > 0 && (
                      <span className="multiselect__tag-overflow">
                        +{overflowCount}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="multiselect__search-view">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="multiselect__search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={label ? `Search ${label.toLowerCase()}...` : 'Search options...'}
                  autoComplete="off"
                  aria-label={label ? `Search ${label}` : 'Search options'}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setIsOpen(false);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="multiselect__search-cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    title="Clear search text"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )
          ) : (
            // ==================== MOBILE PHONE VIEW ====================
            mobileStep !== 2 ? (
              <div className="multiselect__tags-view">
                {label && <span className="multiselect__trigger-label">{label}:</span>}

                {selectedCount === 0 ? (
                  <span className="multiselect__placeholder">{placeholder || 'All'}</span>
                ) : (
                  <>
                    {visibleTags.map((val) => {
                      const itemData = optionMap.get(String(val));
                      const text = typeof itemData?.label === 'string'
                        ? itemData.label
                        : (typeof itemData === 'string' ? itemData : (typeof val === 'string' ? val : String(val ?? '')));
                      const icon = itemData?.icon;
                      return (
                        <span key={String(val)} className="multiselect__tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {icon && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                              {icon}
                            </span>
                          )}
                          <span className="multiselect__tag-text" title={text}>
                            {text}
                          </span>
                          <span
                            className="multiselect__tag-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(val);
                            }}
                            title={`Remove ${text}`}
                            role="button"
                          >
                            <X size={11} />
                          </span>
                        </span>
                      );
                    })}

                    {overflowCount > 0 && (
                      <span className="multiselect__tag-overflow">
                        +{overflowCount}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="multiselect__search-view multiselect__search-view--mobile">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="multiselect__search-input multiselect__search-input--mobile"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={label ? `Search ${label.toLowerCase()}...` : 'Search...'}
                  autoComplete="off"
                  enterKeyHint="done"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      isKeyboardDismissingRef.current = true;
                      e.currentTarget.blur();
                      setMobileStep(1);
                      setTimeout(() => {
                        isKeyboardDismissingRef.current = false;
                      }, 400);
                    }
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setIsOpen(false);
                      setMobileStep(0);
                      setSearchQuery('');
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="multiselect__search-cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    title="Clear search text"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )
          )}
        </div>

        <div className="multiselect__trigger-actions">
          <span
            className={`multiselect__arrow ${isOpen ? 'multiselect__arrow--open' : ''}`}
            title={isOpen ? 'Close menu' : 'Open menu'}
            onClick={handleArrowClick}
          >
            <ChevronDown size={18} />
          </span>
        </div>
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="multiselect__popover"
          role="listbox"
          style={
            popoverWidth
              ? {
                  width: typeof popoverWidth === 'number' ? `${popoverWidth}px` : popoverWidth,
                  maxWidth: '100%',
                }
              : undefined
          }
        >
          {/* All / Selected Tabs */}
          <div className="multiselect__tabs">
            <div className="multiselect__tabs-left">
              <button
                type="button"
                className={`multiselect__tab ${
                  activeTab === 'all' ? 'multiselect__tab--active' : ''
                }`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`multiselect__tab ${
                  activeTab === 'selected' ? 'multiselect__tab--active' : ''
                }`}
                onClick={() => setActiveTab('selected')}
              >
                Selected
                {selectedCount > 0 && (
                  <span className="multiselect__tab-badge">{selectedCount}</span>
                )}
              </button>
            </div>

            {selectedCount > 0 && (
              <button
                type="button"
                className="multiselect__clear-all"
                onClick={handleClearAll}
                title="Clear all selected"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="multiselect__list" style={listStyle}>
            {visibleOptions.length === 0 ? (
              <div className="multiselect__empty">
                <div className="multiselect__empty-icon">
                  {searchQuery ? <Search size={18} /> : <Square size={18} />}
                </div>
                <span className="multiselect__empty-text">
                  {searchQuery
                    ? `No ${label ? label.toLowerCase() : 'options'} matching "${searchQuery}"`
                    : activeTab === 'selected'
                    ? 'Nothing selected'
                    : 'No options available'}
                </span>
              </div>
            ) : (
              visibleOptions.map((opt) => {
                const isChecked = selectedValues.some(
                  (v) => String(v) === String(opt.value)
                );
                return (
                  <div
                    key={String(opt.value)}
                    className={`multiselect__item ${
                      isChecked ? 'multiselect__item--checked' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(opt.value);
                    }}
                    title={opt.label}
                  >
                    <div
                      className={`multiselect__checkbox ${
                        isChecked ? 'multiselect__checkbox--checked' : ''
                      }`}
                    >
                      {isChecked && <Check size={13} color="#ffffff" strokeWidth={3} />}
                    </div>
                    <span className="multiselect__item-label" title={opt.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {opt.original?.icon && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          {opt.original.icon}
                        </span>
                      )}
                      <span>{opt.label}</span>
                    </span>
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

MultiSelect.displayName = 'MultiSelect';
MultiSelect.Skeleton = MultiSelectSkeleton;

export default MultiSelect;
export { MultiSelect };

