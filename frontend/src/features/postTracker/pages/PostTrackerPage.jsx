import React, { useState } from 'react';
import { usePostTracker } from '../hooks/usePostTracker';
import { PostStatusBadge } from '../components/PostStatusBadge';
import { InsightPanel } from '../components/InsightPanel';
import { MarkPostModal } from '../components/MarkPostModal';
import { POST_STATUS } from '../constants';

export const PostTrackerPage = () => {
  const { posts, loading, error, addPost, reload } = usePostTracker();
  const [selectedPostForInsight, setSelectedPostForInsight] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red', padding: '24px' }}>Error: {error}</div>;

  return (
    <div>
      <div className="tasks-page-header">
        <h1>Moon Pulse Tracker</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          Mark Post
        </button>
      </div>

      <div className="table-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Page</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <React.Fragment key={post.id}>
                <tr>
                  <td>{post.product_id}</td>
                  <td>{post.page_name || post.page_id}</td>
                  <td><PostStatusBadge status={post.status} /></td>
                  <td>
                    {post.status === POST_STATUS.PUBLISHED && (
                      <button 
                        onClick={() => setSelectedPostForInsight(selectedPostForInsight === post.id ? null : post.id)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {selectedPostForInsight === post.id ? 'Hide Insight' : 'Show Insight'}
                      </button>
                    )}
                  </td>
                </tr>
                {selectedPostForInsight === post.id && (
                  <tr>
                    <td colSpan="4" style={{ padding: '0 24px 24px' }}>
                      <InsightPanel postId={post.fb_post_id} pageId={post.page_id} onClose={() => setSelectedPostForInsight(null)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  No posts tracked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MarkPostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPostMarked={addPost} 
      />
    </div>
  );
};
