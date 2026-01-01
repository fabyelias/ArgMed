import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute check:', { loading, user: user?.role, requiredRole: role });

  if (loading) {
    console.log('ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  if (role && user.role !== role) {
    console.log(`ProtectedRoute: Role mismatch. User has "${user.role}" but route requires "${role}". Redirecting to /`);
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: Access granted');
  return children;
};

export default ProtectedRoute;