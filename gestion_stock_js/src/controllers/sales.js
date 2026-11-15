const { z } = require('zod');
const service = require('../services/sales');
const { parseResourceId } = require('../services/helpers');

const idValue = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9]\d*$/).transform(Number),
]).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const quantityValue = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9]\d*$/).transform(Number),
]).pipe(z.number().int().positive().max(4294967295));
const saleItemSchema = z.object({
  product_id: idValue.optional(),
  productId: idValue.optional(),
  quantity: quantityValue,
}).strict().refine((item) => item.product_id || item.productId, {
  message: 'product_id requis',
  path: ['product_id'],
});

const saleSchema = z.object({
  notes: z.string().trim().max(255).optional().nullable(),
  items: z.array(saleItemSchema).min(1),
}).strict();

async function listSales(req, res, next) {
  try {
    const result = await service.listSales(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createSale(req, res, next) {
  try {
    const payload = saleSchema.parse(req.body || {});
    const result = await service.createSale(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getSale(req, res, next) {
  try {
    const result = await service.getSaleById(parseResourceId(req.params.id));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listSales, createSale, getSale };
