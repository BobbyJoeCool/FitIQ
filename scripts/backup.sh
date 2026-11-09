#!/usr/bin/env bash
# FitIQ backup and restore (step 8.4). See docs/backup-restore.md.
#
#   scripts/backup.sh dump remote        # hosted project (asks for the DB password)
#   scripts/backup.sh dump local         # the local Docker stack
#   scripts/backup.sh restore-local DIR  # rebuild the local stack from a dump
#   scripts/backup.sh counts             # row counts in the local stack
#
# Dumps go to backups/<timestamp>-<source>/ (gitignored: they hold real data).
set -euo pipefail
cd "$(dirname "$0")/.."

DB_CONTAINER="supabase_db_$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' supabase/config.toml)"
TABLES=(profiles custom_exercises workout_plans workout_plan_exercises workout_sessions
  workout_session_exercises workout_sets weight_history body_measurements cardio_sessions)

usage() {
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

dump() {
  local source="${1:-}"
  [[ "$source" == local || "$source" == remote ]] || usage
  local target=()
  [[ "$source" == remote ]] && target=(--remote)
  local dir="backups/$(date +%Y%m%d-%H%M%S)-$source"
  mkdir -p "$dir"
  echo "Dumping the $source database to $dir/"
  npx supabase db dump ${target[@]+"${target[@]}"} --role-only -f "$dir/roles.sql"
  npx supabase db dump ${target[@]+"${target[@]}"} -f "$dir/schema.sql"
  # public holds the app's tables; auth holds the accounts they belong to.
  npx supabase db dump ${target[@]+"${target[@]}"} --data-only --use-copy -s public,auth -f "$dir/data.sql"
  echo "Done: $(du -sh "$dir" | cut -f1). Keep it somewhere private, never in Git."
}

psql_local() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

counts() {
  local sql="select 'auth.users' as table_name, count(*) from auth.users"
  for t in "${TABLES[@]}"; do sql+=" union all select '$t', count(*) from public.$t"; done
  psql_local -c "$sql;"
}

restore_local() {
  local dir="${1:-}"
  [[ -f "$dir/data.sql" ]] || { echo "No data.sql in '$dir'."; usage; }
  echo "This replaces everything in the LOCAL stack with $dir. (The hosted project is not touched.)"
  read -r -p "Continue? [y/N] " answer
  [[ "$answer" == [yY] ]] || exit 1
  # The schema comes from this repo's migrations, the same ones applied to the
  # hosted project, so only the data needs loading.
  npx supabase db reset
  # replica mode skips triggers (no duplicate profiles from handle_new_user,
  # no ownership checks mid-load) and foreign-key ordering.
  { echo "set session_replication_role = replica;"; cat "$dir/data.sql"; } |
    psql_local --single-transaction -q -f -
  echo "Restored. Row counts:"
  counts
}

case "${1:-}" in
  dump) dump "${2:-}" ;;
  restore-local) restore_local "${2:-}" ;;
  counts) counts ;;
  *) usage ;;
esac
