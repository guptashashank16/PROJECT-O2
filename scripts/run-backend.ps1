# Windows Run Backend Script

Write-Host "Starting FastAPI Backend Server..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\..\backend"

if (Test-Path "venv\Scripts\Activate.ps1") {
    & ".\venv\Scripts\Activate.ps1"
}

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
