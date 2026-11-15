const { z } = require('zod');
const service = require('../services/products');
const {
  moneySchema,
  parseResourceId,
  positiveIdSchema,
  quantitySchema,
} = require('../services/helpers');

const productFields = z.object({
  category_id: positiveIdSchema,
  name: z.string().trim().min(1).max(150),
  sku: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).nullable().optional(),
  purchase_price: moneySchema,
  sale_price: moneySchema.optional(),
  selling_price: moneySchema.optional(),
  quantity: quantitySchema.optional(),
  stock_quantity: quantitySchema.optional(),
  min_quantity: quantitySchema.optional(),
  alert_threshold: quantitySchema.optional(),
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
