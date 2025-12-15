// src/components/RequisitionDetailModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, CheckCircle, PackageCheck, Loader2, ListChecks, Ban } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner

interface Props {
  requisition: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RequisitionDetailModal({ requisition, onClose, onUpdate }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  // Cargar items y rol del usuario al abrir
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Cargar items del pedido
        const { data, error } = await supabase
            .from('requisition_items')
            .select('*, master_sku(name, unit, sku)')
            .eq('requisition_id', requisition.id);
        
        if (error) throw error;
        if (data) setItems(data);

        // 2. Ver rol del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            setUserRole(profile?.role || 'bodeguero');
        }
      } catch (err) {
        console.error(err);
        toast.error("Error al cargar los detalles del pedido");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [requisition]);

  // Acción: Aprobar / Rechazar (Solo Admin)
  const handleStatusChange = async (newStatus: string) => {
    setProcessing(true);
    const toastId = toast.loading(newStatus === 'APPROVED' ? "Aprobando pedido..." : "Rechazando pedido...");
    
    try {
        const { error } = await supabase.rpc('update_requisition_status', { 
            req_id: requisition.id, 
            new_status: newStatus 
        });
        
        if (error) throw error;

        toast.success(newStatus === 'APPROVED' ? "Pedido aprobado exitosamente" : "Pedido rechazado", { id: toastId });
        onUpdate();
        onClose();
    } catch (error: any) {
        toast.error("Error al actualizar estado: " + error.message, { id: toastId });
    } finally {
        setProcessing(false);
    }
  };

  // Acción: Recibir Mercancía (Admin o Bodeguero)
  const handleReceive = async () => {
    // Mantenemos confirm nativo para seguridad crítica, o podrías usar un modal de confirmación custom
    if (!window.confirm("¿Confirmas que has recibido todos los materiales físicamente? Esto sumará al inventario.")) return;
    
    setProcessing(true);
    const toastId = toast.loading("Procesando entrada de inventario...");

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.rpc('receive_requisition', { 
            req_id: requisition.id,
            user_id_actor: user?.id
        });

        if (error) throw error;

        toast.success("Inventario actualizado correctamente", { id: toastId });
        onUpdate();
        onClose();
    } catch (error: any) {
        toast.error("Error al recibir mercancía: " + error.message, { id: toastId });
    } finally {
        setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'PENDING': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
          case 'APPROVED': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
          case 'RECEIVED': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
          case 'REJECTED': return 'text-red-400 bg-red-400/10 border-red-400/20';
          default: return 'text-slate-400 bg-slate-400/10';
      }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
          <div>
             <h3 className="text-white font-bold text-lg flex items-center gap-2">Pedido #{requisition.requisition_number}</h3>
             <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getStatusColor(requisition.status)}`}>
                {requisition.status === 'PENDING' ? 'Pendiente' : 
                 requisition.status === 'APPROVED' ? 'Aprobado' : 
                 requisition.status === 'RECEIVED' ? 'Recibido' : 'Rechazado'}
             </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><X size={20}/></button>
        </div>

        {/* LISTA DE ITEMS */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
           {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
           ) : (
             <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 mb-2 flex gap-2 items-center uppercase tracking-wider"><ListChecks size={14}/> Lista de Materiales</h4>
                
                {items.length === 0 && <p className="text-slate-500 text-sm italic">No hay items en este pedido.</p>}

                {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                        <div>
                            <p className="text-sm font-bold text-slate-200">{item.master_sku?.name || 'Producto desconocido'}</p>
                            <p className="text-[10px] font-mono text-slate-500">{item.master_sku?.sku || '---'}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-blue-400">{item.quantity_requested}</span>
                            <span className="text-xs text-slate-500 ml-1 uppercase">{item.master_sku?.unit || 'UND'}</span>
                        </div>
                    </div>
                ))}
             </div>
           )}
        </div>

        {/* ACCIONES (Footer) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex flex-col sm:flex-row gap-3 justify-end items-center">
            
            {/* Solo ADMIN puede Aprobar/Rechazar si está Pendiente */}
            {requisition.status === 'PENDING' && userRole === 'admin' && (
                <>
                    <button 
                        disabled={processing} 
                        onClick={() => handleStatusChange('REJECTED')} 
                        className="w-full sm:w-auto px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Ban size={16}/> Rechazar
                    </button>
                    <button 
                        disabled={processing} 
                        onClick={() => handleStatusChange('APPROVED')} 
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
                    >
                        {processing ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>} 
                        Aprobar Compra
                    </button>
                </>
            )}

            {/* Admin o Bodeguero pueden RECIBIR si está Aprobado */}
            {requisition.status === 'APPROVED' && (
                <button 
                    disabled={processing} 
                    onClick={handleReceive} 
                    className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform"
                >
                    {processing ? <Loader2 className="animate-spin" size={18}/> : <PackageCheck size={18}/>} 
                    RECIBIR EN BODEGA
                </button>
            )}

            {/* Estados finales */}
            {(requisition.status === 'RECEIVED' || requisition.status === 'REJECTED') && (
                <p className="w-full text-center text-slate-500 text-sm italic py-2 flex items-center justify-center gap-2 opacity-60">
                    <CheckCircle size={14}/> Este pedido está cerrado
                </p>
            )}
            
            {/* Mensaje de espera para bodeguero si está pendiente */}
            {requisition.status === 'PENDING' && userRole !== 'admin' && (
                <p className="w-full text-center text-yellow-500/80 text-sm py-2 flex items-center justify-center gap-2 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                    <Loader2 className="animate-spin" size={14}/> Esperando aprobación de gerencia...
                </p>
            )}

        </div>
      </div>
    </div>
  );
}