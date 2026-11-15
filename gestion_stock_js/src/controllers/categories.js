const { z } = require('zod');
const service = require('../services/categories');
const { parseResourceId } = require('../services/helpers');

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
}).strict();

const categoryUpdateSchema = categorySchema.partial();

async function listCategories(req, res, next) {
  try {
    const result = await service.listCategories(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const payload = categorySchema.parse(req.body || {});
    const result = await service.createCategory(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const payload = categoryUpdateSchema.parse(req.body || {});
    const result = await service.updateCategory(parseResourceId(req.params.id), payload);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listCategories, createCategory, updateCategory };
