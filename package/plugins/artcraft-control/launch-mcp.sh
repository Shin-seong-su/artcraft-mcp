#!/bin/sh
set -eu
ROOT=${ARTCRAFT_INSTALL_ROOT:-"$HOME/Library/Application Support/ArtCraft MCP"}
NODE=$ROOT/bin/node
if [ ! -x "$NODE" ] || [ ! -f "$ROOT/config.json" ]; then echo 'ArtCraft MCP 설치를 먼저 실행하세요.' >&2; exit 1; fi
export ARTCRAFT_CONFIG="$ROOT/config.json"
unset CONTROL_PLANE_API_KEY OPENAI_API_KEY
RUNTIME=$("$NODE" -e 'const f=require("node:fs");process.stdout.write(JSON.parse(f.readFileSync(process.env.ARTCRAFT_CONFIG,"utf8")).runtimeRoot)')
exec "$NODE" "$RUNTIME/server.mjs" --stdio
