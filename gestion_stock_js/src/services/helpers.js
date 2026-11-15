const { z } = require('zod');

const MAX_UNIT_CENTS = 999999999999n;
const MAX_TOTAL_CENTS = 99999999999999n;

function toHttpError(status, code, message, details = []) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function parseInteger(value, name, defaultValue) {
  if (value === undefined) return defaultValue;
  const raw = String(value);
  if (!/^[1-9]\d*$/.test(raw)) {
    throw toHttpError(400, 'VALIDATION_ERROR', `Paramètre ${name} invalide`, []);
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw toHttpError(400, 'VALIDATION_ERROR', `Paramètre ${name} invalide`, []);
  }
  return parsed;
}

function parsePagination(query = {}, filters = []) {
  const allowed = new Set(['page', 'limit', ...filters]);
  const unknown = Object.keys(query).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw toHttpError(400, 'VALIDATION_ERROR', `Paramètre inconnu : ${unknown[0]}`, []);
  }

  const page = parseInteger(query.page, 'page', 1);
  const limit = parseInteger(query.limit, 'limit', 20);
  if (limit > 100) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Le paramètre limit ne peut pas dépasser 100', []);
  }

  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Paramètre page hors limites', []);
  }
  return { page, limit, offset };
}

function parseResourceId(value, name = 'id') {
  const raw = String(value);
  if (!/^[1-9]\d*$/.test(raw)) {
    throw toHttpError(400, 'VALIDATION_ERROR', `Identifiant ${name} invalide`, []);
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) {
    throw toHttpError(400, 'VALIDATION_ERROR', `Identifiant ${name} hors limites`, []);
  }
  return id;
}

function parseMoneyCents(value, maxCents = MAX_TOTAL_CENTS) {
  const raw = value === null || value === undefined || value === '' ? '0' : String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Montant invalide', []);
  }

  const [whole, fraction = ''] = raw.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > maxCents) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Montant hors limites', []);
  }
  return cents;
}

function formatMoneyCents(cents) {
  if (cents < 0n || cents > MAX_TOTAL_CENTS) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Montant total hors limites', []);
  }
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function normalizeMoney(value, maxCents = MAX_TOTAL_CENTS) {
  return formatMoneyCents(parseMoneyCents(value, maxCents));
}

function addMoney(left, right) {
  return formatMoneyCents(parseMoneyCents(left) + parseMoneyCents(right));
}

function multiplyMoney(amount, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw toHttpError(400, 'VALIDATION_ERROR', 'Quantité invalide pour le calcul du montant', []);
  }
  return formatMoneyCents(parseMoneyCents(amount, MAX_UNIT_CENTS) * BigInt(quantity));
}

const moneySchema = z.union([z.string(), z.number()]).transform((value) => String(value).trim())
  .refine((value) => {
    if (!value) return false;
    try {
      parseMoneyCents(value, MAX_UNIT_CENTS);
      return true;
    } catch {
      return false;
    }
  }, 'Montant invalide');

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
    purchase_price: normalizeMoney(row.purchase_price ?? '0.00', MAX_UNIT_CENTS),
    sale_price: normalizeMoney(row.sale_price ?? row.selling_price ?? '0.00', MAX_UNIT_CENTS),
    quantity: Number(row.quantity ?? row.stock_quantity ?? 0),
    min_quantity: Number(row.min_quantity ?? row.alert_threshold ?? 0),
    unit: row.unit || 'piece',
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  MAX_UNIT_CENTS,
  parsePagination,
  parseResourceId,
  parseMoneyCents,
  normalizeMoney,
  addMoney,
  multiplyMoney,
  moneySchema,
  normalizeProductPayload,
  normalizeSaleItemPayload,
  toHttpError,
  buildDuplicateError,
  productResponse,
};
