// src/lib/syncManager.ts

import { db } from "./db";
import { supabase } from "./supabaseClient";
import { registrarMovimiento } from "./api";
import type { IPendingTransaction } from "./db";

// ====> LÓGICA DE DESCARGA DE DATOS ACTUALIZADA <====
export async function downloadDataFromServer() {
  console.log("SYNC: Descargando TODOS los datos del servidor (v10 - Bitácora)...");

  try {
    // 1. Obtener el ID del proyecto actual del localStorage para filtrar pedidos y logs
    const savedProject = localStorage.getItem('siteManager_currentProject');
    const currentProjectId = savedProject ? JSON.parse(savedProject).id : null;

    const [
        skuRes, 
        invRes, 
        ledgerRes, 
        employeesRes, 
        attendanceRes,
        reqRes,
        reqItemsRes,
        loansRes,
        // NUEVO: Logs de Bitácora
        logsRes
    ] = await Promise.all([
      supabase.from("master_sku").select("*"),
      supabase.from("project_inventory").select("*"),
      supabase.from("inventory_ledger")
        .select("*, master_sku(name, unit, sku)")
        .order("created_at", { ascending: false })
        .limit(50), 
      supabase.from("employees").select("*").eq('is_active', true),
      supabase.from("attendance_log").select("*"),
      
      // Pedidos
      currentProjectId 
        ? supabase.from("requisitions").select("*").eq('project_id', currentProjectId).order('created_at', { ascending: false }).limit(20)
        : supabase.from("requisitions").select("*").order('created_at', { ascending: false }).limit(20),
        
      // Items de Pedidos
      supabase.from("requisition_items").select("*, master_sku(name, unit)"),

      // Préstamos
      supabase.from("active_loans").select("*, master_sku(name), employees(full_name)"),

      // ===> NUEVA CONSULTA DE LOGS (BITÁCORA) <===
      // Traemos los últimos 50 logs con el nombre del autor
      currentProjectId 
        ? supabase.from("site_logs").select("*, profiles(full_name)").eq('project_id', currentProjectId).order('created_at', { ascending: false }).limit(50)
        : supabase.from("site_logs").select("*, profiles(full_name)").order('created_at', { ascending: false }).limit(50)
    ]);

    // Check de errores global
    const firstError = skuRes.error || invRes.error || ledgerRes.error || employeesRes.error || attendanceRes.error || reqRes.error || reqItemsRes.error || loansRes.error || logsRes.error;
    if (firstError) throw firstError;

    await db.transaction(
      "rw",
      [
        db.master_sku,
        db.project_inventory,
        db.inventory_ledger,
        db.employees,
        db.attendance_log,
        db.requisitions,
        db.requisition_items,
        db.active_loans,
        // Nueva tabla en la transacción
        db.site_logs
      ],
      async () => {
        // 1. LIMPIEZA
        await Promise.all([
            db.master_sku.clear(),
            db.project_inventory.clear(),
            db.inventory_ledger.clear(),
            db.employees.clear(),
            db.attendance_log.clear(),
            db.requisitions.clear(),
            db.requisition_items.clear(),
            db.active_loans.clear(),
            // Limpiar logs viejos
            db.site_logs.clear()
        ]);
        
        // 2. ESCRITURA CON ADAPTACIÓN
        await Promise.all([
            db.master_sku.bulkPut(skuRes.data),
            
            db.project_inventory.bulkPut(invRes.data.map(item => ({...item, compound_id: `${item.project_id}_${item.sku_id}`}))),

            db.inventory_ledger.bulkPut(ledgerRes.data.map((log: any) => ({
              ...log, 
              sku_name: log.master_sku?.name || 'N/A',
              sku_unit: log.master_sku?.unit || 'N/A'
            }))),

            db.employees.bulkPut(employeesRes.data),
            db.attendance_log.bulkPut(attendanceRes.data),

            db.requisitions.bulkPut(reqRes.data),
            
            db.requisition_items.bulkPut(reqItemsRes.data.map((item: any) => ({
                ...item,
                sku_name: item.master_sku?.name || 'Desconocido',
                sku_unit: item.master_sku?.unit || 'UND'
            }))),

            db.active_loans.bulkPut(loansRes.data.map((loan: any) => ({
                ...loan,
                sku_name: loan.master_sku?.name || 'Herramienta desconocida',
                employee_name: loan.employees?.full_name || 'Empleado desconocido'
            }))),

            // ===> GUARDADO DE LOGS DE BITÁCORA <===
            db.site_logs.bulkPut(logsRes.data.map((log: any) => ({
                ...log,
                // Aplanamos el nombre del autor para facilitar la UI
                author_name: log.profiles?.full_name || 'Usuario'
            })))
        ]);
      }
    );

    console.log("SYNC: Descarga completa con Módulos de Pedidos, Herramientas y Bitácora.");
  } catch (error) {
    console.error("SYNC: Fallo crítico en la descarga de datos.", error);
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