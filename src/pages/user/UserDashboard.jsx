import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import UserHome from '@/pages/user/userHome';
import MedicalHistory from '@/pages/user/MedicalHistory';
import Settings from '@/pages/user/Settings';
import FindProfessional from '@/pages/user/FindProfessional';
import UserProfile from '@/pages/user/userProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, Stethoscope, FileText, User, Settings as SettingsIcon, Bell, Home } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

const UserDashboard = () => {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
    const [pendingConsultations, setPendingConsultations] = useState([]);

    useEffect(() => {
        if (user) {
            fetchPendingConsultations();
            
            const channel = supabase
                .channel(`consultations:user_id=eq.${user.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations', filter: `user_id=eq.${user.id}` }, payload => {
                    fetchPendingConsultations();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    const fetchPendingConsultations = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('consultations')
                .select(`
                    *,
                    professional:professional_id (
                        full_name
                    )
                `)
                .eq('user_id', user.id)
                .eq('status', 'accepted')
                .in('payment_status', ['pending', 'unpaid']);
            
            if (error) throw error;
            setPendingConsultations(data);

        } catch (error) {
            // Silently handle error - consultations table may not exist yet
            console.log("Could not fetch pending consultations - table may not be configured yet");
            setPendingConsultations([]);
        }
    };
    
    const handleSignOut = async () => {
        await logout();
        navigate('/');
    };

    const sidebarVariants = {
        open: { x: 0 },
        closed: { x: "-100%" }
    };

    const NavLink = ({ to, icon: Icon, children }) => (
        <Link
            to={to}
            className="flex items-center p-3 text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(false)}
        >
            <Icon className="w-5 h-5 mr-3 text-cyan-400" />
            <span className="font-medium">{children}</span>
        </Link>
    );

    return (
        <div className="flex h-screen bg-slate-950 text-white">
            {/* Sidebar */}
            <motion.div
                className="fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 p-4 z-20 flex flex-col lg:translate-x-0"
                variants={sidebarVariants}
                initial={false}
                animate={isSidebarOpen ? "open" : "closed"}
                transition={{ type: "tween" }}
            >
                <div className="flex items-center mb-8">
                    <img src="/argmed-logo.svg" alt="ArgMed Logo" className="w-10 h-10 mr-2" />
                    <h1 className="text-xl font-bold text-white">ArgMed</h1>
                </div>

                <div className="flex items-center mb-8">
                    <Avatar>
                        <AvatarImage src={profile?.photo_url} />
                        <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                        <p className="font-semibold text-white">{profile?.full_name}</p>
                        <p className="text-sm text-cyan-400">{profile?.email}</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <Link to="/user/dashboard">
                        <Button className="w-full mb-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20">
                            <Home className="w-4 h-4 mr-2" />
                            Volver al Inicio
                        </Button>
                    </Link>
                    <NavLink to="/user/find-professional" icon={Stethoscope}>Buscar Profesional</NavLink>
                    <NavLink to="/user/medical-history" icon={FileText}>Historia Clínica</NavLink>
                    <NavLink to="/user/profile" icon={User}>Mi Perfil</NavLink>
                    <NavLink to="/user/settings" icon={SettingsIcon}>Configuración</NavLink>
                </nav>

                <div className="mt-auto">
                    <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-slate-400 hover:text-red-500 hover:bg-red-900/20">
                        <LogOut className="w-5 h-5 mr-3" />
                        Cerrar Sesión
                    </Button>
                </div>
            </motion.div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-auto">
                {/* Top Bar for mobile */}
                <header className="lg:hidden flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <LayoutDashboard className="h-6 w-6" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                             <Bell className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-red-400 hover:text-red-500 hover:bg-red-900/20">
                             <LogOut className="h-6 w-6" />
                        </Button>
                    </div>
                </header>
                
                <div className="p-6 md:p-8 flex-1">
                    {pendingConsultations.map(consult => (
                        <motion.div 
                            key={consult.id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 p-4 rounded-lg mb-6 text-white text-center shadow-lg"
                        >
                            <p className="font-semibold">
                                ¡Tu consulta con Dr. {consult.professional?.full_name || '...'} fue aceptada!
                            </p>
                            <p className="text-sm">Por favor, completá el pago para confirmar.</p>
                            <Button 
                                className="mt-2 bg-white text-blue-600 hover:bg-slate-200"
                                onClick={() => navigate(`/user/confirm-consultation/${consult.id}`)}
                            >
                                Ir a Pagar
                            </Button>
                        </motion.div>
                    ))}
                    <Routes>
                        <Route index element={<UserHome />} />
                        <Route path="dashboard" element={<UserHome />} />
                        <Route path="medical-history" element={<MedicalHistory />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="find-professional" element={<FindProfessional />} />
                        <Route path="profile" element={<UserProfile />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default UserDashboard;