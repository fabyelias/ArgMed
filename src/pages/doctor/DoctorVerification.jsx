import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, AlertTriangle, Shield, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const DoctorVerification = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [rejectionReason, setRejectionReason] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
      national_license: '',
      provincial_license: '',
  });
  
  const [files, setFiles] = useState({
      title_document: null,
      dni_front: null,
      dni_back: null
  });

  useEffect(() => {
      checkStatus();
  }, [user]);

  const checkStatus = async () => {
      if (!user) return;
      
      const { data: profData } = await supabase.from('professionals').select('verification_status').eq('id', user.id).single();
      
      if (profData?.verification_status === 'approved') {
          navigate('/professional/dashboard');
          return;
      }

      const { data: docs } = await supabase
        .from('professional_documents')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();

      if (docs) {
          setStatus(docs.status);
          if (docs.status === 'rejected') {
              setRejectionReason(docs.rejection_reason);
          }
          setFormData({
              national_license: docs.national_license || '',
              provincial_license: docs.provincial_license || ''
          });
      } else {
          setStatus('pending');
      }
  };

  const handleFileChange = (e, type) => {
      if (e.target.files && e.target.files[0]) {
          setFiles(prev => ({ ...prev, [type]: e.target.files[0] }));
      }
  };

  const uploadFile = async (file, path) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${path}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('doctor-documents').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('doctor-documents').getPublicUrl(fileName);
      return data.publicUrl;
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setUploading(true);

      try {
          if (!files.title_document || !files.dni_front || !files.dni_back) {
              throw new Error("Por favor sube todos los archivos requeridos.");
          }

          const titleUrl = await uploadFile(files.title_document, 'title');
          const dniFrontUrl = await uploadFile(files.dni_front, 'dni_front');
          const dniBackUrl = await uploadFile(files.dni_back, 'dni_back');

          const payload = {
              professional_id: user.id,
              national_license: formData.national_license,
              provincial_license: formData.provincial_license,
              title_document: titleUrl,
              dni_front: dniFrontUrl,
              dni_back: dniBackUrl,
              status: 'submitted',
              rejection_reason: null
          };
          
          const { data: existing } = await supabase.from('professional_documents').select('id').eq('professional_id', user.id).maybeSingle();
          
          let error;
          if (existing) {
              const { error: upError } = await supabase.from('professional_documents').update(payload).eq('id', existing.id);
              error = upError;
          } else {
              const { error: inError } = await supabase.from('professional_documents').insert(payload);
              error = inError;
          }

          if (error) throw error;

          await supabase.from('professionals').update({ verification_status: 'submitted' }).eq('id', user.id);

          setStatus('submitted');
          toast({ title: "Documentación Enviada", description: "El equipo legal revisará tus documentos.", className: "bg-green-600 text-white" });

      } catch (err) {
          console.error(err);
          toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
          setUploading(false);
      }
  };

  if (status === 'loading') return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4">
            <Button variant="ghost" onClick={logout} className="text-gray-400 hover:text-white">Cerrar Sesión</Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
            <div className="text-center mb-8">
                <Shield className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Verificación Profesional</h1>
                <p className="text-gray-400">Para garantizar la seguridad en nuestra plataforma de comunicación, necesitamos validar tu identidad y credenciales profesionales.</p>
            </div>

            {status === 'submitted' ? (
                <Card className="bg-slate-900 border-cyan-500/30 text-center py-12">
                    <CardContent>
                        <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin-slow" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">En Revisión</h2>
                        <p className="text-gray-400 max-w-md mx-auto">Tu documentación ha sido enviada y está siendo revisada por nuestro equipo legal. Te notificaremos cuando tu cuenta sea activada para ofrecer videollamadas.</p>
                        <Button onClick={() => window.location.reload()} variant="outline" className="mt-8 border-slate-700 text-cyan-400">
                            Comprobar Estado
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Subir Credenciales</CardTitle>
                        <CardDescription>
                            {status === 'rejected' && (
                                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg mb-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-red-400">Documentación Rechazada</p>
                                        <p className="text-sm text-red-300 mt-1">{rejectionReason}</p>
                                    </div>
                                </div>
                            )}
                            Completa los datos de tu matrícula profesional para operar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-300 mb-1.5 block">Matrícula Nacional</Label>
                                    <Input 
                                        value={formData.national_license}
                                        onChange={(e) => setFormData({...formData, national_license: e.target.value})}
                                        placeholder="MN-123456"
                                        className="bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300 mb-1.5 block">Matrícula Provincial</Label>
                                    <Input 
                                        value={formData.provincial_license}
                                        onChange={(e) => setFormData({...formData, provincial_license: e.target.value})}
                                        placeholder="MP-123456"
                                        className="bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="border border-dashed border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors bg-slate-950/50">
                                    <Label className="text-white mb-2 block font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-500"/> Título Profesional (Frente)</Label>
                                    <Input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'title_document')} className="bg-transparent border-none text-gray-400 file:text-cyan-400 file:bg-cyan-950 file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-cyan-900 cursor-pointer" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-dashed border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors bg-slate-950/50">
                                        <Label className="text-white mb-2 block font-bold">DNI (Frente)</Label>
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'dni_front')} className="bg-transparent border-none text-gray-400 file:text-cyan-400 file:bg-cyan-950 file:border-0 file:rounded-md file:px-4 file:py-1" />
                                    </div>
                                    <div className="border border-dashed border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors bg-slate-950/50">
                                        <Label className="text-white mb-2 block font-bold">DNI (Dorso)</Label>
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'dni_back')} className="bg-transparent border-none text-gray-400 file:text-cyan-400 file:bg-cyan-950 file:border-0 file:rounded-md file:px-4 file:py-1" />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 py-6 text-lg font-bold shadow-lg shadow-cyan-900/20" disabled={uploading}>
                                {uploading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Subiendo...</> : <><Upload className="w-5 h-5 mr-2" /> Enviar para Revisión</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </motion.div>
    </div>
  );
};

export default DoctorVerification;