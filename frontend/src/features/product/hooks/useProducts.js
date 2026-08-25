import { useState, useEffect, useCallback, useMemo } from 'react';
import * as productService from '../services/productService';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodsData, catsData] = await Promise.all([
        productService.fetchProducts(),
        productService.fetchProductCategories()
      ]);
      setProducts(prodsData || []);
      setCategories(catsData || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

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
    stats,
    reload: loadData,
  };
};
