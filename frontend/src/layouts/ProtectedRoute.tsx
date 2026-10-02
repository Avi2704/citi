import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
  const { loading, profile } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(profile.role)) return <Navigate to="/login" replace />;

  return <Outlet />;
};
