import React from 'react';
import { Skeleton } from './Skeleton';

export const PostEditorSkeleton = () => {
  return (
    <div className="meta-post-page">
      {/* Top Nav */}
      <div className="meta-top-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width={36} height={36} borderRadius={8} />
          <Skeleton width="160px" height={26} borderRadius={4} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="80px" height={36} borderRadius={6} />
          <Skeleton width="110px" height={36} borderRadius={6} />
        </div>
      </div>

      <div className="meta-layout-row">
        {/* Left Column: Editor Form Cards */}
        <div className="meta-editor-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 1: Page Picker */}
          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <Skeleton width="120px" height={16} style={{ marginBottom: '12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Skeleton width={40} height={40} borderRadius="50%" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <Skeleton width="140px" height={15} />
                <Skeleton width="80px" height={12} />
              </div>
            </div>
          </div>

          {/* Card 2: Post Caption Textarea */}
          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Skeleton width="100px" height={16} />
              <Skeleton width="60px" height={14} />
            </div>
            <Skeleton width="100%" height={120} borderRadius={8} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <Skeleton width="28px" height={28} borderRadius={6} />
              <Skeleton width="28px" height={28} borderRadius={6} />
              <Skeleton width="28px" height={28} borderRadius={6} />
            </div>
          </div>

          {/* Card 3: Media Upload */}
          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <Skeleton width="110px" height={16} style={{ marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <Skeleton width="100px" height={36} borderRadius={8} />
              <Skeleton width="100px" height={36} borderRadius={8} />
            </div>
            <Skeleton width="100%" height={140} borderRadius={8} />
          </div>

          {/* Card 4: Schedule / Publish */}
          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <Skeleton width="140px" height={16} style={{ marginBottom: '12px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Skeleton width="100%" height={38} borderRadius={6} />
              <Skeleton width="100%" height={38} borderRadius={6} />
            </div>
          </div>
        </div>

        {/* Right Column: Facebook Post Feed Preview */}
        <div className="meta-preview-col">
          <div className="card" style={{ padding: '20px', borderRadius: '12px', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Skeleton width="120px" height={16} />
              <Skeleton width="70px" height={20} borderRadius={10} />
            </div>

            {/* Facebook Preview Box */}
            <div style={{ border: '1px solid #e4e6eb', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
              {/* Post Header */}
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Skeleton width={40} height={40} borderRadius="50%" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <Skeleton width="120px" height={14} />
                    <Skeleton width="75px" height={10} />
                  </div>
                </div>
                <Skeleton width={20} height={20} borderRadius="50%" />
              </div>

              {/* Post Caption Lines */}
              <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton width="90%" height={12} />
                <Skeleton width="75%" height={12} />
                <Skeleton width="45%" height={12} />
              </div>

              {/* Media Container */}
              <div style={{ width: '100%', height: '280px' }}>
                <Skeleton width="100%" height="100%" borderRadius={0} />
              </div>

              {/* Reactions Bar */}
              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e6eb' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Skeleton width={16} height={16} borderRadius="50%" />
                  <Skeleton width={16} height={16} borderRadius="50%" />
                  <Skeleton width="30px" height={11} style={{ marginLeft: '4px' }} />
                </div>
                <Skeleton width="90px" height={11} />
              </div>

              {/* Action Buttons Row */}
              <div style={{ padding: '6px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <Skeleton height={28} borderRadius={4} />
                <Skeleton height={28} borderRadius={4} />
                <Skeleton height={28} borderRadius={4} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
