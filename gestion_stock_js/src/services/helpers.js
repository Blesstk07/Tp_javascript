const { z } = require('zod');

function parsePagination(query = {}) {
  const requestedPage = Number.parseInt(query.page ?? '1', 10);
  const requestedLimit = Number.parseInt(query.limit ?? '20', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }

  const raw = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error('Montant invalide');
  }

  const [whole, decimal = '00'] = raw.split('.');
  return `${whole}.${decimal.padEnd(2, '0').slice(0, 2)}`;
}

const moneySchema = z.union([
  z.string(),
  z.number(),
  z.bigint()
]).transform((value) => normalizeMoney(value));

function normalizeProductPayload(body = {}) {
  const normalized = { ...body };
  if (normalized.sale_price === undefined && normalized.selling_price !== undefined) {
    normalized.sale_price = normalized.selling_price;
  }
  if (normalized.quantity === undefined && normalized.stock_quantity !== undefined) {
    normalized.quantity = normalized.stock_quantity;
  }
  if (normalized.min_quantity === undefined && normalized.alert_threshold !== undefined) {
    normalized.min_quantity = normalized.alert_threshold;
  }
  if (normalized.purchase_price === undefined && normalized.cost_price !== undefined) {
    normalized.purchase_price = normalized.cost_price;
  }
  return normalized;
}

function normalizeSaleItemPayload(item = {}) {
  const normalized = { ...item };
  if (normalized.product_id === undefined && normalized.productId !== undefined) {
    normalized.product_id = normalized.productId;
  }
  return normalized;
}

function toHttpError(status, code, message, details = []) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function mapDbError(error, fallbackCode = 'INTERNAL_ERROR') {
  if (error && error.status) {
    return error;
  }

  const message = error && error.message ? error.message : 'Erreur interne du serveur';
  const code = error && error.code ? error.code : fallbackCode;
  const status = code === 'NOT_FOUND' ? 404 : code === 'DUPLICATE_SKU' || code === 'DUPLICATE_NAME' || code === 'CONFLICT' ? 409 : code === 'INSUFFICIENT_STOCK' ? 409 : 500;

  const mapped = new Error(message);
  mapped.status = status;
  mapped.code = code;
  mapped.details = [];
  return mapped;
}

function buildDuplicateError(message) {
  if (String(message).toLowerCase().includes('sku')) {
    return toHttpError(409, 'DUPLICATE_SKU', 'SKU déjà existant', []);
  }
  if (String(message).toLowerCase().includes('name')) {
    return toHttpError(409, 'DUPLICATE_NAME', 'Nom déjà existant', []);
  }
  return toHttpError(409, 'CONFLICT', 'Conflit de données', []);
}

function productResponse(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    category_id: Number(row.category_id),
    category_name: row.category_name || null,
    name: row.name,
    sku: row.sku,
    description: row.description || null,
    purchase_price: normalizeMoney(row.purchase_price ?? '0.00'),
    sale_price: normalizeMoney(row.sale_price ?? row.selling_price ?? '0.00'),
    quantity: Number(row.quantity ?? row.stock_quantity ?? 0),
    min_quantity: Number(row.min_quantity ?? row.alert_threshold ?? 0),
    unit: row.unit || 'piece',
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  parsePagination,
  normalizeMoney,
  moneySchema,
  normalizeProductPayload,
  normalizeSaleItemPayload,
  toHttpError,
  mapDbError,
  buildDuplicateError,
  productResponse,
};
