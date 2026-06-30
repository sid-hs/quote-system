const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT id, name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price, 'product' AS type FROM products ORDER BY name ASC`
    );
    const [labor] = await pool.query(
      `SELECT id, name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price, 'labor' AS type FROM labor_items ORDER BY name ASC`
    );
    const [licenses] = await pool.query(
      `SELECT id, name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price, 'license' AS type FROM license_items ORDER BY name ASC`
    );
    const catalog = [...products, ...labor, ...licenses];
    res.json(catalog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
