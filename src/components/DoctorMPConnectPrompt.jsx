import React, { useState, useEffect } from 'react';
import { AlertTriangle, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const DoctorMPConnectPrompt = () => {
  const { user } = useAuth();
  const [mpConnected, setMpConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMPConnection();
  }, [user]);

  const checkMPConnection = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('mp_professional_accounts')
        .select('access_token')
        .eq('professional_id', user.id)
        .single();
      
      setMpConnected(!!data?.access_token);
    } catch (error) {
      console.error("Error checking MP connection:", error);
      setMpConnected(false);
    } finally {
      setChecking(false);
    }
  };

  const handleConnectMP = async () => {
    setLoading(true);
    try {
      const redirectUri = 'https://argmed.online/api/auth/callback';
      
      const { data, error } = await supabase.functions.invoke('mp-connect', {
        body: { 
          action: 'get_auth_url',
          doctor_id: user.id,
          redirect_uri: redirectUri
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No URL returned from service");
      }
    } catch (error) {
      console.error("Error initiating MP connection:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo iniciar la conexión con Mercado Pago. Intente nuevamente.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Verificando conexión...</p>
      </div>
    );
  }

  if (mpConnected) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-cyan-500/50 rounded-2xl p-6 mb-6 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-yellow-500/20 rounded-full">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">
            Conectá tu cuenta de Mercado Pago
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            Para recibir pagos de tus consultas, necesitas vincular tu cuenta de Mercado Pago.
            Esto te permite cobrar de forma segura y automática.
          </p>
          <Button 
            onClick={handleConnectMP}
            disabled={loading}
            className="bg-[#009EE3] hover:bg-[#008ED0] text-white font-bold shadow-lg shadow-cyan-900/30 transition-all hover:scale-[1.02]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            {loading ? "Iniciando..." : "Conectar con Mercado Pago"}
            {!loading && <ExternalLink className="w-3 h-3 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DoctorMPConnectPrompt;