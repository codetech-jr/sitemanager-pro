// src/components/AttendancePanel.tsx

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { UserCheck, LogIn, LogOut, Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import type { IAttendanceLog } from '../lib/db';

export default function AttendancePanel() {
  const today = new Date().toISOString().split('T')[0];
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // === LECTURA DE DATOS LOCALES CON DEXIE ===
  const allEmployees = useLiveQuery(() => db.employees.toArray(), []);
  const employees = allEmployees?.filter(e => e.is_active);
  const attendanceToday = useLiveQuery(() => db.attendance_log.where({ work_date: today }).toArray(), []) as IAttendanceLog[] | undefined;

  // Función para capturar GPS (a prueba de fallos)
  const getCurrentPosition = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve('GPS no disponible');
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
        () => resolve('Permiso de GPS denegado'),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };
  
  const handleCheckIn = async (employeeId: string) => {
    setLoadingId(employeeId);
    const gps = await getCurrentPosition();
    
    const { data, error } = await supabase.from('attendance_log').insert({
      employee_id: employeeId,
      check_in_gps: gps,
      work_date: today
    }).select().single();
    
    if (error) {
      alert("Error registrando entrada: " + error.message);
    } else if (data) {
      await db.attendance_log.add({
         id: data.id,
         employee_id: data.employee_id,
         check_in_time: data.check_in_time,
         check_out_time: null,
         check_in_gps: data.check_in_gps,
         check_out_gps: null,
         work_date: data.work_date,
      });
    }
    setLoadingId(null);
  };

  const handleCheckOut = async (employeeId: string) => {
    const record = attendanceToday?.find(a => a.employee_id === employeeId && !a.check_out_time);
    if (!record) return;

    setLoadingId(employeeId);
    const gps = await getCurrentPosition();
    
    const { data, error } = await supabase
      .from('attendance_log')
      .update({ check_out_time: new Date().toISOString(), check_out_gps: gps })
      .eq('id', record.id)
      .select()
      .single();

    if (error) {
        alert("Error registrando salida: " + error.message);
    } else if (data) {
        await db.attendance_log.update(record.id, {
            check_out_time: data.check_out_time,
            check_out_gps: data.check_out_gps,
        });
    }
    setLoadingId(null);
  };

  if (!allEmployees || !attendanceToday) {
    return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCheck className="text-blue-500" /> Control de Asistencia
        </h2>
        <div className="text-sm font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>
      
      <div className="space-y-3">
        {(!employees || employees.length === 0) && <p className="text-center italic text-slate-500 p-8">No hay empleados cargados en la base de datos local.</p>}
        {employees?.map(employee => {
          const record = attendanceToday.find(a => a.employee_id === employee.id);
          const hasCheckedIn = !!record;
          const hasCheckedOut = hasCheckedIn && !!record.check_out_time;
          const isLoading = loadingId === employee.id;
          
          return (
            <div key={employee.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white text-lg">{employee.full_name}</p>
                <p className="text-xs text-slate-400 font-medium">{employee.role}</p>
                {hasCheckedIn && record.check_in_gps && (
                  <div className="text-xs text-slate-400 font-mono mt-2 flex items-center gap-1.5">
                     <MapPin size={12} className="text-emerald-500"/> Entrada: {record.check_in_gps}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isLoading && <Loader2 className="animate-spin text-white w-full sm:w-auto flex-1"/>}
                
                {!hasCheckedIn && !isLoading && (
                  <button onClick={() => handleCheckIn(employee.id)} className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-lg flex items-center gap-2 transition active:scale-95">
                     <LogIn size={16}/> REGISTRAR ENTRADA
                  </button>
                )}
                
                {hasCheckedIn && !hasCheckedOut && !isLoading && (
                  <button onClick={() => handleCheckOut(employee.id)} className="w-full justify-center bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-3 rounded-lg flex items-center gap-2 transition active:scale-95">
                     <LogOut size={16}/> REGISTRAR SALIDA
                  </button>
                )}
                
                {hasCheckedOut && (
                  <span className="w-full text-center text-sm font-bold text-emerald-400 bg-emerald-900/50 px-3 py-2 rounded-lg flex items-center gap-2 justify-center">
                    <CheckCircle2 size={16}/> Jornada Completa
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}