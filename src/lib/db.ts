// src/lib/db.ts
import Dexie, { type Table } from "dexie";

// --- INTERFACES DE DATOS (Actualizadas y limpias) ---

export interface IProject {
  id: string;
  name: string;
}

export interface IMasterSku {
  id: string; // UUID de Supabase
  sku: string;
  name: string;
  unit: string;
  price: number;
  supplier?: string;
  min_stock_alert?: number;
  description?: string | null;
}

// Nota: Mantenemos el nombre IInventoryItem para no romper tus otros archivos,
// pero internamente funciona como la tabla de inventario por proyecto.
export interface IInventoryItem {
  compound_id?: string; // Usado en versiones anteriores como PK
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
  sku_name?: string;
  sku_unit?: string;
}

export interface IUserProfile {
  id: string;
  email?: string;
  role?: string;
  created_at?: string;
}

export interface IEmployee {
  id: string;           // UUID Supabase
  full_name: string;
  role: string | null;
  dni: string | null;
  daily_rate: number;   // Corregido: de 'any' a 'number'
  project_id: string | null;
  is_active: boolean;
}

export interface IAttendanceLog {
  local_id?: number;    // ID Auto-incremental local (para Dexie)
  id: number;           // ID Supabase (int8)
  employee_id: string;
  work_date: string;    // YYYY-MM-DD
  check_in_time: string;
  check_out_time: string | null;
  check_in_gps: string | null;
  check_out_gps: string | null;
}

// --- CLASE DE BASE DE DATOS ---

class SiteManagerDB extends Dexie {
  // Definición de tablas con sus tipos
  projects!: Table<IProject>;
  master_sku!: Table<IMasterSku>;
  project_inventory!: Table<IInventoryItem>;
  pending_transactions!: Table<IPendingTransaction>;
  inventory_ledger!: Table<ITransactionLog>;
  user_profiles!: Table<IUserProfile>;
  employees!: Table<IEmployee, string>; 
  attendance_log!: Table<IAttendanceLog, number>;

  constructor() {
    super("SiteManagerDB_v2");
    
    // --- HISTORIAL DE MIGRACIONES ---
    // IMPORTANTE: No modificar las versiones antiguas (4, 5, 6) para evitar corrupción de datos.

    // Versión 4
    this.version(4).stores({
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
    });

    // Versión 5
    this.version(5).stores({
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      employees: 'id, project_id',
      attendance_log: '++id, work_date, employee_id'
    });
    
    // Versión 6
    this.version(6).stores({
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      employees: 'id, project_id, is_active', 
      attendance_log: '++local_id, id, work_date, employee_id'
    });

    // --- VERSIÓN 7 (LA NUEVA DEFINICIÓN FINAL) ---
    // Aquí consolidamos los índices necesarios para un rendimiento óptimo
    this.version(7).stores({
      projects: "id",
      // Añadimos índices útiles a master_sku
      master_sku: "id, sku, name", 
      
      // Mantenemos la estructura compatible de inventario
      project_inventory: "compound_id, &[project_id+sku_id]",
      
      pending_transactions: "++id, timestamp, status",
      
      // Indexamos created_at para ordenar historial rápidamente
      inventory_ledger: "id, created_at",
      
      user_profiles: "&id, email",
      
      // Empleados: Indexamos 'is_active' para filtrar rápidos en listas
      employees: 'id, project_id, is_active', 
      
      // Asistencia: Índices compuestos o simples para búsquedas rápidas
      attendance_log: '++local_id, id, work_date, employee_id'
    });
  }
}

export const db = new SiteManagerDB();