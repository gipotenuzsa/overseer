create table public.results (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users not null,
  score integer not null
);
alter table public.results enable row level security;
create policy "Users read their results" on public.results for select using (auth.uid() = owner_id);
create policy "Users add their results" on public.results for insert with check (auth.uid() = owner_id);
