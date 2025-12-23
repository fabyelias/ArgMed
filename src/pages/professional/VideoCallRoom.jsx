import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import ChatPanel from '@/components/ChatPanel';

// This is a simplified placeholder for the video room to resolve the import error.
// In a real implementation, this would contain WebRTC logic (Daily.co, Agora, Twilio, or simple PeerJS).
const VideoCallRoom = () => {
  const { id: consultationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [consultation, setConsultation] = useState(null);

  useEffect(() => {
    const fetchConsultation = async () => {
      // Fixed: changed patient_id (non-existent) to user_id (correct FK for patient)
      const { data, error } = await supabase
        .from('consultations')
        .select('*, patient:user_id(full_name)')
        .eq('id', consultationId)
        .single();
      
      if (error) {
        console.error(error);
        toast({ title: "Error", description: "No se pudo cargar la consulta", variant: "destructive" });
        navigate('/professional');
      } else {
        setConsultation(data);
      }
    };
    fetchConsultation();
  }, [consultationId, navigate]);

  const handleEndCall = async () => {
    const confirmEnd = window.confirm("¿Finalizar la consulta?");
    if (confirmEnd) {
      await supabase
        .from('consultations')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', consultationId);
        
      toast({ title: "Consulta Finalizada" });
      navigate('/professional');
    }
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-600 p-2 rounded-full">
            <User className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">{consultation?.patient?.full_name || 'Paciente'}</h2>
            <p className="text-cyan-400 text-xs flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> En vivo
            </p>
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          <span className="text-white font-mono text-sm">00:12:45</span>
        </div>
      </div>

      {/* Main Video Area (Placeholder) */}
      <div className="flex-1 flex items-center justify-center bg-slate-900 relative">
        <div className="text-center">
          <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <User className="w-16 h-16 text-slate-600" />
          </div>
          <h3 className="text-xl text-white font-medium">Conectando con el paciente...</h3>
          <p className="text-gray-500 mt-2">La señal de video aparecería aquí.</p>
        </div>

        {/* Self View (PIP) */}
        <div className="absolute bottom-24 right-4 w-32 h-48 bg-slate-800 rounded-lg border-2 border-slate-700 overflow-hidden shadow-xl">
           <div className="w-full h-full flex items-center justify-center bg-black">
              <span className="text-xs text-gray-500">Tu cámara</span>
           </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-center items-center gap-4 relative z-20">
        <Button 
          variant="outline" 
          size="icon" 
          className={`rounded-full w-12 h-12 border-0 ${micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
          onClick={() => setMicOn(!micOn)}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          className={`rounded-full w-12 h-12 border-0 ${cameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
          onClick={() => setCameraOn(!cameraOn)}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>

        <Button 
          variant="destructive" 
          size="icon" 
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 mx-4"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          className={`rounded-full w-12 h-12 border-0 ${showChat ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      </div>

      {/* Chat Panel Overlay */}
      {showChat && (
        <div className="absolute right-0 top-0 bottom-20 w-80 bg-slate-900 border-l border-slate-800 z-20 shadow-2xl">
           <div className="h-full flex flex-col">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                 <h3 className="font-bold text-white">Chat de Consulta</h3>
                 <Button variant="ghost" size="sm" onClick={() => setShowChat(false)} className="h-8 w-8 p-0 text-gray-400">✕</Button>
              </div>
              <div className="flex-1 p-4">
                 <ChatPanel consultationId={consultationId} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VideoCallRoom;