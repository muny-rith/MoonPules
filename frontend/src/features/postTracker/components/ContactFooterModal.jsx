import React, { useState, useEffect } from 'react';
import { Check, Save, CornerDownLeft, AlertCircle, Store } from 'lucide-react';
import { Modal, Button } from '../../../shared/components/ui';

export const ContactFooterModal = ({
  isOpen,
  onClose,
  footerText,
  onSave,
  onInsert,
}) => {
  const [text, setText] = useState(footerText || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setText(footerText || '');
  }, [footerText, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onSave(text);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save footer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInsert = () => {
    onInsert(text);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={saving ? undefined : onClose} size="md">
      <Modal.Header onClose={saving ? undefined : onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Store size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
              Store Contact & Branch Footer
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Shared across all connected Facebook Pages
            </p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '12px',
            color: '#475569',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '10px 12px',
            borderRadius: '8px',
          }}
        >
          <AlertCircle size={15} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
          <span>
            This contact information is saved in the database (<code>tb_setting</code>) and automatically available for every post on all pages.
          </span>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '6px',
            }}
          >
            Footer Content (Khmer / English):
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#0f172a',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            placeholder="Enter store contact numbers, Telegram links, branches..."
          />
        </div>

        {saveSuccess && (
          <div
            style={{
              fontSize: '12px',
              color: '#15803d',
              background: '#dcfce7',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Check size={14} /> Changes saved to Database successfully!
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ justifyContent: 'space-between' }}>
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          loading={saving}
          icon={<Save size={14} />}
        >
          Save to DB
        </Button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleInsert}
            icon={<CornerDownLeft size={14} />}
          >
            Insert into Post
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};
