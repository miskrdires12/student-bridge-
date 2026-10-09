const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const headMatch = html.match(/<head[\s\S]*?<\/head>/);
if (headMatch) {
  console.log(headMatch[0]);
}
