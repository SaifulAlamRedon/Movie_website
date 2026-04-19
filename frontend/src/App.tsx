import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

// Lazy-load pages for code splitting
const HomePage    = lazy(() => import('./pages/HomePage'));
const MoviePage   = lazy(() => import('./pages/MoviePage'));
const BrowsePage  = lazy(() => import('./pages/BrowsePage'));
const AdminPage   = lazy(() => import('./pages/AdminPage'));
const AdminAuthPage = lazy(() => import('./pages/AdminAuthPage'));
const NotFound    = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/browse"    element={<BrowsePage />} />
          <Route path="/movie/:id" element={<MoviePage />} />
          <Route path="/admin-auth" element={<AdminAuthPage />} />
          <Route
            path="/admin"
            element={(
              <ProtectedAdminRoute>
                <AdminPage />
              </ProtectedAdminRoute>
            )}
          />
          <Route path="*"          element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}
