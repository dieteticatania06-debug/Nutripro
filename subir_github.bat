@echo off
echo ====================================================
echo Borrando historial local de Git para limpiar secretos...
echo ====================================================

:: 1. Eliminar la carpeta oculta .git para empezar desde cero
rmdir /s /q .git 2>nul

:: 2. Inicializar un repositorio limpio
git init

:: 3. Configurar identidad local
git config user.email "dieteticatania06@gmail.com"
git config user.name "Tania"

:: 4. Agregar archivos (respetando el .gitignore que ya tiene .dev.vars)
git add .

:: 5. Crear el commit inicial limpio
git commit -m "Primer commit limpio sin secretos"

:: 6. Vincular a GitHub
git remote add origin https://github.com/dieteticatania06-debug/Nutripro.git

:: 7. Renombrar rama y subir a GitHub
git branch -M main
git push -f -u origin main

echo ====================================================
echo ¡Proceso finalizado! Revisa tu repositorio en GitHub.
echo ====================================================
pause
