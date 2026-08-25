import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './shared/components/layout/Layout';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { PostTrackerPage } from './features/postTracker';
import { Product } from './features/product/page/Product';
import { BrandStatsPage } from './features/statistics/pages/BrandStatsPage';
import { BrandDetailPage } from './features/statistics/pages/BrandDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<PostTrackerPage />} />
          <Route path='/product' element={<Product />} />
          <Route path='/stats/brands' element={<BrandStatsPage />} />
          <Route path='/stats/brands/:id' element={<BrandDetailPage />} />
          <Route path="*" element={<div className="page-placeholder">Page under construction</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
