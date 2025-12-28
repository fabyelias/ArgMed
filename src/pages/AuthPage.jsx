import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Eye, EyeOff, CreditCard, UserCheck, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import TermsAndConditions from '@/components/TermsAndConditions';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  
  // Only used for Registration now
  const [role, setRole] = useState('patient'); 
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Terms state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const [formData, setFormData] = useState({
    emailOrId: '', // Combined field for login
    email: '', 
    firstName: '',
    lastName: '',
    dni: '',
    password: '',
    confirmPassword: '',
    fullName: '', 
    profession: '', // Changed from specialization - free text field for any profession
    professionalLicense: '' // Changed from medicalLicense - not required in registration
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);

      const loginInput = formData.emailOrId;

      // Super Admin Detection (Hidden)
      let isSuperAdmin = false;
      let superAdminEmail = '';
      if (loginInput === 'Legales' && formData.password === 'Legalesnexoba2025') {
          isSuperAdmin = true; superAdminEmail = 'legales@argmed.com';
          await supabase.functions.invoke('create-legal-user');
      } else if (loginInput === 'MelinexoBA' && formData.password === 'GrupoNexoBA2025') {
          isSuperAdmin = true; superAdminEmail = 'melinexoba@argmed.com';
          await supabase.functions.invoke('create-melinexoba-user');
      }

      const credential = isSuperAdmin ? superAdminEmail : loginInput;
      
      const result = await login(credential, formData.password);
      
      if (result.success) {
          toast({ title: "¡Bienvenido!", description: "Inicio de sesión exitoso" });
          
          // Redirect based on returned role
          if (result.role === 'patient') navigate('/user');
          else if (result.role === 'doctor') navigate('/professional'); // Will redirect to onboarding if needed via Dashboard guard
          else if (result.role === 'legal_admin') navigate('/legal/dashboard');
          else if (result.role === 'admin') navigate('/admin');
          else navigate('/');
      } else {
          // Retry for Super Admin if it was a first-time create race condition
          if (isSuperAdmin) {
               const retry = await login(superAdminEmail, formData.password);
               if (retry.success) {
                  navigate('/legal/dashboard');
                  return;
               }
          }
          toast({ title: "Error de inicio de sesión", description: result.error, variant: "destructive" });
      }
      setLoading(false);
  };

  const handleRegister = async (e) => {
      e.preventDefault();
      
      if (!termsAccepted) {
          toast({ 
              title: "Documentación Legal", 
              description: "Debes aceptar los Términos, Política de Privacidad y Descargos para continuar.", 
              variant: "destructive" 
          });
          setShowTermsModal(true); // Open modal if not accepted
          return;
      }

      setLoading(true);

      if (formData.password !== formData.confirmPassword) {
          toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
          setLoading(false);
          return;
      }

      const additionalData = {
          fullName: role === 'patient' ? `${formData.firstName} ${formData.lastName}` : formData.fullName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          dni: formData.dni,
          termsAcceptedAt: new Date().toISOString(),
          ...(role === 'doctor' && {
            profession: formData.profession, // Free text field for any profession type
            consultationFee: 0,
            isActive: false
          })
      };

      // Patient uses DNI as identifier, Professional uses Email
      const registerIdentifier = role === 'patient' ? formData.dni : formData.email;

      const result = await register(registerIdentifier, formData.password, role, additionalData);
      
      if (result.success) {
          toast({ 
              title: "¡Cuenta creada!", 
              description: role === 'patient' ? "Ya puedes ingresar con tu DNI." : "Completa tu perfil profesional." 
          });
          
          if (role === 'doctor') {
              // Direct login attempt to streamline
              const loginResult = await login(formData.email, formData.password);
              if (loginResult.success) {
                  navigate('/professional/onboarding'); // NEW: Redirect to Onboarding
              } else {
                  setIsLogin(true); // Fallback if auto-login fails
              }
          } else {
              setIsLogin(true);
          }
      } else {
          toast({ title: "Error de registro", description: result.error, variant: "destructive" });
      }
      setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>{isLogin ? 'Iniciar Sesión' : 'Registrarse'} - ArgMed</title>
      </Helmet>

      <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-full h-full bg-gradient-to-br from-cyan-500/10 via-blue-600/10 to-slate-950"></div>
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
            
            {/* Header */}
            <div className="flex flex-col items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-2">
                <Activity className="w-8 h-8 text-cyan-400" />
                <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  ArgMed
                </span>
              </div>
              <p className="text-gray-400 text-sm">Plataforma de Videocomunicación</p>
            </div>

            {isLogin ? (
                // --- LOGIN VIEW ---
                <form onSubmit={handleLogin} className="space-y-5">
                   <div>
                    <Label htmlFor="emailOrId" className="text-gray-300">Email o DNI</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                      <Input
                        id="emailOrId"
                        name="emailOrId"
                        type="text"
                        required
                        value={formData.emailOrId}
                        onChange={handleInputChange}
                        className="bg-slate-950 border-gray-700 text-white pl-10 focus:border-cyan-400"
                        placeholder="ej. usuario@mail.com o 30123456"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-300">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="bg-slate-950 border-gray-700 text-white pl-10 pr-10 focus:border-cyan-400"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white py-6 rounded-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/40"
                  >
                    {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                  </Button>
                </form>
            ) : (
                // --- REGISTER VIEW ---
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Account Type Toggle */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 mb-4">
                    <button
                        type="button"
                        onClick={() => setRole('patient')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${role === 'patient' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        <UserCheck className="w-4 h-4" /> Estándar
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('doctor')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${role === 'doctor' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Briefcase className="w-4 h-4" /> Profesional
                    </button>
                  </div>

                  {role === 'patient' ? (
                     // Standard Account Fields
                     <div className="space-y-3">
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-gray-400">Nombre</Label>
                                <Input name="firstName" required value={formData.firstName} onChange={handleInputChange} className="bg-slate-950 border-gray-700 h-9" />
                            </div>
                            <div>
                                <Label className="text-xs text-gray-400">Apellido</Label>
                                <Input name="lastName" required value={formData.lastName} onChange={handleInputChange} className="bg-slate-950 border-gray-700 h-9" />
                            </div>
                         </div>
                         <div>
                            <Label className="text-xs text-gray-400">DNI (Será tu usuario)</Label>
                            <div className="relative">
                                <CreditCard className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                                <Input name="dni" required value={formData.dni} onChange={handleInputChange} className="bg-slate-950 border-gray-700 pl-9 h-10" placeholder="Solo números" />
                            </div>
                         </div>
                     </div>
                  ) : (
                     // Professional Account Fields
                     <div className="space-y-3">
                         <div>
                            <Label className="text-xs text-gray-400">Nombre y Apellido</Label>
                            <Input name="fullName" required value={formData.fullName} onChange={handleInputChange} className="bg-slate-950 border-gray-700 h-9" />
                         </div>
                         <div>
                            <Label className="text-xs text-gray-400">Email Profesional</Label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                                <Input name="email" type="email" required value={formData.email} onChange={handleInputChange} className="bg-slate-950 border-gray-700 pl-9 h-10" />
                            </div>
                         </div>
                         <div>
                            <Label className="text-xs text-gray-400">Profesión u Oficio</Label>
                            <Input
                                name="profession"
                                required
                                value={formData.profession}
                                onChange={handleInputChange}
                                className="bg-slate-950 border-gray-700 h-9"
                                placeholder="Ej: Médico, Abogado, Psicólogo, Gasista, Electricista..."
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Ingresa tu profesión, especialidad u oficio</p>
                         </div>
                     </div>
                  )}

                  <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-400">Contraseña</Label>
                        <Input 
                            name="password" type="password" required 
                            value={formData.password} onChange={handleInputChange} 
                            className="bg-slate-950 border-gray-700 h-10" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Confirmar Contraseña</Label>
                        <Input 
                            name="confirmPassword" type="password" required 
                            value={formData.confirmPassword} onChange={handleInputChange} 
                            className="bg-slate-950 border-gray-700 h-10" 
                        />
                      </div>
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
                     <Checkbox 
                        id="terms" 
                        checked={termsAccepted} 
                        onCheckedChange={setTermsAccepted} 
                        className="mt-1"
                     />
                     <div className="grid gap-1.5 leading-none">
                        <Label 
                            htmlFor="terms" 
                            className="text-sm font-medium leading-none text-gray-400 cursor-pointer"
                        >
                            He leído y acepto los <span className="text-cyan-400 hover:text-cyan-300 hover:underline" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>Términos, Privacidad y Descargos</span>
                        </Label>
                     </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 text-white py-5 rounded-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                  >
                    {loading ? 'Creando...' : 'Crear Cuenta'}
                  </Button>
                </form>
            )}

            {/* Switch Mode */}
            <div className="mt-6 text-center border-t border-slate-800 pt-4">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                {isLogin ? "¿No tienes cuenta? Registrate aquí" : '¿Ya tienes cuenta? Iniciar Sesión'}
              </button>
            </div>
            
            <div className="mt-4 text-center">
                <button onClick={() => navigate('/')} className="text-xs text-gray-500 hover:text-gray-300">Volver al Inicio</button>
            </div>

          </div>
        </motion.div>
        
        <TermsAndConditions 
            open={showTermsModal} 
            onOpenChange={setShowTermsModal} 
            onAccept={() => setTermsAccepted(true)}
        />
      </div>
    </>
  );
};

export default AuthPage;