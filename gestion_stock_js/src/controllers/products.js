const { z } = require('zod');
const service = require('../services/products');
const { moneySchema, parseResourceId } = require('../services/helpers');

const quantityValue = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^(0|[1-9]\d*)$/).transform(Number),
]).pipe(z.number().int().nonnegative().max(4294967295));
const productFields = z.object({
  category_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  sku: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
  purchase_price: moneySchema,
  sale_price: moneySchema.optional(),
  selling_price: moneySchema.optional(),
  quantity: quantityValue.optional(),
  stock_quantity: quantityValue.optional(),
  min_quantity: quantityValue.optional(),
  alert_threshold: quantityValue.optional(),
}).strict();
const productSchema = productFields.refine(
  (payload) => payload.sale_price !== undefined || payload.selling_price !== undefined,
  { message: 'Le prix de vente est requis', path: ['sale_price'] }
);

const productUpdateSchema = productFields.partial();

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
    const result = await service.getProductById(parseResourceId(req.params.id));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const payload = productUpdateSchema.parse(req.body || {});
    const result = await service.updateProduct(parseResourceId(req.params.id), payload);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    await service.deleteProduct(parseResourceId(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listProducts, createProduct, getProduct, updateProduct, deleteProduct };
