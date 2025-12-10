import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import SignatureCanvas from 'react-signature-canvas';
import { Camera, X, Check, Search, ArrowDown, ArrowUp, Eraser, PenTool } from 'lucide-react';
import { addTransactionToQueue } from '../lib/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { IMasterSku } from '../lib/db';

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; 

export default function TransactionFab({ onUpdate }: { onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'scanning' | 'confirm'>('scanning');
  const [mode, setMode] = useState<'SALIDA' | 'ENTRADA'>('SALIDA'); 

  const sigPad = useRef<any>({});
  
  const catalog = useLiveQuery(() => db.master_sku.toArray(), []) as IMasterSku[] | undefined;

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCatalog, setFilteredCatalog] = useState<IMasterSku[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState<IMasterSku | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!catalog || searchTerm.trim() === '') { setFilteredCatalog([]); return; }
    const lowerTerm = searchTerm.toLowerCase();
    const results = catalog.filter(p => p.name.toLowerCase().includes(lowerTerm) || p.sku.toLowerCase().includes(lowerTerm)).slice(0, 4); 
    setFilteredCatalog(results);
  }, [searchTerm, catalog]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (step === 'scanning' && isOpen && document.getElementById('reader')) {
       scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
       const onScanSuccess = (decodedText: string) => {
         handleProductSelect(null, decodedText);
         scanner?.clear().catch(() => {});
       };
       scanner.render(onScanSuccess, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [step, isOpen, catalog]);

  const handleProductSelect = (productObj: IMasterSku | null, codeStr?: string) => {
    let finalProduct = productObj;
    if (!finalProduct && codeStr && catalog) {
      finalProduct = catalog.find(p => p.sku === codeStr) || null;
    }
    if (finalProduct) {
      setSelectedProduct(finalProduct);
      setStep('confirm');
      setSearchTerm('');
    } else {
      alert(`Producto con código "${codeStr}" no encontrado en la base de datos local.`);
    }
  };

  const handleConfirm = async () => {
    if (!selectedProduct) return;
    const hasSignature = !sigPad.current.isEmpty();
    if (mode === 'SALIDA' && !hasSignature) {
      alert("⚠️ La firma de quien recibe es obligatoria para retirar material.");
      return;
    }
    setLoading(true);
    try {
      const multiplier = mode === 'SALIDA' ? -1 : 1;
      const qtyFinal = Math.abs(quantity) * multiplier;
      let firmaImage = undefined;
      if (hasSignature) {
        firmaImage = sigPad.current.getCanvas().toDataURL('image/png');
      }
      await addTransactionToQueue({
        skuId: selectedProduct.id,
        projectId: PROJECT_ID,
        cantidad: qtyFinal,
        tipo: mode,
        firmaDataUrl: firmaImage
      });
      onUpdate();
      handleClose(); 
    } catch (err: any) {
      alert("Error al añadir a la cola: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('scanning');
    setQuantity(1);
    setSelectedProduct(null);
    setMode('SALIDA');
    setSearchTerm('');
  };
  
  const clearSignature = () => sigPad.current.clear();
  const isSalida = mode === 'SALIDA';
  const buttonColorClass = isSalida ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500';

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="fixed bottom-20 right-5 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/50 hover:bg-blue-500 z-30 cursor-pointer active:scale-90 transition-transform">
      <Camera className="text-white w-8 h-8" />
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {step === 'scanning' ? 'Buscar o Escanear' : 'Confirmar Transacción'}
          </h3>
          <button onClick={handleClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto no-scrollbar">
          {step === 'scanning' && (
             <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input type="text" placeholder="Escribe para buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-800 text-white pl-12 pr-4 py-3 rounded-xl border border-slate-600 outline-none" autoFocus />
                </div>
                {filteredCatalog.length > 0 && <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20">
                     {filteredCatalog.map(prod => (
                       <button key={prod.id} onClick={()=>handleProductSelect(prod)} className="w-full text-left p-4 hover:bg-slate-700/50 text-white font-semibold border-b border-slate-700 last:border-0 first:rounded-t-xl last:rounded-b-xl flex justify-between items-center">
                         <span>{prod.name}</span>
                         <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400">{prod.sku}</span>
                       </button>
                     ))}
                </div>}
                <div className="relative text-center text-slate-500 text-xs my-2">O</div>
                <div className="bg-black rounded-xl overflow-hidden min-h-[250px] flex items-center justify-center border border-slate-700">
                 <div id="reader" className="w-[250px] h-[250px]"></div>
                 {!catalog && <p className="absolute text-slate-500">Cargando base de datos local...</p>}
                </div>
             </div>
          )}
          {step === 'confirm' && selectedProduct && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="bg-slate-800 p-1 rounded-xl flex mb-6 relative overflow-hidden">
                 <div className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] transition-all duration-300 rounded-lg shadow ${isSalida ? 'left-1 bg-orange-500' : 'left-1/2 bg-emerald-500'}`}></div>
                 <button onClick={() => setMode('SALIDA')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold z-10 ${isSalida ? 'text-white' : 'text-slate-400'}`}><ArrowUp size={16} /> RETIRAR</button>
                 <button onClick={() => setMode('ENTRADA')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold z-10 ${!isSalida ? 'text-white' : 'text-slate-400'}`}><ArrowDown size={16} /> INGRESAR</button>
              </div>
              <div className="text-center mb-6">
                 <h2 className="text-xl font-bold text-white leading-tight">{selectedProduct.name}</h2>
                 <span className="text-xs font-mono text-slate-400">{selectedProduct.sku}</span>
              </div>
              <div className={`flex items-center justify-between bg-slate-800/50 rounded-2xl p-2 mb-6 border border-slate-700`}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-16 h-16 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-3xl font-bold active:scale-95 transition">-</button>
                <div className="flex flex-col items-center"><span className="text-5xl font-bold text-white">{quantity}</span><span className="text-[10px] text-slate-500 uppercase">{selectedProduct.unit}S</span></div>
                <button onClick={() => setQuantity(quantity + 1)} className="w-16 h-16 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-3xl font-bold active:scale-95 transition">+</button>
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-bold text-slate-400 flex items-center gap-1"><PenTool size={12}/> {isSalida ? 'FIRMA DE QUIEN RECIBE *' : 'FIRMA DE QUIEN ENTREGA'}</label>
                   <button onClick={clearSignature} className="text-[10px] text-red-400 hover:text-white flex items-center gap-1 cursor-pointer"><Eraser size={10}/> Borrar</button>
                </div>
                <div className="border border-slate-600 bg-white rounded-xl overflow-hidden cursor-crosshair">
                   <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ className: 'signature-canvas w-full h-32', style: { width: '100%', height: '128px' } }} />
                </div>
              </div>
              <button onClick={handleConfirm} disabled={loading} className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform ${buttonColorClass}`}>
                {loading ? 'Guardando en cola...' : <><Check /> CONFIRMAR {mode}</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}