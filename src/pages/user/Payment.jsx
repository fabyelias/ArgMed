import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CreditCard, ShieldCheck, Lock } from 'lucide-react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [preferenceId, setPreferenceId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { consultationId, amount, professionalName } = location.state || {};

    useEffect(() => {
        if (!consultationId) {
            navigate('/user/dashboard');
            return;
        }

        createPaymentPreference();
    }, [consultationId]);

    const createPaymentPreference = async () => {
        try {
            // Verify user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error("No estás autenticado. Por favor inicia sesión.");
            }

            console.log('[Payment] Fetching consultation:', consultationId);

            const { data: checkData, error: checkError } = await supabase
                .from('consultations')
                .select('status, payment_status, consultation_fee, doctor_id')
                .eq('id', consultationId)
                .single();

            console.log('[Payment] Consultation data:', checkData);
            console.log('[Payment] Consultation error:', checkError);

            if (checkError || !checkData) throw new Error("Error verificando consulta.");

            if (checkData.payment_status === 'paid') {
                toast({ title: "Consulta ya pagada", description: "Redirigiendo a la sala..." });
                navigate(`/user/consultation/${consultationId}`);
                return;
            }

            // Call Edge Function directly without JWT requirement
            console.log('[Payment] Calling Edge Function with:', {
                consultationId,
                title: `Consulta Médica - Dr. ${professionalName || 'Especialista'}`,
                price: parseFloat(amount || checkData.consultation_fee || 0),
                quantity: 1,
                doctor_id: checkData.doctor_id
            });

            const response = await fetch(
                `https://msnppinpethxfxskfgsv.supabase.co/functions/v1/create-mp-preference`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        consultationId,
                        title: `Consulta Médica - Dr. ${professionalName || 'Especialista'}`,
                        price: parseFloat(amount || checkData.consultation_fee || 0),
                        quantity: 1
                    })
                }
            );

            console.log('[Payment] Response status:', response.status);
            const result = await response.json();
            console.log('[Payment] MP Response:', result);

            if (!response.ok) {
                console.error('MP Function Error:', result);
                const errorMessage = result.error || 'Error al crear preferencia de pago';

                // Check if error is related to MP connection
                if (errorMessage.includes('does not have Mercado Pago connected')) {
                    setError('El profesional aún no ha configurado su cuenta de Mercado Pago. Por favor, contacta al especialista.');
                    toast({
                        title: "Configuración Pendiente",
                        description: "El especialista debe conectar su cuenta de Mercado Pago primero.",
                        variant: "destructive"
                    });
                } else {
                    setError(errorMessage);
                    toast({
                        title: "Error de Pago",
                        description: errorMessage,
                        variant: "destructive"
                    });
                }
                setLoading(false);
                return;
            }

            if (result.preferenceId) {
                setPreferenceId(result.preferenceId);
                if (result.publicKey) {
                    initMercadoPago(result.publicKey, { locale: 'es-AR' });
                }
            } else {
                console.error('No preference ID in response:', result);
                const msg = "No se recibió ID de preferencia de Mercado Pago.";
                setError(msg);
                throw new Error(msg);
            }

        } catch (error) {
            console.error("Payment setup error:", error);
            const errorMsg = error.message || "No se pudo iniciar la pasarela de pago.";
            setError(errorMsg);
            toast({
                title: "Error de Pago",
                description: errorMsg,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Pago Seguro</h1>
                    <p className="text-gray-400">
                        Completá el pago para iniciar tu sesión de telemedicina.
                    </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Total a pagar:</span>
                        <span className="text-2xl font-bold text-white">${amount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-400">
                        <ShieldCheck className="w-3 h-3" /> Transacción encriptada de extremo a extremo
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-2" />
                        <p className="text-sm text-gray-500">Conectando con Mercado Pago...</p>
                    </div>
                ) : error ? (
                    <div className="text-center space-y-4">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                            <p className="text-red-400 text-sm mb-2">{error}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="border-slate-700 hover:bg-slate-800"
                            >
                                Reintentar
                            </Button>
                            <Button
                                onClick={() => navigate('/user/dashboard')}
                                variant="ghost"
                                className="text-gray-500 hover:text-white"
                            >
                                Volver al Panel
                            </Button>
                        </div>
                    </div>
                ) : preferenceId ? (
                    <div className="mp-wallet-container">
                         <Wallet initialization={{ preferenceId: preferenceId }} customization={{ texts:{ valueProp: 'security_safety'}}} />
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-red-400 mb-4">No se pudo cargar el botón de pago.</p>
                        <Button onClick={() => window.location.reload()} variant="outline">Reintentar</Button>
                    </div>
                )}
                
                <div className="mt-6 text-center">
                    <Button variant="ghost" className="text-gray-500 hover:text-white text-sm" onClick={() => navigate('/user/dashboard')}>
                        Cancelar y Volver
                    </Button>
                </div>
                
                <div className="mt-8 flex justify-center gap-4 text-gray-600">
                     <Lock className="w-4 h-4" />
                     <span className="text-xs">ArgMed Payments Secure System</span>
                </div>
            </div>
        </div>
    );
};

export default Payment;