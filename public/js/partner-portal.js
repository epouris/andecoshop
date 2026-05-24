// Load api after DOM is ready; top-level await delayed registering DOMContentLoaded (listener never ran).
let api;

const VAT_RATE = 0.19;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatStandardEquipmentHtml(se) {
  if (!se) return '<p class="pp-muted">No standard equipment list in catalog.</p>';
  if (typeof se === 'string') {
    return `<div class="pp-std-text">${escapeHtml(se).replace(/\n/g, '<br>')}</div>`;
  }
  if (!Array.isArray(se)) return '';
  let html = '<div class="pp-std-groups">';
  se.forEach((item) => {
    if (typeof item === 'string') {
      html += `<p class="pp-std-line">• ${escapeHtml(item)}</p>`;
    } else if (item && item.header) {
      html += `<div class="pp-std-group"><h4>${escapeHtml(item.header)}</h4><ul>`;
      (item.items || []).forEach((line) => {
        html += `<li>${escapeHtml(line)}</li>`;
      });
      html += '</ul></div>';
    }
  });
  html += '</div>';
  return html;
}

function calculatePrice(product, selectedOptions) {
  let total = Number(product.price) || 0;
  const breakdown = [{ label: 'Base price', price: total }];

  (product.options || []).forEach((option) => {
    const name = option.name;
    const selected = selectedOptions[name];
    if (selected == null) return;

    if (option.type === 'checkbox' && Array.isArray(selected)) {
      selected.forEach((choiceLabel) => {
        const choice = (option.choices || []).find((c) => c.label === choiceLabel);
        if (choice) {
          total += Number(choice.price) || 0;
          breakdown.push({ label: `${name}: ${choiceLabel}`, price: Number(choice.price) || 0 });
        }
      });
    } else if (typeof selected === 'string') {
      const choice = (option.choices || []).find((c) => c.label === selected);
      if (choice) {
        total += Number(choice.price) || 0;
        breakdown.push({ label: `${name}: ${selected}`, price: Number(choice.price) || 0 });
      }
    }
  });

  return { total, breakdown };
}

function initSelectedOptions(product) {
  const selectedOptions = {};
  (product.options || []).forEach((option) => {
    if (option.required && option.choices && option.choices.length > 0) {
      if (option.type === 'radio') {
        selectedOptions[option.name] = option.choices[0].label;
      }
    }
  });
  return selectedOptions;
}

const state = {
  partner: null,
  products: [],
  currentProduct: null,
  selectedOptions: {},
  currentQuoteId: null,
  savedQuotes: [],
};

function formatCompanyLines(contactNotes) {
  if (!contactNotes) return '';
  return contactNotes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function buildPrintHeaderHtml(clientName, clientRef, dateStr) {
  const partner = state.partner || {};
  const company = partner.companyName || '';
  const logo = partner.logoUrl ? getProxiedUrl(partner.logoUrl) : '';
  const email = partner.email || '';
  const phone = partner.phone || '';
  const addressHtml = formatCompanyLines(partner.contactNotes || '');

  return `
    <header class="print-hdr">
      <div class="print-hdr-left">
        ${logo ? `<img src="${escapeAttr(logo)}" class="print-logo" alt="" />` : ''}
        <div class="print-hdr-company">
          ${company ? `<h2>${escapeHtml(company)}</h2>` : ''}
          ${addressHtml}
          ${email ? `<p>${escapeHtml(email)}</p>` : ''}
          ${phone ? `<p>${escapeHtml(phone)}</p>` : ''}
        </div>
      </div>
      <div class="print-hdr-doc">
        <h1>Configuration quote</h1>
        <p><strong>Date:</strong> ${escapeHtml(dateStr)}</p>
        ${clientRef ? `<p><strong>Reference:</strong> ${escapeHtml(clientRef)}</p>` : ''}
      </div>
    </header>
    ${clientName ? `<div class="print-client-box"><p><strong>Client:</strong> ${escapeHtml(clientName)}</p></div>` : ''}
  `;
}

function setSaveStatus(elId, message, isError = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('ok', !!message && !isError);
  el.classList.toggle('err', !!message && isError);
}

function updateEditingBadge() {
  const label = document.getElementById('editingQuoteLabel');
  const badge = document.getElementById('editingQuoteBadge');
  if (!label || !badge) return;
  if (state.currentQuoteId) {
    const quote = state.savedQuotes.find((q) => String(q.id) === String(state.currentQuoteId));
    const title =
      quote?.clientName ||
      document.getElementById('clientNameInput')?.value?.trim() ||
      quote?.clientRef ||
      document.getElementById('clientRefInput')?.value?.trim() ||
      quote?.productName ||
      `#${state.currentQuoteId}`;
    badge.textContent = title;
    label.hidden = false;
  } else {
    label.hidden = true;
    badge.textContent = '';
  }
}

function resetNewQuote() {
  state.currentQuoteId = null;
  document.getElementById('clientNameInput').value = '';
  document.getElementById('clientRefInput').value = '';
  setSaveStatus('quoteSaveStatus', '');
  updateEditingBadge();
}

async function loadQuoteIntoBuilder(quote) {
  const product = state.products.find((p) => String(p.id) === String(quote.productId));
  if (!product) {
    alert('This quote uses a model that is no longer assigned to your account.');
    return;
  }

  state.currentQuoteId = quote.id;
  document.getElementById('clientNameInput').value = quote.clientName || '';
  document.getElementById('clientRefInput').value = quote.clientRef || '';

  const select = document.getElementById('productSelect');
  select.value = String(product.id);
  state.currentProduct = product;
  state.selectedOptions = {
    ...initSelectedOptions(product),
    ...(quote.selectedOptions || {}),
  };
  renderConfigurator();
  updatePricingAndPrint();
  updateEditingBadge();
  switchTab('quote');
  setSaveStatus('quoteSaveStatus', 'Loaded saved quote — edit and save to update.');
}

function switchTab(tabName) {
  document.querySelectorAll('.pp-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.getElementById('quotePanel').hidden = tabName !== 'quote';
  document.getElementById('savedPanel').hidden = tabName !== 'saved';
  document.getElementById('settingsPanel').hidden = tabName !== 'settings';
  if (tabName === 'saved') {
    void loadSavedQuotes();
  }
  if (tabName === 'settings') {
    populateSettingsForm();
  }
}

function populateSettingsForm() {
  const partner = state.partner || {};
  document.getElementById('settingsCompanyName').value = partner.companyName || '';
  document.getElementById('settingsLogoUrl').value = partner.logoUrl || '';
  document.getElementById('settingsEmail').value = partner.email || '';
  document.getElementById('settingsPhone').value = partner.phone || '';
  document.getElementById('settingsContactNotes').value = partner.contactNotes || '';
  updateSettingsLogoPreview();
  setSaveStatus('settingsSaveStatus', '');
}

function updateSettingsLogoPreview() {
  const url = document.getElementById('settingsLogoUrl')?.value?.trim() || '';
  const preview = document.getElementById('settingsLogoPreview');
  const img = document.getElementById('settingsLogoImg');
  if (!preview || !img) return;
  if (url) {
    img.src = getProxiedUrl(url);
    preview.hidden = false;
  } else {
    img.removeAttribute('src');
    preview.hidden = true;
  }
}

async function loadSavedQuotes() {
  const list = document.getElementById('quotesList');
  if (!list) return;
  list.innerHTML = '<li class="pp-muted">Loading…</li>';
  try {
    state.savedQuotes = await api.getPartnerQuotes();
    if (!state.savedQuotes.length) {
      list.innerHTML = '<li class="pp-muted">No saved quotes yet. Build a configuration and click Save quote.</li>';
      return;
    }
    list.innerHTML = state.savedQuotes
      .map((quote) => {
        const title = quote.clientName || quote.clientRef || quote.productName || 'Untitled quote';
        const updated = quote.updatedAt ? new Date(quote.updatedAt).toLocaleString() : '';
        return `
          <li class="pp-quote-item" data-quote-id="${escapeAttr(quote.id)}">
            <div class="pp-quote-meta">
              <strong>${escapeHtml(title)}</strong>
              <span class="pp-muted">${escapeHtml(quote.productName || 'Model')} · ${escapeHtml(updated)}</span>
            </div>
            <div class="pp-quote-actions">
              <button type="button" class="btn btn-primary pp-open-quote" data-id="${escapeAttr(quote.id)}">Open</button>
              <button type="button" class="btn btn-secondary pp-delete-quote" data-id="${escapeAttr(quote.id)}">Delete</button>
            </div>
          </li>
        `;
      })
      .join('');

    list.querySelectorAll('.pp-open-quote').forEach((btn) => {
      btn.addEventListener('click', () => {
        const quote = state.savedQuotes.find((q) => String(q.id) === btn.dataset.id);
        if (quote) void loadQuoteIntoBuilder(quote);
      });
    });
    list.querySelectorAll('.pp-delete-quote').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this saved quote?')) return;
        try {
          await api.deletePartnerQuote(btn.dataset.id);
          if (String(state.currentQuoteId) === String(btn.dataset.id)) {
            resetNewQuote();
          }
          await loadSavedQuotes();
        } catch (e) {
          alert(e.message || 'Could not delete quote');
        }
      });
    });
  } catch (e) {
    list.innerHTML = `<li class="pp-muted">${escapeHtml(e.message || 'Could not load quotes')}</li>`;
  }
}

async function saveCurrentQuote() {
  const product = state.currentProduct;
  if (!product) {
    setSaveStatus('quoteSaveStatus', 'Select a model first.', true);
    return;
  }

  const payload = {
    clientName: document.getElementById('clientNameInput')?.value?.trim() || '',
    clientRef: document.getElementById('clientRefInput')?.value?.trim() || '',
    productId: product.id,
    productName: product.name,
    selectedOptions: state.selectedOptions,
  };

  try {
    if (state.currentQuoteId) {
      await api.updatePartnerQuote(state.currentQuoteId, payload);
      setSaveStatus('quoteSaveStatus', 'Quote updated.');
    } else {
      const created = await api.createPartnerQuote(payload);
      state.currentQuoteId = created.id;
      setSaveStatus('quoteSaveStatus', 'Quote saved.');
    }
    updateEditingBadge();
    state.savedQuotes = await api.getPartnerQuotes();
  } catch (e) {
    setSaveStatus('quoteSaveStatus', e.message || 'Could not save quote', true);
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const profile = {
    companyName: document.getElementById('settingsCompanyName').value.trim(),
    logoUrl: document.getElementById('settingsLogoUrl').value.trim(),
    email: document.getElementById('settingsEmail').value.trim(),
    phone: document.getElementById('settingsPhone').value.trim(),
    contactNotes: document.getElementById('settingsContactNotes').value.trim(),
  };
  try {
    state.partner = await api.updatePartnerProfile(profile);
    const userLabel = document.getElementById('partnerUserLabel');
    if (userLabel) {
      userLabel.textContent =
        state.partner.companyName || localStorage.getItem('partner_username') || 'Partner';
    }
    if (state.partner.companyName) {
      localStorage.setItem('partner_company_name', state.partner.companyName);
    }
    updatePricingAndPrint();
    setSaveStatus('settingsSaveStatus', 'Company details saved.');
  } catch (err) {
    setSaveStatus('settingsSaveStatus', err.message || 'Could not save settings', true);
  }
}

function getProxiedUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('/') || !url.startsWith('http')) return url;
  try {
    const u = new URL(url);
    if (u.origin === window.location.origin) return url;
  } catch (_) {
    return url;
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function renderConfigurator() {
  const area = document.getElementById('configuratorArea');
  const product = state.currentProduct;
  if (!area || !product) {
    if (area) area.innerHTML = '<p class="pp-muted">Select a model above.</p>';
    return;
  }

  const opts = state.selectedOptions;
  let optionsHtml = '';
  (product.options || []).forEach((option, idx) => {
    const req = option.required ? ' <span class="pp-req">*</span>' : '';
    optionsHtml += `<fieldset class="pp-fieldset" data-option-idx="${idx}"><legend>${escapeHtml(option.name)}${req}</legend>`;

    if (option.type === 'radio') {
      (option.choices || []).forEach((c, i) => {
        const id = `pp-opt-${idx}-${i}`;
        const checked = opts[option.name] === c.label ? 'checked' : '';
        const price = Number(c.price) || 0;
        const priceStr = price > 0 ? `+€${price.toFixed(2)}` : price < 0 ? `€${price.toFixed(2)}` : 'included';
        optionsHtml += `<label class="pp-choice" for="${id}"><input type="radio" name="pp-radio-${idx}" id="${id}" value="${escapeAttr(c.label)}" ${checked} /> <span>${escapeHtml(c.label)}</span> <span class="pp-price-tag">${priceStr}</span></label>`;
      });
    } else if (option.type === 'checkbox') {
      const arr = Array.isArray(opts[option.name]) ? opts[option.name] : [];
      (option.choices || []).forEach((c, i) => {
        const id = `pp-cb-${idx}-${i}`;
        const checked = arr.includes(c.label) ? 'checked' : '';
        const price = Number(c.price) || 0;
        const priceStr = price > 0 ? `+€${price.toFixed(2)}` : price < 0 ? `€${price.toFixed(2)}` : 'included';
        optionsHtml += `<label class="pp-choice" for="${id}"><input type="checkbox" id="${id}" data-opt-idx="${idx}" data-label="${escapeAttr(c.label)}" ${checked} /> <span>${escapeHtml(c.label)}</span> <span class="pp-price-tag">${priceStr}</span></label>`;
      });
    }
    optionsHtml += '</fieldset>';
  });

  const img = (product.images && product.images[0]) ? getProxiedUrl(product.images[0]) : '';

  area.innerHTML = `
    <div class="pp-product-head">
      ${img ? `<img class="pp-product-thumb" src="${escapeAttr(img)}" alt="" crossorigin="anonymous" />` : ''}
      <div>
        <h2 class="pp-product-title">${escapeHtml(product.name)}</h2>
        <p class="pp-muted">${escapeHtml(product.category || '')}</p>
      </div>
    </div>
    <section class="pp-section">
      <h3>Standard equipment</h3>
      ${formatStandardEquipmentHtml(product.standardEquipment)}
    </section>
    <section class="pp-section">
      <h3>Options</h3>
      ${optionsHtml || '<p class="pp-muted">No optional equipment in catalog for this product.</p>'}
    </section>
  `;

  area.querySelectorAll(`input[name^="pp-radio-"]`).forEach((input) => {
    input.addEventListener('change', () => {
      const fs = input.closest('.pp-fieldset');
      const idx = parseInt(fs.dataset.optionIdx, 10);
      const option = product.options[idx];
      if (option) {
        state.selectedOptions[option.name] = input.value;
        updatePricingAndPrint();
      }
    });
  });

  area.querySelectorAll('input[type="checkbox"][data-opt-idx]').forEach((input) => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.optIdx, 10);
      const option = product.options[idx];
      if (!option) return;
      const label = input.dataset.label;
      if (!state.selectedOptions[option.name]) {
        state.selectedOptions[option.name] = [];
      }
      let arr = Array.isArray(state.selectedOptions[option.name])
        ? [...state.selectedOptions[option.name]]
        : [];
      if (input.checked) {
        if (!arr.includes(label)) arr.push(label);
      } else {
        arr = arr.filter((x) => x !== label);
      }
      state.selectedOptions[option.name] = arr;
      updatePricingAndPrint();
    });
  });
}

function updatePricingAndPrint() {
  const product = state.currentProduct;
  const discount = Number(state.partner?.discountPercent) || 0;
  const totalsEl = document.getElementById('totalsPanel');
  const printEl = document.getElementById('printSheet');

  if (!product || !totalsEl) return;

  const { total, breakdown } = calculatePrice(product, state.selectedOptions);
  const netFactor = 1 - discount / 100;
  const partnerNet = total * netFactor;
  const margin = total - partnerNet;
  const inclVat = total * (1 + VAT_RATE);

  totalsEl.innerHTML = `
    <h3>Pricing (estimate)</h3>
    <div class="pp-tot-row"><span>List subtotal (excl. VAT)</span><strong>€${total.toFixed(2)}</strong></div>
    <div class="pp-tot-row pp-muted"><span>Approx. incl. ${Math.round(VAT_RATE * 100)}% VAT</span><span>€${inclVat.toFixed(2)}</span></div>
    <div class="pp-tot-row"><span>Your discount</span><span>${discount.toFixed(2)}%</span></div>
    <div class="pp-tot-row highlight"><span>Your net (excl. VAT)</span><strong>€${partnerNet.toFixed(2)}</strong></div>
    <div class="pp-tot-row success"><span>Est. margin if sold at list (excl. VAT)</span><strong>€${margin.toFixed(2)}</strong></div>
    <p class="pp-disclaimer">Indicative only — excludes delivery, commissioning, taxes in your country, and price changes. Not a binding offer from AndecoMarine.shop.</p>
  `;

  const clientName = document.getElementById('clientNameInput')?.value?.trim() || '';
  const clientRef = document.getElementById('clientRefInput')?.value?.trim() || '';
  const dateStr = new Date().toLocaleDateString();
  const company = state.partner?.companyName || '';

  const breakdownRows = breakdown
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.label)}</td><td class="num">€${Number(row.price).toFixed(2)}</td></tr>`
    )
    .join('');

  if (printEl) {
    printEl.innerHTML = `
      <div class="print-sheet-inner">
        ${buildPrintHeaderHtml(clientName, clientRef, dateStr)}
        <p><strong>Model:</strong> ${escapeHtml(product.name)}</p>
        <h3>Options selected</h3>
        <ul class="print-opts">${Object.keys(state.selectedOptions)
          .map((k) => {
            const v = state.selectedOptions[k];
            if (Array.isArray(v)) {
              return v.length ? `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v.join(', '))}</li>` : '';
            }
            return v ? `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>` : '';
          })
          .filter(Boolean)
          .join('')}</ul>
        <table class="print-table">
          <thead><tr><th>Item</th><th>€ excl. VAT</th></tr></thead>
          <tbody>${breakdownRows}</tbody>
        </table>
        <table class="print-table print-totals">
          <tr><td>List subtotal (excl. VAT)</td><td class="num">€${total.toFixed(2)}</td></tr>
          <tr><td>Discount (${discount.toFixed(2)}%)</td><td class="num">€${(total * (discount / 100)).toFixed(2)}</td></tr>
          <tr><td><strong>Your net (excl. VAT)</strong></td><td class="num"><strong>€${partnerNet.toFixed(2)}</strong></td></tr>
          <tr><td>Approx. incl. ${Math.round(VAT_RATE * 100)}% VAT (list)</td><td class="num">€${inclVat.toFixed(2)}</td></tr>
        </table>
        <p class="print-small">${escapeHtml(dateStr)} — ${escapeHtml(company || 'Partner')}</p>
        <p class="print-small">Indicative estimate only; not binding.</p>
      </div>
    `;
  }
}

async function loadCatalog() {
  const data = await api.getPartnerCatalog();
  state.partner = data.partner || {};
  state.products = data.products || [];

  try {
    state.savedQuotes = await api.getPartnerQuotes();
  } catch (_) {
    state.savedQuotes = [];
  }

  const userLabel = document.getElementById('partnerUserLabel');
  if (userLabel) {
    userLabel.textContent =
      state.partner.companyName || localStorage.getItem('partner_username') || 'Partner';
  }

  const select = document.getElementById('productSelect');
  if (!select) return;

  select.innerHTML =
    '<option value="">Choose a model…</option>' +
    state.products
      .map((p) => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.name)}</option>`)
      .join('');

  if (state.products.length === 0) {
    select.innerHTML = '<option value="">No models assigned</option>';
    select.onchange = null;
    document.getElementById('configuratorArea').innerHTML =
      '<p class="pp-muted">No products are assigned to your account yet. Ask AndecoMarine.shop to assign models in the admin Partners tab.</p>';
    document.getElementById('totalsPanel').innerHTML = '';
    return;
  }

  select.onchange = () => {
    const id = select.value;
    const product = state.products.find((p) => String(p.id) === String(id));
    state.currentProduct = product || null;
    state.selectedOptions = product ? initSelectedOptions(product) : {};
    renderConfigurator();
    updatePricingAndPrint();
  };
}

async function openApp() {
  document.getElementById('loginView').hidden = true;
  document.getElementById('appView').hidden = false;
  try {
    await loadCatalog();
    const select = document.getElementById('productSelect');
    if (select && select.options.length > 1 && !select.value) {
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change'));
    } else if (state.currentProduct) {
      renderConfigurator();
      updatePricingAndPrint();
    }
    updateEditingBadge();
  } catch (e) {
    console.error(e);
    alert(e.message || 'Could not load catalog');
    doLogout();
  }
}

function doLogout() {
  api.partnerLogout();
  document.getElementById('appView').hidden = true;
  document.getElementById('loginView').hidden = false;
  state.partner = null;
  state.products = [];
  state.currentProduct = null;
  state.selectedOptions = {};
  state.currentQuoteId = null;
  state.savedQuotes = [];
  switchTab('quote');
}

function wireUi() {
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('loginError');
    err.textContent = '';
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      await api.partnerLogin(username, password);
      await openApp();
    } catch (ex) {
      err.textContent = ex.message || 'Login failed';
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => doLogout());
  document.getElementById('printBtn')?.addEventListener('click', () => window.print());
  document.getElementById('saveQuoteBtn')?.addEventListener('click', () => {
    void saveCurrentQuote();
  });
  document.getElementById('newQuoteBtn')?.addEventListener('click', () => {
    resetNewQuote();
    const select = document.getElementById('productSelect');
    if (select && select.options.length > 1) {
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change'));
    }
  });

  document.querySelectorAll('.pp-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
    void saveSettings(e);
  });
  document.getElementById('settingsLogoUrl')?.addEventListener('input', updateSettingsLogoPreview);

  ['clientNameInput', 'clientRefInput'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updatePricingAndPrint());
  });
}

async function bootstrap() {
  const v =
    typeof window !== 'undefined' && window.__PARTNER_ASSET_V != null
      ? String(window.__PARTNER_ASSET_V)
      : String(Date.now());
  api = await import(`/js/api.js?v=${encodeURIComponent(v)}`);
  wireUi();
  if (api.isPartnerAuthenticated()) {
    await openApp();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void bootstrap();
  });
} else {
  void bootstrap();
}
