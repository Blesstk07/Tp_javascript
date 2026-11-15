const F = (id) => document.getElementById(id);
const LABEL = { OK: 'Normal', LOW: 'Stock faible', OUT: 'Rupture' };
const stockState = { page: 1, limit: 10, low_stock: '' };
const moveState = { page: 1, limit: 10, type: '' };
let products = [];

async function loadStock() {
  const tbody = F('stock-rows');
  try {
    const res = await api('/stock' + qs(stockState));
    if (!res.data.length) { emptyRow(tbody, 6, 'Aucun produit.'); F('stock-pager').replaceChildren(); return; }
    clear(tbody);
    res.data.forEach((p) => tbody.append(h('tr', {},
      h('td', {}, p.name), h('td', {}, p.sku), h('td', {}, p.category_name || '—'),
      h('td', { class: 'num' }, p.quantity), h('td', { class: 'num' }, p.min_quantity),
      h('td', {}, h('span', { class: 'badge ' + p.status }, LABEL[p.status] || p.status)))));
    renderPager(F('stock-pager'), res.meta, (n) => { stockState.page = n; loadStock(); });
  } catch (err) { emptyRow(tbody, 6, 'Impossible de charger le stock.'); showError(err); }
}

async function loadMovements() {
  const tbody = F('move-rows');
  try {
    const res = await api('/stock/movements' + qs(moveState));
    if (!res.data.length) { emptyRow(tbody, 5, 'Aucun mouvement.'); F('move-pager').replaceChildren(); return; }
    clear(tbody);
    res.data.forEach((m) => tbody.append(h('tr', {},
      h('td', {}, fmtDate(m.moved_at)), h('td', {}, m.product_name),
      h('td', {}, h('span', { class: 'badge ' + m.movement_type }, m.movement_type === 'IN' ? 'Entrée' : 'Sortie')),
      h('td', { class: 'num' }, m.quantity), h('td', {}, m.notes || '—'))));
    renderPager(F('move-pager'), res.meta, (n) => { moveState.page = n; loadMovements(); });
  } catch (err) { emptyRow(tbody, 5, 'Impossible de charger les mouvements.'); showError(err); }
}

function addLine() {
  const select = h('select', { required: 'required', 'aria-label': 'Produit' });
  fillSelect(select, products, (p) => p.name + ' (' + p.sku + ')', 'Choisir un produit');
  const qty = h('input', { type: 'number', min: '1', step: '1', required: 'required', 'aria-label': 'Quantité' });
  const cost = h('input', { type: 'number', min: '0', step: '0.01', required: 'required', 'aria-label': 'Coût unitaire' });
  const row = h('tr', { class: 'line' },
    h('td', {}, select), h('td', { class: 'num' }, qty), h('td', { class: 'num' }, cost),
    h('td', {}, h('button', { type: 'button', class: 'btn danger small', onclick: () => row.remove() }, 'Retirer')));
  F('entry-lines').append(row);
}

F('add-line').addEventListener('click', addLine);
F('entry-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = F('entry-form');
  const lines = [...document.querySelectorAll('#entry-lines .line')];
  if (!lines.length) return showMessage('error', 'Ajoutez au moins une ligne de produit.');
  if (!form.reportValidity()) return;
  const payload = {
    supplier_id: Number(F('supplier_id').value),
    items: lines.map((r) => {
      const [s, q, c] = r.querySelectorAll('select,input');
      return { product_id: Number(s.value), quantity: Number(q.value), unit_cost: c.value };
    }),
  };
  const notes = F('notes').value.trim();
  if (notes) payload.notes = notes;
  try {
    await api('/stock/entries', { method: 'POST', body: payload });
    showMessage('success', 'Approvisionnement enregistré.');
    form.reset(); clear(F('entry-lines')); addLine();
    loadStock(); loadMovements();
  } catch (err) { showError(err); }
});

F('low-only').addEventListener('change', (e) => { stockState.low_stock = e.target.checked ? 'true' : ''; stockState.page = 1; loadStock(); });
F('move-type').addEventListener('change', (e) => { moveState.type = e.target.value; moveState.page = 1; loadMovements(); });

(async function init() {
  loadStock(); loadMovements();
  try {
    const [suppliers, prods] = await Promise.all([loadAll('/suppliers'), loadAll('/products')]);
    products = prods;
    fillSelect(F('supplier_id'), suppliers, (s) => s.name, 'Choisir un fournisseur');
    addLine();
  } catch (err) { showError(err); }
})();
