# Windows Setup Script for Hybrid Quantum Medical AI

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Setting up Hybrid Quantum-Classical Medical AI Platform..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Setup Backend
Write-Host "`n[1/2] Setting up Python Virtual Environment and Backend Dependencies..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\..\backend"

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}

Write-Host "Activating virtual environment and installing packages..."
& ".\venv\Scripts\Activate.ps1"
python -m pip install --upgrade pip
pip install -r requirements.txt

# 2. Setup Frontend
Write-Host "`n[2/2] Installing Node.js Dependencies for Frontend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\..\frontend"
npm install

Set-Location -Path "$PSScriptRoot\.."

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Setup Completed Successfully!" -ForegroundColor Green
Write-Host "To start the application:" -ForegroundColor Green
Write-Host "  1. Run backend:  powershell .\scripts\run-backend.ps1" -ForegroundColor White
Write-Host "  2. Run frontend: powershell .\scripts\run-frontend.ps1" -ForegroundColor White
Write-Host "  3. Open dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "  4. Swagger docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
