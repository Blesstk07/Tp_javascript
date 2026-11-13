function notFound(req, res, next) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route introuvable', details: [] }
  });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = Number(err.status) || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'Erreur interne du serveur' : err.message,
      details: err.details || []
    }
  });
}

module.exports = { notFound, errorHandler };
