import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playAlertSound } from '@/lib/sounds';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const DoctorAlert = ({ request, onAccept, onReject }) => {
  useEffect(() => {
    // Play sound when component mounts (alert appears)
    const interval = setInterval(() => {
       playAlertSound();
    }, 2000); // Repeat sound every 2s while alert is visible

    // Initial play
    playAlertSound();

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-[100] bg-slate-900 border border-cyan-500 rounded-xl shadow-2xl shadow-cyan-500/20 overflow-hidden"
      >
        {/* Animated Border */}
        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent animate-[loading_2s_ease-in-out_infinite]"></div>
        
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-cyan-500/20 p-3 rounded-full animate-[bounce_1s_infinite]">
              <Bell className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nueva Solicitud</h3>
              {request.type === 'smart' && (
                  <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/30 mb-1 inline-block animate-pulse">
                      URGENTE (Smart Search)
                  </span>
              )}
              <p className="text-gray-300 text-sm mt-1">
                Usuario: <span className="text-white font-semibold">{request.patientName}</span>
              </p>
              {request.reason && (
                  <p className="text-gray-400 text-xs italic mt-1 line-clamp-2">"{request.reason}"</p>
              )}
              <p className="text-green-400 font-mono text-sm mt-2">
                Honorarios: ${request.consultation_fee}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={onReject} 
              variant="outline" 
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 h-10"
            >
              <XCircle className="w-4 h-4 mr-2" /> Rechazar
            </Button>
            <Button 
              onClick={onAccept} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 h-10 font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Aceptar
            </Button>
          </div>
          
          <div className="mt-3 bg-slate-950/50 p-2 rounded text-center border border-slate-800">
              <p className="text-[10px] text-gray-500">Responde rápido para asegurar la consulta.</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DoctorAlert;