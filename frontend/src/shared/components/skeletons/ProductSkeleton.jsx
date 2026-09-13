import React from 'react';
import { Skeleton } from './Skeleton';

export const ProductGridSkeleton = ({ count = 24 }) => {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`product-grid-skel-${i}`} className="product-card" style={{ pointerEvents: 'none' }}>
          {/* Image Container */}
          <div className="product-card-image-wrap" style={{ position: 'relative' }}>
            <Skeleton width="100%" height="100%" borderRadius={0} />
            <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
              <Skeleton width="60px" height={20} borderRadius={10} />
            </div>
          </div>

          {/* Card Body */}
          <div className="product-card-content">
            {/* Meta row: SKU chip & Stock badge */}
            <div className="product-card-meta-row">
              <Skeleton width="75px" height={20} borderRadius={4} />
              <Skeleton width="85px" height={20} borderRadius={10} />
            </div>

            {/* Title */}
            <div style={{ margin: '4px 0 12px 0' }}>
              <Skeleton width={i % 2 === 0 ? '85%' : '70%'} height={18} borderRadius={4} />
            </div>

            <div className="product-card-footer" style={{ marginTop: 'auto' }}>
              <div className="product-price-block" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Skeleton width="30px" margin="4px 0" height={10} borderRadius={2} />
                <Skeleton width="55px" height={18} borderRadius={4} />
              </div>
              <Skeleton width="92px" height={32} borderRadius={8} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProductTableSkeleton = ({ rowCount = 10 }) => {
  return (
    <div className="table-card product-table-card">
      <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ width: '60px' }}>Item</th>
            <th>Product Name</th>
            <th>SKU / Code</th>
            <th>Category</th>
            <th>Unit Price</th>
            <th>On Hand</th>
            <th>Stock Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={`prod-row-skel-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
              {/* Item Thumbnail */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Skeleton width={40} height={40} borderRadius={6} />
              </td>

              {/* Product Name */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Skeleton width={i % 2 === 0 ? '160px' : '130px'} height={15} borderRadius={4} />
              </td>

              {/* SKU / Code */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Skeleton width="75px" height={14} borderRadius={3} />
              </td>

              {/* Category */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Skeleton width="85px" height={14} borderRadius={3} />
              </td>

              {/* Unit Price */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Skeleton width="50px" height={14} borderRadius={3} />
              </td>

              {/* On Hand */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Skeleton width="40px" height={14} borderRadius={3} />
              </td>

              {/* Stock Status */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Skeleton width="75px" height={22} borderRadius={11} />
              </td>

              {/* Actions */}
              <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                <Skeleton width="85px" height={30} borderRadius={6} style={{ marginLeft: 'auto' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
