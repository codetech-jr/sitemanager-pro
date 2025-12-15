// src/lib/db.ts
import Dexie, { type Table } from "dexie";

// --- INTERFACES DE DATOS ---

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
  type?: 'CONSUMABLE' | 'TOOL'; // Tipo de producto
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
  id: string;           
  full_name: string;
  role: string | null;
  dni: string | null;
  daily_rate: number;   
  project_id: string | null;
  is_active: boolean;
}

export interface IAttendanceLog {
  local_id?: number;    
  id: number;           
  employee_id: string;
  work_date: string;    
  check_in_time: string;
  check_out_time: string | null;
  check_in_gps: string | null;
  check_out_gps: string | null;
}

// ====> PEDIDOS (REQUISITIONS) <====
export interface IRequisition {
  id: string; // UUID
  project_id: string;
  user_id: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECEIVED';
  requisition_number: number;
  created_at: string;
  // Campos opcionales para UI
  project_name?: string;
  requester_name?: string;
}

export interface IRequisitionItem {
  id: string;
  requisition_id: string;
  sku_id: string;
  quantity_requested: number;
  quantity_received: number;
  sku_name?: string;
  sku_unit?: string;
}

// ====> PRÉSTAMOS (LOANS) <====
export interface IActiveLoan {
  id: string; // UUID
  project_id: string;
  sku_id: string;
  employee_id: string;
  loan_date: string;
  condition_out: string;
  sku_name?: string;
  employee_name?: string;
}

// ====> NUEVO: BITÁCORA DE OBRA (SITE LOGS) <====
export interface ISiteLog {
  id: string;
  project_id: string;
  user_id: string;
  category: 'PROGRESS' | 'INCIDENT' | 'WEATHER' | 'NOTE';
  content: string;
  created_at: string;
  // Campos para UI (nombre del autor)
  author_name?: string; 
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
  
  // Tablas de Pedidos
  requisitions!: Table<IRequisition>;
  requisition_items!: Table<IRequisitionItem>;

  // Tabla de Préstamos
  active_loans!: Table<IActiveLoan>;

  // Nueva tabla Bitácora
  site_logs!: Table<ISiteLog>;

  constructor() {
    super("SiteManagerDB_v2");
    
    // --- HISTORIAL DE MIGRACIONES ---
    
    // Versiones 4 a 7 (Histórico)
    this.version(4).stores({
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
    });

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

    this.version(7).stores({
      projects: "id",
      master_sku: "id, sku, name", 
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      employees: 'id, project_id, is_active', 
      attendance_log: '++local_id, id, work_date, employee_id'
    });

    // Versión 8 (Pedidos)
    this.version(8).stores({
      projects: "id",
      master_sku: "id, sku, name", 
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      employees: 'id, project_id, is_active', 
      attendance_log: '++local_id, id, work_date, employee_id',
      requisitions: 'id, project_id, status',
      requisition_items: 'id, requisition_id'
    });

    // Versión 9 (Préstamos)
    this.version(9).stores({
      projects: "id",
      master_sku: "id, sku, name, type", 
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      employees: 'id, project_id, is_active', 
      attendance_log: '++local_id, id, work_date, employee_id',
      requisitions: 'id, project_id, status',
      requisition_items: 'id, requisition_id',
      active_loans: 'id, project_id, employee_id' 
    });

    // ====> VERSIÓN 10 (BITÁCORA / SITE LOGS) <====
    this.version(10).stores({
      projects: "id",
      master_sku: "id, sku, name, type", 
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      user_profiles: "&id, email",
      employees: 'id, project_id, is_active', 
      attendance_log: '++local_id, id, work_date, employee_id',
      requisitions: 'id, project_id, status',
      requisition_items: 'id, requisition_id',
      active_loans: 'id, project_id, employee_id',
      
      // Nueva tabla:
      site_logs: 'id, project_id, category, created_at'
    });
  }
}

export const db = new SiteManagerDB();