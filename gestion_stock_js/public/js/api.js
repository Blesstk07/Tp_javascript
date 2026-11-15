/* Couche commune : tous les fichiers JS passent par api(). */
class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}

async function api(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  const init = { ...options, headers };
  if (options.body !== undefined && typeof options.body !== 'string') {
    init.body = JSON.stringify(options.body);
  }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch('/api' + path, init);
  } catch (e) {
    throw new ApiError(
      'Serveur injoignable. Lancez « npm start » et ouvrez http://localhost:8003/app/',
      0, 'NETWORK_ERROR'
    );
  }
  if (response.status === 204) return null;

  const text = await response.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch (e) { body = null; } }

  if (!response.ok) {
    const err = (body && body.error) || {};
    throw new ApiError(err.message || 'Erreur HTTP ' + response.status, response.status, err.code, err.details);
  }
  return body;
}

/* ---------- Utilitaires partagés ---------- */
const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const s = p.toString();
  return s ? '?' + s : '';
};

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (c != null) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return node;
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function errorText(err) {
  const lines = (err.details || []).map((d) => (d.path ? d.path + ' : ' : '') + d.message);
  return err.message + (lines.length ? ' — ' + lines.join(' ; ') : '');
}

let messageTimer;
function showMessage(type, text) {
  const box = document.getElementById('message');
  if (!box) return;
  box.className = 'message ' + type;
  box.textContent = text;
  box.hidden = false;
  clearTimeout(messageTimer);
  if (type === 'success') messageTimer = setTimeout(() => { box.hidden = true; }, 4000);
}
const showError = (err) => showMessage('error', errorText(err));
const hideMessage = () => { const b = document.getElementById('message'); if (b) b.hidden = true; };

const money = (v) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toCents = (v) => { const [i, f = ''] = String(v).split('.'); return Number(i) * 100 + Number((f + '00').slice(0, 2)); };
const fromCents = (c) => (c / 100).toFixed(2);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR') : '');

function fillSelect(select, items, label, placeholder) {
  clear(select);
  if (placeholder !== undefined) select.append(h('option', { value: '' }, placeholder));
  items.forEach((it) => select.append(h('option', { value: it.id }, label(it))));
}

function emptyRow(tbody, cols, text) {
  clear(tbody);
  tbody.append(h('tr', {}, h('td', { colspan: cols, class: 'empty' }, text)));
}

function renderPager(container, meta, onPage) {
  clear(container);
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  container.append(
    h('button', { type: 'button', class: 'btn ghost', disabled: meta.page <= 1 ? 'disabled' : null, onclick: () => onPage(meta.page - 1) }, 'Précédent'),
    h('span', {}, 'Page ' + meta.page + ' / ' + pages + ' (' + meta.total + ' résultat' + (meta.total > 1 ? 's' : '') + ')'),
    h('button', { type: 'button', class: 'btn ghost', disabled: meta.page >= pages ? 'disabled' : null, onclick: () => onPage(meta.page + 1) }, 'Suivant')
  );
}

async function loadAll(path) {
  const separator = path.includes('?') ? '&' : '?';
  const items = [];
  let page = 1;
  let total = Infinity;

  while (items.length < total) {
    const result = await api(path + separator + 'limit=100&page=' + page);
    if (!result || !Array.isArray(result.data) || !result.meta || !Number.isSafeInteger(result.meta.total)) {
      throw new ApiError('Réponse de liste invalide.', 0, 'INVALID_RESPONSE');
    }
    if (!result.data.length && items.length < result.meta.total) {
      throw new ApiError('La liste reçue est incomplète.', 0, 'INVALID_RESPONSE');
    }
    items.push(...result.data);
    total = result.meta.total;
    page += 1;
  }
  return items;
}
