// src/lib/db.ts
import Dexie, { type Table } from "dexie";

// --- Interfaces existentes (algunas se mantienen, otras se actualizan) ---
export interface IProject {
  id: string;
  name: string;
}

export interface IMasterSku {
  supplier: string;
  price: number;
  id: string;
  sku: string;
  name: string;
  unit: string;
  min_stock_alert: number;
  description?: string | null;
}
export interface IInventoryItem {
  compound_id?: string;
  project_id: string;
  sku_id: string;
  quantity: number;
}
export interface IPendingTransaction {
  id?: number;
  payload: {
    skuId: string;
    projectId: string;
    cantidad: number;
    tipo: "SALIDA" | "ENTRADA";
    firmaDataUrl?: string;
  };
  timestamp: number;
  status: "pending" | "syncing";
}
export interface ITransactionLog {
  id: string;
  transaction_type: "SALIDA" | "ENTRADA" | "AJUSTE" | "RETORNO";
  quantity_change: number;
  created_at: string;
  sku_name: string;
  sku_unit: string;
}
export interface IUserProfile {
  id: string; // uuid
  email?: string;
  role?: string;
  created_at?: string;
}

// <--- INTERFAZ DE EMPLEADO ACTUALIZADA ---
export interface IEmployee {
  daily_rate: any;
  id: string;
  full_name: string;
  role: string | null;
  dni: string | null; // Añadido
  project_id: string | null; // Ahora puede ser nulo
  is_active: boolean;
}

// <--- INTERFAZ DE ASISTENCIA ACTUALIZADA ---
export interface IAttendanceLog {
  local_id?: number; // Es local y opcional
  id: number; // ID de Supabase
  employee_id: string;
  check_in_time: string;
  check_out_time: string | null;
  check_in_gps: string | null; // Ahora puede ser nulo
  check_out_gps: string | null; // Añadido
  work_date: string;
}


class SiteManagerDB extends Dexie {
  // --- Definición de todas las tablas ---
  projects!: Table<IProject>;
  master_sku!: Table<IMasterSku>;
  project_inventory!: Table<IInventoryItem>;
  pending_transactions!: Table<IPendingTransaction>;
  inventory_ledger!: Table<ITransactionLog>;
  user_profiles!: Table<IUserProfile>;
  employees!: Table<IEmployee, string>; 
  attendance_log!: Table<IAttendanceLog, number>;
  pending_ledger: any;


 constructor() {
    super("SiteManagerDB_v2");
    
    // --- CADENA DE MIGRACIONES CORREGIDA ---

    // Versión 4: Esquema original.
    this.version(4).stores({
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
    });

    // Versión 5: Añadimos las tablas de personal MANTENIENDO las anteriores.
    this.version(5).stores({
      // Mantenemos las tablas existentes
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      
      // Añadimos las nuevas
      employees: 'id, project_id',
      attendance_log: '++id, work_date, employee_id'
    });
    
    // Versión 6: Actualizamos el esquema de personal MANTENIENDO todo lo demás.
    this.version(6).stores({
      // Mantenemos de nuevo TODAS las tablas existentes
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      
      // Y aplicamos las correcciones al esquema de personal
      employees: 'id, project_id, is_active', 
      attendance_log: '++local_id, id, work_date, employee_id'
    });
  }
}

export const db = new SiteManagerDB();