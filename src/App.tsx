// src/App.tsx

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { processSyncQueue, downloadDataFromServer } from './lib/syncManager'; // <--- IMPORTANTE

// Componentes
import DashboardPanel from './components/DashboardPanel';
import AttendancePanel from './components/AttendancePanel';
import Login from './components/Login';
import InventoryList from './components/InventoryList';
import ActivityLog from './components/ActivityLog';
import AdminPanel from './components/AdminPanel';
import TransactionFab from './components/TransactionFab';
import PrintLabels from './components/PrintLabels'; 

// Iconos
import { LayoutDashboard, History, Settings, LogOut, PackagePlus, BarChartHorizontal, UserCheck } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Controla la pantalla de "Verificando..."
  
  const [currentTab, setCurrentTab] = useState<'BODEGA' | 'HISTORIAL' | 'DASHBOARD' | 'ADMIN' | 'TAREO'>('BODEGA');

  const [, setGlobalRefresh] = useState(0);
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);

  // Consultamos transacciones pendientes para el indicador UI
  const pendingCount = useLiveQuery(() => db.pending_transactions.count(), []);

  // ====> EFECTO PRINCIPAL: AUTENTICACIÓN + SINCRONIZACIÓN INICIAL <====
  useEffect(() => {
    // Función centralizada para manejar la sesión y los datos
    const handleSession = async (currentSession: Session | null) => {
      try {
        setSession(currentSession);

        if (currentSession) {
          // 1. Obtener Rol del Usuario (Vital para mostrar pestañas de Admin)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSession.user.id)
            .single();

          setUserRole(profile?.role || 'bodeguero');

          // 2. Quitamos la pantalla de carga para que el usuario entre rápido
          setLoading(false); 

          // 3. Iniciamos la descarga de datos del servidor
          console.log("APP: Sesión activa. Iniciando descarga de datos...");
          await downloadDataFromServer();
          
          // 4. Procesamos cola si había algo pendiente
          await processSyncQueue();
        } else {
          // Si no hay sesión, limpiamos roles y dejamos de cargar
          setUserRole(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("APP: Error en la inicialización de sesión", error);
        setLoading(false);
      }
    };

    // A) Verificar sesión actual al cargar la página
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // B) Escuchar cambios en tiempo real (Login / Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`AUTH EVENT: ${event}`);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        handleSession(session);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ====> EFECTO SECUNDARIO: LISTENER ONLINE <====
  // Reintenta subir la cola cuando vuelve el internet mientras la app está abierta
  useEffect(() => {
    if (session) {
      window.addEventListener('online', processSyncQueue);
    }
    return () => {
      window.removeEventListener('online', processSyncQueue);
    };
  }, [session]);


  // Funciones auxiliares
  const handleLogout = async () => await supabase.auth.signOut();
  const handleTransactionSuccess = () => setGlobalRefresh(s => s + 1);

  // Renders de carga y login
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4 text-blue-500 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-sm">Sincronizando Sistema...</p>
      </div>
    );
  }

  if (!session) return <Login />;
  
  // Render principal
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      
      {/* HEADER */}
      <header className="px-4 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-20 flex justify-between items-center shadow-lg shadow-black/20">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-white">Site<span className="text-blue-500">Manager</span></h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-wide">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          {(pendingCount ?? 0) > 0 && (
            <div className="text-orange-400 text-xs font-bold animate-pulse flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-full" title={`${pendingCount} transacciones pendientes`}>
              <PackagePlus size={14} /> {pendingCount}
            </div>
          )}
          <button onClick={handleLogout} className="bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all duration-200" title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="pb-24">
        {currentTab === 'BODEGA' && <InventoryList />}
        {currentTab === 'HISTORIAL' && <ActivityLog />}
        
        {/* Renderizado condicional para ADMIN */}
        {currentTab === 'ADMIN' && userRole === 'admin' && (
          <AdminPanel onPrintClick={() => setIsPrintingLabels(true)} />
        )}
        {currentTab === 'DASHBOARD' && userRole === 'admin' && <DashboardPanel />}
        {currentTab === 'TAREO' && (userRole === 'admin' || userRole === 'bodeguero') && <AttendancePanel />}
      </main>

      {/* MODALES */}
      {isPrintingLabels && <PrintLabels onClose={() => setIsPrintingLabels(false)} />}
      
      {/* FAB (Botón flotante) */}
      <TransactionFab onUpdate={handleTransactionSuccess} />
      
      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 z-40 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
          
          <NavButton 
            active={currentTab === 'BODEGA'} 
            onClick={() => setCurrentTab('BODEGA')} 
            icon={LayoutDashboard} 
            label="Bodega" 
          />
          
          <NavButton 
            active={currentTab === 'HISTORIAL'} 
            onClick={() => setCurrentTab('HISTORIAL')} 
            icon={History} 
            label="Historial" 
          />

          { (userRole === 'admin' || userRole === 'bodeguero') && ( // <--- CAMBIO AQUÍ
            <NavButton 
              active={currentTab === 'TAREO'} 
              onClick={() => setCurrentTab('TAREO')} 
              icon={UserCheck} 
              label="Tareo" 
            />
          )}

          {userRole === 'admin' && (
            <>
              <NavButton 
                active={currentTab === 'DASHBOARD'} 
                onClick={() => setCurrentTab('DASHBOARD')} 
                icon={BarChartHorizontal} 
                label="KPIs" 
              />
              <NavButton 
                active={currentTab === 'ADMIN'} 
                onClick={() => setCurrentTab('ADMIN')} 
                icon={Settings} 
                label="Equipo" 
              />
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

// Subcomponente para limpiar el código de la barra de navegación
function NavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
        active ? 'text-blue-500 bg-blue-500/5 translate-y-0.5' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[9px] font-bold ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
    </button>
  )
}