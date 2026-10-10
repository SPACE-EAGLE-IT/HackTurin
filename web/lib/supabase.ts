import { createClient } from "@supabase/supabase-js";

// Client con service role: SOLO lato server (route handlers). Mai importare in componenti client.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variabili Supabase mancanti (vedi .env.example)");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Client pubblico (anon key): lettura con RLS, usabile anche nel browser.
export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Variabili Supabase mancanti (vedi .env.example)");
  return createClient(url, key, { auth: { persistSession: false } });
}
