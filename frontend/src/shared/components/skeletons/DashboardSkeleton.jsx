import React from 'react';
import { Skeleton } from './Skeleton';

export const DashboardTopStatsSkeleton = () => {
  return (
    <div className="card stat-card-group" style={{ display: 'flex' }}>
      {[1, 2, 3].map((i) => (
        <React.Fragment key={`dash-stat-skel-${i}`}>
          <div className="stat-item" style={{ flex: 1 }}>
            <div className="stat-header">
              <Skeleton width={18} height={18} borderRadius={4} />
              <Skeleton width="75px" height={12} />
              <Skeleton width="45px" height={18} borderRadius={10} style={{ marginLeft: 'auto' }} />
            </div>
            <Skeleton width="90px" height={26} style={{ marginTop: 8 }} />
          </div>
          {i < 3 && <div className="stat-divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export const DashboardProfitKpisSkeleton = () => {
  return (
    <div className="profit-kpi-section">
      <div className="profit-kpi-section-header">
        <div className="profit-kpi-section-title">
          <Skeleton width={18} height={18} borderRadius={4} />
          <Skeleton width="130px" height={16} />
        </div>
        <Skeleton width="80px" height={20} borderRadius={20} />
      </div>
      <div className="profit-kpi-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={`profit-kpi-skel-${i}`} className="profit-kpi-card">
            <Skeleton width={36} height={36} borderRadius={10} />
            <div className="skeleton-text" style={{ justifyContent: 'center' }}>
              <Skeleton width="60%" height={12} style={{ marginBottom: '4px' }} />
              <Skeleton width="45%" height={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardScheduleSkeleton = () => {
  return (
    <div className="card schedule-card">
      <div className="card-header schedule-card-header">
        <div>
          <Skeleton width="150px" height={16} style={{ marginBottom: 4 }} />
          <Skeleton width="100px" height={11} />
        </div>
        <Skeleton width="60px" height={20} borderRadius={10} />
      </div>
      <div className="schedule-list">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={`schedule-skel-${i}`} className="schedule-item-compact">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1 }}>
              <Skeleton width={26} height={26} borderRadius={6} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton width={i % 2 === 0 ? '110px' : '140px'} height={13} borderRadius={3} />
                <Skeleton width="60px" height={9} borderRadius={2} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Skeleton width="65px" height={20} borderRadius={6} />
              <Skeleton width="45px" height={16} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardFunnelSkeleton = () => {
  return (
    <div className="card funnel-card">
      <div className="card-header funnel-header">
        <div>
          <Skeleton width="130px" height={15} style={{ marginBottom: '4px' }} />
          <Skeleton width="90px" height={11} />
        </div>
        <Skeleton width="75px" height={20} borderRadius={10} />
      </div>
      <div className="funnel-skeleton funnel-body">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`funnel-skel-${i}`} className="funnel-bar-row">
            <div className="funnel-bar-txt">
              <div className="funnel-step-meta">
                <Skeleton width={26} height={26} borderRadius={7} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <Skeleton width="50px" height={11} />
                  <Skeleton width="65px" height={9} />
                </div>
              </div>
              <Skeleton width="40px" height={15} />
            </div>
            <div className="funnel-bar-track-wrapper">
              <Skeleton height={24} borderRadius={5} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
