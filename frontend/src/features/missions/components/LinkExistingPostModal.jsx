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
import { FaFacebook } from 'react-icons/fa';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const raw = String(dateStr).slice(0, 10);
    const parts = raw.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    return raw;
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
        const slotsList = Array.isArray(slotsData) ? slotsData : slotsData?.data || [];

        // 1. Group all loaded posts by local date string "YYYY-MM-DD"
        const postsByDate = new Map();
        list.forEach((p) => {
          const pKey = getLocalDateKey(p.published_time || p.scheduled_time || p.created_at);
          if (pKey) {
            if (!postsByDate.has(pKey)) postsByDate.set(pKey, []);
            postsByDate.get(pKey).push(p);
          }
        });

        // 2. Identify all posts that are already fulfilling a mission slot
        const occupiedIds = new Set();

        // A. Explicit links from database
        slotsList.forEach((s) => {
          if (s.id !== slot.id) {
            if (s.linked_post_id) occupiedIds.add(Number(s.linked_post_id));
            if (s.linked_post?.id) occupiedIds.add(Number(s.linked_post.id));
          }
        });

        // B. Dynamic date matching: if a post on Nov 4 was published for a planned slot on Nov 4,
        // it is claimed by that Nov 4 slot and CANNOT be offered for another slot!
        const sortedSlots = [...slotsList]
          .filter((s) => s.id !== slot.id)
          .sort((a, b) => {
            const order = { live: 1, video: 2, photo: 3, poster: 3 };
            const oA = order[a.content_type?.toLowerCase()] || 3;
            const oB = order[b.content_type?.toLowerCase()] || 3;
            return oA - oB;
          });

        sortedSlots.forEach((s) => {
          const sDateKey = getLocalDateKey(s.planned_date || s.planned_date_str);
          if (!sDateKey) return;
          const dayPosts = postsByDate.get(sDateKey) || [];

          // Match first available compatible post on this date
          const match = dayPosts.find((p) => {
            if (occupiedIds.has(Number(p.id))) return false;
            if (p.status !== 'published' && p.status !== 'scheduled') return false;
            return isPostCompatibleWithSlot(s.content_type, p.media_type);
          });

          if (match) {
            occupiedIds.add(Number(match.id));
          }
        });

        // C. Any post marked as compensation for another slot is also occupied
        list.forEach((p) => {
          if (p.compensation_for_slot_id && p.compensation_for_slot_id !== slot.id) {
            occupiedIds.add(Number(p.id));
          }
        });

        // 3. Filter out posts that are already fulfilling another mission slot
        const available = list.filter((p) => !occupiedIds.has(Number(p.id)));

        // 4. Sort newest first
        const sorted = available.slice().sort((a, b) => {
          const timeA = new Date(a.published_time || a.scheduled_time || a.created_at || 0).getTime();
          const timeB = new Date(b.published_time || b.scheduled_time || b.created_at || 0).getTime();
          return timeB - timeA;
        });

        setPosts(sorted);

        // If slot already has a linked post, pre-select it
        if (slot.linked_post_id) {
          setSelectedPostId(slot.linked_post_id);
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
      return msg.includes(q) || fbId.includes(q) || id.includes(q);
    });
  }, [posts, searchQuery]);

  const slotType = (slot?.content_type || '').toLowerCase();

  const handleAttach = async () => {
    if (!selectedPostId || !slot?.id) return;
    setSubmitting(true);
    try {
      const res = await missionApi.linkPostToSlot(slot.id, selectedPostId);
      await invalidatePostAndMissionCaches();
      showSuccess(`Post #${selectedPostId} linked as make-up for Slot #${slot.id}!`);
      if (onLinked) {
        onLinked(res.slot || res);
      }
      onClose();
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
            placeholder="Search tracked posts by caption, FB Post ID, or Post #..."
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
              {searchQuery ? 'No matching posts found' : `No unassigned posts in ${slotDateInfo.monthName}`}
            </p>
            <p style={{ margin: '6px auto 0 auto', fontSize: '12px', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
              {searchQuery
                ? 'Try adjusting your search terms.'
                : `All posts for ${slot.brand_name || 'this brand'} in ${slotDateInfo.monthName} are already assigned to client deliverables or have not been created yet.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredPosts.map((p) => {
              const isSelected = selectedPostId === p.id;
              const postType = (p.media_type || 'post').toLowerCase();
              const isVideo = postType === 'video';
              const isLive = postType === 'live';
              const previewImg = resolveMediaUrl(p.thumbnail_url || p.media_url);

              // Compatibility badge logic
              const isExactMatch = postType === slotType;
              const isUpgrade = slotType === 'photo' && isVideo;
              const isDowngrade = slotType === 'video' && !isVideo;

              const isAlreadyLinkedOther = p.compensation_for_slot_id && p.compensation_for_slot_id !== slot.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    background: isSelected ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none',
                  }}
                >
                  {/* Radio / Selection Indicator */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #4f46e5' : '2px solid #cbd5e1',
                      background: '#ffffff',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#f1f5f9',
                      flexShrink: 0,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {previewImg ? (
                      <SafeImage
                        src={previewImg}
                        alt="Post media"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ImageIcon size={20} color="#94a3b8" />
                    )}
                    {isVideo && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '3px',
                          right: '3px',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          borderRadius: '3px',
                          padding: '1px 3px',
                          fontSize: '8px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <Video size={8} />
                      </span>
                    )}
                  </div>

                  {/* Content Details */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>
                        Post #{p.id}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        · {formatTimeAgo(p.published_time || p.scheduled_time || p.created_at)}
                      </span>

                      {/* Format Badge */}
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isVideo ? '#f5f3ff' : isLive ? '#fef2f2' : '#f0fdf4',
                          color: isVideo ? '#7c3aed' : isLive ? '#dc2626' : '#166534',
                          border: `1px solid ${isVideo ? '#ddd6fe' : isLive ? '#fecaca' : '#bbf7d0'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {isVideo ? <Video size={9} /> : isLive ? <Radio size={9} /> : <ImageIcon size={9} />}
                        {postType.toUpperCase()}
                      </span>

                      {/* Compatibility Tag */}
                      {isExactMatch && (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a' }}>
                          ✓ Format Match
                        </span>
                      )}
                      {isUpgrade && (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#2563eb' }}>
                          ✨ Video Upgrade
                        </span>
                      )}
                      {isDowngrade && (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#d97706' }}>
                          ⚠️ Photo (Requires Video)
                        </span>
                      )}

                      {isAlreadyLinkedOther && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}
                        >
                          Linked to Slot #{p.compensation_for_slot_id}
                        </span>
                      )}
                    </div>

                    {/* Message Preview */}
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#334155',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4,
                      }}
                    >
                      {p.message || '(No caption text)'}
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

        <Button
          variant="primary"
          size="sm"
          disabled={!selectedPostId || submitting}
          loading={submitting}
          icon={<Check size={14} />}
          onClick={handleAttach}
        >
          {selectedPostId ? `Attach Post #${selectedPostId} to Slot #${slot.id}` : 'Select a Post to Attach'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
