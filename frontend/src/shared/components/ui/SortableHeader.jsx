import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Modern Sortable Table Header Component.
 * Features:
 * - Interactive sort indicator (neutral ArrowUpDown, ascending ArrowUp, descending ArrowDown)
 * - Hover state micro-animations
 * - Support for left, center, right text alignments
 * - Accessible keyboard navigation
 */
export const SortableHeader = ({
  label,
  sortKey,
  currentSort = { key: null, direction: null },
  onSort,
  align = 'left',
  defaultDirection = 'asc',
  title,
  style = {},
  thStyle = {},
  className = '',
  children,
}) => {
  const isSorted = currentSort?.key === sortKey;
  const direction = isSorted ? currentSort?.direction : null;

  const handleClick = (e) => {
    e.preventDefault();
    if (onSort) {
      onSort(sortKey, defaultDirection);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onSort) {
        onSort(sortKey, defaultDirection);
      }
    }
  };

  const getJustifyContent = () => {
    if (align === 'right') return 'flex-end';
    if (align === 'center') return 'center';
    return 'flex-start';
  };

  const tooltipText = title || (
    isSorted
      ? direction === 'asc'
        ? `Sorted ascending. Click to sort descending`
        : `Sorted descending. Click to clear sort`
      : `Click to sort by ${typeof label === 'string' ? label : 'this column'}`
  );

  return (
    <th
      className={`sortable-th ${isSorted ? 'sorted-active' : ''} ${className}`}
      style={{
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
        padding: '12px 16px',
        transition: 'background-color 0.15s ease',
        ...thStyle,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="columnheader"
      aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      title={tooltipText}
    >
      <div
        className="sortable-th-content"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          justifyContent: getJustifyContent(),
          color: isSorted ? '#0f172a' : '#64748b',
          fontWeight: isSorted ? 700 : 600,
          ...style,
        }}
      >
        <span>{label}</span>
        {children}

        <span
          className={`sort-icon-badge ${isSorted ? 'active' : 'inactive'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            backgroundColor: isSorted ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: isSorted ? '#2563eb' : '#94a3b8',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
        >
          {isSorted ? (
            direction === 'asc' ? (
              <ArrowUp size={12} strokeWidth={2.5} />
            ) : (
              <ArrowDown size={12} strokeWidth={2.5} />
            )
          ) : (
            <ArrowUpDown size={11} strokeWidth={2} className="sort-icon-neutral" />
          )}
        </span>
      </div>
    </th>
  );
};

export default SortableHeader;
