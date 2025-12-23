import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const MPCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState('processing');
    const [errorMsg, setErrorMsg] = useState('');

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

                // If success, update the local verification status to 'submitted' if it was pending
                // This ensures ProfessionalDashboard doesn't immediately bounce if not yet approved
                // But ProfessionalOnboarding handles the "waiting" state visually.
                
                setStatus('success');
                toast({
                    title: "Cuenta Vinculada",
                    description: "Tu cuenta de Mercado Pago ha sido conectada exitosamente.",
                    className: "bg-green-600 text-white"
                });
                
                // Important: Redirect to ONBOARDING, not dashboard, so we see Step 3
                setTimeout(() => navigate('/professional/onboarding', { replace: true }), 1500);

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

            {status === 'success' && (
                <>
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-green-400">¡Vinculación Exitosa!</h2>
                    <p className="text-gray-300 mt-2">Redirigiendo a estado de cuenta...</p>
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