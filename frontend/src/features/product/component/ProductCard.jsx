import React, { useState } from 'react';
import { Package, Tag, Layers, CheckCircle2, AlertTriangle, XCircle, Share2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

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
          <AlertTriangle size={12} /> Low Stock ({qty})
        </span>
      );
    }
    return (
      <span className="stock-badge out-of-stock">
        <XCircle size={12} /> Out of Stock
      </span>
    );
  };

  const copySku = (e) => {
    e.stopPropagation();
    const skuCode = product.product_code || (product.product_id ? `SKU-${product.product_id}` : '');
    if (skuCode) {
      navigator.clipboard.writeText(skuCode);
    }
  };

  const hasImage = Boolean(product.image_url && !imgError);
  const firstLetter = (product.product_name || product.category_name || 'P').trim().charAt(0).toUpperCase();
  const displaySku = product.product_code || (product.product_id ? `SKU-${product.product_id}` : 'SKU-0');

  return (
    <div className="product-card">
      <div className="product-card-image-wrap">
        {hasImage ? (
          <img 
            src={product.image_url} 
            alt={product.product_name} 
            className="product-card-image"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-card-no-image">
            <div className="product-card-letter-badge">
              {firstLetter}
            </div>
            <span className="product-card-no-image-sub">{product.product_name}</span>
          </div>
        )}
        <div className="product-card-category-pill">
          {product.category_name}
        </div>
        {product.department && (
          <div className="product-card-dept-pill">
            {product.department}
          </div>
        )}
      </div>

      <div className="product-card-content">
        <div className="product-card-meta-row">
          <span className="product-code-chip" onClick={copySku} title="Click to copy SKU">
            <Tag size={11} /> {displaySku}
          </span>
          {getStockBadge(product.on_hand_qty)}
        </div>

        <h3 className="product-card-title" title={product.product_name}>
          {product.product_name}
        </h3>

        <div className="product-card-footer">
          <div className="product-price-block">
            <span className="price-label">Price</span>
            <span className="price-val">${Number(product.unit_price).toFixed(2)}</span>
          </div>

          <button 
            className="btn-track-social"
            onClick={() => navigate('/tasks')}
            title="Go to Post Tracker to link social posts"
          >
            <Share2 size={13} />
            <span>Track Post</span>
          </button>
        </div>
      </div>
    </div>
  );
};
