import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import './DatePicker.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad = (n) => String(n).padStart(2, '0');

const toYMD = (d) => {
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const DatePicker = ({
  value = '',
  onChange,
  min = '',
  max = '',
  placeholder = 'Select date...',
  disabled = false,
  required = false,
  name,
  className = '',
  style = {},
  autoFlip = true,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');

  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  // Parse initial view year and month from value, or default to current date
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  }, [value]);

  const [viewYear, setViewYear] = useState(() => (parsedDate ? parsedDate.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (parsedDate ? parsedDate.getMonth() : new Date().getMonth()));

  // Keep view aligned when value changes externally
  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
  }, [parsedDate]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        if (onOpenChange) onOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Viewport calculation & Auto-flip
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !autoFlip) return;

    const calculatePlacement = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const idealHeight = 290;

      if (spaceBelow < idealHeight && spaceAbove > spaceBelow) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    };

    calculatePlacement();
    window.addEventListener('resize', calculatePlacement);
    return () => window.removeEventListener('resize', calculatePlacement);
  }, [isOpen, autoFlip]);

  // Navigation handlers
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Check if navigation should be disabled by min/max
  const isPrevDisabled = useMemo(() => {
    if (!min) return false;
    const minD = new Date(min);
    if (isNaN(minD.getTime())) return false;
    // Last day of previous month
    const prevMonthEnd = new Date(viewYear, viewMonth, 0);
    return prevMonthEnd < minD;
  }, [min, viewYear, viewMonth]);

  const isNextDisabled = useMemo(() => {
    if (!max) return false;
    const maxD = new Date(max);
    if (isNaN(maxD.getTime())) return false;
    // First day of next month
    const nextMonthStart = new Date(viewYear, viewMonth + 1, 1);
    return nextMonthStart > maxD;
  }, [max, viewYear, viewMonth]);

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Prev month fill
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      const dStr = toYMD(d);
      days.push({
        dayNumber: dayNum,
        dateString: dStr,
        isCurrentMonth: false,
        disabled: (min && dStr < min) || (max && dStr > max),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      const dStr = toYMD(d);
      days.push({
        dayNumber: i,
        dateString: dStr,
        isCurrentMonth: true,
        disabled: (min && dStr < min) || (max && dStr > max),
      });
    }

    // Next month fill to complete 35 or 42 cells
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      const dStr = toYMD(d);
      days.push({
        dayNumber: i,
        dateString: dStr,
        isCurrentMonth: false,
        disabled: (min && dStr < min) || (max && dStr > max),
      });
    }

    return days;
  }, [viewYear, viewMonth, min, max]);

  const todayStr = useMemo(() => toYMD(new Date()), []);

  // Format display label: "Nov 1, 2026"
  const displayLabel = useMemo(() => {
    if (!parsedDate) return placeholder;
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [parsedDate, placeholder]);

  // Select day handler
  const handleSelectDay = (dayStr) => {
    if (disabled) return;
    if (onChange) {
      // Support synthetic event compatible with standard forms
      onChange({
        target: {
          name,
          value: dayStr,
        },
      });
    }
    setIsOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange({
        target: {
          name,
          value: '',
        },
      });
    }
    setIsOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  return (
    <div
      ref={containerRef}
      className={`ui-datepicker-container ${isOpen ? 'ui-datepicker-container--open' : ''} ${className}`.trim()}
      style={style}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`ui-datepicker-trigger ${isOpen ? 'ui-datepicker-trigger--open' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => {
              const next = !prev;
              if (onOpenChange) onOpenChange(next);
              return next;
            });
          }
        }}
      >
        <div className="ui-datepicker-trigger-content">
          <CalendarIcon size={14} className="ui-datepicker-calendar-icon" />
          <span className={`ui-datepicker-value ${!value ? 'ui-datepicker-placeholder' : ''}`}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown size={14} className={`ui-datepicker-arrow ${isOpen ? 'ui-datepicker-arrow--open' : ''}`} />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          className={`ui-datepicker-popover ui-datepicker-popover--${placement}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="ui-datepicker-header">
            <span className="ui-datepicker-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="ui-datepicker-nav-buttons">
              <button
                type="button"
                className="ui-datepicker-nav-btn"
                onClick={handlePrevMonth}
                disabled={isPrevDisabled}
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="ui-datepicker-nav-btn"
                onClick={handleNextMonth}
                disabled={isNextDisabled}
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="ui-datepicker-weekdays">
            {WEEKDAYS.map((w, idx) => (
              <div key={idx} className="ui-datepicker-weekday-cell">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="ui-datepicker-days-grid">
            {calendarDays.map((day, idx) => {
              const isSelected = day.dateString === value;
              const isToday = day.dateString === todayStr;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={day.disabled}
                  className={`ui-datepicker-day-btn ${isSelected ? 'selected' : ''} ${
                    isToday ? 'today' : ''
                  } ${!day.isCurrentMonth ? 'other-month' : ''}`}
                  onClick={() => handleSelectDay(day.dateString)}
                >
                  {day.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="ui-datepicker-footer">
            {!required ? (
              <button
                type="button"
                className="ui-datepicker-footer-btn ui-datepicker-footer-btn--clear"
                onClick={handleClear}
              >
                Clear
              </button>
            ) : <span />}

            <button
              type="button"
              className="ui-datepicker-footer-btn"
              disabled={(min && todayStr < min) || (max && todayStr > max)}
              onClick={() => handleSelectDay(todayStr)}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

