import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const processPaymentReturn = async () => {
      const collectionStatus = searchParams.get('status') || searchParams.get('collection_status');
      const consultationId = searchParams.get('external_reference') || searchParams.get('consultation_id');

      if (!consultationId) {
        setStatus('failure');
        return;
      }

      if (collectionStatus === 'approved' || collectionStatus === 'success') {
        try {
          // 1. Update consultation
          const { error: updateError } = await supabase
            .from('consultations')
            .update({ 
              status: 'paid',
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', consultationId);

          if (updateError) console.error('Error updating consultation:', updateError);

          // 2. Fetch for notification details
          const { data: consultationData } = await supabase
            .from('consultations')
            .select('*, patients:patient_id(full_name)')
            .eq('id', consultationId)
            .single();

          if (consultationData?.doctor_id) {
             const patientName = consultationData.patients?.full_name || 'Un paciente';
             await supabase.from('notifications').insert({
               user_id: consultationData.doctor_id,
               type: 'payment_received',
               title: '¡Pago Recibido!',
               message: `El paciente ${patientName} ha pagado la consulta.`,
               payload: { consultationId: consultationId },
               is_read: false
             });
          }

          setStatus('success');
          setTimeout(() => navigate(`/patient/video-call-room/${consultationId}`), 3000);

        } catch (err) {
          console.error('Error processing payment return:', err);
          setStatus('failure');
        }
      } else {
        setStatus('failure');
      }
    };

    processPaymentReturn();
  }, [searchParams, navigate]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Verificando pago...</h2>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-green-500/20 p-6 rounded-full mb-6">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">¡Todo listo!</h2>
        <p className="text-gray-300 max-w-md mb-8">
          Tu consulta ha sido confirmada. Redirigiendo...
        </p>
        <Button 
          onClick={() => {
             const id = searchParams.get('external_reference');
             if(id) navigate(`/patient/video-call-room/${id}`);
          }}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          Ir a la consulta <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-red-500/20 p-6 rounded-full mb-6">
        <AlertTriangle className="w-16 h-16 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-4">Algo salió mal</h2>
      <Button onClick={() => navigate('/patient/dashboard')} variant="outline">
        Volver al Panel
      </Button>
    </div>
  );
};

export default PaymentStatus;