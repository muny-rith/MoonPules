import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export const SafeImage = ({
  src,
  alt = 'Image',
  className = '',
  style = {},
  fallbackText = '',
  showFallbackIcon = true,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveMediaUrl(src);

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
          borderRadius: '6px',
          border: '1px dashed #cbd5e1',
          userSelect: 'none',
          ...style,
        }}
        title={fallbackText || alt}
      >
        {showFallbackIcon && <ImageIcon size={style?.width && parseInt(style.width) < 40 ? 16 : 20} strokeWidth={1.5} />}
        {fallbackText && (
          <span style={{ marginTop: '2px', fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {fallbackText}
          </span>
        )}
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
