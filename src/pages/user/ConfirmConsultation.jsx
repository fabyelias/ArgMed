import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, DollarSign, CheckCircle, ArrowRight } from 'lucide-react';

const ConfirmConsultation = () => {
    const { consultationId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [consultation, setConsultation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (consultationId) {
            fetchConsultation();
        }
    }, [consultationId]);

    const fetchConsultation = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('consultations')
                .select(`
                    *,
                    professional:professional_id (
                        full_name,
                        photo_url,
                        professionals_data:professionals (
                            specialization
                        )
                    )
                `)
                .eq('id', consultationId)
                .eq('status', 'accepted')
                .eq('payment_status', 'pending')
                .single();

            if (error) {
                console.error("Consultation fetch error:", error);
                throw new Error("No se encontró la consulta o ya fue procesada.");
            }

            setConsultation(data);
        } catch (error) {
            console.error("Error fetching consultation details:", error);
            toast({ 
                title: "Error", 
                description: error.message || "No se pudo cargar la información de la consulta.", 
                variant: "destructive" 
            });
            setTimeout(() => navigate('/user/dashboard'), 2000);
        } finally {
            setLoading(false);
        }
    };

    const handleProceedToPayment = () => {
        navigate('/user/payment', { 
            state: { 
                consultationId: consultation.id,
                amount: consultation.consultation_fee,
                professionalName: consultation.professional?.full_name
            } 
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-gray-400">Cargando detalles de la consulta...</p>
            </div>
        );
    }
    
    if (!consultation) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
            <p className="text-red-400">No se pudo cargar la consulta.</p>
        </div>
    );

    const professionalProfile = consultation.professional;
    const professionalData = professionalProfile?.professionals_data?.[0] || professionalProfile?.professionals_data;

    return (
        <div className="min-h-screen bg-slate-950 p-4 flex items-center justify-center">
            <Card className="max-w-md w-full bg-slate-900 border-slate-800 shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">¡Especialista Confirmado!</CardTitle>
                    <CardDescription className="text-gray-400">
                        El profesional ha aceptado tu solicitud.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 pt-6">
                    {professionalProfile && (
                        <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="h-14 w-14 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-600 flex-shrink-0">
                                {professionalProfile.photo_url ? (
                                    <img src={professionalProfile.photo_url} alt="Dr." className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                                        {professionalProfile.full_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Dr. {professionalProfile.full_name}</h3>
                                <p className="text-cyan-400 text-sm font-medium">{professionalData?.specialization || 'Especialista'}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Honorarios de Consulta
                            </span>
                            <span className="text-white font-mono font-bold text-lg">
                                ${consultation.consultation_fee}
                            </span>
                        </div>
                        <div className="h-px bg-slate-800 w-full my-2"></div>
                        <p className="text-xs text-center text-gray-500">
                            Al confirmar, serás redirigido a la pasarela de pago segura de Mercado Pago.
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="pt-2">
                    <Button 
                        onClick={handleProceedToPayment}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-6 text-lg shadow-lg shadow-cyan-900/20"
                    >
                        Pagar y Comenzar <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ConfirmConsultation;