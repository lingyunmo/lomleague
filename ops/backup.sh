#!/usr/bin/env bash
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
lom_assert_scope
[ -f "$LOM_PROJECT/.ops-secrets/mysql-admin.cnf" ] && [ -f "$LOM_PROJECT/.ops-secrets/backup-recipient.pem" ] || { printf 'Backup credentials/recipient are not provisioned\n' >&2; exit 1; }
mkdir -p -- "$LOM_PROJECT/backups"
chmod 700 "$LOM_PROJECT/backups"
exec 9>"$LOM_PROJECT/.ops-secrets/maintenance.lock"
flock -n 9 || { printf 'Another lom maintenance operation is active\n' >&2; exit 1; }
[ "$(docker inspect -f '{{.State.Running}}' "$LOM_APP")" = true ] || { printf 'Application was not running; refusing to change its state\n' >&2; exit 1; }
[ "$(lom_mysql "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='lom' AND ENGINE IS NOT NULL AND ENGINE <> 'InnoDB'")" = 0 ] || { printf 'Non-InnoDB tables require a separate backup plan\n' >&2; exit 1; }
# Conservative headroom for SQL/uploads and plaintext/encrypted staging on the shared production disk.
upload_bytes=$(du -sb -- "$LOM_PROJECT/upload" | cut -f 1)
database_bytes=$(lom_mysql "SELECT COALESCE(SUM(DATA_LENGTH+INDEX_LENGTH),0) FROM information_schema.TABLES WHERE TABLE_SCHEMA='lom'")
free_bytes=$(df -B1 --output=avail "$LOM_PROJECT" | tail -n 1 | tr -d ' ')
[ "$free_bytes" -gt $(( 3 * (upload_bytes + database_bytes) + 1073741824 )) ] || { printf 'Insufficient backup staging headroom; application untouched\n' >&2; exit 1; }
stage=$(mktemp -d "$LOM_PROJECT/backups/.pending-XXXXXXXX")
app_image=$(docker inspect -f '{{.Config.Image}}' "$LOM_APP")
mysql_image=$(docker inspect -f '{{.Image}}' "$LOM_MYSQL")
revision=$(docker exec "$LOM_APP" node -e 'process.stdout.write(process.env.APP_REVISION || "")')
stopped=false
restart_application() {
  if [ "$stopped" = true ]; then
    docker start "$LOM_APP" >/dev/null
    stopped=false
  fi
}
trap restart_application EXIT
trap 'exit 1' INT TERM
stopped=true
docker stop --time 20 "$LOM_APP" >/dev/null
# Refuse an inconsistent snapshot rather than terminating an unrelated writer.
[ "$(lom_mysql "SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE DB='lom' AND ID <> CONNECTION_ID()")" = 0 ] || { printf 'Other lom database connections are present; backup aborted and app will restart\n' >&2; exit 1; }
timeout 60 docker exec -i "$LOM_MYSQL" mysqldump --defaults-extra-file=/dev/stdin "${LOM_DUMP_OPTIONS[@]}" lom < "$LOM_PROJECT/.ops-secrets/mysql-admin.cnf" | gzip -n > "$stage/database.sql.gz"
[ -s "$stage/database.sql.gz" ]
[ -z "$(find "$LOM_PROJECT/upload" -type l -print -quit)" ] || { printf 'Upload symlink requires manual review\n' >&2; exit 1; }
tar -C "$LOM_PROJECT" -czf "$stage/uploads.tar.gz" upload
(cd "$LOM_PROJECT/upload" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum) > "$stage/uploads.sha256"
config_files=(docker-compose.prod.yml .env .ops-secrets/mysql-admin.cnf .ops-secrets/backup-recipient.pem)
[ ! -f "$LOM_PROJECT/.ops-secrets/runtime.env" ] || config_files+=(.ops-secrets/runtime.env)
tar -C "$LOM_PROJECT" -czf "$stage/config.tar.gz" "${config_files[@]}"
printf '{"format":1,"database":"lom","createdAt":"%s","appImage":"%s","mysqlImage":"%s","revision":"%s"}\n' "$(date -u +%FT%TZ)" "$app_image" "$mysql_image" "$revision" > "$stage/manifest.json"
(cd "$stage" && sha256sum database.sql.gz uploads.tar.gz uploads.sha256 config.tar.gz manifest.json > SHA256SUMS)
restart_application
# Recovery is tested only in fresh labelled containers on a new internal network.
bash "$LOM_PROJECT/ops/verify-restore.sh" "$stage" "$mysql_image" "$app_image" "$revision"
tar -C "$stage" -cf "$stage/backup.tar" database.sql.gz uploads.tar.gz uploads.sha256 config.tar.gz manifest.json SHA256SUMS
docker run --rm --network none --read-only --tmpfs /tmp --mount "type=bind,src=$stage,dst=/bundle" --mount "type=bind,src=$LOM_PROJECT/ops,dst=/ops,readonly" --mount "type=bind,src=$LOM_PROJECT/.ops-secrets/backup-recipient.pem,dst=/recipient.pem,readonly" --entrypoint node "$app_image" /ops/backup-envelope.mjs seal /bundle/backup.tar /bundle/backup.lom /recipient.pem
destination="$LOM_PROJECT/backups/$(date -u +%Y%m%dT%H%M%SZ)-${stage##*.pending-}.lom"
ln -- "$stage/backup.lom" "$destination"
sha256sum "$destination"
# Remove only named plaintext artifacts created by this backup; complete archives are retained.
rm -- "$stage/database.sql.gz" "$stage/uploads.tar.gz" "$stage/uploads.sha256" "$stage/config.tar.gz" "$stage/manifest.json" "$stage/SHA256SUMS" "$stage/backup.tar" "$stage/backup.lom"
rmdir -- "$stage"
printf 'Encrypted, restore-verified lom backup: %s\n' "$destination"
