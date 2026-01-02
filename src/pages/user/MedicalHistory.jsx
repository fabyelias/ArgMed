import React, { useEffect, useState } from 'react';
import { FileText, Calendar, User, Lock, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const MedicalHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) return;

      try {
        // Fetch medical records
        const { data: medicalRecordsData, error } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get professional data for each record
        const recordsWithProfessionals = await Promise.all(
          (medicalRecordsData || []).map(async (record) => {
            const { data: professionalData } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', record.doctor_id)
              .maybeSingle();

            return {
              ...record,
              professional: professionalData ? {
                full_name: `${professionalData.first_name} ${professionalData.last_name}`
              } : null
            };
          })
        );

        setRecords(recordsWithProfessionals);
      } catch (err) {
        console.error("Error fetching medical records:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();

    const channel = supabase
      .channel('user-medical-records-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_records', filter: `patient_id=eq.${user.id}` },
        fetchRecords
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [user]);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button
          onClick={() => navigate('/user')}
          variant="ghost"
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Bitácora de Sesiones
          </h1>
          <div className="flex items-center gap-2 text-gray-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">Registro Privado</span>
          </div>
        </div>

        {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
        ) : records.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Bitácora Vacía</h3>
            <p className="text-gray-400">El resumen de tus videollamadas aparecerá aquí una vez que el especialista lo registre.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {records.map((record, index) => (
              <div
                key={record.id}
                className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Esp. {record.professional?.full_name || 'Especialista'}</h3>
                      <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider">Sesión de Comunicación</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-mono">
                        {record.created_at ? format(new Date(record.created_at), "d 'de' MMMM, yyyy", { locale: es }) : 'Fecha desconocida'}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {record.diagnosis && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observaciones</p>
                        </div>
                        <p className="text-white text-lg font-medium pl-4 border-l-2 border-slate-800">{record.diagnosis}</p>
                      </div>
                  )}
                  
                  {record.prescription && (
                       <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Indicaciones / Pasos a seguir</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-gray-300 font-mono text-sm whitespace-pre-wrap">
                            {record.prescription}
                        </div>
                      </div>
                  )}

                  {record.professional_notes && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notas Técnicas</p>
                        </div>
                        <p className="text-gray-400 text-sm pl-4 border-l-2 border-slate-800 leading-relaxed">{record.professional_notes}</p>
                      </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalHistory;