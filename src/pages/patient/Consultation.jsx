import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, Shield, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const MAX_DURATION = 30 * 60; // 30 minutes in seconds

const Consultation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [remainingTime, setRemainingTime] = useState(MAX_DURATION);
  const localVideoRef = useRef(null);

  // Safe cleanup for video stream
  const stopMediaStream = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (mounted && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        } else {
          // If component unmounted before stream was ready, stop it immediately
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Failed to get local stream", err);
        if (mounted) {
          toast({ title: "Error de Cámara/Mic", description: "No se pudo acceder a tus dispositivos.", variant: "destructive" });
        }
      }
    };

    initializeMedia();

    const fetchConsultation = async () => {
      if (!user || !id) return;
      const { data, error } = await supabase.from('consultations')
        .select('*, doctor:doctor_id(*, profiles(full_name))')
        .eq('id', id)
        .eq('patient_id', user.id)
        .single();

      if (error || !data) {
        toast({ title: "Error", description: "No se pudo cargar la consulta", variant: "destructive" });
        navigate('/patient');
        return;
      }
      if (mounted) {
        setConsultation(data);
        setLoading(false);
      }
    };

    fetchConsultation();

    const channel = supabase.channel(`consultation-patient-${id}`).subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      stopMediaStream();
    };
  }, [id, user, navigate]);

  const handleEndCall = async () => {
    try {
      await supabase.from('consultations').update({ status: 'finished', ended_at: new Date().toISOString() }).eq('id', id);
      toast({ title: "Consulta Finalizada", description: "Gracias por usar ArgMed." });
    } catch (error) {
      console.error("Error ending call:", error);
    } finally {
      stopMediaStream();
      navigate('/patient');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCamera = () => {
    setCameraOn(!cameraOn);
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getVideoTracks().forEach(track => track.enabled = !cameraOn);
    }
  };

  const toggleMic = () => {
    setMicOn(!micOn);
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getAudioTracks().forEach(track => track.enabled = !micOn);
    }
  };

  if (loading) {
    return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  
  if (!consultation) {
    return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">Consulta no encontrada.</div>
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden text-white">
      <div className="flex-1 flex flex-col relative">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/40 backdrop-blur-md border border-slate-700/50 text-white">
              <Clock className="w-3 h-3" />
              <span className="font-mono text-sm font-bold">{formatTime(remainingTime)}</span>
            </div>
            <span className="bg-slate-800/80 text-white text-xs px-2 py-1 rounded ml-2">
              Consulta con Dr. {consultation.doctor?.profiles?.full_name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30 backdrop-blur-sm pointer-events-auto">
            <Shield className="w-3 h-3" />
            <span className="text-xs font-medium">Conexión Segura</span>
          </div>
        </div>

        {/* Main Video Area */}
        <div className="flex-1 bg-slate-900 relative flex items-center justify-center overflow-hidden">
          {/* Placeholder for remote stream since this is just the preview/setup or old page */}
          <div className="absolute inset-0">
            <img className="w-full h-full object-cover opacity-50" alt="Doctor waiting" src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold">Conectando con el médico...</p>
                </div>
            </div>
          </div>

          {/* Local Video (PIP) */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg border-2 border-slate-700 overflow-hidden shadow-2xl z-20">
            {/* Always render video element, toggle visibility with CSS */}
            <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${cameraOn ? 'opacity-100' : 'opacity-0'}`}
            ></video>
            
            {!cameraOn && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-slate-900 border-t border-slate-800 p-6">
          <div className="flex items-center justify-center gap-6">
            <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${micOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500/20 text-red-500'}`}>
              {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            
            <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${cameraOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500/20 text-red-500'}`}>
              {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            
            <button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-red-900/20">
              <PhoneOff className="w-6 h-6" /> Finalizar
            </button>
            
            <button className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-400">
                <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;