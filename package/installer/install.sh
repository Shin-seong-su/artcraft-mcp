#!/bin/sh
set -eu
umask 077
case "$(uname -s)" in Darwin) ;; *) echo '이 설치 패키지는 macOS 전용입니다.' >&2; exit 1;; esac
BUNDLE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
INSTALL_ROOT=${ARTCRAFT_INSTALL_ROOT:-"$HOME/Library/Application Support/ArtCraft MCP"}
case "$INSTALL_ROOT" in /*) ;; *) echo '설치 경로는 절대 경로여야 합니다.' >&2; exit 1;; esac
case "$(uname -m)" in
 arm64) ARCH=arm64; DIGEST=cc04a76a09f79290194c0646f48fec40354d88969bec467789a5d55dd097f949;;
 x86_64) ARCH=x64; DIGEST=00df9c5df3e4ec6848c26b70fb47bf96492f342f4bed6b17f12d99b3a45eeecc;;
 *) echo '지원하지 않는 Mac 아키텍처입니다.' >&2; exit 1;;
esac
NODE_NAME=node-v22.20.0-darwin-$ARCH
NODE_DIR=$INSTALL_ROOT/$NODE_NAME
mkdir -p "$INSTALL_ROOT/bootstrap"
if [ ! -x "$NODE_DIR/bin/node" ]; then
 ARCHIVE=$INSTALL_ROOT/bootstrap/$NODE_NAME.tar.gz
 echo '공식 Node.js 런타임을 준비합니다.'
 if [ ! -f "$ARCHIVE" ]; then
  /usr/bin/curl --fail --location --silent --show-error --max-time 180 --proto '=https' --tlsv1.2 "https://nodejs.org/dist/v22.20.0/$NODE_NAME.tar.gz" --output "$ARCHIVE.part"
  mv "$ARCHIVE.part" "$ARCHIVE"
 fi
 ACTUAL=$(/usr/bin/shasum -a 256 "$ARCHIVE" | /usr/bin/awk '{print $1}')
 if [ "$ACTUAL" != "$DIGEST" ]; then echo 'Node.js 체크섬 불일치. 설치를 중단합니다.' >&2; exit 1; fi
 /usr/bin/tar -xzf "$ARCHIVE" -C "$INSTALL_ROOT"
fi
export PATH="$NODE_DIR/bin:/usr/bin:/bin:/usr/sbin:/sbin"
unset CONTROL_PLANE_API_KEY OPENAI_API_KEY
exec "$NODE_DIR/bin/node" "$BUNDLE/installer/finish-install.mjs" --install-root "$INSTALL_ROOT" "$@"
