const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const roleConfigMatch = html.match(/const ROLE_CONFIG = \{[\s\S]*?\};/);
if (roleConfigMatch) console.log(roleConfigMatch[0]);

const renderAuthMatch = html.match(/function renderAuthenticatedSession\(\) \{[\s\S]*?\n  \}/);
if (renderAuthMatch) console.log(renderAuthMatch[0]);
