const crypto = require('crypto').webcrypto;
const fs = require('fs');
const path = require('path');

const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const ALGORITHM = 'SHA-256';

async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return new Uint8Array(derivedBits);
}

function toHex(buffer) {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt);
  return `${toHex(salt)}:${toHex(hash)}`;
}

const EMAIL = 'dieteticatania06@gmail.com';
const PASSWORD = '0306Rickandmorty2006';

async function run() {
  console.log(`Generando hash seguro para el administrador con la contraseña provista...`);
  const hash = await hashPassword(PASSWORD);

  // 1. Modificar el archivo seed.sql local para futuras instalaciones
  const seedPath = path.join(__dirname, 'apps', 'worker', 'seed.sql');
  if (fs.existsSync(seedPath)) {
    let seedContent = fs.readFileSync(seedPath, 'utf8');
    // Expresión regular para buscar la línea de inserción del usuario y reemplazar el hash de contraseña
    const regex = new RegExp(`INSERT OR IGNORE INTO users \\(id, email, password_hash, role, email_verified, created_at, updated_at\\)\\s+VALUES \\('a1a1a1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1', '${EMAIL}', '[^']+',`, 'i');
    
    const replacement = `INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified, created_at, updated_at)\nVALUES ('a1a1a1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1', '${EMAIL}', '${hash}',`;
    
    if (regex.test(seedContent)) {
      seedContent = seedContent.replace(regex, replacement);
      fs.writeFileSync(seedPath, seedContent, 'utf8');
      console.log('✓ Archivo apps/worker/seed.sql actualizado con el nuevo hash por defecto.');
    } else {
      console.log('⚠ No se pudo parsear el patrón exacto en seed.sql. Lo recreamos...');
      const newSeed = `-- Seed data for NutriPro\n-- Admin User (email: ${EMAIL})\nINSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified, created_at, updated_at)\nVALUES ('a1a1a1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1', '${EMAIL}', '${hash}', 'admin', 1, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');\n\n-- Admin Profile\nINSERT OR IGNORE INTO profiles (id, user_id, first_name, last_name, phone, birth_date, gender, height, weight, goal, allergies, observations, avatar_url, created_at, updated_at)\nVALUES ('0a0a0a0a-0a0a-40a0-0a0a-0a0a0a0a0a0a', 'a1a1a1a1-a1a1-4a1a-a1a1-a1a1a1a1a1a1', 'Admin', 'NutriPro', '+34600111222', '1985-05-15', 'male', 178, 75, 'Asesorar a clientes', NULL, NULL, NULL, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');\n`;
      fs.writeFileSync(seedPath, newSeed, 'utf8');
    }
  }

  // 2. Crear el script SQL para actualizar la base de datos de producción existente
  const sql = `-- Script para actualizar la contraseña del Administrador en produccion\nUPDATE users SET password_hash = '${hash}', email_verified = 1 WHERE email = '${EMAIL}';\n`;
  fs.writeFileSync('update_admin.sql', sql);
  console.log('✓ Archivo temporal update_admin.sql generado con el comando de actualización.');

  console.log('\n================================================================');
  console.log('¡SISTEMA CONFIGURADO!');
  console.log('Email del Administrador:', EMAIL);
  console.log('Nueva Contraseña:', PASSWORD);
  console.log('================================================================');
  console.log('\nPara aplicar este cambio en tu base de datos de Cloudflare en producción,');
  console.log('ejecuta este comando en tu terminal:');
  console.log('npx wrangler d1 execute nutripro-db --remote --file=update_admin.sql -c apps/worker/wrangler.toml');
  console.log('================================================================\n');
}

run();
