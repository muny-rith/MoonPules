import React, { useState, useEffect } from 'react';
import { Eye, TrendingUp, Users, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { FaFacebook, FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa';
import { RevenueAttributionChart } from '../components/RevenueAttributionChart';
import { ProfitKPICards } from '../components/ProfitKPICards';
import { ConversionFunnel } from '../components/ConversionFunnel';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import apiClient from '../../../shared/utils/apiClient';

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
        </div>
        <div className="stat-value">{formatCompactNumber(stats.total_views)}</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <div className="stat-header">
          <Users size={18} className="icon-purple" />
          <span>Total Reach</span>
        </div>
        <div className="stat-value">{formatCompactNumber(stats.total_reach)}</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <div className="stat-header">
          <TrendingUp size={18} className="icon-red" />
          <span>Avg. Engagement</span>
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
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No posts tracked yet.</div>
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

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/statistics/dashboard');
        if (res.data && res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchProfit = async () => {
      try {
        setProfitLoading(true);
        const res = await apiClient.get('/profit/dashboard');
        if (res.data && res.data.success) {
          setProfitData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch profit data', err);
      } finally {
        setProfitLoading(false);
      }
    };

    fetchDashboard();
    fetchProfit();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-grid">
        <div className="left-column">
          <ViewPercentageCard stats={stats} loading={loading} />
          <ProfitKPICards data={profitData} loading={profitLoading} />
          <RevenueAttributionChart data={profitData} loading={profitLoading} />
        </div>
        <div className="right-column">
          <ConversionFunnel data={profitData?.funnel} loading={profitLoading} />
          <SchedulePostList posts={stats?.recent_posts} loading={loading} />
        </div>
      </div>
    </div>
  );
};
