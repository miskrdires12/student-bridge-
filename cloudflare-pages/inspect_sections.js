const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('Script size:', (html.match(/<script[\s\S]*?<\/script>/g) || []).map(s => s.length));
// Let's see what main sections exist
const sections = [...html.matchAll(/<(main|section|div class="view"|div id="view-[^"]+")[^>]*>/g)].map(m => m[0]);
console.log('Sections / Views in HTML:');
sections.forEach(s => console.log('  ', s.slice(0, 100)));
