import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight, Calendar, Filter, Sparkles } from 'lucide-react';
import * as missionApi from '../api/missionApi';

export const MonthlyMissionAuditTable = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [auditList, setAuditList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedBrandId, setExpandedBrandId] = useState(null);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const data = await missionApi.getMonthAudit(month, year);
      setAuditList(data || []);
    } catch (err) {
      console.error('Failed to load month audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [month, year]);

  const toggleExpand = (brandId) => {
    setExpandedBrandId(expandedBrandId === brandId ? null : brandId);
  };

  const totalBrands = auditList.length;
  const completedCount = auditList.filter((a) => a.completion_rate === 100 && a.total_slots > 0).length;
  const incompleteCount = auditList.filter((a) => a.missed_slots > 0).length;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      {/* Top Header & Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="#2563eb" />
            Brand Mission & Schedule Audit
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            End-of-month verification: check if each brand's agreed posting schedule was completed or missed.
          </p>
        </div>

        {/* Month & Year Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#fff',
              color: '#334155'
            }}
          >
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={{
              width: '80px',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              textAlign: 'center'
            }}
          />

          <button
            onClick={loadAudit}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              color: '#475569'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Total Brands Planned</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{totalBrands}</div>
        </div>

        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>100% Missions Completed</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
            {completedCount} <span style={{ fontSize: '13px', fontWeight: '500' }}>/ {totalBrands}</span>
          </div>
        </div>

        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>Incomplete / Missed Days</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>{incompleteCount}</div>
        </div>
      </div>

      {/* Audit Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading mission audit data...</div>
      ) : auditList.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          No brand schedule blueprints set for <strong>{monthNames[month - 1]} {year}</strong>.<br />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Go to the <strong>Planner</strong> tab to set up a brand schedule blueprint.</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '10px 12px' }}>Brand</th>
                <th style={{ padding: '10px 12px' }}>Planned Slots</th>
                <th style={{ padding: '10px 12px' }}>Posters</th>
                <th style={{ padding: '10px 12px' }}>Live Streams</th>
                <th style={{ padding: '10px 12px' }}>Completion Progress</th>
                <th style={{ padding: '10px 12px' }}>Mission Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Day Checklist</th>
              </tr>
            </thead>
            <tbody>
              {auditList.map((item) => {
                const posters = item.breakdown?.posters || { target: 0, completed: 0 };
                const lives = item.breakdown?.lives || { target: 0, completed: 0 };
                const isExpanded = expandedBrandId === item.brand_id;

                return (
                  <React.Fragment key={item.brand_id}>
                    <tr style={{
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '13px',
                      backgroundColor: isExpanded ? '#f8fafc' : 'transparent'
                    }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>
                        {item.brand_name}
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>
                        <strong>{item.completed_slots}</strong> / {item.total_slots} days
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: posters.completed >= posters.target ? '#dcfce7' : '#f1f5f9',
                          color: posters.completed >= posters.target ? '#15803d' : '#475569'
                        }}>
                          {posters.completed} / {posters.target}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: lives.completed >= lives.target ? '#dbeafe' : '#f1f5f9',
                          color: lives.completed >= lives.target ? '#1d4ed8' : '#475569'
                        }}>
                          {lives.completed} / {lives.target}
                        </span>
                      </td>
                      <td style={{ padding: '12px', width: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${item.completion_rate}%`,
                              height: '100%',
                              backgroundColor: item.completion_rate === 100 ? '#16a34a' : (item.missed_slots > 0 ? '#ef4444' : '#2563eb'),
                              borderRadius: '4px'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '35px' }}>{item.completion_rate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {item.completion_rate === 100 ? (
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '700'
                          }}>
                            ✅ COMPLETED
                          </span>
                        ) : item.missed_slots > 0 ? (
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '700'
                          }}>
                            ⚠️ INCOMPLETE (-{item.missed_slots} Missed)
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '700'
                          }}>
                            ⏳ IN PROGRESS
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleExpand(item.brand_id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {isExpanded ? 'Hide Days' : 'View Days'}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Day-by-Day Checklist */}
                    {isExpanded && (
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '16px 20px', borderBottom: '2px solid #e2e8f0' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '10px' }}>
                            📅 Day-by-Day Audit Breakdown for {item.brand_name} ({monthNames[month - 1]} {year})
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                            {item.slots.map((s, idx) => {
                              const isSlotCompleted = s.computed_status === 'completed';
                              const isSlotMissed = s.computed_status === 'missed';
                              const isSlotScheduled = s.computed_status === 'scheduled';

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#ffffff',
                                    border: `1px solid ${isSlotCompleted ? '#bbf7d0' : (isSlotMissed ? '#fecaca' : '#e2e8f0')}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                      {s.planned_date_str}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                      {s.content_type === 'live' ? '🎥 Live Stream' : (s.content_type === 'video' ? '🎬 Short Video' : '🖼️ Poster')}
                                      {s.time_window ? ` • ${s.time_window}` : ''}
                                    </div>
                                    {s.notes && (
                                      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                                        "{s.notes}"
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    {isSlotCompleted ? (
                                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                                        ✅ Done
                                      </span>
                                    ) : isSlotMissed ? (
                                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '6px' }}>
                                        ❌ Missed
                                      </span>
                                    ) : isSlotScheduled ? (
                                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', backgroundColor: '#dbeafe', padding: '3px 8px', borderRadius: '6px' }}>
                                        🕒 Scheduled
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                                        ⏳ Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

