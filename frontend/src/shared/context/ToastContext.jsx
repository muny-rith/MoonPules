import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { id, message, type };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg, duration) => addToast(msg, 'success', duration),
      error: (msg, duration) => addToast(msg, 'error', duration || 5000),
      info: (msg, duration) => addToast(msg, 'info', duration),
      dismiss: removeToast,
    }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Floating Toast Notification Container */}
      {toasts.length > 0 && (
        <aside
          aria-label="Notifications"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '380px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => {
            const isSuccess = t.type === 'success';
            const isError = t.type === 'error';

            return (
              <div
                key={t.id}
                role="status"
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
                  borderLeft: `4px solid ${isSuccess ? '#16a34a' : isError ? '#dc2626' : '#2563eb'}`,
                  borderTop: '1px solid #f1f5f9',
                  borderRight: '1px solid #f1f5f9',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '13px',
                  fontWeight: 500,
                  animation: 'toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {isSuccess ? (
                    <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                  ) : isError ? (
                    <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  ) : (
                    <Info size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ lineHeight: '1.4' }}>{t.message}</span>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </aside>
      )}

      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

