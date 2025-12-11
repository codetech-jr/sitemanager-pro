// src/components/AdminPanel.tsx

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// --- IMPORTAMOS LOS PANELES ---
import PayrollPanel from "./PayrollPanel";
import TeamManagementPanel from "./TeamManagementPanel";
import CatalogManagementPanel from "./CatalogManagementPanel"; // <--- Nuevo Panel

// --- ICONOS ---
import { Users, FileText, ShieldCheck, UserPlus, Loader2, QrCode, Package } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'bodeguero';
  user_email: string; 
}

export default function AdminPanel({ onPrintClick }: { onPrintClick: () => void }) {
  // --- ESTADO DE NAVEGACIÓN (TEAM | PAYROLL | CATALOG) ---
  const [activeTab, setActiveTab] = useState<'TEAM' | 'PAYROLL' | 'CATALOG'>('TEAM');

  // --- ESTADO DE LÓGICA DE USUARIOS ---
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // --- EFECTOS (Carga de datos de perfiles admin/bodegueros) ---
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`id, full_name, role, email`);

        if (error) {
          console.error("Error fetching profiles:", error);
        } else if (data) {
          const formattedData = data.map((p: any) => ({
            ...p,
            user_email: p.email 
          }));
          setProfiles(formattedData);
        }
      } catch (err) {
        console.error("Error general:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, []);

  // --- HANDLERS (Invitar usuario) ---
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: inviteEmail }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al invitar usuario');

      alert(`Invitación enviada a ${inviteEmail}.`);
      setInviteEmail('');
    } catch (error: any) {
      alert("Error al invitar usuario: " + error.message);
    } finally {
      setIsInviting(false);
    }
  };

  // Loader inicial
  if (loading) return (
    <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p>Cargando panel de administración...</p>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-in fade-in">
      
      {/* --- ENCABEZADO --- */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
          <ShieldCheck className="text-blue-500" /> Panel de Control
        </h2>

        {/* --- NAVEGACIÓN (TABS) --- */}
        <div className="flex flex-wrap items-center border-b border-slate-700">
          <TabButton 
            isActive={activeTab === 'TEAM'} 
            onClick={() => setActiveTab('TEAM')} 
            icon={Users} 
            label="Personal y Accesos" 
          />
          <TabButton 
            isActive={activeTab === 'CATALOG'} 
            onClick={() => setActiveTab('CATALOG')} 
            icon={Package} 
            label="Gestión de Catálogo" 
          />
          <TabButton 
            isActive={activeTab === 'PAYROLL'} 
            onClick={() => setActiveTab('PAYROLL')} 
            icon={FileText} 
            label="Nómina y Pagos" 
          />
        </div>
      </div>

      {/* --- ÁREA DE CONTENIDO --- */}
      <div className="min-h-[400px]">
        
        {/* ======================================= */}
        {/* PESTAÑA 1: GESTIONAR EQUIPO Y PERFILES  */}
        {/* ======================================= */}
        {activeTab === 'TEAM' && (
          <div className="space-y-8 animate-in slide-in-from-left-4 fade-in duration-300">
            
            {/* SECCIÓN SUPERIOR: CONTROL DE USUARIOS SISTEMA */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* COLUMNA IZQ: ACIONES RÁPIDAS */}
              <div className="md:col-span-1 space-y-6">
                
                {/* 1. Invitar */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                    <UserPlus size={18} className="text-blue-400"/> Invitar Admin/Bodeguero
                  </h3>
                  <form onSubmit={handleInvite} className="flex flex-col gap-3">
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-600 focus:border-blue-500 outline-none text-sm"
                    />
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      {isInviting ? <Loader2 className="animate-spin" size={16}/> : 'Enviar Invitación'}
                    </button>
                  </form>
                </div>

                {/* 2. QR */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                     <QrCode size={18} className="text-emerald-400"/> Herramientas Bodega
                  </h3>
                  <p className="text-slate-400 text-xs mb-4">Imprimir hoja de códigos QR para productos.</p>
                  <button
                    onClick={onPrintClick}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 hover:text-white text-slate-200 font-bold py-3 rounded-lg transition-all text-sm border border-slate-600"
                  >
                    <QrCode size={16} /> Imprimir Etiquetas
                  </button>
                </div>
              </div>

              {/* COLUMNA DER: LISTA DE USUARIOS */}
              <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-xl shadow-lg flex flex-col h-full max-h-[450px]">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-xl">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Users size={20} className="text-indigo-400"/> Usuarios con Acceso al Sistema
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {profiles.length === 0 ? (
                     <div className="text-center p-8 text-slate-500">No se encontraron usuarios.</div>
                  ) : (
                    profiles.map(profile => (
                      <div key={profile.id} className="p-3 flex justify-between items-center hover:bg-slate-700/30 rounded-lg transition-colors mb-1 border border-transparent hover:border-slate-700">
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                           </div>
                           <div>
                              <p className="font-semibold text-slate-200 text-sm">{profile.user_email}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{profile.full_name || 'Nombre no config.'}</p>
                           </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          profile.role === 'admin' 
                            ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' 
                            : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                        }`}>
                          {profile.role}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-700" />

            {/* SECCIÓN INFERIOR: GESTIÓN DE EMPLEADOS (WORKERS) */}
            <div className="mt-8">
               <TeamManagementPanel /> 
            </div>

          </div>
        )}


        {/* ======================================= */}
        {/* PESTAÑA 2: GESTIÓN DE CATÁLOGO          */}
        {/* ======================================= */}
        {activeTab === 'CATALOG' && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              <CatalogManagementPanel />
            </div>
         )}


        {/* ======================================= */}
        {/* PESTAÑA 3: NÓMINA                       */}
        {/* ======================================= */}
        {activeTab === 'PAYROLL' && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
             <PayrollPanel />
          </div>
        )}

      </div>
    </div>
  );
}

// --- Componente Auxiliar para los botones de Tabs ---
function TabButton({ isActive, onClick, icon: Icon, label }: { isActive: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 outline-none ${
        isActive
          ? 'border-blue-500 text-white bg-slate-800/40 rounded-t-lg'
          : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/20'
      }`}
    >
      <Icon size={18} /> 
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}