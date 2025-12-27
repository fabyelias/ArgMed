import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, User, MapPin, CreditCard, Video, FileText, Star, Settings as SettingsIcon, LogOut, Menu, X, PlusCircle, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

const UserLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const menuItems = [
    { icon: Home, label: 'Inicio', path: '/user' },
    { icon: User, label: 'Perfil', path: '/user/profile' },
    { icon: MapPin, label: 'Buscar Profesional', path: '/user/find-doctor' },
    { icon: CreditCard, label: 'Pagos', path: '/user/payment' },
    { icon: FileText, label: 'Bitácora', path: '/user/history' },
    { icon: Star, label: 'Reseñas', path: '/user/reviews' },
    { icon: SettingsIcon, label: 'Configuración', path: '/user/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/30 h-16">
        <div className="flex items-center gap-2" onClick={() => navigate('/user')} role="button">
           <Activity className="w-6 h-6 text-cyan-400" />
           <span className="font-bold text-white">ArgMed</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-cyan-400 hover:bg-slate-800 active:scale-95 transition-transform"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 md:bg-slate-900/50 backdrop-blur-xl border-r border-cyan-500/30 pt-0 h-full transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Desktop Logo / Mobile Menu Header */}
          <div className="p-6 border-b border-cyan-500/30 flex justify-between items-center h-16 md:h-auto">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/user')}>
              <Activity className="w-8 h-8 text-cyan-400" />
              <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    ArgMed
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider hidden md:block">Portal Usuario</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-4 pb-2">
            <Button
              onClick={() => navigate('/user/find-doctor')}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/20"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Solicitar Profesional
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group text-sm font-medium",
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/50 text-cyan-400'
                      : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-white')} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-cyan-500/30 bg-slate-900/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <button className="flex items-center gap-3 w-full hover:bg-slate-800 p-2 rounded-lg transition-colors text-left outline-none">
                  <Avatar className="w-10 h-10 border-2 border-cyan-500/50">
                    <AvatarImage src={user?.photo_url} />
                    <AvatarFallback className="bg-slate-800 text-cyan-400">
                      {user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.email}</p>
                    <p className="text-xs text-gray-400 truncate">Usuario</p>
                  </div>
                  <SettingsIcon className="w-4 h-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-cyan-500/30 text-white">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="focus:bg-cyan-500/20 cursor-pointer" onClick={() => navigate('/user/profile')}>
                  <User className="mr-2 h-4 w-4" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-cyan-500/20 cursor-pointer" onClick={() => navigate('/user/settings')}>
                  <SettingsIcon className="mr-2 h-4 w-4" /> Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="focus:bg-red-500/20 text-red-400 cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-hidden flex flex-col pt-16 md:pt-0 relative z-0 w-full">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default UserLayout;