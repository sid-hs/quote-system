const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      folio, client_id, client_name, date, amount, status,
      items_count, lines, notes, discount_type, discount_value, iva_enabled
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO orders (folio, client_id, client_name, date, amount, status,
        items_count, \`lines\`, notes, discount_type, discount_value, iva_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [folio, client_id, client_name, date, amount, status || 'pendiente',
       items_count || 0, JSON.stringify(lines || {}), notes || '',
       discount_type || 'none', discount_value || 0, iva_enabled ? 1 : 0]
    );
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      folio, client_id, client_name, date, amount, status,
      items_count, lines, notes, discount_type, discount_value, iva_enabled
    } = req.body;

    await pool.query(
      `UPDATE orders SET folio = ?, client_id = ?, client_name = ?, date = ?,
        amount = ?, status = ?, items_count = ?, \`lines\` = ?,
        notes = ?, discount_type = ?, discount_value = ?, iva_enabled = ?
       WHERE id = ?`,
      [folio, client_id, client_name, date, amount, status, items_count,
       JSON.stringify(lines || {}), notes, discount_type, discount_value,
       iva_enabled ? 1 : 0, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Pedido eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
