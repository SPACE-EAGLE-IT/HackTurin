-- IAMAimpresa Kit — the Help desk.
--
-- Tickets with a code, configurable categories, a conversation of replies and internal notes,
-- and a bridge to the Task module (a task created from a ticket keeps the reference, not a copy).

-- ---------------------------------------------------------------------------
-- 1. Feature and types
-- ---------------------------------------------------------------------------

insert into public.features (key, name, description, default_level, sort_order)
values ('help_desk', 'Help desk', 'Tickets: requests, problems and questions, with their conversation.', 'write', 25)
on conflict (key) do nothing;

create type public.ticket_status as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.ticket_message_kind as enum ('reply', 'note');

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

create table public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 60),
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.ticket_categories is 'The kinds of ticket a team handles. Managed from the Help desk settings; inactive ones are kept for old tickets.';

create sequence public.ticket_code_seq;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default 'HD-' || lpad(nextval('public.ticket_code_seq')::text, 4, '0'),
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'medium',
  category_id uuid references public.ticket_categories (id) on delete set null,
  requester_id uuid references public.profiles (id) on delete set null,
  requester_name text check (requester_name is null or length(trim(requester_name)) between 1 and 120),
  requester_email text check (requester_email is null or length(requester_email) <= 254),
  assignee_id uuid references public.profiles (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.tickets is 'A request from someone, inside or outside the team. `requester_id` for a person of the team, `requester_name`/`requester_email` otherwise.';
comment on column public.tickets.task_id is 'The task created from this ticket, when any: a reference, never a copy.';

create index tickets_status_idx on public.tickets (status);
create index tickets_assignee_id_idx on public.tickets (assignee_id);
create index tickets_category_id_idx on public.tickets (category_id);
create index tickets_requester_id_idx on public.tickets (requester_id);
create index tickets_created_at_idx on public.tickets (created_at desc);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind public.ticket_message_kind not null default 'reply',
  body text not null check (length(trim(body)) between 1 and 8000),
  created_at timestamptz not null default now()
);
comment on column public.ticket_messages.kind is '`reply` is for the requester; `note` is internal to the team.';
create index ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. Functions and triggers
-- ---------------------------------------------------------------------------

-- The timestamps follow the status: resolved_at and closed_at are set on the way in and cleared on reopening.
create or replace function public.set_ticket_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'resolved' and (tg_op = 'INSERT' or old.status is distinct from 'resolved') then
    new.resolved_at := now();
  end if;
  if new.status = 'closed' and (tg_op = 'INSERT' or old.status is distinct from 'closed') then
    new.closed_at := now();
    new.resolved_at := coalesce(new.resolved_at, now());
  end if;
  if new.status in ('open', 'in_progress', 'waiting') then
    new.resolved_at := null;
    new.closed_at := null;
  end if;
  return new;
end;
$$;

-- A message keeps the ticket fresh; the first reply by someone other than the requester marks the first response.
create or replace function public.touch_ticket_on_message()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.tickets
  set updated_at = now(),
      first_response_at = case
        when first_response_at is null and new.kind = 'reply' and new.author_id is distinct from requester_id then now()
        else first_response_at
      end
  where id = new.ticket_id;
  return new;
end;
$$;

create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();
create trigger tickets_set_timestamps before insert or update of status on public.tickets
  for each row execute function public.set_ticket_timestamps();
create trigger ticket_messages_touch_ticket after insert on public.ticket_messages
  for each row execute function public.touch_ticket_on_message();

-- ---------------------------------------------------------------------------
-- 4. Default categories
-- ---------------------------------------------------------------------------

insert into public.ticket_categories (name, description, sort_order) values
  ('Richiesta', 'Something new to do or to provide.', 10),
  ('Problema', 'Something that does not work.', 20),
  ('Domanda', 'Information or guidance.', 30),
  ('Accesso', 'Accounts, permissions, credentials.', 40)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on public.ticket_categories, public.tickets, public.ticket_messages from anon;
revoke all on sequence public.ticket_code_seq from anon;
grant select, insert, update, delete on public.ticket_categories, public.tickets, public.ticket_messages to authenticated;
grant usage, select on sequence public.ticket_code_seq to authenticated;

alter table public.ticket_categories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

create policy "ticket_categories: read" on public.ticket_categories
  for select to authenticated using (public.has_access('help_desk', 'read'));
create policy "ticket_categories: manage" on public.ticket_categories
  for all to authenticated
  using (public.has_access('help_desk', 'admin')) with check (public.has_access('help_desk', 'admin'));

create policy "tickets: read" on public.tickets
  for select to authenticated using (public.has_access('help_desk', 'read'));
create policy "tickets: insert" on public.tickets
  for insert to authenticated with check (public.has_access('help_desk', 'write'));
create policy "tickets: update" on public.tickets
  for update to authenticated
  using (public.has_access('help_desk', 'write')) with check (public.has_access('help_desk', 'write'));
create policy "tickets: delete" on public.tickets
  for delete to authenticated using (public.has_access('help_desk', 'write'));

create policy "ticket_messages: read" on public.ticket_messages
  for select to authenticated using (public.has_access('help_desk', 'read'));
create policy "ticket_messages: insert own" on public.ticket_messages
  for insert to authenticated
  with check (public.has_access('help_desk', 'write') and author_id = public.current_profile_id());
create policy "ticket_messages: delete own or admin" on public.ticket_messages
  for delete to authenticated using (author_id = public.current_profile_id() or public.is_admin());
