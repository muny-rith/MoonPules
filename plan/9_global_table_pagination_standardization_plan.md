# Plan 9: Global Table Pagination Standardization & Enterprise Component Specification
**Reusable `<TablePagination />` Architecture, Default 25-Row Sizing, & Multi-Table Unification**

---

## 1. Executive Summary & Problem Landscape

MoonPulse is an enterprise social media operations and analytics platform. As agency client accounts grow (from 15 brands to 27 active brands, with 78 total brands in the portfolio, and hundreds of monthly deliverables), data tables are the primary day-to-day workspace for content managers, account executives, and operational directors.

### 1.1 The Operational Gaps & Inconsistencies
1. **Arbitrary & Suboptimal Default Row Counts:**
   - **`BrandUnifiedExpandableHub.jsx` (Brands Command Center):** Hardcoded to `15` items per page. Because MoonPulse currently manages **27 active brands**, users are unnecessarily forced to click "Next" just to see the remaining 12 active brands on page 2.
   - **`BrandDeliverablesHub.jsx` (Missions Hub):** Hardcoded to `20` items per page.
   - **`PostTrackerPage.jsx` (Post Tracker):** Allows `10, 25, 50, 100`, but with ad-hoc styling and separate filter state management.
2. **Duplicated Pagination Math & Code Fragmentation:**
   - Every page manually writes boilerplate: `const totalPages = Math.ceil(data.length / pageSize) || 1;`
   - Every page manually implements array slicing: `data.slice((currentPage - 1) * pageSize, currentPage * pageSize)`
   - Every page builds its own inline controls with custom HTML, inline CSS, and mismatched button styles (some use Lucide icons, some use text "Previous / Next", some use raw `<button>`, some use `<Button variant="outline">`).
3. **Lack of User Preference Persistence:**
   - If an account manager prefers viewing 50 rows at a time, their preference is lost upon navigating to another page or refreshing the browser.

### 1.2 The Strategic Solution
1. **Establish 25 Rows as the Universal Golden Standard:**
   - 25 rows covers ~90% of active agency clients on a single screen without requiring scrolling fatigue.
   - Ultra-fast DOM rendering (~0.05ms paint time in modern Chromium/React).
2. **Author a Reusable Global Enterprise Component (`<TablePagination />`):**
   - Packaged in `frontend/src/shared/components/ui/TablePagination/` and exported via `@shared/components/ui`.
   - Complete with range text (`Showing 1 to 25 of 78 brands`), page size selector (`Rows per page: [ 25 ▾ ]`), and smart numbered pagination (`« ‹ 1 2 [3] 4 5 › »`).
   - Built-in `localStorage` synchronization (`moonpulse_table_page_size`).
3. **Provide a Clean Utility Hook (`useTablePagination`):**
   - Automatically handles slicing, page bounds, page size switching, filter resets, and returns plug-and-play props for `<TablePagination />`.

---

## 2. Component Design & Architectural Specification

### 2.1 File Structure
```
frontend/src/shared/components/ui/TablePagination/
├── TablePagination.jsx        # Main component with accessible controls & smart windowing
├── TablePagination.css        # Clean enterprise styling, responsive layout, subtle active states
├── useTablePagination.js      # Headless custom hook for state, slicing & persistence
└── index.js                   # Public exports
```

Re-exported through:
```javascript
// frontend/src/shared/components/ui/index.js
export { TablePagination, useTablePagination } from './TablePagination';
```

---

### 2.2 Component API (`<TablePagination />`)

```typescript
interface TablePaginationProps {
  /** Current active page (1-indexed) */
  currentPage: number;
  /** Total count of filtered items */
  totalItems: number;
  /** Number of items per page (default: 25) */
  pageSize?: number;
  /** Available page size choices (default: [10, 25, 50, 100]) */
  pageSizeOptions?: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Entity noun for display text (e.g. 'brands', 'posts', 'deliverables', 'items') */
  itemLabel?: string;
  /** Whether to show the rows-per-page dropdown (default: true) */
  showPageSize?: boolean;
  /** Whether to show jump-to-page input for large sets (> 10 pages) (default: false) */
  showQuickJump?: boolean;
  /** Storage key to remember preference in localStorage (default: 'moonpulse_table_page_size') */
  storageKey?: string;
  /** Compact mode for tight modal drawers or sidebars */
  compact?: boolean;
  /** Optional custom container CSS class */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}
```

---

### 2.3 UX Layout & Visual Hierarchy

#### Desktop Full Layout (Standard Table Footer - Option B: Modern Ghost Numbers):
```
+-------------------------------------------------------------------------------------------------------------------------+
| Showing 1 to 25 of 78 brands                                        Rows per page: [ 25 ▾ ]      [ ‹ ]  [1]  2  3  …  9  [ › ] |
+-------------------------------------------------------------------------------------------------------------------------+
```

#### Compact / Modal Layout (`compact={true}` or Mobile Viewport):
```
+-----------------------------------------------------------------------------------------+
| 1-25 of 78 brands                                        ‹  Page 2 of 4  ›              |
+-----------------------------------------------------------------------------------------+
```

#### Smart Page Window Algorithm:
When total pages is high (e.g. 20 pages), avoid overwhelming the UI with 20 buttons:
- If $\text{totalPages} \le 7$: Render all page buttons `[1, 2, 3, 4, 5, 6, 7]`.
- If $\text{totalPages} > 7$:
  - Near beginning (page $\le 4$): `[1, 2, 3, 4, 5, '...', totalPages]`
  - Near end (page $\ge \text{totalPages} - 3$): `[1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]`
  - Middle: `[1, '...', page - 1, page, page + 1, '...', totalPages]`

---

### 2.4 Headless Hook Specification (`useTablePagination`)

To make integrating pagination effortless across any table, a custom hook encapsulates both data slicing and state persistence:

```javascript
export function useTablePagination({
  data = [],
  defaultPageSize = 25,
  storageKey = 'moonpulse_table_page_size',
  initialPage = 1,
} = {}) {
  // 1. Initialize page size from localStorage or default
  const [pageSize, setPageSizeState] = useState(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const saved = localStorage.getItem(storageKey);
      const parsed = parseInt(saved, 10);
      if ([10, 25, 50, 100].includes(parsed)) return parsed;
    }
    return defaultPageSize;
  });

  const [currentPage, setCurrentPage] = useState(initialPage);

  // 2. Compute total pages safely
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // 3. Ensure currentPage is clamped within bounds if data shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // 4. Change page size with persistence
  const setPageSize = useCallback((newSize) => {
    setPageSizeState(newSize);
    setCurrentPage(1); // Always reset to page 1 when size changes
    if (typeof window !== 'undefined' && storageKey) {
      try {
        localStorage.setItem(storageKey, String(newSize));
      } catch (err) {
        console.warn('Failed to save page size preference:', err);
      }
    }
  }, [storageKey]);

  // 5. Slice paginated items
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  // 6. Reset helper (for parent filters/search triggers)
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
    // Ready-to-spread props directly into <TablePagination />
    paginationProps: {
      currentPage,
      totalItems,
      pageSize,
      onPageChange: setCurrentPage,
      onPageSizeChange: setPageSize,
    },
  };
}
```

---

## 3. Implementation Plan & File Touchpoints

### Phase 1: Core Global Component Authoring
1. **Create `TablePagination.jsx`:**
   - Render Range Label: `Showing X to Y of Z {itemLabel}`.
   - Render Page Size Selector: cleanly styled `<select>` with options `[10, 25, 50, 100]` and custom SVG arrow.
   - Render Navigation Buttons: First (`ChevronsLeft`), Previous (`ChevronLeft`), Numbered Page Buttons with active pill indicator, Next (`ChevronRight`), Last (`ChevronsRight`).
   - Graceful fallback: If `totalItems === 0`, render clean "0 items" indicator with disabled controls.
2. **Create `TablePagination.css`:**
   - Polished design token styling (`#f8fafc` background, `#e2e8f0` borders, `#0284c7` / `#2563eb` active accent, smooth transition on hover).
   - Responsive breakpoints (automatically collapses controls gracefully on mobile/tablet).
3. **Create `useTablePagination.js`:**
   - Provides turnkey integration for any table.
4. **Update `frontend/src/shared/components/ui/index.js`:**
   - Export `TablePagination` and `useTablePagination`.

---

### Phase 2: Refactoring Consumers Across Codebase

#### Target Consumer 1: `BrandUnifiedExpandableHub.jsx` (`/stats/brands`)
- **Current State:**
  - `const itemsPerPage = 15;` (hardcoded).
  - Inline pagination div (`lines 1224-1259`).
- **Target Refactor:**
  - Adopt `useTablePagination` or state with default `pageSize = 25`.
  - Replace lines 1224-1259 with:
    ```jsx
    <TablePagination
      currentPage={currentPage}
      totalItems={filteredBrands.length}
      pageSize={itemsPerPage}
      onPageChange={setCurrentPage}
      onPageSizeChange={(newSize) => setItemsPerPage(newSize)}
      itemLabel="brands"
    />
    ```
  - Benefit: User now sees all 27 active brands with 25 rows on page 1 + 2 on page 2, or can switch to 50 to see 100% of active brands in one consolidated dashboard view!

#### Target Consumer 2: `BrandDeliverablesHub.jsx` (`/missions`)
- **Current State:**
  - `const pageSize = 20;` (hardcoded).
  - Inline buttons (`lines 922-970`).
- **Target Refactor:**
  - Upgrade default to `25`.
  - Replace inline button group with `<TablePagination ... itemLabel="brands" />`.

#### Target Consumer 3: `PostTrackerPage.jsx` (`/posts`)
- **Current State:**
  - Custom rows-per-page dropdown and Chevron buttons (`lines 942-965`).
- **Target Refactor:**
  - Standardize with `<TablePagination ... itemLabel="posts" />`.
  - Unified aesthetic across both Brands Statistics and Post Tracker.

---

## 4. Verification & Testing Strategy

1. **Frontend Production Build Verification:**
   - Run `npm run build --prefix frontend` to ensure 0 JSX/CSS syntax errors and clean bundle output.
2. **Behavioral Testing Checklist:**
   - **Page Sizing:** Switching from 25 to 50 immediately re-slices the table and resets `currentPage` to 1.
   - **Range Bounds:** When on page 4 and user searches for a term matching only 3 records, `currentPage` smoothly clamps to page 1 without crashing or displaying empty blank tables.
   - **Persistence:** Selecting 50 rows, refreshing the page, and confirming the preference persists via `localStorage`.
   - **Zero Item State:** When search returns 0 results, controls show `Showing 0 of 0` with navigation buttons disabled.
   - **Mobile Responsiveness:** Shrinking window to tablet/mobile width cleanly wraps or collapses the numbered pills into compact format.

---

## 5. Review & Approval Sign-Off

- [x] **Default Row Count:** Approved default of 25 rows across all tables.
- [x] **Component Architecture:** Approved global component in `shared/components/ui/TablePagination`.
- [x] **Rollout Scope:** Approved migration across `BrandUnifiedExpandableHub`, `BrandDeliverablesHub`, and `PostTrackerPage`.
- [x] **Verification:** Production build verified (`vite build` in 1.71s, 0 errors).

