// DEMO data for the kit modules: zone contracts, interventions, volunteer missions, donations, one adoption.
// Local script only (uses the service role from .env.local; the app itself never does).
//   node --env-file=.env.local scripts/demo/seed-business.mjs          → insert
//   node --env-file=.env.local scripts/demo/seed-business.mjs --clear  → remove what this script created
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const TAG = '[demo]'

if (process.argv.includes('--clear')) {
  await db.from('missions').delete().like('title', `${TAG}%`)
  await db.from('tasks').delete().like('title', `${TAG}%`)
  await db.from('projects').delete().like('name', `${TAG}%`)
  await db.from('donations').delete().like('stripe_session_id', 'demo_%')
  await db.from('sponsorships').delete().like('stripe_session_id', 'demo_%')
  console.log('demo business data removed')
  process.exit(0)
}

const { data: projects } = await db
  .from('projects')
  .insert([
    {
      name: `${TAG} Centro e Aurora`,
      client_name: 'AMIAT (demo)',
      caps: ['10121', '10122', '10152'],
      budget_hours: 600,
      due_date: '2026-12-31',
    },
    {
      name: `${TAG} San Salvario e Nizza`,
      client_name: 'Cooperativa Verde (demo)',
      caps: ['10125', '10126', '10137'],
      budget_hours: 400,
      due_date: '2026-12-31',
    },
    {
      name: `${TAG} Barriera e Borgo Vittoria`,
      client_name: 'AMIAT (demo)',
      caps: ['10154', '10144', '10147'],
      budget_hours: 500,
      due_date: '2026-12-31',
    },
  ])
  .select('id, caps')

// The most urgent open reports become interventions or missions.
const { data: reports } = await db.rpc('public_reports', { p_include_closed: false, p_limit: 200 })
const urgent = reports.sort((a, b) => b.severity * b.observations - a.severity * a.observations).slice(0, 18)
const CAP = {
  // approximate, same idea as lib/civic/cap.ts: just to pick the contract
  centro: p => p.lat > 45.064 && p.lat < 45.09 && p.lon < 7.7,
}
const projectFor = r => (CAP.centro(r) ? projects[0].id : r.lat < 45.055 ? projects[1].id : projects[2].id)
const NAMES = {
  rifiuti_abbandonati: 'Rimozione rifiuti',
  cassonetto_pieno: 'Svuotamento cassonetto',
  buca: 'Ripristino manto',
  graffiti: 'Pulizia graffiti',
  illuminazione: 'Sostituzione lampione',
  altro: 'Sopralluogo',
}

const tasks = urgent.slice(0, 12).map((r, i) => ({
  title: `${TAG} ${NAMES[r.category] ?? 'Intervento'}`,
  description: r.description,
  report_id: r.id,
  project_id: projectFor(r),
  priority: r.severity >= 4 ? 'high' : 'medium',
  status: i < 3 ? 'in_progress' : 'todo',
  tags: [r.category],
}))
await db.from('tasks').insert(tasks)

const missions = urgent
  .slice(12)
  .filter(r => r.category === 'rifiuti_abbandonati' || r.category === 'graffiti')
  .concat(urgent.slice(12, 15))
await db.from('missions').insert(
  [...new Map(missions.map(r => [r.id, r])).values()].slice(0, 5).map(r => ({
    title: `${TAG} Ripulisci ${r.category === 'graffiti' ? 'il muro' : 'l’area'}`,
    description: r.description ?? 'Segnalazione dalla mappa: porta guanti e sacchi.',
    report_id: r.id,
    project_id: projectFor(r),
  }))
)

const donors = [
  ['Giulia R.', 10],
  ['Marco B.', 25],
  ['Caffè Centrale', 50],
  ['Anna P.', 5],
  ['Officine Dora', 100],
  ['Luca T.', 15],
]
await db.from('donations').insert(
  donors.map(([name, amount], i) => ({
    stripe_session_id: `demo_don_${i}`,
    amount,
    donor_name: name,
    is_company: /Caff|Officine/.test(name),
    created_at: new Date(Date.now() - i * 2 * 864e5).toISOString(),
  }))
)
const { data: sponsorship } = await db
  .from('sponsorships')
  .insert({
    company_name: 'Azienda Demo S.r.l.',
    caps: ['10122', '10152'],
    plan: 'annuale',
    amount: 3500,
    volunteer_days: 2,
    status: 'active',
    starts_on: new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10),
    ends_on: new Date(Date.now() + 345 * 864e5).toISOString().slice(0, 10),
    stripe_session_id: 'demo_spons_1',
  })
  .select('id')
  .single()
// One company team day already done and verified: it feeds the impact report and the public fund.
await db.from('missions').insert({
  title: `${TAG} Giornata di team: pulizia lungo Dora`,
  description: 'Volontariato aziendale coordinato da Space Eagle ETS.',
  status: 'verified',
  sponsorship_id: sponsorship.id,
  team_size: 12,
  hours: 4,
  kg_collected: 86,
  volunteer_note: '12 colleghi, 18 sacchi, 2 ingombranti segnalati ad AMIAT.',
  submitted_at: new Date(Date.now() - 6 * 864e5).toISOString(),
  verified_at: new Date(Date.now() - 5 * 864e5).toISOString(),
})
console.log(
  `demo: ${projects.length} appalti, ${tasks.length} interventi, missioni, ${donors.length} donazioni, 1 adozione`
)
