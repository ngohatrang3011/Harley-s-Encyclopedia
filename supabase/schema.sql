-- Polymath sync schema. Run once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- One row per synced record: an entry (coll = 'items'), a keyword ('keywords'),
-- or a library mark ('status', 'done', 'liked', 'custom'). Deletions are kept
-- as tombstones (deleted = true) so other devices learn about them.

create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  coll       text        not null check (coll in ('items', 'keywords', 'status', 'done', 'liked', 'custom')),
  id         text        not null check (char_length(id) between 1 and 2048),
  data       jsonb       check (data is null or octet_length(data::text) <= 200000),
  deleted    boolean     not null default false,
  m          bigint      not null,               -- when the change was made, in ms (client clock)
  updated_at timestamptz not null default now(), -- when the server stored it; used for pulls
  primary key (user_id, coll, id)
);

create index if not exists records_user_updated_idx on public.records (user_id, updated_at);

-- Each person can only see and write their own rows.
alter table public.records enable row level security;

drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;

create policy "records_select_own" on public.records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "records_insert_own" on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "records_update_own" on public.records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Newest change wins: ignore an update older than what's stored, and stamp
-- every accepted write with the server time.
create or replace function public.records_newest_wins()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.m < old.m then
    return null;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_newest_wins on public.records;
create trigger records_newest_wins
  before insert or update on public.records
  for each row execute function public.records_newest_wins();

-- Anonymous visitors get nothing; signed-in users get exactly what the policies allow.
revoke all on public.records from anon;
grant select, insert, update on public.records to authenticated;
