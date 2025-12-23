import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Mic, CheckCircle, AlertTriangle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const VideoPermissions = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle'); // idle, requesting, success, error

    const handleRequestPermissions = async () => {
        setStatus('requesting');
        try {
            // Request permissions explicitly with constraints
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            // Stop streams immediately (just checking access/presence)
            // This ensures the "Active Call" page can request them fresh without conflicts
            stream.getTracks().forEach(track => track.stop());

            // Update DB
            const { error } = await supabase
                .from('consultations')
                .update({ status: 'permissions_granted' })
                .eq('id', id);

            if (error) throw error;

            setStatus('success');
            toast({
                title: "Permisos concedidos",
                description: "Conectando a la sala...",
                className: "bg-green-600 text-white border-none"
            });
            
            // Redirect to the SECURE ROOM page instead of direct active call
            setTimeout(() => {
                navigate(`/patient/video-call-room/${id}`);
            }, 1500);

        } catch (err) {
            console.error("Permission error:", err);
            setStatus('error');
            
            let errorMsg = "Necesitamos acceso a cámara y micrófono.";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMsg = "Acceso denegado. Por favor habilite los permisos en su navegador.";
            } else if (err.name === 'NotFoundError') {
                errorMsg = "No se encontraron cámara o micrófono.";
            }

            toast({
                title: "Error de acceso",
                description: errorMsg,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-xl text-center"
            >
                {status === 'success' ? (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6 animate-pulse" />
                        <h1 className="text-3xl font-bold text-white mb-2">¡Todo listo!</h1>
                        <p className="text-gray-400 mb-8">Entrando a la sala segura...</p>
                        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <div className="bg-cyan-500/20 p-4 rounded-full"><Video className="w-8 h-8 text-cyan-400" /></div>
                            <div className="bg-blue-500/20 p-4 rounded-full"><Mic className="w-8 h-8 text-blue-400" /></div>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-3">Autorizar Videollamada</h1>
                        <p className="text-gray-400 mb-8">
                            El médico te está esperando. Por favor autorizá el uso de tu cámara y micrófono para comenzar.
                        </p>
                        
                        {status === 'error' && (
                            <div className="bg-red-900/30 text-red-200 p-4 rounded-lg mb-6 text-sm flex items-start gap-3 text-left border border-red-500/30">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                                <div>
                                    <span className="font-bold block mb-1">Acceso bloqueado</span> 
                                    Hacé clic en el ícono de candado 🔒 en la barra de direcciones, seleccioná "Permitir" para Cámara y Micrófono, y luego intentá de nuevo.
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-3">
                            <Button 
                                onClick={handleRequestPermissions} 
                                disabled={status === 'requesting'}
                                className="w-full h-14 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 shadow-lg shadow-cyan-900/40"
                            >
                                {status === 'requesting' ? (
                                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Solicitando...</>
                                ) : status === 'error' ? (
                                    <><RefreshCw className="w-5 h-5 mr-2" /> Reintentar Acceso</>
                                ) : (
                                    <>Autorizar y Entrar <ArrowRight className="w-5 h-5 ml-2" /></>
                                )}
                            </Button>
                            
                            {status === 'error' && (
                                <Button 
                                    variant="ghost" 
                                    onClick={() => window.location.reload()}
                                    className="text-gray-400 hover:text-white"
                                >
                                    Recargar página
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default VideoPermissions;