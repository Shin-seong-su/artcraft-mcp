#!/bin/bash
set -euo pipefail
ROOT=${ARTCRAFT_INSTALL_ROOT:-"$HOME/Library/Application Support/ArtCraft MCP"}
exec "$ROOT/bin/node" "$ROOT/tunnel-command.mjs" status
