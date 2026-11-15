const { randomUUID } = require('node:crypto');
const pool = require('../config/db');
const {
  MAX_UNIT_CENTS,
  addMoney,
  multiplyMoney,
  parsePagination,
  parseResourceId,
  normalizeMoney,
  toHttpError,
} = require('./helpers');
const { runTransaction } = require('./transactions');

function computeStatus(quantity, minQuantity) {
  if (Number(quantity) === 0) return 'OUT';
  if (Number(quantity) <= Number(minQuantity || 0)) return 'LOW';
  return 'OK';
}

async function listStock(query = {}) {
  const { page, limit, offset } = parsePagination(query, ['low_stock', 'lowStock']);
  const lowStockValue = query.low_stock ?? query.lowStock ?? '';
  if (lowStockValue !== '' && !['true', 'false'].includes(String(lowStockValue).toLowerCase())) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Paramètre low_stock invalide', []);
  }
  const lowStockOnly = String(lowStockValue).toLowerCase() === 'true';

  let sql = `SELECT p.id AS product_id, p.name, p.sku, p.stock_quantity AS quantity, p.alert_threshold AS min_quantity,
                  c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.is_active = 1`;
  const params = [];

  if (lowStockOnly) {
    sql += ' AND p.stock_quantity <= p.alert_threshold';
  }

  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM (${sql}) AS filtered`, params);
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.execute(`${sql} ORDER BY p.stock_quantity ASC, p.name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);

  return {
    data: rows.map((row) => ({
      product_id: Number(row.product_id),
      name: row.name,
      sku: row.sku,
      category_name: row.category_name || null,
      quantity: Number(row.quantity || 0),
      min_quantity: Number(row.min_quantity || 0),
      status: computeStatus(row.quantity, row.min_quantity),
    })),
    meta: { page, limit, total }
  };
}

async function createStockEntry(payload) {
  const supplierId = parseResourceId(payload.supplier_id ?? payload.supplierId, 'supplier_id');
  const inputItems = Array.isArray(payload.items) ? payload.items : [];
  const notes = payload.notes == null || payload.notes === '' ? null : String(payload.notes).trim();

  if (!inputItems.length) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Au moins un produit est requis', []);
  }

  const items = inputItems.map((item) => {
    const productId = parseResourceId(item.product_id ?? item.productId, 'product_id');
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 4294967295) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'La quantité doit être un entier positif', []);
    }
    return {
      productId,
      quantity,
      unitCost: normalizeMoney(item.unit_cost ?? item.unitCost, MAX_UNIT_CENTS),
    };
  });

  const [supplierRows] = await pool.execute('SELECT id FROM suppliers WHERE id = ? AND is_active = 1', [supplierId]);
  if (!supplierRows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Fournisseur introuvable', []);
  }

  const supplyId = await runTransaction(async (connection) => {
    const productIds = [...new Set(items.map((item) => item.productId))].sort((a, b) => a - b);
    const placeholders = productIds.map(() => '?').join(', ');
    const [productRows] = await connection.execute(
      `SELECT id, stock_quantity, name FROM products WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
      productIds
    );

    if (productRows.length !== productIds.length) {
      throw toHttpError(404, 'NOT_FOUND', 'Un ou plusieurs produits sont introuvables', []);
    }

    const productsById = new Map(productRows.map((row) => [Number(row.id), row]));
    const quantitiesByProduct = new Map();
    for (const item of items) {
      quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) || 0) + item.quantity);
    }
    for (const [productId, quantity] of quantitiesByProduct) {
      const current = Number(productsById.get(productId).stock_quantity);
      if (current + quantity > 4294967295) {
        throw toHttpError(409, 'CONFLICT', 'La quantité dépasse la capacité de stock autorisée', []);
      }
    }

    const supplyNumber = `SUP-${randomUUID()}`;
    const [supplyResult] = await connection.execute(
      'INSERT INTO supplies (supplier_id, supply_number, total_amount, notes, supplied_at) VALUES (?, ?, 0.00, ?, NOW())',
      [supplierId, supplyNumber, notes]
    );

    let totalAmount = '0.00';

    for (const item of items) {
      const { productId, quantity, unitCost } = item;
      const lineTotal = multiplyMoney(unitCost, quantity);

      const [insertItemResult] = await connection.execute(
        'INSERT INTO supply_items (supply_id, product_id, quantity, unit_cost, line_total) VALUES (?, ?, ?, ?, ?)',
        [supplyResult.insertId, productId, quantity, unitCost, lineTotal]
      );

      await connection.execute(
        'INSERT INTO stock_movements (product_id, movement_type, quantity, supply_item_id, notes, moved_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [productId, 'IN', quantity, insertItemResult.insertId, notes || 'Approvisionnement']
      );

      await connection.execute(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
        [quantity, productId]
      );

      totalAmount = addMoney(totalAmount, lineTotal);
    }

    await connection.execute('UPDATE supplies SET total_amount = ? WHERE id = ?', [totalAmount, supplyResult.insertId]);
    return supplyResult.insertId;
  });

  const [rows] = await pool.execute('SELECT * FROM supplies WHERE id = ?', [supplyId]);
  return rows[0];
}

async function listStockMovements(query = {}) {
  const { page, limit, offset } = parsePagination(query, ['product_id', 'productId', 'type']);
  const rawProductId = query.product_id ?? query.productId;
  const productId = rawProductId === undefined ? undefined : parseResourceId(rawProductId, 'product_id');
  const type = String(query.type || '').toUpperCase();
  if (type && type !== 'IN' && type !== 'OUT') {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Paramètre type invalide', []);
  }

  let sql = `SELECT sm.id, sm.product_id, p.name AS product_name, sm.movement_type, sm.quantity,
                  sm.notes, sm.moved_at
             FROM stock_movements sm
             INNER JOIN products p ON p.id = sm.product_id
             WHERE 1 = 1`;
  const params = [];

  if (productId !== undefined) {
    sql += ' AND sm.product_id = ?';
    params.push(productId);
  }
  if (type === 'IN' || type === 'OUT') {
    sql += ' AND sm.movement_type = ?';
    params.push(type);
  }

  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM (${sql}) AS filtered`, params);
  const total = Number(countRows[0]?.total || 0);
  const [rows] = await pool.execute(`${sql} ORDER BY sm.moved_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

  return {
    data: rows.map((row) => ({
      id: Number(row.id),
      product_id: Number(row.product_id),
      product_name: row.product_name,
      movement_type: row.movement_type,
      quantity: Number(row.quantity),
      notes: row.notes,
      moved_at: row.moved_at,
    })),
    meta: { page, limit, total }
  };
}

module.exports = { listStock, createStockEntry, listStockMovements };
