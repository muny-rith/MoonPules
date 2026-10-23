import React, { useState, useEffect, useRef } from 'react';
import * as api from '../api/postTrackerApi';
import * as productService from '../../product/services/productService';
import { ProductPicker } from '../../product/component/ProductPicker';
import { BrandPicker } from '../../product/component/BrandPicker';
import { usePostTracker } from '../hooks/usePostTracker';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Upload,
  Globe,
  Link2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Check,
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
  MoreVertical,
  ThumbsUp,
  MessageSquare,
  Share2,
  Image as ImageIcon,
  X,
  Package,
  Award,
  Radio,
  Copy,
  Images,
  Trash2,
  GripVertical,
  Play,
  Video,
  Star,
  LayoutGrid,
  List,
  ZoomIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { PostEditorSkeleton } from '../../../shared/components/skeletons';
import { MetaEmojiPicker } from '../components/MetaEmojiPicker';
import { MetaSchedulePicker } from '../components/MetaSchedulePicker';
import { ContactFooterModal } from '../components/ContactFooterModal';
import { AddHashtagsModal } from '../components/AddHashtagsModal';
import { VideoThumbnailPicker } from '../components/VideoThumbnailPicker';
import { useWheelIsolation } from '../hooks/useWheelIsolation';
import '../postTracker.css';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { resolveMediaUrl, resolveAllMediaUrls, compressImageFile, isVideoMedia, getMediaMetadata } from '../../../shared/utils/mediaUrl';

const PageAvatar = ({ page, size = 26, className = 'meta-page-avatar-img' }) => {
  const [imgError, setImgError] = useState(false);
  const name = page?.page_name || 'Facebook Page';
  const initial = name.charAt(0).toUpperCase();

  if (page?.picture_url && !imgError) {
    return (
      <img
        src={page.picture_url}
        alt={name}
        className={className}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', border: '1px solid rgba(0,0,0,0.08)' }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="meta-page-avatar"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: size <= 20 ? '11px' : size <= 28 ? '13px' : '16px',
        flexShrink: 0
      }}
    >
      {initial}
    </div>
  );
};

export const EditPostPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { updatePost } = usePostTracker();
  const isFromPlanner = location.pathname.startsWith('/planner') || location.search.includes('from=planner');
  const returnPath = location.state?.from || (isFromPlanner ? '/planner' : '/tasks');

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
  const [mediaItems, setMediaItems] = useState([]); // [{ id, file, previewUrl, thumbUrl, isVideo, serverUrl, dimensions, uploading, error }]
  const [mediaViewMode, setMediaViewMode] = useState('grid'); // 'grid' | 'list'
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [draggedMediaIndex, setDraggedMediaIndex] = useState(null);
  const [dragOverMediaIndex, setDragOverMediaIndex] = useState(null);
  const dragItemIndexRef = useRef(null);
  const dragOverItemIndexRef = useRef(null);
  const editItemIndexRef = useRef(null);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('');
  const [videoCustomThumbFile, setVideoCustomThumbFile] = useState(null);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // FB Post ID
  const [fbPostId, setFbPostId] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const isSubmittingRef = useRef(false);

  // Store Contact Footer
  const [contactFooter, setContactFooter] = useState('');
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Top-Right More Actions Menu (Vertical 3-Dots)
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

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
        let rawUrls = [];
        if (typeof post.media_url === 'string' && post.media_url.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(post.media_url);
            if (Array.isArray(parsed)) {
              rawUrls = parsed;
            } else {
              rawUrls = [post.media_url];
            }
          } catch (e) {
            rawUrls = [post.media_url];
          }
        } else {
          rawUrls = [post.media_url];
        }

        const items = rawUrls.map((url, i) => {
          const resolved = resolveMediaUrl(url);
          const isVid = isVideoMedia(url) || isVideoMedia(resolved) || (i === 0 && post.media_type === 'video');
          return {
            id: `loaded_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            file: null,
            previewUrl: resolved,
            serverUrl: url,
            thumbUrl: (i === 0 && post.thumbnail_url) ? resolveMediaUrl(post.thumbnail_url) : (isVid ? null : resolved),
            isVideo: isVid,
            dimensions: isVid ? 'Video' : 'Image',
            uploading: false,
          };
        });

        setMediaItems(items);

        if (post.media_url.includes('/uploads/') || post.media_url.includes('http') || post.media_url.startsWith('[')) {
          setMediaSource('upload');
        } else {
          setMediaSource('product');
        }
      } else if (post.media_type === 'video') {
        setMediaSource('upload');
        setMediaItems([]);
      } else {
        setMediaSource('none');
        setMediaItems([]);
      }

      if (post.thumbnail_url) {
        setVideoThumbnailUrl(post.thumbnail_url);
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

  // Global safety listener to ensure drag state is never stuck if browser aborts drag
  useEffect(() => {
    const handleGlobalDragReset = () => {
      if (dragItemIndexRef.current !== null || dragOverItemIndexRef.current !== null) {
        dragItemIndexRef.current = null;
        dragOverItemIndexRef.current = null;
        setDraggedMediaIndex(null);
        setDragOverMediaIndex(null);
      }
    };

    window.addEventListener('dragend', handleGlobalDragReset);
    window.addEventListener('drop', handleGlobalDragReset);
    window.addEventListener('mouseup', handleGlobalDragReset);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragReset);
      window.removeEventListener('drop', handleGlobalDragReset);
      window.removeEventListener('mouseup', handleGlobalDragReset);
    };
  }, []);

  const handleMediaDragStart = (e, index) => {
    dragItemIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
    setTimeout(() => {
      setDraggedMediaIndex(index);
    }, 0);
  };

  const handleMediaDragEnter = (e, index) => {
    e.preventDefault();
    if (dragOverItemIndexRef.current !== index) {
      dragOverItemIndexRef.current = index;
      setDragOverMediaIndex(index);
    }
  };

  const handleMediaDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverItemIndexRef.current !== index) {
      dragOverItemIndexRef.current = index;
      setDragOverMediaIndex(index);
    }
  };

  const handleMediaDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceIndex = dragItemIndexRef.current !== null ? dragItemIndexRef.current : draggedMediaIndex;

    if (sourceIndex !== null && sourceIndex !== targetIndex && sourceIndex >= 0 && targetIndex >= 0) {
      setMediaItems((prev) => {
        const items = [...prev];
        const [movedItem] = items.splice(sourceIndex, 1);
        items.splice(targetIndex, 0, movedItem);
        return items;
      });
    }

    dragItemIndexRef.current = null;
    dragOverItemIndexRef.current = null;
    setDraggedMediaIndex(null);
    setDragOverMediaIndex(null);
  };

  const handleMediaDragEnd = () => {
    dragItemIndexRef.current = null;
    dragOverItemIndexRef.current = null;
    setDraggedMediaIndex(null);
    setDragOverMediaIndex(null);
  };

  const handleRemoveMediaItem = (itemId) => {
    setMediaItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleMakeCover = (e, index) => {
    e.stopPropagation();
    if (index === 0) return;
    setMediaItems((prev) => {
      const items = [...prev];
      const [target] = items.splice(index, 1);
      items.unshift(target);
      return items;
    });
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, mediaItems.length]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    setMediaSource('upload');

    // If editing a specific item in the list
    if (editItemIndexRef.current !== null) {
      const index = editItemIndexRef.current;
      editItemIndexRef.current = null;
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      const meta = await getMediaMetadata(file);
      const itemId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      setMediaItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          id: itemId,
          file,
          previewUrl,
          thumbUrl: meta.thumbUrl || previewUrl,
          isVideo: meta.isVideo,
          serverUrl: '',
          dimensions: meta.dimensions,
          uploading: true,
        };
        return updated;
      });

      try {
        const compressed = meta.isVideo ? file : await compressImageFile(file, 1200, 0.85);
        const res = await api.uploadPostImage(compressed);
        setMediaItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, serverUrl: res.url, previewUrl: res.url, thumbUrl: res.url, uploading: false } : it))
        );
      } catch (err) {
        console.error('Failed to upload media:', err);
        const errMsg = err?.response?.data?.error || err.message || 'Upload failed';
        setMediaItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, uploading: false, error: true, errorMessage: errMsg } : it))
        );
      }
      return;
    }

    // Adding new items
    const newItems = await Promise.all(
      files.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        const meta = await getMediaMetadata(file);
        return {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
          file,
          previewUrl,
          thumbUrl: meta.thumbUrl || previewUrl,
          isVideo: meta.isVideo,
          serverUrl: '',
          dimensions: meta.dimensions,
          uploading: true,
        };
      })
    );

    setMediaItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      (async () => {
        try {
          const compressed = item.isVideo ? item.file : await compressImageFile(item.file, 1200, 0.85);
          const res = await api.uploadPostImage(compressed);
          setMediaItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, serverUrl: res.url, previewUrl: res.url, thumbUrl: res.url, uploading: false } : it))
          );
        } catch (err) {
          console.error('Failed to upload item', err);
          const errMsg = err?.response?.data?.error || err.message || 'Upload failed';
          setMediaItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, uploading: false, error: true, errorMessage: errMsg } : it))
          );
        }
      })();
    }
  };

  // Video detection and thumbnail handler
  const firstVideoIndex = mediaItems.findIndex(
    (m) => m.isVideo || isVideoMedia(m.previewUrl) || isVideoMedia(m.serverUrl)
  );
  const firstVideoItem = firstVideoIndex !== -1 ? mediaItems[firstVideoIndex] : null;
  const hasVideo = Boolean(firstVideoItem);

  const handleThumbnailSelect = (thumbData) => {
    setVideoCustomThumbFile(thumbData.file || null);
    if (thumbData.url && !thumbData.url.startsWith('data:')) {
      setVideoThumbnailUrl(thumbData.url);
    }
    if (firstVideoIndex !== -1) {
      setMediaItems((prev) =>
        prev.map((item, idx) =>
          idx === firstVideoIndex ? { ...item, thumbUrl: thumbData.url } : item
        )
      );
    }
  };

  const renderFeedGridItem = (item, idx) => {
    if (!item) return null;
    const isVid = item.isVideo || isVideoMedia(item.previewUrl) || isVideoMedia(item.serverUrl);
    if (isVid) {
      return (
        <div className="meta-feed-grid-video-wrap">
          {item.thumbUrl ? (
            <img src={item.thumbUrl} alt={`Media ${idx + 1}`} className="meta-feed-grid-img" />
          ) : (
            <video src={item.previewUrl} className="meta-feed-grid-img" muted preload="metadata" playsInline />
          )}
          <div className="meta-feed-grid-play-badge">
            <div className="meta-feed-grid-play-circle">
              <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
            </div>
          </div>
        </div>
      );
    }
    return <img src={item.previewUrl} alt={`Media ${idx + 1}`} className="meta-feed-grid-img" />;
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
    if (isSubmittingRef.current || submitting) {
      console.warn('Update already in progress. Ignoring duplicate click.');
      return;
    }
    const isTargetValid = trackingTarget === 'brand' ? Boolean(brandId) : Boolean(productId);
    if (!isTargetValid || !pageId) {
      setSubmitError(`Please select ${trackingTarget === 'brand' ? 'a Brand' : 'a Product'} and a Facebook Page.`);
      return;
    }
    isSubmittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      let finalMediaUrl = null;
      if (mediaSource === 'product') {
        finalMediaUrl = trackingTarget === 'brand'
          ? (selectedBrand?.image_url || originalPost?.media_url || null)
          : (selectedProduct?.image_url || originalPost?.media_url || null);
      } else if (mediaSource === 'upload') {
        if (mediaItems.some((m) => m.uploading)) {
          setSubmitError('Please wait for all media uploads to complete.');
          isSubmittingRef.current = false;
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

      const targetBrandId = trackingTarget === 'brand' && brandId
        ? parseInt(brandId, 10)
        : (selectedProduct?.brand_id ? parseInt(selectedProduct.brand_id, 10) : null);
      const targetProductId = trackingTarget === 'product' && productId
        ? parseInt(productId, 10)
        : null;

      const isVideo = hasVideo || (finalMediaUrl ? isVideoMedia(finalMediaUrl) : false);

      let finalThumbnailUrl = videoThumbnailUrl || originalPost?.thumbnail_url || null;
      if (videoCustomThumbFile) {
        try {
          const thumbRes = await api.uploadPostImage(videoCustomThumbFile);
          finalThumbnailUrl = thumbRes.url;
        } catch (thumbErr) {
          console.warn('Failed to upload custom video thumbnail:', thumbErr);
        }
      }

      const updateData = {
        tracking_type: trackingTarget,
        product_id: targetProductId,
        brand_id: targetBrandId,
        message: message.trim(),
        media_url: finalMediaUrl,
        thumbnail_url: finalThumbnailUrl,
        media_type: isVideo ? 'video' : (finalMediaUrl ? 'photo' : 'status'),
        content_cost: parseFloat(contentCost) || 0,
        ad_spend: parseFloat(adSpend) || 0,
        attribution_window_days: parseInt(attributionWindow, 10) || 7,
        fb_post_id: fbPostId || originalPost?.fb_post_id || undefined,
        scheduled_time: scheduledDateTime ? new Date(scheduledDateTime).toISOString() : originalPost?.scheduled_time,
      };

      await updatePost(parseInt(id, 10), updateData);
      navigate(returnPath);
    } catch (err) {
      console.error('Update error:', err);
      setSubmitError(err?.response?.data?.error || err.message || 'Failed to update post');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDuplicateAsNew = async () => {
    if (isSubmittingRef.current || submitting) {
      console.warn('Action in progress. Ignoring duplicate click.');
      return;
    }

    try {
      let finalMediaUrl = null;
      if (mediaSource === 'product') {
        finalMediaUrl = trackingTarget === 'brand'
          ? (selectedBrand?.image_url || originalPost?.media_url || null)
          : (selectedProduct?.image_url || originalPost?.media_url || null);
      } else if (mediaSource === 'upload') {
        if (mediaItems.some((m) => m.uploading)) {
          setSubmitError('Please wait for all media uploads to complete.');
          return;
        }
        if (mediaItems.length === 1) {
          finalMediaUrl = mediaItems[0].serverUrl || mediaItems[0].previewUrl || null;
        } else if (mediaItems.length > 1) {
          const urls = mediaItems.map((m) => m.serverUrl || m.previewUrl).filter(Boolean);
          finalMediaUrl = JSON.stringify(urls);
        }
      }

      const targetBrandId = trackingTarget === 'brand' && brandId
        ? parseInt(brandId, 10)
        : (selectedProduct?.brand_id ? parseInt(selectedProduct.brand_id, 10) : (originalPost?.brand_id || null));
      const targetProductId = trackingTarget === 'product' && productId
        ? parseInt(productId, 10)
        : (originalPost?.product_id || null);

      const isVideo = hasVideo || (finalMediaUrl ? isVideoMedia(finalMediaUrl) : false);

      let finalThumbnailUrl = videoThumbnailUrl || originalPost?.thumbnail_url || null;
      if (videoCustomThumbFile) {
        try {
          const thumbRes = await api.uploadPostImage(videoCustomThumbFile);
          finalThumbnailUrl = thumbRes.url;
        } catch (thumbErr) {
          console.warn('Failed to upload custom video thumbnail:', thumbErr);
        }
      }

      const duplicateData = {
        tracking_type: trackingTarget,
        product_id: targetProductId,
        brand_id: targetBrandId,
        page_id: pageId ? parseInt(pageId, 10) : originalPost?.page_id,
        message: message ? message.trim() : (originalPost?.message || ''),
        media_url: finalMediaUrl,
        thumbnail_url: finalThumbnailUrl,
        media_type: isVideo ? 'video' : (finalMediaUrl ? 'photo' : (originalPost?.media_type || 'status')),
        scheduled_time: scheduledDateTime ? new Date(scheduledDateTime).toISOString() : originalPost?.scheduled_time,
        content_cost: parseFloat(contentCost) || 0,
        ad_spend: parseFloat(adSpend) || 0,
        attribution_window_days: parseInt(attributionWindow, 10) || 7,
      };

      const createPath = isFromPlanner ? '/planner/create' : '/tasks/create';
      navigate(createPath, { state: { duplicatePost: duplicateData } });
    } catch (err) {
      console.error('Duplicate post navigation error:', err);
      setSubmitError(err?.message || 'Failed to prepare duplicate post');
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

  const handleCancel = () => navigate(returnPath);

  // Loading Skeleton
  if (loadingPost) {
    return <PostEditorSkeleton />;
  }

  // Error state
  if (loadError) {
    return (
      <div className="page-container meta-post-page">
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


  return (
    <div className="page-container meta-post-page">
      {/* ── Top Navigation Bar ── */}
      <div className="meta-top-nav">
        <div className="meta-top-nav-left">
          <button type="button" onClick={handleCancel} className="meta-back-btn" title={isFromPlanner ? "Back to planner" : "Back to tasks"}>
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

          {/* Top-Right Vertical 3-Dots Menu */}
          <div className="meta-more-menu-wrap" ref={moreMenuRef}>
            <button
              type="button"
              className={`meta-more-menu-btn ${showMoreMenu ? 'active' : ''}`}
              onClick={() => setShowMoreMenu((prev) => !prev)}
              title="More actions"
              aria-label="More actions"
            >
              <MoreVertical size={18} />
            </button>

            {showMoreMenu && (
              <div className="meta-more-dropdown">
                <button
                  type="button"
                  className="meta-more-dropdown-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleDuplicateAsNew();
                  }}
                  disabled={submitting}
                  title="Copy this post into the Create Post form to customize and schedule as a new post"
                >
                  <Copy size={15} style={{ color: '#2563eb' }} />
                  <span>Duplicate as New Post</span>
                </button>
              </div>
            )}
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
                  <PageAvatar page={currentPage} size={26} />
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
                  onChange={handleFileSelect}
                  accept="image/*,video/*"
                  multiple
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
                  <div>
                    {/* Bento Header: Count + View Mode Switcher */}
                    {mediaItems.length > 0 && (
                      <div className="bento-media-header">
                        <div className="bento-media-count">
                          <span>{mediaItems.length} {mediaItems.length === 1 ? 'photo/video' : 'photos'} attached</span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                            · Photo #1 is Facebook Feed Cover
                          </span>
                        </div>
                        <div className="bento-view-toggle">
                          <button
                            type="button"
                            className={`bento-toggle-btn ${mediaViewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setMediaViewMode('grid')}
                            title="Grid gallery view"
                          >
                            <LayoutGrid size={13} />
                            <span>Grid</span>
                          </button>
                          <button
                            type="button"
                            className={`bento-toggle-btn ${mediaViewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setMediaViewMode('list')}
                            title="List view"
                          >
                            <List size={13} />
                            <span>List</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* View Mode 1: Bento Grid Gallery */}
                    {mediaViewMode === 'grid' && mediaItems.length > 0 && (
                      <div
                        className="bento-media-grid"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            dragOverItemIndexRef.current = null;
                            setDragOverMediaIndex(null);
                          }
                        }}
                      >
                        {mediaItems.map((item, idx) => {
                          const isDragging = draggedMediaIndex === idx;
                          const isOver = dragOverMediaIndex === idx;
                          const isCover = idx === 0;

                          return (
                            <div
                              key={item.id}
                              className={`bento-media-card ${isCover ? 'is-cover' : ''} ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-drag-over' : ''}`}
                              draggable={true}
                              onDragStart={(e) => handleMediaDragStart(e, idx)}
                              onDragEnter={(e) => handleMediaDragEnter(e, idx)}
                              onDragOver={(e) => handleMediaDragOver(e, idx)}
                              onDrop={(e) => handleMediaDrop(e, idx)}
                              onDragEnd={handleMediaDragEnd}
                              title="Drag to reorder"
                            >
                              {/* Position Badge */}
                              <div className={`bento-pos-badge ${isCover ? 'cover' : ''}`}>
                                {isCover ? (
                                  <>
                                    <Star size={11} fill="#ffffff" />
                                    <span>Cover</span>
                                  </>
                                ) : (
                                  <span>#{idx + 1}</span>
                                )}
                              </div>

                              {/* Media Thumbnail */}
                              {item.isVideo || isVideoMedia(item.previewUrl) ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0f172a' }}>
                                  {item.thumbUrl ? (
                                    <img
                                      src={item.thumbUrl}
                                      alt="Video thumbnail"
                                      className="bento-media-img"
                                    />
                                  ) : (
                                    <video
                                      src={item.previewUrl}
                                      muted
                                      preload="metadata"
                                      className="bento-media-img"
                                    />
                                  )}
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                    <Play size={22} fill="#ffffff" color="#ffffff" />
                                  </div>
                                </div>
                              ) : (
                                <SafeImage
                                  src={item.serverUrl || item.previewUrl || item.thumbUrl}
                                  alt={`Media ${idx + 1}`}
                                  className="bento-media-img"
                                  fallbackText={`Photo #${idx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              )}

                              {/* Uploading / Error indicator */}
                              {item.uploading && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 600 }}>
                                  Uploading...
                                </div>
                              )}
                              {item.error && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,38,38,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 600 }}>
                                  Failed
                                </div>
                              )}

                              {/* Hover Overlay with Action Buttons */}
                              <div className="bento-card-overlay" onMouseDown={(e) => e.stopPropagation()}>
                                <div className="bento-overlay-top">
                                  <button
                                    type="button"
                                    className="bento-action-btn"
                                    title="View full size"
                                    onClick={() => setLightboxIndex(idx)}
                                  >
                                    <ZoomIn size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="bento-action-btn"
                                    title="Replace photo"
                                    onClick={() => {
                                      editItemIndexRef.current = idx;
                                      fileInputRef.current?.click();
                                    }}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="bento-action-btn delete"
                                    title="Delete photo"
                                    onClick={() => handleRemoveMediaItem(item.id)}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                <div className="bento-overlay-bottom">
                                  {!isCover && (
                                    <button
                                      type="button"
                                      className="bento-action-btn cover-btn"
                                      title="Set as Facebook cover photo (#1)"
                                      onClick={(e) => handleMakeCover(e, idx)}
                                    >
                                      <Star size={11} fill="#2563eb" />
                                      <span>Make Cover</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Card Tile inside Grid */}
                        <div
                          className="bento-add-card"
                          onClick={() => {
                            editItemIndexRef.current = null;
                            fileInputRef.current?.click();
                          }}
                          title="Upload more photos or videos"
                        >
                          <Images size={22} />
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>+ Add Photo</span>
                        </div>
                      </div>
                    )}

                    {/* View Mode 2: Classic List */}
                    {mediaViewMode === 'list' && mediaItems.length > 0 && (
                      <div
                        className={`meta-media-items-list ${draggedMediaIndex !== null ? 'is-reordering' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            dragOverItemIndexRef.current = null;
                            setDragOverMediaIndex(null);
                          }
                        }}
                      >
                        {mediaItems.map((item, idx) => {
                          const isDragging = draggedMediaIndex === idx;
                          const isOver = dragOverMediaIndex === idx;

                          return (
                            <div
                              key={item.id}
                              className={`meta-media-row-item ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-drag-over' : ''}`}
                              draggable={true}
                              onDragStart={(e) => handleMediaDragStart(e, idx)}
                              onDragEnter={(e) => handleMediaDragEnter(e, idx)}
                              onDragOver={(e) => handleMediaDragOver(e, idx)}
                              onDrop={(e) => handleMediaDrop(e, idx)}
                              onDragEnd={handleMediaDragEnd}
                            >
                              <div className="meta-media-row-left">
                                <div className="meta-media-drag-handle" title="Drag to reorder">
                                  <GripVertical size={18} style={{ pointerEvents: 'none' }} />
                                </div>

                                <div
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#475569',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                  title={`Photo position #${idx + 1}`}
                                >
                                  {idx + 1}
                                </div>

                                {item.isVideo || isVideoMedia(item.previewUrl) ? (
                                  <div className="meta-media-square-thumb-wrap">
                                    {item.thumbUrl ? (
                                      <img
                                        src={item.thumbUrl}
                                        alt="Video thumbnail"
                                        draggable={false}
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                                      />
                                    ) : (
                                      <video
                                        src={item.previewUrl}
                                        muted
                                        preload="metadata"
                                        playsInline
                                      />
                                    )}
                                    <div className="meta-media-thumb-play-overlay">
                                      <Play size={14} fill="#ffffff" color="#ffffff" />
                                    </div>
                                  </div>
                                ) : (
                                  <SafeImage
                                    src={item.serverUrl || item.previewUrl || item.thumbUrl}
                                    alt="Media item"
                                    className="meta-media-square-thumb"
                                    fallbackText={`Photo #${idx + 1}`}
                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }}
                                    onClick={() => setLightboxIndex(idx)}
                                  />
                                )}
                                <div>
                                  <div className="meta-media-dim-label">
                                    {item.dimensions || 'Image'}
                                  </div>
                                  <div style={{ fontSize: '11px', color: item.uploading ? '#1877f2' : item.error ? '#dc2626' : '#16a34a' }}>
                                    {item.uploading
                                      ? (item.isVideo ? '⚡ Optimizing & Uploading...' : 'Uploading...')
                                      : item.error
                                        ? (item.errorMessage || 'Upload failed')
                                        : '✓ Ready'}
                                  </div>
                                </div>
                              </div>

                              <div className="meta-media-row-actions" onMouseDown={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="meta-media-icon-btn"
                                  title="View full size"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={() => setLightboxIndex(idx)}
                                >
                                  <ZoomIn size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="meta-media-icon-btn"
                                  title="Edit / Change photo"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMediaItem(item.id);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {mediaItems.length === 0 && (
                      <div
                        onClick={() => {
                          editItemIndexRef.current = null;
                          fileInputRef.current?.click();
                        }}
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
                          Click to choose photos or video to upload
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Supports multiple photos, MP4, MOV, JPG, PNG
                        </span>
                      </div>
                    )}

                    {/* Add photo/video button for list mode */}
                    {mediaViewMode === 'list' && (
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
                    )}
                  </div>
                )}
              </>
            ) : (
              mediaItems.length > 0 ? (
                <div className="meta-media-preview-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SafeImage
                      src={mediaItems[0]?.thumbUrl || mediaItems[0]?.previewUrl}
                      poster={mediaItems[0]?.thumbUrl}
                      alt="Published media"
                      fallbackText="Attached media"
                      className="meta-media-thumb"
                      style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#050505' }}>
                        Published Media {mediaItems.length > 1 ? `(${mediaItems.length} photos)` : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: '#65676b' }}>Cannot be modified after publish</div>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>

          {/* Video Thumbnail Picker (Meta Business Suite Style) */}
          {!isPublished && hasVideo && firstVideoItem && (
            <VideoThumbnailPicker
              videoSource={firstVideoItem.file || firstVideoItem.previewUrl || firstVideoItem.serverUrl}
              currentThumbUrl={firstVideoItem.thumbUrl || videoThumbnailUrl}
              onThumbnailSelect={handleThumbnailSelect}
            />
          )}

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

            <div className="meta-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <PageAvatar page={currentPage} size={38} className="meta-feed-avatar" />
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
            {mediaSource === 'product' && (trackingTarget === 'brand' ? selectedBrand?.image_url : selectedProduct?.image_url) ? (
              <div className="meta-feed-media">
                <img
                  src={trackingTarget === 'brand' ? selectedBrand.image_url : selectedProduct.image_url}
                  alt="Post preview"
                  className="meta-feed-image"
                />
              </div>
            ) : (mediaSource === 'upload' || isPublished) && mediaItems.length > 0 ? (
              mediaItems.length === 1 ? (
                (mediaItems[0].isVideo || isVideoMedia(mediaItems[0].previewUrl)) ? (
                  <div className="meta-feed-media" style={{ background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <video
                      src={mediaItems[0].previewUrl}
                      poster={mediaItems[0].thumbUrl || undefined}
                      controls
                      playsInline
                      className="meta-feed-video"
                    />
                  </div>
                ) : (
                  <div className="meta-feed-media">
                    <img
                      src={mediaItems[0].previewUrl}
                      alt="Post preview"
                      className="meta-feed-image"
                    />
                  </div>
                )
              ) : mediaItems.length === 2 ? (
                <div className="meta-feed-multi-grid grid-2">
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[0], 0)}
                  </div>
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[1], 1)}
                  </div>
                </div>
              ) : mediaItems.length === 3 ? (
                <div className="meta-feed-multi-grid grid-3">
                  <div className="meta-feed-grid-item span-2-rows">
                    {renderFeedGridItem(mediaItems[0], 0)}
                  </div>
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[1], 1)}
                  </div>
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[2], 2)}
                  </div>
                </div>
              ) : (
                <div className="meta-feed-multi-grid grid-4">
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[0], 0)}
                  </div>
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[1], 1)}
                  </div>
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[2], 2)}
                  </div>
                  <div className="meta-feed-grid-item">
                    {renderFeedGridItem(mediaItems[3], 3)}
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

      {/* Lightbox Modal for inspecting photos full-screen */}
      {lightboxIndex !== null && mediaItems[lightboxIndex] && (
        <div className="bento-lightbox-backdrop" onClick={() => setLightboxIndex(null)}>
          <div className="bento-lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              Photo {lightboxIndex + 1} of {mediaItems.length}
              {lightboxIndex === 0 && <span style={{ marginLeft: '8px', color: '#60a5fa' }}>(Facebook Cover)</span>}
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px' }}
            >
              <X size={22} />
            </button>
          </div>

          <div className="bento-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            {mediaItems[lightboxIndex].isVideo || isVideoMedia(mediaItems[lightboxIndex].previewUrl) ? (
              <video
                src={mediaItems[lightboxIndex].previewUrl}
                controls
                autoPlay
                className="bento-lightbox-img"
              />
            ) : (
              <SafeImage
                src={mediaItems[lightboxIndex].serverUrl || mediaItems[lightboxIndex].previewUrl || mediaItems[lightboxIndex].thumbUrl}
                alt={`Photo ${lightboxIndex + 1}`}
                className="bento-lightbox-img"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              />
            )}
          </div>

          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                className="bento-lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
                }}
                title="Previous photo (Left arrow)"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="bento-lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
                }}
                title="Next photo (Right arrow)"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
