import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Users, ChevronDown, Sparkles, Calendar } from 'lucide-react';
import { FaFacebook, FaTiktok } from 'react-icons/fa';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const RevenueAttributionChart = ({ data, loading }) => {
  const [activePlatform, setActivePlatform] = useState('all');
  const [rangeType, setRangeType] = useState('this_week');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);

  const { chartData, totals, rangeString, rangeLabel } = useMemo(() => {
    const defaultData = { chartData: [], totals: { views: 0, reach: 0 }, rangeString: '', rangeLabel: '' };
    if (!data || !data.all_posts_profit) return defaultData;

    // Group by date (YYYY-MM-DD)
    const dataMap = {};
    let totalViews = 0;
    let totalReach = 0;

    data.all_posts_profit.forEach(post => {
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
    today.setHours(0,0,0,0);

    let start = new Date(today);
    let end = new Date(today);

    if (rangeType === 'this_week') {
      const day = today.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(today.getDate() + diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6); // Sunday
    } else if (rangeType === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    } else if (rangeType === 'three_months') {
      start = new Date(today.getFullYear(), today.getMonth() - 2, 1); // 1st of month 2 months ago
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    }

    const generatedData = [];
    const numDays = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;

    for (let i = 0; i < numDays; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      generatedData.push({
        date: monthDay,
        views: dataMap[dateStr] ? dataMap[dateStr].views : 0,
        reach: dataMap[dateStr] ? dataMap[dateStr].reach : 0,
      });
    }

    const rangeString = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    let rangeLabel = 'This Week';
    if (rangeType === 'this_month') rangeLabel = 'This Month';
    if (rangeType === 'three_months') rangeLabel = '3 Months';

    return { 
      chartData: generatedData, 
      rangeString,
      rangeLabel,
      totals: { 
        views: totalViews, 
        reach: totalReach
      }
    };
  }, [data, rangeType]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="zen-chart-tooltip" style={{ display: 'block', position: 'relative', transform: 'none', left: 0, top: 0 }}>
          <div className="zen-tooltip-header">
            <span className="zen-tooltip-day">{label}</span>
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

  return (
    <div className="card zen-followers-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="zen-card-top-header">
        {loading ? <Skeleton width="120px" height={24} /> : <h2 className="zen-card-title">Performance</h2>}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {loading ? (
            <Skeleton width="120px" height={32} borderRadius={8} />
          ) : (
            <button 
              onClick={() => setIsPlatformOpen(!isPlatformOpen)}
              onBlur={() => setTimeout(() => setIsPlatformOpen(false), 200)}
              className="zen-platform-dropdown-wrapper"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', outline: 'none', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {activePlatform === 'all' ? <Sparkles size={14} color="#64748b" /> : 
                 activePlatform === 'tiktok' ? <FaTiktok size={14} color="#000000" /> : 
                 <FaFacebook size={14} color="#1877F2" />}
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {activePlatform === 'all' ? 'All Platforms' : activePlatform === 'tiktok' ? 'Tiktok' : 'Facebook'}
                </span>
              </div>
              <ChevronDown size={14} color="#64748b" style={{ marginLeft: '4px', transform: isPlatformOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}

          {!loading && isPlatformOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, width: '140px', overflow: 'hidden' }}>
              {[
                { id: 'all', label: 'All Platforms', icon: <Sparkles size={14} /> },
                { id: 'tiktok', label: 'Tiktok', icon: <FaTiktok size={14} color="#000000" /> },
                { id: 'fb', label: 'Facebook', icon: <FaFacebook size={14} color="#1877F2" /> }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => { setActivePlatform(opt.id); setIsPlatformOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', fontSize: '13px', fontWeight: 500, color: activePlatform === opt.id ? '#3b82f6' : '#475569', background: activePlatform === opt.id ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = activePlatform === opt.id ? '#eff6ff' : '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = activePlatform === opt.id ? '#eff6ff' : '#fff'}
                >
                  {opt.icon}
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="zen-stats-header-row">
        <div className="zen-growth-meta">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton width="100px" height={16} />
              <Skeleton width="120px" height={32} borderRadius={8} />
            </div>
          ) : (
            <>
              <h3 className="zen-growth-heading">Views vs Reach</h3>
              <div style={{ position: 'relative', display: 'inline-block', marginTop: '6px' }}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer', width: '100%', outline: 'none', justifyContent: 'flex-start' }}
                >
                  <Calendar size={16} color="#64748b" />
                  <span>{rangeLabel}</span>
                  <ChevronDown size={14} color="#64748b" style={{ marginLeft: 'auto', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {isDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, width: '100%', minWidth: '140px', overflow: 'hidden' }}>
                    {[
                      { id: 'this_week', label: 'This Week' },
                      { id: 'this_month', label: 'This Month' },
                      { id: 'three_months', label: '3 Months' }
                    ].map(opt => (
                      <div
                        key={opt.id}
                        onClick={() => { setRangeType(opt.id); setIsDropdownOpen(false); }}
                        style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500, color: rangeType === opt.id ? '#3b82f6' : '#475569', background: rangeType === opt.id ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = rangeType === opt.id ? '#eff6ff' : '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = rangeType === opt.id ? '#eff6ff' : '#fff'}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  <Eye size={16} color="#00a8ff" />
                  <span className="zen-mini-label">Total Views</span>
                </div>
                <div className="zen-mini-stat-info">
                  <span className="zen-mini-value zen-val-blue">{totals.views.toLocaleString()}</span>
                  <span className="zen-mini-trend" style={{ color: '#00a8ff', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                    +14% ↗
                  </span>
                </div>
              </div>

              <div className="zen-mini-card">
                <div className="zen-mini-icon-box">
                  <Users size={16} color="#6366f1" />
                  <span className="zen-mini-label">Total Reach</span>
                </div>
                <div className="zen-mini-stat-info">
                  <span className="zen-mini-value">{totals.reach.toLocaleString()}</span>
                  <span className="zen-mini-trend" style={{ color: '#6366f1', background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px' }}>
                    +8% ↗
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="zen-chart-main-body" style={{ flex: 1, minHeight: '280px', padding: '0 24px 24px 12px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ height: '100%', width: '100%', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <Skeleton width="20px" height="12px" style={{ marginRight: '10px' }} />
                  <Skeleton width="100%" height="1px" />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '30px', marginTop: '10px' }}>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} width="24px" height="12px" />
                ))}
              </div>
            </div>
            {/* Keeping the custom gradient overlay block since it represents the area chart uniquely, 
                but using the Skeleton component base for consistency. */}
            <Skeleton 
              style={{ position: 'absolute', bottom: '40px', left: '40px', right: '20px', height: '80px', borderRadius: '12px', background: 'linear-gradient(180deg, rgba(226, 232, 240, 0.5) 0%, rgba(241, 245, 249, 0.2) 100%)', opacity: 0.6 }} 
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e8edf2" />
              
              <YAxis 
                orientation="left" 
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                tickMargin={12}
              />
              
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                dy={12}
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
