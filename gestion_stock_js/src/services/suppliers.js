const pool = require('../config/db');
const { parsePagination, toHttpError, buildDuplicateError } = require('./helpers');

async function listSuppliers(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const [countRows] = await pool.execute('SELECT COUNT(*) AS total FROM suppliers WHERE is_active = 1');
  const total = Number(countRows[0]?.total || 0);
  const [rows] = await pool.execute(
    'SELECT * FROM suppliers WHERE is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );

  return {
    data: rows,
    meta: { page, limit, total }
  };
}

async function createSupplier(payload) {
  const name = String(payload.name || '').trim();
  const contactName = payload.contact_name == null ? null : String(payload.contact_name).trim() || null;
  const email = payload.email == null ? null : String(payload.email).trim() || null;
  const phone = payload.phone == null ? null : String(payload.phone).trim() || null;
  const address = payload.address == null ? null : String(payload.address).trim() || null;

  if (!name) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Le nom du fournisseur est requis', []);
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO suppliers (name, contact_name, email, phone, address, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [name, contactName, email, phone, address]
    );

    const [rows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
    return rows[0];
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw buildDuplicateError(error.message);
    }
    throw error;
  }
}

async function updateSupplier(id, payload) {
  const [existingRows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
  if (!existingRows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Fournisseur introuvable', []);
  }

  const fields = [];
  const values = [];

  if (payload.name !== undefined) {
    const name = String(payload.name || '').trim();
    if (!name) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'Le nom du fournisseur est requis', []);
    }
    fields.push('name = ?');
    values.push(name);
  }

  if (payload.contact_name !== undefined) {
    fields.push('contact_name = ?');
    values.push(payload.contact_name == null || payload.contact_name === '' ? null : String(payload.contact_name).trim());
  }

  if (payload.email !== undefined) {
    fields.push('email = ?');
    values.push(payload.email == null || payload.email === '' ? null : String(payload.email).trim());
  }

  if (payload.phone !== undefined) {
    fields.push('phone = ?');
    values.push(payload.phone == null || payload.phone === '' ? null : String(payload.phone).trim());
  }

  if (payload.address !== undefined) {
    fields.push('address = ?');
    values.push(payload.address == null || payload.address === '' ? null : String(payload.address).trim());
  }

  if (fields.length === 0) {
    return existingRows[0];
  }

  values.push(id);

  try {
    await pool.execute(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw buildDuplicateError(error.message);
    }
    throw error;
  }
}

module.exports = { listSuppliers, createSupplier, updateSupplier };
