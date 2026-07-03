const crypto = require('crypto').webcrypto;
const fs = require('fs');

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

const NEW_PASSWORD = 'TaniaNutripro2026!';

async function run() {
  console.log(`Generando hash para la contraseña: ${NEW_PASSWORD}`);
  const hash = await hashPassword(NEW_PASSWORD);
  
  const sql = `-- Script para actualizar la contraseña del Administrador\nUPDATE users SET password_hash = '${hash}', email_verified = 1 WHERE email = 'dieteticatania06@gmail.com';\n`;
  
  fs.writeFileSync('update_admin.sql', sql);
  
  console.log('\n================================================================');
  console.log('¡SQL GENERADO CON ÉXITO!');
  console.log('Tu nueva contraseña de administrador será:');
  console.log('Email:', 'dieteticatania06@gmail.com');
  console.log('Contraseña:', NEW_PASSWORD);
  console.log('================================================================');
  console.log('\nPara aplicar este cambio en tu base de datos de Cloudflare,');
  console.log('ejecuta el siguiente comando en tu terminal:');
  console.log('npx wrangler d1 execute nutripro-db --remote --file=update_admin.sql -c apps/worker/wrangler.toml');
  console.log('================================================================\n');
}

run();
