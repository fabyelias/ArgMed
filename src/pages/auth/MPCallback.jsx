import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';

const MPCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState('processing');
    const [errorMsg, setErrorMsg] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const code = searchParams.get('code');

        if (!code) {
            setStatus('error');
            setErrorMsg('Código de autorización no encontrado.');
            return;
        }

        if (!user) {
            setStatus('error');
            setErrorMsg('Debes iniciar sesión para vincular tu cuenta.');
            return;
        }

        const exchangeToken = async () => {
            try {
                // Must use the EXACT same URI used to get the code
                const redirectUri = 'https://argmed.online/api/auth/callback';

                const { data, error } = await supabase.functions.invoke('mp-connect', {
                    body: {
                        action: 'exchange_token',
                        code: code,
                        doctor_id: user.id,
                        redirect_uri: redirectUri
                    }
                });

                if (error || !data?.success) {
                    throw new Error(error?.message || 'Error al intercambiar token con Mercado Pago.');
                }

                // Auto-activate professional account after successful MP connection
                setStatus('activating');
                setCountdown(30);
                setProgress(0);

                // Countdown timer with visual feedback
                const countdownInterval = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(countdownInterval);
                            return 0;
                        }
                        return prev - 1;
                    });
                    setProgress(prev => Math.min(prev + (100 / 30), 100));
                }, 1000);

                // Wait 30 seconds before activating
                setTimeout(async () => {
                    clearInterval(countdownInterval);

                    try {
                        const { error: updateError } = await supabase
                            .from('professionals')
                            .update({
                                verification_status: 'approved',
                                is_active: true
                            })
                            .eq('id', user.id);

                        if (updateError) throw updateError;

                        setStatus('success');
                        toast({
                            title: "¡Cuenta Activada!",
                            description: "Tu perfil profesional ha sido activado exitosamente.",
                            className: "bg-green-600 text-white"
                        });

                        setTimeout(() => navigate('/professional/dashboard', { replace: true }), 2000);
                    } catch (activationError) {
                        console.error("Activation error:", activationError);
                        setStatus('error');
                        setErrorMsg("Error al activar la cuenta. Por favor contacta soporte.");
                    }
                }, 30000); // 30 seconds

            } catch (err) {
                console.error("MP Callback Error:", err);
                setStatus('error');
                setErrorMsg(err.message || "Error desconocido al vincular cuenta.");
            }
        };

        exchangeToken();
    }, [searchParams, user, navigate]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white text-center">
            {status === 'processing' && (
                <>
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                    <h2 className="text-xl font-bold">Vinculando cuenta...</h2>
                    <p className="text-gray-400">Por favor espera un momento mientras confirmamos tus datos.</p>
                </>
            )}

            {status === 'activating' && (
                <>
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-pulse" />
                    <h2 className="text-2xl font-bold text-green-400">¡Cuenta Vinculada Exitosamente!</h2>
                    <p className="text-gray-300 mt-2">Tu cuenta de Mercado Pago ha sido conectada correctamente</p>

                    <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-lg p-6 max-w-md w-full">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Clock className="w-6 h-6 text-cyan-400" />
                            <h3 className="text-lg font-bold text-white">Activación Automática</h3>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-center mb-3">
                                <div className="text-6xl font-bold text-cyan-400 tabular-nums">
                                    {countdown}
                                </div>
                                <span className="text-xl text-gray-400 ml-2">seg</span>
                            </div>
                            <Progress value={progress} className="h-3" />
                        </div>

                        <p className="text-sm text-gray-400 text-center">
                            Tu perfil profesional se activará automáticamente cuando llegue a 0.
                            <br />
                            <span className="text-cyan-400 font-semibold mt-2 block">
                                ¡Ya podés comenzar a recibir consultas!
                            </span>
                        </p>
                    </div>
                </>
            )}

            {status === 'success' && (
                <>
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-green-400">¡Cuenta Activada!</h2>
                    <p className="text-gray-300 mt-2">Redirigiendo al dashboard profesional...</p>
                </>
            )}

            {status === 'error' && (
                <>
                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white">Error de Vinculación</h2>
                    <p className="text-gray-400 mt-2 max-w-md bg-slate-900 p-4 rounded-lg border border-slate-800">
                        {errorMsg}
                    </p>
                    <div className="mt-6 flex gap-4">
                        <Button onClick={() => navigate('/professional/onboarding')} variant="secondary">
                            Volver al inicio
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default MPCallback;