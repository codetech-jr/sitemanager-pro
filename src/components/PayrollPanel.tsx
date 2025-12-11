// src/components/PayrollPanel.tsx

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download, Loader2, Calculator } from 'lucide-react';
import Papa from 'papaparse'; // Para exportar a CSV

// Definimos la estructura de los datos que recibiremos de la base de datos
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
  // Estado para las fechas del reporte
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  // Estado para los resultados y la carga
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para llamar a nuestra API de la base de datos (RPC)
  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecciona una fecha de inicio y de fin.");
      return;
    }

    setLoading(true);
    setError(null);
    setPayrollData([]);

    // Llamamos a la función SQL que creamos
    const { data, error } = await supabase.rpc('calculate_payroll', {
      start_date: startDate,
      end_date: endDate
    });

    if (error) {
      console.error("Error al calcular la nómina:", error);
      setError("No se pudo generar el reporte. Revisa la consola.");
    } else {
      setPayrollData(data);
    }
    setLoading(false);
  };
  
  // Función para exportar los datos a un archivo CSV
  const handleExportToCSV = () => {
    if (payrollData.length === 0) return;

    const dataToExport = payrollData.map(p => ({
      "Nombre Completo": p.full_name,
      "Cédula/DNI": p.dni,
      "Cargo": p.role,
      "Días Trabajados": p.days_worked,
      "Tarifa Diaria ($)": p.daily_rate.toFixed(2),
      "Total a Pagar ($)": p.total_to_pay.toFixed(2)
    }));
    
    // Sumamos el total general para el nombre del archivo
    const grandTotal = payrollData.reduce((sum, p) => sum + p.total_to_pay, 0);

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Nomina_${startDate}_a_${endDate}_Total_${grandTotal.toFixed(2)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Calculamos el total general para mostrarlo en la tabla
  const grandTotal = payrollData.reduce((acc, item) => acc + item.total_to_pay, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-in fade-in">
      <h2 className="text-3xl font-bold text-white mb-6">Cálculo de Nómina</h2>
      
      {/* SECCIÓN DE FILTROS Y ACCIONES */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center mb-6">
        {/* Filtro de Fechas */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-400">Desde:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded-md p-2 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-slate-400">Hasta:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border border-slate-600 rounded-md p-2 text-white" />
        </div>
        
        {/* Botones de Acción */}
        <button onClick={handleGenerateReport} disabled={loading} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <Calculator size={16} />} Generar Reporte
        </button>
        <button onClick={handleExportToCSV} disabled={payrollData.length === 0} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
              <tr>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Días Trabajados</th>
                <th className="p-4 text-right">Tarifa Diaria</th>
                <th className="p-4 text-right">Total a Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payrollData.length === 0 && (
                <tr><td colSpan={4} className="p-10 text-center text-slate-500 italic">
                  {loading ? "Calculando..." : "Selecciona un rango de fechas y genera el reporte."}
                </td></tr>
              )}
              {payrollData.map(p => (
                <tr key={p.employee_id} className="hover:bg-slate-800">
                  <td className="p-4">
                    <p className="font-bold text-white">{p.full_name}</p>
                    <p className="font-mono text-xs text-slate-500">{p.dni}</p>
                  </td>
                  <td className="p-4 text-center font-bold text-blue-400 text-xl">{p.days_worked}</td>
                  <td className="p-4 text-right font-mono text-slate-300">${p.daily_rate.toFixed(2)}</td>
                  <td className="p-4 text-right font-mono font-bold text-emerald-400 text-lg">${p.total_to_pay.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {payrollData.length > 0 && (
                <tfoot className="bg-slate-900 border-t-2 border-slate-700">
                    <tr>
                        <td colSpan={3} className="p-4 text-right font-bold text-white uppercase">Total General a Pagar:</td>
                        <td className="p-4 text-right font-mono text-2xl font-black text-emerald-300">${grandTotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}