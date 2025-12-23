import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, FileText, CreditCard, ShieldCheck, 
  Upload, Loader2, AlertTriangle, RefreshCw, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { initMercadoPago } from '@mercadopago/sdk-react';

const ProfessionalOnboarding = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Changed from generic loading to initialLoading to prevent full DOM unmounts during updates
  const [initialLoading, setInitialLoading] = useState(true); 
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [mpProcessing, setMpProcessing] = useState(false);

  // Data State
  const [documents, setDocuments] = useState(null);
  const [mpAccount, setMpAccount] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending');

  // Form State for Step 1
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
    // 1) Initialize Mercado Pago SDK
    const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    if (mpPublicKey) {
      initMercadoPago(mpPublicKey, { locale: 'es-AR' });
    }
  }, []);

  useEffect(() => {
    if (user) {
      checkProgress(true); // true = isFirstLoad
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

      // If professional record is missing (rare but possible if trigger failed), handle it gracefully
      // We don't create it here, we create it on submit to ensure we have data. 
      // Just assume pending if missing.
      const status = prof?.verification_status || 'pending';
      setVerificationStatus(status);

      // 2. Fetch Documents
      const { data: docs, error: docsError } = await supabase
        .from('professional_documents')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();
      
      if (docsError && docsError.code !== 'PGRST116') throw docsError; // Ignore not found error
      
      setDocuments(docs);
      if (docs) {
        setDocForm({
          national_license: docs.national_license || '',
          provincial_license: docs.provincial_license || ''
        });
      }

      // 3. Fetch Mercado Pago
      const { data: mp, error: mpError } = await supabase
        .from('mp_professional_accounts')
        .select('*')
        .eq('professional_id', user.id)
        .maybeSingle();
        
      if (mpError && mpError.code !== 'PGRST116') throw mpError;
      
      setMpAccount(mp);

      // --- STEP LOGIC ---
      
      // If approved, go to dashboard
      if (status === 'approved') {
        navigate('/professional/dashboard');
        return;
      }

      const docsOk = docs && docs.status !== 'rejected' && docs.title_document && docs.dni_front && docs.dni_back;
      // We check if we have a token or a user_id_mp
      const mpOk = mp && (mp.access_token || mp.user_id_mp);

      if (!docsOk) {
        setCurrentStep(1);
      } else if (!mpOk) {
        setCurrentStep(2);
      } else {
        // If both Docs and MP are OK, we are in Approval Wait state
        setCurrentStep(3);
      }

    } catch (error) {
      console.error("Onboarding check error:", error);
    } finally {
      if (isFirstLoad) setInitialLoading(false);
    }
  };

  const handleFileUpload = (e, key) => {
    if (e.target.files?.[0]) {
      setDocFiles(prev => ({ ...prev, [key]: e.target.files[0] }));
    }
  };

  const uploadFileToStorage = async (file, path) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    // Unique filename to avoid conflicts (removed upsert requirement)
    const fileName = `${user.id}/${path}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // REMOVED upsert: true as requested to prevent conflicts
    const { error } = await supabase.storage.from('doctor-documents').upload(fileName, file);
    
    if (error) throw error;
    
    // Get public URL
    const { data } = supabase.storage.from('doctor-documents').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const ensureProfessionalRecordExists = async () => {
    // 1. Check if professional record exists
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
      
      // 2. Create the record if it doesn't exist. 
      // CRITICAL: We MUST include profile_id as it is a required Foreign Key.
      const { error: createError } = await supabase
        .from('professionals')
        .insert({
          id: user.id,
          profile_id: user.id, // VITAL: Required foreign key
          specialization: user.user_metadata?.specialization || 'General', 
          is_active: false,
          verification_status: 'pending',
          license_number: '', // Explicit empty default
          consultation_fee: 0 // Explicit numeric default
        });
      
      if (createError) {
        console.error("Error creating professional record:", createError);
        throw new Error(`No se pudo inicializar el perfil profesional. Error: ${createError.message}`);
      }
      
      // 3. Double check it was created to ensure immediate consistency
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
    try {
      // Validate inputs
      if (!documents && (!docFiles.title_document || !docFiles.dni_front || !docFiles.dni_back)) {
        throw new Error("Debes subir todos los archivos requeridos.");
      }

      // CRITICAL FIX: Ensure professional record exists BEFORE uploading or inserting documents
      // This prevents the "Key (professional_id) is not present in table professionals" foreign key constraint error.
      await ensureProfessionalRecordExists();
      
      // Start uploads (Storage is independent of DB table usually, but we do it before DB write)
      let titleUrl = documents?.title_document;
      let dniFrontUrl = documents?.dni_front;
      let dniBackUrl = documents?.dni_back;

      // Only upload if new file is selected
      if (docFiles.title_document) titleUrl = await uploadFileToStorage(docFiles.title_document, 'title');
      if (docFiles.dni_front) dniFrontUrl = await uploadFileToStorage(docFiles.dni_front, 'dni_front');
      if (docFiles.dni_back) dniBackUrl = await uploadFileToStorage(docFiles.dni_back, 'dni_back');

      if (!titleUrl || !dniFrontUrl || !dniBackUrl) {
         throw new Error("Error al procesar los archivos. Inténtalo de nuevo.");
      }

      const payload = {
        professional_id: user.id,
        national_license: docForm.national_license,
        provincial_license: docForm.provincial_license,
        title_document: titleUrl,
        dni_front: dniFrontUrl,
        dni_back: dniBackUrl,
        status: 'submitted',
        rejection_reason: null,
        updated_at: new Date().toISOString()
      };

      // Check existence properly for documents table
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

      // Update professional status to submitted
      await supabase
        .from('professionals')
        .update({ verification_status: 'submitted' })
        .eq('id', user.id);

      toast({ 
        title: "Documentos enviados", 
        description: "Tus documentos se han guardado correctamente.",
        className: "bg-green-600 text-white" 
      });
      
      // Force refresh of state to move to next step WITHOUT triggering initialLoading
      await checkProgress(false);

    } catch (error) {
      console.error(error);
      toast({ 
        title: "Error al subir documentos", 
        description: error.message || "Error desconocido", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
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
           
           {[1, 2, 3].map((step) => {
             const isActive = step === currentStep;
             const isDone = step < currentStep;
             return (
               <div key={step} className="flex flex-col items-center gap-2 bg-slate-950 px-2 sm:px-4">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg border-2 transition-all ${
                    isActive ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 
                    isDone ? 'border-green-500 bg-green-500 text-white' : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}>
                    {isDone ? <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : step}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-medium text-center hidden sm:block ${isActive ? 'text-cyan-400' : isDone ? 'text-green-500' : 'text-gray-600'}`}>
                    {step === 1 && "Documentación"}
                    {step === 2 && "Mercado Pago"}
                    {step === 3 && "Aprobación"}
                  </span>
               </div>
             );
           })}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-2xl mx-auto w-full flex-1 pb-10">
        
        {/* STEP 1: DOCUMENTS */}
        {currentStep === 1 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="text-cyan-500" /> Carga de Credenciales
              </CardTitle>
              <CardDescription>Sube fotos claras de tu DNI y Título/Matrícula.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {documents?.status === 'rejected' && (
                 <Alert variant="destructive" className="bg-red-900/20 border-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Documentación rechazada</AlertTitle>
                    <AlertDescription>{documents.rejection_reason}</AlertDescription>
                 </Alert>
              )}

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

              <div className="space-y-4">
                 <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                    <Label className="block mb-2 text-cyan-400 font-bold">Título / Credencial (Frente)</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'title_document')} className="bg-transparent border-0 file:bg-cyan-900 file:text-cyan-400 file:border-0 file:rounded-md cursor-pointer text-sm" />
                    {documents?.title_document && !docFiles.title_document && <p className="text-xs text-green-500 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Archivo cargado previamente</p>}
                    {docFiles.title_document && <p className="text-xs text-blue-400 mt-1 flex items-center"><Upload className="w-3 h-3 mr-1"/> Archivo listo para subir</p>}
                 </div>
                 <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                    <Label className="block mb-2 text-white font-bold">DNI (Frente)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'dni_front')} className="bg-transparent border-0 file:bg-slate-800 file:text-white file:border-0 file:rounded-md cursor-pointer text-sm" />
                    {documents?.dni_front && !docFiles.dni_front && <p className="text-xs text-green-500 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Archivo cargado previamente</p>}
                    {docFiles.dni_front && <p className="text-xs text-blue-400 mt-1 flex items-center"><Upload className="w-3 h-3 mr-1"/> Archivo listo para subir</p>}
                 </div>
                 <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                    <Label className="block mb-2 text-white font-bold">DNI (Dorso)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'dni_back')} className="bg-transparent border-0 file:bg-slate-800 file:text-white file:border-0 file:rounded-md cursor-pointer text-sm" />
                    {documents?.dni_back && !docFiles.dni_back && <p className="text-xs text-green-500 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Archivo cargado previamente</p>}
                    {docFiles.dni_back && <p className="text-xs text-blue-400 mt-1 flex items-center"><Upload className="w-3 h-3 mr-1"/> Archivo listo para subir</p>}
                 </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={submitDocuments} disabled={uploading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12">
                {uploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 w-4 h-4" />}
                Guardar y Continuar
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
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button onClick={connectMercadoPago} disabled={mpProcessing} className="w-full bg-[#009EE3] hover:bg-[#008ED0] text-white font-bold h-12">
                {mpProcessing ? <Loader2 className="animate-spin mr-2" /> : <ExternalLink className="mr-2 w-4 h-4" />}
                Vincular Mercado Pago Ahora
              </Button>
               <Button variant="ghost" onClick={() => checkProgress(false)} className="text-xs text-gray-500">
                <RefreshCw className="w-3 h-3 mr-2" /> He completado la vinculación
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: APPROVAL WAIT */}
        {currentStep === 3 && (
          <Card className="bg-slate-900 border-slate-800 animate-in fade-in zoom-in duration-500">
            <CardContent className="pt-10 text-center pb-10">
               <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-yellow-500/30 rounded-full animate-ping"></div>
                  <ShieldCheck className="w-12 h-12 text-yellow-500" />
               </div>
               
               <h2 className="text-2xl font-bold text-white mb-2">Verificación en Proceso</h2>
               <p className="text-gray-400 max-w-md mx-auto mb-8">
                 Tus documentos y cuenta de pago han sido recibidos. Nuestro equipo legal está revisando tu perfil. 
                 <br/><br/>
                 Este proceso suele demorar entre <strong>24 y 48 horas hábiles</strong>.
               </p>

               <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 max-w-sm mx-auto mb-8 text-left">
                  <div className="flex items-center gap-3 mb-2">
                     <CheckCircle className="w-5 h-5 text-green-500" />
                     <span className="text-gray-300 text-sm">Documentos subidos</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                     <CheckCircle className="w-5 h-5 text-green-500" />
                     <span className="text-gray-300 text-sm">Mercado Pago conectado</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                     <span className="text-yellow-500 font-bold text-sm">Aprobación administrativa</span>
                  </div>
               </div>

               <Button variant="outline" onClick={() => window.location.reload()} className="border-slate-700 text-cyan-400">
                  <RefreshCw className="w-4 h-4 mr-2" /> Comprobar estado
               </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default ProfessionalOnboarding;