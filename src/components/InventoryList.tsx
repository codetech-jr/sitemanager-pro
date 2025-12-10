import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { IInventoryItem, IMasterSku } from '../lib/db';
import { AlertTriangle, Package, Search } from 'lucide-react';

export default function InventoryList() {
  // Leemos los datos en tiempo real desde Dexie (la base de datos local)
  const inventoryItems = useLiveQuery(() => db.project_inventory.toArray(), []) as IInventoryItem[] | undefined;
  const masterSkus = useLiveQuery(() => db.master_sku.toArray(), []) as IMasterSku[] | undefined;

  // Mientras Dexie carga los datos por primera vez, mostramos un mensaje.
  if (!inventoryItems || !masterSkus) {
    return (
      <div className="p-10 text-center text-slate-400">
        Cargando bodega local...
      </div>
    );
  }

  // Unimos los datos en el cliente. Esto es ultra rápido.
  const joinedInventory = inventoryItems.map(item => {
    const skuData = masterSkus.find(s => s.id === item.sku_id);
    return {
      ...item,
      master_sku: skuData || { name: 'Producto Desconocido', sku: 'N/A', unit: 'UND', min_stock_alert: 0, description: null }
    };
  }).sort((a, b) => a.master_sku.name.localeCompare(b.master_sku.name));

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="text-blue-500" /> Inventario en Bodega
        </h2>
        <div className="bg-slate-800 p-2 rounded-lg flex items-center text-slate-400">
           <Search size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {joinedInventory.map((item) => {
          const product = item.master_sku;
          const isLowStock = item.quantity <= product.min_stock_alert;

          return (
            <div 
              key={item.sku_id} 
              className={`relative bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex justify-between items-center transition-all ${isLowStock ? 'border-orange-500/50 bg-orange-950/20' : ''}`}
            >
              <div>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">{product.sku}</span>
                <h3 className="text-lg font-bold text-white mt-2">{product.name}</h3>
                <p className="text-sm text-slate-400">{product.description}</p>
                {isLowStock && <span className="mt-2 inline-flex items-center text-xs text-orange-400 font-bold gap-1"><AlertTriangle size={12} /> Stock Crítico</span>}
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold tracking-tight ${isLowStock ? 'text-orange-500' : 'text-emerald-400'}`}>{item.quantity}</div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{product.unit}s</div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* ¡HEMOS QUITADO EL ACTIVITY LOG DE AQUÍ! */}

    </div>
  );
}