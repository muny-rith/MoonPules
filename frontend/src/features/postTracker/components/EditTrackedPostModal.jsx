import React, { useState, useEffect } from 'react';
import { ProductPicker } from '../../product/component/ProductPicker';
import { X, Edit3 } from 'lucide-react';

export const EditTrackedPostModal = ({ isOpen, onClose, post, onSave }) => {
  const [productId, setProductId] = useState('');
  const [contentCost, setContentCost] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [attributionWindow, setAttributionWindow] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && post) {
      setProductId(post.product_id);
      setContentCost(post.content_cost || 0);
      setAdSpend(post.ad_spend || 0);
      setAttributionWindow(post.attribution_window_days || 7);
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) {
      alert("Please select a product");
      return;
    }
    
    setSubmitting(true);
    try {
      await onSave(post.id, { 
        product_id: productId,
        content_cost: parseFloat(contentCost) || 0,
        ad_spend: parseFloat(adSpend) || 0,
        attribution_window_days: parseInt(attributionWindow, 10) || 7,
      });
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-card overflow-visible" style={{ maxWidth: '420px', minHeight: '400px' }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Edit3 size={20} className="icon-blue" />
            <h2>Edit Tracked Post</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>
        
        <p className="modal-subtitle">
          Update the product assignment for this tracked Facebook post.
        </p>
        
        <div className="modal-form-group">
          <label className="modal-label">Select Product</label>
            <ProductPicker 
              value={productId} 
              onChange={setProductId} 
            />
        </div>

        <div className="modal-form-group">
          <label className="modal-label">Costs & Attribution</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Content Cost ($)</label>
              <input 
                type="number" 
                value={contentCost} 
                onChange={(e) => setContentCost(e.target.value)} 
                className="modal-text-input" 
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ad Spend ($)</label>
              <input 
                type="number" 
                value={adSpend} 
                onChange={(e) => setAdSpend(e.target.value)} 
                className="modal-text-input" 
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Attribution (Days)</label>
              <input 
                type="number" 
                value={attributionWindow} 
                onChange={(e) => setAttributionWindow(e.target.value)} 
                className="modal-text-input"
                min="1"
                max="90"
              />
            </div>
          </div>
        </div>
        <div className="modal-actions" style={{ marginTop: 'auto' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitting} 
            className="btn-primary"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
