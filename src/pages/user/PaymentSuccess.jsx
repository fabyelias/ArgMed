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

    useEffect(() => {
        const updatePaymentStatus = async () => {
            try {
                // Get consultation_id from URL params (MP sends it as query param)
                const consultationIdFromUrl = searchParams.get('consultation_id') || consultationId;

                if (!consultationIdFromUrl) {
                    console.error('No consultation ID found');
                    navigate('/user/dashboard');
                    return;
                }

                console.log('Updating payment status for consultation:', consultationIdFromUrl);

                // Update consultation payment status
                const { error: updateError } = await supabase
                    .from('consultations')
                    .update({
                        payment_status: 'paid',
                        status: 'paid'
                    })
                    .eq('id', consultationIdFromUrl);

                if (updateError) {
                    console.error('Error updating payment status:', updateError);
                } else {
                    console.log('Payment status updated successfully');
                }

                setUpdating(false);

                // Redirect to video permissions after 3 seconds
                const redirectTimer = setTimeout(() => {
                    navigate(`/user/video-permissions/${consultationIdFromUrl}`);
                }, 3000);

                return () => clearTimeout(redirectTimer);
            } catch (error) {
                console.error('Payment update error:', error);
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
                <div className="bg-green-500/20 p-6 rounded-full mb-8 inline-block">
                    <CheckCircle className="w-24 h-24 text-green-400" />
                </div>
                <h1 className="text-4xl font-bold mb-3">¡Pago Completado!</h1>
                <p className="text-xl text-gray-400 mb-8">Gracias por tu pago. Preparando la sala de video...</p>
                <div className="flex items-center justify-center gap-3 text-cyan-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-lg">Redirigiendo...</span>
                </div>
            </motion.div>
        </div>
    );
};

export default PaymentSuccess;