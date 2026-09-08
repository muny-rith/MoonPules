import React, { useState, useEffect, useRef } from 'react';
import * as api from '../api/postTrackerApi';
import * as productService from '../../product/services/productService';
import { parseFbPostUrl } from '../utils/parseFbPostUrl';
import { ProductPicker } from '../../product/component/ProductPicker';
import { usePostTracker } from '../hooks/usePostTracker';
import { useNavigate } from 'react-router-dom';
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
  Tag,
  ArrowLeft
} from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const { addPost } = usePostTracker();
  
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
    loadPages();
    loadProducts();
    // Set default scheduled time to 1 hour ahead in local time
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledDateTime(localIso);
  }, []);

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
    if (tabMode === 'legacy' && legacyMode === 'pick' && pageId) {
      loadRecentPosts();
    }
  }, [tabMode, legacyMode, pageId]);

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

        await addPost({
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

        await addPost({
          mode: 'legacy',
          product_id: parseInt(productId, 10),
          page_id: parseInt(pageId, 10),
          fb_post_id: fbPostId,
          content_cost: parseFloat(contentCost) || 0,
          ad_spend: parseFloat(adSpend) || 0,
          attribution_window_days: parseInt(attributionWindow, 10) || 7,
        });
      }

      navigate('/tasks');
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitError(err?.response?.data?.error || err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/tasks');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={handleCancel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#64748b',
            marginRight: '16px'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={24} color="#4f46e5" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>Create & Schedule Post</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Design, preview, and manage your Facebook posts easily.</p>
          </div>
        </div>
      </div>

      <div className="table-card" style={{ padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        {/* Primary Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: '#f1f5f9',
            padding: '6px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => setTabMode('direct')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: tabMode === 'direct' ? '#ffffff' : 'transparent',
              color: tabMode === 'direct' ? '#4f46e5' : '#64748b',
              boxShadow: tabMode === 'direct' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={16} /> Publish / Schedule Direct
          </button>
          <button
            type="button"
            onClick={() => setTabMode('legacy')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: tabMode === 'legacy' ? '#ffffff' : 'transparent',
              color: tabMode === 'legacy' ? '#4f46e5' : '#64748b',
              boxShadow: tabMode === 'legacy' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Link2 size={16} /> Track Existing FB Post
          </button>
        </div>

        {/* 1. Target Page & Product (Shared) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div className="modal-form-group">
            <label className="modal-label" style={{ fontWeight: 600, color: '#334155' }}>Facebook Page</label>
            <div className="custom-select-wrap">
              <Globe size={18} className="select-icon" style={{ color: '#4f46e5' }} />
              <select
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className="custom-select modal-select"
                style={{ padding: '12px 16px 12px 40px', borderRadius: '10px', border: '1px solid #cbd5e1', width: '100%' }}
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
            <label className="modal-label" style={{ fontWeight: 600, color: '#334155' }}>Product (Moon IMS)</label>
            <ProductPicker
              value={productId}
              onChange={(val) => setProductId(val)}
              placeholder="Search product..."
            />
          </div>
        </div>

        {/* TAB 1: DIRECT SCHEDULING / PUBLISHING */}
        {tabMode === 'direct' && (
          <div style={{ background: '#fafaf9', padding: '24px', borderRadius: '12px', border: '1px solid #f3f4f6', marginBottom: '24px' }}>
            {/* Caption & Message */}
            <div className="modal-form-group" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="modal-label" style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Post Caption / Message</label>
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={handleInsertProductName}
                    style={{
                      border: 'none',
                      background: '#e0e7ff',
                      color: '#4f46e5',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Tag size={12} /> + Insert Product Name
                  </button>
                )}
              </div>
              <textarea
                className="modal-text-input"
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your Facebook post caption here..."
                style={{ resize: 'vertical', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            {/* Media Source Selector */}
            <div className="modal-form-group" style={{ marginBottom: '20px' }}>
              <label className="modal-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'block' }}>Media Attachment</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMediaSource('product')}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: mediaSource === 'product' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: mediaSource === 'product' ? '#eef2ff' : '#ffffff',
                    color: mediaSource === 'product' ? '#3730a3' : '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Layers size={16} /> Product Image
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSource('upload')}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: mediaSource === 'upload' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: mediaSource === 'upload' ? '#eef2ff' : '#ffffff',
                    color: mediaSource === 'upload' ? '#3730a3' : '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={16} /> Custom Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSource('none')}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: mediaSource === 'none' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: mediaSource === 'none' ? '#eef2ff' : '#ffffff',
                    color: mediaSource === 'none' ? '#3730a3' : '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <FileText size={16} /> Text Only
                </button>
              </div>

              {/* Media Preview / Upload Dropzone */}
              {mediaSource === 'product' && (
                <div
                  style={{
                    border: '1px dashed #94a3b8',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: '#ffffff',
                  }}
                >
                  {selectedProduct?.image_url ? (
                    <>
                      <img
                        src={selectedProduct.image_url}
                        alt="Product Preview"
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                      <div style={{ fontSize: '14px', color: '#334155' }}>
                        <div style={{ fontWeight: 700 }}>Using Moon IMS Product Image</div>
                        <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{selectedProduct.product_name}</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} /> Select a product above to preview its catalog image.
                    </div>
                  )}
                </div>
              )}

              {mediaSource === 'upload' && (
                <div
                  style={{
                    border: '1px dashed #94a3b8',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center',
                    background: '#ffffff',
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                      <img
                        src={customPreview}
                        alt="Custom upload"
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                          {customFile?.name}
                        </div>
                        {uploadingImage ? (
                          <span style={{ fontSize: '13px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div className="spin-animation"><Clock size={12} /></div> Uploading...
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Upload ready
                          </span>
                        )}
                        <div style={{ marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#f1f5f9',
                              color: '#334155',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}
                          >
                            Change image
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '50%', marginBottom: '12px' }}>
                        <Upload size={24} color="#64748b" />
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#e0e7ff',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#4f46e5',
                        }}
                      >
                         Browse Files
                      </button>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                        Supports JPG, PNG, WEBP up to 50MB
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timing Options: Publish Now vs Schedule */}
            <div className="modal-form-group">
              <label className="modal-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'block' }}>Publish Timing</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: publishMode === 'now' ? '2px solid #10b981' : '1px solid #cbd5e1',
                    background: publishMode === 'now' ? '#ecfdf5' : '#ffffff',
                    color: publishMode === 'now' ? '#047857' : '#475569',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Send size={16} /> Publish Immediately
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: publishMode === 'schedule' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: publishMode === 'schedule' ? '#eef2ff' : '#ffffff',
                    color: publishMode === 'schedule' ? '#3730a3' : '#475569',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Clock size={16} /> Schedule for Later
                </button>
              </div>

              {publishMode === 'schedule' && (
                <div style={{ marginTop: '16px', background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <label style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Select Exact Date & Time (High Precision)
                  </label>
                  <input
                    type="datetime-local"
                    className="modal-text-input"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Server will trigger and publish to Facebook at this exact scheduled second.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LEGACY TRACKING */}
        {tabMode === 'legacy' && (
          <div className="modal-form-group" style={{ background: '#fafaf9', padding: '24px', borderRadius: '12px', border: '1px solid #f3f4f6', marginBottom: '24px' }}>
            <label className="modal-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '12px', display: 'block' }}>Choose Published Post</label>
            <div className="modal-tabs" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setLegacyMode('paste')}
                className={`modal-tab-btn ${legacyMode === 'paste' ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: legacyMode === 'paste' ? '#e0e7ff' : '#ffffff', color: legacyMode === 'paste' ? '#4f46e5' : '#475569', border: legacyMode === 'paste' ? '1px solid #4f46e5' : '1px solid #cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Link2 size={16} /> Paste Link or Post ID
              </button>
              <button
                type="button"
                onClick={() => setLegacyMode('pick')}
                className={`modal-tab-btn ${legacyMode === 'pick' ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: legacyMode === 'pick' ? '#e0e7ff' : '#ffffff', color: legacyMode === 'pick' ? '#4f46e5' : '#475569', border: legacyMode === 'pick' ? '1px solid #4f46e5' : '1px solid #cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Globe size={16} /> Pick from Recent Posts
              </button>
            </div>

            {legacyMode === 'paste' ? (
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <input
                  type="text"
                  className="modal-text-input"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  placeholder="e.g. https://facebook.com/posts/12345 or {pageId}_{postId}"
                  value={postUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
                {parsedPostId && (
                  <div style={{ fontSize: '13px', color: '#16a34a', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <CheckCircle2 size={16} /> Recognized Post ID: <code>{parsedPostId}</code>
                  </div>
                )}
                {urlError && (
                  <div style={{ fontSize: '13px', color: '#ef4444', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <AlertCircle size={16} /> {urlError}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                {loadingRecent ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div className="spin-animation"><Clock size={16} /></div> Loading recent Facebook posts...
                  </div>
                ) : (
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {recentPosts.map((p) => {
                      const isSel = selectedRecentPostId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedRecentPostId(p.id)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: isSel ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            background: isSel ? '#eef2ff' : '#ffffff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', marginBottom: '4px' }}>
                            {p.message ? p.message.slice(0, 80) + '...' : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>(No text caption)</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{new Date(p.created_time).toLocaleString()}</span>
                            <span style={{ fontFamily: 'monospace' }}>ID: {p.id}</span>
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
        <div className="modal-form-group" style={{ marginBottom: '32px' }}>
          <label className="modal-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '12px', display: 'block' }}>Costs & Attribution</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Content Cost ($)
              </label>
              <input
                type="number"
                value={contentCost}
                onChange={(e) => setContentCost(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                min="0"
                step="0.01"
              />
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Ad Spend ($)
              </label>
              <input
                type="number"
                value={adSpend}
                onChange={(e) => setAdSpend(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                min="0"
                step="0.01"
              />
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Attribution (Days)
              </label>
              <input
                type="number"
                value={attributionWindow}
                onChange={(e) => setAttributionWindow(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
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
              padding: '16px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '24px',
              fontWeight: 500
            }}
          >
            <AlertCircle size={20} />
            <span>{submitError}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
          <button 
            type="button" 
            onClick={handleCancel} 
            disabled={submitting}
            style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !productId || !pageId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              cursor: submitting || !productId || !pageId ? 'not-allowed' : 'pointer',
              opacity: submitting || !productId || !pageId ? 0.7 : 1,
              background: tabMode === 'direct' && publishMode === 'now' ? '#10b981' : '#4f46e5',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'background 0.2s, transform 0.1s'
            }}
          >
            {submitting ? (
              <><div className="spin-animation"><Clock size={16} /></div> Processing...</>
            ) : tabMode === 'direct' ? (
              publishMode === 'now' ? (
                <>
                  <Send size={18} /> Publish to Facebook Now
                </>
              ) : (
                <>
                  <Clock size={18} /> Schedule Post
                </>
              )
            ) : (
              <>
                <CheckCircle2 size={18} /> Track Facebook Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
