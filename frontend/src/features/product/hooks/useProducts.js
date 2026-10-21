import { useState, useEffect, useCallback, useMemo } from 'react';
import * as productService from '../services/productService';
import { useUrlFilters } from '../../../shared/hooks/useUrlFilters';

export const useProducts = () => {
  const initialProds = productService.getCachedProducts();
  const initialCats = productService.getCachedProductCategories();
  const [products, setProducts] = useState(() => initialProds || []);
  const [categories, setCategories] = useState(() => initialCats || []);
  const [loading, setLoading] = useState(() => !initialProds);
  const [error, setError] = useState(null);

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

  const loadData = useCallback(async (force = false) => {
    try {
      const hasCached = !!productService.getCachedProducts();
      if (!hasCached || force) {
        setLoading(true);
      }
      setError(null);
      const [prodsData, catsData] = await Promise.all([
        productService.fetchProducts({}, force),
        productService.fetchProductCategories(force)
      ]);
      setProducts(prodsData || []);
      setCategories(catsData || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      if (!productService.getCachedProducts()) {
        setError(err?.response?.data?.error || err.message || 'Failed to fetch products');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    productService.clearProductCache();
    return loadData(true);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
