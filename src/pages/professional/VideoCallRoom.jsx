import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Home } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ActiveVideoCall from '@/pages/doctor/ActiveVideoCall';

const ProfessionalVideoCallRoom = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState(null);
  const [consultation, setConsultation] = useState(null);

  useEffect(() => {
    const validateAccess = async () => {
      if (loading) return;

      if (!user) {
        navigate('/auth');
        return;
      }

      // 1. Validate ID Format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        setError(`ID de consulta inválido.`);
        setIsValidating(false);
        return;
      }

      try {
        // 2. Fetch consultation
        const { data, error } = await supabase
          .from('consultations')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(`No se encontró la consulta.`);
        }

        // 3. Fetch patient info separately
        const { data: patientData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', data.patient_id)
          .single();

        // Attach patient info to consultation
        data.patient = patientData ? {
          full_name: `${patientData.first_name} ${patientData.last_name}`
        } : { full_name: 'Paciente' };

        // 3. Ownership Check
        if (data.doctor_id !== user.id) {
          throw new Error("No tienes permiso para acceder a esta sala.");
        }

        // 4. Status Check - Block Completed
        if (['completed', 'finished', 'cancelled', 'rejected'].includes(data.status)) {
            navigate('/professional'); // Auto-redirect for professional feel
            return;
        }

        // 5. Payment Check
        if (data.payment_status !== 'paid') {
            console.log("Unpaid consultation access attempt by doctor.");
            throw new Error("La consulta aún no ha sido pagada por el paciente.");
        }

        setConsultation(data);
        setError(null);
      } catch (err) {
        console.error("Access validation failed:", err);
        setError(err.message);
      } finally {
        setIsValidating(false);
      }
    };

    validateAccess();
  }, [id, user, loading, navigate]);

  if (loading || isValidating) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mb-4" />
        <p className="text-lg font-medium">Conectando de forma segura...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-4 text-center">
        <div className="bg-red-500/20 p-6 rounded-full mb-6">
             <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-gray-400 mb-6 max-w-md">{error}</p>
        <Button onClick={() => navigate('/professional')} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
          <Home className="w-4 h-4 mr-2" /> Volver al Inicio
        </Button>
      </div>
    );
  }

  console.log("[ProfessionalVideoCallRoom] Rendering ActiveVideoCall with:", {
    consultationId: id,
    patientName: consultation?.patient?.full_name,
    consultationData: consultation
  });

  return <ActiveVideoCall consultationId={id} patientName={consultation?.patient?.full_name} />;
};

export default ProfessionalVideoCallRoom;
