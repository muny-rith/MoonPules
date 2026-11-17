import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../shared/components/ui/Modal/Modal';
import { Button } from '../../../shared/components/ui/Button/Button';
import { useToast } from '../../../shared/context/ToastContext';
import { invalidateMissionCaches } from '../../../shared/utils/cacheSync';
import * as missionApi from '../api/missionApi';
import { AlertCircle, Building2, UserX, PauseCircle, CalendarOff, Check } from 'lucide-react';

const REASON_OPTIONS = [
  {
    key: 'agency_delay',
    label: 'Agency Delay (Internal)',
    icon: Building2,
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    desc: 'Missed due to team scheduling, creator delay, or agency production bottleneck.',
  },
  {
    key: 'client_delay',
    label: 'Client Delay (External)',
    icon: UserX,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    desc: 'Client withheld product sample, artwork approval, or requested temporary pause.',
  },
  {
    key: 'client_waived',
    label: 'Client Waived (Agreed Hold)',
    icon: PauseCircle,
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    desc: 'Client agreed in writing to waive or cancel this slot without SLA penalty.',
  },
  {
    key: 'holiday_force_majeure',
    label: 'Holiday / Force Majeure',
    icon: CalendarOff,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    desc: 'Public holiday, technical outage, or unavoidable event.',
  },
];

const formatSlotDateStr = (slot) => {
  if (slot?.planned_date_str) return slot.planned_date_str;
  if (!slot?.planned_date) return '';
  const d = new Date(slot.planned_date);
  if (isNaN(d.getTime())) return String(slot.planned_date).slice(0, 10);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' });
};

export const CategorizeMissedModal = ({ isOpen, onClose, slot, onSaved }) => {
  const toast = useToast();
  const [selectedReason, setSelectedReason] = useState('agency_delay');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [slotStatus, setSlotStatus] = useState('missed'); // 'missed' | 'waived'
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (slot) {
      setSelectedReason(slot.missed_reason || 'agency_delay');
      setResolutionNotes(slot.resolution_notes || '');
      setSlotStatus(slot.slot_status === 'waived' ? 'waived' : 'missed');
    }
  }, [slot]);

  if (!isOpen || !slot) return null;

  const handleReasonClick = (key) => {
    setSelectedReason(key);
    if (key === 'client_waived') {
      setSlotStatus('waived');
    } else {
      setSlotStatus('missed');
    }
  };

  const handleSave = async () => {
    if (!slot.id) return;
    setIsSaving(true);
    try {
      await missionApi.updateSlot(slot.id, {
        missed_reason: selectedReason,
        resolution_notes: resolutionNotes.trim() || null,
        slot_status: slotStatus,
      });

      if (toast?.success) {
        toast.success('Slot missed reason categorized successfully');
      }
      if (typeof onSaved === 'function') {
        onSaved({
          ...slot,
          missed_reason: selectedReason,
          resolution_notes: resolutionNotes.trim() || null,
          slot_status: slotStatus,
        });
      }
      if (typeof onClose === 'function') {
        onClose();
      }

      // Synchronize all cache tiers (TanStack Query, session, modules)
      invalidateMissionCaches().catch(() => {});
    } catch (err) {
      if (toast?.error) {
        toast.error(err.message || 'Failed to update slot reason');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        title="Categorize Missed Deliverable"
        description={`Slot #${slot.id} · ${slot.brand_name || 'Brand'} (${formatSlotDateStr(slot)} · ${(slot.content_type || 'post').toUpperCase()})`}
        onClose={onClose}
      />

      <ModalBody style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
            Select Missed Root Cause / SLA Classification:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REASON_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedReason === opt.key;
              return (
                <div
                  key={opt.key}
                  onClick={() => handleReasonClick(opt.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isSelected ? opt.color : '#e2e8f0'}`,
                    backgroundColor: isSelected ? opt.bg : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#ffffff' : opt.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: opt.color,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#0f172a' : '#334155' }}>
                        {opt.label}
                      </span>
                      {isSelected && <Check size={14} color={opt.color} strokeWidth={3} />}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolution Notes */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
            Resolution / Accountability Notes (Optional):
          </label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="e.g. Client requested hold via Telegram; scheduled to resume next month..."
            rows={3}
            style={{
              width: '100%',
              fontSize: '12px',
              fontFamily: 'inherit',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* SLA Status Impact */}
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: slotStatus === 'waived' ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${slotStatus === 'waived' ? '#bbf7d0' : '#fef08a'}`,
          fontSize: '11.5px',
          color: slotStatus === 'waived' ? '#166534' : '#854d0e',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>
            {slotStatus === 'waived'
              ? 'Status will be updated to WAIVED (Client agreed hold · Excluded from penalty in Monthly SLA Audit).'
              : 'Status remains MISSED (Counted as an unfulfilled deliverable deficit in Monthly SLA Audit).'}
          </span>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} loading={isSaving}>
          Save Classification
        </Button>
      </ModalFooter>
    </Modal>
  );
};
