const form = document.getElementById('product-form');
const state = { page: 1, limit: 10, search: '', category_id: '' };
let editingId = null;
const F = (id) => document.getElementById(id);

async function loadCategories() {
  try {
    const cats = await loadAll('/categories');
    fillSelect(F('category_id'), cats, (c) => c.name, 'Choisir une catégorie');
    fillSelect(F('filter-category'), cats, (c) => c.name, 'Toutes les catégories');
  } catch (err) { showError(err); }
}

async function loadProducts() {
  const tbody = F('rows');
  try {
    const res = await api('/products' + qs(state));
    if (!res.data.length) {
      emptyRow(tbody, 8, 'Aucun produit trouvé.');
      F('pager').replaceChildren();
      return;
    }
    clear(tbody);
    res.data.forEach((p) => tbody.append(h('tr', {},
      h('td', {}, p.name), h('td', {}, p.sku), h('td', {}, p.category_name || '—'),
      h('td', { class: 'num' }, money(p.purchase_price)), h('td', { class: 'num' }, money(p.sale_price)),
      h('td', { class: 'num' }, p.quantity), h('td', { class: 'num' }, p.min_quantity),
      h('td', { class: 'actions' },
        h('button', { class: 'btn ghost small', type: 'button', onclick: () => startEdit(p) }, 'Modifier'),
        h('button', { class: 'btn danger small', type: 'button', onclick: () => removeProduct(p) }, 'Supprimer')))));
    renderPager(F('pager'), res.meta, (page) => { state.page = page; loadProducts(); });
  } catch (err) { emptyRow(tbody, 8, 'Impossible de charger les produits.'); showError(err); }
}

function startEdit(p) {
  editingId = p.id;
  ['name', 'sku', 'category_id', 'purchase_price', 'sale_price', 'min_quantity'].forEach((k) => { F(k).value = p[k]; });
  F('quantity').textContent = p.quantity;
  F('description').value = p.description || '';
  F('form-title').textContent = 'Modifier le produit';
  F('cancel-btn').hidden = false;
  hideMessage();
  form.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  editingId = null;
  form.reset();
  F('quantity').textContent = '0';
  F('form-title').textContent = 'Ajouter un produit';
  F('cancel-btn').hidden = true;
}

async function removeProduct(p) {
  if (!confirm('Supprimer le produit « ' + p.name + ' » ?')) return;
  try {
    await api('/products/' + p.id, { method: 'DELETE' });
    showMessage('success', 'Produit supprimé.');
    if (editingId === p.id) resetForm();
    loadProducts();
  } catch (err) { showError(err); }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const payload = {
    category_id: Number(F('category_id').value),
    name: F('name').value.trim(),
    sku: F('sku').value.trim(),
    description: F('description').value.trim(),
    purchase_price: F('purchase_price').value,
    sale_price: F('sale_price').value,
    min_quantity: Number(F('min_quantity').value),
  };
  try {
    if (editingId) await api('/products/' + editingId, { method: 'PUT', body: payload });
    else await api('/products', { method: 'POST', body: payload });
    showMessage('success', editingId ? 'Produit modifié.' : 'Produit ajouté.');
    resetForm();
    loadProducts();
  } catch (err) { showError(err); }
});

F('cancel-btn').addEventListener('click', resetForm);
F('filter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.search = F('search').value.trim();
  state.category_id = F('filter-category').value;
  state.page = 1;
  loadProducts();
});
F('reset-btn').addEventListener('click', () => {
  F('filter-form').reset();
  Object.assign(state, { search: '', category_id: '', page: 1 });
  loadProducts();
});

loadCategories();
loadProducts();
