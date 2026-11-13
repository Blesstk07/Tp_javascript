const pool = require('../config/db');
const { parsePagination, normalizeMoney, normalizeProductPayload, toHttpError, buildDuplicateError, productResponse } = require('./helpers');

function buildProductWhere(query = {}) {
  const filter = [];
  const params = [];

  const search = String(query.search || '').trim();
  if (search) {
    filter.push('(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?)');
    const likeValue = `%${search.toLowerCase()}%`;
    params.push(likeValue, likeValue);
  }

  const categoryId = Number(query.category_id ?? query.categoryId);
  if (Number.isFinite(categoryId) && categoryId > 0) {
    filter.push('p.category_id = ?');
    params.push(categoryId);
  }

  const clause = filter.length ? ` WHERE ${filter.join(' AND ')}` : '';
  return { clause, params };
}

async function listProducts(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const { clause, params } = buildProductWhere(query);

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM products p ${clause}`,
    params
  );

  const total = Number(countRows[0]?.total || 0);
  const [rows] = await pool.execute(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${clause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: rows.map((row) => ({
      id: Number(row.id),
      category_id: Number(row.category_id),
      category_name: row.category_name || null,
      name: row.name,
      sku: row.sku,
      description: row.description || null,
      purchase_price: normalizeMoney(row.purchase_price ?? '0.00'),
      sale_price: normalizeMoney(row.selling_price ?? row.sale_price ?? '0.00'),
      quantity: Number(row.stock_quantity ?? row.quantity ?? 0),
      min_quantity: Number(row.alert_threshold ?? row.min_quantity ?? 0),
      unit: row.unit || 'piece',
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    meta: { page, limit, total }
  };
}

async function getProductById(id) {
  const [rows] = await pool.execute(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );

  if (!rows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Produit introuvable', []);
  }

  return productResponse(rows[0]);
}

async function createProduct(payload) {
  const body = normalizeProductPayload(payload || {});
  const item = {
    category_id: Number(body.category_id),
    name: String(body.name || '').trim(),
    sku: String(body.sku || '').trim(),
    description: body.description == null ? null : String(body.description).trim() || null,
    purchase_price: normalizeMoney(body.purchase_price ?? '0.00'),
    sale_price: normalizeMoney(body.sale_price ?? body.selling_price ?? '0.00'),
    quantity: Number(body.quantity ?? body.stock_quantity ?? 0),
    min_quantity: Number(body.min_quantity ?? body.alert_threshold ?? 5),
  };

  if (!item.category_id || item.category_id <= 0) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'La catégorie est obligatoire', []);
  }
  if (!item.name) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Le nom du produit est requis', []);
  }
  if (!item.sku) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Le SKU est requis', []);
  }
  if (!Number.isInteger(item.quantity) || item.quantity < 0) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'La quantité doit être un entier positif', []);
  }
  if (!Number.isInteger(item.min_quantity) || item.min_quantity < 0) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'La quantité minimale doit être un entier positif', []);
  }

  const [categoryRows] = await pool.execute('SELECT id FROM categories WHERE id = ? AND is_active = 1', [item.category_id]);
  if (!categoryRows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Catégorie introuvable', []);
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO products
       (category_id, sku, name, description, unit, purchase_price, selling_price, stock_quantity, alert_threshold, is_active)
       VALUES (?, ?, ?, ?, 'piece', ?, ?, ?, ?, 1)`,
      [item.category_id, item.sku, item.name, item.description, item.purchase_price, item.sale_price, item.quantity, item.min_quantity]
    );

    return getProductById(result.insertId);
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw buildDuplicateError(error.message);
    }
    throw error;
  }
}

async function updateProduct(id, payload) {
  const body = normalizeProductPayload(payload || {});
  const [existingRows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
  if (!existingRows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Produit introuvable', []);
  }

  const next = { ...existingRows[0] };
  const updates = [];
  const values = [];

  if (body.category_id !== undefined) {
    const categoryId = Number(body.category_id);
    if (!categoryId || categoryId <= 0) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'La catégorie est invalide', []);
    }
    const [categoryRows] = await pool.execute('SELECT id FROM categories WHERE id = ? AND is_active = 1', [categoryId]);
    if (!categoryRows[0]) {
      throw toHttpError(404, 'NOT_FOUND', 'Catégorie introuvable', []);
    }
    updates.push('category_id = ?');
    values.push(categoryId);
    next.category_id = categoryId;
  }

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'Le nom du produit est requis', []);
    }
    updates.push('name = ?');
    values.push(name);
    next.name = name;
  }

  if (body.sku !== undefined) {
    const sku = String(body.sku).trim();
    if (!sku) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'Le SKU est requis', []);
    }
    updates.push('sku = ?');
    values.push(sku);
    next.sku = sku;
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    values.push(body.description == null || body.description === '' ? null : String(body.description).trim());
    next.description = body.description == null || body.description === '' ? null : String(body.description).trim();
  }

  if (body.purchase_price !== undefined) {
    const value = normalizeMoney(body.purchase_price);
    updates.push('purchase_price = ?');
    values.push(value);
    next.purchase_price = value;
  }

  if (body.sale_price !== undefined || body.selling_price !== undefined) {
    const value = normalizeMoney(body.sale_price ?? body.selling_price);
    updates.push('selling_price = ?');
    values.push(value);
    next.selling_price = value;
  }

  if (body.quantity !== undefined || body.stock_quantity !== undefined) {
    const quantity = Number(body.quantity ?? body.stock_quantity ?? next.stock_quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'La quantité doit être un entier positif', []);
    }
    updates.push('stock_quantity = ?');
    values.push(quantity);
    next.stock_quantity = quantity;
  }

  if (body.min_quantity !== undefined || body.alert_threshold !== undefined) {
    const minQuantity = Number(body.min_quantity ?? body.alert_threshold ?? next.alert_threshold);
    if (!Number.isInteger(minQuantity) || minQuantity < 0) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'La quantité minimale doit être un entier positif', []);
    }
    updates.push('alert_threshold = ?');
    values.push(minQuantity);
    next.alert_threshold = minQuantity;
  }

  if (updates.length === 0) {
    return productResponse(next);
  }

  values.push(id);

  try {
    await pool.execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
    return getProductById(id);
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw buildDuplicateError(error.message);
    }
    throw error;
  }
}

async function deleteProduct(id) {
  const [rows] = await pool.execute('SELECT id FROM products WHERE id = ?', [id]);
  if (!rows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Produit introuvable', []);
  }

  try {
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    return null;
  } catch (error) {
    if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2')) {
      throw toHttpError(409, 'CONFLICT', 'Le produit est référencé dans des mouvements ou ventes', []);
    }
    throw error;
  }
}

module.exports = { listProducts, getProductById, createProduct, updateProduct, deleteProduct };
