import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, User, Calendar, Settings, LogOut, Bell, Activity, Video, Menu, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import DoctorAlert from '@/components/DoctorAlert';

const DoctorLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const notifChannel = supabase.channel(`doctor-notifications-${user.id}`)
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            (payload) => {
                refreshNotifications();
                if (payload.new.type === 'smart_request' || payload.new.type === 'consultation_request') {
                    const reqData = payload.new.payload || {}; 
                    setIncomingRequest({
                        id: payload.new.id, 
                        type: payload.new.type === 'smart_request' ? 'smart' : 'direct',
                        requestId: reqData.requestId, 
                        consultationId: reqData.consultationId, 
                        patientId: reqData.patientId, 
                        patientName: reqData.patientName || 'Usuario',
                        reason: payload.new.message,
                        consultation_fee: user.consultation_fee 
                    });
                }
            }
        )
        .subscribe();

    const requestChannel = supabase.channel(`doctor-requests-${user.id}`)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'consultation_requests', filter: `current_doctor_id=eq.${user.id}` },
            async (payload) => {
                if (payload.new.status === 'searching') {
                     const { data: patientData } = await supabase.from('profiles').select('full_name').eq('id', payload.new.patient_id).single();
                     setIncomingRequest({
                        type: 'smart',
                        requestId: payload.new.id,
                        patientId: payload.new.patient_id,
                        patientName: patientData?.full_name || 'Usuario',
                        reason: 'Solicitud Inmediata',
                        consultation_fee: user.consultation_fee
                    });
                } else if (payload.new.status === 'cancelled' || payload.new.status === 'expired') {
                    setIncomingRequest(null);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(requestChannel);
    };
  }, [user, refreshNotifications]);


  const handleAcceptRequest = async () => {
      if (!incomingRequest) return;
      try {
          if (!user.consultation_fee) throw new Error("Configura tus honorarios en Perfil antes de aceptar.");
          
          let patientId = incomingRequest.patientId;
          if (!patientId && incomingRequest.type === 'smart' && incomingRequest.requestId) {
              const { data: reqData } = await supabase.from('consultation_requests').select('patient_id').eq('id', incomingRequest.requestId).single();
              if (reqData) patientId = reqData.patient_id;
          }
          
          if (!patientId) throw new Error("Error: Identificador de usuario no encontrado.");

          if (incomingRequest.type === 'smart') {
              const { error: createError } = await supabase.from('consultations').insert({
                  doctor_id: user.id,
                  patient_id: patientId,
                  status: 'accepted',
                  payment_status: 'unpaid', 
                  consultation_fee: user.consultation_fee,
                  reason: incomingRequest.reason || 'Atención Inmediata',
                  created_at: new Date().toISOString()
              });
              
              if (createError) throw new Error("Error al crear la sesión en base de datos.");

              const { error: updateError } = await supabase.from('consultation_requests').update({ status: 'matched', current_doctor_id: user.id }).eq('id', incomingRequest.requestId);
              if (updateError) throw updateError;
              
              toast({ title: "¡Solicitud Aceptada!", description: "Esperando pago del usuario...", className: "bg-green-600 text-white" });
              setIncomingRequest(null);
              navigate('/doctor');
                 
          } else {
              const { error } = await supabase.from('consultations').update({ status: 'accepted', consultation_fee: user.consultation_fee }).eq('id', incomingRequest.consultationId);
              if (error) throw error;
              toast({ title: "¡Solicitud Aceptada!", description: "Esperando pago del usuario...", className: "bg-green-600 text-white" });
              setIncomingRequest(null);
              navigate('/doctor');
          }
      } catch (e) {
          console.error(e);
          toast({ title: "Error", description: e.message || "No se pudo aceptar la solicitud.", variant: "destructive" });
      }
  };

  const handleRejectRequest = async () => {
      if (!incomingRequest) return;
      try {
           if (incomingRequest.type === 'smart') {
                const { data } = await supabase.from('consultation_requests').select('rejected_doctor_ids').eq('id', incomingRequest.requestId).single();
                const currentRejected = data?.rejected_doctor_ids || [];
                await supabase.from('consultation_requests').update({ current_doctor_id: null, rejected_doctor_ids: [...currentRejected, user.id] }).eq('id', incomingRequest.requestId);
           } else {
               await supabase.from('consultations').update({ status: 'rejected' }).eq('id', incomingRequest.consultationId);
           }
           setIncomingRequest(null);
           toast({ title: "Solicitud rechazada" });
      } catch (e) { console.error(e); }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const navItems = [
    { icon: Home, label: 'Inicio', path: '/professional/dashboard' },
    { icon: Bell, label: 'Notificaciones', path: '/professional/notifications', badge: unreadCount },
    { icon: Video, label: 'Solicitudes', path: '/professional/requests' },
    { icon: Calendar, label: 'Historial', path: '/professional/history' },
    { icon: User, label: 'Perfil', path: '/professional/profile' },
    { icon: Settings, label: 'Configuración', path: '/professional/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      {incomingRequest && (
          <DoctorAlert request={incomingRequest} onAccept={handleAcceptRequest} onReject={handleRejectRequest} />
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex",
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-6 flex justify-between items-center">
           <div className="flex items-center gap-2 text-cyan-500">
               <Activity className="w-8 h-8" />
               <span className="text-2xl font-bold text-white">ArgMed</span>
           </div>
           {/* Close button only for mobile inside drawer */}
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
             <X className="w-6 h-6" />
           </button>
        </div>

        <div className="px-6 pb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Portal Profesional</p>
            <nav className="space-y-1">
                {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                        isActive 
                        ? "bg-cyan-600/10 text-cyan-400 font-bold border border-cyan-600/20" 
                        : "text-gray-400 hover:bg-slate-900 hover:text-white"
                    )}
                    >
                    <div className="flex items-center gap-3">
                        <item.icon className={cn("w-5 h-5", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-white")} />
                        <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/30">
                        {item.badge}
                        </span>
                    )}
                    </Link>
                );
                })}
            </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800 bg-slate-900/30">
           <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10 border border-slate-700">
                <AvatarImage src={user?.photo_url} />
                <AvatarFallback className="bg-slate-800 text-cyan-500">{user?.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-white truncate">{user?.full_name}</p>
                 <p className="text-xs text-cyan-400 truncate">{user?.email}</p>
              </div>
           </div>
           <Button 
             onClick={handleSignOut} 
             variant="ghost" 
             className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
           >
             <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
           </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
           <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsSidebarOpen(true)}
                 className="p-2 -ml-2 rounded-lg text-gray-400 hover:bg-slate-800 hover:text-white transition-colors"
               >
                 <Menu className="w-6 h-6" />
               </button>
               <div className="flex items-center gap-2 text-cyan-500">
                   <Activity className="w-6 h-6" />
                   <span className="font-bold text-white">ArgMed</span>
               </div>
           </div>
           <Link to="/doctor/notifications" className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950 animate-bounce"></span>
              )}
           </Link>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-0 relative">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DoctorLayout;