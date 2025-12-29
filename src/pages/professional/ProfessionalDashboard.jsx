import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import DoctorHome from '@/pages/doctor/DoctorHome';
import ProfessionalProfile from '@/pages/professional/ProfessionalProfile';
import Requests from '@/pages/doctor/Requests';
import ConsultationHistory from '@/pages/doctor/ConsultationHistory';
import DoctorSettings from '@/pages/doctor/DoctorSettings';
import Notifications from '@/pages/doctor/Notifications';
import ActiveConsultation from '@/pages/doctor/ActiveConsultation';

const ProfessionalDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // Guard: Ensure professional is approved
  useEffect(() => {
    const checkApproval = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('professionals')
          .select('verification_status')
          .eq('id', user.id)
          .single();
        
        // If status is NOT approved (e.g. pending, submitted, rejected), redirect to Onboarding Status Page
        if (data?.verification_status !== 'approved') {
          navigate('/professional/onboarding', { replace: true });
        }
      } catch (e) {
        console.error("Dashboard check error:", e);
      } finally {
        setChecking(false);
      }
    };

    checkApproval();
  }, [user, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <DoctorLayout>
      <Routes>
        <Route index element={<DoctorHome />} />
        <Route path="dashboard" element={<DoctorHome />} />
        <Route path="profile" element={<ProfessionalProfile />} />
        <Route path="requests" element={<Requests />} />
        <Route path="history" element={<ConsultationHistory />} />
        <Route path="settings" element={<DoctorSettings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="consultation/:id" element={<ActiveConsultation />} />
        <Route path="*" element={<Navigate to="/professional/dashboard" replace />} />
      </Routes>
    </DoctorLayout>
  );
};

export default ProfessionalDashboard;