import React, { useState, useEffect } from 'react';
import * as api from '../api/postTrackerApi';
import { parseFbPostUrl } from '../utils/parseFbPostUrl';

export const MarkPostModal = ({ isOpen, onClose, onPostMarked }) => {
  const [mode, setMode] = useState('pick'); // 'pick' | 'paste'
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState('');
  const [productId, setProductId] = useState(''); // TODO Phase 4.1: real Moon IMS product picker

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
      setPages(data);
      if (data.length > 0) setPageId(String(data[0].id));
    } catch (err) {
      console.error('Failed to load pages', err);
    }
  };

  const loadRecentPosts = async () => {
    try {
      setLoadingPosts(true);
      setSelectedPostId('');
      const data = await api.fetchRecentPosts(pageId);
      setRecentPosts(data.data || []);
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

    // Case 2: bare numeric post ID (e.g. copied from Business Suite's
    // "Post details" panel) — combine with the currently selected page's fb_page_id
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
    onClose();
  };

  if (!isOpen) return null;

  const canSubmit = getFbPostIdToSubmit() && pageId && productId && !submitting;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '440px', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2>Mark a Post</h2>
        <p style={{ fontSize: '13px', color: '#666', marginTop: '-8px' }}>
          Only already-published posts can be marked (Facebook doesn't allow reading scheduled/draft posts via API).
        </p>

        <label style={{ display: 'block', marginTop: '16px', fontSize: '13px', fontWeight: 'bold' }}>Page</label>
        <select value={pageId} onChange={(e) => setPageId(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
          {pages.map((p) => <option key={p.id} value={p.id}>{p.page_name}</option>)}
        </select>

        <label style={{ display: 'block', marginTop: '16px', fontSize: '13px', fontWeight: 'bold' }}>Product ID</label>
        <input
          type="number"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder="e.g. 12"
          style={{ width: '100%', padding: '8px', marginTop: '4px', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderBottom: '1px solid #eee' }}>
          <button
            onClick={() => setMode('pick')}
            style={{ flex: 1, padding: '8px', fontWeight: mode === 'pick' ? 'bold' : 'normal', borderBottom: mode === 'pick' ? '2px solid #333' : 'none' }}
          >
            Pick from recent posts
          </button>
          <button
            onClick={() => setMode('paste')}
            style={{ flex: 1, padding: '8px', fontWeight: mode === 'paste' ? 'bold' : 'normal', borderBottom: mode === 'paste' ? '2px solid #333' : 'none' }}
          >
            Paste a link
          </button>
        </div>

        {mode === 'pick' && (
          <div style={{ marginTop: '12px' }}>
            {loadingPosts ? (
              <p style={{ fontSize: '13px', color: '#666' }}>Loading recent posts...</p>
            ) : recentPosts.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#666' }}>No recent posts found on this page.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentPosts.map((post) => (
                  <li key={post.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="post-pick"
                        checked={selectedPostId === post.id}
                        onChange={() => setSelectedPostId(post.id)}
                      />
                      <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.message || '(no caption)'}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mode === 'paste' && (
          <div style={{ marginTop: '12px' }}>
            <input
              type="text"
              value={postUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste post ID (e.g. 2219691172162335) or a post link"
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
            {urlError && <p style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px' }}>{urlError}</p>}
            {parsedPostId && <p style={{ color: '#166534', fontSize: '12px', marginTop: '6px' }}>✓ Recognized post ID: {parsedPostId}</p>}
          </div>
        )}

        {submitError && <p style={{ color: '#b91c1c', fontSize: '12px', marginTop: '12px' }}>{submitError}</p>}

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={resetAndClose} style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleMark} disabled={!canSubmit} style={{ flex: 1 }}>
            {submitting ? 'Marking...' : 'Mark Post'}
          </button>
        </div>
      </div>
    </div>
  );
};