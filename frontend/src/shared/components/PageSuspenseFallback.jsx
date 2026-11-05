import React from 'react';

export const PageSuspenseFallback = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
      gap: '14px',
      color: '#64748b',
    }}
  >
    <div
      style={{
        width: '34px',
        height: '34px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'pulseSpin 0.75s linear infinite',
      }}
    />
    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b', letterSpacing: '0.2px' }}>
      Loading...
    </span>
    <style>{`
      @keyframes pulseSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

