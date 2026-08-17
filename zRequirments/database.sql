-- Table 1: FB Page Registry
CREATE TABLE IF NOT EXISTS tb_fb_page (
    id SERIAL PRIMARY KEY,
    page_name VARCHAR(255) NOT NULL,
    fb_page_id VARCHAR(255) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Post Tracker (core)
CREATE TABLE IF NOT EXISTS tb_post_tracker (
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

CREATE INDEX IF NOT EXISTS idx_post_tracker_status ON tb_post_tracker(status);
CREATE INDEX IF NOT EXISTS idx_post_tracker_page ON tb_post_tracker(page_id);
