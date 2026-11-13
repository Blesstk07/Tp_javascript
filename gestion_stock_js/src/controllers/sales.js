const { z } = require('zod');
const service = require('../services/sales');

const saleItemSchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().positive(),
}).refine((item) => item.product_id || item.productId, {
  message: 'product_id requis',
  path: ['product_id'],
});

const saleSchema = z.object({
  notes: z.string().trim().max(255).optional().nullable(),
  items: z.array(saleItemSchema).min(1),
}).passthrough();

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
    const result = await service.getSaleById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listSales, createSale, getSale };
