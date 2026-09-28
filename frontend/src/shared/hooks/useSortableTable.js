import { useState, useMemo, useCallback } from 'react';

/**
 * Custom hook for sorting table datasets with 3-state cycling:
 *   asc -> desc -> default (null)
 * 
 * @param {Array} items - The array of items to sort
 * @param {Object} initialConfig - Initial sort configuration { key: string|null, direction: 'asc'|'desc'|null }
 * @param {Object} customAccessors - Optional dictionary of key => accessorFunction(item)
 * @returns {Object} { sortedItems, sortConfig, requestSort, resetSort, setSortConfig }
 */
export const useSortableTable = (items = [], initialConfig = { key: null, direction: null }, customAccessors = {}) => {
  const [sortConfig, setSortConfig] = useState(initialConfig);

  const requestSort = useCallback((key, defaultDirection = 'asc') => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: defaultDirection };
      }
      if (prev.direction === defaultDirection) {
        // Switch to opposite direction
        return { key, direction: defaultDirection === 'asc' ? 'desc' : 'asc' };
      }
      // If already in opposite direction, reset to neutral (null)
      return { key: null, direction: null };
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortConfig({ key: null, direction: null });
  }, []);

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!sortConfig.key || !sortConfig.direction) {
      return items;
    }

    const { key, direction } = sortConfig;
    const accessor = customAccessors[key];

    return [...items].sort((a, b) => {
      let valA = accessor ? accessor(a) : a?.[key];
      let valB = accessor ? accessor(b) : b?.[key];

      // Always push null or undefined values to the end
      if (valA === null || valA === undefined || valA === '') {
        return valB === null || valB === undefined || valB === '' ? 0 : 1;
      }
      if (valB === null || valB === undefined || valB === '') {
        return -1;
      }

      // Date comparison
      if (valA instanceof Date && valB instanceof Date) {
        const diff = valA.getTime() - valB.getTime();
        return direction === 'asc' ? diff : -diff;
      }

      // Check if both are numeric (or convertible to number, excluding pure boolean)
      const numA = typeof valA === 'number' ? valA : (typeof valA === 'string' && !isNaN(Number(valA)) && valA.trim() !== '' ? Number(valA) : null);
      const numB = typeof valB === 'number' ? valB : (typeof valB === 'string' && !isNaN(Number(valB)) && valB.trim() !== '' ? Number(valB) : null);

      if (numA !== null && numB !== null) {
        const diff = numA - numB;
        return direction === 'asc' ? diff : -diff;
      }

      // String comparison with natural numeric sorting (e.g. SKU-2 before SKU-10)
      const strA = String(valA);
      const strB = String(valB);
      const diff = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? diff : -diff;
    });
  }, [items, sortConfig, customAccessors]);

  return {
    sortedItems,
    sortConfig,
    requestSort,
    resetSort,
    setSortConfig,
  };
};

export default useSortableTable;
