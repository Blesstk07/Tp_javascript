const { ZodError } = require('zod');

function notFound(req, res, next) {
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route introuvable', details: [] }
    });
  }
  return res.status(404).type('text/plain').send('Page introuvable');
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Corps JSON invalide', details: [] }
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Corps de requête trop volumineux', details: [] }
    });
  }

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
