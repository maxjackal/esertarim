#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 LIVE_DB_URL BACKUP_DB_URL" >&2
  exit 1
fi

LIVE_DB_URL="$1"
BACKUP_DB_URL="$2"
OUTPUT_DIR="deleted_rows_$(date +'%Y-%m-%d_%H-%M-%S')"
TABLES=(
  buyers
  sellers
  products
  ledgers
  ledger_entries
  ledger_payments
)

mkdir -p "$OUTPUT_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Comparing backup database with live database..."

for table in "${TABLES[@]}"; do
  backup_ids="$TMP_DIR/${table}_backup.ids"
  live_ids="$TMP_DIR/${table}_live.ids"
  deleted_ids="$TMP_DIR/${table}_deleted.ids"
  output_file="$OUTPUT_DIR/${table}.csv"

  psql "$BACKUP_DB_URL" -X -qAt \
    -c "select id from public.${table}" | LC_ALL=C sort -u > "$backup_ids"
  psql "$LIVE_DB_URL" -X -qAt \
    -c "select id from public.${table}" | LC_ALL=C sort -u > "$live_ids"

  LC_ALL=C comm -23 "$backup_ids" "$live_ids" > "$deleted_ids"

  if [ ! -s "$deleted_ids" ]; then
    echo "${table}: no deleted rows found"
    continue
  fi

  ids="$(paste -sd, "$deleted_ids")"
  psql "$BACKUP_DB_URL" -X -q \
    -c "\\copy (select * from public.${table} where id in (${ids}) order by id) to '${output_file}' with (format csv, header true)"

  echo "${table}: $(wc -l < "$deleted_ids" | tr -d ' ') deleted row(s) -> ${output_file}"
done

echo "Done. Reports: ${OUTPUT_DIR}/"
