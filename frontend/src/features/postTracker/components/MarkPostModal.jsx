import React, { useState, useEffect } from 'react';
import * as api from '../api/postTrackerApi';
import { parseFbPostUrl } from '../utils/parseFbPostUrl';
import { ProductPicker } from '../../product/component/ProductPicker';
import { X, CheckSquare, Globe, Link2, Sparkles, AlertCircle } from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const MarkPostModal = ({ isOpen, onClose, onPostMarked }) => {
  const [mode, setMode] = useState('pick'); // 'pick' | 'paste'
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState('');
  const [productId, setProductId] = useState('');
  
  // Cost inputs
  const [contentCost, setContentCost] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [attributionWindow, setAttributionWindow] = useState(7);

  // "pick" mode state
  const [recentPosts, setRecentPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');

  // "paste" mode state
  const [postUrl, setPostUrl] = useState('');
  const [parsedPostId, setParsedPostId] = useState(null);
  const [urlError, setUrlError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isOpen) loadPages();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && mode === 'pick' && pageId) loadRecentPosts();
  }, [isOpen, mode, pageId]);

  const loadPages = async () => {
    try {
      const data = await api.fetchPages();
      setPages(data || []);
      if (data && data.length > 0) setPageId(String(data[0].id));
    } catch (err) {
      console.error('Failed to load pages', err);
    }
  };

  const loadRecentPosts = async () => {
    try {
      setLoadingPosts(true);
      setSelectedPostId('');
      const data = await api.fetchRecentPosts(pageId);
      setRecentPosts(data?.data || []);
    } catch (err) {
      console.error('Failed to load recent posts', err);
      setRecentPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleUrlChange = (value) => {
    setPostUrl(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setParsedPostId(null);
      setUrlError('');
      return;
    }

    // Case 1: already a raw combined ID, e.g. "350934271426182_2219691172162335"
    if (/^\d+_\d+$/.test(trimmed)) {
      setParsedPostId(trimmed);
      setUrlError('');
      return;
    }

    // Case 2: bare numeric post ID
    if (/^\d+$/.test(trimmed)) {
      const page = pages.find((p) => String(p.id) === String(pageId));
      if (page?.fb_page_id) {
        setParsedPostId(`${page.fb_page_id}_${trimmed}`);
        setUrlError('');
      } else {
        setParsedPostId(null);
        setUrlError('Select a page first so the ID can be matched to it.');
      }
      return;
    }

    // Case 3: a full Facebook URL
    const parsed = parseFbPostUrl(trimmed);
    if (parsed) {
      setParsedPostId(parsed);
      setUrlError('');
    } else {
      setParsedPostId(null);
      setUrlError(
        "Couldn't recognize that. Paste either the numeric post ID (from Business Suite's Post Details panel) or a post link with a plain numeric ID."
      );
    }
  };

  const getFbPostIdToSubmit = () => {
    if (mode === 'pick') return selectedPostId || null;
    return parsedPostId;
  };

  const handleMark = async () => {
    const fbPostId = getFbPostIdToSubmit();
    if (!fbPostId || !pageId || !productId) return;
    try {
      setSubmitting(true);
      setSubmitError('');
      await onPostMarked({
        product_id: parseInt(productId, 10),
        page_id: parseInt(pageId, 10),
        fb_post_id: fbPostId,
        status: 'scheduled',
        content_cost: parseFloat(contentCost) || 0,
        ad_spend: parseFloat(adSpend) || 0,
        attribution_window_days: parseInt(attributionWindow, 10) || 7,
      });
      resetAndClose();
    } catch (err) {
      console.error('Failed to mark post', err);
      setSubmitError(err?.response?.data?.error || 'Failed to mark this post. It may already be tracked.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setPostUrl('');
    setParsedPostId(null);
    setUrlError('');
    setSelectedPostId('');
    setSubmitError('');
    setProductId('');
    setContentCost(0);
    setAdSpend(0);
    setAttributionWindow(7);
    onClose();
  };

  if (!isOpen) return null;

  const canSubmit = getFbPostIdToSubmit() && pageId && productId && !submitting;

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-card overflow-visible">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <CheckSquare size={20} className="icon-blue" />
            <h2>Mark a Post</h2>
          </div>
          <button className="modal-close-btn" onClick={resetAndClose}>
            <X size={18} />
          </button>
        </div>

        <p className="modal-subtitle">
          Select a product from Moon IMS and pair it with a published Facebook post to track live reach and impressions.
        </p>

        <div className="modal-form-group">
          <label className="modal-label">1. Select Product (Moon IMS)</label>
          <ProductPicker 
            value={productId} 
            onChange={(val) => setProductId(val)} 
            placeholder="Search & choose a product to track..."
          />
        </div>

        <div className="modal-form-group">
          <label className="modal-label">2. Facebook Page</label>
          <div className="custom-select-wrap">
            <Globe size={16} className="select-icon icon-blue" />
            <select 
              value={pageId} 
              onChange={(e) => setPageId(e.target.value)} 
              className="custom-select modal-select"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{p.page_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-form-group">
          <label className="modal-label">3. Facebook Post</label>
          <div className="modal-tabs">
            <button
              type="button"
              onClick={() => setMode('pick')}
              className={`modal-tab-btn ${mode === 'pick' ? 'active' : ''}`}
            >
              Pick from recent posts
            </button>
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`modal-tab-btn ${mode === 'paste' ? 'active' : ''}`}
            >
              Paste post link / ID
            </button>
          </div>

          {mode === 'pick' && (
            <div className="modal-post-picker-list">
              {loadingPosts ? (
                <div className="modal-radio-list">
                  {[1, 2, 3].map(i => (
                    <div key={`skeleton-post-${i}`} className="modal-radio-item" style={{ display: 'flex', gap: '12px', alignItems: 'center', pointerEvents: 'none' }}>
                      <Skeleton width={16} height={16} borderRadius="50%" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <Skeleton width="80%" height={14} />
                        <Skeleton width="40%" height={12} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="modal-empty-posts">
                  <AlertCircle size={15} />
                  <span>No recent posts found on this page.</span>
                </div>
              ) : (
                <div className="modal-radio-list">
                  {recentPosts.map((post) => (
                    <label 
                      key={post.id} 
                      className={`modal-radio-item ${selectedPostId === post.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="post-pick"
                        checked={selectedPostId === post.id}
                        onChange={() => setSelectedPostId(post.id)}
                      />
                      <span className="post-message-text">
                        {post.message || '(Image / Video post without caption)'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'paste' && (
            <div className="modal-paste-box">
              <div className="modal-input-wrap">
                <Link2 size={16} className="input-icon" />
                <input
                  type="text"
                  value={postUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Paste numeric post ID (e.g. 2219691172162335) or URL..."
                  className="modal-text-input"
                />
              </div>
              {urlError && <p className="modal-url-error">{urlError}</p>}
              {parsedPostId && <p className="modal-url-success">✓ Recognized post ID: {parsedPostId}</p>}
            </div>
          )}
        </div>

        <div className="modal-form-group">
          <label className="modal-label">4. Costs & Attribution (Optional)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Content Cost ($)</label>
              <input 
                type="number" 
                value={contentCost} 
                onChange={(e) => setContentCost(e.target.value)} 
                className="modal-text-input" 
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ad Spend ($)</label>
              <input 
                type="number" 
                value={adSpend} 
                onChange={(e) => setAdSpend(e.target.value)} 
                className="modal-text-input" 
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Attribution (Days)</label>
              <input 
                type="number" 
                value={attributionWindow} 
                onChange={(e) => setAttributionWindow(e.target.value)} 
                className="modal-text-input"
                min="1"
                max="90"
              />
            </div>
          </div>
        </div>

        {submitError && (
          <div className="modal-error-banner">
            <AlertCircle size={15} />
            <span>{submitError}</span>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={resetAndClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleMark} 
            disabled={!canSubmit}
          >
            {submitting ? 'Marking...' : 'Start Tracking Post'}
          </button>
        </div>
      </div>
    </div>
  );
};