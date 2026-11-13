const pool = require('../config/db');
const { parsePagination, normalizeMoney, toHttpError } = require('./helpers');

function computeStatus(quantity, minQuantity) {
  if (Number(quantity) === 0) return 'OUT';
  if (Number(quantity) <= Number(minQuantity || 0)) return 'LOW';
  return 'OK';
}

async function listStock(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const lowStockValue = query.low_stock ?? query.lowStock ?? '';
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
  const supplierId = Number(payload.supplier_id ?? payload.supplierId);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const notes = payload.notes == null || payload.notes === '' ? null : String(payload.notes).trim();

  if (!supplierId || supplierId <= 0) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Le fournisseur est requis', []);
  }
  if (!items.length) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Au moins un produit est requis', []);
  }

  const [supplierRows] = await pool.execute('SELECT id FROM suppliers WHERE id = ? AND is_active = 1', [supplierId]);
  if (!supplierRows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Fournisseur introuvable', []);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const productIds = items.map((item) => Number(item.product_id ?? item.productId));
    const placeholders = productIds.map(() => '?').join(', ');
    const [productRows] = await connection.query(
      `SELECT id, stock_quantity, name, alert_threshold FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      productIds
    );

    if (productRows.length !== productIds.length) {
      throw toHttpError(404, 'NOT_FOUND', 'Un ou plusieurs produits sont introuvables', []);
    }

    for (const item of items) {
      const productId = Number(item.product_id ?? item.productId);
      const quantity = Number(item.quantity);
      const unitCost = normalizeMoney(item.unit_cost ?? item.unitCost ?? '0.00');

      if (!productId || productId <= 0) {
        throw toHttpError(400, 'VALIDATION_ERROR', 'Produit invalide', []);
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw toHttpError(400, 'VALIDATION_ERROR', 'La quantité doit être supérieure à 0', []);
      }
      if (!productRows.some((row) => Number(row.id) === productId)) {
        throw toHttpError(404, 'NOT_FOUND', `Produit ${productId} introuvable`, []);
      }
      if (Number(normalizeMoney(unitCost)) < 0) {
        throw toHttpError(400, 'VALIDATION_ERROR', 'Le coût unitaire ne peut pas être négatif', []);
      }
    }

    const supplyNumber = `SUP-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    const [supplyResult] = await connection.execute(
      'INSERT INTO supplies (supplier_id, supply_number, total_amount, notes, supplied_at) VALUES (?, ?, 0.00, ?, NOW())',
      [supplierId, supplyNumber, notes]
    );

    let totalAmount = '0.00';

    for (const item of items) {
      const productId = Number(item.product_id ?? item.productId);
      const quantity = Number(item.quantity);
      const unitCost = normalizeMoney(item.unit_cost ?? item.unitCost ?? '0.00');
      const lineTotal = normalizeMoney((Number(quantity) * Number(unitCost)).toFixed(2));

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

      totalAmount = normalizeMoney((Number(totalAmount) + Number(lineTotal)).toFixed(2));
    }

    await connection.execute('UPDATE supplies SET total_amount = ? WHERE id = ?', [totalAmount, supplyResult.insertId]);
    await connection.commit();

    const [rows] = await connection.execute('SELECT * FROM supplies WHERE id = ?', [supplyResult.insertId]);
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listStockMovements(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const productId = Number(query.product_id ?? query.productId);
  const type = String(query.type || '').toUpperCase();

  let sql = `SELECT sm.id, sm.product_id, p.name AS product_name, sm.movement_type, sm.quantity,
                  sm.notes, sm.moved_at
             FROM stock_movements sm
             INNER JOIN products p ON p.id = sm.product_id
             WHERE 1 = 1`;
  const params = [];

  if (Number.isFinite(productId) && productId > 0) {
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
