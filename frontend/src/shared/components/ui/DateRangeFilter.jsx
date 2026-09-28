import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Clock, Sparkles, ArrowRight, X } from 'lucide-react';

export const DATE_PRESETS = [
  { id: 'all', label: 'All Time', icon: Sparkles, badge: 'All' },
  { id: 'today', label: 'Today', icon: Clock, badge: '1D' },
  { id: 'this_week', label: 'This Week', icon: Calendar, badge: 'Week' },
  { id: 'this_month', label: 'This Month', icon: Calendar, badge: 'Month' },
  { id: 'last_month', label: 'Last Month', icon: Calendar, badge: 'Prev' },
];

/**
 * Checks whether a post's date (published_time, scheduled_time, or created_at)
 * falls within the selected date preset or custom date range.
 */
export const isPostInDateRange = (post, filterKey, customStart, customEnd) => {
  if (!filterKey || filterKey === 'all') return true;

  const rawDate = post?.published_time || post?.scheduled_time || post?.created_at;
  if (!rawDate) return false;

  const postDate = new Date(rawDate);
  if (isNaN(postDate.getTime())) return false;

  const now = new Date();

  switch (filterKey) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'yesterday': {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case '7days': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return postDate >= start && postDate <= now;
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case '30days': {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return postDate >= start && postDate <= now;
    }
    case '90days': {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return postDate >= start && postDate <= now;
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return postDate >= start && postDate <= end;
    }
    case 'custom': {
      if (!customStart && !customEnd) return true;
      if (customStart) {
        const start = new Date(customStart + 'T00:00:00');
        if (postDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd + 'T23:59:59.999');
        if (postDate > end) return false;
      }
      return true;
    }
    default:
      return true;
  }
};

export const DateRangeFilter = ({
  value = 'all',
  onChange,
  customRange = { start: '', end: '' },
  onCustomRangeChange,
  minWidth = '145px',
  align = 'auto', // 'auto' | 'left' | 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStart, setLocalStart] = useState(customRange.start || '');
  const [localEnd, setLocalEnd] = useState(customRange.end || '');
  const [dropdownAlign, setDropdownAlign] = useState(align === 'right' ? 'right' : 'left');
  const ref = useRef(null);

  // Sync internal state when props change
  useEffect(() => {
    setLocalStart(customRange.start || '');
    setLocalEnd(customRange.end || '');
  }, [customRange]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute alignment when opened so it never clips off-screen
  useEffect(() => {
    if (!isOpen) return;
    if (align === 'left') {
      setDropdownAlign('left');
      return;
    }
    if (align === 'right') {
      setDropdownAlign('right');
      return;
    }
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuWidth = 320;
      // If opening to the right would overflow the right edge of viewport
      if (rect.left + menuWidth > window.innerWidth - 16) {
        setDropdownAlign('right');
      } else {
        setDropdownAlign('left');
      }
    }
  }, [isOpen, align]);

  const handleSelectPreset = (presetId) => {
    onChange(presetId);
    setIsOpen(false);
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (onCustomRangeChange) {
      onCustomRangeChange({ start: localStart, end: localEnd });
    }
    onChange('custom');
    setIsOpen(false);
  };

  const handleClearCustom = () => {
    setLocalStart('');
    setLocalEnd('');
    if (onCustomRangeChange) {
      onCustomRangeChange({ start: '', end: '' });
    }
    onChange('all');
    setIsOpen(false);
  };

  // Determine current display label
  const selectedPreset = DATE_PRESETS.find((p) => p.id === value);
  let displayLabel = selectedPreset?.label || 'All Time';
  if (value === 'custom') {
    if (customRange.start && customRange.end) {
      displayLabel = `${customRange.start} → ${customRange.end}`;
    } else if (customRange.start) {
      displayLabel = `From ${customRange.start}`;
    } else if (customRange.end) {
      displayLabel = `Until ${customRange.end}`;
    } else {
      displayLabel = 'Custom Range';
    }
  }

  const isFiltered = value !== 'all';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: isFiltered ? '1px solid #93c5fd' : '1px solid #e2e8f0',
          fontSize: '13px',
          backgroundColor: isFiltered ? '#eff6ff' : 'white',
          color: isFiltered ? '#1d4ed8' : '#334155',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth,
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          whiteSpace: 'nowrap',
          fontWeight: isFiltered ? 600 : 500,
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color={isFiltered ? '#2563eb' : '#64748b'} />
          <span>{displayLabel}</span>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: isFiltered ? '#2563eb' : '#94a3b8',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(dropdownAlign === 'right' ? { right: 0 } : { left: 0 }),
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 12px -4px rgba(0, 0, 0, 0.06)',
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeInScale 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filter By Date
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearCustom}
                style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <X size={12} /> Clear Filter
              </button>
            )}
          </div>

          {/* Quick Presets Grid */}
          <div
            style={{
              padding: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {DATE_PRESETS.map((preset) => {
              const isSelected = value === preset.id;
              const PresetIcon = preset.icon;

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: isSelected ? '#1d4ed8' : '#334155',
                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PresetIcon size={14} color={isSelected ? '#2563eb' : '#64748b'} />
                    <span>{preset.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                        color: isSelected ? '#1e40af' : '#64748b',
                        fontWeight: 600,
                      }}
                    >
                      {preset.badge}
                    </span>
                    {isSelected && <Check size={14} color="#2563eb" strokeWidth={2.5} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Date Range Section */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Custom Range
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
                <ArrowRight size={12} color="#94a3b8" />
                <input
                  type="date"
                  value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  disabled={!localStart && !localEnd}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!localStart && !localEnd) ? 'not-allowed' : 'pointer',
                    opacity: (!localStart && !localEnd) ? 0.5 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  Apply Range
                </button>
                {value === 'custom' && (
                  <button
                    type="button"
                    onClick={handleClearCustom}
                    style={{
                      padding: '7px 10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
