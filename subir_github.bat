@echo off
echo ====================================================
echo Subiendo cambios de administrador a GitHub...
echo ====================================================

:: 1. Agregar y commitear los cambios
git add .
git commit -m "Update default admin credentials in seed.sql"

:: 2. Subir a GitHub
git push origin main

echo ====================================================
echo ¡Subida finalizada!
echo ====================================================
pause
