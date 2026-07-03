const fs = require('fs')
const path = require('path')

const dirToScan = path.join(__dirname, 'apps/web/src')

// Regex to catch emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F191}-\u{1F251}]/gu

function scanDir(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      scanDir(fullPath)
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8')
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        const matches = line.match(emojiRegex)
        if (matches) {
          console.log(`MATCH: ${fullPath}:${index + 1} -> ${line.trim()} (Emojis: ${matches.join(', ')})`)
        }
      })
    }
  }
}

console.log('Scanning directories for emojis...')
scanDir(dirToScan)
console.log('Scan completed.')
