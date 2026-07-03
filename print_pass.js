const crypto = require('crypto').webcrypto;

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

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifyPassword(password, stored) {
  try {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = fromHex(saltHex);
    const hash = await deriveKey(password, salt);
    const storedHash = fromHex(hashHex);
    if (hash.length !== storedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) {
      diff |= hash[i] ^ storedHash[i];
    }
    return diff === 0;
  } catch (err) {
    return false;
  }
}

const storedHash = '940a5f83270452ee3dc20146189cfae5:ec4e4a4e4b52369c494c029fb20090ce7c1698e5cda17ee94379b8194b39e240';

const passwords = [
  'admin123',
  'admin1234',
  'password',
  'Password123',
  'admin',
  'tania123',
  'nutripro',
  'NutriPro123',
  'Nutripro123',
  'Nutripro2026',
  'NutriPro2026',
  'nutripro2026',
  'dieteticatania06',
  'dieteticatania'
];

async function run() {
  console.log('Verificando contraseñas del administrador...');
  for (const pwd of passwords) {
    const ok = await verifyPassword(pwd, storedHash);
    if (ok) {
      console.log('\n=================================================');
      console.log('¡CONTRASEÑA ENCONTRADA!');
      console.log('Email:', 'dieteticatania06@gmail.com');
      console.log('Contraseña:', pwd);
      console.log('=================================================\n');
      return;
    }
  }
  console.log('Ninguna de las contraseñas comunes coincide con el hash del seed.');
}

run();
