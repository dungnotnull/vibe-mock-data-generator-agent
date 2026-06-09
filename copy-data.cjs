const fs = require('fs');
const path = require('path');

const dirs = [
  'vietnamese',
  'domains',
  'edge-cases'
];

for (const dir of dirs) {
  const srcDir = path.join(__dirname, 'src', 'data', dir);
  const destDir = path.join(__dirname, 'dist', 'data', dir);
  
  fs.mkdirSync(destDir, { recursive: true });
  
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
  console.log('Copied ' + files.length + ' files to dist/data/' + dir + '/');
}

console.log('Data files copied successfully!');
