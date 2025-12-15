import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from './supabaseClient';

export interface Project {
  id: string;
  name: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  projectsList: Project[];
  selectProject: (project: Project) => void;
  loadingProjects: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(() => {
    // Intentar recuperar del almacenamiento local al recargar
    const saved = localStorage.getItem('siteManager_currentProject');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    async function fetchUserProjects() {
      setLoadingProjects(true);
      
      // Obtenemos la sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
          setLoadingProjects(false);
          return;
      }

      // Consultamos a qué proyectos tiene acceso este usuario
      // Hacemos un JOIN con la tabla de proyectos
      const { data, error } = await supabase
        .from('project_users')
        .select('project_id, projects(id, name)')
        .eq('user_id', session.user.id);

      if (!error && data) {
        // Formateamos la data porque viene anidada
        const formattedProjects = data.map((item: any) => ({
          id: item.projects.id,
          name: item.projects.name
        }));
        setProjectsList(formattedProjects);

        // Si solo tiene un proyecto, lo seleccionamos automáticamente
        if (formattedProjects.length === 1 && !currentProject) {
            selectProject(formattedProjects[0]);
        }
      }
      setLoadingProjects(false);
    }

    fetchUserProjects();
  }, []);

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem('siteManager_currentProject', JSON.stringify(project));
    // Aquí podríamos disparar una recarga de datos si fuera necesario
    window.location.reload(); // Forzamos recarga para que Dexie y SyncManager tomen el nuevo ID
  };

  return (
    <ProjectContext.Provider value={{ currentProject, projectsList, selectProject, loadingProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

// Hook personalizado para usarlo fácil
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}