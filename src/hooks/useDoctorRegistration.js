import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useDoctorRegistration = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const registerAsDoctor = async () => {
    setLoading(true);
    try {
      // Call the database function we just created
      const { error } = await supabase.rpc('register_current_user_as_doctor');

      if (error) throw error;

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta de médico ha sido inicializada.",
        className: "bg-green-600 text-white"
      });
      return true;
    } catch (error) {
      console.error('Error registering doctor:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la cuenta de médico.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { registerAsDoctor, loading };
};