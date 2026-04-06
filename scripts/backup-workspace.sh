#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="Video-Bridge"
BACKUP_DIR="${HOME}/VS-Code-Projects/_workspace_backups/${PROJECT_NAME}"
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
ARCHIVE_NAME="${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

mkdir -p "${BACKUP_DIR}"

tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='dist-ssr' \
  --exclude='.vite' \
  --exclude='coverage' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  -czf "${ARCHIVE_PATH}" \
  -C "$(dirname "${PROJECT_ROOT}")" \
  "$(basename "${PROJECT_ROOT}")"

mapfile -t backups < <(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${PROJECT_NAME}_*.tar.gz" | sort)

if (( ${#backups[@]} > 3 )); then
  for old_backup in "${backups[@]:0:${#backups[@]}-3}"; do
    rm -f "${old_backup}"
  done
fi

echo "Backup created: ${ARCHIVE_PATH}"
