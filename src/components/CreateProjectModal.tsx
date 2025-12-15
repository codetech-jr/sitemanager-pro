// src/components/CreateProjectModal.tsx

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Building2, MapPin, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    const toastId = toast.loading("Creando nueva obra..."); // Feedback inmediato

    try {
      // Llamamos a la función segura que creamos en SQL
      const { error } = await supabase.rpc('create_new_project', {
        p_name: name,
        p_location: location
      });

      if (error) throw error;

      toast.success("Obra creada exitosamente", { id: toastId });
      setName('');
      setLocation('');
      onSuccess(); // Recargar la lista
      onClose();

    } catch (error: any) {
      console.error(error);
      toast.error("Error al crear obra: " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Clases comunes para inputs
  const inputClass = "w-full bg-slate-900/80 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700/50 focus:border-blue-500 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-slate-600 shadow-inner";
  const iconClass = "absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors h-5 w-5";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Building2 className="text-blue-500" size={20}/> Nueva Obra
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Nombre */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nombre del Proyecto</label>
            <div className="relative group">
              <Building2 className={iconClass} />
              <input 
                required
                autoFocus
                placeholder="Ej: Residencial Los Olivos"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Ubicación / Descripción</label>
            <div className="relative group">
              <MapPin className={iconClass} />
              <input 
                placeholder="Ej: Av. Principal #123, Fase 1"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Botón de Acción */}
          <div className="pt-4">
            <button 
                disabled={loading}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <Save size={18}/>}
                Crear Obra
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}