// OnlineMart shared helpers: header, footer, cart, auth, API calls, toasts.
const MM = (() => {
  const KEYS = { cart: 'mm_cart', token: 'mm_token', user: 'mm_user', orders: 'mm_orders', wish: 'mm_wish' };
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = (s, el = document) => el.querySelector(s);

  // ---- API
  async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Accept': 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = read(KEYS.token, null);
    if (auth && token) headers['Authorization'] = 'Bearer ' + token;
    let res;
    try { res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); }
    catch (e) { return { ok: false, status: 0, data: { error: 'NETWORK', message: 'Could not reach the server.' } }; }
    let data = null;
    try { data = await res.json(); } catch {}
    if (res.status === 401 && auth) { write(KEYS.token, null); }
    return { ok: res.ok, status: res.status, data };
  }

  // ---- Auth
  const user = () => read(KEYS.user, null);
  const loggedIn = () => !!read(KEYS.token, null) && !!user();
  function setSession(token, u) { write(KEYS.token, token); write(KEYS.user, u); }
  function logout() { localStorage.removeItem(KEYS.token); localStorage.removeItem(KEYS.user); location.href = 'profile.html'; }

  // ---- Cart (kept in the browser, priced by POST /api/cart/quote)
  const cart = () => read(KEYS.cart, []);
  function saveCart(c) { write(KEYS.cart, c); renderBadge(); }
  function addToCart(p, qty = 1) {
    const c = cart();
    const line = c.find(l => l.productId === p.id);
    if (line) line.qty = Math.min(10, line.qty + qty); else c.push({ productId: p.id, qty, name: p.name, emoji: p.emoji, price: p.price, colors: p.colors });
    saveCart(c);
    toast(`${p.emoji} ${esc(p.name)} added to cart. <a href="cart.html">View cart</a>`);
  }
  const cartCount = () => cart().reduce((s, l) => s + l.qty, 0);

  // ---- Orders (copy in the browser so My orders survives a server restart)
  const localOrders = () => read(KEYS.orders, []);
  function saveOrder(o) { o = { ...o, owner: (user() || {}).email }; const list = localOrders().filter(x => x.id !== o.id); list.unshift(o); write(KEYS.orders, list); }

  const wishlist = () => read(KEYS.wish, []);
  function toggleWish(id) { const w = wishlist(); const i = w.indexOf(id); if (i >= 0) w.splice(i, 1); else w.push(id); write(KEYS.wish, w); return i < 0; }

  // ---- UI
  function toast(html, ms = 3200) {
    let box = qs('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = html;
    box.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  function renderBadge() { const b = qs('#cart-count'); if (b) { const n = cartCount(); b.textContent = n; b.dataset.count = n; } }
  const thumbBg = c => `background: linear-gradient(135deg, ${c[0]}, ${c[1]})`;

  function header(active) {
    const u = user();
    const links = [
      ['index.html', 'market', '🛍️', 'Market'],
      ['cart.html', 'cart', '🛒', 'Cart <span class="badge" id="cart-count" data-count="0">0</span>'],
      ['checkout.html', 'checkout', '💳', 'Checkout'],
      ['orders.html', 'orders', '📦', 'My orders'],
      ['profile.html', 'profile', u ? `<span class="avatar">${esc((u.name || u.email)[0].toUpperCase())}</span>` : '👤', u ? 'Profile' : 'Sign in']
    ];
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="topbar">Demo store for practising test automation. Use coupon <b>TESTMAADU10</b> for 10% off. No real payments.</div>
      <header class="site"><div class="container nav">
        <a class="logo" href="index.html" aria-label="OnlineMart home"><span class="logo-mark">O</span><span>OnlineMart<small>Demo store</small></span></a>
        <button class="btn btn-ghost menu-btn" id="menu-toggle" aria-label="Open menu">☰</button>
        <nav class="nav-links" id="main-nav" aria-label="Main">
          ${links.map(([href, key, ico, label]) => `<a href="${href}" data-nav="${key}" class="${key === active ? 'active' : ''}">${ico} ${label}</a>`).join('')}
        </nav>
      </div></header>`);
    qs('#menu-toggle').addEventListener('click', () => qs('#main-nav').classList.toggle('open'));
    renderBadge();
  }

  function footer() {
    document.body.insertAdjacentHTML('beforeend', `
      <footer class="site"><div class="container">
        <div class="foot">
          <div><a class="logo" href="index.html" style="color:#fff"><span class="logo-mark">O</span><span>OnlineMart</span></a>
            <p style="font-size:14px;margin:12px 0 0;max-width:300px">A practice store for functional, end-to-end and API testing. Every product, payment and order here is fake.</p></div>
          <div><h4>Shop</h4><a href="index.html?category=Electronics">Electronics</a><a href="index.html?category=Fashion">Fashion</a><a href="index.html?category=Home">Home</a><a href="index.html?category=Books">Books</a></div>
          <div><h4>Account</h4><a href="profile.html">Profile</a><a href="orders.html">My orders</a><a href="cart.html">Cart</a></div>
          <div><h4>For testers</h4><a href="help.html">Help and FAQ</a><a href="api-docs.html">API docs (Swagger)</a><a href="openapi.json" target="_blank" rel="noopener">openapi.json</a></div>
        </div>
        <div class="foot-bottom">
          <span>© ${new Date().getFullYear()} OnlineMart demo. Not a real shop.</span>
          <span class="made-by" id="created-by">Created by <a href="https://www.testmaadu.in" target="_blank" rel="noopener">TestMaadu.in</a></span>
        </div>
      </div></footer>`);
  }

  function stars(r) { return `<span class="rating"><b>${r.toFixed(1)} ★</b></span>`; }
  const pct = p => Math.round((1 - p.price / p.mrp) * 100);

  return { api, user, loggedIn, setSession, logout, cart, saveCart, addToCart, cartCount, localOrders, saveOrder, wishlist, toggleWish, toast, header, footer, inr, esc, qs, thumbBg, stars, pct, write, read, KEYS };
})();
