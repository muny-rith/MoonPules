import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Calendar,
  Clock,
  Send,
  AlertCircle,
  Edit2,
  Check,
  ChevronDown,
  Globe,
  Sparkles,
  Layers,
} from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import * as api from '../api/postTrackerApi';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { resolveMediaUrl, isVideoMedia } from '../../../shared/utils/mediaUrl';
import { MetaSchedulePicker } from './MetaSchedulePicker';

export const DuplicatePostModal = ({
  isOpen,
  onClose,
  post,
  onSuccess,
  onCustomize,
}) => {
  const [pages, setPages] = useState([]);
  const [selectedPageIds, setSelectedPageIds] = useState([]);
  const [publishMode, setPublishMode] = useState('schedule'); // 'schedule' | 'now'
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isSubmittingRef = useRef(false);

  // Initialize defaults whenever a post is opened
  useEffect(() => {
    if (!isOpen || !post) return;

    setError(null);
    setSubmitting(false);
    isSubmittingRef.current = false;

    // Default to tomorrow at the same time or next 2 hours
    const defaultTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const localIso = new Date(defaultTime.getTime() - defaultTime.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduledDateTime(localIso);
    setPublishMode('schedule');

    // Load available Facebook pages and select ALL accounts by default
    api.fetchPages()
      .then((data) => {
        setPages(data || []);
        if (data && data.length > 0) {
          setSelectedPageIds(data.map((p) => String(p.id)));
        } else if (post.page_id) {
          setSelectedPageIds([String(post.page_id)]);
        }
      })
      .catch((err) => {
        console.error('Failed to load pages in duplicate modal:', err);
      });
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const handleTogglePage = (pId) => {
    const strId = String(pId);
    setSelectedPageIds((prev) => {
      if (prev.includes(strId)) {
        if (prev.length === 1) return prev; // keep at least 1 account
        return prev.filter((id) => id !== strId);
      } else {
        return [...prev, strId];
      }
    });
  };

  const handleConfirmDuplicate = async () => {
    if (isSubmittingRef.current || submitting) {
      console.warn('Duplicate post in progress. Ignoring duplicate click.');
      return;
    }
    if (selectedPageIds.length === 0) {
      setError('Please select at least one Facebook page to post to.');
      return;
    }
    if (publishMode === 'schedule' && !scheduledDateTime) {
      setError('Please choose a valid date and time to schedule.');
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const scheduledIso = publishMode === 'schedule' ? new Date(scheduledDateTime).toISOString() : null;
      const uniquePageIds = Array.from(new Set(selectedPageIds));

      // Post/Schedule to each selected page in parallel (deduplicated)
      await Promise.all(
        uniquePageIds.map((pId) =>
          api.createPost({
            mode: 'schedule',
            tracking_type: post.tracking_type || (post.brand_id && !post.product_id ? 'brand' : 'product'),
            product_id: post.product_id ? parseInt(post.product_id, 10) : null,
            brand_id: post.brand_id ? parseInt(post.brand_id, 10) : null,
            page_id: parseInt(pId, 10),
            message: post.message || '',
            media_url: post.media_url || null,
            thumbnail_url: post.thumbnail_url || null,
            media_type: post.media_type || (post.media_url ? (isVideoMedia(post.media_url) ? 'video' : 'photo') : 'status'),
            publish_now: publishMode === 'now',
            scheduled_time: scheduledIso,
            content_cost: parseFloat(post.content_cost) || 0,
            ad_spend: parseFloat(post.ad_spend) || 0,
            attribution_window_days: parseInt(post.attribution_window_days, 10) || 7,
          })
        )
      );

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to duplicate post:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to schedule duplicate post.');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const targetTitle = post.brand_name || post.product_name || `Post #${post.id}`;
  const resolvedMedia = resolveMediaUrl(post.media_url || post.product_image);

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          margin: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.25s ease-out',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderBottom: '1px solid #bfdbfe',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)',
                color: '#2563eb',
                flexShrink: 0,
              }}
            >
              <Copy size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e3a8a' }}>
                Duplicate & Reschedule Post
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#3b82f6' }}>
                Repost this poster again to one or more Facebook pages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px 30px', overflow: 'visible', display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
          
          {/* Post Summary Preview Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#e2e8f0',
                flexShrink: 0,
              }}
            >
              <SafeImage
                src={post.thumbnail_url || resolvedMedia}
                alt={targetTitle}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                fallbackText="Media"
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {targetTitle}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '3px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.4',
                }}
              >
                {post.message || '(No caption text)'}
              </div>
            </div>
          </div>

          {/* Target Account(s) Selector - Idea C: Cross-Account Re-posting */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Target Facebook Page(s)
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {selectedPageIds.length} selected
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              {pages.map((p) => {
                const isSelected = selectedPageIds.includes(String(p.id));
                return (
                  <div
                    key={p.id}
                    onClick={() => handleTogglePage(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <FaFacebook size={16} color="#1877F2" />
                      <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: '#0f172a' }}>
                        {p.page_name}
                      </span>
                    </div>
                    {String(p.id) === String(post.page_id) && (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        Original
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule Mode & DateTime Picker - Idea A: Quick Schedule */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
              Publishing Schedule
            </label>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setPublishMode('schedule')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: publishMode === 'schedule' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: publishMode === 'schedule' ? '#eff6ff' : '#ffffff',
                  color: publishMode === 'schedule' ? '#1d4ed8' : '#64748b',
                }}
              >
                <Clock size={15} /> Schedule for Later
              </button>
              <button
                type="button"
                onClick={() => setPublishMode('now')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: publishMode === 'now' ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                  backgroundColor: publishMode === 'now' ? '#f0fdf4' : '#ffffff',
                  color: publishMode === 'now' ? '#15803d' : '#64748b',
                }}
              >
                <Send size={15} /> Publish Now
              </button>
            </div>

            {publishMode === 'schedule' && (
              <div style={{ marginTop: '8px' }}>
                <MetaSchedulePicker
                  value={scheduledDateTime}
                  onChange={(newIso) => setScheduledDateTime(newIso)}
                  placement="top"
                />
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '12.5px',
              }}
            >
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer with 2 Pathways */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Option: Customize in Full Editor */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onCustomize) onCustomize(post);
            }}
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit2 size={14} /> Customize in Editor
          </button>

          {/* Option: Direct 1-Click Schedule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDuplicate}
              disabled={submitting || selectedPageIds.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
                opacity: submitting || selectedPageIds.length === 0 ? 0.7 : 1,
              }}
            >
              <Copy size={14} />
              <span>
                {submitting
                  ? 'Scheduling...'
                  : publishMode === 'now'
                    ? `Publish to ${selectedPageIds.length} Page${selectedPageIds.length > 1 ? 's' : ''}`
                    : `Schedule Duplicate (${selectedPageIds.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
