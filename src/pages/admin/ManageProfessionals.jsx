import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter,
  FileText, 
  CheckCircle, 
  Loader2, 
  Eye,
  CreditCard
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DoctorVerificationModal from '@/components/DoctorVerificationModal';

const ManageProfessionals = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all', 'pending', 'approved'
  const { toast } = useToast();

  // Modal State
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      
      // Fixed: Explicitly specify the relationship to profiles using the foreign key constraint
      // professionals.id references profiles.id, so we use the constraint name 'professionals_id_fkey'
      // to avoid PGRST201 (ambiguous embedding).
      const { data, error } = await supabase
        .from('professionals')
        .select(`
          *,
          profiles:profiles!professionals_id_fkey (
            id,
            full_name,
            email,
            photo_url
          ),
          mp_account:mp_professional_accounts (
            *
          ),
          documents:professional_documents (
            *
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten/Normalize data structure for the table
      const formattedData = (data || []).map(prof => ({
        ...prof,
        // Ensure profiles is an object, not an array (1:1 relationship)
        profiles: Array.isArray(prof.profiles) ? prof.profiles[0] : prof.profiles,
        // Relationships might return arrays or single objects depending on definition, 
        // usually returns array for has_many or if not detected as 1:1 correctly.
        // mp_account is 1:1 but PostgREST returns array by default unless .single() or 1:1 constraint is strict
        mp_account: Array.isArray(prof.mp_account) ? prof.mp_account[0] : prof.mp_account,
        documents: Array.isArray(prof.documents) ? prof.documents[0] : prof.documents
      }));
      
      setProfessionals(formattedData);
    } catch (error) {
      console.error('Error fetching professionals:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los profesionales."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (prof) => {
    setSelectedProfessional(prof);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = () => {
     fetchProfessionals();
  };

  // Filter Logic
  const filteredProfessionals = professionals.filter(prof => {
    const matchesSearch = 
      prof.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') {
        return matchesSearch && (prof.verification_status !== 'approved');
    }
    if (statusFilter === 'approved') return matchesSearch && prof.verification_status === 'approved';
    
    return matchesSearch;
  });

  const pendingCount = professionals.filter(p => p.verification_status !== 'approved').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Solicitudes Profesionales</h2>
          <p className="text-slate-400">
            Revisa y aprueba a los médicos que han solicitado unirse a la plataforma.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por nombre, email..."
                className="pl-8 bg-slate-900 border-slate-700 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="bg-slate-900 rounded-lg p-1 border border-slate-700 flex">
              <Button 
                variant={statusFilter === 'pending' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className={`text-xs ${statusFilter === 'pending' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Pendientes ({pendingCount})
              </Button>
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={`text-xs ${statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Todos
              </Button>
           </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-cyan-500" />
            {statusFilter === 'pending' ? 'Solicitudes Pendientes' : 'Listado Completo'}
          </CardTitle>
          <CardDescription>
            {statusFilter === 'pending' 
             ? "Estos usuarios han subido documentación y esperan tu aprobación manual."
             : "Gestión general de todos los profesionales registrados."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="flex justify-center py-20">
               <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50 bg-slate-950/50">
                  <TableHead className="text-slate-300 pl-6">Profesional</TableHead>
                  <TableHead className="text-slate-300">Estado MP</TableHead>
                  <TableHead className="text-slate-300">Documentación</TableHead>
                  <TableHead className="text-slate-300">Estado Global</TableHead>
                  <TableHead className="text-right text-slate-300 pr-6">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfessionals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 h-32">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
                        <p>No hay profesionales en esta categoría.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfessionals.map((prof) => {
                    const mpConnected = prof.mp_account && (prof.mp_account.access_token || prof.mp_account.user_id_mp);
                    const docsStatus = prof.documents?.status || 'none';

                    return (
                        <TableRow key={prof.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 overflow-hidden border border-slate-700">
                                {prof.profiles?.photo_url ? (
                                    <img src={prof.profiles.photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    prof.profiles?.full_name?.[0] || '?'
                                )}
                            </div>
                            <div>
                                <div className="font-bold text-white text-sm">{prof.profiles?.full_name || 'Usuario sin nombre'}</div>
                                <div className="text-xs text-slate-500">{prof.specialization} • {prof.profiles?.email}</div>
                            </div>
                            </div>
                        </TableCell>
                        
                        <TableCell>
                            {mpConnected ? (
                                <Badge className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/40 border-0 flex w-fit items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> Conectado
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="border-slate-700 text-slate-500 flex w-fit items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> Pendiente
                                </Badge>
                            )}
                        </TableCell>

                        <TableCell>
                             {docsStatus === 'approved' && <Badge className="bg-green-900/30 text-green-400 hover:bg-green-900/40 border-0">Aprobada</Badge>}
                             {docsStatus === 'rejected' && <Badge className="bg-red-900/30 text-red-400 hover:bg-red-900/40 border-0">Rechazada</Badge>}
                             {(docsStatus === 'submitted' || docsStatus === 'pending') && (
                                <div className="flex items-center gap-2 text-yellow-500 text-xs font-medium">
                                    <FileText className="w-4 h-4" />
                                    <span>Requiere Revisión</span>
                                </div>
                             )}
                             {!prof.documents && <span className="text-slate-600 text-xs">Sin subir</span>}
                        </TableCell>

                        <TableCell>
                            {prof.verification_status === 'approved' ? (
                                <Badge className="bg-green-600 text-white hover:bg-green-700">Verificado</Badge>
                            ) : prof.verification_status === 'rejected' ? (
                                <Badge className="bg-red-600 text-white hover:bg-red-700">Rechazado</Badge>
                            ) : (
                                <Badge className="bg-orange-600 text-white hover:bg-orange-700 animate-pulse">Pendiente</Badge>
                            )}
                        </TableCell>
                        
                        <TableCell className="text-right pr-6">
                            {prof.verification_status !== 'approved' ? (
                                <Button 
                                    size="sm" 
                                    onClick={() => handleOpenReview(prof)}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20"
                                >
                                    <Eye className="w-4 h-4 mr-2" /> Revisar
                                </Button>
                            ) : (
                                <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => handleOpenReview(prof)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <Eye className="w-4 h-4 mr-2" /> Detalles
                                </Button>
                            )}
                        </TableCell>
                        </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DoctorVerificationModal 
        doctor={selectedProfessional}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApprove={handleStatusUpdate}
        onReject={handleStatusUpdate}
      />
    </div>
  );
};

export default ManageProfessionals;