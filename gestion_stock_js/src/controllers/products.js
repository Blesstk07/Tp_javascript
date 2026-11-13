const { z } = require('zod');
const service = require('../services/products');

const moneyValue = z.union([z.string(), z.number()]).transform((value) => String(value).trim());
const productSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  sku: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
  purchase_price: moneyValue,
  sale_price: moneyValue.optional(),
  selling_price: moneyValue.optional(),
  quantity: z.coerce.number().int().nonnegative().optional(),
  stock_quantity: z.coerce.number().int().nonnegative().optional(),
  min_quantity: z.coerce.number().int().nonnegative().optional(),
  alert_threshold: z.coerce.number().int().nonnegative().optional(),
}).passthrough();

const productUpdateSchema = productSchema.partial();

async function listProducts(req, res, next) {
  try {
    const result = await service.listProducts(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const payload = productSchema.parse(req.body || {});
    const result = await service.createProduct(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const result = await service.getProductById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const payload = productUpdateSchema.parse(req.body || {});
    const result = await service.updateProduct(req.params.id, payload);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    await service.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listProducts, createProduct, getProduct, updateProduct, deleteProduct };
