import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Inbox, User, Check, X, Clock, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const IncomingRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Get patient data for each request
    const requestsWithPatients = await Promise.all(
      (data || []).map(async (request) => {
        const { data: patientData } = await supabase
          .from('users')
          .select('first_name, last_name, photo_url')
          .eq('id', request.patient_id)
          .maybeSingle();

        return {
          ...request,
          users: patientData ? {
            full_name: `${patientData.first_name} ${patientData.last_name}`,
            photo_url: patientData.photo_url
          } : null
        };
      })
    );

    setRequests(requestsWithPatients || []);
    setLoading(false);
  };

  useEffect(() => {
    if(!user) return;
    fetchRequests();

    const channel = supabase
      .channel('incoming-requests-page')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'consultations',
        filter: `professional_id=eq.${user.id}`
      }, (payload) => {
          fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleResponse = async (id, status) => {
    setRequests(prev => prev.filter(r => r.id !== id));

    const { error } = await supabase
      .from('consultations')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la solicitud.", variant: "destructive" });
      fetchRequests();
    } else {
      toast({ 
        title: status === 'accepted' ? "Solicitud Aceptada" : "Solicitud Rechazada", 
        description: status === 'accepted' ? "El usuario será notificado para realizar el pago." : "La solicitud ha sido cancelada."
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Solicitudes Entrantes
          </h1>
          <Button variant="ghost" size="sm" onClick={fetchRequests} className="text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {loading && requests.length === 0 ? (
          <div className="text-center text-white py-10">Cargando solicitudes...</div>
        ) : requests.length === 0 ? (
          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-12 text-center">
            <Inbox className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hay solicitudes pendientes en este momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req, index) => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-6 flex flex-col md:flex-row items-start justify-between gap-6"
              >
                <div className="flex items-start gap-4 w-full md:w-auto">
                   <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {req.users?.photo_url ? (
                        <img src={req.users.photo_url} alt="Patient" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-white" />
                      )}
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-white">{req.users?.full_name || 'Usuario'}</h3>
                     
                     <div className="flex items-center gap-2 text-sm text-cyan-400 mb-2">
                        <span className="font-semibold">Honorarios: ${req.consultation_fee}</span>
                     </div>

                     {req.reason && (
                       <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 mb-2 max-w-md">
                         <p className="text-gray-300 text-sm flex gap-2">
                           <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                           <span className="italic">"{req.reason}"</span>
                         </p>
                       </div>
                     )}
                     
                     <div className="flex items-center gap-2 text-xs text-gray-500">
                       <Clock className="w-3 h-3" />
                       <span>Recibido: {new Date(req.created_at).toLocaleTimeString()}</span>
                     </div>
                   </div>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto md:self-center">
                  <Button 
                    onClick={() => handleResponse(req.id, 'rejected')} 
                    variant="outline" 
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 flex-1 md:flex-none"
                  >
                    <X className="w-4 h-4 mr-2" /> Rechazar
                  </Button>
                  <Button 
                    onClick={() => handleResponse(req.id, 'accepted')} 
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                  >
                    <Check className="w-4 h-4 mr-2" /> Aceptar
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default IncomingRequests;