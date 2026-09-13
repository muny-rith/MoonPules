import React from 'react';
import { Skeleton } from './Skeleton';

export const PostEditorSkeleton = () => {
  return (
    <div className="meta-post-page">
      {/* ── Top Navigation Bar ── */}
      <div className="meta-top-nav">
        <div className="meta-top-nav-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width={36} height={36} borderRadius={8} />
          <Skeleton width="160px" height={26} borderRadius={4} />
          <Skeleton width="85px" height={24} borderRadius={12} />
        </div>
        <div className="meta-top-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width="150px" height={16} borderRadius={4} />
          <div className="meta-device-toggles" style={{ display: 'flex', gap: '4px' }}>
            <Skeleton width={34} height={34} borderRadius={6} />
            <Skeleton width={34} height={34} borderRadius={6} />
          </div>
        </div>
      </div>

      <div className="meta-layout-row">
        {/* ── Left Column: Editor Form Cards ── */}
        <div className="meta-editor-col">
          {/* Card 1: Attribution Target */}
          <div className="meta-card">
            <div className="meta-card-header">
              <Skeleton width="160px" height={16} borderRadius={4} style={{ marginBottom: '6px' }} />
              <Skeleton width="280px" height={13} borderRadius={3} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <Skeleton width="130px" height={36} borderRadius={8} />
              <Skeleton width="180px" height={36} borderRadius={8} />
            </div>
            <Skeleton width="100%" height={42} borderRadius={8} />
          </div>

          {/* Card 2: Page Selector */}
          <div className="meta-card">
            <div className="meta-card-header">
              <Skeleton width="140px" height={16} borderRadius={4} style={{ marginBottom: '6px' }} />
              <Skeleton width="220px" height={13} borderRadius={3} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Skeleton width={42} height={42} borderRadius="50%" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <Skeleton width="160px" height={15} borderRadius={4} />
                <Skeleton width="100px" height={12} borderRadius={3} />
              </div>
            </div>
          </div>

          {/* Card 3: Post Content Textarea */}
          <div className="meta-card">
            <div className="meta-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Skeleton width="110px" height={16} borderRadius={4} style={{ marginBottom: '6px' }} />
                <Skeleton width="190px" height={13} borderRadius={3} />
              </div>
              <Skeleton width="60px" height={14} borderRadius={3} />
            </div>

            {/* Quick helper toolbar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <Skeleton width="90px" height={28} borderRadius={6} />
              <Skeleton width="110px" height={28} borderRadius={6} />
            </div>

            <Skeleton width="100%" height={160} borderRadius={8} />

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <Skeleton width={32} height={32} borderRadius={6} />
              <Skeleton width={32} height={32} borderRadius={6} />
              <Skeleton width={32} height={32} borderRadius={6} />
              <Skeleton width={32} height={32} borderRadius={6} />
            </div>
          </div>

          {/* Card 4: Media Upload */}
          <div className="meta-card">
            <div className="meta-card-header">
              <Skeleton width="100px" height={16} borderRadius={4} style={{ marginBottom: '6px' }} />
              <Skeleton width="200px" height={13} borderRadius={3} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <Skeleton width="120px" height={34} borderRadius={8} />
              <Skeleton width="130px" height={34} borderRadius={8} />
              <Skeleton width="95px" height={34} borderRadius={8} />
            </div>
            <Skeleton width="100%" height={140} borderRadius={8} />
          </div>

          {/* Card 5: Costs & Attribution */}
          <div className="meta-card">
            <div className="meta-card-header">
              <Skeleton width="140px" height={16} borderRadius={4} style={{ marginBottom: '6px' }} />
              <Skeleton width="240px" height={13} borderRadius={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width="80px" height={12} borderRadius={3} />
                <Skeleton width="100%" height={38} borderRadius={6} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width="70px" height={12} borderRadius={3} />
                <Skeleton width="100%" height={38} borderRadius={6} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width="95px" height={12} borderRadius={3} />
                <Skeleton width="100%" height={38} borderRadius={6} />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="meta-sticky-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="90px" height={14} borderRadius={3} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Skeleton width="85px" height={38} borderRadius={8} />
              <Skeleton width="130px" height={38} borderRadius={8} />
            </div>
          </div>
        </div>

        {/* ── Right Column: Full-Width Facebook Post Feed Preview ── */}
        <div className="meta-preview-col">
          <div className="meta-feed-card desktop-view">
            {/* Post Header */}
            <div className="meta-feed-header">
              <div className="meta-feed-author-wrap">
                <Skeleton width={38} height={38} borderRadius="50%" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <Skeleton width="160px" height={15} borderRadius={4} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Skeleton width="105px" height={12} borderRadius={3} />
                    <Skeleton width={12} height={12} borderRadius="50%" />
                  </div>
                </div>
              </div>
              <Skeleton width={20} height={20} borderRadius="50%" />
            </div>

            {/* Post Caption Body (Multi-paragraph rich content matching real FB marketing posts) */}
            <div className="meta-feed-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 16px 16px' }}>
              {/* Headline / Intro paragraph */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <Skeleton width="96%" height={13} borderRadius={3} />
                <Skeleton width="92%" height={13} borderRadius={3} />
                <Skeleton width="78%" height={13} borderRadius={3} />
              </div>

              {/* Bullet Points / Product Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Skeleton width={14} height={14} borderRadius={3} style={{ flexShrink: 0 }} />
                  <Skeleton width="92%" height={13} borderRadius={3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Skeleton width={14} height={14} borderRadius={3} style={{ flexShrink: 0 }} />
                  <Skeleton width="86%" height={13} borderRadius={3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Skeleton width={14} height={14} borderRadius={3} style={{ flexShrink: 0 }} />
                  <Skeleton width="94%" height={13} borderRadius={3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Skeleton width={14} height={14} borderRadius={3} style={{ flexShrink: 0 }} />
                  <Skeleton width="72%" height={13} borderRadius={3} />
                </div>
              </div>

              {/* Contact / Social Channels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px dashed #e4e6eb' }}>
                <Skeleton width="58%" height={12} borderRadius={3} />
                <Skeleton width="64%" height={12} borderRadius={3} />
                <Skeleton width="70%" height={12} borderRadius={3} />
              </div>

              {/* Location & Hashtags */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px dashed #e4e6eb' }}>
                <Skeleton width="82%" height={12} borderRadius={3} />
                <Skeleton width="66%" height={12} borderRadius={3} />
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                  <Skeleton width="85px" height={13} borderRadius={3} />
                  <Skeleton width="95px" height={13} borderRadius={3} />
                  <Skeleton width="75px" height={13} borderRadius={3} />
                </div>
              </div>
            </div>

            {/* Attached Media Container (Tall 380px frame matching attached post image) */}
            <div className="meta-feed-media" style={{ width: '100%', height: '380px' }}>
              <Skeleton width="100%" height="100%" borderRadius={0} />
            </div>

            {/* Post Engagement Actions Footer */}
            <div className="meta-feed-footer">
              <div className="meta-feed-action-bar">
                <Skeleton height={32} borderRadius={6} style={{ flex: 1 }} />
                <Skeleton height={32} borderRadius={6} style={{ flex: 1, margin: '0 8px' }} />
                <Skeleton height={32} borderRadius={6} style={{ flex: 1 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
