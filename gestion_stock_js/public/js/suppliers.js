const form = document.getElementById('supplier-form');
const F = (id) => document.getElementById(id);
const FIELDS = ['name', 'contact_name', 'phone', 'email', 'address'];
const state = { page: 1, limit: 10 };
let editingId = null;

async function loadSuppliers() {
  const tbody = F('rows');
  try {
    const res = await api('/suppliers' + qs(state));
    if (!res.data.length) { emptyRow(tbody, 6, 'Aucun fournisseur.'); F('pager').replaceChildren(); return; }
    clear(tbody);
    res.data.forEach((s) => tbody.append(h('tr', {},
      h('td', {}, s.name), h('td', {}, s.contact_name || '—'), h('td', {}, s.phone || '—'),
      h('td', {}, s.email || '—'), h('td', {}, s.address || '—'),
      h('td', {}, h('button', { class: 'btn ghost small', type: 'button', onclick: () => startEdit(s) }, 'Modifier')))));
    renderPager(F('pager'), res.meta, (p) => { state.page = p; loadSuppliers(); });
  } catch (err) { emptyRow(tbody, 6, 'Impossible de charger les fournisseurs.'); showError(err); }
}

function startEdit(s) {
  editingId = s.id;
  FIELDS.forEach((k) => { F(k).value = s[k] || ''; });
  F('form-title').textContent = 'Modifier le fournisseur';
  F('cancel-btn').hidden = false;
  hideMessage();
  form.scrollIntoView({ behavior: 'smooth' });
}
function resetForm() {
  editingId = null; form.reset();
  F('form-title').textContent = 'Ajouter un fournisseur';
  F('cancel-btn').hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const payload = {};
  FIELDS.forEach((k) => { payload[k] = F(k).value.trim(); });
  try {
    if (editingId) await api('/suppliers/' + editingId, { method: 'PUT', body: payload });
    else await api('/suppliers', { method: 'POST', body: payload });
    showMessage('success', editingId ? 'Fournisseur modifié.' : 'Fournisseur ajouté.');
    resetForm(); loadSuppliers();
  } catch (err) { showError(err); }
});
F('cancel-btn').addEventListener('click', resetForm);
loadSuppliers();
