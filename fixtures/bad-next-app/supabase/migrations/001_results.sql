create table public.results (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users not null,
  score integer not null
);
