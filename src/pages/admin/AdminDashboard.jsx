import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, UserCog, Activity, DollarSign,
  TrendingUp, Calendar, Shield, Settings,
  Loader2, Eye, Edit, BarChart3
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfessionals: 0,
    totalConsultations: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    activeConsultations: 0
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get total users (patients)
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get total professionals
      const { count: profCount } = await supabase
        .from('professionals')
        .select('*', { count: 'exact', head: true });

      // Get total consultations
      const { count: consultCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true });

      // Get pending professional approvals
      const { count: pendingCount } = await supabase
        .from('professionals')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      // Get active consultations
      const { count: activeCount } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'accepted', 'in_progress']);

      // Get total revenue (sum of completed consultations)
      const { data: revenueData } = await supabase
        .from('consultations')
        .select('consultation_fee')
        .eq('payment_status', 'paid')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, c) => sum + parseFloat(c.consultation_fee || 0), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalProfessionals: profCount || 0,
        totalConsultations: consultCount || 0,
        totalRevenue: totalRevenue,
        pendingApprovals: pendingCount || 0,
        activeConsultations: activeCount || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950">
        <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Panel de Administración - ArgMed</title>
        <meta name="description" content="Panel de control administrativo de ArgMed" />
      </Helmet>

      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Panel de Administración
              </h1>
            </div>
            <p className="text-gray-400">Bienvenido, {user?.user_metadata?.full_name || 'Admin'}</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Total Usuarios
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                  <p className="text-xs text-gray-500 mt-1">Pacientes registrados</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Total Profesionales
                  </CardTitle>
                  <UserCog className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalProfessionals}</div>
                  <p className="text-xs text-gray-500 mt-1">Médicos en plataforma</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Consultas Totales
                  </CardTitle>
                  <Activity className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalConsultations}</div>
                  <p className="text-xs text-gray-500 mt-1">Todas las consultas</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Ingresos Totales
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    ${stats.totalRevenue.toLocaleString('es-AR')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Consultas completadas</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Pendientes Aprobación
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.pendingApprovals}</div>
                  <p className="text-xs text-gray-500 mt-1">Profesionales por revisar</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Consultas Activas
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.activeConsultations}</div>
                  <p className="text-xs text-gray-500 mt-1">En curso ahora</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="text-blue-400" /> Gestión de Usuarios
                  </CardTitle>
                  <CardDescription>Ver y editar perfiles de pacientes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => navigate('/admin/users')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="mr-2 w-4 h-4" />
                    Ver Todos los Usuarios
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserCog className="text-green-400" /> Gestión de Profesionales
                  </CardTitle>
                  <CardDescription>Ver y editar perfiles de médicos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => navigate('/admin/professionals')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Eye className="mr-2 w-4 h-4" />
                    Ver Todos los Profesionales
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="text-purple-400" /> Consultas
                  </CardTitle>
                  <CardDescription>Monitorear todas las consultas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => navigate('/admin/consultations')}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Eye className="mr-2 w-4 h-4" />
                    Ver Todas las Consultas
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
              <Card className="bg-slate-900/50 backdrop-blur-xl border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="text-gray-400" /> Configuración
                  </CardTitle>
                  <CardDescription>Ajustes del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => navigate('/admin/settings')}
                    variant="outline"
                    className="w-full border-slate-700"
                  >
                    <Settings className="mr-2 w-4 h-4" />
                    Configuración General
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
