const { z } = require('zod');
const service = require('../services/stock');

const stockEntrySchema = z.object({
  supplier_id: z.coerce.number().int().positive().optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  notes: z.string().trim().max(255).optional().nullable(),
  items: z.array(
    z.object({
      product_id: z.coerce.number().int().positive().optional(),
      productId: z.coerce.number().int().positive().optional(),
      quantity: z.coerce.number().int().positive(),
      unit_cost: z.union([z.string(), z.number()]).transform((value) => String(value).trim()).optional(),
      unitCost: z.union([z.string(), z.number()]).transform((value) => String(value).trim()).optional(),
    }).passthrough().refine((item) => item.product_id || item.productId, {
      message: 'product_id requis',
      path: ['product_id'],
    }).refine((item) => item.unit_cost !== undefined || item.unitCost !== undefined, {
      message: 'unit_cost requis',
      path: ['unit_cost'],
    })
  ).min(1),
}).passthrough().refine((data) => data.supplier_id || data.supplierId, {
  message: 'supplier_id requis',
  path: ['supplier_id'],
});

async function listStock(req, res, next) {
  try {
    const result = await service.listStock(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createStockEntry(req, res, next) {
  try {
    const payload = stockEntrySchema.parse(req.body || {});
    const result = await service.createStockEntry(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listStockMovements(req, res, next) {
  try {
    const result = await service.listStockMovements(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listStock, createStockEntry, listStockMovements };
