// src/components/ToolsPanel.tsx

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useProject } from '../lib/ProjectContext';
import { supabase } from '../lib/supabaseClient';
import { Wrench, ArrowRight, ArrowLeft, User, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner

export default function ToolsPanel() {
  const { currentProject } = useProject();
  const [tab, setTab] = useState<'LOAN' | 'ACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);

  // ESTADO DE FORMULARIO DE PRÉSTAMO
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // 1. QUERIES: Herramientas disponibles en bodega
  const availableTools = useLiveQuery(async () => {
    if (!currentProject) return [];
    const stock = await db.project_inventory.where('project_id').equals(currentProject.id).toArray();
    const tools = await db.master_sku.where('type').equals('TOOL').toArray();
    
    return tools.map(t => {
        const inv = stock.find(s => s.sku_id === t.id);
        return { ...t, quantity: inv ? inv.quantity : 0 };
    }).filter(t => t.quantity > 0);
  }, [currentProject]);

  // 2. QUERIES: Empleados activos
  const employees = useLiveQuery(async () => {
    if (!currentProject) return [];
    
    return await db.employees
        .where('project_id').equals(currentProject.id)
        .filter(e => !!e.is_active)
        .toArray();
  }, [currentProject]);

  // 3. QUERIES: Préstamos activos
  const activeLoans = useLiveQuery(() => 
    currentProject ? db.active_loans.where('project_id').equals(currentProject.id).toArray() : [], 
  [currentProject]);


  // ACCIÓN: PRESTAR
  const handleLoan = async () => {
    if (!selectedTool || !selectedEmployee || !currentProject) return;
    setLoading(true);
    const toastId = toast.loading("Registrando préstamo...");

    try {
        const { data: { user } } = await supabase.auth.getUser();

        // A. Base de Datos Nube (Loans)
        const { error: loanError } = await supabase.from('active_loans').insert({
            project_id: currentProject.id,
            sku_id: selectedTool.id,
            employee_id: selectedEmployee.id,
            created_by: user?.id
        });
        if (loanError) throw loanError;

        // B. Base de Datos Nube (Ledger -> Disparará trigger de stock)
        const { error: ledgerError } = await supabase.from('inventory_ledger').insert({
            project_id: currentProject.id,
            sku_id: selectedTool.id,
            user_id: user?.id,
            transaction_type: 'SALIDA',
            quantity_change: -1,
            notes: `Préstamo a ${selectedEmployee.full_name}`
        });
        if (ledgerError) throw ledgerError;

        toast.success(`Herramienta prestada a ${selectedEmployee.full_name}`, { id: toastId });
        
        // Recarga para refrescar estado (idealmente usaríamos un revalidate o actualizaríamos el contexto local)
        setTimeout(() => window.location.reload(), 1000);

    } catch (e: any) {
        toast.error("Error al registrar préstamo: " + e.message, { id: toastId });
        setLoading(false);
    }
  };

  // ACCIÓN: DEVOLVER
  const handleReturn = async (loan: any) => {
    if (!window.confirm(`¿${loan.employee_name} está devolviendo ${loan.sku_name}?`)) return;
    
    setLoading(true);
    const toastId = toast.loading("Procesando devolución...");

    try {
        const { data: { user } } = await supabase.auth.getUser();

        // A. Borrar préstamo
        const { error: delError } = await supabase.from('active_loans').delete().eq('id', loan.id);
        if (delError) throw delError;

        // B. Devolver al stock
        const { error: ledgerError } = await supabase.from('inventory_ledger').insert({
            project_id: currentProject?.id,
            sku_id: loan.sku_id,
            user_id: user?.id,
            transaction_type: 'ENTRADA',
            quantity_change: 1, 
            notes: `Devolución de ${loan.employee_name}`
        });
        if (ledgerError) throw ledgerError;

        toast.success("Herramienta devuelta a bodega correctamente", { id: toastId });
        
        setTimeout(() => window.location.reload(), 1000);

    } catch (e: any) {
        toast.error("Error en devolución: " + e.message, { id: toastId });
        setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wrench className="text-blue-500" /> Control de Herramientas
        </h2>
        <div className="flex bg-slate-800 p-1 rounded-xl shadow-lg border border-slate-700/50">
            <button 
                onClick={()=>setTab('ACTIVE')} 
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    tab === 'ACTIVE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
            >
                EN USO ({activeLoans?.length || 0})
            </button>
            <button 
                onClick={()=>setTab('LOAN')} 
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    tab === 'LOAN' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
            >
                PRESTAR NUEVA
            </button>
        </div>
      </div>

      {/* PESTAÑA: PRESTAR */}
      {tab === 'LOAN' && (
        <div className="grid md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 fade-in">
            
            {/* COLUMNA 1: HERRAMIENTAS */}
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl flex flex-col h-[400px]">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                    <Search size={18} className="text-blue-400"/> 1. Selecciona Herramienta
                </h3>
                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {availableTools?.map(t => (
                        <button 
                            key={t.id} 
                            onClick={()=>setSelectedTool(t)} 
                            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
                                selectedTool?.id === t.id 
                                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/50' 
                                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                            }`}
                        >
                            <div className={`font-bold ${selectedTool?.id === t.id ? 'text-blue-400' : 'text-slate-200'}`}>{t.name}</div>
                            <div className="text-xs text-emerald-400 font-mono mt-1">Stock Disponible: {t.quantity}</div>
                        </button>
                    ))}
                    {availableTools?.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm text-center italic opacity-60">
                            <Wrench size={32} className="mb-2"/>
                            No hay herramientas disponibles en bodega.
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMNA 2: EMPLEADOS */}
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl flex flex-col h-[400px]">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                    <User size={18} className="text-emerald-400"/> 2. ¿Quién la retira?
                </h3>
                
                <div className="space-y-2 overflow-y-auto mb-4 pr-2 flex-1 custom-scrollbar">
                    {employees?.map(e => (
                        <button 
                            key={e.id} 
                            onClick={()=>setSelectedEmployee(e)}
                            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                                selectedEmployee?.id === e.id 
                                    ? 'bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500/50' 
                                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                            }`}
                        >
                            <div className={`font-bold ${selectedEmployee?.id === e.id ? 'text-emerald-400' : 'text-slate-200'}`}>{e.full_name}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide font-bold mt-0.5">{e.role}</div>
                        </button>
                    ))}
                    {employees?.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm text-center italic opacity-60">
                            <User size={32} className="mb-2"/>
                            No hay empleados activos en este proyecto.
                        </div>
                    )}
                </div>

                <button 
                    disabled={!selectedTool || !selectedEmployee || loading}
                    onClick={handleLoan}
                    className="mt-auto w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20}/>}
                    REGISTRAR PRÉSTAMO
                </button>
            </div>
        </div>
      )}

      {/* PESTAÑA: EN USO */}
      {tab === 'ACTIVE' && (
          <div className="space-y-3 animate-in slide-in-from-left-4 fade-in">
              {activeLoans?.length === 0 && (
                  <div className="p-16 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-3 opacity-60">
                      <Wrench size={48} className="text-slate-600"/>
                      <p className="text-lg font-medium">Todo en orden</p>
                      <p className="text-sm">No hay herramientas prestadas actualmente.</p>
                  </div>
              )}
              {activeLoans?.map(loan => (
                  <div key={loan.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-slate-600 transition-all shadow-md">
                      <div>
                          <div className="flex items-center gap-2 mb-1.5">
                              <span className="bg-orange-500/10 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/20 uppercase tracking-wider">EN USO</span>
                              <span className="text-xs text-slate-500 font-mono">{new Date(loan.loan_date).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-white font-bold text-lg">{loan.sku_name}</h4>
                          <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                              <User size={14} className="text-emerald-500"/> 
                              Prestado a: <span className="text-slate-300 font-semibold">{loan.employee_name}</span>
                          </p>
                      </div>
                      <button 
                        onClick={() => handleReturn(loan)}
                        disabled={loading}
                        className="w-full sm:w-auto bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-600 active:scale-95 shadow-sm"
                      >
                          <ArrowLeft size={16}/> Devolver
                      </button>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}