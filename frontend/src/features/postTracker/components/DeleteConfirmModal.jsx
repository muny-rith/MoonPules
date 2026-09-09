import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

export const DeleteConfirmModal = ({ isOpen, onClose, post, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !post) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm(post.id);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    } finally {
      setDeleting(false);
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.25s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Red Warning Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
            padding: '24px 24px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
              }}
            >
              <AlertTriangle size={24} color="#dc2626" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#991b1b',
                }}
              >
                Delete Post
              </h2>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '13px',
                  color: '#b91c1c',
                  fontWeight: 500,
                }}
              >
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              background: 'none',
              border: 'none',
              cursor: deleting ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '8px',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fecaca')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: '14px',
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            Are you sure you want to stop tracking this post? All associated metrics
            and data will be permanently removed.
          </p>

          {/* Post Preview Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#e2e8f0',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <img
                src={
                  post.product_image ||
                  `https://ui-avatars.com/api/?name=${post.product_name || 'P'}&background=c7d2fe&color=3730a3&rounded=false`
                }
                alt="product"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: '#0f172a',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {post.product_name || `Product ID: ${post.product_id}`}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '2px',
                }}
              >
                {post.page_name || post.page_id} · Post #{post.id}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '16px 24px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              fontWeight: 600,
              fontSize: '14px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: deleting
                ? '#f87171'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.15s',
              opacity: deleting ? 0.8 : 1,
            }}
          >
            {deleting ? (
              <>
                <div className="spin-animation" style={{ display: 'flex' }}>
                  <Trash2 size={15} />
                </div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={15} />
                Delete Post
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
