import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Heart, MessageCircle, Share2, Eye, TrendingUp } from 'lucide-react';

export const BrandInsightsChart = ({ detail, posts = [] }) => {
  console.log("BrandInsightsChart rendered with posts:", posts);
  console.log("timeFilter or detail.posts:", detail?.posts?.length);
  // Compute filtered totals for KPI cards
  const filteredTotals = useMemo(() => {
    const totals = {
      total_views: posts.reduce((sum, p) => sum + (p.views_count || 0), 0),
      total_reach: posts.reduce((sum, p) => sum + (p.reach_count || 0), 0),
      total_likes: posts.reduce((sum, p) => sum + (p.likes_count || 0), 0),
      total_comments: posts.reduce((sum, p) => sum + (p.comments_count || 0), 0),
      total_shares: posts.reduce((sum, p) => sum + (p.shares_count || 0), 0),
    };
    
    totals.engagement_rate = totals.total_reach > 0 
      ? (((totals.total_likes + totals.total_comments + totals.total_shares) / totals.total_reach) * 100).toFixed(1)
      : '0.0';
      
    return totals;
  }, [posts]);

  const chartData = useMemo(() => {
    if (posts.length === 0) return [];

    // Group engagement by date
    const dateMap = {};

    posts.forEach((post) => {
      // Use published_time or scheduled_time
      const timestamp = post.published_time || post.scheduled_time;
      if (!timestamp) return;

      const dateObj = new Date(timestamp);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          views: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
        };
      }

      const views = post.views_count || 0;
      const reach = post.reach_count || 0;
      const likes = post.likes_count || 0;
      const comments = post.comments_count || 0;
      const shares = post.shares_count || 0;

      dateMap[dateKey].views += views;
      dateMap[dateKey].reach += reach;
      dateMap[dateKey].likes += likes;
      dateMap[dateKey].comments += comments;
      dateMap[dateKey].shares += shares;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [posts]);

  // If no posts, show a placeholder
  if (!detail || !detail.posts || detail.posts.length === 0) {
    return (
      <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Eye size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>No Insights Data</h3>
          <p>Tracked posts data will appear here once synced from Facebook.</p>
        </div>
      </div>
    );
  }

  // Formatting large numbers (e.g., 23430 -> 23.4k)
  const formatCompactNumber = (number) => {
    if (number < 1000) {
      return number;
    } else if (number >= 1000 && number < 1000000) {
      return (number / 1000).toFixed(1) + "K";
    } else if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + "M";
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>{label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ margin: 0, color: '#1e3a8a', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#1e3a8a', marginRight: '6px' }} />
              Reach: {payload[0]?.payload?.reach?.toLocaleString() || 0}
            </p>
            <p style={{ margin: 0, color: '#0ea5e9', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9', marginRight: '6px' }} />
              Views: {payload[0]?.payload?.views?.toLocaleString() || 0}
            </p>
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Heart size={14} color="#f43f5e" /> Likes: {payload[0]?.payload?.likes?.toLocaleString() || 0}
            </p>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageCircle size={14} color="#8b5cf6" /> Comments: {payload[0]?.payload?.comments?.toLocaleString() || 0}
            </p>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Share2 size={14} color="#10b981" /> Shares: {payload[0]?.payload?.shares?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>

      <div className="kpi-grid-container">
        {/* Media Views */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Eye size={14} color="#6366f1" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Views</span>
          </div>
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatCompactNumber(filteredTotals.total_views || 0)}</div>
        </div>

        {/* Unique Viewers */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Eye size={14} color="#0ea5e9" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reach</span>
          </div>
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatCompactNumber(filteredTotals.total_reach || 0)}</div>
        </div>

        {/* Likes */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Heart size={14} color="#f43f5e" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Likes</span>
          </div>
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatCompactNumber(filteredTotals.total_likes)}</div>
        </div>

        {/* Comments */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <MessageCircle size={14} color="#8b5cf6" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comments</span>
          </div>
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatCompactNumber(filteredTotals.total_comments)}</div>
        </div>

        {/* Shares */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Share2 size={14} color="#10b981" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shares</span>
          </div>
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatCompactNumber(filteredTotals.total_shares)}</div>
        </div>

        {/* Engagement Rate */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <TrendingUp size={14} color="#d97706" />
            <span style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engagement</span>
          </div>
          <div style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>{filteredTotals.engagement_rate}%</div>
        </div>
      </div>

      <div className="chart-area" style={{ width: '100%', height: 350, outline: 'none' }} tabIndex="-1">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
              style={{ outline: 'none' }}
            >
              <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={formatCompactNumber}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={<CustomTooltip />}
                isAnimationActive={false}
              />
              <Bar
                dataKey="reach"
                fill="#1e3a8a"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="views"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Eye size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontWeight: 500, fontSize: '15px' }}>No data available</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.7 }}>Try adjusting your time filter or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
};
