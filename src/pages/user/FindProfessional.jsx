import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Star, List, User, Stethoscope,
  Loader2, Check, ArrowRight, XCircle, Radar, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const FindProfessional = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Smart Routing & Request State
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState('idle'); 
    const [currentRequestId, setCurrentRequestId] = useState(null);
    const [contactedProfessionals, setContactedProfessionals] = useState([]);
    
    // Request Configuration Modal State
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState(null);
    const [requestType, setRequestType] = useState('any'); 
    const [targetSpecialty, setTargetSpecialty] = useState('');
    
    // Available Specializations
    const [specializations, setSpecializations] = useState([]);

    useEffect(() => {
        fetchProfessionals();
    }, []);

    const fetchProfessionals = async () => {
        try {
            setLoading(true);
            
            const { data: professionalsData, error: professionalsError } = await supabase
                .from('professionals')
                .select('*')
                .eq('is_active', true);
            
            if (professionalsError) throw professionalsError;

            const enrichedProfessionals = await Promise.all((professionalsData || []).map(async (doc) => {
                const { data: userData } = await supabase.from('users').select('first_name, last_name').eq('id', doc.id).maybeSingle();
                return {
                    ...doc,
                    profiles: userData ? {
                        full_name: `${userData.first_name} ${userData.last_name}`
                    } : null
                };
            }));
            
            setProfessionals(enrichedProfessionals);
            const specs = [...new Set(enrichedProfessionals.map(d => d.specialization).filter(Boolean))];
            setSpecializations(specs);
        } catch (error) {
            console.error("Error fetching professionals:", error);
            toast({ title: "Error", description: "No se pudieron cargar los profesionales.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRequestDialog = (source, professional = null) => {
        setSelectedProfessional(professional);
        
        if (source === 'specialty_card') {
            setRequestType('specialty');
        } else if (source === 'list_click' && professional) {
            setRequestType('specific');
            setTargetSpecialty(professional.specialization || '');
        } else {
            setRequestType('any');
        }
        
        setConfigModalOpen(true);
    };

    const handleStartSearch = async () => {
        setConfigModalOpen(false);
        
        if (requestType === 'specific' && selectedProfessional) {
            handleDirectRequest(selectedProfessional);
        } else {
            const filter = requestType === 'specialty' ? targetSpecialty : null;
            startSmartRouting(filter);
        }
    };

    const startSmartRouting = async (specialtyFilter) => {
        if (isSearching) return;
        setIsSearching(true);
        setSearchStatus('searching');
        setContactedProfessionals([]);

        try {
            const { data: reqData, error: reqError } = await supabase
                .from('consultation_requests')
                .insert({
                    patient_id: user.id,
                    specialty: specialtyFilter,
                    status: 'searching'
                })
                .select()
                .single();

            if (reqError) throw reqError;
            setCurrentRequestId(reqData.id);

            const candidates = professionals.filter(doc => {
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

            await routeRequestToNextProfessional(reqData.id, candidates, []);

        } catch (e) {
            console.error("Smart search error:", e);
            setIsSearching(false);
            setSearchStatus('idle');
            toast({ title: "Error", description: "No se pudo iniciar la búsqueda." });
        }
    };

    const routeRequestToNextProfessional = async (requestId, allCandidates, rejectedIds) => {
        const nextDoc = allCandidates.find(d => !rejectedIds.includes(d.id));

        if (!nextDoc) {
            setSearchStatus('timeout');
            await supabase.from('consultation_requests').update({ status: 'expired' }).eq('id', requestId);
            return;
        }

        setContactedProfessionals(prev => [...prev, nextDoc.profiles?.full_name]);

        await supabase.from('consultation_requests')
            .update({ current_doctor_id: nextDoc.id })
            .eq('id', requestId);

        await supabase.from('notifications').insert({
            user_id: nextDoc.id,
            type: 'smart_request',
            title: 'Solicitud Inmediata',
            message: `${user.full_name} espera atención${nextDoc.specialization ? ` (${nextDoc.specialization})` : ''}.`,
            payload: {
                requestId: requestId,
                patientId: user.id,
                patientName: user.full_name,
                specialty: nextDoc.specialization
            },
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
                             // This is the query matching your description
                             const { data: cons } = await supabase.from('consultations')
                                .select('id')
                                .eq('doctor_id', payload.new.current_doctor_id)
                                .eq('patient_id', user.id)
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

            if (currentReq && currentReq.status === 'searching' && currentReq.current_doctor_id === nextDoc.id) {
                 const newRejected = [...rejectedIds, nextDoc.id];

                 await supabase.from('consultation_requests')
                    .update({ rejected_doctor_ids: newRejected, current_doctor_id: null })
                    .eq('id', requestId);

                 supabase.removeChannel(channel);
                 routeRequestToNextProfessional(requestId, allCandidates, newRejected);
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

    const handleDirectRequest = async (professional) => {
        try {
            const { data: existing } = await supabase.from('consultations')
                .select('id')
                .eq('patient_id', user.id)
                .eq('doctor_id', professional.id)
                .eq('status', 'pending')
                .maybeSingle();

            if (existing) {
                toast({ title: "Ya enviaste una solicitud a este profesional", description: "Espera a que te responda." });
                return;
            }

            const { data } = await supabase.from('consultations').insert({
                doctor_id: professional.id,
                patient_id: user.id,
                status: 'pending',
                payment_status: 'pending',
                consultation_fee: professional.consultation_fee,
                reason: "Solicitud Directa"
            }).select().single();

            await supabase.from('notifications').insert({
                user_id: professional.id,
                type: 'consultation_request',
                title: 'Solicitud Directa',
                message: `${user.full_name} solicita sesión.`,
                payload: {
                    consultationId: data.id,
                    patientId: user.id,
                    patientName: user.full_name
                },
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

    const filteredProfessionals = professionals.filter(doc => 
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
                                <h2 className="text-2xl font-bold text-white mb-2">Buscando profesional disponible...</h2>
                                <p className="text-gray-400 mb-6">
                                    Contactando profesionales independientes. <br/>
                                    <span className="text-cyan-400 text-sm font-mono mt-2 block">
                                        {contactedProfessionals.length > 0 ? `Contactando: ${contactedProfessionals[contactedProfessionals.length-1]}` : 'Iniciando...'}
                                    </span>
                                </p>
                                <Button onClick={cancelSearch} variant="outline" className="border-slate-700 text-red-400 w-full">Cancelar</Button>
                            </>
                        )}

                        {searchStatus === 'timeout' && (
                            <>
                                <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">No se encontraron profesionales</h2>
                                <p className="text-gray-400 mb-6">Intenta nuevamente más tarde.</p>
                                <Button onClick={cancelSearch} className="bg-slate-800 text-white w-full">Cerrar</Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="mb-8">
                <Button
                    onClick={() => navigate('/user/dashboard')}
                    variant="ghost"
                    className="mb-4 text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al inicio
                </Button>
                <h1 className="text-3xl font-bold text-white mb-2">Encontrá tu Profesional</h1>
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
                        id="search-professionals"
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
                         {filteredProfessionals.map(doc => (
                            <div key={doc.id} className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/50 transition-all group shadow-lg hover:shadow-cyan-500/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 overflow-hidden border-2 border-slate-700 group-hover:border-cyan-500/50 transition-all shadow-lg">
                                            {doc.photo_url ? (
                                                <img src={doc.photo_url} alt={doc.profiles?.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                                                    {doc.profiles?.full_name?.[0] || 'P'}
                                                </div>
                                            )}
                                        </div>
                                        {doc.is_active && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/30">
                                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                        <span className="text-yellow-500 text-xs font-bold">{doc.rating || '5.0'}</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h3 className="font-bold text-white text-lg mb-1 group-hover:text-cyan-400 transition-colors">{doc.profiles?.full_name || 'Profesional'}</h3>
                                    <p className="text-cyan-400 text-sm font-medium mb-2">{doc.specialization || 'Médico General'}</p>

                                    {doc.license_number && (
                                        <p className="text-gray-500 text-xs">Mat. Nº {doc.license_number}</p>
                                    )}
                                </div>

                                <div className="bg-slate-950/50 rounded-lg p-3 mb-4 border border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 text-xs">Consulta</span>
                                        <span className="text-emerald-400 font-bold text-lg">${doc.consultation_fee || '0'}</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleOpenRequestDialog('list_click', doc)}
                                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white transition-all shadow-md hover:shadow-lg group-hover:scale-[1.02]"
                                >
                                    <User className="w-4 h-4 mr-2" />
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

                            {selectedProfessional && (
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
                                        <div className="font-bold text-white flex items-center gap-2"><User className="w-4 h-4" /> Solo a {selectedProfessional.profiles?.full_name}</div>
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

export default FindProfessional;