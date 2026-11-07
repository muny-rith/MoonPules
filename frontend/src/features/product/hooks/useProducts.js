import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as productService from '../services/productService';
import { useUrlFilters } from '../../../shared/hooks/useUrlFilters';

export const useProducts = () => {
  // TanStack Query: Cached products & categories
  const {
    data: products = [],
    isLoading: prodsLoading,
    error: prodsError,
    refetch: refetchProds,
  } = useQuery({
    queryKey: ['products', 'list'],
    queryFn: () => productService.fetchProducts(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: categories = [],
    isLoading: catsLoading,
    error: catsError,
    refetch: refetchCats,
  } = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: () => productService.fetchProductCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const loading = prodsLoading || catsLoading;
  const error = prodsError?.message || catsError?.message || null;

  // URL-synced filters
  const { filters, setFilter, resetFilters } = useUrlFilters(
    {
      search: '',
      category: 'all',
      stock: 'all',
      view: 'grid',
    },
    {
      debouncedKeys: ['search'],
      debounceDelay: 300,
      pageKey: null,
    }
  );

  const searchTerm = filters.search || '';
  const selectedCategory = filters.category || 'all';
  const stockFilter = filters.stock || 'all';
  const viewMode = filters.view || 'grid';

  const setSearchTerm = useCallback((val) => setFilter('search', val), [setFilter]);
  const setSelectedCategory = useCallback((val) => setFilter('category', val), [setFilter]);
  const setStockFilter = useCallback((val) => setFilter('stock', val), [setFilter]);
  const setViewMode = useCallback((val) => setFilter('view', val), [setFilter]);

  const reload = useCallback(() => {
    return Promise.all([refetchProds(), refetchCats()]);
  }, [refetchProds, refetchCats]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search matching
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        p.product_name?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q);

      // Category matching
      const matchesCategory = selectedCategory === 'all' || 
        p.category_name?.toLowerCase() === selectedCategory.toLowerCase();

      // Stock status matching
      let matchesStock = true;
      if (stockFilter === 'in_stock') {
        matchesStock = p.on_hand_qty > 0;
      } else if (stockFilter === 'low_stock') {
        matchesStock = p.on_hand_qty > 0 && p.on_hand_qty <= 20;
      } else if (stockFilter === 'out_of_stock') {
        matchesStock = p.on_hand_qty === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(p => p.on_hand_qty > 0).length;
    const lowStock = products.filter(p => p.on_hand_qty > 0 && p.on_hand_qty <= 20).length;
    const totalInventoryUnits = products.reduce((acc, p) => acc + (p.on_hand_qty || 0), 0);
    const totalValue = products.reduce((acc, p) => acc + ((p.on_hand_qty || 0) * (p.unit_price || 0)), 0);

    return {
      total,
      inStock,
      lowStock,
      totalInventoryUnits,
      totalValue,
    };
  }, [products]);

  return {
    products: filteredProducts,
    rawProducts: products,
    categories,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    stockFilter,
    setStockFilter,
    viewMode,
    setViewMode,
    resetFilters,
    stats,
    reload,
  };
};
