import React, { useEffect } from 'react';
import { useFbInsights } from '../hooks/useFbInsights';

export const InsightPanel = ({ postId, pageId, onClose }) => {
  const { insights, loading, error, fetchInsights } = useFbInsights();

  useEffect(() => {
    if (postId && pageId) {
      fetchInsights(postId, pageId);
    }
  }, [postId, pageId]);

  if (loading) return <div>Loading insights...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h4>Post Insights</h4>
        <button onClick={onClose}>Close</button>
      </div>
      {insights && insights.length > 0 ? (
        <ul>
          {insights.map(metric => (
            <li key={metric.name}>
              <strong>{metric.title}:</strong> {metric.values?.[0]?.value || 0}
            </li>
          ))}
        </ul>
      ) : (
        <p>No insights available yet.</p>
      )}
    </div>
  );
};
