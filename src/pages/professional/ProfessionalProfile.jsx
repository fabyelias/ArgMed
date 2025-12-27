import React, { useState, useRef, useEffect } from 'react';
import { Stethoscope, Upload, CreditCard, Loader2, AlertTriangle, CheckCircle, Users, FileText, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DoctorMPConnectPrompt from '@/components/DoctorMPConnectPrompt'; 

const ProfessionalProfile = () => {
  const { user, updateProfile, uploadPhoto } = useAuth();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showAliasConfirm, setShowAliasConfirm] = useState(false);
  const fileInputRef = useRef(null);
  
  const [verifyingAlias, setVerifyingAlias] = useState(false);
  const [aliasVerified, setAliasVerified] = useState(false);
  const [aliasError, setAliasError] = useState(null);
  
  const [consultations, setConsultations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({ fullName: '', specialization: '', medicalLicense: '', consultationFee: '', paymentAlias: '', bio: '' });

  useEffect(() => {
    if (user) {
      setFormData({ fullName: user.full_name || '', specialization: user.specialization || '', medicalLicense: user.license_number || '', consultationFee: user.consultation_fee || 50, paymentAlias: user.payment_alias || '', bio: user.bio || '' });
      setIsActive(user.is_active === true);
      setAliasVerified(user.alias_verified === true);
      fetchLiveData();
      subscribeToRealtime();
    }
  }, [user]);

  const fetchLiveData = async () => {
     try {
        // Query adjusted for new table/column names: consultations -> professional_id, user_id
        // Note: Relation name 'user' comes from user_id foreign key to profiles table (mapped automatically by Supabase usually, or explicit join)
        const { data: cons } = await supabase
          .from('consultations')
          .select('*, user:user_id(full_name)')
          .eq('professional_id', user.id)
          .order('updated_at', { ascending: false });
          
        setConsultations(cons || []);
        
        const uniqueUsers = new Map();
        cons?.forEach(c => {
            if (c.status === 'completed' && c.user) {
                if (!uniqueUsers.has(c.user_id)) { 
                  uniqueUsers.set(c.user_id, { name: c.user.full_name, count: 1, lastDate: c.created_at }); 
                } else { 
                  uniqueUsers.get(c.user_id).count += 1; 
                }
            }
        });
        setUsers(Array.from(uniqueUsers.values()));
        
        const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        setNotifications(notifs || []);
     } catch (err) { console.error(err); }
  };

  const subscribeToRealtime = () => {
      const sub1 = supabase.channel('prof-profile-cons')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `professional_id=eq.${user.id}` }, () => fetchLiveData())
        .subscribe();
      
      const sub2 = supabase.channel('prof-profile-notifs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchLiveData())
        .subscribe();
        
      return () => { supabase.removeChannel(sub1); supabase.removeChannel(sub2); }
  };

  const handleVerifyAlias = async () => {
    if (!formData.paymentAlias) return setAliasError("Ingresa un alias.");
    setVerifyingAlias(true); setAliasError(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-alias', { body: JSON.stringify({ alias: formData.paymentAlias, alias_type: 'alias' }) });
      if (error) throw error;
      if (data.is_valid) { setAliasVerified(true); toast({ title: "Verificado", className: "bg-green-600 text-white" }); } 
      else { setAliasVerified(false); setAliasError(data.message || "Alias inválido."); }
    } catch (err) { setAliasError("No se pudo validar."); setAliasVerified(false); } finally { setVerifyingAlias(false); }
  };

  const handleSaveAttempt = () => {
    if (formData.paymentAlias && !aliasVerified) return toast({ title: "Verifica tu alias", variant: "destructive" });
    setShowAliasConfirm(true);
  };
  
  const handleConfirmSave = async () => {
    setShowAliasConfirm(false); setSaving(true);
    try {
        const result = await updateProfile({ fullName: formData.fullName, specialization: formData.specialization, medicalLicense: formData.medicalLicense, consultationFee: formData.consultationFee, paymentAlias: formData.paymentAlias, bio: formData.bio });
        if (!result.success) throw new Error(result.error);
        
        await supabase.from('professionals').update({ alias_verified: aliasVerified, alias_verified_at: aliasVerified ? new Date().toISOString() : null }).eq('id', user.id);
        
        toast({ title: "Perfil actualizado", className: "bg-green-600 text-white" }); setEditing(false);
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  const toggleActive = async () => {
    try { const newStatus = !isActive; setIsActive(newStatus); await updateProfile({ isActive: newStatus }); } catch (e) { setIsActive(!isActive); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); try { await uploadPhoto(file); toast({ title: "Foto actualizada" }); } catch (e) { toast({ title: "Error", variant: "destructive" }); } finally { setUploading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 w-full">
      <DoctorMPConnectPrompt />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="col-span-1 space-y-6">
            <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6">
                <div className="flex flex-col items-center mb-6">
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-cyan-500 mb-4 cursor-pointer group" onClick={() => editing && fileInputRef.current?.click()}>
                        {user?.photo_url ? <img src={user.photo_url} className="w-full h-full object-cover" alt="Professional Profile" /> : <Stethoscope className="w-full h-full p-6 text-gray-500" />}
                        {editing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity"><Upload className="text-white" /></div>}
                        {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white text-center">{formData.fullName || user?.full_name}</h2>
                    <p className="text-cyan-400 font-medium text-sm">{formData.specialization || user?.specialization}</p>
                    <div className="mt-6 w-full bg-slate-950 rounded-xl p-4 flex items-center justify-between border border-slate-800">
                        <span className="text-xs text-gray-400 uppercase font-bold">Visibilidad</span>
                        <button onClick={toggleActive} className={`px-3 py-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{isActive ? 'ONLINE' : 'OFFLINE'}</button>
                    </div>
                </div>
                
                {editing ? (
                     <div className="space-y-4">
                        <div>
                            <Label htmlFor="fullName" className="text-xs">Nombre</Label>
                            <Input id="fullName" name="fullName" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="bg-slate-950 border-slate-700 h-9" />
                        </div>
                        <div>
                            <Label htmlFor="specialization" className="text-xs">Especialidad</Label>
                            <Input id="specialization" name="specialization" value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} className="bg-slate-950 border-slate-700 h-9" />
                        </div>
                        <div>
                            <Label htmlFor="consultationFee" className="text-xs">Tarifa ($)</Label>
                            <Input id="consultationFee" name="consultationFee" type="number" value={formData.consultationFee} onChange={(e) => setFormData({...formData, consultationFee: e.target.value})} className="bg-slate-950 border-slate-700 h-9" />
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                            <p className="text-xs font-bold text-white flex items-center gap-2"><CreditCard className="w-3 h-3 text-cyan-400" /> Cobro</p>
                            <div>
                                <Label htmlFor="paymentAlias" className="text-[10px] text-gray-400">Alias CBU/CVU</Label>
                                <Input id="paymentAlias" name="paymentAlias" value={formData.paymentAlias} onChange={(e) => { setFormData({...formData, paymentAlias: e.target.value}); setAliasVerified(false); }} className={`bg-slate-900 h-8 text-sm ${aliasVerified ? 'border-green-500 text-green-400' : 'border-slate-700'}`} />
                            </div>
                            {aliasError && <p className="text-[10px] text-red-400">{aliasError}</p>}
                            {aliasVerified ? <div className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verificado</div> : <Button onClick={handleVerifyAlias} disabled={verifyingAlias || !formData.paymentAlias} size="sm" variant="secondary" className="w-full h-8 text-xs">{verifyingAlias ? '...' : 'Verificar'}</Button>}
                        </div>
                        <div className="flex gap-2"><Button onClick={() => setEditing(false)} variant="outline" size="sm" className="flex-1 border-slate-700" disabled={saving}>Cancelar</Button><Button onClick={handleSaveAttempt} size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={saving}>{saving ? "..." : "Guardar"}</Button></div>
                        <input id="professional-photo" name="professional-photo" type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                     </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-950 p-2 rounded"><p className="text-gray-500 text-[10px] uppercase">Matrícula</p><p className="text-white font-mono text-xs">{formData.medicalLicense || '-'}</p></div>
                            <div className="bg-slate-950 p-2 rounded"><p className="text-gray-500 text-[10px] uppercase">Tarifa</p><p className="text-green-400 font-bold text-xs">${formData.consultationFee}</p></div>
                        </div>
                        <Button onClick={() => setEditing(true)} variant="outline" className="w-full border-slate-700 text-cyan-400 h-9 text-sm">Editar Perfil</Button>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column */}
        <div className="col-span-1 lg:col-span-2">
            <Tabs defaultValue="consultations" className="w-full">
                <TabsList className="w-full bg-slate-900/50 border border-slate-800 p-1 mb-4 h-auto flex flex-col sm:flex-row">
                    <TabsTrigger value="consultations" className="flex-1 py-2 text-xs sm:text-sm"><FileText className="w-3 h-3 mr-2" /> Consultas</TabsTrigger>
                    <TabsTrigger value="patients" className="flex-1 py-2 text-xs sm:text-sm"><Users className="w-3 h-3 mr-2" /> Usuarios</TabsTrigger>
                    <TabsTrigger value="notifications" className="flex-1 py-2 text-xs sm:text-sm"><Bell className="w-3 h-3 mr-2" /> Avisos</TabsTrigger>
                </TabsList>

                <TabsContent value="consultations" className="space-y-3">
                    {consultations.map(c => (
                        <div key={c.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div><p className="font-bold text-white text-sm">{c.user?.full_name || 'Usuario'}</p><p className="text-xs text-gray-400">{new Date(c.updated_at).toLocaleDateString()} • ${c.consultation_fee}</p></div>
                            <Badge className="text-[10px] self-start">{c.status}</Badge>
                        </div>
                     ))}
                </TabsContent>

                <TabsContent value="patients" className="space-y-3">
                     {users.map((p, i) => (
                         <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                             <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 font-bold text-xs">{p.name.charAt(0)}</div><div><p className="font-bold text-white text-sm">{p.name}</p><p className="text-[10px] text-gray-500">{new Date(p.lastDate).toLocaleDateString()}</p></div></div>
                             <div className="text-right"><p className="text-lg font-bold text-cyan-400">{p.count}</p></div>
                         </div>
                     ))}
                </TabsContent>

                <TabsContent value="notifications" className="space-y-3">
                    {notifications.map(n => (
                         <div key={n.id} className={`p-3 rounded-lg border ${n.is_read ? 'bg-slate-950 border-slate-800 opacity-60' : 'bg-slate-900 border-cyan-500/30'}`}>
                             <div className="flex justify-between mb-1"><h4 className="font-bold text-white text-xs">{n.title}</h4><span className="text-[10px] text-gray-500">{new Date(n.created_at).toLocaleTimeString()}</span></div>
                             <p className="text-xs text-gray-300">{n.message}</p>
                         </div>
                     ))}
                </TabsContent>
            </Tabs>
        </div>
      </div>
      <AlertDialog open={showAliasConfirm} onOpenChange={setShowAliasConfirm}>
          <AlertDialogContent className="bg-slate-900 border-cyan-800 text-white"><AlertDialogHeader><AlertDialogTitle>Confirmar Alias</AlertDialogTitle><AlertDialogDescription>¿El alias <b>{formData.paymentAlias}</b> es correcto?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={handleConfirmSave}>Sí</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfessionalProfile;