import { supabase } from "./supabaseClient";

// Función auxiliar: Convertir Base64 a archivo binario (Blob)
// Necesaria para transformar la firma del canvas a un archivo subible
async function dataUrlToBlob(dataUrl: string) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

// Función para registrar movimiento
export async function registrarMovimiento(
  skuId: string,
  projectId: string,
  cantidad: number, // Negativo para salida, positivo para entrada
  tipo: "SALIDA" | "ENTRADA",
  firmaDataUrl?: string // <--- Nuevo parámetro opcional para la imagen
) {
  let evidenceUrl = null;

  // 1. SI HAY FIRMA, LA SUBIMOS PRIMERO A STORAGE
  if (firmaDataUrl) {
    try {
      const blob = await dataUrlToBlob(firmaDataUrl);
      // Creamos un nombre único: timestamp + id_producto + .png
      const fileName = `${Date.now()}_${skuId}.png`;

      const { error: uploadError } = await supabase.storage
        .from("firmas") // IMPORTANTE: Asegúrate de crear este bucket en Supabase
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error subiendo firma a Storage:", uploadError);
        // Continuamos sin firma si falla la subida para no bloquear la transacción
      } else {
        // Obtenemos la URL pública
        const { data: publicData } = supabase.storage
          .from("firmas")
          .getPublicUrl(fileName);

        evidenceUrl = publicData.publicUrl;
      }
    } catch (err) {
      console.error("Error procesando la imagen de la firma:", err);
    }
  }

  // 2. INSERTAR EN EL LIBRO MAYOR (Inventory Ledger)
  const { data, error } = await supabase
    .from("inventory_ledger")
    .insert([
      {
        project_id: projectId,
        sku_id: skuId,
        transaction_type: tipo,
        quantity_change: cantidad,
        evidence_url: evidenceUrl, // <--- Aquí guardamos la URL de la imagen (o null)
        notes: "Movimiento desde WebApp",
      },
    ])
    .select();

  if (error) throw error;
  return data;
}
