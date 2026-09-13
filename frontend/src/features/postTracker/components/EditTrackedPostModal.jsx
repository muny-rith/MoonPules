import React, { useState, useEffect } from 'react';
import { ProductPicker } from '../../product/component/ProductPicker';
import { parseFbPostUrl } from '../utils/parseFbPostUrl';
import { X, Edit3, Link2, Calendar, MessageSquare, AlertCircle } from 'lucide-react';

export const EditTrackedPostModal = ({ isOpen, onClose, post, onSave }) => {
  const [productId, setProductId] = useState('');
  const [fbPostIdInput, setFbPostIdInput] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [contentCost, setContentCost] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [attributionWindow, setAttributionWindow] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    if (isOpen && post) {
      setProductId(post.product_id || '');
      setFbPostIdInput(post.fb_post_id || '');
      setMessage(post.message || '');
      setContentCost(post.content_cost || 0);
      setAdSpend(post.ad_spend || 0);
      setAttributionWindow(post.attribution_window_days || 7);

      if (post.scheduled_time) {
        const d = new Date(post.scheduled_time);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledTime(localIso);
      } else {
        setScheduledTime('');
      }
      setUrlError('');
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const handlePostIdOrUrlChange = (val) => {
    setFbPostIdInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setUrlError('');
      return;
    }

    if (/^\d+_\d+$/.test(trimmed)) {
      setUrlError('');
      return;
    }

    if (/^\d+$/.test(trimmed)) {
      setUrlError('');
      return;
    }

    const parsed = parseFbPostUrl(trimmed);
    if (parsed) {
      setUrlError('');
    } else {
      setUrlError('Paste either the "{pageId}_{postId}", numeric ID, or standard Facebook URL.');
    }
  };

  const getCleanFbPostId = () => {
    const trimmed = fbPostIdInput.trim();
    if (!trimmed) return null;

    if (/^\d+_\d+$/.test(trimmed)) return trimmed;

    if (/^\d+$/.test(trimmed) && post.fb_page_id) {
      return `${post.fb_page_id}_${trimmed}`;
    }

    const parsed = parseFbPostUrl(trimmed);
    if (parsed) return parsed;

    return trimmed;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) {
      alert("Please select a product");
      return;
    }

    const finalFbPostId = getCleanFbPostId();
    
    setSubmitting(true);
    try {
      await onSave(post.id, { 
        product_id: productId,
        fb_post_id: finalFbPostId,
        message: message,
        scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : post.scheduled_time,
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
      <div className="modal-content modal-card overflow-visible" style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Edit3 size={20} className="icon-blue" />
            <h2>Edit Tracked Post #{post.id}</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>
        
        <p className="modal-subtitle">
          Update product assignment, Facebook Post ID/URL, schedule timing, or cost settings.
        </p>
        
        <div className="modal-form-group">
          <label className="modal-label">Product Assignment</label>
          <ProductPicker 
            value={productId} 
            onChange={setProductId} 
          />
        </div>

        <div className="modal-form-group">
          <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link2 size={15} className="icon-blue" /> Facebook Post URL or ID
          </label>
          <input
            type="text"
            className="modal-text-input"
            placeholder="Paste live Facebook post link or {pageId}_{postId}"
            value={fbPostIdInput}
            onChange={(e) => handlePostIdOrUrlChange(e.target.value)}
          />
          {urlError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
              <AlertCircle size={12} /> {urlError}
            </div>
          )}
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
            Updating this automatically verifies the post with Facebook and pulls live metrics.
          </span>
        </div>

        {post.status === 'scheduled' && (
          <>
            <div className="modal-form-group">
              <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} className="icon-blue" /> Scheduled Publish Time
              </label>
              <input
                type="datetime-local"
                className="modal-text-input"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={15} className="icon-blue" /> Caption / Message
              </label>
              <textarea
                className="modal-text-input"
                rows="3"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Post caption..."
              />
            </div>
          </>
        )}

        <div className="modal-form-group">
          <label className="modal-label">Costs & Attribution</label>
          <div className="modal-cost-grid">
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

        <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
