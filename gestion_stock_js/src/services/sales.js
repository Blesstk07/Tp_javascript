const pool = require('../config/db');
const { parsePagination, normalizeMoney, toHttpError, normalizeSaleItemPayload } = require('./helpers');

async function listSales(query = {}) {
  const { page, limit, offset } = parsePagination(query);

  const [countRows] = await pool.execute('SELECT COUNT(*) AS total FROM sales');
  const total = Number(countRows[0]?.total || 0);
  const [rows] = await pool.execute(
    `SELECT s.*, COUNT(si.id) AS item_count
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     GROUP BY s.id
     ORDER BY s.sold_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return {
    data: rows.map((row) => ({
      id: Number(row.id),
      sale_number: row.sale_number,
      total_amount: normalizeMoney(row.total_amount ?? '0.00'),
      notes: row.notes,
      sold_at: row.sold_at,
      item_count: Number(row.item_count || 0),
    })),
    meta: { page, limit, total }
  };
}

async function getSaleById(id) {
  const [saleRows] = await pool.execute('SELECT * FROM sales WHERE id = ?', [id]);
  if (!saleRows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Vente introuvable', []);
  }

  const [itemRows] = await pool.execute(
    `SELECT si.id, si.product_id, p.name AS product_name, p.sku, si.quantity, si.unit_price, si.line_total
     FROM sale_items si
     INNER JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?
     ORDER BY si.id ASC`,
    [id]
  );

  return {
    id: Number(saleRows[0].id),
    sale_number: saleRows[0].sale_number,
    total_amount: normalizeMoney(saleRows[0].total_amount ?? '0.00'),
    notes: saleRows[0].notes,
    sold_at: saleRows[0].sold_at,
    items: itemRows.map((row) => ({
      id: Number(row.id),
      product_id: Number(row.product_id),
      product_name: row.product_name,
      sku: row.sku,
      quantity: Number(row.quantity),
      unit_price: normalizeMoney(row.unit_price ?? '0.00'),
      line_total: normalizeMoney(row.line_total ?? '0.00'),
    })),
  };
}

async function createSale(payload) {
  const items = Array.isArray(payload.items) ? payload.items.map(normalizeSaleItemPayload) : [];
  const notes = payload.notes == null || payload.notes === '' ? null : String(payload.notes).trim();

  if (!items.length) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Au moins un produit est requis', []);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const productIds = items.map((item) => Number(item.product_id ?? item.productId));
    const placeholders = productIds.map(() => '?').join(', ');
    const [productRows] = await connection.query(
      `SELECT id, stock_quantity, selling_price, name, sku FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      productIds
    );

    if (productRows.length !== productIds.length) {
      throw toHttpError(404, 'NOT_FOUND', 'Un ou plusieurs produits sont introuvables', []);
    }

    const productsById = new Map(productRows.map((row) => [Number(row.id), row]));
    const itemDetails = [];
    let totalAmount = '0.00';

    for (const item of items) {
      const productId = Number(item.product_id ?? item.productId);
      const quantity = Number(item.quantity);
      if (!productId || productId <= 0) {
        throw toHttpError(400, 'VALIDATION_ERROR', 'Produit invalide', []);
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw toHttpError(400, 'VALIDATION_ERROR', 'La quantité doit être supérieure à 0', []);
      }

      const product = productsById.get(productId);
      if (!product) {
        throw toHttpError(404, 'NOT_FOUND', `Produit ${productId} introuvable`, []);
      }

      if (Number(product.stock_quantity) < quantity) {
        throw toHttpError(409, 'INSUFFICIENT_STOCK', `Stock insuffisant pour le produit ${product.name}`, []);
      }

      const unitPrice = normalizeMoney(product.selling_price ?? '0.00');
      const lineTotal = normalizeMoney((Number(quantity) * Number(unitPrice)).toFixed(2));
      totalAmount = normalizeMoney((Number(totalAmount) + Number(lineTotal)).toFixed(2));
      itemDetails.push({ productId, quantity, unitPrice, lineTotal });
    }

    const saleNumber = `SAL-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    const [saleResult] = await connection.execute(
      'INSERT INTO sales (sale_number, total_amount, notes, sold_at) VALUES (?, 0.00, ?, NOW())',
      [saleNumber, notes]
    );

    for (const detail of itemDetails) {
      const [saleItemResult] = await connection.execute(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)',
        [saleResult.insertId, detail.productId, detail.quantity, detail.unitPrice, detail.lineTotal]
      );

      await connection.execute(
        'INSERT INTO stock_movements (product_id, movement_type, quantity, sale_item_id, notes, moved_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [detail.productId, 'OUT', detail.quantity, saleItemResult.insertId, notes || 'Vente']
      );

      await connection.execute(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [detail.quantity, detail.productId]
      );
    }

    await connection.execute('UPDATE sales SET total_amount = ? WHERE id = ?', [totalAmount, saleResult.insertId]);
    await connection.commit();

    return getSaleById(saleResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listSales, getSaleById, createSale };
