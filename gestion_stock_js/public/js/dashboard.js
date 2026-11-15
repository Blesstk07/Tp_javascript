const STATUS_LABEL = { OK: 'Normal', LOW: 'Stock faible', OUT: 'Rupture' };

async function loadDashboard() {
  const stats = document.getElementById('stats');
  try {
    const d = await api('/dashboard');
    const cards = [
      ['Produits', d.products],
      ['Catégories', d.categories],
      ['Fournisseurs', d.suppliers],
      ['Produits en stock faible', d.low_stock_products, d.low_stock_products > 0],
      ['Ventes enregistrées', d.sales_count],
      ['Chiffre d’affaires', money(d.total_revenue)],
    ];
    clear(stats);
    cards.forEach(([label, value, alert]) =>
      stats.append(h('div', { class: 'card stat' + (alert ? ' alert' : '') }, h('strong', {}, value), h('span', {}, label))));

    const alerts = await api('/stock?low_stock=true&limit=10');
    const tbody = document.getElementById('alerts');
    if (!alerts.data.length) return emptyRow(tbody, 6, 'Aucun produit en stock faible.');
    clear(tbody);
    alerts.data.forEach((p) => tbody.append(h('tr', {},
      h('td', {}, p.name), h('td', {}, p.sku), h('td', {}, p.category_name || '—'),
      h('td', { class: 'num' }, p.quantity), h('td', { class: 'num' }, p.min_quantity),
      h('td', {}, h('span', { class: 'badge ' + p.status }, STATUS_LABEL[p.status] || p.status)))));
  } catch (err) { showError(err); }
}
loadDashboard();
