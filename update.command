#!/usr/bin/env bash
# macOS: double-click in Finder to update (opens Terminal)
cd "$(dirname "$0")" && ./update.sh "$@"
echo ""; read -r -p "Press Enter to close..." _
