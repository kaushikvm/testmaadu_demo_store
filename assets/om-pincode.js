// <om-pincode> delivery checker. Built as a web component with an open shadow root,
// so its input and button live inside shadow DOM (a Find Element demo).
class OmPincode extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { display: block; border: 1px solid #e4e7f0; border-radius: 14px; padding: 14px; background: #fafbff; font-family: Inter, system-ui, sans-serif; }
        h4 { margin: 0 0 8px; font-size: 14px; }
        form { display: flex; gap: 8px; }
        input { flex: 1; font: inherit; font-size: 14px; padding: 10px 12px; border: 1px solid #d5d9e5; border-radius: 10px; min-width: 0; }
        input:focus { outline: 2px solid #4f46e5; border-color: #4f46e5; }
        button { font: inherit; font-weight: 700; font-size: 14px; border: 0; border-radius: 10px; padding: 10px 16px; background: #4f46e5; color: #fff; cursor: pointer; }
        .out { margin-top: 8px; font-size: 13px; min-height: 18px; }
        .ok { color: #16a34a; } .bad { color: #dc2626; }
      </style>
      <h4 part="title">📍 Check delivery</h4>
      <form id="pin-form" novalidate>
        <input id="pincode" name="pincode" inputmode="numeric" maxlength="6" placeholder="Enter PIN code" aria-label="PIN code">
        <button id="check" type="submit">Check</button>
      </form>
      <div class="out" id="result" role="status"></div>`;
    root.getElementById('pin-form').addEventListener('submit', async e => {
      e.preventDefault();
      const pin = root.getElementById('pincode').value.trim();
      const out = root.getElementById('result');
      out.className = 'out'; out.textContent = 'Checking...';
      try {
        const r = await fetch('/api/delivery/check?pincode=' + encodeURIComponent(pin));
        const d = await r.json();
        if (!r.ok) { out.className = 'out bad'; out.textContent = d.message; return; }
        out.className = 'out ok';
        out.textContent = `✓ Delivery to ${d.pincode} in ${d.days} days${d.cod ? ' · Cash on delivery available' : ''}`;
        this.dispatchEvent(new CustomEvent('delivery-checked', { detail: d, bubbles: true }));
      } catch { out.className = 'out bad'; out.textContent = 'Could not check right now.'; }
    });
  }
}
customElements.define('om-pincode', OmPincode);
