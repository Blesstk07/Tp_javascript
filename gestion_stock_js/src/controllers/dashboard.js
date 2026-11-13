const service = require('../services/dashboard');

async function getDashboard(req, res, next) {
  try {
    const result = await service.getDashboard();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
