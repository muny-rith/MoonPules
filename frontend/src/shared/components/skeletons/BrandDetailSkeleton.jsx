import React from 'react';
import { Skeleton } from './Skeleton';

export const BrandDetailHeroSkeleton = () => {
  return (
    <div
      className="card"
      style={{
        marginBottom: '24px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
        {/* Brand Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <Skeleton width={84} height={84} borderRadius={14} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Skeleton width="220px" height={32} borderRadius={6} />
              <Skeleton width="70px" height={26} borderRadius={13} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '4px' }}>
              <Skeleton width="130px" height={16} borderRadius={4} />
              <Skeleton width="130px" height={16} borderRadius={4} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Skeleton width="110px" height={38} borderRadius={8} />
          <Skeleton width="130px" height={38} borderRadius={8} />
        </div>
      </div>
    </div>
  );
};

export const BrandDetailKpisSkeleton = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={`brand-detail-kpi-${i}`}
          className="card"
          style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <Skeleton width={44} height={44} borderRadius={10} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <Skeleton width="60%" height={12} borderRadius={3} />
            <Skeleton width="80%" height={22} borderRadius={4} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const BrandDetailAnalyticsSkeleton = () => {
  return (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Title and Range Picker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <Skeleton width="180px" height={22} borderRadius={4} />
        <Skeleton width="140px" height={36} borderRadius={8} />
      </div>

      {/* Chart Section */}
      <div style={{ width: '100%', height: '240px', padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', backgroundColor: '#fcfcfd' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={`chart-line-${i}`} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Skeleton width="24px" height={10} style={{ marginRight: '10px' }} />
              <Skeleton width="100%" height={1} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '34px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={`chart-label-${i}`} width="30px" height={10} />
            ))}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Post Details', 'Platform', 'Status', 'Cost', 'Revenue', 'Profit', 'Actions'].map((h, idx) => (
                <th key={idx} style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Skeleton width="60px" height={12} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((row) => (
              <tr key={`perf-row-${row}`} style={{ backgroundColor: row % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Skeleton width={36} height={36} borderRadius={6} />
                    <Skeleton width="120px" height={14} />
                  </div>
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width={22} height={22} borderRadius="50%" /></td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width="65px" height={22} borderRadius={11} /></td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width="50px" height={14} /></td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width="50px" height={14} /></td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width="60px" height={14} /></td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}><Skeleton width="28px" height={28} borderRadius={6} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
