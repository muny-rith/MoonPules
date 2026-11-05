import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useSessionDraft - Synchronizes form state with sessionStorage
 * - Restores draft on mount if available in the current session.
 * - Tab-isolated: does not conflict across different browser tabs.
 * - Automatically purged when the tab is closed.
 *
 * @param {string} storageKey - Unique key in sessionStorage
 * @param {any} initialValue - Default initial state
 * @param {boolean} enabled - Whether saving is active
 */
export const useSessionDraft = (storageKey, initialValue, enabled = true) => {
  const [draft, setDraft] = useState(() => {
    if (!enabled || typeof window === 'undefined') return initialValue;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Failed to read sessionStorage for key "${storageKey}":`, e);
    }
    return initialValue;
  });

  const isFirstRender = useRef(true);

  // Debounced save to sessionStorage
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!enabled || typeof window === 'undefined') return;

    const timer = setTimeout(() => {
      try {
        if (draft === null || draft === undefined) {
          sessionStorage.removeItem(storageKey);
        } else {
          sessionStorage.setItem(storageKey, JSON.stringify(draft));
        }
      } catch (e) {
        console.warn(`Failed to write sessionStorage for key "${storageKey}":`, e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [draft, storageKey, enabled]);

  // Clear draft explicitly (e.g. on successful post submit)
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      // ignore
    }
  }, [storageKey]);

  return [draft, setDraft, clearDraft];
};

