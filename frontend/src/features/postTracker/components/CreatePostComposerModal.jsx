import React, { useState, useEffect, useRef } from 'react';
import * as api from '../api/postTrackerApi';
import * as productService from '../../product/services/productService';
import { parseFbPostUrl } from '../utils/parseFbPostUrl';
import { ProductPicker } from '../../product/component/ProductPicker';
import {
  X,
  Send,
  Calendar,
  Image as ImageIcon,
  Upload,
  Globe,
  Link2,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Layers,
  Tag
} from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const CreatePostComposerModal = ({ isOpen, onClose, onPostCreated }) => {
  // Main tab mode: 'direct' (Create & Schedule) vs 'legacy' (Track existing post)
  const [tabMode, setTabMode] = useState('direct');

  // Shared state
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState('');
  const [productId, setProductId] = useState('');
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Costs
  const [contentCost, setContentCost] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [attributionWindow, setAttributionWindow] = useState(7);

  // 'direct' mode state
  const [message, setMessage] = useState('');
  const [mediaSource, setMediaSource] = useState('product'); // 'product' | 'upload' | 'none'
  const [customFile, setCustomFile] = useState(null);
  const [customPreview, setCustomPreview] = useState('');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publishMode, setPublishMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const fileInputRef = useRef(null);

  // 'legacy' mode state
  const [legacyMode, setLegacyMode] = useState('paste'); // 'paste' | 'pick'
  const [postUrl, setPostUrl] = useState('');
  const [parsedPostId, setParsedPostId] = useState(null);
  const [urlError, setUrlError] = useState('');
  const [recentPosts, setRecentPosts] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedRecentPostId, setSelectedRecentPostId] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load pages and products
  useEffect(() => {
    if (isOpen) {
      loadPages();
      loadProducts();
      // Set default scheduled time to 1 hour ahead in local time
      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
      const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledDateTime(localIso);
    }
  }, [isOpen]);

  useEffect(() => {
    if (productId && productsList.length > 0) {
      const match = productsList.find((p) => String(p.product_id) === String(productId));
      setSelectedProduct(match || null);
    } else {
      setSelectedProduct(null);
    }
  }, [productId, productsList]);

  // Load recent posts if in legacy pick mode
  useEffect(() => {
    if (isOpen && tabMode === 'legacy' && legacyMode === 'pick' && pageId) {
      loadRecentPosts();
    }
  }, [isOpen, tabMode, legacyMode, pageId]);

  const loadPages = async () => {
    try {
      const data = await api.fetchPages();
      setPages(data || []);
      if (data && data.length > 0 && !pageId) setPageId(String(data[0].id));
    } catch (err) {
      console.error('Failed to load pages', err);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productService.fetchProducts();
      setProductsList(data || []);
    } catch (err) {
      console.error('Failed to load products list', err);
    }
  };

  const loadRecentPosts = async () => {
    try {
      setLoadingRecent(true);
      setSelectedRecentPostId('');
      const data = await api.fetchRecentPosts(pageId);
      setRecentPosts(data?.data || []);
    } catch (err) {
      console.error('Failed to load recent posts', err);
      setRecentPosts([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleCustomFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));

    // Upload to server immediately
    try {
      setUploadingImage(true);
      const res = await api.uploadPostImage(file);
      setUploadedMediaUrl(res.url);
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInsertProductName = () => {
    if (!selectedProduct) return;
    setMessage((prev) => (prev ? `${prev} ${selectedProduct.product_name}` : selectedProduct.product_name));
  };

  const handleUrlChange = (value) => {
    setPostUrl(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setParsedPostId(null);
      setUrlError('');
      return;
    }

    if (/^\d+_\d+$/.test(trimmed)) {
      setParsedPostId(trimmed);
      setUrlError('');
      return;
    }

    if (/^\d+$/.test(trimmed)) {
      const page = pages.find((p) => String(p.id) === String(pageId));
      if (page?.fb_page_id) {
        setParsedPostId(`${page.fb_page_id}_${trimmed}`);
        setUrlError('');
      } else {
        setParsedPostId(null);
        setUrlError('Select a page first.');
      }
      return;
    }

    const parsed = parseFbPostUrl(trimmed);
    if (parsed) {
      setParsedPostId(parsed);
      setUrlError('');
    } else {
      setParsedPostId(null);
      setUrlError("Couldn't recognize link. Paste standard Facebook URL or {pageId}_{postId}.");
    }
  };

  const handleSubmit = async () => {
    if (!productId || !pageId) {
      setSubmitError('Please select both a Product and a Facebook Page.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      if (tabMode === 'direct') {
        let finalMediaUrl = null;
        if (mediaSource === 'product') {
          finalMediaUrl = selectedProduct?.image_url || null;
        } else if (mediaSource === 'upload') {
          finalMediaUrl = uploadedMediaUrl || null;
          if (!finalMediaUrl && customFile) {
            setSubmitError('Please wait for image upload to complete.');
            setSubmitting(false);
            return;
          }
        }

        await onPostCreated({
          mode: 'schedule',
          product_id: parseInt(productId, 10),
          page_id: parseInt(pageId, 10),
          message: message.trim(),
          media_url: finalMediaUrl,
          publish_now: publishMode === 'now',
          scheduled_time: publishMode === 'schedule' ? new Date(scheduledDateTime).toISOString() : null,
          content_cost: parseFloat(contentCost) || 0,
          ad_spend: parseFloat(adSpend) || 0,
          attribution_window_days: parseInt(attributionWindow, 10) || 7,
        });
      } else {
        // Legacy Mode
        const fbPostId = legacyMode === 'pick' ? selectedRecentPostId : parsedPostId;
        if (!fbPostId) {
          setSubmitError('Please select or paste a valid Facebook Post ID.');
          setSubmitting(false);
          return;
        }

        await onPostCreated({
          mode: 'legacy',
          product_id: parseInt(productId, 10),
          page_id: parseInt(pageId, 10),
          fb_post_id: fbPostId,
          content_cost: parseFloat(contentCost) || 0,
          ad_spend: parseFloat(adSpend) || 0,
          attribution_window_days: parseInt(attributionWindow, 10) || 7,
        });
      }

      resetAndClose();
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitError(err?.response?.data?.error || err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setMessage('');
    setCustomFile(null);
    setCustomPreview('');
    setUploadedMediaUrl('');
    setPostUrl('');
    setParsedPostId(null);
    setUrlError('');
    setSelectedRecentPostId('');
    setSubmitError('');
    setProductId('');
    setContentCost(0);
    setAdSpend(0);
    setAttributionWindow(7);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content modal-card overflow-visible"
        style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Send size={20} className="icon-blue" />
            <h2>Create & Schedule Post</h2>
          </div>
          <button className="modal-close-btn" onClick={resetAndClose}>
            <X size={18} />
          </button>
        </div>

        {/* Primary Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => setTabMode('direct')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: tabMode === 'direct' ? '#ffffff' : 'transparent',
              color: tabMode === 'direct' ? '#2563eb' : '#64748b',
              boxShadow: tabMode === 'direct' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={15} /> Publish / Schedule Direct
          </button>
          <button
            type="button"
            onClick={() => setTabMode('legacy')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: tabMode === 'legacy' ? '#ffffff' : 'transparent',
              color: tabMode === 'legacy' ? '#2563eb' : '#64748b',
              boxShadow: tabMode === 'legacy' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Link2 size={15} /> Track Existing FB Post
          </button>
        </div>

        {/* 1. Target Page & Product (Shared) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="modal-form-group">
            <label className="modal-label">Facebook Page</label>
            <div className="custom-select-wrap">
              <Globe size={16} className="select-icon icon-blue" />
              <select
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className="custom-select modal-select"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.page_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Product (Moon IMS)</label>
            <ProductPicker
              value={productId}
              onChange={(val) => setProductId(val)}
              placeholder="Search product..."
            />
          </div>
        </div>

        {/* TAB 1: DIRECT SCHEDULING / PUBLISHING */}
        {tabMode === 'direct' && (
          <>
            {/* Caption & Message */}
            <div className="modal-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="modal-label" style={{ margin: 0 }}>Post Caption / Message</label>
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={handleInsertProductName}
                    style={{
                      border: 'none',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Tag size={11} /> + Insert Product Name
                  </button>
                )}
              </div>
              <textarea
                className="modal-text-input"
                rows="3"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your Facebook post caption here..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Media Source Selector */}
            <div className="modal-form-group">
              <label className="modal-label">Media Attachment</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMediaSource('product')}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: mediaSource === 'product' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: mediaSource === 'product' ? '#eff6ff' : '#ffffff',
                    color: mediaSource === 'product' ? '#1e40af' : '#475569',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Layers size={14} /> Product Image
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSource('upload')}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: mediaSource === 'upload' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: mediaSource === 'upload' ? '#eff6ff' : '#ffffff',
                    color: mediaSource === 'upload' ? '#1e40af' : '#475569',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Upload size={14} /> Custom Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSource('none')}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: mediaSource === 'none' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: mediaSource === 'none' ? '#eff6ff' : '#ffffff',
                    color: mediaSource === 'none' ? '#1e40af' : '#475569',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={14} /> Text Only
                </button>
              </div>

              {/* Media Preview / Upload Dropzone */}
              {mediaSource === 'product' && (
                <div
                  style={{
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#f8fafc',
                  }}
                >
                  {selectedProduct?.image_url ? (
                    <>
                      <img
                        src={selectedProduct.image_url}
                        alt="Product Preview"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <div style={{ fontSize: '12px', color: '#334155' }}>
                        <div style={{ fontWeight: 600 }}>Using Moon IMS Product Image</div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{selectedProduct.product_name}</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                      Select a product above to preview its catalog image.
                    </div>
                  )}
                </div>
              )}

              {mediaSource === 'upload' && (
                <div
                  style={{
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    background: '#f8fafc',
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCustomFileChange}
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                  />
                  {customPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <img
                        src={customPreview}
                        alt="Custom upload"
                        style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {customFile?.name}
                        </div>
                        {uploadingImage ? (
                          <span style={{ fontSize: '11px', color: '#2563eb' }}>Uploading to server...</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#16a34a' }}>✓ Uploaded ready</span>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#2563eb',
                              fontSize: '11px',
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline',
                              marginTop: '2px',
                            }}
                          >
                            Change image
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#334155',
                        }}
                      >
                        <Upload size={14} /> Select image from computer
                      </button>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        Supports JPG, PNG, WEBP up to 50MB
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timing Options: Publish Now vs Schedule */}
            <div className="modal-form-group">
              <label className="modal-label">Publish Timing</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: publishMode === 'now' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    background: publishMode === 'now' ? '#f0fdf4' : '#ffffff',
                    color: publishMode === 'now' ? '#15803d' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} /> Publish Immediately
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: publishMode === 'schedule' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: publishMode === 'schedule' ? '#eff6ff' : '#ffffff',
                    color: publishMode === 'schedule' ? '#1e40af' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock size={14} /> Schedule for Later
                </button>
              </div>

              {publishMode === 'schedule' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Select Exact Date & Time (High Precision)
                  </label>
                  <input
                    type="datetime-local"
                    className="modal-text-input"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                    Server will trigger and publish to Facebook at this exact scheduled second.
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: LEGACY TRACKING */}
        {tabMode === 'legacy' && (
          <div className="modal-form-group">
            <label className="modal-label">Choose Published Post</label>
            <div className="modal-tabs" style={{ marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setLegacyMode('paste')}
                className={`modal-tab-btn ${legacyMode === 'paste' ? 'active' : ''}`}
              >
                <Link2 size={14} /> Paste Link or Post ID
              </button>
              <button
                type="button"
                onClick={() => setLegacyMode('pick')}
                className={`modal-tab-btn ${legacyMode === 'pick' ? 'active' : ''}`}
              >
                <Globe size={14} /> Pick from Recent Posts
              </button>
            </div>

            {legacyMode === 'paste' ? (
              <div>
                <input
                  type="text"
                  className="modal-text-input"
                  placeholder="e.g. https://facebook.com/posts/12345 or {pageId}_{postId}"
                  value={postUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
                {parsedPostId && (
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Recognized Post ID: <code>{parsedPostId}</code>
                  </div>
                )}
                {urlError && (
                  <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> {urlError}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {loadingRecent ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    Loading recent Facebook posts...
                  </div>
                ) : (
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recentPosts.map((p) => {
                      const isSel = selectedRecentPostId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedRecentPostId(p.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: isSel ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            background: isSel ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {p.message ? p.message.slice(0, 60) + '...' : '(No text caption)'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(p.created_time).toLocaleString()} • ID: {p.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Costs & Attribution (Shared) */}
        <div className="modal-form-group">
          <label className="modal-label">Costs & Attribution</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Content Cost ($)
              </label>
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
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Ad Spend ($)
              </label>
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
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Attribution (Days)
              </label>
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

        {/* Error Alert */}
        {submitError && (
          <div
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#b91c1c',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '12px',
            }}
          >
            <AlertCircle size={15} />
            <span>{submitError}</span>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={resetAndClose} className="btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !productId || !pageId}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              background: tabMode === 'direct' && publishMode === 'now' ? '#16a34a' : '#2563eb',
            }}
          >
            {submitting ? (
              'Processing...'
            ) : tabMode === 'direct' ? (
              publishMode === 'now' ? (
                <>
                  <Send size={15} /> Publish to Facebook Now
                </>
              ) : (
                <>
                  <Clock size={15} /> Schedule Post
                </>
              )
            ) : (
              <>
                <CheckCircle2 size={15} /> Track Facebook Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
