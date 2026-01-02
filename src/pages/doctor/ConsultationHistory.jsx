import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, User, Star, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const ConsultationHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', user.id)
      .in('status', ['completed', 'finished', 'reviewed'])
      .order('ended_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
      setLoading(false);
      return;
    }

    // Get patient data for each consultation
    const consultationsWithPatients = await Promise.all(
      (data || []).map(async (consultation) => {
        const { data: patientData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', consultation.patient_id)
          .single();

        return {
          ...consultation,
          users: patientData ? {
            full_name: `${patientData.first_name} ${patientData.last_name}`
          } : null
        };
      })
    );

    setHistory(consultationsWithPatients);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
    
    const channel = supabase
        .channel('professional-history-live-page')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `doctor_id=eq.${user.id}`
        }, () => {
          fetchHistory();
        })
        .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const formatDuration = (minutes) => {
      if(!minutes) return "0 min";
      return `${minutes} min`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
          Historial de Consultas
        </h1>

        {loading ? (
           <div className="text-center text-gray-500 py-12">Cargando historial...</div>
        ) : history.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hay historial de consultas finalizadas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((consultation, index) => (
              <motion.div
                key={consultation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{consultation.users?.full_name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                         <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/30 flex items-center gap-1">
                             <CheckCircle className="w-3 h-3" /> Asistida
                         </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(consultation.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(consultation.duration_minutes)}</span>
                        </div>
                        <span className="text-cyan-400 font-medium">${consultation.consultation_fee}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ConsultationHistory;