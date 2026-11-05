import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import * as productService from '../../product/services/productService';
import * as missionApi from '../api/missionApi';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Select, Input, DatePicker } from '../../../shared/components/ui';

// Default standard contract: 4 Posters and 2 Live Streams (6 slots total)
const getDefaultSlotsForMonth = (m, y) => {
  const padM = String(m).padStart(2, '0');
  const lastDayOfMonth = new Date(y, m, 0).getDate();
  const clampDay = (d) => String(Math.min(d, lastDayOfMonth)).padStart(2, '0');

  return [
    { planned_date: `${y}-${padM}-${clampDay(4)}`, content_type: 'photo', time_window: '', notes: 'Week 1 Hero Poster' },
    { planned_date: `${y}-${padM}-${clampDay(9)}`, content_type: 'live', time_window: '01:00PM - 05:00PM', notes: 'Friday Afternoon Live Stream' },
    { planned_date: `${y}-${padM}-${clampDay(12)}`, content_type: 'photo', time_window: '', notes: 'Week 2 Feature Poster' },
    { planned_date: `${y}-${padM}-${clampDay(21)}`, content_type: 'photo', time_window: '', notes: 'Week 3 Product Showcase Poster' },
    { planned_date: `${y}-${padM}-${clampDay(23)}`, content_type: 'live', time_window: '01:00PM - 05:00PM', notes: 'Payday Special Live Stream' },
    { planned_date: `${y}-${padM}-${clampDay(27)}`, content_type: 'photo', time_window: '', notes: 'Month-End Closing Poster' },
  ];
};

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
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const isPresetActiveRef = useRef(false);

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

  const contentTypeOptions = useMemo(() => [
    { value: 'photo', label: '🖼️ Poster (Photo)' },
    { value: 'live', label: '🎥 Live Stream' },
    { value: 'video', label: '🎬 Short Video / Reel' },
    { value: 'status', label: '📝 Status / Text' },
  ], []);

  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);
  const activeMonthName = monthNames[month - 1] || 'Month';

  // Compute active month boundary for date inputs
  const padMonth = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const minDate = `${year}-${padMonth}-01`;
  const maxDate = `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`;

  // Load existing mission for selected brand + month + year
  useEffect(() => {
    if (!isOpen || !selectedBrandId) return;

    // If template was just applied, do not overwrite with DB fetch
    if (isPresetActiveRef.current) {
      isPresetActiveRef.current = false;
      return;
    }

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

  // Preset: Load Standard Contract (4 Posters & 2 Live Streams) into the CURRENT selected Month & Year
  const handleLoadPreset = () => {
    isPresetActiveRef.current = true;
    setNotes(`${activeMonthName} ${year} ${currentBrandName} Schedule (4 Posters, 2 Live Streams)`);
    setSlots(getDefaultSlotsForMonth(month, year));
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

      // Sort slots chronologically by planned date
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="plan-blueprint-modal"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '88vh', overflow: 'hidden' }}>
        {/* Header using Global ModalHeader */}
        <ModalHeader
          title="🎯 Plan Brand Schedule Blueprint"
          description="Set exact days to post and live stream for each brand"
          onClose={onClose}
        />

        {/* Body using Global ModalBody */}
        <ModalBody style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, minHeight: '440px' }}>
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

          {/* Brand, Month, Year Selector using Global Select & Input */}
          <div
            className="blueprint-top-selectors"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr',
              gap: '14px',
              marginBottom: '18px',
              position: 'relative',
              zIndex: 200,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Target Brand
              </label>
              <Select
                value={selectedBrandId}
                options={brandOptions}
                onOpenChange={(open) => {
                  if (open) setActiveSlotIndex(null);
                }}
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
                onOpenChange={(open) => {
                  if (open) setActiveSlotIndex(null);
                }}
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

          {/* Slots Section */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                Planned Content : {slots.length}
              </span>
              <div style={{ display: 'flex', gap: '7px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  startIcon={<Plus size={14} />}
                  onClick={handleAddSlot}
                  style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
                >
                  Add Planned
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<Sparkles size={14} color="#0284c7" />}
                  onClick={handleLoadPreset}
                  style={{ height: '32px', fontSize: '12px' }}
                >
                  Fill {activeMonthName}
                </Button>
              </div>
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
                No days scheduled yet. Click <strong>+ Add Planned Day</strong> or <strong>Fill {activeMonthName} Template</strong> to get started!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Column Headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.25fr 1.35fr 1.15fr 1.35fr 38px',
                    gap: '8px',
                    padding: '0 10px 2px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#64748b',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span>Date</span>
                  <span>Format</span>
                  <span>Time Window</span>
                  <span>Topic / Note</span>
                  <span></span>
                </div>

                {slots.map((slot, index) => {
                  const isActive = activeSlotIndex === index;
                  return (
                    <div
                      key={index}
                      className={`blueprint-slot-row ${isActive ? 'is-active' : ''}`}
                      onFocus={() => setActiveSlotIndex(index)}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setActiveSlotIndex(null);
                        }
                      }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.25fr 1.35fr 1.15fr 1.35fr 38px',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '8px 10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        position: 'relative',
                        zIndex: isActive ? 100 : (slots.length - index + 1),
                      }}
                    >
                      {/* Date using Global Custom DatePicker */}
                      <div>
                        <DatePicker
                          value={slot.planned_date}
                          min={minDate}
                          max={maxDate}
                          onOpenChange={(open) => setActiveSlotIndex(open ? index : null)}
                          onChange={(e) => {
                            const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                            handleUpdateSlot(index, 'planned_date', val);
                          }}
                          required
                        />
                      </div>

                      {/* Content Type using Global Select */}
                      <div>
                        <Select
                          value={slot.content_type}
                          options={contentTypeOptions}
                          onOpenChange={(open) => setActiveSlotIndex(open ? index : null)}
                          onChange={(val) => {
                            const value = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                            handleUpdateSlot(index, 'content_type', value);
                          }}
                          placeholder="Format..."
                        />
                      </div>

                      {/* Time Window using Global Input */}
                      <div>
                        <Input
                          type="text"
                          placeholder={slot.content_type === 'live' ? '01:00PM - 05:00PM' : 'Time (optional)'}
                          value={slot.time_window || ''}
                          onChange={(e) => handleUpdateSlot(index, 'time_window', e.target.value)}
                          className="m-0"
                          style={{ height: '38px' }}
                        />
                      </div>

                      {/* Notes using Global Input */}
                      <div>
                        <Input
                          type="text"
                          placeholder="Note (e.g. Hero product)"
                          value={slot.notes || ''}
                          onChange={(e) => handleUpdateSlot(index, 'notes', e.target.value)}
                          className="m-0"
                          style={{ height: '38px' }}
                        />
                      </div>

                      {/* Delete using Global Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSlot(index)}
                        title="Remove slot"
                        style={{
                          height: '38px',
                          width: '38px',
                          padding: 0,
                          color: '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ModalBody>

        {/* Footer using Global ModalFooter & Buttons */}
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
            Save Schedule Blueprint
          </Button>
        </ModalFooter>
      </form>
    </Modal >
  );
};

