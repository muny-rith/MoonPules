import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './TablePagination.css';

/**
 * Universal Global Table Pagination Component
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-based)
 * @param {number} props.totalItems - Total item count
 * @param {number} [props.pageSize=25] - Items per page
 * @param {number[]} [props.pageSizeOptions=[10, 25, 50, 100]] - Page size selector options
 * @param {Function} props.onPageChange - Handler when page changes (newPage: number) => void
 * @param {Function} [props.onPageSizeChange] - Handler when page size changes (newSize: number) => void
 * @param {string} [props.itemLabel='items'] - Entity noun (e.g. 'brands', 'posts', 'records')
 * @param {boolean} [props.showPageSize=true] - Whether to show the rows per page dropdown
 * @param {boolean} [props.showRange=true] - Whether to show "Showing X to Y of Z items"
 * @param {boolean} [props.compact=false] - Whether to render in compact format (for sidebars/modals)
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {Object} [props.style={}] - Custom inline styles
 */
export const TablePagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
  showPageSize = true,
  showRange = true,
  compact = false,
  className = '',
  style = {},
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Smart Page Window Generator (Option B: Streamlined Ghost Numbers)
  const pageNumbers = useMemo(() => {
    if (compact || totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // When totalPages > 5, display streamlined window with at most 3 numbers
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  }, [totalPages, safeCurrentPage, compact]);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages && page !== safeCurrentPage) {
      onPageChange?.(page);
    }
  };

  return (
    <div
      className={`table-pagination-container ${compact ? 'compact' : ''} ${className}`.trim()}
      style={style}
    >
      {/* 1. Left: Range & Total Counter */}
      {showRange && (
        <div className="table-pagination-info">
          {compact ? (
            <span>
              <strong>{startItem}-{endItem}</strong> of <strong>{totalItems}</strong> {itemLabel}
            </span>
          ) : (
            <span>
              Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> {itemLabel}
            </span>
          )}
        </div>
      )}

      {/* 2. Right: Grouped Actions (Rows Per Page + Navigation Controls) */}
      <div className="table-pagination-actions">
        {/* Rows Per Page Selector */}
        {showPageSize && onPageSizeChange && (
          <div className="table-pagination-size">
            <span className="table-pagination-size-label">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="table-pagination-size-select"
              aria-label="Select rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Controls & Ghost Page Numbers */}
        <div className="table-pagination-controls">
          {/* Previous Page Button */}
          <button
            type="button"
            className="table-pagination-nav-btn"
            disabled={safeCurrentPage === 1}
            onClick={() => handlePageClick(safeCurrentPage - 1)}
            title="Previous Page"
            aria-label="Go to previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Ghost Numbered Page Buttons or Compact Text */}
          {compact ? (
            <span className="table-pagination-compact-text">
              {safeCurrentPage} / {totalPages}
            </span>
          ) : (
            <div className="table-pagination-pages">
              {pageNumbers.map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="table-pagination-ellipsis">
                      …
                    </span>
                  );
                }

                const isActive = p === safeCurrentPage;
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    className={`table-pagination-page-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handlePageClick(p)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          )}

          {/* Next Page Button */}
          <button
            type="button"
            className="table-pagination-nav-btn"
            disabled={safeCurrentPage === totalPages}
            onClick={() => handlePageClick(safeCurrentPage + 1)}
            title="Next Page"
            aria-label="Go to next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
