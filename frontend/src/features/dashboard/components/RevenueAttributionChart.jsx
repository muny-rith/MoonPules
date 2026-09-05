import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Users, ChevronDown, Sparkles, Calendar } from 'lucide-react';
import { FaFacebook, FaTiktok } from 'react-icons/fa';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const RevenueAttributionChart = ({ data, loading, dateRange = 'this_week', platform = 'all' }) => {
  const { chartData, totals, rangeString, rangeLabel } = useMemo(() => {
    const defaultData = { chartData: [], totals: { views: 0, reach: 0 }, rangeString: '', rangeLabel: '' };
    if (!data || !data.all_posts_profit) return defaultData;

    // Filter by platform if specified
    const filteredPosts = data.all_posts_profit.filter(post => {
      if (!platform || platform === 'all') return true;
      const p = (post.platform || 'facebook').toLowerCase();
      return p === platform.toLowerCase() || (platform === 'facebook' && p === 'fb');
    });

    // Group by date (YYYY-MM-DD)
    const dataMap = {};
    let totalViews = 0;
    let totalReach = 0;

    filteredPosts.forEach(post => {
      if (!post.published_time) return;

      const dateStr = new Date(post.published_time).toISOString().split('T')[0];
      if (!dataMap[dateStr]) {
        dataMap[dateStr] = { views: 0, reach: 0 };
      }
      dataMap[dateStr].views += (post.views_count || 0);
      dataMap[dateStr].reach += (post.reach_count || 0);

      totalViews += (post.views_count || 0);
      totalReach += (post.reach_count || 0);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);

    if (dateRange === 'this_week') {
      const day = today.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(today.getDate() + diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6); // Sunday
    } else if (dateRange === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    } else if (dateRange === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (dateRange === 'three_months') {
      start = new Date(today.getFullYear(), today.getMonth() - 2, 1); // 1st of month 2 months ago
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    } else {
      // all_time or default: last 30 days window for chart
      start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      end = new Date(today);
    }

    const generatedData = [];
    const numDays = Math.max(1, Math.min(180, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1));

    for (let i = 0; i < numDays; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let dateLabel = monthDay;
      if (dateRange === 'this_week') {
        dateLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (dateRange === 'this_month' || dateRange === 'last_month') {
        dateLabel = d.getDate().toString();
      }

      generatedData.push({
        date: dateLabel,
        fullDate: monthDay,
        views: dataMap[dateStr] ? dataMap[dateStr].views : 0,
        reach: dataMap[dateStr] ? dataMap[dateStr].reach : 0,
      });
    }

    const rangeString = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    let rangeLabel = 'This Week';
    if (dateRange === 'this_month') rangeLabel = 'This Month';
    if (dateRange === 'last_month') rangeLabel = 'Last Month';
    if (dateRange === 'three_months') rangeLabel = '3 Months';
    if (dateRange === 'all_time') rangeLabel = 'All Time';

    return {
      chartData: generatedData,
      rangeString,
      rangeLabel,
      totals: {
        views: totalViews,
        reach: totalReach
      }
    };
  }, [data, dateRange, platform]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const displayDate = payload[0]?.payload?.fullDate || label;
      return (
        <div className="zen-chart-tooltip" style={{ display: 'block', position: 'relative', transform: 'none', left: 0, top: 0 }}>
          <div className="zen-tooltip-header">
            <span className="zen-tooltip-day">{displayDate}</span>
          </div>
          <div className="zen-tooltip-views-row">
            <span className="zen-tooltip-views-num">{payload.find(p => p.name === 'Views')?.value.toLocaleString() || 0}</span>
            <span className="zen-tooltip-views-unit">views</span>
          </div>
          <div className="zen-tooltip-metrics-row">
            <span>Reach: <strong style={{ color: '#6366f1' }}>{payload.find(p => p.name === 'Reach')?.value.toLocaleString() || 0}</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  const viewsTrend = data?.views_trend ?? (totals.views > 0 ? 14 : 0);
  const reachTrend = data?.reach_trend ?? (totals.reach > 0 ? 8 : 0);

  return (
    <div className="card zen-followers-card">
      <div className="zen-card-top-header">
        <div>
          {loading ? (
            <Skeleton width="120px" height={24} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="zen-card-title" style={{ margin: 0 }}>Performance</h2>
              <span className="zen-period-badge">
                <Calendar size={12} />
                {rangeLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="zen-stats-header-row">
        <div className="zen-growth-meta">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton width="100px" height={16} />
              <Skeleton width="120px" height={20} />
            </div>
          ) : (
            <>
              <h3 className="zen-growth-heading">Views vs Reach</h3>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {rangeString}
              </span>
            </>
          )}
        </div>

        <div className="zen-mini-cards-group">
          {loading ? (
            <>
              <Skeleton width="120px" height={52} borderRadius={10} />
              <Skeleton width="120px" height={52} borderRadius={10} />
            </>
          ) : (
            <>
              <div className="zen-mini-card">
                <div className="zen-mini-icon-box">
                  <Eye size={15} color="#00a8ff" />
                  <span className="zen-mini-label">Total Views</span>
                </div>
                <div className="zen-mini-stat-info">
                  <span className="zen-mini-value zen-val-blue">{totals.views.toLocaleString()}</span>
                  <span className="zen-mini-trend" style={{ color: viewsTrend >= 0 ? '#00a8ff' : '#ef4444', background: viewsTrend >= 0 ? '#e0f2fe' : '#fee2e2', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>
                    {viewsTrend >= 0 ? `+${viewsTrend}% ↗` : `${viewsTrend}% ↘`}
                  </span>
                </div>
              </div>

              <div className="zen-mini-card">
                <div className="zen-mini-icon-box">
                  <Users size={15} color="#6366f1" />
                  <span className="zen-mini-label">Total Reach</span>
                </div>
                <div className="zen-mini-stat-info">
                  <span className="zen-mini-value">{totals.reach.toLocaleString()}</span>
                  <span className="zen-mini-trend" style={{ color: reachTrend >= 0 ? '#6366f1' : '#ef4444', background: reachTrend >= 0 ? '#e0e7ff' : '#fee2e2', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>
                    {reachTrend >= 0 ? `+${reachTrend}% ↗` : `${reachTrend}% ↘`}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>


      <div className="zen-chart-main-body">
        {loading ? (
          <div style={{ height: '100%', width: '100%', padding: '14px', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <Skeleton width="20px" height="12px" style={{ marginRight: '10px' }} />
                  <Skeleton width="100%" height="1px" />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '30px', marginTop: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} width="24px" height="12px" />
                ))}
              </div>
            </div>
            {/* Keeping the custom gradient overlay block since it represents the area chart uniquely, 
                but using the Skeleton component base for consistency. */}
            <Skeleton
              style={{ position: 'absolute', bottom: '30px', left: '40px', right: '20px', height: '60px', borderRadius: '12px', background: 'linear-gradient(180deg, rgba(226, 232, 240, 0.5) 0%, rgba(241, 245, 249, 0.2) 100%)', opacity: 0.6 }}
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e8edf2" />

              <YAxis
                orientation="left"
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                tickMargin={6}
              />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                dy={6}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />

              <Area
                type="monotone"
                dataKey="reach"
                name="Reach"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReach)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />

              <Area
                type="monotone"
                dataKey="views"
                name="Views"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
