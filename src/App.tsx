import { useState } from 'react';
import InventoryList from './components/InventoryList';
import ActivityLog from './components/ActivityLog';
import PrintLabels from './components/PrintLabels';
import { LayoutDashboard, History, Settings } from 'lucide-react';

export default function App() {
  // Estado para controlar qué "Tab" (Pestaña) estamos viendo
  const [currentTab, setCurrentTab] = useState<'STOCK' | 'HISTORY' | 'ADMIN'>('STOCK');
  
  // Este estado global sirve para refrescar todo cuando haces un movimiento
  const [globalRefresh] = useState(0);

  // Función auxiliar para forzar recarga en todos lados

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 pb-24">
      
      {/* 1. NAVBAR SUPERIOR (Solo Título y Avatar) */}
      <header className="px-6 py-5 border-b border-slate-900 bg-slate-950/90 backdrop-blur sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white">
            Site<span className="text-blue-500">Manager</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">PANEL DE CONTROL v1.0</p>
        </div>
        <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xs shadow-lg shadow-blue-900/20">
          EO
        </div>
      </header>

      {/* 2. ÁREA DE CONTENIDO (Cambiante según la Tab) */}
      <main className="max-w-4xl mx-auto py-6">
        
        {currentTab === 'STOCK' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             {/* Pasamos el key para forzar que se repinte si cambia la data */}
             {/* NOTA: Tu componente InventoryList ya incluye el botón flotante TransactionFab */}
             <InventoryList /> 
          </div>
        )}

        {currentTab === 'HISTORY' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 px-4">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
               <History className="text-blue-500" /> Historial de Movimientos
            </h2>
            <ActivityLog refreshTrigger={globalRefresh} />
          </div>
        )}

        {currentTab === 'ADMIN' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             {/* Reutilizamos el PrintLabels pero ahora integrado en la pantalla */}
             <PrintLabels onClose={() => setCurrentTab('STOCK')} />
          </div>
        )}

      </main>

      {/* 3. BARRA DE NAVEGACIÓN INFERIOR (ESTILO APP NATIVA) */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 z-40 pb-safe pt-2">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          
          <button 
            onClick={() => setCurrentTab('STOCK')}
            className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'STOCK' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutDashboard size={24} strokeWidth={currentTab === 'STOCK' ? 3 : 2} />
            <span className="text-[10px] font-bold">Bodega</span>
          </button>

          <button 
            onClick={() => setCurrentTab('HISTORY')}
            className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'HISTORY' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <History size={24} strokeWidth={currentTab === 'HISTORY' ? 3 : 2} />
            <span className="text-[10px] font-bold">Historial</span>
          </button>

          <button 
            onClick={() => setCurrentTab('ADMIN')}
            className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'ADMIN' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Settings size={24} strokeWidth={currentTab === 'ADMIN' ? 3 : 2} />
            <span className="text-[10px] font-bold">Admin</span>
          </button>

        </div>
      </nav>

    </div>
  )
}