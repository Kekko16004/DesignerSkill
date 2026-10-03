#!/usr/bin/env bash
# designer - update everything from GitHub (skill + Variant Studio + transitions.dev), then reinstall with the last choices
exec bash "$(cd "$(dirname "$0")" && pwd)/designer/update.sh" "$@"
