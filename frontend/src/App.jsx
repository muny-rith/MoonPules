import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './shared/components/layout/Layout';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { PostTrackerPage } from './features/postTracker';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<PostTrackerPage />} />
          <Route path="*" element={<div className="page-placeholder">Page under construction</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
