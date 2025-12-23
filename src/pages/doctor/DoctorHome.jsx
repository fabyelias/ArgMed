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

const StatCard = ({ icon: Icon, label, value, trend, color }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
    <p className="text-gray-400 text-sm">{label}</p>
  </motion.div>
);

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

        const { data: activeData, error: activeError } = await supabase
          .from('consultations')
          .select('*, user:user_id(full_name, photo_url)')
          .eq('professional_id', user.id)
          .in('status', ['accepted', 'paid', 'in_call']) 
          .order('created_at', { ascending: false });
          
        if (activeError) throw activeError;
        setActiveConsultations(activeData || []);
        
        const { data: allCons } = await supabase
            .from('consultations')
            .select('user_id')
            .eq('professional_id', user.id);
        
        const uniqueUsers = new Set(allCons?.map(c => c.user_id)).size;

        const { data: earningsData } = await supabase
            .from('consultations')
            .select('consultation_fee')
            .eq('professional_id', user.id)
            .eq('payment_status', 'paid')
            .gte('created_at', todayISO); 

        const todayEarnings = earningsData?.reduce((sum, item) => sum + (Number(item.consultation_fee) || 0), 0) || 0;

        const { count: requestsCount } = await supabase
            .from('consultation_requests')
            .select('*', { count: 'exact', head: true })
            .eq('current_professional_id', user.id)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `professional_id=eq.${user.id}` }, 
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
            <h1 className="text-3xl font-bold text-white mb-2">Hola, {user?.full_name?.split(' ')[0]}</h1>
            <p className="text-gray-400">Resumen de tu actividad hoy.</p>
          </div>
          <Button 
            onClick={() => navigate('/professional/requests')}
            className="bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-900/20"
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
              <h2 className="text-xl font-bold text-white">Mis Consultas Activas</h2>
            </div>
            
            {activeConsultations.length === 0 ? (
                 <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center">
                     <div className="inline-block p-4 rounded-full bg-slate-800 mb-4">
                         <Activity className="w-8 h-8 text-gray-500" />
                     </div>
                     <h3 className="text-lg font-medium text-white mb-2">No hay consultas activas</h3>
                     <p className="text-gray-400 text-sm">Tus consultas aceptadas o en curso aparecerán aquí.</p>
                 </div>
            ) : (
                <div className="space-y-4">
                  {activeConsultations.map((cons) => (
                    <motion.div 
                      key={cons.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden">
                            {cons.user?.photo_url ? (
                                <img src={cons.user.photo_url} className="w-full h-full object-cover" alt="Patient" />
                            ) : (
                                <span className="text-lg font-bold text-gray-500">{cons.user?.full_name?.[0]}</span>
                            )}
                         </div>
                         <div>
                            <h4 className="font-bold text-white">{cons.user?.full_name || 'Usuario'}</h4>
                            <div className="flex items-center gap-2 text-sm">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    cons.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                    {cons.payment_status === 'paid' ? 'PAGADO' : 'PAGO PENDIENTE'}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-400">{new Date(cons.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                         </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleEnterRoom(cons)}
                        className={cn(
                            "font-bold",
                            cons.payment_status === 'paid' 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "bg-slate-800 hover:bg-slate-700 text-gray-300"
                        )}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        {cons.payment_status === 'paid' ? 'Ingresar' : 'Esperando Pago'}
                      </Button>
                    </motion.div>
                  ))}
                </div>
            )}
          </div>

          <div className="space-y-6">
             <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-cyan-400" />
                    Estado del Sistema
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Estado</span>
                        <span className="text-green-400 flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> Online</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Visibilidad</span>
                        <span className="text-white">Pública</span>
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