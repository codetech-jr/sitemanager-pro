// src/components/CatalogManagementPanel.tsx

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IMasterSku } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { Edit, PackagePlus, Loader2, Archive } from 'lucide-react';
import CatalogFormModal from './CatalogFormModal'; // <-- El modal que crearemos a continuación

export default function CatalogManagementPanel() {
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingProduct, setEditingProduct] = useState<IMasterSku | null>(null);

  // Leemos los productos del catálogo directamente de Dexie
  const catalog = useLiveQuery(() => db.master_sku.toArray(), []);

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: IMasterSku) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSave = async (productData: IMasterSku) => {
    const { data, error } = await supabase
      .from('master_sku')
      .upsert(productData) // .upsert() maneja inserción y actualización
      .select()
      .single();

    if (error) {
      alert("Error guardando producto: " + error.message);
    } else if (data) {
      await db.master_sku.put(data as IMasterSku); // Actualizamos Dexie
    }
    setIsModalOpen(false);
  };

  // En productos, en vez de 'desactivar', podríamos 'archivar'
  // Por simplicidad, esta función la dejamos como placeholder por ahora
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleArchive = async (productId: string) => {
      alert("Función 'Archivar' no implementada. Se haría similar a 'desactivar empleado'.");
  };

  if (!catalog) return <div className="p-10 text-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Catálogo de Materiales y Herramientas</h3>
        <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2">
          <PackagePlus size={16} /> Añadir Nuevo Producto
        </button>
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
            <tr>
              <th className="p-4">Producto</th>
              <th className="p-4 hidden md:table-cell">SKU</th>
              <th className="p-4 hidden md:table-cell">Unidad</th>
              <th className="p-4 text-right">Precio Unitario</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {catalog.map(prod => (
              <tr key={prod.id} className="hover:bg-slate-800">
                <td className="p-4 font-bold text-white">{prod.name}</td>
                <td className="p-4 hidden md:table-cell font-mono text-slate-400">{prod.sku}</td>
                <td className="p-4 hidden md:table-cell text-slate-300">{prod.unit}</td>
                <td className="p-4 text-right font-mono text-emerald-400">${prod.price?.toFixed(2) ?? '0.00'}</td>
                <td className="p-4 flex items-center gap-2">
                  <button onClick={() => handleEdit(prod)} className="p-2 text-slate-400 hover:text-blue-400"><Edit size={16}/></button>
                  <button onClick={() => handleArchive(prod.id)} className="p-2 text-slate-400 hover:text-yellow-400" title="Archivar"><Archive size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CatalogFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        product={editingProduct}
      />
    </div>
  );
}