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
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="funnel-bar-row">
              <div className="funnel-bar-info">
                <Skeleton width="60px" height="12px" />
                <Skeleton width="40px" height="16px" style={{ marginTop: '4px' }} />
              </div>
              <div className="funnel-bar-track-wrapper">
                <Skeleton height="32px" style={{ borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate max for proportional widths
  const maxVal = Math.max(data.views || 1, 1);

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
          
          const rawPercent = (value / maxVal) * 100;
          
          // Display the percentage relative to the top of the funnel
          const displayPercent = index === 0 ? '100%' : `${rawPercent.toFixed(0)}%`;

          return (
            <div key={step.key} className="funnel-bar-row">
              <div className="funnel-bar-info">
                <span className="funnel-bar-label" style={{ color: step.color }}>{step.label}</span>
                <span className="funnel-bar-value">{displayValue}</span>
              </div>
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
