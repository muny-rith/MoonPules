import React, { useState, useEffect, useRef } from 'react';
import { Eye, TrendingUp, Users, CheckCircle2, Clock, Sparkles, RefreshCw, Calendar, ChevronDown } from 'lucide-react';
import { FaFacebook, FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa';
import { RevenueAttributionChart } from '../components/RevenueAttributionChart';
import { ProfitKPICards } from '../components/ProfitKPICards';
import { ConversionFunnel } from '../components/ConversionFunnel';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import apiClient from '../../../shared/utils/apiClient';
import { syncPosts } from '../../postTracker/api/postTrackerApi';
import '../dashboard.css';

const DATE_OPTIONS = [
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'three_months', label: '3 Months' },
  { id: 'all_time', label: 'All Time' },
];

const PLATFORM_OPTIONS = [
  { id: 'all', label: 'All Platforms', icon: <Sparkles size={14} color="#64748b" /> },
  { id: 'facebook', label: 'Facebook', icon: <FaFacebook size={14} color="#1877F2" /> },
  { id: 'tiktok', label: 'TikTok', icon: <FaTiktok size={14} color="#000000" /> },
];

const formatCompactNumber = (number) => {
  if (number === undefined || number === null) return '0';
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
};

const ViewPercentageCard = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="card stat-card-group" style={{ display: 'flex' }}>
        {[1, 2, 3].map(i => (
          <React.Fragment key={i}>
            <div className="stat-item" style={{ flex: 1 }}>
              <div className="stat-header">
                <Skeleton type="icon" width={18} height={18} borderRadius={4} />
                <Skeleton width="60px" height={12} />
              </div>
              <Skeleton width="80px" height={24} style={{ marginTop: 8 }} />
            </div>
            {i < 3 && <div className="stat-divider" />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="card stat-card-group">
      <div className="stat-item">
        <div className="stat-header">
          <Eye size={18} className="icon-blue" />
          <span>Total Views</span>
          {stats.views_trend !== undefined && stats.views_trend !== null && (
            <span className={`stat-trend-chip ${stats.views_trend >= 0 ? 'trend-up' : 'trend-down'}`}>
              {stats.views_trend >= 0 ? `+${stats.views_trend}%` : `${stats.views_trend}%`}
            </span>
          )}
        </div>
        <div className="stat-value">{formatCompactNumber(stats.total_views)}</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <div className="stat-header">
          <Users size={18} className="icon-purple" />
          <span>Total Reach</span>
          {stats.reach_trend !== undefined && stats.reach_trend !== null && (
            <span className={`stat-trend-chip ${stats.reach_trend >= 0 ? 'trend-up' : 'trend-down'}`}>
              {stats.reach_trend >= 0 ? `+${stats.reach_trend}%` : `${stats.reach_trend}%`}
            </span>
          )}
        </div>
        <div className="stat-value">{formatCompactNumber(stats.total_reach)}</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <div className="stat-header">
          <TrendingUp size={18} className="icon-red" />
          <span>Avg. Engagement</span>
          {stats.engagement_trend !== undefined && stats.engagement_trend !== null && (
            <span className={`stat-trend-chip ${stats.engagement_trend >= 0 ? 'trend-up' : 'trend-down'}`}>
              {stats.engagement_trend >= 0 ? `+${stats.engagement_trend}%` : `${stats.engagement_trend}%`}
            </span>
          )}
        </div>
        <div className="stat-value">{stats.engagement_rate}%</div>
      </div>
    </div>
  );
};

const getPlatformIcon = (platform) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return <FaInstagram size={14} color="#E1306C" />;
    case 'youtube': return <FaYoutube size={14} color="#FF0000" />;
    case 'tiktok': return <FaTiktok size={14} color="#000000" />;
    case 'facebook': return <FaFacebook size={14} color="#1877F2" />;
    default: return <Sparkles size={14} />;
  }
};

const SchedulePostList = ({ posts, loading }) => {
  if (loading) {
    return (
      <div className="card schedule-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <div>
            <Skeleton width="150px" height={18} style={{ marginBottom: 6 }} />
            <Skeleton width="120px" height={12} />
          </div>
        </div>
        <div className="schedule-list">
          {[1, 2].map(i => (
            <div key={i} className="schedule-item">
              <div className="schedule-meta" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Skeleton width="80px" height={22} borderRadius={12} />
                <Skeleton width="100px" height={14} />
              </div>
              <div className="schedule-footer" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="70px" height={12} />
                <Skeleton width="60px" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card schedule-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <h3>Recent & Upcoming Posts</h3>
          <span className="subtitle">Latest tracked posts</span>
        </div>
      </div>
      <div className="schedule-list">
        {posts && posts.length > 0 ? posts.map(post => {
          const platformName = post.platform || 'facebook';
          return (
            <div key={post.id} className="schedule-item">
              <div className="schedule-meta">
                <span className="platform-badge" style={{ backgroundColor: platformName === 'facebook' ? '#e0f2fe' : '#f1f5f9', color: platformName === 'facebook' ? '#0369a1' : '#334155' }}>
                  {getPlatformIcon(platformName)} {platformName.charAt(0).toUpperCase() + platformName.slice(1)}
                </span>
                <span className="author" style={{ marginLeft: 'auto' }}>{post.product_name}</span>
              </div>
              <div className="schedule-footer" style={{ marginTop: '12px' }}>
                <span className={`status ${post.status === 'published' ? 'published' : 'schedule'}`}>
                  {post.status === 'published' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                </span>
                <span className="date">
                  {post.published_time
                    ? new Date(post.published_time).toLocaleDateString()
                    : post.scheduled_time
                      ? new Date(post.scheduled_time).toLocaleDateString()
                      : ''}
                </span>
              </div>
            </div>
          );
        }) : (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No posts tracked for this selection.</div>
        )}
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profitLoading, setProfitLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState(null);

  // Global filters
  const [dateRange, setDateRange] = useState('this_week');
  const [platform, setPlatform] = useState('all');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const controlsRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target)) {
        setIsDateOpen(false);
        setIsPlatformOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchDashboard = async (range = dateRange, plat = platform) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/statistics/dashboard', {
        params: { range, platform: plat }
      });
      if (res.data && res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfit = async (range = dateRange, plat = platform) => {
    try {
      setProfitLoading(true);
      const res = await apiClient.get('/profit/dashboard', {
        params: { range, platform: plat }
      });
      if (res.data && res.data.success) {
        setProfitData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch profit data', err);
    } finally {
      setProfitLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(dateRange, platform);
    fetchProfit(dateRange, platform);
  }, [dateRange, platform]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('moonpulse.auth.user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse user from local storage', e);
    }
  }, []);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncPosts();
      await Promise.all([fetchDashboard(dateRange, platform), fetchProfit(dateRange, platform)]);
    } catch (err) {
      console.error('Failed to sync posts', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const currentRangeLabel = DATE_OPTIONS.find(o => o.id === dateRange)?.label || 'This Week';
  const currentPlatformObj = PLATFORM_OPTIONS.find(o => o.id === platform) || PLATFORM_OPTIONS[0];

  return (
    <div className="dashboard-page">
      <div className="dashboard-top">

        <h1 className="dashboard-welcome">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>


        <div className="dashboard-global-controls" ref={controlsRef}>
          {/* Global Date Range Dropdown */}
          <div className="global-filter-wrapper">
            <button
              onClick={() => { setIsDateOpen(!isDateOpen); setIsPlatformOpen(false); }}
              className="global-filter-btn"
              type="button"
              title="Filter date range"
            >
              <Calendar size={14} color="#64748b" />
              <span>{currentRangeLabel}</span>
              <ChevronDown size={14} color="#64748b" style={{ transform: isDateOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isDateOpen && (
              <div className="global-filter-dropdown">
                {DATE_OPTIONS.map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => { setDateRange(opt.id); setIsDateOpen(false); }}
                    className={`global-filter-option ${dateRange === opt.id ? 'selected' : ''}`}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Global Platform Dropdown */}
          <div className="global-filter-wrapper">
            <button
              onClick={() => { setIsPlatformOpen(!isPlatformOpen); setIsDateOpen(false); }}
              className="global-filter-btn"
              type="button"
              title="Filter platform"
            >
              {currentPlatformObj.icon}
              <span>{currentPlatformObj.label}</span>
              <ChevronDown size={14} color="#64748b" style={{ transform: isPlatformOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isPlatformOpen && (
              <div className="global-filter-dropdown">
                {PLATFORM_OPTIONS.map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => { setPlatform(opt.id); setIsPlatformOpen(false); }}
                    className={`global-filter-option ${platform === opt.id ? 'selected' : ''}`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn-sync"
          >
            <RefreshCw size={14} className={isSyncing ? "spin-animation" : ""} />
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="left-column">
          <ViewPercentageCard stats={stats} loading={loading} />
          <ProfitKPICards data={profitData} loading={profitLoading} dateRange={dateRange} />
          <RevenueAttributionChart data={profitData} loading={profitLoading} dateRange={dateRange} platform={platform} />
        </div>
        <div className="right-column">
          <ConversionFunnel data={profitData?.funnel} loading={profitLoading} />
          <SchedulePostList posts={stats?.recent_posts} loading={loading} />
        </div>
      </div>
    </div>
  );
};
