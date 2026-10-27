-- Golfscore: opslag in de cloud (Supabase).
-- Plak dit één keer in Supabase → SQL Editor → New query → Run.
--
-- Per gebruiker één document met alle gegevens van de app (spelers, banen,
-- lopende ronde, historie, geleerde woorden). De Claude API-sleutel gaat nooit mee.

create table if not exists public.golf_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Iedere gebruiker ziet en wijzigt alleen zijn eigen gegevens.
alter table public.golf_state enable row level security;

drop policy if exists "eigen gegevens lezen" on public.golf_state;
create policy "eigen gegevens lezen" on public.golf_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "eigen gegevens toevoegen" on public.golf_state;
create policy "eigen gegevens toevoegen" on public.golf_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "eigen gegevens wijzigen" on public.golf_state;
create policy "eigen gegevens wijzigen" on public.golf_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "eigen gegevens verwijderen" on public.golf_state;
create policy "eigen gegevens verwijderen" on public.golf_state
  for delete to authenticated using ((select auth.uid()) = user_id);
