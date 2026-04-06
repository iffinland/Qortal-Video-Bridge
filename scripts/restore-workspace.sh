#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="Video-Bridge"
BACKUP_DIR="${HOME}/VS-Code-Projects/_workspace_backups/${PROJECT_NAME}"
TARGET_DIR="${1:-${PROJECT_ROOT}}"

if [[ ! -d "${BACKUP_DIR}" ]]; then
  echo "Backup directory not found: ${BACKUP_DIR}" >&2
  exit 1
fi

LATEST_BACKUP="$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "${PROJECT_NAME}_*.tar.gz" | sort | tail -n 1)"

if [[ -z "${LATEST_BACKUP}" ]]; then
  echo "No backup archive found in ${BACKUP_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"

if find "${TARGET_DIR}" -mindepth 1 -maxdepth 1 ! -name '.git' | read -r _; then
  echo "Target directory is not empty: ${TARGET_DIR}" >&2
  echo "Use an empty directory or remove existing project files first." >&2
  exit 1
fi

tar -xzf "${LATEST_BACKUP}" -C "${TARGET_DIR}" --strip-components=1

echo "Backup restored from: ${LATEST_BACKUP}"
echo "Target directory: ${TARGET_DIR}"
echo "Next step: run npm install"
