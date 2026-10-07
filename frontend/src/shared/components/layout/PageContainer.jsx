import React from 'react';

/**
 * PageContainer - Unified Page Wrapper Template
 * 
 * Provides consistent outer margins, padding, box-sizing, and layout flow
 * across all pages in MoonPulse.
 */
export const PageContainer = ({
  children,
  className = '',
  maxWidth,
  style = {},
  ...props
}) => {
  return (
    <div
      className={`page-container ${className}`.trim()}
      style={{
        ...(maxWidth ? { maxWidth, margin: '0 auto' } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
