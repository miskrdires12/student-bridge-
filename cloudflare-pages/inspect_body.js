const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/main>/);
if (bodyMatch) {
  console.log('Body start to end of main:');
  console.log(bodyMatch[0].slice(0, 3000));
}
