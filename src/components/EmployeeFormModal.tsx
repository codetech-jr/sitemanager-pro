// src/components/EmployeeFormModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { IEmployee } from '../lib/db'; 
import Modal from './Modal';
import { Loader2, Save, User, Briefcase, CreditCard } from 'lucide-react';
import { useProject } from '../lib/ProjectContext';
import { toast } from 'sonner'; // <--- Importar Sonner

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  employeeToEdit: IEmployee | null;
}

export default function EmployeeFormModal({ isOpen, onClose, onSave, employeeToEdit }: Props) {
  const { currentProject } = useProject();

  const [formData, setFormData] = useState({ 
    full_name: '', 
    role: '', 
    dni: '', 
    daily_rate: 0, 
    project_id: '' 
  });
  
  const [loading, setLoading] = useState(false);

  // Efecto para inicializar el formulario cuando se abre el modal o cambia el empleado a editar
  useEffect(() => {
    if (isOpen) { 
        if (employeeToEdit) {
            setFormData({
                full_name: employeeToEdit.full_name,
                role: employeeToEdit.role || '',
                dni: employeeToEdit.dni || '',
                daily_rate: (employeeToEdit as any).daily_rate || 0,
                project_id: (employeeToEdit as any).project_id || currentProject?.id || '',
            });
        } else {
            setFormData({ 
                full_name: '', 
                role: '', 
                dni: '', 
                daily_rate: 0,
                project_id: currentProject?.id || '' 
            });
        }
    }
  }, [isOpen, employeeToEdit, currentProject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'number' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.project_id && !employeeToEdit) {
          toast.error("Error: No hay un proyecto seleccionado asociado.");
          return;
      }

      setLoading(true);
      const toastId = toast.loading(employeeToEdit ? "Actualizando empleado..." : "Creando empleado...");

      try {
        const { error } = employeeToEdit
            ? await supabase.from('employees').update(formData).eq('id', employeeToEdit.id)
            : await supabase.from('employees').insert([formData]);

        if (error) throw error;

        toast.success(employeeToEdit ? "Empleado actualizado" : "Empleado creado exitosamente", { id: toastId });
        onSave();
        onClose();
      } catch (error: any) {
        console.error(error);
        toast.error("Error al guardar: " + error.message, { id: toastId });
      } finally {
        setLoading(false);
      }
  };

  // Clases utilitarias
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";
  const inputContainerClass = "relative group";
  const iconClass = "absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors h-5 w-5";
  const inputClass = "w-full bg-slate-900/80 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-700/50 focus:border-blue-500 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-slate-600 shadow-inner";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={employeeToEdit ? 'Editar Empleado' : 'Añadir Nuevo Empleado'}>
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        
        {/* Nombre Completo */}
        <div>
          <label className={labelClass} htmlFor="full_name">Nombre Completo</label>
          <div className={inputContainerClass}>
             <User className={iconClass} />
             <input 
                id="full_name"
                name="full_name" 
                value={formData.full_name} 
                onChange={handleChange} 
                required 
                placeholder="Ej. Juan Pérez"
                className={inputClass} 
             />
          </div>
        </div>

        {/* Grid de 2 Columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Cédula */}
            <div>
              <label className={labelClass} htmlFor="dni">Cédula / DNI</label>
              <div className={inputContainerClass}>
                <CreditCard className={iconClass} />
                <input 
                    id="dni"
                    name="dni" 
                    value={formData.dni} 
                    onChange={handleChange} 
                    placeholder="12.345.678"
                    className={inputClass} 
                />
              </div>
            </div>

            {/* Cargo */}
            <div>
              <label className={labelClass} htmlFor="role">Cargo / Rol</label>
              <div className={inputContainerClass}>
                <Briefcase className={iconClass} />
                <input 
                    id="role"
                    name="role" 
                    value={formData.role} 
                    onChange={handleChange} 
                    placeholder="Ej. Electricista"
                    className={inputClass} 
                />
              </div>
            </div>
        </div>

        {/* Tarifa con Simbolo de Moneda */}
        <div>
          <label className={labelClass} htmlFor="daily_rate">Tarifa por Día</label>
          <div className="relative group">
            <span className="absolute left-4 top-3 text-slate-500 group-focus-within:text-green-400 transition-colors font-bold text-lg">$</span>
            <input 
                id="daily_rate"
                type="number" 
                step="0.01" 
                name="daily_rate" 
                value={formData.daily_rate || ''} 
                onChange={handleChange} 
                placeholder="0.00"
                className="w-full bg-slate-900/80 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-700/50 focus:border-green-500 focus:bg-slate-900 focus:ring-4 focus:ring-green-500/10 outline-none transition-all placeholder-slate-600 shadow-inner font-mono tracking-wide" 
            />
          </div>
        </div>
        
        {/* Botones de Acción */}
        <div className="pt-6 mt-4 border-t border-slate-700/50 flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm font-semibold"
            >
                Cancelar
            </button>

            <button 
                type="submit" 
                disabled={loading} 
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2 rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2 transform transition active:scale-95"
            >
               {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save size={18}/>}
               {employeeToEdit ? 'Actualizar' : 'Guardar Empleado'}
            </button>
        </div>
      </form>
    </Modal>
  );
}