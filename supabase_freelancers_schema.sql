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
  payment_id text,
  payment_date timestamp with time zone,
  payment_value numeric,
  payment_receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Migrações incrementais caso a tabela já exista
ALTER TABLE public.freelancer_tasks ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.freelancer_tasks ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone;
ALTER TABLE public.freelancer_tasks ADD COLUMN IF NOT EXISTS payment_value numeric;
ALTER TABLE public.freelancer_tasks ADD COLUMN IF NOT EXISTS payment_receipt_url text;

-- 3. Desativar RLS para permitir leitura e escrita públicas anônimas
-- (Padrão idêntico ao já utilizado nas tabelas clients e entries do sistema)
ALTER TABLE public.freelancers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_tasks DISABLE ROW LEVEL SECURITY;

-- Caso prefira manter o RLS ativado no Supabase, execute as políticas permissivas abaixo:
/*
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público anônimo a freelancers" ON public.freelancers;
DROP POLICY IF EXISTS "Acesso público anônimo a freelancer_tasks" ON public.freelancer_tasks;

CREATE POLICY "Acesso público anônimo a freelancers" ON public.freelancers
  FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso público anônimo a freelancer_tasks" ON public.freelancer_tasks
  FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
*/
