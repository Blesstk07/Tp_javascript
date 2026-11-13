const pool = require('../config/db');
const { parsePagination, toHttpError, buildDuplicateError } = require('./helpers');

async function listCategories(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const [countRows] = await pool.execute('SELECT COUNT(*) AS total FROM categories WHERE is_active = 1');
  const total = Number(countRows[0]?.total || 0);
  const [rows] = await pool.execute(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );

  return {
    data: rows,
    meta: { page, limit, total }
  };
}

async function createCategory(payload) {
  const name = String(payload.name || '').trim();
  const description = payload.description == null ? null : String(payload.description).trim();

  if (!name) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Le nom de la catégorie est requis', []);
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO categories (name, description, is_active) VALUES (?, ?, 1)',
      [name, description || null]
    );

    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return rows[0];
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw buildDuplicateError(error.message);
    }
    throw error;
  }
}

async function updateCategory(id, payload) {
  const name = payload.name == null ? null : String(payload.name).trim();
  const description = payload.description == null ? null : String(payload.description).trim();

  const [existingRows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existingRows[0]) {
    throw toHttpError(404, 'NOT_FOUND', 'Catégorie introuvable', []);
  }

  const updates = [];
  const values = [];

  if (name !== null) {
    if (!name) {
      throw toHttpError(400, 'VALIDATION_ERROR', 'Le nom de la catégorie est requis', []);
    }
    updates.push('name = ?');
    values.push(name);
  }

  if (description !== null) {
    updates.push('description = ?');
    values.push(description || null);
  }

  if (updates.length === 0) {
    return existingRows[0];
  }

  values.push(id);

  try {
    await pool.execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw buildDuplicateError(error.message);
    }
    throw error;
  }
}

module.exports = { listCategories, createCategory, updateCategory };
