import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Mic, CheckCircle, AlertTriangle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const DoctorVideoPermissions = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle');

    const handleRequestPermissions = async () => {
        setStatus('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach(track => track.stop());

            // Update DB to doctor_ready
            const { error } = await supabase
                .from('consultations')
                .update({ status: 'doctor_ready' })
                .eq('id', id);

            if (error) throw error;

            setStatus('success');
            toast({
                title: "Equipo verificado",
                description: "Iniciando sala de consulta...",
                className: "bg-green-600 text-white border-none"
            });
            
            setTimeout(() => {
                navigate(`/doctor/video-call-room/${id}`);
            }, 1500);

        } catch (err) {
            console.error("Permission error:", err);
            setStatus('error');
            toast({
                title: "Error de permisos",
                description: "Se requiere acceso a cámara y micrófono.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-8 backdrop-blur-xl text-center"
            >
                {status === 'success' ? (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6 animate-pulse" />
                        <h1 className="text-3xl font-bold text-white mb-2">¡Listo, Doctor!</h1>
                        <p className="text-gray-400 mb-8">Accediendo al consultorio virtual...</p>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <div className="bg-indigo-500/20 p-4 rounded-full"><Video className="w-8 h-8 text-indigo-400" /></div>
                            <div className="bg-purple-500/20 p-4 rounded-full"><Mic className="w-8 h-8 text-purple-400" /></div>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-3">Preparar Consultorio</h1>
                        <p className="text-gray-400 mb-8">
                           Verifique su cámara y micrófono antes de ingresar a la consulta con el Usuario.
                        </p>
                        
                        {status === 'error' && (
                            <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-6 text-sm flex items-start gap-3 border border-red-500/30">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                                <div>
                                    <span className="font-bold block mb-1">Sin acceso.</span> 
                                    Verifique la configuración de permisos del navegador en el ícono de candado 🔒.
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-3">
                             <Button 
                                onClick={handleRequestPermissions} 
                                disabled={status === 'requesting'}
                                className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-lg shadow-indigo-900/40"
                            >
                                 {status === 'requesting' ? (
                                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Verificando...</>
                                ) : status === 'error' ? (
                                    <><RefreshCw className="w-5 h-5 mr-2" /> Reintentar</>
                                ) : (
                                    <>Ingresar a Consulta <ArrowRight className="w-5 h-5 ml-2" /></>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default DoctorVideoPermissions;