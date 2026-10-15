// OnlineMart Assistant chat widget. Talks to POST /api/chat and reads the streamed answer.
(() => {
  if (window.__omChat) return;
  window.__omChat = true;

  // WEAK SPOT (Security tab): the system prompt, model and token limit are chosen in the browser.
  const SYSTEM_PROMPT = 'You are OnlineMart Assistant, a friendly shopping helper. Answer only questions about OnlineMart products, orders, delivery, returns, payments and coupons. Keep answers short.';
  const MODEL = 'onlinemart-assistant-1';
  const KEY = 'om_chat';
  const QUICK = ['Track my order', 'Return policy', 'Any coupons?', 'Share personal details', 'Talk to a human'];

  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; } };
  const save = s => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  const newId = () => 'chat-' + Math.random().toString(36).slice(2, 10);
  let state = load() || { id: newId(), open: false, history: [] };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // WEAK SPOT (HTML in answers): bot text is shown as HTML. Scripts, on* handlers and javascript: links are
  // removed so nothing actually runs, but tags such as <b> or <img> appear as real elements.
  function render(text) {
    let h = String(text)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, '');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\[([^\]]+)\]\(((?:https?:\/\/|[a-z0-9-]+\.html)[^)\s]*)\)/gi, '<a href="$2">$1</a>');
    return h.replace(/\n/g, '<br>');
  }

  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" class="omc-launcher" id="omc-launcher" aria-label="Open chat" aria-expanded="false">
      <span class="omc-spark" aria-hidden="true">✦</span><span>Ask AI</span>
    </button>
    <section class="omc-panel" id="omc-panel" role="dialog" aria-label="OnlineMart Assistant chat" hidden>
      <header class="omc-head">
        <span class="omc-avatar" aria-hidden="true">✦</span>
        <div class="omc-title"><b>OnlineMart Assistant</b><small><i class="omc-dot"></i> AI · replies in seconds</small></div>
        <button type="button" class="omc-icon" id="omc-new" title="New chat" aria-label="New chat">↻</button>
        <button type="button" class="omc-icon" id="omc-close" title="Close chat" aria-label="Close chat">✕</button>
      </header>
      <div class="omc-log" id="omc-log" role="log" aria-live="polite"></div>
      <div class="omc-quick" id="omc-quick">${QUICK.map(q => `<button type="button" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <form class="omc-form" id="omc-form" novalidate>
        <label for="omc-input" class="sr">Your message</label>
        <textarea id="omc-input" name="message" rows="1" placeholder="Ask about products, orders, returns..." aria-label="Your message"></textarea>
        <button type="submit" class="omc-send" id="omc-send" aria-label="Send" disabled>➤</button>
      </form>
      <button type="button" class="omc-stop" id="omc-stop" hidden>■ Stop generating</button>
      <p class="omc-note">AI answers can be wrong. Demo bot, no real AI.</p>
    </section>`);

  const $ = id => document.getElementById(id);
  const log = $('omc-log'), input = $('omc-input'), send = $('omc-send'), stop = $('omc-stop');
  let controller = null;

  function bubble(role, html) {
    const d = document.createElement('div');
    d.className = 'omc-msg ' + (role === 'user' ? 'omc-user' : role === 'error' ? 'omc-error' : 'omc-bot');
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function paint() {
    log.innerHTML = '';
    bubble('assistant', render('Hi! I am the OnlineMart Assistant ✦ Ask me about products, prices, your order, delivery, returns or coupons.'));
    for (const m of state.history) bubble(m.role, m.role === 'user' ? esc(m.content) : render(m.content));
  }
  function setOpen(open) {
    state.open = open; save(state);
    $('omc-panel').hidden = !open;
    $('omc-launcher').setAttribute('aria-expanded', String(open));
    $('omc-launcher').classList.toggle('on', open);
    if (open) { log.scrollTop = log.scrollHeight; input.focus(); }
  }
  function busy(on) {
    stop.hidden = !on;
    input.disabled = on;
    send.disabled = on || !input.value.trim();
    document.querySelectorAll('#omc-quick button').forEach(b => b.disabled = on);
  }

  async function ask(text) {
    text = text.trim();
    if (!text || controller) return;
    state.history.push({ role: 'user', content: text });
    save(state);
    bubble('user', esc(text));
    input.value = '';
    const typing = bubble('assistant', '<span class="omc-typing" aria-label="Assistant is typing"><i></i><i></i><i></i></span>');
    busy(true);
    controller = new AbortController();
    let answer = '';
    try {
      const orders = (window.MM && MM.loggedIn()) ? MM.localOrders().filter(o => o.owner === MM.user().email) : [];
      const res = await fetch('/api/chat', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          model: MODEL, stream: true, max_tokens: 400, temperature: 0.2, user: state.id,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...state.history.slice(-12)],
          metadata: { page: location.pathname, lastOrder: orders[0] ? { id: orders[0].id, status: orders[0].status, itemCount: orders[0].itemCount, estimatedDelivery: orders[0].estimatedDelivery } : null }
        })
      });
      if (!res.ok) {
        let msg = 'Something went wrong. Please try again.';
        try { msg = (await res.json()).error?.message || msg; } catch {}
        throw Object.assign(new Error(msg), { status: res.status });
      }
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          const t = JSON.parse(data).choices?.[0]?.delta?.content;
          if (t) { answer += t; typing.innerHTML = render(answer); log.scrollTop = log.scrollHeight; }
        }
      }
      if (!answer) throw new Error('The assistant did not reply. Please try again.');
      state.history.push({ role: 'assistant', content: answer });
    } catch (e) {
      if (e.name === 'AbortError') {
        if (answer) state.history.push({ role: 'assistant', content: answer });
        else typing.remove();
      } else {
        typing.className = 'omc-msg omc-error';
        typing.setAttribute('role', 'alert');
        typing.textContent = (e.status ? `Error ${e.status}: ` : '') + e.message;
        state.history.pop();
      }
    } finally {
      controller = null;
      save(state);
      busy(false);
      input.focus();
    }
  }

  $('omc-launcher').onclick = () => setOpen(!state.open);
  $('omc-close').onclick = () => setOpen(false);
  $('omc-new').onclick = () => { if (controller) controller.abort(); state = { id: newId(), open: true, history: [] }; save(state); paint(); input.focus(); };
  stop.onclick = () => controller && controller.abort();
  $('omc-quick').onclick = e => { const b = e.target.closest('[data-quick]'); if (b) ask(b.dataset.quick); };
  input.addEventListener('input', () => { send.disabled = !input.value.trim() || !!controller; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  $('omc-form').addEventListener('submit', e => { e.preventDefault(); ask(input.value); });

  paint();
  setOpen(state.open);
})();
