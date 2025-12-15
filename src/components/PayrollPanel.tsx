// src/components/PayrollPanel.tsx

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download, Loader2, Calculator, Calendar } from 'lucide-react';
import Papa from 'papaparse'; 
import { toast } from 'sonner'; // <--- Importar Sonner
import { useProject } from '../lib/ProjectContext'; // <--- Importar Contexto

interface PayrollData {
  employee_id: string;
  full_name: string;
  role: string;
  dni: string;
  days_worked: number;
  daily_rate: number;
  total_to_pay: number;
}

export default function PayrollPanel() {
  const { currentProject } = useProject(); // Obtener proyecto actual
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!currentProject) {
        toast.error("Debes seleccionar una obra para generar la nómina.");
        return;
    }

    if (!startDate || !endDate) {
      toast.warning("Por favor, selecciona una fecha de inicio y de fin.");
      return;
    }

    setLoading(true);
    setPayrollData([]);
    const toastId = toast.loading("Calculando nómina...");

    try {
      // Llamamos a la función SQL. 
      // NOTA: Si deseas filtrar por proyecto en el backend, tu función SQL debe aceptar 'p_project_id'
      // Aquí lo enviamos por si acaso tu función ya lo soporta.
      const { data, error } = await supabase.rpc('calculate_payroll', {
        start_date: startDate,
        end_date: endDate,
        // p_project_id: currentProject.id // Descomenta esto si actualizaste tu función SQL
      });

      if (error) throw error;

      // Filtrado opcional en cliente si el RPC devuelve todo (para seguridad visual)
      // Esto asume que el RPC devuelve datos crudos, si tu RPC ya filtra, esto no afecta.
      // Si el RPC no devuelve project_id, mostramos todo lo que llegue.
      setPayrollData(data);
      
      if (data.length > 0) {
          toast.success(`Nómina calculada: ${data.length} empleados`, { id: toastId });
      } else {
          toast.info("No se encontraron registros de asistencia para este periodo", { id: toastId });
      }

    } catch (error: any) {
      console.error("Error al calcular la nómina:", error);
      toast.error("Error al calcular: " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportToCSV = () => {
    if (payrollData.length === 0) return;

    const dataToExport = payrollData.map(p => ({
      "Obra": currentProject?.name || "General",
      "Nombre Completo": p.full_name,
      "Cédula/DNI": p.dni,
      "Cargo": p.role,
      "Días Trabajados": p.days_worked,
      "Tarifa Diaria ($)": p.daily_rate.toFixed(2),
      "Total a Pagar ($)": p.total_to_pay.toFixed(2)
    }));
    

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const fileName = `Nomina_${currentProject?.name.replace(/\s+/g, '_')}_${startDate}_a_${endDate}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Archivo CSV descargado");
  };
  
  const grandTotal = payrollData.reduce((acc, item) => acc + item.total_to_pay, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
        <div>
            <h2 className="text-3xl font-bold text-white">Cálculo de Nómina</h2>
            {currentProject && (
                <p className="text-slate-400 text-sm mt-1">Proyecto: <span className="text-blue-400 font-semibold">{currentProject.name}</span></p>
            )}
        </div>
      </div>
      
      {/* SECCIÓN DE FILTROS Y ACCIONES */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row gap-6 items-end lg:items-center mb-8">
        
        {/* Filtro de Fechas */}
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
                <div className="relative group">
                    <Calendar className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-400" size={16}/>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-colors" 
                    />
                </div>
            </div>
            <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
                <div className="relative group">
                    <Calendar className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-400" size={16}/>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-colors" 
                    />
                </div>
            </div>
        </div>
        
        {/* Botones de Acción */}
        <div className="flex gap-3 w-full lg:w-auto">
            <button 
                onClick={handleGenerateReport} 
                disabled={loading} 
                className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50"
            >
            {loading ? <Loader2 className="animate-spin" size={18}/> : <Calculator size={18} />} 
            Generar
            </button>
            <button 
                onClick={handleExportToCSV} 
                disabled={payrollData.length === 0} 
                className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <Download size={18} /> CSV
            </button>
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4 text-center">Días</th>
                <th className="p-4 text-right">Tarifa Diaria</th>
                <th className="p-4 text-right">Total a Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payrollData.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-slate-500 italic">
                  {loading ? "Procesando datos..." : "Selecciona un rango de fechas y genera el reporte."}
                </td></tr>
              ) : (
                payrollData.map(p => (
                    <tr key={p.employee_id} className="hover:bg-slate-800 transition-colors">
                    <td className="p-4">
                        <p className="font-bold text-white">{p.full_name}</p>
                        <p className="font-mono text-xs text-slate-500">{p.dni || 'Sin DNI'}</p>
                    </td>
                    <td className="p-4 text-center">
                        <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded font-bold">{p.days_worked}</span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-300">${p.daily_rate.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400 text-lg">${p.total_to_pay.toFixed(2)}</td>
                    </tr>
                ))
              )}
            </tbody>
            {payrollData.length > 0 && (
                <tfoot className="bg-slate-900 border-t-2 border-slate-700">
                    <tr>
                        <td colSpan={3} className="p-4 text-right font-bold text-white uppercase tracking-wider text-sm">Total General:</td>
                        <td className="p-4 text-right font-mono text-2xl font-black text-emerald-400 tracking-tight">${grandTotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}