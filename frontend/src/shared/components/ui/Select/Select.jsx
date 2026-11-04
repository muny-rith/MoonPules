import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import Skeleton from '../Skeleton';
import '../Form.css';
import './Select.css';

export const SelectSkeleton = ({ label, className = '' }) => (
  <div className={`ui-select-container ui-select-container--skeleton ${className}`.trim()} style={{ width: '100%' }}>
    {label && (
      <div style={{ marginBottom: '6px' }}>
        <Skeleton variant="text" width={75} height={15} />
      </div>
    )}
    <div
      className="ui-select-trigger ui-select-trigger--skeleton"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        height: '38px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        boxSizing: 'border-box',
      }}
    >
      <Skeleton variant="text" width="55%" height={18} />
      <Skeleton variant="rounded" width={16} height={16} style={{ borderRadius: '4px' }} />
    </div>
  </div>
);

/**
 * Enterprise Single Select Component
 *
 * Implements clean responsive search and popover:
 * - Desktop:
 *   1st click: Opens menu & focuses search input immediately.
 *   2nd click: Closes menu.
 * - Mobile Phone (<= 768px):
 *   1st click: Shows menu (scrollable options, no keyboard covering screen - mobileStep 1).
 *   2nd click: Activates search mode & focuses virtual keyboard (mobileStep 2).
 *   3rd click: Closes menu (mobileStep 0).
 */
const Select = forwardRef(
  (
    {
      label,
      placeholder = 'Select...',
      options = [],
      error,
      value,
      onChange,
      onBlur,
      name,
      className = '',
      disabled = false,
      required = false,
      isClearable,
      loading = false,
      autoFlip = true,
      maxVisibleItems,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [placement, setPlacement] = useState('bottom'); // 'bottom' | 'top'
    const [viewportMaxHeight, setViewportMaxHeight] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [mobileStep, setMobileStep] = useState(0);

    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
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

    // Normalize options into consistent { value: string, label: string, original }
    const normalizedOptions = useMemo(() => {
      if (!Array.isArray(options)) return [];
      return options.map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          const val =
            opt.value !== undefined
              ? opt.value
              : opt.id !== undefined
                ? opt.id
                : opt.brand_id !== undefined
                  ? opt.brand_id
                  : '';
          const lbl =
            opt.label !== undefined
              ? opt.label
              : opt.name !== undefined
                ? opt.name
                : opt.brand_name !== undefined
                  ? opt.brand_name
                  : String(val);

          return {
            value: String(val ?? ''),
            label: String(lbl ?? ''),
            original: opt,
          };
        }

        return {
          value: String(opt ?? ''),
          label: String(opt ?? ''),
          original: opt,
        };
      });
    }, [options]);

    // Find currently selected option
    const selectedOption = useMemo(() => {
      if (value === undefined || value === null || value === '') return null;
      return (
        normalizedOptions.find((opt) => String(opt.value) === String(value)) ||
        null
      );
    }, [normalizedOptions, value]);

    // Filtered options based on search query
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) {
        return normalizedOptions;
      }
      const q = searchQuery.toLowerCase().trim();
      return normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(q)
      );
    }, [normalizedOptions, searchQuery]);

    // Dynamic list height with Smart Scroll Affordance (5.5 items by default, adapts to fewer items & screen height)
    const listStyle = useMemo(() => {
      const hasNoneOption =
        (placeholder === 'None' || isClearable) && !required && !searchQuery;
      const totalCount = filteredOptions.length + (hasNoneOption ? 1 : 0);

      const ITEM_HEIGHT = 38;
      const LIST_PADDING = 10; // 5px top + 5px bottom

      // If user provided maxVisibleItems, respect it (adding 0.5 if totalCount > maxVisibleItems and integer)
      let targetCount;
      if (maxVisibleItems !== undefined) {
        const num = Number(maxVisibleItems);
        if (num > 0) {
          targetCount = Number.isInteger(num) && totalCount > num ? num + 0.5 : num;
        }
      }

      // Default: if totalCount > 5, show exactly 5.5 items for scroll affordance.
      // If totalCount <= 5, adapt height to fit exactly totalCount items without extra space.
      if (targetCount === undefined) {
        targetCount = totalCount > 5 ? 5.5 : Math.max(1, totalCount);
      }

      let calculatedMaxHeight = Math.round(targetCount * ITEM_HEIGHT + LIST_PADDING - 5);

      // Adapt to screen height if viewport is cramped
      if (viewportMaxHeight && viewportMaxHeight < calculatedMaxHeight) {
        calculatedMaxHeight = Math.max(80, viewportMaxHeight);
      }

      return { maxHeight: `${calculatedMaxHeight}px` };
    }, [
      maxVisibleItems,
      filteredOptions.length,
      placeholder,
      isClearable,
      required,
      searchQuery,
      viewportMaxHeight,
    ]);

    // Close when clicking outside or pressing Escape
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (isKeyboardDismissingRef.current) return;
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
          setMobileStep(0);
          setSearchQuery('');
          if (onBlur) onBlur();
        }
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
          setMobileStep(0);
          setSearchQuery('');
          triggerRef.current?.focus();
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, {
          passive: true,
        });
        document.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onBlur]);

    // Placement detection & available viewport space: drops down ('bottom') by default.
    // Auto-flips if autoFlip={true} and space below is constrained.
    // Adapts maxHeight if screen height is constrained.
    useEffect(() => {
      if (!isOpen || !triggerRef.current) return;

      const calculatePlacementAndSpace = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - 12; // 12px viewport margin
        const spaceAbove = rect.top - 12;
        const idealHeight = 225; // 219px list + 6px border/gap

        let activePlacement = 'bottom';
        if (autoFlip && spaceBelow < idealHeight && spaceAbove > spaceBelow) {
          activePlacement = 'top';
        }
        setPlacement(activePlacement);

        const availableSpace = activePlacement === 'top' ? spaceAbove : spaceBelow;
        setViewportMaxHeight(Math.max(80, Math.floor(availableSpace - 6)));
      };

      calculatePlacementAndSpace();
      window.addEventListener('resize', calculatePlacementAndSpace);
      window.addEventListener('scroll', calculatePlacementAndSpace, true);
      return () => {
        window.removeEventListener('resize', calculatePlacementAndSpace);
        window.removeEventListener('scroll', calculatePlacementAndSpace, true);
      };
    }, [isOpen, autoFlip]);

    // Desktop: Auto-focus search input immediately on open
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

    // Reset highlighted index when opened/closed
    useEffect(() => {
      setHighlightedIndex(-1);
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
      if (isOpen && listRef.current && highlightedIndex >= 0) {
        const item = listRef.current.children[highlightedIndex];
        if (item) {
          item.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [isOpen, highlightedIndex]);

    // Emit selection change with synthetic event compatible with standard forms
    const handleSelect = useCallback(
      (optValue) => {
        if (onChange) {
          onChange({
            target: {
              name,
              value: optValue,
            },
          });
        }
        setIsOpen(false);
        setMobileStep(0);
        setSearchQuery('');
        triggerRef.current?.blur();
      },
      [name, onChange]
    );

    const handleClear = useCallback(
      (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        handleSelect('');
      },
      [handleSelect]
    );

    // Trigger click handler
    const handleTriggerClick = (e) => {
      if (disabled) return;

      if (!isMobile) {
        if (
          e.target.closest('.ui-select-search-clear') ||
          e.target.closest('.ui-select-clear-btn')
        ) {
          return;
        }

        if (isOpen) {
          setIsOpen(false);
          setSearchQuery('');
          triggerRef.current?.blur();
          if (onBlur) onBlur();
        } else {
          setIsOpen(true);
        }
        return;
      }

      if (
        e.target.closest('.ui-select-search-clear') ||
        e.target.closest('.ui-select-clear-btn')
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
        if (onBlur) onBlur();
      }
    };

    const handleArrowClick = (e) => {
      e.stopPropagation();
      if (disabled) return;
      if (isOpen) {
        setIsOpen(false);
        setMobileStep(0);
        setSearchQuery('');
        if (onBlur) onBlur();
      } else {
        setIsOpen(true);
        if (isMobile) {
          setMobileStep(1);
        }
      }
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (disabled) return;

      if (!isOpen) {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (!isMobile && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setMobileStep(0);
          setSearchQuery('');
          triggerRef.current?.focus();
          break;
        case 'Tab':
          setIsOpen(false);
          setMobileStep(0);
          setSearchQuery('');
          break;
        default:
          break;
      }
    };

    const canClear =
      (isClearable || (!required && placeholder === 'None')) &&
      Boolean(value) &&
      !disabled;

    const listboxId = name
      ? `select-${name}-listbox`
      : `ui-select-listbox-${placeholder.replace(/\s+/g, '-').toLowerCase()}`;

    if (loading) {
      return <SelectSkeleton label={label} className={className} />;
    }

    return (
      <div
        ref={containerRef}
        className={`ui-select-container ${isOpen ? 'ui-select-container--open' : ''
          } ${className}`.trim()}
      >
        {label && <label className="ui-select-label">{label}</label>}

        {/* Hidden Input for Form Submissions */}
        <input
          type="hidden"
          ref={ref}
          name={name}
          value={value ?? ''}
          {...props}
        />

        {/* Trigger Field */}
        <div
          ref={triggerRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          tabIndex={disabled ? -1 : 0}
          onClick={handleTriggerClick}
          onKeyDown={handleKeyDown}
          className={`ui-select-trigger ${isOpen ? 'ui-select-trigger--open' : ''
            } ${error ? 'ui-select-trigger--error' : ''} ${disabled ? 'ui-select-trigger--disabled' : ''
            }`}
        >
          <div className="ui-select-trigger-content">
            {!isMobile ? (
              // ==================== DESKTOP VIEW ====================
              !isOpen ? (
                <span
                  className={`ui-select-value ${!selectedOption ? 'ui-select-placeholder' : ''
                    }`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}
                >
                  {selectedOption?.original?.icon && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                      {selectedOption.original.icon}
                    </span>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? selectedOption.label : placeholder}
                  </span>
                </span>
              ) : (
                <div className="ui-select-search-view">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="ui-select-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      selectedOption
                        ? selectedOption.label
                        : placeholder &&
                          placeholder !== 'Select...' &&
                          placeholder !== 'None'
                          ? `Search ${placeholder
                            .toLowerCase()
                            .replace(/^select\s+/, '')}...`
                          : 'Search...'
                    }
                    autoComplete="off"
                    onKeyDown={handleKeyDown}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="ui-select-search-clear"
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
                <span
                  className={`ui-select-value ${!selectedOption ? 'ui-select-placeholder' : ''
                    }`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}
                >
                  {selectedOption?.original?.icon && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                      {selectedOption.original.icon}
                    </span>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? selectedOption.label : placeholder}
                  </span>
                </span>
              ) : (
                <div className="ui-select-search-view ui-select-search-view--mobile">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="ui-select-search-input ui-select-search-input--mobile"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      selectedOption
                        ? selectedOption.label
                        : placeholder &&
                          placeholder !== 'Select...' &&
                          placeholder !== 'None'
                          ? `Search ${placeholder
                            .toLowerCase()
                            .replace(/^select\s+/, '')}...`
                          : 'Search...'
                    }
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
                      className="ui-select-search-clear"
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

          <div className="ui-select-actions">
            {!isOpen && canClear && (
              <button
                type="button"
                className="ui-select-clear-btn"
                onClick={handleClear}
                title="Clear selection"
                tabIndex={-1}
              >
                <X size={13} />
              </button>
            )}

            <span
              className={`ui-select-arrow ${isOpen ? 'ui-select-arrow--open' : ''
                }`}
              aria-hidden="true"
              onClick={handleArrowClick}
            >
              <ChevronDown size={18} />
            </span>
          </div>
        </div>

        {/* Popover Menu */}
        {isOpen && (
          <div
            id={listboxId}
            className={`ui-select-popover ui-select-popover--${placement}`}
            role="listbox"
          >
            <div ref={listRef} className="ui-select-list" style={listStyle}>
              {placeholder === 'None' &&
                !required &&
                !searchQuery && (
                  <div
                    role="option"
                    aria-selected={!value}
                    className={`ui-select-option ui-select-option--none ${!value ? 'ui-select-option--selected' : ''
                      }`}
                    onClick={() => handleSelect('')}
                  >
                    <span className="ui-select-option-label">None</span>
                    {!value && <Check size={15} className="ui-select-check" />}
                  </div>
                )}

              {filteredOptions.length === 0 ? (
                <div className="ui-select-empty">No options found</div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = String(opt.value) === String(value);
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={opt.value || index}
                      role="option"
                      aria-selected={isSelected}
                      className={`ui-select-option ${isSelected ? 'ui-select-option--selected' : ''
                        } ${isHighlighted ? 'ui-select-option--highlighted' : ''
                        }`}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseLeave={() => setHighlightedIndex(-1)}
                    >
                      <span className="ui-select-option-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {opt.original?.icon && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                            {opt.original.icon}
                          </span>
                        )}
                        <span>{opt.label}</span>
                      </span>
                      {isSelected && <Check size={15} className="ui-select-check" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Validation Error Message */}
        {error && <span className="error-text">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
Select.Skeleton = SelectSkeleton;

export default Select;
export { Select };
