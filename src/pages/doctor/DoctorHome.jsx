import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, Users, Calendar, DollarSign, Clock, 
  Video, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const StatCard = ({ icon: Icon, label, value, trend, color }) => {
  const colorMap = {
    'bg-cyan-500': { gradient: 'from-cyan-500/10 to-cyan-600/10', border: 'border-cyan-500/30', iconBg: 'bg-cyan-500/10', iconText: 'text-cyan-400', shadow: 'hover:shadow-cyan-500/10' },
    'bg-purple-500': { gradient: 'from-purple-500/10 to-purple-600/10', border: 'border-purple-500/30', iconBg: 'bg-purple-500/10', iconText: 'text-purple-400', shadow: 'hover:shadow-purple-500/10' },
    'bg-green-500': { gradient: 'from-emerald-500/10 to-green-600/10', border: 'border-emerald-500/30', iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400', shadow: 'hover:shadow-emerald-500/10' },
    'bg-orange-500': { gradient: 'from-orange-500/10 to-orange-600/10', border: 'border-orange-500/30', iconBg: 'bg-orange-500/10', iconText: 'text-orange-400', shadow: 'hover:shadow-orange-500/10' },
  };
  const colors = colorMap[color] || colorMap['bg-cyan-500'];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`group relative bg-gradient-to-br ${colors.gradient} border ${colors.border} p-6 rounded-2xl backdrop-blur-sm hover:border-opacity-50 transition-all hover:shadow-xl ${colors.shadow}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors.iconBg} group-hover:bg-opacity-30 transition-colors`}>
          <Icon className={`w-6 h-6 ${colors.iconText}`} />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
    </motion.div>
  );
};

const DoctorHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeConsultations: 0,
    totalUsers: 0,
    todayEarnings: 0,
    pendingRequests: 0
  });
  const [activeConsultations, setActiveConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayISO = today.toISOString();

        // Get active consultations
        const { data: activeData, error: activeError } = await supabase
          .from('consultations')
          .select('*')
          .eq('doctor_id', user.id)
          .in('status', ['accepted', 'paid', 'in_call'])
          .order('created_at', { ascending: false });

        if (activeError) throw activeError;

        // Get patient data for each consultation
        const consultationsWithPatients = await Promise.all(
          (activeData || []).map(async (consultation) => {
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

        setActiveConsultations(consultationsWithPatients);

        const { data: allCons } = await supabase
            .from('consultations')
            .select('patient_id')
            .eq('doctor_id', user.id);

        const uniqueUsers = new Set(allCons?.map(c => c.patient_id)).size;

        const { data: earningsData } = await supabase
            .from('consultations')
            .select('consultation_fee')
            .eq('doctor_id', user.id)
            .eq('payment_status', 'paid')
            .gte('created_at', todayISO);

        const todayEarnings = earningsData?.reduce((sum, item) => sum + (Number(item.consultation_fee) || 0), 0) || 0;

        const { count: requestsCount } = await supabase
            .from('consultation_requests')
            .select('*', { count: 'exact', head: true })
            .eq('current_doctor_id', user.id)
            .eq('status', 'searching');

        setStats({
            activeConsultations: activeData?.length || 0,
            totalUsers: uniqueUsers,
            todayEarnings: todayEarnings,
            pendingRequests: requestsCount || 0
        });

      } catch (e) {
        console.error("Error fetching dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel('professional-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `doctor_id=eq.${user.id}` },
        () => {
             fetchData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleEnterRoom = (cons) => {
      navigate(`/professional/video-call-room/${cons.id}`);
  };

  if (loading) {
      return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">Hola, {user?.full_name?.split(' ')[0]}</h1>
            <p className="text-gray-300">Resumen de tu actividad hoy.</p>
          </div>
          <Button
            onClick={() => navigate('/professional/requests')}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20"
          >
            <Clock className="w-4 h-4 mr-2" /> Ver Solicitudes Pendientes
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Activity} label="Consultas Activas" value={stats.activeConsultations} color="bg-cyan-500" />
          <StatCard icon={Users} label="Usuarios Totales" value={stats.totalUsers} color="bg-purple-500" />
          <StatCard icon={DollarSign} label="Ganancias Hoy" value={`$${stats.todayEarnings}`} color="bg-green-500" />
          <StatCard icon={Calendar} label="Solicitudes" value={stats.pendingRequests} color="bg-orange-500" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Mis Consultas Activas</h2>
            </div>

            {activeConsultations.length === 0 ? (
                 <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 border border-cyan-500/20 rounded-2xl p-10 text-center backdrop-blur-sm">
                     <div className="inline-block p-4 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 mb-4">
                         <Activity className="w-8 h-8 text-cyan-400/60" />
                     </div>
                     <h3 className="text-lg font-medium text-white mb-2">No hay consultas activas</h3>
                     <p className="text-gray-300 text-sm">Tus consultas aceptadas o en curso aparecerán aquí.</p>
                 </div>
            ) : (
                <div className="space-y-4">
                  {activeConsultations.map((cons) => (
                    <motion.div
                      key={cons.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group relative bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 border border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/10 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden border-2 border-cyan-500/30">
                              {cons.users?.photo_url ? (
                                <img src={cons.users.photo_url} className="w-full h-full object-cover" alt="Patient" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-cyan-400/60">
                                  <span className="text-lg font-bold">{cons.users?.full_name?.[0]}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg mb-1">{cons.users?.full_name || 'Usuario'}</h4>
                            <div className="flex items-center gap-2 text-sm">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                cons.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              }`}>
                                {cons.payment_status === 'paid' ? 'PAGADO' : 'PAGO PENDIENTE'}
                              </span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-300">{new Date(cons.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleEnterRoom(cons)}
                          className={cn(
                            "font-bold shadow-lg",
                            cons.payment_status === 'paid'
                              ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20"
                              : "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-gray-300"
                          )}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          {cons.payment_status === 'paid' ? 'Ingresar' : 'Esperando Pago'}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
            )}
          </div>

          <div className="space-y-6">
             <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-sm hover:border-cyan-500/40 transition-all">
                <h3 className="font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-cyan-400" />
                    Estado del Sistema
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                        <span className="text-gray-300 font-medium">Estado</span>
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> Online</span>
                    </div>
                     <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                        <span className="text-gray-300 font-medium">Visibilidad</span>
                        <span className="text-white font-semibold">Pública</span>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DoctorHome;