function notImplemented(req, res) {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Endpoint pas encore implémenté',
      details: []
    }
  });
}

module.exports = { notImplemented };
