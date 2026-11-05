import React, { useState } from 'react';
import { Globe, MoreHorizontal, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { isVideoMedia } from '../../../shared/utils/mediaUrl';

export const PageAvatar = ({ page, size = 20, className = 'meta-page-avatar-img' }) => {
  const [imgError, setImgError] = useState(false);
  const name = page?.page_name || 'Facebook Page';
  const initial = name.charAt(0).toUpperCase();

  if (page?.picture_url && !imgError) {
    return (
      <img
        src={page.picture_url}
        alt={name}
        className={className}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover' }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1877F2, #0d5bbd)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: `${Math.max(10, Math.floor(size * 0.45))}px`,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
};

export const FacebookFeedPreview = ({
  previewDevice = 'desktop',
  primaryPage,
  selectedPages = [],
  pageDisplayName = 'Mae Khon Baby Mart',
  publishMode = 'now',
  scheduledDateTime = '',
  message = '',
  mediaSource = 'upload',
  mediaItems = [],
  trackingTarget = 'product',
  selectedBrand = null,
  selectedProduct = null,
}) => {
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
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        </div>
      );
    }
    return (
      <img
        src={item.previewUrl || item.serverUrl}
        alt={`Media ${idx + 1}`}
        className="meta-feed-grid-img"
        loading="lazy"
      />
    );
  };

  return (
    <div className="meta-preview-col">
      <div className={`meta-feed-card ${previewDevice === 'desktop' ? 'desktop-view' : 'mobile-view'}`}>
        {/* Post Header */}
        <div className="meta-feed-header">
          <div className="meta-feed-author-wrap">
            <PageAvatar page={primaryPage} size={38} className="meta-feed-avatar" />
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
  );
};

