import { useState } from 'react';
import { Building2, ChevronRight, LogOut, Plus } from 'lucide-react';
import { useProject } from '../lib/ProjectContext';
import { supabase } from '../lib/supabaseClient';
import CreateProjectModal from './CreateProjectModal';

export default function ProjectSelector() {
  const { projectsList, selectProject } = useProject();
  
  // Estado para controlar la visibilidad del modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Función para recargar la lista después de crear un proyecto
  const handleProjectCreated = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-500 mb-4">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Selecciona una Obra</h1>
          <p className="text-slate-400 mt-2">Tienes acceso a {projectsList.length} proyectos activos</p>
        </div>

        {/* Contenedor con scroll para la lista + el botón de crear */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {projectsList.map((project) => (
            <button
              key={project.id}
              onClick={() => selectProject(project)}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white font-bold">
                  {project.name.charAt(0)}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{project.name}</h3>
                  <p className="text-xs text-slate-500">ID: ...{project.id.slice(-4)}</p>
                </div>
              </div>
              <ChevronRight className="text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </button>
          ))}

          {/* Botón para abrir el Modal de Crear Obra */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full border-2 border-dashed border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 p-4 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-blue-400 transition-all font-bold group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform"/> Crear Nueva Obra
          </button>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-8 w-full py-3 text-slate-500 hover:text-red-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>

      {/* Componente Modal */}
      <CreateProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}