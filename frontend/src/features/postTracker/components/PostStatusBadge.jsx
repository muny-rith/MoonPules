import React from 'react';
import { POST_STATUS, POST_STATUS_LABELS } from '../constants';

export const PostStatusBadge = ({ status }) => {
  const isPublished = status === POST_STATUS.PUBLISHED;
  return (
    <span style={{
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '0.875rem',
      fontWeight: 'bold',
      backgroundColor: isPublished ? '#dcfce7' : '#fef08a',
      color: isPublished ? '#166534' : '#854d0e',
    }}>
      {POST_STATUS_LABELS[status] || status}
    </span>
  );
};
