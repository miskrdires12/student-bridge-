const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const getElementByIdMatches = [...html.matchAll(/document\.getElementById\(["']([^"']+)["']\)/g)].map(m => m[1]);
const uniqueIds = [...new Set(getElementByIdMatches)];
console.log('Total unique IDs referenced in JS:', uniqueIds.length);

const missing = [];
uniqueIds.forEach(id => {
  const regex = new RegExp(`id=["']${id}["']`);
  if (!regex.test(html)) {
    missing.push(id);
  }
});

if (missing.length > 0) {
  console.log('⚠️ Potential missing IDs in HTML:', missing);
} else {
  console.log('✔ All referenced element IDs exist in HTML!');
}
