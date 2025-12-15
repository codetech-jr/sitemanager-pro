// src/components/CreateRequisitionModal.tsx

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IMasterSku } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../lib/ProjectContext';
import { X, Search, Plus, Trash2, ShoppingCart, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner

interface CartItem extends IMasterSku {
  qtyRequest: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRequisitionModal({ isOpen, onClose, onSuccess }: Props) {
  const { currentProject } = useProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado temporal para la cantidad al agregar un item (reemplaza al prompt)
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<IMasterSku | null>(null);
  const [tempQty, setTempQty] = useState<string>('1');

  // 1. Cargar catálogo local
  const catalog = useLiveQuery(() => db.master_sku.toArray(), []);
  
  // 2. Filtrar catálogo
  const filteredCatalog = catalog?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5); // Solo mostrar top 5 coincidencias

  // Preparar para añadir al carrito (abre mini-ui de cantidad)
  const prepareAddToCart = (product: IMasterSku) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      toast.warning("Este producto ya está en el pedido.");
      return;
    }
    setSelectedItemToAdd(product);
    setTempQty('1'); // Reset cantidad por defecto
  };

  // Confirmar añadir al carrito
  const confirmAddToCart = () => {
    if (!selectedItemToAdd) return;
    const qty = parseFloat(tempQty);
    
    if (qty > 0) {
      setCart([...cart, { ...selectedItemToAdd, qtyRequest: qty }]);
      setSearchTerm('');
      setSelectedItemToAdd(null); // Cerrar mini-ui
      toast.success(`${selectedItemToAdd.name} añadido`);
    } else {
      toast.error("La cantidad debe ser mayor a 0");
    }
  };

  // Quitar del carrito
  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  // 3. GUARDAR EL PEDIDO
  const handleCreateOrder = async () => {
    if (!currentProject) {
        toast.error("No hay proyecto seleccionado");
        return;
    }
    if (cart.length === 0) {
        toast.warning("El pedido está vacío");
        return;
    }

    setLoading(true);
    const toastId = toast.loading("Creando pedido...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) throw new Error("No hay sesión de usuario activa");

      // A. Crear Cabecera
      const { data: reqData, error: reqError } = await supabase
        .from('requisitions')
        .insert({
          project_id: currentProject.id,
          user_id: user.id,
          status: 'PENDING'
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // B. Preparar Items
      const itemsToInsert = cart.map(item => ({
        requisition_id: reqData.id,
        sku_id: item.id,
        quantity_requested: item.qtyRequest,
        quantity_received: 0
      }));

      // C. Insertar Items
      const { error: itemsError } = await supabase
        .from('requisition_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // D. Éxito: Guardar en local manualmente para feedback instantáneo
      if (reqData) {
          await db.requisitions.put(reqData); 
      }

      toast.success("Pedido creado exitosamente", { id: toastId });
      setCart([]);
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      toast.error("Error al crear pedido: " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="text-blue-500"/> Nuevo Pedido de Material
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* LADO IZQUIERDO: BUSCADOR (CATÁLOGO) */}
          <div className="flex-1 p-4 border-r border-slate-800 overflow-y-auto relative">
            
            {/* Si estamos añadiendo cantidad, mostramos el overlay de cantidad */}
            {selectedItemToAdd ? (
                <div className="absolute inset-0 bg-slate-900/95 z-10 flex flex-col items-center justify-center p-6 animate-in fade-in">
                    <h4 className="text-white font-bold text-center mb-1">{selectedItemToAdd.name}</h4>
                    <p className="text-slate-400 text-xs mb-4">Unidad: {selectedItemToAdd.unit}</p>
                    
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setTempQty(Math.max(1, parseFloat(tempQty) - 1).toString())} className="w-10 h-10 bg-slate-800 rounded-lg text-white font-bold hover:bg-slate-700">-</button>
                        <input 
                            type="number" 
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg py-2 text-center text-white font-bold outline-none focus:border-blue-500"
                            value={tempQty}
                            onChange={(e) => setTempQty(e.target.value)}
                            autoFocus
                        />
                        <button onClick={() => setTempQty((parseFloat(tempQty) + 1).toString())} className="w-10 h-10 bg-slate-800 rounded-lg text-white font-bold hover:bg-slate-700">+</button>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button onClick={() => setSelectedItemToAdd(null)} className="flex-1 py-2 text-slate-400 font-bold hover:text-white border border-slate-700 rounded-lg">Cancelar</button>
                        <button onClick={confirmAddToCart} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500">Añadir</button>
                    </div>
                </div>
            ) : null}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-slate-500" size={18} />
              <input 
                autoFocus
                placeholder="Buscar material..." 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none placeholder-slate-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              {searchTerm && filteredCatalog?.map(prod => (
                <button 
                  key={prod.id} 
                  onClick={() => prepareAddToCart(prod)}
                  className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500/50 group transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 text-sm">{prod.name}</span>
                    <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </div>
                  <div className="text-xs text-slate-500 flex gap-2 mt-1">
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">{prod.sku}</span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded">{prod.unit}</span>
                  </div>
                </button>
              ))}
              {searchTerm && filteredCatalog?.length === 0 && (
                <p className="text-slate-500 text-center text-sm py-8">No se encontraron materiales.</p>
              )}
              {!searchTerm && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                    <Search size={32} className="mb-2 opacity-20"/>
                    <p className="text-xs">Escribe para buscar en el catálogo...</p>
                </div>
              )}
            </div>
          </div>

          {/* LADO DERECHO: CARRITO (RESUMEN) */}
          <div className="flex-1 p-4 bg-slate-950/30 flex flex-col border-t md:border-t-0 md:border-l border-slate-800">
            <h4 className="text-slate-400 text-xs font-bold uppercase mb-3 flex justify-between items-center border-b border-slate-800 pb-2">
              <span>Items en el Pedido</span>
              <span className="bg-blue-900/30 text-blue-400 px-2 rounded-full">{cart.length}</span>
            </h4>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar pr-1">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl p-6">
                  <ShoppingCart size={32} className="mb-2 opacity-30"/>
                  <p className="text-sm font-medium">El carrito está vacío</p>
                  <p className="text-xs text-slate-500 mt-1 text-center">Busca materiales a la izquierda para agregarlos.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center border border-slate-700/50 group hover:border-slate-600 transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-blue-500/10 text-blue-400 px-1.5 rounded font-mono font-bold">x {item.qtyRequest}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{item.unit}</span>
                      </div>
                    </div>
                    <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-slate-500 hover:text-red-400 hover:bg-red-950/30 p-2 rounded-lg transition-colors"
                        title="Eliminar"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
                <button 
                onClick={handleCreateOrder}
                disabled={loading || cart.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                >
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Send size={18}/>}
                Enviar Pedido al Proveedor
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}