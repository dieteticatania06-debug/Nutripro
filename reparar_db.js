const fs = require('fs');
const path = require('path');

// 1. Limpiar archivos conflictivos generados por drizzle-kit
const migrationsDir = path.join(__dirname, 'apps', 'worker', 'src', 'db', 'migrations');
const grandmasterSql = path.join(migrationsDir, '0003_modern_grandmaster.sql');
const grandmasterSnapshot = path.join(migrationsDir, 'meta', '0003_snapshot.json');
const journalJsonPath = path.join(migrationsDir, 'meta', '_journal.json');

console.log('Limpiando archivos de migración conflictivos...');

if (fs.existsSync(grandmasterSql)) {
  fs.unlinkSync(grandmasterSql);
  console.log('✓ Eliminado 0003_modern_grandmaster.sql');
}

if (fs.existsSync(grandmasterSnapshot)) {
  fs.unlinkSync(grandmasterSnapshot);
  console.log('✓ Eliminado 0003_snapshot.json');
}

if (fs.existsSync(journalJsonPath)) {
  let journal = JSON.parse(fs.readFileSync(journalJsonPath, 'utf8'));
  // Filtrar la entrada 3 si es modern_grandmaster
  journal.entries = journal.entries.filter(entry => entry.tag !== '0003_modern_grandmaster');
  fs.writeFileSync(journalJsonPath, JSON.stringify(journal, null, 2), 'utf8');
  console.log('✓ _journal.json restaurado.');
}

// 2. Generar el script SQL corrector para producción
const sqlFix = `-- Script corrector para la base de datos de producción D1\n-- Añade las columnas faltantes que causan el error 500 al listar usuarios\nALTER TABLE profiles ADD COLUMN plan TEXT;\nALTER TABLE profiles ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';\n`;

fs.writeFileSync('fix_production_db.sql', sqlFix);
console.log('✓ Archivo fix_production_db.sql generado.');

console.log('\n================================================================');
console.log('¡ARCHIVOS LIMPIADOS Y LISTOS!');
console.log('================================================================');
console.log('\nPara añadir las columnas que faltan en tu base de datos de Cloudflare,');
console.log('ejecuta este comando en tu terminal:');
console.log('npx wrangler d1 execute nutripro-db --remote --file=fix_production_db.sql -c apps/worker/wrangler.toml');
console.log('================================================================\n');
