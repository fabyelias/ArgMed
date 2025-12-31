import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const PaymentSuccess = () => {
    const { consultationId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [updating, setUpdating] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const updatePaymentStatus = async () => {
            try {
                // Get consultation_id from URL params (MP sends it as query param)
                const consultationIdFromUrl = searchParams.get('consultation_id') || consultationId;

                // Also get payment_id and status from MP redirect
                const paymentId = searchParams.get('payment_id');
                const paymentStatus = searchParams.get('status');
                const mpStatus = searchParams.get('payment_status');

                console.log('Payment redirect params:', { consultationIdFromUrl, paymentId, paymentStatus, mpStatus });

                if (!consultationIdFromUrl) {
                    console.error('No consultation ID found in URL');
                    setError('No se encontró el ID de la consulta');
                    setUpdating(false);
                    setTimeout(() => navigate('/'), 3000);
                    return;
                }

                console.log('Updating payment status for consultation:', consultationIdFromUrl);

                // First verify consultation exists
                const { data: existingConsultation, error: checkError } = await supabase
                    .from('consultations')
                    .select('id, payment_status, status')
                    .eq('id', consultationIdFromUrl)
                    .single();

                console.log('Existing consultation:', existingConsultation, 'Check error:', checkError);

                if (checkError) {
                    console.error('Error checking consultation:', checkError);
                    setError(`No se pudo verificar la consulta: ${checkError.message}`);
                    setUpdating(false);
                    return;
                }

                // Update consultation payment status
                const { data: updateData, error: updateError } = await supabase
                    .from('consultations')
                    .update({
                        payment_status: 'paid',
                        status: 'in_progress'
                    })
                    .eq('id', consultationIdFromUrl)
                    .select();

                console.log('Update result:', updateData, 'Update error:', updateError);

                if (updateError) {
                    console.error('Error updating payment status:', updateError);
                    setError(`Error al actualizar: ${updateError.message}. Código: ${updateError.code}`);
                } else if (!updateData || updateData.length === 0) {
                    console.error('No rows updated');
                    setError('No se pudo actualizar la consulta (0 filas afectadas)');
                } else {
                    console.log('Payment status updated successfully:', updateData);
                }

                setUpdating(false);

                // Wait a bit longer to ensure DB update propagates
                const redirectTimer = setTimeout(() => {
                    console.log('Checking authentication and redirecting...');
                    // Check if user is authenticated
                    supabase.auth.getSession().then(({ data: { session } }) => {
                        console.log('Session check:', session ? 'authenticated' : 'not authenticated');
                        if (session) {
                            // Already authenticated, go to video room
                            navigate(`/user/video-call-room/${consultationIdFromUrl}`);
                        } else {
                            // Not authenticated, show message and redirect to login
                            setError('¡Pago exitoso! Por favor inicia sesión para entrar a la videollamada.');
                            setTimeout(() => {
                                navigate(`/auth?redirect=/user/video-call-room/${consultationIdFromUrl}`);
                            }, 3000);
                        }
                    });
                }, 4000);

                return () => clearTimeout(redirectTimer);
            } catch (error) {
                console.error('Payment update error:', error);
                setError('Error procesando el pago');
                setUpdating(false);
            }
        };

        updatePaymentStatus();
    }, [consultationId, searchParams, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="text-center"
            >
                {error ? (
                    <>
                        <div className="bg-red-500/20 p-6 rounded-full mb-8 inline-block">
                            <CheckCircle className="w-24 h-24 text-red-400" />
                        </div>
                        <h1 className="text-4xl font-bold mb-3">Error</h1>
                        <p className="text-xl text-gray-400 mb-8">{error}</p>
                    </>
                ) : (
                    <>
                        <div className="bg-green-500/20 p-6 rounded-full mb-8 inline-block">
                            <CheckCircle className="w-24 h-24 text-green-400" />
                        </div>
                        <h1 className="text-4xl font-bold mb-3">¡Pago Completado!</h1>
                        <p className="text-xl text-gray-400 mb-8">Gracias por tu pago. Preparando la sala de video...</p>
                        <div className="flex items-center justify-center gap-3 text-cyan-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-lg">{updating ? 'Procesando pago...' : 'Redirigiendo...'}</span>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default PaymentSuccess;