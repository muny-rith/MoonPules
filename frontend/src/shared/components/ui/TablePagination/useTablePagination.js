import { useState, useMemo, useEffect, useCallback } from 'react';

/**
 * Headless Hook for Turnkey Table Pagination with Persistence
 *
 * @param {Object} options
 * @param {Array} [options.data=[]] - Full un-sliced dataset array
 * @param {number} [options.defaultPageSize=25] - Default items per page (default: 25)
 * @param {string} [options.storageKey='moonpulse_table_page_size'] - localStorage key for preference memory
 * @param {number} [options.initialPage=1] - Starting page number
 * @returns {Object} { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, totalItems, paginatedData, resetPage, paginationProps }
 */
export function useTablePagination({
  data = [],
  defaultPageSize = 25,
  storageKey = 'moonpulse_table_page_size',
  initialPage = 1,
} = {}) {
  // 1. Initialize page size from localStorage or fallback default
  const [pageSize, setPageSizeState] = useState(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        const parsed = parseInt(saved, 10);
        if ([10, 25, 50, 100].includes(parsed)) return parsed;
      } catch (err) {
        console.warn('Failed to read localStorage page size:', err);
      }
    }
    return defaultPageSize;
  });

  const [currentPage, setCurrentPage] = useState(initialPage);

  // 2. Safe calculation of total pages
  const totalItems = data?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // 3. Clamp currentPage if dataset shrinks (e.g. after search filter)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // 4. Update page size with persistence
  const setPageSize = useCallback(
    (newSize) => {
      setPageSizeState(newSize);
      setCurrentPage(1); // Always reset to page 1 on page size change
      if (typeof window !== 'undefined' && storageKey) {
        try {
          localStorage.setItem(storageKey, String(newSize));
        } catch (err) {
          console.warn('Failed to persist page size preference:', err);
        }
      }
    },
    [storageKey]
  );

  // 5. Slice paginated data window
  const paginatedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  // 6. Reset page back to 1 (useful when parent filters/search triggers change)
  const resetPage = useCallback(() => setCurrentPage(1), []);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedData,
    resetPage,
    // Turnkey props object ready to spread onto <TablePagination {...paginationProps} />
    paginationProps: {
      currentPage,
      totalItems,
      pageSize,
      onPageChange: setCurrentPage,
      onPageSizeChange: setPageSize,
    },
  };
}

export default useTablePagination;
