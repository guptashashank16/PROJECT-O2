#!/bin/bash
# Unix/macOS Setup Script for Hybrid Quantum Medical AI

set -e

echo "=========================================================="
echo "Setting up Hybrid Quantum-Classical Medical AI Platform..."
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Setup Backend
echo -e "\n[1/2] Setting up Python Virtual Environment and Backend Dependencies..."
cd "$SCRIPT_DIR/../backend"

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment and installing packages..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 2. Setup Frontend
echo -e "\n[2/2] Installing Node.js Dependencies for Frontend..."
cd "$SCRIPT_DIR/../frontend"
npm install

cd "$SCRIPT_DIR/.."

echo -e "\n=========================================================="
echo "Setup Completed Successfully!"
echo "To start the application:"
echo "  1. Run backend:  ./scripts/run-backend.sh"
echo "  2. Run frontend: ./scripts/run-frontend.sh"
echo "  3. Open dashboard: http://localhost:5173"
echo "  4. Swagger docs:   http://localhost:8000/docs"
echo "=========================================================="
