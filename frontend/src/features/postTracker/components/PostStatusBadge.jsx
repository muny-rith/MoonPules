import React from 'react';
import { POST_STATUS, POST_STATUS_LABELS } from '../constants';

export const PostStatusBadge = ({ status }) => {
  let bg = '#fef08a';
  let color = '#854d0e';

  if (status === 'published' || status === POST_STATUS.PUBLISHED) {
    bg = '#dcfce7';
    color = '#166534';
  } else if (status === 'failed') {
    bg = '#fee2e2';
    color = '#991b1b';
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
