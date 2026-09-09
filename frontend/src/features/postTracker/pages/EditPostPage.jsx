import React, { useState, useEffect, useRef } from 'react';
import * as api from '../api/postTrackerApi';
import * as productService from '../../product/services/productService';
import { ProductPicker } from '../../product/component/ProductPicker';
import { usePostTracker } from '../hooks/usePostTracker';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Upload,
  Globe,
  Link2,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Layers,
  Tag,
  ArrowLeft,
  Edit3,
  Monitor,
  Smartphone,
  ChevronDown,
  Smile,
  Hash,
  MapPin,
  MessageCircle,
  Phone,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { MetaEmojiPicker } from '../components/MetaEmojiPicker';
import { MetaSchedulePicker } from '../components/MetaSchedulePicker';
import '../postTracker.css';

export const EditPostPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updatePost } = usePostTracker();

  // Layout states
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Loading state
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [originalPost, setOriginalPost] = useState(null);

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

  // Post content
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaSource, setMediaSource] = useState('product');
  const [customFile, setCustomFile] = useState(null);
  const [customPreview, setCustomPreview] = useState('');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const fileInputRef = useRef(null);

  // FB Post ID
  const [fbPostId, setFbPostId] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    loadPages();
    loadProducts();
  }, []);

  useEffect(() => {
    if (id) loadPost();
  }, [id]);

  useEffect(() => {
    if (productId && productsList.length > 0) {
      const match = productsList.find((p) => String(p.product_id) === String(productId));
      setSelectedProduct(match || null);
    } else {
      setSelectedProduct(null);
    }
  }, [productId, productsList]);

  const loadPost = async () => {
    try {
      setLoadingPost(true);
      setLoadError('');
      const post = await api.fetchPostById(id);
      setOriginalPost(post);

      setPageId(String(post.page_id));
      setProductId(String(post.product_id));
      setMessage(post.message || '');
      setContentCost(post.content_cost || 0);
      setAdSpend(post.ad_spend || 0);
      setAttributionWindow(post.attribution_window_days || 7);
      setFbPostId(post.fb_post_id || '');

      if (post.media_url) {
        if (post.media_url.includes('/uploads/')) {
          setMediaSource('upload');
          setUploadedMediaUrl(post.media_url);
          setCustomPreview(post.media_url);
        } else {
          setMediaSource('product');
        }
      } else {
        setMediaSource('none');
      }

      if (post.scheduled_time) {
        const d = new Date(post.scheduled_time);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setScheduledDateTime(localIso);
      }
    } catch (err) {
      console.error('Failed to load post:', err);
      setLoadError(err?.response?.data?.error || err.message || 'Failed to load post');
    } finally {
      setLoadingPost(false);
    }
  };

  const loadPages = async () => {
    try {
      const data = await api.fetchPages();
      setPages(data || []);
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

  const handleCustomFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));
    setMediaSource('upload');
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

  const handleSubmit = async () => {
    if (!productId || !pageId) {
      setSubmitError('Please select both a Product and a Facebook Page.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      let finalMediaUrl = null;
      if (mediaSource === 'product') {
        finalMediaUrl = selectedProduct?.image_url || originalPost?.media_url || null;
      } else if (mediaSource === 'upload') {
        finalMediaUrl = uploadedMediaUrl || null;
        if (!finalMediaUrl && customFile) {
          setSubmitError('Please wait for image upload to complete.');
          setSubmitting(false);
          return;
        }
      }

      const updateData = {
        product_id: parseInt(productId, 10),
        message: message.trim(),
        media_url: finalMediaUrl,
        content_cost: parseFloat(contentCost) || 0,
        ad_spend: parseFloat(adSpend) || 0,
        attribution_window_days: parseInt(attributionWindow, 10) || 7,
        fb_post_id: fbPostId || originalPost?.fb_post_id || undefined,
        scheduled_time: scheduledDateTime ? new Date(scheduledDateTime).toISOString() : originalPost?.scheduled_time,
      };

      await updatePost(parseInt(id, 10), updateData);
      navigate('/tasks');
    } catch (err) {
      console.error('Update error:', err);
      setSubmitError(err?.response?.data?.error || err.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate('/tasks');

  // Loading Skeleton
  if (loadingPost) {
    return (
      <div className="meta-post-page">
        <div className="meta-top-nav">
          <Skeleton width={200} height={32} />
        </div>
        <div className="meta-layout-row">
          <div className="meta-editor-col">
            <Skeleton width="100%" height={120} style={{ borderRadius: '8px' }} />
            <Skeleton width="100%" height={150} style={{ borderRadius: '8px' }} />
            <Skeleton width="100%" height={220} style={{ borderRadius: '8px' }} />
          </div>
          <div className="meta-preview-col">
            <Skeleton width={520} height={420} style={{ borderRadius: '8px' }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="meta-post-page">
        <div className="meta-top-nav">
          <button type="button" onClick={handleCancel} className="meta-back-btn">
            <ArrowLeft size={18} />
          </button>
          <h1 className="meta-page-title">Edit Post</h1>
        </div>
        <div style={{ background: '#fde8e8', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '16px', borderRadius: '8px' }}>
          <AlertCircle size={20} />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  const isScheduled = originalPost?.status === 'scheduled';
  const isPublished = originalPost?.status === 'published';

  // Active page
  const currentPage = pages.find((p) => String(p.id) === String(pageId)) || null;
  const pageDisplayName = currentPage ? currentPage.page_name : originalPost?.page_name || 'Facebook Page';

  // Preview Media URL
  let previewMediaUrl = null;
  if (mediaSource === 'product' && selectedProduct?.image_url) {
    previewMediaUrl = selectedProduct.image_url;
  } else if (mediaSource === 'upload' && (customPreview || uploadedMediaUrl)) {
    previewMediaUrl = customPreview || uploadedMediaUrl;
  } else if (originalPost?.media_url) {
    previewMediaUrl = originalPost.media_url;
  }

  return (
    <div className="meta-post-page">
      {/* ── Top Navigation Bar ── */}
      <div className="meta-top-nav">
        <div className="meta-top-nav-left">
          <button type="button" onClick={handleCancel} className="meta-back-btn" title="Back to tasks">
            <ArrowLeft size={18} />
          </button>
          <h1 className="meta-page-title">Edit post #{id}</h1>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              background: isPublished ? '#ecfdf5' : isScheduled ? '#eff6ff' : '#fef2f2',
              color: isPublished ? '#047857' : isScheduled ? '#1d4ed8' : '#b91c1c',
              border: '1px solid',
              borderColor: isPublished ? '#a7f3d0' : isScheduled ? '#bfdbfe' : '#fecaca'
            }}
          >
            ● {originalPost?.status ? originalPost.status.charAt(0).toUpperCase() + originalPost.status.slice(1) : 'Unknown'}
          </span>
        </div>
        <div className="meta-top-nav-right">
          <span className="meta-preview-title">Facebook Feed preview</span>
          <div className="meta-device-toggles">
            <button
              type="button"
              className={`meta-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
              onClick={() => setPreviewDevice('desktop')}
              title="Desktop preview"
            >
              <Monitor size={16} />
            </button>
            <button
              type="button"
              className={`meta-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
              onClick={() => setPreviewDevice('mobile')}
              title="Mobile preview"
            >
              <Smartphone size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-Column Main Layout ── */}
      <div className="meta-layout-row">

        {/* ══════════════════════════════════════════════════
            LEFT COLUMN: Meta Editor Panel
            ══════════════════════════════════════════════════ */}
        <div className="meta-editor-col">

          {/* 1. Card: Post to */}
          <div className="meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Post to</h3>
            </div>
            <div className="meta-page-select-wrap">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '10px', zIndex: 1, pointerEvents: 'none' }}>
                  {currentPage?.picture_url ? (
                    <img
                      src={currentPage.picture_url}
                      alt={pageDisplayName}
                      style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1px solid rgba(0,0,0,0.08)' }}
                    />
                  ) : (
                    <div className="meta-page-avatar">
                      {pageDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <select
                  value={pageId}
                  disabled
                  className="meta-page-select-input"
                  style={{ opacity: 0.8, cursor: 'not-allowed' }}
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.page_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#65676b" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }} />
              </div>
              <div style={{ fontSize: '11px', color: '#65676b', marginTop: '6px' }}>
                Page cannot be changed after post creation
              </div>
            </div>
          </div>

          {/* 2. Card: Linked Product (Moon IMS) */}
          <div className="meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Linked Product (Moon IMS)</h3>
              <p className="meta-card-desc">Connect inventory for sales and ROI attribution</p>
            </div>
            <ProductPicker
              value={productId}
              onChange={(val) => setProductId(val)}
              placeholder="Search product..."
            />
          </div>

          {/* 3. Card: Media */}
          <div className="meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Media</h3>
              <p className="meta-card-desc">
                {isPublished ? 'Media locked for published Facebook post' : 'Share photos and videos.'}
              </p>
            </div>

            {!isPublished ? (
              <>
                <div className="meta-media-chips">
                  <button
                    type="button"
                    onClick={() => setMediaSource('product')}
                    className={`meta-chip-btn ${mediaSource === 'product' ? 'active' : ''}`}
                  >
                    <Layers size={14} /> Product Image
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMediaSource('upload'); fileInputRef.current?.click(); }}
                    className={`meta-chip-btn ${mediaSource === 'upload' ? 'active' : ''}`}
                  >
                    <ImageIcon size={14} /> Custom Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaSource('none')}
                    className={`meta-chip-btn ${mediaSource === 'none' ? 'active' : ''}`}
                  >
                    <FileText size={14} /> Text Only
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCustomFileChange}
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                />

                {mediaSource === 'product' && (
                  <div className="meta-media-preview-box">
                    {selectedProduct?.image_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={selectedProduct.image_url} alt="Product preview" className="meta-media-thumb" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#050505' }}>{selectedProduct.product_name}</div>
                          <div style={{ fontSize: '11px', color: '#65676b' }}>From Moon IMS Catalog</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#65676b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={14} /> Select a product above to attach its image.
                      </div>
                    )}
                  </div>
                )}

                {mediaSource === 'upload' && customPreview && (
                  <div className="meta-media-preview-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={customPreview} alt="Upload preview" className="meta-media-thumb" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#050505' }}>{customFile?.name || 'Custom upload'}</div>
                        <div style={{ fontSize: '11px', color: uploadingImage ? '#1877f2' : '#16a34a' }}>
                          {uploadingImage ? 'Uploading...' : '✓ Ready'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              originalPost?.media_url && (
                <div className="meta-media-preview-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={originalPost.media_url} alt="Current media" className="meta-media-thumb" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#050505' }}>Published Media</div>
                      <div style={{ fontSize: '11px', color: '#65676b' }}>Cannot be modified after publish</div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* 4. Card: Post details (Textarea + Action Toolbar) */}
          <div className="meta-card">
            <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#050505' }}>
              Text {isPublished && <span style={{ fontWeight: 400, color: '#65676b' }}>(Locked for published post)</span>}
            </div>

            <div className="meta-textarea-box">
              <textarea
                className="meta-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write something..."
                disabled={isPublished}
                style={isPublished ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
              />
              {!isPublished && (
                <div className="meta-textarea-toolbar">
                  <div className="meta-toolbar-left">
                    {selectedProduct && (
                      <button
                        type="button"
                        onClick={handleInsertProductName}
                        className="meta-tag-insert-btn"
                        title="Insert linked product name"
                      >
                        <Tag size={11} /> + Insert Product
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setMessage((p) => p + ' #deal')}
                      className="meta-toolbar-btn"
                      title="Add hashtag"
                    >
                      <Hash size={16} />
                    </button>
                    <div className="meta-emoji-picker-container">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className={`meta-toolbar-btn ${showEmojiPicker ? 'active' : ''}`}
                        title="Add emoji"
                      >
                        <Smile size={16} />
                      </button>

                      {showEmojiPicker && (
                        <MetaEmojiPicker
                          onSelectEmoji={(emoji) => setMessage((p) => (p ? `${p} ${emoji}` : emoji))}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="meta-quick-actions-row">
              <button type="button" className="meta-quick-icon-btn" title="Add location"><MapPin size={16} /></button>
              <button type="button" className="meta-quick-icon-btn" title="Get messages"><MessageCircle size={16} /></button>
              <button type="button" className="meta-quick-icon-btn" title="Call now button"><Phone size={16} /></button>
              <button type="button" className="meta-quick-icon-btn" title="More options"><MoreHorizontal size={16} /></button>
            </div>
          </div>

          {/* 5. Card: Scheduled Time (if scheduled) */}
          {isScheduled && (
            <div className="meta-card">
              <div className="meta-schedule-row">
                <span className="meta-schedule-label">Scheduled Publish Time</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <MetaSchedulePicker
                  value={scheduledDateTime}
                  onChange={(newIso) => setScheduledDateTime(newIso)}
                />
              </div>
            </div>
          )}

          {/* FB Post ID (for legacy tracked posts) */}
          {originalPost?.fb_post_id && (
            <div className="meta-card">
              <div className="meta-card-header">
                <h3 className="meta-card-title">Facebook Post ID</h3>
                <p className="meta-card-desc">Linked Facebook Post ID for analytics and metrics</p>
              </div>
              <input
                type="text"
                className="meta-datetime-input"
                value={fbPostId}
                onChange={(e) => setFbPostId(e.target.value)}
                placeholder="{pageId}_{postId}"
              />
            </div>
          )}

          {/* 6. Card: Costs & Attribution */}
          <div className="meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Costs & Attribution</h3>
              <p className="meta-card-desc">MoonPulse tracking metrics for profit and ROI</p>
            </div>
            <div className="meta-costs-grid">
              <div className="meta-cost-field">
                <label>Content Cost ($)</label>
                <input
                  type="number"
                  value={contentCost}
                  onChange={(e) => setContentCost(e.target.value)}
                  className="meta-cost-input"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="meta-cost-field">
                <label>Ad Spend ($)</label>
                <input
                  type="number"
                  value={adSpend}
                  onChange={(e) => setAdSpend(e.target.value)}
                  className="meta-cost-input"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="meta-cost-field">
                <label>Attribution (Days)</label>
                <input
                  type="number"
                  value={attributionWindow}
                  onChange={(e) => setAttributionWindow(e.target.value)}
                  className="meta-cost-input"
                  min="1"
                  max="90"
                />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {submitError && (
            <div style={{ background: '#fde8e8', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{submitError}</span>
            </div>
          )}

          {/* 7. Sticky Action Bar */}
          <div className="meta-sticky-bar">
            <div style={{ fontSize: '13px', color: '#65676b' }}>
              Post ID: <strong style={{ color: '#050505' }}>#{id}</strong>
            </div>

            <div className="meta-actions-right">
              <button
                type="button"
                onClick={handleCancel}
                className="meta-btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !productId || !pageId}
                className="meta-btn-primary"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT COLUMN: Live Facebook Feed Preview Area
            ══════════════════════════════════════════════════ */}
        <div className="meta-preview-col">

          <div className={`meta-feed-card ${previewDevice === 'desktop' ? 'desktop-view' : 'mobile-view'}`}>

            {/* Post Header */}
            <div className="meta-feed-header">
              <div className="meta-feed-author-wrap">
                {currentPage?.picture_url ? (
                  <img
                    src={currentPage.picture_url}
                    alt={pageDisplayName}
                    className="meta-feed-avatar"
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="meta-feed-avatar">
                    {pageDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="meta-feed-name">{pageDisplayName}</div>
                  <div className="meta-feed-time">
                    {isScheduled && scheduledDateTime ? (
                      <>{new Date(scheduledDateTime).toLocaleString()} · <Globe size={12} /></>
                    ) : (
                      <>Just now · <Globe size={12} /></>
                    )}
                  </div>
                </div>
              </div>
              <div className="meta-feed-header-actions">
                <MoreHorizontal size={18} />
              </div>
            </div>

            {/* Post Caption Body */}
            {message.trim() ? (
              <div className="meta-feed-body">
                {message}
              </div>
            ) : (
              <div className="meta-feed-body">
                <div className="meta-feed-skeleton-lines">
                  <div className="meta-feed-skeleton-bar" style={{ width: '85%' }} />
                  <div className="meta-feed-skeleton-bar" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {/* Post Media Preview / Empty Meta Dashed Frame */}
            {previewMediaUrl ? (
              <div className="meta-feed-media">
                <img
                  src={previewMediaUrl}
                  alt="Post preview"
                  className="meta-feed-image"
                />
              </div>
            ) : (
              <div className="meta-feed-empty-placeholder">
                <svg className="meta-placeholder-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <rect x="10" y="10" width="80" height="80" rx="8" strokeWidth="3" strokeDasharray="6 6" />
                  <circle cx="35" cy="35" r="8" fill="currentColor" fillOpacity="0.4" stroke="none" />
                  <path d="M20 75 L45 45 L65 65 L80 50 L85 75 Z" fill="currentColor" fillOpacity="0.4" stroke="none" />
                </svg>
              </div>
            )}

            {/* Post Engagement Actions Footer */}
            <div className="meta-feed-footer">
              <div className="meta-feed-action-bar">
                <button type="button" className="meta-feed-action-btn">
                  <ThumbsUp size={16} /> Like
                </button>
                <button type="button" className="meta-feed-action-btn">
                  <MessageSquare size={16} /> Comment
                </button>
                <button type="button" className="meta-feed-action-btn">
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
