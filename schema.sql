-- Defterler alıcı + ürün bazında tutulur.
-- Örn: "Selamet 2 / Karayemiş" ve "Selamet 2 / Kiraz" ayrı defterlerdir.

alter table if exists public.ledgers
  add column if not exists product_id bigint;

alter table if exists public.ledgers
  add column if not exists title text;

update public.ledgers l
set title = concat_ws(' / ', b.name, p.name)
from public.buyers b, public.products p
where l.buyer_id = b.id
  and l.product_id = p.id
  and nullif(trim(coalesce(l.title, '')), '') is null;

update public.ledgers
set title = concat('Defter #', id)
where nullif(trim(coalesce(title, '')), '') is null;

alter table if exists public.ledgers
  alter column title set not null;

alter table if exists public.ledger_entries
  add column if not exists ledger_id bigint;

insert into public.ledgers (buyer_id, product_id, title)
select distinct le.buyer_id, le.product_id, concat_ws(' / ', b.name, p.name)
from public.ledger_entries le
left join public.buyers b on b.id = le.buyer_id
left join public.products p on p.id = le.product_id
where le.buyer_id is not null
  and le.product_id is not null
  and not exists (
    select 1
    from public.ledgers l
    where l.buyer_id = le.buyer_id
      and l.product_id = le.product_id
  );

update public.ledger_entries le
set ledger_id = l.id
from public.ledgers l
where le.buyer_id = l.buyer_id
  and le.product_id = l.product_id;

with canonical_ledgers as (
  select buyer_id, product_id, min(id) as keep_id
  from public.ledgers
  where buyer_id is not null
    and product_id is not null
  group by buyer_id, product_id
),
duplicate_ledgers as (
  select l.id, c.keep_id
  from public.ledgers l
  join canonical_ledgers c
    on c.buyer_id = l.buyer_id
   and c.product_id = l.product_id
  where l.id <> c.keep_id
)
update public.ledger_entries le
set ledger_id = d.keep_id
from duplicate_ledgers d
where le.ledger_id = d.id;

with canonical_ledgers as (
  select buyer_id, product_id, min(id) as keep_id
  from public.ledgers
  where buyer_id is not null
    and product_id is not null
  group by buyer_id, product_id
),
duplicate_ledgers as (
  select l.id
  from public.ledgers l
  join canonical_ledgers c
    on c.buyer_id = l.buyer_id
   and c.product_id = l.product_id
  where l.id <> c.keep_id
)
delete from public.ledgers l
using duplicate_ledgers d
where l.id = d.id;

delete from public.ledgers l
where l.product_id is null
  and not exists (
    select 1
    from public.ledger_entries le
    where le.ledger_id = l.id
  );

drop index if exists public.ledgers_buyer_id_unique;

create unique index if not exists ledgers_buyer_product_unique
  on public.ledgers (buyer_id, product_id);

create index if not exists ledgers_product_id_idx
  on public.ledgers (product_id);

create index if not exists ledger_entries_ledger_id_idx
  on public.ledger_entries (ledger_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ledgers_product_id_fkey'
  ) then
    alter table public.ledgers
      add constraint ledgers_product_id_fkey
      foreign key (product_id)
      references public.products(id)
      on delete restrict;
  end if;

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

alter table if exists public.ledgers
  alter column product_id set not null;

alter table if exists public.ledger_entries
  alter column ledger_id set not null;
