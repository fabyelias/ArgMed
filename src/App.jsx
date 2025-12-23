import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import PatientDashboard from '@/pages/patient/PatientDashboard';
import ProfessionalDashboard from '@/pages/professional/ProfessionalDashboard';
import ProfessionalOnboarding from '@/pages/professional/ProfessionalOnboarding';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ManageProfessionals from '@/pages/admin/ManageProfessionals';
import ManagePatients from '@/pages/admin/ManagePatients';
import ManageSecurity from '@/pages/admin/ManageSecurity';
import AdminLayout from '@/components/layouts/AdminLayout';

import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientPaymentAlert from '@/components/PatientPaymentAlert';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';

import Payment from '@/pages/patient/Payment';
import Consultation from '@/pages/patient/Consultation';
import FindProfessional from '@/pages/patient/FindProfessional';
import ConfirmConsultation from '@/pages/patient/ConfirmConsultation';
import { ConsultationProvider } from '@/contexts/ConsultationContext';
import PaymentStatus from '@/pages/patient/PaymentStatus';
import ProfessionalVerification from '@/pages/professional/ProfessionalVerification';
import MPCallback from '@/pages/auth/MPCallback';

import LegalDashboard from '@/pages/legal/LegalDashboard';
import LegalLayout from '@/components/layouts/LegalLayout';

import PatientVideoCallRoom from '@/pages/patient/VideoCallRoom';
import ProfessionalVideoCallRoom from '@/pages/professional/VideoCallRoom';

const RedirectToVideoRoom = ({ role }) => {
  const { id } = useParams();
  if (!id || id === ':id' || id === 'undefined') {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }
  return <Navigate to={`/${role}/video-call-room/${id}`} replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="min-h-screen">
              <PatientPaymentAlert />
              
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Auth Callback for Mercado Pago - Supports both standard and API paths */}
                <Route path="/auth/callback" element={<MPCallback />} />
                <Route path="/api/auth/callback" element={<MPCallback />} />
                
                {/* Patient Routes */}
                <Route path="/patient/payment-status" element={<ProtectedRoute role="patient"><PaymentStatus /></ProtectedRoute>} />
                <Route path="/patient/video-permissions/:id" element={<RedirectToVideoRoom role="patient" />} />
                <Route path="/patient/video-call-room/:id" element={<ProtectedRoute role="patient"><PatientVideoCallRoom /></ProtectedRoute>} />
                <Route path="/patient/video-call-active/:id" element={<RedirectToVideoRoom role="patient" />} />

                <Route path="/patient/confirm-consultation/:consultationId" element={<ProtectedRoute role="patient"><ConsultationProvider><ConfirmConsultation /></ConsultationProvider></ProtectedRoute>} />
                <Route path="/patient/payment" element={<ProtectedRoute role="patient"><ConsultationProvider><Payment /></ConsultationProvider></ProtectedRoute>} />
                <Route path="/patient/consultation/:id" element={<ProtectedRoute role="patient"><Consultation /></ProtectedRoute>} />
                <Route path="/patient/find-professional" element={<ProtectedRoute role="patient"><FindProfessional /></ProtectedRoute>} />
                <Route path="/patient/*" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />

                {/* Professional Routes */}
                <Route path="/professional/onboarding" element={<ProtectedRoute role="doctor"><ProfessionalOnboarding /></ProtectedRoute>} />
                
                <Route path="/doctor/*" element={<Navigate to="/professional/dashboard" replace />} /> 
                
                <Route path="/professional/verification" element={<ProtectedRoute role="doctor"><ProfessionalVerification /></ProtectedRoute>} />
                <Route path="/professional/video-permissions/:id" element={<RedirectToVideoRoom role="doctor" />} />
                <Route path="/professional/video-call-room/:id" element={<ProtectedRoute role="doctor"><ProfessionalVideoCallRoom /></ProtectedRoute>} />
                <Route path="/professional/video-call-active/:id" element={<RedirectToVideoRoom role="doctor" />} />
                <Route path="/professional/*" element={<ProtectedRoute role="doctor"><ProfessionalDashboard /></ProtectedRoute>} />

                {/* Legal Routes */}
                <Route path="/legal/dashboard" element={<ProtectedRoute role="legal_admin"><LegalLayout><LegalDashboard /></LegalLayout></ProtectedRoute>} />
                <Route path="/legal/*" element={<ProtectedRoute role="legal_admin"><LegalLayout><LegalDashboard /></LegalLayout></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="professionals" element={<ManageProfessionals />} />
                  <Route path="patients" element={<ManagePatients />} />
                  <Route path="security" element={<ManageSecurity />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;