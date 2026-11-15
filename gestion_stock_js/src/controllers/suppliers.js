const { z } = require('zod');
const service = require('../services/suppliers');
const { parseResourceId } = require('../services/helpers');

const optionalText = (max) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max).nullable().optional()
);

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(150),
  contact_name: optionalText(150),
  email: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? null : value,
    z.string().trim().email().max(190).nullable().optional()
  ),
  phone: optionalText(40),
  address: optionalText(255),
}).strict();

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
    const result = await service.updateSupplier(parseResourceId(req.params.id), payload);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listSuppliers, createSupplier, updateSupplier };
