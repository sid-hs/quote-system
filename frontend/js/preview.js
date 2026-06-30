// === PREVIEW DATA HELPERS ===
function getCompanyData() {
  return {
    name: document.getElementById('companyName').value,
    rfc: document.getElementById('companyRFC').value,
    address: document.getElementById('companyAddress').value,
    phone: document.getElementById('companyPhone').value,
    email: document.getElementById('companyEmail').value,
    logo: document.getElementById('logoPreview').src || '',
    bankName: document.getElementById('bankName').value,
    bankAccount: document.getElementById('bankAccount').value
  };
}

function gatherDraftQuoteData() {
  const clientId = document.getElementById('clientSelect').value;
  const client = clients.find(c => c.id === parseInt(clientId));
  return {
    folio: 'BORRADOR',
    date: new Date().toISOString().split('T')[0],
    validityDays: document.getElementById('validityDays').value,
    paymentTerms: document.getElementById('paymentTerms').value,
    notes: document.getElementById('quoteNotes').value,
    clientName: client ? client.name : 'Cliente no seleccionado',
    contactName: document.getElementById('contactName').value,
    clientEmail: document.getElementById('clientEmail').value,
    clientPhone: document.getElementById('clientPhone').value,
    lines: {
      products: quoteLines.products,
      licenses: quoteLines.licenses,
      labor: quoteLines.labor,
      optionalProducts: quoteLines.optionalProducts || [],
      optionalLicenses: quoteLines.optionalLicenses || [],
      optionalLabor: quoteLines.optionalLabor || []
    },
    discountType: document.getElementById('discountType').value,
    discountValue: parseFloat(document.getElementById('discountValue').value) || 0,
    ivaEnabled: document.getElementById('ivaToggle').checked,
    company: getCompanyData(),
    downPaymentPct: parseFloat(document.getElementById('downPaymentPct').value) || 0,
    financingPct: parseFloat(document.getElementById('financingPct').value) || 0,
    creditDays: parseInt(document.getElementById('creditDays').value) || 0,
    optionalDiscountType: document.getElementById('optionalDiscountType').value,
    optionalDiscountValue: parseFloat(document.getElementById('optionalDiscountValue').value) || 0
  };
}

function quoteRecordToData(quote) {
  let lines = {};
  try { lines = typeof quote.lines === 'string' ? JSON.parse(quote.lines) : (quote.lines || {}); } catch { lines = {}; }
  const safeLines = {
    products: lines.products || [],
    licenses: lines.licenses || [],
    labor: lines.labor || [],
    optionalProducts: lines.optionalProducts || lines.optional || [],
    optionalLicenses: lines.optionalLicenses || [],
    optionalLabor: lines.optionalLabor || []
  };
  return {
    folio: quote.folio || 'N/A',
    date: quote.date || new Date().toISOString().split('T')[0],
    validityDays: quote.validity_days || '30',
    paymentTerms: quote.payment_terms || 'Contado',
    notes: quote.notes || '',
    clientName: quote.client_name || 'Cliente no especificado',
    contactName: quote.contact_name || '',
    clientEmail: quote.client_email || '',
    clientPhone: quote.client_phone || '',
    lines: safeLines,
    legacyAmount: parseFloat(quote.amount) || 0,
    legacyItems: quote.items_count || 0,
    discountType: quote.discount_type || 'none',
    discountValue: parseFloat(quote.discount_value) || 0,
    ivaEnabled: !!quote.iva_enabled,
    company: getCompanyData(),
    downPaymentPct: parseFloat(quote.down_payment_pct) || 0,
    financingPct: parseFloat(quote.financing_pct) || 0,
    creditDays: parseInt(quote.credit_days) || 0,
    optionalDiscountType: quote.optional_discount_type || 'none',
    optionalDiscountValue: parseFloat(quote.optional_discount_value) || 0
  };
}

function computeQuoteTotals(data) {
  if (!data.lines) {
    return { subProducts: 0, subLicenses: 0, subLabor: 0, subOptionalProducts: 0, subOptionalLicenses: 0, subOptionalLabor: 0, subOptional: 0, discountAmount: 0, ivaAmount: 0, ivaOptionalAmount: 0, grandTotal: data.legacyAmount, totalWithOptional: data.legacyAmount, hasOptional: false };
  }
  const subProducts = data.lines.products.reduce((sum, l) => sum + (l.total || 0), 0);
  const subLicenses = data.lines.licenses.reduce((sum, l) => sum + (l.total || 0), 0);
  const subLabor = data.lines.labor.reduce((sum, l) => sum + (l.total || 0), 0);
  let subtotal = subProducts + subLicenses + subLabor;

  let subOptionalProducts = (data.lines.optionalProducts || []).reduce((sum, l) => sum + (l.total || 0), 0);
  let subOptionalLicenses = (data.lines.optionalLicenses || []).reduce((sum, l) => sum + (l.total || 0), 0);
  let subOptionalLabor = (data.lines.optionalLabor || []).reduce((sum, l) => sum + (l.total || 0), 0);
  let subOptional = subOptionalProducts + subOptionalLicenses + subOptionalLabor;

  let discountAmount = 0;
  if (data.discountType === 'percent') discountAmount = subtotal * (data.discountValue / 100);
  else if (data.discountType === 'fixed') discountAmount = data.discountValue;
  subtotal -= discountAmount;

  let optDiscountAmount = 0;
  if (data.optionalDiscountType === 'percent') optDiscountAmount = subOptional * (data.optionalDiscountValue / 100);
  else if (data.optionalDiscountType === 'fixed') optDiscountAmount = data.optionalDiscountValue;
  subOptional -= optDiscountAmount;

  const ivaAmount = data.ivaEnabled ? subtotal * 0.16 : 0;
  const ivaOptionalAmount = data.ivaEnabled ? subOptional * 0.16 : 0;
  const grandTotal = subtotal + ivaAmount;
  const totalWithOptional = grandTotal + subOptional + ivaOptionalAmount;
  const hasOptional = [...(data.lines.optionalProducts || []), ...(data.lines.optionalLicenses || []), ...(data.lines.optionalLabor || [])].some(l => l.description);

  return { subProducts, subLicenses, subLabor, subOptionalProducts, subOptionalLicenses, subOptionalLabor, subOptional, discountAmount, optDiscountAmount, ivaAmount, ivaOptionalAmount, grandTotal, totalWithOptional, hasOptional };
}

function formatMoney(n) {
  return '$' + (n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

function renderQuotePreviewHTML(data, options) {
  options = options || {};
  let html = `
    <div style="border:2px solid #1a56db;border-radius:10px;padding:20px;margin-bottom:20px;">
      <div class="preview-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
        <div>
          <h2 style="font-size:28px;color:#1a56db;margin:0 0 6px 0;">COTIZACION</h2>
          <p style="color:#6b7280;font-size:14px;margin:2px 0;">Folio: ${data.folio || 'BORRADOR'}</p>
          <p style="color:#6b7280;font-size:14px;margin:2px 0;">Fecha: ${data.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX')}</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px;text-align:right;">
          <div>
            <h3 style="font-size:16px;color:#1f2937;margin:0 0 4px 0;">${data.company.name}</h3>
            <p style="font-size:12px;color:#6b7280;margin:1px 0;">${data.company.rfc}</p>
            <p style="font-size:12px;color:#6b7280;margin:1px 0;">${data.company.address}</p>
            <p style="font-size:12px;color:#6b7280;margin:1px 0;">${data.company.phone} | ${data.company.email}</p>
          </div>
          ${data.company && data.company.logo ? `<div class="preview-logo"><img src="${data.company.logo}" style="max-height:80px;max-width:140px;object-fit:contain;border:1px solid #e5e7eb;border-radius:6px;padding:4px;"></div>` : ''}
        </div>
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e5e7eb;">
        <h4 style="font-size:13px;color:#6b7280;margin:0 0 4px 0;">CLIENTE</h4>
        <p style="font-size:14px;font-weight:600;margin:0;">${data.clientName}</p>
        <p style="font-weight:400;font-size:13px;color:#6b7280;margin:2px 0 0 0;">
          ${data.contactName || ''} ${data.clientEmail ? '| ' + data.clientEmail : ''} ${data.clientPhone ? '| ' + data.clientPhone : ''}
        </p>
      </div>
    </div>
  `;

  if (!data.lines) {
    const legacyTotals = computeQuoteTotals(data);
    html += `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-size:13px;color:#6b7280;">Esta cotizacion no tiene el detalle de conceptos guardado. Conceptos: ${data.legacyItems || 0}.</p>
      </div>
      <div class="preview-totals">
        <div class="preview-totals-row grand"><span>TOTAL:</span><span>${formatMoney(legacyTotals.grandTotal)}</span></div>
      </div>
    `;
    if (options.forPdf) html = html.replace(/<i class="fas[^"]*"><\/i>\s*/g, '');
    return html;
  }

  html += `
    <table class="preview-table">
      <thead><tr><th style="width:40px;"></th><th>Concepto</th><th>Cantidad</th><th>Precio Unit.</th><th>Desc.</th><th>Total</th></tr></thead>
      <tbody>
  `;

  const lineRow = (line) => {
    const imgHtml = line.image ? `<img src="${line.image}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;">` : '';
    return `<tr><td style="vertical-align:middle;text-align:center;">${imgHtml}</td><td>${line.description}</td><td>${line.quantity}</td><td>$${line.price.toLocaleString()}</td><td>${line.discount > 0 ? line.discount + '%' : '-'}</td><td style="text-align:right;font-weight:600;">$${line.total.toLocaleString()}</td></tr>`;
  };

  if (data.lines.products.length > 0 && data.lines.products.some(l => l.description)) {
    html += `<tr><td colspan="6" class="section-header">Productos o Servicios</td></tr>`;
    data.lines.products.forEach(line => { if (line.description) html += lineRow(line); });
  }
  if (data.lines.licenses.length > 0 && data.lines.licenses.some(l => l.description)) {
    html += `<tr><td colspan="6" class="section-header">Licenciamientos Especiales</td></tr>`;
    data.lines.licenses.forEach(line => { if (line.description) html += lineRow(line); });
  }
  if (data.lines.labor.length > 0 && data.lines.labor.some(l => l.description)) {
    html += `<tr><td colspan="6" class="section-header">Mano de Obra</td></tr>`;
    data.lines.labor.forEach(line => { if (line.description) html += lineRow(line); });
  }
  html += `</tbody></table>`;

  const totals = computeQuoteTotals(data);
  const { subProducts, subLicenses, subLabor, subOptionalProducts, subOptionalLicenses, subOptionalLabor, subOptional, discountAmount, ivaAmount, ivaOptionalAmount, grandTotal, totalWithOptional, hasOptional } = totals;

  if (hasOptional) {
    html += `<table class="preview-table" style="margin-top:8px;"><tbody>`;
    if ((data.lines.optionalProducts || []).some(l => l.description)) {
      html += `<tr><td colspan="6" class="section-header section-header-optional">Equipos o Servicios Opcionales</td></tr>`;
      data.lines.optionalProducts.forEach(line => { if (line.description) html += lineRow(line); });
    }
    if ((data.lines.optionalLicenses || []).some(l => l.description)) {
      html += `<tr><td colspan="6" class="section-header section-header-optional">Licencias Opcionales</td></tr>`;
      data.lines.optionalLicenses.forEach(line => { if (line.description) html += lineRow(line); });
    }
    if ((data.lines.optionalLabor || []).some(l => l.description)) {
      html += `<tr><td colspan="6" class="section-header section-header-optional">Mano de Obra Opcional</td></tr>`;
      data.lines.optionalLabor.forEach(line => { if (line.description) html += lineRow(line); });
    }
    html += `</tbody></table>`;
    html += `<div class="preview-optional-note">Los equipos opcionales listados arriba NO forman parte del total principal de la cotizacion.</div>`;
  }

  html += `
    <div class="preview-totals">
      <div class="preview-totals-row"><span>Subtotal Productos/Servicios:</span><span>${formatMoney(subProducts)}</span></div>
      <div class="preview-totals-row"><span>Subtotal Licenciamientos:</span><span>${formatMoney(subLicenses)}</span></div>
      <div class="preview-totals-row"><span>Subtotal Mano de Obra:</span><span>${formatMoney(subLabor)}</span></div>
      ${discountAmount > 0 ? `<div class="preview-totals-row"><span>Descuento:</span><span>-${formatMoney(discountAmount)}</span></div>` : ''}
      ${data.ivaEnabled ? `<div class="preview-totals-row"><span>IVA (16%):</span><span>${formatMoney(ivaAmount)}</span></div>` : ''}
      <div class="preview-totals-row grand"><span>TOTAL:</span><span>${formatMoney(grandTotal)}</span></div>
    </div>
  `;

  if (hasOptional) {
    const totals = computeQuoteTotals(data);
    html += `
      <div class="preview-totals-optional">
        <div class="preview-totals-row"><span>Equipos o Servicios Opcionales:</span><span>${formatMoney(subOptionalProducts)}</span></div>
        <div class="preview-totals-row"><span>Licencias Opcionales:</span><span>${formatMoney(subOptionalLicenses)}</span></div>
        <div class="preview-totals-row"><span>Mano de Obra Opcional:</span><span>${formatMoney(subOptionalLabor)}</span></div>
        ${totals.optDiscountAmount > 0 ? `<div class="preview-totals-row"><span>Descuento Opcionales:</span><span>-${formatMoney(totals.optDiscountAmount)}</span></div>` : ''}
        ${data.ivaEnabled ? `<div class="preview-totals-row"><span>IVA Opcionales (16%):</span><span>${formatMoney(ivaOptionalAmount)}</span></div>` : ''}
        <div class="preview-totals-row grand"><span>SUMA TOTAL CON EQUIPOS OPCIONALES:</span><span>${formatMoney(totalWithOptional)}</span></div>
      </div>
    `;
  }

  const bank = data.company && data.company.bankName && data.company.bankAccount;
  if (bank) {
    html += `
    <div style="margin-top:16px;padding:12px 14px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
        <i class="fas fa-university" style="color:#4338ca;"></i>
        <span style="font-weight:600;color:#4338ca;">${data.company.bankName}</span>
        <span style="color:#6b7280;">|</span>
        <span style="font-weight:500;">Cuenta: ${data.company.bankAccount}</span>
      </div>
    </div>`;
  }

  const pct = data.downPaymentPct || 0;
  const fin = data.financingPct || 0;
  const cd = data.creditDays || 0;
  if (pct > 0 || fin > 0 || cd > 0) {
    html += `
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:12px;">
        <h4 style="font-size:14px;color:#166534;"><i class="fas fa-credit-card"></i> CONDICIONES DE PAGO</h4>
        <div style="display:grid;grid-template-columns:${hasOptional ? '1fr 1fr' : '1fr'};gap:12px;">`;

    const paymentTable = (label, baseTotal, isOptional) => {
      const dp = baseTotal * (pct / 100);
      const fa = baseTotal - dp;
      const fc = fa * (fin / 100);
      const twf = fa + fc;
      const bg = isOptional ? '#fff7ed' : '#f0fdf4';
      const border = isOptional ? '#fde68a' : '#bbf7d0';
      const color = isOptional ? '#92400e' : '#166534';
      return `
          <div style="padding:12px;background:${bg};border:1px solid ${border};border-radius:8px;">
            <div style="font-size:12px;font-weight:600;color:${color};margin-bottom:8px;">${label}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px;">
              <span>Total base:</span><span style="text-align:right;font-weight:600;">${formatMoney(baseTotal)}</span>
              ${pct > 0 ? `<span>Pago Inicial (${pct}%):</span><span style="text-align:right;font-weight:600;">${formatMoney(dp)}</span>` : ''}
              <span>Saldo a Financiar:</span><span style="text-align:right;">${formatMoney(fa)}</span>
              ${fin > 0 ? `<span>Cargo x Financiamiento (${fin}%):</span><span style="text-align:right;color:#dc2626;">${formatMoney(fc)}</span>` : ''}
              ${fin > 0 ? `<span style="border-top:2px solid #e5e7eb;padding-top:4px;font-weight:700;">Total c/Financiamiento:</span><span style="text-align:right;font-weight:700;color:#dc2626;border-top:2px solid #e5e7eb;padding-top:4px;">${formatMoney(twf)}</span>` : ''}
            </div>
          </div>`;
    };

    html += paymentTable('Sin Equipos Opcionales', grandTotal, false);
    if (hasOptional) html += paymentTable('Con Equipos Opcionales', totalWithOptional, true);

    html += `
        </div>
        ${cd > 0 ? `<div style="font-size:12px;color:#6b7280;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;"><i class="fas fa-clock"></i> Credito a ${cd} dias despues de entrega de equipos</div>` : ''}
      </div>`;
  }

  html += `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <h4 style="font-size:14px;color:#6b7280;margin-bottom:8px;">TERMINOS Y CONDICIONES</h4>
      <p style="font-size:12px;color:#6b7280;line-height:1.6;">
        ${data.notes || 'Precios sujetos a cambio sin previo aviso. Vigencia: ' + (data.validityDays || 30) + ' dias. Pago: ' + (data.paymentTerms || 'Contado') + '.'}
      </p>
    </div>
  `;

  if (options.forPdf) html = html.replace(/<i class="fas[^"]*"><\/i>\s*/g, '');
  return html;
}

// === PREVIEW MODAL ===
function openPreviewModal(data) {
  currentPreviewData = data;
  document.getElementById('previewBody').innerHTML = renderQuotePreviewHTML(data);
  document.getElementById('previewModal').classList.add('active');
}

function showPreview() {
  const data = gatherDraftQuoteData();
  openPreviewModal(data);
}

function closePreview() {
  document.getElementById('previewModal').classList.remove('active');
}

// === PRINT ===
function printIframeContent(htmlContent) {
  const iframe = document.getElementById('pdfIframe');
  iframe.classList.add('visible');
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  iframe.src = url;
  iframe.onload = function() {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { iframe.classList.remove('visible'); URL.revokeObjectURL(url); }, 1000);
      } catch (e) {
        console.error('Error al imprimir:', e);
        showToast('Error al imprimir', 'error');
        iframe.classList.remove('visible');
        URL.revokeObjectURL(url);
      }
    }, 500);
  };
}

function buildPrintHtml(data) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${data.folio || 'Cotizacion'}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: white; padding: 20px 30px; max-width: 100%; margin: 0; width: 100%; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.preview-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb; flex-wrap: wrap; gap: 12px; width: 100%; }
.preview-company { text-align: right; }
.preview-logo { flex-shrink:0; }
.preview-company h3 { font-size: 18px; color: #1a56db; margin: 0; }
.preview-company p { font-size: 12px; color: #6b7280; margin: 2px 0; }
.preview-client { margin-bottom: 20px; }
.preview-client h4 { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.preview-client p { font-size: 14px; font-weight: 600; }
.preview-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
.preview-table th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
.preview-table td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
.preview-table .section-header { background: #eff6ff; font-weight: 700; color: #1a56db; }
.preview-table .section-header-optional { background: #fff7ed; color: #d97706; }
.preview-totals { margin-top: 20px; border-top: 2px solid #e5e7eb; padding-top: 12px; }
.preview-totals-row { display: flex; justify-content: flex-end; gap: 30px; padding: 4px 0; font-size: 13px; flex-wrap: wrap; }
.preview-totals-row.grand { font-size: 18px; font-weight: 700; color: #1a56db; border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 10px; }
.preview-totals-optional { margin-top: 15px; border-top: 2px dashed #d97706; padding-top: 12px; background: #fffbeb; padding: 12px; border-radius: 6px; }
.preview-optional-note { font-size: 11px; color: #6b7280; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin: 6px 0 4px; }
.preview-totals-optional .preview-totals-row.grand { color: #d97706; border-top: 1px dashed #fcd34d; }
.terms-section { margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
.terms-section h4 { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
.terms-section p { font-size: 11px; color: #6b7280; line-height: 1.5; }
@media print { body { padding: 10px 15px; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .preview-table th { background: #f3f4f6 !important; } .preview-table .section-header { background: #eff6ff !important; } .preview-table .section-header-optional { background: #fff7ed !important; } }
</style></head><body>
${renderQuotePreviewHTML(data, { forPdf: true })}
</body></html>`;
}

function printQuote() {
  const clientId = document.getElementById('clientSelect').value;
  if (!clientId) { showToast('Selecciona un cliente primero', 'error'); return; }
  const data = gatherDraftQuoteData();
  printIframeContent(buildPrintHtml(data));
}

function printCurrentPreview() {
  if (!currentPreviewData) { showToast('No hay datos para imprimir', 'error'); return; }
  printIframeContent(buildPrintHtml(currentPreviewData));
}

async function printQuoteById(id) {
  try {
    const quote = await API.getQuote(id);
    if (!quote) { showToast('Cotizacion no encontrada', 'error'); return; }
    printIframeContent(buildPrintHtml(quoteRecordToData(quote)));
  } catch (error) {
    showToast('Error al cargar la cotizacion: ' + error.message, 'error');
  }
}

// === PDF GENERATION ===
function buildPdfHtml(data) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: white; padding: 20px 30px; max-width: 100%; margin: 0; width: 100%; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.preview-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb; flex-wrap: wrap; gap: 12px; width: 100%; }
.preview-company { text-align: right; }
.preview-logo { flex-shrink:0; }
.preview-company h3 { font-size: 18px; color: #1a56db; margin: 0; }
.preview-company p { font-size: 12px; color: #6b7280; margin: 2px 0; }
.preview-client { margin-bottom: 20px; }
.preview-client h4 { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.preview-client p { font-size: 14px; font-weight: 600; }
.preview-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
.preview-table th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
.preview-table td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
.preview-table .section-header { background: #eff6ff; font-weight: 700; color: #1a56db; }
.preview-table .section-header-optional { background: #fff7ed; color: #d97706; }
.preview-totals { margin-top: 20px; border-top: 2px solid #e5e7eb; padding-top: 12px; }
.preview-totals-row { display: flex; justify-content: flex-end; gap: 30px; padding: 4px 0; font-size: 13px; flex-wrap: wrap; }
.preview-totals-row.grand { font-size: 18px; font-weight: 700; color: #1a56db; border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 10px; }
.preview-totals-optional { margin-top: 15px; border-top: 2px dashed #d97706; padding-top: 12px; background: #fffbeb; padding: 12px; border-radius: 6px; }
.preview-optional-note { font-size: 11px; color: #6b7280; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin: 6px 0 4px; }
.preview-totals-optional .preview-totals-row.grand { color: #d97706; border-top: 1px dashed #fcd34d; }
.terms-section { margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
.terms-section h4 { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
.terms-section p { font-size: 11px; color: #6b7280; line-height: 1.5; }
</style></head><body>
${renderQuotePreviewHTML(data, { forPdf: true })}
</body></html>`;
}

async function generateAndDownloadPDF(data, folioForFilename) {
  if (isGeneratingPDF) { showToast('Ya se esta generando un PDF, espera por favor...', 'warning'); return; }
  if (typeof html2pdf === 'undefined') { showToast('No se pudo cargar el generador de PDF.', 'error'); return; }
  isGeneratingPDF = true;
  try {
    showToast('Generando PDF...', 'info');
    const overlay = document.getElementById('pdfExportOverlay');
    overlay.classList.add('active');
    const iframe = document.getElementById('pdfIframe');
    const htmlContent = buildPdfHtml(data);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    await new Promise((resolve) => {
      iframe.onload = () => setTimeout(resolve, 800);
      setTimeout(resolve, 3000);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const safeName = (folioForFilename || 'Cotizacion').toString().replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
    await html2pdf().set({
      margin: [8, 8, 8, 8],
      filename: safeName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: 1200, scrollX: 0, scrollY: 0, windowWidth: 1200 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
    }).from(iframeDoc.body).save();
    showToast('PDF descargado exitosamente', 'success');
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generando PDF:', error);
    showToast('Error al generar el PDF: ' + (error.message || 'Error desconocido'), 'error');
  } finally {
    document.getElementById('pdfExportOverlay').classList.remove('active');
    isGeneratingPDF = false;
  }
}

async function generatePDFBlob(data) {
  const overlay = document.getElementById('pdfExportOverlay');
  overlay.classList.add('active');
  try {
    const iframe = document.getElementById('pdfIframe');
    const htmlContent = buildPdfHtml(data);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    await new Promise((resolve) => {
      iframe.onload = () => setTimeout(resolve, 800);
      setTimeout(resolve, 3000);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const pdfBlob = await html2pdf().set({
      margin: [8, 8, 8, 8],
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: 1200 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(iframeDoc.body).outputPdf('blob');
    URL.revokeObjectURL(url);
    return pdfBlob;
  } finally {
    overlay.classList.remove('active');
  }
}

function downloadCurrentPreviewPDF() {
  if (!currentPreviewData) { showToast('No hay datos para generar el PDF', 'error'); return; }
  generateAndDownloadPDF(currentPreviewData, currentPreviewData.folio);
}

function downloadPDF() {
  const clientId = document.getElementById('clientSelect').value;
  if (!clientId) { showToast('Selecciona un cliente primero', 'error'); return; }
  const data = gatherDraftQuoteData();
  generateAndDownloadPDF(data, data.folio === 'BORRADOR' ? 'Cotizacion_Borrador' : data.folio);
}
