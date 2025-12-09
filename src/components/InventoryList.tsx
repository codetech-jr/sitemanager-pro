import { useEffect, useState, useCallback } from 'react'; // 1. Importamos useCallback
import { supabase } from '../lib/supabaseClient';
import type { InventoryItem } from '../types/database.types';
import { AlertTriangle, Package, Search } from 'lucide-react';
import TransactionFab from './TransactionFab'; // 2. Importamos el componente FAB
// import ActivityLog from "./ActivityLog";

export default function InventoryList() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 3. Estado "semilla" para forzar la recarga
  const [refreshSeed, setRefreshSeed] = useState(0);

  // 4. Envolvemos la lógica en useCallback para poder llamarla desde el useEffect y el botón
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Limpiamos errores previos al recargar
      
      const { data, error } = await supabase
        .from('project_inventory')
        .select(`
          sku_id,
          quantity,
          master_sku ( name, sku, unit, min_stock_alert, description )
        `)
        .order('quantity', { ascending: true }); // Ordenamos (opcional, pero útil)

      if (error) throw error;
      setItems(data as unknown as InventoryItem[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. El useEffect ahora depende de refreshSeed y fetchInventory
  useEffect(() => {
    fetchInventory();
  }, [refreshSeed, fetchInventory]);

  if (loading && items.length === 0) return <div className="p-10 text-center text-white">Cargando bodega...</div>;
  if (error) return <div className="p-10 text-center text-red-400">Error: {error}</div>;

  return (
    // 6. Agregamos pb-24 para dar espacio al botón flotante
    <div className="w-full max-w-4xl mx-auto p-4 pb-24">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="text-blue-500" /> Inventario Actual
        </h2>
        {/* Un input falso solo visual por ahora */}
        <div className="bg-slate-800 p-2 rounded-lg flex items-center text-slate-400">
           <Search size={18} />
        </div>
      </div>

      {/* GRILLA RESPONSIVE: 1 col móvil, 2 cols tablet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const product = item.master_sku;
          const isLowStock = item.quantity <= product.min_stock_alert;

          return (
            <div 
              key={item.sku_id} 
              className={`
                relative bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg
                flex justify-between items-center transition-all hover:bg-slate-750
                ${isLowStock ? 'border-orange-500/50 bg-orange-950/10' : ''}
              `}
            >
              {/* IZQUIERDA: DATOS */}
              <div>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">
                  {product.sku}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{product.name}</h3>
                <p className="text-sm text-slate-400">{product.description}</p>
                
                {isLowStock && (
                   <span className="mt-2 inline-flex items-center text-xs text-orange-400 font-bold gap-1 animate-pulse">
                     <AlertTriangle size={12} /> Stock Crítico
                   </span>
                )}
              </div>

              {/* DERECHA: CANTIDAD GRANDE */}
              <div className="text-right">
                <div className={`text-4xl font-bold tracking-tight ${isLowStock ? 'text-orange-500' : 'text-emerald-400'}`}>
                  {item.quantity}
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                  {product.unit}s
                </div>
              </div>
            </div>
          );
        })}
      </div>

{/* === AGREGAMOS ESTO: EL LOG DE ACTIVIDAD === */}
{/* Pasamos el "refreshSeed" para que se actualice la lista cuando confirmamos una salida */}
{/* <div className="mt-8 border-t border-slate-800 pt-6">
  <ActivityLog refreshTrigger={refreshSeed} />
</div> */}

{/* === MANTÉN EL BOTÓN FLOTANTE AL FINAL === */}
<TransactionFab onUpdate={() => setRefreshSeed(s => s + 1)} />
    </div>
  );
}