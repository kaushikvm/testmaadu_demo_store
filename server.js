// Run locally: node server.js   then open http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle } = require('./api/_shop.js');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.yaml': 'text/yaml' };
const PRIVATE = new Set(['server.js', 'package.json', 'vercel.json', 'README.md']);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
    try { return await handle(req, res, url.pathname.replace(/^\/api/, '')); }
    catch (e) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'SERVER_ERROR', message: e.message })); }
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || rel.startsWith('api' + path.sep) || PRIVATE.has(rel) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404; res.setHeader('Content-Type', 'text/html'); return fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`OnlineMart demo store running at http://localhost:${PORT}`));
