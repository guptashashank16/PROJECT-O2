# Windows Run Frontend Script

Write-Host "Starting Vite React Frontend Development Server..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\..\frontend"

npm run dev
