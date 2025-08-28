
-- 1) Normalization helpers
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select case when p is null then null else regexp_replace(p, '[^0-9]+', '', 'g') end
$$;

create or replace function public.normalize_email(e text)
returns text
language sql
immutable
as $$
  select case when e is null then null else lower(trim(e)) end
$$;

-- 2) Trigger to set normalized fields
create or replace function public.trg_leads_set_normalized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.normalized_phone := public.normalize_phone(new.phone);
  new.normalized_email := public.normalize_email(new.email);
  return new;
end;
$$;

drop trigger if exists trg_leads_set_normalized on public.leads;

create trigger trg_leads_set_normalized
before insert or update on public.leads
for each row
execute function public.trg_leads_set_normalized();

-- 3) Backfill normalized columns for existing rows
update public.leads
set
  normalized_phone = public.normalize_phone(phone),
  normalized_email = public.normalize_email(email)
where
  normalized_phone is distinct from public.normalize_phone(phone)
  or normalized_email is distinct from public.normalize_email(email);

-- 4) Deduplicate by (user_id, normalized_phone)
with d as (
  select id,
         row_number() over (partition by user_id, normalized_phone order by created_at desc, id) as rn
  from public.leads
  where normalized_phone is not null
)
delete from public.leads l
using d
where l.id = d.id and d.rn > 1;

-- 5) Deduplicate by (user_id, normalized_email)
with d as (
  select id,
         row_number() over (partition by user_id, normalized_email order by created_at desc, id) as rn
  from public.leads
  where normalized_email is not null
)
delete from public.leads l
using d
where l.id = d.id and d.rn > 1;

-- 6) Recreate unique indexes to support ON CONFLICT properly

-- phone: unique for all non-null normalized_phone
drop index if exists idx_leads_user_phone_unique;
create unique index idx_leads_user_phone_unique
  on public.leads (user_id, normalized_phone)
  where normalized_phone is not null;

-- email: unique for all non-null normalized_email (remove extra condition)
drop index if exists idx_leads_user_email_unique;
create unique index idx_leads_user_email_unique
  on public.leads (user_id, normalized_email)
  where normalized_email is not null;

-- 7) Optional performance index for listings
create index if not exists idx_leads_user_created
  on public.leads (user_id, created_at desc);
