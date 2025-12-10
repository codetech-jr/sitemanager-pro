// src/App.tsx

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { processSyncQueue, downloadDataFromServer } from './lib/syncManager';

import Login from './components/Login';
import InventoryList from './components/InventoryList';
import ActivityLog from './components/ActivityLog';
import AdminPanel from './components/AdminPanel';
import TransactionFab from './components/TransactionFab';
import { LayoutDashboard, History, Settings, LogOut, PackagePlus } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentTab, setCurrentTab] = useState<'BODEGA' | 'HISTORIAL' | 'ADMIN'>('BODEGA');
  const [, setGlobalRefresh] = useState(0);

  const pendingCount = useLiveQuery(() => db.pending_transactions.count(), []);

  // ====> Hook 1: Maneja SÓLO la autenticación <====
  useEffect(() => {
    // Definimos una función asíncrona interna para manejar la lógica
    const initAuth = async () => {
      try {
        // 1. Obtenemos la sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        setSession(session);

        if (session) {
          // 2. Si hay sesión, buscamos el rol de forma segura
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error al obtener perfil:', profileError);
            // Si falla el perfil, asignamos rol por defecto para no romper la app
            setUserRole('bodeguero'); 
          } else {
            setUserRole(profile?.role || 'bodeguero');
          }
        }
      } catch (error) {
        console.error('Error crítico iniciando sesión:', error);
        // Opcional: Cerrar sesión si hubo un error grave para obligar al re-login
        // await supabase.auth.signOut(); 
      } finally {
        // ===> ESTA ES LA CLAVE <===
        // El finally se ejecuta SIEMPRE, haya éxito o error.
        // Esto quita la pantalla de "Verificando Credenciales..."
        setLoading(false); 
      }
    };

    // Ejecutamos la función
    initAuth();

    // Listener de cambios de auth (Login/Logout futuro)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        // Podrías reutilizar la lógica de fetch profile aquí también si fuera necesario
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        setUserRole(profile?.role || 'bodeguero');
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ====> Hook 2: Maneja SÓLO la sincronización de datos <====
  // Este hook se dispara DESPUÉS de que la sesión se haya establecido.
  useEffect(() => {
    if (session) {
      downloadDataFromServer();
      window.addEventListener('online', processSyncQueue);
    }
    return () => {
      window.removeEventListener('online', processSyncQueue);
    };
  }, [session]); // Depende explícitamente de que 'session' cambie de null a un valor


  const handleLogout = async () => await supabase.auth.signOut();
  const handleTransactionSuccess = () => setGlobalRefresh(s => s + 1);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 animate-pulse">Verificando Credenciales...</div>;
  }
  if (!session) return <Login />;
  
  // (El resto del código JSX es idéntico)
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <header className="px-4 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-white">SiteManager</h1>
          <p className="text-[10px] text-slate-500 font-mono">{session.user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          {(pendingCount ?? 0) > 0 && (
            <div className="text-orange-400 text-xs font-bold animate-pulse flex items-center gap-1" title={`${pendingCount} transacciones pendientes`}>
              <PackagePlus size={14} /> {pendingCount}
            </div>
          )}
          <button onClick={handleLogout} className="bg-slate-900 p-2 rounded-lg text-slate-400 hover:text-red-400" title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="pb-24">
        {currentTab === 'BODEGA' && <InventoryList />}
        {currentTab === 'HISTORIAL' && <ActivityLog />}
        {currentTab === 'ADMIN' && userRole === 'admin' && <AdminPanel />}
      </main>
      <TransactionFab onUpdate={handleTransactionSuccess} />
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 z-40">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          <button onClick={() => setCurrentTab('BODEGA')} className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'BODEGA' ? 'text-blue-500' : 'text-slate-500'}`}>
            <LayoutDashboard size={24} strokeWidth={currentTab === 'BODEGA' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Bodega</span>
          </button>
          <button onClick={() => setCurrentTab('HISTORIAL')} className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'HISTORIAL' ? 'text-blue-500' : 'text-slate-500'}`}>
            <History size={24} strokeWidth={currentTab === 'HISTORIAL' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Historial</span>
          </button>
          {userRole === 'admin' && (
            <button onClick={() => setCurrentTab('ADMIN')} className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'ADMIN' ? 'text-blue-500' : 'text-slate-500'}`}>
              <Settings size={24} strokeWidth={currentTab === 'ADMIN' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}