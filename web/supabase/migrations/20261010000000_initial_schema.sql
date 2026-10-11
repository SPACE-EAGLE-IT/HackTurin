-- IAMAimpresa Kit — initial schema.
--
-- People, feature-based access control, projects, tasks and comments.
-- Conventions (see docs/DATABASE.md):
--   * everything lives in schema `public`, names are English snake_case;
--   * every table has `id uuid`, `created_at`, and `updated_at` where rows change;
--   * every table has Row Level Security enabled; policies call `has_access()`;
--   * the application never uses the service role: it reads and writes as the signed-in user.

-- ---------------------------------------------------------------------------
-- 1. Enumerated types
-- ---------------------------------------------------------------------------

create type public.access_level as enum ('none', 'read', 'write', 'admin');
create type public.project_status as enum ('active', 'paused', 'closed');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text unique,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is
  'People who can own or be assigned work. `user_id` links a profile to an auth user; people added by an admin have none until they sign up.';
comment on column public.profiles.is_admin is
  'Admins bypass feature access and manage the Access module. The first user who signs up becomes admin.';

create table public.features (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null,
  description text,
  default_level public.access_level not null default 'write',
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);
comment on table public.features is
  'Registry of application features (modules). Inserting a feature grants every profile its default level.';

create table public.feature_access (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  feature_key text not null references public.features (key) on delete cascade,
  level public.access_level not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, feature_key)
);
comment on table public.feature_access is 'One row per person per feature: the level that person holds on that feature.';

create sequence public.project_code_seq;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default 'PRJ-' || lpad(nextval('public.project_code_seq')::text, 3, '0'),
  name text not null check (length(trim(name)) between 1 and 160),
  client_name text,
  status public.project_status not null default 'active',
  owner_id uuid references public.profiles (id) on delete set null,
  due_date date,
  budget_hours numeric(8, 2) check (budget_hours is null or budget_hours >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.projects is 'Projects (commesse): the unit of work tasks are grouped under.';

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  project_id uuid references public.projects (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  estimated_hours numeric(6, 2) check (estimated_hours is null or estimated_hours >= 0),
  position integer not null default 0,
  tags text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.tasks is 'Units of work. Only `title` is required: every other column has a default or is optional.';
comment on column public.tasks.position is 'Manual order inside a board column (lower comes first).';

create index tasks_status_idx on public.tasks (status);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_due_date_idx on public.tasks (due_date);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index task_comments_task_id_idx on public.task_comments (task_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. Functions
-- ---------------------------------------------------------------------------

-- Keeps `updated_at` honest on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- The profile of the signed-in user, or null.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.user_id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = (select auth.uid())), false);
$$;

-- Orders access levels so they can be compared.
create or replace function public.access_rank(level public.access_level)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case level when 'none' then 0 when 'read' then 1 when 'write' then 2 when 'admin' then 3 end;
$$;

-- True when the signed-in user holds at least `required` on `feature`. Admins always pass.
-- This is the single function every policy and every server action relies on.
create or replace function public.has_access(feature text, required public.access_level default 'read')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or coalesce((
        select public.access_rank(fa.level) >= public.access_rank(required)
        from public.feature_access fa
        join public.profiles p on p.id = fa.profile_id
        where p.user_id = (select auth.uid())
          and fa.feature_key = feature
      ), false);
$$;

-- A new feature is born with an access row for every existing profile.
create or replace function public.grant_feature_to_all_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.feature_access (profile_id, feature_key, level)
  select p.id, new.key, case when p.is_admin then 'admin'::public.access_level else new.default_level end
  from public.profiles p
  on conflict do nothing;
  return new;
end;
$$;

-- A new profile receives an access row for every existing feature.
create or replace function public.grant_all_features_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.feature_access (profile_id, feature_key, level)
  select new.id, f.key, case when new.is_admin then 'admin'::public.access_level else f.default_level end
  from public.features f
  on conflict do nothing;
  return new;
end;
$$;

-- Only admins may change the admin flag.
create or replace function public.guard_admin_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'only admins can change the admin flag' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- When someone signs up: link the auth user to a profile an admin created with the same e-mail,
-- or create a new profile. The first person to sign up becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_first_user boolean;
begin
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  v_first_user := not exists (select 1 from public.profiles where is_admin);

  update public.profiles
  set user_id = new.id,
      is_admin = is_admin or v_first_user,
      updated_at = now()
  where email = new.email
    and user_id is null;

  if not found then
    insert into public.profiles (user_id, full_name, email, is_admin)
    values (new.id, v_full_name, new.email, v_first_user);
  end if;

  return new;
end;
$$;

-- `completed_at` follows the status.
create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger feature_access_set_updated_at before update on public.feature_access
  for each row execute function public.set_updated_at();

create trigger profiles_guard_admin_flag before update on public.profiles
  for each row execute function public.guard_admin_flag();
create trigger profiles_grant_features after insert on public.profiles
  for each row execute function public.grant_all_features_to_profile();
create trigger features_grant_profiles after insert on public.features
  for each row execute function public.grant_feature_to_all_profiles();
create trigger tasks_set_completed_at before insert or update of status on public.tasks
  for each row execute function public.set_task_completed_at();

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Application features
-- ---------------------------------------------------------------------------
-- The registry the navigation and the access rows are built from. A new module adds its row here
-- (in its own migration); the trigger above grants every profile the default level.

insert into public.features (key, name, description, default_level, sort_order) values
  ('dashboard', 'Dashboard', 'Overview of open work and deadlines.', 'read', 10),
  ('tasks', 'Task', 'Tasks: list, board and detail.', 'write', 20),
  ('projects', 'Commesse', 'Projects that group tasks.', 'write', 30),
  ('access', 'Accessi', 'Who can see and do what, per feature.', 'none', 40);

-- ---------------------------------------------------------------------------
-- 6. Privileges and Row Level Security
-- ---------------------------------------------------------------------------

-- Nothing is readable without a session: the anonymous role gets no privileges at all.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter table public.profiles enable row level security;
alter table public.features enable row level security;
alter table public.feature_access enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

-- profiles: everyone signed in can see people (needed to assign work); you edit yourself; admins edit anyone.
create policy "profiles: signed-in users can read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: users update their own row" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "profiles: admins manage" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- features and feature_access: readable by all (the navigation depends on them), managed by admins.
create policy "features: signed-in users can read" on public.features
  for select to authenticated using (true);
create policy "features: admins manage" on public.features
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "feature_access: signed-in users can read" on public.feature_access
  for select to authenticated using (true);
create policy "feature_access: admins manage" on public.feature_access
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- projects: gated by the `projects` feature.
create policy "projects: read" on public.projects
  for select to authenticated using (public.has_access('projects', 'read'));
create policy "projects: insert" on public.projects
  for insert to authenticated with check (public.has_access('projects', 'write'));
create policy "projects: update" on public.projects
  for update to authenticated
  using (public.has_access('projects', 'write')) with check (public.has_access('projects', 'write'));
create policy "projects: delete" on public.projects
  for delete to authenticated using (public.has_access('projects', 'write'));

-- tasks: gated by the `tasks` feature.
create policy "tasks: read" on public.tasks
  for select to authenticated using (public.has_access('tasks', 'read'));
create policy "tasks: insert" on public.tasks
  for insert to authenticated with check (public.has_access('tasks', 'write'));
create policy "tasks: update" on public.tasks
  for update to authenticated
  using (public.has_access('tasks', 'write')) with check (public.has_access('tasks', 'write'));
create policy "tasks: delete" on public.tasks
  for delete to authenticated using (public.has_access('tasks', 'write'));

-- task_comments: read with tasks; write your own.
create policy "task_comments: read" on public.task_comments
  for select to authenticated using (public.has_access('tasks', 'read'));
create policy "task_comments: insert own" on public.task_comments
  for insert to authenticated
  with check (public.has_access('tasks', 'write') and author_id = public.current_profile_id());
create policy "task_comments: update own" on public.task_comments
  for update to authenticated
  using (author_id = public.current_profile_id()) with check (author_id = public.current_profile_id());
create policy "task_comments: delete own or admin" on public.task_comments
  for delete to authenticated using (author_id = public.current_profile_id() or public.is_admin());
