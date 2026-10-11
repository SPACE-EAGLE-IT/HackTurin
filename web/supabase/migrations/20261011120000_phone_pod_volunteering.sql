-- Phones as PODs, and corporate volunteering as the paid side of the volunteer programme.

-- 1. A phone paired from the POD console is a third kind of device.
alter table public.devices drop constraint if exists devices_type_check;
alter table public.devices add constraint devices_type_check check (type in ('fixed', 'mobile', 'phone'));

-- 2. Company plans: a one-off volunteering day, or an adoption that includes volunteering days.
alter table public.sponsorships
  add column if not exists volunteer_days integer not null default 0 check (volunteer_days between 0 and 20);
comment on column public.sponsorships.volunteer_days is 'Team volunteering days included in the plan, run by the partner ETS.';

-- 3. A mission can be done by a company team; hours count once per person.
alter table public.missions
  add column if not exists team_size integer not null default 1 check (team_size between 1 and 50),
  add column if not exists sponsorship_id uuid references public.sponsorships (id) on delete set null;
create index if not exists missions_sponsorship_id_idx on public.missions (sponsorship_id);
comment on column public.missions.team_size is 'People who took part; volunteer hours = hours × team_size.';

create or replace function public.create_pending_sponsorship(p_company text, p_caps text[], p_plan text)
returns uuid
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.sponsorships (profile_id, company_name, caps, plan, volunteer_days)
  select public.current_profile_id(), left(trim(p_company), 160), p_caps, plan,
         case plan when 'giornata' then 1 when 'annuale' then 2 else 0 end
  from (select case when p_plan in ('giornata', 'trimestrale', 'annuale') then p_plan else 'trimestrale' end as plan) p
  returning id;
$$;

create or replace function public.public_fund()
returns table (raised numeric, donors integer, reimbursed numeric, missions_verified integer, volunteer_hours numeric, kg_collected numeric, zones_adopted integer)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select (select coalesce(sum(amount), 0) from public.donations),
         (select count(*)::integer from public.donations),
         (select coalesce(sum(amount), 0) from public.volunteer_expenses where reimbursed_at is not null),
         (select count(*)::integer from public.missions where status = 'verified'),
         (select coalesce(sum(hours * team_size), 0) from public.missions where status = 'verified'),
         (select coalesce(sum(kg_collected), 0) from public.missions where status = 'verified'),
         (select coalesce(sum(cardinality(caps)), 0)::integer from public.sponsorships where status = 'active');
$$;
