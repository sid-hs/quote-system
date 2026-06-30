// === EMAILJS INTEGRATION ===

function buildItemsPlainText(data) {
  if (!data.lines) return 'Monto total: ' + formatMoney(data.legacyAmount || 0);
  const lines = [];
  const section = (title, arr) => {
    const filled = (arr || []).filter(l => l.description);
    if (filled.length === 0) return;
    lines.push('--- ' + title + ' ---');
    filled.forEach(l => lines.push(l.description + ' | Cant: ' + l.quantity + ' | Precio: ' + formatMoney(l.price) + ' | Total: ' + formatMoney(l.total)));
  };
  section('Productos o Servicios', data.lines.products);
  section('Licenciamientos Especiales', data.lines.licenses);
  section('Mano de Obra', data.lines.labor);
  if ((data.lines.optionalProducts || []).some(l => l.description)) section('Equipos o Servicios Opcionales', data.lines.optionalProducts);
  if ((data.lines.optionalLicenses || []).some(l => l.description)) section('Licencias Opcionales', data.lines.optionalLicenses);
  if ((data.lines.optionalLabor || []).some(l => l.description)) section('Mano de Obra Opcional', data.lines.optionalLabor);
  return lines.join('\n');
}

function buildEmailTemplateParams(data) {
  const totals = computeQuoteTotals(data);
  return {
    to_email: data.clientEmail,
    to_name: data.clientName,
    contact_name: data.contactName || data.clientName,
    from_name: data.company.name,
    reply_to: data.company.email,
    folio: data.folio,
    date: data.date,
    validity_days: data.validityDays,
    payment_terms: data.paymentTerms,
    items_text: buildItemsPlainText(data),
    subtotal_products: formatMoney(totals.subProducts),
    subtotal_licenses: formatMoney(totals.subLicenses),
    subtotal_labor: formatMoney(totals.subLabor),
    discount_amount: formatMoney(totals.discountAmount),
    iva_amount: formatMoney(totals.ivaAmount),
    total: formatMoney(totals.grandTotal),
    has_optional: totals.hasOptional ? 'si' : '',
    subtotal_optional_products: formatMoney(totals.subOptionalProducts),
    subtotal_optional_licenses: formatMoney(totals.subOptionalLicenses),
    subtotal_optional_labor: formatMoney(totals.subOptionalLabor),
    subtotal_optional: formatMoney(totals.subOptional),
    iva_optional_amount: formatMoney(totals.ivaOptionalAmount),
    total_with_optional: formatMoney(totals.totalWithOptional),
    notes: data.notes || '',
    company_name: data.company.name,
    company_phone: data.company.phone,
    company_email: data.company.email
  };
}

async function sendEmailWithPdfAttachment(data, templateParams) {
  const pdfBlob = await generatePDFBlob(data);
  const safeName = (data.folio || 'Cotizacion').toString().replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
  const pdfFile = new File([pdfBlob], safeName, { type: 'application/pdf' });

  const form = document.createElement('form');
  form.style.display = 'none';
  Object.keys(templateParams).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = templateParams[key] != null ? templateParams[key] : '';
    form.appendChild(input);
  });
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.name = emailConfig.attachmentField;
  const dt = new DataTransfer();
  dt.items.add(pdfFile);
  fileInput.files = dt.files;
  form.appendChild(fileInput);
  document.body.appendChild(form);

  try {
    return await emailjs.sendForm(emailConfig.serviceId, emailConfig.templateId, form);
  } finally {
    form.remove();
  }
}

async function sendQuoteEmail(data) {
  if (!data.clientEmail) { showToast('El cliente no tiene un correo electronico', 'error'); return; }
  if (typeof emailjs === 'undefined') { showToast('No se pudo cargar EmailJS.', 'error'); return; }
  if (!emailConfig.publicKey || !emailConfig.serviceId || !emailConfig.templateId) {
    showToast('Configura EmailJS en Configuracion primero', 'error');
    showTab('settings');
    return;
  }

  const templateParams = buildEmailTemplateParams(data);
  showToast('Enviando correo a ' + data.clientEmail + '...', 'info');

  try {
    if (emailConfig.attachPDF && emailConfig.attachmentField) {
      await sendEmailWithPdfAttachment(data, templateParams);
    } else {
      await emailjs.send(emailConfig.serviceId, emailConfig.templateId, templateParams);
    }
    showToast('Cotizacion enviada por correo a ' + data.clientEmail, 'success');
  } catch (error) {
    console.error('Error EmailJS:', error);
    const msg = (error && error.text) ? error.text : (error && error.message) ? error.message : 'Error desconocido';
    showToast('No se pudo enviar el correo: ' + msg, 'error');
  }
}

function sendQuote() {
  const clientId = document.getElementById('clientSelect').value;
  if (!clientId) { showToast('Selecciona un cliente primero', 'error'); return; }
  sendQuoteEmail(gatherDraftQuoteData());
}

async function sendSavedQuoteEmail(id) {
  try {
    const quote = await API.getQuote(id);
    if (!quote) { showToast('Cotizacion no encontrada', 'error'); return; }
    await sendQuoteEmail(quoteRecordToData(quote));
  } catch (error) {
    showToast('Error al enviar: ' + error.message, 'error');
  }
}

function sendTestEmail() {
  const testEmail = document.getElementById('companyEmail').value;
  if (!testEmail) { showToast('Captura un correo en Datos de la Empresa', 'error'); return; }
  const testData = {
    folio: 'COT-PRUEBA-001',
    date: new Date().toISOString().split('T')[0],
    validityDays: 30,
    paymentTerms: 'Contado',
    notes: 'Este es un correo de prueba.',
    clientName: 'Cliente de Prueba',
    contactName: 'Contacto de Prueba',
    clientEmail: testEmail,
    clientPhone: '',
    lines: {
      products: [{ id: 1, description: 'Producto de prueba', quantity: 1, price: 1000, discount: 0, total: 1000 }],
      licenses: [],
      labor: [],
      optionalProducts: [{ id: 2, description: 'Equipo opcional de prueba', quantity: 1, price: 500, discount: 0, total: 500 }],
      optionalLicenses: [],
      optionalLabor: []
    },
    discountType: 'none',
    discountValue: 0,
    ivaEnabled: true,
    company: getCompanyData()
  };
  sendQuoteEmail(testData);
}
