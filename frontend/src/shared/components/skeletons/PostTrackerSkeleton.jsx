import React from 'react';
import { Skeleton } from './Skeleton';

const SKELETON_STAGGER = [
  { titleWidth: '155px', subWidth: '85px', statusWidth: '80px', dateWidth: '88px', timeWidth: '54px', viewsWidth: '48px', reachWidth: '52px', likesWidth: '18px', commWidth: '14px', sharesWidth: '16px', costWidth: '56px', costSubWidth: '105px', revWidth: '58px', profitWidth: '56px', roiWidth: '52px' },
  { titleWidth: '190px', subWidth: '70px', statusWidth: '88px', dateWidth: '82px', timeWidth: '58px', viewsWidth: '58px', reachWidth: '44px', likesWidth: '22px', commWidth: '16px', sharesWidth: '12px', costWidth: '48px', costSubWidth: '95px', revWidth: '66px', profitWidth: '62px', roiWidth: '56px' },
  { titleWidth: '135px', subWidth: '95px', statusWidth: '72px', dateWidth: '92px', timeWidth: '50px', viewsWidth: '42px', reachWidth: '60px', likesWidth: '14px', commWidth: '12px', sharesWidth: '18px', costWidth: '62px', costSubWidth: '110px', revWidth: '52px', profitWidth: '48px', roiWidth: '50px' },
  { titleWidth: '170px', subWidth: '80px', statusWidth: '80px', dateWidth: '85px', timeWidth: '56px', viewsWidth: '52px', reachWidth: '48px', likesWidth: '20px', commWidth: '18px', sharesWidth: '14px', costWidth: '52px', costSubWidth: '98px', revWidth: '60px', profitWidth: '58px', roiWidth: '54px' },
  { titleWidth: '145px', subWidth: '75px', statusWidth: '84px', dateWidth: '80px', timeWidth: '52px', viewsWidth: '44px', reachWidth: '50px', likesWidth: '16px', commWidth: '14px', sharesWidth: '16px', costWidth: '58px', costSubWidth: '102px', revWidth: '50px', profitWidth: '52px', roiWidth: '48px' }
];

export const PostTrackerTableSkeleton = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => {
        const s = SKELETON_STAGGER[i % SKELETON_STAGGER.length];
        return (
          <tr key={`post-skeleton-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
            {/* 1. Post Content */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <Skeleton width={48} height={48} borderRadius={8} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton width={s.titleWidth} height={15} borderRadius={4} />
                  <Skeleton width={s.subWidth} height={12} borderRadius={4} />
                </div>
              </div>
            </td>

            {/* 2. Platform */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Skeleton width={24} height={24} borderRadius={6} />
              </div>
            </td>

            {/* 3. Status */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <Skeleton width={s.statusWidth} height={24} borderRadius={12} />
            </td>

            {/* 4. Dates */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <Skeleton width={s.dateWidth} height={13} borderRadius={4} />
                <Skeleton width={s.timeWidth} height={12} borderRadius={4} />
              </div>
            </td>

            {/* 5. Views */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <Skeleton width={s.viewsWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* 6. Reach */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <Skeleton width={s.reachWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* 7. Engagements */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Skeleton width={14} height={14} borderRadius="50%" />
                  <Skeleton width={s.likesWidth} height={12} borderRadius={3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Skeleton width={14} height={14} borderRadius="50%" />
                  <Skeleton width={s.commWidth} height={12} borderRadius={3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Skeleton width={14} height={14} borderRadius="50%" />
                  <Skeleton width={s.sharesWidth} height={12} borderRadius={3} />
                </div>
              </div>
            </td>

            {/* 8. Costs */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                <Skeleton width={s.costWidth} height={14} borderRadius={4} />
                <Skeleton width={s.costSubWidth} height={11} borderRadius={3} />
              </div>
            </td>

            {/* 9. Revenue */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <Skeleton width={s.revWidth} height={16} borderRadius={4} style={{ marginLeft: 'auto' }} />
            </td>

            {/* 10. Est. Profit */}
            <td style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                <Skeleton width={s.profitWidth} height={15} borderRadius={4} />
                <Skeleton width={s.roiWidth} height={18} borderRadius={4} />
              </div>
            </td>

            {/* 11. Actions */}
            <td style={{ textAlign: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Skeleton width={28} height={28} borderRadius={6} />
                <Skeleton width={28} height={28} borderRadius={6} />
                <Skeleton width={28} height={28} borderRadius={6} />
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
};

export const PostTrackerMobileSkeleton = ({ cardCount = 6 }) => {
  return (
    <>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div
          key={`skeleton-mob-${i}`}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width={i % 2 === 0 ? '140px' : '170px'} height={15} borderRadius={4} />
                <Skeleton width={i % 2 === 0 ? '90px' : '75px'} height={12} borderRadius={4} />
              </div>
            </div>
            <Skeleton width={i % 2 === 0 ? '76px' : '84px'} height={24} borderRadius={12} />
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="40px" height={11} borderRadius={3} />
              <Skeleton width="55px" height={16} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="40px" height={11} borderRadius={3} />
              <Skeleton width="55px" height={16} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="70px" height={11} borderRadius={3} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <Skeleton width="22px" height={13} borderRadius={3} />
                <Skeleton width="22px" height={13} borderRadius={3} />
                <Skeleton width="22px" height={13} borderRadius={3} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="65px" height={11} borderRadius={3} />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Skeleton width="48px" height={16} borderRadius={4} />
                <Skeleton width="38px" height={15} borderRadius={4} />
              </div>
            </div>
          </div>

          {/* Footer: Date & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <Skeleton width="90px" height={14} borderRadius={4} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Skeleton width={32} height={32} borderRadius={6} />
              <Skeleton width={32} height={32} borderRadius={6} />
              <Skeleton width={32} height={32} borderRadius={6} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
