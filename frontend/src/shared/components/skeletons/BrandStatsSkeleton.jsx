import React from 'react';
import { Skeleton } from './Skeleton';

const BRAND_STAGGER = [
  { nameWidth: '130px', revWidth: '85px', spendWidth: '78px', profitWidth: '82px', roiWidth: '55px' },
  { nameWidth: '160px', revWidth: '95px', spendWidth: '84px', profitWidth: '90px', roiWidth: '58px' },
  { nameWidth: '115px', revWidth: '75px', spendWidth: '68px', profitWidth: '72px', roiWidth: '50px' },
  { nameWidth: '145px', revWidth: '90px', spendWidth: '80px', profitWidth: '86px', roiWidth: '56px' },
  { nameWidth: '125px', revWidth: '80px', spendWidth: '72px', profitWidth: '78px', roiWidth: '52px' }
];

export const BrandStatsTopBannerSkeleton = () => {
  return (
    <div className="card stat-card-group" style={{ display: 'flex' }}>
      {[1, 2, 3, 4].map((i) => (
        <React.Fragment key={`brand-stat-skel-${i}`}>
          <div className="stat-item" style={{ flex: 1 }}>
            <div className="stat-header">
              <Skeleton width={18} height={18} borderRadius={4} />
              <Skeleton width="80px" height={12} />
            </div>
            <Skeleton width="60px" height={26} style={{ marginTop: 8 }} />
          </div>
          {i < 4 && <div className="stat-divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export const BrandStatsTableSkeleton = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => {
        const s = BRAND_STAGGER[i % BRAND_STAGGER.length];
        return (
          <tr key={`brand-skel-row-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
            {/* Brand Logo & Name */}
            <td data-label="Brand Name" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                  <Skeleton width={48} height={48} borderRadius={6} />
                </div>
                <div className="product-table-name-wrap">
                  <Skeleton width={s.nameWidth} height={16} borderRadius={4} />
                </div>
              </div>
            </td>

            {/* Posts / Products */}
            <td data-label="Posts / Products" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Skeleton width={12} height={12} borderRadius={2} />
                  <Skeleton width="55px" height={14} borderRadius={3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Skeleton width={12} height={12} borderRadius={2} />
                  <Skeleton width="70px" height={13} borderRadius={3} />
                </div>
              </div>
            </td>

            {/* Revenue */}
            <td data-label="Revenue" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <Skeleton width={s.revWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* Spend */}
            <td data-label="Spend" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <Skeleton width={s.spendWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* ROI */}
            <td data-label="ROI" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
              <Skeleton width={s.roiWidth} height={24} borderRadius={12} style={{ margin: '0 auto' }} />
            </td>

            {/* Net Profit */}
            <td data-label="Net Profit" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <Skeleton width={s.profitWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* Actions */}
            <td data-label="Actions" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <Skeleton width="64px" height={28} borderRadius={6} style={{ marginLeft: 'auto' }} />
            </td>
          </tr>
        );
      })}
    </>
  );
};

export const BrandStatsMobileSkeleton = ({ cardCount = 6 }) => {
  return (
    <>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div
          key={`brand-mob-skel-${i}`}
          style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <Skeleton width={40} height={40} borderRadius={8} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Skeleton width={i % 2 === 0 ? '140px' : '160px'} height={16} borderRadius={4} />
                <Skeleton width="85px" height={12} borderRadius={4} />
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Skeleton width="40px" height={11} borderRadius={3} />
              <Skeleton width="55px" height={16} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Skeleton width="50px" height={11} borderRadius={3} />
              <Skeleton width="65px" height={16} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Skeleton width="45px" height={11} borderRadius={3} />
              <Skeleton width="60px" height={16} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Skeleton width="60px" height={11} borderRadius={3} />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Skeleton width="48px" height={16} borderRadius={4} />
                <Skeleton width="38px" height={15} borderRadius={4} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <Skeleton width="100%" height={36} borderRadius={6} />
          </div>
        </div>
      ))}
    </>
  );
};
