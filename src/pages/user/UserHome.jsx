import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CreditCard, Video, AlertCircle, CheckCircle2, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import WelcomeMessage from '@/components/WelcomeMessage';
import UserPaymentButton from '@/components/UserPaymentButton';

const UserHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConsultations();
    subscribeToConsultations();
  }, [user]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          professional:professional_id (
            full_name,
            photo_url,
            professionals_data:professionals(
              specialization
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsultations(data || []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConsultations = () => {
    const channel = supabase
      .channel(`user-consultations-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'consultations',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchConsultations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const getStatusConfig = (consultation) => {
    if (consultation.status === 'accepted' && consultation.payment_status === 'pending') {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        text: 'Pago Pendiente',
        color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        action: 'payment'
      };
    }
    
    if (consultation.status === 'accepted' && consultation.payment_status === 'paid') {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        text: 'Confirmada - Listo para consulta',
        color: 'bg-green-500/10 text-green-400 border-green-500/30',
        action: 'join'
      };
    }

    if (consultation.status === 'pending') {
      return {
        icon: <Clock className="w-5 h-5 text-blue-500" />,
        text: 'Esperando respuesta del profesional',
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        action: null
      };
    }

    return {
      icon: <Clock className="w-5 h-5 text-gray-500" />,
      text: consultation.status,
      color: 'bg-slate-800 text-gray-400 border-slate-700',
      action: null
    };
  };

  const handlePaymentSuccess = () => {
    fetchConsultations();
  };

  const getSpecialization = (prof) => {
      if (Array.isArray(prof?.professionals_data) && prof.professionals_data.length > 0) {
          return prof.professionals_data[0].specialization;
      }
      return prof?.professionals_data?.specialization || 'Médico General';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">
      <WelcomeMessage />

      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6">Mis Consultas</h2>
        
        {consultations.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">No tienes consultas programadas.</p>
            <Button 
              onClick={() => navigate('/user/find-professional')}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Buscar Profesional
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => {
              const config = getStatusConfig(consultation);
              
              return (
                <div
                  key={consultation.id}
                  className="group relative bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 border border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10 backdrop-blur-sm"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden border-2 border-cyan-500/30">
                          {consultation.professional?.photo_url ? (
                            <img
                              src={consultation.professional.photo_url}
                              alt="Professional"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-cyan-400/60">
                              <User className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white">
                          {consultation.professional?.full_name || 'Profesional'}
                        </h3>
                        <p className="text-cyan-400 text-sm mb-2">
                          {getSpecialization(consultation.professional)}
                        </p>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(consultation.created_at).toLocaleString()}</span>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${config.color}`}>
                          {config.icon}
                          <span>{config.text}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:min-w-[200px]">
                      <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4 mb-2">
                        <div className="text-xs text-emerald-400/70 font-semibold uppercase tracking-wider mb-1">Tarifa</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                          ${consultation.consultation_fee}
                        </div>
                      </div>

                      {config.action === 'payment' && (
                        <UserPaymentButton
                          consultation={consultation}
                          doctor={consultation.professional}
                          onPaymentSuccess={handlePaymentSuccess}
                        />
                      )}

                      {config.action === 'join' && (
                        <Button 
                          onClick={() => navigate(`/user/video-call-room/${consultation.id}`)}
                          className="bg-green-600 hover:bg-green-700 text-white w-full"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Ingresar a Consulta
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHome;