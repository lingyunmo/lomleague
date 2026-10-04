#!/usr/bin/env bash
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
source_directory=$(realpath -e -- "$1")
mysql_image=$2
app_image=$3
revision=$4
migration_directory=${5:-}
case "$source_directory" in "$LOM_PROJECT/backups/"*) ;; *) printf 'Restore input must be inside lom backups\n' >&2; exit 1;; esac
(cd "$source_directory" && sha256sum -c --status SHA256SUMS)
work=$(mktemp -d "$LOM_PROJECT/backups/.restore-XXXXXXXX")
token=${work##*.restore-}
printf '%s' "$token" > "$work/.lom-owned-restore"
network="lom-restore-$token"
database="lom-restore-db-$token"
application="lom-restore-app-$token"
cleanup() {
  local name label
  for name in "$application" "$database"; do
    label=$(docker inspect -f '{{index .Config.Labels "lomleague.maintenance"}}' "$name" 2>/dev/null || true)
    [ "$label" != "$token" ] || docker rm -f "$name" >/dev/null
  done
  label=$(docker network inspect -f '{{index .Labels "lomleague.maintenance"}}' "$network" 2>/dev/null || true)
  [ "$label" != "$token" ] || docker network rm "$network" >/dev/null
  lom_remove_owned_restore "$work" "$token"
}
trap cleanup EXIT
password=$(openssl rand -hex 32)
printf 'MYSQL_ROOT_PASSWORD=%s\nMYSQL_DATABASE=lom\n' "$password" > "$work/mysql.env"
printf '[client]\nuser=root\npassword="%s"\nhost=127.0.0.1\n' "$password" > "$work/client.cnf"
printf 'DATABASE_URL=mysql://root:%s@mysql:3306/lom\nJWT_SECRET=isolated-restore-only\nJWT_EXPIRATION=3600\nAPP_REVISION=%s\n' "$password" "$revision" > "$work/app.env"
mkdir "$work/mysql_data"
tar -C "$work" -xzf "$source_directory/uploads.tar.gz"
(cd "$work/upload" && sha256sum -c --status "$source_directory/uploads.sha256")
docker network create --internal --label "lomleague.maintenance=$token" "$network" >/dev/null
docker run -d --name "$database" --network "$network" --network-alias mysql --label "lomleague.maintenance=$token" --memory 512m --cpus 1 --env-file "$work/mysql.env" --mount "type=bind,src=$work/mysql_data,dst=/var/lib/mysql" --mount "type=bind,src=$work/client.cnf,dst=/run/lom-client.cnf,readonly" "$mysql_image" >/dev/null
ready=false
for attempt in $(seq 1 40); do
  if docker exec "$database" mysql --defaults-extra-file=/run/lom-client.cnf --batch --skip-column-names --execute 'SELECT 1' >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
[ "$ready" = true ] || { printf 'Isolated restore database failed to start\n' >&2; exit 1; }
[ "$(docker exec "$database" mysql --defaults-extra-file=/run/lom-client.cnf --batch --skip-column-names --execute "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='lom'")" = 0 ] || { printf 'Refusing restoration into a nonempty database\n' >&2; exit 1; }
gzip -dc "$source_directory/database.sql.gz" | docker exec -i "$database" mysql --defaults-extra-file=/run/lom-client.cnf lom
digest_dump() {
  docker run --rm -i --network none --memory 128m --cpus 1 --mount "type=bind,src=$LOM_PROJECT/ops,dst=/ops,readonly" --entrypoint node "$app_image" /ops/dump-digest.mjs
}
original_hash=$(gzip -dc "$source_directory/database.sql.gz" | digest_dump)
docker exec "$database" mysqldump --defaults-extra-file=/run/lom-client.cnf "${LOM_DUMP_OPTIONS[@]}" lom > "$source_directory/restore-diagnostic.sql"
restored_hash=$(digest_dump < "$source_directory/restore-diagnostic.sql")
[ "$original_hash" = "$restored_hash" ] || { printf 'Restored database dump does not match the original\n' >&2; exit 1; }
rm -- "$source_directory/restore-diagnostic.sql"
if [ -n "$migration_directory" ]; then
  migration_directory=$(realpath -e -- "$migration_directory")
  case "$migration_directory" in "$LOM_PROJECT/ops/"*) ;; *) printf 'Migration rehearsal must use lom ops source\n' >&2; exit 1;; esac
  docker run --rm --network "$network" --memory 384m --cpus 1 --env-file "$work/app.env" --mount "type=bind,src=$LOM_PROJECT/ops,dst=/ops,readonly" --mount "type=bind,src=$migration_directory,dst=/migration,readonly" --entrypoint node "$app_image" /ops/migrate-lom.mjs
fi
docker run -d --name "$application" --network "$network" --label "lomleague.maintenance=$token" --memory 256m --cpus 1 --env-file "$work/app.env" --mount "type=bind,src=$work/upload,dst=/app/lomserver/upload,readonly" "$app_image" >/dev/null
ready=false
for attempt in $(seq 1 20); do
  if docker exec "$application" node scripts/smoke.mjs "$revision" >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[ "$ready" = true ] || { printf 'Restored application read-only smoke failed\n' >&2; exit 1; }
docker exec -i "$application" node --input-type=module <<'LOM_VERIFY_JS'
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = '/app/lomserver/upload';
let count = 0;
for (const owner of await readdir(root, { withFileTypes: true })) {
  if (!owner.isDirectory() || !/^\d+$/.test(owner.name)) continue;
  for (const file of await readdir(`${root}/${owner.name}`, { withFileTypes: true })) {
    if (!file.isFile()) continue;
    const stored = await readFile(`${root}/${owner.name}/${file.name}`);
    const response = await fetch(`http://127.0.0.1:3000/api/upload/${owner.name}/${encodeURIComponent(file.name)}`);
    if (!response.ok) throw new Error('Restored upload URL failed');
    const downloaded = Buffer.from(await response.arrayBuffer());
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    if (digest(stored) !== digest(downloaded)) throw new Error('Restored upload bytes differ');
    count++;
  }
}
process.stdout.write(`Restored upload URLs and bytes verified: ${count}\n`);
LOM_VERIFY_JS
printf 'Isolated database dump SHA256 matches: %s\n' "$original_hash"
