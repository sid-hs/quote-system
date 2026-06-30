const API = {
  base: '/api',

  async request(method, path, data) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(this.base + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error de red');
    }
    return res.json();
  },

  get(path) { return this.request('GET', path); },
  post(path, data) { return this.request('POST', path, data); },
  put(path, data) { return this.request('PUT', path, data); },
  del(path) { return this.request('DELETE', path); },

  // Clients
  getClients() { return this.get('/clients'); },
  getClient(id) { return this.get(`/clients/${id}`); },
  createClient(data) { return this.post('/clients', data); },
  updateClient(id, data) { return this.put(`/clients/${id}`, data); },
  deleteClient(id) { return this.del(`/clients/${id}`); },

  // Products (includes labor & licenses)
  getProducts() { return this.get('/products'); },
  createProduct(data) { return this.post('/products', data); },
  updateProduct(id, data) { return this.put(`/products/${id}`, data); },
  deleteProduct(id, type) { return this.del(`/products/${id}?type=${type || 'product'}`); },

  // Quotes
  getQuotes() { return this.get('/quotes'); },
  getQuote(id) { return this.get(`/quotes/${id}`); },
  createQuote(data) { return this.post('/quotes', data); },
  updateQuote(id, data) { return this.put(`/quotes/${id}`, data); },
  deleteQuote(id) { return this.del(`/quotes/${id}`); },

  // Orders
  getOrders() { return this.get('/orders'); },
  getOrder(id) { return this.get(`/orders/${id}`); },
  createOrder(data) { return this.post('/orders', data); },
  updateOrder(id, data) { return this.put(`/orders/${id}`, data); },
  deleteOrder(id) { return this.del(`/orders/${id}`); },

  // Catalog
  getCatalog() { return this.get('/catalog'); },

  // Settings
  getSettings() { return this.get('/settings'); },
  saveSettings(data) { return this.put('/settings', data); },
};
