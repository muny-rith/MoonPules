import React from 'react';

/**
 * Universal Skeleton Primitive
 * Supports variants: 'line' (default), 'icon', 'circle', 'avatar', 'badge', 'button', 'card'
 */
export const Skeleton = ({
  type,
  variant = 'line',
  width,
  height,
  borderRadius,
  padding,
  margin,
  style,
  className = '',
  ...props
}) => {
  const activeVariant = type || variant;

  let baseClass = 'skeleton-line';
  if (activeVariant === 'icon') baseClass = 'skeleton-icon';
  else if (activeVariant === 'circle') baseClass = 'skeleton-avatar circle';
  else if (activeVariant === 'avatar') baseClass = 'skeleton-avatar';
  else if (activeVariant === 'badge') baseClass = 'skeleton-badge';
  else if (activeVariant === 'button') baseClass = 'skeleton-button';
  else if (activeVariant === 'card') baseClass = 'skeleton-card';

  const customStyles = { ...style };
  if (width !== undefined) customStyles.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) customStyles.height = typeof height === 'number' ? `${height}px` : height;
  if (borderRadius !== undefined) {
    customStyles.borderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;
  }
  if (padding !== undefined) customStyles.padding = typeof padding === 'number' ? `${padding}px` : padding;
  if (margin !== undefined) customStyles.margin = typeof margin === 'number' ? `${margin}px` : margin;

  return (
    <div
      className={`${baseClass} ${className}`.trim()}
      style={customStyles}
      aria-hidden="true"
      {...props}
    />
  );
};

export default Skeleton;
