-- Migration: Add profit tracking columns to tb_post_tracker
-- Run this against your Supabase/PostgreSQL database

ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS content_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS ad_spend NUMERIC(12,2) DEFAULT 0;
ALTER TABLE tb_post_tracker ADD COLUMN IF NOT EXISTS attribution_window_days INT DEFAULT 7;
