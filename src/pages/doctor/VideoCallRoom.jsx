import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Home, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import DoctorActiveVideoCall from './ActiveVideoCall';

const DoctorVideoCallRoom = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [state, setState] = useState({
    status: 'loading', 
    consultation: null,
    errorMessage: null
  });

  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    const initRoom = async () => {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!id || !uuidRegex.test(id)) throw new Error("ID inválido.");

        const { data, error } = await supabase
          .from('consultations')
          .select('*, patients:patient_id(full_name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Consulta no encontrada.");

        if (data.doctor_id !== user.id) throw new Error("No autorizado.");

        // Check for completed status
        if (['completed', 'finished', 'cancelled'].includes(data.status)) {
            navigate('/doctor'); // Auto-redirect
            return;
        }

        if (isMounted.current) {
          setState({ status: 'ready', consultation: data, errorMessage: null });
        }

      } catch (error) {
        if (isMounted.current) {
          setState({ status: 'error', consultation: null, errorMessage: error.message });
        }
      }
    };

    initRoom();
  }, [id, user, loading, navigate]);

  if (loading || state.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mb-4" />
        <h2 className="text-xl font-semibold">Conectando con el paciente...</h2>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 text-white p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">No se pudo acceder</h1>
        <p className="text-slate-400 mb-6">{state.errorMessage}</p>
        <Button onClick={() => navigate('/doctor')} className="bg-slate-800 text-white">
          <Home className="w-4 h-4 mr-2" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <DoctorActiveVideoCall 
      consultationId={id} 
      patientName={state.consultation?.patients?.full_name}
    />
  );
};

export default DoctorVideoCallRoom;