import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Activity, Search, Download, Eye, Loader2, Calendar, User, UserCog, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const ManageConsultations = () => {
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);
  const [filteredConsultations, setFilteredConsultations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, in_progress, completed, cancelled
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchConsultations();
  }, []);

  useEffect(() => {
    filterConsultations();
  }, [searchTerm, statusFilter, consultations]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          patient:users!consultations_patient_id_fkey (
            id,
            first_name,
            last_name,
            dni,
            email
          ),
          doctor:professionals!consultations_doctor_id_fkey (
            id,
            email,
            specialization,
            profiles:profiles!professionals_id_fkey (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize data
      const normalized = (data || []).map(c => ({
        ...c,
        patient: Array.isArray(c.patient) ? c.patient[0] : c.patient,
        doctor: Array.isArray(c.doctor) ? c.doctor[0] : c.doctor
      }));

      setConsultations(normalized);
      setFilteredConsultations(normalized);

      // Calculate stats
      const totalRevenue = normalized
        .filter(c => c.payment_status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.consultation_fee || 0), 0);

      setStats({
        total: normalized.length,
        pending: normalized.filter(c => c.status === 'pending').length,
        inProgress: normalized.filter(c => c.status === 'in_progress').length,
        completed: normalized.filter(c => c.status === 'completed').length,
        totalRevenue
      });

    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las consultas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterConsultations = () => {
    let filtered = consultations;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(c =>
        c.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.patient?.dni?.includes(searchTerm) ||
        c.doctor?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredConsultations(filtered);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Pendiente</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-600 text-white">Aceptada</Badge>;
      case 'in_progress':
        return <Badge className="bg-cyan-600 text-white">En Progreso</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 text-white">Completada</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-600 text-white">Cancelada</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rechazada</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge variant="outline" className="border-green-500 text-green-400">Pagado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-400">Pendiente</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-red-500 text-red-400">Fallido</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-500 text-gray-400">{paymentStatus}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Paciente', 'Doctor', 'Estado', 'Pago', 'Monto', 'Duración'];
    const rows = filteredConsultations.map(c => [
      c.id,
      new Date(c.created_at).toLocaleDateString('es-AR'),
      `${c.patient?.first_name} ${c.patient?.last_name}`,
      c.doctor?.profiles?.full_name || 'N/A',
      c.status,
      c.payment_status,
      `$${c.consultation_fee || 0}`,
      c.duration_minutes ? `${c.duration_minutes} min` : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consultas_argmed_${new Date().toISOString().split('T')[0]}.csv`;
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
        <title>Gestionar Consultas - ArgMed Admin</title>
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Consultas</h1>
            <p className="text-gray-400">Monitoreo de todas las consultas médicas</p>
          </div>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="border-cyan-500 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar CSV ({filteredConsultations.length})
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">En Progreso</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.inProgress}</p>
                </div>
                <Activity className="w-8 h-8 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Completadas</p>
                  <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Ingresos</p>
                  <p className="text-xl font-bold text-green-400">${stats.totalRevenue.toLocaleString('es-AR')}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="bg-slate-900/50 border-slate-800 flex-1">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por paciente, doctor o ID..."
                  className="pl-10 bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex gap-2">
                {['all', 'pending', 'in_progress', 'completed'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-cyan-600' : 'border-slate-700 text-gray-400'}
                  >
                    {status === 'all' ? 'Todas' : status === 'in_progress' ? 'En Progreso' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consultations List */}
        {filteredConsultations.length === 0 ? (
          <Card className="bg-slate-900/30 border-slate-800">
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">
                {searchTerm ? 'No se encontraron resultados' : 'No hay consultas registradas'}
              </h3>
              <p className="text-gray-500 mt-2">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Las consultas aparecerán aquí cuando se realicen'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredConsultations.map((consultation) => (
              <Card key={consultation.id} className="bg-slate-900/50 border-slate-800 hover:border-cyan-500/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(consultation.status)}
                      {getPaymentBadge(consultation.payment_status)}
                      <span className="text-xs text-gray-500">ID: {consultation.id.slice(0, 8)}...</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {new Date(consultation.created_at).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Paciente</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-white font-medium">
                          {consultation.patient?.first_name} {consultation.patient?.last_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">DNI: {consultation.patient?.dni}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Profesional</p>
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-white font-medium">
                          {consultation.doctor?.profiles?.full_name || 'No asignado'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">{consultation.doctor?.specialization}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Detalles</p>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-white font-medium">
                          ${consultation.consultation_fee?.toLocaleString('es-AR') || 0}
                        </span>
                      </div>
                      {consultation.duration_minutes && (
                        <p className="text-xs text-gray-500 ml-6">
                          Duración: {consultation.duration_minutes} minutos
                        </p>
                      )}
                    </div>
                  </div>

                  {consultation.reason && (
                    <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <p className="text-xs text-gray-500 mb-1">Motivo de Consulta</p>
                      <p className="text-sm text-gray-300">{consultation.reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ManageConsultations;
