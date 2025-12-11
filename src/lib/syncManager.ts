// src/lib/syncManager.ts

import { db } from "./db";
import { supabase } from "./supabaseClient";
import { registrarMovimiento } from "./api";
import type { IPendingTransaction } from "./db";

// ====> LÓGICA DE DESCARGA DE DATOS ACTUALIZADA <====
// En src/lib/syncManager.ts
export async function downloadDataFromServer() {
  console.log("SYNC: Descargando TODOS los datos del servidor...");

  try {
    const [
        skuRes, 
        invRes, 
        ledgerRes, 
        employeesRes, 
        attendanceRes
    ] = await Promise.all([
      supabase.from("master_sku").select("*"),
      supabase.from("project_inventory").select("*"),
      supabase.from("inventory_ledger")
        .select("*, master_sku(name, unit, sku)"), // Seleccionamos todo del ledger y anidamos el SKU
      supabase.from("employees").select("*").eq('is_active', true),
      supabase.from("attendance_log").select("*"),
    ]);

    const firstError = skuRes.error || invRes.error || ledgerRes.error || employeesRes.error || attendanceRes.error;
    if (firstError) throw firstError;

    await db.transaction(
      "rw",
      [
        db.master_sku,
        db.project_inventory,
        db.inventory_ledger,
        db.employees,
        db.attendance_log
      ],
      async () => {
        // 1. LIMPIEZA
        await Promise.all([
            db.master_sku.clear(),
            db.project_inventory.clear(),
            db.inventory_ledger.clear(),
            db.employees.clear(),
            db.attendance_log.clear()
        ]);
        
        // 2. ESCRITURA CON ADAPTACIÓN
        await Promise.all([
            db.master_sku.bulkPut(skuRes.data),
            
            // Para project_inventory, aseguremos que tiene una PK que Dexie pueda usar
            db.project_inventory.bulkPut(invRes.data.map(item => ({...item, compound_id: `${item.project_id}_${item.sku_id}`}))),

            // Para ledger, aplanamos los datos para la UI
            db.inventory_ledger.bulkPut(ledgerRes.data.map((log: any) => ({
              ...log, // Guardamos todos los campos del log
              sku_name: log.master_sku?.name || 'N/A',
              sku_unit: log.master_sku?.unit || 'N/A'
            }))),

            // PARA EMPLOYEES y ATTENDANCE, nos aseguramos que se guardan tal cual vienen de la API.
            // Esto es correcto PORQUE en db.ts definimos sus Primary Keys ('id' y 'id' respectivamente)
            db.employees.bulkPut(employeesRes.data),
            db.attendance_log.bulkPut(attendanceRes.data),
        ]);
      }
    );

    console.log("SYNC: Descarga completa. Base de datos local actualizada.");
  } catch (error) {
    console.error("SYNC: Fallo crítico en la descarga de datos.", error);
  }
}

// ... EL RESTO DE FUNCIONES SE QUEDAN IGUAL ...

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
    
    // Actualización optimista local
    await db.project_inventory
      .where({ compound_id: compoundId })
      .modify((item) => {
        item.quantity = (item.quantity || 0) + payload.cantidad;
      });

    // Guardar en cola
    await db.pending_transactions.add({
      payload,
      timestamp: Date.now(),
      status: "pending",
    });

    // Intentar sincronizar si hay internet
    processSyncQueue();
  } catch (error) {
    console.error("OFFLINE: Error al añadir transacción a la cola", error);
  }
}