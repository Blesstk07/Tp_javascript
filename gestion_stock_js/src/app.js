const express = require('express');
const path = require('path');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use('/app', express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
