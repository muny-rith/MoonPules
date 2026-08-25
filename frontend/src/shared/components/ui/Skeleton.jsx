import React from 'react';

export const Skeleton = ({ type = 'line', width, height, borderRadius, style, className = '' }) => {
  const baseClass = type === 'icon' ? 'skeleton-icon' : 'skeleton-line';
  
  const customStyles = { ...style };
  if (width !== undefined) customStyles.width = width;
  if (height !== undefined) customStyles.height = height;
  if (borderRadius !== undefined) customStyles.borderRadius = borderRadius;

  // IMPORTANT: Do not set background color in customStyles if it overrides the shimmer animation gradient,
  // unless explicitly requested via style object.

  return (
    <div className={`${baseClass} ${className}`} style={customStyles} />
  );
};
