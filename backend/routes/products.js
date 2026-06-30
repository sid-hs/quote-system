const express = require('express');
const router = express.Router();
const pool = require('../config/db');

async function getAllItems(table) {
  const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY name ASC`);
  return rows;
}

router.get('/', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products ORDER BY name ASC');
    const [labor] = await pool.query('SELECT * FROM labor_items ORDER BY name ASC');
    const [licenses] = await pool.query('SELECT * FROM license_items ORDER BY name ASC');
    res.json({ products, labor, licenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price, type } = req.body;
    const table = type === 'labor' ? 'labor_items' : type === 'license' ? 'license_items' : 'products';
    const [result] = await pool.query(
      `INSERT INTO ${table} (name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category || 'General', cost || 0, price || 0, mayoreo_price || 0, distribuidor_price || 0, promo_price || 0]
    );
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price, type } = req.body;
    const table = type === 'labor' ? 'labor_items' : type === 'license' ? 'license_items' : 'products';
    await pool.query(
      `UPDATE ${table} SET name = ?, sku = ?, category = ?, cost = ?, price = ?, mayoreo_price = ?, distribuidor_price = ?, promo_price = ? WHERE id = ?`,
      [name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price, req.params.id]
    );
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { type } = req.query;
    const table = type === 'labor' ? 'labor_items' : type === 'license' ? 'license_items' : 'products';
    await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
