import React, { useState } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DoctorHome from '@/pages/doctor/DoctorHome';
import ConsultationHistory from '@/pages/doctor/ConsultationHistory';
import DoctorProfile from '@/pages/doctor/DoctorProfile';
import DoctorSettings from '@/pages/doctor/DoctorSettings';
import Requests from '@/pages/doctor/Requests';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, LayoutDashboard, History, User, Settings, Bell, Mail } from 'lucide-react';
import DoctorVerificationModal from '@/components/DoctorVerificationModal';

const DoctorDashboard = () => {
    const { user, profile, professional, signOut } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const isVerified = professional?.verification_status === 'approved';

    const NavLink = ({ to, icon: Icon, children }) => (
        <Link to={to} className="flex items-center p-3 text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors">
            <Icon className="w-5 h-5 mr-3 text-cyan-400" />
            <span className="font-medium">{children}</span>
        </Link>
    );

    return (
        <div className="flex h-screen bg-slate-950 text-white">
            <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 p-4 z-20 flex-col lg:flex ${isSidebarOpen ? 'flex' : 'hidden'}`}>
                <div className="flex items-center mb-8">
                    <img src="/argmed-logo.svg" alt="ArgMed Logo" className="w-10 h-10 mr-2" />
                    <h1 className="text-xl font-bold text-white">ArgMed Pro</h1>
                </div>

                <div className="flex items-center mb-8">
                    <Avatar>
                        <AvatarImage src={profile?.photo_url} />
                        <AvatarFallback>{profile?.full_name?.[0] || 'D'}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                        <p className="font-semibold">{profile?.full_name}</p>
                        <p className="text-sm text-slate-400">Doctor</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <NavLink to="/professional/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink to="/professional/requests" icon={Mail}>Solicitudes</NavLink>
                    <NavLink to="/professional/history" icon={History}>Historial</NavLink>
                    <NavLink to="/professional/profile" icon={User}>Mi Perfil</NavLink>
                    <NavLink to="/professional/settings" icon={Settings}>Configuración</NavLink>
                </nav>

                <div className="mt-auto">
                    <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-slate-400 hover:text-red-500 hover:bg-red-900/20">
                        <LogOut className="w-5 h-5 mr-3" />
                        Cerrar Sesión
                    </Button>
                </div>
            </div>

            <main className="flex-1 flex flex-col overflow-auto">
                <header className="lg:hidden flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <LayoutDashboard className="h-6 w-6" />
                    </Button>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon">
                             <Bell className="h-6 w-6" />
                        </Button>
                    </div>
                </header>
                
                <div className="p-6 md:p-8 flex-1">
                    {!isVerified && <DoctorVerificationModal professional={professional} />}
                    <Routes>
                        <Route index element={<DoctorHome />} />
                        <Route path="dashboard" element={<DoctorHome />} />
                        <Route path="requests" element={<Requests />} />
                        <Route path="history" element={<ConsultationHistory />} />
                        <Route path="profile" element={<DoctorProfile />} />
                        <Route path="settings" element={<DoctorSettings />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default DoctorDashboard;