import React, { useState, useEffect, useRef } from 'react';
import * as api from '../api/postTrackerApi';
import * as productService from '../../product/services/productService';
import { ProductPicker } from '../../product/component/ProductPicker';
import { BrandPicker } from '../../product/component/BrandPicker';
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
  Edit2,
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
  Image as ImageIcon,
  X,
  Package,
  Award,
  Radio,
  Copy,
  Check,
  Play,
  Video
} from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { MetaEmojiPicker } from '../components/MetaEmojiPicker';
import { MetaSchedulePicker } from '../components/MetaSchedulePicker';
import { ContactFooterModal } from '../components/ContactFooterModal';
import { AddHashtagsModal } from '../components/AddHashtagsModal';
import { useWheelIsolation } from '../hooks/useWheelIsolation';
import '../postTracker.css';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { resolveMediaUrl, compressImageFile, isVideoMedia, getMediaMetadata } from '../../../shared/utils/mediaUrl';

export const EditPostPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updatePost } = usePostTracker();

  // Layout states
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const textCardRef = useWheelIsolation();

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

  // Attribution Target: 'product' | 'brand'
  const [trackingTarget, setTrackingTarget] = useState('product');
  const [brandId, setBrandId] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);

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
  const [customThumb, setCustomThumb] = useState('');
  const [isCustomVideo, setIsCustomVideo] = useState(false);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // FB Post ID
  const [fbPostId, setFbPostId] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Store Contact Footer
  const [contactFooter, setContactFooter] = useState('');
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyText = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }
    }
  };

  useEffect(() => {
    loadPages();
    loadProducts();
    loadContactFooter();
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
      const isBrandPost = post.tracking_type === 'brand' || (!post.product_id && post.brand_id);
      setTrackingTarget(isBrandPost ? 'brand' : 'product');
      if (post.brand_id) setBrandId(String(post.brand_id));
      if (post.product_id) setProductId(String(post.product_id));

      setMessage(post.message || '');
      setContentCost(post.content_cost !== undefined && post.content_cost !== null ? parseFloat(post.content_cost) : '');
      setAdSpend(post.ad_spend !== undefined && post.ad_spend !== null ? parseFloat(post.ad_spend) : '');
      setAttributionWindow(post.attribution_window_days || 7);
      setFbPostId(post.fb_post_id || '');

      if (post.media_url) {
        const resolved = resolveMediaUrl(post.media_url);
        const isVid = post.media_type === 'video' || isVideoMedia(post.media_url) || isVideoMedia(resolved);
        setIsCustomVideo(isVid);
        if (post.media_url.includes('/uploads/') || post.media_url.includes('http') || post.media_url.startsWith('[')) {
          setMediaSource('upload');
          setUploadedMediaUrl(post.media_url);
          setCustomPreview(resolved);
        } else {
          setMediaSource('product');
        }
      } else if (post.media_type === 'video') {
        setMediaSource('upload');
        setIsCustomVideo(true);
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
    const previewUrl = URL.createObjectURL(file);
    setCustomPreview(previewUrl);
    setMediaSource('upload');
    const meta = await getMediaMetadata(file);
    setIsCustomVideo(meta.isVideo);
    setCustomThumb(meta.thumbUrl || previewUrl);
    try {
      setUploadingImage(true);
      const compressedFile = await compressImageFile(file, 1200, 0.85);
      const res = await api.uploadPostImage(compressedFile);
      setUploadedMediaUrl(res.url);
    } catch (err) {
      console.error('Failed to upload media:', err);
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInsertProductName = () => {
    if (!selectedProduct) return;
    setMessage((prev) => (prev ? `${prev} ${selectedProduct.product_name}` : selectedProduct.product_name));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 20);
  };

  const handleSubmit = async () => {
    const isTargetValid = trackingTarget === 'brand' ? Boolean(brandId) : Boolean(productId);
    if (!isTargetValid || !pageId) {
      setSubmitError(`Please select ${trackingTarget === 'brand' ? 'a Brand' : 'a Product'} and a Facebook Page.`);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      let finalMediaUrl = null;
      if (mediaSource === 'product') {
        finalMediaUrl = trackingTarget === 'brand'
          ? (selectedBrand?.image_url || originalPost?.media_url || null)
          : (selectedProduct?.image_url || originalPost?.media_url || null);
      } else if (mediaSource === 'upload') {
        finalMediaUrl = uploadedMediaUrl || null;
        if (!finalMediaUrl && customFile) {
          setSubmitError('Please wait for image upload to complete.');
          setSubmitting(false);
          return;
        }
      }

      const targetBrandId = trackingTarget === 'brand' && brandId
        ? parseInt(brandId, 10)
        : (selectedProduct?.brand_id ? parseInt(selectedProduct.brand_id, 10) : null);
      const targetProductId = trackingTarget === 'product' && productId
        ? parseInt(productId, 10)
        : null;

      const isVideo = isCustomVideo || (finalMediaUrl ? isVideoMedia(finalMediaUrl) : false);
      const updateData = {
        tracking_type: trackingTarget,
        product_id: targetProductId,
        brand_id: targetBrandId,
        message: message.trim(),
        media_url: finalMediaUrl,
        media_type: isVideo ? 'video' : (finalMediaUrl ? 'photo' : 'status'),
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

  const loadContactFooter = async () => {
    try {
      const res = await api.fetchContactFooter();
      if (res?.value) {
        setContactFooter(res.value);
      }
    } catch (err) {
      console.error('Failed to load contact footer:', err);
    }
  };

  const handleInsertContactFooter = (customText) => {
    const textToInsert = typeof customText === 'string' ? customText : contactFooter;
    if (!textToInsert) return;
    setMessage((prev) => {
      const trimmed = (prev || '').trim();
      if (trimmed.includes('070 65 49 59') || trimmed.includes('Cholykkmart')) {
        return trimmed;
      }
      return trimmed ? `${trimmed}\n\n${textToInsert}` : textToInsert;
    });

    // Auto-focus textarea and scroll smoothly to the newly inserted footer
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 20);
  };

  const handleSaveContactFooter = async (newText) => {
    const res = await api.updateContactFooter(newText);
    if (res?.value) {
      setContactFooter(res.value);
    }
  };

  const handleAddHashtagsFromModal = (tags) => {
    if (!tags || tags.length === 0) return;
    const tagStr = tags.join(' ');
    setMessage((prev) => {
      const trimmed = (prev || '').trim();
      if (!trimmed) return tagStr;

      const lines = trimmed.split('\n');
      const lastLine = lines[lines.length - 1].trim();
      const isLastLineHashtags = lastLine.startsWith('#');

      if (isLastLineHashtags) {
        return `${trimmed} ${tagStr}`;
      } else {
        return `${trimmed}\n${tagStr}`;
      }
    });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 20);
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
    previewMediaUrl = resolveMediaUrl(selectedProduct.image_url);
  } else if (mediaSource === 'upload' && (customPreview || uploadedMediaUrl)) {
    previewMediaUrl = resolveMediaUrl(customPreview || uploadedMediaUrl);
  } else if (originalPost?.media_url) {
    previewMediaUrl = resolveMediaUrl(originalPost.media_url);
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
          {/* 2. Card: Attribution Target (Moon IMS) */}
          <div className="meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Attribution Target (Moon IMS)</h3>
              <p className="meta-card-desc">Choose whether this post promotes a single product or an entire brand live session</p>
            </div>

            <div className="meta-target-switcher">
              <button
                type="button"
                className={`meta-target-btn ${trackingTarget === 'product' ? 'active' : ''}`}
                onClick={() => setTrackingTarget('product')}
              >
                <Package size={15} /> Single Product
              </button>
              <button
                type="button"
                className={`meta-target-btn ${trackingTarget === 'brand' ? 'active' : ''}`}
                onClick={() => setTrackingTarget('brand')}
              >
                <Award size={15} /> Entire Brand / Live Stream
              </button>
            </div>

            {trackingTarget === 'product' ? (
              <ProductPicker
                value={productId}
                onChange={(val) => setProductId(val)}
                placeholder="Search product..."
              />
            ) : (
              <div>
                <BrandPicker
                  value={brandId}
                  onChange={(val, brandObj) => {
                    setBrandId(val);
                    setSelectedBrand(brandObj);
                  }}
                  placeholder="Search brand..."
                />
              </div>
            )}
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

                {mediaSource === 'upload' && (
                  customPreview ? (
                    <div className="meta-media-preview-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isCustomVideo || isVideoMedia(customPreview) ? (
                          <div style={{ position: 'relative', width: '44px', height: '44px', borderRadius: '6px', overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
                            {customThumb ? (
                              <img src={customThumb} alt="Video thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <video src={customPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                            )}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                              <Play size={14} fill="#ffffff" color="#ffffff" />
                            </div>
                          </div>
                        ) : (
                          <img src={customPreview} alt="Upload preview" className="meta-media-thumb" />
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#050505' }}>{customFile?.name || (isCustomVideo ? 'Video file' : 'Custom upload')}</div>
                          <div style={{ fontSize: '11px', color: uploadingImage ? '#1877f2' : '#16a34a' }}>
                            {uploadingImage ? 'Uploading...' : '✓ Ready'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: 'none',
                          border: '1px solid #ced0d4',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#050505'
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        marginTop: '12px',
                        padding: '16px',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        background: '#f8fafc'
                      }}
                    >
                      <Upload size={20} color="#64748b" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1877f2' }}>
                        Click to choose video or photo to upload
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Supports MP4, MOV, WEBM, JPG, PNG up to 200MB
                      </span>
                    </div>
                  )
                )}
              </>
            ) : (
              originalPost?.media_url && (
                <div className="meta-media-preview-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SafeImage
                      src={originalPost.media_url}
                      alt="Published media"
                      fallbackText="Attached media"
                      className="meta-media-thumb"
                      style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px' }}
                    />
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
          <div className="meta-card" ref={textCardRef}>
            <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Text</span>
                {isPublished && (
                  <span style={{ fontWeight: 400, color: '#65676b', fontSize: '12px' }}>
                    (Read-only for published post)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyText}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  border: '1px solid #ced0d4',
                  background: copiedText ? '#ecfdf5' : '#f0f2f5',
                  color: copiedText ? '#059669' : '#050505',
                  transition: 'all 0.15s ease'
                }}
                title="Copy post text to clipboard"
              >
                {copiedText ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="meta-textarea-box">
              <textarea
                ref={textareaRef}
                className="meta-textarea"
                value={message}
                onChange={isPublished ? undefined : (e) => setMessage(e.target.value)}
                placeholder="Write something..."
                readOnly={isPublished}
                style={isPublished ? { cursor: 'text', backgroundColor: '#fafbfc' } : undefined}
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
                    <button
                      type="button"
                      onClick={() => handleInsertContactFooter()}
                      className="meta-tag-insert-btn"
                      style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
                      title="Insert Chhorlyka Mart contact & branch footer"
                    >
                      <Phone size={11} /> + Contact Footer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFooterModal(true)}
                      className="meta-toolbar-btn"
                      style={{ padding: '3px 6px', height: '26px' }}
                      title="View & Edit store contact footer"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setShowHashtagModal(true)}
                      className="meta-toolbar-btn"
                      title="Add hashtags"
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
              <div className="meta-input-group meta-input-with-icon">
                <span className="meta-input-lead-icon">
                  <Link2 size={16} />
                </span>
                <input
                  type="text"
                  className="meta-text-input"
                  value={fbPostId}
                  onChange={(e) => setFbPostId(e.target.value)}
                  placeholder="{pageId}_{postId}"
                />
                {fbPostId && (
                  <button
                    type="button"
                    className="meta-input-clear-btn"
                    onClick={() => setFbPostId('')}
                    title="Clear input"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
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
                  placeholder="0"
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
                  placeholder="0"
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
                disabled={submitting || !(trackingTarget === 'brand' ? Boolean(brandId) : Boolean(productId)) || !pageId}
                className="meta-btn-primary"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

        </div>
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
                <SafeImage
                  src={previewMediaUrl}
                  poster={customThumb || undefined}
                  controls={true}
                  alt="Post preview"
                  className="meta-feed-image"
                  fallbackText="Attached media preview"
                  style={{ width: '100%', maxHeight: '460px', objectFit: 'cover' }}
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

      {/* Store Contact & Branch Footer Modal */}
      <ContactFooterModal
        isOpen={showFooterModal}
        onClose={() => setShowFooterModal(false)}
        footerText={contactFooter}
        onSave={handleSaveContactFooter}
        onInsert={(txt) => handleInsertContactFooter(txt)}
      />

      {/* Add Hashtags Modal */}
      {showHashtagModal && (
        <AddHashtagsModal
          isOpen={showHashtagModal}
          onClose={() => setShowHashtagModal(false)}
          onAddHashtags={handleAddHashtagsFromModal}
          selectedProduct={selectedProduct}
          selectedBrand={selectedBrand}
        />
      )}
    </div>
  );
};
