@echo off
echo ====================================================
echo Subiendo la configuracion de Edge Runtime a GitHub...
echo ====================================================

:: 1. Agregar y commitear los cambios
git add .
git commit -m "Configure edge runtime for objetivos page"

:: 2. Subir a GitHub
git push origin main

echo ====================================================
echo ¡Subida finalizada! Cloudflare Pages reintentara el build.
echo ====================================================
pause
