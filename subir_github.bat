@echo off
echo ====================================================
echo Subiendo ajuste de CORS a GitHub...
echo ====================================================

:: 1. Agregar y commitear los cambios
git add .
git commit -m "Allow pages.dev origins in CORS headers"

:: 2. Subir a GitHub
git push origin main

echo ====================================================
echo ¡Subida finalizada!
echo ====================================================
pause
