import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définis."
  );
}

// Clé anon uniquement : toute la sécurité repose sur les policies RLS
// (voir supabase/security.sql). Ne jamais exposer la service_role key ici.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Nécessaire pour le lien « mot de passe oublié » (session dans l'URL).
    detectSessionInUrl: true,
  },
});
