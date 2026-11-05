/**
 * Centralized Query Keys Factory
 * Provides consistent, type-safe query keys for TanStack Query caching and invalidation.
 */
export const queryKeys = {
  brands: {
    all: ['brands'],
    detail: (id) => ['brands', 'detail', String(id)],
  },
  pages: {
    all: ['pages'],
  },
  posts: {
    all: ['posts'],
    list: (filters = {}) => ['posts', 'list', filters],
    detail: (id) => ['posts', 'detail', String(id)],
    summary: (filters = {}) => ['posts', 'summary', filters],
  },
  missions: {
    all: ['missions'],
    slots: (brandId = 'all', month, year) => ['missions', 'slots', { brandId: String(brandId), month, year }],
    audit: (month, year) => ['missions', 'audit', { month, year }],
  },
  statistics: {
    all: ['statistics'],
    brand: (brandId, range) => ['statistics', 'brand', String(brandId), range],
    dashboard: (range, platform) => ['statistics', 'dashboard', { range, platform }],
  },
};

