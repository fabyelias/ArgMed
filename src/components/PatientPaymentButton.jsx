import React, { useState } from 'react';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { initMercadoPago, Payment as PaymentBrick } from '@mercadopago/sdk-react';
import { toast } from '@/components/ui/use-toast';

// Initialize MercadoPago with test key
initMercadoPago('TEST-0f364d0e-8752-4375-9358-04e93d16331d');

const PatientPaymentButton = ({ consultation, doctor, onPaymentSuccess }) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handlePaymentSubmit = async (paymentData) => {
    setProcessing(true);
    
    try {
      const { token, paymentMethodId, payer } = paymentData.formData;
      
      if (!token) {
        toast({ 
          title: "Error", 
          description: "Datos de pago incompletos.", 
          variant: "destructive" 
        });
        setProcessing(false);
        return Promise.reject();
      }

      // Send payment to external API endpoint
      const response = await fetch('https://srv1180708.hstgr.cloud/api/pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          amount: consultation.consultation_fee,
          doctor_id: consultation.doctor_id,
          consultation_id: consultation.id,
          patient_id: consultation.patient_id,
          payer: {
            email: payer.email || 'patient@example.com'
          },
          description: `Consulta Médica con Dr. ${doctor?.profiles?.full_name || 'Médico'}`
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          title: "Pago Rechazado",
          description: result.error || "Error procesando el pago.",
          variant: "destructive"
        });
        setProcessing(false);
        return Promise.reject();
      }

      toast({
        title: "¡Pago Aprobado!",
        description: "Tu consulta ha sido confirmada.",
        className: "bg-green-600 text-white"
      });

      setPaymentModalOpen(false);
      setProcessing(false);
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }

      return Promise.resolve();

    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error de Conexión",
        description: "No se pudo procesar el pago. Intenta nuevamente.",
        variant: "destructive"
      });
      setProcessing(false);
      return Promise.reject();
    }
  };

  const onError = (error) => {
    console.error("Payment Brick Error:", error);
    toast({ 
      title: "Error", 
      description: "No se pudo cargar el formulario de pago.", 
      variant: "destructive" 
    });
  };

  const onReady = () => {
    console.log("Payment Brick Ready");
  };

  return (
    <>
      <Button 
        onClick={() => setPaymentModalOpen(true)}
        className="bg-[#009EE3] hover:bg-[#008ED0] text-white font-bold shadow-lg transition-transform hover:scale-[1.02] w-full"
        disabled={processing}
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pagar Consulta
          </>
        )}
      </Button>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Pagar Consulta Médica</DialogTitle>
            <DialogDescription className="text-gray-400">
              Dr. {doctor?.profiles?.full_name || 'Médico'} • ${consultation.consultation_fee}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-2 mb-4 text-sm text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-500/30">
              <Lock className="w-4 h-4" />
              <span>Pago seguro procesado por Mercado Pago</span>
            </div>

            <div className="bg-white rounded-xl p-6 text-slate-900">
              <PaymentBrick
                initialization={{ 
                  amount: Number(consultation.consultation_fee) 
                }}
                customization={{
                  paymentMethods: {
                    creditCard: "all",
                    debitCard: "all",
                    ticket: "all",
                    bankTransfer: "all",
                    mercadopago: "all"
                  },
                  visual: {
                    style: {
                      theme: 'default',
                    }
                  }
                }}
                onSubmit={handlePaymentSubmit}
                onReady={onReady}
                onError={onError}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatientPaymentButton;