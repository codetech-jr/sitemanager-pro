import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useProject } from '../lib/ProjectContext';
import { FileText, Plus, Clock, CheckCircle2, XCircle, PackageCheck, Loader2 } from 'lucide-react';
import CreateRequisitionModal from './CreateRequisitionModal';
import RequisitionDetailModal from './RequisitionDetailModal';

export default function RequisitionsPanel() {
  const { currentProject } = useProject();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null); // <--- NUEVO ESTADO

  // Consultar pedidos del proyecto actual
  const requisitions = useLiveQuery(() => 
    currentProject 
      ? db.requisitions.where('project_id').equals(currentProject.id).reverse().toArray() 
      : [], 
    [currentProject]
  );

  // Función auxiliar para iconos de estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded"><Clock size={12}/> Pendiente</span>;
      case 'APPROVED': return <span className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded"><CheckCircle2 size={12}/> Aprobado</span>;
      case 'RECEIVED': return <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded"><PackageCheck size={12}/> Recibido</span>;
      case 'REJECTED': return <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded"><XCircle size={12}/> Rechazado</span>;
      default: return <span>{status}</span>;
    }
  };

  if (!requisitions) return <div className="p-10 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto"/></div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-blue-500" /> Pedidos de Material
        </h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20"
        >
          <Plus size={18} /> Nuevo Pedido
        </button>
      </div>

      <div className="grid gap-4">
        {requisitions.length === 0 && (
          <div className="p-10 text-center border border-dashed border-slate-700 rounded-xl text-slate-500">
            No hay pedidos registrados en este proyecto.
          </div>
        )}

        {requisitions.map(req => (
          <div 
            key={req.id} 
            onClick={() => setSelectedReq(req)} // <--- CLICK EVENT AÑADIDO
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">
                  Pedido #{req.requisition_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(req.created_at).toLocaleDateString()} • {new Date(req.created_at).toLocaleTimeString()}
                </p>
              </div>
              {getStatusBadge(req.status)}
            </div>
            {/* ID o resumen extra */}
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end">
               <span className="text-xs text-slate-400">ID: {req.id.slice(0,8)}...</span>
            </div>
          </div>
        ))}
      </div>

      <CreateRequisitionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {/* Lógica opcional tras crear */}}
      />

      {/* <--- NUEVO MODAL DE DETALLE --- */}
      {selectedReq && (
        <RequisitionDetailModal 
          requisition={selectedReq}
          onClose={() => setSelectedReq(null)}
          onUpdate={() => {
             // Forzar recarga o resync si el modal modifica el estado (ej: aprobar/rechazar)
             window.location.reload(); 
          }}
        />
      )}
    </div>
  );
}