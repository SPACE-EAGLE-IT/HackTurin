// Read-only access to every staff module for the hackathon judges.
// Local script only (service role from .env.local; the app never uses it).
//
// 1. The judge account is created normally: sign up at https://torinosegnala.vercel.app/login
//    (any team member can do it with an email/password to hand to the judges).
// 2. Then, from web/:
//      node --env-file=.env.local scripts/demo/judge-access.mjs giudici@example.com           → read on everything
//      node --env-file=.env.local scripts/demo/judge-access.mjs giudici@example.com --revoke  → back to defaults
//
// "read" lets the judges open every page, map, report and dashboard, and use the assistant, but not
// create, edit or delete anything.
import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]?.trim().toLowerCase()
const revoke = process.argv.includes('--revoke')
if (!email || !email.includes('@')) {
  console.error('Uso: node --env-file=.env.local scripts/demo/judge-access.mjs <email> [--revoke]')
  process.exit(1)
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: profile, error } = await db
  .from('profiles')
  .select('id, full_name, is_admin')
  .ilike('email', email)
  .maybeSingle()
if (error) throw error
if (!profile) {
  console.error(`✗ Nessun account con ${email}: registralo prima su /login`)
  process.exit(1)
}
if (profile.is_admin) {
  console.error('✗ È un amministratore: non serve, e non tocco i suoi permessi')
  process.exit(1)
}

const { data: features } = await db.from('features').select('key, name, default_level')
const rows = features.map(f => ({
  profile_id: profile.id,
  feature_key: f.key,
  level: revoke ? f.default_level : 'read',
  updated_at: new Date().toISOString(),
}))
const { error: upsertError } = await db
  .from('feature_access')
  .upsert(rows, { onConflict: 'profile_id,feature_key' })
if (upsertError) throw upsertError

console.log(
  revoke
    ? `✓ ${profile.full_name}: permessi riportati ai valori di default`
    : `✓ ${profile.full_name}: sola lettura su ${features.map(f => f.name).join(', ')}`
)
