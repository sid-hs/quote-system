let clients = [];
let products = [];
let laborItems = [];
let licenseItems = [];
let quotes = [];
let orders = [];
let currentPriceList = 'general';
let quoteLines = { products: [], licenses: [], labor: [], optionalProducts: [], optionalLicenses: [], optionalLabor: [] };
let nextLineId = 1;
let editingQuoteId = null;
let emailConfig = { publicKey: '', serviceId: '', templateId: '', attachmentField: '', attachPDF: false };
let isGeneratingPDF = false;
let currentIframeData = null;
let currentPreviewData = null;

async function loadAllData() {
  try {
    const [c, p, q, o, s] = await Promise.all([
      API.getClients(),
      API.getProducts(),
      API.getQuotes(),
      API.getOrders(),
      API.getSettings().catch(() => ({}))
    ]);
    clients = c;
    products = p.products || [];
    laborItems = p.labor || [];
    licenseItems = p.licenses || [];
    quotes = q;
    orders = o;

    applySettings(s);

    populateClientSelect();
    renderAll();
    addInitialLines();
    showToast('Sistema cargado con MariaDB', 'success');
  } catch (error) {
    console.error('Error de inicializacion:', error);
    showToast('Error al conectar con la base de datos: ' + error.message, 'error');
  }
}

function applySettings(s) {
  if (s.companyName) document.getElementById('companyName').value = s.companyName;
  if (s.companyRFC) document.getElementById('companyRFC').value = s.companyRFC;
  if (s.companyAddress) document.getElementById('companyAddress').value = s.companyAddress;
  if (s.companyPhone) document.getElementById('companyPhone').value = s.companyPhone;
  if (s.companyEmail) document.getElementById('companyEmail').value = s.companyEmail;
  if (s.companyWeb) document.getElementById('companyWeb').value = s.companyWeb;
  if (s.bankName) document.getElementById('bankName').value = s.bankName;
  if (s.bankAccount) document.getElementById('bankAccount').value = s.bankAccount;

  if (s.companyLogo) {
    const preview = document.getElementById('logoPreview');
    preview.src = s.companyLogo;
    preview.style.display = 'block';
    document.getElementById('logoPreviewContainer').style.display = 'block';
  }

  const ek = s.emailConfig || {};
  emailConfig = { publicKey: '', serviceId: '', templateId: '', attachmentField: '', attachPDF: false, ...ek };
  document.getElementById('emailjsPublicKey').value = emailConfig.publicKey || '';
  document.getElementById('emailjsServiceId').value = emailConfig.serviceId || '';
  document.getElementById('emailjsTemplateId').value = emailConfig.templateId || '';
  document.getElementById('emailjsAttachmentField').value = emailConfig.attachmentField || '';
  document.getElementById('emailjsAttachPDF').checked = !!emailConfig.attachPDF;
  document.getElementById('emailjsAttachmentFieldGroup').style.display = emailConfig.attachPDF ? 'block' : 'none';
  if (typeof emailjs !== 'undefined' && emailConfig.publicKey) {
    try { emailjs.init({ publicKey: emailConfig.publicKey }); } catch (e) { console.error(e); }
  }
  updateEmailjsStatusBadge();
}

function renderAll() {
  renderRecentQuotes();
  renderAllQuotes();
  renderAllOrders();
  renderRecentOrders();
  renderClients();
  renderProducts();
  updateDashboardStats();
  updateOrderStats();
}

function addInitialLines() {
  addLineItem('products');
  addLineItem('licenses');
  addLineItem('labor');
  addLineItem('optionalProducts');
  addLineItem('optionalLicenses');
  addLineItem('optionalLabor');
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  const navItems = document.querySelectorAll('.nav-item');
  const tabMap = { dashboard: 0, 'new-quote': 1, quotes: 2, orders: 3, clients: 4, products: 5, settings: 6 };
  if (tabMap[tabId] !== undefined && navItems[tabMap[tabId]]) {
    navItems[tabMap[tabId]].classList.add('active');
  }
}

// === DASHBOARD ===
function updateDashboardStats() {
  const totalQuotes = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'aceptada' || q.status === 'pedido').length;
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
  const totalSales = quotes.filter(q => q.status === 'aceptada' || q.status === 'pedido').reduce((sum, q) => sum + parseFloat(q.amount), 0);
  const activeClients = clients.filter(c => c.status === 'Activo').length;
  document.getElementById('statQuotes').textContent = totalQuotes;
  document.getElementById('statConversion').textContent = conversionRate + '%';
  document.getElementById('statSales').textContent = '$' + totalSales.toLocaleString();
  document.getElementById('statClients').textContent = activeClients;
}

function updateOrderStats() {
  const total = orders.length;
  const pending = orders.filter(o => o.status === 'pendiente').length;
  const processing = orders.filter(o => o.status === 'en-proceso').length;
  const completed = orders.filter(o => o.status === 'completado').length;
  document.getElementById('statTotalOrders').textContent = total;
  document.getElementById('statPendingOrders').textContent = pending;
  document.getElementById('statProcessingOrders').textContent = processing;
  document.getElementById('statCompletedOrders').textContent = completed;
}

// === CLIENTS ===
function populateClientSelect() {
  const select = document.getElementById('clientSelect');
  select.innerHTML = '<option value="">Seleccionar cliente...</option>';
  clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function onClientChange() {
  const id = parseInt(document.getElementById('clientSelect').value);
  const client = clients.find(c => c.id === id);
  if (client) {
    document.getElementById('contactName').value = client.contact || '';
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientPhone').value = client.phone || '';
  }
}

function renderClients() {
  const container = document.getElementById('clientsList');
  if (clients.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><h3>No hay clientes registrados</h3><p>Haz clic en "Nuevo Cliente" para agregar uno.</p></div>`;
    return;
  }
  container.innerHTML = clients.map(c => `
    <div class="client-card" onclick="selectClient(${c.id})">
      <div class="client-avatar">${(c.name || 'NA').split(' ').map(w => w[0]).join('').substring(0,2)}</div>
      <div class="client-info">
        <h4>${c.name}</h4>
        <p>${c.rfc || 'Sin RFC'} - ${c.phone || 'Sin telefono'}</p>
        <p style="margin-top:4px;">
          <span class="status-badge status-${c.status === 'Activo' ? 'aceptada' : c.status === 'Alerta' ? 'vista' : 'rechazada'}">${c.status}</span>
          <span style="margin-left:8px;font-size:12px;color:var(--text-light);">Recurrencia: ${c.recurrency || 'N/A'}</span>
        </p>
      </div>
      <div class="client-meta">
        <div class="balance">$${(c.balance || 0).toLocaleString()}</div>
        <div class="limit">Limite: $${(c.credit_limit || 0).toLocaleString()}</div>
      </div>
    </div>
  `).join('');
}

function filterClients(query) {
  document.querySelectorAll('.client-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(query.toLowerCase()) ? 'flex' : 'none';
  });
}

function selectClient(id) {
  document.getElementById('clientSelect').value = id;
  onClientChange();
  showTab('new-quote');
}

// === CLIENT MODAL ===
function openClientModal() { document.getElementById('clientModal').classList.add('active'); }
function closeClientModal() { document.getElementById('clientModal').classList.remove('active'); }

async function saveNewClient() {
  const name = document.getElementById('newClientName').value.trim();
  if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
  const data = {
    name,
    rfc: document.getElementById('newClientRFC').value,
    contact: document.getElementById('newClientContact').value,
    email: document.getElementById('newClientEmail').value,
    phone: document.getElementById('newClientPhone').value,
    credit_limit: parseFloat(document.getElementById('newClientLimit').value) || 50000,
  };
  try {
    const client = await API.createClient(data);
    clients.push(client);
    populateClientSelect();
    renderClients();
    closeClientModal();
    showToast('Cliente guardado exitosamente', 'success');
    updateDashboardStats();
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientRFC').value = '';
    document.getElementById('newClientContact').value = '';
    document.getElementById('newClientEmail').value = '';
    document.getElementById('newClientPhone').value = '';
    document.getElementById('newClientLimit').value = '50000';
  } catch (error) {
    showToast('Error al guardar cliente: ' + error.message, 'error');
  }
}

// === PRODUCTS ===
function renderProducts() {
  const container = document.getElementById('productsGrid');
  const allItems = [...products, ...licenseItems, ...laborItems];
  if (allItems.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-box"></i><h3>No hay productos registrados</h3><p>Haz clic en "Nuevo Producto" para agregar uno.</p></div>`;
    return;
  }
  container.innerHTML = allItems.map(p => `
    <div class="product-card" onclick="addProductToQuote(${p.id}, '${p.sku}')">
      <h4>${p.name}</h4>
      <div class="sku">${p.sku}</div>
      <div class="price">$${getPrice(p).toLocaleString()}</div>
    </div>
  `).join('');
}

function getPrice(item) {
  switch(currentPriceList) {
    case 'mayoreo': return item.mayoreo_price || item.price;
    case 'distribuidor': return item.distribuidor_price || item.price;
    case 'promo': return item.promo_price || item.price;
    default: return item.price;
  }
}

function filterProducts(query) {
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(query.toLowerCase()) ? 'block' : 'none';
  });
}

function setPriceList(el, list) {
  document.querySelectorAll('.price-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentPriceList = list;
  const descs = {
    general: 'Precios de lista estandar con margen de utilidad del 40%',
    mayoreo: 'Precios especiales para compras al mayoreo (minimo 5 unidades)',
    distribuidor: 'Precios para distribuidores autorizados',
    promo: 'Precios promocionales vigentes hasta fin de mes'
  };
  document.getElementById('priceListDesc').textContent = descs[list];
  renderProducts();
  Object.keys(quoteLines).forEach(section => {
    quoteLines[section].forEach(line => {
      const item = findItemById(line.productId);
      if (item) { line.price = getPrice(item); updateLineTotal(line.id); }
    });
  });
  calculateTotals();
}

function findItemById(id) {
  return [...products, ...licenseItems, ...laborItems].find(p => p.id === id);
}

function findItemBySku(sku) {
  return [...products, ...licenseItems, ...laborItems].find(p => p.sku === sku);
}

// === PRODUCT MODAL ===
function openProductModal() { document.getElementById('productModal').classList.add('active'); }
function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }

async function saveNewProduct() {
  const name = document.getElementById('newProductName').value.trim();
  const sku = document.getElementById('newProductSKU').value.trim();
  if (!name || !sku) { showToast('Nombre y SKU son obligatorios', 'error'); return; }
  const data = {
    name, sku,
    category: document.getElementById('newProductCategory').value || 'General',
    cost: parseFloat(document.getElementById('newProductCost').value) || 0,
    price: parseFloat(document.getElementById('newProductPrice').value) || 0,
    mayoreo_price: parseFloat(document.getElementById('newProductMayoreo').value) || 0,
    distribuidor_price: parseFloat(document.getElementById('newProductDistribuidor').value) || 0,
    promo_price: parseFloat(document.getElementById('newProductPromo').value) || 0,
  };
  try {
    const product = await API.createProduct(data);
    products.push(product);
    renderProducts();
    closeProductModal();
    showToast('Producto guardado exitosamente', 'success');
    ['newProductName','newProductSKU','newProductCategory','newProductCost','newProductPrice','newProductMayoreo','newProductDistribuidor','newProductPromo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = (id.includes('Cost') || id.includes('Price') || id.includes('Mayoreo') || id.includes('Distribuidor') || id.includes('Promo')) ? '0' : '';
    });
  } catch (error) {
    showToast('Error al guardar producto: ' + error.message, 'error');
  }
}

// === QUOTE LINES ===
function addLineItem(section) {
  if (!quoteLines[section]) quoteLines[section] = [];
  const line = { id: nextLineId++, productId: null, description: '', quantity: 1, price: 0, discount: 0, total: 0 };
  quoteLines[section].push(line);
  renderLineItem(section, line);
}

function renderLineItem(section, line) {
  const container = document.getElementById(section + 'Lines');
  const div = document.createElement('div');
  div.className = 'line-item animate-in';
  div.id = `line-${line.id}`;
  const hasImg = line.image ? 'flex' : 'none';
  div.innerHTML = `
    <div class="line-item-main">
      <input type="text" placeholder="Descripcion del concepto" value="${line.description}" onchange="updateLine(${line.id}, 'description', this.value)">
      <input type="number" placeholder="Cantidad" value="${line.quantity}" min="1" step="1" onchange="updateLine(${line.id}, 'quantity', this.value)">
      <input type="number" placeholder="Precio Unit." value="${line.price}" min="0" step="0.01" onchange="updateLine(${line.id}, 'price', this.value)">
      <input type="number" placeholder="Desc.%" value="${line.discount}" min="0" max="100" step="0.01" onchange="updateLine(${line.id}, 'discount', this.value)">
      <div class="item-total" id="total-${line.id}">$0.00</div>
      <div class="item-actions">
        <label class="img-upload-btn" title="Agregar imagen" style="cursor:pointer;">
          <i class="fas fa-image"></i>
          <input type="file" accept="image/*" style="display:none;" onchange="handleLineImage(${line.id}, this)">
        </label>
        <div class="remove-item" onclick="removeLineItem(${line.id}, '${section}')"><i class="fas fa-trash-alt"></i></div>
      </div>
    </div>
    <div class="line-item-thumb" id="thumb-${line.id}" style="display:${hasImg};">
      ${line.image ? `<img src="${line.image}" onerror="this.parentElement.style.display='none'" onclick="removeLineImage(${line.id})"><i class="fas fa-times-circle" onclick="removeLineImage(${line.id})"></i>` : ''}
    </div>
  `;
  container.appendChild(div);
}

function addProductToQuote(id, sku) {
  const item = findItemBySku(sku);
  if (!item) return;
  let section = 'products';
  if (licenseItems.find(l => l.id === id)) section = 'licenses';
  if (laborItems.find(l => l.id === id)) section = 'labor';
  const exists = quoteLines[section] && quoteLines[section].some(l => l.productId === id && l.description === item.name);
  if (exists) { showToast('Este producto ya esta agregado a la cotizacion', 'warning'); return; }
  const line = { id: nextLineId++, productId: id, description: item.name, quantity: 1, price: getPrice(item), discount: 0, total: getPrice(item) };
  quoteLines[section].push(line);
  renderLineItem(section, line);
  updateLineTotal(line.id);
  calculateTotals();
  showToast('Producto agregado a la cotizacion', 'success');
}

function updateLine(lineId, field, value) {
  for (const section in quoteLines) {
    const line = quoteLines[section].find(l => l.id === lineId);
    if (line) {
      line[field] = field === 'description' ? value : parseFloat(value) || 0;
      if (field === 'quantity' && line.quantity < 1) line.quantity = 1;
      if (field === 'price' && line.price < 0) line.price = 0;
      updateLineTotal(lineId);
      calculateTotals();
      break;
    }
  }
}

function updateLineTotal(lineId) {
  for (const section in quoteLines) {
    const line = quoteLines[section].find(l => l.id === lineId);
    if (line) {
      const subtotal = line.quantity * line.price;
      const discountAmount = subtotal * (line.discount / 100);
      line.total = subtotal - discountAmount;
      const el = document.getElementById(`total-${lineId}`);
      if (el) el.textContent = '$' + line.total.toLocaleString('es-MX', {minimumFractionDigits: 2});
      break;
    }
  }
}

function removeLineItem(lineId, section) {
  if (!quoteLines[section]) quoteLines[section] = [];
  quoteLines[section] = quoteLines[section].filter(l => l.id !== lineId);
  const el = document.getElementById(`line-${lineId}`);
  if (el) el.remove();
  calculateTotals();
}

function handleLineImage(lineId, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    for (const section in quoteLines) {
      const line = quoteLines[section].find(l => l.id === lineId);
      if (line) {
        line.image = e.target.result;
        const thumb = document.getElementById(`thumb-${lineId}`);
        if (thumb) {
          thumb.innerHTML = `<img src="${line.image}" onclick="removeLineImage(${lineId})"><i class="fas fa-times-circle" onclick="removeLineImage(${lineId})"></i>`;
          thumb.style.display = 'flex';
        }
        break;
      }
    }
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function removeLineImage(lineId) {
  for (const section in quoteLines) {
    const line = quoteLines[section].find(l => l.id === lineId);
    if (line) {
      delete line.image;
      const thumb = document.getElementById(`thumb-${lineId}`);
      if (thumb) { thumb.style.display = 'none'; thumb.innerHTML = ''; }
      break;
    }
  }
}

function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('logoPreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('logoPreviewContainer').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function calculateTotals() {
  let subProducts = quoteLines.products.reduce((sum, l) => sum + l.total, 0);
  let subLicenses = quoteLines.licenses.reduce((sum, l) => sum + l.total, 0);
  let subLabor = quoteLines.labor.reduce((sum, l) => sum + l.total, 0);
  let subtotal = subProducts + subLicenses + subLabor;

  let subOptionalProducts = (quoteLines.optionalProducts || []).reduce((sum, l) => sum + l.total, 0);
  let subOptionalLicenses = (quoteLines.optionalLicenses || []).reduce((sum, l) => sum + l.total, 0);
  let subOptionalLabor = (quoteLines.optionalLabor || []).reduce((sum, l) => sum + l.total, 0);
  let subOptional = subOptionalProducts + subOptionalLicenses + subOptionalLabor;

  const discountType = document.getElementById('discountType').value;
  const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
  let discountAmount = 0;
  if (discountType === 'percent') discountAmount = subtotal * (discountValue / 100);
  else if (discountType === 'fixed') discountAmount = discountValue;
  subtotal -= discountAmount;

  const optDiscType = document.getElementById('optionalDiscountType').value;
  const optDiscValue = parseFloat(document.getElementById('optionalDiscountValue').value) || 0;
  let optDiscountAmount = 0;
  if (optDiscType === 'percent') optDiscountAmount = subOptional * (optDiscValue / 100);
  else if (optDiscType === 'fixed') optDiscountAmount = optDiscValue;
  subOptional -= optDiscountAmount;

  const ivaEnabled = document.getElementById('ivaToggle').checked;
  let ivaAmount = 0, ivaOptionalAmount = 0;
  if (ivaEnabled) {
    ivaAmount = subtotal * 0.16;
    ivaOptionalAmount = subOptional * 0.16;
    document.getElementById('ivaRow').style.display = 'flex';
    document.getElementById('ivaOptionalRow').style.display = 'flex';
  } else {
    document.getElementById('ivaRow').style.display = 'none';
    document.getElementById('ivaOptionalRow').style.display = 'none';
  }

  const grandTotal = subtotal + ivaAmount;
  const totalWithOptional = grandTotal + subOptional + ivaOptionalAmount;

  const fmt = (n) => '$' + n.toLocaleString('es-MX', {minimumFractionDigits: 2});

  document.getElementById('subtotalProducts').textContent = fmt(subProducts);
  document.getElementById('subtotalLicenses').textContent = fmt(subLicenses);
  document.getElementById('subtotalLabor').textContent = fmt(subLabor);
  document.getElementById('subtotalOptionalProducts').textContent = fmt(subOptionalProducts);
  document.getElementById('subtotalOptionalLicenses').textContent = fmt(subOptionalLicenses);
  document.getElementById('subtotalOptionalLabor').textContent = fmt(subOptionalLabor);
  document.getElementById('summaryProducts').textContent = fmt(subProducts);
  document.getElementById('summaryLicenses').textContent = fmt(subLicenses);
  document.getElementById('summaryLabor').textContent = fmt(subLabor);
  document.getElementById('ivaAmount').textContent = fmt(ivaAmount);
  document.getElementById('grandTotal').textContent = fmt(grandTotal);
  document.getElementById('summaryOptionalProducts').textContent = fmt(subOptionalProducts);
  document.getElementById('summaryOptionalLicenses').textContent = fmt(subOptionalLicenses);
  document.getElementById('summaryOptionalLabor').textContent = fmt(subOptionalLabor);
  document.getElementById('ivaOptionalAmount').textContent = fmt(ivaOptionalAmount);
  document.getElementById('totalWithOptional').textContent = fmt(totalWithOptional);
}

// === QUOTES ===
function renderRecentQuotes() {
  const tbody = document.getElementById('recentQuotesTable');
  const recent = quotes.slice(-5).reverse();
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No hay cotizaciones registradas</td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(q => `
    <tr>
      <td><strong>${q.folio}</strong></td>
      <td>${q.client_name}</td>
      <td>${q.date}</td>
      <td>$${parseFloat(q.amount).toLocaleString()}</td>
      <td><span class="status-badge status-${q.status}">${q.status.charAt(0).toUpperCase() + q.status.slice(1)}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewQuote(${q.id})" title="Ver cotizacion"><i class="fas fa-eye"></i></button>
        <button class="btn btn-sm btn-outline" onclick="editQuote(${q.id})" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline" onclick="downloadQuotePDF(${q.id})" title="Descargar PDF"><i class="fas fa-file-pdf"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersTable');
  const recent = orders.slice(-5).reverse();
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No hay pedidos registrados</td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><strong>${o.folio}</strong></td>
      <td>${o.client_name}</td>
      <td>${o.date}</td>
      <td>$${parseFloat(o.amount).toLocaleString()}</td>
      <td><span class="status-badge status-${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
      <td><button class="btn btn-sm btn-outline" onclick="viewOrderDetail(${o.id})" title="Ver detalle"><i class="fas fa-eye"></i></button></td>
    </tr>
  `).join('');
}

function renderAllQuotes() {
  const tbody = document.getElementById('allQuotesTable');
  if (quotes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-light);">No hay cotizaciones registradas</td></tr>`;
    return;
  }
  tbody.innerHTML = quotes.map(q => `
    <tr>
      <td><strong>${q.folio}</strong></td>
      <td>${q.client_name}</td>
      <td>${q.date}</td>
      <td>${q.validity || ''}</td>
      <td>$${parseFloat(q.amount).toLocaleString()}</td>
      <td><span class="status-badge status-${q.status}">${q.status.charAt(0).toUpperCase() + q.status.slice(1)}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewQuote(${q.id})" title="Ver cotizacion"><i class="fas fa-eye"></i></button>
        <button class="btn btn-sm btn-outline" onclick="editQuote(${q.id})" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline" onclick="downloadQuotePDF(${q.id})" title="Descargar PDF"><i class="fas fa-file-pdf"></i></button>
        <button class="btn btn-sm btn-outline" onclick="sendSavedQuoteEmail(${q.id})" title="Enviar por correo"><i class="fas fa-paper-plane"></i></button>
        <button class="btn btn-sm btn-outline" onclick="duplicateQuote(${q.id})" title="Duplicar"><i class="fas fa-copy"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteQuoteById(${q.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function filterQuotes(query) {
  document.querySelectorAll('#allQuotesTable tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
  });
}

async function viewQuote(id) {
  try {
    const quote = await API.getQuote(id);
    if (!quote) { showToast('Cotizacion no encontrada', 'error'); return; }
    const data = quoteRecordToData(quote);
    openPreviewModal(data);
  } catch (error) {
    showToast('Error al cargar la cotizacion: ' + error.message, 'error');
  }
}

function restoreLineItem(section, line) {
  if (!quoteLines[section]) quoteLines[section] = [];
  const restored = { ...line, id: nextLineId++ };
  quoteLines[section].push(restored);
  renderLineItem(section, restored);
  updateLineTotal(restored.id);
}

function resetQuoteForm() {
  editingQuoteId = null;
  document.getElementById('saveQuoteBtn').innerHTML = '<i class="fas fa-save"></i> Guardar Cotizacion';
  quoteLines = { products: [], licenses: [], labor: [], optionalProducts: [], optionalLicenses: [], optionalLabor: [] };
  document.querySelectorAll('[id$="Lines"]').forEach(el => el.innerHTML = '');
  document.getElementById('clientSelect').value = '';
  document.getElementById('contactName').value = '';
  document.getElementById('clientEmail').value = '';
  document.getElementById('clientPhone').value = '';
  document.getElementById('validityDays').value = '30';
  document.getElementById('paymentTerms').value = 'Contado';
  document.getElementById('quoteNotes').value = '';
  document.getElementById('discountType').value = 'none';
  document.getElementById('discountValue').value = '0';
  document.getElementById('ivaToggle').checked = false;
  document.getElementById('downPaymentPct').value = '0';
  document.getElementById('financingPct').value = '0';
  document.getElementById('creditDays').value = '0';
  document.getElementById('paymentSummary').style.display = 'none';
  addInitialLines();
  calculateTotals();
}

async function editQuote(id) {
  try {
    const quote = await API.getQuote(id);
    if (!quote) { showToast('Cotizacion no encontrada', 'error'); return; }

    document.getElementById('saveQuoteBtn').innerHTML = '<i class="fas fa-save"></i> Actualizar Cotizacion';

    document.querySelectorAll('[id$="Lines"]').forEach(el => el.innerHTML = '');
    quoteLines = { products: [], licenses: [], labor: [], optionalProducts: [], optionalLicenses: [], optionalLabor: [] };

    const clientSelect = document.getElementById('clientSelect');
    clientSelect.value = quote.client_id;
    onClientChange();

    document.getElementById('contactName').value = quote.contact_name || '';
    document.getElementById('clientEmail').value = quote.client_email || '';
    document.getElementById('clientPhone').value = quote.client_phone || '';
    document.getElementById('validityDays').value = quote.validity_days || '30';
    document.getElementById('paymentTerms').value = quote.payment_terms || 'Contado';
    document.getElementById('quoteNotes').value = quote.notes || '';
    document.getElementById('discountType').value = quote.discount_type || 'none';
    document.getElementById('discountValue').value = quote.discount_value || '0';
    document.getElementById('ivaToggle').checked = !!quote.iva_enabled;
    document.getElementById('downPaymentPct').value = quote.down_payment_pct || '0';
    document.getElementById('financingPct').value = quote.financing_pct || '0';
    document.getElementById('creditDays').value = quote.credit_days || '0';
    document.getElementById('optionalDiscountType').value = quote.optional_discount_type || 'none';
    document.getElementById('optionalDiscountValue').value = quote.optional_discount_value || '0';

    let lines = {};
    try { lines = typeof quote.lines === 'string' ? JSON.parse(quote.lines) : (quote.lines || {}); } catch { lines = {}; }

    ['products','licenses','labor','optionalProducts','optionalLicenses','optionalLabor'].forEach(section => {
      (lines[section] || []).forEach(line => restoreLineItem(section, line));
    });

    editingQuoteId = quote.id;
    calculateTotals();
    calculatePaymentInfo();

    showToast('Cotizacion cargada para edicion: ' + quote.folio, 'info');
    showTab('new-quote');
  } catch (error) {
    showToast('Error al cargar cotizacion: ' + error.message, 'error');
  }
}

async function duplicateQuote(id) {
  try {
    const original = await API.getQuote(id);
    if (!original) { showToast('Cotizacion no encontrada', 'error'); return; }
    const clone = JSON.parse(JSON.stringify(original));
    delete clone.id;
    const folioNum = quotes.length + 1;
    clone.folio = 'COT-2026-' + String(folioNum).padStart(3, '0');
    clone.date = new Date().toISOString().split('T')[0];
    const vd = parseInt(clone.validity_days) || 30;
    clone.validity = new Date(Date.now() + vd * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    clone.status = 'enviada';
    const saved = await API.createQuote(clone);
    saved.id = saved.id;
    quotes.push(saved);
    renderRecentQuotes();
    renderAllQuotes();
    updateDashboardStats();
    showToast('Cotizacion duplicada como ' + saved.folio, 'success');
  } catch (error) {
    showToast('Error al duplicar la cotizacion: ' + error.message, 'error');
  }
}

async function downloadQuotePDF(id) {
  try {
    const quote = await API.getQuote(id);
    if (!quote) { showToast('Cotizacion no encontrada', 'error'); return; }
    const data = quoteRecordToData(quote);
    generateAndDownloadPDF(data, quote.folio);
  } catch (error) {
    showToast('Error al generar el PDF: ' + error.message, 'error');
  }
}

async function deleteQuoteById(id) {
  if (!confirm('Eliminar esta cotizacion?')) return;
  try {
    await API.deleteQuote(id);
    quotes = quotes.filter(q => q.id !== id);
    renderRecentQuotes();
    renderAllQuotes();
    updateDashboardStats();
    showToast('Cotizacion eliminada', 'success');
  } catch (error) {
    showToast('Error al eliminar', 'error');
  }
}

// === ORDERS ===
function renderAllOrders() {
  const tbody = document.getElementById('allOrdersTable');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-light);">No hay pedidos registrados</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.folio}</strong></td>
      <td>${o.client_name}</td>
      <td>${o.date}</td>
      <td>$${parseFloat(o.amount).toLocaleString()}</td>
      <td><span class="status-badge status-${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewOrderDetail(${o.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
        <button class="btn btn-sm btn-outline" onclick="updateOrderStatus(${o.id})" title="Cambiar estado"><i class="fas fa-sync"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteOrderById(${o.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function filterOrders(query) {
  document.querySelectorAll('#allOrdersTable tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
  });
}

async function viewOrderDetail(id) {
  try {
    const order = await API.getOrder(id);
    if (!order) { showToast('Pedido no encontrado', 'error'); return; }
    const modal = document.getElementById('orderDetailModal');
    const body = document.getElementById('orderDetailBody');
    const statusMap = { pendiente: 'Pendiente', aprobado: 'Aprobado', 'en-proceso': 'En Proceso', completado: 'Completado', cancelado: 'Cancelado' };
    body.innerHTML = `
      <div style="margin-bottom:16px;">
        <p><strong>Folio:</strong> ${order.folio}</p>
        <p><strong>Cliente:</strong> ${order.client_name}</p>
        <p><strong>Fecha:</strong> ${order.date}</p>
        <p><strong>Estado:</strong> <span class="status-badge status-${order.status}">${statusMap[order.status] || order.status}</span></p>
        <p><strong>Monto:</strong> $${parseFloat(order.amount).toLocaleString()}</p>
        ${order.notes ? '<p><strong>Notas:</strong> ' + order.notes + '</p>' : ''}
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px;">
        <h4 style="margin-bottom:8px;">Conceptos</h4>
        ${order.items_count ? '<p>Cantidad de conceptos: ' + order.items_count + '</p>' : '<p style="color:var(--text-light);">No hay detalles disponibles</p>'}
      </div>
    `;
    modal.classList.add('active');
  } catch (error) {
    showToast('Error al cargar el pedido: ' + error.message, 'error');
  }
}

function closeOrderDetail() { document.getElementById('orderDetailModal').classList.remove('active'); }

async function updateOrderStatus(id) {
  const statuses = ['pendiente', 'aprobado', 'en-proceso', 'completado', 'cancelado'];
  const labels = ['Pendiente', 'Aprobado', 'En Proceso', 'Completado', 'Cancelado'];
  const current = orders.find(o => o.id === id);
  if (!current) { showToast('Pedido no encontrado', 'error'); return; }
  const ci = statuses.indexOf(current.status);
  const ni = (ci + 1) % statuses.length;
  if (!confirm(`Cambiar estado de ${current.folio} de "${labels[ci]}" a "${labels[ni]}"?`)) return;
  try {
    const updated = await API.updateOrder(id, { ...current, status: statuses[ni] });
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) orders[idx] = updated;
    renderAllOrders();
    renderRecentOrders();
    updateOrderStats();
    showToast('Estado actualizado a ' + labels[ni], 'success');
  } catch (error) {
    showToast('Error al actualizar estado: ' + error.message, 'error');
  }
}

async function deleteOrderById(id) {
  if (!confirm('Eliminar este pedido?')) return;
  try {
    await API.deleteOrder(id);
    orders = orders.filter(o => o.id !== id);
    renderAllOrders();
    renderRecentOrders();
    updateOrderStats();
    showToast('Pedido eliminado', 'success');
  } catch (error) {
    showToast('Error al eliminar', 'error');
  }
}

// === CONVERT TO ORDER ===
function convertToOrder() {
  const clientId = document.getElementById('clientSelect').value;
  if (!clientId) { showToast('Selecciona un cliente primero', 'error'); return; }
  const hasItems = Object.values(quoteLines).some(arr => arr && arr.length > 0 && arr.some(l => l.description));
  if (!hasItems) { showToast('Agrega al menos un concepto a la cotizacion', 'error'); return; }
  const orderNum = orders.length + 1;
  document.getElementById('orderFolio').value = 'PED-2026-' + String(orderNum).padStart(3, '0');
  document.getElementById('orderNotes').value = '';
  document.getElementById('convertOrderModal').classList.add('active');
}

function closeConvertOrderModal() { document.getElementById('convertOrderModal').classList.remove('active'); }

async function confirmConvertToOrder() {
  const clientId = document.getElementById('clientSelect').value;
  const client = clients.find(c => c.id === parseInt(clientId));
  const folio = document.getElementById('orderFolio').value;
  const status = document.getElementById('orderStatus').value;
  const notes = document.getElementById('orderNotes').value;

  let total = ['products','licenses','labor'].reduce((sum, s) => sum + quoteLines[s].reduce((a, l) => a + l.total, 0), 0);
  const discountType = document.getElementById('discountType').value;
  const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
  if (discountType === 'percent') total -= total * (discountValue / 100);
  else if (discountType === 'fixed') total -= discountValue;
  if (document.getElementById('ivaToggle').checked) total *= 1.16;
  const totalItems = quoteLines.products.length + quoteLines.licenses.length + quoteLines.labor.length;

  const orderData = {
    folio, client_id: parseInt(clientId), client_name: client ? client.name : 'Cliente',
    date: new Date().toISOString().split('T')[0], amount: Math.round(total),
    status, items_count: totalItems, notes,
    lines: JSON.parse(JSON.stringify(quoteLines)),
    discount_type: discountType, discount_value: discountValue,
    iva_enabled: document.getElementById('ivaToggle').checked ? 1 : 0
  };

  try {
    const saved = await API.createOrder(orderData);
    orders.push(saved);
    closeConvertOrderModal();
    renderAllOrders();
    renderRecentOrders();
    updateOrderStats();
    showToast('Pedido creado exitosamente: ' + folio, 'success');
  } catch (error) {
    showToast('Error al crear el pedido: ' + error.message, 'error');
  }
}

// === PAYMENT / FINANCING ===
function calculatePaymentInfo() {
  const downPct = parseFloat(document.getElementById('downPaymentPct').value) || 0;
  const finPct = parseFloat(document.getElementById('financingPct').value) || 0;
  const credDays = parseInt(document.getElementById('creditDays').value) || 0;

  let sub = ['products','licenses','labor'].reduce((sum, s) => sum + quoteLines[s].reduce((a, l) => a + l.total, 0), 0);
  let subOpt = ['optionalProducts','optionalLicenses','optionalLabor'].reduce((sum, s) => sum + (quoteLines[s] || []).reduce((a, l) => a + l.total, 0), 0);
  const discountType = document.getElementById('discountType').value;
  const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
  if (discountType === 'percent') sub -= sub * (discountValue / 100);
  else if (discountType === 'fixed') sub -= discountValue;
  const optDiscType = document.getElementById('optionalDiscountType').value;
  const optDiscValue = parseFloat(document.getElementById('optionalDiscountValue').value) || 0;
  if (optDiscType === 'percent') subOpt -= subOpt * (optDiscValue / 100);
  else if (optDiscType === 'fixed') subOpt -= optDiscValue;
  const ivaEnabled = document.getElementById('ivaToggle').checked;
  const iva = ivaEnabled ? sub * 0.16 : 0;
  const ivaOpt = ivaEnabled ? subOpt * 0.16 : 0;
  const total = sub + iva + subOpt + ivaOpt;

  const summary = document.getElementById('paymentSummary');
  const hasPayment = (downPct > 0 || finPct > 0 || credDays > 0);

  if (!hasPayment) {
    summary.style.display = 'none';
    return;
  }
  summary.style.display = 'block';

  const downPayment = total * (downPct / 100);
  const financedAmount = total - downPayment;
  const financingCharge = financedAmount * (finPct / 100);
  const totalWithFinancing = financedAmount + financingCharge;

  const fmt = (n) => '$' + n.toLocaleString('es-MX', {minimumFractionDigits: 2});
  document.getElementById('paySubtotal').textContent = fmt(sub);
  document.getElementById('payOptional').textContent = fmt(subOpt);
  document.getElementById('payIva').textContent = fmt(iva);
  document.getElementById('payTotalBase').textContent = fmt(total);
  document.getElementById('payDownPayment').textContent = fmt(downPayment);
  document.getElementById('payFinancedAmount').textContent = fmt(financedAmount);
  document.getElementById('payFinancingCharge').textContent = fmt(financingCharge);
  document.getElementById('payTotalWithFinancing').textContent = fmt(totalWithFinancing);

  const infoParts = [];
  if (downPct > 0) infoParts.push('Anticipo de ' + downPct + '% (' + fmt(downPayment) + ')');
  if (finPct > 0) infoParts.push('Incremento por financiamiento de ' + finPct + '%');
  if (credDays > 0) infoParts.push('Credito a ' + credDays + ' dias despues de entrega');
  document.getElementById('payCreditInfo').textContent = infoParts.join(' | ');
}

// === SAVE QUOTE ===
async function saveQuote() {
  const clientId = document.getElementById('clientSelect').value;
  if (!clientId) { showToast('Selecciona un cliente primero', 'error'); return; }
  const client = clients.find(c => c.id === parseInt(clientId));

  let total = ['products','licenses','labor'].reduce((sum, s) => sum + quoteLines[s].reduce((a, l) => a + l.total, 0), 0);
  const discountType = document.getElementById('discountType').value;
  const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
  if (discountType === 'percent') total -= total * (discountValue / 100);
  else if (discountType === 'fixed') total -= discountValue;
  const ivaEnabled = document.getElementById('ivaToggle').checked;
  if (ivaEnabled) total *= 1.16;

  const validityDays = document.getElementById('validityDays').value;

  const quoteData = {
    client_id: parseInt(clientId), client_name: client.name,
    date: new Date().toISOString().split('T')[0],
    validity: new Date(Date.now() + (parseInt(validityDays) || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    validity_days: validityDays,
    amount: Math.round(total), status: 'enviada',
    items_count: quoteLines.products.length + quoteLines.licenses.length + quoteLines.labor.length,
    lines: JSON.parse(JSON.stringify(quoteLines)),
    notes: document.getElementById('quoteNotes').value,
    contact_name: document.getElementById('contactName').value,
    client_email: document.getElementById('clientEmail').value,
    client_phone: document.getElementById('clientPhone').value,
    payment_terms: document.getElementById('paymentTerms').value,
    discount_type: discountType, discount_value: discountValue,
    iva_enabled: ivaEnabled ? 1 : 0,
    down_payment_pct: parseFloat(document.getElementById('downPaymentPct').value) || 0,
    financing_pct: parseFloat(document.getElementById('financingPct').value) || 0,
    credit_days: parseInt(document.getElementById('creditDays').value) || 0,
    optional_discount_type: document.getElementById('optionalDiscountType').value,
    optional_discount_value: parseFloat(document.getElementById('optionalDiscountValue').value) || 0
  };

  try {
    if (editingQuoteId) {
      quoteData.folio = quotes.find(q => q.id === editingQuoteId)?.folio || 'COT-2026-001';
      const updated = await API.updateQuote(editingQuoteId, quoteData);
      const idx = quotes.findIndex(q => q.id === editingQuoteId);
      if (idx !== -1) quotes[idx] = updated;
      editingQuoteId = null;
      document.getElementById('saveQuoteBtn').innerHTML = '<i class="fas fa-save"></i> Guardar Cotizacion';
      showToast('Cotizacion actualizada: ' + updated.folio, 'success');
    } else {
      const folioNum = quotes.length + 1;
      quoteData.folio = 'COT-2026-' + String(folioNum).padStart(3, '0');
      const saved = await API.createQuote(quoteData);
      quotes.push(saved);
      showToast('Cotizacion guardada: ' + saved.folio, 'success');
    }
    renderRecentQuotes();
    renderAllQuotes();
    updateDashboardStats();
  } catch (error) {
    showToast('Error al guardar cotizacion: ' + error.message, 'error');
  }
}

// === SETTINGS ===
function updateEmailjsStatusBadge() {
  const badge = document.getElementById('emailjsStatusBadge');
  if (!badge) return;
  if (emailConfig.publicKey && emailConfig.serviceId && emailConfig.templateId) {
    badge.textContent = 'Configurado';
    badge.className = 'status-badge status-aceptada';
  } else {
    badge.textContent = 'Sin configurar';
    badge.className = 'status-badge status-rechazada';
  }
}

async function saveSettingsHandler() {
  const company = {
    companyName: document.getElementById('companyName').value,
    companyRFC: document.getElementById('companyRFC').value,
    companyAddress: document.getElementById('companyAddress').value,
    companyPhone: document.getElementById('companyPhone').value,
    companyEmail: document.getElementById('companyEmail').value,
    companyWeb: document.getElementById('companyWeb').value,
    companyLogo: (document.getElementById('logoPreview').src || '').startsWith('data:') ? document.getElementById('logoPreview').src : '',
    bankName: document.getElementById('bankName').value,
    bankAccount: document.getElementById('bankAccount').value,
  };
  emailConfig = {
    publicKey: document.getElementById('emailjsPublicKey').value.trim(),
    serviceId: document.getElementById('emailjsServiceId').value.trim(),
    templateId: document.getElementById('emailjsTemplateId').value.trim(),
    attachmentField: document.getElementById('emailjsAttachmentField').value.trim(),
    attachPDF: document.getElementById('emailjsAttachPDF').checked
  };
  try {
    await API.saveSettings({ ...company, emailConfig });
    if (typeof emailjs !== 'undefined' && emailConfig.publicKey) {
      try { emailjs.init({ publicKey: emailConfig.publicKey }); } catch (e) { console.error(e); }
    }
    updateEmailjsStatusBadge();
    showToast('Configuracion guardada exitosamente', 'success');
  } catch (error) {
    showToast('Error al guardar: ' + error.message, 'error');
  }
}

async function resetDatabaseHandler() {
  if (!confirm('ADVERTENCIA: Esto eliminara TODOS los datos. Continuar?')) return;
  try {
    await Promise.all([
      ...clients.map(c => API.deleteClient(c.id)),
      ...products.map(p => API.deleteProduct(p.id, 'product')),
      ...quotes.map(q => API.deleteQuote(q.id)),
      ...orders.map(o => API.deleteOrder(o.id))
    ]);
    clients = []; products = []; laborItems = []; licenseItems = []; quotes = []; orders = [];
    renderAll();
    showToast('Base de datos reseteada. Recargando...', 'info');
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    showToast('Error al resetear: ' + error.message, 'error');
  }
}

// === TOAST ===
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  toast.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// === INIT ===
document.addEventListener('DOMContentLoaded', loadAllData);
