import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Package, BarChart2, MessageSquare, Target, Settings, HelpCircle } from 'lucide-react';
import logoBlack from '../../../../public/logoBlack.png'
export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logoBlack} alt="MoonPulse" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />

        <h2>MoonPulse</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckSquare size={20} />
          <span>Task (Content Post)</span>
        </NavLink>
        <NavLink to="/product" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={20} />
          <span>Product</span>
        </NavLink>

        <div className="nav-section-title">Statistics</div>
        <NavLink to="/stats/brands" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart2 size={20} />
          <span>Brands</span>
        </NavLink>
        <NavLink to="/stats/fb" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart2 size={20} />
          <span>Facebook</span>
        </NavLink>
        <NavLink to="/stats/tiktok" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart2 size={20} />
          <span>TikTok (Soon)</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <nav className="sidebar-nav">
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
};
