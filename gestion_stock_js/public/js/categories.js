const form = document.getElementById('category-form');
const F = (id) => document.getElementById(id);
const state = { page: 1, limit: 10 };
let editingId = null;

async function loadCategories() {
  const tbody = F('rows');
  try {
    const res = await api('/categories' + qs(state));
    if (!res.data.length) { emptyRow(tbody, 3, 'Aucune catégorie.'); F('pager').replaceChildren(); return; }
    clear(tbody);
    res.data.forEach((c) => tbody.append(h('tr', {},
      h('td', {}, c.name), h('td', {}, c.description || '—'),
      h('td', {}, h('button', { class: 'btn ghost small', type: 'button', onclick: () => startEdit(c) }, 'Modifier')))));
    renderPager(F('pager'), res.meta, (p) => { state.page = p; loadCategories(); });
  } catch (err) { emptyRow(tbody, 3, 'Impossible de charger les catégories.'); showError(err); }
}

function startEdit(c) {
  editingId = c.id;
  F('name').value = c.name;
  F('description').value = c.description || '';
  F('form-title').textContent = 'Modifier la catégorie';
  F('cancel-btn').hidden = false;
  hideMessage();
  form.scrollIntoView({ behavior: 'smooth' });
}
function resetForm() {
  editingId = null; form.reset();
  F('form-title').textContent = 'Ajouter une catégorie';
  F('cancel-btn').hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const payload = { name: F('name').value.trim(), description: F('description').value.trim() };
  try {
    if (editingId) await api('/categories/' + editingId, { method: 'PUT', body: payload });
    else await api('/categories', { method: 'POST', body: payload });
    showMessage('success', editingId ? 'Catégorie modifiée.' : 'Catégorie ajoutée.');
    resetForm(); loadCategories();
  } catch (err) { showError(err); }
});
F('cancel-btn').addEventListener('click', resetForm);
loadCategories();
