import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, Video, MapPin, Clock, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Video,
      title: 'Videollamadas Seguras',
      description: 'Conectate con profesionales certificados a través de sesiones encriptadas'
    },
    {
      icon: MapPin,
      title: 'Encontrá Especialistas',
      description: 'Mapa interactivo que muestra profesionales disponibles en tu zona'
    },
    {
      icon: Shield,
      title: 'Privacidad Garantizada',
      description: 'Plataforma compatible con estándares de seguridad y encriptación de extremo a extremo'
    },
    {
      icon: Clock,
      title: 'Disponibilidad 24/7',
      description: 'Accedé a profesionales de la comunicación virtual en cualquier momento y lugar'
    },
    {
      icon: Activity,
      title: 'Bitácora de Sesiones',
      description: 'Registros de comunicación digital accesibles desde cualquier dispositivo'
    },
    {
      icon: Award,
      title: 'Profesionales Certificados',
      description: 'Todos los especialistas están verificados y matriculados'
    }
  ];

  return (
    <>
      <Helmet>
        <title>ArgMed - Plataforma Avanzada de Videocomunicación</title>
        <meta name="description" content="Conectate con profesionales certificados mediante videollamadas seguras. ArgMed lleva la conexión a tus manos con tecnología avanzada." />
      </Helmet>

      <div className="min-h-screen bg-slate-950 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-full h-full bg-gradient-to-br from-cyan-500/10 via-blue-600/10 to-slate-950"></div>
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Header */}
        <header className="relative z-10 container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <Activity className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                ArgMed
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
              >
                Iniciar Sesión
              </Button>
            </motion.div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 bg-clip-text text-transparent">
                  Comunicación Segura
                </span>
                <br />
                <span className="text-white">Al Alcance de tu Mano</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Experimentá el futuro de la conexión con la plataforma de videollamadas ArgMed. 
                Conectate con profesionales al instante, gestioná tu bitácora de comunicación digitalmente y recibí la atención que merecés.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate('/auth?role=patient')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-lg shadow-lg shadow-cyan-500/50 transition-all hover:shadow-cyan-500/70"
                >
                  Soy Usuario
                </Button>
                <Button
                  onClick={() => navigate('/auth?role=doctor')}
                  variant="outline"
                  className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 px-8 py-6 text-lg rounded-lg transition-all"
                >
                  Soy Profesional
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/30">
                <img alt="Videollamada de comunicación" className="w-full h-auto" src="https://images.unsplash.com/photo-1690264459930-706e281162ed" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
              </div>
              <motion.div
                className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-3xl opacity-50"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.7, 0.5],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                }}
              />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative z-10 container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Características Revolucionarias
            </h2>
            <p className="text-xl text-gray-400">
              Todo lo que necesitás para una comunicación virtual integral
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-slate-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-400/60 transition-all">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-2xl p-12 text-center"
          >
            <h2 className="text-4xl font-bold mb-4 text-white">
              ¿Listo para Transformar tu Experiencia de Comunicación?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Sumate a miles de usuarios y profesionales que ya usan ArgMed para mejorar sus conexiones
            </p>
            <Button
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-12 py-6 text-lg rounded-lg shadow-lg shadow-cyan-500/50 transition-all hover:shadow-cyan-500/70"
            >
              Empezar Ahora
            </Button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-cyan-500/20 mt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-cyan-400" />
                <span className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  ArgMed
                </span>
              </div>
              <p className="text-gray-400">
                © 2025 ArgMed. Todos los derechos reservados. Plataforma segura de videocomunicación.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;