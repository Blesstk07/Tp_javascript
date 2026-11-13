const { z } = require('zod');
const service = require('../services/suppliers');

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(150),
  contact_name: z.string().trim().max(150).nullable().optional(),
  email: z.string().trim().email().max(190).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
});

const supplierUpdateSchema = supplierSchema.partial();

async function listSuppliers(req, res, next) {
  try {
    const result = await service.listSuppliers(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createSupplier(req, res, next) {
  try {
    const payload = supplierSchema.parse(req.body || {});
    const result = await service.createSupplier(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const payload = supplierUpdateSchema.parse(req.body || {});
    const result = await service.updateSupplier(req.params.id, payload);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listSuppliers, createSupplier, updateSupplier };
