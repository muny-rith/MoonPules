import React, { useState } from 'react';
import { ChevronDown, Eye, Users, TrendingUp } from 'lucide-react';
import { PLATFORM_DATA } from './WeeklyViewsChartData';

const TikTokIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.82 4.48c.37-.37.68-.8.92-1.27.34-.67.52-1.42.52-2.18V8.71a8.28 8.28 0 0 0 4.33 1.25V6.69z"/>
  </svg>
);

export const WeeklyViewsChart = () => {
  const [activePlatform, setActivePlatform] = useState('tiktok');
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const current = PLATFORM_DATA[activePlatform];

  // SVG Dimension setup
  const svgWidth = 560;
  const svgHeight = 170;
  const paddingTop = 10;
  const paddingBottom = 15;
  const paddingLeft = 36;
  const paddingRight = 24;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const stepX = chartWidth / (current.dailyData.length - 1);

  // Y-axis grid levels (50.000, 25.000, 15.000, 3000, 1.500, 0)
  const gridLevels = [
    { label: '50.000', ratio: 1.0 },
    { label: '25.000', ratio: 0.78 },
    { label: '15.000', ratio: 0.58 },
    { label: '3000',   ratio: 0.38 },
    { label: '1.500',  ratio: 0.19 },
    { label: '0',      ratio: 0.0 }
  ];

  // Calculate pixel Y coordinate matching template visual scale
  const getYForValue = (val) => {
    let ratio = 0;
    if (val >= 25000) {
      ratio = 0.78 + ((val - 25000) / 25000) * (1.0 - 0.78);
    } else if (val >= 15000) {
      ratio = 0.58 + ((val - 15000) / 10000) * (0.78 - 0.58);
    } else if (val >= 3000) {
      ratio = 0.38 + ((val - 3000) / 12000) * (0.58 - 0.38);
    } else if (val >= 1500) {
      ratio = 0.19 + ((val - 1500) / 1500) * (0.38 - 0.19);
    } else {
      ratio = (val / 1500) * 0.19;
    }
    return paddingTop + (1 - ratio) * chartHeight;
  };

  const points = current.dailyData.map((d, index) => {
    const x = paddingLeft + index * stepX;
    const y = getYForValue(d.value);
    return { x, y, ...d };
  });

  return (
    <div className="card zen-followers-card">
      {/* Top Header: Title & Dropdown Switcher */}
      <div className="zen-card-top-header">
        <h2 className="zen-card-title">Viewers</h2>

        {/* Platform Selector Dropdown */}
        <div className="zen-platform-dropdown-wrapper">
          <select 
            className="zen-platform-select"
            value={activePlatform}
            onChange={(e) => setActivePlatform(e.target.value)}
          >
            <option value="tiktok">Tiktok</option>
            <option value="fb">Facebook</option>
            <option value="telegram">Telegram</option>
            <option value="instagram">Instagram</option>
          </select>
          <div className="zen-select-custom-display">
            <span className="zen-select-icon"><TikTokIcon /></span>
            <span className="zen-select-name">{current.name}</span>
            <ChevronDown size={14} className="zen-select-arrow" />
          </div>
        </div>
      </div>

      {/* Sub-Header: Views Growth & 3 Horizontal Stat Cards */}
      <div className="zen-stats-header-row">
        {/* Left: Views Growth Title & Date */}
        <div className="zen-growth-meta">
          <h3 className="zen-growth-heading">Views Growth</h3>
          <span className="zen-growth-timerange">{current.timeRange}</span>
        </div>

        {/* Right: 3 Mini Stat Cards */}
        <div className="zen-mini-cards-group">
          {/* Card 1: Growth (Active Light Blue Box) */}
          <div className="zen-mini-card zen-card-active">
            <div className="zen-mini-icon-box">
              <Eye size={16} color="#00a8ff" />
              <span className="zen-mini-label">Growth</span>
            </div>
            <div className="zen-mini-stat-info">
              <span className="zen-mini-value zen-val-blue">{current.growthStat.value}</span>
              <span className="zen-mini-trend zen-trend-blue">
                {current.growthStat.change} ↗ {current.growthStat.percent}
              </span>
            </div>
          </div>

          {/* Card 2: Viewers */}
          <div className="zen-mini-card">
            <div className="zen-mini-icon-box">
              <Users size={16} color="#00a8ff" />
              <span className="zen-mini-label">Viewers</span>
            </div>
            <div className="zen-mini-stat-info">
              <span className="zen-mini-value">{current.followStat.value}</span>
              <span className="zen-mini-trend zen-trend-blue">
                {current.followStat.change} ↗ {current.followStat.percent}
              </span>
            </div>
          </div>

          {/* Card 3: Drop-off */}
          <div className="zen-mini-card">
            <div className="zen-mini-icon-box">
              <TrendingUp size={16} color="#00a8ff" />
              <span className="zen-mini-label">Drop-off</span>
            </div>
            <div className="zen-mini-stat-info">
              <span className="zen-mini-value">{current.unfollowStat.value}</span>
              <span className="zen-mini-trend zen-trend-blue">
                {current.unfollowStat.change} ↗ {current.unfollowStat.percent}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Body: Left Y-Axis + SVG Columns */}
      <div className="zen-chart-main-body">
        {/* Left Y-Axis Scale Numbers */}
        <div className="zen-y-axis-labels">
          {gridLevels.map((lvl, idx) => {
            const topPos = ((paddingTop + (1 - lvl.ratio) * chartHeight) / svgHeight) * 100;
            return (
              <span 
                key={idx} 
                className="zen-y-label"
                style={{ top: `${topPos}%` }}
              >
                {lvl.label}
              </span>
            );
          })}
        </div>

        {/* SVG Columns Canvas */}
        <div className="zen-chart-canvas-wrapper">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="zen-chart-svg"
            preserveAspectRatio="none"
          >
            {/* Dashed Horizontal Grid Lines with bullet start dots */}
            {gridLevels.map((lvl, idx) => {
              const y = paddingTop + (1 - lvl.ratio) * chartHeight;
              return (
                <g key={`grid-${idx}`}>
                  {/* Small start circle dot on grid line */}
                  <circle
                    cx="0"
                    cy={y}
                    r="2"
                    fill="#cbd5e1"
                  />
                  {/* Dashed line */}
                  <line
                    x1="4"
                    y1={y}
                    x2={svgWidth}
                    y2={y}
                    stroke="#e8edf2"
                    strokeDasharray="3 4"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Cyan Column Bars with rounded top ONLY (flat bottom baseline) */}
            {points.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;
              const colWidth = 28;
              const baseBottom = paddingTop + chartHeight;
              const colHeight = Math.max(baseBottom - pt.y, 1);
              const r = Math.min(8, colHeight / 2); // rounded radius for top corners
              const xLeft = pt.x - colWidth / 2;
              const xRight = pt.x + colWidth / 2;
              const yTop = pt.y;

              // SVG Path: flat bottom, rounded top-left and top-right
              const barPath = `
                M ${xLeft},${baseBottom}
                L ${xLeft},${yTop + r}
                A ${r} ${r} 0 0 1 ${xLeft + r},${yTop}
                L ${xRight - r},${yTop}
                A ${r} ${r} 0 0 1 ${xRight},${yTop + r}
                L ${xRight},${baseBottom}
                Z
              `;

              return (
                <g 
                  key={`bar-${idx}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* The Solid Cyan Column with Flat Bottom */}
                  <path
                    d={barPath}
                    fill={isHovered ? '#0090d9' : current.barColor}
                    className="zen-column-rect"
                  />
                </g>
              );
            })}
          </svg>

          {/* Rich Tooltip When Hovered / Held */}
          {hoveredIdx !== null && (
            <div
              className="zen-chart-tooltip"
              style={{
                left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
                top: `${(points[hoveredIdx].y / svgHeight) * 100}%`,
              }}
            >
              <div className="zen-tooltip-header">
                <span className="zen-tooltip-day">{points[hoveredIdx].day}, {points[hoveredIdx].date}</span>
                <span className="zen-tooltip-tag" style={{ color: current.barColor }}>
                  {current.name}
                </span>
              </div>
              <div className="zen-tooltip-views-row">
                <span className="zen-tooltip-views-num">{points[hoveredIdx].value.toLocaleString()}</span>
                <span className="zen-tooltip-views-unit">views</span>
              </div>
              <div className="zen-tooltip-metrics-row">
                <span>Eng: <strong>{points[hoveredIdx].engagement}</strong></span>
                <span>•</span>
                <span>Shares: <strong>{points[hoveredIdx].shares}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom X-Axis Dates Row */}
      <div className="zen-x-axis-row">
        <div className="zen-x-spacer" />
        <div className="zen-x-dates-container">
          {current.dailyData.map((d, index) => {
            const isHovered = hoveredIdx === index;
            return (
              <span
                key={index}
                className={`zen-date-label ${isHovered ? 'zen-date-hovered' : ''}`}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {d.date}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
