import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures every route change immediately resets the scroll position to the top
 * for both the window and any inner scroll containers (like .content-scroll).
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;

      const scrollContainers = document.querySelectorAll('.content-scroll, .main-content, .page-container');
      scrollContainers.forEach((el) => {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      });
    };

    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    const timer = setTimeout(resetScroll, 30);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;
