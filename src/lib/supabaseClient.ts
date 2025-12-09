import { createClient } from "@supabase/supabase-js";

// Estas variables las obtienes en tu Dashboard de Supabase > Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
