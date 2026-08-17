# Moon Pulse — Implementation Plan
### Social Content & Insights Tracker (connects Moon IMS + Facebook Graph API)
### Stack: PERN (PostgreSQL, Express, React, Node)

---

## 1. Purpose

Moon Pulse tracks which products (sourced from **Moon IMS**) have been posted to Facebook, monitors their scheduled → published status automatically, and lets the team pull post insights (views, reach, engagement) on demand.

---

## 2. Core Architecture Principle

**The frontend never talks to the database or Facebook directly.** All data access goes through a dedicated **Express/Node backend**. The backend is the only layer that knows the database schema and holds the Facebook access token — same principle as before, now implemented as a real PERN backend instead of Supabase Edge Functions.

```
        ┌──────────────┐
        │   Moon IMS   │  ← Source of Truth for Products
        └──────┬───────┘
               │ REST API (product data — public, safe client-side)
               ▼
        ┌──────────────┐
        │   React      │
        │  Frontend    │
        │  (Moon Pulse)│
        └──────┬───────┘
               │  ALL requests go through the Express backend
               ▼
        ┌───────────────────────────────┐
        │  Node/Express Backend           │
        │                                   │
        │  Routes → Controllers → Services │
        │                                   │
        │  - postTracker module            │
        │  - facebook module               │
        │  - cron worker (node-cron)       │◀── runs every 30 min
        └──────┬───────────────────┬─────┘
               │                   │
               ▼                   ▼
        ┌────────────┐     ┌─────────────────────┐
        │ PostgreSQL │     │ Facebook Graph API    │
        │  Database   │     │ (posts, insights)      │
        └────────────┘     └─────────────────────┘
```

- **Frontend:** React — feature-based structure
- **Backend:** Node.js + Express — layered architecture (routes/controllers/services)
- **DB:** PostgreSQL — accessed only from the backend via a connection pool (`pg`)
- **Scheduler:** `node-cron` job running inside the backend process, every 30 minutes
- **Team:** 4 internal users, 2 FB Pages (multi-page support built in)

> **Security rule:** the React frontend never imports a DB client and never calls `graph.facebook.com` directly. Everything goes through your own Express API (`/api/...`).

---

## 3. Database Schema

```sql
-- Table 1: FB Page Registry
CREATE TABLE tb_fb_page (
    id SERIAL PRIMARY KEY,
    page_name VARCHAR(255) NOT NULL,
    fb_page_id VARCHAR(255) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Post Tracker (core)
CREATE TABLE tb_post_tracker (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES tb_product(id),
    page_id INT NOT NULL REFERENCES tb_fb_page(id),
    fb_post_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'published')),
    scheduled_time TIMESTAMP,
    published_time TIMESTAMP,
    marked_by INT REFERENCES tb_user(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_tracker_status ON tb_post_tracker(status);
CREATE INDEX idx_post_tracker_page ON tb_post_tracker(page_id);
```

**Design notes:**
- One row per post — a product can post to multiple pages via multiple rows.
- `fb_post_id` UNIQUE prevents double-marking the same post.
- `status` CHECK constraint enforces only two valid states.
- Insights are **not stored** — fetched on demand, no historical insight table by design.
- Since only the backend ever touches Postgres, access control lives in **application code** (Express middleware/service layer) — no RLS needed, because there is no direct client-to-DB path at all.

---

## 4. Facebook Graph API — Endpoints Used (server-side only, called from Node)

| Purpose | Endpoint | Called by |
|---|---|---|
| List scheduled posts | `GET /{page-id}/scheduled_posts` | `facebook.service.js` → route `GET /api/facebook/scheduled-posts` |
| Check publish status | `GET /{post-id}?fields=is_published` | `cron` worker + `facebook.service.js` |
| Fetch insights | `GET /{post-id}/insights?metric=post_impressions,post_impressions_unique,post_engaged_users` | `facebook.service.js` → route `GET /api/facebook/insights/:postId` |

**Required permissions:** `pages_read_engagement`, `pages_show_list`, `read_insights`
**Auth:** Page Access Token stored in `tb_fb_page.access_token`, read only inside the Node backend (`.env` holds DB credentials; token itself lives in DB, fetched server-side per request) — never sent to the browser.

---

## 5. Backend Structure — Node/Express (Layered, Scalable)

```
server/
├── src/
│   ├── config/
│   │   ├── db.js                    ← pg Pool setup, reads DATABASE_URL from env
│   │   └── env.js                   ← centralizes process.env access + validation
│   │
│   ├── modules/
│   │   ├── postTracker/
│   │   │   ├── postTracker.routes.js       ← defines /api/post-tracker endpoints
│   │   │   ├── postTracker.controller.js   ← parses req/res, calls service
│   │   │   ├── postTracker.service.js      ← business logic (validation, orchestration)
│   │   │   └── postTracker.repository.js   ← raw SQL queries against tb_post_tracker
│   │   │
│   │   └── facebook/
│   │       ├── facebook.routes.js          ← /api/facebook endpoints
│   │       ├── facebook.controller.js
│   │       ├── facebook.service.js         ← business logic + token lookup
│   │       └── facebook.client.js          ← axios wrapper around Graph API calls
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js        ← verifies logged-in team member (JWT/session)
│   │   ├── errorHandler.js          ← centralized error → HTTP response mapping
│   │   └── requestLogger.js
│   │
│   ├── jobs/
│   │   └── syncPostStatus.job.js    ← node-cron: runs every 30 min, reuses facebook.service.js
│   │
│   ├── app.js                       ← Express app, mounts routes + middleware
│   └── server.js                    ← entry point, starts HTTP server + cron
│
├── .env
└── package.json
```

**Why this layering matters (Repository → Service → Controller → Route):**

| Layer | Responsibility | Why separated |
|---|---|---|
| `*.routes.js` | URL → controller mapping only | Swap routing framework later without touching logic |
| `*.controller.js` | Parse HTTP request, call service, shape HTTP response | Keeps HTTP concerns out of business logic |
| `*.service.js` | Business rules, validation, orchestration (e.g. "check product exists before marking post") | Testable in isolation, reusable by both HTTP routes and the cron job |
| `*.repository.js` | Raw SQL / query building only | DB access isolated — swapping `pg` for an ORM later touches only this file |

**Key scalability point:** the cron job (`syncPostStatus.job.js`) calls `facebook.service.js` and `postTracker.service.js` directly — **same service layer the HTTP routes use**. No duplicated logic between "API path" and "cron path."

---

## 6. API Endpoints (Express routes)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/post-tracker` | List tracked posts (joined with product/page info) |
| `POST` | `/api/post-tracker` | Mark a new post (insert row, status = 'scheduled') |
| `PATCH` | `/api/post-tracker/:id` | Update a tracker row (status, timestamps) |
| `GET` | `/api/facebook/pages/:pageId/scheduled-posts` | Proxy to FB `scheduled_posts` |
| `GET` | `/api/facebook/insights/:postId` | Proxy to FB `insights` |

All routes protected by `authMiddleware.js` — only the 4 authenticated team members can call them.

---

## 7. Frontend Structure — Feature-Based (Scalable)

Same principle as before: group by feature/domain, not file type. Only the API layer changes — it now calls your Express REST API instead of Supabase or Edge Functions.

```
src/
├── features/
│   └── postTracker/
│       ├── api/
│       │   └── postTrackerApi.js       ← axios/fetch calls to Express backend (/api/post-tracker, /api/facebook/*)
│       ├── hooks/
│       │   ├── usePostTracker.js
│       │   └── useFbInsights.js
│       ├── components/
│       │   ├── PostStatusBadge.jsx
│       │   ├── MarkPostModal.jsx
│       │   └── InsightPanel.jsx
│       ├── pages/
│       │   └── PostTrackerPage.jsx
│       ├── constants.js
│       └── index.js                    ← barrel export
│
├── shared/
│   ├── components/                     ← Button, Input, DataTable
│   └── utils/
│       └── apiClient.js                ← shared axios instance (baseURL, interceptors, auth header)
│
└── pages/                              ← existing routes (Product, Dashboard...)
```

---

## 8. Layered Responsibility (End-to-End)

```
React Page (UI)
   ↓
Hook (state, loading/error)
   ↓
Frontend api/postTrackerApi.js  (HTTP call via apiClient.js)
   ↓
Express Route  →  Controller  →  Service  →  Repository
   ↓                                  ↓
PostgreSQL                    Facebook Graph API (via facebook.client.js)
```

**Rule:** no layer skips its neighbor — this applies on both frontend and backend. This consistency is what makes the system "backend-ready" and easy to extend later (new platform = new `modules/instagram/` following the same 4-file pattern).

---

## 9. Cron Job Logic (`jobs/syncPostStatus.job.js`)

```js
// pseudo-code
const cron = require('node-cron');

cron.schedule('*/30 * * * *', async () => {
  const scheduledRows = await postTrackerService.getAllByStatus('scheduled');

  for (const row of scheduledRows) {
    const isPublished = await facebookService.checkPublished(row.fb_post_id, row.page_id);
    if (isPublished) {
      await postTrackerService.markPublished(row.id);
    }
  }
});
```

Registered once in `server.js` when the backend process starts.

**Scaling note:** if you ever run multiple backend instances (load-balanced), only **one instance** should run the cron schedule — otherwise the job fires multiple times in parallel. For now (single server, small team), this isn't a concern; flag it for later if you scale horizontally.

---

## 10. Decisions Already Made

| Decision | Value |
|---|---|
| Post detection strategy | Polling (not webhook) |
| Cron interval | 30 minutes, via `node-cron` inside the Express backend |
| Insight strategy | On-demand fetch via backend, not persisted |
| UI placement | Dedicated Post Tracker page, feature-based structure |
| Data access pattern | Frontend → Express API → PostgreSQL/Facebook. No direct DB or Facebook calls from frontend |
| Multi-page support | Yes (2 pages now, extensible) |
| Product source | Pulled from Moon IMS via API (not duplicated) |

---

## 11. Suggested Build Order

1. `tb_fb_page` + `tb_post_tracker` tables in PostgreSQL
2. Backend scaffold: `config/db.js`, `config/env.js`, `app.js`, `server.js`
3. `middleware/authMiddleware.js`, `middleware/errorHandler.js`
4. `modules/postTracker/` — repository → service → controller → routes
5. `modules/facebook/` — client → service → controller → routes
6. `jobs/syncPostStatus.job.js` — wire up `node-cron`, test manually first
7. Frontend `shared/utils/apiClient.js` — base HTTP client with auth header
8. `features/postTracker/api/postTrackerApi.js` — wraps all backend calls
9. `usePostTracker.js`, `useFbInsights.js` hooks
10. `MarkPostModal.jsx`, `PostStatusBadge.jsx`, `InsightPanel.jsx` components
11. `PostTrackerPage.jsx` — assembles the final page
