const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

console.log('=== HEADER & NAV ===');
const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
if (headerMatch) console.log(headerMatch[0].slice(0, 1500));

console.log('=== SIDEBAR / DRAWER ===');
const sidebarMatch = html.match(/(<aside|<nav[\s\S]*?id="drawer"|<div[\s\S]*?sidebar)[\s\S]*?<\/nav>/);
if (sidebarMatch) console.log(sidebarMatch[0].slice(0, 1500));

console.log('=== USER ROLES / STATIONS ===');
const roleMatches = [...html.matchAll(/(role|station|sender|receiver|super_admin|admin)/gi)];
console.log('Role references count:', roleMatches.length);
