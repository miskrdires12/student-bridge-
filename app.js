// ============================================================================
// SILICON LABS — YEGARA CPANEL PHUSION PASSENGER ENTRYPOINT
// ============================================================================
const http = require('http');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'production';
process.chdir(__dirname);

// 1. Load standalone Next.js configuration to bypass webpack bundle5 requirement
let nextConfig;
try {
  const reqFilesPath = path.join(__dirname, '.next', 'required-server-files.json');
  if (fs.existsSync(reqFilesPath)) {
    nextConfig = JSON.parse(fs.readFileSync(reqFilesPath, 'utf8')).config;
    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
  }
} catch (e) {
  console.warn('[Yegara Hosting] Note loading required-server-files.json:', e.message);
}

// 2. Initialize Next.js in production mode pointing to this root directory
const next = require('next');
const app = next({ dev: false, dir: __dirname, conf: nextConfig });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  // Passenger passes either a port number OR a named socket pipe via process.env.PORT
  // Do NOT parseInt() because Unix domain sockets (e.g. pipe:/tmp/passenger... or /tmp/passenger.sock)
  // become NaN when parsed as an integer.
  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log('[Yegara Hosting] Student Bridge ready and listening on ' + port);
  });
}).catch((err) => {
  console.error('[Yegara Hosting] Failed to prepare Next.js app:', err);
  process.exit(1);
});
