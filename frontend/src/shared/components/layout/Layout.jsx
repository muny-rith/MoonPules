import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobileOpen = () => setIsMobileOpen(!isMobileOpen);

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
          
          <div className="user-profile" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div className="avatar">U</div>
            <span className="user-name">User</span>
          </div>
        </header>
        <div className="content-scroll">
          {children}
        </div>
      </main>
    </div>
  );
};
