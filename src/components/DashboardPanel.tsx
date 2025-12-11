import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DollarSign, BarChart2, AlertTriangle, Box, Loader2 } from 'lucide-react';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Definimos el rango de fechas (últimos 30 días)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // Llamamos a nuestras nuevas "APIs" de base de datos
      const [statsRes, lowStockRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }),
        supabase.rpc('get_low_stock_items')
      ]);

      if (statsRes.error || lowStockRes.error) {
        console.error(statsRes.error || lowStockRes.error);
        alert("Hubo un error al cargar las estadísticas del dashboard.");
      } else {
        setStats(statsRes.data[0]); // RPC devuelve un array, tomamos el primer elemento
        setLowStock(lowStockRes.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-in fade-in">
      <h2 className="text-3xl font-bold text-white mb-8">Dashboard Gerencial</h2>

      {/* TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><DollarSign size={14}/> Costo en Materiales (Últ. 30 días)</h3>
          <p className="text-4xl font-bold text-emerald-400 mt-2">${stats?.total_cost?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><BarChart2 size={14}/> Producto de Mayor Gasto</h3>
          <p className="text-2xl font-bold text-white mt-2 truncate">{stats?.most_consumed_item_name || 'N/A'}</p>
          <p className="text-lg font-semibold text-orange-400">${stats?.most_consumed_item_cost?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><Box size={14}/> Transacciones de Salida (Últ. 30 días)</h3>
          <p className="text-4xl font-bold text-blue-400 mt-2">{stats?.total_transactions || 0}</p>
        </div>
      </div>

      {/* TABLA DE BAJO STOCK */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
        <div className="p-4 border-b border-slate-700">
           <h3 className="text-white font-bold flex items-center gap-2"><AlertTriangle className="text-orange-500"/> Alertas de Inventario Bajo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Obra</th>
                <th className="p-4 text-right">Cantidad Actual</th>
                <th className="p-4 text-right">Mínimo Requerido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lowStock.map(item => (
                <tr key={`${item.sku_name}-${item.project_name}`} className="hover:bg-slate-800">
                  <td className="p-4 font-bold text-white">{item.sku_name}</td>
                  <td className="p-4 text-slate-300">{item.project_name}</td>
                  <td className="p-4 text-right font-mono font-bold text-orange-400">{item.current_quantity}</td>
                  <td className="p-4 text-right font-mono text-slate-500">{item.min_stock}</td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr><td colSpan={4} className="p-10 text-center text-slate-500 italic">No hay alertas de bajo stock. ¡Buen trabajo!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}