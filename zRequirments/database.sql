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
    picture_url TEXT,
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

-- 4. Global Settings Table (Store Profile, Footers & System Config)
CREATE TABLE IF NOT EXISTS tb_setting (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Hashtags Repository (All, Recent, & Saved with Note Column)
CREATE TABLE IF NOT EXISTS tb_hashtag (
    id SERIAL PRIMARY KEY,
    tag VARCHAR(100) NOT NULL UNIQUE,
    is_saved BOOLEAN DEFAULT FALSE,
    note TEXT NULL,
    usage_count INT DEFAULT 0,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hashtag_tag ON tb_hashtag(tag);
CREATE INDEX IF NOT EXISTS idx_hashtag_is_saved ON tb_hashtag(is_saved);
CREATE INDEX IF NOT EXISTS idx_hashtag_last_used ON tb_hashtag(last_used_at DESC NULLS LAST);

-- 6. Brand Mission Master Table
CREATE TABLE IF NOT EXISTS tb_brand_mission (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    target_posters INT DEFAULT 0,
    target_live_streams INT DEFAULT 0,
    target_videos INT DEFAULT 0,
    target_status_posts INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_brand_monthly_mission UNIQUE (brand_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_brand_mission_lookup ON tb_brand_mission(brand_id, year, month);

-- 7. Brand Mission Day-by-Day Planned Slots
CREATE TABLE IF NOT EXISTS tb_brand_mission_slot (
    id SERIAL PRIMARY KEY,
    mission_id INT NOT NULL REFERENCES tb_brand_mission(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    time_window VARCHAR(50) NULL,
    notes TEXT,
    linked_post_id INT REFERENCES tb_post_tracker(id) ON DELETE SET NULL,
    slot_status VARCHAR(20) DEFAULT 'planned' CHECK (slot_status IN ('planned', 'scheduled', 'completed', 'missed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mission_slots_date ON tb_brand_mission_slot(planned_date);
CREATE INDEX IF NOT EXISTS idx_mission_slots_mission ON tb_brand_mission_slot(mission_id);


