#!/usr/bin/env bash
# macOS: double-click in Finder to install designer (opens Terminal)
bash "$(cd "$(dirname "$0")" && pwd)/designer/install.sh"
echo ""; read -r -p "Press Enter to close..." _
