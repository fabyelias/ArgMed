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
    
    const { consultationId, amount, professionalName } = location.state || {};

    useEffect(() => {
        if (!consultationId) {
            navigate('/patient/dashboard');
            return;
        }

        createPaymentPreference();
    }, [consultationId]);

    const createPaymentPreference = async () => {
        try {
            const { data: checkData, error: checkError } = await supabase
                .from('consultations')
                .select('status, payment_status, consultation_fee')
                .eq('id', consultationId)
                .single();

            if (checkError || !checkData) throw new Error("Error verificando consulta.");
            
            if (checkData.payment_status === 'paid') {
                toast({ title: "Consulta ya pagada", description: "Redirigiendo a la sala..." });
                navigate(`/patient/consultation/${consultationId}`);
                return;
            }

            const { data, error } = await supabase.functions.invoke('create-mp-preference', {
                body: {
                    consultationId,
                    title: `Consulta Médica - Dr. ${professionalName || 'Especialista'}`,
                    price: parseFloat(amount || checkData.consultation_fee || 0),
                    quantity: 1
                }
            });

            if (error) throw error;
            if (data && data.preferenceId) {
                setPreferenceId(data.preferenceId);
                if (data.publicKey) {
                    initMercadoPago(data.publicKey, { locale: 'es-AR' });
                }
            } else {
                throw new Error("No se recibió ID de preferencia.");
            }

        } catch (error) {
            console.error("Payment setup error:", error);
            toast({ title: "Error de Pago", description: "No se pudo iniciar la pasarela de pago.", variant: "destructive" });
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
                    <Button variant="ghost" className="text-gray-500 hover:text-white text-sm" onClick={() => navigate('/patient/dashboard')}>
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