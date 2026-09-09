import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad = (n) => String(n).padStart(2, '0');

const formatDateIso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => pad(i));

export const MetaSchedulePicker = ({
  value,
  onChange,
  disabled = false,
}) => {
  // Parse date and time from YYYY-MM-DDTHH:mm
  const todayStr = formatDateIso(new Date());
  const [datePart, timePart] = (value || '').split('T');
  const dateVal = datePart || todayStr;
  const initialTime = (timePart || '09:00').slice(0, 5);

  const [hourVal, minuteVal] = initialTime.split(':');
  const parsedH = parseInt(hourVal || '9', 10);
  const parsedM = parseInt(minuteVal || '0', 10);
  const currentHour = pad(isNaN(parsedH) ? 9 : Math.min(23, Math.max(0, parsedH)));
  const currentMinute = pad(isNaN(parsedM) ? 0 : Math.min(59, Math.max(0, parsedM)));

  // Popover visibility states
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Local active state for instant, 60fps free-wheeling scroll response
  const [activeHour, setActiveHour] = useState(currentHour);
  const [activeMinute, setActiveMinute] = useState(currentMinute);
  const activeHourRef = useRef(currentHour);
  const activeMinuteRef = useRef(currentMinute);

  useEffect(() => {
    setActiveHour(currentHour);
    activeHourRef.current = currentHour;
  }, [currentHour]);

  useEffect(() => {
    setActiveMinute(currentMinute);
    activeMinuteRef.current = currentMinute;
  }, [currentMinute]);

  // Calendar browsing month and year
  const initialDate = useMemo(() => {
    return dateVal ? new Date(dateVal) : new Date();
  }, [dateVal]);

  const [viewYear, setViewYear] = useState(() => initialDate.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => initialDate.getMonth() || new Date().getMonth());

  // Refs for outside click dismissal, wheel scrolling & boundary containment
  const datePickerRef = useRef(null);
  const timePickerRef = useRef(null);
  const timeCardRef = useRef(null);
  const hourWheelRef = useRef(null);
  const minuteWheelRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
      if (timePickerRef.current && !timePickerRef.current.contains(e.target)) {
        setShowTimePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateValRef = useRef(dateVal);
  dateValRef.current = dateVal;
  const todayStrRef = useRef(todayStr);
  todayStrRef.current = todayStr;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Silky smooth, discrete-step roller that always lands dead-center on numbers
  useEffect(() => {
    if (!showTimePicker) return;

    const createRoller = (wheelEl, maxIdx, getActiveVal, onCommit) => {
      if (!wheelEl) return () => {};

      let targetIdx = Math.max(0, Math.min(maxIdx, Math.round(wheelEl.scrollTop / 40)));
      let rafId = null;
      let settleTimer = null;
      let accumulatedDelta = 0;
      let deltaResetTimer = null;
      let lastStepTime = 0;

      const animateToTarget = () => {
        const targetScroll = targetIdx * 40;
        const currentScroll = wheelEl.scrollTop;
        const diff = targetScroll - currentScroll;

        if (Math.abs(diff) < 0.8) {
          wheelEl.scrollTop = targetScroll;
          rafId = null;

          clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            onCommit(targetIdx);
          }, 80);
          return;
        }

        // Fluid ease-out curve (silky smooth, responsive, never jerky)
        wheelEl.scrollTop = currentScroll + diff * 0.28;
        rafId = requestAnimationFrame(animateToTarget);
      };

      const handleWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();

        let rawDelta = e.deltaY;
        if (e.deltaMode === 1) rawDelta *= 40;
        else if (e.deltaMode === 2) rawDelta *= 120;

        accumulatedDelta += rawDelta;

        clearTimeout(deltaResetTimer);
        deltaResetTimer = setTimeout(() => {
          accumulatedDelta = 0;
        }, 100);

        const now = performance.now();
        const threshold = 60;

        // Require at least 75ms cooldown between steps to prevent a single mouse notch's multi-tick burst from jumping 1->4
        if (Math.abs(accumulatedDelta) >= threshold && now - lastStepTime >= 75) {
          const dir = Math.sign(accumulatedDelta);
          accumulatedDelta = 0; // Discard burst leftovers immediately
          lastStepTime = now;

          const baseIdx = rafId ? targetIdx : Math.round(wheelEl.scrollTop / 40);
          targetIdx = Math.max(0, Math.min(maxIdx, baseIdx + dir));

          clearTimeout(settleTimer);
          if (!rafId) {
            rafId = requestAnimationFrame(animateToTarget);
          }
        }
      };

      wheelEl.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        wheelEl.removeEventListener('wheel', handleWheel);
        if (rafId) cancelAnimationFrame(rafId);
        clearTimeout(settleTimer);
        clearTimeout(deltaResetTimer);
      };
    };

    const cleanupHour = createRoller(
      hourWheelRef.current,
      23,
      () => activeHourRef.current,
      (finalIdx) => {
        const newH = pad(finalIdx);
        setActiveHour(newH);
        activeHourRef.current = newH;
        onChangeRef.current(`${dateValRef.current || todayStrRef.current}T${newH}:${activeMinuteRef.current}`);
      }
    );

    const cleanupMinute = createRoller(
      minuteWheelRef.current,
      59,
      () => activeMinuteRef.current,
      (finalIdx) => {
        const newM = pad(finalIdx);
        setActiveMinute(newM);
        activeMinuteRef.current = newM;
        onChangeRef.current(`${dateValRef.current || todayStrRef.current}T${activeHourRef.current}:${newM}`);
      }
    );

    const timeCard = timeCardRef.current;
    const handleCardWheel = (e) => {
      if (!hourWheelRef.current?.contains(e.target) && !minuteWheelRef.current?.contains(e.target)) {
        e.preventDefault();
      }
    };

    if (timeCard) {
      timeCard.addEventListener('wheel', handleCardWheel, { passive: false });
    }

    return () => {
      cleanupHour();
      cleanupMinute();
      if (timeCard) timeCard.removeEventListener('wheel', handleCardWheel);
    };
  }, [showTimePicker]);

  // When opening calendar, sync view with selected date
  const handleOpenCalendar = () => {
    if (disabled) return;
    setShowTimePicker(false);
    if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
    setShowCalendar((prev) => !prev);
  };

  // Scroll wheels directly to current time on open (instant, no fighting)
  const scrollToCurrentTime = () => {
    const hIdx = parseInt(currentHour, 10) || 0;
    const mIdx = parseInt(currentMinute, 10) || 0;

    if (hourWheelRef.current) {
      hourWheelRef.current.scrollTop = hIdx * 40;
    }
    if (minuteWheelRef.current) {
      minuteWheelRef.current.scrollTop = mIdx * 40;
    }
  };

  // When opening time picker, sync scroll position
  const handleOpenTimePicker = () => {
    if (disabled) return;
    setShowCalendar(false);
    setShowTimePicker((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          scrollToCurrentTime();
        }, 10);
      }
      return next;
    });
  };

  const getTzInfo = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? '+' : '-';
      const h = Math.floor(Math.abs(offsetMin) / 60);
      const city = tz.split('/').pop().replace(/_/g, ' ');
      return `GMT${sign}${h} (${city})`;
    } catch {
      return 'Local Time';
    }
  };

  // Calendar month navigation
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

  // Generate days array for calendar grid
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month fill days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      days.push({
        dayNumber: dayNum,
        dateString: formatDateIso(d),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({
        dayNumber: i,
        dateString: formatDateIso(d),
        isCurrentMonth: true,
      });
    }

    // Next month fill days
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({
        dayNumber: i,
        dateString: formatDateIso(d),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleSelectDay = (dayStr) => {
    onChange(`${dayStr}T${currentHour}:${currentMinute}`);
    setShowCalendar(false);
  };

  // Real-time lens highlight tracking during smooth scroll
  const handleHourWheelScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const idx = Math.max(0, Math.min(23, Math.round(scrollTop / 40)));
    const newH = pad(idx);
    if (activeHourRef.current !== newH) {
      setActiveHour(newH);
      activeHourRef.current = newH;
    }
  };

  const handleMinuteWheelScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const idx = Math.max(0, Math.min(59, Math.round(scrollTop / 40)));
    const newM = pad(idx);
    if (activeMinuteRef.current !== newM) {
      setActiveMinute(newM);
      activeMinuteRef.current = newM;
    }
  };

  const handleSelectHourItem = (hStr) => {
    const idx = parseInt(hStr, 10) || 0;
    setActiveHour(hStr);
    if (hourWheelRef.current) {
      hourWheelRef.current.scrollTo({ top: idx * 40, behavior: 'smooth' });
    }
    onChange(`${dateVal || todayStr}T${hStr}:${activeMinute}`);
  };

  const handleSelectMinuteItem = (mStr) => {
    const idx = parseInt(mStr, 10) || 0;
    setActiveMinute(mStr);
    if (minuteWheelRef.current) {
      minuteWheelRef.current.scrollTo({ top: idx * 40, behavior: 'smooth' });
    }
    onChange(`${dateVal || todayStr}T${activeHour}:${mStr}`);
  };

  const handleQuickMinute = (m) => {
    const newM = pad(m);
    handleSelectMinuteItem(newM);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = pad(now.getHours());
    const m = pad(now.getMinutes());
    setActiveHour(h);
    setActiveMinute(m);
    onChange(`${dateVal || todayStr}T${h}:${m}`);
    if (hourWheelRef.current) {
      hourWheelRef.current.scrollTo({ top: parseInt(h, 10) * 40, behavior: 'smooth' });
    }
    if (minuteWheelRef.current) {
      minuteWheelRef.current.scrollTo({ top: parseInt(m, 10) * 40, behavior: 'smooth' });
    }
  };

  const applyPreset = (presetType) => {
    const d = new Date();

    if (presetType === '1h') {
      d.setHours(d.getHours() + 1);
    } else if (presetType === '3h') {
      d.setHours(d.getHours() + 3);
    } else if (presetType === 'tomorrow_morning') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (presetType === 'tomorrow_evening') {
      d.setDate(d.getDate() + 1);
      d.setHours(19, 0, 0, 0);
    }

    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    onChange(iso);
    setShowCalendar(false);
    setShowTimePicker(false);
  };

  const getFormattedSchedule = () => {
    if (!value) return null;
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;

      const dateStr = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      // 24-hour format display: e.g. 09:42 or 19:30
      const timeStr = `${currentHour}:${currentMinute}`;

      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      let relativeStr = '';
      if (diffMs > 0) {
        const diffMin = Math.round(diffMs / (1000 * 60));
        if (diffMin < 60) {
          relativeStr = `in ${diffMin} min${diffMin === 1 ? '' : 's'}`;
        } else {
          const diffHours = Math.floor(diffMin / 60);
          const remMin = diffMin % 60;
          if (diffHours < 24) {
            relativeStr = remMin > 0 ? `in ${diffHours}h ${remMin}m` : `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
          } else {
            const diffDays = Math.round(diffHours / 24);
            relativeStr = `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
          }
        }
      }

      return { full: `${dateStr} at ${timeStr}`, relative: relativeStr, isPast: diffMs <= 0 };
    } catch {
      return null;
    }
  };

  const scheduleInfo = getFormattedSchedule();

  // Display text on the date trigger button
  const dateDisplayLabel = useMemo(() => {
    if (!dateVal) return 'Select Date';
    try {
      const d = new Date(`${dateVal}T00:00:00`);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateVal;
    }
  }, [dateVal]);

  return (
    <div className="meta-schedule-box-v2">
      {/* ── Inputs Row: Custom Date + 24h Time + Timezone ── */}
      <div className="meta-schedule-inputs-grid">
        {/* 1. Custom Date Trigger & Floating Calendar */}
        <div className="meta-schedule-field" ref={datePickerRef}>
          <label className="meta-schedule-field-label">Date</label>
          <div className="meta-custom-picker-wrapper">
            <button
              type="button"
              className={`meta-custom-trigger-btn ${showCalendar ? 'active' : ''}`}
              onClick={handleOpenCalendar}
              disabled={disabled}
            >
              <CalendarIcon size={16} className="meta-trigger-icon" />
              <span className="meta-trigger-text">{dateDisplayLabel}</span>
              <ChevronDown size={14} className="meta-trigger-arrow" />
            </button>

            {/* Floating Luxury Calendar Popover */}
            {showCalendar && (
              <div className="meta-calendar-popover" onClick={(e) => e.stopPropagation()}>
                {/* Header: Month/Year & Navigation Arrows */}
                <div className="meta-calendar-header">
                  <span className="meta-calendar-title">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <div className="meta-calendar-nav-buttons">
                    <button
                      type="button"
                      className="meta-calendar-nav-btn"
                      onClick={handlePrevMonth}
                      title="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="meta-calendar-nav-btn"
                      onClick={handleNextMonth}
                      title="Next month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Weekday Row */}
                <div className="meta-calendar-weekdays">
                  {WEEKDAYS.map((w, idx) => (
                    <div key={idx} className="meta-calendar-weekday-cell">
                      {w}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="meta-calendar-days-grid">
                  {calendarDays.map((day, idx) => {
                    const isSelected = day.dateString === dateVal;
                    const isToday = day.dateString === todayStr;
                    const isPast = day.dateString < todayStr;

                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`meta-calendar-day-btn ${isSelected ? 'selected' : ''
                          } ${isToday ? 'today' : ''} ${!day.isCurrentMonth ? 'other-month' : ''
                          } ${isPast ? 'past' : ''}`}
                        onClick={() => handleSelectDay(day.dateString)}
                      >
                        {day.dayNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Footer: Quick Shortcuts */}
                <div className="meta-calendar-footer">
                  <button
                    type="button"
                    className="meta-calendar-quick-link"
                    onClick={() => handleSelectDay(todayStr)}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="meta-calendar-quick-link"
                    onClick={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      handleSelectDay(formatDateIso(tom));
                    }}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Custom 24-Hour Time Trigger & Smooth Scroll Wheel Popover */}
        <div className="meta-schedule-field" ref={timePickerRef}>
          <label className="meta-schedule-field-label">Time (24h)</label>
          <div className="meta-custom-picker-wrapper">
            <button
              type="button"
              className={`meta-custom-trigger-btn ${showTimePicker ? 'active' : ''}`}
              onClick={handleOpenTimePicker}
              disabled={disabled}
            >
              <Clock size={16} className="meta-trigger-icon" />
              <span className="meta-trigger-text" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                {currentHour}:{currentMinute}
              </span>
              <ChevronDown size={14} className="meta-trigger-arrow" />
            </button>

            {/* Floating Luxury 24h Smooth Scroll Wheel Popover */}
            {showTimePicker && (
              <div className="meta-time-card-24h" ref={timeCardRef} onClick={(e) => e.stopPropagation()}>
                {/* Header Display */}
                <div className="meta-time-wheel-header">
                  <span className="meta-time-card-title">Scroll Time (24h)</span>
                </div>

                {/* Dual Scroll Wheels (Hour 00-23 & Minute 00-59) */}
                <div className="meta-wheel-picker-wrap">
                  {/* Active Row Selection Lens */}
                  <div className="meta-wheel-lens" />

                  {/* Hour Wheel */}
                  <div className="meta-wheel-col">
                    <div
                      className="meta-wheel-scroll"
                      ref={hourWheelRef}
                      onScroll={handleHourWheelScroll}
                    >
                      {HOURS_24.map((h) => {
                        const isSelected = h === activeHour;
                        return (
                          <button
                            key={h}
                            type="button"
                            className={`meta-wheel-item ${isSelected ? 'active' : ''}`}
                            onClick={() => handleSelectHourItem(h)}
                          >
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Center Colon */}
                  <div className="meta-wheel-colon">:</div>

                  {/* Minute Wheel */}
                  <div className="meta-wheel-col">
                    <div
                      className="meta-wheel-scroll"
                      ref={minuteWheelRef}
                      onScroll={handleMinuteWheelScroll}
                    >
                      {MINUTES_60.map((m) => {
                        const isSelected = m === activeMinute;
                        return (
                          <button
                            key={m}
                            type="button"
                            className={`meta-wheel-item ${isSelected ? 'active' : ''}`}
                            onClick={() => handleSelectMinuteItem(m)}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick Minute Chips */}
                <div className="meta-time-quick-minutes">
                  {[0, 15, 30, 45].map((m) => {
                    const mStr = pad(m);
                    const isSelected = mStr === activeMinute;
                    return (
                      <button
                        key={m}
                        type="button"
                        className={`meta-time-quick-min-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => handleQuickMinute(m)}
                        title={`Set to :${mStr}`}
                      >
                        :{mStr}
                      </button>
                    );
                  })}
                </div>

                {/* Footer: Quick Actions */}
                <div className="meta-time-card-footer">
                  <button
                    type="button"
                    className="meta-time-footer-btn"
                    onClick={handleSetNow}
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    className="meta-time-footer-btn primary"
                    onClick={() => setShowTimePicker(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Timezone Badge */}
        <div className="meta-schedule-tz-badge" title="Detected local timezone">
          <Globe size={13} />
          <span>{getTzInfo()}</span>
        </div>
      </div>

      {/* ── Quick Suggestions / Presets (24h) ── */}
      {!disabled && (
        <div className="meta-schedule-presets-row">
          <span className="meta-schedule-presets-label">
            <Sparkles size={12} /> Suggestions:
          </span>
          <button
            type="button"
            className="meta-schedule-preset-pill"
            onClick={() => applyPreset('1h')}
          >
            +1 hour
          </button>
          <button
            type="button"
            className="meta-schedule-preset-pill"
            onClick={() => applyPreset('3h')}
          >
            +3 hours
          </button>
          <button
            type="button"
            className="meta-schedule-preset-pill"
            onClick={() => applyPreset('tomorrow_morning')}
          >
            Tomorrow 09:00
          </button>
          <button
            type="button"
            className="meta-schedule-preset-pill"
            onClick={() => applyPreset('tomorrow_evening')}
          >
            Tomorrow 19:00
          </button>
        </div>
      )}

      {/* ── Live Confirmation Banner (24h) ── */}
      {scheduleInfo && (
        <div className={`meta-schedule-summary-card ${scheduleInfo.isPast ? 'warning' : ''}`}>
          <div className="meta-schedule-summary-dot" />
          <div className="meta-schedule-summary-text">
            <span className="meta-schedule-summary-title">
              Scheduled for <strong>{scheduleInfo.full}</strong>
            </span>
            {scheduleInfo.relative && (
              <span className="meta-schedule-summary-rel">({scheduleInfo.relative})</span>
            )}
            {scheduleInfo.isPast && (
              <span className="meta-schedule-summary-past">
                ⚠️ Selected time is in the past. Please choose a future time.
              </span>
            )}
          </div>
        </div>
      )}

      <div className="meta-schedule-footnote">
        <Clock size={12} />
        <span>Server precision scheduler will publish to Facebook automatically at this scheduled time.</span>
      </div>
    </div>
  );
};
