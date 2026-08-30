#!/bin/bash
# Unix/macOS Run Frontend Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../frontend"

npm run dev
