import React from 'react';
import { Eye, TrendingUp, Users, Camera, MonitorPlay, PlayCircle, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { WeeklyViewsChart } from '../components/WeeklyViewsChart';

const ViewPercentageCard = () => {
  return (
    <div className="card stat-card-group">
      <div className="stat-item">
        <div className="stat-header">
          <Eye size={18} className="icon-blue" />
          <span>Total Views</span>
        </div>
        <div className="stat-value">1.41M</div>
        <div className="stat-trend positive">↑ 24.8% vs last week</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <div className="stat-header">
          <Users size={18} className="icon-purple" />
          <span>Followers</span>
        </div>
        <div className="stat-value">980K</div>
        <div className="stat-trend positive">↑ 20%</div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <div className="stat-header">
          <TrendingUp size={18} className="icon-red" />
          <span>Avg. Engagement</span>
        </div>
        <div className="stat-value">14.6%</div>
        <div className="stat-trend positive">↑ 5.2%</div>
      </div>
    </div>
  );
};

const getPlatformIcon = (platform) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return <Camera size={14} />;
    case 'youtube': return <MonitorPlay size={14} />;
    case 'tiktok': return <PlayCircle size={14} />;
    default: return null;
  }
};

const SchedulePostList = () => {
  const mockSchedules = [
    { id: 1, platform: 'Instagram', text: 'It\'s not just yoga. It\'s a lifestyle. Subscribe today for exclusive content.', date: 'Jan 04, 2024', status: 'Schedule' },
    { id: 2, platform: 'Tiktok', text: 'New dance trend alert! Join the movement and show us your moves.', date: 'Jan 03, 2024', status: 'Schedule' },
    { id: 3, platform: 'Youtube', text: 'Full 30-min morning routine video dropping this weekend!', date: 'Dec 31, 2023', status: 'Published' },
    { id: 4, platform: 'Instagram', text: '5 secret habits of successful content creators you must know in 2026.', date: 'Dec 29, 2023', status: 'Published' },
  ];

  return (
    <div className="card schedule-card">
      <div className="card-header">
        <div>
          <h3>Schedules Post</h3>
          <span className="subtitle">Upcoming & recent queue</span>
        </div>
        <select className="dropdown">
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>
      <div className="schedule-list">
        {mockSchedules.map(post => (
          <div key={post.id} className="schedule-item">
            <div className="schedule-meta">
              <span className={`platform-badge ${post.platform.toLowerCase()}`}>
                {getPlatformIcon(post.platform)}
                {post.platform}
              </span>
              <span className="author">@skylar</span>
            </div>
            <p className="schedule-text">{post.text}</p>
            <div className="schedule-footer">
              <span className={`status ${post.status.toLowerCase()}`}>
                {post.status === 'Published' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {post.status}
              </span>
              <span className="date">{post.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  return (
    <div className="dashboard-page">
      <div className="dashboard-grid">
        <div className="left-column">
          <ViewPercentageCard />
          <WeeklyViewsChart />
        </div>
        <div className="right-column">
          <SchedulePostList />
        </div>
      </div>
    </div>
  );
};

