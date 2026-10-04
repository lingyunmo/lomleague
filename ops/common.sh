#!/usr/bin/env bash
set -euo pipefail
umask 077
LOM_PROJECT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
LOM_APP=lom-app
LOM_MYSQL=lom-mysql
LOM_DUMP_OPTIONS=(--single-transaction --quick --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF --column-statistics=0 --hex-blob --order-by-primary --skip-extended-insert --skip-comments --routines --events --triggers)

lom_assert_scope() {
  local name expected source
  for name in "$LOM_APP" "$LOM_MYSQL"; do
    expected=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$name")
    [ "$expected" = lomleague ] || { printf 'Refusing container outside lomleague: %s\n' "$name" >&2; return 1; }
  done
  source=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Source}}{{end}}{{end}}' "$LOM_MYSQL")
  [ "$source" = "$LOM_PROJECT/mysql_data" ] || { printf 'Unexpected database mount\n' >&2; return 1; }
  source=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/lomserver/upload"}}{{.Source}}{{end}}{{end}}' "$LOM_APP")
  [ "$source" = "$LOM_PROJECT/upload" ] || { printf 'Unexpected upload mount\n' >&2; return 1; }
}

lom_mysql() {
  docker exec -i "$LOM_MYSQL" mysql --defaults-extra-file=/dev/stdin --batch --skip-column-names --execute "$1" lom < "$LOM_PROJECT/.ops-secrets/mysql-admin.cnf"
}

lom_remove_owned_restore() {
  local directory=$1 token=$2 resolved parent
  resolved=$(realpath -e -- "$directory")
  parent=$(realpath -e -- "$LOM_PROJECT/backups")
  [[ "$resolved" = "$parent"/.restore-* ]] && [ "$(dirname -- "$resolved")" = "$parent" ] || return 1
  [ "$(<"$resolved/.lom-owned-restore")" = "$token" ] || return 1
  # Only this invocation's isolated clone, never mysql_data, upload or complete backups.
  rm -rf -- "$resolved"
}
