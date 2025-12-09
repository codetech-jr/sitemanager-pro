import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, X, Check, Search, Box, ArrowDown, ArrowUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { registrarMovimiento } from '../lib/api';

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Definimos interfaz para la búsqueda local
interface ProductResult {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

export default function TransactionFab({ onUpdate }: { onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'idle' | 'scanning' | 'confirm'>('idle');
  
  // ESTADO NUEVO: TIPO DE TRANSACCIÓN (Default: SALIDA)
  const [mode, setMode] = useState<'SALIDA' | 'ENTRADA'>('SALIDA'); 
  
  // Estados para Búsqueda Manual
  const [searchTerm, setSearchTerm] = useState('');
  const [catalog, setCatalog] = useState<ProductResult[]>([]);
  const [filteredCatalog, setFilteredCatalog] = useState<ProductResult[]>([]);
  
  // Estados de Transacción
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // 1. CARGA INICIAL
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

  // 2. MOTOR DE BÚSQUEDA LOCAL
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCatalog([]);
      return;
    }
    const lowerTerm = searchTerm.toLowerCase();
    const results = catalog.filter(p => 
      p.name.toLowerCase().includes(lowerTerm) || 
      p.sku.toLowerCase().includes(lowerTerm)
    ).slice(0, 4); 
    setFilteredCatalog(results);
  }, [searchTerm, catalog]);


  // 3. INICIAR CÁMARA
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (step === 'scanning' && isOpen) {
       setTimeout(() => {
         if(!document.getElementById('reader')) return;

         scanner = new Html5QrcodeScanner(
          "reader", { fps: 10, qrbox: 250, aspectRatio: 1.0 }, false
        );
        
        scanner.render((decodedText) => {
          handleProductSelect(null, decodedText); 
          scanner?.clear();
        }, (err) => console.log(err));

       }, 100);
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [step, isOpen]);

  // LÓGICA UNIFICADA DE SELECCIÓN
  const handleProductSelect = async (productObj: ProductResult | null, codeStr?: string) => {
    setLoading(true);
    let finalProduct = productObj;

    if (!finalProduct && codeStr) {
      finalProduct = catalog.find(p => p.sku === codeStr) || null;
    }

    if (finalProduct) {
      setSelectedProduct(finalProduct);
      setStep('confirm');
      setSearchTerm(''); 
    } else {
      alert(`No se encontró producto con código: ${codeStr}`);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      // LOGICA MATEMÁTICA SEGÚN EL MODO
      const multiplier = mode === 'SALIDA' ? -1 : 1;
      const qtyFinal = Math.abs(quantity) * multiplier;
      
      await registrarMovimiento(selectedProduct.id, PROJECT_ID, qtyFinal, mode);
      
      onUpdate();
      handleClose(); 
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('idle');
    setQuantity(1);
    setSelectedProduct(null);
    setMode('SALIDA'); // Resetear modo al cerrar
  };

  // Lógica de colores según el modo seleccionado
  const isSalida = mode === 'SALIDA';
  const activeTextClass = isSalida ? 'text-orange-500' : 'text-emerald-500';
  const buttonColorClass = isSalida ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20';
  const borderColorClass = isSalida ? 'border-orange-900/30' : 'border-emerald-900/30';

  if (!isOpen) {
    return (
      <button 
        onClick={() => { setIsOpen(true); setStep('scanning'); }}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/50 hover:bg-blue-500 z-50 cursor-pointer active:scale-90 transition-transform"
      >
        <Camera className="text-white w-8 h-8" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {step === 'scanning' ? <Search size={20} className="text-blue-400"/> : <Box size={20} className="text-blue-400"/>}
            {step === 'scanning' ? 'Buscar o Escanear' : 'Confirmar Transacción'}
          </h3>
          <button onClick={handleClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          
          {/* PANTALLA 1: HÍBRIDA (BUSCADOR + ESCÁNER) */}
          {step === 'scanning' && (
            <div className="flex flex-col gap-6">
              
              {/* A. INPUT BUSCADOR INTELIGENTE */}
              <div className="relative z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input 
                    type="text"
                    placeholder="Escribe nombre (ej. Martillo)..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-500 font-medium"
                    autoFocus
                  />
                </div>

                {/* RESULTADOS AUTOCOMPLETADO */}
                {filteredCatalog.length > 0 && (
                  <ul className="absolute w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-700">
                    {filteredCatalog.map((prod) => (
                      <li key={prod.id}>
                        <button 
                          onClick={() => handleProductSelect(prod)}
                          className="w-full text-left p-3 hover:bg-slate-700 flex justify-between items-center group cursor-pointer"
                        >
                          <span className="font-bold text-slate-200 group-hover:text-white">{prod.name}</span>
                          <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">{prod.sku}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="h-px bg-slate-700 flex-1"></div>
                <span>O usa la cámara</span>
                <div className="h-px bg-slate-700 flex-1"></div>
              </div>

              {/* B. EL ESCÁNER */}
              <div className="bg-black rounded-xl overflow-hidden border-2 border-slate-700 shadow-inner relative h-64 flex items-center justify-center">
                 <div id="reader" className="w-full h-full opacity-80"></div>
                 <p className="absolute text-slate-500 text-xs pointer-events-none">Esperando QR...</p>
              </div>
            </div>
          )}

          {/* PANTALLA 2: CONFIRMAR CANTIDAD + MODO */}
          {step === 'confirm' && selectedProduct && (
            <div className="animate-in fade-in zoom-in duration-300">
              
              {/* TOGGLE: RETIRAR / INGRESAR */}
              <div className="bg-slate-800 p-1 rounded-lg flex mb-6 relative select-none">
                 <div className={`w-1/2 h-full absolute transition-all duration-300 top-0 rounded-md bg-opacity-10 ${isSalida ? 'left-0' : 'left-1/2'}`}></div>
                 
                 <button 
                   onClick={() => setMode('SALIDA')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all z-10 ${isSalida ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                 >
                    <ArrowUp size={16} /> RETIRAR
                 </button>
                 <button 
                   onClick={() => setMode('ENTRADA')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all z-10 ${!isSalida ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                 >
                    <ArrowDown size={16} /> INGRESAR
                 </button>
              </div>

              {/* INFO PRODUCTO */}
              <div className="text-center mb-6">
                 <span className={`text-xs font-mono px-3 py-1 rounded-full bg-opacity-10 bg-current ${activeTextClass}`}>{selectedProduct.sku}</span>
                 <h2 className="text-2xl font-bold text-white mt-3 leading-tight">{selectedProduct.name}</h2>
              </div>

              {/* CONTROLADOR DE CANTIDAD (Color dinámico) */}
              <div className={`flex items-center justify-between bg-slate-800/50 rounded-2xl p-2 mb-8 border transition-colors ${borderColorClass}`}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-16 h-16 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-3xl font-bold active:scale-95 transition"
                >-</button>
                <div className="flex flex-col items-center">
                  <span className={`text-5xl font-bold tracking-tighter transition-colors ${activeTextClass}`}>{quantity}</span>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">{selectedProduct.unit}S</span>
                </div>
                <button 
                   onClick={() => setQuantity(quantity + 1)}
                   className="w-16 h-16 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-3xl font-bold active:scale-95 transition"
                >+</button>
              </div>

              <button 
                onClick={handleConfirm}
                disabled={loading}
                className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform ${buttonColorClass}`}
              >
                {loading ? 'Procesando...' : <><Check /> CONFIRMAR {mode}</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}