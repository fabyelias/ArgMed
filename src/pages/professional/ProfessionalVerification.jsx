import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Upload, AlertTriangle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ProfessionalVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState(null);
  const [status, setStatus] = useState('pending'); // pending, submitted, approved, rejected

  useEffect(() => {
    if (user) {
      fetchVerificationStatus();
    }
  }, [user]);

  const fetchVerificationStatus = async () => {
    try {
      // Updated to professional_documents and professional_id
      const { data, error } = await supabase
        .from('professional_documents')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();

      if (data) {
        setDocuments(data);
        setStatus(data.status || 'pending');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Note: Storage bucket name remains 'doctor-documents' unless renamed in Supabase Storage directly, 
      // but db record goes to 'professional_documents'
      const { error: uploadError } = await supabase.storage
        .from('doctor-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('doctor-documents')
        .getPublicUrl(filePath);

      const updateData = {
        professional_id: user.id, // Updated column name
        [type]: publicUrl,
        status: 'pending',
        updated_at: new Date().toISOString()
      };

      // Updated to professional_documents
      const { data: existing } = await supabase
        .from('professional_documents')
        .select('id')
        .eq('professional_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('professional_documents')
          .update(updateData)
          .eq('professional_id', user.id);
      } else {
        await supabase
          .from('professional_documents')
          .insert({ ...updateData, created_at: new Date().toISOString() });
      }

      toast({
        title: "Documento subido",
        description: "El archivo se ha cargado correctamente.",
        className: "bg-green-600 text-white"
      });

      fetchVerificationStatus();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Verificación Profesional</h1>
          <p className="text-gray-400">
            Para activar tu cuenta y recibir consultas, necesitamos validar tu identidad y matrícula profesional.
          </p>
        </div>

        {status === 'approved' ? (
          <Alert className="bg-green-900/20 border-green-500 mb-8">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-green-500 font-bold">¡Cuenta Verificada!</AlertTitle>
            <AlertDescription className="text-green-200">
              Tu documentación ha sido aprobada. Ya puedes recibir consultas.
              <Button 
                variant="link" 
                className="text-white underline pl-2"
                onClick={() => navigate('/professional')}
              >
                Ir al Panel
              </Button>
            </AlertDescription>
          </Alert>
        ) : status === 'rejected' ? (
          <Alert className="bg-red-900/20 border-red-500 mb-8">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertTitle className="text-red-500 font-bold">Documentación Rechazada</AlertTitle>
            <AlertDescription className="text-red-200">
              {documents?.rejection_reason || "Hubo un problema con tus documentos. Por favor, revísalos y vuelve a subirlos."}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-yellow-900/20 border-yellow-500 mb-8">
            <ShieldCheck className="h-5 w-5 text-yellow-500" />
            <AlertTitle className="text-yellow-500 font-bold">En Revisión / Pendiente</AlertTitle>
            <AlertDescription className="text-yellow-200">
              Sube los documentos requeridos. Nuestro equipo legal los revisará en 24-48hs.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* DNI Front */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-500" /> DNI (Frente)
                </h3>
                <p className="text-sm text-gray-400">Foto clara del frente de tu documento.</p>
              </div>
              {documents?.dni_front && <CheckCircle className="text-green-500 w-6 h-6" />}
            </div>
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'dni_front')}
                disabled={uploading || status === 'approved'}
                className="bg-slate-950 border-slate-700 text-gray-300"
              />
              {uploading && <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />}
            </div>
            {documents?.dni_front && (
              <div className="mt-2">
                <a href={documents.dni_front} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline">Ver archivo subido</a>
              </div>
            )}
          </div>

          {/* DNI Back */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-500" /> DNI (Dorso)
                </h3>
                <p className="text-sm text-gray-400">Foto clara del dorso de tu documento.</p>
              </div>
              {documents?.dni_back && <CheckCircle className="text-green-500 w-6 h-6" />}
            </div>
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'dni_back')}
                disabled={uploading || status === 'approved'}
                className="bg-slate-950 border-slate-700 text-gray-300"
              />
            </div>
             {documents?.dni_back && (
              <div className="mt-2">
                <a href={documents.dni_back} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline">Ver archivo subido</a>
              </div>
            )}
          </div>

          {/* Matrícula */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-500" /> Matrícula Nacional / Provincial
                </h3>
                <p className="text-sm text-gray-400">Credencial o certificado de matrícula vigente.</p>
              </div>
              {documents?.national_license && <CheckCircle className="text-green-500 w-6 h-6" />}
            </div>
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'national_license')}
                disabled={uploading || status === 'approved'}
                className="bg-slate-950 border-slate-700 text-gray-300"
              />
            </div>
             {documents?.national_license && (
              <div className="mt-2">
                <a href={documents.national_license} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline">Ver archivo subido</a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={() => navigate('/professional')} 
            variant="outline" 
            className="border-slate-700 text-white hover:bg-slate-800"
          >
            Volver al Panel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalVerification;