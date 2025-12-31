import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, User, 
  MessageCircle, Clock, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import ChatPanel from '@/components/ChatPanel';
import { cn } from '@/lib/utils';

const SimpleClinicalSidebar = ({ consultationId, patientId, doctorId }) => {
    const [tab, setTab] = useState('notes');
    const [history, setHistory] = useState([]);
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [prescription, setPrescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { if (patientId) fetchHistory(); }, [patientId]);

    const fetchHistory = async () => {
        try {
            const { data } = await supabase.from('medical_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
            if (data) setHistory(data);
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        if (!diagnosis.trim() && !notes.trim()) return toast({ title: "Campos vacíos", variant: "destructive" });
        setIsSaving(true);
        try {
            const { error } = await supabase.from('medical_records').insert({
                consultation_id: consultationId, patient_id: patientId, doctor_id: doctorId,
                diagnosis: diagnosis.trim(), doctor_notes: notes.trim(), prescription: prescription.trim(),
                created_at: new Date().toISOString()
            });
            if (error) throw error;
            toast({ title: "Guardado correctamente", className: "bg-green-600 text-white" });
            setDiagnosis(''); setNotes(''); setPrescription('');
            await fetchHistory();
        } catch (e) { toast({ title: "Error al guardar", variant: "destructive" }); } 
        finally { setIsSaving(false); }
    };

    return (
        <div className="w-[350px] bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0 hidden md:flex">
            <div className="flex border-b border-slate-800 bg-slate-900 p-2 gap-2">
                <button onClick={() => setTab('notes')} className={cn("flex-1 py-2 text-sm font-bold rounded transition-colors", tab === 'notes' ? "bg-cyan-600 text-white" : "bg-slate-800 text-gray-400 hover:bg-slate-700")}>Notas</button>
                <button onClick={() => setTab('history')} className={cn("flex-1 py-2 text-sm font-bold rounded transition-colors", tab === 'history' ? "bg-cyan-600 text-white" : "bg-slate-800 text-gray-400 hover:bg-slate-700")}>Historial</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
                {tab === 'notes' ? (
                    <div className="flex flex-col gap-5">
                        <div><label className="block text-xs font-bold text-cyan-500 uppercase mb-2">Diagnóstico</label><textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-cyan-500 outline-none resize-none" rows={2} /></div>
                        <div className="flex-1"><label className="block text-xs font-bold text-cyan-500 uppercase mb-2">Evolución</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-cyan-500 outline-none resize-none min-h-[150px]" rows={8} /></div>
                        <div><label className="block text-xs font-bold text-cyan-500 uppercase mb-2">Receta</label><textarea value={prescription} onChange={(e) => setPrescription(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-cyan-500 outline-none resize-none" rows={3} /></div>
                        <button onClick={handleSave} disabled={isSaving} className={cn("w-full py-3 rounded-lg font-bold text-white transition-all mt-2", isSaving ? "bg-slate-800 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")}>{isSaving ? "GUARDANDO..." : "GUARDAR REGISTRO"}</button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {history.length === 0 ? <div className="text-center py-10 text-gray-500">Sin registros.</div> : history.map((r) => (
                            <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4"><div className="flex justify-between mb-2"><span className="text-cyan-400 text-xs font-bold">{new Date(r.created_at).toLocaleDateString()}</span></div><span className="text-white text-sm font-medium block mb-1">{r.diagnosis}</span><p className="text-gray-400 text-sm">{r.doctor_notes}</p></div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ActiveVideoCall = ({ consultationId, patientName }) => {
  console.log("[Doctor ActiveVideoCall] Component rendered");
  console.log("[Doctor ActiveVideoCall] consultationId:", consultationId);
  console.log("[Doctor ActiveVideoCall] patientName:", patientName);

  const navigate = useNavigate();
  const { user } = useAuth();

  console.log("[Doctor ActiveVideoCall] user:", user?.id);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [patientId, setPatientId] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  console.log("[Doctor ActiveVideoCall] Calling useWebRTC with:", { consultationId, userId: user?.id, isDoctor: true });
  const { localStream, remoteStream, connectionStatus, isMuted, isVideoOff, toggleMute, toggleVideo } = useWebRTC(consultationId, user?.id, true);
  console.log("[Doctor ActiveVideoCall] useWebRTC returned:", { localStream: !!localStream, remoteStream: !!remoteStream, connectionStatus });

  const { messages, sendMessage, sending } = useChat(consultationId, user?.id);

  // SYNC TIMER & END CALL LISTENER
  useEffect(() => {
      let interval;
      
      // 1. Subscribe to Consultation Updates
      const channel = supabase.channel(`consultation-${consultationId}-status`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `id=eq.${consultationId}` }, 
          (payload) => {
              if (payload.new.status === 'completed') {
                  navigate('/doctor');
              }
          })
          .subscribe();

      // 2. Timer Logic
      const initTimer = async () => {
          const { data, error } = await supabase.from('consultations').select('started_at, patient_id').eq('id', consultationId).single();
          if (error || !data) return;
          
          setPatientId(data.patient_id);
          
          let startTimestamp;
          if (data.started_at) {
              startTimestamp = new Date(data.started_at).getTime();
          } else {
              // Start the timer now if it hasn't started
              const now = new Date();
              await supabase.from('consultations').update({ 
                  status: 'in_call', 
                  started_at: now.toISOString() 
              }).eq('id', consultationId);
              startTimestamp = now.getTime();
          }

          // Update every second based on difference
          interval = setInterval(() => {
              const now = Date.now();
              const secondsElapsed = Math.floor((now - startTimestamp) / 1000);
              setDuration(secondsElapsed > 0 ? secondsElapsed : 0);
          }, 1000);
          
          // Initial set
          const initialSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
          setDuration(initialSeconds > 0 ? initialSeconds : 0);
      };
      
      initTimer();

      return () => {
          clearInterval(interval);
          supabase.removeChannel(channel);
      };
  }, [consultationId, navigate]);

  // CHAT NOTIFICATIONS
  useEffect(() => {
      if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (!chatOpen && lastMsg.sender_id !== user.id) {
              setUnreadMessages(prev => prev + 1);
              toast({ title: `Nuevo mensaje de ${lastMsg.sender_name}`, description: lastMsg.message, className: "bg-slate-800 text-white border-cyan-500" });
          }
      }
  }, [messages]);

  useEffect(() => {
      if (chatOpen) setUnreadMessages(0);
  }, [chatOpen]);

  useEffect(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleEndCall = async () => {
    if(!window.confirm("¿Finalizar consulta?")) return;
    try {
        await supabase.from('consultations').update({ status: 'completed', ended_at: new Date().toISOString(), duration }).eq('id', consultationId);
        navigate('/doctor');
    } catch(e) { navigate('/doctor'); }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden relative">
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} messages={messages} onSendMessage={(txt) => sendMessage(txt, user?.full_name || 'Dr.')} currentUserId={user?.id} sending={sending} />
      <SimpleClinicalSidebar consultationId={consultationId} patientId={patientId} doctorId={user?.id} />

      <div className="flex-1 relative flex flex-col bg-black">
        <div className="flex-1 relative overflow-hidden bg-slate-900 flex items-center justify-center">
            <video ref={remoteVideoRef} className={cn("w-full h-full object-contain", !remoteStream && "opacity-0")} autoPlay playsInline />
            {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <div className="text-center">
                        <div className="inline-block p-4 rounded-full bg-slate-800 mb-4 animate-pulse"><User className="w-12 h-12 text-slate-500" /></div>
                        <p className="text-slate-400 font-medium">Esperando al Usuario...</p>
                        <p className="text-slate-500 text-xs mt-2">Estado: {connectionStatus}</p>
                    </div>
                </div>
            )}
            <div className="absolute bottom-24 right-4 w-56 h-40 bg-black rounded-lg border border-slate-700 overflow-hidden shadow-2xl z-20">
                <video ref={localVideoRef} className="w-full h-full object-cover transform -scale-x-100" autoPlay muted playsInline />
                <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white bg-black/50 px-2 rounded">TÚ</div>
            </div>
            <div className="absolute top-4 left-4 right-4 flex justify-between z-30 pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <div className="bg-slate-900/90 backdrop-blur border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2 text-white text-sm font-bold shadow-lg"><User className="w-4 h-4 text-cyan-400" />{patientName || 'Usuario'}</div>
                    <div className="bg-slate-900/90 backdrop-blur border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2 text-green-400 text-sm font-mono font-bold shadow-lg"><Clock className="w-4 h-4" />{formatTime(duration)}</div>
                </div>
                <Button size="icon" onClick={() => setChatOpen(!chatOpen)} className="relative pointer-events-auto rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700">
                    <MessageCircle className="w-5 h-5" />
                    {unreadMessages > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white animate-bounce">{unreadMessages}</span>}
                </Button>
            </div>
        </div>
        <div className="h-20 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-6 z-40 shrink-0">
          <Button onClick={toggleMute} variant={isMuted ? "destructive" : "secondary"} className="rounded-full w-12 h-12 p-0">{isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</Button>
          <Button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 font-bold"><PhoneOff className="w-5 h-5 mr-2" /> Finalizar</Button>
          <Button onClick={toggleVideo} variant={isVideoOff ? "destructive" : "secondary"} className="rounded-full w-12 h-12 p-0">{isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}</Button>
        </div>
      </div>
    </div>
  );
};

export default ActiveVideoCall;