// src/components/TeamManagementPanel.tsx

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { type IEmployee } from '../lib/db'; 
import { Edit, UserPlus, UserX, Loader2, HardHat } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Sonner
import { useProject } from '../lib/ProjectContext'; // <--- Importar Contexto
import EmployeeFormModal from './EmployeeFormModal';

export default function TeamManagementPanel() {
  const { currentProject } = useProject(); // Obtener proyecto actual
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<IEmployee | null>(null);

  const fetchEmployees = useCallback(async () => {
    // Si no hay proyecto seleccionado, no cargamos nada (o podríamos cargar todo si es admin global)
    if (!currentProject) return;

    setLoading(true);
    try {
      // 1. Obtenemos datos de Supabase filtrados por proyecto y solo activos
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('project_id', currentProject.id) // <--- FILTRO CLAVE
        .eq('is_active', true) // Solo activos por defecto
        .order('full_name', { ascending: true });
        
      if (error) throw error;

      if (data) {
        setEmployees(data as IEmployee[]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cargar empleados: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  // Cargar datos al montar o cambiar de proyecto
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddNew = () => {
    if (!currentProject) {
        toast.error("Debes seleccionar un proyecto primero.");
        return;
    }
    setEditingEmployee(null); 
    setIsModalOpen(true);
  };

  const handleEdit = (employee: IEmployee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (employeeId: string, employeeName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres desactivar a ${employeeName}?`)) {
      const toastId = toast.loading("Desactivando empleado...");
      try {
        const { error } = await supabase
            .from('employees')
            .update({ is_active: false })
            .eq('id', employeeId);
        
        if (error) throw error;

        toast.success(`${employeeName} desactivado correctamente`, { id: toastId });
        fetchEmployees(); // Recargar lista
      } catch (error: any) {
        toast.error("Error al desactivar: " + error.message, { id: toastId });
      }
    }
  };

  if (!currentProject) {
      return (
          <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-2">
              <HardHat size={32} className="opacity-50"/>
              <p>Selecciona una obra para gestionar el personal.</p>
          </div>
      );
  }

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* HEADER con el botón de Añadir */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <HardHat className="text-blue-500"/> Personal en Obra
            </h3>
            <p className="text-sm text-slate-400 mt-1">Proyecto: <span className="text-blue-400 font-semibold">{currentProject.name}</span></p>
        </div>
        
        <button 
          onClick={handleAddNew} 
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
        >
          <UserPlus size={18} /> 
          <span className="hidden sm:inline">Añadir Nuevo Empleado</span>
          <span className="sm:hidden">Nuevo Empleado</span>
        </button>
      </div>

      {/* TABLA DE EMPLEADOS */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
        {employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">
            No hay empleados activos registrados en este proyecto.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase tracking-wider">
                <tr>
                    <th className="p-4">Nombre Completo</th>
                    <th className="p-4 hidden sm:table-cell">Rol</th>
                    <th className="p-4 hidden md:table-cell">Cédula / DNI</th>
                    <th className="p-4 text-right">Tarifa Diaria</th>
                    <th className="p-4 text-center">Acciones</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-800/80 transition-colors group">
                    <td className="p-4 font-bold text-white">
                        {emp.full_name}
                        <div className="sm:hidden text-xs text-slate-500 mt-0.5">{emp.role}</div>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-slate-300 capitalize text-sm">
                        <span className="bg-slate-700/50 px-2 py-1 rounded border border-slate-600/50">{emp.role}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell font-mono text-xs text-slate-400">{emp.dni || '---'}</td>
                    <td className="p-4 text-right font-mono text-emerald-400 font-medium">${emp.daily_rate?.toFixed(2) ?? '0.00'}</td>
                    <td className="p-4 flex items-center justify-center gap-2">
                        <button 
                            onClick={() => handleEdit(emp)} 
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Editar"
                        >
                        <Edit size={18}/>
                        </button>
                        <button 
                            onClick={() => handleDeactivate(emp.id, emp.full_name)} 
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Desactivar"
                        >
                        <UserX size={18}/>
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        )}
      </div>

      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchEmployees}
        employeeToEdit={editingEmployee} 
      />
    </div>
  );
}