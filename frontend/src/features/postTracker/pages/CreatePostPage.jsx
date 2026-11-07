import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as api from '../api/postTrackerApi';
import * as productService from '../../product/services/productService';
import { usePages } from '../../../shared/hooks/queries';
import { useSessionDraft } from '../../../shared/hooks/useSessionDraft';
import { useToast } from '../../../shared/context/ToastContext';
import { parseFbPostUrl } from '../utils/parseFbPostUrl';
import { ProductPicker } from '../../product/component/ProductPicker';
import { BrandPicker } from '../../product/component/BrandPicker';
import { usePostTracker } from '../hooks/usePostTracker';
import { invalidatePostAndMissionCaches } from '../../../shared/utils/cacheSync';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Copy,
  Package,
  Award,
  GripVertical,
  Play,
  Video,
  Star,
  LayoutGrid,
  List,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { MetaEmojiPicker } from '../components/MetaEmojiPicker';
import { MetaSchedulePicker } from '../components/MetaSchedulePicker';
import { ContactFooterModal } from '../components/ContactFooterModal';
import { AddHashtagsModal } from '../components/AddHashtagsModal';
import { VideoThumbnailPicker } from '../components/VideoThumbnailPicker';
import { FacebookFeedPreview } from '../components/FacebookFeedPreview';
import { useWheelIsolation } from '../hooks/useWheelIsolation';
import '../postTracker.css';
import { Select, MultiSelect, Input, Button } from '../../../shared/components/ui';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { getMediaMetadata, isVideoMedia, resolveMediaUrl } from '../../../shared/utils/mediaUrl';
import { processMediaFileForUpload } from '../../../shared/utils/videoOptimizer';

const PageAvatar = ({ page, size = 20, className = 'meta-page-avatar-img' }) => {
  const [imgError, setImgError] = useState(false);
  const name = page?.page_name || 'Facebook Page';
  const initial = name.charAt(0).toUpperCase();

  if (page?.picture_url && !imgError) {
    return (
      <img
        src={page.picture_url}
        alt={name}
        className={className}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
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

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const searchParams = new URLSearchParams(location.search);
  const dateParam = searchParams.get('date');
  const isFromPlanner = location.pathname.startsWith('/planner') || location.search.includes('from=planner');
  const returnPath = location.state?.from || (isFromPlanner ? '/planner' : '/tasks');
  const duplicatePost = location.state?.duplicatePost || null;
  const { addPost } = usePostTracker();

  // Layout states
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [tabMode, setTabMode] = useState('direct'); // 'direct' | 'legacy'
  const textCardRef = useWheelIsolation();

  // Data states
  const { data: pages = [] } = usePages();
  const [selectedPageIds, setSelectedPageIds] = useState([]);
  const hasInitializedPages = useRef(false);

  useEffect(() => {
    if (pages.length > 0 && !hasInitializedPages.current) {
      hasInitializedPages.current = true;
      setSelectedPageIds(pages.map((p) => String(p.id)));
    }
  }, [pages]);

  const pageMultiOptions = useMemo(() => {
    return pages.map((p) => ({
      value: String(p.id),
      label: p.page_name,
      icon: <PageAvatar page={p} size={18} />,
    }));
  }, [pages]);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const pageDropdownRef = useRef(null);

  const [productId, setProductId] = useState('');
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

    // Attribution Target: 'product' | 'brand'
  const [trackingTarget, setTrackingTarget] = useState(() => (location.state?.prefillBrandId ? 'brand' : 'product'));
  const [brandId, setBrandId] = useState(() => (location.state?.prefillBrandId ? String(location.state.prefillBrandId) : ''));
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Costs
  const [contentCost, setContentCost] = useState('');
  const [adSpend, setAdSpend] = useState('');
  const [attributionWindow, setAttributionWindow] = useState(7);

  // Content (Persisted in sessionStorage across accidental refreshes)
  const [message, setMessage, clearMessageDraft] = useSessionDraft('moonpulse_create_post_message_draft', '');
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaSource, setMediaSource] = useState('upload'); // 'upload' | 'product' | 'none'
  const [mediaItems, setMediaItems] = useState([]); // [{ id, file, previewUrl, serverUrl, dimensions, uploading }]
  const [mediaViewMode, setMediaViewMode] = useState('list'); // 'grid' | 'list' (default is 'list')
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [videoCustomThumb, setVideoCustomThumb] = useState(null); // { url, file, type }
  const [draggedMediaIndex, setDraggedMediaIndex] = useState(null);
  const [dragOverMediaIndex, setDragOverMediaIndex] = useState(null);
  const dragItemIndexRef = useRef(null);
  const dragOverItemIndexRef = useRef(null);
  const editItemIndexRef = useRef(null);
  const initialDateStr = dateParam || location.state?.prefillDate || '';
  const [publishMode, setPublishMode] = useState(() => (initialDateStr || isFromPlanner ? 'schedule' : 'now'));
  const [scheduledDateTime, setScheduledDateTime] = useState(() => (initialDateStr ? (initialDateStr.length === 10 ? `${initialDateStr}T09:00` : initialDateStr.slice(0, 16)) : ''));
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
  const isSubmittingRef = useRef(false);

  // Copy Text
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyText = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

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
    loadProducts();
    loadContactFooter();

    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setPublishMode('schedule');
      if (dateParam.length === 10) {
        setScheduledDateTime(`${dateParam}T09:00`);
      } else {
        setScheduledDateTime(dateParam.slice(0, 16));
      }
    } else {
      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
      const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledDateTime(localIso);
    }
  }, [location.search]);

  useEffect(() => {
    if (productId && productsList.length > 0) {
      const match = productsList.find((p) => String(p.product_id) === String(productId));
      setSelectedProduct(match || null);
    } else {
      setSelectedProduct(null);
    }
  }, [productId, productsList]);

  // Handle pre-filling from Duplicated Post (Idea A & C)
  useEffect(() => {
    if (!duplicatePost) return;

    if (duplicatePost.message) setMessage(duplicatePost.message);
    if (duplicatePost.content_cost !== undefined && duplicatePost.content_cost !== null) setContentCost(String(duplicatePost.content_cost));
    if (duplicatePost.ad_spend !== undefined && duplicatePost.ad_spend !== null) setAdSpend(String(duplicatePost.ad_spend));
    if (duplicatePost.attribution_window_days) setAttributionWindow(duplicatePost.attribution_window_days);

    // Activate schedule mode for duplicate post
    setPublishMode('schedule');
    if (duplicatePost.scheduled_time) {
      try {
        const d = new Date(duplicatePost.scheduled_time);
        if (d.getTime() > Date.now()) {
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setScheduledDateTime(localIso);
        } else {
          const nextHour = new Date(Date.now() + 60 * 60 * 1000);
          const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setScheduledDateTime(localIso);
        }
      } catch {
        const nextHour = new Date(Date.now() + 60 * 60 * 1000);
        const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setScheduledDateTime(localIso);
      }
    } else {
      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
      const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledDateTime(localIso);
    }

    const isBrand = duplicatePost.tracking_type === 'brand' || (!duplicatePost.product_id && duplicatePost.brand_id);
    setTrackingTarget(isBrand ? 'brand' : 'product');
    if (duplicatePost.brand_id) setBrandId(String(duplicatePost.brand_id));
    if (duplicatePost.product_id) setProductId(String(duplicatePost.product_id));

    // Default to selecting all Facebook accounts when duplicating
    if (pages.length > 0) {
      setSelectedPageIds(pages.map((p) => String(p.id)));
    }

    if (duplicatePost.media_url) {
      setMediaSource('upload');
      let urls = [];
      try {
        if (typeof duplicatePost.media_url === 'string' && duplicatePost.media_url.startsWith('[')) {
          urls = JSON.parse(duplicatePost.media_url);
        } else {
          urls = [duplicatePost.media_url];
        }
      } catch {
        urls = [duplicatePost.media_url];
      }

      const items = urls.map((url, idx) => {
        const isVid = duplicatePost.media_type === 'video' || isVideoMedia(url);
        const resolved = resolveMediaUrl(url);
        const thumb = duplicatePost.thumbnail_url ? resolveMediaUrl(duplicatePost.thumbnail_url) : (isVid ? resolved : null);
        return {
          id: `dup_${Date.now()}_${idx}`,
          file: null,
          previewUrl: resolved,
          serverUrl: url,
          isVideo: isVid,
          thumbUrl: thumb,
          dimensions: isVid ? 'Video' : 'Image',
          uploading: false,
        };
      });
      setMediaItems(items);

      if (duplicatePost.thumbnail_url) {
        setVideoCustomThumb({
          url: resolveMediaUrl(duplicatePost.thumbnail_url),
          file: null,
          type: 'duplicate',
        });
      }
    }
  }, [duplicatePost]);

  useEffect(() => {
    if (tabMode === 'legacy' && legacyMode === 'pick' && selectedPageIds.length > 0) {
      loadRecentPosts();
    }
  }, [tabMode, legacyMode, selectedPageIds]);

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

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    setMediaSource('upload');

    const uploadSingleMediaItem = async (targetId, file, isVideo) => {
      try {
        const processed = await processMediaFileForUpload(file, isVideo, {
          onProgress: ({ percent, text }) => {
            setMediaItems((prev) =>
              prev.map((it) =>
                it.id === targetId ? { ...it, uploadProgress: percent, statusText: text } : it
              )
            );
          },
        });

        setMediaItems((prev) =>
          prev.map((it) =>
            it.id === targetId ? { ...it, uploadProgress: 100, statusText: '⚡ Uploading...' } : it
          )
        );

        const res = await api.uploadPostImage(processed.file);

        setMediaItems((prev) =>
          prev.map((it) =>
            it.id === targetId
              ? {
                  ...it,
                  file: processed.file,
                  serverUrl: res.url,
                  previewUrl: res.url,
                  thumbUrl: res.url,
                  uploading: false,
                  uploadProgress: 100,
                  statusText:
                    processed.savedPct > 0
                      ? `✓ Ready (Saved ${processed.savedPct}%)`
                      : '✓ Ready',
                }
              : it
          )
        );
      } catch (err) {
        console.error('Failed to upload media:', err);
        const errMsg = err?.response?.data?.error || err.message || 'Upload failed';
        setMediaItems((prev) =>
          prev.map((it) =>
            it.id === targetId
              ? { ...it, uploading: false, error: true, errorMessage: errMsg, statusText: 'Upload failed' }
              : it
          )
        );
      }
    };

    if (editItemIndexRef.current !== null) {
      const index = editItemIndexRef.current;
      editItemIndexRef.current = null;

      const firstFile = files[0];
      const firstPreviewUrl = URL.createObjectURL(firstFile);
      const firstMeta = await getMediaMetadata(firstFile);
      const firstItemId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const replacementItem = {
        id: firstItemId,
        file: firstFile,
        previewUrl: firstPreviewUrl,
        thumbUrl: firstMeta.thumbUrl || firstPreviewUrl,
        isVideo: firstMeta.isVideo,
        serverUrl: '',
        dimensions: firstMeta.dimensions,
        uploading: true,
        uploadProgress: 0,
        statusText: firstMeta.isVideo ? '⚡ Optimizing video...' : 'Uploading...',
      };

      const additionalItems = await Promise.all(
        files.slice(1).map(async (file) => {
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
            uploadProgress: 0,
            statusText: meta.isVideo ? '⚡ Optimizing video...' : 'Uploading...',
          };
        })
      );

      setMediaItems((prev) => {
        const updated = [...prev];
        updated.splice(index, 1, replacementItem, ...additionalItems);
        return updated;
      });

      // Upload replacement item
      uploadSingleMediaItem(firstItemId, firstFile, firstMeta.isVideo);

      // Upload additional items
      for (const item of additionalItems) {
        uploadSingleMediaItem(item.id, item.file, item.isVideo);
      }

      return;
    }

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
          uploadProgress: 0,
          statusText: meta.isVideo ? '⚡ Optimizing video...' : 'Uploading...',
        };
      })
    );

    setMediaItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      uploadSingleMediaItem(item.id, item.file, item.isVideo);
    }
  };

  const handleRemoveMediaItem = (itemId) => {
    setMediaItems((prev) => prev.filter((it) => it.id !== itemId));
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

  const handleSubmit = async () => {
    if (isSubmittingRef.current || submitting) {
      console.warn('Post creation already in progress. Ignoring duplicate click.');
      return;
    }
    const isTargetValid = trackingTarget === 'brand' ? Boolean(brandId) : Boolean(productId);
    if (!isTargetValid || selectedPageIds.length === 0) {
      setSubmitError(`Please select ${trackingTarget === 'brand' ? 'a Brand' : 'a Product'} and at least one Facebook Page.`);
      return;
    }
    isSubmittingRef.current = true;
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
            isSubmittingRef.current = false;
            setSubmitting(false);
            return;
          }
          if (mediaItems.some((m) => m.error || !m.serverUrl)) {
            setSubmitError('One or more media items failed to upload. Please remove or re-upload them.');
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
        const hasVideo = mediaSource === 'upload' && mediaItems.some((m) => m.isVideo || isVideoMedia(m.previewUrl) || isVideoMedia(m.serverUrl));
        const finalMediaType = hasVideo ? 'video' : (finalMediaUrl ? 'photo' : 'status');

        let finalThumbnailUrl = null;
        if (hasVideo && videoCustomThumb) {
          if (videoCustomThumb.file) {
            try {
              const thumbRes = await api.uploadPostImage(videoCustomThumb.file);
              finalThumbnailUrl = thumbRes.url;
            } catch (thumbErr) {
              console.warn('Failed to upload custom video thumbnail:', thumbErr);
            }
          } else if (videoCustomThumb.url && !videoCustomThumb.url.startsWith('data:')) {
            finalThumbnailUrl = videoCustomThumb.url;
          }
        }

        // Post/Schedule to all selected Facebook pages in parallel (deduplicated)
        const uniquePageIds = Array.from(new Set(selectedPageIds));
        await Promise.all(
          uniquePageIds.map((pId) =>
            api.createPost({
              mode: 'schedule',
              tracking_type: trackingTarget,
              product_id: targetProductId,
              brand_id: targetBrandId,
              page_id: parseInt(pId, 10),
              message: message.trim(),
              media_url: finalMediaUrl,
              thumbnail_url: finalThumbnailUrl,
              media_type: finalMediaType,
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
          isSubmittingRef.current = false;
          setSubmitting(false);
          return;
        }
        const targetPageId = selectedPageIds[0];
        if (!targetPageId) {
          setSubmitError('Please select a Facebook Page.');
          isSubmittingRef.current = false;
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

      clearMessageDraft();
      // Ensure all cache tiers (TanStack Query, session, modules) are instantly refreshed
      await invalidatePostAndMissionCaches();

      const successMessage = publishMode === 'schedule'
        ? 'Post scheduled successfully!'
        : 'Post created and tracked successfully!';
      toast.success(successMessage);
      navigate(returnPath);
    } catch (err) {
      console.error('Failed to create/schedule post:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to submit post';
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate(returnPath);

  // Resolved active Facebook Page(s)
  const selectedPages = pages.filter((p) => selectedPageIds.includes(String(p.id)));
  const primaryPage = selectedPages[0] || pages[0] || null;
  const pageDisplayName = primaryPage ? primaryPage.page_name : 'Mae Khon Baby Mart';
  const filteredPages = pages.filter((p) =>
    (p.page_name || '').toLowerCase().includes(pageSearchQuery.toLowerCase())
  );

  // Video detection and thumbnail handler
  const firstVideoIndex = mediaItems.findIndex(
    (m) => m.isVideo || isVideoMedia(m.previewUrl) || isVideoMedia(m.serverUrl)
  );
  const firstVideoItem = firstVideoIndex !== -1 ? mediaItems[firstVideoIndex] : null;
  const hasVideo = Boolean(firstVideoItem);

  const handleThumbnailSelect = (thumbData) => {
    setVideoCustomThumb(thumbData);
    if (firstVideoIndex !== -1) {
      setMediaItems((prev) =>
        prev.map((item, idx) =>
          idx === firstVideoIndex ? { ...item, thumbUrl: thumbData.url } : item
        )
      );
    }
  };

  return (
    <div className="page-container meta-post-page">
      {/* ── Top Navigation Bar ── */}
      <div className="meta-top-nav">
        <div className="meta-top-nav-left">
          <button type="button" onClick={handleCancel} className="meta-back-btn" title={isFromPlanner ? "Back to planner" : "Back to tasks"}>
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

            <div style={{ marginTop: '12px' }}>
              {tabMode === 'direct' ? (
                <MultiSelect
                  options={pageMultiOptions}
                  selectedValues={selectedPageIds}
                  onChange={(newVals) => setSelectedPageIds(newVals)}
                  placeholder="Select Facebook accounts to publish or schedule..."
                  maxTagsVisible={2}
                />
              ) : (
                <Select
                  options={pageMultiOptions}
                  value={selectedPageIds[0] || ''}
                  onChange={(val) => setSelectedPageIds(val ? [val] : [])}
                  placeholder="Select Facebook page..."
                />
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
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <Button
                type="button"
                variant={trackingTarget === 'product' ? 'primary' : 'outline'}
                size="sm"
                icon={<Package size={15} />}
                onClick={() => setTrackingTarget('product')}
              >
                Single Product
              </Button>
              <Button
                type="button"
                variant={trackingTarget === 'brand' ? 'primary' : 'outline'}
                size="sm"
                icon={<Award size={15} />}
                onClick={() => setTrackingTarget('brand')}
              >
                Entire Brand / Live Stream
              </Button>
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
                  onClick={() => { editItemIndexRef.current = null; setMediaSource('upload'); fileInputRef.current?.click(); }}
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
                onCancel={() => { editItemIndexRef.current = null; }}
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

              {/* Active Media: Custom Upload (Meta Multi-Upload List / Bento Grid) */}
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
                          className={`bento-toggle-btn ${mediaViewMode === 'list' ? 'active' : ''}`}
                          onClick={() => setMediaViewMode('list')}
                          title="List view"
                        >
                          <List size={13} />
                          <span>List</span>
                        </button>
                        <button
                          type="button"
                          className={`bento-toggle-btn ${mediaViewMode === 'grid' ? 'active' : ''}`}
                          onClick={() => setMediaViewMode('grid')}
                          title="Grid gallery view"
                        >
                          <LayoutGrid size={13} />
                          <span>Grid</span>
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
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 600, padding: '8px', textAlign: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>{item.statusText || 'Uploading...'}</span>
                                </div>
                                {typeof item.uploadProgress === 'number' && item.uploadProgress > 0 && item.uploadProgress < 100 && (
                                  <div style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${item.uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s ease-out' }} />
                                  </div>
                                )}
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
                              {/* Drag Handle */}
                              <div
                                className="meta-media-drag-handle"
                                title="Drag to reorder"
                              >
                                <GripVertical size={18} style={{ pointerEvents: 'none' }} />
                              </div>

                              {/* Order Badge */}
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
                                <div style={{ fontSize: '11px', color: item.uploading ? '#1877f2' : item.error ? '#dc2626' : '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  {item.uploading && <Loader2 size={12} className="animate-spin" />}
                                  <span>
                                    {item.uploading
                                      ? (item.statusText || (item.isVideo ? '⚡ Optimizing & Uploading...' : 'Uploading...'))
                                      : item.error
                                        ? (item.errorMessage || 'Upload failed')
                                        : (item.statusText || '✓ Ready')}
                                  </span>
                                </div>
                                {item.uploading && typeof item.uploadProgress === 'number' && item.uploadProgress > 0 && item.uploadProgress < 100 && (
                                  <div style={{ width: '90px', height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '3px' }}>
                                    <div style={{ width: `${item.uploadProgress}%`, height: '100%', background: '#1877f2', transition: 'width 0.2s ease-out' }} />
                                  </div>
                                )}
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
            </div>
          )}

          {/* Video Thumbnail Picker (Meta Business Suite Style) */}
          {tabMode === 'direct' && hasVideo && firstVideoItem && (
            <VideoThumbnailPicker
              videoSource={firstVideoItem.file || firstVideoItem.previewUrl || firstVideoItem.serverUrl}
              currentThumbUrl={firstVideoItem.thumbUrl || videoCustomThumb?.url}
              onThumbnailSelect={handleThumbnailSelect}
            />
          )}

          {/* 4. Card: Post details (Textarea + Action Toolbar) */}
          {tabMode === 'direct' && (
            <div className="meta-card" ref={textCardRef}>
              <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Text</span>
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
                  <Input
                    icon={<Link2 size={16} />}
                    placeholder="e.g. https://facebook.com/posts/12345 or {pageId}_{postId}"
                    value={postUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    isClearable
                    onClear={() => handleUrlChange('')}
                  />
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
                <Input
                  label="Content Cost ($)"
                  type="number"
                  value={contentCost}
                  onChange={(e) => setContentCost(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="meta-cost-field">
                <Input
                  label="Ad Spend ($)"
                  type="number"
                  value={adSpend}
                  onChange={(e) => setAdSpend(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="meta-cost-field">
                <Input
                  label="Attribution (Days)"
                  type="number"
                  value={attributionWindow}
                  onChange={(e) => setAttributionWindow(e.target.value)}
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

            <div className="meta-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={
                  submitting ||
                  !(trackingTarget === 'brand' ? Boolean(brandId) : Boolean(productId)) ||
                  selectedPageIds.length === 0 ||
                  (tabMode === 'legacy' && (legacyMode === 'pick' ? !selectedRecentPostId : !parsedPostId))
                }
              >
                {tabMode === 'direct' ? (
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
              </Button>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT COLUMN: Live Facebook Feed Preview Area
            ══════════════════════════════════════════════════ */}
        <FacebookFeedPreview
          previewDevice={previewDevice}
          primaryPage={primaryPage}
          selectedPages={selectedPages}
          pageDisplayName={pageDisplayName}
          publishMode={publishMode}
          scheduledDateTime={scheduledDateTime}
          message={message}
          mediaSource={mediaSource}
          mediaItems={mediaItems}
          trackingTarget={trackingTarget}
          selectedBrand={selectedBrand}
          selectedProduct={selectedProduct}
        />

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
