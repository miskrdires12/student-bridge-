const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const authAppIndex = html.indexOf('id="app-authenticated"');
if (authAppIndex !== -1) {
  console.log(html.slice(authAppIndex - 100, authAppIndex + 3000));
} else {
  console.log('No app-authenticated, checking header:');
  const headerIdx = html.indexOf('<header');
  console.log(html.slice(headerIdx, headerIdx + 3000));
}
