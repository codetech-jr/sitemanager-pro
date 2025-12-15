// src/components/DashboardPanel.tsx

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DollarSign, BarChart2, AlertTriangle, Box, Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner
import { useProject } from '../lib/ProjectContext'; // <--- Importar Contexto

interface DashboardStats {
  total_cost: number;
  total_transactions: number;
  most_consumed_item_name: string;
  most_consumed_item_cost: number;
}

interface LowStockItem {
  sku_name: string;
  current_quantity: number;
  min_stock: number;
  project_name: string;
}

export default function DashboardPanel() {
  const { currentProject } = useProject(); // Obtenemos el proyecto actual para contexto (si se requiere filtrar)
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Definimos el rango de fechas (últimos 30 días)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // Llamamos a las funciones RPC.
      // NOTA: Si quisieras filtrar por proyecto, deberías modificar tus funciones RPC en Supabase
      // para aceptar un parámetro 'p_project_id' y pasarlo aquí:
      // supabase.rpc('get_dashboard_stats', { ..., p_project_id: currentProject?.id })
      
      const [statsRes, lowStockRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }),
        supabase.rpc('get_low_stock_items')
      ]);

      if (statsRes.error || lowStockRes.error) {
        console.error(statsRes.error || lowStockRes.error);
        toast.error("Error al cargar datos del dashboard");
      } else {
        setStats(statsRes.data[0]); 
        // Si hay proyecto seleccionado, filtramos localmente las alertas de bajo stock para ese proyecto
        const filteredLowStock = currentProject 
            ? lowStockRes.data.filter((item: LowStockItem) => item.project_name === currentProject.name)
            : lowStockRes.data;
            
        setLowStock(filteredLowStock);
      }
      setLoading(false);
    }
    fetchData();
  }, [currentProject]);

  if (loading) {
    return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-white">Dashboard Gerencial</h2>
            <p className="text-slate-400 text-sm mt-1">
                {currentProject 
                    ? `Vista filtrada para: ${currentProject.name}` 
                    : "Vista Global de todas las obras"}
            </p>
        </div>
        <div className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Últimos 30 días
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Tarjeta 1: Costo Total */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-emerald-500/30 transition-colors group">
          <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
            <DollarSign size={16} className="text-emerald-500"/> Costo Materiales
          </h3>
          <p className="text-4xl font-bold text-white mt-3 tracking-tight">
            ${stats?.total_cost?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total acumulado en salidas</p>
        </div>

        {/* Tarjeta 2: Mayor Consumo */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-orange-500/30 transition-colors group">
          <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2 group-hover:text-orange-400 transition-colors">
            <BarChart2 size={16} className="text-orange-500"/> Top Consumo
          </h3>
          <p className="text-xl font-bold text-white mt-3 truncate" title={stats?.most_consumed_item_name}>
            {stats?.most_consumed_item_name || 'Sin datos'}
          </p>
          <p className="text-lg font-mono text-orange-400 mt-1">
            ${stats?.most_consumed_item_cost?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
          </p>
        </div>

        {/* Tarjeta 3: Transacciones */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-blue-500/30 transition-colors group">
          <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2 group-hover:text-blue-400 transition-colors">
            <Box size={16} className="text-blue-500"/> Movimientos
          </h3>
          <p className="text-4xl font-bold text-white mt-3 tracking-tight">
            {stats?.total_transactions || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Salidas registradas</p>
        </div>
      </div>

      {/* TABLA DE BAJO STOCK */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex items-center gap-2">
           <AlertTriangle className="text-orange-500" size={20}/>
           <h3 className="text-white font-bold">Alertas de Inventario Bajo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Producto</th>
                <th className="p-4 font-semibold">Obra</th>
                <th className="p-4 text-right font-semibold">Stock Actual</th>
                <th className="p-4 text-right font-semibold">Mínimo</th>
                <th className="p-4 text-center font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lowStock.map((item, index) => (
                <tr key={`${item.sku_name}-${index}`} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-bold text-white">{item.sku_name}</td>
                  <td className="p-4 text-slate-300 text-sm">{item.project_name}</td>
                  <td className="p-4 text-right font-mono font-bold text-orange-400 text-lg">{item.current_quantity}</td>
                  <td className="p-4 text-right font-mono text-slate-500">{item.min_stock}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/20">
                      Crítico
                    </span>
                  </td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                        <div className="flex flex-col items-center gap-2">
                            <Box className="opacity-20" size={48}/>
                            <span>No hay alertas de bajo stock activas. ¡Buen trabajo!</span>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}