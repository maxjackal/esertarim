-- Run in Supabase SQL Editor. This file audits and hardens the public tables
-- used by the static frontend.

-- 1) Audit current RLS and policies.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'buyers',
    'sellers',
    'products',
    'ledgers',
    'ledger_entries',
    'ledger_payments'
  )
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'buyers',
    'sellers',
    'products',
    'ledgers',
    'ledger_entries',
    'ledger_payments'
  )
order by tablename, policyname;

-- 2) Enable RLS and remove public/anon table grants.
alter table public.buyers enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.ledgers enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.ledger_payments enable row level security;

revoke all on table public.buyers from anon;
revoke all on table public.sellers from anon;
revoke all on table public.products from anon;
revoke all on table public.ledgers from anon;
revoke all on table public.ledger_entries from anon;
revoke all on table public.ledger_payments from anon;

-- 3) Authenticated-only CRUD policies for a single-user/backoffice app.
-- Drop old broad policies first if they exist with these names.
drop policy if exists "authenticated_crud_buyers" on public.buyers;
drop policy if exists "authenticated_crud_sellers" on public.sellers;
drop policy if exists "authenticated_crud_products" on public.products;
drop policy if exists "authenticated_crud_ledgers" on public.ledgers;
drop policy if exists "authenticated_crud_ledger_entries" on public.ledger_entries;
drop policy if exists "authenticated_crud_ledger_payments" on public.ledger_payments;

create policy "authenticated_crud_buyers"
on public.buyers
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_crud_sellers"
on public.sellers
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_crud_products"
on public.products
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_crud_ledgers"
on public.ledgers
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_crud_ledger_entries"
on public.ledger_entries
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_crud_ledger_payments"
on public.ledger_payments
for all
to authenticated
using (true)
with check (true);
