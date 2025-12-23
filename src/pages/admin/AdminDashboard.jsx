import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Activity, Users, Stethoscope, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const AdminDashboard = () => {
  const [stats, setStats] = useState([
    { icon: Users, label: 'Total Patients', value: '-', change: '...' },
    { icon: Stethoscope, label: 'Active Doctors', value: '-', change: '...' },
    { icon: DollarSign, label: 'Revenue', value: '-', change: '...' },
    { icon: TrendingUp, label: 'Consultations', value: '-', change: '...' },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Patients Count
        const { count: patientCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'patient');

        // 2. Active Doctors Count
        const { count: doctorCount } = await supabase
          .from('professionals')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // 3. Revenue (Simple sum of approved payments)
        const { data: payments } = await supabase
          .from('payments')
          .select('total_amount')
          .eq('status', 'approved');
        
        const totalRevenue = payments?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

        // 4. Consultations Count
        const { count: consultationCount } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true });

        setStats([
          { icon: Users, label: 'Total Patients', value: patientCount || 0, change: 'Live' },
          { icon: Stethoscope, label: 'Active Doctors', value: doctorCount || 0, change: 'Live' },
          { icon: DollarSign, label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, change: 'Live' },
          { icon: TrendingUp, label: 'Consultations', value: consultationCount || 0, change: 'Live' },
        ]);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - ArgMed</title>
        <meta name="description" content="Platform administration and analytics" />
      </Helmet>

      <div className="min-h-screen bg-slate-950 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <Activity className="w-10 h-10 text-cyan-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-400/60 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-green-400 text-sm font-medium">{stat.change}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-white text-2xl font-bold">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Placeholder Content */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-12 text-center">
              <BarChart3 className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Analytics & Reports</h2>
              <p className="text-gray-400">
                Detailed platform analytics and user management tools will be available here
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;