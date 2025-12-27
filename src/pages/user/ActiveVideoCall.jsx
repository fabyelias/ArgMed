import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, User, 
  MessageCircle, Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import ChatPanel from '@/components/ChatPanel';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const PatientActiveVideoCall = ({ consultationId, doctorName }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const { localStream, remoteStream, connectionStatus, isMuted, isVideoOff, toggleMute, toggleVideo } = useWebRTC(consultationId, user?.id, false);
  const { messages, sendMessage, sending } = useChat(consultationId, user?.id);

  // SYNC TIMER & STATUS LISTENER
  useEffect(() => {
    let interval;

    // 1. Listen for status updates immediately
    const channel = supabase.channel(`consultation-room-${consultationId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `id=eq.${consultationId}` }, 
        (payload) => {
            // Handle Timer Start (if doctor just started it)
            if (payload.new.started_at && !duration) {
                 const start = new Date(payload.new.started_at).getTime();
                 const now = Date.now();
                 const seconds = Math.floor((now - start) / 1000);
                 setDuration(seconds > 0 ? seconds : 0);
            }

            // Handle End Call
            if (payload.new.status === 'completed' || payload.new.status === 'finished') {
                toast({ title: "Consulta Finalizada", description: "La llamada ha terminado." });
                navigate('/user');
            }
        })
        .subscribe();

    // 2. Initial Timer Sync
    const syncTimer = async () => {
        const { data } = await supabase.from('consultations').select('started_at, status').eq('id', consultationId).single();
        
        if (data?.status === 'completed') {
            navigate('/user');
            return;
        }

        if (data?.started_at) {
             const start = new Date(data.started_at).getTime();
             
             // Set immediate value
             const now = Date.now();
             const diff = Math.floor((now - start) / 1000);
             setDuration(diff > 0 ? diff : 0);

             // Start interval
             interval = setInterval(() => {
                 const currentNow = Date.now();
                 const seconds = Math.floor((currentNow - start) / 1000);
                 setDuration(seconds > 0 ? seconds : 0);
             }, 1000);
        }
    };

    syncTimer();

    return () => {
        if (interval) clearInterval(interval);
        supabase.removeChannel(channel);
    };
  }, [consultationId, navigate]);

  // CHAT NOTIFICATIONS
  useEffect(() => {
      if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (!chatOpen && lastMsg.sender_id !== user.id) {
              setUnreadMessages(prev => prev + 1);
              toast({ title: `Nuevo mensaje del Dr.`, description: lastMsg.message, className: "bg-slate-800 text-white border-cyan-500" });
          }
      }
  }, [messages]);

  useEffect(() => {
      if (chatOpen) setUnreadMessages(0);
  }, [chatOpen]);

  // STREAM BINDING
  useEffect(() => { 
      if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream; 
      }
  }, [localStream]);

  useEffect(() => { 
      if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream; 
      }
  }, [remoteStream]);

  const handleEndCall = async () => {
      if(!window.confirm("¿Finalizar consulta?")) return;
      try {
        await supabase.from('consultations').update({ status: 'completed', ended_at: new Date().toISOString(), duration }).eq('id', consultationId);
        navigate('/user');
      } catch (e) {
        console.error("Error ending call:", e);
        navigate('/user');
      }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden relative">
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} messages={messages} onSendMessage={(txt) => sendMessage(txt, user?.full_name || 'Usuario')} currentUserId={user?.id} sending={sending} />

      <div className="flex-1 relative flex flex-col bg-black">
        <div className="flex-1 relative overflow-hidden bg-slate-900 flex items-center justify-center">
            <video ref={remoteVideoRef} className={cn("w-full h-full object-contain", !remoteStream && "opacity-0")} autoPlay playsInline />
            
            {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <div className="text-center animate-in fade-in zoom-in duration-500">
                        <div className="inline-block p-6 rounded-full bg-slate-800 mb-4 shadow-2xl shadow-cyan-500/20 border border-slate-700 relative">
                            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"></div>
                            <User className="w-16 h-16 text-cyan-500 relative z-10" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Conectando con el Dr. {doctorName?.split(' ')[0]}...</h3>
                        <p className="text-slate-400 text-sm">Estado: {connectionStatus === 'connected' ? 'Conectado' : 'Esperando señal...'}</p>
                    </div>
                </div>
            )}

            <div className="absolute bottom-24 right-4 w-48 h-36 bg-black rounded-xl border-2 border-slate-800 overflow-hidden shadow-2xl z-20 hover:scale-105 transition-transform duration-300 group">
                <video ref={localVideoRef} className="w-full h-full object-cover transform -scale-x-100" autoPlay muted playsInline />
                <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded backdrop-blur-md">TÚ</div>
                <div className={cn("absolute top-2 right-2 w-2.5 h-2.5 rounded-full shadow-lg transition-colors duration-500", connectionStatus === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-yellow-500 animate-pulse")} />
            </div>
            
            <div className="absolute top-0 left-0 right-0 p-4 z-30 bg-gradient-to-b from-black/80 to-transparent flex justify-between pointer-events-none">
                <div className="flex gap-3 pointer-events-auto">
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700 px-4 py-1.5 rounded-full flex items-center gap-2 text-white text-sm font-medium shadow-lg"><User className="w-4 h-4 text-cyan-400" />Dr. {doctorName || 'Médico'}</div>
                    {/* FIX: Removed the timer/clock element here */}
                </div>
                <Button size="sm" onClick={() => setChatOpen(!chatOpen)} className="relative pointer-events-auto rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-white backdrop-blur-md">
                    <MessageCircle className="w-5 h-5" />
                    {unreadMessages > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white animate-bounce">{unreadMessages}</span>}
                </Button>
            </div>
        </div>

        <div className="h-20 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-6 z-40 shrink-0 relative">
          <Button onClick={toggleMute} variant={isMuted ? "destructive" : "secondary"} className="rounded-full w-12 h-12 p-0 shadow-lg hover:scale-110 transition-transform">{isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</Button>
          <Button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 h-12 font-bold shadow-red-900/20 shadow-lg hover:scale-105 transition-transform"><PhoneOff className="w-5 h-5 mr-2" /> Salir</Button>
          <Button onClick={toggleVideo} variant={isVideoOff ? "destructive" : "secondary"} className="rounded-full w-12 h-12 p-0 shadow-lg hover:scale-110 transition-transform">{isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}</Button>
        </div>
      </div>
    </div>
  );
};

export default PatientActiveVideoCall;