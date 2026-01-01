import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Activity,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Settings,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard General', path: '/admin' },
    { icon: Stethoscope, label: 'Gestión de Profesionales', path: '/admin/professionals' },
    { icon: Users, label: 'Gestión de Usuarios', path: '/admin/users' },
    { icon: Activity, label: 'Gestión de Consultas', path: '/admin/consultations' },
    { icon: Settings, label: 'Configuración', path: '/admin/settings' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      <div className="p-6">
         <div className="flex items-center gap-3 mb-8 px-2">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <ShieldAlert className="w-6 h-6 text-white" />
             </div>
             <div>
               <span className="text-lg font-bold text-white block leading-none">ArgMed</span>
               <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Super Admin</span>
             </div>
         </div>
         
         <nav className="space-y-1.5">
           {navItems.map((item) => {
             const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
             return (
               <Link 
                 key={item.path} 
                 to={item.path}
                 className={cn(
                   "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden",
                   isActive 
                     ? "bg-slate-900 text-cyan-400 font-semibold shadow-inner" 
                     : "text-slate-400 hover:bg-slate-900/50 hover:text-white"
                 )}
               >
                 {isActive && (
                   <motion.div
                     layoutId="active-pill"
                     className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-full"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                   />
                 )}
                 <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300")} />
                 <span className="z-10 text-sm">{item.label}</span>
                 {isActive && <ChevronRight className="w-4 h-4 ml-auto text-cyan-500/50" />}
               </Link>
             );
           })}
         </nav>
      </div>

      <div className="mt-auto p-4 m-4 bg-slate-900/50 rounded-2xl border border-slate-800">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.full_name?.[0]?.toUpperCase() || 'M'}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-bold text-white truncate">{user?.full_name || 'MelinexoBA'}</p>
               <p className="text-xs text-slate-500 truncate" title={user?.email}>{user?.email}</p>
            </div>
         </div>
         <Button 
           onClick={handleSignOut} 
           variant="destructive" 
           className="w-full justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
         >
           <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
         </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-800 bg-slate-950 sticky top-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-white" />
             </div>
             <span className="text-lg font-bold text-white">Panel Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white hover:bg-slate-800">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Sidebar (Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-xs bg-slate-950 border-r border-slate-800 z-50 lg:hidden shadow-2xl shadow-black"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0">
        <div className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;