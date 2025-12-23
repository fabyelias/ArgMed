import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Lock, Globe, Moon, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Tus preferencias han sido actualizadas",
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    if (result.success) {
      toast({ title: "Cuenta eliminada", description: "Lamentamos verte partir." });
      navigate('/');
    } else {
      toast({ title: "Error", description: "No se pudo eliminar la cuenta: " + result.error, variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 md:p-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
          Configuración
        </h1>

        <div className="space-y-6">
          {/* Notifications */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white font-medium">Notificaciones</p>
                <p className="text-sm text-gray-400">Recibir recordatorios de turnos</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-cyan-500 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </button>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white font-medium">Privacidad</p>
                <p className="text-sm text-gray-400">Gestionar privacidad de datos</p>
              </div>
            </div>
            <Button variant="outline" className="border-cyan-400 text-cyan-400">
              Configurar
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-400 font-medium">Eliminar Cuenta</p>
                <p className="text-sm text-gray-500">Esta acción es irreversible</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-red-500/50 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-red-500" />
                    ¿Estás absolutamente seguro?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta,
                    historial médico, consultas y todos los datos asociados de nuestros servidores.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700 border-none">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    {deleting ? "Eliminando..." : "Sí, eliminar mi cuenta"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            Guardar Cambios
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;