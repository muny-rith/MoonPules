import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../shared/components/ui/Modal/Modal';
import { Button } from '../../../shared/components/ui/Button/Button';
import { SafeImage } from '../../../shared/components/ui/SafeImage';
import { useToast } from '../../../shared/context/ToastContext';
import { invalidatePostAndMissionCaches } from '../../../shared/utils/cacheSync';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl';
import * as missionApi from '../api/missionApi';
import * as postTrackerApi from '../../postTracker/api/postTrackerApi';
import {
  Search,
  Check,
  Video,
  Image as ImageIcon,
  Radio,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { FaFacebook, FaTiktok } from 'react-icons/fa';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    return String(dateStr).slice(0, 10);
  } catch {
    return String(dateStr).slice(0, 10);
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
};

const isPostCompatibleWithSlot = (slotContentType, postMediaType) => {
  const sType = (slotContentType || '').toLowerCase();
  const mType = (postMediaType || '').toLowerCase();
  const isVideo = mType === 'video' || mType === 'reel';
  const isLive = mType === 'live';
  const isPhoto = mType === 'photo' || mType === 'image' || (!isVideo && !isLive);

  if (sType === 'live') return isLive;
  if (sType === 'video') return isVideo;
  if (sType === 'photo' || sType === 'poster') return isPhoto || isVideo;
  return true;
};

const getLocalDateKey = (rawDate) => {
  if (!rawDate) return '';
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return rawDate.trim();
  }
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const LinkExistingPostModal = ({
  isOpen,
  onClose,
  slot,
  onLinked,
  calendarSlots: externalSlots = null,
}) => {
  const { showSuccess, showError } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Calculate month boundaries for the target missed slot
  const slotDateInfo = useMemo(() => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    if (slot?.planned_date) {
      const cleanStr = String(slot.planned_date).slice(0, 10);
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
    }
    const lastDay = new Date(year, month, 0).getDate();
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const startOfMonth = `${year}-${pad(month)}-01T00:00:00`;
    const endOfMonth = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59`;
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    return { year, month, startOfMonth, endOfMonth, monthName };
  }, [slot?.planned_date]);

  // Load unassigned posts for the slot's brand (scoped to slot's month)
  useEffect(() => {
    if (!isOpen || !slot?.brand_id) {
      setPosts([]);
      setSelectedPostId(null);
      setSearchQuery('');
      return;
    }

    let cancelled = false;
    setLoading(true);

    const { year, month, startOfMonth, endOfMonth } = slotDateInfo;
    const fetchParams = {
      brandId: slot.brand_id,
      startDate: startOfMonth,
      endDate: endOfMonth,
      limit: 100,
    };

    Promise.all([
      postTrackerApi.fetchPosts(fetchParams, true),
      externalSlots && externalSlots.length > 0
        ? Promise.resolve(externalSlots)
        : missionApi.getCalendarSlots(slot.brand_id, month, year).catch(() => []),
    ])
      .then(([postData, slotsData]) => {
        if (cancelled) return;
        const list = Array.isArray(postData) ? postData : postData?.data || [];
        const rawSlots = Array.isArray(slotsData) ? slotsData : slotsData?.data || [];

        // 1. CRITICAL FIX: Scoped STRICTLY to the current brand!
        // External slots from BrandCalendarPage contains all 19 brands.
        // Slots of other brands must NEVER match or claim this brand's posts!
        const brandSlots = rawSlots.filter(
          (s) => !slot?.brand_id || String(s.brand_id || '') === String(slot.brand_id || '')
        );

        // 2. Map existing occupancy / links for posts
        const postOccupancy = new Map();

        // A. Explicit links from database for this brand
        brandSlots.forEach((s) => {
          if (s.id !== slot.id) {
            const pId = s.linked_post_id || s.linked_post?.id;
            if (pId) {
              postOccupancy.set(Number(pId), {
                slotId: s.id,
                plannedDate: s.planned_date || s.planned_date_str,
                isCompensated: s.is_compensated,
                brief: s.notes || s.contract_brief,
              });
            }
          }
        });

        // B. Dynamic date matching for unlinked slots of this brand
        const postsByDate = new Map();
        list.forEach((p) => {
          const pKey = getLocalDateKey(p.published_time || p.scheduled_time || p.created_at);
          if (pKey) {
            if (!postsByDate.has(pKey)) postsByDate.set(pKey, []);
            postsByDate.get(pKey).push(p);
          }
        });

        const sortedUnlinkedSlots = brandSlots
          .filter((s) => s.id !== slot.id && !s.linked_post_id && !s.linked_post?.id)
          .sort((a, b) => {
            const order = { live: 1, video: 2, photo: 3, poster: 3 };
            const oA = order[a.content_type?.toLowerCase()] || 3;
            const oB = order[b.content_type?.toLowerCase()] || 3;
            return oA - oB;
          });

        sortedUnlinkedSlots.forEach((s) => {
          const sDateKey = getLocalDateKey(s.planned_date || s.planned_date_str);
          if (!sDateKey) return;
          const dayPosts = postsByDate.get(sDateKey) || [];

          const match = dayPosts.find((p) => {
            if (postOccupancy.has(Number(p.id))) return false;
            if (p.status !== 'published' && p.status !== 'scheduled') return false;
            return isPostCompatibleWithSlot(s.content_type, p.media_type);
          });

          if (match) {
            postOccupancy.set(Number(match.id), {
              slotId: s.id,
              plannedDate: s.planned_date || s.planned_date_str,
              isDynamicMatch: true,
              brief: s.notes || s.contract_brief,
            });
          }
        });

        // C. Posts marked as compensation for another slot
        list.forEach((p) => {
          if (p.compensation_for_slot_id && p.compensation_for_slot_id !== slot.id) {
            if (!postOccupancy.has(Number(p.id))) {
              postOccupancy.set(Number(p.id), {
                slotId: p.compensation_for_slot_id,
                isCompensated: true,
              });
            }
          }
        });

        // STRICT EXCLUSION: Only show genuine unassigned/extra posts!
        // If a post is already fulfilling another mission slot, do NOT show it.
        const availablePosts = list.filter((p) => {
          if (slot.linked_post_id === p.id || p.compensation_for_slot_id === slot.id) return true;
          return !postOccupancy.has(Number(p.id));
        });

        // Sort newest first
        const sorted = availablePosts.slice().sort((a, b) => {
          const timeA = new Date(a.published_time || a.scheduled_time || a.created_at || 0).getTime();
          const timeB = new Date(b.published_time || b.scheduled_time || b.created_at || 0).getTime();
          return timeB - timeA;
        });

        setPosts(sorted);

        // Pre-select currently linked post if exists, or top available post
        if (slot.linked_post_id) {
          setSelectedPostId(slot.linked_post_id);
        } else if (sorted.length > 0) {
          setSelectedPostId(sorted[0].id);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          showError('Failed to load brand posts: ' + (err.message || 'Network error'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, slot?.brand_id, slot?.linked_post_id, slot?.id, slotDateInfo, externalSlots, showError]);

  // Filter posts by search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase().trim();
    return posts.filter((p) => {
      const msg = (p.message || '').toLowerCase();
      const fbId = String(p.fb_post_id || '').toLowerCase();
      const id = String(p.id);
      const page = String(p.page_name || '').toLowerCase();
      return msg.includes(q) || fbId.includes(q) || id.includes(q) || page.includes(q);
    });
  }, [posts, searchQuery]);

  const selectedPost = useMemo(() => {
    return posts.find((p) => p.id === selectedPostId) || null;
  }, [posts, selectedPostId]);

  const slotType = (slot?.content_type || '').toLowerCase();

  const handleAttach = async () => {
    if (!selectedPostId || !slot?.id || submitting) return;
    setSubmitting(true);
    try {
      // 1. Run the API call with minimum visual spinner feedback (~500ms) so user sees the button spinning
      const [res] = await Promise.all([
        missionApi.linkPostToSlot(slot.id, selectedPostId),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);

      const isSameDayMatch = res?.isSameDayMatch ?? (
        getLocalDateKey(selectedPost?.published_time || selectedPost?.scheduled_time || selectedPost?.created_at) ===
        getLocalDateKey(slot.planned_date_str || slot.planned_date)
      );
      const isCompensated = res?.isCompensated ?? (res?.slot?.is_compensated ?? !isSameDayMatch);
      const computedStatus = res?.slot?.computed_status || (isCompensated ? 'compensated' : 'completed');

      if (isSameDayMatch || !isCompensated) {
        showSuccess(`Post #${selectedPostId} linked as on-time fulfillment for Slot #${slot.id}!`);
      } else {
        showSuccess(`Post #${selectedPostId} linked as make-up for Slot #${slot.id}!`);
      }

      const updatedSlotData = res?.slot || {};
      const enrichedSlot = {
        ...slot,
        ...updatedSlotData,
        id: slot.id,
        brand_id: slot.brand_id || updatedSlotData.brand_id,
        brand_name: slot.brand_name || updatedSlotData.brand_name || selectedPost?.brand_name,
        planned_date_str: slot.planned_date_str || String(slot.planned_date || '').slice(0, 10),
        linked_post_id: selectedPost?.id || selectedPostId,
        is_compensated: isCompensated,
        slot_status: computedStatus,
        computed_status: computedStatus,
        linked_post: selectedPost
          ? {
              id: selectedPost.id,
              status: selectedPost.status || 'published',
              media_type: selectedPost.media_type || slot.content_type,
              published_time: selectedPost.published_time,
              scheduled_time: selectedPost.scheduled_time,
              message: selectedPost.message,
              media_url: selectedPost.media_url,
              thumbnail_url: selectedPost.thumbnail_url,
              fb_post_id: selectedPost.fb_post_id,
              post_url: selectedPost.post_url,
              page_id: selectedPost.page_id,
              page_name: selectedPost.page_name,
            }
          : (updatedSlotData.linked_post || null),
      };

      // 2. Immediately close this modal first - guaranteed to never stay stuck
      if (typeof onClose === 'function') {
        onClose();
      }

      // 3. Notify parent to update Day Detail (Pic 2) and calendar cache
      if (typeof onLinked === 'function') {
        onLinked(enrichedSlot, selectedPost);
      }

      // 4. Silently synchronize caches in background (fire-and-forget)
      invalidatePostAndMissionCaches().catch(() => {});
    } catch (err) {
      showError('Failed to link post: ' + (err.message || 'Server error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !slot) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader
        title="Link Existing Tracked Post"
        description={`Select an already tracked post for ${slot.brand_name || 'Brand'} to fulfill Missed Slot #${slot.id}.`}
        onClose={onClose}
      />

      <ModalBody style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Target Slot Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
            border: '1.5px solid #c7d2fe',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={13} />
              Target Missed Slot: #{slot.id}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                }}
              >
                Due: {formatDate(slot.planned_date)}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                }}
              >
                Required: {slotType.toUpperCase()}
              </span>
            </div>
          </div>
          {slot.notes && (
            <div style={{ fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '2px' }}>
              <FileText size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Contract Brief:</strong> {slot.notes}</span>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracked posts by caption, page, FB Post ID, or Post #..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              fontSize: '12.5px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Posts List */}
        {loading ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={24} className="ui-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <span style={{ fontSize: '12.5px' }}>
              Loading unassigned posts for {slot.brand_name || 'Brand'}...
            </span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px auto', display: 'block', color: '#94a3b8' }} />
            <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>
              {searchQuery ? 'No matching posts found' : `No posts found in ${slotDateInfo.monthName}`}
            </p>
            <p style={{ margin: '6px auto 0 auto', fontSize: '12px', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
              {searchQuery
                ? 'Try adjusting your search terms.'
                : `No tracked posts found for ${slot.brand_name || 'this brand'} in ${slotDateInfo.monthName}.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredPosts.map((p) => {
              const isSelected = selectedPostId === p.id;
              const postType = (p.media_type || 'post').toLowerCase();
              const isVideo = postType === 'video';
              const isLive = postType === 'live' || (p.tracking_type || '').toLowerCase() === 'live';
              const previewImg = resolveMediaUrl(p.thumbnail_url || p.media_url);
              const platform = (p.platform || 'facebook').toLowerCase();
              const pageName = p.page_name || p.facebook_page_name || (p.page_id ? `Page #${p.page_id}` : 'Facebook Page');

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f7ff' : '#ffffff',
                    boxShadow: isSelected ? '0 1px 3px rgba(59, 130, 246, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }
                  }}
                  title={p.message || ''}
                >
                  {/* Modern Radio Check Indicator */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isSelected ? '1px solid #2563eb' : '1.5px solid #cbd5e1',
                      backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 2px rgba(37, 99, 235, 0.25)' : 'none',
                    }}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>

                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#f1f5f9',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      flexShrink: 0,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {previewImg ? (
                      <SafeImage
                        src={previewImg}
                        alt="Post media"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ImageIcon size={18} color="#94a3b8" />
                    )}
                    {isVideo && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#fff',
                          borderRadius: '3px',
                          padding: '1px 3px',
                          fontSize: '8px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Video size={8} />
                      </span>
                    )}
                    {isLive && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          background: '#dc2626',
                          color: '#fff',
                          borderRadius: '3px',
                          padding: '1px 3px',
                          fontSize: '8px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Radio size={8} />
                      </span>
                    )}
                  </div>

                  {/* Content Details (Post ID on top, Date below ID, Page Badge on right) */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    {(() => {
                      const postDateKey = getLocalDateKey(p.published_time || p.scheduled_time || p.created_at);
                      const slotDateKey = getLocalDateKey(slot.planned_date_str || slot.planned_date);
                      const isSameDay = Boolean(postDateKey && slotDateKey && postDateKey === slotDateKey);

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                              Post #{p.id}
                            </span>
                            {isSameDay ? (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  border: '1px solid #bbf7d0',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Same-day match: fulfills as regular on-time deliverable"
                              >
                                <Check size={9} strokeWidth={2.8} /> On-Time
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#7c3aed',
                                  background: '#f5f3ff',
                                  border: '1px solid #e9d5ff',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Cross-day post: fulfills as make-up compensation"
                              >
                                <Sparkles size={9} strokeWidth={2.2} /> Make-Up
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 400, lineHeight: 1.25 }}>
                            {formatTimeAgo(p.published_time || p.scheduled_time || p.created_at)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Professional Page Name Tag */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(255, 255, 255, 0.85)' : '#f8fafc',
                        border: isSelected ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        fontSize: '11.5px',
                        fontWeight: 500,
                        color: '#334155',
                        maxWidth: '220px',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                      title={`${pageName} (${platform})`}
                    >
                      {platform === 'tiktok' ? (
                        <FaTiktok size={11} color="#000000" style={{ flexShrink: 0 }} />
                      ) : (
                        <FaFacebook size={12} color="#1877f2" style={{ flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pageName}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>

      <ModalFooter style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>

        {(() => {
          const isSelectedSameDay = Boolean(
            selectedPost &&
            getLocalDateKey(selectedPost.published_time || selectedPost.scheduled_time || selectedPost.created_at) ===
            getLocalDateKey(slot.planned_date_str || slot.planned_date)
          );

          let buttonText = 'Select a Post to Attach';
          if (submitting) {
            buttonText = isSelectedSameDay
              ? `Attaching Post #${selectedPostId} (On-Time)...`
              : `Attaching Post #${selectedPostId} (Make-Up)...`;
          } else if (selectedPostId) {
            buttonText = isSelectedSameDay
              ? `Attach Post #${selectedPostId} (On-Time ✓)`
              : `Attach Post #${selectedPostId} as Make-Up ✨`;
          }

          return (
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedPostId || submitting}
              loading={submitting}
              icon={!submitting ? <Check size={14} /> : undefined}
              onClick={handleAttach}
            >
              {buttonText}
            </Button>
          );
        })()}
      </ModalFooter>
    </Modal>
  );
};
