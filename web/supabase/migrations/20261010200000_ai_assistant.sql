-- IAMAimpresa Kit — the AI assistant.
--
-- Adds the `ai` feature, the provider settings (API key kept in Supabase Vault), conversations,
-- messages and the call log. Rules: the assistant reads through the user's own session (RLS) and
-- proposes actions that the person confirms; every call to a paid model leaves a row in `ai_calls`.

-- ---------------------------------------------------------------------------
-- 1. Feature
-- ---------------------------------------------------------------------------

insert into public.features (key, name, description, default_level, sort_order)
values ('ai', 'Assistente', 'Chat that reads your data and proposes actions.', 'write', 50)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Provider settings — one row, API key in Vault
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'supabase_vault')
     and not exists (select 1 from pg_extension where extname = 'supabase_vault') then
    create extension supabase_vault with schema vault;
  end if;
end;
$$;

create table public.ai_settings (
  id smallint primary key default 1 check (id = 1),
  provider text not null check (provider in ('anthropic', 'openai', 'google', 'openai_compatible')),
  model text not null check (length(trim(model)) between 1 and 120),
  base_url text,
  secret_id uuid not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
comment on table public.ai_settings is
  'Which model the assistant uses. The API key lives in Vault (`secret_id`); the table is reachable only through the RPCs below.';

alter table public.ai_settings enable row level security;
revoke all on public.ai_settings from anon, authenticated;

-- Saves provider, model, base URL and (when given) the API key. Admins only.
create or replace function public.ai_settings_save(p_provider text, p_model text, p_base_url text, p_api_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'only admins can configure the assistant' using errcode = '42501';
  end if;
  select id into v_profile_id from public.profiles where user_id = (select auth.uid());
  select secret_id into v_secret_id from public.ai_settings where id = 1;

  if v_secret_id is null then
    if coalesce(p_api_key, '') = '' then
      raise exception 'an API key is required the first time';
    end if;
    v_secret_id := vault.create_secret(p_api_key, 'ai_provider_api_key', 'API key of the AI provider used by the assistant');
    insert into public.ai_settings (id, provider, model, base_url, secret_id, updated_by)
    values (1, p_provider, p_model, nullif(trim(p_base_url), ''), v_secret_id, v_profile_id);
  else
    if coalesce(p_api_key, '') <> '' then
      perform vault.update_secret(v_secret_id, p_api_key);
    end if;
    update public.ai_settings
    set provider = p_provider, model = p_model, base_url = nullif(trim(p_base_url), ''), updated_by = v_profile_id, updated_at = now()
    where id = 1;
  end if;
end;
$$;

-- What is configured, without the key. No row = not configured or no access.
create or replace function public.ai_settings_status()
returns table (provider text, model text, base_url text, updated_at timestamptz, updated_by_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.provider, s.model, s.base_url, s.updated_at, p.full_name
  from public.ai_settings s
  left join public.profiles p on p.id = s.updated_by
  where s.id = 1 and public.has_access('ai', 'read');
$$;

-- The configuration with the decrypted key, for the server that runs the chat.
-- Anyone allowed to use the assistant can call this: the key is shared with the team by design.
-- For a public deployment set AI_PROVIDER / AI_MODEL / AI_API_KEY in the environment instead (docs/AI.md).
create or replace function public.ai_settings_for_chat()
returns table (provider text, model text, base_url text, api_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.provider, s.model, s.base_url, d.decrypted_secret
  from public.ai_settings s
  join vault.decrypted_secrets d on d.id = s.secret_id
  where s.id = 1 and public.has_access('ai', 'read');
$$;

revoke all on function public.ai_settings_save(text, text, text, text) from anon, public;
revoke all on function public.ai_settings_status() from anon, public;
revoke all on function public.ai_settings_for_chat() from anon, public;
grant execute on function public.ai_settings_save(text, text, text, text) to authenticated;
grant execute on function public.ai_settings_status() to authenticated;
grant execute on function public.ai_settings_for_chat() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Conversations, messages, call log
-- ---------------------------------------------------------------------------

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Nuova conversazione' check (length(trim(title)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_profile_id_idx on public.ai_conversations (profile_id, updated_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
comment on column public.ai_messages.parts is 'The message parts as the UI renders them (text, tool calls, proposals).';
create index ai_messages_conversation_id_idx on public.ai_messages (conversation_id, created_at);

create table public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now()
);
comment on table public.ai_calls is 'Every call to a paid model leaves a row: who, which model, how many tokens.';
create index ai_calls_created_at_idx on public.ai_calls (created_at desc);

create trigger ai_conversations_set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

-- Keeps the conversation's `updated_at` in step with its last message.
create or replace function public.touch_ai_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.ai_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
create trigger ai_messages_touch_conversation after insert on public.ai_messages
  for each row execute function public.touch_ai_conversation();

-- ---------------------------------------------------------------------------
-- 4. Privileges and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on public.ai_conversations, public.ai_messages, public.ai_calls from anon;
grant select, insert, update, delete on public.ai_conversations, public.ai_messages, public.ai_calls to authenticated;

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_calls enable row level security;

create policy "ai_conversations: own, with access" on public.ai_conversations
  for all to authenticated
  using (profile_id = public.current_profile_id() and public.has_access('ai', 'read'))
  with check (profile_id = public.current_profile_id() and public.has_access('ai', 'read'));

create policy "ai_messages: own conversations" on public.ai_messages
  for all to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.profile_id = public.current_profile_id()))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.profile_id = public.current_profile_id()));

create policy "ai_calls: insert own" on public.ai_calls
  for insert to authenticated with check (profile_id = public.current_profile_id());
create policy "ai_calls: read own or admin" on public.ai_calls
  for select to authenticated using (profile_id = public.current_profile_id() or public.is_admin());
