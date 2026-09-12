import React from 'react';
import { POST_STATUS, POST_STATUS_LABELS } from '../constants';

export const PostStatusBadge = ({ status }) => {
  let bg = '#fef08a';
  let color = '#854d0e';

  if (status === 'published' || status === POST_STATUS.PUBLISHED) {
    bg = '#dcfce7';
    color = '#166534';
  } else if (status === 'failed' || status === POST_STATUS.FAILED) {
    bg = '#fee2e2';
    color = '#991b1b';
  } else if (status === 'archived' || status === POST_STATUS.ARCHIVED) {
    bg = '#f1f5f9';
    color = '#475569';
  }

  const label = POST_STATUS_LABELS[status] || (status ? status.toUpperCase() : 'UNKNOWN');

  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'capitalize',
      backgroundColor: bg,
      color: color,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      {label}
    </span>
  );
};
