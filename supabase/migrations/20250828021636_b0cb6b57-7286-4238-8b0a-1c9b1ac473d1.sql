
-- 1) Função de normalização de telefone e email
create or replace function public.leads_normalize_contact_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Normaliza telefone: remove tudo que não é dígito
  if new.phone is null or new.phone = '' then
    new.normalized_phone := null;
  else
    new.normalized_phone := regexp_replace(new.phone, '\D', '', 'g');
  end if;

  -- Normaliza email: lower + trim
  if new.email is null or new.email = '' then
    new.normalized_email := null;
  else
    new.normalized_email := lower(trim(new.email));
  end if;

  return new;
end;
$$;

-- 2) Trigger BEFORE INSERT/UPDATE para normalização
drop trigger if exists trg_leads_normalize on public.leads;
create trigger trg_leads_normalize
before insert or update on public.leads
for each row execute function public.leads_normalize_contact_fields();

-- 3) Backfill dos campos normalizados
update public.leads
set
  normalized_phone = case
    when phone is null or phone = '' then null
    else regexp_replace(phone, '\D', '', 'g')
  end,
  normalized_email = case
    when email is null or email = '' then null
    else lower(trim(email))
  end
where
  (phone is not null and phone <> '')
  or (email is not null and email <> '');

-- 4) Índices únicos por usuário (idempotência por contato)
-- Observação: se existir duplicidade real, a criação do índice pode falhar.
-- Em caso de erro, vamos remover duplicados no próximo passo de código.
create unique index if not exists leads_user_normalized_phone_uniq
  on public.leads (user_id, normalized_phone)
  where normalized_phone is not null;

create unique index if not exists leads_user_normalized_email_uniq
  on public.leads (user_id, normalized_email)
  where normalized_email is not null;

-- 5) Índice auxiliar para consultas por usuário e data
create index if not exists leads_user_created_at_idx
  on public.leads (user_id, created_at desc);
