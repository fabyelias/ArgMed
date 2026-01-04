import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, FileText, CreditCard, ShieldCheck,
  Upload, Loader2, RefreshCw, ExternalLink, FileCheck, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { initMercadoPago } from '@mercadopago/sdk-react';
import TermsAndConditions from '@/components/TermsAndConditions';
import { processImageFile } from '@/lib/imageCompression';

const ProfessionalOnboarding = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0); // Changed to 0-indexed: 0=Terms, 1=Docs, 2=MP
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mpProcessing, setMpProcessing] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  // Data State
  const [documents, setDocuments] = useState(null);
  const [mpAccount, setMpAccount] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending');

  // Terms State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Form State for Documents
  const [docForm, setDocForm] = useState({
    national_license: '',
    provincial_license: ''
  });

  // File objects for upload
  const [docFiles, setDocFiles] = useState({
    title_document: null,
    dni_front: null,
    dni_back: null
  });

  useEffect(() => {
    const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    if (mpPublicKey) {
      initMercadoPago(mpPublicKey, { locale: 'es-AR' });
    }
  }, []);

  useEffect(() => {
    if (user) {
      checkProgress(true);
    }
  }, [user]);

  const checkProgress = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad) setInitialLoading(true);

      // 1. Fetch Professional Status
      let { data: prof, error: profError } = await supabase
        .from('professionals')
        .select('verification_status')
        .eq('id', user.id)
        .maybeSingle();

      if (profError) throw profError;

      const status = prof?.verification_status || 'pending';
      setVerificationStatus(status);

      // 2. If already approved, redirect to dashboard immediately
      if (status === 'approved') {
        navigate('/professional/dashboard');
        return;
      }

      // 3. Fetch Documents
      const { data: docs, error: docsError } = await supabase
        .from('professional_documents')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();

      if (docsError && docsError.code !== 'PGRST116') throw docsError;

      setDocuments(docs);
      if (docs) {
        setDocForm({
          national_license: docs.national_license || '',
          provincial_license: docs.provincial_license || ''
        });
        setTermsAccepted(docs.terms_accepted || false);
      }

      // 4. Fetch Mercado Pago
      const { data: mp, error: mpError } = await supabase
        .from('mp_professional_accounts')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();

      if (mpError && mpError.code !== 'PGRST116') throw mpError;

      setMpAccount(mp);

      // --- STEP LOGIC ---
      // Step 0: Terms
      // Step 1: Documents
      // Step 2: Mercado Pago
      // Once all complete → Auto-approve and redirect

      const termsOk = docs?.terms_accepted || false;
      const docsOk = docs && docs.title_document && docs.dni_front && docs.dni_back;
      const mpOk = mp && (mp.access_token || mp.user_id_mp);

      if (!termsOk) {
        setCurrentStep(0); // Terms step
      } else if (!docsOk) {
        setCurrentStep(1); // Documents step
      } else if (!mpOk) {
        setCurrentStep(2); // Mercado Pago step
      } else {
        // ALL COMPLETE → Auto-approve and redirect
        await autoApprove();
      }

    } catch (error) {
      console.error("Onboarding check error:", error);
    } finally {
      if (isFirstLoad) setInitialLoading(false);
    }
  };

  const autoApprove = async () => {
    try {
      // Update professional status to approved automatically
      const { error } = await supabase
        .from('professionals')
        .update({
          verification_status: 'approved',
          is_active: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "¡Cuenta activada!",
        description: "Tu perfil profesional ha sido aprobado. Redirigiendo al dashboard...",
        className: "bg-green-600 text-white"
      });

      // Small delay for user to see the message
      setTimeout(() => {
        navigate('/professional/dashboard');
      }, 1500);

    } catch (error) {
      console.error("Auto-approval error:", error);
      toast({
        title: "Error al activar cuenta",
        description: "Hubo un problema. Intenta recargar la página.",
        variant: "destructive"
      });
    }
  };

  const acceptTerms = async () => {
    try {
      if (!termsAccepted) {
        toast({
          title: "Términos requeridos",
          description: "Debes aceptar los términos y condiciones para continuar.",
          variant: "destructive"
        });
        setShowTermsModal(true);
        return;
      }

      // Ensure professional record exists
      await ensureProfessionalRecordExists();

      // Check if documents record exists
      const { data: existingDocs } = await supabase
        .from('professional_documents')
        .select('id')
        .eq('professional_id', user.id)
        .maybeSingle();

      const payload = {
        professional_id: user.id,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString()
      };

      if (existingDocs) {
        await supabase
          .from('professional_documents')
          .update(payload)
          .eq('id', existingDocs.id);
      } else {
        await supabase
          .from('professional_documents')
          .insert(payload);
      }

      toast({
        title: "Términos aceptados",
        description: "Ahora puedes continuar con la documentación.",
        className: "bg-green-600 text-white"
      });

      await checkProgress(false);

    } catch (error) {
      console.error("Terms acceptance error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los términos.",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Process and validate the file
      const result = await processImageFile(file);

      if (!result.valid) {
        toast({
          title: "Archivo inválido",
          description: result.error,
          variant: "destructive"
        });
        // Clear the input
        e.target.value = '';
        return;
      }

      // Use the processed (compressed) file
      setDocFiles(prev => ({ ...prev, [key]: result.file }));

      toast({
        title: "Archivo cargado",
        description: `${file.name} listo para subir`,
        className: "bg-green-600 text-white"
      });
    } catch (error) {
      console.error("File handling error:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo",
        variant: "destructive"
      });
      e.target.value = '';
    }
  };

  const uploadFileToStorage = async (file, path) => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${path}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Retry logic for network failures
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const { error } = await supabase.storage
          .from('doctor-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data } = supabase.storage
          .from('doctor-documents')
          .getPublicUrl(fileName);

        return data.publicUrl;
      } catch (error) {
        lastError = error;
        retries--;

        if (retries > 0) {
          console.log(`Upload failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }
    }

    throw lastError;
  };

  const ensureProfessionalRecordExists = async () => {
    const { data: existingProf, error: checkError } = await supabase
      .from('professionals')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking professional existence:", checkError);
      throw new Error("Error verificando cuenta profesional. Por favor, recarga la página.");
    }

    if (!existingProf) {
      console.log("Professional record missing. Creating now...");

      const { error: createError } = await supabase
        .from('professionals')
        .insert({
          id: user.id,
          profile_id: user.id,
          email: user.email,
          professional_type: user.professional_type || 'General',
          specialization: user.specialization || 'General',
          is_active: false,
          verification_status: 'pending',
          license_number: '',
          consultation_fee: 5000 // Default consultation fee (minimum allowed by DB constraint)
        });

      if (createError) {
        console.error("Error creating professional record:", createError);
        throw new Error(`No se pudo inicializar el perfil profesional. Error: ${createError.message}`);
      }

      const { data: doubleCheck } = await supabase
        .from('professionals')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!doubleCheck) {
         throw new Error("Error de sincronización. El perfil profesional no se creó correctamente.");
      }
    }
  };

  const submitDocuments = async () => {
    setUploading(true);
    setUploadProgress(0);
    setNetworkError(false);

    try {
      // Validate inputs
      if (!documents && (!docFiles.title_document || !docFiles.dni_front || !docFiles.dni_back)) {
        throw new Error("Debes subir todos los archivos requeridos (Título/Diploma, DNI Frente y Dorso).");
      }

      if (!docForm.national_license && !docForm.provincial_license) {
        throw new Error("Debes ingresar al menos un número de matrícula (Nacional o Provincial).");
      }

      setUploadProgress(10);
      await ensureProfessionalRecordExists();

      setUploadProgress(20);

      // Upload files with progress tracking
      let titleUrl = documents?.title_document;
      let dniFrontUrl = documents?.dni_front;
      let dniBackUrl = documents?.dni_back;

      const totalFiles = [docFiles.title_document, docFiles.dni_front, docFiles.dni_back].filter(Boolean).length;
      let uploadedFiles = 0;

      if (docFiles.title_document) {
        titleUrl = await uploadFileToStorage(docFiles.title_document, 'title');
        uploadedFiles++;
        setUploadProgress(20 + (uploadedFiles / totalFiles) * 60);
      }

      if (docFiles.dni_front) {
        dniFrontUrl = await uploadFileToStorage(docFiles.dni_front, 'dni_front');
        uploadedFiles++;
        setUploadProgress(20 + (uploadedFiles / totalFiles) * 60);
      }

      if (docFiles.dni_back) {
        dniBackUrl = await uploadFileToStorage(docFiles.dni_back, 'dni_back');
        uploadedFiles++;
        setUploadProgress(20 + (uploadedFiles / totalFiles) * 60);
      }

      if (!titleUrl || !dniFrontUrl || !dniBackUrl) {
         throw new Error("Error al procesar los archivos. Inténtalo de nuevo.");
      }

      setUploadProgress(85);

      const payload = {
        professional_id: user.id,
        national_license: docForm.national_license,
        provincial_license: docForm.provincial_license,
        title_document: titleUrl,
        dni_front: dniFrontUrl,
        dni_back: dniBackUrl,
        status: 'submitted',
        terms_accepted: termsAccepted,
        updated_at: new Date().toISOString()
      };

      const { data: existingDocs } = await supabase
        .from('professional_documents')
        .select('id')
        .eq('professional_id', user.id)
        .maybeSingle();

      if (existingDocs) {
        const { error: updateError } = await supabase
          .from('professional_documents')
          .update(payload)
          .eq('id', existingDocs.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('professional_documents')
          .insert(payload);
        if (insertError) throw insertError;
      }

      setUploadProgress(95);

      // Update professional license number
      await supabase
        .from('professionals')
        .update({
          license_number: docForm.national_license || docForm.provincial_license,
          verification_status: 'submitted'
        })
        .eq('id', user.id);

      setUploadProgress(100);

      toast({
        title: "Documentos enviados",
        description: "Tus documentos se han guardado correctamente.",
        className: "bg-green-600 text-white"
      });

      // Wait for database to sync, then check progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkProgress(false);

    } catch (error) {
      console.error("Submit documents error:", error);
      setNetworkError(true);

      let errorMessage = error.message || "Error desconocido";

      // Detect network errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = "Error de conexión. Verifica tu internet e intenta nuevamente.";
      }

      toast({
        title: "Error al subir documentos",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const connectMercadoPago = async () => {
    setMpProcessing(true);
    try {
        const redirectUri = 'https://argmed.online/api/auth/callback';

        const { data, error } = await supabase.functions.invoke('mp-connect', {
            body: {
                action: 'get_auth_url',
                professional_id: user.id,
                redirect_uri: redirectUri
            }
        });

        if (error) throw error;

        if (data?.url) {
            window.location.href = data.url;
        } else {
            throw new Error('No se recibió la URL de autorización.');
        }
    } catch (error) {
        console.error("MP Connection Error:", error);
        toast({
            title: "Error de Conexión",
            description: "No se pudo iniciar la conexión con Mercado Pago.",
            variant: "destructive"
        });
    } finally {
        setMpProcessing(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col">
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck className="text-white w-6 h-6" />
           </div>
           <div>
             <h1 className="text-xl font-bold text-white">Alta Profesional</h1>
             <p className="text-sm text-gray-400">Completa los pasos para activar tu cuenta</p>
           </div>
        </div>
        <Button variant="ghost" onClick={logout} className="text-gray-500 hover:text-white self-start md:self-auto">Cerrar Sesión</Button>
      </div>

      {/* Steps Indicator */}
      <div className="max-w-4xl mx-auto w-full mb-8">
        <div className="flex items-center justify-between relative px-2">
           <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 translate-y-[-50%]"></div>

           {[0, 1, 2].map((step) => {
             const isActive = step === currentStep;
             const isDone = step < currentStep;
             return (
               <div key={step} className="flex flex-col items-center gap-2 bg-slate-950 px-2 sm:px-4">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg border-2 transition-all ${
                    isActive ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' :
                    isDone ? 'border-green-500 bg-green-500 text-white' : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}>
                    {isDone ? <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : step + 1}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-medium text-center hidden sm:block ${isActive ? 'text-cyan-400' : isDone ? 'text-green-500' : 'text-gray-600'}`}>
                    {step === 0 && "Términos"}
                    {step === 1 && "Documentación"}
                    {step === 2 && "Mercado Pago"}
                  </span>
               </div>
             );
           })}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-2xl mx-auto w-full flex-1 pb-10">

        {/* STEP 0: TERMS & CONDITIONS */}
        {currentStep === 0 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <FileCheck className="w-8 h-8 text-cyan-400" />
              </div>
              <CardTitle className="text-white text-2xl">Términos y Condiciones</CardTitle>
              <CardDescription>
                Antes de continuar, debes aceptar nuestros términos de uso y política de privacidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Alert className="bg-slate-950 border-cyan-500/30">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <AlertTitle className="text-white">Importante</AlertTitle>
                  <AlertDescription className="text-gray-400">
                    Al aceptar estos términos, confirmas que eres un profesional habilitado y que cumples con todas las regulaciones aplicables a tu profesión.
                  </AlertDescription>
               </Alert>

               <div className="flex items-start space-x-3 p-4 bg-slate-950 rounded-lg border border-slate-800">
                  <Checkbox
                    id="terms-onboarding"
                    checked={termsAccepted}
                    onCheckedChange={setTermsAccepted}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none flex-1">
                     <Label
                        htmlFor="terms-onboarding"
                        className="text-sm font-medium leading-relaxed text-gray-300 cursor-pointer"
                     >
                        He leído y acepto los{' '}
                        <span
                          className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                          onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                        >
                          Términos y Condiciones, Política de Privacidad y Descargos de Responsabilidad
                        </span>
                     </Label>
                  </div>
               </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={acceptTerms}
                disabled={!termsAccepted}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12"
              >
                <CheckCircle className="mr-2 w-4 h-4" />
                Aceptar y Continuar
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 1: DOCUMENTS */}
        {currentStep === 1 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="text-cyan-500" /> Carga de Credenciales
              </CardTitle>
              <CardDescription>Sube fotos claras de tu DNI, Matrícula y Título/Diploma profesional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Matrícula Nacional</Label>
                  <Input
                    value={docForm.national_license}
                    onChange={(e) => setDocForm({...docForm, national_license: e.target.value})}
                    placeholder="Ej: MN 123456"
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Matrícula Provincial</Label>
                  <Input
                    value={docForm.provincial_license}
                    onChange={(e) => setDocForm({...docForm, provincial_license: e.target.value})}
                    placeholder="Ej: MP 98765"
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Ingresa al menos una matrícula (Nacional o Provincial)</p>

              <div className="space-y-4">
                 <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                    <Label className="block mb-2 text-cyan-400 font-bold">Título / Diploma / Credencial (Foto)</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'title_document')} className="bg-transparent border-0 file:bg-cyan-900 file:text-cyan-400 file:border-0 file:rounded-md cursor-pointer text-sm" />
                    {documents?.title_document && !docFiles.title_document && <p className="text-xs text-green-500 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Archivo cargado previamente</p>}
                    {docFiles.title_document && <p className="text-xs text-blue-400 mt-1 flex items-center"><Upload className="w-3 h-3 mr-1"/> {docFiles.title_document.name}</p>}
                 </div>
                 <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                    <Label className="block mb-2 text-white font-bold">DNI (Frente)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'dni_front')} className="bg-transparent border-0 file:bg-slate-800 file:text-white file:border-0 file:rounded-md cursor-pointer text-sm" />
                    {documents?.dni_front && !docFiles.dni_front && <p className="text-xs text-green-500 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Archivo cargado previamente</p>}
                    {docFiles.dni_front && <p className="text-xs text-blue-400 mt-1 flex items-center"><Upload className="w-3 h-3 mr-1"/> {docFiles.dni_front.name}</p>}
                 </div>
                 <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                    <Label className="block mb-2 text-white font-bold">DNI (Dorso)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'dni_back')} className="bg-transparent border-0 file:bg-slate-800 file:text-white file:border-0 file:rounded-md cursor-pointer text-sm" />
                    {documents?.dni_back && !docFiles.dni_back && <p className="text-xs text-green-500 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Archivo cargado previamente</p>}
                    {docFiles.dni_back && <p className="text-xs text-blue-400 mt-1 flex items-center"><Upload className="w-3 h-3 mr-1"/> {docFiles.dni_back.name}</p>}
                 </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {uploading && uploadProgress > 0 && (
                <div className="w-full space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-gray-400">
                    Subiendo archivos... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
              {networkError && (
                <Alert className="bg-red-900/20 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertTitle className="text-red-400">Error de conexión</AlertTitle>
                  <AlertDescription className="text-gray-300 text-xs">
                    Verifica tu conexión a internet e intenta nuevamente.
                  </AlertDescription>
                </Alert>
              )}
              <Button onClick={submitDocuments} disabled={uploading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12">
                {uploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 w-4 h-4" />}
                {uploading ? 'Subiendo...' : 'Guardar y Continuar'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: MERCADO PAGO */}
        {currentStep === 2 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CreditCard className="w-8 h-8 text-blue-400" />
              </div>
              <CardTitle className="text-white text-2xl">Conectar Cobros</CardTitle>
              <CardDescription>
                Vincula tu cuenta de Mercado Pago para recibir el dinero de tus consultas automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-white font-bold text-sm mb-2">Beneficios:</h4>
                  <ul className="text-gray-400 text-sm space-y-2">
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Cobro inmediato post-consulta</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Sin intermediarios manuales</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Seguridad bancaria garantizada</li>
                  </ul>
               </div>

               <Alert className="bg-green-900/20 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertTitle className="text-green-400">Último paso</AlertTitle>
                  <AlertDescription className="text-gray-300">
                    Una vez conectes tu cuenta de Mercado Pago, tu perfil se activará automáticamente y podrás comenzar a recibir consultas.
                  </AlertDescription>
               </Alert>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button onClick={connectMercadoPago} disabled={mpProcessing} className="w-full bg-[#009EE3] hover:bg-[#008ED0] text-white font-bold h-12">
                {mpProcessing ? <Loader2 className="animate-spin mr-2" /> : <ExternalLink className="mr-2 w-4 h-4" />}
                Vincular Mercado Pago Ahora
              </Button>
               <Button variant="ghost" onClick={() => checkProgress(false)} className="text-xs text-gray-500">
                <RefreshCw className="w-3 h-3 mr-2" /> He completado la vinculación
              </Button>
              <Button
                variant="outline"
                onClick={autoApprove}
                className="w-full border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white text-xs"
              >
                Omitir por ahora y activar cuenta
              </Button>
            </CardFooter>
          </Card>
        )}

      </div>

      {/* Terms Modal */}
      <TermsAndConditions
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
        onAccept={() => setTermsAccepted(true)}
      />
    </div>
  );
};

export default ProfessionalOnboarding;
