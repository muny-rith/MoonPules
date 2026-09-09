import { useCallback, useRef } from 'react';

/**
 * Custom hook to isolate wheel scrolling within a container (e.g. Text card or textarea box).
 * - When mouse hovers on this container, prevents the main outer page/content from scrolling.
 * - Allows any scrollable child textarea to scroll its own text content smoothly.
 * - Automatically locks/clamps boundaries when reaching the top or bottom of the text.
 * - If text content fits within the box without a scrollbar, stops outer page scroll.
 * - Leaves popups (like emoji picker) free to scroll their own lists.
 */
export function useWheelIsolation() {
  const cleanupRef = useRef(null);

  const ref = useCallback((node) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!node) return;

    const handleWheel = (e) => {
      // Allow emoji picker popover to handle its own scrollable grid
      if (e.target.closest && e.target.closest('.meta-emoji-popover')) {
        return;
      }

      const textarea = node.querySelector('textarea');
      if (!textarea) {
        e.preventDefault();
        return;
      }

      const isOverTextarea = e.target === textarea || textarea.contains(e.target);

      // If hovering over non-textarea areas (header, toolbar, quick action buttons, card padding)
      if (!isOverTextarea) {
        e.preventDefault();
        return;
      }

      // Inside textarea: check if text exceeds clientHeight
      const { scrollTop, scrollHeight, clientHeight } = textarea;
      const maxScrollTop = scrollHeight - clientHeight;

      // If text content does not need scrolling, prevent main content from scrolling
      if (maxScrollTop <= 1) {
        e.preventDefault();
        return;
      }

      const delta = e.deltaY;
      const isScrollingUp = delta < 0;
      const isScrollingDown = delta > 0;

      if (isScrollingUp) {
        if (scrollTop <= 0) {
          e.preventDefault();
          return;
        }
        if (scrollTop + delta <= 0) {
          textarea.scrollTop = 0;
          e.preventDefault();
          return;
        }
      } else if (isScrollingDown) {
        if (scrollTop >= maxScrollTop - 1) {
          e.preventDefault();
          return;
        }
        if (scrollTop + delta >= maxScrollTop) {
          textarea.scrollTop = maxScrollTop;
          e.preventDefault();
          return;
        }
      }

      // Within scroll bounds: allow native textarea scroll, but isolate from parent containers
      e.stopPropagation();
    };

    node.addEventListener('wheel', handleWheel, { passive: false });

    cleanupRef.current = () => {
      node.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return ref;
}
