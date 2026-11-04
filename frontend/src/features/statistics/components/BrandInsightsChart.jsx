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
import { Heart, MessageCircle, Share2, Eye, TrendingUp, Calendar } from 'lucide-react';

export const BrandInsightsChart = ({ detail, posts = [], timeFilter = 'this_month', onResetFilter }) => {
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

  // If no posts in the filtered range, show a clean, helpful empty state (no nested card-in-card double border)
  if (!detail || !detail.posts || detail.posts.length === 0) {
    const isFiltered = detail && detail.total_posts > 0;
    const filterLabel =
      timeFilter === 'today'
        ? 'Today'
        : timeFilter === 'yesterday'
        ? 'Yesterday'
        : timeFilter === 'this_week'
        ? 'This Week'
        : timeFilter === 'last_month'
        ? 'Last Month'
        : timeFilter === 'this_month'
        ? 'This Month'
        : timeFilter === 'custom'
        ? 'Selected Date Range'
        : 'Selected Range';

    return (
      <div
        className="brand-analytics-empty-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          backgroundColor: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '12px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
          }}
        >
          <Calendar size={22} color="#2563eb" />
        </div>
        <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
          {isFiltered ? `No Posts Published ${filterLabel === 'Selected Date Range' ? 'in Range' : 'for ' + filterLabel}` : 'No Insights Data Yet'}
        </h4>
        <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
          {isFiltered
            ? `This brand has ${detail.total_posts} published posts total, but none match the current "${filterLabel}" filter.`
            : 'Tracked posts data will appear here once synced from Facebook.'}
        </p>
        {isFiltered && onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            style={{
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            Switch to This Month
          </button>
        )}
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
    <div className="brand-analytics-chart-container" style={{ display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* Modern Executive KPI Grid */}
      <div
        className="brand-analytics-kpi-grid"
        style={{
          display: 'grid',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Views */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Views</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={13} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
            {formatCompactNumber(filteredTotals.total_views || 0)}
          </div>
        </div>

        {/* Reach */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reach</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={13} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
            {formatCompactNumber(filteredTotals.total_reach || 0)}
          </div>
        </div>

        {/* Likes */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Likes</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={13} color="#f43f5e" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
            {formatCompactNumber(filteredTotals.total_likes || 0)}
          </div>
        </div>

        {/* Comments */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comments</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={13} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
            {formatCompactNumber(filteredTotals.total_comments || 0)}
          </div>
        </div>

        {/* Shares */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Shares</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={13} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1.1 }}>
            {formatCompactNumber(filteredTotals.total_shares || 0)}
          </div>
        </div>

        {/* Engagement Rate */}
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Engagement</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={13} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#92400e', lineHeight: 1.1 }}>
            {filteredTotals.engagement_rate}%
          </div>
        </div>
      </div>

      <div className="chart-area" style={{ width: '100%', flex: 1, minHeight: 330, outline: 'none' }} tabIndex="-1">
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
                maxBarSize={48}
              />
              <Bar
                dataKey="views"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
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

export default BrandInsightsChart;
