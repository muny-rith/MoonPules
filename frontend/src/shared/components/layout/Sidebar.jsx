import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Package, BarChart2, MessageSquare, Target, Settings, HelpCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FaFacebook, FaTiktok } from 'react-icons/fa';

export const Sidebar = ({ isCollapsed, isMobileOpen, toggleCollapse, closeMobile }) => {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <img src="/logoBlack.png" alt="MoonPulse" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          {!isCollapsed && <h2>MoonPulse</h2>}
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end onClick={closeMobile} title={isCollapsed ? "Dashboard" : ""}>
          <LayoutDashboard size={20} />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobile} title={isCollapsed ? "Task (Content Post)" : ""}>
          <CheckSquare size={20} />
          {!isCollapsed && <span>Task (Content Post)</span>}
        </NavLink>
        <NavLink to="/product" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobile} title={isCollapsed ? "Product" : ""}>
          <Package size={20} />
          {!isCollapsed && <span>Product</span>}
        </NavLink>

        {!isCollapsed && <div className="nav-section-title">Statistics</div>}
        {isCollapsed && <div className="nav-section-divider" />}
        
        <NavLink to="/stats/brands" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobile} title={isCollapsed ? "Brands" : ""}>
          <BarChart2 size={20} />
          {!isCollapsed && <span>Brands</span>}
        </NavLink>
        <NavLink to="/stats/fb" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobile} title={isCollapsed ? "Facebook" : ""}>
          <FaFacebook size={20} />
          {!isCollapsed && <span>Facebook</span>}
        </NavLink>
        <NavLink to="/stats/tiktok" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobile} title={isCollapsed ? "TikTok (Soon)" : ""}>
          <FaTiktok size={20} />
          {!isCollapsed && <span>TikTok (Soon)</span>}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <nav className="sidebar-nav">
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobile} title={isCollapsed ? "Settings" : ""}>
            <Settings size={20} />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>
        </nav>
      </div>
    </aside>
  );
};
