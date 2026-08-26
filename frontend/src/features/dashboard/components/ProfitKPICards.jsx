import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Target, Zap, ShoppingCart } from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '$0';
  return '$' + Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

const formatPercent = (val) => {
  if (val === undefined || val === null) return '0%';
  return val.toFixed(1) + '%';
};

const KPICard = ({ icon: Icon, iconColor, iconBg, label, value, subtitle, trend, trendPositive, delay }) => (
  <div className={`profit-kpi-card fade-in-up delay-${delay}`}>
    <div className="profit-kpi-icon" style={{ background: iconBg }}>
      <Icon size={18} color={iconColor} />
    </div>
    <div className="profit-kpi-info">
      <span className="profit-kpi-label">{label}</span>
      <span className="profit-kpi-value">{value}</span>
      {subtitle && (
        <span className={`profit-kpi-trend ${trendPositive ? 'positive' : 'negative'}`}>
          {trendPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {subtitle}
        </span>
      )}
    </div>
  </div>
);

export const ProfitKPICards = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="profit-kpi-section">
        <div className="profit-kpi-section-header">
          <div className="profit-kpi-section-title">
            <Skeleton type="icon" width={18} height={18} borderRadius={4} />
            <Skeleton width="120px" height={16} />
          </div>
          <Skeleton width="80px" height={20} borderRadius={20} />
        </div>
        <div className="profit-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="profit-kpi-card">
              <Skeleton type="icon" />
              <div className="skeleton-text" style={{ justifyContent: 'center' }}>
                <Skeleton width="60%" height={12} style={{ marginBottom: '4px' }} />
                <Skeleton width="40%" height={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isProfitable = data.net_profit > 0;

  return (
    <div className="profit-kpi-section">
      <div className="profit-kpi-section-header">
        <div className="profit-kpi-section-title">
          <DollarSign size={18} className="profit-section-icon" />
          <h3>Profit Overview</h3>
        </div>
        <span className={`profit-badge ${isProfitable ? 'profit-badge-positive' : 'profit-badge-negative'}`}>
          {isProfitable ? '● Profitable' : '● Unprofitable'}
        </span>
      </div>
      <div className="profit-kpi-grid">
        <KPICard
          icon={DollarSign}
          iconColor="#10b981"
          iconBg="rgba(16, 185, 129, 0.12)"
          label="Total Revenue"
          value={formatCurrency(data.total_revenue)}
          subtitle={`${data.total_units_sold} units sold`}
          trendPositive={true}
          delay="100"
        />
        <KPICard
          icon={Zap}
          iconColor="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.12)"
          label="Total Spend"
          value={formatCurrency(data.total_spend)}
          subtitle={`Content $${data.total_content_cost} · Ads $${data.total_ad_spend}`}
          trendPositive={false}
          delay="200"
        />
        <KPICard
          icon={isProfitable ? TrendingUp : TrendingDown}
          iconColor={isProfitable ? '#10b981' : '#ef4444'}
          iconBg={isProfitable ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
          label="Net Profit"
          value={formatCurrency(data.net_profit)}
          subtitle={`${isProfitable ? '+' : ''}${formatPercent(data.overall_roi)} ROI`}
          trendPositive={isProfitable}
          delay="300"
        />
        <KPICard
          icon={Target}
          iconColor="#8b5cf6"
          iconBg="rgba(139, 92, 246, 0.12)"
          label="Avg. ROI"
          value={formatPercent(data.overall_roi)}
          subtitle={`${data.profitable_posts}/${data.total_posts} posts profitable`}
          trendPositive={data.overall_roi > 0}
          delay="400"
        />
        <KPICard
          icon={ShoppingCart}
          iconColor="#0ea5e9"
          iconBg="rgba(14, 165, 233, 0.12)"
          label="Units Sold"
          value={data.total_units_sold}
          subtitle={`across ${data.total_posts} posts`}
          trendPositive={data.total_units_sold > 0}
          delay="500"
        />
        <KPICard
          icon={Zap}
          iconColor="#ec4899"
          iconBg="rgba(236, 72, 153, 0.12)"
          label="Cost per View"
          value={data.cost_per_view > 0 ? `$${data.cost_per_view.toFixed(3)}` : 'Free'}
          subtitle={data.cost_per_view > 0 ? 'per organic+paid view' : 'no ad spend yet'}
          trendPositive={data.cost_per_view === 0}
          delay="600"
        />
      </div>
    </div>
  );
};
