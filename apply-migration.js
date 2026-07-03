const path = require('path')
const fs = require('fs')

// Path to the local D1 SQLite database
const dbPath = path.join(
  __dirname,
  'apps/worker/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f272169f61c5ab0eef210fc95e193d10f70878fbd97e423d5cbd3a2362c11d3c.sqlite'
)

console.log('DB path:', dbPath)
console.log('Exists:', fs.existsSync(dbPath))

try {
  const Database = require('better-sqlite3')
  const db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_checkins (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_label text NOT NULL,
      diet_adherence integer NOT NULL,
      energy_level integer NOT NULL,
      hunger_level integer,
      mood integer,
      notes text,
      created_at text NOT NULL DEFAULT (datetime('now')),
      updated_at text NOT NULL DEFAULT (datetime('now'))
    );
  `)
  
  db.exec(`CREATE INDEX IF NOT EXISTS checkins_user_id_idx ON weekly_checkins (user_id);`)
  db.exec(`CREATE INDEX IF NOT EXISTS checkins_week_idx ON weekly_checkins (week_label);`)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS checkins_user_week_idx ON weekly_checkins (user_id, week_label);`)

  // Add theme column to profiles table if it doesn't exist
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';`)
    console.log("✅ Column 'theme' added to 'profiles' table successfully.")
  } catch (err) {
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      console.log("ℹ️ Column 'theme' already exists in 'profiles' table.")
    } else {
      console.error("❌ Error adding column 'theme':", err.message)
    }
  }

  db.close()
} catch (err) {
  console.error('❌ Error:', err.message)
  
  console.log('\nTrying alternative approach with built-in node:sqlite...')
  try {
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(dbPath)

    db.exec(`
      CREATE TABLE IF NOT EXISTS weekly_checkins (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_label text NOT NULL,
        diet_adherence integer NOT NULL,
        energy_level integer NOT NULL,
        hunger_level integer,
        mood integer,
        notes text,
        created_at text NOT NULL DEFAULT (datetime('now')),
        updated_at text NOT NULL DEFAULT (datetime('now'))
      );
    `)
    db.exec(`CREATE INDEX IF NOT EXISTS checkins_user_id_idx ON weekly_checkins (user_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS checkins_week_idx ON weekly_checkins (week_label);`)
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS checkins_user_week_idx ON weekly_checkins (user_id, week_label);`)

    // Add theme column to profiles table if it doesn't exist
    try {
      db.exec(`ALTER TABLE profiles ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';`)
      console.log("✅ Column 'theme' added to 'profiles' table successfully using node:sqlite.")
    } catch (alterErr) {
      if (alterErr.message.includes('duplicate column name') || alterErr.message.includes('already exists')) {
        console.log("ℹ️ Column 'theme' already exists in 'profiles' table.")
      } else {
        console.error("❌ Error adding column 'theme':", alterErr.message)
      }
    }
  } catch (fallbackErr) {
    console.error('❌ Alternative approach also failed:', fallbackErr.message)
    console.log('\nPor favor, genera y aplica las migraciones usando Drizzle y Wrangler con estos comandos:')
    console.log('npm run db:generate -w @nutripro/worker')
    console.log('npm run db:migrate:local -w @nutripro/worker')
  }
}
