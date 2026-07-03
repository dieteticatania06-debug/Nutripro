@echo off
echo ====================================================
echo Desplegando el Backend (Worker) y Base de Datos...
echo ====================================================

:: 1. Subir la configuracion actualizada de wrangler.toml a GitHub
echo.
echo [1/5] Subiendo configuracion de base de datos a GitHub...
git add apps/worker/wrangler.toml
git commit -m "Configure production database_id"
git push origin main

:: 2. Crear el R2 Bucket (si no existe ya)
echo.
echo [2/5] Creando bucket R2 para almacenamiento...
npx wrangler r2 bucket create nutripro-storage 2>nul

:: 3. Aplicar tablas de base de datos en Cloudflare (Migraciones)
echo.
echo [3/5] Aplicando migraciones de base de datos en la nube...
npx wrangler d1 migrations apply nutripro-db --remote -c apps/worker/wrangler.toml

:: 4. Insertar el Administrador Inicial en la base de datos (Seed)
echo.
echo [4/5] Insertando datos del administrador inicial...
npx wrangler d1 execute nutripro-db --remote --file=apps/worker/seed.sql -c apps/worker/wrangler.toml

:: 5. Desplegar el Worker en Cloudflare
echo.
echo [5/5] Subiendo el Worker a Cloudflare...
npx wrangler deploy -c apps/worker/wrangler.toml

echo ====================================================
echo ¡Proceso finalizado!
echo Guarda la URL del Worker que aparece arriba (ej. https://nutripro-worker.xxx.workers.dev)
echo ====================================================
echo.
echo IMPORTANTE: Ahora debes registrar tus tres claves secretas.
echo Ejecuta estos tres comandos en tu terminal local uno por uno:
echo.
echo   npx wrangler secret put JWT_SECRET -c apps/worker/wrangler.toml
echo   npx wrangler secret put BREVO_API_KEY -c apps/worker/wrangler.toml
echo   npx wrangler secret put GROQ_API_KEY -c apps/worker/wrangler.toml
echo.
pause
