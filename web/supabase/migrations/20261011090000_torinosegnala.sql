-- TorinoSegnala on the kit: features, links between reports and kit modules, volunteers, fund, and the
-- narrow security-definer entry points used by public pages, PODs and the payment webhook.

-- ---------------------------------------------------------------------------
-- 0. Platform functions: pin search_path (PostGIS may live in `extensions`)
-- ---------------------------------------------------------------------------
alter function public.ingest_report(text, uuid, text, double precision, double precision, text, text, numeric, timestamptz, jsonb)
  set search_path = public, extensions;
alter function public.reports_before_insert() set search_path = public, extensions;
alter function public.reports_before_update() set search_path = public, extensions;

-- Views from the first version bypassed RLS: the app now reads through policies and RPCs.
drop view if exists public.v_public_devices;
drop view if exists public.v_stats_by_cap;
drop view if exists public.v_stats_by_category;
drop view if exists public.v_stats_by_day;

-- ---------------------------------------------------------------------------
-- 1. Features: staff modules are hidden by default, the admin opens them from Accessi.
--    A new sign-up sees only Missioni (volunteer) and Impatto (company).
-- ---------------------------------------------------------------------------
insert into public.features (key, name, description, default_level, sort_order) values
  ('segnalazioni', 'Segnalazioni', 'Civic reports from citizens and PODs, on a map.', 'none', 12),
  ('pod', 'POD', 'Sensor fleet, API keys and live API traffic.', 'none', 35),
  ('missioni', 'Missioni', 'Volunteer missions on real reports, with capped expense reimbursements.', 'write', 60),
  ('fondo', 'Fondo e adozioni', 'Donations, zone adoptions and volunteer reimbursements.', 'none', 70),
  ('impatto', 'Impatto', 'Impact report of the zones a company adopted.', 'read', 80)
on conflict (key) do nothing;

update public.features set default_level = 'none' where key in ('dashboard', 'tasks', 'projects', 'help_desk', 'ai');
update public.features set name = 'Interventi', description = 'Field interventions, often created from a report.' where key = 'tasks';
update public.features set name = 'Appalti', description = 'Zone contracts (CAP list), with owner, budget and deadline.' where key = 'projects';

-- ---------------------------------------------------------------------------
-- 2. Links to kit modules
-- ---------------------------------------------------------------------------
alter table public.tasks add column if not exists report_id uuid references public.reports (id) on delete set null;
create index if not exists tasks_report_id_idx on public.tasks (report_id);
comment on column public.tasks.report_id is 'The civic report this intervention resolves.';

alter table public.projects add column if not exists caps text[] not null default '{}';
comment on column public.projects.caps is 'Postal codes (CAP) covered by this zone contract.';

alter table public.tickets add column if not exists device_id uuid references public.devices (id) on delete set null;
create index if not exists tickets_device_id_idx on public.tickets (device_id);

insert into public.ticket_categories (name, description, sort_order) values
  ('POD offline', 'A POD stopped sending heartbeats.', 50),
  ('Batteria', 'A POD battery is running low.', 60),
  ('Errori API', 'A POD keeps sending invalid requests.', 70),
  ('Sensore', 'Readings out of range or a broken sensor.', 80)
on conflict (name) do nothing;

-- Report status follows its intervention: started → in progress, done → resolved.
create or replace function public.sync_report_from_task()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.report_id is null then return new; end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    update public.reports set status = 'resolved' where id = new.report_id and status <> 'resolved';
  elsif new.status <> 'done' then
    update public.reports set status = 'in_progress' where id = new.report_id and status = 'open';
  end if;
  return new;
end $$;

drop trigger if exists tasks_sync_report on public.tasks;
create trigger tasks_sync_report after insert or update of status, report_id on public.tasks
  for each row execute function public.sync_report_from_task();

-- ---------------------------------------------------------------------------
-- 3. Volunteers: missions and capped expense reimbursements (CTS art. 17 c.4)
-- ---------------------------------------------------------------------------
create type public.mission_status as enum ('open', 'assigned', 'submitted', 'verified', 'rejected');
create type public.expense_kind as enum ('trasporto', 'materiali', 'pasto', 'altro');

create table public.volunteer_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  ets_member_at timestamptz,
  patto_ref text check (patto_ref is null or length(patto_ref) <= 80),
  insured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.volunteer_profiles is 'Volunteer enrolment with the partner ETS under the collaboration pact (insurance included).';

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  report_id uuid references public.reports (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  status public.mission_status not null default 'open',
  volunteer_id uuid references public.profiles (id) on delete set null,
  due_date date,
  photo_before_url text,
  photo_after_url text,
  hours numeric(5, 2) check (hours is null or (hours >= 0 and hours <= 24)),
  kg_collected numeric(7, 2) check (kg_collected is null or kg_collected >= 0),
  volunteer_note text,
  review_note text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.missions is 'Small urban-care jobs offered to volunteers; hours are proof of activity, never a pay basis.';
create index missions_status_idx on public.missions (status);
create index missions_volunteer_id_idx on public.missions (volunteer_id);
create index missions_report_id_idx on public.missions (report_id);
create index missions_project_id_idx on public.missions (project_id);

create table public.volunteer_expenses (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  volunteer_id uuid not null references public.profiles (id) on delete cascade,
  spent_on date not null default current_date,
  kind public.expense_kind not null default 'altro',
  amount numeric(7, 2) not null check (amount > 0),
  self_certified boolean not null default true,
  receipt_url text,
  note text check (note is null or length(note) <= 300),
  reimbursed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.volunteer_expenses is 'Expense reimbursements paid by the partner ETS; self-certified ones are capped at 10 €/day and 150 €/month.';
create index volunteer_expenses_volunteer_idx on public.volunteer_expenses (volunteer_id, spent_on);
create index volunteer_expenses_mission_idx on public.volunteer_expenses (mission_id);

-- Caps of CTS art. 17 c.4 for self-certified expenses; documented ones (receipt) are not capped here.
create or replace function public.check_expense_caps()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_day numeric; v_month numeric;
begin
  if not new.self_certified then return new; end if;
  select coalesce(sum(amount), 0) into v_day from public.volunteer_expenses
   where volunteer_id = new.volunteer_id and self_certified and spent_on = new.spent_on and id <> new.id;
  select coalesce(sum(amount), 0) into v_month from public.volunteer_expenses
   where volunteer_id = new.volunteer_id and self_certified and id <> new.id
     and date_trunc('month', spent_on) = date_trunc('month', new.spent_on);
  if v_day + new.amount > 10 then
    raise exception 'Limite giornaliero di 10 € superato (già % €)', round(v_day, 2) using errcode = 'P0001';
  end if;
  if v_month + new.amount > 150 then
    raise exception 'Limite mensile di 150 € superato (già % €)', round(v_month, 2) using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger volunteer_expenses_caps before insert or update of amount, spent_on, self_certified on public.volunteer_expenses
  for each row execute function public.check_expense_caps();

-- Only mission admins verify; a volunteer must be enrolled and insured to take a mission.
create or replace function public.guard_mission()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin boolean := public.has_access('missioni', 'admin');
begin
  if new.status in ('verified', 'rejected') and old.status is distinct from new.status and not v_admin then
    raise exception 'Solo chi gestisce le missioni può verificarle' using errcode = '42501';
  end if;
  if new.volunteer_id is not null and new.volunteer_id is distinct from old.volunteer_id and not v_admin then
    if not exists (select 1 from public.volunteer_profiles v
                   where v.profile_id = new.volunteer_id and v.ets_member_at is not null and v.insured) then
      raise exception 'Per prendere una missione serve l''iscrizione all''associazione partner con assicurazione' using errcode = 'P0001';
    end if;
  end if;
  if new.status = 'submitted' and old.status is distinct from 'submitted' then new.submitted_at := now(); end if;
  if new.status = 'verified' and old.status is distinct from 'verified' then
    new.verified_at := now(); new.verified_by := public.current_profile_id();
    if new.report_id is not null then
      update public.reports set status = 'resolved' where id = new.report_id and status <> 'resolved';
    end if;
  end if;
  return new;
end $$;

create trigger missions_guard before update on public.missions for each row execute function public.guard_mission();
create trigger missions_updated_at before update on public.missions for each row execute function public.set_updated_at();
create trigger volunteer_profiles_updated_at before update on public.volunteer_profiles for each row execute function public.set_updated_at();
create trigger volunteer_expenses_updated_at before update on public.volunteer_expenses for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Fund: donations to the partner ETS and company zone adoptions (written by the payment webhook)
-- ---------------------------------------------------------------------------
create type public.sponsorship_status as enum ('pending', 'active', 'ended');

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'eur',
  donor_name text,
  donor_email text,
  is_company boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.donations is 'Donations to the partner ETS that funds volunteer reimbursements and materials.';

create table public.sponsorships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  company_name text not null check (length(trim(company_name)) between 1 and 160),
  caps text[] not null default '{}',
  plan text not null default 'trimestrale',
  amount numeric(10, 2),
  status public.sponsorship_status not null default 'pending',
  starts_on date,
  ends_on date,
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.sponsorships is 'A company adopting one or more zones (CAP) and receiving an impact report.';
create index sponsorships_profile_id_idx on public.sponsorships (profile_id);
create trigger sponsorships_updated_at before update on public.sponsorships for each row execute function public.set_updated_at();

-- Shared secret between the webhook route and the database (the route never holds the service role).
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ts_payment_bridge', 'Payment webhook → record_payment()')
where not exists (select 1 from vault.secrets where name = 'ts_payment_bridge');

-- ---------------------------------------------------------------------------
-- 5. Privileges and RLS for platform tables
-- ---------------------------------------------------------------------------
drop policy if exists "public read reports" on public.reports;
drop policy if exists "public read categories" on public.report_categories;
drop policy if exists "public read cap zones" on public.cap_zones;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "report_categories: read" on public.report_categories for select to authenticated using (true);
create policy "cap_zones: read" on public.cap_zones for select to authenticated using (true);

create policy "reports: read" on public.reports for select to authenticated
  using (public.has_access('segnalazioni', 'read') or public.has_access('missioni', 'read'));
create policy "reports: update" on public.reports for update to authenticated
  using (public.has_access('segnalazioni', 'write')) with check (public.has_access('segnalazioni', 'write'));
create policy "reports: delete" on public.reports for delete to authenticated using (public.has_access('segnalazioni', 'admin'));

create policy "devices: read" on public.devices for select to authenticated using (public.has_access('pod', 'read'));
create policy "devices: insert" on public.devices for insert to authenticated with check (public.has_access('pod', 'write'));
create policy "devices: update" on public.devices for update to authenticated
  using (public.has_access('pod', 'write')) with check (public.has_access('pod', 'write'));
create policy "devices: delete" on public.devices for delete to authenticated using (public.has_access('pod', 'admin'));
create policy "api_keys: read" on public.api_keys for select to authenticated using (public.has_access('pod', 'read'));
create policy "api_keys: insert" on public.api_keys for insert to authenticated with check (public.has_access('pod', 'write'));
create policy "api_keys: update" on public.api_keys for update to authenticated
  using (public.has_access('pod', 'write')) with check (public.has_access('pod', 'write'));
create policy "api_request_log: read" on public.api_request_log for select to authenticated using (public.has_access('pod', 'read'));
create policy "device_readings: read" on public.device_readings for select to authenticated using (public.has_access('pod', 'read'));
create policy "device_heartbeats: read" on public.device_heartbeats for select to authenticated using (public.has_access('pod', 'read'));

alter table public.volunteer_profiles enable row level security;
alter table public.missions enable row level security;
alter table public.volunteer_expenses enable row level security;
alter table public.donations enable row level security;
alter table public.sponsorships enable row level security;

create policy "volunteer_profiles: read" on public.volunteer_profiles for select to authenticated
  using (profile_id = public.current_profile_id() or public.has_access('missioni', 'admin'));
create policy "volunteer_profiles: insert" on public.volunteer_profiles for insert to authenticated
  with check (profile_id = public.current_profile_id() or public.has_access('missioni', 'admin'));
create policy "volunteer_profiles: update" on public.volunteer_profiles for update to authenticated
  using (profile_id = public.current_profile_id() or public.has_access('missioni', 'admin'))
  with check (profile_id = public.current_profile_id() or public.has_access('missioni', 'admin'));

create policy "missions: read" on public.missions for select to authenticated using (public.has_access('missioni', 'read'));
create policy "missions: insert" on public.missions for insert to authenticated with check (public.has_access('missioni', 'admin'));
create policy "missions: update" on public.missions for update to authenticated
  using (public.has_access('missioni', 'admin')
         or (public.has_access('missioni', 'write') and (volunteer_id = public.current_profile_id() or (status = 'open' and volunteer_id is null))))
  with check (public.has_access('missioni', 'admin')
              or (public.has_access('missioni', 'write') and volunteer_id = public.current_profile_id()));
create policy "missions: delete" on public.missions for delete to authenticated using (public.has_access('missioni', 'admin'));

create policy "volunteer_expenses: read" on public.volunteer_expenses for select to authenticated
  using (volunteer_id = public.current_profile_id() or public.has_access('fondo', 'read') or public.has_access('missioni', 'admin'));
create policy "volunteer_expenses: insert" on public.volunteer_expenses for insert to authenticated
  with check (volunteer_id = public.current_profile_id() and public.has_access('missioni', 'write'));
create policy "volunteer_expenses: update" on public.volunteer_expenses for update to authenticated
  using (public.has_access('fondo', 'write')) with check (public.has_access('fondo', 'write'));
create policy "volunteer_expenses: delete" on public.volunteer_expenses for delete to authenticated
  using ((volunteer_id = public.current_profile_id() and reimbursed_at is null) or public.has_access('fondo', 'write'));

create policy "donations: read" on public.donations for select to authenticated using (public.has_access('fondo', 'read'));
create policy "sponsorships: read" on public.sponsorships for select to authenticated
  using (profile_id = public.current_profile_id() or public.has_access('fondo', 'read'));
create policy "sponsorships: update" on public.sponsorships for update to authenticated
  using (public.has_access('fondo', 'write')) with check (public.has_access('fondo', 'write'));

-- ---------------------------------------------------------------------------
-- 6. Public entry points (anon): only what the public pages show
-- ---------------------------------------------------------------------------
create or replace function public.public_reports(p_include_closed boolean default false, p_limit integer default 3000)
returns table (id uuid, category text, status text, source text, lat double precision, lon double precision,
               severity integer, observations integer, description text, photo_url text,
               created_at timestamptz, resolved_at timestamptz)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select r.id, r.category, r.status, r.source, st_y(r.geom::geometry), st_x(r.geom::geometry),
         r.severity, r.observations, r.description, r.photo_url, r.created_at, r.resolved_at
  from public.reports r
  where p_include_closed or r.status in ('open', 'in_progress')
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 5000);
$$;

create or replace function public.public_fleet()
returns table (online integer, total integer)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select count(*) filter (where d.last_seen_at > now() - interval '15 minutes')::integer, count(*)::integer
  from public.devices d where d.active;
$$;

-- Latest reading per POD in the last 3 hours, with a position (reading, else the device's).
create or replace function public.public_pod_readings()
returns table (device_id uuid, name text, ts timestamptz, lat double precision, lon double precision, metrics jsonb)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select distinct on (r.device_id) r.device_id, coalesce(d.label, d.name), r.ts,
         st_y(coalesce(r.geom, d.last_geom, d.fixed_geom)::geometry), st_x(coalesce(r.geom, d.last_geom, d.fixed_geom)::geometry), r.metrics
  from public.device_readings r join public.devices d on d.id = r.device_id
  where r.ts > now() - interval '3 hours' and coalesce(r.geom, d.last_geom, d.fixed_geom) is not null
  order by r.device_id, r.ts desc;
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
         (select coalesce(sum(hours), 0) from public.missions where status = 'verified'),
         (select coalesce(sum(kg_collected), 0) from public.missions where status = 'verified'),
         (select coalesce(sum(cardinality(caps)), 0)::integer from public.sponsorships where status = 'active');
$$;

create or replace function public.submit_citizen_report(p_category text, p_lat double precision, p_lon double precision,
                                                        p_description text default null, p_photo_url text default null)
returns table (id uuid, deduped boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_lat not between 44.9 and 45.2 or p_lon not between 7.45 and 7.9 then
    raise exception 'out_of_area' using errcode = '22023';
  end if;
  if not exists (select 1 from public.report_categories c where c.slug = p_category) then
    raise exception 'unknown_category' using errcode = '22023';
  end if;
  return query select * from public.ingest_report('citizen', null, p_category, p_lat, p_lon,
    nullif(left(trim(p_description), 500), ''), p_photo_url, 1, now(), '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- 7. POD entry points (anon): the key hash is the credential; every call is logged
-- ---------------------------------------------------------------------------
create or replace function public.pod_device_for(p_key_hash text)
returns table (device_id uuid, device_type text, key_prefix text)
language sql
security definer
set search_path = public, extensions
as $$
  update public.api_keys k set last_used_at = now()
  from public.devices d
  where k.key_hash = p_key_hash and k.revoked_at is null and d.id = k.device_id and d.active
  returning d.id, d.type, k.key_prefix;
$$;

create or replace function public.pod_log(p_key_hash text, p_key_prefix text, p_endpoint text, p_status integer, p_body jsonb, p_ip text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.api_request_log (device_id, key_prefix, endpoint, status, ip, body)
  select (select k.device_id from public.api_keys k where k.key_hash = p_key_hash and k.revoked_at is null limit 1),
         coalesce((select k.key_prefix from public.api_keys k where k.key_hash = p_key_hash limit 1), left(p_key_prefix, 14)),
         left(p_endpoint, 40), p_status, left(p_ip, 64), p_body;
$$;

create or replace function public.pod_touch(p_device_id uuid, p_lat double precision, p_lon double precision, p_battery numeric, p_firmware text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text; v_cat uuid;
begin
  update public.devices set last_seen_at = now(),
    last_geom = case when p_lat is not null and p_lon is not null then st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography else last_geom end,
    battery = coalesce(p_battery, battery), firmware = coalesce(nullif(p_firmware, ''), firmware)
  where id = p_device_id returning name into v_name;
  -- Low battery opens one Help desk ticket until it is resolved.
  if p_battery is not null and p_battery < 20 then
    select id into v_cat from public.ticket_categories where name = 'Batteria';
    if not exists (select 1 from public.tickets t where t.device_id = p_device_id and t.category_id = v_cat and t.status not in ('resolved', 'closed')) then
      insert into public.tickets (title, description, priority, category_id, requester_name, device_id)
      values ('Batteria bassa: ' || v_name, 'Livello batteria ' || round(p_battery) || '%.', 'high', v_cat, 'POD ' || v_name, p_device_id);
    end if;
  end if;
end $$;

create or replace function public.pod_report(p_key_hash text, p_category text, p_lat double precision, p_lon double precision,
  p_confidence numeric, p_captured_at timestamptz, p_description text, p_photo_url text, p_metadata jsonb, p_ip text, p_log_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dev uuid; v_type text; r record; res jsonb; st integer;
begin
  select f.device_id, f.device_type into v_dev, v_type from public.pod_device_for(p_key_hash) f;
  if v_dev is null then
    st := 401; res := jsonb_build_object('error', 'unauthorized');
  elsif not exists (select 1 from public.report_categories c where c.slug = p_category) then
    st := 422; res := jsonb_build_object('error', 'unknown_category');
  else
    select * into r from public.ingest_report('device', v_dev, p_category, p_lat, p_lon, p_description, p_photo_url,
      p_confidence, coalesce(p_captured_at, now()), coalesce(p_metadata, '{}'::jsonb));
    if v_type = 'mobile' then perform public.pod_touch(v_dev, p_lat, p_lon, null, null);
    else perform public.pod_touch(v_dev, null, null, null, null); end if;
    st := 201; res := jsonb_build_object('id', r.id, 'deduped', r.deduped);
  end if;
  perform public.pod_log(p_key_hash, null, 'reports', st, p_log_body, p_ip);
  return jsonb_build_object('status', st, 'body', res);
end $$;

create or replace function public.pod_readings(p_key_hash text, p_rows jsonb, p_ip text, p_log_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dev uuid; n integer := 0; last jsonb; st integer; res jsonb;
begin
  select f.device_id into v_dev from public.pod_device_for(p_key_hash) f;
  if v_dev is null then
    st := 401; res := jsonb_build_object('error', 'unauthorized');
  else
    insert into public.device_readings (device_id, ts, geom, metrics)
    select v_dev, coalesce((x->>'captured_at')::timestamptz, now()),
           case when x ? 'lat' and x ? 'lon' then st_setsrid(st_makepoint((x->>'lon')::float8, (x->>'lat')::float8), 4326)::geography end,
           x->'metrics'
    from jsonb_array_elements(p_rows) x;
    get diagnostics n = row_count;
    last := p_rows -> (jsonb_array_length(p_rows) - 1);
    perform public.pod_touch(v_dev, (last->>'lat')::float8, (last->>'lon')::float8, null, null);
    st := 201; res := jsonb_build_object('stored', n);
  end if;
  perform public.pod_log(p_key_hash, null, 'readings', st, p_log_body, p_ip);
  return jsonb_build_object('status', st, 'body', res);
end $$;

create or replace function public.pod_heartbeat(p_key_hash text, p_lat double precision, p_lon double precision, p_battery numeric,
  p_firmware text, p_metrics jsonb, p_ip text, p_log_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dev uuid; st integer; res jsonb; g geography;
begin
  select f.device_id into v_dev from public.pod_device_for(p_key_hash) f;
  if v_dev is null then
    st := 401; res := jsonb_build_object('error', 'unauthorized');
  else
    perform public.pod_touch(v_dev, p_lat, p_lon, p_battery, p_firmware);
    if p_lat is not null and p_lon is not null then
      g := st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography;
      insert into public.device_heartbeats (device_id, geom, battery) values (v_dev, g, p_battery);
    end if;
    if p_metrics is not null then
      insert into public.device_readings (device_id, geom, metrics) values (v_dev, g, p_metrics);
    end if;
    st := 200; res := jsonb_build_object('ok', true);
  end if;
  perform public.pod_log(p_key_hash, null, 'heartbeat', st, p_log_body, p_ip);
  return jsonb_build_object('status', st, 'body', res);
end $$;

-- Opens a ticket for every active POD silent for more than 30 minutes (called when the console opens).
create or replace function public.pod_open_offline_tickets()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cat uuid; n integer;
begin
  if not public.has_access('pod', 'read') then return 0; end if;
  select id into v_cat from public.ticket_categories where name = 'POD offline';
  insert into public.tickets (title, description, priority, category_id, requester_name, device_id)
  select 'POD offline: ' || d.name, 'Nessun contatto dal ' || to_char(d.last_seen_at at time zone 'Europe/Rome', 'DD/MM HH24:MI') || '.',
         'medium', v_cat, 'POD ' || d.name, d.id
  from public.devices d
  where d.active and d.last_seen_at is not null and d.last_seen_at < now() - interval '30 minutes'
    and not exists (select 1 from public.tickets t where t.device_id = d.id and t.category_id = v_cat and t.status not in ('resolved', 'closed'));
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Payment webhook entry point: the route proves itself with the Vault secret
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(p_secret text, p_kind text, p_session_id text, p_amount numeric,
  p_email text, p_name text, p_is_company boolean, p_sponsorship_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_secret is null or p_secret <> (select decrypted_secret from vault.decrypted_secrets where name = 'ts_payment_bridge') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_kind = 'donation' then
    insert into public.donations (stripe_session_id, amount, donor_email, donor_name, is_company)
    values (p_session_id, p_amount, p_email, p_name, coalesce(p_is_company, false))
    on conflict (stripe_session_id) do nothing;
  elsif p_kind = 'sponsorship' then
    update public.sponsorships set status = 'active', stripe_session_id = p_session_id, amount = p_amount,
      starts_on = current_date, ends_on = current_date + case plan when 'annuale' then 365 else 90 end
    where id = p_sponsorship_id and status = 'pending';
  else
    raise exception 'unknown_kind' using errcode = '22023';
  end if;
  return 'ok';
end $$;

-- Pending adoption created by the public checkout before payment (company signed in).
create or replace function public.create_pending_sponsorship(p_company text, p_caps text[], p_plan text)
returns uuid
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.sponsorships (profile_id, company_name, caps, plan)
  values (public.current_profile_id(), left(trim(p_company), 160), p_caps, case when p_plan = 'annuale' then 'annuale' else 'trimestrale' end)
  returning id;
$$;

-- ---------------------------------------------------------------------------
-- 9. Grants on entry points
-- ---------------------------------------------------------------------------
revoke all on function public.public_reports(boolean, integer), public.public_fleet(), public.public_pod_readings(), public.public_fund(),
  public.submit_citizen_report(text, double precision, double precision, text, text),
  public.pod_report(text, text, double precision, double precision, numeric, timestamptz, text, text, jsonb, text, jsonb),
  public.pod_readings(text, jsonb, text, jsonb),
  public.pod_heartbeat(text, double precision, double precision, numeric, text, jsonb, text, jsonb),
  public.pod_log(text, text, text, integer, jsonb, text),
  public.record_payment(text, text, text, numeric, text, text, boolean, uuid)
  from public;
grant execute on function public.public_reports(boolean, integer), public.public_fleet(), public.public_pod_readings(), public.public_fund(),
  public.submit_citizen_report(text, double precision, double precision, text, text),
  public.pod_report(text, text, double precision, double precision, numeric, timestamptz, text, text, jsonb, text, jsonb),
  public.pod_readings(text, jsonb, text, jsonb),
  public.pod_heartbeat(text, double precision, double precision, numeric, text, jsonb, text, jsonb),
  public.pod_log(text, text, text, integer, jsonb, text),
  public.record_payment(text, text, text, numeric, text, text, boolean, uuid)
  to anon, authenticated;
-- Internal helpers stay private.
revoke all on function public.pod_device_for(text), public.pod_touch(uuid, double precision, double precision, numeric, text),
  public.ingest_report(text, uuid, text, double precision, double precision, text, text, numeric, timestamptz, jsonb)
  from public, anon, authenticated;
revoke all on function public.create_pending_sponsorship(text, text[], text), public.pod_open_offline_tickets() from public, anon;
grant execute on function public.create_pending_sponsorship(text, text[], text), public.pod_open_offline_tickets() to authenticated;

-- Photos: anyone may upload images into the report bucket (size and type limited by the bucket).
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'report-photos';
drop policy if exists "report-photos: upload" on storage.objects;
create policy "report-photos: upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'report-photos');
