const F = (id) => document.getElementById(id);
const state = { page: 1, limit: 10 };
let products = [];
let cart = []; // { product, quantity }

function renderCart() {
  const tbody = F('cart');
  let total = 0;
  if (!cart.length) emptyRow(tbody, 5, 'Aucun produit dans la vente.');
  else {
    clear(tbody);
    cart.forEach((line, i) => {
      const sub = toCents(line.product.sale_price) * line.quantity;
      total += sub;
      tbody.append(h('tr', {},
        h('td', {}, line.product.name + ' (' + line.product.sku + ')'),
        h('td', { class: 'num' }, money(line.product.sale_price)),
        h('td', { class: 'num' }, h('input', {
          type: 'number', min: '1', step: '1', value: line.quantity, style: 'width:80px', 'aria-label': 'Quantité',
          onchange: (e) => { const q = Number(e.target.value); if (Number.isInteger(q) && q > 0) line.quantity = q; renderCart(); } })),
        h('td', { class: 'num' }, money(fromCents(sub))),
        h('td', {}, h('button', { type: 'button', class: 'btn danger small', onclick: () => { cart.splice(i, 1); renderCart(); } }, 'Retirer'))));
    });
  }
  F('total').textContent = 'Total : ' + money(fromCents(total));
  F('validate-btn').disabled = !cart.length;
}

F('add-btn').addEventListener('click', () => {
  const product = products.find((p) => String(p.id) === F('product').value);
  const quantity = Number(F('qty').value);
  if (!product) return showMessage('error', 'Choisissez un produit.');
  if (!Number.isInteger(quantity) || quantity < 1) return showMessage('error', 'La quantité doit être un entier supérieur à 0.');
  const existing = cart.find((l) => l.product.id === product.id);
  if (existing) existing.quantity += quantity; else cart.push({ product, quantity });
  hideMessage(); F('qty').value = 1; renderCart();
});

F('clear-btn').addEventListener('click', () => { cart = []; renderCart(); });

F('validate-btn').addEventListener('click', async () => {
  const btn = F('validate-btn');
  btn.disabled = true;
  try {
    const sale = await api('/sales', { method: 'POST', body: { items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })) } });
    showMessage('success', 'Vente ' + sale.sale_number + ' enregistrée (total : ' + money(sale.total_amount) + ').');
    cart = []; renderCart();
    await Promise.all([loadProducts(), loadSales()]);
  } catch (err) {
    showError(err); // ex. INSUFFICIENT_STOCK : message renvoyé par le serveur
    btn.disabled = !cart.length;
  }
});

async function loadProducts() {
  products = await loadAll('/products');
  fillSelect(F('product'), products, (p) => p.name + ' — stock : ' + p.quantity + ' — ' + money(p.sale_price), 'Choisir un produit');
}

async function loadSales() {
  const tbody = F('rows');
  try {
    const res = await api('/sales' + qs(state));
    if (!res.data.length) { emptyRow(tbody, 5, 'Aucune vente enregistrée.'); F('pager').replaceChildren(); return; }
    clear(tbody);
    res.data.forEach((s) => tbody.append(h('tr', {},
      h('td', {}, s.sale_number), h('td', {}, fmtDate(s.sold_at)),
      h('td', { class: 'num' }, s.item_count), h('td', { class: 'num' }, money(s.total_amount)),
      h('td', {}, h('button', { type: 'button', class: 'btn ghost small', onclick: () => showDetail(s.id) }, 'Détail')))));
    renderPager(F('pager'), res.meta, (p) => { state.page = p; loadSales(); });
  } catch (err) { emptyRow(tbody, 5, 'Impossible de charger les ventes.'); showError(err); }
}

async function showDetail(id) {
  const box = F('detail');
  try {
    const s = await api('/sales/' + id);
    clear(box);
    box.append(
      h('h3', {}, 'Vente ' + s.sale_number),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Produit'), h('th', {}, 'SKU'), h('th', { class: 'num' }, 'Prix unitaire'), h('th', { class: 'num' }, 'Quantité'), h('th', { class: 'num' }, 'Total ligne'))),
        h('tbody', {}, s.items.map((i) => h('tr', {},
          h('td', {}, i.product_name), h('td', {}, i.sku), h('td', { class: 'num' }, money(i.unit_price)),
          h('td', { class: 'num' }, i.quantity), h('td', { class: 'num' }, money(i.line_total))))))),
      h('div', { class: 'total' }, 'Total : ' + money(s.total_amount)));
    box.scrollIntoView({ behavior: 'smooth' });
  } catch (err) { showError(err); }
}

(async function init() {
  renderCart();
  loadSales();
  try { await loadProducts(); } catch (err) { showError(err); }
})();
