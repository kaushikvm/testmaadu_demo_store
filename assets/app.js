// testmaadu.mart shared helpers: header, footer, cart, auth, API calls, toasts, dialogs.
const MM = (() => {
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/app\.js(\?.*)?$/, '');
  const KEYS = { cart: 'mm_cart', token: 'mm_token', user: 'mm_user', orders: 'mm_orders', wish: 'mm_wish', session: 'mm_demo_id', mine: 'mm_my_products' };
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = (s, el = document) => el.querySelector(s);

  // Each browser gets its own demo session, so products added here are only seen here.
  function demoSession() {
    let s = read(KEYS.session, null);
    if (!s) { s = 'ds_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); write(KEYS.session, s); }
    return s;
  }

  // ---- API
  async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Accept': 'application/json', 'X-Demo-Session': demoSession() };
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

  // ---- Auth (the token is a JWT kept in localStorage)
  const user = () => read(KEYS.user, null);
  const loggedIn = () => !!read(KEYS.token, null) && !!user();
  const isAdmin = () => loggedIn() && (user() || {}).role === 'admin';
  function setSession(token, u) { write(KEYS.token, token); write(KEYS.user, u); }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    localStorage.removeItem(KEYS.token); localStorage.removeItem(KEYS.user);
    location.href = 'profile.html';
  }

  // ---- Products an admin added in this browser (copy kept here so a server restart does not lose them)
  const myProducts = () => read(KEYS.mine, []);
  function saveMyProduct(p) { const list = myProducts().filter(x => x.id !== p.id); list.push(p); write(KEYS.mine, list); }
  function removeMyProduct(id) { write(KEYS.mine, myProducts().filter(x => x.id !== id)); }
  const findMyProduct = id => myProducts().find(x => x.id === id);
  // Adds this browser's products that the server no longer knows (after a restart) to a product list.
  function withMyProducts(items, keep = () => true) {
    const have = new Set(items.map(p => p.id));
    return [...myProducts().filter(p => !have.has(p.id) && keep(p)), ...items];
  }

  // ---- Cart (kept in the browser, priced by POST /api/cart/quote)
  const cart = () => read(KEYS.cart, []);
  function saveCart(c) { write(KEYS.cart, c); renderBadge(); }
  function addToCart(p, qty = 1) {
    const before = JSON.stringify(cart());
    const c = cart();
    const line = c.find(l => l.productId === p.id);
    if (line) line.qty = Math.min(10, line.qty + qty);
    else c.push({ productId: p.id, qty, name: p.name, emoji: p.emoji, price: p.price, colors: p.colors, image: p.image || '', product: p.isNew ? { name: p.name, category: p.category, price: p.price, mrp: p.mrp, stock: p.stock, emoji: p.emoji } : undefined });
    saveCart(c);
    toast(`${p.emoji} ${esc(p.name)} added to cart. <a href="cart.html">View cart</a>`, 3000, { undo: () => { saveCart(JSON.parse(before)); toast('Removed from cart', 1600); } });
  }
  // Items for the API. Products added in this browser carry their details too.
  const cartItems = () => cart().map(l => l.product ? { productId: l.productId, qty: l.qty, product: l.product } : { productId: l.productId, qty: l.qty });
  const cartCount = () => cart().reduce((s, l) => s + l.qty, 0);

  // ---- Orders (copy in the browser so My orders survives a server restart)
  const localOrders = () => read(KEYS.orders, []);
  function saveOrder(o) { o = { ...o, owner: (user() || {}).email }; const list = localOrders().filter(x => x.id !== o.id); list.unshift(o); write(KEYS.orders, list); }

  const wishlist = () => read(KEYS.wish, []);
  function toggleWish(id) {
    const w = wishlist(); const i = w.indexOf(id);
    if (i >= 0) w.splice(i, 1); else w.push(id);
    write(KEYS.wish, w);
    if (loggedIn()) api(i < 0 ? '/wishlist' : '/wishlist/' + id, { method: i < 0 ? 'POST' : 'DELETE', body: i < 0 ? { productId: id } : undefined, auth: true });
    return i < 0;
  }

  // ---- Toasts: fade out after a few seconds, optional Undo button
  function toast(html, ms = 3200, opts = {}) {
    let box = qs('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (opts.kind ? ' toast-' + opts.kind : '');
    t.innerHTML = `<span>${html}</span>`;
    if (opts.undo) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'toast-undo'; b.textContent = 'Undo';
      b.onclick = () => { t.remove(); opts.undo(); };
      t.appendChild(b);
    }
    box.appendChild(t);
    setTimeout(() => t.classList.add('fade'), Math.max(0, ms - 400));
    setTimeout(() => t.remove(), ms);
    return t;
  }

  // ---- Dialog: resolves with the value of the button pressed (null for Esc, backdrop or ✕)
  function dialog({ title, html, actions = [{ label: 'Close', value: null }], wide = false, id, onOpen }) {
    return new Promise(resolve => {
      const prev = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `
        <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" ${id ? `id="${id}"` : ''}>
          <div class="modal-head"><h2 id="modal-title">${title}</h2><button type="button" class="modal-x" aria-label="Close dialog">✕</button></div>
          <div class="modal-body">${html}</div>
          <div class="modal-actions">${actions.map((a, i) => `<button type="button" class="btn ${a.kind || (i === actions.length - 1 ? 'btn-primary' : 'btn-ghost')}" data-i="${i}">${a.label}</button>`).join('')}</div>
        </div>`;
      const close = v => { wrap.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); resolve(v); };
      const onKey = e => { if (e.key === 'Escape') close(null); };
      wrap.addEventListener('click', async e => {
        if (e.target === wrap || e.target.closest('.modal-x')) return close(null);
        const b = e.target.closest('[data-i]');
        if (!b) return;
        const a = actions[Number(b.dataset.i)];
        if (a.check && !(await a.check(wrap))) return;
        close(a.value !== undefined ? a.value : a.label);
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      if (onOpen) onOpen(wrap);
      (wrap.querySelector('.modal-body input, .modal-body select, .modal-body textarea') || wrap.querySelector('.modal-actions .btn:last-child')).focus();
    });
  }

  function renderBadge() { const b = qs('#cart-count'); if (b) { const n = cartCount(); b.textContent = n; b.dataset.count = n; } }
  const thumbBg = c => { c = c && c.length > 1 ? c : ['#e0e7ff', '#a5b4fc']; return `background: linear-gradient(135deg, ${c[0]}, ${c[1]})`; };
  const thumbArt = p => p.image ? `<img class="thumb-img" src="${esc(p.image)}" alt="${esc(p.name)}">` : `<span aria-hidden="true">${p.emoji || '📦'}</span>`;

  // ---- Notifications bell: polled every 30 seconds with XMLHttpRequest
  function pollNotifications() {
    const bell = qs('#bell-count'); if (!bell) return;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/notifications');
    xhr.setRequestHeader('X-Demo-Session', demoSession());
    const token = read(KEYS.token, null);
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onload = () => { try { const d = JSON.parse(xhr.responseText); bell.textContent = d.unread; bell.dataset.count = d.unread; window._notes = d.items; } catch {} };
    xhr.send();
  }

  function header(active) {
    const u = user();
    const links = [
      ['index.html', 'market', '🛍️', 'Market'],
      ['cart.html', 'cart', '🛒', 'Cart <span class="badge" id="cart-count" data-count="0">0</span>'],
      ['checkout.html', 'checkout', '💳', 'Checkout'],
      ['orders.html', 'orders', '📦', 'My orders'],
      ...(isAdmin() ? [['admin.html', 'admin', '🛠️', 'Admin']] : []),
      u && loggedIn() ? ['account.html', 'account', `<span class="avatar">${esc((u.name || u.email)[0].toUpperCase())}</span>`, 'Account'] : ['profile.html', 'profile', '👤', 'Sign in']
    ];
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="topbar">Demo store for practising test automation. Use coupon <b>TESTMAADU10</b> for 10% off. No real payments. <a href="demo.html">Demo guide</a> · <a href="api-docs.html">API docs</a></div>
      <header class="site"><div class="container nav">
        <a class="logo" href="index.html" aria-label="testmaadu.mart home"><span class="logo-mark">T</span><span>testmaadu.mart<small>Demo store</small></span></a>
        <button class="btn btn-ghost menu-btn" id="menu-toggle" aria-label="Open menu">☰</button>
        <nav class="nav-links" id="main-nav" aria-label="Main">
          ${links.map(([href, key, ico, label]) => `<a href="${href}" data-nav="${key}" class="${key === active ? 'active' : ''}">${ico} ${label}</a>`).join('')}
          <button type="button" class="bell" id="bell" aria-label="Notifications" title="Notifications">🔔<span class="badge" id="bell-count" data-count="0">0</span></button>
        </nav>
      </div></header>`);
    qs('#menu-toggle').addEventListener('click', () => qs('#main-nav').classList.toggle('open'));
    qs('#bell').addEventListener('click', () => dialog({ title: 'Notifications', html: (window._notes || []).map(n => `<div class="note ${n.read ? '' : 'unread'}"><b>${esc(n.text)}</b><span class="muted">${new Date(n.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>`).join('') || '<p class="muted">No notifications.</p>' }));
    renderBadge();
    pollNotifications();
    setInterval(pollNotifications, 30000);
  }

  function footer() {
    document.body.insertAdjacentHTML('beforeend', `
      <footer class="site"><div class="container">
        <div class="foot">
          <div><a class="logo" href="index.html" style="color:#fff"><span class="logo-mark">T</span><span>testmaadu.mart</span></a>
            <p style="font-size:14px;margin:12px 0 0;max-width:300px">A practice store for functional, end-to-end, API, performance and security testing. Every product, payment, person and order here is fake.</p></div>
          <div><h4>Shop</h4><a href="index.html?category=Electronics">Electronics</a><a href="index.html?category=Fashion">Fashion</a><a href="index.html?category=Home">Home</a><a href="index.html?category=Books">Books</a></div>
          <div><h4>Account</h4><a href="profile.html">Sign in</a><a href="account.html">My account</a><a href="orders.html">My orders</a><a href="admin.html">Admin</a></div>
          <div><h4>For testers</h4><a href="demo.html">Demo guide</a><a href="help.html">Help and FAQ</a><a href="api-docs.html">API docs (Swagger)</a><a href="openapi.json" target="_blank" rel="noopener">openapi.json</a>
            <button type="button" class="reset-demo" id="reset-demo">↺ Reset demo data</button></div>
        </div>
        <div class="foot-bottom">
          <span>© ${new Date().getFullYear()} testmaadu.mart demo. Not a real shop.</span>
          <span class="made-by" id="created-by">Created by <a href="https://www.testmaadu.in" target="_blank" rel="noopener">TestMaadu.in</a></span>
        </div>
      </div></footer>`);
    qs('#reset-demo').addEventListener('click', async () => {
      const ok = await dialog({ title: 'Reset demo data?', html: '<p>This signs you out and clears your cart, orders, wishlist and the products you added in this browser.</p>', actions: [{ label: 'Cancel', value: false }, { label: 'Reset', value: true, kind: 'btn-accent' }] });
      if (!ok) return;
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      document.cookie = 'om_session=; Path=/; Max-Age=0';
      location.href = 'index.html';
    });
    const chat = document.createElement('script');
    chat.src = BASE + 'chat.js';
    document.body.appendChild(chat);
  }

  function stars(r) { return `<span class="rating"><b>${Number(r || 0).toFixed(1)} ★</b></span>`; }
  const pct = p => Math.max(0, Math.round((1 - p.price / (p.mrp || p.price)) * 100));
  const rid = () => Math.random().toString(16).slice(2, 6);

  return { api, user, loggedIn, isAdmin, setSession, logout, cart, saveCart, addToCart, cartItems, cartCount, localOrders, saveOrder, wishlist, toggleWish, toast, dialog, header, footer, inr, esc, qs, thumbBg, thumbArt, stars, pct, rid, write, read, KEYS, myProducts, saveMyProduct, removeMyProduct, findMyProduct, withMyProducts, demoSession };
})();
