import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Star, List, User, Stethoscope, 
  Loader2, Check, ArrowRight, XCircle, Radar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const FindDoctor = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Smart Routing & Request State
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState('idle'); 
    const [currentRequestId, setCurrentRequestId] = useState(null);
    const [contactedDoctors, setContactedDoctors] = useState([]);
    
    // Request Configuration Modal State
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [requestType, setRequestType] = useState('any'); 
    const [targetSpecialty, setTargetSpecialty] = useState('');
    
    // Available Specializations
    const [specializations, setSpecializations] = useState([]);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            
            // Updated table name: doctors -> professionals
            const { data: doctorsData, error: doctorsError } = await supabase
                .from('professionals')
                .select('*')
                .eq('is_active', true);
            
            if (doctorsError) throw doctorsError;

            const enrichedDoctors = await Promise.all((doctorsData || []).map(async (doc) => {
                const { data: userData } = await supabase.from('users').select('first_name, last_name').eq('id', doc.id).single();
                return {
                    ...doc,
                    profiles: userData ? {
                        full_name: `${userData.first_name} ${userData.last_name}`
                    } : null
                };
            }));
            
            setDoctors(enrichedDoctors);
            const specs = [...new Set(enrichedDoctors.map(d => d.specialization).filter(Boolean))];
            setSpecializations(specs);
        } catch (error) {
            console.error("Error fetching doctors:", error);
            toast({ title: "Error", description: "No se pudieron cargar los profesionales.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRequestDialog = (source, doctor = null) => {
        setSelectedDoctor(doctor);
        
        if (source === 'specialty_card') {
            setRequestType('specialty');
        } else if (source === 'list_click' && doctor) {
            setRequestType('specific');
            setTargetSpecialty(doctor.specialization || '');
        } else {
            setRequestType('any');
        }
        
        setConfigModalOpen(true);
    };

    const handleStartSearch = async () => {
        setConfigModalOpen(false);
        
        if (requestType === 'specific' && selectedDoctor) {
            handleDirectRequest(selectedDoctor);
        } else {
            const filter = requestType === 'specialty' ? targetSpecialty : null;
            startSmartRouting(filter);
        }
    };

    const startSmartRouting = async (specialtyFilter) => {
        if (isSearching) return;
        setIsSearching(true);
        setSearchStatus('searching');
        setContactedDoctors([]);

        try {
            const { data: reqData, error: reqError } = await supabase
                .from('consultation_requests')
                .insert({
                    user_id: user.id,
                    specialty: specialtyFilter,
                    status: 'searching'
                })
                .select()
                .single();

            if (reqError) throw reqError;
            setCurrentRequestId(reqData.id);

            const candidates = doctors.filter(doc => {
                if (!specialtyFilter) return true;
                return doc.specialization === specialtyFilter;
            });

            if (candidates.length === 0) {
                await supabase.from('consultation_requests').update({ status: 'cancelled' }).eq('id', reqData.id);
                toast({ 
                    title: "Sin profesionales disponibles", 
                    description: specialtyFilter 
                        ? `No encontramos especialistas con la especialidad "${specialtyFilter}" activos.` 
                        : "No hay profesionales activos en este momento.",
                    variant: "destructive" 
                });
                setIsSearching(false);
                setSearchStatus('idle');
                return;
            }

            await routeRequestToNextDoctor(reqData.id, candidates, []);

        } catch (e) {
            console.error("Smart search error:", e);
            setIsSearching(false);
            setSearchStatus('idle');
            toast({ title: "Error", description: "No se pudo iniciar la búsqueda." });
        }
    };

    const routeRequestToNextDoctor = async (requestId, allCandidates, rejectedIds) => {
        const nextDoc = allCandidates.find(d => !rejectedIds.includes(d.id));

        if (!nextDoc) {
            setSearchStatus('timeout');
            await supabase.from('consultation_requests').update({ status: 'expired' }).eq('id', requestId);
            return;
        }

        setContactedDoctors(prev => [...prev, nextDoc.profiles?.full_name]);

        await supabase.from('consultation_requests')
            .update({ current_professional_id: nextDoc.id })
            .eq('id', requestId);

        await supabase.from('notifications').insert({
            user_id: nextDoc.id,
            type: 'info',
            title: 'Solicitud Inmediata',
            message: `Usuario espera atención${nextDoc.specialization ? ` (${nextDoc.specialization})` : ''}.`,
            is_read: false
        });

        const channel = supabase.channel(`request-${requestId}`)
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'consultation_requests', filter: `id=eq.${requestId}` },
                async (payload) => {
                    if (payload.new.status === 'matched') {
                        setSearchStatus('found');
                        setIsSearching(false);
                        toast({ title: "¡Especialista Encontrado!", className: "bg-green-600 text-white" });
                        
                        let attempts = 0;
                        const findConsultation = async () => {
                             // This is the query you are looking for
                             const { data: cons } = await supabase.from('consultations')
                                .select('id')
                                .eq('professional_id', payload.new.current_professional_id)
                                .eq('user_id', user.id)
                                .eq('status', 'accepted')
                                .eq('payment_status', 'pending')
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                             
                             if (cons) {
                                 navigate(`/user/confirm-consultation/${cons.id}`);
                             } else if (attempts < 10) { 
                                 attempts++;
                                 setTimeout(findConsultation, 800); 
                             } else {
                                 toast({ title: "Error", description: "El especialista aceptó pero no encontramos la sesión.", variant: "destructive" });
                             }
                        };
                        
                        setTimeout(findConsultation, 1000); 
                        supabase.removeChannel(channel);
                    }
                }
            )
            .subscribe();

        setTimeout(async () => {
            const { data: currentReq } = await supabase.from('consultation_requests').select('*').eq('id', requestId).single();
            
            if (currentReq && currentReq.status === 'searching' && currentReq.current_professional_id === nextDoc.id) {
                 const newRejected = [...rejectedIds, nextDoc.id];
                 
                 await supabase.from('consultation_requests')
                    .update({ rejected_professional_ids: newRejected, current_professional_id: null })
                    .eq('id', requestId);

                 supabase.removeChannel(channel);
                 routeRequestToNextDoctor(requestId, allCandidates, newRejected);
            } else {
                supabase.removeChannel(channel);
            }
        }, 30000); 
    };

    const cancelSearch = async () => {
        if (currentRequestId) {
            await supabase.from('consultation_requests').update({ status: 'cancelled' }).eq('id', currentRequestId);
        }
        setIsSearching(false);
        setSearchStatus('idle');
    };

    const handleDirectRequest = async (doctor) => {
        try {
            const { data: existing } = await supabase.from('consultations')
                .select('id')
                .eq('user_id', user.id)
                .eq('professional_id', doctor.id)
                .eq('status', 'pending')
                .maybeSingle();
            
            if (existing) {
                toast({ title: "Ya enviaste una solicitud a este especialista", description: "Espera a que te responda." });
                return;
            }

            const { data } = await supabase.from('consultations').insert({
                professional_id: doctor.id,
                user_id: user.id,
                status: 'pending',
                payment_status: 'pending',
                consultation_fee: doctor.consultation_fee,
                reason: "Solicitud Directa"
            }).select().single();

            await supabase.from('notifications').insert({
                user_id: doctor.id,
                type: 'info',
                title: 'Solicitud Directa',
                message: `${user.full_name} solicita sesión.`,
                related_consultation_id: data.id,
                is_read: false
            });

            toast({ title: "Solicitud Enviada", className: "bg-green-600 text-white" });
            setTimeout(() => navigate('/user'), 1000);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "No se pudo enviar la solicitud", variant: "destructive" });
        }
    };

    const filteredDoctors = doctors.filter(doc => 
        doc.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto pb-20 relative min-h-screen px-4 pt-4">
            {isSearching && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-[loading_2s_ease-in-out_infinite]"></div>
                        
                        {searchStatus === 'searching' && (
                            <>
                                <div className="mb-6 relative inline-block">
                                    <Radar className="w-20 h-20 text-cyan-500 animate-spin-slow" />
                                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Buscando especialista disponible...</h2>
                                <p className="text-gray-400 mb-6">
                                    Contactando profesionales. <br/>
                                    <span className="text-cyan-400 text-sm font-mono mt-2 block">
                                        {contactedDoctors.length > 0 ? `Contactando: Dr. ${contactedDoctors[contactedDoctors.length-1]}` : 'Iniciando...'}
                                    </span>
                                </p>
                                <Button onClick={cancelSearch} variant="outline" className="border-slate-700 text-red-400 w-full">Cancelar</Button>
                            </>
                        )}

                        {searchStatus === 'timeout' && (
                            <>
                                <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">No se encontraron especialistas</h2>
                                <p className="text-gray-400 mb-6">Intenta nuevamente más tarde.</p>
                                <Button onClick={cancelSearch} className="bg-slate-800 text-white w-full">Cerrar</Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Encontrá tu Especialista</h1>
                <p className="text-gray-400 max-w-xl mb-6">
                    Selecciona una opción rápida o busca en el listado.
                </p>

                {/* ACTION CARDS */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    <div 
                        onClick={() => handleOpenRequestDialog('any_card')}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-xl shadow-lg cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden group border-0"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                                <Radar className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Cualquier Profesional</h3>
                                <p className="text-blue-100 text-sm mt-1">Atención inmediata con el primero disponible.</p>
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={() => handleOpenRequestDialog('specialty_card')}
                        className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg cursor-pointer hover:border-cyan-500/50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-800 rounded-full group-hover:bg-cyan-900/30 transition-colors">
                                <Stethoscope className="w-8 h-8 text-cyan-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Por Especialidad</h3>
                                <p className="text-gray-400 text-sm mt-1">Pediatras, Clínicos, Cardiólogos...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LIST VIEW */}
            <div className="space-y-4">
                 <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 mb-4 max-w-md">
                     <Search className="w-5 h-5 text-gray-400 ml-2" />
                     <Input 
                        id="search-doctors"
                        name="search"
                        placeholder="Buscar por nombre o especialidad..." 
                        className="border-0 bg-transparent focus-visible:ring-0 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                 </div>

                 {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-cyan-500" /></div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {filteredDoctors.map(doc => (
                            <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/50 transition-all group">
                                <div className="flex justify-between mb-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">{doc.profiles?.full_name?.[0] || 'D'}</div>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold"><Star className="w-3 h-3 fill-current" /> {doc.rating || '5.0'}</div>
                                </div>
                                <h3 className="font-bold text-white">Dr. {doc.profiles?.full_name}</h3>
                                <p className="text-cyan-400 text-sm mb-4">{doc.specialization}</p>
                                <Button onClick={() => handleOpenRequestDialog('list_click', doc)} className="w-full bg-slate-800 hover:bg-cyan-600 text-white transition-colors">
                                    Solicitar Sesión
                                </Button>
                            </div>
                         ))}
                    </div>
                 )}
            </div>

            <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Solicitar Sesión Profesional</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Configura tu búsqueda.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="flex flex-col gap-4">
                            <div 
                                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${requestType === 'any' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                                onClick={() => { setRequestType('any'); setTargetSpecialty(''); }}
                            >
                                <div className="mr-4">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${requestType === 'any' ? 'border-cyan-500' : 'border-slate-600'}`}>
                                        {requestType === 'any' && <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" />}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold text-white flex items-center gap-2"><Radar className="w-4 h-4" /> Cualquier Profesional</div>
                                </div>
                            </div>

                            <div 
                                className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${requestType === 'specialty' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                                onClick={() => setRequestType('specialty')}
                            >
                                <div className="mr-4 mt-1">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${requestType === 'specialty' ? 'border-cyan-500' : 'border-slate-600'}`}>
                                        {requestType === 'specialty' && <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" />}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-white flex items-center gap-2 mb-2"><Stethoscope className="w-4 h-4" /> Por Especialidad</div>
                                    <Select value={targetSpecialty} onValueChange={(val) => { setTargetSpecialty(val); setRequestType('specialty'); }}>
                                        <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white mt-2">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white z-[200]">
                                            {specializations.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {selectedDoctor && (
                                <div 
                                    className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${requestType === 'specific' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                                    onClick={() => setRequestType('specific')}
                                >
                                    <div className="mr-4">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${requestType === 'specific' ? 'border-cyan-500' : 'border-slate-600'}`}>
                                            {requestType === 'specific' && <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" />}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2"><User className="w-4 h-4" /> Solo al Dr. {selectedDoctor.profiles?.full_name}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfigModalOpen(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
                        <Button onClick={handleStartSearch} className="bg-cyan-600 hover:bg-cyan-700 text-white" disabled={requestType === 'specialty' && !targetSpecialty}>
                            {requestType === 'specific' ? 'Enviar Solicitud' : 'Buscar Profesional'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FindDoctor;