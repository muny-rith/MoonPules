import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Trash2, Check, X, Tag, AlertCircle } from 'lucide-react';
import { Button, Input } from '../../../shared/components/ui';

export const SlotDatePopover = ({
  slot,
  isOpen,
  onClose,
  onSave,
  onDelete,
  brandName,
  anchorEl,
}) => {
  const popoverRef = useRef(null);
  const [plannedDate, setPlannedDate] = useState(slot?.planned_date_str || '');
  const [contentType, setContentType] = useState(slot?.content_type || 'photo');
  const [timeWindow, setTimeWindow] = useState(slot?.time_window || '');
  const [notes, setNotes] = useState(slot?.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (slot) {
      setPlannedDate(slot.planned_date_str || (slot.planned_date ? slot.planned_date.split('T')[0] : ''));
      setContentType(slot.content_type || 'photo');
      setTimeWindow(slot.time_window || '');
      setNotes(slot.notes || '');
      setError(null);
    }
  }, [slot]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !slot) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!plannedDate) {
      setError('Please choose a valid date');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave({
        id: slot.id,
        planned_date: plannedDate,
        content_type: contentType,
        time_window: timeWindow,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to update slot');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove this deliverable slot for ${brandName || 'this brand'}?`)) {
      return;
    }
    try {
      setDeleting(true);
      await onDelete(slot.id);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to delete slot');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        ref={popoverRef}
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
              Edit Deliverable Slot
            </div>
            {brandName && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Brand: <strong style={{ color: '#2563eb' }}>{brandName}</strong>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Date Picker */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Scheduled Date
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Deliverable Format */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Content Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { type: 'photo', label: 'Poster', icon: '🖼️' },
                { type: 'video', label: 'Video', icon: '🎬' },
                { type: 'live', label: 'Live', icon: '🎥' },
              ].map((f) => {
                const isSelected = contentType === f.type;
                return (
                  <button
                    key={f.type}
                    type="button"
                    onClick={() => setContentType(f.type)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#475569',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Window (Optional) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Time Window (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. 10:00 AM, Evening, Prime Time"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="m-0"
              style={{ height: '38px' }}
            />
          </div>

          {/* Notes / Instructions (Optional) */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Notes / Instructions
            </label>
            <Input
              type="text"
              placeholder="e.g. New Product Teaser, Promo Banner"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="m-0"
              style={{ height: '38px' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <Button
              variant="danger-outline"
              size="sm"
              startIcon={<Trash2 size={14} />}
              onClick={handleDelete}
              loading={deleting}
              disabled={deleting || saving}
            >
              {deleting ? 'Removing...' : 'Delete'}
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving || deleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                disabled={saving || deleting}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

