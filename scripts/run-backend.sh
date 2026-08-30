#!/bin/bash
# Unix/macOS Run Backend Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../backend"

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
