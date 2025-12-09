export interface Product {
  id: string;
  sku: string;
  name: string;
  min_stock_alert: number;
  unit: "UND" | "KG" | "SACO" | "M3" | "LITRO" | "METRO";
}

export interface InventoryItem {
  sku_id: string; // ID único del producto
  quantity: number; // Cantidad en bodega
  master_sku: {
    // Datos anidados (relación)
    name: string;
    sku: string;
    unit: string;
    min_stock_alert: number;
    description: string | null;
  };
}

export interface TransactionLog {
  id: string;
  transaction_type: "SALIDA" | "ENTRADA" | "AJUSTE";
  quantity_change: number;
  created_at: string;
  master_sku: {
    name: string;
    unit: string;
    sku: string;
  };
}