#!/bin/bash
set -euo pipefail
BUNDLE=$(cd "$(dirname "$0")" && pwd)
exec /bin/bash "$BUNDLE/installer/connect.sh"
