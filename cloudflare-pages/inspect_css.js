const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (cssMatch) {
  const css = cssMatch[1];
  console.log('CSS Length:', css.length);
  const classes = [...css.matchAll(/\.([a-zA-Z0-9_-]+)\s*\{/g)].map(m => m[1]);
  console.log('Top classes sample:', classes.slice(0, 30));
}
