// Vercel serverless entry. vercel.json rewrites /api/<anything> to /api/index?path=<anything>.
const { handle } = require('./_shop.js');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = url.searchParams.get('path');
  if (path === null) path = url.pathname.replace(/^\/api/, '');
  url.searchParams.delete('path');
  req.url = '/api/' + path.replace(/^\/+/, '') + (url.search || '');
  try { await handle(req, res, path); }
  catch (e) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'SERVER_ERROR', message: e.message })); }
};
