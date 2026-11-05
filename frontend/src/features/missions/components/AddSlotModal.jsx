import React, { useState, useEffect, useMemo } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Select, Input, DatePicker } from '../../../shared/components/ui';

export const AddSlotModal = ({
  isOpen,
  onClose,
  onSave,
  brandId,
  brandName,
  month,
  year,
  initialDate = '',
}) => {
  const getDefaultDate = () => {
    if (initialDate) return initialDate;
    const mStr = String(month).padStart(2, '0');
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const dayStr = isCurrentMonth ? String(today.getDate()).padStart(2, '0') : '01';
    return `${year}-${mStr}-${dayStr}`;
  };

  const [plannedDate, setPlannedDate] = useState(getDefaultDate());
  const [contentType, setContentType] = useState('photo');
  const [timeWindow, setTimeWindow] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const formatOptions = useMemo(() => [
    { value: 'photo', label: '🖼️ Poster (Photo)' },
    { value: 'live', label: '🎥 Live Stream' },
    { value: 'video', label: '🎬 Short Video / Reel' },
  ], []);

  const padM = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const minDate = `${year}-${padM}-01`;
  const maxDate = `${year}-${padM}-${String(lastDay).padStart(2, '0')}`;

  useEffect(() => {
    if (isOpen) {
      setPlannedDate(getDefaultDate());
      setContentType('photo');
      setTimeWindow('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, initialDate, month, year]);

  if (!isOpen) return null;

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
        brand_id: brandId,
        brand_name: brandName,
        month,
        year,
        planned_date: plannedDate,
        content_type: contentType,
        time_window: timeWindow,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to add deliverable');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <ModalHeader
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} color="#2563eb" />
              <span>Add Scheduled Deliverable</span>
            </div>
          }
          description={brandName ? `For brand: ${brandName}` : undefined}
          onClose={onClose}
        />

        <ModalBody style={{ padding: '18px 20px', minHeight: '360px' }}>
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

          {/* Date Picker using Global Custom DatePicker */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Deliverable Date
            </label>
            <DatePicker
              value={plannedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                setPlannedDate(val);
              }}
              required
            />
          </div>

          {/* Deliverable Format using Global Select */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Content Format
            </label>
            <Select
              value={contentType}
              options={formatOptions}
              onChange={(val) => {
                const value = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                setContentType(value);
              }}
              placeholder="Select format..."
            />
          </div>

          {/* Time Window using Global Input */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Time Window (Optional)
            </label>
            <Input
              type="text"
              placeholder={contentType === 'live' ? 'e.g. 01:00 PM - 05:00 PM' : 'e.g. 10:00 AM, Evening'}
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="m-0"
              style={{ height: '38px' }}
            />
          </div>

          {/* Notes using Global Input */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Campaign Deliverable Notes
            </label>
            <Input
              type="text"
              placeholder="e.g. Promotional poster, Live product demonstration"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="m-0"
              style={{ height: '38px' }}
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={saving}
          >
            Schedule Deliverable
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};