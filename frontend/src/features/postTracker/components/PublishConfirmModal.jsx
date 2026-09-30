import React, { useState } from 'react';
import { X, Send, AlertCircle, Calendar } from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';

export const PublishConfirmModal = ({ isOpen, onClose, post, onConfirm }) => {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !post) return null;

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      await onConfirm(post.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to publish post to Facebook.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !publishing) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.25s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            borderBottom: '1px solid #dcfce7',
            padding: '24px 24px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)',
                color: '#16a34a',
                flexShrink: 0,
              }}
            >
              <Send size={22} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#14532d',
                }}
              >
                Publish to Facebook Now?
              </h2>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: '13px',
                  color: '#166534',
                  fontWeight: 500,
                }}
              >
                This will publish this post live immediately.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={publishing}
            style={{
              background: 'none',
              border: 'none',
              cursor: publishing ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '8px',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dcfce7')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <p
            style={{
              margin: '0 0 16px',
              fontSize: '14px',
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            Are you ready to publish this post right now instead of waiting for its scheduled time?
          </p>

          {/* Post Preview Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                backgroundColor: '#e2e8f0',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid #e2e8f0',
              }}
            >
              <img
                src={
                  post.media_url ||
                  post.product_image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(post.product_name || 'Post')}&background=c7d2fe&color=3730a3&rounded=false`
                }
                alt="post preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: '#0f172a',
                  fontSize: '14.5px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {post.product_name || post.brand_name || `Target #${post.product_id || post.brand_id}`}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FaFacebook size={12} color="#1877F2" />
                <span>{post.page_name || post.page_id || 'Connected Facebook Page'}</span>
              </div>
              {post.scheduled_time && (
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#d97706',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 500,
                  }}
                >
                  <Calendar size={11} />
                  <span>Scheduled: {new Date(post.scheduled_time).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#fafafa',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: publishing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!publishing) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: publishing
                ? '#86efac'
                : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: publishing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.15s',
              opacity: publishing ? 0.85 : 1,
            }}
          >
            {publishing ? (
              <>
                <span className="spin-animation" style={{ display: 'flex' }}>
                  <Send size={14} />
                </span>
                Publishing to Facebook...
              </>
            ) : (
              <>
                <Send size={14} />
                Publish Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
