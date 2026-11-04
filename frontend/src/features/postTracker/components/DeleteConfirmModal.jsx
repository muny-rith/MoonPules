import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Modal, Button } from '../../../shared/components/ui';

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
    <Modal
      isOpen={isOpen}
      onClose={deleting ? undefined : onClose}
      size="sm"
    >
      {/* Red Warning Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
          padding: '20px 24px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #fee2e2',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} color="#dc2626" />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 700,
                color: '#991b1b',
              }}
            >
              Delete Post
            </h2>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '12.5px',
                color: '#b91c1c',
                fontWeight: 500,
              }}
            >
              This action cannot be undone
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          style={{
            background: 'none',
            border: 'none',
            cursor: deleting ? 'not-allowed' : 'pointer',
            padding: '4px',
            borderRadius: '6px',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fecaca')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <Modal.Body style={{ padding: '20px 24px' }}>
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
            padding: '12px 14px',
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
                fontSize: '13.5px',
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
      </Modal.Body>

      {/* Actions */}
      <Modal.Footer>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={deleting}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          loading={deleting}
          icon={<Trash2 size={15} />}
        >
          Delete Post
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default DeleteConfirmModal;
