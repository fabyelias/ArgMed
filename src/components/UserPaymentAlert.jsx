import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const UserPaymentAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingConsultation, setPendingConsultation] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!user) return;

    const checkPendingPayments = async () => {
      try {
        // Corrected query with new schema relations
        const { data, error } = await supabase
          .from('consultations')
          .select('id,consultation_fee,professionals:professional_id(full_name)')
          .eq('patient_id', user.id)
          .eq('status', 'accepted')
          .eq('payment_status', 'pending')
          .maybeSingle();

        if (data) {
          setPendingConsultation(data);
          setIsVisible(true);
        } else {
          setPendingConsultation(null);
        }
      } catch (err) {
        console.error("Error checking pending payments:", err);
      }
    };

    checkPendingPayments();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('payment_alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `patient_id=eq.${user.id}`,
        },
        () => {
          checkPendingPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!pendingConsultation || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:right-8 md:bottom-8 md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Alert className="relative border-yellow-500/50 bg-slate-900/95 shadow-2xl shadow-yellow-900/20 backdrop-blur-md">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="p-2 bg-yellow-500/10 rounded-full shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="flex-1">
            <AlertTitle className="text-white font-bold mb-1">Pago Pendiente</AlertTitle>
            <AlertDescription className="text-slate-300 text-sm mb-3">
              Tenés una consulta aceptada con <span className="text-yellow-400 font-medium">{pendingConsultation.professionals?.full_name}</span>.
            </AlertDescription>
            
            <Button 
              size="sm" 
              onClick={() => navigate(`/user/confirm-consultation/${pendingConsultation.id}`)}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold transition-colors"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar ${pendingConsultation.consultation_fee}
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default UserPaymentAlert;