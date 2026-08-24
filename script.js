const SUPA_URL = window.__SUPABASE_ENV__?.SUPA_URL || '';
const SUPA_KEY = window.__SUPABASE_ENV__?.SUPA_KEY || '';
const supabaseClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);

const CACHE_KEYS = {
  produce: 'osv_cache_produce_v1',
  gallery: 'osv_cache_gallery_v1',
  banks: 'osv_cache_banks_v1'
};

const CACHE_TTL_MS = {
  produce: 60 * 1000,
  gallery: 5 * 60 * 1000,
  banks: 10 * 60 * 1000
};

const state = {
  produce: [],
  bankAccounts: [],
  gallery: [],
  selectedProduceId: null,
  bankAccountsLoaded: false,
  galleryLoaded: false,
  galleryRequested: false,
  activeOrderNowAccount: null,
  activeOrderNowAccountLoaded: false,
  activeOrderNowAccountLocation: null,
  activeOrderNowAccountPromise: null,
  isInitialLoading: true,
  isProduceLoading: false,
  isBankAccountsLoading: false
};

let productGrid = null;
let availabilityTable = null;
let galleryGrid = null;
let gallerySection = null;
let produceAvailabilityTimer = null;
const initialRenderComplete = { produce: false, gallery: false };
let orderForm = null;
let orderFormStatus = null;
let produceSelect = null;
let kgsSuppliedInput = null;
let unitPriceInput = null;
let paymentOptionSelect = null;
let paymentOptionRadios = [];
let paymentOptionLabels = [];
let paymentHelpText = null;
let bankFields = null;
let bankSelect = null;
let bankDetailsPreview = null;
let bankDetailsPreviewBody = null;
let locationInput = null;
let pinLocationButton = null;
let contactFormCard = null;
let contactModalBackdrop = null;
let contactModalCloseButton = null;
let themeToggle = null;
let mobileNavToggle = null;
let mobileNavDrawer = null;
let mobileNavBackdrop = null;
let mobileNavClose = null;
let globalLoader = null;

// ============================================================
// Global Loader Control
// ============================================================

function showLoader() {
  if (!globalLoader) {
    globalLoader = document.getElementById('globalLoader');
  }
  if (globalLoader) {
    globalLoader.hidden = false;
    globalLoader.setAttribute('aria-hidden', 'false');
  }
}

function hideLoader() {
  if (!globalLoader) {
    globalLoader = document.getElementById('globalLoader');
  }
  if (globalLoader) {
    globalLoader.hidden = true;
    globalLoader.setAttribute('aria-hidden', 'true');
  }
}

function setLoaderVisible(isVisible) {
  if (isVisible) {
    showLoader();
  } else {
    hideLoader();
  }
}

function refreshDomBindings() {
  productGrid = document.getElementById('productGrid');
  availabilityTable = document.getElementById('availabilityTable');
  galleryGrid = document.getElementById('galleryGrid');
  gallerySection = document.getElementById('gallery');
  orderForm = document.getElementById('orderInquiryForm');
  orderFormStatus = document.getElementById('orderFormStatus');
  produceSelect = document.getElementById('produceSelect');
  kgsSuppliedInput = document.getElementById('kgsSupplied');
  unitPriceInput = document.getElementById('unitPrice');
  paymentOptionSelect = document.getElementById('paymentOption');
  paymentOptionRadios = Array.from(document.querySelectorAll('input[name="paymentOption"]'));
  paymentOptionLabels = Array.from(document.querySelectorAll('.payment-option-card'));
  paymentHelpText = document.querySelector('.payment-help-text');
  bankFields = document.getElementById('bankFields');
  bankSelect = document.getElementById('bankSelect');
  bankDetailsPreview = document.getElementById('bankDetailsPreview');
  bankDetailsPreviewBody = bankDetailsPreview ? bankDetailsPreview.querySelector('.safe-bank-preview') : null;
  locationInput = document.getElementById('location');
  pinLocationButton = document.getElementById('pinLocationButton');
  contactFormCard = document.querySelector('.contact-form-card');
  contactModalBackdrop = document.getElementById('contactModalBackdrop');
  contactModalCloseButton = document.getElementById('contactModalCloseButton');
  themeToggle = document.getElementById('themeToggle');
  mobileNavToggle = document.getElementById('mobileNavToggle');
  mobileNavDrawer = document.getElementById('mobileNavDrawer');
  mobileNavBackdrop = document.getElementById('mobileNavBackdrop');
  mobileNavClose = document.getElementById('mobileNavClose');
  globalLoader = document.getElementById('globalLoader');
}

function getCurrentPageName() {
  const pageName = window.location.pathname.split('/').pop() || 'products.html';
  return pageName.replace('.html', '').toLowerCase() || 'products';
}

function highlightActivePage() {
  const currentPage = getCurrentPageName();
  document.querySelectorAll('[data-page]').forEach(link => {
    link.classList.toggle('is-active', link.dataset.page === currentPage);
  });
}

async function loadSharedComponents() {
  const loadFragment = async (path) => {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return await response.text();
    } catch (error) {
      console.warn(error);
      return null;
    }
  };

  const headerContainer = document.getElementById('siteHeader');
  const footerContainer = document.getElementById('siteFooter');

  const [headerHtml, footerHtml] = await Promise.all([
    headerContainer ? loadFragment('components/header.html') : Promise.resolve(null),
    footerContainer ? loadFragment('components/footer.html') : Promise.resolve(null)
  ]);

  if (headerContainer && headerHtml) headerContainer.innerHTML = headerHtml;
  if (footerContainer && footerHtml) footerContainer.innerHTML = footerHtml;
}

let bankAccountsPromise = null;

function applyTheme(isDark = false) {
  const shouldUseDark = isDark ?? document.body.classList.contains('theme-dark');
  document.body.classList.toggle('theme-dark', shouldUseDark);
  const themeButtons = Array.from(document.querySelectorAll('[data-theme-toggle]'));
  themeButtons.forEach(button => {
    button.textContent = shouldUseDark ? '☀️' : '🌙';
    if (button.classList.contains('mobile-theme-toggle')) {
      button.textContent = shouldUseDark ? '☀️ Toggle theme' : '🌙 Toggle theme';
    }
  });
  try {
    localStorage.setItem('onestop-theme', shouldUseDark ? 'dark' : 'light');
  } catch (error) {
    // Ignore theme storage errors.
  }
}

function initializeTheme() {
  try {
    const savedTheme = localStorage.getItem('onestop-theme');
    if (savedTheme === 'dark') {
      applyTheme(true);
      return;
    }
  } catch (error) {
    // Ignore theme storage errors.
  }
  applyTheme(false);
}

const toggleTheme = () => {
  const nextDark = !document.body.classList.contains('theme-dark');
  applyTheme(nextDark);
};

function bindShellEvents() {
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  function openMobileMenu() {
    if (!mobileNavDrawer || !mobileNavBackdrop) return;
    mobileNavDrawer.classList.add('is-open');
    mobileNavBackdrop.classList.add('is-visible');
    mobileNavDrawer.setAttribute('aria-hidden', 'false');
    mobileNavToggle?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-nav-open');
  }

  function closeMobileMenu() {
    if (!mobileNavDrawer || !mobileNavBackdrop) return;
    mobileNavDrawer.classList.remove('is-open');
    mobileNavBackdrop.classList.remove('is-visible');
    mobileNavDrawer.setAttribute('aria-hidden', 'true');
    mobileNavToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-nav-open');
  }

  function toggleMobileMenu() {
    if (mobileNavDrawer?.classList.contains('is-open')) {
      closeMobileMenu();
      return;
    }
    openMobileMenu();
  }

  if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', toggleMobileMenu);
  }

  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', closeMobileMenu);
  }

  if (mobileNavBackdrop) {
    mobileNavBackdrop.addEventListener('click', closeMobileMenu);
  }

  document.querySelectorAll('.mobile-nav-links a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMobileMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      closeMobileMenu();
    }
  });
}

initializeTheme();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeInputText(value, maxLength = 4000) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function isValidOrderEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,254}$/i.test(value) && value.length <= 254;
}

function isValidOrderPhone(value) {
  return /^\+?[0-9][0-9 .()\-]{7,24}$/.test(value);
}

function validatePublicOrderInput(payload) {
  if (payload.p_customer_name.length < 2 || payload.p_customer_name.length > 160) {
    return 'Enter a customer name between 2 and 160 characters.';
  }
  if (!isValidOrderEmail(payload.p_email)) {
    return 'Enter a valid email address.';
  }
  if (!isValidOrderPhone(payload.p_phone_number)) {
    return 'Enter a valid phone number.';
  }
  if (!payload.p_location || payload.p_location.length > 500) {
    return 'Enter a valid delivery location.';
  }
  if (!Number.isFinite(payload.p_kgs_supplied) || payload.p_kgs_supplied <= 0 || payload.p_kgs_supplied > 10000) {
    return 'Enter an amount between 0.01 and 10000 kilograms.';
  }
  if (!payload.p_produce_id || !Number.isSafeInteger(payload.p_produce_id)) {
    return 'Select a valid produce item.';
  }
  if (!payload.p_notes || payload.p_notes.length > 4000) {
    return 'Enter a message of up to 4000 characters.';
  }
  return '';
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function getFallbackProductImage(name) {
  const query = encodeURIComponent(name || 'fresh vegetables');
  return `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80&${query}`;
}

function getStatusMeta(item) {
  if (isProduceVisible(item)) return { label: 'Available', className: 'available' };
  if (Number(item.amount_kg || 0) > 0) return { label: 'Limited Stock', className: 'limited' };
  return { label: 'Out of Stock', className: 'unavailable' };
}

function isProduceVisible(item) {
  if (!item) return false;
  const value = item.available_now;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value === 1;
  return false;
}

function parseReadyDate(readyDate) {
  if (!readyDate) return null;
  const value = String(readyDate).trim();
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isReadyDateReached(readyDate) {
  const targetDate = parseReadyDate(readyDate);
  if (!targetDate) return false;
  return Date.now() >= targetDate.getTime();
}

function getCountdownText(readyDate) {
  if (!readyDate) return 'Ready date not set.';
  const today = new Date();
  const target = new Date(`${readyDate}T00:00:00`);
  const diffMs = target.getTime() - today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays > 1) return `Ready in ${diffDays} days.`;
  if (diffDays === 1) return 'Ready in 1 day.';
  return 'Ready now.';
}

function setFeedback(element, message, tone = 'neutral') {
  if (!element) return;
  element.textContent = message;
  element.className = `form-feedback form-feedback-${tone}`;
}

function readCache(cacheKey, maxAgeMs) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !Array.isArray(parsed?.data)) return null;
    if ((Date.now() - Number(parsed.ts)) > maxAgeMs) return null;
    return parsed.data;
  } catch (error) {
    return null;
  }
}

function writeCache(cacheKey, data) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
  } catch (error) {
    // Ignore cache write failures.
  }
}

function renderProducts() {
  const visibleProduce = state.produce.filter(isProduceVisible).slice(0, 12);
  if (!visibleProduce.length) {
    productGrid.innerHTML = '<div class="data-placeholder">No produce currently available.</div>';
    return;
  }

  productGrid.innerHTML = visibleProduce.map((item, index) => {
    const status = getStatusMeta(item);
    const canOrder = isProduceVisible(item);
    const imageUrl = item.image_url || getFallbackProductImage(item.particulars);
    const fetchPriority = index < 2 ? 'high' : 'low';
    return `
      <article class="product-card">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.particulars)}" loading="lazy" decoding="async" fetchpriority="${fetchPriority}" />
        <div class="product-body">
          <h3>${escapeHtml(item.particulars)}</h3>
          <p class="product-meta">Unit price: ${escapeHtml(formatMoney(item.unit_price))} · Stock: ${escapeHtml(Number(item.amount_kg || 0).toFixed(2))} kgs</p>
          <div class="product-footer">
            <span class="status ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>
            <button
              type="button"
              class="button ${canOrder ? '' : 'button-disabled'}"
              data-produce-id="${escapeHtml(item.id)}"
              ${canOrder ? '' : 'disabled'}
            >${canOrder ? 'Order Now' : 'Currently Unavailable'}</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  productGrid.querySelectorAll('button[data-produce-id]').forEach(button => {
    button.addEventListener('click', () => openOrderModal(Number(button.dataset.produceId)));
  });
}

function renderAvailability() {
  const visibleProduce = state.produce.filter(isProduceVisible);
  if (!visibleProduce.length) {
    availabilityTable.innerHTML = '<div class="availability-row"><strong>No produce currently available.</strong><span class="badge unavailable">Unavailable</span></div>';
    return;
  }

  availabilityTable.innerHTML = state.produce.map(item => {
    const status = getStatusMeta(item);
    const metaText = isProduceVisible(item)
      ? 'Ready now.'
      : `${Number(item.amount_kg || 0).toFixed(2)} kgs · ${getCountdownText(item.ready_date)}`;
    return `
      <div class="availability-row">
        <div class="availability-copy">
          <strong>${escapeHtml(item.particulars)}</strong>
          <span class="availability-meta">${escapeHtml(metaText)}</span>
        </div>
        <span class="badge ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>
      </div>
    `;
  }).join('');
}

function renderGallery() {
  if (!state.gallery.length) {
    galleryGrid.innerHTML = '<div class="data-placeholder">No gallery images have been published yet.</div>';
    return;
  }

  galleryGrid.innerHTML = state.gallery.map(item => `
    <article class="gallery-item">
      <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.alt_text || item.title || item.caption || 'Onestop Veggies gallery image')}" loading="lazy" decoding="async" />
      <div class="gallery-copy">
        <h3>${escapeHtml(item.title || 'Gallery image')}</h3>
        <p>${escapeHtml(item.caption || 'Fresh produce operations at Onestop Veggies.')}</p>
      </div>
    </article>
  `).join('');
}

function populateProduceOptions() {
  const availableProduce = state.produce.filter(isProduceVisible);
  if (!availableProduce.length) {
    produceSelect.innerHTML = '<option value="">No available produce</option>';
    return;
  }

  produceSelect.innerHTML = ['<option value="">Select produce</option>'].concat(
    availableProduce.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.particulars)} (${escapeHtml(Number(item.amount_kg || 0).toFixed(2))} kgs)</option>`)
  ).join('');

  if (state.selectedProduceId) {
    produceSelect.value = String(state.selectedProduceId);
  }
  syncSelectedProduce();
}

function renderActiveOrderNowAccount(account) {
  if (!bankDetailsPreviewBody) return;

  if (!account) {
    bankDetailsPreviewBody.innerHTML = '<div class="safe-bank-row"><strong>Payment account information:</strong> No payment account is currently assigned to your location. Please choose "Pay on Delivery" or contact support.</div>';
    if (bankDetailsPreview) {
      bankDetailsPreview.hidden = false;
    }
    return;
  }

  bankDetailsPreviewBody.innerHTML = `
    <div class="safe-bank-row"><strong>Bank:</strong> ${escapeHtml(account.bank_name || '—')}</div>
    <div class="safe-bank-row"><strong>Account:</strong> ${escapeHtml(account.account_name || '—')}</div>
    <div class="safe-bank-row"><strong>Account Number:</strong> ${escapeHtml(account.account_number || '—')}</div>
    <div class="safe-bank-row"><strong>Branch:</strong>
  `;
  if (bankDetailsPreview) {
    bankDetailsPreview.hidden = false;
  }
}

function resetActiveOrderNowAccountCache() {
  state.activeOrderNowAccount = null;
  state.activeOrderNowAccountLocation = null;
  state.activeOrderNowAccountLoaded = false;
  state.activeOrderNowAccountPromise = null;
}

function updatePaymentOptionUI() {
  paymentOptionRadios.forEach(radio => {
    const label = radio.closest('.payment-option-card');
    const isActive = radio.checked;
    if (label) {
      label.classList.toggle('is-active', isActive);
      label.setAttribute('aria-checked', String(isActive));
    }
  });
}

function updatePaymentHelpText(selectedValue) {
  if (!paymentHelpText) return;
  if (selectedValue === 'payment_on_delivery') {
    paymentHelpText.textContent = 'Pay when your order is delivered.';
    return;
  }
  paymentHelpText.textContent = 'Select a payment account to complete payment.';
}

function setPaymentOption(nextValue) {
  const normalizedValue = nextValue === 'pay_now' ? 'pay_now' : 'payment_on_delivery';
  if (paymentOptionSelect) paymentOptionSelect.value = normalizedValue;
  paymentOptionRadios.forEach(radio => {
    radio.checked = radio.value === normalizedValue;
  });
  updatePaymentOptionUI();
  updatePaymentHelpText(normalizedValue);
}

function ensurePaymentOptionAvailability(hasAssignedPayNowAccount) {
  paymentOptionRadios.forEach(radio => {
    if (radio.value === 'pay_now') {
      radio.disabled = !hasAssignedPayNowAccount;
      const label = radio.closest('.payment-option-card');
      if (label) label.classList.toggle('is-disabled', !hasAssignedPayNowAccount);
      if (!hasAssignedPayNowAccount && radio.checked) {
        setPaymentOption('payment_on_delivery');
      }
    }
  });
}

function syncSelectedProduce() {
  const produceId = Number(produceSelect.value || 0);
  state.selectedProduceId = produceId || null;
  const selectedProduce = state.produce.find(item => Number(item.id) === produceId);
  unitPriceInput.value = selectedProduce ? Number(selectedProduce.unit_price || 0).toFixed(2) : '';
  if (selectedProduce) {
    const existingMessage = document.getElementById('message').value.trim();
    if (!existingMessage) {
      document.getElementById('message').value = `I would like to order ${selectedProduce.particulars}.`;
    }
  }
}

async function ensureActiveOrderNowAccountLoaded() {
  const locationName = String(locationInput?.value || '').trim();

  if (state.activeOrderNowAccountLoaded && state.activeOrderNowAccountLocation === locationName) {
    return state.activeOrderNowAccount;
  }

  if (state.activeOrderNowAccountPromise && state.activeOrderNowAccountLocation === locationName) {
    return state.activeOrderNowAccountPromise;
  }

  state.activeOrderNowAccountLocation = locationName;
  state.activeOrderNowAccountPromise = (async () => {
    try {
      const { data, error } = await supabaseClient.rpc('get_public_order_now_account', {
        p_location_name: locationName || null
      });
      
      if (error) {
        console.error('Failed to load order now account:', error);
        throw error;
      }

      const account = Array.isArray(data) && data.length ? data[0] : null;
      state.activeOrderNowAccount = account || null;
      state.activeOrderNowAccountLoaded = true;
      renderActiveOrderNowAccount(account);
      ensurePaymentOptionAvailability(Boolean(account));
      return account;
    } catch (error) {
      console.error('Error loading active order now account:', error);
      state.activeOrderNowAccount = null;
      state.activeOrderNowAccountLoaded = true;
      renderActiveOrderNowAccount(null);
      ensurePaymentOptionAvailability(false);
      if (orderFormStatus) {
        setFeedback(orderFormStatus, 'Could not load the active payment account. Please choose Pay on Delivery.', 'error');
      }
      return null;
    }
  })();

  try {
    return await state.activeOrderNowAccountPromise;
  } catch (error) {
    // Error already handled in promise
    return null;
  } finally {
    state.activeOrderNowAccountPromise = null;
  }
}

async function loadBankAccountsPublic(force = false) {
  const isInitial = state.isInitialLoading;
  
  try {
    state.isBankAccountsLoading = true;
    
    const cached = !force && readCache(CACHE_KEYS.banks, CACHE_TTL_MS.banks);
    if (cached && cached.length) {
      state.bankAccounts = cached;
      populateBankSelect();
    }

    const locationName = String(locationInput?.value || '').trim();
    const { data, error } = await supabaseClient.rpc('get_public_bank_accounts', {
      p_location_name: locationName || null
    });
    
    if (error) {
      console.error('Failed to load public bank accounts:', error);
      throw error;
    }
    
    const accounts = Array.isArray(data) ? data : [];
    state.bankAccounts = accounts.map(account => ({
      ...account,
      current_balance: account.current_balance ?? 0,
      is_active: account.is_active !== false,
      is_order_now_active: account.is_order_now_active === true
    }));
    writeCache(CACHE_KEYS.banks, state.bankAccounts);
    populateBankSelect();
  } catch (error) {
    console.error('Could not load public bank accounts:', error);
    state.bankAccounts = state.bankAccounts || [];
    populateBankSelect();
    // Don't show error message here - let it be handled by the calling function
  } finally {
    state.isBankAccountsLoading = false;
    if (isInitial) {
      // Check if produce loading is also done
      if (!state.isProduceLoading) {
        state.isInitialLoading = false;
        hideLoader();
      }
    }
  }
}

function populateBankSelect() {
  if (!bankSelect) return;
  const accounts = (state.bankAccounts || []).filter(a => a.is_active !== false);
  const bankSelectGroup = bankSelect.closest('.form-group');
  const previousSelection = bankSelect.value || '';

  if (!accounts.length) {
    if (bankSelectGroup) bankSelectGroup.hidden = false;
    bankSelect.innerHTML = '<option value="">No active bank accounts available</option>';
    if (bankDetailsPreview) {
      bankDetailsPreview.hidden = true;
      bankDetailsPreviewBody.innerHTML = '';
    }
    return;
  }

  if (accounts.length === 1) {
    const account = accounts[0];
    if (bankSelectGroup) bankSelectGroup.hidden = true;
    const optionValue = escapeHtml(String(account.id || ''));
    const displayText = `${account.bank_name ? account.bank_name + ' — ' : ''}${account.account_name || 'Account'}${account.account_number ? ' (' + account.account_number + ')' : ''}`;
    bankSelect.innerHTML = `<option value="${optionValue}" selected>${escapeHtml(displayText)}</option>`;
    bankSelect.value = String(account.id || '');
    renderActiveOrderNowAccount(account);
    return;
  }

  if (bankSelectGroup) bankSelectGroup.hidden = false;
  const activeAccountId = state.activeOrderNowAccount ? String(state.activeOrderNowAccount.id || '') : '';
  const defaultSelection = previousSelection || (activeAccountId && accounts.some(a => String(a.id || '') === activeAccountId) ? activeAccountId : '');
  const options = ['<option value="">Select a payment account</option>']
    .concat(accounts.map(a => {
      const displayText = `${a.bank_name ? a.bank_name + ' — ' : ''}${a.account_name || 'Account'}${a.account_number ? ' (' + a.account_number + ')' : ''}`;
      const value = escapeHtml(String(a.id || ''));
      const selected = defaultSelection && String(defaultSelection) === String(a.id || '') ? ' selected' : '';
      return `<option value="${value}"${selected}>${escapeHtml(displayText)}</option>`;
    }));
  bankSelect.innerHTML = options.join('');
  if (defaultSelection) {
    bankSelect.value = String(defaultSelection);
  }
}

function renderSelectedBankAccountPreview() {
  if (!bankSelect) {
    renderActiveOrderNowAccount(state.activeOrderNowAccount || null);
    return;
  }

  const bankSelectGroup = bankSelect.closest('.form-group');
  const manualSelectionId = String(bankSelect.value || '').trim();
  const manualAccount = manualSelectionId
    ? state.bankAccounts.find(a => String(a.id || '') === manualSelectionId)
    : null;
  const activeAccount = state.activeOrderNowAccount || null;

  if (manualAccount) {
    if (bankSelectGroup) bankSelectGroup.hidden = false;
    renderActiveOrderNowAccount(manualAccount);
    return;
  }

  if (activeAccount) {
    if (bankSelectGroup) bankSelectGroup.hidden = state.bankAccounts.filter(a => a.is_active !== false).length === 1;
    renderActiveOrderNowAccount(activeAccount);
    return;
  }

  if (bankSelectGroup) bankSelectGroup.hidden = false;
  renderActiveOrderNowAccount(null);
}

function getSelectedBankAccount() {
  if (!bankSelect) return null;
  const selectedId = String(bankSelect.value || '').trim();
  if (!selectedId) return null;
  return state.bankAccounts.find(a => String(a.id || '') === selectedId) || null;
}

async function syncPaymentFields() {
  const activeValue = paymentOptionRadios.find(radio => radio.checked)?.value || paymentOptionSelect.value || 'pay_now';
  setPaymentOption(activeValue);
  const isPayNow = activeValue === 'pay_now';
  if (bankFields) {
    bankFields.classList.toggle('is-visible', isPayNow);
    bankFields.hidden = !isPayNow;
    bankFields.setAttribute('aria-hidden', String(!isPayNow));
  }

  if (!isPayNow) {
    if (bankDetailsPreview) {
      bankDetailsPreview.hidden = true;
      bankDetailsPreview.setAttribute('aria-hidden', 'true');
    }
    if (bankDetailsPreviewBody) bankDetailsPreviewBody.innerHTML = '';
    return;
  }

  const loadAccounts = loadBankAccountsPublic().catch(() => {});
  const account = await ensureActiveOrderNowAccountLoaded();
  await loadAccounts;

  const manualAccount = getSelectedBankAccount();
  if (!account && !manualAccount && orderFormStatus) {
    setFeedback(orderFormStatus, 'No assigned Pay Now account exists for your branch/location. Please choose Pay on Delivery.', 'error');
  }

  renderSelectedBankAccountPreview();
}

function openOrderModal(produceId = null) {
  if (produceId) {
    state.selectedProduceId = produceId;
    produceSelect.value = String(produceId);
    syncSelectedProduce();
  }
  setPaymentOption('pay_now');
  syncPaymentFields();
  contactFormCard.hidden = false;
  contactFormCard.classList.add('contact-form-card-modal');
  contactModalBackdrop.hidden = false;
  contactModalCloseButton.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('name').focus();

  // Warm the location-specific payment data when the modal opens.
  loadBankAccountsPublic().catch(() => {});
  setTimeout(() => {
    if (paymentOptionSelect.value === 'pay_now') {
      ensureActiveOrderNowAccountLoaded();
    }
  }, 30);
}

function closeOrderModal() {
  contactFormCard.classList.remove('contact-form-card-modal');
  contactFormCard.hidden = true;
  contactModalBackdrop.hidden = true;
  contactModalCloseButton.hidden = true;
  document.body.style.overflow = '';
}

async function syncProduceAvailability() {
  try {
    const dueItems = state.produce.filter(item => !isProduceVisible(item) && isReadyDateReached(item.ready_date));
    if (!dueItems.length) return false;

    const ids = dueItems.map(item => item.id).filter(Boolean);
    
    // Try to update available_now column if it exists
    try {
      const { error } = await supabaseClient
        .from('produce')
        .update({ available_now: true })
        .in('id', ids)
        .eq('available_now', false);

      if (error && error.message && error.message.includes('available_now')) {
        // Column doesn't exist, update is_available instead
        const { error: altError } = await supabaseClient
          .from('produce')
          .update({ is_available: true })
          .in('id', ids)
          .eq('is_available', false);
        
        if (altError) throw altError;
      } else if (error) {
        throw error;
      }
    } catch (updateError) {
      console.warn('Could not sync produce availability with database:', updateError);
      // Continue anyway - local state will be updated
    }

    state.produce = state.produce.map(item => {
      if (!ids.includes(item.id)) return item;
      return { ...item, available_now: true };
    });

    renderProducts();
    renderAvailability();
    populateProduceOptions();
    writeCache(CACHE_KEYS.produce, state.produce);
    return true;
  } catch (error) {
    console.error('Error in syncProduceAvailability:', error);
    return false;
  }
}

async function loadProduce() {
  const isInitial = state.isInitialLoading;
  
  try {
    const cached = readCache(CACHE_KEYS.produce, CACHE_TTL_MS.produce);
    if (cached && cached.length) {
      state.produce = cached;
      renderProducts();
      renderAvailability();
      populateProduceOptions();
    }

    state.isProduceLoading = true;
    
    const { data, error } = await supabaseClient
      .from('produce')
      .select('id,particulars,amount_kg,unit_price,is_available,image_url,ready_date,available_now')
      .order('particulars', { ascending: true })
      .limit(40);

    if (error) {
      // If column doesn't exist, try without available_now
      if (error.message && error.message.includes('available_now')) {
        console.warn('available_now column not found, retrying without it', error);
        const { data: retryData, error: retryError } = await supabaseClient
          .from('produce')
          .select('id,particulars,amount_kg,unit_price,is_available,image_url,ready_date')
          .order('particulars', { ascending: true })
          .limit(40);
        
        if (retryError) throw retryError;
        
        // Map is_available to available_now for compatibility
        state.produce = (Array.isArray(retryData) ? retryData : []).map(item => ({
          ...item,
          available_now: item.is_available || false
        }));
      } else {
        throw error;
      }
    } else {
      state.produce = Array.isArray(data) ? data : [];
    }
    
    await syncProduceAvailability();
    renderProducts();
    renderAvailability();
    populateProduceOptions();
    writeCache(CACHE_KEYS.produce, state.produce);
    
  } catch (error) {
    console.error('Failed to load produce:', error);
    if (!state.produce.length) {
      if (productGrid) {
        productGrid.innerHTML = '<div class="data-placeholder">Unable to load products. Please refresh and try again. Error: ' + escapeHtml(error.message || 'Unknown error') + '</div>';
      }
      if (availabilityTable) {
        availabilityTable.innerHTML = '<div class="availability-row"><strong>Unable to load availability.</strong><span class="badge unavailable">Error</span></div>';
      }
    }
    if (orderFormStatus) {
      setFeedback(orderFormStatus, error.message || 'Could not refresh produce data.', 'error');
    }
  } finally {
    state.isProduceLoading = false;
    if (isInitial) {
      state.isInitialLoading = false;
      // Only hide loader if no other critical loading is in progress
      if (!state.isBankAccountsLoading) {
        hideLoader();
      }
    }
  }
}

async function loadGallery() {
  if (state.galleryRequested) return;
  state.galleryRequested = true;
  
  try {
    const { data, error } = await supabaseClient
      .from('gallery')
      .select('id,title,caption,alt_text,image_url,created_at,sort_order')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw error;
    state.gallery = Array.isArray(data) ? data : [];
    state.galleryLoaded = true;
    renderGallery();
    writeCache(CACHE_KEYS.gallery, state.gallery);
  } catch (error) {
    console.error('Gallery load failed:', error);
    state.gallery = [];
    state.galleryLoaded = true;
    if (galleryGrid) {
      galleryGrid.innerHTML = '<div class="data-placeholder">Unable to load gallery images. Please try refreshing the page.</div>';
    }
  }
}

function setupGalleryLazyLoad() {
  if (!gallerySection) return;

  const triggerLoad = () => {
    loadGallery().catch(error => {
      console.error('Gallery load failed:', error);
      if (galleryGrid) {
        galleryGrid.innerHTML = '<div class="data-placeholder">Unable to load gallery images. Please try refreshing the page.</div>';
      }
    });
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        triggerLoad();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(gallerySection);
  } else {
    setTimeout(triggerLoad, 120);
  }
}

function hydrateFromCache() {
  const cachedProduce = readCache(CACHE_KEYS.produce, CACHE_TTL_MS.produce);
  if (cachedProduce && cachedProduce.length) {
    state.produce = cachedProduce;
    renderProducts();
    renderAvailability();
    populateProduceOptions();
  }

  const cachedGallery = readCache(CACHE_KEYS.gallery, CACHE_TTL_MS.gallery);
  if (cachedGallery && cachedGallery.length) {
    state.gallery = cachedGallery;
    renderGallery();
  }
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  const submitButton = orderForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  
  try {
    showLoader();
    setFeedback(orderFormStatus, 'Submitting your order inquiry...', 'neutral');

    const payload = {
      p_customer_name: normalizeInputText(document.getElementById('name').value, 160),
      p_email: normalizeInputText(document.getElementById('email').value, 254).toLowerCase(),
      p_phone_number: normalizeInputText(document.getElementById('phone').value, 25),
      p_location: normalizeInputText(locationInput.value, 500),
      p_notes: normalizeInputText(document.getElementById('message').value, 4000),
      p_produce_id: Number(produceSelect.value || 0),
      p_kgs_supplied: Number(kgsSuppliedInput.value || 0),
      p_payment_option: paymentOptionSelect.value,
      p_bank_account_id: null,
      p_bank_account: null
    };

    const validationMessage = validatePublicOrderInput(payload);
    if (validationMessage) {
      setFeedback(orderFormStatus, validationMessage, 'error');
      return;
    }

    if (payload.p_payment_option === 'pay_now') {
      const manualAccount = getSelectedBankAccount();
      const activeAccount = manualAccount || await ensureActiveOrderNowAccountLoaded();
      if (!activeAccount) {
        setFeedback(orderFormStatus, 'Payment account is currently unavailable. Please choose Pay on Delivery.', 'error');
        return;
      }
      payload.p_bank_account_id = activeAccount.id || null;
      payload.p_bank_account = [
        activeAccount.bank_name,
        activeAccount.account_name,
        activeAccount.account_number ? `(${activeAccount.account_number})` : null
      ].filter(Boolean).join(' · ');
    }

    const { data, error } = await supabaseClient.rpc('submit_public_customer_order', payload);
    if (error) throw error;

    orderForm.reset();
    setPaymentOption('pay_now');
    unitPriceInput.value = '';
    await syncPaymentFields();
    state.selectedProduceId = null;
    setFeedback(orderFormStatus, `Order received. Submission #${data.submission_id} is waiting for manager approval.`, 'success');
    closeOrderModal();
  } catch (error) {
    console.error('Order submission error:', error);
    setFeedback(orderFormStatus, error.message || 'Could not submit your order inquiry. Please try again.', 'error');
  } finally {
    hideLoader();
    submitButton.disabled = false;
  }
}

function handlePinLocation() {
  if (!navigator.geolocation) {
    setFeedback(orderFormStatus, 'Geolocation is not available in this browser.', 'error');
    return;
  }

  setFeedback(orderFormStatus, 'Getting your current location...', 'neutral');
  navigator.geolocation.getCurrentPosition(
    position => {
      const latitude = position.coords.latitude.toFixed(6);
      const longitude = position.coords.longitude.toFixed(6);
      locationInput.value = `${latitude}, ${longitude} - https://maps.google.com/?q=${latitude},${longitude}`;
      resetActiveOrderNowAccountCache();
      if (paymentOptionSelect.value === 'pay_now') {
        syncPaymentFields().catch(() => {});
      }
      loadBankAccountsPublic().catch(() => {});
      setFeedback(orderFormStatus, 'Location pinned successfully.', 'success');
    },
    error => {
      setFeedback(orderFormStatus, error.message || 'Unable to retrieve your location.', 'error');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function bindEvents() {
  produceSelect.addEventListener('change', syncSelectedProduce);
  paymentOptionSelect.addEventListener('change', syncPaymentFields);
  paymentOptionRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      setPaymentOption(radio.value);
      syncPaymentFields();
    });
  });
  orderForm.addEventListener('submit', handleOrderSubmit);
  orderForm.addEventListener('reset', () => {
    setPaymentOption('pay_now');
    syncPaymentFields();
  });
  if (bankSelect) {
    bankSelect.addEventListener('change', () => {
      renderSelectedBankAccountPreview();
    });
  }
  if (locationInput) {
    locationInput.addEventListener('change', () => {
      resetActiveOrderNowAccountCache();
      if (paymentOptionSelect.value === 'pay_now') {
        syncPaymentFields().catch(() => {});
      }
      loadBankAccountsPublic().catch(() => {});
    });
  }
  pinLocationButton.addEventListener('click', handlePinLocation);
  contactModalCloseButton.addEventListener('click', closeOrderModal);
  contactModalBackdrop.addEventListener('click', closeOrderModal);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && contactFormCard.classList.contains('contact-form-card-modal')) {
      closeOrderModal();
    }
  });
}

function startProduceAvailabilityTimer() {
  if (produceAvailabilityTimer) return;
  produceAvailabilityTimer = window.setInterval(() => {
    syncProduceAvailability().catch(() => {});
  }, 60 * 1000);
}

async function initialize() {
  if (!SUPA_URL || !SUPA_KEY) {
    if (orderFormStatus) {
      setFeedback(orderFormStatus, 'Supabase configuration is missing.', 'error');
    }
    hideLoader();
    return;
  }

  try {
    state.isInitialLoading = true;
    showLoader();
    
    refreshDomBindings();
    bindEvents();
    hydrateFromCache();
    setupGalleryLazyLoad();
    startProduceAvailabilityTimer();

    // Critical data - waits for this before hiding loader
    try {
      await loadProduce();
    } catch (error) {
      console.error('Failed to load produce:', error);
      if (!state.produce.length) {
        if (productGrid) {
          productGrid.innerHTML = '<div class="data-placeholder">Unable to load products. Please refresh and try again.</div>';
        }
        if (availabilityTable) {
          availabilityTable.innerHTML = '<div class="availability-row"><strong>Unable to load availability.</strong><span class="badge unavailable">Error</span></div>';
        }
      }
      if (orderFormStatus) {
        setFeedback(orderFormStatus, error.message || 'Could not load produce data.', 'error');
      }
    }

    // Mark initial loading as complete if produce loading finished
    if (state.isProduceLoading === false) {
      state.isInitialLoading = false;
      hideLoader();
    }

    // Warm non-critical data without blocking - does not prevent initial loader from hiding
    const warmup = async () => {
      try {
        await ensureActiveOrderNowAccountLoaded();
      } catch (error) {
        console.warn('Could not warm up order now account:', error);
      }
      try {
        await loadBankAccountsPublic();
      } catch (error) {
        console.warn('Could not warm up bank accounts:', error);
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(warmup, { timeout: 1200 });
    } else {
      setTimeout(warmup, 200);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  } catch (error) {
    console.error('Initialization error:', error);
    hideLoader();
    if (orderFormStatus) {
      setFeedback(orderFormStatus, 'An error occurred during initialization. Please refresh the page.', 'error');
    }
  }
}

initialize();
