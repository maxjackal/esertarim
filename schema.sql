-- Defter detayının sadece ilgili deftere ait kayıtları listeleyebilmesi için
-- ledger_entries.ledger_id alanı dolu ve ledgers.id alanına bağlı olmalıdır.

alter table if exists public.ledger_entries
  add column if not exists ledger_id bigint;

insert into public.ledgers (buyer_id)
select distinct le.buyer_id
from public.ledger_entries le
where le.buyer_id is not null
  and not exists (
    select 1
    from public.ledgers l
    where l.buyer_id = le.buyer_id
  );

update public.ledger_entries le
set ledger_id = l.id
from public.ledgers l
where le.ledger_id is null
  and le.buyer_id = l.buyer_id;

with canonical_ledgers as (
  select buyer_id, min(id) as keep_id
  from public.ledgers
  where buyer_id is not null
  group by buyer_id
),
duplicate_ledgers as (
  select l.id, c.keep_id
  from public.ledgers l
  join canonical_ledgers c on c.buyer_id = l.buyer_id
  where l.id <> c.keep_id
)
update public.ledger_entries le
set ledger_id = d.keep_id
from duplicate_ledgers d
where le.ledger_id = d.id;

with canonical_ledgers as (
  select buyer_id, min(id) as keep_id
  from public.ledgers
  where buyer_id is not null
  group by buyer_id
),
duplicate_ledgers as (
  select l.id
  from public.ledgers l
  join canonical_ledgers c on c.buyer_id = l.buyer_id
  where l.id <> c.keep_id
)
delete from public.ledgers l
using duplicate_ledgers d
where l.id = d.id;

create unique index if not exists ledgers_buyer_id_unique
  on public.ledgers (buyer_id);

create index if not exists ledger_entries_ledger_id_idx
  on public.ledger_entries (ledger_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ledger_entries_ledger_id_fkey'
  ) then
    alter table public.ledger_entries
      add constraint ledger_entries_ledger_id_fkey
      foreign key (ledger_id)
      references public.ledgers(id)
      on delete restrict;
  end if;
end $$;

alter table if exists public.ledger_entries
  alter column ledger_id set not null;
