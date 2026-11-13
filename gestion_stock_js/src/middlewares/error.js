const { ZodError } = require('zod');

function notFound(req, res, next) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route introuvable', details: [] }
  });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: err.issues.map((issue) => ({
          path: issue.path.length ? issue.path.join('.') : 'body',
          message: issue.message,
        }))
      }
    });
  }

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
