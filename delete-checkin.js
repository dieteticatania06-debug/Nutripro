const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.join(
  __dirname,
  'apps/worker/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f272169f61c5ab0eef210fc95e193d10f70878fbd97e423d5cbd3a2362c11d3c.sqlite'
)

console.log('Database path:', dbPath)
if (!fs.existsSync(dbPath)) {
  console.error('Database does not exist at path!')
  process.exit(1)
}

const db = new Database(dbPath)

try {
  // Find Tomas Sanchez
  const user = db.prepare(`
    SELECT user_id, first_name, last_name 
    FROM profiles 
    WHERE first_name LIKE '%Tomas%' OR last_name LIKE '%Sánchez%' OR last_name LIKE '%Sanchez%'
  `).get()

  if (!user) {
    console.log('User Tomas Sanchez not found in profiles. Deleting all check-ins instead.')
    const info = db.prepare('DELETE FROM weekly_checkins').run()
    console.log('Deleted check-ins count:', info.changes)
  } else {
    console.log(`Found user: ${user.first_name} ${user.last_name} (ID: ${user.user_id})`)
    const info = db.prepare('DELETE FROM weekly_checkins WHERE user_id = ?').run(user.user_id)
    console.log(`✅ Deleted ${info.changes} check-in(s) for user ${user.first_name} ${user.last_name}`)
  }
} catch (e) {
  console.error('❌ Error executing database command:', e.message)
} finally {
  db.close()
}
