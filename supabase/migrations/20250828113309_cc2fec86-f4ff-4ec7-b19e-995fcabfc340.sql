
-- 1) Função e trigger de normalização
create or replace function public.normalize_lead_contact_fields()
returns trigger
language plpgsql
security invoker
as $$
begin
  -- Normaliza phone: remove tudo que não é dígito; vazio -> null
  new.normalized_phone := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');

  -- Normaliza email: lower + trim; vazio -> null
  new.normalized_email := nullif(lower(trim(coalesce(new.email, ''))), '');

  return new;
end;
$$;

drop trigger if exists trg_leads_normalize on public.leads;

create trigger trg_leads_normalize
before insert or update on public.leads
for each row
execute function public.normalize_lead_contact_fields();

-- 2) Backfill das colunas normalizadas para dados existentes
update public.leads
set
  normalized_phone = nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), ''),
  normalized_email = nullif(lower(trim(coalesce(email, ''))), '')
where
  (normalized_phone is distinct from nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), ''))
  or
  (normalized_email is distinct from nullif(lower(trim(coalesce(email, ''))), ''));

-- 3) Remoção de duplicados por (user_id, normalized_phone) mantendo o mais recente
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, normalized_phone
      order by created_at desc, id desc
    ) as rn
  from public.leads
  where normalized_phone is not null
)
delete from public.leads l
using ranked r
where l.id = r.id
  and r.rn > 1;

-- Remoção de duplicados por (user_id, normalized_email) mantendo o mais recente
with ranked_email as (
  select
    id,
    row_number() over (
      partition by user_id, normalized_email
      order by created_at desc, id desc
    ) as rn
  from public.leads
  where normalized_email is not null
)
delete from public.leads l
using ranked_email r
where l.id = r.id
  and r.rn > 1;

-- 4) Índices únicos usados pelo ON CONFLICT do webhook
-- Observação: não usar parcial aqui para permitir inferência do ON CONFLICT.
create unique index if not exists leads_user_normalized_phone_uniq
  on public.leads (user_id, normalized_phone);

create unique index if not exists leads_user_normalized_email_uniq
  on public.leads (user_id, normalized_email);

-- 5) Índice auxiliar para listagens por usuário
create index if not exists leads_user_created_at_idx
  on public.leads (user_id, created_at desc);
