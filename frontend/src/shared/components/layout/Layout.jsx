import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const contentScrollRef = useRef(null);
  const isDashboard = location.pathname === '/';
  const isPlanner = location.pathname === '/planner';

  // Immediately scroll to top of both inner scroll container and window on route change
  useEffect(() => {
    const resetScroll = () => {
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0;
        contentScrollRef.current.scrollLeft = 0;
      }
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    const timer = setTimeout(resetScroll, 30);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [location.pathname]);

  const { user, logout } = useAuth();
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobileOpen = () => setIsMobileOpen(!isMobileOpen);

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  return (
    <div className={`layout-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        toggleCollapse={toggleCollapse}
        closeMobile={() => setIsMobileOpen(false)}
      />

      <main className="main-content">
        <header className="topbar">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="mobile-menu-btn" onClick={toggleMobileOpen}>
              <Menu size={20} />
            </button>
            <button className="desktop-collapse-btn-content" onClick={toggleCollapse}>
              <Menu size={20} />
            </button>
          </div>

          <div className="search-bar" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <input type="text" placeholder="Search..." style={{ width: '100%', maxWidth: '400px' }} />
          </div>

          <div className="topbar-user-profile">
            <div style={{ padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <Bell size={20} />
            </div>
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="topbar-greeting desktop-only">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{greeting}</span>
                <span className="user-name" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>{displayName}</span>
              </div>
              <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--primary-blue), #8b5cf6)', color: '#fff', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {initials}
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '4px',
                  transition: 'color 0.15s, background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
        <div ref={contentScrollRef} className={`content-scroll ${isDashboard ? 'content-dashboard' : ''} ${isPlanner ? 'content-planner' : ''}`}>
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};
