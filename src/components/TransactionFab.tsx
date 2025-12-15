// src/components/TransactionFab.tsx

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import SignatureCanvas from 'react-signature-canvas';
import { Camera, X, Check, Search, Eraser, PenTool, Minus, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { registrarMovimiento } from '../lib/api';
import { useProject } from '../lib/ProjectContext';
import { toast } from 'sonner'; // <--- Importar Sonner

interface ProductResult {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

export default function TransactionFab({ onUpdate }: { onUpdate: () => void }) {
  const { currentProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'idle' | 'scanning' | 'confirm'>('idle');
  
  // Referencia para la firma
  const sigPad = useRef<any>({});
  
  // Búsqueda y Datos
  const [searchTerm, setSearchTerm] = useState('');
  const [catalog, setCatalog] = useState<ProductResult[]>([]);
  const [filteredCatalog, setFilteredCatalog] = useState<ProductResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // Cargar catálogo al abrir (para el buscador manual)
  useEffect(() => {
    if (isOpen) {
      supabase.from('master_sku').select('id, name, sku, unit').then(({ data }) => {
        if (data) { 
            setCatalog(data as any); 
            setFilteredCatalog([]); 
        }
      });
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filtro de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') { setFilteredCatalog([]); return; }
    const lowerTerm = searchTerm.toLowerCase();
    const results = catalog.filter(p => 
      p.name.toLowerCase().includes(lowerTerm) || p.sku.toLowerCase().includes(lowerTerm)
    ).slice(0, 4); 
    setFilteredCatalog(results);
  }, [searchTerm, catalog]);

  // Lógica del Escáner QR
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (step === 'scanning' && isOpen) {
       // Pequeño delay para asegurar que el div 'reader' existe en el DOM
       const timer = setTimeout(() => {
         if(!document.getElementById('reader')) return;
         
         scanner = new Html5QrcodeScanner("reader", { 
             fps: 10, 
             qrbox: 250, 
             aspectRatio: 1.0 
         }, false);
         
         scanner.render(
             (decodedText) => { 
                 handleProductSelect(null, decodedText); 
                 scanner?.clear(); 
             }, 
             (err) => console.log(err)
         );
       }, 300);
       
       return () => clearTimeout(timer);
    }
    
    return () => { 
        if(scanner) scanner.clear().catch(() => {}); 
    };
  }, [step, isOpen]);

  const handleProductSelect = async (productObj: ProductResult | null, codeStr?: string) => {
    let finalProduct = productObj;
    
    // Si viene del escáner, buscar en el catálogo cargado
    if (!finalProduct && codeStr) {
      finalProduct = catalog.find(p => p.sku === codeStr) || null;
      
      // Si no está en el catálogo local (puede ser nuevo), intentar buscar en la BD
      if (!finalProduct) {
          const { data } = await supabase.from('master_sku').select('*').eq('sku', codeStr).single();
          if (data) finalProduct = data;
      }
    }

    if (finalProduct) {
      setSelectedProduct(finalProduct);
      setStep('confirm');
      setSearchTerm('');
    } else {
      toast.error(`Producto no encontrado: ${codeStr}`);
    }
  };

  // --- LÓGICA DE GUARDADO (SOLO SALIDAS) ---
  const handleConfirm = async () => {
    if (!selectedProduct || !currentProject) {
        toast.error("Error: Faltan datos del proyecto o producto.");
        return;
    }
    
    // Validación: La firma es obligatoria siempre para retiros
    if (sigPad.current.isEmpty()) {
      toast.warning("⚠️ Debe firmar quien retira el material.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Procesando retiro...");

    try {
      // SIEMPRE ES NEGATIVO (SALIDA)
      const qtyFinal = -Math.abs(quantity); 
      
      const firmaImage = sigPad.current.getCanvas().toDataURL('image/png');
      
      // Enviamos a la API como 'SALIDA'
      await registrarMovimiento(
          selectedProduct.id, 
          currentProject.id, 
          qtyFinal, 
          'SALIDA', 
          firmaImage
      );
      
      toast.success("Retiro registrado exitosamente", { id: toastId });
      onUpdate();
      handleClose(); 

    } catch (err: any) {
      console.error(err);
      toast.error("Error al registrar: " + err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('idle');
    setQuantity(1);
    setSelectedProduct(null);
  };
  
  const clearSignature = () => {
    sigPad.current.clear();
  }

  // Si no hay proyecto seleccionado, no mostramos el botón flotante
  if (!currentProject) return null;

  if (!isOpen) {
    return (
      <button 
        onClick={() => { setIsOpen(true); setStep('scanning'); }} 
        className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/50 hover:bg-blue-500 z-50 cursor-pointer active:scale-90 transition-transform"
        title="Despachar Material"
      >
        <Camera className="text-white w-8 h-8" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {step === 'scanning' ? 'Escanear para Retiro' : 'Confirmar Salida'}
          </h3>
          <button onClick={handleClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar">
          
          {step === 'scanning' && (
             <div className="flex flex-col gap-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 outline-none focus:border-blue-500 transition-colors" 
                    autoFocus 
                  />
                  
                  {/* Resultados de búsqueda */}
                  {filteredCatalog.length > 0 && (
                    <ul className="absolute w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-20 overflow-hidden">
                     {filteredCatalog.map(prod => (
                       <li key={prod.id}>
                         <button 
                            onClick={()=>handleProductSelect(prod)} 
                            className="w-full text-left p-3 hover:bg-slate-700 text-white font-bold border-b border-slate-700 last:border-0 flex justify-between"
                         >
                            <span>{prod.name}</span>
                            <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400">{prod.sku}</span>
                         </button>
                       </li>
                     ))}
                    </ul>
                  )}
                </div>

                <div className="bg-black rounded-xl overflow-hidden h-64 flex items-center justify-center border border-slate-700 relative">
                 <div id="reader" className="w-full h-full opacity-80"></div>
                 <div className="absolute inset-0 border-2 border-blue-500/30 pointer-events-none rounded-xl"></div>
                 <p className="absolute bottom-4 text-blue-400 text-xs font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur">Cámara Activa</p>
                </div>
             </div>
          )}

          {step === 'confirm' && selectedProduct && (
            <div className="animate-in fade-in zoom-in duration-300 pb-20 sm:pb-0">
              
              <div className="text-center mb-6">
                 <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full mb-3 inline-block border border-orange-500/20">
                    RETIRANDO DE BODEGA
                 </span>
                 <h2 className="text-2xl font-bold text-white leading-tight mb-1">{selectedProduct.name}</h2>
                 <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">{selectedProduct.sku}</span>
              </div>

              {/* CANTIDAD */}
              <div className="flex items-center justify-between bg-slate-800 rounded-2xl p-2 mb-6 border border-slate-700/50">
                <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="w-14 h-14 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-2xl font-bold active:scale-95 transition"
                >
                    <Minus/>
                </button>
                <div className="flex flex-col items-center w-24">
                    <span className="text-5xl font-bold text-white tracking-tighter">{quantity}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{selectedProduct.unit}S</span>
                </div>
                <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    className="w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-2xl font-bold active:scale-95 transition"
                >
                    <Plus/>
                </button>
              </div>

              {/* FIRMA */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                      <PenTool size={12}/> Firma de quien recibe
                   </label>
                   <button 
                        onClick={clearSignature} 
                        className="text-[10px] text-red-400 hover:text-white flex items-center gap-1 cursor-pointer bg-red-500/10 px-2 py-1 rounded hover:bg-red-500 transition-colors"
                    >
                        <Eraser size={10}/> Limpiar
                   </button>
                </div>
                
                <div className="border border-slate-600 bg-white rounded-xl overflow-hidden cursor-crosshair h-32 relative shadow-inner">
                   <SignatureCanvas 
                      ref={sigPad}
                      penColor="black"
                      canvasProps={{ className: 'absolute inset-0 w-full h-full' }} 
                   />
                </div>
              </div>

              <button 
                onClick={handleConfirm} disabled={loading}
                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Check /> CONFIRMAR RETIRO</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}