import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Professional URL-synchronized table & page filters hook.
 *
 * Keeps filters (search query, date ranges, dropdown statuses, pagination)
 * automatically synced with browser URL query parameters.
 *
 * Features:
 *  - 100% Back/Forward browser history support
 *  - Shareable & bookmarkable filter URLs
 *  - Debounced search input sync (300ms) to ensure smooth 60fps typing without URL thrashing
 *  - Immediate sync for dropdowns, date pickers, and page numbers
 *  - Automatically resets page to 1 on filter/search change
 *
 * @param {Object} defaultFilters - Key-value map of default filter values (e.g. { range: 'this_month', status: 'all', search: '', page: 1 })
 * @param {Object} options - Configuration options:
 *   - debouncedKeys: Array of keys to debounce when syncing to URL (default: ['search', 'q'])
 *   - debounceDelay: Debounce delay in ms (default: 300)
 *   - pageKey: The key representing the page number (default: 'page')
 */
export const useUrlFilters = (
  defaultFilters = {},
  options = {}
) => {
  const {
    debouncedKeys = ['search', 'q'],
    debounceDelay = 300,
    pageKey = 'page',
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Helper to safely extract primitive value from potential event objects
  const unwrapFilterValue = (val) => {
    if (val && typeof val === 'object' && 'target' in val) {
      return val.target?.value ?? '';
    }
    if (typeof val === 'string' && val.includes('[object Object]')) {
      return '';
    }
    return val;
  };

  // Helper to parse a single param from URL with fallback to default
  const getParamFromUrl = useCallback(
    (key, defaultVal) => {
      const val = searchParams.get(key);
      if (val === null || val === undefined || val === '[object Object]' || val.includes('[object Object]')) {
        return defaultVal;
      }

      if (typeof defaultVal === 'number') {
        const num = parseInt(val, 10);
        return isNaN(num) ? defaultVal : num;
      }
      if (typeof defaultVal === 'boolean') {
        return val === 'true';
      }
      return val;
    },
    [searchParams]
  );

  // Self-healing: Automatically cleanse any corrupted '[object Object]' params from browser URL on mount
  useEffect(() => {
    let hasCorrupted = false;
    const cleanParams = new URLSearchParams(searchParams);
    for (const [key, val] of searchParams.entries()) {
      if (val === '[object Object]' || val.includes('[object Object]')) {
        cleanParams.delete(key);
        hasCorrupted = true;
      }
    }
    if (hasCorrupted) {
      setSearchParams(cleanParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Initialize local filter states from URL searchParams
  const initialValues = useMemo(() => {
    const init = {};
    for (const [key, defaultVal] of Object.entries(defaultFilters)) {
      init[key] = getParamFromUrl(key, defaultVal);
    }
    return init;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFiltersState] = useState(initialValues);

  // Keep a ref to the latest filters and defaultFilters to avoid stale closures
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const defaultFiltersRef = useRef(defaultFilters);
  defaultFiltersRef.current = defaultFilters;

  // Sync internal state when URL changes externally (e.g. Browser Back/Forward navigation)
  useEffect(() => {
    setFiltersState((prev) => {
      let hasChanges = false;
      const next = { ...prev };
      for (const [key, defaultVal] of Object.entries(defaultFiltersRef.current)) {
        const urlVal = getParamFromUrl(key, defaultVal);
        if (prev[key] !== urlVal) {
          next[key] = urlVal;
          hasChanges = true;
        }
      }
      return hasChanges ? next : prev;
    });
  }, [searchParams, getParamFromUrl]);

  // Push filter changes into URL searchParams
  const pushParamsToUrl = useCallback(
    (newFilters, shouldResetPage = false) => {
      const nextParams = new URLSearchParams(searchParams);

      for (const [key, rawValue] of Object.entries(newFilters)) {
        const value = unwrapFilterValue(rawValue);
        const defaultVal = defaultFiltersRef.current[key];
        const isDefault =
          value === defaultVal ||
          value === '' ||
          value === null ||
          value === undefined ||
          value === '[object Object]' ||
          (Array.isArray(value) && value.length === 0);

        if (isDefault) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, String(value));
        }
      }

      if (shouldResetPage && pageKey && newFilters[pageKey] === undefined) {
        nextParams.delete(pageKey);
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams, pageKey]
  );

  // Debounced sync for text search keys
  const debounceTimerRef = useRef(null);

  const syncDebouncedToUrl = useCallback(
    (key, value) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        pushParamsToUrl({ [key]: value }, true);
      }, debounceDelay);
    },
    [pushParamsToUrl, debounceDelay]
  );

  // Public setter for a single filter key
  const setFilter = useCallback(
    (key, rawValue) => {
      const value = unwrapFilterValue(rawValue);
      const isDebounced = debouncedKeys.includes(key);

      setFiltersState((prev) => {
        const next = { ...prev, [key]: value };
        if (key !== pageKey && prev[pageKey] !== undefined) {
          next[pageKey] = 1;
        }
        return next;
      });

      if (isDebounced) {
        syncDebouncedToUrl(key, value);
      } else {
        const shouldResetPage = key !== pageKey;
        pushParamsToUrl({ [key]: value }, shouldResetPage);
      }
    },
    [debouncedKeys, pageKey, syncDebouncedToUrl, pushParamsToUrl]
  );

  // Public setter for multiple filters at once (e.g. custom date range start & end)
  const setFilters = useCallback(
    (partialFilters, shouldResetPage = true) => {
      const cleaned = {};
      for (const [k, v] of Object.entries(partialFilters)) {
        cleaned[k] = unwrapFilterValue(v);
      }
      setFiltersState((prev) => {
        const next = { ...prev, ...cleaned };
        if (shouldResetPage && pageKey && prev[pageKey] !== undefined) {
          next[pageKey] = 1;
        }
        return next;
      });

      pushParamsToUrl(cleaned, shouldResetPage);
    },
    [pageKey, pushParamsToUrl]
  );

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setFiltersState(defaultFiltersRef.current);
    const nextParams = new URLSearchParams(searchParams);
    for (const key of Object.keys(defaultFiltersRef.current)) {
      nextParams.delete(key);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    searchParams,
  };
};
