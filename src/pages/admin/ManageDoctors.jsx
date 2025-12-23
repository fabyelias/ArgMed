import React from 'react';
import { Helmet } from 'react-helmet';
import { Stethoscope, Search, Filter, MoreVertical, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ManageDoctors = () => {
  return (
    <>
      <Helmet>
        <title>Gestionar Médicos - ArgMed Admin</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Médicos</h1>
            <p className="text-gray-400">Administración de profesionales y validación de licencias.</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/20">
            <Stethoscope className="w-4 h-4 mr-2" /> Agregar Médico Manualmente
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input id="search-doc" name="search-doc" placeholder="Buscar por nombre, especialidad o matrícula..." className="pl-9 bg-slate-950 border-slate-700 text-white focus:ring-cyan-500" />
          </div>
          <Button variant="outline" className="border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800">
            <Filter className="w-4 h-4 mr-2" /> Filtros Avanzados
          </Button>
        </div>

        {/* Doctor List Placeholder */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-semibold text-white">Lista de Profesionales</h3>
          </div>
          
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Stethoscope className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Base de datos de médicos</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Visualiza el estado de validación, métricas de consultas y detalles de perfil de cada médico registrado.
            </p>
            <div className="flex justify-center gap-3">
               <Button variant="outline" className="border-slate-700 text-cyan-400">Ver Pendientes de Validación</Button>
               <Button variant="outline" className="border-slate-700 text-red-400">Ver Reportados</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageDoctors;