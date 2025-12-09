import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { TransactionLog } from '../types/database.types';
import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
// import { format } from 'date-fns'; // Ojo: Si no quieres instalar date-fns, usaremos JS nativo abajo
// import { es } from 'date-fns/locale'; // Para español (Opcional)

export default function ActivityLog({ refreshTrigger }: { refreshTrigger: number }) {
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      // Pedimos las últimas 10 transacciones
      const { data, error } = await supabase
        .from('inventory_ledger')
        .select(`
          id,
          transaction_type,
          quantity_change,
          created_at,
          master_sku ( name, unit, sku )
        `)
        .order('created_at', { ascending: false }) // Lo más nuevo primero
        .limit(10);

      if (!error && data) {
        setLogs(data as unknown as TransactionLog[]);
      }
      setLoading(false);
    }

    fetchLogs();
  }, [refreshTrigger]); // Se recarga cada vez que guardas algo nuevo

  if (loading) return <div className="text-slate-500 text-sm p-4">Cargando historial...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 mt-8">
      <h3 className="text-slate-400 font-bold mb-4 flex items-center gap-2 uppercase text-sm tracking-wider">
        <History size={16} /> Últimos Movimientos
      </h3>

      <div className="space-y-3">
        {logs.length === 0 && (
            <p className="text-slate-600 italic">No hay movimientos registrados hoy.</p>
        )}

        {logs.map((log) => {
          const isExit = log.quantity_change < 0;
          
          return (
            <div key={log.id} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg flex items-center justify-between hover:bg-slate-800 transition-colors">
              
              {/* IZQUIERDA: ICONO Y PRODUCTO */}
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${isExit ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {isExit ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">{log.master_sku.name}</h4>
                  <p className="text-xs text-slate-500">
                    {/* Formato de fecha nativo JS para no instalar librerías extras por ahora */}
                    {new Date(log.created_at).toLocaleString('es-ES', { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              {/* DERECHA: CANTIDAD */}
              <div className={`text-lg font-bold ${isExit ? 'text-orange-400' : 'text-emerald-400'}`}>
                {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} 
                <span className="text-xs font-normal text-slate-500 ml-1 uppercase">{log.master_sku.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}