import React from 'react';
import { Helmet } from 'react-helmet';
import { Key, ShieldCheck, Lock, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ManageSecurity = () => {
  return (
    <>
      <Helmet>
        <title>Seguridad - ArgMed Admin</title>
      </Helmet>
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold text-white">Centro de Seguridad</h1>
            <p className="text-gray-400">Control de acceso, contraseñas y auditoría.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Password Reset Section */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Key className="w-24 h-24 text-amber-500" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Key className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white">Restablecer Accesos</h3>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="space-y-2">
                <Label className="text-gray-300">Email del Usuario</Label>
                <div className="flex gap-2">
                    <Input type="email" placeholder="usuario@ejemplo.com" className="bg-slate-950 border-slate-700 text-white" />
                    <Button variant="outline" className="border-slate-700 text-gray-400"><Search className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="pt-2">
                 <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20">
                   <RefreshCw className="w-4 h-4 mr-2" /> Enviar Link de Recuperación
                 </Button>
                 <p className="text-xs text-gray-500 mt-2 text-center">
                    Se enviará un correo seguro al usuario para restablecer su contraseña.
                 </p>
              </div>
            </div>
          </div>

          {/* Security Policies */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-24 h-24 text-green-500" />
             </div>
             <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <ShieldCheck className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white">Estado del Sistema</h3>
            </div>
            
            <div className="space-y-3 relative z-10">
               <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-lg border border-green-500/20">
                 <div className="flex items-center gap-3">
                   <Lock className="w-4 h-4 text-green-400" />
                   <span className="text-gray-300 font-medium">Encriptación de Datos</span>
                 </div>
                 <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">ACTIVO</span>
               </div>

               <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                 <div className="flex items-center gap-3">
                   <ShieldCheck className="w-4 h-4 text-gray-400" />
                   <span className="text-gray-300">Autenticación 2FA (Admins)</span>
                 </div>
                 <div className="w-10 h-5 bg-green-500/20 rounded-full relative">
                   <div className="absolute right-1 top-1 w-3 h-3 bg-green-500 rounded-full"></div>
                 </div>
               </div>
               
               <div className="flex items-start gap-3 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                      <p className="text-sm font-bold text-red-400">Zona de Peligro</p>
                      <p className="text-xs text-gray-400 mt-1">Acciones sensibles requieren confirmación adicional del Super Admin.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageSecurity;