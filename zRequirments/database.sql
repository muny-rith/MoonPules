-- ==========================================================
-- Moon Pulse Database Schema (PostgreSQL) - Latest Version
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS tb_user (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Facebook Page Registry
CREATE TABLE IF NOT EXISTS tb_fb_page (
    id SERIAL PRIMARY KEY,
    page_name VARCHAR(255) NOT NULL,
    fb_page_id VARCHAR(255) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Post Tracker (Core Tracking & In-App Scheduling Engine)
CREATE TABLE IF NOT EXISTS tb_post_tracker (
    id SERIAL PRIMARY KEY,
    product_id INT NULL,
    brand_id INT NULL,
    tracking_type VARCHAR(20) DEFAULT 'product'
        CHECK (tracking_type IN ('product', 'brand')),
    page_id INT NOT NULL REFERENCES tb_fb_page(id) ON DELETE CASCADE,
    fb_post_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CONSTRAINT tb_post_tracker_status_check
        CHECK (status IN ('scheduled', 'published', 'failed', 'archived')),
    scheduled_time TIMESTAMP,
    published_time TIMESTAMP,
    marked_by INT REFERENCES tb_user(id) ON DELETE SET NULL,
    
    -- Content & Media (In-App Publishing Engine)
    message TEXT,
    media_url TEXT,
    media_type VARCHAR(50) DEFAULT 'photo',
    publish_error TEXT,

    -- Social Engagement & Insights Metrics
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    reach_count INT DEFAULT 0,

    -- Financial Attribution & Ad Spend
    content_cost NUMERIC(12, 2) DEFAULT 0.00,
    ad_spend NUMERIC(12, 2) DEFAULT 0.00,
    attribution_window_days INT DEFAULT 7,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Must target either a product or a brand
    CONSTRAINT chk_post_tracker_target CHECK (product_id IS NOT NULL OR brand_id IS NOT NULL)
);

-- Indexes for Query Performance & Data Integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_tracker_fb_post_id 
    ON tb_post_tracker(fb_post_id) 
    WHERE fb_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_tracker_status 
    ON tb_post_tracker(status);

CREATE INDEX IF NOT EXISTS idx_post_tracker_page 
    ON tb_post_tracker(page_id);

CREATE INDEX IF NOT EXISTS idx_post_tracker_product 
    ON tb_post_tracker(product_id);

CREATE INDEX IF NOT EXISTS idx_post_tracker_brand 
    ON tb_post_tracker(brand_id);

CREATE INDEX IF NOT EXISTS idx_post_tracker_scheduled_time 
    ON tb_post_tracker(scheduled_time);

CREATE INDEX IF NOT EXISTS idx_post_tracker_published_time 
    ON tb_post_tracker(published_time);
