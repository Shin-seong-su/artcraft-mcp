#!/bin/bash
set -euo pipefail
BUNDLE=$(cd "$(dirname "$0")" && pwd)
exec /bin/sh "$BUNDLE/installer/install.sh" "$@"
