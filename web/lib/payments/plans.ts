/**
 * What a company can buy (one-off payment). Volunteering days are run by the partner ETS, which pays
 * insurance, materials and coordination from them: this is what keeps the volunteer programme funded.
 */
export const ADOPTION_PLANS = {
  giornata: {
    label: 'Giornata di volontariato',
    short: 'Giornata',
    months: 3,
    amount: 1500,
    volunteerDays: 1,
    pitch: 'Un team fino a 15 colleghi per una giornata di cura urbana, report d’impatto incluso',
  },
  trimestrale: {
    label: 'Adozione trimestrale',
    short: 'Trimestrale',
    months: 3,
    amount: 900,
    volunteerDays: 0,
    pitch: 'Fino a 5 CAP adottati per 3 mesi, report d’impatto sempre aggiornato',
  },
  annuale: {
    label: 'Adozione annuale',
    short: 'Annuale',
    months: 12,
    amount: 3500,
    volunteerDays: 2,
    pitch: 'Fino a 5 CAP per 12 mesi e 2 giornate di volontariato aziendale incluse',
  },
} as const
export type AdoptionPlan = keyof typeof ADOPTION_PLANS

const planOf = (plan: string) => ADOPTION_PLANS[plan as AdoptionPlan] ?? ADOPTION_PLANS.trimestrale
export const planLabel = (plan: string) => planOf(plan).label
export const planShort = (plan: string) => planOf(plan).short
