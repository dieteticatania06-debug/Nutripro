@echo off
echo ====================================================
echo Renombrando assets de fondo...
echo ====================================================
node rename_assets.js

echo ====================================================
echo Subiendo cambios a GitHub...
echo ====================================================
git add .
git commit -m "Rename background assets to remove spaces and fix 404"
git push origin main

echo ====================================================
echo ¡Subida finalizada!
echo ====================================================
pause
