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

export const BrandInsightsChart = ({ detail, timeFilter, getDateRange }) => {
  // Filter posts by time range
  const timeFilteredPosts = useMemo(() => {
    if (!detail || !detail.posts) return [];
    const range = getDateRange ? getDateRange(timeFilter) : null;
    if (!range) return detail.posts;
    return detail.posts.filter(p => {
      const timestamp = p.published_time || p.scheduled_time;
      if (!timestamp) return false;
      const d = new Date(timestamp);
      return d >= range.start && d <= range.end;
    });
  }, [detail, timeFilter, getDateRange]);

  // Compute filtered totals for KPI cards
  const filteredTotals = useMemo(() => {
    const totals = {
      total_views: timeFilteredPosts.reduce((sum, p) => sum + (p.views_count || 0), 0),
      total_reach: timeFilteredPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0),
      total_likes: timeFilteredPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0),
      total_comments: timeFilteredPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0),
      total_shares: timeFilteredPosts.reduce((sum, p) => sum + (p.shares_count || 0), 0),
    };
    
    totals.engagement_rate = totals.total_reach > 0 
      ? (((totals.total_likes + totals.total_comments + totals.total_shares) / totals.total_reach) * 100).toFixed(1)
      : 0;
      
    return totals;
  }, [timeFilteredPosts]);

  const chartData = useMemo(() => {
    if (timeFilteredPosts.length === 0) return [];

    // Group engagement by date (e.g. "Dec 18")
    const dateMap = {};

    timeFilteredPosts.forEach((post) => {
      // Use published_time or scheduled_time
      const timestamp = post.published_time || post.scheduled_time;
      if (!timestamp) return;

      const dateObj = new Date(timestamp);
      const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
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

    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [timeFilteredPosts]);

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
      <div className="chart-header">
        <div className="chart-title-wrap">
          <h3 className="chart-title" style={{ fontSize: '18px', margin: 0, fontWeight: '600' }}>Media Performance</h3>
          <p className="chart-subtitle">Media Views & Unique Viewers</p>
        </div>

        <div className="chart-mini-kpis">
          {/* Media Views Mini KPI */}
          <div className="mini-kpi-card">
            <div className="mini-kpi-icon-wrap">
              <Eye size={16} color="#6366f1" />
              <span className="mini-kpi-icon-label" style={{ color: '#6366f1' }}>Views</span>
            </div>
            <div className="mini-kpi-data">
              <span className="mini-kpi-value" style={{ color: '#6366f1' }}>{formatCompactNumber(filteredTotals.total_views || 0)}</span>
            </div>
          </div>

          {/* Unique Viewers Mini KPI */}
          <div className="mini-kpi-card">
            <div className="mini-kpi-icon-wrap">
              <Eye size={16} color="#0ea5e9" />
              <span className="mini-kpi-icon-label" style={{ color: '#0ea5e9' }}>Reach</span>
            </div>
            <div className="mini-kpi-data">
              <span className="mini-kpi-value" style={{ color: '#0ea5e9' }}>{formatCompactNumber(filteredTotals.total_reach || 0)}</span>
            </div>
          </div>

          {/* Likes Mini KPI */}
          <div className="mini-kpi-card">
            <div className="mini-kpi-icon-wrap">
              <Heart size={16} color="#f43f5e" />
              <span className="mini-kpi-icon-label" style={{ color: '#f43f5e' }}>Likes</span>
            </div>
            <div className="mini-kpi-data">
              <span className="mini-kpi-value" style={{ color: '#f43f5e' }}>{formatCompactNumber(filteredTotals.total_likes)}</span>
            </div>
          </div>

          {/* Comments Mini KPI */}
          <div className="mini-kpi-card">
            <div className="mini-kpi-icon-wrap">
              <MessageCircle size={16} color="#8b5cf6" />
              <span className="mini-kpi-icon-label" style={{ color: '#8b5cf6' }}>Comments</span>
            </div>
            <div className="mini-kpi-data">
              <span className="mini-kpi-value" style={{ color: '#8b5cf6' }}>{formatCompactNumber(filteredTotals.total_comments)}</span>
            </div>
          </div>

          {/* Shares Mini KPI */}
          <div className="mini-kpi-card">
            <div className="mini-kpi-icon-wrap">
              <Share2 size={16} color="#10b981" />
              <span className="mini-kpi-icon-label" style={{color: '#10b981'}}>Shares</span>
            </div>
            <div className="mini-kpi-data">
              <span className="mini-kpi-value" style={{color: '#10b981'}}>{formatCompactNumber(filteredTotals.total_shares)}</span>
            </div>
          </div>

          {/* Engagement Rate Mini KPI */}
          <div className="mini-kpi-card" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <div className="mini-kpi-icon-wrap">
              <TrendingUp size={16} color="#d97706" />
              <span className="mini-kpi-icon-label" style={{color: '#d97706'}}>Engagement Rate</span>
            </div>
            <div className="mini-kpi-data">
              <span className="mini-kpi-value" style={{color: '#d97706'}}>{filteredTotals.engagement_rate}%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
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
              barSize={20}
            />
            <Bar
              dataKey="views"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
