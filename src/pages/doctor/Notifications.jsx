import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, Video, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    // ONLY fetch unread notifications
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
      () => {
        fetchNotifications();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleMarkAsRead = async (notificationId) => {
      // Mark as read. The "used" status will be set when the consultation is completed.
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationClick = async (notification) => {
    // 1. Mark as read immediately
    await handleMarkAsRead(notification.id);

    // 2. Action based on type
    if (notification.type === 'payment_received' && notification.payload?.consultationId) {
      navigate(`/doctor/video-call-room/${notification.payload.consultationId}`);
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications([]); // Clear list
      toast({ title: "Todas marcadas como leídas" });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Notificaciones</h1>
            <p className="text-gray-400">Gestiona tus avisos y alertas</p>
          </div>
          {notifications.length > 0 && (
            <Button onClick={markAllAsRead} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Limpiar todo
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Cargando...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No tienes notificaciones nuevas</h3>
            <p className="text-gray-400">Estás al día con tus actividades.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => handleNotificationClick(item)}
                className="relative group p-4 rounded-xl border transition-all duration-200 bg-slate-800/80 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:border-cyan-500/50 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${item.type === 'payment_received' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}
                  `}>
                     {item.type === 'payment_received' ? <Video className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold mb-1 text-white">
                        {item.title}
                      </h4>
                      <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap ml-2">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">
                      {item.message}
                    </p>
                  </div>
                </div>
                
                {/* Green Dot always visible because we only fetch unread items */}
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Notifications;