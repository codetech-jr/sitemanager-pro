// supabase/functions/_shared/cors.ts -- VERSIÓN PARA PRODUCCIÓN

const allowedOrigins = [
  'https://sitemanager-pro.vercel.app',
  // Si tienes una URL de "preview" en Vercel, la añadirías aquí también.
  // Ejemplo: 'https://sitemanager-pro-git-develop-tu-usuario.vercel.app'
]

export const corsHeaders = (origin: string) => {
  // Si el origen de la llamada está en nuestra lista de permitidos, le damos acceso.
  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
  } else {
    // Si la llamada viene de un sitio desconocido, se la negamos.
    return {
      'Access-Control-Allow-Origin': '', // Vacío o un origen seguro por defecto
    }
  }
}