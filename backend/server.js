require('./config/dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');

const clientsRouter = require('./routes/clients');
const productsRouter = require('./routes/products');
const quotesRouter = require('./routes/quotes');
const ordersRouter = require('./routes/orders');
const settingsRouter = require('./routes/settings');
const catalogRouter = require('./routes/catalog');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/clients', clientsRouter);
app.use('/api/products', productsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/catalog', catalogRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

app.listen(PORT, () => {
  console.log(`QuotePro API running on port ${PORT}`);
});
