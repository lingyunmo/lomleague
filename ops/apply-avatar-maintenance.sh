#!/usr/bin/env bash
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
lom_assert_scope
archive=$(realpath -e -- "$1")
expected_hash=$2
migration_directory=$(realpath -e -- "$3")
[[ "$archive" = "$LOM_PROJECT/backups/"*.lom ]] && [ "$(dirname -- "$archive")" = "$LOM_PROJECT/backups" ] || exit 1
[[ "$migration_directory" = "$LOM_PROJECT/ops/"* ]] || exit 1
[[ "$expected_hash" =~ ^[0-9a-f]{64}$ ]] || exit 1
[ "$(sha256sum "$archive" | cut -d ' ' -f 1)" = "$expected_hash" ] || { printf 'Backup checksum mismatch\n' >&2; exit 1; }
[ $(( $(date +%s) - $(stat -c %Y "$archive") )) -le 86400 ] || { printf 'A recent restore-verified backup is required\n' >&2; exit 1; }
exec 9>"$LOM_PROJECT/.ops-secrets/maintenance.lock"
flock -n 9 || { printf 'Another lom maintenance operation is active\n' >&2; exit 1; }
[ "$(docker inspect -f '{{.State.Running}}' "$LOM_APP")" = true ] || exit 1
image=$(docker inspect -f '{{.Config.Image}}' "$LOM_APP")
credentials=$(mktemp "$LOM_PROJECT/.ops-secrets/.migration-XXXXXXXX.env")
stopped=false
cleanup() {
  if [ "$stopped" = true ]; then docker start "$LOM_APP" >/dev/null; fi
  rm -- "$credentials"
}
trap cleanup EXIT
trap 'exit 1' INT TERM
# This URL never reaches terminal output or command arguments. Only root can read the temporary file.
docker exec "$LOM_APP" node -e 'process.stdout.write("DATABASE_URL="+process.env.DATABASE_URL+"\n")' > "$credentials"
stopped=true
docker stop --time 20 "$LOM_APP" >/dev/null
[ "$(lom_mysql "SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE DB='lom' AND ID <> CONNECTION_ID()")" = 0 ] || { printf 'Other lom clients are present; refusing migration\n' >&2; exit 1; }
docker run --rm --network common-net --memory 384m --cpus 1 --env-file "$credentials" --mount "type=bind,src=$LOM_PROJECT/ops,dst=/ops,readonly" --mount "type=bind,src=$migration_directory,dst=/migration,readonly" --entrypoint node "$image" /ops/migrate-lom.mjs
docker start "$LOM_APP" >/dev/null
stopped=false
printf 'Reviewed avatar-only maintenance applied; application restarted\n'
