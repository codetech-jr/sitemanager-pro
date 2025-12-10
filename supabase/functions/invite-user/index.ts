// supabase/functions/invite-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Ahora corsHeaders es una FUNCIÓN, no una constante.
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Obtenemos el origen de quien nos llama.
  const origin = req.headers.get('Origin') || '';

  // Usamos la función para obtener las cabeceras correctas.
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers }) // Usamos las cabeceras dinámicas
  }

  try {
    const { email } = await req.json()
    if (!email) throw new Error("El correo es obligatorio.");

    const supabaseAdmin = createClient( /* ... (esto no cambia) ... */ )
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (error) throw error;

    return new Response(JSON.stringify({ message: `Invitación enviada` }), {
      headers: { ...headers, 'Content-Type': 'application/json' }, // Usamos las cabeceras dinámicas
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...headers, 'Content-Type': 'application/json' }, // Usamos las cabeceras dinámicas
      status: 400,
    })
  }
})