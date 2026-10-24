#!/usr/bin/env bash
# macOS: double-click in Finder to install (opens Terminal)
cd "$(dirname "$0")" && ./install.sh "$@"
echo ""; read -r -p "Press Enter to close..." _
