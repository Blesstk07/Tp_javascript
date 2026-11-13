const pool = require('../config/db');
const { normalizeMoney } = require('./helpers');

async function getDashboard() {
  const [productCountRows] = await pool.execute('SELECT COUNT(*) AS total FROM products WHERE is_active = 1');
  const [categoryCountRows] = await pool.execute('SELECT COUNT(*) AS total FROM categories WHERE is_active = 1');
  const [supplierCountRows] = await pool.execute('SELECT COUNT(*) AS total FROM suppliers WHERE is_active = 1');
  const [lowStockRows] = await pool.execute('SELECT COUNT(*) AS total FROM products WHERE is_active = 1 AND stock_quantity <= alert_threshold');
  const [saleRows] = await pool.execute('SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COUNT(*) AS sales_count FROM sales');

  return {
    products: Number(productCountRows[0]?.total || 0),
    categories: Number(categoryCountRows[0]?.total || 0),
    suppliers: Number(supplierCountRows[0]?.total || 0),
    low_stock_products: Number(lowStockRows[0]?.total || 0),
    sales_count: Number(saleRows[0]?.sales_count || 0),
    total_revenue: normalizeMoney(saleRows[0]?.total_revenue || '0.00'),
  };
}

module.exports = { getDashboard };
