import React, { useEffect, useState, useRef } from 'react';
import { User, Mail, Phone, Calendar, FileText, Bell, Activity, Edit2, Save, Upload, MapPin, CreditCard, Loader2, Heart, Shield, Pill, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
  const { user, updateProfile, uploadPhoto } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [profileData, setProfileData] = useState({
    fullName: '', phone: '', email: '', address: '', dateOfBirth: '', dni: ''
  });
  
  const [consultations, setConsultations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [patientDetails, setPatientDetails] = useState({});

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
        dateOfBirth: user.date_of_birth || '',
        dni: user.dni || ''
      });
      fetchLiveData();
      subscribeToRealtime();
    }
  }, [user]);

  const fetchLiveData = async () => {
    try {
      // Updated: patients -> users
      const { data: pDetails } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      setPatientDetails(pDetails || {});

      // Fetch consultations with professional data
      const { data: consultationsData } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      // Get professional data for each consultation
      const consultationsWithProfessionals = await Promise.all(
        (consultationsData || []).map(async (consultation) => {
          const { data: professionalData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', consultation.doctor_id)
            .maybeSingle();

          return {
            ...consultation,
            professional: professionalData ? {
              full_name: `${professionalData.first_name} ${professionalData.last_name}`
            } : null
          };
        })
      );
      setConsultations(consultationsWithProfessionals);

      const { data: notifs } = await supabase.from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
      setNotifications(notifs || []);

      // Fetch medical records with professional data
      const { data: medicalRecordsData } = await supabase
        .from('medical_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Get professional data for each medical record
      const medicalRecordsWithProfessionals = await Promise.all(
        (medicalRecordsData || []).map(async (record) => {
          const { data: professionalData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', record.professional_id)
            .maybeSingle();

          return {
            ...record,
            professional: professionalData ? {
              full_name: `${professionalData.first_name} ${professionalData.last_name}`
            } : null
          };
        })
      );
      setBitacora(medicalRecordsWithProfessionals);
    } catch (e) { console.error(e); }
  };

  const subscribeToRealtime = () => {
    const notifSub = supabase.channel('profile-notifs').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchLiveData()).subscribe();
    // Filter by patient_id for consultations
    const consSub = supabase.channel('profile-cons').on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `patient_id=eq.${user.id}` }, () => fetchLiveData()).subscribe();
    const bitacoraSub = supabase.channel('profile-medical-records').on('postgres_changes', { event: '*', schema: 'public', table: 'medical_records', filter: `user_id=eq.${user.id}` }, () => fetchLiveData()).subscribe();
    return () => { supabase.removeChannel(notifSub); supabase.removeChannel(consSub); supabase.removeChannel(bitacoraSub); }
  };

  const handleSave = async () => {
    if (!profileData.fullName.trim()) return toast({ title: "Error", description: "Nombre obligatorio", variant: "destructive" });
    setSaving(true);
    try {
        const updates = { fullName: profileData.fullName, address: profileData.address, dni: profileData.dni, date_of_birth: profileData.dateOfBirth || null };
        const result = await updateProfile(updates);
        if(result.success) { setIsEditing(false); toast({ title: "Perfil actualizado", className: "bg-green-600 text-white" }); } 
        else throw new Error(result.error);
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); } 
    finally { setSaving(false); }
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await uploadPhoto(file); toast({ title: "Foto actualizada" }); } 
    catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); } 
    finally { setUploading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 w-full">
      <Button
        onClick={() => navigate('/user')}
        variant="ghost"
        className="mb-4 text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al inicio
      </Button>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Mi Perfil</h1>
            <p className="text-gray-400 text-sm">Gestiona tu información de usuario y comunicación</p>
        </div>
        {!isEditing && (
            <Button onClick={() => setIsEditing(true)} size="sm" className="bg-cyan-600 hover:bg-cyan-700 w-full sm:w-auto">
                <Edit2 className="w-4 h-4 mr-2" /> Editar
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Info Card */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
            <Card className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 border-cyan-500/20 overflow-hidden backdrop-blur-sm">
                <div className="relative h-32 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                </div>
                <div className="px-6 pb-6 relative">
                    <div className="flex justify-center -mt-16 mb-4">
                        <div className="relative group cursor-pointer" onClick={() => isEditing && fileInputRef.current?.click()}>
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                            <div className="relative w-32 h-32 rounded-full border-4 border-slate-900 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden shadow-2xl">
                                {user?.photo_url ? <img src={user.photo_url} className="w-full h-full object-cover" alt="Profile" /> : <div className="w-full h-full flex items-center justify-center text-cyan-400/60"><User className="w-12 h-12" /></div>}
                                {isEditing && <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-cyan-400 w-6 h-6" /></div>}
                                {uploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><Loader2 className="text-cyan-400 w-6 h-6 animate-spin" /></div>}
                            </div>
                        </div>
                        <input id="photo-upload" name="photo-upload" type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} disabled={!isEditing || uploading} />
                    </div>

                    <div className="text-center">
                        {isEditing ? (
                            <div className="space-y-4 text-left mt-4">
                                <div>
                                    <Label htmlFor="fullName" className="text-cyan-400 font-bold text-xs uppercase">Nombre</Label>
                                    <Input id="fullName" name="fullName" value={profileData.fullName} onChange={(e) => setProfileData({...profileData, fullName: e.target.value})} className="bg-slate-950 border-slate-700 h-9" />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                     <div>
                                        <Label htmlFor="dni" className="text-cyan-400 font-bold text-xs uppercase">DNI</Label>
                                        <Input id="dni" name="dni" value={profileData.dni} onChange={(e) => setProfileData({...profileData, dni: e.target.value})} className="bg-slate-950 border-slate-700 h-9" />
                                     </div>
                                     <div>
                                        <Label htmlFor="dateOfBirth" className="text-cyan-400 font-bold text-xs uppercase">Nacimiento</Label>
                                        <Input id="dateOfBirth" name="dateOfBirth" type="date" value={profileData.dateOfBirth || ''} onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})} className="bg-slate-950 border-slate-700 h-9" />
                                     </div>
                                </div>
                                <div>
                                    <Label htmlFor="address" className="text-cyan-400 font-bold text-xs uppercase">Dirección</Label>
                                    <Input id="address" name="address" value={profileData.address} onChange={(e) => setProfileData({...profileData, address: e.target.value})} className="bg-slate-950 border-slate-700 h-9" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" className="flex-1 border-slate-700" disabled={saving}>Cancelar</Button>
                                    <Button onClick={handleSave} size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={saving}>{saving ? "..." : "Guardar"}</Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">{user?.full_name}</h2>
                                <div className="flex justify-center mb-6"><Badge variant="outline" className="border-cyan-500/50 text-cyan-400 bg-cyan-500/10">Usuario</Badge></div>
                                <div className="mt-6 space-y-3">
                                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-cyan-500/20 hover:border-cyan-500/40 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                                                <Mail className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-xs text-cyan-400/70 font-semibold uppercase tracking-wider mb-1">Email</p>
                                                <p className="text-sm text-white/90 font-medium truncate">{user?.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                                <Phone className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-blue-400/70 font-semibold uppercase tracking-wider mb-1">Teléfono</p>
                                                <p className="text-sm text-white/90 font-medium">{user?.phone || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-lg hover:shadow-purple-500/10">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                                <CreditCard className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-purple-400/70 font-semibold uppercase tracking-wider mb-1">DNI</p>
                                                <p className="text-sm text-white/90 font-medium">{user?.dni || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                                                <MapPin className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-emerald-400/70 font-semibold uppercase tracking-wider mb-1">Dirección</p>
                                                <p className="text-sm text-white/90 font-medium">{user?.address || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Card>

            <Card className="bg-slate-900/80 border-slate-800">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-base text-white flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Datos de Perfil</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800"><p className="text-[10px] text-gray-500 uppercase font-bold">Información Adicional</p><p className="text-sm text-white truncate">{patientDetails?.chronic_conditions || 'Sin datos registrados'}</p></div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="col-span-1 lg:col-span-8">
            <Tabs defaultValue="consultations" className="w-full">
                <TabsList className="w-full bg-slate-900/80 border border-slate-800 p-1 mb-4 h-auto flex flex-col sm:flex-row">
                    <TabsTrigger value="consultations" className="flex-1 py-2 sm:py-3 text-xs sm:text-sm"><Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-2" /> Sesiones</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1 py-2 sm:py-3 text-xs sm:text-sm"><BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-2" /> Bitácora</TabsTrigger>
                    <TabsTrigger value="notifications" className="flex-1 py-2 sm:py-3 text-xs sm:text-sm"><Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-2" /> Avisos</TabsTrigger>
                </TabsList>

                <TabsContent value="consultations" className="space-y-4">
                    {consultations.length === 0 ? (
                        <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed"><p className="text-gray-500 text-sm">No hay videollamadas registradas.</p></div>
                    ) : (
                        consultations.map(c => (
                            <Card key={c.id} className="bg-slate-900 border-slate-800 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><Activity className="w-5 h-5 text-blue-500" /></div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm sm:text-base">Esp. {c.professional?.full_name || 'Especialista'}</h4>
                                            <p className="text-gray-500 text-xs mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Badge className="self-start sm:self-center text-[10px]">{c.status}</Badge>
                                </div>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                     <div className="flex justify-end"><Button variant="outline" size="sm" className="h-7 text-xs border-slate-700 text-cyan-400"><Shield className="w-3 h-3 mr-1" /> Privado</Button></div>
                     {bitacora.length === 0 ? <div className="text-center py-8 text-gray-500 text-sm">Bitácora vacía.</div> : bitacora.map((m, i) => (
                         <Card key={i} className="bg-slate-900 border-slate-800 p-4">
                             <div className="flex justify-between mb-2"><span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString()}</span><span className="text-xs font-bold text-white">Esp. {m.professional?.full_name || 'Especialista'}</span></div>
                             <div className="bg-slate-950 p-3 rounded border border-slate-800"><p className="text-xs text-gray-500 font-bold uppercase">Observaciones</p><p className="text-sm text-white">{m.diagnosis}</p></div>
                         </Card>
                     ))}
                </TabsContent>

                <TabsContent value="notifications" className="space-y-2">
                     {notifications.length === 0 ? <div className="text-center py-8 text-gray-500 text-sm">Sin notificaciones.</div> : notifications.map(n => (
                         <div key={n.id} className={`p-3 rounded-lg border flex gap-3 ${n.is_read ? 'bg-slate-950 border-slate-800 opacity-60' : 'bg-slate-900 border-cyan-500/30'}`}>
                             <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-gray-700' : 'bg-cyan-500'}`} />
                             <div><h4 className="font-bold text-white text-sm">{n.title}</h4><p className="text-xs text-gray-300 mt-1">{n.message}</p></div>
                         </div>
                     ))}
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;