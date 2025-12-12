// src/components/InventoryList.tsx (EL CÓDIGO CORRECTO PARA ESTE ARCHIVO)

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { AlertTriangle, Package, Loader2 } from 'lucide-react';

export default function InventoryList() {
  // Leemos en tiempo real desde la base de datos local (Dexie)
  // Usamos dos consultas separadas: una para el stock y otra para los detalles
  const inventoryItems = useLiveQuery(() => db.project_inventory.toArray(), []);
  const catalog = useLiveQuery(() => db.master_sku.toArray(), []);

  // Mientras Dexie está cargando los datos iniciales, mostramos un spinner.
  // Es importante chequear ambos arrays.
  if (!inventoryItems || !catalog) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  // Si no hay items en el inventario (pero sí cargó), mostramos un mensaje amigable.
  if (inventoryItems.length === 0) {
      return <div className="p-10 text-center text-slate-500 italic">La bodega está vacía. Realiza una entrada de material o revisa la sincronización.</div>
  }

  // "Enriquecemos" los datos: combinamos la cantidad (de inventoryItems)
  // con los detalles (nombre, unidad, etc. del catalog).
  const enrichedItems = inventoryItems.map(item => {
      const productInfo = catalog.find(p => p.id === item.sku_id);
      return {
          ...item,
          product: productInfo || { name: 'Producto Desconocido', sku: 'N/A', unit: 'UND', min_stock_alert: 0, price: 0 }
      }
  }).sort((a, b) => a.product.name.localeCompare(b.product.name)); // Ordenamos alfabéticamente

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-blue-500" /> Inventario Actual en Bodega
          </h2>
          <span className="text-sm font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
             {inventoryItems.length} items
          </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {enrichedItems.map((item) => {
          const isLowStock = item.quantity <= (item.product.min_stock_alert ?? 0);

          return (
            <div 
              key={`${item.project_id}-${item.sku_id}`}
              className={`relative bg-slate-800 border border-slate-700 rounded-xl p-4 flex justify-between items-center transition-transform hover:scale-[1.02] ${isLowStock ? 'border-orange-500/50' : ''}`}
            >
              <div>
                <span className="text-xs font-mono text-slate-400">{item.product.sku}</span>
                <h3 className="text-base font-bold text-white mt-1">{item.product.name}</h3>
                {isLowStock && (
                   <div className="mt-2 flex items-center gap-1 text-xs text-orange-400 font-bold animate-pulse">
                     <AlertTriangle size={12} /> Stock Crítico
                   </div>
                )}
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className={`text-3xl font-bold ${isLowStock ? 'text-orange-500' : 'text-emerald-400'}`}>
                  {item.quantity}
                </div>
                <div className="text-[10px] uppercase text-slate-500 font-bold">{item.product.unit}S</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}