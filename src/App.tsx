// src/App.tsx

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { useTheme } from './lib/useTheme';
import type { Session } from '@supabase/supabase-js';
import { useLiveQuery } from 'dexie-react-hooks';
import { Toaster } from 'sonner';
import { db } from './lib/db';
import { processSyncQueue, downloadDataFromServer } from './lib/syncManager';

// 1. Importaciones nuevas para el contexto de proyectos
import { useProject } from './lib/ProjectContext';
import ProjectSelector from './components/ProjectSelector';
import ToolsPanel from './components/ToolsPanel';

// Componentes
import DashboardPanel from './components/DashboardPanel';
import AttendancePanel from './components/AttendancePanel';
import Login from './components/Login';
import InventoryList from './components/InventoryList';
import ActivityLog from './components/ActivityLog';
import AdminPanel from './components/AdminPanel';
import TransactionFab from './components/TransactionFab';
import PrintLabels from './components/PrintLabels'; 
import RequisitionsPanel from './components/RequisitionsPanel';
import SiteLogPanel from "./components/SiteLogPanel";

// Iconos
import { 
  LayoutDashboard, 
  Truck, 
  History, 
  Settings, 
  LogOut, 
  PackagePlus, 
  BarChartHorizontal, 
  UserCheck, 
  ArrowRightLeft, 
  Hammer, 
  BookOpen, 
  Sun, 
  Moon 
} from 'lucide-react';

export default function App() {

  const { theme, toggleTheme } = useTheme(); 
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 2. Usar el contexto de proyectos
  const { currentProject, loadingProjects } = useProject();

  const [currentTab, setCurrentTab] = useState<'BODEGA' | 'PEDIDOS' | 'HISTORIAL' | 'DASHBOARD' | 'ADMIN' | 'TAREO' | 'HERRAMIENTAS' | 'BITACORA'>('BODEGA');

  const [syncTimestamp, setSyncTimestamp] = useState(0);
  
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);

  const pendingCount = useLiveQuery(() => db.pending_transactions.count(), []);

  // Función para "olvidar" el proyecto actual y volver al selector
  const handleSwitchProject = () => {
    localStorage.removeItem('siteManager_currentProject'); // Borramos la elección guardada
    window.location.reload(); // Recargamos para que aparezca el selector
  };

  useEffect(() => {
    const handleSession = async (currentSession: Session | null) => {
      try {
        setSession(currentSession);

        if (currentSession) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSession.user.id)
            .single();

          setUserRole(profile?.role || 'bodeguero');
          setLoading(false); 

          console.log("APP: Sesión activa. Iniciando descarga de datos...");
          await downloadDataFromServer();
          await processSyncQueue();

          setSyncTimestamp(Date.now());
          console.log("APP: Sincronización completa.");

        } else {
          setUserRole(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("APP: Error en inicialización", error);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

  useEffect(() => {
    if (session) {
      window.addEventListener('online', processSyncQueue);
    }
    return () => {
      window.removeEventListener('online', processSyncQueue);
    };
  }, [session]);


  const handleLogout = async () => await supabase.auth.signOut();
  
  const handleTransactionSuccess = () => setSyncTimestamp(Date.now());

  // 3. RENDERIZADO CONDICIONAL ACTUALIZADO
  
  // Si está cargando la sesión O los proyectos, mostramos carga
  if (loading || loadingProjects) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4 text-blue-500 animate-pulse">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-sm">Cargando Sistema...</p>
      </div>
    );
  }

  // Si no hay sesión, mostramos Login
  if (!session) return <Login />;
  
  // 4. SI HAY SESIÓN PERO NO HAY PROYECTO SELECCIONADO -> SELECTOR
  if (!currentProject) {
      return <ProjectSelector />;
  }

  // SI HAY SESIÓN Y HAY PROYECTO -> LA APP NORMAL
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      
      {/* HEADER */}
      <header className="px-4 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-20 flex justify-between items-center shadow-lg shadow-black/20">
        
        {/* LADO IZQUIERDO: Logo y Selector de Proyecto */}
        <div className="flex flex-col items-start justify-center">
          <h1 className="text-xl font-bold tracking-tighter text-white leading-none mb-1">
            Site<span className="text-blue-500">Manager</span>
          </h1>
          
          <span className="text-[10px] text-slate-500 font-mono tracking-wide">{session.user.email}</span>
          {/* Botón interactivo para cambiar proyecto */}
          <button 
            onClick={handleSwitchProject}
            className="flex items-center gap-1.5 text-[10px] bg-slate-800 hover:bg-blue-900/30 text-blue-200 px-2 py-1 rounded border border-slate-700 hover:border-blue-500/50 transition-all w-fit group"
            title={`Usuario: ${session?.user?.email} - Click para cambiar obra`}
          >
            <span className="truncate max-w-[150px] font-medium">
              {currentProject?.name || "Seleccionar Obra"}
            </span>
            <ArrowRightLeft size={10} className="text-slate-500 group-hover:text-blue-400" />
          </button>
        </div>

        {/* LADO DERECHO: Pendientes, Tema y Logout */}
        <div className="flex items-center gap-3">
          
          {/* ===> BOTÓN DE CAMBIO DE TEMA <=== */}
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-200 border ${
              theme === 'light' 
                ? 'bg-yellow-100 text-yellow-600 border-yellow-300 hover:bg-yellow-200' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-yellow-400 hover:border-yellow-500/30'
            }`}
            title={theme === 'light' ? "Cambiar a Modo Oficina" : "Cambiar a Modo Obra"}
          >
            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {(pendingCount ?? 0) > 0 && (
            <div 
              className="text-orange-400 text-xs font-bold animate-pulse flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-full border border-orange-500/20"
              title={`${pendingCount} transacciones pendientes`}
            >
              <PackagePlus size={14} /> {pendingCount}
            </div>
          )}
          
          <button 
            onClick={handleLogout} 
            className="bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-slate-800 transition-all duration-200"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="pb-24">
        {currentTab === 'BODEGA' && <InventoryList key={syncTimestamp} />}
        
        {currentTab === 'HISTORIAL' && <ActivityLog key={syncTimestamp} />} 
        
        {currentTab === 'ADMIN' && userRole === 'admin' && (
          <AdminPanel onPrintClick={() => setIsPrintingLabels(true)} />
        )}
        
        {currentTab === 'DASHBOARD' && userRole === 'admin' && <DashboardPanel />}
        
        {currentTab === 'TAREO' && (userRole === 'admin' || userRole === 'bodeguero') && <AttendancePanel />}

        {currentTab === 'PEDIDOS' && <RequisitionsPanel />}

        {currentTab === 'HERRAMIENTAS' && <ToolsPanel />}

        {currentTab === 'BITACORA' && <SiteLogPanel />}
      </main>

      {/* MODALES */}
      {isPrintingLabels && <PrintLabels onClose={() => setIsPrintingLabels(false)} />}
      
      {/* FAB (Botón flotante) */}
      <TransactionFab onUpdate={handleTransactionSuccess} />
      
      <Toaster 
        position="top-center" 
        richColors 
        theme={theme} 
        closeButton
        style={{
          fontFamily: 'inherit' // Para que use tu fuente Inter/Sans
        }}
      />

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 z-40 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2 no-scrollbar">
          <>
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
          <NavButton 
            active={currentTab === 'PEDIDOS'} 
            onClick={() => setCurrentTab('PEDIDOS')} 
            icon={Truck} 
            label="Pedidos" 
          />

          <NavButton 
            active={currentTab === 'HERRAMIENTAS'} 
            onClick={() => setCurrentTab('HERRAMIENTAS')} 
            icon={Hammer} 
            label="Herramientas" 
          />

          <NavButton 
            active={currentTab === 'BITACORA'} 
            onClick={() => setCurrentTab('BITACORA')} 
            icon={BookOpen} 
            label="Bitácora" 
          />

          </>

          { (userRole === 'admin' || userRole === 'bodeguero') && (
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

function NavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-[64px] ${
        active ? 'text-blue-500 bg-blue-500/5 translate-y-0.5' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[9px] font-bold ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
    </button>
  )
}