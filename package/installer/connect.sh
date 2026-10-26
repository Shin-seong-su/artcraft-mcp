#!/bin/bash
set -euo pipefail
ROOT=${ARTCRAFT_INSTALL_ROOT:-"$HOME/Library/Application Support/ArtCraft MCP"}
if [ ! -x "$ROOT/bin/node" ]; then echo '1 설치.command를 먼저 실행하세요.'; exit 1; fi
echo '일반 ChatGPT 채팅용 개인 연결입니다. 본인 계정의 터널과 권한이 필요합니다.'
echo '터널: https://platform.openai.com/settings/organization/tunnels'
echo '런타임 키: Tunnels Read + Use 권한. 입력한 키는 이 Mac 키체인에 저장됩니다.'
read -r -p 'Tunnel ID (tunnel_...): ' TUNNEL_ID
read -r -s -p '런타임 키 (화면에 표시되지 않음): ' RUNTIME_KEY
echo
printf '%s' "$RUNTIME_KEY" | "$ROOT/bin/node" "$ROOT/tunnel-command.mjs" connect "$TUNNEL_ID"
unset RUNTIME_KEY
echo '완료 후 이 창을 닫아도 로그인 서비스가 연결을 유지합니다.'
