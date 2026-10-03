#!/usr/bin/env bash
# designer - install on macOS / Linux (shortcut to designer/install.sh). Args are passed through, e.g. ./install.sh --all
exec bash "$(cd "$(dirname "$0")" && pwd)/designer/install.sh" "$@"
