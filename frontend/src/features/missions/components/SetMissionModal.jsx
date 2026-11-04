import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Calendar, Clock, Tag, Sparkles, Check, AlertCircle } from 'lucide-react';
import * as productService from '../../product/services/productService';
import * as missionApi from '../api/missionApi';
import { Modal, Button, Select, Input } from '../../../shared/components/ui';

export const SetMissionModal = ({
  isOpen,
  onClose,
  onSaved,
  initialMonth = new Date().getMonth() + 1,
  initialYear = new Date().getFullYear(),
  initialBrandId = '',
}) => {
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(initialBrandId || '');
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load available brands
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await productService.fetchBrands();
        if (isMounted) {
          setBrands(data || []);
          if (!selectedBrandId && data && data.length > 0) {
            // Find K-FREE if exists, else first brand
            const kfree = data.find((b) => (b.brand_name || b.name || '').toUpperCase().includes('FREE'));
            setSelectedBrandId(String(kfree ? (kfree.brand_id || kfree.id) : (data[0].brand_id || data[0].id)));
          }
        }
      } catch (err) {
        console.error('Failed to load brands:', err);
      }
    };
    if (isOpen) load();
    return () => { isMounted = false; };
  }, [isOpen]);

  const brandOptions = useMemo(() => {
    return brands.map((b) => ({
      value: String(b.brand_id || b.id),
      label: b.brand_name || b.name || `Brand #${b.brand_id || b.id}`,
    }));
  }, [brands]);

  const monthOptions = useMemo(() => [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ], []);

  // Load existing mission for selected brand + month + year
  useEffect(() => {
    if (!isOpen || !selectedBrandId) return;

    let isMounted = true;
    const loadMission = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await missionApi.getMission(selectedBrandId, month, year);
        if (isMounted) {
          if (data && data.slots && data.slots.length > 0) {
            setNotes(data.notes || '');
            setSlots(
              data.slots.map((s) => ({
                id: s.id,
                planned_date: s.planned_date_str || (s.planned_date ? s.planned_date.split('T')[0] : ''),
                content_type: s.content_type || 'photo',
                time_window: s.time_window || '',
                notes: s.notes || '',
              }))
            );
          } else {
            setNotes('');
            setSlots([]);
          }
        }
      } catch (err) {
        console.error('Failed to load existing mission:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMission();
    return () => { isMounted = false; };
  }, [isOpen, selectedBrandId, month, year]);

  if (!isOpen) return null;

  const currentBrand = brands.find((b) => String(b.brand_id || b.id) === String(selectedBrandId));
  const currentBrandName = currentBrand ? (currentBrand.brand_name || currentBrand.name) : 'Brand';

  // Add slot
  const handleAddSlot = () => {
    const padMonth = String(month).padStart(2, '0');
    setSlots([
      ...slots,
      {
        planned_date: `${year}-${padMonth}-01`,
        content_type: 'photo',
        time_window: '',
        notes: '',
      },
    ]);
  };

  // Preset: Load October 2026 K-FREE Schedule from Calendar
  const handleLoadOctoberPreset = () => {
    setMonth(10);
    setYear(2026);
    setNotes('October 2026 K-FREE Master Schedule (4 Posters, 3 Live Streams)');
    setSlots([
      { planned_date: '2026-10-04', content_type: 'photo', time_window: '', notes: 'Week 1 Hero Poster' },
      { planned_date: '2026-10-09', content_type: 'live', time_window: '01:00PM - 05:00PM', notes: 'Friday Afternoon Live Stream' },
      { planned_date: '2026-10-12', content_type: 'photo', time_window: '', notes: 'Week 2 Feature Poster' },
      { planned_date: '2026-10-21', content_type: 'photo', time_window: '', notes: 'Week 3 Product Showcase Poster' },
      { planned_date: '2026-10-23', content_type: 'live', time_window: '01:00PM - 05:00PM', notes: 'Friday Afternoon Live Stream' },
      { planned_date: '2026-10-27', content_type: 'photo', time_window: '', notes: 'Month-End Teaser Poster' },
      { planned_date: '2026-10-30', content_type: 'live', time_window: '04:00PM', notes: 'Payday Special Live Stream' },
    ]);
  };

  const handleUpdateSlot = (index, field, val) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: val };
    setSlots(updated);
  };

  const handleRemoveSlot = (index) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrandId) {
      setError('Please select a brand');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Sort slots by date
      const sortedSlots = [...slots].sort((a, b) => (a.planned_date > b.planned_date ? 1 : -1));

      const payload = {
        brand_id: parseInt(selectedBrandId, 10),
        brand_name: currentBrandName,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        notes,
        slots: sortedSlots,
      };

      const result = await missionApi.saveMission(payload);
      if (onSaved) onSaved(result);
      onClose();
    } catch (err) {
      console.error('Failed to save mission:', err);
      setError(err?.response?.data?.error || 'Failed to save mission. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="modal-content" style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              🎯 Plan Brand Schedule Blueprint
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Set exact days to post and live stream for each brand
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Brand, Month, Year Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Target Brand
                </label>
                <Select
                  value={selectedBrandId}
                  options={brandOptions}
                  onChange={(e) => {
                    const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                    setSelectedBrandId(val);
                  }}
                  placeholder="Select Brand..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Month
                </label>
                <Select
                  value={String(month)}
                  options={monthOptions}
                  onChange={(e) => {
                    const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                    setMonth(parseInt(val, 10));
                  }}
                  placeholder="Select Month..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Year
                </label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  min="2024"
                  max="2030"
                  className="m-0"
                  style={{ height: '38px' }}
                />
              </div>
            </div>

            {/* Quick Preset Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                Need the 7-day schedule like your photo?
              </span>
              <Button
                variant="outline"
                size="sm"
                startIcon={<Sparkles size={14} color="#0284c7" />}
                onClick={handleLoadOctoberPreset}
                style={{ height: '32px', fontSize: '12px' }}
              >
                Fill October K-FREE Calendar
              </Button>
            </div>

            {/* Slots List */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  Planned Posting Days ({slots.length} slots)
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  startIcon={<Plus size={14} />}
                  onClick={handleAddSlot}
                  style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                >
                  Add Planned Day
                </Button>
              </div>

              {slots.length === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  border: '2px dashed #e2e8f0',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '13px'
                }}>
                  No days scheduled yet. Click <strong>+ Add Planned Day</strong> or <strong>Fill October K-FREE Calendar</strong> to get started!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr 36px',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '8px 10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    >
                      {/* Date */}
                      <div>
                        <input
                          type="date"
                          value={slot.planned_date}
                          onChange={(e) => handleUpdateSlot(index, 'planned_date', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                          required
                        />
                      </div>

                      {/* Content Type */}
                      <div>
                        <select
                          value={slot.content_type}
                          onChange={(e) => handleUpdateSlot(index, 'content_type', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            backgroundColor: '#fff'
                          }}
                        >
                          <option value="photo">🖼️ Poster (Photo)</option>
                          <option value="live">🎥 Live Stream</option>
                          <option value="video">🎬 Short Video / Reel</option>
                          <option value="status">📝 Status / Text</option>
                        </select>
                      </div>

                      {/* Time Window */}
                      <div>
                        <input
                          type="text"
                          placeholder={slot.content_type === 'live' ? 'e.g. 01:00PM - 05:00PM' : 'Time (optional)'}
                          value={slot.time_window || ''}
                          onChange={(e) => handleUpdateSlot(index, 'time_window', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <input
                          type="text"
                          placeholder="Note (e.g. Hero product)"
                          value={slot.notes || ''}
                          onChange={(e) => handleUpdateSlot(index, 'notes', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px'
                        }}
                        title="Remove slot"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: '#f8fafc'
          }}>
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
              Save Schedule Blueprint
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

