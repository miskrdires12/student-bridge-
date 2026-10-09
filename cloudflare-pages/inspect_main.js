const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const mainIdx = html.indexOf('<main');
const mainEnd = html.indexOf('</main>');
console.log('Main content summary:');
const mainContent = html.slice(mainIdx, mainEnd + 7);
console.log('Length of main:', mainContent.length);

const divIds = [...mainContent.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
console.log('IDs in main:', divIds);
