#!/usr/bin/env bash
# skillkit launcher (macOS / Linux): ./update.sh [--no-pull]: pull the repo, refresh every dependency to its latest, reinstall with the saved choices
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required: macOS 'brew install node', Linux your package manager or https://nodejs.org" >&2
  exit 1
fi
exec node "$ROOT/installer/install.mjs" update "$@"
