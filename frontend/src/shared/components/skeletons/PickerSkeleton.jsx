import React from 'react';
import { Skeleton } from './Skeleton';

export const PickerListSkeleton = ({ count = 4 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`picker-skel-${i}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 10px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc'
          }}
        >
          <Skeleton width={36} height={36} borderRadius={6} style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
            <Skeleton width={i % 2 === 0 ? '70%' : '55%'} height={14} borderRadius={3} />
            <Skeleton width="40%" height={11} borderRadius={3} />
          </div>
          <Skeleton width={16} height={16} borderRadius="50%" />
        </div>
      ))}
    </div>
  );
};
