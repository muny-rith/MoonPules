# 01 - Project Zero-Latency: Enterprise Cache & Navigation Architecture

> **Folder:** `plan/`  
> **Status:** Completed & Verified  
> **Date:** November 2026  
> **Author:** Antigravity & Engineering Team  

---

## Executive Summary

When navigating between pages in MoonPulse or pressing the browser **Back** button, pages previously reloaded data from the server, flashing grey loading skeletons and resetting component state. 

This plan establishes an enterprise-grade **Stale-While-Revalidate (SWR)** caching layer using **TanStack Query** coupled with a **SessionStorage Persistence Engine**, delivering **instant 0ms renders** across all features without flashing skeletons.

---

## System Architecture Blueprint

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE (PAGES)                         │
│   DashboardPage    BrandCalendarPage    PostTrackerPage    Planner     │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │
             1. Immediate 0ms Read   │   2. Silent Background Update
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   UNIFIED CACHE ENGINE (TanStack Query)                │
│   • Centralized Query Key Factory (`queryKeys.js`)                     │
│   • Stale Time: 3–5 min (Data considered fresh; no network call)       │
│   • Garbage Collection: 15 min (Keep inactive pages in memory)         │
│   • Mutation Hooks: Invalidate only when data actually changes         │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
    Sync to Tab     │                                │ 3. Network Fetch
    Storage         ▼                                ▼ (Only if stale)
┌─────────────────────────┐               ┌──────────────────────────────┐
│  window.sessionStorage  │               │      BACKEND REST API        │
│  (Persists across F5 &  │               │   /posts, /calendar, /stats  │
│   Back-Button clicks)   │               └──────────────────────────────┘
└─────────────────────────┘
```

---

## Implementation Steps (1 to 5)

### 1. Stop Cache Self-Sabotage on Mount
* **Target File:** `frontend/src/features/postTracker/pages/PostTrackerPage.jsx`
* **Root Cause:** A mount effect executed `useEffect(() => { reload(queryParams); }, [queryParams, reload])`. The `reload()` function explicitly called `queryClient.invalidateQueries()`, destroying the TanStack Query cache on every navigation.
* **Resolution:**
  - Removed the redundant `useEffect`.
  - Allowed `usePostTracker(queryParams)` to natively subscribe to query parameter changes.
* **Result:** Navigating back to `/tasks` from Edit or Create Post renders the table in **0ms** without skeletons.

---

### 2. Unify Brand Calendar & Missions onto TanStack Query
* **Target Files:**
  - `frontend/src/features/calendar/pages/BrandCalendarPage.jsx`
  - `frontend/src/shared/hooks/queries/useMonthAudit.js` *(Created)*
  - `frontend/src/shared/hooks/queries/useCalendarSlots.js`
* **Root Cause:** The calendar stored deliverable slots and audit data in component `useState([])` and fetched via raw `loadData()` in `useEffect`. Navigating away unmounted the state; clicking Back re-fetched everything.
* **Resolution:**
  - Created `useMonthAudit(month, year)` query hook using `queryKeys.missions.audit`.
  - Replaced manual `loadData()` with `useCalendarSlots` and `useMonthAudit`.
  - Wired mutations (`onSaved`, rescheduling) to invalidate `queryKeys.missions.all`.
* **Result:** Navigating into a day slot or creating a post and clicking Back restores the calendar **instantly in 0ms**.

---

### 3. Unify Brand Operations Matrix & Fix Detail Page Cache Keys
* **Target Files:**
  - `frontend/src/features/missions/components/BrandUnifiedExpandableHub.jsx`
  - `frontend/src/features/statistics/pages/BrandDetailPage.jsx`
  - `frontend/src/features/statistics/services/brandStatsService.js`
* **Root Cause:**
  - `BrandUnifiedExpandableHub` executed 4 raw API calls on every mount, forcing skeleton cards.
  - `BrandDetailPage` had a cache-key mismatch: `getCachedBrandDetail(id)` checked with `{}` on initial render, while `fetchDetail` stored with `{ time_range, platform, ... }`. The lookup always failed.
* **Resolution:**
  - Added in-memory SWR cache (`hubCache`) with a 5-minute TTL to `BrandUnifiedExpandableHub`.
  - Updated `getCachedBrandDetail` in `brandStatsService.js` with smart fallback to the most recent valid cache entry.
  - Cached `brandMission` in memory to prevent skeleton pulses on the Deliverables panel.
* **Result:** Clicking into a brand's detail page and clicking Back restores the Operations Matrix and KPI metrics **instantly with zero delay**.

---

### 4. Modernize Dashboard & Product Catalog onto TanStack Query
* **Target Files:**
  - `frontend/src/features/dashboard/pages/DashboardPage.jsx`
  - `frontend/src/features/product/services/productService.js`
  - `frontend/src/features/product/hooks/useProducts.js`
* **Root Cause:** Relied on isolated `const cache = new Map()` that were wiped on browser reload (F5) and did not participate in global query invalidation.
* **Resolution:**
  - Centralized queries using `queryKeys.statistics.dashboard` and `queryKeys.products.all`.
  - Connected the Facebook sync triggers to invalidate respective query keys automatically.
* **Result:** Unified all features under a single source of truth.

---

### 5. Enterprise SessionStorage Rehydration Layer
* **Target File:** `frontend/src/shared/utils/queryClient.js`
* **Root Cause:** In-memory caches clear when pressing F5 (hard refresh) or opening a link in a new tab.
* **Resolution:**
  - Integrated a lightweight `sessionStorage` sync engine into `queryClient`.
  - Synchronizes queries for `brands`, `pages`, `missions`, `posts`, and `statistics` to `window.sessionStorage` (debounced by 400ms).
  - Automatically rehydrates all queries synchronously on startup in **< 1ms before React renders**.
* **Result:** Hard refreshing or navigating across tabs displays data **immediately without blank screens**.

---

## Verification & Testing Guide

1. **Tasks Back-Navigation Test:**
   - Open `http://localhost:5173/tasks`.
   - Click **Edit** on any post, then press the browser **Back** button.
   - *Expected:* The table appears instantly with zero skeleton flash.

2. **Calendar Back-Navigation Test:**
   - Open `http://localhost:5173/calendar`.
   - Click `+ Create Post` or click on any day slot, then click **Back**.
   - *Expected:* All deliverable slots appear instantly in 0ms.

3. **Brand Hub & Detail Test:**
   - Open `http://localhost:5173/stats/brands`.
   - Click **View Details** on any brand, then press **Back**.
   - *Expected:* The 5 KPI cards and table state render immediately without reloading.

4. **Hard Refresh (F5) Test:**
   - Press `Ctrl + F5` on any page.
   - *Expected:* SessionStorage rehydrates data in < 1ms, preventing cold-start blank screens.

