import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  ExternalLink, 
  ShieldCheck, 
  User, 
  AlertTriangle,
  CreditCard
} from 'lucide-react';

const DocumentPreview = ({ title, path, bucket = 'doctor-documents' }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    const fetchUrl = async () => {
      try {
        // Handle full URLs (if stored that way) or paths
        if (path.startsWith('http')) {
            setUrl(path);
        } else {
            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
            if (data?.publicUrl) {
              setUrl(data.publicUrl);
            } else {
              setError(true);
            }
        }
      } catch (err) {
        console.error('Error fetching document URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [path, bucket]);

  if (!path) {
    return (
      <div className="border border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 h-48">
        <FileText className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-sm">Documento no subido</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-300">{title}</h4>
        {url && (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Abrir original <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      
      <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group h-48">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-red-900/10">
            <div className="text-center p-4">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Error al cargar imagen</p>
            </div>
          </div>
        ) : (
          <img 
            src={url} 
            alt={title} 
            className="w-full h-full object-contain bg-black/40 transition-transform duration-300 group-hover:scale-105" 
          />
        )}
      </div>
    </div>
  );
};

const DoctorVerificationModal = ({ doctor, isOpen, onClose, onApprove, onReject }) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState(null);
  const [mpAccount, setMpAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    if (isOpen && doctor) {
      fetchData();
      setShowRejectInput(false);
      setRejectReason('');
    } else {
      setDocuments(null);
      setMpAccount(null);
    }
  }, [isOpen, doctor]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsResponse, mpResponse] = await Promise.all([
        supabase
          .from('professional_documents')
          .select('*')
          .eq('professional_id', doctor.id)
          .maybeSingle(),
        supabase
          .from('mp_professional_accounts')
          .select('*')
          .eq('professional_id', doctor.id)
          .maybeSingle()
      ]);

      setDocuments(docsResponse.data || {});
      setMpAccount(mpResponse.data || null);
    } catch (error) {
      console.error('Error fetching verification data:', error);
      toast({
        variant: "destructive",
        title: "Error de carga",
        description: "No se pudieron recuperar los datos completos del profesional."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      // 1. Update professionals table
      const { error: doctorError } = await supabase
        .from('professionals')
        .update({ 
          verification_status: 'approved',
          is_active: true,
          alias_verified: true,
          alias_verified_at: new Date().toISOString()
        })
        .eq('id', doctor.id);

      if (doctorError) throw doctorError;

      // 2. Update documents status
      if (documents?.id) {
        await supabase
          .from('professional_documents')
          .update({ status: 'approved', rejection_reason: null })
          .eq('id', documents.id);
      }

      toast({
        title: "Profesional Aprobado",
        description: `El perfil de ${doctor.profiles?.full_name} ha sido activado.`,
        className: "bg-green-600 border-green-700 text-white"
      });

      if (onApprove) onApprove(doctor.id);
      onClose();
    } catch (error) {
      console.error('Error approving doctor:', error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
        toast({ variant: "destructive", title: "Motivo requerido", description: "Debes especificar por qué rechazas la solicitud." });
        return;
    }

    setProcessing(true);
    try {
      // 1. Update professionals table
      const { error: doctorError } = await supabase
        .from('professionals')
        .update({ verification_status: 'rejected', is_active: false })
        .eq('id', doctor.id);

      if (doctorError) throw doctorError;

      // 2. Update documents status
      if (documents?.id) {
        await supabase
          .from('professional_documents')
          .update({ status: 'rejected', rejection_reason: rejectReason })
          .eq('id', documents.id);
      }

      toast({
        title: "Solicitud Rechazada",
        description: "El profesional será notificado del rechazo.",
        variant: "default",
        className: "bg-orange-600 text-white border-none"
      });

      if (onReject) onReject(doctor.id);
      onClose();
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  if (!doctor) return null;

  const mpConnected = mpAccount && (mpAccount.access_token || mpAccount.user_id_mp);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-900 border-slate-800 text-slate-100 p-0">
        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-700">
                 {doctor.profiles?.photo_url ? (
                   <img src={doctor.profiles.photo_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-xl font-bold text-slate-500">{doctor.profiles?.full_name?.[0]}</span>
                 )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  {doctor.profiles?.full_name || 'Médico Desconocido'}
                  {doctor.verification_status === 'approved' && (
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  )}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {doctor.specialization} • Licencia: {doctor.license_number || 'N/A'}
                </DialogDescription>
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`${mpConnected ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' : 'border-slate-700 text-slate-500'}`}>
                        <CreditCard className="w-3 h-3 mr-1" />
                        {mpConnected ? 'Mercado Pago Conectado' : 'Sin cuenta de cobro'}
                    </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Badge 
                variant={doctor.verification_status === 'approved' ? 'success' : 'secondary'}
                className={doctor.verification_status === 'approved' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-slate-800 text-slate-400'}
                >
                {doctor.verification_status === 'approved' ? 'Aprobado' : doctor.verification_status === 'rejected' ? 'Rechazado' : 'Pendiente Revisión'}
                </Badge>
                <p className="text-xs text-slate-500">{doctor.profiles?.email}</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-slate-900">
          <div className="p-6">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                <p className="text-slate-400">Cargando documentación...</p>
                </div>
            ) : (
                <Tabs defaultValue="identity" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-6">
                    <TabsTrigger value="identity">Identidad (DNI)</TabsTrigger>
                    <TabsTrigger value="professional">Profesional</TabsTrigger>
                </TabsList>

                <TabsContent value="identity" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                    <div className="grid md:grid-cols-2 gap-6">
                    <DocumentPreview 
                        title="DNI Frente" 
                        path={documents?.dni_front} 
                    />
                    <DocumentPreview 
                        title="DNI Dorso" 
                        path={documents?.dni_back} 
                    />
                    </div>
                </TabsContent>

                <TabsContent value="professional" className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                    <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Label className="mb-2 block text-slate-400">Matrícula Nacional</Label>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-white font-mono text-sm mb-4">
                            {documents?.national_license || "No especificada"}
                        </div>
                        <DocumentPreview 
                            title="Credencial Matrícula / Título" 
                            path={documents?.title_document} 
                        />
                    </div>
                    <div>
                        <Label className="mb-2 block text-slate-400">Matrícula Provincial</Label>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-white font-mono text-sm mb-4">
                            {documents?.provincial_license || "No especificada"}
                        </div>
                    </div>
                    </div>
                </TabsContent>
                </Tabs>
            )}
            
            {showRejectInput && (
                <div className="mt-6 p-4 bg-red-900/10 border border-red-900/50 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                    <Label className="text-red-400 mb-2 block">Motivo del rechazo</Label>
                    <Textarea 
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explique por qué se rechaza la documentación (ej: foto borrosa, matrícula vencida)..."
                        className="bg-slate-950 border-red-900/50 text-white min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2 mt-3">
                        <Button variant="ghost" size="sm" onClick={() => setShowRejectInput(false)} className="text-slate-400 hover:text-white">Cancelar</Button>
                        <Button variant="destructive" size="sm" onClick={handleReject} disabled={processing}>
                           {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Rechazo"}
                        </Button>
                    </div>
                </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-slate-800 bg-slate-950 flex justify-between sm:justify-between items-center shrink-0">
          {!showRejectInput ? (
              <>
                <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="text-slate-400 hover:text-white"
                >
                    Cerrar
                </Button>
                
                <div className="flex gap-3">
                    {doctor.verification_status !== 'rejected' && (
                        <Button 
                            variant="destructive" 
                            onClick={() => setShowRejectInput(true)}
                            className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50"
                        >
                            <XCircle className="w-4 h-4 mr-2" /> Rechazar
                        </Button>
                    )}
                    
                    {doctor.verification_status !== 'approved' && (
                        <Button 
                            onClick={handleApprove} 
                            disabled={processing || loading || !documents}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white border-none shadow-lg shadow-cyan-900/20"
                        >
                            {processing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            Aprobar Profesional
                        </Button>
                    )}
                </div>
              </>
          ) : (
             <p className="text-xs text-red-400 w-full text-center">Complete el motivo arriba para continuar.</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorVerificationModal;