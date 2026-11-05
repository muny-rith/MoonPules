import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './shared/utils/queryClient';
import { AuthProvider } from './shared/context/AuthContext';
import { ToastProvider } from './shared/context/ToastContext';
import { Layout } from './shared/components/layout/Layout';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { ScrollToTop } from './shared/components/ScrollToTop';
import { PageSuspenseFallback } from './shared/components/PageSuspenseFallback';

// Route-based Code-Splitting: Lazy load pages on demand
const LoginPage = React.lazy(() => import('./features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PostTrackerPage = React.lazy(() => import('./features/postTracker').then((m) => ({ default: m.PostTrackerPage })));
const PlannerPage = React.lazy(() => import('./features/postTracker').then((m) => ({ default: m.PlannerPage })));
const BrandCalendarPage = React.lazy(() => import('./features/calendar').then((m) => ({ default: m.BrandCalendarPage })));
const CreatePostPage = React.lazy(() => import('./features/postTracker/pages/CreatePostPage').then((m) => ({ default: m.CreatePostPage })));
const EditPostPage = React.lazy(() => import('./features/postTracker/pages/EditPostPage').then((m) => ({ default: m.EditPostPage })));
const Product = React.lazy(() => import('./features/product/page/Product').then((m) => ({ default: m.Product })));
const BrandStatsPage = React.lazy(() => import('./features/statistics/pages/BrandStatsPage').then((m) => ({ default: m.BrandStatsPage })));
const BrandDetailPage = React.lazy(() => import('./features/statistics/pages/BrandDetailPage').then((m) => ({ default: m.BrandDetailPage })));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<PageSuspenseFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/tasks" element={<PostTrackerPage />} />
                      <Route path="/planner" element={<PlannerPage />} />
                      <Route path="/calendar" element={<BrandCalendarPage />} />
                      <Route path="/planner/calendar" element={<BrandCalendarPage />} />
                      <Route path="/tasks/create" element={<CreatePostPage />} />
                      <Route path="/tasks/edit/:id" element={<EditPostPage />} />
                      <Route path="/planner/create" element={<CreatePostPage />} />
                      <Route path="/planner/edit/:id" element={<EditPostPage />} />
                      <Route path="/product" element={<Product />} />
                      <Route path="/stats/brands" element={<BrandStatsPage />} />
                      <Route path="/stats/brands/:id" element={<BrandDetailPage />} />
                      <Route path="*" element={<div className="page-placeholder">Page under construction</div>} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;