import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Users, LogOut, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const LegalLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Panel Principal', path: '/legal/dashboard' },
    { icon: FileText, label: 'Documentos Pendientes', path: '/legal/documents' },
    { icon: Users, label: 'Registro de Médicos', path: '/legal/doctors' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-950 sticky top-0 h-screen">
        <div className="p-6">
           <div className="flex items-center gap-2 text-amber-500 mb-8">
               <ShieldCheck className="w-8 h-8" />
               <span className="text-2xl font-bold text-white">ArgMed<span className="text-xs text-amber-500 block">LEGAL</span></span>
           </div>
           
           <nav className="space-y-1">
             {navItems.map((item) => {
               const isActive = location.pathname === item.path;
               return (
                 <Link 
                   key={item.path} 
                   to={item.path}
                   className={cn(
                     "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                     isActive 
                       ? "bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20" 
                       : "text-gray-400 hover:bg-slate-900 hover:text-white"
                   )}
                 >
                   <item.icon className={cn("w-5 h-5", isActive ? "text-amber-400" : "text-slate-500 group-hover:text-white")} />
                   <span>{item.label}</span>
                 </Link>
               );
             })}
           </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10 border border-slate-700">
                <AvatarImage src={user?.photo_url} />
                <AvatarFallback className="bg-slate-800 text-amber-500">AD</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-white truncate">{user?.full_name || 'Admin Legal'}</p>
                 <p className="text-xs text-gray-500 truncate">Legal Team</p>
              </div>
           </div>
           <Button 
             onClick={handleSignOut} 
             variant="ghost" 
             className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
           >
             <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
           </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
           <div className="flex items-center gap-2 text-amber-500">
               <ShieldCheck className="w-6 h-6" />
               <span className="font-bold text-white">ArgMed Legal</span>
           </div>
        </div>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default LegalLayout;