const fs = require('fs');
const path = require('path');
const vm = require('vm');

const p1 = require('./p1_head_css.js');
const p2 = require('./p2_shell.js');
const p3 = require('./p3_views_sender.js');
const p4 = require('./p4_views_receiver.js');
const p5 = require('./p5_views_admin.js');
const p6 = require('./p6_views_superadmin.js');
const p7 = require('./p7_slideover_and_modals.js');
const p8 = require('./p8_scripts.js');

const fullHtml = p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8;
console.log('Combined HTML length:', fullHtml.length);

// Extract script tag and test syntax
const scriptMatch = fullHtml.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('ERROR: No script tag found!');
  process.exit(1);
}

const jsCode = scriptMatch[1];
console.log('Testing JS syntax validity, script length:', jsCode.length);
try {
  new vm.Script(jsCode);
  console.log('✔ JavaScript syntax validation PASSED!');
} catch (e) {
  console.error('❌ JavaScript Syntax Error:', e.message);
  process.exit(1);
}

// Write to index.html in parent directory
const targetPath = path.join(__dirname, '..', 'index.html');
fs.writeFileSync(targetPath, fullHtml, 'utf8');
console.log('✔ Successfully generated index.html at:', targetPath);
console.log('File size:', fs.statSync(targetPath).size, 'bytes');
