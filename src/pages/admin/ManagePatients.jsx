import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Users, Search, Download, Shield, Edit, Eye, Loader2, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const ManagePatients = () => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    activeThisMonth: 0,
    newToday: 0
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      console.log('Searching for:', searchTerm, 'in', patients.length, 'patients');
      const filtered = patients.filter(patient => {
        const matchesFirstName = patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLastName = patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEmail = patient.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDNI = patient.dni?.includes(searchTerm);

        if (matchesDNI) {
          console.log('DNI match found:', patient);
        }

        return matchesFirstName || matchesLastName || matchesEmail || matchesDNI;
      });
      console.log('Filtered results:', filtered.length);
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      setLoading(true);

      // Get all patients with their profile data
      // Note: users.id references profiles.id, so we use the foreign key constraint
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Patients loaded:', usersData?.length || 0, 'patients');
      console.log('First patient sample:', usersData?.[0]);

      setPatients(usersData || []);
      setFilteredPatients(usersData || []);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const activeThisMonth = usersData?.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= startOfMonth;
      }).length || 0;

      const newToday = usersData?.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= startOfToday;
      }).length || 0;

      setStats({
        total: usersData?.length || 0,
        activeThisMonth,
        newToday
      });

    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['DNI', 'Nombre', 'Apellido', 'Email', 'Ciudad', 'Provincia', 'Fecha Registro'];
    const rows = filteredPatients.map(p => [
      p.dni || '',
      p.first_name || '',
      p.last_name || '',
      p.email || '',
      p.city || '',
      p.province || '',
      new Date(p.created_at).toLocaleDateString('es-AR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_argmed_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestionar Usuarios - ArgMed Admin</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
            <p className="text-gray-400">Control de pacientes registrados en la plataforma</p>
          </div>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="border-cyan-500 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar CSV ({filteredPatients.length})
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Registrados</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
                </div>
                <Users className="w-12 h-12 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Registros este Mes</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-2">{stats.activeThisMonth}</p>
                </div>
                <Calendar className="w-12 h-12 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Nuevos Hoy</p>
                  <p className="text-3xl font-bold text-green-400 mt-2">{stats.newToday}</p>
                </div>
                <Shield className="w-12 h-12 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por DNI, email, nombre o apellido..."
                className="pl-10 bg-slate-950 border-slate-700 text-white focus:ring-cyan-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        {filteredPatients.length === 0 ? (
          <Card className="bg-slate-900/30 border-slate-800">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">
                {searchTerm ? 'No se encontraron resultados' : 'No hay usuarios registrados'}
              </h3>
              <p className="text-gray-500 mt-2">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Los usuarios aparecerán aquí cuando se registren'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="bg-slate-900/50 border-slate-800 hover:border-cyan-500/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {patient.first_name?.[0]}{patient.last_name?.[0]}
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {patient.first_name} {patient.last_name}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Shield className="w-4 h-4" />
                            <span>DNI: {patient.dni || 'No especificado'}</span>
                          </div>

                          {patient.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Mail className="w-4 h-4" />
                              <span>{patient.email}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>Registrado: {new Date(patient.created_at).toLocaleDateString('es-AR')}</span>
                          </div>
                        </div>

                        {(patient.city || patient.province) && (
                          <div className="mt-2 text-sm text-gray-500">
                            📍 {patient.city}{patient.city && patient.province && ', '}{patient.province}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ManagePatients;
