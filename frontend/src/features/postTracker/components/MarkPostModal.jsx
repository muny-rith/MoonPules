import React, { useState, useEffect } from 'react';
import * as api from '../api/postTrackerApi';

export const MarkPostModal = ({ isOpen, onClose, onPostMarked }) => {
  const [pageId, setPageId] = useState('1'); // Mock default page
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadScheduled();
    }
  }, [isOpen, pageId]);

  const loadScheduled = async () => {
    try {
      setLoading(true);
      const data = await api.fetchScheduledFbPosts(pageId);
      setScheduledPosts(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (post) => {
    try {
      await onPostMarked({
        product_id: 1, // Mock product ID for now
        page_id: parseInt(pageId, 10),
        fb_post_id: post.id,
        status: 'scheduled',
        scheduled_time: post.created_time,
      });
      onClose();
    } catch (err) {
      console.error('Failed to mark post', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2>Mark Scheduled Post</h2>
        {loading ? <p>Loading FB posts...</p> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {scheduledPosts.map(post => (
              <li key={post.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '250px' }}>{post.message}</span>
                <button onClick={() => handleMark(post)}>Mark</button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} style={{ marginTop: '16px', width: '100%' }}>Cancel</button>
      </div>
    </div>
  );
};
