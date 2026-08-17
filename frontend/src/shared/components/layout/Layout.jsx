import React from 'react';
import { Sidebar } from './Sidebar';

export const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="search-bar">
            <input type="text" placeholder="Search..." />
          </div>
          <div className="user-profile">
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
