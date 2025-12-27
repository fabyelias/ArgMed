import React from 'react';
import { Helmet } from 'react-helmet';
import { Users, Search, Download, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ManagePatients = () => {
  return (
    <>
      <Helmet>
        <title>Gestionar Usuarios - ArgMed Admin</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
            <p className="text-gray-400">Control de usuarios y actividad de Usuarios.</p>
          </div>
          <Button variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300">
            <Download className="w-4 h-4 mr-2" /> Exportar Reporte CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-sm text-gray-500">Total Registrados</p>
                <p className="text-2xl font-bold text-white">--</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-sm text-gray-500">Activos este mes</p>
                <p className="text-2xl font-bold text-cyan-400">--</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-sm text-gray-500">Nuevos hoy</p>
                <p className="text-2xl font-bold text-green-400">--</p>
             </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input id="search-patients" name="search-patients" placeholder="Buscar por DNI, email o nombre completo..." className="pl-9 bg-slate-950 border-slate-700 text-white focus:ring-cyan-500" />
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">Directorio Global de Usuarios</h3>
          <p className="text-gray-500 mt-2">Utiliza el buscador superior para localizar registros específicos.</p>
        </div>
      </div>
    </>
  );
};

export default ManagePatients;