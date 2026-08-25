import React from 'react';
import { Sidebar } from './Sidebar';

export const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div style={{ flex: 1 }}></div>
          
          <div className="search-bar" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <input type="text" placeholder="Search..." style={{ width: '100%', maxWidth: '400px' }} />
          </div>
          
          <div className="user-profile" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div className="avatar">U</div>
            <span>User</span>
          </div>
        </header>
        <div className="content-scroll">
          {children}
        </div>
      </main>
    </div>
  );
};
