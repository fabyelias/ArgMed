import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Activity } from 'lucide-react';

const WelcomeMessage = () => {
  const { user, profile } = useAuth();

  return (
    <motion.div
      className='mb-8 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-6'
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <Activity className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">
          ¡Bienvenido, {profile?.first_name || profile?.full_name?.split(' ')[0] || 'Paciente'}!
        </h1>
      </div>
      <p className='text-gray-300'>
        Conectá con profesionales de la salud desde la comodidad de tu hogar.
        <span className='font-semibold text-cyan-400'> ArgMed</span>, tu plataforma de telemedicina de confianza.
      </p>
    </motion.div>
  );
};

export default WelcomeMessage;