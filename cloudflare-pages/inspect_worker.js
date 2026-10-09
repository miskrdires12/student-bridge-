const fs = require('fs');
const worker = fs.readFileSync('_worker.js', 'utf8');
console.log('Worker length:', worker.length);
const matches = [...worker.matchAll(/url\.pathname[^\n{]+/g)].map(m => m[0]);
console.log('Worker route checks:');
matches.forEach(m => console.log('  ', m));
