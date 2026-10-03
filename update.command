#!/usr/bin/env bash
# macOS: double-click in Finder to update designer (opens Terminal)
bash "$(cd "$(dirname "$0")" && pwd)/designer/update.sh"
echo ""; read -r -p "Press Enter to close..." _
