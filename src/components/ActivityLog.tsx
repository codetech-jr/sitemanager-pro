import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react';

export default function ActivityLog() {
  // ====> LEEMOS EL HISTORIAL DESDE DEXIE <====
  // Ordenamos por fecha y tomamos los últimos 10
  const logs = useLiveQuery(() => 
    db.inventory_ledger.orderBy('created_at').reverse().limit(10).toArray(),
    [] // Array de dependencias
  );

  // Mientras Dexie carga, mostramos esto
  if (!logs) {
    return <div className="text-slate-500 text-sm p-4 text-center">Cargando historial local...</div>;
  }

  return (
    <div className="w-full">
      <h3 className="text-slate-400 font-bold mb-4 flex items-center gap-2 uppercase text-sm tracking-wider">
        <History size={16} /> Últimos Movimientos
      </h3>

      <div className="space-y-3">
        {logs.length === 0 && (
            <p className="text-slate-600 italic text-center py-4">No hay movimientos registrados.</p>
        )}

        {logs.map((log) => {
          const isExit = log.quantity_change < 0;
          
          return (
            <div key={log.id} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg flex items-center justify-between hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${isExit ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {isExit ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">{log.sku_name}</h4>
                  <p className="text-xs text-slate-500">
                    {new Date(log.created_at).toLocaleString('es-ES', { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
              <div className={`text-lg font-bold ${isExit ? 'text-orange-400' : 'text-emerald-400'}`}>
                {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} 
                <span className="text-xs font-normal text-slate-500 ml-1 uppercase">{log.sku_unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}