// src/lib/db.ts
import Dexie, { type Table } from "dexie";

// Interfaces para nuestros datos locales
export interface IProject {
  id: string;
  name: string;
}
export interface IMasterSku {
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

// ====> NUEVA INTERFAZ PARA PERFILES DE USUARIO <====
export interface IUserProfile {
  id: string; // uuid
  email?: string;
  role?: string;
  created_at?: string;
}

class SiteManagerDB extends Dexie {
  projects!: Table<IProject>;
  master_sku!: Table<IMasterSku>;
  project_inventory!: Table<IInventoryItem>;
  pending_transactions!: Table<IPendingTransaction>;
  inventory_ledger!: Table<ITransactionLog>;
  // ====> NUEVA TABLA DE PERFILES DE USUARIO <====
  user_profiles!: Table<IUserProfile>;

  constructor() {
    super("SiteManagerDB_v2");

    // ====> BUMP DE VERSIÓN A 4 PARA AÑADIR LA NUEVA TABLA <====
    this.version(4).stores({
      projects: "id",
      master_sku: "id, sku",
      project_inventory: "compound_id, &[project_id+sku_id]",
      pending_transactions: "++id, timestamp, status",
      inventory_ledger: "id, created_at",
      // ====> DEFINICIÓN DE LA NUEVA TABLA Y SU ÍNDICE <====
      user_profiles: "&id, email", // '&id' es clave primaria, 'email' es un índice para búsquedas rápidas
    });
  }
}

export const db = new SiteManagerDB();
