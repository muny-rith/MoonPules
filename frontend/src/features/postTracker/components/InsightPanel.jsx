import React, { useEffect } from 'react';
import { useFbInsights } from '../hooks/useFbInsights';
import { Eye, Heart, MessageCircle, Share2, Users, Activity, X } from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

const getMetricIcon = (name) => {
  if (name.includes('view')) return <Eye size={18} color="#6366f1" />;
  if (name.includes('reach') || name.includes('unique')) return <Users size={18} color="#0ea5e9" />;
  if (name.includes('like') || name.includes('reaction')) return <Heart size={18} color="#f43f5e" />;
  if (name.includes('comment')) return <MessageCircle size={18} color="#8b5cf6" />;
  if (name.includes('share')) return <Share2 size={18} color="#10b981" />;
  return <Activity size={18} color="#94a3b8" />;
};

export const InsightPanel = ({ postId, pageId, onClose }) => {
  const { insights, loading, error, fetchInsights } = useFbInsights();

  useEffect(() => {
    if (postId && pageId) {
      fetchInsights(postId, pageId);
    }
  }, [postId, pageId]);

  if (loading) return (
    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--text-muted)" />
          <Skeleton width="160px" height={20} />
        </h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={`skeleton-metric-${i}`} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton type="icon" width={18} height={18} borderRadius={4} />
              <Skeleton width="80px" height={16} />
            </div>
            <Skeleton width="100px" height={28} style={{ marginTop: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
  
  if (error) return (
    <div className="alert-error-banner" style={{ margin: 0 }}>
      <strong>Failed to load insights:</strong> {error}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--color-primary)" />
          Live Facebook Insights
        </h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>
      </div>
      
      {insights && insights.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {insights.map(metric => (
            <div key={metric.name} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>
                {getMetricIcon(metric.name)}
                {metric.title}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>
                {(metric.values?.[0]?.value || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '24px' }}>No insights available for this post yet.</p>
      )}
    </div>
  );
};
