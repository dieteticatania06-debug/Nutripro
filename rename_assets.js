const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'apps', 'web', 'public', 'auth-bg');

if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.includes(' ')) {
      const oldPath = path.join(dir, file);
      const newFile = file.replace(/\s+/g, '');
      const newPath = path.join(dir, newFile);
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: "${file}" -> "${newFile}"`);
    }
  });
} else {
  console.log('Directory not found:', dir);
}
