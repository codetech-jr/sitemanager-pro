import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabaseClient';
import { Printer, X } from 'lucide-react';

// Interfaz simple para lo que vamos a imprimir
interface ProductLabel {
  sku: string;
  name: string;
  unit: string;
}

export default function PrintLabels({ onClose }: { onClose: () => void }) {
  const [products, setProducts] = useState<ProductLabel[]>([]);

  useEffect(() => {
    // Bajamos todos los productos del maestro
    supabase.from('master_sku').select('sku, name, unit').then(({ data }) => {
      if (data) setProducts(data as any);
    });
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      
      {/* HEADER DE CONTROL (Se oculta al imprimir) */}
      <div className="print:hidden sticky top-0 bg-blue-600 text-white p-4 flex justify-between items-center shadow-lg mb-8">
        <div>
          <h2 className="text-xl font-bold">Generador de Etiquetas</h2>
          <p className="text-sm opacity-80">{products.length} productos listos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-white text-blue-700 font-bold px-4 py-2 rounded-lg hover:bg-blue-50 cursor-pointer"
          >
            <Printer size={18} /> Imprimir PDF
          </button>
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
          >
            <X size={18} /> Cerrar
          </button>
        </div>
      </div>

      {/* GRILLA DE ETIQUETAS (Diseño pensado para papel Carta/A4) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0 w-full bg-white text-black p-0">
        {products.map((prod) => (
          <div 
            key={prod.sku} 
            className="border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center page-break-inside-avoid aspect-square"
          >
            {/* NOMBRE GRANDE (Para que se lea de lejos en el estante) */}
            <h3 className="text-lg font-extrabold mb-1 uppercase tracking-tighter leading-tight w-full break-words">
              {prod.name}
            </h3>
            <p className="text-xs text-gray-500 font-mono mb-4">{prod.sku} - ({prod.unit})</p>
            
            {/* EL QR MAESTRO */}
            <div className="bg-white p-1">
              <QRCode 
                value={prod.sku} // <--- ESTO ES LO QUE LEERÁ TU ESCÁNER
                size={140} 
                level="M" // Nivel de corrección de error (Medio)
              />
            </div>
            
            <p className="mt-4 text-[10px] text-gray-400 font-bold tracking-[0.2em]">SITEMANAGER PRO</p>
          </div>
        ))}
      </div>

      {/* Estilos para "esconder" cosas cuando imprimes de verdad */}
      <style>{`
        @media print {
          @page { margin: 0.5cm; }
          .print\\:hidden { display: none !important; }
          body { background: white; color: black; }
        }
      `}</style>
    </div>
  );
}