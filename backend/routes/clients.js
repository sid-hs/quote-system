const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, contact, email, phone, rfc, credit_limit } = req.body;
    const [result] = await pool.query(
      'INSERT INTO clients (name, contact, email, phone, rfc, credit_limit) VALUES (?, ?, ?, ?, ?, ?)',
      [name, contact || '', email || '', phone || '', rfc || '', credit_limit || 50000]
    );
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, contact, email, phone, rfc, balance, credit_limit, status } = req.body;
    await pool.query(
      'UPDATE clients SET name = ?, contact = ?, email = ?, phone = ?, rfc = ?, balance = ?, credit_limit = ?, status = ? WHERE id = ?',
      [name, contact, email, phone, rfc, balance || 0, credit_limit || 0, status || 'Activo', req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
