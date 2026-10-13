#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --db-url URL --uploads PATH --output NEW_DIRECTORY" >&2
  exit 2
}

db_url=""; uploads=""; output=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url) db_url="${2:-}"; shift 2 ;;
    --uploads) uploads="${2:-}"; shift 2 ;;
    --output) output="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ -n "$db_url" && -n "$uploads" && -n "$output" ]] || usage
[[ -d "$uploads" ]] || { echo "Uploads path does not exist: $uploads" >&2; exit 3; }
[[ "$output" = /* ]] || { echo "Output must be an explicit absolute path." >&2; exit 3; }
[[ "$output" != "/" && "$output" != "$HOME" ]] || { echo "Unsafe output path." >&2; exit 3; }
[[ ! -e "$output" ]] || { echo "Output already exists; choose a new directory." >&2; exit 3; }

command -v pg_dump >/dev/null || { echo "pg_dump is required." >&2; exit 4; }
command -v sha256sum >/dev/null || { echo "sha256sum is required." >&2; exit 4; }
mkdir -p "$output"
pg_dump --format=custom --no-owner --no-privileges --file "$output/database.dump" "$db_url"
tar -C "$uploads" -czf "$output/uploads.tar.gz" .
pg_dump --version > "$output/tool-versions.txt"
(cd "$output" && sha256sum database.dump uploads.tar.gz tool-versions.txt > MANIFEST.sha256)
echo "Backup created at $output. Copy operator notes separately; do not store credentials here."
