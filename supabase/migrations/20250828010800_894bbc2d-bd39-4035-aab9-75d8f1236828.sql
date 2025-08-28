
-- 1) Tabela para gerenciar instâncias do WhatsApp (Evolution) por usuário
create table if not exists public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  last_status text,
  evolution_instance_id text,
  number text,
  owner_jid text,
  profile_name text,
  metadata jsonb not null default '{}'::jsonb,
  shared_with_users uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_instances_owner_name_unique unique (user_id, name)
);

-- 2) Habilitar RLS
alter table public.whatsapp_instances enable row level security;

-- 3) Políticas de RLS
-- Leitura: dono OU qualquer usuário compartilhado em shared_with_users
create policy "Users can read their own or shared instances"
on public.whatsapp_instances
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = any(shared_with_users)
);

-- Inserção: somente o dono (user_id = auth.uid())
create policy "Users can insert their own instances"
on public.whatsapp_instances
for insert
to authenticated
with check (
  user_id = auth.uid()
);

-- Atualização: somente o dono
create policy "Users can update their own instances"
on public.whatsapp_instances
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Exclusão: somente o dono
create policy "Users can delete their own instances"
on public.whatsapp_instances
for delete
to authenticated
using (auth.uid() = user_id);

-- 4) Trigger para manter updated_at
drop trigger if exists set_updated_at_on_whatsapp_instances on public.whatsapp_instances;

create trigger set_updated_at_on_whatsapp_instances
before update on public.whatsapp_instances
for each row
execute function public.update_updated_at_column();
