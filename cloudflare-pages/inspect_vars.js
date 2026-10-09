const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>[\s\S]*?<\/body>/);
if (scriptMatch) {
  const js = scriptMatch[1];
  console.log('Main JS length:', js.length);
  const vars = [...js.matchAll(/(?:let|const|var)\s+([a-zA-Z0-9_]+)\s*=/g)].map(m => m[1]);
  console.log('Top variables:', vars.slice(0, 40));
}
