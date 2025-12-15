// src/components/CatalogManagementPanel.tsx

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IMasterSku } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { Edit, PackagePlus, Loader2, Archive } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner
import CatalogFormModal from './CatalogFormModal';

export default function CatalogManagementPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    const isNew = !editingProduct;
    const toastId = toast.loading(isNew ? "Creando producto..." : "Actualizando producto...");

    try {
      const { data, error } = await supabase
        .from('master_sku')
        .upsert(productData) // .upsert() maneja inserción y actualización
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await db.master_sku.put(data as IMasterSku); // Actualizamos Dexie
        toast.success(isNew ? "Producto creado exitosamente" : "Producto actualizado", { id: toastId });
        setIsModalOpen(false);
      }
    } catch (error: any) {
      console.error("Error guardando producto:", error);
      toast.error("Error al guardar: " + error.message, { id: toastId });
    }
  };

  // Función placeholder para archivar
  const handleArchive = async (productName: string) => {
      // Aquí iría la lógica real (ej: update is_active = false)
      toast.info(`Función 'Archivar ${productName}' pendiente de implementación.`);
  };

  // Estado de carga inicial
  if (!catalog) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p>Cargando catálogo...</p>
      </div>
    );
  }
  
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Catálogo de Materiales y Herramientas</h3>
        <button 
          onClick={handleAddNew} 
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
        >
          <PackagePlus size={18} /> 
          <span className="hidden sm:inline">Añadir Nuevo Producto</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
        {catalog.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic">
            No hay productos registrados en el catálogo.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4 hidden md:table-cell">SKU</th>
                <th className="p-4 hidden md:table-cell">Unidad</th>
                <th className="p-4 text-right">Precio Unitario</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {catalog.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-800/80 transition-colors">
                  <td className="p-4 font-bold text-white">
                    {prod.name}
                    {prod.description && <p className="text-xs text-slate-500 font-normal mt-0.5 truncate max-w-[200px]">{prod.description}</p>}
                  </td>
                  <td className="p-4 hidden md:table-cell font-mono text-xs text-slate-400 bg-slate-900/30 px-2 py-1 rounded w-fit">{prod.sku}</td>
                  <td className="p-4 hidden md:table-cell text-slate-300 text-sm">{prod.unit}</td>
                  <td className="p-4 text-right font-mono text-emerald-400 font-medium">${prod.price?.toFixed(2) ?? '0.00'}</td>
                  <td className="p-4 flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleEdit(prod)} 
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={18}/>
                    </button>
                    <button 
                      onClick={() => handleArchive(prod.name)} 
                      className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors" 
                      title="Archivar"
                    >
                      <Archive size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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