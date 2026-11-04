import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('moonpulse.auth.token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children || <Outlet />;
};
