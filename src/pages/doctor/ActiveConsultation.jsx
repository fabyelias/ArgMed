import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Video, Phone, FileText, Save, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const ActiveConsultation = () => {
  const { id: consultationId } = useParams();
  const navigate = useNavigate();
  const { user: professional } = useAuth();
  
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [observation, setObservation] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [instructions, setInstructions] = useState('');
  
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (!professional) return;
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Failed to get local stream", err);
      });

    const fetchConsultation = async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', consultationId)
        .single();

      if (error || !data) {
        toast({ title: "Error", description: "Sesión no encontrada.", variant: "destructive" });
        navigate('/professional/dashboard');
        return;
      }

      // Get patient data separately
      const { data: patientData } = await supabase
        .from('users')
        .select('id, first_name, last_name, photo_url')
        .eq('id', data.patient_id)
        .maybeSingle();

      setConsultation({
        ...data,
        users: patientData ? {
          id: patientData.id,
          full_name: `${patientData.first_name} ${patientData.last_name}`,
          photo_url: patientData.photo_url
        } : null
      });
      setLoading(false);
    };

    fetchConsultation();

    const channel = supabase
      .channel(`professional-consultation-${consultationId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `id=eq.${consultationId}` }, 
        (payload) => {
          setConsultation(prev => ({...prev, ...payload.new}));
        }
      ).subscribe();
      
    return () => {
        supabase.removeChannel(channel);
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };
  }, [consultationId, professional, navigate]);

  const handleSaveNotes = async () => {
    if (!observation && !internalNotes && !instructions) {
        toast({ title: "Campos Vacíos", description: "Debe rellenar al menos un campo de la bitácora.", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    
    try {
        const record = {
            consultation_id: consultationId,
            user_id: consultation.user_id,
            professional_id: professional.id,
            diagnosis: observation,
            professional_notes: internalNotes,
            prescription: instructions,
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('medical_records').insert([record]);
        if (error) throw error;
        
        toast({ title: "Bitácora actualizada", className: "bg-green-600 text-white" });
        setObservation('');
        setInternalNotes('');
        setInstructions('');
    } catch (error) {
        console.error("Error saving notes:", error);
        toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const endConsultation = async () => {
    await supabase.from('consultations').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', consultationId);
    toast({ title: "Sesión Finalizada", description: "La videollamada ha terminado." });
    navigate('/professional/dashboard');
  };
  
  if (loading) return <div className="text-center p-10 text-white"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;
  if (!consultation) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Sesión con {consultation.users?.full_name || 'Usuario'}
            </h1>
            <Button onClick={() => navigate(`/professional/video-call-room/${consultationId}`)} className="bg-green-600 hover:bg-green-700">
                <Video className="w-4 h-4 mr-2" />
                Ir a Sala de Videollamada
            </Button>
        </div>
        
        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl mb-6 flex items-start gap-3">
             <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
             <div>
                <p className="text-sm text-blue-200 font-medium">Recordatorio de Facturación</p>
                <p className="text-xs text-blue-300">Recuerda que tú facturas directamente al usuario a través de Mercado Pago. ArgMed te facturará posteriormente por el uso de la plataforma de comunicación.</p>
             </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <div className={`bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6`}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-cyan-400" />Bitácora de Sesión</h2>
              <p className="text-xs text-slate-400 mb-4">Esta información quedará guardada en el perfil del usuario y será visible para otros especialistas de la red.</p>
              
              <div className="space-y-4">
                <div>
                    <Label htmlFor="observation" className="text-gray-300">Observaciones Principales</Label>
                    <Textarea id="observation" value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Resumen de la temática abordada..."/>
                </div>
                 <div>
                    <Label htmlFor="internalNotes" className="text-gray-300">Notas Técnicas / Privadas</Label>
                    <Textarea id="internalNotes" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Detalles específicos para seguimiento..."/>
                </div>
                <div>
                    <Label htmlFor="instructions" className="text-gray-300">Indicaciones / Pasos a seguir</Label>
                    <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Recomendaciones enviadas al usuario..."/>
                </div>
                <Button onClick={handleSaveNotes} disabled={isSaving} className="w-full bg-cyan-600 hover:bg-cyan-700">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar en Bitácora
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Información del Usuario</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <img src={consultation.users?.photo_url || `https://ui-avatars.com/api/?name=${consultation.users?.full_name}`} alt="user" className="w-12 h-12 rounded-full bg-slate-700"/>
                    <div>
                        <p className="text-white font-medium">{consultation.users?.full_name}</p>
                        <p className="text-sm text-gray-400">ID: ...{consultation.patient_id.slice(-6)}</p>
                    </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                 <h2 className="text-xl font-semibold text-white mb-4">Acciones</h2>
                 <Button onClick={endConsultation} variant="destructive" size="lg" className="w-full">
                    <Phone className="w-5 h-5 mr-2" />Finalizar Conexión
                </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ActiveConsultation;