// src/components/EmployeeFormModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { IEmployee } from '../lib/db'; 
import Modal from './Modal';
import { Loader2, Save, User, Briefcase, CreditCard,  } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  employeeToEdit: IEmployee | null;
}

export default function EmployeeFormModal({ isOpen, onClose, onSave, employeeToEdit }: Props) {
  // Inicializamos daily_rate como string vacío o numero para manejar mejor el input type="number" sin ceros molestos iniciales
  const [formData, setFormData] = useState({ full_name: '', role: '', dni: '', daily_rate: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { // Solo reseteamos cuando se abre el modal
        if (employeeToEdit) {
            setFormData({
                full_name: employeeToEdit.full_name,
                role: employeeToEdit.role || '',
                dni: employeeToEdit.dni || '',
                // Asumimos que daily_rate viene de la BD. Usamos 'any' si tu tipo no está actualizado, 
                // idealmente actualiza la interfaz IEmployee
                daily_rate: (employeeToEdit as any).daily_rate || 0, 
            });
        } else {
            setFormData({ full_name: '', role: '', dni: '', daily_rate: 0 });
        }
    }
  }, [employeeToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'number' ? parseFloat(value) || 0 : value 
    }));
  };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // La lógica de INSERT o UPDATE se queda aquí, que está bien.
        const { error } = employeeToEdit
            ? await supabase.from('employees').update(formData).eq('id', employeeToEdit.id)
            : await supabase.from('employees').insert([formData]);

        if (error) {
            alert("Error: " + error.message);
            setLoading(false); // <--- IMPORTANTE: Detener la carga si hay error
        } else {
            // ¡Éxito!
            setLoading(false);
            onSave(); // <--- Llama a la función del padre para que refresque.
            onClose(); // Cierra el modal
        }
    };

  // Clases utilitarias para limpieza del JSX
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";
  const inputContainerClass = "relative group";
  const iconClass = "absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors h-5 w-5";
  // Nota: Aquí redefinimos input-style inline para este componente específico para darle el look "Pro"
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
            {/* Cédula - Ahora a la izquierda para mejor flujo de lectura (identificación primero) */}
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
                value={formData.daily_rate || ''} // Usamos '' para que no muestre 0 al empezar a escribir si se borra
                onChange={handleChange} 
                placeholder="0.00"
                className="w-full bg-slate-900/80 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-700/50 focus:border-green-500 focus:bg-slate-900 focus:ring-4 focus:ring-green-500/10 outline-none transition-all placeholder-slate-600 shadow-inner font-mono tracking-wide" 
            />
          </div>
        </div>
        
        {/* Botones de Acción - Separador superior sutil */}
        <div className="pt-6 mt-4 border-t border-slate-700/50 flex justify-end gap-3">
            {/* Botón Cancelar (Ghost variant) */}
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm font-semibold"
            >
                Cancelar
            </button>

            {/* Botón Guardar (Solid Primary variant) */}
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