const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cotizacion no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      folio, client_id, client_name, contact_name, client_email, client_phone,
      date, validity, validity_days, payment_terms, amount, status,
      items_count, lines, notes, discount_type, discount_value, iva_enabled,
      down_payment_pct, financing_pct, credit_days
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO quotes (folio, client_id, client_name, contact_name, client_email, client_phone,
        date, validity, validity_days, payment_terms, amount, status, items_count,
        \`lines\`, notes, discount_type, discount_value, iva_enabled,
        down_payment_pct, financing_pct, credit_days,
        optional_discount_type, optional_discount_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [folio, client_id, client_name, contact_name || '', client_email || '', client_phone || '',
       date, validity, validity_days || 30, payment_terms || 'Contado',
       amount, status || 'enviada', items_count || 0,
       JSON.stringify(lines), notes || '', discount_type || 'none', discount_value || 0,
       iva_enabled ? 1 : 0,
       down_payment_pct || 0, financing_pct || 0, credit_days || 0,
       req.body.optional_discount_type || 'none', req.body.optional_discount_value || 0]
    );
    const [rows] = await pool.query('SELECT * FROM quotes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      folio, client_id, client_name, contact_name, client_email, client_phone,
      date, validity, validity_days, payment_terms, amount, status,
      items_count, lines, notes, discount_type, discount_value, iva_enabled,
      down_payment_pct, financing_pct, credit_days
    } = req.body;

    await pool.query(
      `UPDATE quotes SET folio = ?, client_id = ?, client_name = ?, contact_name = ?,
        client_email = ?, client_phone = ?, date = ?, validity = ?, validity_days = ?,
        payment_terms = ?, amount = ?, status = ?, items_count = ?,
        \`lines\` = ?, notes = ?, discount_type = ?, discount_value = ?, iva_enabled = ?,
        down_payment_pct = ?, financing_pct = ?, credit_days = ?,
        optional_discount_type = ?, optional_discount_value = ?
       WHERE id = ?`,
      [folio, client_id, client_name, contact_name, client_email, client_phone,
       date, validity, validity_days, payment_terms, amount, status, items_count,
       JSON.stringify(lines), notes, discount_type, discount_value, iva_enabled ? 1 : 0,
       down_payment_pct || 0, financing_pct || 0, credit_days || 0,
       req.body.optional_discount_type || 'none', req.body.optional_discount_value || 0,
       req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM quotes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cotizacion eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
