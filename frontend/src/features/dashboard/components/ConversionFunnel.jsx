import React from 'react';
import { Eye, Users, Heart, ShoppingCart, DollarSign } from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

const formatCompact = (num) => {
  if (num === undefined || num === null) return '0';
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

const FUNNEL_STEPS = [
  { key: 'views', label: 'Views', icon: Eye, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
  { key: 'reach', label: 'Reach', icon: Users, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { key: 'engagement', label: 'Engagement', icon: Heart, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  { key: 'sales', label: 'Sales', icon: ShoppingCart, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { key: 'revenue', label: 'Revenue', icon: DollarSign, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', isCurrency: true },
];

export const ConversionFunnel = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="card funnel-card">
        <div className="card-header funnel-header">
          <div>
            <Skeleton width="130px" height="15px" style={{ marginBottom: '4px' }} />
            <Skeleton width="90px" height="11px" />
          </div>
          <Skeleton width="75px" height="20px" borderRadius="10px" />
        </div>
        <div className="funnel-skeleton funnel-body">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="funnel-bar-row">
              <div className="funnel-step-meta">
                <Skeleton width="26px" height="26px" borderRadius="7px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <Skeleton width="50px" height="11px" />
                  <Skeleton width="65px" height="9px" />
                </div>
              </div>
              <Skeleton width="35px" height="15px" />
              <div className="funnel-bar-track-wrapper">
                <Skeleton height="26px" style={{ borderRadius: '5px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate max for proportional widths
  const maxVal = Math.max(data.views || 1, 1);

  // Step to step rates
  const getStepRate = (index) => {
    if (index === 0) return 'Top Stage';
    if (index === 1) {
      const rate = data.views > 0 ? ((data.reach / data.views) * 100).toFixed(1) : 0;
      return `${rate}% of views`;
    }
    if (index === 2) {
      const rate = data.reach > 0 ? ((data.engagement / data.reach) * 100).toFixed(1) : 0;
      return `${rate}% eng rate`;
    }
    if (index === 3) {
      const rate = data.engagement > 0
        ? ((data.sales / data.engagement) * 100).toFixed(1)
        : data.reach > 0
          ? ((data.sales / data.reach) * 100).toFixed(2)
          : 0;
      return `${rate}% conv rate`;
    }
    if (index === 4) {
      const aov = data.sales > 0 ? (data.revenue / data.sales).toFixed(0) : 0;
      return `$${aov} AOV`;
    }
    return '';
  };

  const reachToSaleConv = data.reach > 0 ? ((data.sales / data.reach) * 100).toFixed(2) : '0.00';

  return (
    <div className="card funnel-card">
      <div className="card-header funnel-header">
        <div>
          <h3>Conversion Funnel</h3>
          <span className="subtitle">Content → Revenue pipeline</span>
        </div>
        <span className="funnel-efficiency-badge">
          Conv: <strong>{reachToSaleConv}%</strong>
        </span>
      </div>
      <div className="funnel-body">
        {FUNNEL_STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const value = data[step.key] || 0;
          const displayValue = step.isCurrency ? `$${formatCompact(value)}` : formatCompact(value);

          const rawPercent = (value / maxVal) * 100;
          const displayPercent = index === 0 ? '100%' : `${rawPercent.toFixed(0)}%`;
          const stepRate = getStepRate(index);

          return (
            <div key={step.key} className={`funnel-bar-row fade-in-up delay-${(index + 1) * 100}`}>
              <div className="funnel-step-meta">
                <span className="funnel-icon-box" style={{ color: step.color, backgroundColor: step.bg }}>
                  <StepIcon size={15} />
                </span>
                <div className="funnel-step-info">
                  <span className="funnel-step-label">{step.label}</span>
                  <span className="funnel-step-sub">{stepRate}</span>
                </div>
              </div>

              <span className="funnel-bar-value">{displayValue}</span>

              <div className="funnel-bar-track-wrapper">
                <div className="funnel-bar-split-container">
                  <div
                    className="funnel-bar-percent-box"
                    style={{ backgroundColor: step.color }}
                  >
                    {displayPercent}
                  </div>
                  <div className="funnel-bar-track">
                    {rawPercent > 0 && (
                      <div
                        className="funnel-bar-fill-dynamic"
                        style={{
                          width: `${rawPercent}%`,
                          minWidth: '14px',
                          backgroundColor: step.color
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
