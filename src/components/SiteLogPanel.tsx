// src/components/SiteLogPanel.tsx

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useProject } from '../lib/ProjectContext';
import { supabase } from '../lib/supabaseClient';
import { Send, AlertTriangle, CloudSun, CheckSquare, MessageSquare, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner

export default function SiteLogPanel() {
  const { currentProject } = useProject();
  const [newLog, setNewLog] = useState('');
  const [category, setCategory] = useState<'NOTE'|'PROGRESS'|'INCIDENT'|'WEATHER'>('NOTE');
  const [loading, setLoading] = useState(false);

  // Leer logs locales filtrados por proyecto
  const logs = useLiveQuery(() => 
    currentProject 
      ? db.site_logs.where('project_id').equals(currentProject.id).reverse().sortBy('created_at')
      : [], 
  [currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.trim() || !currentProject) return;
    
    setLoading(true);
    // No mostramos toast de carga aquí para que se sienta más instantáneo como un chat,
    // pero manejamos el error si ocurre.

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // 1. Insertar en Supabase
        const { data, error } = await supabase.from('site_logs').insert({
            project_id: currentProject.id,
            user_id: user?.id,
            category,
            content: newLog
        }).select().single();

        if (error) throw error;

        // 2. Actualizar localmente rápido (Optimistic UI)
        // Obtenemos el nombre del usuario para guardarlo en local
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user?.id)
            .single();
        
        await db.site_logs.add({
            ...data,
            author_name: profile?.full_name || 'Yo'
        });

        toast.success("Bitácora actualizada");
        setNewLog('');
        setCategory('NOTE'); // Reset a nota general por defecto

    } catch (err: any) {
        console.error(err);
        toast.error("Error al publicar: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const getIcon = (cat: string) => {
      switch(cat) {
          case 'INCIDENT': return <AlertTriangle size={18} className="text-red-500"/>;
          case 'WEATHER': return <CloudSun size={18} className="text-yellow-500"/>;
          case 'PROGRESS': return <CheckSquare size={18} className="text-emerald-500"/>;
          default: return <MessageSquare size={18} className="text-blue-500"/>;
      }
  };

  const getBorderColor = (cat: string) => {
    switch(cat) {
        case 'INCIDENT': return 'border-l-4 border-l-red-500 bg-red-900/10'; // Fondo sutil para incidentes
        case 'WEATHER': return 'border-l-4 border-l-yellow-500';
        case 'PROGRESS': return 'border-l-4 border-l-emerald-500';
        default: return 'border-l-4 border-l-blue-500';
    }
  };

  if (!currentProject) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="text-blue-500" size={24} />
        <h2 className="text-2xl font-bold text-white">Bitácora de Obra</h2>
      </div>

      {/* INPUT AREA */}
      <form onSubmit={handleSubmit} className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-8 shadow-lg relative">
          <textarea 
            className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 outline-none resize-none h-24 transition-colors placeholder-slate-500"
            placeholder={`¿Qué está pasando hoy en ${currentProject.name}?`}
            value={newLog}
            onChange={e => setNewLog(e.target.value)}
            disabled={loading}
          />
          
          <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-3">
              {/* Selector de Categoría */}
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  <button type="button" onClick={()=>setCategory('NOTE')} className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${category==='NOTE'?'bg-blue-600 text-white':'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} title="Nota General">
                    <MessageSquare size={18}/> <span className="sm:hidden">Nota</span>
                  </button>
                  <button type="button" onClick={()=>setCategory('PROGRESS')} className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${category==='PROGRESS'?'bg-emerald-600 text-white':'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} title="Reporte de Avance">
                    <CheckSquare size={18}/> <span className="sm:hidden">Avance</span>
                  </button>
                  <button type="button" onClick={()=>setCategory('WEATHER')} className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${category==='WEATHER'?'bg-yellow-600 text-white':'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} title="Condiciones Climáticas">
                    <CloudSun size={18}/> <span className="sm:hidden">Clima</span>
                  </button>
                  <button type="button" onClick={()=>setCategory('INCIDENT')} className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${category==='INCIDENT'?'bg-red-600 text-white':'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} title="Reportar Incidente">
                    <AlertTriangle size={18}/> <span className="sm:hidden">Incidente</span>
                  </button>
              </div>

              <button 
                disabled={loading || !newLog.trim()} 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
              >
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} 
                  Publicar
              </button>
          </div>
      </form>

      {/* FEED DE LOGS */}
      <div className="space-y-4 pb-20">
          {logs?.map(log => (
              <div key={log.id} className={`bg-slate-800 p-4 rounded-r-xl rounded-l-sm border border-slate-700 shadow-sm ${getBorderColor(log.category)}`}>
                  <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2.5">
                          {getIcon(log.category)}
                          <span className="font-bold text-slate-200 text-sm">{log.author_name}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                            {log.category === 'NOTE' ? 'Nota' : log.category === 'PROGRESS' ? 'Avance' : log.category === 'WEATHER' ? 'Clima' : 'Incidente'}
                          </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-7">{log.content}</p>
              </div>
          ))}
          
          {logs?.length === 0 && (
            <div className="text-center py-12 opacity-50 flex flex-col items-center gap-2">
                <BookOpen size={48} className="text-slate-600 mb-2"/>
                <p className="text-slate-400 text-lg font-medium">Bitácora vacía</p>
                <p className="text-slate-500 text-sm">Sé el primero en registrar un evento hoy.</p>
            </div>
          )}
      </div>
    </div>
  );
}