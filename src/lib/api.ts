import { supabase } from "./supabaseClient";
import type { Database } from "../types/database.types"; // Asumimos genéricos por ahora

// Función para registrar movimiento
export async function registrarMovimiento(
  skuId: string,
  projectId: string,
  cantidad: number, // Negativo para salida
  tipo: "SALIDA" | "ENTRADA"
) {
  // 1. Validar Stock antes de intentar (opcional pero buena UX)
  // En producción esto se valida a nivel de BD, pero ayudamos al UI aquí.

  // 2. Insertar en el Libro Mayor
  const { data, error } = await supabase
    .from("inventory_ledger")
    .insert([
      {
        project_id: projectId,
        sku_id: skuId,
        transaction_type: tipo,
        quantity_change: cantidad,
        // user_id: aquí iría el ID del usuario autenticado en el futuro
        notes: "Movimiento desde WebApp",
      },
    ])
    .select();

  if (error) throw error;
  return data;
}
