const express = require('express');
const path = require('path');
const { notFound, errorHandler } = require('./middlewares/error');
const pool = require('./config/db');

const app = express();
const publicDirectory = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: '1mb' }));
app.use('/app', express.static(publicDirectory));
app.use(express.static(publicDirectory));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Échec du contrôle de connexion MySQL', error);
    res.status(503).json({
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Base de données indisponible',
        details: []
      }
    });
  }
});

app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
