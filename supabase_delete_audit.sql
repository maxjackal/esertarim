-- Run once in Supabase SQL Editor.
-- This records the full previous row for future DELETE operations.

create table if not exists public.deleted_row_audit (
  audit_id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  deleted_at timestamptz not null default now(),
  deleted_by uuid default auth.uid(),
  old_data jsonb not null
);

alter table public.deleted_row_audit enable row level security;

revoke all on table public.deleted_row_audit from anon;
revoke all on table public.deleted_row_audit from authenticated;

create or replace function public.audit_deleted_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deleted_row_audit (table_name, row_id, deleted_by, old_data)
  values (tg_table_name, to_jsonb(old)->>'id', auth.uid(), to_jsonb(old));
  return old;
end;
$$;

revoke all on function public.audit_deleted_row() from public;

drop trigger if exists audit_delete_buyers on public.buyers;
create trigger audit_delete_buyers
before delete on public.buyers
for each row execute function public.audit_deleted_row();

drop trigger if exists audit_delete_sellers on public.sellers;
create trigger audit_delete_sellers
before delete on public.sellers
for each row execute function public.audit_deleted_row();

drop trigger if exists audit_delete_products on public.products;
create trigger audit_delete_products
before delete on public.products
for each row execute function public.audit_deleted_row();

drop trigger if exists audit_delete_ledgers on public.ledgers;
create trigger audit_delete_ledgers
before delete on public.ledgers
for each row execute function public.audit_deleted_row();

drop trigger if exists audit_delete_ledger_entries on public.ledger_entries;
create trigger audit_delete_ledger_entries
before delete on public.ledger_entries
for each row execute function public.audit_deleted_row();

drop trigger if exists audit_delete_ledger_payments on public.ledger_payments;
create trigger audit_delete_ledger_payments
before delete on public.ledger_payments
for each row execute function public.audit_deleted_row();

-- Example query:
-- select audit_id, table_name, row_id, deleted_at, deleted_by, old_data
-- from public.deleted_row_audit
-- order by deleted_at desc;
