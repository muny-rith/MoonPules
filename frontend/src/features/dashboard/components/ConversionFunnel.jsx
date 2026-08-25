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
  { key: 'views', label: 'Views', icon: Eye, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.10)' },
  { key: 'reach', label: 'Reach', icon: Users, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.10)' },
  { key: 'engagement', label: 'Engagement', icon: Heart, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.10)' },
  { key: 'sales', label: 'Sales', icon: ShoppingCart, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)' },
  { key: 'revenue', label: 'Revenue', icon: DollarSign, color: '#10b981', bg: 'rgba(16, 185, 129, 0.10)', isCurrency: true },
];

export const ConversionFunnel = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="card funnel-card">
        <div className="card-header">
          <h3>Conversion Funnel</h3>
        </div>
        <div className="funnel-skeleton funnel-body">
          {[1, 2, 3, 4, 5].map((i, index) => (
            <div key={i} className="funnel-step-row">
              {index > 0 && (
                <div className="funnel-conv-rate">
                  <div className="funnel-conv-arrow" />
                  <Skeleton width="30px" height="10px" />
                </div>
              )}
              <Skeleton className="funnel-step-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate max for proportional widths
  const maxVal = Math.max(data.views || 1, 1);

  // Calculate conversion rates between steps
  const getRate = (from, to) => {
    if (!from || from === 0) return '—';
    return ((to / from) * 100).toFixed(1) + '%';
  };

  return (
    <div className="card funnel-card">
      <div className="card-header">
        <h3>Conversion Funnel</h3>
        <span className="subtitle">Content → Revenue pipeline</span>
      </div>
      <div className="funnel-body">
        {FUNNEL_STEPS.map((step, index) => {
          const value = data[step.key] || 0;
          const displayValue = step.isCurrency ? `$${formatCompact(value)}` : formatCompact(value);
          const widthPercent = step.isCurrency
            ? 20 // Revenue always gets minimum width
            : Math.max(20, (value / maxVal) * 100);
          const prevStep = index > 0 ? FUNNEL_STEPS[index - 1] : null;
          const convRate = prevStep ? getRate(data[prevStep.key], value) : null;
          const Icon = step.icon;

          return (
            <div key={step.key} className="funnel-step-row">
              {/* Conversion rate arrow */}
              {convRate && (
                <div className="funnel-conv-rate">
                  <div className="funnel-conv-arrow" />
                  <span>{convRate}</span>
                </div>
              )}
              {/* The bar */}
              <div className="funnel-step" style={{ '--funnel-width': `${widthPercent}%`, '--funnel-color': step.color, '--funnel-bg': step.bg }}>
                <div className="funnel-step-bar">
                  <div className="funnel-step-icon-wrapper" style={{ background: step.bg }}>
                    <Icon size={14} color={step.color} />
                  </div>
                  <span className="funnel-step-label">{step.label}</span>
                  <span className="funnel-step-value" style={{ color: step.color }}>{displayValue}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
