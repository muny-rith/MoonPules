import React from 'react';
import { Skeleton } from './Skeleton';

const BRAND_STAGGER = [
  { nameWidth: '130px', revWidth: '85px', spendWidth: '78px', profitWidth: '82px' },
  { nameWidth: '160px', revWidth: '95px', spendWidth: '84px', profitWidth: '90px' },
  { nameWidth: '115px', revWidth: '75px', spendWidth: '68px', profitWidth: '72px' },
  { nameWidth: '145px', revWidth: '90px', spendWidth: '80px', profitWidth: '86px' },
  { nameWidth: '125px', revWidth: '80px', spendWidth: '72px', profitWidth: '78px' }
];

export const BrandStatsTopBannerSkeleton = ({ count = 4 }) => {
  return (
    <div className="card stat-card-group" style={{ marginBottom: '20px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={`brand-stat-skel-${i}`}>
          <div className="stat-item">
            <div className="stat-header">
              <Skeleton width={18} height={18} borderRadius={4} />
              <Skeleton width="80px" height={12} />
            </div>
            <Skeleton width="60px" height={26} style={{ marginTop: 8 }} />
          </div>
          {i < count - 1 && <div className="stat-divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export const BrandStatsTableSkeleton = ({ rowCount = 5 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => {
        const s = BRAND_STAGGER[i % BRAND_STAGGER.length];
        return (
          <tr key={`brand-skel-row-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
            {/* Checkbox */}
            <td style={{ width: '48px', textAlign: 'center', padding: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <Skeleton width={16} height={16} borderRadius={4} style={{ margin: '0 auto' }} />
            </td>

            {/* Brand Logo & Name */}
            <td data-label="Brand Name" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <Skeleton width={44} height={44} borderRadius={8} />
                </div>
                <div className="product-table-name-wrap">
                  <Skeleton width={s.nameWidth} height={16} borderRadius={4} />
                </div>
              </div>
            </td>

            {/* Posts */}
            <td data-label="Posts" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', width: '140px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Skeleton width={14} height={14} borderRadius={3} />
                <Skeleton width="60px" height={15} borderRadius={3} />
              </div>
            </td>

            {/* Views */}
            <td data-label="Views" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', width: '130px' }}>
              <Skeleton width={s.revWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* Reach */}
            <td data-label="Reach" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', width: '130px' }}>
              <Skeleton width={s.spendWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* Engagement */}
            <td data-label="Engagement" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', width: '150px' }}>
              <Skeleton width={s.profitWidth} height={20} borderRadius={6} style={{ marginLeft: 'auto' }} />
            </td>

            {/* Actions */}
            <td data-label="Actions" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', width: '120px' }}>
              <Skeleton width="64px" height={28} borderRadius={6} style={{ marginLeft: 'auto' }} />
            </td>
          </tr>
        );
      })}
    </>
  );
};

export const BrandStatsMobileSkeleton = ({ cardCount = 4 }) => {
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Skeleton width={18} height={18} borderRadius={4} />
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <Skeleton width={40} height={40} borderRadius={8} />
              </div>
              <Skeleton width={i % 2 === 0 ? '130px' : '160px'} height={18} borderRadius={4} />
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div>
              <Skeleton width="36px" height={10} borderRadius={2} />
              <Skeleton width="50px" height={16} borderRadius={4} style={{ marginTop: '4px' }} />
            </div>
            <div>
              <Skeleton width="36px" height={10} borderRadius={2} />
              <Skeleton width="65px" height={16} borderRadius={4} style={{ marginTop: '4px' }} />
            </div>
            <div>
              <Skeleton width="36px" height={10} borderRadius={2} />
              <Skeleton width="60px" height={16} borderRadius={4} style={{ marginTop: '4px' }} />
            </div>
            <div>
              <Skeleton width="55px" height={10} borderRadius={2} />
              <Skeleton width="65px" height={16} borderRadius={4} style={{ marginTop: '4px' }} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <Skeleton width="100%" height={38} borderRadius={8} />
          </div>
        </div>
      ))}
    </>
  );
};
