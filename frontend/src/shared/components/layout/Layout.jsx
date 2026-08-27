import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Bell } from 'lucide-react';

export const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
            <div className="user-profile">
              <div className="topbar-greeting desktop-only">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{greeting}</span>
                <span className="user-name" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>Chhoby</span>
              </div>
              <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--primary-blue), #8b5cf6)', color: '#fff', border: '2px solid var(--border-color)' }}>Ch</div>
            </div>
          </div>
        </header>
        <div className="content-scroll">
          {children}
        </div>
      </main>
    </div>
  );
};
