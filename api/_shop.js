// OnlineMart demo API. Shared by the Vercel function (api/index.js) and the local server (server.js).
// No database: catalog is fixed, orders and profiles live in memory (they reset when the server restarts).

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
const COUPONS = { TESTMAADU10: { type: 'percent', value: 10, label: '10% off' }, FREESHIP: { type: 'shipping', value: 0, label: 'Free delivery' } };
const DEMO_USER = { email: 'demo@testmaadu.in', password: 'Demo@123', name: 'Demo Tester' };

const orders = new Map();   // email -> [order]
const profiles = new Map(); // email -> profile

function defaultProfile(email) {
  return { email, name: email === DEMO_USER.email ? DEMO_USER.name : email.split('@')[0], phone: '', country: 'India', deliverySlot: 'anytime', notifications: { orderUpdates: true, offers: false, newsletter: false } };
}

function makeToken(email) { return 'tm_demo_' + Buffer.from(email).toString('base64url'); }
function readToken(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+tm_demo_([A-Za-z0-9_-]+)$/.exec(h);
  if (!m) return null;
  const email = Buffer.from(m[1], 'base64url').toString('utf8');
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

function priceCart(items, coupon, delivery) {
  if (!Array.isArray(items) || items.length === 0) return { error: [400, 'EMPTY_CART', 'Cart is empty. Add at least one product.'] };
  const lines = [];
  for (const it of items) {
    const p = PRODUCTS.find(x => x.id === (it && it.productId));
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

function send(res, status, body, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  for (const [k, v] of Object.entries(extraHeaders || {})) res.setHeader(k, v);
  res.end(status === 204 ? '' : JSON.stringify(body, null, 2));
}
const fail = (res, status, code, message) => send(res, status, { error: code, message });

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
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `OM-${ymd}-${Math.floor(10000 + Math.random() * 90000)}`;
}

async function handle(req, res, path) {
  const method = req.method.toUpperCase();
  const url = new URL(req.url, 'http://localhost');
  path = ('/' + (path || '').replace(/^\/+/, '')).replace(/\/+$/, '') || '/';
  if (method === 'OPTIONS') return send(res, 204);

  // ---- Health
  if (path === '/health' && method === 'GET') return send(res, 200, { status: 'ok', service: 'OnlineMart demo API', version: '1.0.0', time: new Date().toISOString() });

  // ---- Auth
  if (path === '/auth/login' && method === 'POST') {
    const b = await readBody(req);
    if (b === undefined) return fail(res, 400, 'BAD_JSON', 'Request body must be valid JSON.');
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!email || !password) return fail(res, 400, 'MISSING_FIELDS', 'Email and password are required.');
    const ok = (email === DEMO_USER.email && password === DEMO_USER.password) || (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && password.length >= 6 && email !== DEMO_USER.email);
    if (!ok) return fail(res, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    if (!profiles.has(email)) profiles.set(email, defaultProfile(email));
    return send(res, 200, { token: makeToken(email), tokenType: 'Bearer', user: profiles.get(email) });
  }

  // ---- Catalog
  if (path === '/categories' && method === 'GET') return send(res, 200, CATEGORIES);
  if (path === '/products' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const category = url.searchParams.get('category') || '';
    const inStock = url.searchParams.get('inStock') === 'true';
    const freeDelivery = url.searchParams.get('freeDelivery') === 'true';
    const minRating = Number(url.searchParams.get('minRating') || 0);
    const sort = url.searchParams.get('sort') || 'popular';
    let list = PRODUCTS.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) &&
      (!category || category === 'All' || p.category === category) &&
      (!inStock || p.stock > 0) && (!freeDelivery || p.freeDelivery) && p.rating >= minRating);
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => b.reviews - a.reviews);
    return send(res, 200, { total: list.length, items: list });
  }
  let m = /^\/products\/([A-Za-z0-9]+)$/.exec(path);
  if (m && method === 'GET') {
    const p = PRODUCTS.find(x => x.id === m[1].toUpperCase());
    return p ? send(res, 200, p) : fail(res, 404, 'PRODUCT_NOT_FOUND', `Product ${m[1]} does not exist.`);
  }

  // ---- Cart pricing (cart itself is kept in the browser)
  if (path === '/cart/quote' && method === 'POST') {
    const b = await readBody(req);
    if (b === undefined) return fail(res, 400, 'BAD_JSON', 'Request body must be valid JSON.');
    const r = priceCart(b.items, b.coupon, b.delivery);
    return r.error ? fail(res, ...r.error) : send(res, 200, r.cart);
  }

  // ---- Everything below needs a login
  const email = readToken(req);
  const needsAuth = path === '/profile' || path === '/checkout' || path === '/orders' || path.startsWith('/orders/');
  if (needsAuth && !email) return fail(res, 401, 'UNAUTHORIZED', 'Sign in first. Send header Authorization: Bearer <token>.');

  if (path === '/profile' && method === 'GET') {
    if (!profiles.has(email)) profiles.set(email, defaultProfile(email));
    return send(res, 200, profiles.get(email));
  }
  if (path === '/profile' && method === 'PUT') {
    const b = await readBody(req);
    if (b === undefined) return fail(res, 400, 'BAD_JSON', 'Request body must be valid JSON.');
    if (b.name !== undefined && !String(b.name).trim()) return fail(res, 422, 'INVALID_NAME', 'Name cannot be empty.');
    if (b.phone && !/^[0-9+\- ]{7,15}$/.test(String(b.phone))) return fail(res, 422, 'INVALID_PHONE', 'Phone must be 7 to 15 digits.');
    const cur = profiles.get(email) || defaultProfile(email);
    const next = { ...cur, ...b, email, notifications: { ...cur.notifications, ...(b.notifications || {}) } };
    profiles.set(email, next);
    return send(res, 200, next);
  }

  if (path === '/checkout' && method === 'POST') {
    const b = await readBody(req);
    if (b === undefined) return fail(res, 400, 'BAD_JSON', 'Request body must be valid JSON.');
    const a = b.address || {};
    for (const f of ['fullName', 'phone', 'line1', 'city', 'pincode', 'state']) {
      if (!String(a[f] || '').trim()) return fail(res, 422, 'INVALID_ADDRESS', `Address field "${f}" is required.`);
    }
    if (!/^[1-9][0-9]{5}$/.test(String(a.pincode))) return fail(res, 422, 'INVALID_PINCODE', 'PIN code must be 6 digits.');
    const pay = b.payment || {};
    if (!['card', 'upi', 'cod'].includes(pay.method)) return fail(res, 422, 'INVALID_PAYMENT_METHOD', 'Payment method must be card, upi or cod.');
    if (pay.method === 'upi' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(String(pay.upiId || ''))) return fail(res, 422, 'INVALID_UPI', 'Enter a valid UPI ID like name@bank.');
    if (pay.method === 'card' && !/^[0-9]{4}$/.test(String(pay.cardLast4 || ''))) return fail(res, 422, 'INVALID_CARD', 'Card details are missing.');
    const r = priceCart(b.items, b.coupon, b.delivery);
    if (r.error) return fail(res, ...r.error);

    // INTENTIONAL DEMO BUG: payment always fails when the cart has exactly 1 item.
    if (r.cart.itemCount === 1) {
      return send(res, 402, { error: 'PAYMENT_FAILED', message: 'Payment could not be processed. Please try again.', gatewayCode: 'GW-5001', amount: r.cart.total, currency: 'INR' });
    }

    const order = {
      id: newOrderId(), status: 'Confirmed', placedAt: new Date().toISOString(),
      items: r.cart.lines, itemCount: r.cart.itemCount,
      totals: { subtotal: r.cart.subtotal, discount: r.cart.discount, shipping: r.cart.shipping, tax: r.cart.tax, total: r.cart.total, currency: 'INR' },
      coupon: r.cart.coupon, delivery: b.delivery === 'express' ? 'express' : 'standard',
      address: { fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 || '', city: a.city, state: a.state, pincode: a.pincode },
      payment: { method: pay.method, cardLast4: pay.method === 'card' ? pay.cardLast4 : undefined, upiId: pay.method === 'upi' ? pay.upiId : undefined, transactionId: 'TXN' + Date.now() },
      giftWrap: !!b.giftWrap,
      estimatedDelivery: new Date(Date.now() + (b.delivery === 'express' ? 2 : 5) * 864e5).toISOString().slice(0, 10)
    };
    if (!orders.has(email)) orders.set(email, []);
    orders.get(email).unshift(order);
    return send(res, 201, order);
  }

  if (path === '/orders' && method === 'GET') return send(res, 200, { total: (orders.get(email) || []).length, items: orders.get(email) || [] });
  m = /^\/orders\/([A-Za-z0-9-]+)$/.exec(path);
  if (m && method === 'GET') {
    const o = (orders.get(email) || []).find(x => x.id === m[1]);
    return o ? send(res, 200, o) : fail(res, 404, 'ORDER_NOT_FOUND', `Order ${m[1]} was not found.`);
  }

  return fail(res, 404, 'NOT_FOUND', `No API route for ${method} /api${path}`);
}

module.exports = { handle };
