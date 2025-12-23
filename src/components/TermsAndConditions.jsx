import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, AlertTriangle, CreditCard, UserCheck, Lock, Gavel, Scale } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TermsAndConditions = ({ open, onOpenChange, onAccept }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] h-[85vh] flex flex-col bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-500" />
            Marco Legal ArgMed
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Documentación legal obligatoria para el uso de la plataforma. Por favor, lea todas las secciones.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="terms" className="flex-1 flex flex-col h-full overflow-hidden mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-800">
            <TabsTrigger value="terms">Términos y Condiciones</TabsTrigger>
            <TabsTrigger value="privacy">Política de Privacidad</TabsTrigger>
            <TabsTrigger value="disclaimer">Descargo de Resp.</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden border border-slate-800 rounded-md mt-2 bg-slate-900/30">
            <TabsContent value="terms" className="h-full m-0">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6 text-sm text-gray-300">
                    <h3 className="text-xl font-bold text-white mb-4">Términos y Condiciones de Uso</h3>
                    
                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-cyan-400" /> 1. Definición del Servicio</h4>
                      <p>ArgMed es una plataforma tecnológica de intermediación que facilita la conexión por videollamada entre usuarios ("Pacientes") y profesionales independientes de la salud ("Profesionales"). ArgMed <strong>NO es un proveedor de servicios médicos</strong>, no emplea médicos ni interviene en las decisiones profesionales.</p>
                    </section>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><UserCheck className="w-4 h-4 text-green-400" /> 2. Obligaciones del Profesional</h4>
                      <p>El Profesional declara poseer título habilitante y matrícula vigente. Es el único responsable de la calidad, pertinencia y legalidad del asesoramiento brindado. Se compromete a mantener la confidencialidad médico-paciente y a utilizar la plataforma de acuerdo con la ética profesional vigente.</p>
                    </section>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-400" /> 3. Prohibición de Emergencias</h4>
                      <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                        <p className="text-red-200 font-bold">ESTE SERVICIO NO ES APTO PARA EMERGENCIAS MÉDICAS.</p>
                        <p className="mt-2 text-red-100/80">Si usted presenta dolor de pecho, dificultad para respirar, pérdida de conocimiento, hemorragias severas o cualquier cuadro que ponga en riesgo la vida, debe cortar inmediatamente y llamar al servicio de emergencias local (107/911).</p>
                      </div>
                    </section>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-yellow-400" /> 4. Pagos y Reembolsos</h4>
                      <p>Los pagos se procesan a través de MercadoPago. El usuario acepta pagar el honorario establecido antes de la sesión. ArgMed cobra una comisión por el uso de la tecnología. No se realizarán reembolsos por sesiones ya efectuadas donde no hubo fallas técnicas de la plataforma, independientemente de la satisfacción subjetiva con el consejo profesional.</p>
                    </section>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Gavel className="w-4 h-4 text-purple-400" /> 5. Propiedad Intelectual y Licencia</h4>
                      <p>ArgMed otorga una licencia limitada, no exclusiva e intransferible para usar la aplicación. Todo el contenido, marcas y código son propiedad de ArgMed. Está prohibida la ingeniería inversa o el uso no autorizado de la marca.</p>
                    </section>
                  </div>
                </ScrollArea>
            </TabsContent>

            <TabsContent value="privacy" className="h-full m-0">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6 text-sm text-gray-300">
                    <h3 className="text-xl font-bold text-white mb-4">Política de Privacidad</h3>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-blue-400" /> 1. Recolección de Datos</h4>
                      <p>Recopilamos información personal (Nombre, DNI, Email) para la creación de cuentas y validación de identidad. Para profesionales, recopilamos datos de matrícula y especialidad para su verificación.</p>
                    </section>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-cyan-400" /> 2. Bitácora de Sesiones</h4>
                      <p>La "Bitácora" es un registro privado de la interacción. Los datos de salud volcados allí están encriptados y solo son accesibles por las partes involucradas (Profesional y Paciente). ArgMed no vende ni comparte datos de salud con terceros para fines publicitarios.</p>
                    </section>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Scale className="w-4 h-4 text-green-400" /> 3. Derechos ARCO</h4>
                      <p>Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos. Puede ejercer estos derechos contactando a legales@argmed.com o eliminando su cuenta desde la configuración.</p>
                    </section>

                    <section>
                      <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-yellow-400" /> 4. Seguridad de Videollamadas</h4>
                      <p>Las videollamadas utilizan tecnología WebRTC encriptada de punto a punto (P2P) cuando es posible, asegurando que el contenido audiovisual no sea interceptado ni grabado por los servidores de ArgMed.</p>
                    </section>
                  </div>
                </ScrollArea>
            </TabsContent>
            
            <TabsContent value="disclaimer" className="h-full m-0">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6 text-sm text-gray-300">
                    <h3 className="text-xl font-bold text-white mb-4">Descargo de Responsabilidad (App Stores)</h3>

                    <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-500/10 mb-6">
                      <p className="italic text-yellow-200">"El contenido de esta aplicación es solo para fines informativos y de orientación. No reemplaza el consejo médico profesional, diagnóstico o tratamiento presencial."</p>
                    </div>

                    <section>
                      <h4 className="font-bold text-white mb-2">1. No es un dispositivo médico</h4>
                      <p>Esta aplicación no es un dispositivo médico ni un sustituto de la atención médica de urgencia. Ante la duda, siempre busque el consejo de su médico u otro proveedor de salud calificado.</p>
                    </section>

                    <section>
                      <h4 className="font-bold text-white mb-2">2. Responsabilidad de Terceros</h4>
                      <p>ArgMed no avala ni garantiza la exactitud de los diagnósticos emitidos por los profesionales usuarios de la plataforma. La relación profesional es directa entre el Médico y el Paciente.</p>
                    </section>
                    
                    <section>
                      <h4 className="font-bold text-white mb-2">3. Disponibilidad del Servicio</h4>
                      <p>No garantizamos que el servicio sea ininterrumpido o libre de errores. No nos hacemos responsables por daños derivados de la imposibilidad de acceder a la plataforma en un momento crítico.</p>
                    </section>
                  </div>
                </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-800">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-gray-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => { onAccept(); onOpenChange(false); }}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold"
          >
            He leído y acepto todos los documentos legales
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConditions;