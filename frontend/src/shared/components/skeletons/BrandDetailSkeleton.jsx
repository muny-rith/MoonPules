import React from 'react';
import { Skeleton } from './Skeleton';

export const BrandDetailHeroSkeleton = () => {
  return (
    <div className="card brand-detail-hero-card">
      <div className="brand-detail-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
        {/* Brand Info (Left) */}
        <div className="brand-detail-hero-info" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="brand-detail-logo-box" style={{ padding: '6px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.02)' }}>
            <div className="brand-detail-logo-img" style={{ width: '72px', height: '72px', borderRadius: '12px', overflow: 'hidden' }}>
              <Skeleton width="100%" height="100%" borderRadius={12} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Skeleton width="200px" height={32} borderRadius={6} />
              <Skeleton width="65px" height={24} borderRadius={20} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '6px', flexWrap: 'wrap' }}>
              <Skeleton width="100px" height={16} borderRadius={4} />
              <Skeleton width="110px" height={16} borderRadius={4} />
            </div>
          </div>
        </div>

        {/* Action Buttons (Right) */}
        <div className="brand-detail-hero-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Skeleton width="100px" height={38} borderRadius={10} />
          <Skeleton width="115px" height={38} borderRadius={10} />
        </div>
      </div>
    </div>
  );
};

export const BrandDetailAnalyticsSkeleton = () => {
  return (
    <div className="card brand-unified-hub-card" style={{ marginBottom: '20px' }}>
      <div className="analytics-filter-container">
        {/* Header: Title + Post Count on left, Action buttons on right */}
        <div
          className="analytics-filter-header"
          style={{
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div className="analytics-title-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Skeleton width="230px" height={20} borderRadius={4} />
            <Skeleton width="150px" height={13} borderRadius={4} />
          </div>

          {/* Top Right Action Buttons Skeleton */}
          <div className="analytics-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Skeleton width="90px" height={34} borderRadius={8} />
            <Skeleton width="110px" height={34} borderRadius={8} />
          </div>
        </div>

        {/* Filter Toolbar: 5 select pills side-by-side on desktop, 2-col or stacked on mobile */}
        <div
          className="analytics-filter-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}
        >
          <div className="filter-dropdown-group" style={{ flex: '1 1 145px', minWidth: '135px' }}>
            <Skeleton height={38} borderRadius={8} />
          </div>
          <div className="filter-dropdown-group" style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <Skeleton height={38} borderRadius={8} />
          </div>
          <div className="filter-dropdown-group" style={{ flex: '1 1 150px', minWidth: '140px' }}>
            <Skeleton height={38} borderRadius={8} />
          </div>
          <div className="filter-dropdown-group" style={{ flex: '1 1 160px', minWidth: '150px' }}>
            <Skeleton height={38} borderRadius={8} />
          </div>
          <div className="filter-dropdown-group" style={{ flex: '1 1 135px', minWidth: '125px' }}>
            <Skeleton height={38} borderRadius={8} />
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Body Grid */}
      <div className="brand-unified-grid">
        {/* LEFT COLUMN: Campaign Mission Skeleton */}
        <div className="brand-mission-sidebar-panel">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton width={28} height={28} borderRadius={7} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Skeleton width="110px" height={15} borderRadius={4} />
                <Skeleton width="130px" height={11} borderRadius={3} />
              </div>
            </div>
            <Skeleton width="75px" height={22} borderRadius={20} />
          </div>

          {/* Quota Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Skeleton width="100px" height={12} borderRadius={3} />
              <Skeleton width="60px" height={12} borderRadius={3} />
            </div>
            <Skeleton width="100%" height={6} borderRadius={4} />
          </div>

          {/* Breakdown Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Skeleton width="75px" height={22} borderRadius={6} />
            <Skeleton width="65px" height={22} borderRadius={6} />
            <Skeleton width="70px" height={22} borderRadius={6} />
          </div>

          {/* Schedule Timeline Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <Skeleton width="115px" height={13} borderRadius={3} />
            <Skeleton width="75px" height={11} borderRadius={3} />
          </div>

          {/* Deliverable Slots List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map((slot) => (
              <div
                key={`skel-slot-${slot}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Skeleton width="50px" height={18} borderRadius={5} />
                  <Skeleton width="45px" height={14} borderRadius={3} />
                </div>
                <Skeleton width="55px" height={16} borderRadius={4} />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Analytics KPI Cards + Chart Skeleton */}
        <div className="brand-analytics-chart-col" style={{ minWidth: 0 }}>
          <div className="brand-analytics-chart-container">
            {/* KPI Grid (6 cards) */}
            <div
              className="brand-analytics-kpi-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {[
                { labelW: '40px' },
                { labelW: '42px' },
                { labelW: '35px' },
                { labelW: '58px' },
                { labelW: '45px' },
                { labelW: '75px' },
              ].map((kpi, idx) => (
                <div
                  key={`skel-kpi-card-${idx}`}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Skeleton width={kpi.labelW} height={12} borderRadius={3} />
                    <Skeleton width={24} height={24} borderRadius={6} />
                  </div>
                  <Skeleton width="60px" height={22} borderRadius={4} />
                </div>
              ))}
            </div>

            {/* Chart Area Skeleton */}
            <div
              style={{
                width: '100%',
                flex: 1,
                minHeight: 330,
                border: '1px solid #f1f5f9',
                borderRadius: '12px',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={`skel-chart-line-${i}`} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Skeleton width="28px" height={10} style={{ marginRight: '12px' }} />
                  <Skeleton width="100%" height={1} />
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  paddingLeft: '40px',
                  alignItems: 'flex-end',
                  height: '140px',
                  gap: '12px',
                }}
              >
                {[45, 95, 35, 80, 115, 65, 90, 50].map((h, i) => (
                  <div key={`skel-bar-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Skeleton width="26px" height={h} borderRadius="4px 4px 0 0" />
                    <Skeleton width="30px" height={10} borderRadius={2} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BrandMissionPanelSkeleton = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
      {/* Quota Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width="100px" height={12} borderRadius={3} />
          <Skeleton width="60px" height={12} borderRadius={3} />
        </div>
        <Skeleton width="100%" height={6} borderRadius={4} />
      </div>

      {/* Breakdown Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <Skeleton width="75px" height={22} borderRadius={6} />
        <Skeleton width="65px" height={22} borderRadius={6} />
        <Skeleton width="70px" height={22} borderRadius={6} />
      </div>

      {/* Schedule Timeline Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <Skeleton width="115px" height={13} borderRadius={3} />
        <Skeleton width="75px" height={11} borderRadius={3} />
      </div>

      {/* Deliverable Slots List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2, 3].map((slot) => (
          <div
            key={`skel-sub-slot-${slot}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton width="50px" height={18} borderRadius={5} />
              <Skeleton width="45px" height={14} borderRadius={3} />
            </div>
            <Skeleton width="55px" height={16} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const BrandDetailTrackedPostsSkeleton = () => {
  return (
    <div className="table-card" style={{
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Toolbar Header Row inside table-card */}
      <div className="toolbar-header-row" style={{
        padding: '14px 20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Skeleton width="110px" height={18} borderRadius={4} />
          <Skeleton width="30px" height={18} borderRadius={12} />
        </div>
        <Skeleton width="240px" height={36} borderRadius={24} />
      </div>

      {/* Desktop Table Skeleton (6 columns) */}
      <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px' }}><Skeleton width="90px" height={12} /></th>
              <th style={{ padding: '12px 16px' }}><Skeleton width="95px" height={12} /></th>
              <th style={{ padding: '12px 16px' }}><Skeleton width="50px" height={12} /></th>
              <th style={{ padding: '12px 16px' }}><Skeleton width="90px" height={12} /></th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}><Skeleton width="80px" height={12} style={{ marginLeft: 'auto' }} /></th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}><Skeleton width="50px" height={12} style={{ marginLeft: 'auto' }} /></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((row) => (
              <tr key={`tracked-skel-row-${row}`} style={{ backgroundColor: row % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                {/* Linked Product: 40x40 thumbnail + text */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Skeleton width={40} height={40} borderRadius={8} />
                    <Skeleton width={row % 2 === 0 ? '120px' : '150px'} height={15} borderRadius={4} />
                  </div>
                </td>
                {/* Channel & Page */}
                <td style={{ padding: '12px 16px' }}>
                  <Skeleton width="130px" height={22} borderRadius={6} />
                </td>
                {/* Format */}
                <td style={{ padding: '12px 16px' }}>
                  <Skeleton width="65px" height={22} borderRadius={6} />
                </td>
                {/* Published Date */}
                <td style={{ padding: '12px 16px' }}>
                  <Skeleton width="85px" height={14} borderRadius={4} />
                </td>
                {/* Engagement */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Skeleton width="40px" height={14} borderRadius={3} />
                    <Skeleton width="40px" height={14} borderRadius={3} />
                    <Skeleton width="30px" height={14} borderRadius={3} />
                  </div>
                </td>
                {/* Actions */}
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <Skeleton width="75px" height={28} borderRadius={6} style={{ marginLeft: 'auto' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards Skeleton (matching 62x62 image + 2 rows layout!) */}
      <div className="mobile-only" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc' }}>
        {[1, 2].map((card) => (
          <div
            key={`mob-skel-card-${card}`}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Header: 62x62 square on left + 2 rows on right */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '62px', height: '62px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                <Skeleton width={62} height={62} borderRadius={10} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1, justifyContent: 'center' }}>
                {/* Row 1: Product name + format badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <Skeleton width="110px" height={16} borderRadius={4} />
                  <Skeleton width="55px" height={20} borderRadius={6} />
                </div>
                {/* Row 2: Page name */}
                <div>
                  <Skeleton width="130px" height={16} borderRadius={4} />
                </div>
              </div>
            </div>

            {/* Metrics Grid: 3 columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              backgroundColor: '#f8fafc',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #f1f5f9'
            }}>
              <div>
                <Skeleton width="30px" height={10} borderRadius={2} />
                <Skeleton width="45px" height={15} borderRadius={3} style={{ marginTop: '3px' }} />
              </div>
              <div>
                <Skeleton width="30px" height={10} borderRadius={2} />
                <Skeleton width="45px" height={15} borderRadius={3} style={{ marginTop: '3px' }} />
              </div>
              <div>
                <Skeleton width="35px" height={10} borderRadius={2} />
                <Skeleton width="40px" height={15} borderRadius={3} style={{ marginTop: '3px' }} />
              </div>
            </div>

            {/* Footer: Date & View Post Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <Skeleton width="70px" height={13} borderRadius={3} />
              <Skeleton width="85px" height={28} borderRadius={6} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Kept for backward compatibility
export const BrandDetailKpisSkeleton = () => null;
