-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Create user_integrations table
create table if not exists public.user_integrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('spotify', 'apple_music')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure one integration per provider per user
  unique(user_id, provider)
);

-- RLS Policies
alter table public.user_integrations enable row level security;

-- Users can read their own integrations
create policy "Users can view own integrations"
  on public.user_integrations for select
  using (auth.uid() = user_id);

-- Users can insert their own integrations
create policy "Users can insert own integrations"
  on public.user_integrations for insert
  with check (auth.uid() = user_id);

-- Users can update their own integrations
create policy "Users can update own integrations"
  on public.user_integrations for update
  using (auth.uid() = user_id);

-- Users can delete their own integrations
create policy "Users can delete own integrations"
  on public.user_integrations for delete
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger handle_updated_at
  before update on public.user_integrations
  for each row
  execute procedure public.handle_updated_at();

