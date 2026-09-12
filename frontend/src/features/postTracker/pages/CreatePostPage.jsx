import React, { useState, useEffect, useRef } from 'react';
import * as api from '../api/postTrackerApi';
import * as productService from '../../product/services/productService';
import { parseFbPostUrl } from '../utils/parseFbPostUrl';
import { ProductPicker } from '../../product/component/ProductPicker';
import { BrandPicker } from '../../product/component/BrandPicker';
import { usePostTracker } from '../hooks/usePostTracker';
import { useNavigate } from 'react-router-dom';
import {
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
  ArrowLeft,
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
  Check,
  X,
  Images,
  Trash2,
  Edit2,
  Package,
  Award,
  Radio
} from 'lucide-react';
import { MetaEmojiPicker } from '../components/MetaEmojiPicker';
import { MetaSchedulePicker } from '../components/MetaSchedulePicker';
import { ContactFooterModal } from '../components/ContactFooterModal';
import { AddHashtagsModal } from '../components/AddHashtagsModal';
import { useWheelIsolation } from '../hooks/useWheelIsolation';
import '../postTracker.css';
import { compressImageFile } from '../../../shared/utils/mediaUrl';

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const { addPost } = usePostTracker();

  // Layout states
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [tabMode, setTabMode] = useState('direct'); // 'direct' | 'legacy'
  const textCardRef = useWheelIsolation();

  // Data states
  const [pages, setPages] = useState([]);
  const [selectedPageIds, setSelectedPageIds] = useState([]);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const pageDropdownRef = useRef(null);

  const [productId, setProductId] = useState('');
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Attribution Target: 'product' | 'brand'
  const [trackingTarget, setTrackingTarget] = useState('product');
  const [brandId, setBrandId] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Costs
  const [contentCost, setContentCost] = useState('');
  const [adSpend, setAdSpend] = useState('');
  const [attributionWindow, setAttributionWindow] = useState(7);

  // Content
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaSource, setMediaSource] = useState('upload'); // 'upload' | 'product' | 'none'
  const [mediaItems, setMediaItems] = useState([]); // [{ id, file, previewUrl, serverUrl, dimensions, uploading }]
  const editItemIndexRef = useRef(null);
  const [publishMode, setPublishMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const fileInputRef = useRef(null);

  // Legacy FB Post tracking
  const [legacyMode, setLegacyMode] = useState('paste');
  const [postUrl, setPostUrl] = useState('');
  const [parsedPostId, setParsedPostId] = useState(null);
  const [urlError, setUrlError] = useState('');
  const [recentPosts, setRecentPosts] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedRecentPostId, setSelectedRecentPostId] = useState('');

  // Store Contact Footer
  const [contactFooter, setContactFooter] = useState('');
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [showHashtagModal, setShowHashtagModal] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target)) {
        setIsPageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadPages();
    loadProducts();
    loadContactFooter();
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

  useEffect(() => {
    if (tabMode === 'legacy' && legacyMode === 'pick' && selectedPageIds.length > 0) {
      loadRecentPosts();
    }
  }, [tabMode, legacyMode, selectedPageIds]);

  const loadPages = async () => {
    try {
      const data = await api.fetchPages();
      setPages(data || []);
      // Automatically pre-select all connected pages so user can post to all in one click!
      if (data && data.length > 0) {
        setSelectedPageIds(data.map((p) => String(p.id)));
      }
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
    const targetPageId = selectedPageIds[0];
    if (!targetPageId) return;
    try {
      setLoadingRecent(true);
      setSelectedRecentPostId('');
      const data = await api.fetchRecentPosts(targetPageId);
      setRecentPosts(data?.data || []);
    } catch (err) {
      console.error('Failed to load recent posts', err);
      setRecentPosts([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleTabChange = (mode) => {
    setTabMode(mode);
    if (mode === 'legacy') {
      // In track existing post mode, post can only belong to exactly 1 Facebook page
      if (selectedPageIds.length > 1) {
        setSelectedPageIds([selectedPageIds[0]]);
      } else if (selectedPageIds.length === 0 && pages.length > 0) {
        setSelectedPageIds([String(pages[0].id)]);
      }
    } else if (mode === 'direct') {
      // In publish / schedule mode, default to selecting all connected accounts
      if (pages.length > 0) {
        setSelectedPageIds(pages.map((p) => String(p.id)));
      }
    }
  };

  const handleTogglePage = (pId) => {
    const strId = String(pId);
    if (tabMode === 'legacy') {
      setSelectedPageIds([strId]);
      setIsPageDropdownOpen(false);
      return;
    }
    setSelectedPageIds((prev) => {
      if (prev.includes(strId)) {
        if (prev.length === 1) return prev; // keep at least 1 account selected
        return prev.filter((id) => id !== strId);
      } else {
        return [...prev, strId];
      }
    });
  };

  const handleToggleSelectAllPages = () => {
    if (selectedPageIds.length === pages.length) {
      if (pages.length > 0) setSelectedPageIds([String(pages[0].id)]);
    } else {
      setSelectedPageIds(pages.map((p) => String(p.id)));
    }
  };

  const handleRemovePageTag = (e, pId) => {
    e.stopPropagation();
    handleTogglePage(pId);
  };

  const getImageDimensions = (file) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve('Video');
        return;
      }
      const img = new Image();
      img.onload = () => {
        resolve(`${img.naturalWidth} x ${img.naturalHeight}`);
      };
      img.onerror = () => resolve('Image');
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    setMediaSource('upload');

    if (editItemIndexRef.current !== null) {
      const index = editItemIndexRef.current;
      editItemIndexRef.current = null;
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      const dimensions = await getImageDimensions(file);
      const itemId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      setMediaItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          id: itemId,
          file,
          previewUrl,
          serverUrl: '',
          dimensions,
          uploading: true,
        };
        return updated;
      });

      try {
        const res = await api.uploadPostImage(file);
        setMediaItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, serverUrl: res.url, uploading: false } : it))
        );
      } catch (err) {
        console.error('Failed to upload image:', err);
        setMediaItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, uploading: false, error: true } : it))
        );
      }
      return;
    }

    const newItems = await Promise.all(
      files.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        const dimensions = await getImageDimensions(file);
        return {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
          file,
          previewUrl,
          serverUrl: '',
          dimensions,
          uploading: true,
        };
      })
    );

    setMediaItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      compressImageFile(item.file, 1200, 0.85)
        .then((compressed) => api.uploadPostImage(compressed))
        .then((res) => {
          setMediaItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, serverUrl: res.url, uploading: false } : it))
          );
        })
        .catch((err) => {
          console.error('Failed to upload item', err);
          setMediaItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, uploading: false, error: true } : it))
          );
        });
    }
  };

  const handleRemoveMediaItem = (itemId) => {
    setMediaItems((prev) => prev.filter((it) => it.id !== itemId));
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

  const handleAddHashtag = () => {
    setShowHashtagModal(true);
  };

  const handleAddHashtagsFromModal = (tags) => {
    if (!tags || tags.length === 0) return;
    const tagStr = tags.join(' ');
    setMessage((prev) => {
      const trimmed = (prev || '').trim();
      return trimmed ? `${trimmed} ${tagStr}` : tagStr;
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

  const handleAddEmoji = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const handleSelectEmoji = (emoji) => {
    setMessage((prev) => (prev ? `${prev} ${emoji}` : emoji));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 20);
  };

  const handleUrlChange = (value) => {
    setPostUrl(value);
    const trimmed = value.trim();
    if (!trimmed) { setParsedPostId(null); setUrlError(''); return; }
    if (/^\d+_\d+$/.test(trimmed)) { setParsedPostId(trimmed); setUrlError(''); return; }
    if (/^\d+$/.test(trimmed)) {
      const page = pages.find((p) => String(p.id) === String(selectedPageIds[0]));
      if (page?.fb_page_id) { setParsedPostId(`${page.fb_page_id}_${trimmed}`); setUrlError(''); }
      else { setParsedPostId(null); setUrlError('Select a page first.'); }
      return;
    }
    const parsed = parseFbPostUrl(trimmed);
    if (parsed) { setParsedPostId(parsed); setUrlError(''); }
    else { setParsedPostId(null); setUrlError("Couldn't recognize link. Paste standard Facebook URL or {pageId}_{postId}."); }
  };

  const handleSubmit = async () => {
    const isTargetValid = trackingTarget === 'brand' ? Boolean(brandId) : Boolean(productId);
    if (!isTargetValid || selectedPageIds.length === 0) {
      setSubmitError(`Please select ${trackingTarget === 'brand' ? 'a Brand' : 'a Product'} and at least one Facebook Page.`);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const targetBrandId = trackingTarget === 'brand' && brandId
        ? parseInt(brandId, 10)
        : (selectedProduct?.brand_id ? parseInt(selectedProduct.brand_id, 10) : null);
      const targetProductId = trackingTarget === 'product' && productId
        ? parseInt(productId, 10)
        : null;

      if (tabMode === 'direct') {
        let finalMediaUrl = null;
        if (mediaSource === 'product') {
          finalMediaUrl = trackingTarget === 'brand'
            ? (selectedBrand?.image_url || null)
            : (selectedProduct?.image_url || null);
        } else if (mediaSource === 'upload') {
          if (mediaItems.some((m) => m.uploading)) {
            setSubmitError('Please wait for all media to finish uploading.');
            setSubmitting(false);
            return;
          }
          if (mediaItems.length === 1) {
            finalMediaUrl = mediaItems[0].serverUrl || null;
          } else if (mediaItems.length > 1) {
            const urls = mediaItems.map((m) => m.serverUrl).filter(Boolean);
            finalMediaUrl = JSON.stringify(urls);
          }
        }
        // Post/Schedule to all selected Facebook pages in parallel
        await Promise.all(
          selectedPageIds.map((pId) =>
            api.createPost({
              mode: 'schedule',
              tracking_type: trackingTarget,
              product_id: targetProductId,
              brand_id: targetBrandId,
              page_id: parseInt(pId, 10),
              message: message.trim(),
              media_url: finalMediaUrl,
              publish_now: publishMode === 'now',
              scheduled_time: publishMode === 'schedule' ? new Date(scheduledDateTime).toISOString() : null,
              content_cost: parseFloat(contentCost) || 0,
              ad_spend: parseFloat(adSpend) || 0,
              attribution_window_days: parseInt(attributionWindow, 10) || 7,
            })
          )
        );
      } else {
        const fbPostId = legacyMode === 'pick' ? selectedRecentPostId : parsedPostId;
        if (!fbPostId) {
          setSubmitError('Please select or paste a valid Facebook Post ID.');
          setSubmitting(false);
          return;
        }
        const targetPageId = selectedPageIds[0];
        if (!targetPageId) {
          setSubmitError('Please select a Facebook Page.');
          setSubmitting(false);
          return;
        }
        await api.createPost({
          mode: 'legacy',
          tracking_type: trackingTarget,
          product_id: targetProductId,
          brand_id: targetBrandId,
          page_id: parseInt(targetPageId, 10),
          fb_post_id: fbPostId,
          content_cost: parseFloat(contentCost) || 0,
          ad_spend: parseFloat(adSpend) || 0,
          attribution_window_days: parseInt(attributionWindow, 10) || 7,
        });
      }

      navigate('/tasks');
    } catch (err) {
      console.error('Failed to create/schedule post:', err);
      setSubmitError(err.response?.data?.error || err.message || 'Failed to submit post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate('/tasks');

  // Resolved active Facebook Page(s)
  const selectedPages = pages.filter((p) => selectedPageIds.includes(String(p.id)));
  const primaryPage = selectedPages[0] || pages[0] || null;
  const pageDisplayName = primaryPage ? primaryPage.page_name : 'Mae Khon Baby Mart';
  const filteredPages = pages.filter((p) =>
    (p.page_name || '').toLowerCase().includes(pageSearchQuery.toLowerCase())
  );

  return (
    <div className="meta-post-page">
      {/* ── Top Navigation Bar ── */}
      <div className="meta-top-nav">
        <div className="meta-top-nav-left">
          <button type="button" onClick={handleCancel} className="meta-back-btn" title="Back to tasks">
            <ArrowLeft size={18} />
          </button>
          <h1 className="meta-page-title">Create post</h1>
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
            LEFT COLUMN: Meta Business Suite Editor Panel
            ══════════════════════════════════════════════════ */}
        <div className="meta-editor-col">


          {/* Mode Switcher: Direct Publish vs Track Existing FB Post */}
          <div className="meta-tab-switcher">
            <button
              type="button"
              className={`meta-tab-btn ${tabMode === 'direct' ? 'active' : ''}`}
              onClick={() => handleTabChange('direct')}
            >
              <Sparkles size={15} /> Publish / Schedule Direct
            </button>
            <button
              type="button"
              className={`meta-tab-btn ${tabMode === 'legacy' ? 'active' : ''}`}
              onClick={() => handleTabChange('legacy')}
            >
              <Link2 size={15} /> Track Existing FB Post
            </button>
          </div>

          {/* 2. Card: Post to (Direct) / Facebook Account (Track Existing) */}
          <div className="meta-card">
            <div className="meta-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="meta-card-title">
                  {tabMode === 'legacy' ? 'Facebook Account / Page' : 'Post to'}
                </h3>
                <p className="meta-card-desc">
                  {tabMode === 'legacy'
                    ? 'Select the Facebook page where this post is published'
                    : 'Select Facebook accounts to publish or schedule'}
                </p>
              </div>
              {tabMode === 'direct' && pages.length > 1 && (
                <button
                  type="button"
                  className="meta-select-all-btn"
                  onClick={handleToggleSelectAllPages}
                >
                  {selectedPageIds.length === pages.length ? 'Deselect all' : 'Select all accounts'}
                </button>
              )}
            </div>

            <div className="meta-multi-select-wrap" ref={pageDropdownRef}>
              <div
                className={`meta-multi-select-trigger ${isPageDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
              >
                <div className="meta-selected-pages-display">
                  {selectedPages.length === 0 ? (
                    <span style={{ color: '#8a8d91', fontSize: '14px' }}>Select Facebook page...</span>
                  ) : tabMode === 'legacy' ? (
                    <div className="meta-page-tag" style={{ cursor: 'pointer' }}>
                      {primaryPage?.picture_url ? (
                        <img
                          src={primaryPage.picture_url}
                          alt={primaryPage.page_name}
                          className="meta-page-avatar-img"
                          style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="meta-page-avatar" style={{ width: '20px', height: '20px', fontSize: '11px' }}>
                          {primaryPage?.page_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {primaryPage?.page_name}
                      </span>
                    </div>
                  ) : (
                    <>
                      {selectedPages.slice(0, 2).map((page) => (
                        <div key={page.id} className="meta-page-tag">
                          {page.picture_url ? (
                            <img
                              src={page.picture_url}
                              alt={page.page_name}
                              className="meta-page-avatar-img"
                              style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="meta-page-avatar" style={{ width: '20px', height: '20px', fontSize: '11px' }}>
                              {page.page_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {page.page_name}
                          </span>
                          {selectedPages.length > 1 && (
                            <span
                              className="meta-page-tag-remove"
                              onClick={(e) => handleRemovePageTag(e, page.id)}
                              title="Remove"
                            >
                              <X size={12} />
                            </span>
                          )}
                        </div>
                      ))}
                      {selectedPages.length > 2 && (
                        <span className="meta-page-badge-pill">
                          +{selectedPages.length - 2} more
                        </span>
                      )}
                    </>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  color="#65676b"
                  style={{
                    transform: isPageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                    marginLeft: '8px'
                  }}
                />
              </div>

              {isPageDropdownOpen && (
                <div className="meta-multi-select-menu">
                  <div className="meta-multi-select-header">
                    <span className="meta-multi-select-title">
                      {tabMode === 'legacy' ? 'Select Facebook Page' : `Connected Accounts (${selectedPageIds.length}/${pages.length})`}
                    </span>
                    {tabMode === 'direct' && (
                      <button
                        type="button"
                        className="meta-select-all-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectAllPages();
                        }}
                      >
                        {selectedPageIds.length === pages.length ? 'Clear' : 'Select all'}
                      </button>
                    )}
                  </div>

                  {pages.length > 3 && (
                    <div className="meta-multi-select-search">
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={pageSearchQuery}
                        onChange={(e) => setPageSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="meta-page-search-input"
                      />
                    </div>
                  )}

                  <div className="meta-multi-select-list">
                    {filteredPages.map((p) => {
                      const isChecked = selectedPageIds.includes(String(p.id));
                      return (
                        <div
                          key={p.id}
                          className={`meta-page-option-row ${isChecked ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePage(p.id);
                          }}
                        >
                          <div className="meta-option-left">
                            {tabMode === 'legacy' ? (
                              <div
                                className={`meta-radio ${isChecked ? 'checked' : ''}`}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  border: isChecked ? '5px solid #1877f2' : '2px solid #ced0d4',
                                  background: '#ffffff',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease'
                                }}
                              />
                            ) : (
                              <div className={`meta-checkbox ${isChecked ? 'checked' : ''}`}>
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </div>
                            )}
                            {p.picture_url ? (
                              <img
                                src={p.picture_url}
                                alt={p.page_name}
                                className="meta-page-avatar-img"
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                              />
                            ) : (
                              <div className="meta-page-avatar">
                                {p.page_name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#050505' }}>
                              {p.page_name}
                            </span>
                          </div>
                          {p.category && (
                            <span style={{ fontSize: '12px', color: '#65676b' }}>
                              {p.category}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* 3. Card: Attribution Target (Moon IMS) */}
          <div className="meta-card">
            <div className="meta-card-header">
              <h3 className="meta-card-title">Attribution Target (Moon IMS)</h3>
              <p className="meta-card-desc">Choose whether this post promotes a single product or an entire brand live session</p>
            </div>

            {/* Target Selector */}
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
                placeholder="Search product from catalog..."
              />
            ) : (
              <div>
                <BrandPicker
                  value={brandId}
                  onChange={(val, brandObj) => {
                    setBrandId(val);
                    setSelectedBrand(brandObj);
                  }}
                  placeholder="Search brand from catalog..."
                />
              </div>
            )}
          </div>

          {/* 4. Card: Media */}
          {tabMode === 'direct' && (
            <div className="meta-card">
              <div className="meta-card-header">
                <h3 className="meta-card-title">Media</h3>
                <p className="meta-card-desc">Share photos and videos.</p>
              </div>

              {/* Media Selection Chips */}
              <div className="meta-media-chips">
                <button
                  type="button"
                  onClick={() => { setMediaSource('upload'); fileInputRef.current?.click(); }}
                  className={`meta-chip-btn ${mediaSource === 'upload' ? 'active' : ''}`}
                >
                  <ImageIcon size={14} /> Custom Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSource('product')}
                  className={`meta-chip-btn ${mediaSource === 'product' ? 'active' : ''}`}
                >
                  <Layers size={14} /> {trackingTarget === 'brand' ? 'Brand Logo' : 'Product Image'}
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
                onChange={handleFileSelect}
                accept="image/*,video/*"
                multiple
                style={{ display: 'none' }}
              />

              {/* Active Media Preview Box */}
              {mediaSource === 'product' && (
                <div className="meta-media-preview-box">
                  {trackingTarget === 'brand' ? (
                    selectedBrand?.image_url ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={selectedBrand.image_url} alt="Brand preview" className="meta-media-thumb" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#050505' }}>{selectedBrand.brand_name || selectedBrand.name}</div>
                            <div style={{ fontSize: '11px', color: '#65676b' }}>Brand #{selectedBrand.brand_id || selectedBrand.id} · Live Session Logo</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>Brand Linked</span>
                      </>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#65676b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={14} /> Select a brand above to attach its image.
                      </div>
                    )
                  ) : (
                    selectedProduct?.image_url ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={selectedProduct.image_url} alt="Product preview" className="meta-media-thumb" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#050505' }}>{selectedProduct.product_name}</div>
                            <div style={{ fontSize: '11px', color: '#65676b' }}>From Moon IMS Catalog</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#1877f2', fontWeight: 600 }}>Linked</span>
                      </>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#65676b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={14} /> Select a product above to attach its image.
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Active Media: Custom Upload (Meta Multi-Upload List) */}
              {mediaSource === 'upload' && (
                <div>
                  {mediaItems.length > 0 && (
                    <div className="meta-media-items-list">
                      {mediaItems.map((item, idx) => (
                        <div key={item.id} className="meta-media-row-item">
                          <div className="meta-media-row-left">
                            <img
                              src={item.previewUrl}
                              alt="Media item"
                              className="meta-media-square-thumb"
                            />
                            <div>
                              <div className="meta-media-dim-label">
                                {item.dimensions || 'Image'}
                              </div>
                              <div style={{ fontSize: '11px', color: item.uploading ? '#1877f2' : '#16a34a' }}>
                                {item.uploading ? 'Uploading...' : '✓ Ready'}
                              </div>
                            </div>
                          </div>

                          <div className="meta-media-row-actions">
                            <button
                              type="button"
                              className="meta-media-icon-btn"
                              title="Edit / Change photo"
                              onClick={() => {
                                editItemIndexRef.current = idx;
                                fileInputRef.current?.click();
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="meta-media-icon-btn delete"
                              title="Delete photo"
                              onClick={() => handleRemoveMediaItem(item.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add photo/video button */}
                  <div style={{ marginTop: mediaItems.length > 0 ? '12px' : '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        editItemIndexRef.current = null;
                        fileInputRef.current?.click();
                      }}
                      className="meta-media-add-btn"
                    >
                      <Images size={16} />
                      <span>Add photo/video</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Card: Post details (Textarea + Action Toolbar) */}
          {tabMode === 'direct' && (
            <div className="meta-card" ref={textCardRef}>
              <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#050505' }}>
                Text
              </div>

              <div className="meta-textarea-box">
                <textarea
                  ref={textareaRef}
                  className="meta-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write something..."
                />
                <div className="meta-textarea-toolbar">
                  <div className="meta-toolbar-left">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="meta-toolbar-btn"
                      title="Add photo"
                    >
                      <ImageIcon size={16} />
                    </button>
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
                      onClick={handleAddHashtag}
                      className="meta-toolbar-btn"
                      title="Add hashtag"
                    >
                      <Hash size={16} />
                    </button>
                    <div className="meta-emoji-picker-container">
                      <button
                        type="button"
                        onClick={handleAddEmoji}
                        className={`meta-toolbar-btn ${showEmojiPicker ? 'active' : ''}`}
                        title="Add emoji"
                      >
                        <Smile size={16} />
                      </button>

                      {showEmojiPicker && (
                        <MetaEmojiPicker
                          onSelectEmoji={handleSelectEmoji}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action Icons Row */}
              <div className="meta-quick-actions-row">
                <button type="button" className="meta-quick-icon-btn" title="Add location"><MapPin size={16} /></button>
                <button type="button" className="meta-quick-icon-btn" title="Get messages"><MessageCircle size={16} /></button>
                <button type="button" className="meta-quick-icon-btn" title="Call now button"><Phone size={16} /></button>
                <button type="button" className="meta-quick-icon-btn" title="More options"><MoreHorizontal size={16} /></button>
              </div>
            </div>
          )}

          {/* Legacy FB Post Picker / Paste */}
          {tabMode === 'legacy' && (
            <div className="meta-card">
              <div className="meta-card-header">
                <h3 className="meta-card-title">Choose Existing Facebook Post</h3>
                <p className="meta-card-desc">Connect an already published Facebook post to track attribution</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setLegacyMode('paste')}
                  className={`meta-chip-btn ${legacyMode === 'paste' ? 'active' : ''}`}
                >
                  <Link2 size={14} /> Paste Link or Post ID
                </button>
                <button
                  type="button"
                  onClick={() => setLegacyMode('pick')}
                  className={`meta-chip-btn ${legacyMode === 'pick' ? 'active' : ''}`}
                >
                  <Globe size={14} /> Pick from Recent Posts
                </button>
              </div>

              {legacyMode === 'paste' ? (
                <div>
                  <div className="meta-input-group meta-input-with-icon">
                    <span className="meta-input-lead-icon">
                      <Link2 size={16} />
                    </span>
                    <input
                      type="text"
                      className="meta-text-input"
                      placeholder="e.g. https://facebook.com/posts/12345 or {pageId}_{postId}"
                      value={postUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                    />
                    {postUrl && (
                      <button
                        type="button"
                        className="meta-input-clear-btn"
                        onClick={() => handleUrlChange('')}
                        title="Clear input"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {parsedPostId && (
                    <div className="meta-input-feedback-success">
                      <CheckCircle2 size={15} />
                      <span>Recognized Post ID: <code>{parsedPostId}</code></span>
                    </div>
                  )}
                  {urlError && (
                    <div className="meta-input-feedback-error">
                      <AlertCircle size={15} />
                      <span>{urlError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {loadingRecent ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#65676b', fontSize: '13px' }}>
                      Loading recent Facebook posts...
                    </div>
                  ) : recentPosts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#65676b', fontSize: '13px' }}>
                      No recent Facebook posts found for the selected page.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {recentPosts.map((p) => {
                        const isSel = selectedRecentPostId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedRecentPostId(p.id)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: isSel ? '2px solid #1877f2' : '1px solid #e4e6eb',
                              background: isSel ? '#e7f3ff' : '#ffffff',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#050505', marginBottom: '2px' }}>
                              {p.message ? p.message.slice(0, 60) + '...' : '(No text caption)'}
                            </div>
                            <div style={{ color: '#65676b', fontSize: '11px' }}>
                              {new Date(p.created_time).toLocaleString()} · ID: {p.id}
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

          {/* 6. Card: Schedule */}
          {tabMode === 'direct' && (
            <div className="meta-card">
              <div className="meta-schedule-row">
                <span className="meta-schedule-label">Schedule</span>
                <div className="meta-schedule-right">
                  <span className="meta-schedule-subtext">Set date and time</span>
                  <label className="meta-toggle-switch">
                    <input
                      type="checkbox"
                      checked={publishMode === 'schedule'}
                      onChange={(e) => setPublishMode(e.target.checked ? 'schedule' : 'now')}
                    />
                    <span className="meta-toggle-slider" />
                  </label>
                </div>
              </div>

              {publishMode === 'schedule' && (
                <MetaSchedulePicker
                  value={scheduledDateTime}
                  onChange={(newIso) => setScheduledDateTime(newIso)}
                />
              )}
            </div>
          )}

          {/* 7. Card: Costs & Attribution */}
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

          {/* Sticky Action Bar */}
          <div className="meta-sticky-bar" style={{ justifyContent: 'flex-end' }}>

            <div className="meta-actions-right" style={{ display: 'flex', alignItems: 'center' }}>
              {tabMode === 'legacy' && legacyMode === 'pick' && !selectedRecentPostId && (
                <span style={{ fontSize: '12px', color: '#8a8d91', marginRight: '8px' }}>
                  Select a post from the list above to track
                </span>
              )}
              {tabMode === 'legacy' && legacyMode === 'paste' && !parsedPostId && (
                <span style={{ fontSize: '12px', color: '#8a8d91', marginRight: '8px' }}>
                  Paste a valid Facebook link or ID
                </span>
              )}
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
                disabled={
                  submitting ||
                  !(trackingTarget === 'brand' ? Boolean(brandId) : Boolean(productId)) ||
                  selectedPageIds.length === 0 ||
                  (tabMode === 'legacy' && (legacyMode === 'pick' ? !selectedRecentPostId : !parsedPostId))
                }
                className="meta-btn-primary"
              >
                {submitting ? (
                  <>Processing ({selectedPageIds.length} account{selectedPageIds.length > 1 ? 's' : ''})...</>
                ) : tabMode === 'direct' ? (
                  publishMode === 'schedule' ? (
                    selectedPageIds.length > 1
                      ? `Schedule to ${selectedPageIds.length} Accounts`
                      : 'Schedule Post'
                  ) : (
                    selectedPageIds.length > 1
                      ? `Publish to ${selectedPageIds.length} Accounts Now`
                      : 'Publish'
                  )
                ) : (
                  'Track Post'
                )}
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
                {primaryPage?.picture_url ? (
                  <img
                    src={primaryPage.picture_url}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="meta-feed-name">{pageDisplayName}</div>
                    {selectedPages.length > 1 && (
                      <span className="meta-page-badge-pill" style={{ fontSize: '11px', padding: '1px 6px' }}>
                        +{selectedPages.length - 1} other account{selectedPages.length > 2 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="meta-feed-time">
                    {publishMode === 'schedule' && scheduledDateTime ? (
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
            {mediaSource === 'product' && (trackingTarget === 'brand' ? selectedBrand?.image_url : selectedProduct?.image_url) ? (
              <div className="meta-feed-media">
                <img
                  src={trackingTarget === 'brand' ? selectedBrand.image_url : selectedProduct.image_url}
                  alt="Post preview"
                  className="meta-feed-image"
                />
              </div>
            ) : mediaSource === 'upload' && mediaItems.length > 0 ? (
              mediaItems.length === 1 ? (
                <div className="meta-feed-media">
                  <img
                    src={mediaItems[0].previewUrl}
                    alt="Post preview"
                    className="meta-feed-image"
                  />
                </div>
              ) : mediaItems.length === 2 ? (
                <div className="meta-feed-multi-grid grid-2">
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[0].previewUrl} alt="Media 1" className="meta-feed-grid-img" />
                  </div>
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[1].previewUrl} alt="Media 2" className="meta-feed-grid-img" />
                  </div>
                </div>
              ) : mediaItems.length === 3 ? (
                <div className="meta-feed-multi-grid grid-3">
                  <div className="meta-feed-grid-item span-2-rows">
                    <img src={mediaItems[0].previewUrl} alt="Media 1" className="meta-feed-grid-img" />
                  </div>
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[1].previewUrl} alt="Media 2" className="meta-feed-grid-img" />
                  </div>
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[2].previewUrl} alt="Media 3" className="meta-feed-grid-img" />
                  </div>
                </div>
              ) : (
                <div className="meta-feed-multi-grid grid-4">
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[0].previewUrl} alt="Media 1" className="meta-feed-grid-img" />
                  </div>
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[1].previewUrl} alt="Media 2" className="meta-feed-grid-img" />
                  </div>
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[2].previewUrl} alt="Media 3" className="meta-feed-grid-img" />
                  </div>
                  <div className="meta-feed-grid-item">
                    <img src={mediaItems[3].previewUrl} alt="Media 4" className="meta-feed-grid-img" />
                    {mediaItems.length > 4 && (
                      <div className="meta-feed-more-overlay">
                        +{mediaItems.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : mediaSource !== 'none' ? (
              <div className="meta-feed-empty-placeholder">
                <svg className="meta-placeholder-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <rect x="10" y="10" width="80" height="80" rx="8" strokeWidth="3" strokeDasharray="6 6" />
                  <circle cx="35" cy="35" r="8" fill="currentColor" fillOpacity="0.4" stroke="none" />
                  <path d="M20 75 L45 45 L65 65 L80 50 L85 75 Z" fill="currentColor" fillOpacity="0.4" stroke="none" />
                </svg>
              </div>
            ) : null}

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
