import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, AlertTriangle, ExternalLink, DollarSign, RefreshCw, Wallet, Info } from 'lucide-react';

const DoctorSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [mpAccount, setMpAccount] = useState(null);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data: account } = await supabase
        .from('mp_professional_accounts')
        .select('*')
        .eq('professional_id', user.id)
        .single();
      setMpAccount(account);

      const { data: priceData } = await supabase
        .from('professional_consultation_prices')
        .select('*')
        .eq('professional_id', user.id)
        .single();
      
      if (priceData) setPrice(priceData.precio_actual);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMP = async () => {
      setProcessing(true);
      try {
          const { data, error } = await supabase.functions.invoke('mp-connect', {
              body: { 
                  action: 'get_auth_url',
                  professional_id: user.id
              }
          });
          
          if (error) throw error;
          if (data?.url) {
              window.location.href = data.url;
          }
      } catch (error) {
          toast({ title: "Error", description: "No se pudo iniciar la conexión", variant: "destructive" });
          setProcessing(false);
      }
  };

  const handleSavePrice = async () => {
      const numPrice = Number(price);
      if (numPrice < 5000 || numPrice > 25000) {
          toast({
              title: "Precio Inválido",
              description: "El precio de la consulta debe estar entre $5,000 y $25,000 ARS.",
              variant: "destructive"
          });
          return;
      }

      setProcessing(true);
      try {
          const upsertData = {
              professional_id: user.id,
              precio_actual: numPrice,
              precio_minimo: 5000,
              precio_maximo: 25000,
              updated_at: new Date().toISOString()
          };
          
          const { error } = await supabase
              .from('professional_consultation_prices')
              .upsert(upsertData, { onConflict: 'professional_id' });

          if (error) throw error;
          
          await supabase.from('professionals').update({ consultation_fee: numPrice }).eq('id', user.id);

          toast({ title: "Precio Actualizado", className: "bg-green-600 text-white" });
          fetchSettings();
      } catch (error) {
          toast({ title: "Error", description: "No se pudo guardar el precio.", variant: "destructive" });
      } finally {
          setProcessing(false);
      }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="animate-spin text-cyan-400 w-8 h-8" /></div>;

  return (
    <div className="max-w-5xl mx-auto pb-12 p-6 space-y-8">
      <h1 className="text-3xl font-bold text-white mb-8">Configuración de Pagos</h1>

      <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                      <Wallet className="text-blue-400" /> Mercado Pago Connect
                  </CardTitle>
                  <CardDescription>Vincula tu cuenta para recibir el 90% de cada consulta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  {mpAccount?.access_token ? (
                      <div className="bg-green-900/20 border border-green-900/50 p-6 rounded-xl text-center">
                          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                          <h3 className="text-green-400 font-bold text-lg">Cuenta Vinculada</h3>
                          <p className="text-gray-400 text-sm mt-2">MP User ID: {mpAccount.user_id_mp}</p>
                          <p className="text-gray-500 text-xs mt-1">Conectado el: {new Date(mpAccount.created_at).toLocaleDateString()}</p>
                          <Button variant="outline" className="mt-4 border-slate-700 text-gray-400 hover:text-white" onClick={handleConnectMP} disabled={processing}>
                             <RefreshCw className="w-4 h-4 mr-2" /> Reconectar / Actualizar
                          </Button>
                      </div>
                  ) : (
                      <div className="bg-slate-950 p-6 rounded-xl text-center border border-slate-800 border-dashed">
                          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                          <h3 className="text-white font-bold">Requiere Vinculación</h3>
                          <p className="text-gray-400 text-sm mt-2 mb-6">Para cobrar consultas, debes autorizar a ArgMed en Mercado Pago.</p>
                          <Button onClick={handleConnectMP} disabled={processing} className="bg-[#009EE3] hover:bg-[#008ED0] text-white w-full font-bold h-12 transition-all">
                              {processing ? <Loader2 className="animate-spin mr-2" /> : <ExternalLink className="mr-2 w-4 h-4" />}
                              Vincular Mercado Pago
                          </Button>
                      </div>
                  )}
              </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="text-green-400" /> Tarifa de Consulta
                  </CardTitle>
                  <CardDescription>Define tus honorarios (rango obligatorio: $5.000 - $25.000).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-2">
                      <Label className="text-gray-400">Valor por Consulta (ARS)</Label>
                      <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <Input 
                              type="number" 
                              value={price} 
                              onChange={(e) => setPrice(e.target.value)} 
                              className="bg-slate-950 border-slate-700 pl-8 text-white font-mono text-lg"
                          />
                      </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Cobras (90%)</span>
                          <span className="text-green-400 font-bold">${(price * 0.9).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Comisión ArgMed (10%)</span>
                          <span className="text-blue-400 font-bold">${(price * 0.1).toFixed(2)}</span>
                      </div>
                  </div>

                  <Button onClick={handleSavePrice} disabled={processing} className="w-full bg-green-600 hover:bg-green-700">
                      {processing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 w-4 h-4" />}
                      Guardar Configuración
                  </Button>
              </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default DoctorSettings;