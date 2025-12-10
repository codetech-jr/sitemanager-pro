// src/lib/syncManager.ts

import { db } from "./db";
import { supabase } from "./supabaseClient";
import { registrarMovimiento } from "./api";
import type { IPendingTransaction } from "./db";

// ====> LÓGICA DE DESCARGA DE DATOS ACTUALIZADA <====
export async function downloadDataFromServer() {
  console.log("SYNC: Descargando datos maestros y logs...");

  try {
    // Usamos Promise.all para hacer las 4 peticiones en paralelo
    const [skuRes, invRes, ledgerRes, profilesRes] = await Promise.all([
      // <--- CAMBIO: Añadimos 'profilesRes'
      supabase.from("master_sku").select("*"),
      supabase.from("project_inventory").select("*"),
      supabase
        .from("inventory_ledger")
        .select(
          "id, transaction_type, quantity_change, created_at, master_sku(name, unit)"
        )
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("user_profiles").select("*"), // <--- NUEVO: La consulta a la vista de perfiles
    ]);

    // Comprobamos si alguna de las peticiones falló
    if (skuRes.error || invRes.error || ledgerRes.error || profilesRes.error) {
      // <--- CAMBIO: Añadimos chequeo para perfiles
      console.error(
        "Error descargando datos",
        skuRes.error || invRes.error || ledgerRes.error || profilesRes.error // <--- CAMBIO
      );
      return;
    }

    // Usamos una transacción de Dexie para asegurar que todas las operaciones se completen
    await db.transaction(
      "rw",
      db.master_sku,
      db.project_inventory,
      db.inventory_ledger,
      db.user_profiles, // <--- NUEVO: Añadimos la tabla de perfiles a la transacción
      async () => {
        // Vaciamos las tablas locales antes de llenarlas con datos frescos
        await db.master_sku.clear();
        await db.project_inventory.clear();
        await db.inventory_ledger.clear();
        await db.user_profiles.clear(); // <--- NUEVO: Vaciamos la tabla de perfiles

        // Guardamos el catálogo maestro
        await db.master_sku.bulkPut(skuRes.data as any);

        // Adaptamos los datos de inventario
        const inventoryWithCompoundKey = invRes.data.map((item) => ({
          ...item,
          compound_id: `${item.project_id}_${item.sku_id}`,
        }));
        await db.project_inventory.bulkPut(inventoryWithCompoundKey as any);

        // Aplanamos los datos del historial
        const flatLedgerData = ledgerRes.data.map((log: any) => ({
          id: log.id,
          transaction_type: log.transaction_type,
          quantity_change: log.quantity_change,
          created_at: log.created_at,
          sku_name: log.master_sku?.name || "Producto eliminado",
          sku_unit: log.master_sku?.unit || "N/A",
        }));
        await db.inventory_ledger.bulkPut(flatLedgerData);

        // Guardamos los perfiles de usuario
        await db.user_profiles.bulkPut(profilesRes.data as any); // <--- NUEVO: Guardamos los perfiles en Dexie
      }
    );

    console.log(
      "SYNC: Datos maestros, logs y perfiles actualizados correctamente."
    ); // <--- CAMBIO: Mensaje de éxito actualizado
  } catch (error) {
    console.error(
      "SYNC: Hubo un error crítico en el proceso de descarga.",
      error
    );
  }
}

// ====> EL RESTO DEL CÓDIGO SE MANTIENE IGUAL <====

export async function processSyncQueue() {
  if (!navigator.onLine) {
    console.log("SYNC: Offline, no se puede procesar la cola.");
    return;
  }

  const pending = await db.pending_transactions
    .where("status")
    .equals("pending")
    .toArray();
  if (pending.length === 0) return;

  console.log(`SYNC: Procesando ${pending.length} transacciones pendientes...`);

  let needsRefresh = false;
  for (const tx of pending) {
    try {
      await db.pending_transactions.update(tx.id!, { status: "syncing" });
      await registrarMovimiento(
        tx.payload.skuId,
        tx.payload.projectId,
        tx.payload.cantidad,
        tx.payload.tipo,
        tx.payload.firmaDataUrl
      );
      await db.pending_transactions.delete(tx.id!);
      console.log(`SYNC: Transacción ${tx.id} subida con éxito.`);
      needsRefresh = true;
    } catch (error) {
      console.error(`SYNC: Falló la subida de la transacción ${tx.id}`, error);
      await db.pending_transactions.update(tx.id!, { status: "pending" });
      break;
    }
  }

  if (needsRefresh) {
    await downloadDataFromServer();
  }
}

export async function addTransactionToQueue(
  payload: IPendingTransaction["payload"]
) {
  console.log("OFFLINE: Añadiendo transacción a la cola local.");

  try {
    const compoundId = `${payload.projectId}_${payload.skuId}`;
    await db.project_inventory
      .where({ compound_id: compoundId })
      .modify((item) => {
        item.quantity = (item.quantity || 0) + payload.cantidad;
      });

    await db.pending_transactions.add({
      payload,
      timestamp: Date.now(),
      status: "pending",
    });

    processSyncQueue();
  } catch (error) {
    console.error("OFFLINE: Error al añadir transacción a la cola", error);
  }
}
