import React from 'react';
import { Tag, CheckCircle2, AlertTriangle, XCircle, Share2, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProductTable = ({ products }) => {
  const navigate = useNavigate();

  const getStockBadge = (qty) => {
    if (qty > 20) {
      return (
        <span className="stock-badge in-stock">
          <CheckCircle2 size={12} /> {qty} In Stock
        </span>
      );
    }
    if (qty > 0) {
      return (
        <span className="stock-badge low-stock">
          <AlertTriangle size={12} /> Low ({qty})
        </span>
      );
    }
    return (
      <span className="stock-badge out-of-stock">
        <XCircle size={12} /> Out of Stock
      </span>
    );
  };

  return (
    <div className="table-card product-table-card">
      <table className="custom-table">
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
          {products.map((product) => (
            <tr key={product.product_id}>
              <td>
                <img 
                  src={product.image_url} 
                  alt={product.product_name}
                  className="product-table-thumb"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
                  }}
                />
              </td>
              <td>
                <div className="product-table-name-wrap">
                  <span className="product-table-name">{product.product_name}</span>
                  {product.department && (
                    <span className="product-table-sub">{product.department}</span>
                  )}
                </div>
              </td>
              <td>
                <span className="product-code-chip">
                  <Tag size={11} /> {product.product_code}
                </span>
              </td>
              <td>
                <span className="category-tag-chip">
                  <Layers size={11} /> {product.category_name}
                </span>
              </td>
              <td>
                <strong className="product-table-price">${Number(product.unit_price).toFixed(2)}</strong>
              </td>
              <td>
                <span className="product-table-qty">{product.on_hand_qty} units</span>
              </td>
              <td>
                {getStockBadge(product.on_hand_qty)}
              </td>
              <td style={{ textAlign: 'right' }}>
                <button 
                  className="btn-primary-soft"
                  onClick={() => navigate('/tasks')}
                  title="Mark social post for this product"
                >
                  <Share2 size={12} />
                  <span>Track Post</span>
                </button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                No products found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
