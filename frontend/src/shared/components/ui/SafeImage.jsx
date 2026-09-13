import React, { useState } from 'react';
import { Image as ImageIcon, Video as VideoIcon, Play } from 'lucide-react';
import { resolveMediaUrl, isVideoMedia } from '../../utils/mediaUrl';

export const SafeImage = ({
  src,
  alt = 'Image',
  className = '',
  style = {},
  fallbackText = '',
  showFallbackIcon = true,
  isVideo = false,
  controls = false,
  poster = null,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveMediaUrl(src);
  const isVid = isVideo || isVideoMedia(resolvedSrc);

  if (!resolvedSrc || hasError) {
    return (
      <div
        className={`safe-image-fallback ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          color: '#94a3b8',
          fontSize: '11px',
          fontWeight: 500,
          textAlign: 'center',
          padding: '4px',
          overflow: 'hidden',
          borderRadius: style?.borderRadius || '6px',
          border: '1px dashed #cbd5e1',
          userSelect: 'none',
          ...style,
        }}
        title={fallbackText || alt}
      >
        {showFallbackIcon && (
          isVid ? (
            <VideoIcon size={style?.width && parseInt(style.width) < 40 ? 16 : 20} strokeWidth={1.5} />
          ) : (
            <ImageIcon size={style?.width && parseInt(style.width) < 40 ? 16 : 20} strokeWidth={1.5} />
          )
        )}
        {fallbackText && (
          <span style={{ marginTop: '2px', fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  if (isVid) {
    if (controls) {
      return (
        <video
          src={resolvedSrc}
          poster={poster || undefined}
          controls
          playsInline
          className={className}
          style={{ width: '100%', maxHeight: '460px', objectFit: 'contain', backgroundColor: '#000', display: 'block', ...style }}
          onError={() => setHasError(true)}
          {...props}
        />
      );
    }

    return (
      <div
        className={`safe-image-video-wrap ${className}`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: style?.borderRadius || '6px',
          background: '#0f172a',
          flexShrink: 0,
          ...style,
        }}
      >
        <video
          src={resolvedSrc}
          poster={poster || undefined}
          muted
          playsInline
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: style?.objectFit || 'cover', display: 'block' }}
          onError={() => setHasError(true)}
          {...props}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          <Play size={style?.width && parseInt(style.width) < 40 ? 12 : 16} fill="#ffffff" color="#ffffff" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => setHasError(true)}
      loading="lazy"
      {...props}
    />
  );
};

