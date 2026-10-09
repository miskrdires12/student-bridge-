const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
console.log('HTML Length:', html.length);
const views = [...html.matchAll(/id=["'](view-[^"']+)["']/g)].map(m => m[1]);
console.log('Views found:', views);
const functions = [...html.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(/g)].map(m => m[1]);
console.log('Top functions:', functions.slice(0, 30));
const buttons = [...html.matchAll(/<button[^>]+id=["']([^"']+)["']/g)].map(m => m[1]);
console.log('Button IDs sample:', buttons.slice(0, 20));
