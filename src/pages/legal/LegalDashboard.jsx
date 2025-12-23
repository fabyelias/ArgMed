import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Loader2, 
  Filter, 
  AlertCircle, 
  FileText,
  CheckCircle2,
  MoreVertical,
  Eye,
  Briefcase
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DoctorVerificationModal from '@/components/DoctorVerificationModal';
import { useToast } from '@/components/ui/use-toast';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  </div>
);

const ProfessionalCard = ({ professional, onViewProfile }) => {
  const isVerified = professional.verification_status === 'approved';

  return (
    <Card className="bg-slate-950 border-slate-800 overflow-hidden hover:border-slate-700 transition-all duration-300 group">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex gap-4">
              <Avatar className="w-14 h-14 border-2 border-slate-800 shadow-xl">
                <AvatarImage src={professional.profile?.photo_url} />
                <AvatarFallback className="bg-slate-900 text-slate-300 text-lg font-bold">
                  {professional.profile?.full_name?.substring(0, 2).toUpperCase() || 'ES'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-white text-lg leading-tight group-hover:text-cyan-400 transition-colors">
                  {professional.profile?.full_name || 'Nombre no disponible'}
                </h3>
                <p className="text-cyan-500 text-sm font-medium mb-1">{professional.specialization}</p>
                <Badge 
                  variant={isVerified ? "default" : "secondary"} 
                  className={`
                    text-[10px] px-2 py-0.5 h-auto uppercase tracking-wider font-bold
                    ${isVerified 
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20" 
                      : "bg-slate-800 text-slate-400 border-slate-700"}
                  `}
                >
                  {isVerified ? "Verificado" : "Sin verificar"}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white -mr-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                <DropdownMenuItem onClick={onViewProfile}>
                  <Eye className="w-4 h-4 mr-2" /> Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-400 focus:text-red-300">
                  <AlertCircle className="w-4 h-4 mr-2" /> Reportar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Sesiones</p>
              <p className="text-xl font-bold text-white">0</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Comisión Plataforma</p>
              <p className="text-xl font-bold text-green-400">$ 0</p>
            </div>
          </div>

          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-all"
            onClick={onViewProfile}
          >
            <Eye className="w-4 h-4 mr-2" /> Ver perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const LegalDashboard = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'verified'
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      // Using explicit relationship naming for the join as requested by user
      // professionals.id -> profiles.id via explicit constraint name if needed, or relationship syntax
      // User requested: select=*,profile:profiles!fk_professionals_profile(full_name,photo_url,email)
      
      const { data, error } = await supabase
        .from('professionals')
        .select(`
          *,
          profile:profiles!fk_professionals_profile (
            full_name,
            photo_url,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Normalize data (handle array vs object response from join)
      // Removed extra extraction logic as requested previously.
      const normalizedData = (data || []).map(prof => ({
        ...prof,
        profile: Array.isArray(prof.profile) ? prof.profile[0] : prof.profile
      }));
      
      setProfessionals(normalizedData);
    } catch (error) {
      console.error('Error fetching professionals:', error);
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudieron cargar los profesionales."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const handleOpenProfile = (professional) => {
    // We need to shape the data so the modal understands it (it expects 'profiles' prop structure from other views)
    // but here we have 'profile'. We can adapt it.
    const modalData = {
        ...professional,
        profiles: professional.profile // Map profile -> profiles for the modal
    };
    setSelectedProfessional(modalData);
    setIsModalOpen(true);
  };

  const handleProfessionalApproved = (professionalId) => {
    fetchProfessionals();
  };

  const filteredProfessionals = professionals.filter(prof => {
    const matchesSearch = prof.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prof.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'pending') return matchesSearch && prof.verification_status !== 'approved';
    if (filter === 'verified') return matchesSearch && prof.verification_status === 'approved';
    return matchesSearch;
  });

  const pendingCount = professionals.filter(p => p.verification_status !== 'approved').length;

  return (
    <>
      <Helmet>
        <title>Panel Legal - ArgMed</title>
      </Helmet>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Directorio de Especialistas</h1>
            <p className="text-slate-400">Gestión y verificación de profesionales de la plataforma.</p>
            <p className="text-xs text-slate-500 mt-1">
                Nota: Los especialistas facturan directamente al usuario. La plataforma gestiona las comisiones por uso.
            </p>
          </div>
          <div className="flex gap-3">
             <Button 
               variant={filter === 'pending' ? 'default' : 'outline'}
               onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
               className={`gap-2 ${filter === 'pending' ? 'bg-orange-500 hover:bg-orange-600' : 'border-slate-700 text-slate-300'}`}
             >
               <AlertCircle className="w-4 h-4" />
               Pendientes
               {pendingCount > 0 && (
                 <Badge className="ml-1 bg-white/20 text-white hover:bg-white/30 h-5 px-1.5">{pendingCount}</Badge>
               )}
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            label="Total Especialistas" 
            value={professionals.length} 
            icon={Briefcase} 
            color="bg-blue-500" 
          />
          <StatCard 
            label="Pendientes de Validación" 
            value={pendingCount} 
            icon={FileText} 
            color="bg-orange-500" 
          />
          <StatCard 
            label="Verificados" 
            value={professionals.length - pendingCount} 
            icon={CheckCircle2} 
            color="bg-green-500" 
          />
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 sticky top-0 z-10 shadow-lg shadow-black/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Buscar especialista por nombre o rubro..." 
              className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-cyan-500 focus:border-cyan-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800">
              <Filter className="w-4 h-4 mr-2" /> Filtros
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
            <p className="text-slate-400">Cargando directorio...</p>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No se encontraron especialistas</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Intenta ajustar los filtros de búsqueda o el estado de verificación.
            </p>
            {filter !== 'all' && (
              <Button variant="link" onClick={() => setFilter('all')} className="mt-4 text-cyan-400">
                Ver todos
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProfessionals.map((professional) => (
              <ProfessionalCard 
                key={professional.id} 
                professional={professional} 
                onViewProfile={() => handleOpenProfile(professional)} 
              />
            ))}
          </div>
        )}

        <DoctorVerificationModal 
          doctor={selectedProfessional} 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onApprove={handleProfessionalApproved}
          onReject={handleProfessionalApproved}
        />
      </div>
    </>
  );
};

export default LegalDashboard;