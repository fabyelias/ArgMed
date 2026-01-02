import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Inbox, User, Check, X, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('doctor_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get patient data for each consultation
      const requestsWithPatients = await Promise.all(
        (data || []).map(async (consultation) => {
          const { data: patientData } = await supabase
            .from('users')
            .select('first_name, last_name, photo_url')
            .eq('id', consultation.patient_id)
            .single();

          return {
            ...consultation,
            profiles: patientData ? {
              full_name: `${patientData.first_name} ${patientData.last_name}`,
              photo_url: patientData.photo_url
            } : null
          };
        })
      );

      setRequests(requestsWithPatients);
      setLoading(false);
    };

    fetchRequests();

    // Subscribe to new requests
    const channel = supabase
      .channel('requests-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleResponse = async (id, status) => {
    const { error } = await supabase
      .from('consultations')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la solicitud.", variant: "destructive" });
    } else {
      toast({ title: status === 'accepted' ? "Aceptado" : "Rechazado", description: "Solicitud actualizada." });
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
          Solicitudes Entrantes
        </h1>

        {loading ? (
          <div className="text-center text-white">Cargando...</div>
        ) : requests.length === 0 ? (
          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-12 text-center">
            <Inbox className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hay solicitudes pendientes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-cyan-400" />
                   </div>
                   <div>
                     <h3 className="font-bold text-white">{req.profiles?.full_name || 'Usuario'}</h3>
                     <div className="flex items-center gap-2 text-sm text-gray-400">
                       <Clock className="w-3 h-3" />
                       <span>Hace unos momentos</span>
                     </div>
                   </div>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                  <Button onClick={() => handleResponse(req.id, 'rejected')} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 flex-1">
                    <X className="w-4 h-4 mr-2" /> Rechazar
                  </Button>
                  <Button onClick={() => handleResponse(req.id, 'accepted')} className="bg-green-600 hover:bg-green-700 flex-1">
                    <Check className="w-4 h-4 mr-2" /> Aceptar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Requests;