// src/components/TeamManagementPanel.tsx

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { type IEmployee } from '../lib/db'; // Importamos db para sincronizar si es necesario
import { Edit, UserPlus, UserX, Loader2 } from 'lucide-react';
import EmployeeFormModal from './EmployeeFormModal';

export default function TeamManagementPanel() {
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<IEmployee | null>(null);

  // ====> LA FUNCIÓN CORRECTA PARA REFRESCAR LA LISTA <====
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Obtenemos datos de Supabase (Fuente de verdad)
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });
        
      if (error) {
        console.error("Error cargando empleados:", error);
      }

      if (data) {
        // 2. Actualizamos el estado local
        setEmployees(data as IEmployee[]);

        // 3. (Opcional pero recomendado) Actualizamos Dexie para uso offline en otras partes
        // await db.employees.clear(); 
        // await db.employees.bulkPut(data as IEmployee[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddNew = () => {
    setEditingEmployee(null); // Aseguramos formulario vacío
    setIsModalOpen(true);
  };

  const handleEdit = (employee: IEmployee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (employeeId: string) => {
    if (confirm("¿Estás seguro de que quieres desactivar a este empleado? No podrá registrar asistencia.")) {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', employeeId);
      
      if (error) {
        alert("Error al desactivar: " + error.message);
      } else {
        // Recargamos la lista usando la función centralizada
        fetchEmployees();
      }
    }
  };

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" /></div>;
  }

  // Filtramos visualmente los activos (o podemos traerlos filtrados desde la DB)
  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <div>
      {/* HEADER con el botón de Añadir */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Plantilla de Personal Activo</h3>
        <button 
          onClick={handleAddNew} 
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 mt-4"
        >
          <UserPlus size={16} /> Añadir Nuevo Empleado
        </button>
      </div>

      {/* TABLA DE EMPLEADOS */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {activeEmployees.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay empleados activos.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
              <tr>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4 hidden md:table-cell">Rol</th>
                <th className="p-4 hidden md:table-cell">Cédula / DNI</th>
                <th className="p-4 text-right">Tarifa Diaria</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {activeEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-800 transition-colors">
                  <td className="p-4 font-bold text-white">{emp.full_name}</td>
                  <td className="p-4 hidden md:table-cell text-slate-300 capitalize">{emp.role}</td>
                  <td className="p-4 hidden md:table-cell font-mono text-slate-400">{emp.dni}</td>
                  <td className="p-4 text-right font-mono text-emerald-400">${emp.daily_rate?.toFixed(2) ?? '0.00'}</td>
                  <td className="p-4 flex items-center gap-2">
                    <button onClick={() => handleEdit(emp)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors">
                      <Edit size={16}/>
                    </button>
                    <button onClick={() => handleDeactivate(emp.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                      <UserX size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ====> USO CORRECTO DEL MODAL SEGÚN TU SOLICITUD <==== */}
      {/* 
          1. onSave es ahora fetchEmployees (para recargar tras guardar).
          2. Usamos 'employeeToEdit' en lugar de 'employee'.
      */}
      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchEmployees}
        employeeToEdit={editingEmployee} 
      />
    </div>
  );
}