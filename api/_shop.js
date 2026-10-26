// testmaadu.mart demo API v2. Shared by the Vercel function (api/index.js) and the local server (server.js).
// No database: the catalog is fixed, everything else lives in memory (it resets when the server restarts).
// Planted bugs and security findings for TestMaadu demos are marked "DEMO BUG" or "DEMO FINDING" (also listed in README.md).

const crypto = require('crypto');

const PRODUCTS = [
  { id: 'P101', name: 'Aurora Wireless Headphones', category: 'Electronics', price: 2499, mrp: 3999, rating: 4.6, reviews: 1284, stock: 18, freeDelivery: true, emoji: '🎧', colors: ['#c7d2fe', '#818cf8'], description: 'Over-ear Bluetooth headphones with 40 hour battery and active noise cancellation.' },
  { id: 'P102', name: 'Pulse Smart Watch', category: 'Electronics', price: 3299, mrp: 4999, rating: 4.3, reviews: 842, stock: 9, freeDelivery: true, emoji: '⌚', colors: ['#bae6fd', '#38bdf8'], description: 'AMOLED display, heart rate, SpO2 and 100+ sports modes.' },
  { id: 'P103', name: 'Nimbus Bluetooth Speaker', category: 'Electronics', price: 1599, mrp: 2299, rating: 4.1, reviews: 530, stock: 0, freeDelivery: false, emoji: '🔊', colors: ['#ddd6fe', '#a78bfa'], description: 'Pocket sized speaker with deep bass and IPX7 water resistance.' },
  { id: 'P104', name: 'Trail Runner Sneakers', category: 'Fashion', price: 1899, mrp: 2999, rating: 4.4, reviews: 961, stock: 25, freeDelivery: true, emoji: '👟', colors: ['#fed7aa', '#fb923c'], description: 'Lightweight running shoes with breathable mesh upper.' },
  { id: 'P105', name: 'Classic Denim Jacket', category: 'Fashion', price: 2499, mrp: 3999, rating: 4.2, reviews: 312, stock: 12, freeDelivery: false, emoji: '🧥', colors: ['#bfdbfe', '#60a5fa'], description: 'Timeless washed denim jacket in a relaxed fit.' },
  { id: 'P106', name: 'Sunset Aviator Sunglasses', category: 'Fashion', price: 899, mrp: 1499, rating: 3.9, reviews: 204, stock: 40, freeDelivery: true, emoji: '🕶️', colors: ['#fde68a', '#f59e0b'], description: 'UV400 polarised lenses with a metal frame.' },
  { id: 'P107', name: 'Brew Master Coffee Maker', category: 'Home', price: 4499, mrp: 5999, rating: 4.5, reviews: 678, stock: 6, freeDelivery: true, emoji: '☕', colors: ['#e7e5e4', '#a8a29e'], description: 'Drip coffee maker with a 12 cup glass carafe and keep-warm plate.' },
  { id: 'P108', name: 'Zen Ceramic Plant Pot', category: 'Home', price: 499, mrp: 799, rating: 4.0, reviews: 150, stock: 60, freeDelivery: false, emoji: '🪴', colors: ['#bbf7d0', '#4ade80'], description: 'Hand glazed ceramic pot with a drainage hole and bamboo tray.' },
  { id: 'P109', name: 'Cosy Throw Blanket', category: 'Home', price: 1299, mrp: 1999, rating: 4.7, reviews: 433, stock: 15, freeDelivery: true, emoji: '🛋️', colors: ['#fbcfe8', '#f472b6'], description: 'Super soft fleece throw, 150 x 200 cm.' },
  { id: 'P110', name: 'The Testing Mindset', category: 'Books', price: 399, mrp: 599, rating: 4.8, reviews: 1022, stock: 33, freeDelivery: false, emoji: '📘', colors: ['#c7d2fe', '#6366f1'], description: 'A practical guide to thinking like a great software tester.' },
  { id: 'P111', name: 'Automation Recipes', category: 'Books', price: 549, mrp: 699, rating: 4.5, reviews: 388, stock: 21, freeDelivery: true, emoji: '📗', colors: ['#bbf7d0', '#22c55e'], description: 'Ready-made Playwright, Selenium and Cypress patterns.' },
  { id: 'P112', name: 'Pro Yoga Mat', category: 'Sports', price: 999, mrp: 1599, rating: 4.3, reviews: 720, stock: 28, freeDelivery: true, emoji: '🧘', colors: ['#a5f3fc', '#06b6d4'], description: '6 mm anti-slip mat with a carry strap.' },
  { id: 'P113', name: 'Champion Cricket Bat', category: 'Sports', price: 2799, mrp: 3999, rating: 4.6, reviews: 289, stock: 7, freeDelivery: false, emoji: '🏏', colors: ['#fef08a', '#eab308'], description: 'English willow bat, short handle, full size.' },
  { id: 'P114', name: 'Hydro Steel Bottle', category: 'Sports', price: 649, mrp: 999, rating: 4.2, reviews: 515, stock: 50, freeDelivery: true, emoji: '🧴', colors: ['#cffafe', '#22d3ee'], description: 'Insulated 1 litre bottle, cold for 24 hours.' }
];

const CATEGORIES = ['Electronics', 'Fashion', 'Home', 'Books', 'Sports'];
const CATEGORY_LOOK = {
  Electronics: { emoji: '📦', colors: ['#c7d2fe', '#818cf8'] }, Fashion: { emoji: '🛍️', colors: ['#fed7aa', '#fb923c'] },
  Home: { emoji: '🏠', colors: ['#bbf7d0', '#4ade80'] }, Books: { emoji: '📚', colors: ['#bfdbfe', '#60a5fa'] }, Sports: { emoji: '🏅', colors: ['#a5f3fc', '#06b6d4'] }
};
const COUPONS = { TESTMAADU10: { type: 'percent', value: 10, label: '10% off' }, FREESHIP: { type: 'shipping', value: 0, label: 'Free delivery' } };

// Demo accounts. Any other email with a 6+ character password signs in as a customer.
const ACCOUNTS = {
  'admin@testmaadu.in': { password: 'Admin@123', name: 'Store Admin', role: 'admin', phone: '9876500001' },
  'customer@testmaadu.in': { password: 'Demo@123', name: 'Demo Customer', role: 'customer', phone: '9876500002' },
  'demo@testmaadu.in': { password: 'Demo@123', name: 'Demo Tester', role: 'customer', phone: '9876500003' } // kept for older videos and tests
};

// DEMO FINDING: tokens are signed with a short shared secret (HS256), last 30 days and carry the phone number.
const JWT_SECRET = 'testmaadu-mart-secret';
const TOKEN_DAYS = 30;

const orders = new Map();       // email -> [order placed through the API]
const profiles = new Map();     // email -> profile
const wishlists = new Map();    // email -> [productId]
const addressBooks = new Map(); // email -> [address]
const shopProducts = new Map(); // demo session -> [product an admin added in that browser]
const productEdits = new Map(); // demo session -> { productId: changed fields }
const searchHits = new Map();   // client ip -> [timestamps] for the search rate limit

// Other customers' orders. Reachable only through the planted access bug in GET /orders/{id} (and the admin list).
const OTHER_ORDERS = [
  { id: 'OM-20261013-51862', owner: 'keerthana@gmail.com', status: 'Shipped', placedAt: '2026-10-13T09:12:00.000Z', items: [{ productId: 'P107', name: 'Brew Master Coffee Maker', emoji: '☕', price: 4499, qty: 1, lineTotal: 4499 }, { productId: 'P108', name: 'Zen Ceramic Plant Pot', emoji: '🪴', price: 499, qty: 2, lineTotal: 998 }], itemCount: 3, totals: { subtotal: 5497, discount: 0, shipping: 0, tax: 275, total: 5772, currency: 'INR' }, delivery: 'standard', address: { fullName: 'Keerthana', phone: '+919999000099', line1: '12 3rd Cross, Banashankari', line2: '', city: 'Bangalore', state: 'Karnataka', pincode: '560050' }, payment: { method: 'card', cardLast4: '4242', transactionId: 'TXN1760346720000' }, email: 'Keerthana@gmail.com', estimatedDelivery: '2026-10-18' },
  { id: 'OM-20261011-73519', owner: 'priya.sharma@example.com', status: 'Delivered', placedAt: '2026-10-11T15:40:00.000Z', items: [{ productId: 'P102', name: 'Pulse Smart Watch', emoji: '⌚', price: 3299, qty: 2, lineTotal: 6598 }], itemCount: 2, totals: { subtotal: 6598, discount: 660, shipping: 0, tax: 297, total: 6235, currency: 'INR' }, delivery: 'express', address: { fullName: 'Priya Sharma', phone: '98860 41237', line1: '44 Indiranagar 2nd Stage', line2: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' }, payment: { method: 'upi', upiId: 'priya@okbank', transactionId: 'TXN1760197200000' }, estimatedDelivery: '2026-10-13' }
];

// ---------------------------------------------------------------- tokens
const b64u = s => Buffer.from(s).toString('base64url');
function signJwt(payload) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(head + '.' + body).digest('base64url');
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(parts[0] + '.' + parts[1]).digest('base64url');
  if (sig.length !== parts[2].length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(parts[2]))) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch { return null; }
}
function readAuth(req) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers['authorization'] || '');
  return m ? verifyJwt(m[1]) : null;
}
function makeToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({ sub: user.email, email: user.email, name: user.name, phone: user.phone || '', role: user.role, iat: now, exp: now + TOKEN_DAYS * 86400 });
}

function defaultProfile(email) {
  const acc = ACCOUNTS[email];
  return { email, name: acc ? acc.name : email.split('@')[0], role: acc ? acc.role : 'customer', phone: acc ? acc.phone : '', country: 'India', deliverySlot: 'anytime', notifications: { orderUpdates: true, offers: false, newsletter: false } };
}
const profileOf = email => { if (!profiles.has(email)) profiles.set(email, defaultProfile(email)); return profiles.get(email); };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const between = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function hashOf(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
const clientIp = req => String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'local').split(',')[0].trim();

// ---------------------------------------------------------------- catalog: fixed products + products an admin added in this browser
// Each browser sends its own X-Demo-Session id, so products one visitor adds never show up for other visitors.
const sessionOf = req => String(req.headers['x-demo-session'] || 'public').slice(0, 64);
function catalog(session) {
  const edits = productEdits.get(session) || {};
  return [...PRODUCTS, ...(shopProducts.get(session) || [])].map(p => edits[p.id] ? { ...p, ...edits[p.id] } : p);
}
function cleanProductInput(b, partial) {
  const out = {};
  const want = (k, test, msg) => {
    if (b[k] === undefined) return partial ? null : msg;
    if (!test(b[k])) return msg;
    out[k] = b[k]; return null;
  };
  const errs = [
    want('name', v => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 60, 'Name must be 2 to 60 characters.'),
    want('category', v => CATEGORIES.includes(v), `Category must be one of ${CATEGORIES.join(', ')}.`),
    want('price', v => Number.isInteger(v) && v >= 1 && v <= 100000, 'Price must be a whole number from 1 to 100000.'),
    want('mrp', v => Number.isInteger(v) && v >= 1 && v <= 100000, 'MRP must be a whole number from 1 to 100000.'),
    want('stock', v => Number.isInteger(v) && v >= 0 && v <= 999, 'Stock must be a whole number from 0 to 999.')
  ].filter(Boolean);
  if (errs.length) return { error: errs[0] };
  if (b.description !== undefined) { if (typeof b.description !== 'string' || b.description.length > 500) return { error: 'Description can be up to 500 characters.' }; out.description = b.description.trim(); }
  if (b.image !== undefined && b.image !== null && b.image !== '') {
    if (typeof b.image !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(b.image) || b.image.length > 400000) return { error: 'Image must be a PNG, JPG, WEBP or GIF under 300 KB.' };
    out.image = b.image;
  } else if (b.image === null || b.image === '') out.image = '';
  if (b.freeDelivery !== undefined) out.freeDelivery = !!b.freeDelivery;
  if (out.name) out.name = out.name.trim();
  return { value: out };
}
// A product a browser added can be missing on a fresh server (Vercel cold start). The cart then sends its copy along.
function snapshotProduct(it) {
  const s = it && it.product;
  if (!s || !/^N\d{4,6}$/.test(String(it.productId))) return null;
  const c = cleanProductInput({ name: s.name, category: s.category, price: s.price, mrp: s.mrp || s.price, stock: s.stock }, false);
  return c.error ? null : { id: it.productId, emoji: s.emoji || '📦', ...c.value };
}

function priceCart(items, coupon, delivery, session) {
  if (!Array.isArray(items) || items.length === 0) return { error: [400, 'EMPTY_CART', 'Cart is empty. Add at least one product.'] };
  const all = catalog(session);
  const lines = [];
  for (const it of items) {
    const p = all.find(x => x.id === (it && it.productId)) || snapshotProduct(it);
    const qty = Number(it && it.qty);
    if (!p) return { error: [404, 'PRODUCT_NOT_FOUND', `Product ${it && it.productId} does not exist.`] };
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return { error: [400, 'INVALID_QTY', `Quantity for ${p.id} must be 1 to 10.`] };
    if (p.stock < qty) return { error: [409, 'OUT_OF_STOCK', `${p.name} has only ${p.stock} left in stock.`] };
    lines.push({ productId: p.id, name: p.name, emoji: p.emoji, price: p.price, qty, lineTotal: p.price * qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  let discount = 0, couponApplied = null;
  const code = (coupon || '').trim().toUpperCase();
  if (code) {
    const c = COUPONS[code];
    if (!c) return { error: [422, 'INVALID_COUPON', `Coupon ${code} is not valid.`] };
    couponApplied = { code, label: c.label };
    if (c.type === 'percent') discount = Math.round(subtotal * c.value / 100);
  }
  let shipping = subtotal >= 999 ? 0 : 49;
  if (delivery === 'express') shipping += 99;
  if (couponApplied && COUPONS[code].type === 'shipping') shipping = 0;
  const tax = Math.round((subtotal - discount) * 0.05);
  const total = subtotal - discount + shipping + tax;
  return { cart: { lines, itemCount, subtotal, discount, shipping, tax, total, coupon: couponApplied, currency: 'INR' } };
}

// ---------------------------------------------------------------- generated content
const REVIEW_POOL = [
  ['Ananya R.', 5, 'Exactly as described. Delivery was a day early.'], ['Vikram S.', 4, 'Good value for the price. Packaging could be better.'],
  ['Meera K.', 5, 'Bought a second one as a gift.'], ['Arjun P.', 3, 'Works fine, but the colour is a bit different from the photo.'],
  ['Sneha M.', 4, 'Solid quality. Would recommend.'], ['Rohit N.', 2, 'Stopped working after two weeks, replacement was quick though.'],
  ['Divya T.', 5, 'Love it, using it every day.'], ['Karthik B.', 4, 'Does the job. Instructions were clear.']
];
function reviewsFor(p) {
  if (p.isNew) return [];
  const r = rng(hashOf(p.id));
  return Array.from({ length: 5 }, (_, i) => {
    const [author, rating, text] = REVIEW_POOL[Math.floor(r() * REVIEW_POOL.length)];
    return { id: `${p.id}-R${i + 1}`, author, rating, text, date: new Date(Date.UTC(2026, 8, 1) + Math.floor(r() * 50) * 864e5).toISOString().slice(0, 10), verified: r() > 0.3 };
  });
}
function ratingSummary(p) {
  const total = p.reviews || 0;
  const five = Math.round(total * Math.max(0, ((p.rating || 0) - 3) / 2) * 0.8);
  const four = Math.round((total - five) * 0.55);
  const three = Math.round((total - five - four) * 0.5);
  const two = Math.round((total - five - four - three) * 0.5);
  return { productId: p.id, average: p.rating || 0, count: total, breakdown: { 5: five, 4: four, 3: three, 2: two, 1: Math.max(0, total - five - four - three - two) } };
}
// Past orders so My orders has enough rows for the table view (paging, sorting). Same rows every time for the same email.
function pastOrders(email) {
  const r = rng(hashOf(email));
  const statuses = ['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Cancelled', 'Returned'];
  const prof = profileOf(email);
  return Array.from({ length: 22 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 20, 10) - (i * 7 + Math.floor(r() * 6)) * 864e5);
    const n = 1 + Math.floor(r() * 2);
    const items = [];
    for (let k = 0; k < n; k++) {
      const p = PRODUCTS[Math.floor(r() * PRODUCTS.length)];
      const qty = 1 + Math.floor(r() * 2);
      if (!items.some(x => x.productId === p.id)) items.push({ productId: p.id, name: p.name, emoji: p.emoji, price: p.price, qty, lineTotal: p.price * qty });
    }
    const subtotal = items.reduce((s, x) => s + x.lineTotal, 0);
    const tax = Math.round(subtotal * 0.05);
    const shipping = subtotal >= 999 ? 0 : 49;
    const card = r() > 0.5;
    return {
      id: `OM-${d.toISOString().slice(0, 10).replace(/-/g, '')}-${10000 + Math.floor(r() * 89999)}`, status: statuses[Math.floor(r() * statuses.length)], placedAt: d.toISOString(),
      items, itemCount: items.reduce((s, x) => s + x.qty, 0), totals: { subtotal, discount: 0, shipping, tax, total: subtotal + shipping + tax, currency: 'INR' },
      coupon: null, delivery: 'standard', address: { fullName: prof.name, phone: prof.phone || '9876500002', line1: '21 MG Road', line2: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      payment: card ? { method: 'card', cardLast4: '1111', transactionId: 'TXN' + d.getTime() } : { method: 'upi', upiId: 'demo@okbank', transactionId: 'TXN' + d.getTime() },
      giftWrap: false, estimatedDelivery: new Date(d.getTime() + 5 * 864e5).toISOString().slice(0, 10), sample: true
    };
  });
}
const ordersOf = email => [...(orders.get(email) || []), ...pastOrders(email)];

// ---------------------------------------------------------------- http helpers
function send(res, status, body, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  // DEMO FINDING: CORS trusts any site and allows credentials.
  res.setHeader('Access-Control-Allow-Origin', res.omOrigin || '*');
  if (res.omOrigin) res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Demo-Session');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // DEMO FINDING: version banners.
  res.setHeader('X-Powered-By', 'Express/4.17.1');
  res.setHeader('Server', 'nginx/1.18.0 (Ubuntu)');
  for (const [k, v] of Object.entries(extraHeaders || {})) res.setHeader(k, v);
  res.end(status === 204 ? '' : JSON.stringify(body, null, 2));
}
const fail = (res, status, code, message, extra, headers) => send(res, status, { error: code, message, ...(extra || {}) }, headers);

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch { return undefined; } }
    if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString() || '{}'); } catch { return undefined; } }
    return req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return undefined; }
}

function newOrderId() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `OM-${ymd}-${Math.floor(10000 + Math.random() * 90000)}`;
}

// ---------------------------------------------------------------- routes
async function handle(req, res, path) {
  const method = req.method.toUpperCase();
  const url = new URL(req.url, 'http://localhost');
  path = ('/' + (path || '').replace(/^\/+/, '')).replace(/\/+$/, '') || '/';
  res.omOrigin = req.headers.origin || '';
  if (method === 'OPTIONS') return send(res, 204);
  const session = sessionOf(req);
  const auth = readAuth(req);
  const email = auth && auth.email;
  const body = async () => { const b = await readBody(req); if (b === undefined || b === null || typeof b !== 'object') { fail(res, 400, 'BAD_JSON', 'Request body must be valid JSON.'); return null; } return b; };
  const needLogin = () => { if (!email) { fail(res, 401, 'UNAUTHORIZED', 'Sign in first. Send header Authorization: Bearer <token>.'); return false; } return true; };
  const needAdmin = () => { if (!needLogin()) return false; if (auth.role !== 'admin') { fail(res, 403, 'FORBIDDEN', 'Only an admin can do this. Sign in as admin@testmaadu.in.'); return false; } return true; };
  let m;

  // ---- Health
  if (path === '/health' && method === 'GET') return send(res, 200, { status: 'ok', service: 'testmaadu.mart demo API', version: '2.0.0', time: new Date().toISOString() });

  // ---- Auth
  if (path === '/auth/login' && method === 'POST') {
    const b = await body(); if (!b) return;
    const em = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!em || !password) return fail(res, 400, 'MISSING_FIELDS', 'Email and password are required.');
    const acc = ACCOUNTS[em];
    const ok = acc ? password === acc.password : (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) && password.length >= 6);
    if (!ok) return fail(res, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    const user = profileOf(em);
    const token = makeToken(user);
    // DEMO FINDING: session cookie readable by scripts (no HttpOnly), no SameSite, no Secure, lasts 45 days.
    return send(res, 200, { token, tokenType: 'Bearer', expiresIn: TOKEN_DAYS * 86400, user }, { 'Set-Cookie': `om_session=${token}; Path=/; Max-Age=${45 * 86400}` });
  }
  if (path === '/auth/logout' && method === 'POST') return send(res, 200, { ok: true }, { 'Set-Cookie': 'om_session=; Path=/; Max-Age=0' });
  if (path === '/auth/me' && method === 'GET') { if (!needLogin()) return; return send(res, 200, { ...profileOf(email), role: auth.role, tokenExpires: new Date(auth.exp * 1000).toISOString() }); }

  // ---- Catalog
  if (path === '/categories' && method === 'GET') return send(res, 200, CATEGORIES);
  if (path === '/search/suggest' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) return send(res, 200, []);
    return send(res, 200, catalog(session).filter(p => p.name.toLowerCase().includes(q)).slice(0, 6).map(p => ({ id: p.id, name: p.name, category: p.category, emoji: p.emoji })));
  }
  if (path === '/products' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (q) {
      // Search is slower than browsing, and limited to 30 searches a minute for each visitor.
      const ip = clientIp(req), now = Date.now();
      const hits = (searchHits.get(ip) || []).filter(t => now - t < 60000);
      if (hits.length >= 30) {
        searchHits.set(ip, hits);
        const wait = Math.max(1, Math.ceil((60000 - (now - hits[0])) / 1000));
        return fail(res, 429, 'RATE_LIMITED', 'Too many searches. Try again in a minute.', { retryAfterSeconds: wait }, { 'Retry-After': String(wait) });
      }
      hits.push(now); searchHits.set(ip, hits);
      await sleep(between(300, 800));
      // DEMO BUG: a search with an apostrophe (kid's) crashes the search and leaks a stack trace.
      if (q.includes("'")) {
        const near = (q.split("'")[1] || '').split(' ')[0] || "'";
        return send(res, 500, { error: 'SERVER_ERROR', message: `SQLITE_ERROR: near "${near}": syntax error`, query: `SELECT * FROM products WHERE name LIKE '%${q}%'`, stack: 'Error: SQLITE_ERROR: syntax error\n    at Statement.all (/var/task/node_modules/sqlite3/lib/sqlite3.js:217:24)\n    at searchProducts (/var/task/api/_shop.js:212:15)\n    at handle (/var/task/api/_shop.js:330:22)\n    at module.exports (/var/task/api/index.js:11:15)' });
      }
    }
    const category = url.searchParams.get('category') || '';
    const inStock = url.searchParams.get('inStock') === 'true';
    const freeDelivery = url.searchParams.get('freeDelivery') === 'true';
    const minRating = Number(url.searchParams.get('minRating') || 0);
    const maxPrice = Number(url.searchParams.get('maxPrice') || 0);
    const sort = url.searchParams.get('sort') || 'popular';
    const list = catalog(session).filter(p =>
      (!q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)) &&
      (!category || category === 'All' || p.category === category) &&
      (!inStock || p.stock > 0) && (!freeDelivery || p.freeDelivery) && (p.isNew || (p.rating || 0) >= minRating) && (!maxPrice || p.price <= maxPrice));
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else list.sort((a, b) => (b.isNew ? 1e9 : b.reviews) - (a.isNew ? 1e9 : a.reviews));
    return send(res, 200, { total: list.length, items: list });
  }
  if (path === '/products' && method === 'POST') {
    if (!needAdmin()) return;
    const b = await body(); if (!b) return;
    const c = cleanProductInput(b, false);
    if (c.error) return fail(res, 422, 'INVALID_PRODUCT', c.error);
    if (c.value.mrp < c.value.price) return fail(res, 422, 'INVALID_PRODUCT', 'MRP cannot be lower than the price.');
    const look = CATEGORY_LOOK[c.value.category];
    const p = { id: 'N' + between(10000, 99999), emoji: look.emoji, colors: look.colors, rating: 0, reviews: 0, freeDelivery: false, description: '', image: '', ...c.value, isNew: true, createdBy: email, createdAt: new Date().toISOString() };
    const list = shopProducts.get(session) || [];
    list.push(p); shopProducts.set(session, list);
    return send(res, 201, p, { Location: `/api/products/${p.id}` });
  }
  m = /^\/products\/([A-Za-z0-9]+)$/.exec(path);
  if (m && ['GET', 'PUT', 'DELETE'].includes(method)) {
    const id = m[1].toUpperCase();
    const p = catalog(session).find(x => x.id === id);
    if (method === 'GET') return p ? send(res, 200, p) : fail(res, 404, 'PRODUCT_NOT_FOUND', `Product ${m[1]} does not exist.`);
    if (method === 'PUT') {
      // DEMO BUG (access control): only checks that someone is signed in, not that they are an admin.
      // A customer token can change any price through the API. POST and DELETE check the role correctly.
      if (!needLogin()) return;
      if (!p) return fail(res, 404, 'PRODUCT_NOT_FOUND', `Product ${m[1]} does not exist.`);
      const b = await body(); if (!b) return;
      const c = cleanProductInput(b, true);
      if (c.error) return fail(res, 422, 'INVALID_PRODUCT', c.error);
      const next = { ...p, ...c.value };
      if (next.mrp < next.price) return fail(res, 422, 'INVALID_PRODUCT', 'MRP cannot be lower than the price.');
      const own = (shopProducts.get(session) || []).find(x => x.id === id);
      if (own) Object.assign(own, c.value, { updatedAt: new Date().toISOString() });
      else { const e = productEdits.get(session) || {}; e[id] = { ...(e[id] || {}), ...c.value }; productEdits.set(session, e); }
      return send(res, 200, { ...next, updatedAt: new Date().toISOString(), updatedBy: email });
    }
    if (!needAdmin()) return;
    const list = shopProducts.get(session) || [];
    const i = list.findIndex(x => x.id === id);
    if (i < 0) return PRODUCTS.some(x => x.id === id) ? fail(res, 409, 'BUILT_IN_PRODUCT', 'The 14 built-in demo products cannot be deleted.') : fail(res, 404, 'PRODUCT_NOT_FOUND', `Product ${m[1]} does not exist.`);
    list.splice(i, 1);
    return send(res, 204);
  }
  m = /^\/products\/([A-Za-z0-9]+)\/reviews$/.exec(path);
  if (m && method === 'GET') {
    const p = catalog(session).find(x => x.id === m[1].toUpperCase());
    if (!p) return fail(res, 404, 'PRODUCT_NOT_FOUND', `Product ${m[1]} does not exist.`);
    const items = reviewsFor(p);
    return send(res, 200, { productId: p.id, total: items.length, items });
  }
  if (path === '/recommendations' && method === 'GET') {
    // Usually under a second, sometimes 2 to 3 seconds: fails a 1 second performance budget now and then.
    await sleep(Math.random() < 0.3 ? between(2000, 3000) : between(400, 900));
    const exclude = (url.searchParams.get('exclude') || '').toUpperCase();
    const pool = catalog(session).filter(p => p.id !== exclude && p.stock > 0);
    return send(res, 200, { reason: 'Popular with shoppers like you', items: [...pool].sort(() => Math.random() - 0.5).slice(0, 4) });
  }
  if (path === '/delivery/check' && method === 'GET') {
    const pin = url.searchParams.get('pincode') || '';
    if (!/^[1-9][0-9]{5}$/.test(pin)) return fail(res, 422, 'INVALID_PINCODE', 'Enter a valid 6 digit PIN code.');
    const metro = /^(56|40|11|60|50|70)/.test(pin);
    return send(res, 200, { pincode: pin, deliverable: true, days: metro ? 2 : 5, cod: metro, expressAvailable: metro });
  }

  // ---- GraphQL (product reviews): two operations, GetReviews and GetRatingSummary
  if (path === '/graphql' && method === 'POST') {
    const b = await body(); if (!b) return;
    const query = String(b.query || '');
    const op = b.operationName || (/(?:query|mutation)\s+(\w+)/.exec(query) || [])[1] || '';
    const pid = String((b.variables && b.variables.productId) || '').toUpperCase();
    const p = catalog(session).find(x => x.id === pid);
    if (!p) return send(res, 200, { data: null, errors: [{ message: `Product ${pid || '(missing)'} not found`, path: ['product'], extensions: { code: 'NOT_FOUND' } }] });
    if (op === 'GetReviews' || (!op && /reviews\s*\(/.test(query))) return send(res, 200, { data: { reviews: reviewsFor(p) } });
    if (op === 'GetRatingSummary' || (!op && /ratingSummary/.test(query))) return send(res, 200, { data: { ratingSummary: ratingSummary(p) } });
    return send(res, 200, { data: null, errors: [{ message: 'Unknown operation. Use GetReviews or GetRatingSummary.', extensions: { code: 'BAD_OPERATION' } }] });
  }

  // ---- Cart pricing (cart itself is kept in the browser)
  if (path === '/cart/quote' && method === 'POST') {
    const b = await body(); if (!b) return;
    const r = priceCart(b.items, b.coupon, b.delivery, session);
    return r.error ? fail(res, ...r.error) : send(res, 200, r.cart);
  }

  // ---- AI chat assistant (streams OpenAI-style server-sent events)
  if (path === '/chat' && method === 'POST') {
    const b = await body(); if (!b) return;
    return require('./_chat.js').chat(req, res, b, PRODUCTS, send);
  }

  // ---- Notifications (polled by the header bell every 30 seconds)
  if (path === '/notifications' && method === 'GET') {
    const min = Math.floor(Date.now() / 60000);
    const items = [
      { id: 'N-OFFER', type: 'offer', text: 'Festive sale: extra 10% off with TESTMAADU10', at: new Date((min - 2) * 60000).toISOString(), read: false },
      { id: 'N-SHIP', type: 'order', text: email ? 'One of your orders has shipped' : 'Sign in to see order updates', at: new Date(Date.now() - 36e5).toISOString(), read: !email },
      { id: 'N-PIN', type: 'info', text: 'New: check delivery to your PIN code on every product page', at: new Date(Date.now() - 864e5).toISOString(), read: true }
    ];
    return send(res, 200, { unread: items.filter(i => !i.read).length, items });
  }

  // ---- Everything below needs a login
  if (path === '/profile' && method === 'GET') { if (!needLogin()) return; return send(res, 200, profileOf(email)); }
  if (path === '/profile' && method === 'PUT') {
    if (!needLogin()) return;
    const b = await body(); if (!b) return;
    if (b.name !== undefined && !String(b.name).trim()) return fail(res, 422, 'INVALID_NAME', 'Name cannot be empty.');
    // Phone must be digits only. (The DEMO BUG is in the page: it says "Profile saved" even when this returns 400.)
    if (b.phone && !/^[0-9]{7,15}$/.test(String(b.phone).replace(/[\s-]/g, ''))) return fail(res, 400, 'INVALID_PHONE', 'Phone must be 7 to 15 digits, without +91 or other symbols.');
    const cur = profileOf(email);
    const next = { ...cur, ...b, email, role: cur.role, notifications: { ...cur.notifications, ...(b.notifications || {}) } };
    profiles.set(email, next);
    return send(res, 200, next);
  }

  if (path === '/wishlist' && (method === 'GET' || method === 'POST')) {
    if (!needLogin()) return;
    const list = wishlists.get(email) || [];
    if (method === 'GET') return send(res, 200, { total: list.length, items: list.map(id => catalog(session).find(p => p.id === id)).filter(Boolean) });
    const b = await body(); if (!b) return;
    const p = catalog(session).find(x => x.id === String(b.productId || '').toUpperCase());
    if (!p) return fail(res, 404, 'PRODUCT_NOT_FOUND', `Product ${b.productId} does not exist.`);
    if (!list.includes(p.id)) list.push(p.id);
    wishlists.set(email, list);
    return send(res, 201, { total: list.length, productIds: list });
  }
  m = /^\/wishlist\/([A-Za-z0-9]+)$/.exec(path);
  if (m && method === 'DELETE') {
    if (!needLogin()) return;
    const list = (wishlists.get(email) || []).filter(id => id !== m[1].toUpperCase());
    wishlists.set(email, list);
    return send(res, 200, { total: list.length, productIds: list });
  }

  const ADDRESS_FIELDS = ['label', 'fullName', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'];
  const checkAddress = a => {
    for (const f of ['fullName', 'phone', 'line1', 'city', 'state', 'pincode']) if (!String(a[f] || '').trim()) return `Address field "${f}" is required.`;
    if (!/^[1-9][0-9]{5}$/.test(String(a.pincode))) return 'PIN code must be 6 digits.';
    return null;
  };
  const bookOf = em => {
    if (!addressBooks.has(em)) addressBooks.set(em, [{ id: 'A1', label: 'Home', fullName: profileOf(em).name, phone: profileOf(em).phone || '9876500002', line1: '21 MG Road', line2: 'Near Metro station', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', isDefault: true }]);
    return addressBooks.get(em);
  };
  if (path === '/addresses' && (method === 'GET' || method === 'POST')) {
    if (!needLogin()) return;
    const book = bookOf(email);
    if (method === 'GET') return send(res, 200, { total: book.length, items: book });
    const b = await body(); if (!b) return;
    const err = checkAddress(b); if (err) return fail(res, 422, 'INVALID_ADDRESS', err);
    const a = { id: 'A' + Date.now().toString(36).toUpperCase(), isDefault: false };
    for (const f of ADDRESS_FIELDS) a[f] = String(b[f] || '').trim();
    a.label = a.label || 'Other';
    book.push(a);
    return send(res, 201, a);
  }
  m = /^\/addresses\/([A-Za-z0-9]+)$/.exec(path);
  if (m && (method === 'PUT' || method === 'DELETE')) {
    if (!needLogin()) return;
    const book = bookOf(email);
    const i = book.findIndex(a => a.id === m[1]);
    if (i < 0) return fail(res, 404, 'ADDRESS_NOT_FOUND', `Address ${m[1]} was not found.`);
    if (method === 'DELETE') { book.splice(i, 1); return send(res, 204); }
    const b = await body(); if (!b) return;
    const next = { ...book[i] };
    for (const f of ADDRESS_FIELDS) if (b[f] !== undefined) next[f] = String(b[f]).trim();
    const err = checkAddress(next); if (err) return fail(res, 422, 'INVALID_ADDRESS', err);
    if (b.isDefault === true) { book.forEach(a => { a.isDefault = false; }); next.isDefault = true; }
    book[i] = next;
    return send(res, 200, next);
  }

  if (path === '/checkout' && method === 'POST') {
    if (!needLogin()) return;
    const b = await body(); if (!b) return;
    await sleep(between(350, 450));
    const a = b.address || {};
    for (const f of ['fullName', 'phone', 'line1', 'city', 'pincode', 'state']) {
      if (!String(a[f] || '').trim()) return fail(res, 422, 'INVALID_ADDRESS', `Address field "${f}" is required.`);
    }
    if (!/^[1-9][0-9]{5}$/.test(String(a.pincode))) return fail(res, 422, 'INVALID_PINCODE', 'PIN code must be 6 digits.');
    const pay = b.payment || {};
    if (!['card', 'upi', 'cod'].includes(pay.method)) return fail(res, 422, 'INVALID_PAYMENT_METHOD', 'Payment method must be card, upi or cod.');
    if (pay.method === 'upi' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(String(pay.upiId || ''))) return fail(res, 422, 'INVALID_UPI', 'Enter a valid UPI ID like name@bank.');
    if (pay.method === 'card' && !/^[0-9]{4}$/.test(String(pay.cardLast4 || ''))) return fail(res, 422, 'INVALID_CARD', 'Card details are missing.');
    const r = priceCart(b.items, b.coupon, b.delivery, session);
    if (r.error) return fail(res, ...r.error);

    // DEMO BUG: payment always fails when the cart has exactly 1 item.
    if (r.cart.itemCount === 1) {
      return send(res, 402, { error: 'PAYMENT_FAILED', message: 'Payment could not be processed. Please try again.', gatewayCode: 'GW-5001', amount: r.cart.total, currency: 'INR' });
    }

    const order = {
      id: newOrderId(), status: 'Confirmed', placedAt: new Date().toISOString(),
      items: r.cart.lines, itemCount: r.cart.itemCount,
      totals: { subtotal: r.cart.subtotal, discount: r.cart.discount, shipping: r.cart.shipping, tax: r.cart.tax, total: r.cart.total, currency: 'INR' },
      coupon: r.cart.coupon, delivery: b.delivery === 'express' ? 'express' : 'standard', deliveryDate: b.deliveryDate || null,
      address: { fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 || '', city: a.city, state: a.state, pincode: a.pincode },
      payment: { method: pay.method, cardLast4: pay.method === 'card' ? pay.cardLast4 : undefined, upiId: pay.method === 'upi' ? pay.upiId : undefined, transactionId: 'TXN' + Date.now() },
      giftWrap: !!b.giftWrap, owner: email,
      estimatedDelivery: new Date(Date.now() + (b.delivery === 'express' ? 2 : 5) * 864e5).toISOString().slice(0, 10)
    };
    if (!orders.has(email)) orders.set(email, []);
    orders.get(email).unshift(order);
    return send(res, 201, order);
  }

  if (path === '/orders' && method === 'GET') {
    if (!needLogin()) return;
    const list = ordersOf(email);
    return send(res, 200, { total: list.length, items: list });
  }
  m = /^\/orders\/([A-Za-z0-9-]+)$/.exec(path);
  if (m && method === 'GET') {
    if (!needLogin()) return;
    // DEMO BUG (access control, IDOR): any signed-in user can open any order by its ID, including other customers' orders.
    const o = ordersOf(email).find(x => x.id === m[1]) || OTHER_ORDERS.find(x => x.id === m[1]) || [...orders.values()].flat().find(x => x.id === m[1]);
    return o ? send(res, 200, o) : fail(res, 404, 'ORDER_NOT_FOUND', `Order ${m[1]} was not found.`);
  }

  // ---- Admin
  if (path === '/admin/orders' && method === 'GET') {
    if (!needAdmin()) return;
    const list = [...[...orders.values()].flat(), ...OTHER_ORDERS].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
    return send(res, 200, { total: list.length, items: list });
  }

  return fail(res, 404, 'NOT_FOUND', `No API route for ${method} /api${path}`);
}

module.exports = { handle };
