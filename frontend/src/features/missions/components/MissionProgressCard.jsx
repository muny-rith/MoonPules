import React from 'react';
import { Target, CheckCircle2, Clock, AlertTriangle, Sparkles, Edit3 } from 'lucide-react';

export const MissionProgressCard = ({ mission, onOpenModal, brandName = 'All Brands', monthName = 'This Month' }) => {
  if (!mission) {
    return (
      <div style={{
        padding: '12px 18px',
        backgroundColor: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: '10px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Target size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
              No Schedule Blueprint set for {brandName} in {monthName}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Lock in your planned posting days to track completion at month-end.
            </div>
          </div>
        </div>

        <button
          onClick={onOpenModal}
          style={{
            padding: '7px 14px',
            borderRadius: '7px',
            border: '1px solid #bfdbfe',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={14} /> + Plan Schedule Blueprint
        </button>
      </div>
    );
  }

  const {
    total_slots = 0,
    completed_slots = 0,
    missed_slots = 0,
    completion_rate = 0,
    breakdown = {},
  } = mission;

  const posters = breakdown.posters || { target: 0, completed: 0 };
  const lives = breakdown.lives || { target: 0, completed: 0 };
  const videos = breakdown.videos || { target: 0, completed: 0 };

  const isCompleted = completion_rate === 100 && total_slots > 0;
  const hasMissed = missed_slots > 0;

  return (
    <div style={{
      padding: '14px 20px',
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '14px'
    }}>
      {/* Title & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          backgroundColor: isCompleted ? '#dcfce7' : (hasMissed ? '#fef3c7' : '#eff6ff'),
          color: isCompleted ? '#16a34a' : (hasMissed ? '#d97706' : '#2563eb'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isCompleted ? <CheckCircle2 size={20} /> : <Target size={20} />}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
              🎯 {mission.brand_name || brandName} — {monthName} Schedule Blueprint
            </span>
            {isCompleted && (
              <span style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                100% COMPLETED 🏆
              </span>
            )}
            {!isCompleted && hasMissed && (
              <span style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {missed_slots} Missed Day(s) ⚠️
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {completed_slots} of {total_slots} planned days published ({completion_rate}% finished)
          </div>
        </div>
      </div>

      {/* Breakdown Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {posters.target > 0 && (
          <div style={{
            padding: '5px 10px',
            backgroundColor: posters.completed >= posters.target ? '#dcfce7' : '#f1f5f9',
            border: `1px solid ${posters.completed >= posters.target ? '#86efac' : '#e2e8f0'}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: posters.completed >= posters.target ? '#15803d' : '#334155'
          }}>
            🖼️ Posters: {posters.completed}/{posters.target}
          </div>
        )}

        {lives.target > 0 && (
          <div style={{
            padding: '5px 10px',
            backgroundColor: lives.completed >= lives.target ? '#dbeafe' : '#f1f5f9',
            border: `1px solid ${lives.completed >= lives.target ? '#93c5fd' : '#e2e8f0'}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: lives.completed >= lives.target ? '#1d4ed8' : '#334155'
          }}>
            🎥 Live Streams: {lives.completed}/{lives.target}
          </div>
        )}

        {videos.target > 0 && (
          <div style={{
            padding: '5px 10px',
            backgroundColor: videos.completed >= videos.target ? '#f3e8ff' : '#f1f5f9',
            border: `1px solid ${videos.completed >= videos.target ? '#d8b4fe' : '#e2e8f0'}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: videos.completed >= videos.target ? '#7e22ce' : '#334155'
          }}>
            🎬 Videos: {videos.completed}/{videos.target}
          </div>
        )}

        <button
          onClick={onOpenModal}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '4px'
          }}
          title="Edit Schedule Blueprint"
        >
          <Edit3 size={13} /> Edit Blueprint
        </button>
      </div>
    </div>
  );
};

