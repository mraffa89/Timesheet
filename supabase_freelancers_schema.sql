-- Schema do Supabase para Prestadores de Serviço (Freelancers) e Demandas
-- Execute este script no SQL Editor do seu projeto Supabase caso deseje persistir no banco em nuvem.

-- 1. Tabela de Freelancers / Prestadores de Serviço
create table if not exists public.freelancers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  username text not null unique,
  password text not null,
  hourly_rate numeric default 0,
  specialty text,
  pix_key text,
  phone text,
  allowed_tabs jsonb default '["freelancer-tasks"]'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabela de Demandas / Tarefas dos Freelancers
create table if not exists public.freelancer_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  freelancer_id uuid references public.freelancers(id) on delete set null,
  client_id text,
  category text default 'Digital',
  request_date date,
  expected_due_date date,
  actual_delivery_date date,
  hours numeric default 0,
  briefing_url text,
  notes text,
  status text default 'pending', -- 'pending', 'in_progress', 'delivered', 'paid'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS ou políticas públicas de acesso caso o anon key seja utilizado diretamente
alter table public.freelancers enable row level security;
alter table public.freelancer_tasks enable row level security;

create policy "Acesso público anônimo a freelancers" on public.freelancers
  for all using (true) with check (true);

create policy "Acesso público anônimo a freelancer_tasks" on public.freelancer_tasks
  for all using (true) with check (true);
