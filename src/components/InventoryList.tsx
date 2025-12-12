// src/components/EmployeeFormModal.tsx

import { useState, useEffect } from 'react';
import { type IEmployee } from '../lib/db';
import { X, User, Briefcase, Hash, DollarSign, Save, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeData: IEmployee) => Promise<void>;
  employee: IEmployee | null; // Si nos pasan un empleado, es para editar
}

const initialFormData = {
    full_name: '',
    role: '',
    dni: '',
    daily_rate: 0,
    project_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // ID de proyecto por defecto
    is_active: true,
};

export default function EmployeeFormModal({ isOpen, onClose, onSave, employee }: Props) {
  const [formData, setFormData] = useState<Omit<IEmployee, 'id'>>(initialFormData);
  const [loading, setLoading] = useState(false);

  // Cuando el modal se abre para editar, llenamos el formulario con los datos del empleado
  useEffect(() => {
    if (employee) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        full_name: employee.full_name,
        role: employee.role || '',
        dni: employee.dni || '',
        daily_rate: employee.daily_rate || 0,
        project_id: employee.project_id || initialFormData.project_id,
        is_active: employee.is_active,
      });
    } else {
      // Si es para añadir nuevo, reseteamos el formulario
      setFormData(initialFormData);
    }
  }, [employee, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave = {
        ...formData,
        id: employee?.id // Añadimos el ID si estamos editando
    };
    await onSave(dataToSave as IEmployee);
    
    setLoading(false);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* HEADER DEL MODAL */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">{employee ? 'Editar Empleado' : 'Añadir Nuevo Empleado'}</h3>
          <button onClick={onClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* FORMULARIO PROFESIONAL */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            
            {/* Campo: Nombre Completo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-300 mb-2">Nombre Completo</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required name="full_name" value={formData.full_name} onChange={handleChange} className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"/>
              </div>
            </div>

            {/* Campo: Cargo / Rol */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Cargo / Rol</label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input name="role" value={formData.role || ''} onChange={handleChange} placeholder="Ej: Obrero" className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"/>
              </div>
            </div>

            {/* Campo: Cédula / DNI */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Cédula / DNI</label>
              <div className="relative">
                <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input name="dni" value={formData.dni || ''} onChange={handleChange} placeholder="Ej: 12345678" className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"/>
              </div>
            </div>

            {/* Campo: Tarifa por Día */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-300 mb-2">Tarifa por Día ($)</label>
              <div className="relative">
                <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required type="number" step="0.01" min="0" name="daily_rate" value={formData.daily_rate} onChange={handleChange} className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"/>
              </div>
            </div>

          </div>
          
          {/* BOTÓN DE ACCIÓN */}
          <div className="mt-8 text-right">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 float-right disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={16}/>} Guardar Cambios
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}