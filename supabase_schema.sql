-- SCRIPT DE BANCO DE DADOS SUPABASE (PROJETO: mhbraffa)
-- Cole este script no "SQL Editor" do seu Supabase para criar as tabelas necessárias.

-- 1. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    cnpj TEXT,
    phone TEXT,
    address TEXT,
    contract_type TEXT NOT NULL DEFAULT 'hybrid', -- 'fixed' (Fee Fixo), 'hourly' (Por Hora), 'hybrid' (Misto)
    fixed_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hours_included NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migração caso a tabela já exista:
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS additional_email TEXT;

-- 2. Criar tabela de lançamentos de tempo (timesheet)
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    request_date DATE NOT NULL,
    delivery_date DATE,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Digital',
    requester TEXT NOT NULL,
    hours NUMERIC(10, 2) NOT NULL,
    job_link TEXT,
    billable BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'Finalizado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar acesso livre/anônimo para leitura e gravação simplificada (ou desativar RLS nas tabelas)
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries DISABLE ROW LEVEL SECURITY;

-- Opcional: Se quiser manter o RLS ativado, execute as políticas de acesso abaixo para público/anon:
/*
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total público para Clientes" ON public.clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total público para Lançamentos" ON public.entries FOR ALL TO anon USING (true) WITH CHECK (true);
*/
