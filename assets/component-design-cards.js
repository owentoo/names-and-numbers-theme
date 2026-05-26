/* ================================================================
   DESIGN CARDS CONTROLLER
   Parent-child cart interactions for "By Size" products
   Ninja Transfers · Cart Playground
   ================================================================ */

(function () {
  'use strict';

  /* ─── HELPERS ─── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const money = (cents) => '$' + (cents / 100).toFixed(2);

  function setAddRowEnabled(card, enabled) {
    // Target only the add-size panel's row, not edit panel rows
    const addWrap = card.querySelector('[data-add-size-wrap]');
    const row = addWrap?.querySelector('.dc-add-row');
    if (!row) return;
    const qtyWrap = row.querySelector('.dc-qty-wrap');
    const priceEa = row.querySelector('[data-add-price-ea]');
    const total = row.querySelector('[data-add-total]');
    const confirm = addWrap?.querySelector('[data-action="confirm-add-size"]');
    [qtyWrap, priceEa, total].forEach(el => {
      if (el) el.classList.toggle('dc-disabled', !enabled);
    });
    if (qtyWrap) {
      qtyWrap.querySelectorAll('button, input').forEach(el => el.disabled = !enabled);
    }
    if (confirm) {
      confirm.disabled = !enabled;
      confirm.classList.toggle('dc-disabled', !enabled);
    }
  }

  /* ─── TOAST ─── */
  let toastTimer = null;
  function showToast(icon, msg, undoFn) {
    clearTimeout(toastTimer);
    const t = $('#dc-toast');
    if (!t) return;
    $('#dc-toast-msg').textContent = msg;
    t.querySelector('.dc-toast-icon').textContent = icon;
    const undoBtn = $('#dc-toast-undo');
    if (undoFn) {
      undoBtn.style.display = 'inline-block';
      undoBtn.onclick = () => { undoFn(); t.classList.remove('show'); clearTimeout(toastTimer); };
      t.classList.add('show');
      t.style.pointerEvents = 'auto';
      toastTimer = setTimeout(() => { t.classList.remove('show'); t.style.pointerEvents = 'none'; }, 5000);
    } else {
      undoBtn.style.display = 'none';
      t.classList.add('show');
      t.style.pointerEvents = 'none';
      toastTimer = setTimeout(() => { t.classList.remove('show'); }, 2200);
    }
  }

  /* ─── CART API ─── */
  const cartHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

  async function cartChange(id, quantity, opts) {
    const variantId = id.split(':')[0];
    const sectionId = opts?.sectionId;

    const body = { id, quantity };
    if (sectionId) { body.sections = sectionId; body.sections_url = '/cart'; }

    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: cartHeaders,
      body: JSON.stringify(body)
    });
    const cart = await res.json();

    // Check if it worked (200 with items and correct qty)
    const changed = cart.items?.find(it => it.key === id && it.quantity === quantity);
    if (changed) return cart;

    // Key was stale or 422 error — fetch fresh cart, find item by variant_id, retry
    const freshCart = await (await fetch('/cart.js', { headers: { 'Accept': 'application/json' } })).json();
    const match = freshCart.items?.find(it => String(it.variant_id) === variantId);
    if (!match) return freshCart;

    if (match.quantity === quantity) {
      // Already at desired qty (maybe a concurrent change)
      const row = document.querySelector(`[data-line-key="${id}"]`);
      if (row) row.dataset.lineKey = match.key;
      return freshCart;
    }

    // Retry with the correct key (include sections again)
    const retryBody = { id: match.key, quantity };
    if (sectionId) { retryBody.sections = sectionId; retryBody.sections_url = '/cart'; }
    const res2 = await fetch('/cart/change.js', {
      method: 'POST',
      headers: cartHeaders,
      body: JSON.stringify(retryBody)
    });
    const cart2 = await res2.json();

    // Update DOM with the fresh key
    const row = document.querySelector(`[data-line-key="${id}"]`);
    const freshItem = cart2.items?.find(it => String(it.variant_id) === variantId);
    if (row && freshItem) row.dataset.lineKey = freshItem.key;
    return cart2;
  }

  // Update a single line item's properties in-place (no remove/re-add risk)
  async function cartChangeProps(key, quantity, properties) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: cartHeaders,
      body: JSON.stringify({ id: key, quantity, properties })
    });
    return res.json();
  }

  async function cartUpdate(updates) {
    const res = await fetch('/cart/update.js', {
      method: 'POST',
      headers: cartHeaders,
      body: JSON.stringify({ updates })
    });
    return res.json();
  }

  async function cartAdd(items) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: cartHeaders,
      body: JSON.stringify({ items })
    });
    return res.json();
  }

  async function cartGet() {
    const res = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
    return res.json();
  }

  /* ─── CART PRICE MAP (real per-unit prices from /cart.js) ─── */
  let _cartPriceMap = new Map();

  async function refreshCartPriceMap() {
    try {
      const cart = await cartGet();
      const m = new Map();
      (cart.items || []).forEach(item => {
        const vid = String(item.variant_id);
        const perUnit = Math.round(item.final_line_price / item.quantity);
        // If multiple line items share a variant, keep the lowest per-unit price
        if (!m.has(vid) || perUnit < m.get(vid)) m.set(vid, perUnit);
      });
      _cartPriceMap = m;
    } catch (e) {
      // Silently keep stale map on failure
    }
  }

  function clearCartPriceMap() { _cartPriceMap = new Map(); }

  /* ─── FETCH SECTION HTML ─── */
  async function fetchSectionDoc() {
    // Find the correct section ID that contains the design cards
    if (!fetchSectionDoc._sectionId) {
      const wrapper = document.querySelector('design-card-controller, blank-card-controller, default-card-controller');
      const section = wrapper?.closest('[id^="shopify-section-"]');
      fetchSectionDoc._sectionId = section ? section.id.replace('shopify-section-', '') : 'helper-cart';
    }
    const sectionId = fetchSectionDoc._sectionId;

    // Try Shopify sections API first — returns JSON with guaranteed fresh cart state
    try {
      const res = await fetch(`/cart?sections=${sectionId}`, { cache: 'no-store' });
      const data = await res.json();
      const html = data[sectionId];
      if (html) return new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {}

    // Fallback: classic section rendering via query param
    const res = await fetch(`?section_id=${sectionId}`, { cache: 'no-store' });
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  /* ─── LOADING STATE HELPERS ─── */
  function startLoading(el) { if (el) el.classList.add('dc-loading'); }
  function stopLoading(el) { if (el) el.classList.remove('dc-loading'); }

  /* ─── CART SKELETON ─── */
  function injectSkeletonStyles() {
    if (document.getElementById('dc-skeleton-styles')) return;
    const s = document.createElement('style');
    s.id = 'dc-skeleton-styles';
    s.textContent = `
      #AjaxCartForm.dc-cart-refreshing .dc-price-block,
      #AjaxCartForm.dc-cart-refreshing .dc-price-ea,
      #AjaxCartForm.dc-cart-refreshing .dc-row-total,
      #AjaxCartForm.dc-cart-refreshing .dc-price-main,
      #AjaxCartForm.dc-cart-refreshing .dc-price-line,
      #AjaxCartForm.dc-cart-refreshing .dc-disc-badge,
      #AjaxCartForm.dc-cart-refreshing .dc-section-count {
        position: relative; overflow: hidden; pointer-events: none;
      }
      #AjaxCartForm.dc-cart-refreshing .dc-price-block > *,
      #AjaxCartForm.dc-cart-refreshing .dc-price-ea > *,
      #AjaxCartForm.dc-cart-refreshing .dc-row-total,
      #AjaxCartForm.dc-cart-refreshing .dc-price-main,
      #AjaxCartForm.dc-cart-refreshing .dc-price-line,
      #AjaxCartForm.dc-cart-refreshing .dc-disc-badge,
      #AjaxCartForm.dc-cart-refreshing .dc-section-count {
        color: transparent !important;
      }
      #AjaxCartForm.dc-cart-refreshing .dc-price-block::after,
      #AjaxCartForm.dc-cart-refreshing .dc-price-ea::after,
      #AjaxCartForm.dc-cart-refreshing .dc-row-total::after,
      #AjaxCartForm.dc-cart-refreshing .dc-price-main::after {
        content: ''; position: absolute; inset: 0; border-radius: 4px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e8f0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: dc-shimmer 1.2s ease-in-out infinite;
      }
      #AjaxCartForm .dc-price-block,
      #AjaxCartForm .dc-price-ea,
      #AjaxCartForm .dc-row-total,
      #AjaxCartForm .dc-price-main,
      #AjaxCartForm .dc-price-line,
      #AjaxCartForm .dc-disc-badge,
      #AjaxCartForm .dc-section-count {
        transition: color 0.2s ease;
      }
      @keyframes dc-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(s);
  }

  let _skeletonSafetyTimer = null;

  function showCartSkeleton() {
    injectSkeletonStyles();
    const form = document.querySelector('#AjaxCartForm');
    if (form) form.classList.add('dc-cart-refreshing');
    // Safety: always remove after 5s even if something goes wrong
    clearTimeout(_skeletonSafetyTimer);
    _skeletonSafetyTimer = setTimeout(hideCartSkeleton, 5000);
  }

  function hideCartSkeleton() {
    clearTimeout(_skeletonSafetyTimer);
    const form = document.querySelector('#AjaxCartForm');
    if (!form) return;
    // Let the new text color transition in, then remove skeleton class
    form.classList.remove('dc-cart-refreshing');
  }

  async function fullCartRefresh(preloadedDoc) {
    // Lock the discount banner so it doesn't flash during refresh
    const banner = document.querySelector('[data-disc-banner]');
    if (banner) banner.dataset.locked = 'true';
    showCartSkeleton();
    await refreshCartSection(preloadedDoc);
    // Refresh cart price map so strikethrough reflects cart-level discounts
    await refreshCartPriceMap();
    // Unlock and update banner with final state
    if (banner) {
      delete banner.dataset.locked;
      const ctrl = document.querySelector('design-card-controller');
      if (ctrl && ctrl.updateDiscountBanner) ctrl.updateDiscountBanner();
    }
  }

  /* ─── GLOBAL CART PATCH (subtotal, cart count, section labels, hidden inputs) ─── */
  function patchGlobalCart(doc) {
    // Subtotal / cart total
    ['#AjaxCartSubtotal', '.cart__subtotal', '[data-cart-subtotal]', '.cart-total-price'].forEach(sel => {
      const ne = doc.querySelector(sel);
      const oe = document.querySelector(sel);
      if (ne && oe) oe.innerHTML = ne.innerHTML;
    });

    // Header cart count
    const nCount = doc.querySelector('[data-cart-count]');
    if (nCount) {
      document.querySelectorAll('[data-header-cart-count], .cart-count-bubble, [data-cart-count]').forEach(el => {
        el.textContent = nCount.textContent;
      });
    }

    // Shopping Cart (N) title
    const nTitle = doc.querySelector('.cart__heading, .cart-title');
    const oTitle = document.querySelector('.cart__heading, .cart-title');
    if (nTitle && oTitle) oTitle.innerHTML = nTitle.innerHTML;

    // Section labels (pcs counts)
    doc.querySelectorAll('.dc-section-count').forEach((ne, i) => {
      const oe = document.querySelectorAll('.dc-section-count')[i];
      if (oe) oe.textContent = ne.textContent;
    });

    // Hidden inputs
    ['moneySaved', 'reward_money', 'productblank'].forEach(id => {
      const ne = doc.querySelector('#' + id);
      const oe = document.querySelector('#' + id);
      if (ne && oe) oe.value = ne.value;
    });

    // Dispatch event for theme's own cart handlers
    const cf = document.querySelector('cart-form');
    if (cf) cf.dispatchEvent(new CustomEvent('cart-updated'));
  }

  /* ─── FULL SECTION RE-RENDER (structural changes: add / delete / edit) ─── */
  async function refreshCartSection(preloadedDoc) {
    try {
      const doc = preloadedDoc || await fetchSectionDoc();

      const newForm = doc.querySelector('#AjaxCartForm');
      const oldForm = document.querySelector('#AjaxCartForm');
      if (newForm && oldForm) {
        // Strip entrance animations so cards don't re-animate
        newForm.querySelectorAll('.dc-card-enter').forEach(el => el.classList.remove('dc-card-enter'));

        // Morph DOM instead of replacing — preserves nodes for smooth transitions
        try {
          if (typeof morphCart === 'function') {
            morphCart(oldForm, newForm);
          } else {
            oldForm.innerHTML = newForm.innerHTML;
          }
        } catch (morphErr) {
          console.warn('[DesignCards] morph failed, falling back to innerHTML:', morphErr);
          oldForm.innerHTML = newForm.innerHTML;
        }
        hideCartSkeleton();
      }

      // Morph subtotal
      const newSub = doc.querySelector('#AjaxCartSubtotal');
      const oldSub = document.querySelector('#AjaxCartSubtotal');
      if (newSub && oldSub) {
        try {
          if (typeof morphCart === 'function') {
            morphCart(oldSub, newSub);
          } else {
            oldSub.innerHTML = newSub.innerHTML;
          }
        } catch (morphErr) {
          console.warn('[DesignCards] subtotal morph failed:', morphErr);
          oldSub.innerHTML = newSub.innerHTML;
        }
      }

      // Update header cart count and total
      const newCount = doc.querySelector('[data-cart-count]');
      const newTotal = doc.querySelector('[data-cart-total]');
      if (newCount) document.querySelectorAll('[data-header-cart-count]').forEach(el => el.textContent = newCount.textContent);
      if (newTotal) document.querySelectorAll('[data-header-cart-total]').forEach(el => el.textContent = newTotal.textContent);

      // Only re-initialize controllers if we used innerHTML (morph preserves nodes)
      const usedMorph = typeof morphCart === 'function';
      if (!usedMorph) {
        document.querySelectorAll('design-card-controller, blank-card-controller, default-card-controller').forEach(el => { if (el.init) el.init(); });
        const cartFormEl = document.querySelector('cart-form');
        if (cartFormEl && cartFormEl.ajaxifyCartItems) cartFormEl.ajaxifyCartItems();
      }
      const cartFormEl2 = document.querySelector('cart-form');
      if (cartFormEl2) cartFormEl2.dispatchEvent(new CustomEvent('cart-updated'));

      // Guaranteed hide — covers cases where newForm/oldForm was null
      hideCartSkeleton();

      // Run shared cart callbacks (savings display, rewards, upsell, etc.)
      if (typeof _saving_update === 'function') _saving_update();
      if (typeof reCalculateFreeShippingModule === 'function') reCalculateFreeShippingModule();

    } catch (err) {
      console.error('[DesignCards] refreshCartSection error — falling back to innerHTML swap:', err);
      // Fallback: re-fetch and do a simple innerHTML swap instead of reloading the page
      try {
        const fallbackDoc = await fetchSectionDoc();
        const nf = fallbackDoc.querySelector('#AjaxCartForm');
        const of = document.querySelector('#AjaxCartForm');
        if (nf && of) of.innerHTML = nf.innerHTML;
        const ns = fallbackDoc.querySelector('#AjaxCartSubtotal');
        const os = document.querySelector('#AjaxCartSubtotal');
        if (ns && os) os.innerHTML = ns.innerHTML;
        const cartEl = document.querySelector('cart-form');
        if (cartEl && cartEl.ajaxifyCartItems) cartEl.ajaxifyCartItems();
        document.querySelectorAll('design-card-controller, blank-card-controller, default-card-controller').forEach(el => { if (el.init) el.init(); });
        if (cartEl) cartEl.dispatchEvent(new CustomEvent('cart-updated'));
        if (typeof _saving_update === 'function') _saving_update();
        if (typeof reCalculateFreeShippingModule === 'function') reCalculateFreeShippingModule();
      } catch (fallbackErr) {
        console.error('[DesignCards] Fallback also failed, reloading:', fallbackErr);
        window.location.reload();
      }
      hideCartSkeleton();
    }
  }

  /* ─── IMGIX PARAM TOGGLE ─── */
  // Strip any accumulated HTML-entity layers (&amp; / &amp%3B) from a URL.
  // Uses a while loop so it handles any number of nesting layers, no cap.
  function cleanImgixUrl(url) {
    if (!url) return url;
    let cur = url;
    while (cur.includes('&amp;') || cur.includes('&amp%3B')) {
      cur = cur.replace(/&amp%3B/gi, '&amp;').replace(/&amp;/gi, '&');
    }
    return cur;
  }

  // Cleanly sets or removes a boolean imgix param (e.g. bg-remove, upscale),
  // leaving all other params untouched.
  function setImgixParam(url, param, enable) {
    if (!url) return url;
    url = cleanImgixUrl(url);
    try {
      const u = new URL(url);
      u.searchParams.delete(param);
      if (enable) u.searchParams.set(param, 'true');
      return u.toString();
    } catch (e) {
      const escaped = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let clean = url
        .replace(new RegExp(`[?&]${escaped}=(?:true|false)`, 'gi'), (m) => m[0] === '?' ? '?' : '')
        .replace(/\?&/, '?')
        .replace(/\?$/, '');
      if (enable) clean += (clean.includes('?') ? '&' : '?') + `${param}=true`;
      return clean;
    }
  }
  // Convenience wrappers kept for clarity
  function toggleImgixBgRemove(url, on) { return setImgixParam(url, 'bg-remove', on); }
  function toggleImgixUpscale(url, on)   { return setImgixParam(url, 'upscale', on); }

  // Rebuild a canonical, clean _cartImg URL from scratch.
  // Strips corruption, removes display-only params (q, h, w), keeps only standard imgix params.
  const S3_HOST = 'ninja-services-production-ninjauploadss3bucket-zks2mguobhe4.s3.amazonaws.com';
  const IMGIX_HOST = 'ninjauploads-production.imgix.net';
  function buildCleanCartImgUrl(cartImg, uploadUrl, bgRemove, upscale) {
    // Derive base (domain + path, no params) from cartImg or fallback to uploadUrl
    let base = '';
    if (cartImg) {
      try {
        const u = new URL(cleanImgixUrl(cartImg));
        base = u.origin + u.pathname;
      } catch(e) {}
    }
    if (!base && uploadUrl) {
      base = uploadUrl.split('?')[0].replace(S3_HOST, IMGIX_HOST);
    }
    if (!base) return cartImg || '';
    try {
      const u = new URL(base);
      u.searchParams.set('trim', 'colorUnlessAlpha');
      u.searchParams.set('fm', 'png');
      if (bgRemove) u.searchParams.set('bg-remove', 'true');
      if (upscale)  u.searchParams.set('upscale', 'true');
      return u.toString();
    } catch(e) {
      return cartImg || '';
    }
  }

  /* ─── DISCOUNT TIER PARSING ─── */
  function parseDiscountTiers(encodedInput) {
    if (!encodedInput) return [];
    try {
      let decoded = decodeURIComponent(decodeURIComponent(decodeURIComponent(encodedInput)));
      const entries = decoded.split('#').filter(Boolean);
      const raw = entries.map(entry => {
        const parts = entry.split('-');
        const minPart = parts[0] || '';
        const offPart = parts[1] || '';
        const min = parseInt(minPart.replace(/[^0-9]/g, ''), 10) || 0;
        const pct = parseInt(offPart.replace(/[^0-9]/g, ''), 10) || 0;
        return { min, pct };
      }).sort((a, b) => a.min - b.min);

      // Filter anomalous tiers: percentages must increase with min qty.
      // Build from highest tier down, only keeping entries with strictly lower pct.
      // e.g. "min_1-off_50" is anomalous when followed by "min_15-off_20".
      const cleaned = [];
      for (let i = raw.length - 1; i >= 0; i--) {
        if (cleaned.length === 0 || raw[i].pct < cleaned[0].pct) {
          cleaned.unshift(raw[i]);
        }
      }
      return cleaned;
    } catch (e) {
      console.warn('[DesignCards] Failed to parse discount tiers:', e);
      return [];
    }
  }

  function getCurrentTier(tiers, totalQty) {
    let current = { min: 0, pct: 0 };
    for (const tier of tiers) {
      if (totalQty >= tier.min) current = tier;
      else break;
    }
    return current;
  }

  function getNextTier(tiers, totalQty) {
    for (const tier of tiers) {
      if (tier.min > totalQty) return tier;
    }
    return null;
  }

  /* ─── VARIANT LOOKUP ─── */
  function findVariantForSquareInches(variants, sqIn) {
    // Variant titles are like "Style #1-9", "Style #10-19", etc.
    // Use regex to extract the two numbers from range-style titles
    for (const v of variants) {
      if (!v.title || !v.available) continue;
      const rangeMatch = v.title.match(/(\d+)\s*-\s*(\d+)/);
      if (rangeMatch) {
        const lo = parseInt(rangeMatch[1], 10);
        const hi = parseInt(rangeMatch[2], 10);
        if (sqIn >= lo && sqIn <= hi) return v;
      }
    }
    return null;
  }

  /* ─── DESIGN CARD CONTROLLER (Custom Element) ─── */
  class DesignCardController extends HTMLElement {
    connectedCallback() {
      this.init();
    }

    init() {
      this._editStates = {}; // cardIndex -> snapshot of items
      this.bindEvents();
      // Fetch cart prices so strikethrough works for cart-level discounts
      refreshCartPriceMap().then(() => {
        this.querySelectorAll('.design-card').forEach(c => {
          const row = c.querySelector('.dc-size-row');
          if (row) this.optimisticPriceUpdate(row, parseInt(row.dataset.quantity) || 0);
        });
      });
      this.updateDiscountBanner();
    }

    /* ── Event Delegation ── */
    bindEvents() {
      // Remove old listener if re-initializing
      if (this._clickHandler) {
        this.removeEventListener('click', this._clickHandler);
      }
      if (this._inputHandler) {
        this.removeEventListener('input', this._inputHandler);
      }
      if (this._changeHandler) {
        this.removeEventListener('change', this._changeHandler);
      }

      this._clickHandler = (e) => this.handleClick(e);
      this._inputHandler = (e) => this.handleInput(e);
      this._changeHandler = (e) => this.handleChange(e);

      this.addEventListener('click', this._clickHandler);
      this.addEventListener('input', this._inputHandler);
      this.addEventListener('change', this._changeHandler);

      // Detect smart-sized rows and add labels
      this.detectSmartSizing();

      // Lightbox events (outside this element)
      this.bindLightbox();
    }

    handleClick(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      const action = btn.dataset.action;
      const card = btn.closest('.design-card');
      const row = btn.closest('.dc-size-row, .dc-edit-row');

      switch (action) {
        case 'qty-minus': this.changeQty(row, -1); break;
        case 'qty-plus': this.changeQty(row, 1); break;
        case 'delete-row': this.deleteRow(card, row); break;
        case 'show-confirm-delete': this.showConfirmDelete(card); break;
        case 'hide-confirm-delete': this.hideConfirmDelete(card); break;
        case 'remove-design': this.removeDesign(card); break;
        // Old global edit mode removed — per-row inline edit replaces it
        case 'toggle-add-size': this.toggleAddSize(card); break;
        case 'cancel-add-size': this.cancelAddSize(card); break;
        case 'confirm-add-size': this.confirmAddSize(card); break;
        case 'toggle-popular-sizes': this.togglePopularSizes(card); break;
        case 'toggle-size-mode': this.toggleSizeMode(card, btn); break;
        case 'toggle-size-mode-edit': this.toggleSizeModeEdit(row, btn); break;
        case 'edit-row': this.editRow(card, row); break;
        case 'save-edit-row': this.saveEditRow(card, row); break;
        case 'cancel-edit-row': this.cancelEditRow(card, row); break;
        case 'dim-minus': this.dimStep(btn, -0.25); break;
        case 'dim-plus': this.dimStep(btn, 0.25); break;
        case 'open-lightbox': this.openLightbox(card); break;
      }
    }

    handleInput(e) {
      const card = e.target.closest('.design-card');
      if (!card) return;

      // Aspect ratio sync for dimension inputs (edit mode & add mode)
      if (e.target.matches('.dc-dim-stepper-input') && !e.target.closest('.dc-qty-wrap')) {
        this.syncPairedDimension(e.target, card);
      }

      // Add-size dimension/qty inputs → update preview
      if (e.target.matches('[data-add-width], [data-add-height]')) {
        this.updateAddPreview(card);
      }
      if (e.target.matches('[data-add-qty]')) {
        const addRow = e.target.closest('.dc-add-row');
        if (addRow && addRow.dataset.addMode === 'options') {
          this.updateAddPreviewOptions(card);
        } else {
          this.updateAddPreview(card);
        }
      }

      // Inline edit panel — dimension or qty changed
      if (e.target.matches('[data-edit-width], [data-edit-height], [data-edit-qty]')) {
        const sizeRow = e.target.closest('.dc-size-row');
        if (sizeRow) {
          this.updateInlineEditPrices(card, sizeRow);
        }
      }

      // Normal-mode qty typed input → debounced update
      if (e.target.matches('.dc-qty-num')) {
        this.handleQtyTyped(e.target);
      }
    }

    handleQtyTyped(input) {
      const row = input.closest('.dc-size-row');
      if (!row) return;
      const val = Math.max(1, parseInt(input.value) || 1);
      row.dataset.quantity = String(val);
      const minusBtn = row.querySelector('[data-action="qty-minus"]');
      if (minusBtn) minusBtn.disabled = val <= 1;

      // Optimistic price update
      this.quickRowTotal(row, val);

      // Debounced server sync
      if (!this._qtyTimers) this._qtyTimers = {};
      const rowId = row.dataset.lineKey;
      clearTimeout(this._qtyTimers[rowId]);
      this._qtyTimers[rowId] = setTimeout(async () => {
        const finalQty = Math.max(1, parseInt(input.value) || 1);
        input.value = finalQty;
        await cartChange(row.dataset.lineKey, finalQty);
        await fullCartRefresh();
      }, 400);
    }

    handleChange(e) {
      const card = e.target.closest('.design-card');
      if (!card) return;

      // Popular sizes dropdown (add mode)
      if (e.target.matches('[data-popular-select]')) {
        this.applyPopularSize(card, e.target.value);
      }

      // Popular sizes dropdown (inline edit mode)
      if (e.target.matches('[data-popular-select-edit]')) {
        const row = e.target.closest('.dc-size-row');
        this.applyPopularSizeEdit(card, row, e.target.value);
      }

      // Multi-option dropdowns (puff transfers etc.)
      if (e.target.matches('[data-add-opt1], [data-add-opt2]')) {
        this.updateAddPreviewOptions(card);
      }
    }

    /* ── Quantity Change (Normal Mode) — optimistic UI, debounced server sync ── */
    changeQty(row, delta) {
      if (!row) return;
      const currentQty = parseInt(row.dataset.quantity) || 1;
      const newQty = Math.max(1, currentQty + delta);
      if (newQty === currentQty) return;

      // ── Instant: update UI before any network call ──
      const qtyNum = row.querySelector('.dc-qty-num');
      if (qtyNum) { qtyNum.value = newQty; qtyNum.textContent = newQty; }
      row.dataset.quantity = String(newQty);
      const minusBtn = row.querySelector('[data-action="qty-minus"]');
      if (minusBtn) minusBtn.disabled = newQty <= 1;

      // Optimistic price update — no skeleton, instant feedback
      this.quickRowTotal(row, newQty);

      // Mark row as having a pending update (morph won't overwrite qty)
      row.dataset.qtyPending = 'true';

      // ── Debounced: batch rapid clicks into one server call ──
      if (!this._qtyTimers) this._qtyTimers = {};
      const rowId = row.dataset.lineKey;
      clearTimeout(this._qtyTimers[rowId]);
      this._qtyTimers[rowId] = setTimeout(async () => {
        const finalQty = parseInt(row.dataset.quantity) || 1;
        const finalKey = row.dataset.lineKey;
        await cartChange(finalKey, finalQty);
        delete row.dataset.qtyPending;
        await fullCartRefresh();
      }, 250);
    }

    /* ── Quick row + header total (no tier calc, just ea × qty) ── */
    quickRowTotal(row, qty) {
      const card = row.closest('.design-card');
      if (!card) return;

      // Row total = ea price × qty
      const priceEaEl = row.querySelector('.dc-price-ea');
      const totalEl = row.querySelector('.dc-row-total');
      if (priceEaEl && totalEl) {
        const discEl = priceEaEl.querySelector('.disc-price');
        const raw = (discEl || priceEaEl).textContent;
        const eaCents = Math.round(parseFloat(raw.replace(/[^0-9.-]/g, '')) * 100) || 0;
        totalEl.textContent = money(eaCents * qty);
      }

      // Header total = sum of all row totals
      const rows = [...card.querySelectorAll('.dc-size-row')];
      let cardTotal = 0, totalPcs = 0;
      rows.forEach(r => {
        totalPcs += parseInt(r.dataset.quantity) || 0;
        const t = r.querySelector('.dc-row-total');
        if (t) cardTotal += Math.round(parseFloat(t.textContent.replace(/[^0-9.-]/g, '')) * 100) || 0;
      });
      const mainPrice = card.querySelector('.dc-price-main .money') || card.querySelector('.dc-total-price');
      if (mainPrice) mainPrice.textContent = money(cardTotal);
      const metaLines = card.querySelectorAll('.dc-price-line');
      const metaTarget = card.querySelector('.dc-meta') || (metaLines.length > 0 ? metaLines[metaLines.length - 1] : null);
      if (metaTarget) metaTarget.textContent = `${rows.length} size${rows.length !== 1 ? 's' : ''} \u00b7 ${totalPcs} pcs`;

      // Section-wide total for tier calc + banner
      let secTotal = 0;
      this.querySelectorAll('.dc-size-row').forEach(r => {
        secTotal += parseInt(r.dataset.quantity) || 0;
      });

      // Update ALL row badges + header badges using tier %
      this.querySelectorAll('.design-card').forEach(c => {
        const jsonEl = c.querySelector('.dc-variant-data');
        if (!jsonEl) return;
        try {
          const cd = JSON.parse(jsonEl.textContent);
          const tiers = parseDiscountTiers(cd.discount_input);
          const tier = getCurrentTier(tiers, secTotal);
          // Row badges
          c.querySelectorAll('.dc-size-row .dc-disc-badge').forEach(badge => {
            badge.textContent = tier.pct > 0 ? `${tier.pct}% off` : '';
          });
          // Header badge
          const headerDisc = c.querySelector('.dc-price-disc');
          if (headerDisc && tier.pct > 0) headerDisc.textContent = `${tier.pct}% off`;
        } catch(e) {}
      });

      // Banner + section label
      this.updateDiscountBanner();
      const sectionLabel = this.querySelector('.dc-section-count');
      if (sectionLabel) {
        const designCount = this.querySelectorAll('.design-card').length;
        sectionLabel.textContent = `${designCount} design${designCount !== 1 ? 's' : ''}\u00b7 ${secTotal} pcs`;
      }
    }

    /* ── Instant client-side price recalc after qty change ── */
    optimisticPriceUpdate(changedRow, newQty) {
      const card = changedRow.closest('.design-card');
      if (!card) return;
      const jsonEl = card.querySelector('.dc-variant-data');
      if (!jsonEl) return;

      try {
        const cardData = JSON.parse(jsonEl.textContent);
        const tiers = parseDiscountTiers(cardData.discount_input);
        const variants = cardData.variants || [];

        // Section-wide total: all items in ALL cards share the same discount pool
        const rows = [...card.querySelectorAll('.dc-size-row')];
        let sectionTotalQty = 0;
        this.querySelectorAll('.dc-size-row').forEach(r => {
          sectionTotalQty += parseInt(r.dataset.quantity) || 0;
        });

        const tier = getCurrentTier(tiers, sectionTotalQty);
        const discPct = tier.pct / 100;

        // Update each row in this card
        let cardTotalOrig = 0, cardTotalDisc = 0;
        rows.forEach(r => {
          const qty = parseInt(r.dataset.quantity) || 0;
          const w = parseFloat(r.dataset.width) || 0;
          const h = parseFloat(r.dataset.height) || 0;
          const sqIn = Math.ceil(w * h);
          const variant = findVariantForSquareInches(variants, sqIn);
          const basePrice = variant ? variant.price : 0;

          const lineOrig = basePrice * qty;
          const lineDisc = discPct > 0 ? Math.round(lineOrig * (1 - discPct)) : lineOrig;
          const discPriceEa = qty > 0 ? Math.floor(lineDisc / qty) : 0;

          // Patch row DOM
          const priceEaEl = r.querySelector('.dc-price-ea');
          const totalEl = r.querySelector('.dc-row-total');
          const badgeEl = r.querySelector('.dc-disc-badge');

          // Check cart-level discount (automatic discounts, codes, scripts)
          const vid = r.dataset.variantId || (variant && String(variant.id));
          const cartUnitPrice = vid ? _cartPriceMap.get(vid) : undefined;
          const hasCartDiscount = cartUnitPrice !== undefined && cartUnitPrice < basePrice;

          // Use the lower of tier-discounted or cart-discounted price
          let finalEa = discPriceEa;
          let finalLine = lineDisc;
          let showStrike = discPct > 0 && discPriceEa < basePrice;

          if (hasCartDiscount && (!showStrike || cartUnitPrice < discPriceEa)) {
            finalEa = cartUnitPrice;
            finalLine = cartUnitPrice * qty;
            showStrike = true;
          }

          cardTotalOrig += lineOrig;
          cardTotalDisc += finalLine;

          if (priceEaEl) {
            if (showStrike) {
              priceEaEl.innerHTML = `<s>${money(basePrice)}</s> <span class="disc-price">${money(finalEa)}</span> <span class="ea-suffix">ea</span>`;
            } else {
              priceEaEl.innerHTML = `${money(basePrice)} <span class="ea-suffix">ea</span>`;
            }
          }
          if (totalEl) totalEl.textContent = money(finalLine);
          // Show clean tier % (not per-unit rounding)
          if (badgeEl) {
            badgeEl.textContent = tier.pct > 0 ? `${tier.pct}% off` : '';
          }
        });

        // Patch header price block
        const priceBlock = card.querySelector('.dc-price-block');
        if (priceBlock) {
          const mainPrice = priceBlock.querySelector('.dc-total-price');
          const origPrice = priceBlock.querySelector('.dc-orig-price');
          const discBadge = priceBlock.querySelector('.dc-header-disc');
          const _pbMetaLines = priceBlock.querySelectorAll('.dc-price-line');
          const metaLine = priceBlock.querySelector('.dc-meta') || (_pbMetaLines.length > 0 ? _pbMetaLines[_pbMetaLines.length - 1] : null);

          if (mainPrice) mainPrice.textContent = money(cardTotalDisc);
          // Use tier % for header badge too
          const headerPct = tier.pct > 0 ? tier.pct : (cardTotalOrig > 0 ? Math.round((1 - cardTotalDisc / cardTotalOrig) * 100) : 0);
          if (origPrice) {
            origPrice.textContent = headerPct > 0 ? money(cardTotalOrig) : '';
          }
          if (discBadge) {
            discBadge.textContent = headerPct > 0 ? `${headerPct}% off` : '';
            discBadge.style.display = headerPct > 0 ? '' : 'none';
          }
          if (metaLine) {
            const totalPcs = rows.reduce((s, r) => s + (parseInt(r.dataset.quantity) || 0), 0);
            metaLine.textContent = `${rows.length} size${rows.length !== 1 ? 's' : ''} \u00b7 ${totalPcs} pcs`;
          }
        }

        // Update discount banner with section-wide total
        this.updateDiscountBanner();

        // Update section label (e.g. "2 designs · 172 pcs")
        const sectionLabel = this.querySelector('.dc-section-meta');
        if (sectionLabel) {
          let secTotal = 0;
          this.querySelectorAll('.dc-size-row').forEach(r => {
            secTotal += parseInt(r.dataset.quantity) || 0;
          });
          const designCount = this.querySelectorAll('.design-card').length;
          sectionLabel.textContent = `${designCount} design${designCount !== 1 ? 's' : ''}\u00b7 ${secTotal} pcs`;
        }
      } catch (e) {
        // Fail silently — server patch will correct
      }
    }

    /* ── Full cart refresh with skeleton — replaces all prices across all controllers ── */
    async patchFromServer() {
      // Don't refresh while lightbox or edit mode is open
      const lb = $('#dc-lightbox');
      if (lb && lb.classList.contains('open')) return;
      if (this.querySelector('.dc-edit-row')) return;
      await fullCartRefresh();
    }

    /* ── Patch from an already-fetched doc (called by other controllers) ── */
    patchFromDoc(doc) {
      const newCards = [...doc.querySelectorAll('.design-card')];
      const oldCards = [...this.querySelectorAll('.design-card')];
      newCards.forEach((nc, i) => {
        const oc = oldCards[i];
        if (!oc) return;
        const np = nc.querySelector('.dc-price-block');
        const op = oc.querySelector('.dc-price-block');
        if (np && op) op.innerHTML = np.innerHTML;
        const nRows = [...nc.querySelectorAll('.dc-size-row')];
        const oRows = [...oc.querySelectorAll('.dc-size-row')];
        nRows.forEach((nr, j) => {
          const or2 = oRows[j];
          if (!or2) return;
          ['.dc-price-ea', '.dc-row-total', '.dc-disc-badge'].forEach(sel => {
            const ne = nr.querySelector(sel);
            const oe = or2.querySelector(sel);
            if (ne && oe) oe.innerHTML = ne.innerHTML;
          });
          const nq = nr.querySelector('.dc-qty-num');
          const oq = or2.querySelector('.dc-qty-num');
          if (nq && oq) { oq.value = nq.value || nq.textContent; }
          or2.dataset.quantity = nr.dataset.quantity;
          or2.dataset.lineKey = nr.dataset.lineKey;
        });
      });
      this.updateDiscountBanner();
    }

    /* ── Delete Single Row ── */
    async deleteRow(card, row) {
      if (!card || !row) return;
      startLoading(row);

      // API removal
      const rows = $$('.dc-size-row', card);
      const lineKey = row.dataset.lineKey;

      // If this is the last row, show confirm-delete for entire design
      if (rows.length <= 1) {
        this.showConfirmDelete(card);
        return;
      }

      // Show skeleton immediately, then animate row out
      showCartSkeleton();
      row.classList.add('removing');
      await new Promise(r => setTimeout(r, 300));

      await cartChange(lineKey, 0);
      showToast('✓', 'Size removed');
      await fullCartRefresh();
    }

    /* ── Confirm Delete Panel ── */
    showConfirmDelete(card) {
      const panel = card.querySelector('[data-confirm-panel]');
      if (panel) panel.classList.add('show');
    }

    hideConfirmDelete(card) {
      const panel = card.querySelector('[data-confirm-panel]');
      if (panel) panel.classList.remove('show');
    }

    /* ── Remove Entire Design + Undo ── */
    async removeDesign(card) {
      const cardData = this.getCardData(card);
      if (!cardData) return;
      showCartSkeleton();

      // Store items for undo
      const removedItems = cardData.items.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        properties: item.properties
      }));

      // Batch remove
      const updates = {};
      cardData.items.forEach(item => { updates[item.key] = 0; });

      await cartUpdate(updates);

      showToast('✓', 'Design removed', async () => {
        // Undo: re-add all items
        const items = removedItems.map(item => ({
          id: item.variant_id,
          quantity: item.quantity,
          properties: item.properties
        }));
        await cartAdd(items);
        showToast('✓', 'Design restored');
        await fullCartRefresh();
      });

      await fullCartRefresh();
    }


    /* ── Real-time price update for all edit rows (matches prototype pp2/udqE) ── */
    /* Get per-product total qty from controller (falls back to combined total) */
    getProductTotalQty(card) {
      // All items in the section share the same discount pool
      // Sum qty from ALL size rows across ALL cards in this controller
      let total = 0;
      this.querySelectorAll('.dc-size-row').forEach(r => {
        total += parseInt(r.dataset.quantity) || 0;
      });
      return total || parseInt(this.dataset.bysizeTotalQty) || 0;
    }

    /* ── Dimension Stepper ── */
    dimStep(btn, delta) {
      const targetName = btn.dataset.target;
      if (!targetName) return;

      const card = btn.closest('.design-card');
      if (!card) return;
      const limits = this.getProductLimits(card);

      // Try sibling approach first (most reliable — always scoped to correct stepper)
      const stepper = btn.closest('.dc-dim-stepper') || btn.closest('.dc-qty-wrap');
      const sibInput = stepper?.querySelector('input');

      // Fallback: find by data attribute within the card (not the whole controller)
      const input = card.querySelector(`[data-${targetName}]`) ||
                    card.querySelector(`[data-edit-w="${targetName.replace('edit-w-', '')}"]`) ||
                    card.querySelector(`[data-edit-h="${targetName.replace('edit-h-', '')}"]`) ||
                    card.querySelector(`[data-edit-q="${targetName.replace('edit-q-', '')}"]`);

      const actualInput = sibInput || input;
      if (!actualInput) return;

      const isQty = targetName.includes('edit-q') || actualInput.matches('[data-add-qty]');
      const current = parseFloat(actualInput.value) || 0;

      if (isQty) {
        const step = delta > 0 ? 1 : -1;
        actualInput.value = Math.max(1, Math.round(current) + step);
      } else {
        const minDim = limits.minDim;
        const maxDim = limits.maxDim;
        const rounded = Math.round(current * 4) / 4;
        const newVal = rounded + delta;
        if (newVal < minDim && delta < 0) {
          actualInput.value = minDim.toFixed(2);
        } else if (newVal > maxDim && delta > 0) {
          actualInput.value = maxDim.toFixed(2);
        } else if (current < minDim && delta > 0) {
          actualInput.value = minDim.toFixed(2);
        } else {
          actualInput.value = Math.max(minDim, Math.min(maxDim, newVal)).toFixed(2);
        }
      }

      actualInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /* ── Add Size ── */
    toggleAddSize(card) {
      const form = card.querySelector('[data-add-size-form]');
      if (!form) return;

      // Pre-populate from last size row when opening
      if (!form.classList.contains('open')) {
        const rows = $$('.dc-size-row', card);
        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          const w = lastRow.dataset.width;
          const h = lastRow.dataset.height;
          const wInput = card.querySelector('[data-add-width]');
          const hInput = card.querySelector('[data-add-height]');
          if (wInput && w) wInput.value = parseFloat(w).toFixed(2);
          if (hInput && h) hInput.value = parseFloat(h).toFixed(2);
          this.updateAddPreview(card);
        }
      }

      const isOpen = form.classList.toggle('open');
      const trigger = card.querySelector('[data-action="toggle-add-size"]');
      if (trigger) trigger.textContent = isOpen ? 'Adding a new size' : '+ Add a size';

      // Focus treatment — dim size rows
      if (isOpen) {
        card.classList.add('dc-adding');
      } else {
        card.classList.remove('dc-adding');
      }
    }

    cancelAddSize(card) {
      const form = card.querySelector('[data-add-size-form]');
      if (form) form.classList.remove('open');
      const popDD = card.querySelector('[data-popular-dropdown]');
      if (popDD) popDD.classList.remove('open');
      const trigger = card.querySelector('[data-action="toggle-add-size"]');
      if (trigger) trigger.textContent = '+ Add a size';

      // Remove focus treatment
      card.classList.remove('dc-adding');

      // Restore banner to actual qty
      const ctrl = card.closest('design-card-controller');
      if (ctrl && ctrl.updateDiscountBanner) ctrl.updateDiscountBanner();
    }

    // togglePopularSizes removed — replaced by toggleSizeMode

    toggleSizeMode(card, btn) {
      const customView = card.querySelector('[data-add-view="custom"]');
      const popularView = card.querySelector('[data-add-view="popular"]');
      if (!customView || !popularView) return;

      const smartLabel = card.querySelector('.dc-smart-label-add');
      const currentMode = btn.dataset.mode;
      if (currentMode === 'custom') {
        // Switch to popular sizes
        customView.style.display = 'none';
        popularView.style.display = 'flex';
        btn.dataset.mode = 'popular';
        btn.textContent = 'Custom size';
        // Re-show smart label if a popular size was selected
        if (smartLabel && smartLabel.dataset.active === 'true') smartLabel.style.display = '';
      } else {
        // Switch to custom dimensions
        popularView.style.display = 'none';
        customView.style.display = 'flex';
        btn.dataset.mode = 'custom';
        btn.textContent = 'Choose a popular size';
        // Hide smart label when in custom mode
        if (smartLabel) smartLabel.style.display = 'none';
      }
    }

    /* ── Per-Row Inline Edit ── */
    editRow(card, row) {
      if (!row) return;
      // Close any other row that's currently being edited
      card.querySelectorAll('.dc-size-row.dc-row-editing').forEach(r => {
        if (r !== row) this.cancelEditRow(card, r);
      });

      // Save original state for cancel
      row._editOriginal = {
        width: row.dataset.width,
        height: row.dataset.height,
        quantity: row.dataset.quantity,
        lineKey: row.dataset.lineKey,
        variantId: row.dataset.variantId
      };

      // Show the edit panel, hide normal content
      row.classList.add('dc-row-editing');
      const panel = row.querySelector('[data-edit-panel]');
      if (panel) panel.style.display = '';

      // Change size label text to "Editing size"
      const sizeLabel = row.querySelector('.dc-size-label span');
      if (sizeLabel) {
        sizeLabel._originalText = sizeLabel.textContent;
        sizeLabel.textContent = 'Editing size';
      }

      // Dim other rows — add class on the card
      card.classList.add('dc-editing');
    }

    cancelEditRow(card, row) {
      if (!row) return;
      // Restore original values in the edit inputs
      const orig = row._editOriginal;
      if (orig) {
        const wInput = row.querySelector('[data-edit-width]');
        const hInput = row.querySelector('[data-edit-height]');
        const qInput = row.querySelector('[data-edit-qty]');
        if (wInput) wInput.value = orig.width;
        if (hInput) hInput.value = orig.height;
        if (qInput) qInput.value = orig.quantity;
      }
      // Hide the edit panel
      row.classList.remove('dc-row-editing');
      const panel = row.querySelector('[data-edit-panel]');
      if (panel) panel.style.display = 'none';
      // Reset popular select
      const popSelect = row.querySelector('[data-popular-select-edit]');
      if (popSelect) popSelect.selectedIndex = 0;
      // Reset toggle to custom
      const toggleBtn = row.querySelector('[data-action="toggle-size-mode-edit"]');
      if (toggleBtn) { toggleBtn.dataset.mode = 'custom'; toggleBtn.textContent = 'Choose a popular size'; }
      const customView = row.querySelector('[data-edit-view="custom"]');
      const popularView = row.querySelector('[data-edit-view="popular"]');
      if (customView) customView.style.display = 'flex';
      if (popularView) popularView.style.display = 'none';
      delete row._editOriginal;

      // Restore size label text
      const sizeLabel = row.querySelector('.dc-size-label span');
      if (sizeLabel && sizeLabel._originalText) {
        sizeLabel.textContent = sizeLabel._originalText;
        delete sizeLabel._originalText;
      }

      // Remove focus dim
      card.classList.remove('dc-editing');

      // Restore banner to actual qty
      const ctrl = card.closest('design-card-controller');
      if (ctrl && ctrl.updateDiscountBanner) ctrl.updateDiscountBanner();
    }

    async saveEditRow(card, row) {
      if (!row || !row._editOriginal) return;
      const orig = row._editOriginal;
      const cardData = this.getCardData(card);
      if (!cardData) return;

      const wInput = row.querySelector('[data-edit-width]');
      const hInput = row.querySelector('[data-edit-height]');
      const qInput = row.querySelector('[data-edit-qty]');

      const newW = parseFloat(wInput?.value) || parseFloat(orig.width);
      const newH = parseFloat(hInput?.value) || parseFloat(orig.height);
      const newQty = Math.max(1, parseInt(qInput?.value) || parseInt(orig.quantity));

      // Validate
      const limits = this.getProductLimits(card, cardData);
      const sqIn = Math.round(newW * newH);
      if (newW < limits.minDim || newH < limits.minDim) {
        showToast('⚠', `Minimum dimension is ${limits.minDim}"`);
        return;
      }
      if (sqIn < limits.minSqin || sqIn > limits.maxSqin) {
        showToast('⚠', `Size must be between ${limits.minSqin} and ${limits.maxSqin} sq in`);
        return;
      }

      const wChanged = Math.abs(newW - parseFloat(orig.width)) > 0.001;
      const hChanged = Math.abs(newH - parseFloat(orig.height)) > 0.001;
      const qChanged = newQty !== parseInt(orig.quantity);

      if (!wChanged && !hChanged && !qChanged) {
        this.cancelEditRow(card, row);
        return;
      }

      startLoading(card);
      showCartSkeleton();

      if (wChanged || hChanged) {
        // Dimensions changed — remove old + add new variant
        const variant = findVariantForSquareInches(cardData.variants, sqIn);
        if (!variant) {
          showToast('⚠', `No variant found for ${newW}" × ${newH}" (${sqIn} sq in)`);
          stopLoading(card);
          hideCartSkeleton();
          return;
        }

        // Get original line item's properties from cart
        const freshCart = await (await fetch('/cart.js', { headers: { 'Accept': 'application/json' } })).json();
        const origItem = freshCart.items.find(it => it.key === orig.lineKey);
        const newProps = origItem ? { ...origItem.properties } : {};
        newProps['width'] = String(newW);
        newProps['height'] = String(newH);
        newProps['_Size'] = newW + 'x' + newH;

        await cartUpdate({ [orig.lineKey]: 0 });
        const addResult = await cartAdd([{ id: variant.id, quantity: newQty, properties: newProps }]);

        // Update row in-place so it doesn't jump position
        const newItem = addResult?.items?.[0];
        if (newItem) {
          row.dataset.lineKey = newItem.key;
          row.dataset.variantId = String(newItem.variant_id);
        }
        row.dataset.width = String(newW);
        row.dataset.height = String(newH);
        row.dataset.quantity = String(newQty);
      } else {
        // Only qty changed
        await cartChange(orig.lineKey, newQty);
        row.dataset.quantity = String(newQty);
      }

      // Update the row display in-place (no reorder)
      const sizeLabel = row.querySelector('.dc-size-label span');
      if (sizeLabel) sizeLabel.textContent = `${newW}" × ${newH}"`;
      const qtyNum = row.querySelector('.dc-qty-num');
      if (qtyNum) qtyNum.value = newQty;

      // Close edit panel
      row.classList.remove('dc-row-editing');
      const panel = row.querySelector('[data-edit-panel]');
      if (panel) panel.style.display = 'none';
      delete row._editOriginal;
      card.classList.remove('dc-editing');

      showToast('✓', 'Size updated');

      // Background refresh to sync everything else (subtotal, banner, header)
      // but mark row to preserve its position
      row.dataset.qtyPending = 'true';
      await fullCartRefresh();
      delete row.dataset.qtyPending;
    }

    toggleSizeModeEdit(row, btn) {
      if (!row) return;
      const customView = row.querySelector('[data-edit-view="custom"]');
      const popularView = row.querySelector('[data-edit-view="popular"]');
      if (!customView || !popularView) return;

      const currentMode = btn.dataset.mode;
      if (currentMode === 'custom') {
        customView.style.display = 'none';
        popularView.style.display = 'flex';
        btn.dataset.mode = 'popular';
        btn.textContent = 'Custom size';
      } else {
        popularView.style.display = 'none';
        customView.style.display = 'flex';
        btn.dataset.mode = 'custom';
        btn.textContent = 'Choose a popular size';
      }
    }

    updateInlineEditPrices(card, sizeRow) {
      const cardData = this.getCardData(card);
      if (!cardData) return;

      const panel = sizeRow.querySelector('[data-edit-panel]');
      if (!panel) return;

      const wInput = panel.querySelector('[data-edit-width]');
      const hInput = panel.querySelector('[data-edit-height]');
      const qInput = panel.querySelector('[data-edit-qty]');

      const w = parseFloat(wInput?.value) || 0;
      const h = parseFloat(hInput?.value) || 0;
      const qty = Math.max(1, parseInt(qInput?.value) || 1);
      const sqIn = Math.round(w * h);

      if (!w || !h) return;

      // Calculate total qty across all sizes (current server qty, minus this row's original, plus edited)
      const origQty = parseInt(sizeRow.dataset.quantity) || 0;
      const totalQty = this.getProductTotalQty(card) - origQty + qty;

      // Get discount tier
      const tiers = parseDiscountTiers(cardData.discount_input);
      const currentTier = getCurrentTier(tiers, totalQty);
      const discPct = currentTier.pct / 100;

      // Find variant and price for edited dimensions
      const variant = findVariantForSquareInches(cardData.variants, sqIn);
      const basePrice = variant ? variant.price : 0;

      const lineOrig = basePrice * qty;
      const lineDisc = discPct > 0 ? Math.round(lineOrig * (1 - discPct)) : lineOrig;
      const discPriceEa = qty > 0 ? Math.floor(lineDisc / qty) : 0;

      // Check cart-level discount
      const vid = sizeRow.dataset.variantId || (variant && String(variant.id));
      const cartUnitPrice = vid ? _cartPriceMap.get(vid) : undefined;
      const hasCartDiscount = cartUnitPrice !== undefined && cartUnitPrice < basePrice;

      let finalEa = discPriceEa;
      let finalLine = lineDisc;
      let showStrike = discPct > 0;

      if (hasCartDiscount && (!showStrike || cartUnitPrice < discPriceEa)) {
        finalEa = cartUnitPrice;
        finalLine = cartUnitPrice * qty;
        showStrike = true;
      }

      // Update price ea
      const peEl = panel.querySelector('[data-edit-price-ea]');
      if (peEl) {
        if (showStrike) {
          peEl.innerHTML = `<s>${money(basePrice)}</s><span class="disc-price"> ${money(finalEa)}</span><span class="ea-suffix"> ea</span>`;
        } else {
          peEl.innerHTML = `<span>${money(basePrice)}</span><span class="ea-suffix"> ea</span>`;
        }
      }

      // Update row total
      const totEl = panel.querySelector('[data-edit-row-total]');
      if (totEl) totEl.textContent = money(finalLine);

      // Update disc badge
      const bdgEl = panel.querySelector('[data-edit-disc-badge]');
      if (bdgEl) bdgEl.textContent = discPct > 0 ? `${currentTier.pct}% off` : (hasCartDiscount ? 'discount' : '');

      // Update the discount banner using the controller's existing method
      // Temporarily override getProductTotalQty to factor in the edit
      const ctrl = card.closest('design-card-controller');
      if (ctrl && ctrl.updateDiscountBanner) {
        const origMethod = ctrl.getProductTotalQty;
        const editDelta = qty - origQty;
        ctrl.getProductTotalQty = function(c) { return origMethod.call(this, c) + editDelta; };
        ctrl.updateDiscountBanner();
        ctrl.getProductTotalQty = origMethod;
      }

      // Update all existing row prices to reflect projected tier
      const projectedQty = this.getProductTotalQty(card) + (qty - origQty);
      this.updateAllRowPricesForTier(projectedQty);
    }

    applyPopularSizeEdit(card, row, value) {
      if (!value || !row) return;
      const [bw, bh] = value.split(',').map(Number);
      const ar = this.getAspectRatio(card);

      let w, h;
      if (ar && ar > 0) {
        if (ar >= bw / bh) { w = bw; h = bw / ar; }
        else { h = bh; w = bh * ar; }
      } else {
        w = bw; h = bh;
      }

      const wInput = row.querySelector('[data-edit-width]');
      const hInput = row.querySelector('[data-edit-height]');
      if (wInput) wInput.value = w.toFixed(2);
      if (hInput) hInput.value = h.toFixed(2);

      // Reset all options to original labels, then update only the selected one
      const popSelect = row.querySelector('[data-popular-select-edit]');
      if (popSelect) {
        [...popSelect.options].forEach(opt => {
          if (opt.dataset.originalLabel) opt.textContent = opt.dataset.originalLabel;
        });
        const selectedOpt = popSelect.options[popSelect.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          if (!selectedOpt.dataset.originalLabel) selectedOpt.dataset.originalLabel = selectedOpt.textContent;
          const origLabel = selectedOpt.dataset.originalLabel;
          const descPart = origLabel.replace(/^[^–-]*[–-]\s*/, '').trim();
          const wD = w % 1 === 0 ? w.toFixed(0) : w.toFixed(2);
          const hD = h % 1 === 0 ? h.toFixed(0) : h.toFixed(2);
          selectedOpt.textContent = `${wD}" x ${hD}" – ${descPart}`;
        }
      }

      // Update prices for the new dimensions
      const sizeRow = row.closest('.dc-size-row');
      if (sizeRow) this.updateInlineEditPrices(card, sizeRow);
    }

    applyPopularSize(card, value) {
      if (!value) return;
      const [bw, bh] = value.split(',').map(Number);
      const ar = this.getAspectRatio(card);
      let smartSized = false;

      let w, h;
      if (ar && ar > 0) {
        // Fit design within bounding box while maintaining aspect ratio
        if (ar >= bw / bh) {
          w = bw; h = bw / ar;
        } else {
          h = bh; w = bh * ar;
        }
        // Check if proportional scaling was applied (dimensions differ from box)
        if (Math.abs(w - bw) > 0.01 || Math.abs(h - bh) > 0.01) smartSized = true;
      } else {
        w = bw; h = bh;
      }

      const wInput = card.querySelector('[data-add-width]');
      const hInput = card.querySelector('[data-add-height]');
      if (wInput) wInput.value = w.toFixed(2);
      if (hInput) hInput.value = h.toFixed(2);

      // Reset all options to original labels, then update only the selected one
      const popSelect = card.querySelector('[data-popular-select]');
      if (popSelect) {
        [...popSelect.options].forEach(opt => {
          if (opt.dataset.originalLabel) opt.textContent = opt.dataset.originalLabel;
        });
        const selectedOpt = popSelect.options[popSelect.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          if (!selectedOpt.dataset.originalLabel) {
            selectedOpt.dataset.originalLabel = selectedOpt.textContent;
          }
          const origLabel = selectedOpt.dataset.originalLabel;
          const descPart = origLabel.replace(/^[^–-]*[–-]\s*/, '').trim();
          const wDisplay = w % 1 === 0 ? w.toFixed(0) : w.toFixed(2);
          const hDisplay = h % 1 === 0 ? h.toFixed(0) : h.toFixed(2);
          selectedOpt.textContent = `${wDisplay}" x ${hDisplay}" – ${descPart}`;
        }
      }

      // Show/hide "Smart Sizing Applied" label — placed below the add row
      const addRow = card.querySelector('.dc-add-row');
      let smartLabel = addRow?.parentElement?.querySelector('.dc-smart-label-add');
      if (smartSized) {
        if (!smartLabel && addRow) {
          smartLabel = document.createElement('div');
          smartLabel.className = 'dc-smart-label dc-smart-label-add';
          smartLabel.innerHTML = 'Smart Sizing Applied <span class="dc-smart-info" title="We scale your design to the maximum width or height of the selected print area, resized proportionally to maintain its original shape.">ℹ</span>';
          addRow.insertAdjacentElement('afterend', smartLabel);
        }
        if (smartLabel) { smartLabel.style.display = ''; smartLabel.dataset.active = 'true'; }
      } else if (smartLabel) {
        smartLabel.style.display = 'none';
        smartLabel.dataset.active = 'false';
      }

      this.updateAddPreview(card);
    }

    detectSmartSizing() {
      this.querySelectorAll('.design-card').forEach(card => {
        // Collect popular size boxes from the dropdown
        const popSelect = card.querySelector('[data-popular-select]');
        if (!popSelect) return;
        const boxes = [];
        popSelect.querySelectorAll('option[value]').forEach(opt => {
          const v = opt.value;
          if (!v) return;
          const [bw, bh] = v.split(',').map(Number);
          if (bw && bh) boxes.push({ w: bw, h: bh });
        });
        if (!boxes.length) return;

        // Check each size row
        card.querySelectorAll('.dc-size-row').forEach(row => {
          const rw = parseFloat(row.dataset.width);
          const rh = parseFloat(row.dataset.height);
          if (!rw || !rh) return;

          // Check if this row fits within a popular size box
          // (one dimension matches the box edge, the other is smaller)
          const tolerance = 0.02;
          let isSmartSized = false;
          for (const box of boxes) {
            const wMatch = Math.abs(rw - box.w) < tolerance && rh < box.h - tolerance;
            const hMatch = Math.abs(rh - box.h) < tolerance && rw < box.w - tolerance;
            if (wMatch || hMatch) {
              isSmartSized = true;
              break;
            }
          }

          if (isSmartSized) {
            const sizeCell = row.querySelector('.dc-size-dims');
            if (sizeCell && !sizeCell.querySelector('.dc-smart-label')) {
              const label = document.createElement('div');
              label.className = 'dc-smart-label';
              label.innerHTML = 'Smart Sizing Applied <span class="dc-smart-info" title="Your design was scaled proportionally to fit within the selected print area while maintaining its original shape.">ℹ</span>';
              sizeCell.appendChild(label);
            }
          }
        });
      });
    }

    updateAddPreview(card) {
      const wInput = card.querySelector('[data-add-width]');
      const hInput = card.querySelector('[data-add-height]');
      const qInput = card.querySelector('[data-add-qty]');
      const preview = card.querySelector('[data-add-preview]');
      const priceEaEl = card.querySelector('[data-add-price-ea]');
      const totalEl = card.querySelector('[data-add-total]');
      const badgeEl = card.querySelector('[data-add-badge]');

      const w = parseFloat(wInput?.value);
      const h = parseFloat(hInput?.value);
      const qty = Math.max(1, parseInt(qInput?.value) || 1);

      const clearCells = () => {
        if (priceEaEl) priceEaEl.innerHTML = '<span class="ea-suffix">—</span>';
        if (totalEl) totalEl.textContent = '—';
        if (badgeEl) badgeEl.textContent = '';
        if (preview) preview.innerHTML = '';
      };

      if (!w || !h) { clearCells(); setAddRowEnabled(card, false); return; }

      const cardData = this.getCardData(card);
      if (!cardData) return;
      const limits = this.getProductLimits(card, cardData);
      const sqIn = Math.round(w * h);

      if (w < limits.minDim || h < limits.minDim) {
        clearCells(); setAddRowEnabled(card, false);
        if (preview) preview.innerHTML = `<span style="color:#e11d48;">Minimum dimension is ${limits.minDim}"</span>`;
        return;
      }
      if (sqIn < limits.minSqin) {
        clearCells(); setAddRowEnabled(card, false);
        if (preview) preview.innerHTML = `<span style="color:#e11d48;">Too small — minimum ${limits.minSqin} sq in</span>`;
        return;
      }
      if (sqIn > limits.maxSqin) {
        clearCells(); setAddRowEnabled(card, false);
        if (preview) preview.innerHTML = `<span style="color:#e11d48;">Too large — max ${limits.maxDim}" × ${limits.maxDim}" (${limits.maxSqin} sq in)</span>`;
        return;
      }

      const variant = findVariantForSquareInches(cardData.variants, sqIn);
      if (!variant) {
        clearCells(); setAddRowEnabled(card, false);
        if (preview) preview.textContent = 'Size currently unavailable';
        return;
      }

      setAddRowEnabled(card, true);

      const basePrice = variant.price;
      const totalQty = this.getProductTotalQty(card);
      const tiers = parseDiscountTiers(cardData.discount_input);
      const projectedQty = totalQty + qty;
      const projectedTier = getCurrentTier(tiers, projectedQty);
      const nextTier = getNextTier(tiers, projectedQty);

      // Line-level rounding to match Shopify
      const lineOrig = basePrice * qty;
      const discFrac = projectedTier.pct / 100;

      if (projectedTier.pct > 0) {
        const lineDisc = Math.round(lineOrig * (1 - discFrac));
        const discPriceEa = qty > 0 ? Math.floor(lineDisc / qty) : 0;
        if (priceEaEl) priceEaEl.innerHTML = `<s>${money(basePrice)}</s><span class="disc-price">${money(discPriceEa)}</span><span class="ea-suffix"> ea</span>`;
        if (totalEl) totalEl.textContent = money(lineDisc);
        if (badgeEl) badgeEl.textContent = `${projectedTier.pct}% off`;
        if (preview && nextTier) {
          const moreNeeded = nextTier.min - projectedQty;
          preview.innerHTML = `add ${moreNeeded} more for ${nextTier.pct}% off`;
        } else if (preview) { preview.innerHTML = ''; }
      } else {
        if (priceEaEl) priceEaEl.innerHTML = `<span>${money(basePrice)}</span><span class="ea-suffix"> ea</span>`;
        if (totalEl) totalEl.textContent = money(lineOrig);
        if (badgeEl) badgeEl.textContent = '';
        if (preview && nextTier) {
          const moreNeeded = nextTier.min - projectedQty;
          preview.innerHTML = `add ${moreNeeded} more for ${nextTier.pct}% off`;
        } else if (preview) { preview.innerHTML = ''; }
      }

      // Update the discount banner to reflect projected qty
      const ctrl = card.closest('design-card-controller');
      if (ctrl && ctrl.updateDiscountBanner) {
        const origMethod = ctrl.getProductTotalQty;
        ctrl.getProductTotalQty = function() { return projectedQty; };
        ctrl.updateDiscountBanner();
        ctrl.getProductTotalQty = origMethod;
      }

      // Update ALL existing row prices across all cards to reflect the projected tier
      this.updateAllRowPricesForTier(projectedQty);
    }

    /* ── Recalculate all existing row prices when projected tier changes ── */
    updateAllRowPricesForTier(projectedQty) {
      const ctrl = this.closest('design-card-controller');
      if (!ctrl) return;

      ctrl.querySelectorAll('.design-card').forEach(c => {
        const cd = this.getCardData(c);
        if (!cd) return;
        const tiers = parseDiscountTiers(cd.discount_input);
        const tier = getCurrentTier(tiers, projectedQty);
        const discPct = tier.pct / 100;

        c.querySelectorAll('.dc-size-row').forEach(row => {
          const w = parseFloat(row.dataset.width);
          const h = parseFloat(row.dataset.height);
          const qty = parseInt(row.dataset.quantity) || 0;
          if (!w || !h || !qty) return;

          const sqIn = Math.round(w * h);
          const variant = findVariantForSquareInches(cd.variants, sqIn);
          if (!variant) return;

          const basePrice = variant.price;
          const lineOrig = basePrice * qty;
          const lineDisc = discPct > 0 ? Math.round(lineOrig * (1 - discPct)) : lineOrig;
          const discPriceEa = qty > 0 ? Math.floor(lineDisc / qty) : 0;

          // Cart-level discount check
          const vid = row.dataset.variantId || String(variant.id);
          const cartUnitPrice = vid ? _cartPriceMap.get(vid) : undefined;
          const hasCartDisc = cartUnitPrice !== undefined && cartUnitPrice < basePrice;

          let fEa = discPriceEa, fLine = lineDisc, strike = discPct > 0 && discPriceEa < basePrice;
          if (hasCartDisc && (!strike || cartUnitPrice < discPriceEa)) {
            fEa = cartUnitPrice; fLine = cartUnitPrice * qty; strike = true;
          }

          const peEl = row.querySelector('.dc-price-ea');
          if (peEl) {
            if (strike) {
              peEl.innerHTML = `<s>${money(basePrice)}</s><span class="disc-price">${money(fEa)}</span><span class="ea-suffix"> ea</span>`;
            } else {
              peEl.innerHTML = `<span>${money(basePrice)}</span><span class="ea-suffix"> ea</span>`;
            }
          }
          const totEl = row.querySelector('.dc-row-total');
          if (totEl) totEl.textContent = money(fLine);
          const bdgEl = row.querySelector('.dc-disc-badge');
          if (bdgEl) bdgEl.textContent = discPct > 0 ? `${tier.pct}% off` : (hasCartDisc ? 'discount' : '');
        });

        // Update card header price
        let cardTotal = 0, cardOrig = 0, cardPcs = 0;
        c.querySelectorAll('.dc-size-row').forEach(row => {
          const w = parseFloat(row.dataset.width);
          const h = parseFloat(row.dataset.height);
          const qty = parseInt(row.dataset.quantity) || 0;
          if (!w || !h) return;
          cardPcs += qty;
          const sqIn = Math.round(w * h);
          const variant = findVariantForSquareInches(cd.variants, sqIn);
          if (!variant) return;
          const bp = variant.price;
          const lo = bp * qty;
          const tierLine = discPct > 0 ? Math.round(lo * (1 - discPct)) : lo;
          // Cart discount override
          const rvid = row.dataset.variantId || String(variant.id);
          const cup = rvid ? _cartPriceMap.get(rvid) : undefined;
          const cLine = (cup !== undefined && cup < bp) ? cup * qty : tierLine;
          cardOrig += lo;
          cardTotal += Math.min(tierLine, cLine);
        });
        const mainEl = c.querySelector('.dc-price-main .money, .dc-price-main');
        if (mainEl) mainEl.textContent = money(cardTotal);
        const discLine = c.querySelector('.dc-price-line .dc-price-orig');
        if (discLine) discLine.textContent = money(cardOrig);
        const discBadge = c.querySelector('.dc-price-block .dc-price-disc');
        if (discBadge && discPct > 0) discBadge.textContent = `${tier.pct}% off`;
      });
    }

    /* ── Add Preview for multi-option products (puff transfers etc.) ── */
    updateAddPreviewOptions(card) {
      const opt1 = card.querySelector('[data-add-opt1]');
      const opt2 = card.querySelector('[data-add-opt2]');
      const qInput = card.querySelector('[data-add-qty]');
      const priceEaEl = card.querySelector('[data-add-price-ea]');
      const totalEl = card.querySelector('[data-add-total]');
      const badgeEl = card.querySelector('[data-add-badge]');
      const preview = card.querySelector('[data-add-preview]');

      const o1 = opt1?.value;
      const o2 = opt2?.value;
      const qty = Math.max(1, parseInt(qInput?.value) || 1);

      const clearCells = () => {
        if (priceEaEl) priceEaEl.innerHTML = '<span class="ea-suffix">—</span>';
        if (totalEl) totalEl.textContent = '—';
        if (badgeEl) badgeEl.textContent = '';
        if (preview) preview.innerHTML = '';
      };

      if (!o1 || !o2) { clearCells(); setAddRowEnabled(card, false); return; }

      const cardData = this.getCardData(card);
      if (!cardData) return;

      const variant = cardData.variants.find(v => v.option1 === o1 && v.option2 === o2 && v.available);
      if (!variant) {
        clearCells(); setAddRowEnabled(card, false);
        if (preview) preview.innerHTML = '<span style="color:#e11d48;">Combination unavailable</span>';
        return;
      }

      setAddRowEnabled(card, true);

      const basePrice = variant.price;
      const totalQty = this.getProductTotalQty(card);
      const tiers = parseDiscountTiers(cardData.discount_input);
      const projectedQty = totalQty + qty;
      const projectedTier = getCurrentTier(tiers, projectedQty);
      const nextTier = getNextTier(tiers, projectedQty);

      // Line-level rounding to match Shopify
      const lineOrig = basePrice * qty;
      const discFrac = projectedTier.pct / 100;

      if (projectedTier.pct > 0) {
        const lineDisc = Math.round(lineOrig * (1 - discFrac));
        const discPriceEa = qty > 0 ? Math.floor(lineDisc / qty) : 0;
        if (priceEaEl) priceEaEl.innerHTML = `<s>${money(basePrice)}</s><span class="disc-price">${money(discPriceEa)}</span><span class="ea-suffix"> ea</span>`;
        if (totalEl) totalEl.textContent = money(lineDisc);
        if (badgeEl) badgeEl.textContent = `${projectedTier.pct}% off`;
        if (preview && nextTier) {
          preview.innerHTML = `add ${nextTier.min - projectedQty} more for ${nextTier.pct}% off`;
        } else if (preview) { preview.innerHTML = ''; }
      } else {
        const totalPrice = basePrice * qty;
        if (priceEaEl) priceEaEl.innerHTML = `<span>${money(basePrice)}</span><span class="ea-suffix"> ea</span>`;
        if (totalEl) totalEl.textContent = money(totalPrice);
        if (badgeEl) badgeEl.textContent = '';
        if (preview && nextTier) {
          preview.innerHTML = `add ${nextTier.min - projectedQty} more for ${nextTier.pct}% off`;
        } else if (preview) { preview.innerHTML = ''; }
      }
    }

    async confirmAddSize(card) {
      const cardData = this.getCardData(card);
      if (!cardData) return;

      const addRow = card.querySelector('.dc-add-row');
      startLoading(addRow || card);
      const mode = addRow?.dataset.addMode || 'dimensions';
      const qInput = card.querySelector('[data-add-qty]');
      const qty = Math.max(1, parseInt(qInput?.value) || 1);
      let variant;
      let newProperties;

      if (mode === 'options') {
        /* ── Multi-option mode (puff transfers etc.) ── */
        const opt1 = card.querySelector('[data-add-opt1]')?.value;
        const opt2 = card.querySelector('[data-add-opt2]')?.value;
        if (!opt1 || !opt2) { showToast('⚠', 'Select both options'); return; }

        variant = cardData.variants.find(v => v.option1 === opt1 && v.option2 === opt2 && v.available);
        if (!variant) { showToast('⚠', 'Combination unavailable'); return; }

        const firstItem = cardData.items[0];
        if (!firstItem) return;
        newProperties = { ...firstItem.properties };
        if (newProperties['_cartImg']) newProperties['_cartImg'] = cleanImgixUrl(newProperties['_cartImg']);
        // Update size-related properties for the new variant
        const sizeMatch = opt1.match(/([\d.]+)"\s*x\s*([\d.]+)"/);
        if (sizeMatch) {
          newProperties['width'] = sizeMatch[1];
          newProperties['height'] = sizeMatch[2];
          newProperties['_Size'] = sizeMatch[1] + 'x' + sizeMatch[2];
        }
      } else {
        /* ── Dimension mode (DTF custom transfers) ── */
        const wInput = card.querySelector('[data-add-width]');
        const hInput = card.querySelector('[data-add-height]');
        const w = parseFloat(wInput?.value);
        const h = parseFloat(hInput?.value);

        if (!w || !h) { showToast('⚠', 'Enter both width and height'); return; }

        const limits = this.getProductLimits(card, cardData);
        const sqIn = Math.round(w * h);

        if (w < limits.minDim || h < limits.minDim) { showToast('⚠', `Minimum dimension is ${limits.minDim}"`); return; }
        if (sqIn < limits.minSqin || sqIn > limits.maxSqin) { showToast('⚠', `Size must be between ${limits.minSqin} and ${limits.maxSqin} sq in`); return; }

        variant = findVariantForSquareInches(cardData.variants, sqIn);
        if (!variant) { showToast('⚠', 'Size currently unavailable'); return; }

        const firstItem = cardData.items[0];
        if (!firstItem) return;
        newProperties = { ...firstItem.properties };
        if (newProperties['_cartImg']) newProperties['_cartImg'] = cleanImgixUrl(newProperties['_cartImg']);
        newProperties['width'] = String(w);
        newProperties['height'] = String(h);
        newProperties['_Size'] = w + 'x' + h;
      }

      // Read price data from the add preview before closing the form
      const priceEaEl = card.querySelector('[data-add-price-ea]');
      const totalEl = card.querySelector('[data-add-total]');
      const badgeEl = card.querySelector('[data-add-badge]');
      const priceEaHtml = priceEaEl ? priceEaEl.innerHTML : '';
      const totalText = totalEl ? totalEl.textContent : '';
      const badgeText = badgeEl ? badgeEl.textContent : '';

      // Get dimensions for display
      const dispW = parseFloat(card.querySelector('[data-add-width]')?.value) || 0;
      const dispH = parseFloat(card.querySelector('[data-add-height]')?.value) || 0;

      // Check DOM for existing row with this variant — merge qty instead of duplicate
      const existingRow = card.querySelector(`.dc-size-row[data-variant-id="${variant.id}"]`);
      const merged = !!existingRow;

      // Close add form immediately
      this.cancelAddSize(card);

      if (merged) {
        // Update existing row qty optimistically
        const existingQty = parseInt(existingRow.dataset.quantity) || 0;
        const newQty = existingQty + qty;
        existingRow.dataset.quantity = String(newQty);
        const qtyNum = existingRow.querySelector('.dc-qty-num');
        if (qtyNum) qtyNum.value = newQty;
        this.quickRowTotal(existingRow, newQty);
        existingRow.classList.add('dc-qty-bumped');
        showToast('✓', 'Qty updated');

        // Server sync
        await cartChange(existingRow.dataset.lineKey, newQty);
      } else {
        // Build optimistic row and insert immediately
        const sizeList = card.querySelector('.dc-size-list');
        const newRow = document.createElement('div');
        newRow.className = 'dc-size-row dc-row-added';
        newRow.dataset.variantId = String(variant.id);
        newRow.dataset.quantity = String(qty);
        newRow.dataset.width = String(dispW);
        newRow.dataset.height = String(dispH);
        newRow.dataset.lineKey = 'pending';
        newRow.innerHTML = `
          <div class="dc-size-label"><span>${dispW}" × ${dispH}"</span><button type="button" class="dc-row-edit-link" data-action="edit-row">Edit</button></div>
          <div class="dc-qty-wrap">
            <button type="button" class="dc-qty-btn" data-action="qty-minus"${qty <= 1 ? ' disabled' : ''}>−</button>
            <input type="number" class="dc-qty-num" value="${qty}" min="1" data-action="qty-input">
            <button type="button" class="dc-qty-btn" data-action="qty-plus">+</button>
          </div>
          <div class="dc-price-ea">${priceEaHtml}</div>
          <div class="dc-row-total">${totalText}</div>
          <div class="dc-disc-badge">${badgeText}</div>
          <button type="button" class="dc-del-btn" data-action="delete-row" title="Remove this size">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M2 2l8 8" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        `;
        if (sizeList) sizeList.appendChild(newRow);
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        showToast('✓', 'Size added');

        // Server sync
        await cartAdd([{
          id: variant.id,
          quantity: qty,
          properties: newProperties
        }]);
      }

      // Background refresh to confirm everything
      await fullCartRefresh();
    }

    /* ── Lightbox ── */
    bindLightbox() {
      // Only bind once — prevent stacking from re-init
      if (this._lightboxBound) return;
      this._lightboxBound = true;

      const overlay = $('#dc-lightbox');
      if (!overlay) {
        // Lightbox not in DOM yet (sibling rendered after controller) — allow retry on next init
        this._lightboxBound = false;
        return;
      }

      // Close on overlay background click (not children)
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) this._overlayMouseDown = true;
      });
      overlay.addEventListener('mouseup', (e) => {
        if (e.target === overlay && this._overlayMouseDown) this.closeLightbox();
        this._overlayMouseDown = false;
      });

      // Close button
      overlay.querySelectorAll('[data-action="close-lightbox"]').forEach(btn => {
        btn.addEventListener('click', () => this.closeLightbox());
      });

      // Save button
      const saveBtn = overlay.querySelector('[data-action="save-lightbox"]');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveLightbox());
      }

      // Toggle handlers
      const rbCheckbox = $('#dc-lb-rb');
      if (rbCheckbox) {
        rbCheckbox.addEventListener('change', () => this.updateLightboxBadge());
      }
      const srCheckbox = $('#dc-lb-sr');
      if (srCheckbox) {
        srCheckbox.addEventListener('change', () => this.updateLightboxBadge());
      }

      // Escape key (only one listener)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeLightbox();
      });
    }

    /* ── Background URL sanitizer ── */
    async sanitizeCartImgUrls() {
      if (this._sanitizing || window._dcSaving) return;
      this._sanitizing = true;
      try {
        // Collect all items with a corrupted _cartImg (any &amp; entity encoding)
        const dirtyItems = [];
        this.querySelectorAll('.design-card').forEach(card => {
          const cardData = this.getCardData(card);
          if (!cardData) return;
          cardData.items.forEach(item => {
            if (item.properties['_cartImg'] && item.properties['_cartImg'].includes('&amp;')) {
              dirtyItems.push(item);
            }
          });
        });
        if (!dirtyItems.length) return;

        // Update properties in-place via /cart/change.js — no remove/re-add risk
        await Promise.all(dirtyItems.map(item => {
          const props = { ...item.properties };
          props['_cartImg'] = buildCleanCartImgUrl(
            props['_cartImg'],
            props['Upload (Vector Files Preferred)'],
            (props['Remove Background'] || 'No').toLowerCase() === 'yes',
            (props['Super Resolution'] || 'No').toLowerCase() === 'yes'
          );
          return cartChangeProps(item.key, item.quantity, props);
        }));

        // No DOM refresh here — sanitize is a silent background data fix.
        // The clean URLs will be visible on the next natural section refresh or page reload.
      } catch(e) {
        console.warn('[DesignCards] sanitizeCartImgUrls failed:', e);
      } finally {
        this._sanitizing = false;
      }
    }

    openLightbox(card) {
      const cardData = this.getCardData(card);
      if (!cardData) return;

      this._lightboxCard = card;

      const overlay = $('#dc-lightbox');
      if (!overlay) return;

      // Set filename
      $('#dc-lb-filename').textContent = cardData.design_name || 'Design';

      // Store base URL with toggle params + display-only params stripped for clean lightbox preview
      const srcUrl = cardData.cart_img || cardData.fullres_url || '';
      let lbBase = setImgixParam(setImgixParam(srcUrl, 'bg-remove', false), 'upscale', false);
      lbBase = setImgixParam(setImgixParam(lbBase, 'q', false), 'h', false);
      this._lbBaseImgUrl = lbBase;

      // Set toggles from stored properties
      const rbCheck = $('#dc-lb-rb');
      const srCheck = $('#dc-lb-sr');
      if (rbCheck) rbCheck.checked = (cardData.remove_bg || '').toLowerCase() === 'yes';
      if (srCheck) srCheck.checked = (cardData.super_res || '').toLowerCase() === 'yes';

      this.updateLightboxBadge(); // sets img.src based on current toggle state
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
      const overlay = $('#dc-lightbox');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
      this._lightboxCard = null;
    }

    updateLightboxBadge() {
      const rbCheck = $('#dc-lb-rb');
      const srCheck = $('#dc-lb-sr');
      const badge = $('#dc-lb-badge');
      const img = $('#dc-lb-img');
      const canvas = img && img.closest('.dc-lb-canvas');
      if (rbCheck && badge) {
        badge.classList.toggle('show', rbCheck.checked);
      }
      if (img && this._lbBaseImgUrl) {
        let imgUrl = setImgixParam(this._lbBaseImgUrl, 'bg-remove', rbCheck?.checked || false);
        imgUrl = setImgixParam(imgUrl, 'upscale', srCheck?.checked || false);
        // Show loading state
        img.classList.add('lb-img-loading');
        if (canvas) canvas.classList.add('lb-loading');
        img.onload = img.onerror = () => {
          img.classList.remove('lb-img-loading');
          if (canvas) canvas.classList.remove('lb-loading');
          img.onload = img.onerror = null;
        };
        img.src = imgUrl;
        img.style.display = '';
      }
    }

    async saveLightbox() {
      const card = this._lightboxCard;
      if (!card) return;
      window._dcSaving = true;
      const modal = document.querySelector('.dc-lb-modal');
      startLoading(modal || card);

      const cardData = this.getCardData(card);
      if (!cardData || !cardData.items.length) {
        window._dcSaving = false;
        return;
      }

      const rbCheck = $('#dc-lb-rb');
      const srCheck = $('#dc-lb-sr');
      const newRB = rbCheck?.checked || false;
      const newSR = srCheck?.checked || false;

      // Skip save if nothing changed
      const currentRB = (cardData.remove_bg || 'No').toLowerCase() === 'yes';
      const currentSR = (cardData.super_res || 'No').toLowerCase() === 'yes';
      if (newRB === currentRB && newSR === currentSR) {
        window._dcSaving = false;
        this.closeLightbox();
        showToast('✓', 'No changes');
        return;
      }

      // Fetch fresh cart to get current item keys — embedded keys can be stale
      const freshCart = await fetch('/cart.js', { cache: 'no-store' }).then(r => r.json());

      await Promise.all(cardData.items.map(item => {
        // Match fresh item by variant_id + upload URL (compare base path for robustness)
        const uploadUrl = cleanImgixUrl(item.properties['Upload (Vector Files Preferred)'] || '');
        const uploadBase = uploadUrl.split('?')[0];
        const fresh = freshCart.items && freshCart.items.find(fi => {
          if (fi.variant_id !== item.variant_id) return false;
          const fiUpload = cleanImgixUrl(fi.properties['Upload (Vector Files Preferred)'] || '');
          return fiUpload === uploadUrl || fiUpload.split('?')[0] === uploadBase;
        });

        const currentKey = fresh ? fresh.key : item.key;
        const currentQty = fresh ? fresh.quantity : item.quantity;
        const baseProps   = fresh ? fresh.properties : item.properties;

        const props = { ...baseProps };
        props['Remove Background'] = newRB ? 'Yes' : 'No';
        if (newSR) {
          props['Super Resolution'] = 'Yes';
        } else {
          delete props['Super Resolution'];
        }

        // Rebuild _cartImg from scratch so no &amp; can ever survive.
        // Uses the raw value from /cart.js (clean) or decodes the DOM value as fallback.
        // Result is always: base-url?trim=colorUnlessAlpha&fm=png [&bg-remove=true] [&upscale=true]
        const sourceImg = fresh
          ? (fresh.properties['_cartImg'] || '')
          : cleanImgixUrl(item.properties['_cartImg'] || '');
        if (sourceImg) {
          props['_cartImg'] = buildCleanCartImgUrl(sourceImg, uploadUrl, newRB, newSR);
        }

        return cartChangeProps(currentKey, currentQty, props);
      }));

      window._dcSaving = false;
      this.closeLightbox();
      showToast('✓', 'Changes saved');
      await fullCartRefresh();
    }

    /* ── Discount Banner ── */
    updateDiscountBanner() {
      const banner = this.querySelector('[data-disc-banner]');
      if (!banner) return;
      // If banner is locked (during refresh), skip update to prevent flash
      if (banner.dataset.locked === 'true') return;

      // Use the first DTF/custom transfers card's product total (not combined)
      const firstCard = this.querySelector('.design-card');
      if (!firstCard) return;

      const totalQty = this.getProductTotalQty(firstCard);

      const cardData = this.getCardData(firstCard);
      if (!cardData) return;

      const tiers = parseDiscountTiers(cardData.discount_input);
      if (tiers.length === 0) {
        banner.style.display = 'none';
        return;
      }

      const current = getCurrentTier(tiers, totalQty);
      const next = getNextTier(tiers, totalQty);

      const tagSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';

      // Determine new state and text
      let newState = '', newText = '';
      if (current.pct > 0 && !next) {
        newState = 'active';
        newText = `<strong>${current.pct}% bulk discount active</strong> — best price unlocked · ${totalQty} pcs total`;
      } else if (current.pct > 0 && next) {
        newState = 'active';
        newText = `<strong>${current.pct}% bulk discount active</strong> — Add ${next.min - totalQty} more to save ${next.pct}%`;
      } else if (next) {
        newState = 'inactive';
        newText = `<strong>Buy More & Save</strong> — Add ${next.min - totalQty} more to save ${next.pct}%`;
      } else {
        banner.style.display = 'none';
        return;
      }

      banner.style.display = '';

      // Ensure SVG exists, only update the text span
      if (!banner.querySelector('svg')) {
        banner.innerHTML = `${tagSvg}<span>${newText}</span>`;
      } else {
        const textSpan = banner.querySelector('span');
        if (textSpan) {
          textSpan.innerHTML = newText;
        } else {
          banner.insertAdjacentHTML('beforeend', `<span>${newText}</span>`);
        }
      }

      // Toggle class for smooth color/bg transition
      banner.classList.remove('active', 'inactive');
      banner.classList.add(newState);
    }

    /* ── Data Helpers ── */
    getCardData(card) {
      const jsonEl = card.querySelector('.dc-variant-data');
      if (!jsonEl) return null;
      try {
        return JSON.parse(jsonEl.textContent);
      } catch (e) {
        console.error('[DesignCards] Failed to parse card data:', e);
        return null;
      }
    }

    /* ── Product Limits Helper ── */
    getProductLimits(card, cardData) {
      if (!cardData) cardData = this.getCardData(card);
      if (!cardData) return { minDim: 0.5, maxDim: 22, minSqin: 1, maxSqin: 484 };
      return {
        minDim: 0.5,
        maxDim: cardData.max_dim || 22,
        minSqin: cardData.min_sqin || 1,
        maxSqin: cardData.max_sqin || 484
      };
    }

    /* ── Aspect Ratio Helpers ── */
    getAspectRatio(card) {
      // Use print dimensions from line item properties (reflects any cropping by imgix/PDP)
      // First try card data
      const cardData = this.getCardData(card);
      if (cardData && cardData.items && cardData.items.length) {
        const first = cardData.items[0];
        const w = parseFloat(first.width);
        const h = parseFloat(first.height);
        if (w && h) return w / h;
      }
      // Fallback: read from first size row's data attributes
      const firstRow = card.querySelector('.dc-size-row');
      if (firstRow) {
        const rw = parseFloat(firstRow.dataset.width);
        const rh = parseFloat(firstRow.dataset.height);
        if (rw && rh) return rw / rh;
      }
      return null;
    }

    findPairedDimInput(input, card) {
      if (input.hasAttribute('data-add-width')) return card.querySelector('[data-add-height]');
      if (input.hasAttribute('data-add-height')) return card.querySelector('[data-add-width]');
      const wIdx = input.getAttribute('data-edit-w');
      if (wIdx !== null) return card.querySelector(`[data-edit-h="${wIdx}"]`);
      const hIdx = input.getAttribute('data-edit-h');
      if (hIdx !== null) return card.querySelector(`[data-edit-w="${hIdx}"]`);
      return null;
    }

    isDimWidthInput(input) {
      return input.hasAttribute('data-add-width') || input.getAttribute('data-edit-w') !== null;
    }

    syncPairedDimension(input, card) {
      if (this._lockingAspect) return;
      const ar = this.getAspectRatio(card);
      if (!ar) return;
      const paired = this.findPairedDimInput(input, card);
      if (!paired) return;
      const limits = this.getProductLimits(card);
      const val = parseFloat(input.value);
      if (!val || val < limits.minDim) return;
      this._lockingAspect = true;
      let pairedVal;
      if (this.isDimWidthInput(input)) {
        pairedVal = val / ar;
      } else {
        pairedVal = val * ar;
      }
      pairedVal = Math.max(limits.minDim, Math.min(limits.maxDim, pairedVal));
      paired.value = pairedVal.toFixed(2);
      this._lockingAspect = false;
    }
  }

  // Register custom element
  if (!customElements.get('design-card-controller')) {
    customElements.define('design-card-controller', DesignCardController);
  }

  /* ================================================================
     SHARED CARD METHODS
     Extracted from duplicated code across blank/default controllers
     ================================================================ */
  const SharedCardMethods = {
    sharedInit() {
      if (this._clickHandler) this.removeEventListener('click', this._clickHandler);
      if (this._inputHandler) this.removeEventListener('input', this._inputHandler);
      if (this._changeHandler) this.removeEventListener('change', this._changeHandler);
      this._clickHandler = (e) => this.handleClick(e);
      this._inputHandler = (e) => this.handleInput(e);
      this._changeHandler = (e) => this.handleChange(e);
      this.addEventListener('click', this._clickHandler);
      this.addEventListener('input', this._inputHandler);
      this.addEventListener('change', this._changeHandler);
    },

    sharedHandleInput(e, cardSel) {
      const card = e.target.closest(cardSel);
      if (!card) return;
      if (e.target.matches('.dc-qty-num')) this.handleQtyTyped(e.target, cardSel);
    },

    sharedHandleQtyTyped(input, cardSel) {
      const row = input.closest('.dc-size-row');
      const card = input.closest(cardSel);
      if (!row || !card) return;
      const val = Math.max(1, parseInt(input.value) || 1);
      row.dataset.quantity = String(val);
      const minBtn = row.querySelector('[data-action="qty-minus"]');
      if (minBtn) minBtn.disabled = val <= 1;
      if (!this._qtyTimers) this._qtyTimers = {};
      const rowId = row.dataset.lineKey;
      clearTimeout(this._qtyTimers[rowId]);
      this._qtyTimers[rowId] = setTimeout(async () => {
        const finalQty = Math.max(1, parseInt(input.value) || 1);
        input.value = finalQty;
        await cartChange(row.dataset.lineKey, finalQty);
        await fullCartRefresh();
      }, 400);
    },

    sharedChangeQty(row, delta) {
      if (!row) return;
      const cur = parseInt(row.dataset.quantity, 10) || 1;
      const next = Math.max(1, cur + delta);
      if (next === cur) return;
      row.dataset.quantity = next;
      const numEl = row.querySelector('.dc-qty-num');
      if (numEl) { numEl.value = next; numEl.textContent = next; }
      const minBtn = row.querySelector('[data-action="qty-minus"]');
      if (minBtn) minBtn.disabled = next <= 1;
      row.dataset.qtyPending = 'true';
      if (!this._qtyTimers) this._qtyTimers = {};
      const rowId = row.dataset.lineKey;
      clearTimeout(this._qtyTimers[rowId]);
      this._qtyTimers[rowId] = setTimeout(async () => {
        const finalQty = parseInt(row.dataset.quantity) || 1;
        const finalKey = row.dataset.lineKey;
        await cartChange(finalKey, finalQty);
        delete row.dataset.qtyPending;
        await fullCartRefresh();
      }, 250);
    },

    sharedShowConfirm(card) {
      const panel = card.querySelector('[data-confirm-panel]');
      if (panel) panel.classList.add('show');
    },

    sharedHideConfirm(card) {
      const panel = card.querySelector('[data-confirm-panel]');
      if (panel) panel.classList.remove('show');
    },

    sharedPatchFromDoc(doc, cardSel) {
      const newCards = [...doc.querySelectorAll(cardSel)];
      const oldCards = [...this.querySelectorAll(cardSel)];
      newCards.forEach((nc, i) => {
        const oc = oldCards[i];
        if (!oc) return;
        const np = nc.querySelector('.dc-price-block');
        const op = oc.querySelector('.dc-price-block');
        if (np && op) op.innerHTML = np.innerHTML;
        nc.querySelectorAll('.dc-size-row').forEach((nr, j) => {
          const or2 = oc.querySelectorAll('.dc-size-row')[j];
          if (!or2) return;
          ['.dc-price-ea', '.dc-row-total', '.dc-disc-badge'].forEach(sel => {
            const ne = nr.querySelector(sel); const oe = or2.querySelector(sel);
            if (ne && oe) oe.innerHTML = ne.innerHTML;
          });
          const nq = nr.querySelector('.dc-qty-num');
          const oq = or2.querySelector('.dc-qty-num');
          if (nq && oq) oq.value = nq.value || nq.textContent;
          or2.dataset.quantity = nr.dataset.quantity;
          or2.dataset.lineKey = nr.dataset.lineKey;
        });
      });
    }
  };

  /* ================================================================
     BLANK CARD CONTROLLER
     Parent-child cart interactions for blanks/apparel products
     ================================================================ */
  class BlankCardController extends HTMLElement {
    connectedCallback() { this.init(); }
    init() { SharedCardMethods.sharedInit.call(this); }

    handleClick(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.tagName === 'A') return;
      e.preventDefault();
      const action = btn.dataset.action;
      const card = btn.closest('.blank-card');
      const row = btn.closest('.dc-size-row');
      switch (action) {
        case 'qty-minus': this.changeQty(row, -1); break;
        case 'qty-plus': this.changeQty(row, 1); break;
        case 'delete-row': this.deleteRow(card, row); break;
        case 'show-confirm-delete': SharedCardMethods.sharedShowConfirm(card); break;
        case 'hide-confirm-delete': SharedCardMethods.sharedHideConfirm(card); break;
        case 'remove-group': this.removeGroup(card); break;
        case 'toggle-add-color': this.toggleAddColor(card); break;
        case 'cancel-add-color': this.cancelAddColor(card); break;
        case 'confirm-add-color': this.confirmAddColor(card); break;
        case 'dim-minus':
        case 'dim-plus': {
          const target = btn.dataset.target;
          if (target === 'add-qty' || target === 'add-color-qty') {
            const input = card?.querySelector(target === 'add-qty' ? '[data-add-qty]' : '[data-add-color-qty]');
            if (input) {
              const v = Math.max(1, parseInt(input.value) + (action === 'dim-plus' ? 1 : -1));
              input.value = v;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
          break;
        }
      }
    }

    handleInput(e) { SharedCardMethods.sharedHandleInput.call(this, e, '.blank-card'); }
    handleQtyTyped(input) { SharedCardMethods.sharedHandleQtyTyped.call(this, input, '.blank-card'); }
    changeQty(row, delta) { SharedCardMethods.sharedChangeQty.call(this, row, delta); }

    handleChange(e) {
      if (e.target.matches('[data-add-color-select]')) {
        const card = e.target.closest('.blank-card');
        if (card) this.populateColorSizes(card);
      }
      if (e.target.matches('[data-add-color-size-select]')) {
        const card = e.target.closest('.blank-card');
        if (card) this.updateAddColorPreview(card);
      }
    }

    getCardData(card) {
      const jsonEl = card?.querySelector('.bc-card-data');
      if (!jsonEl) return null;
      try { return JSON.parse(jsonEl.textContent); } catch (e) { return null; }
    }

    async deleteRow(card, row) {
      if (!card || !row) return;
      startLoading(row);
      const rows = card.querySelectorAll('.dc-size-row');
      const lineKey = row.dataset.lineKey;
      if (rows.length <= 1) { SharedCardMethods.sharedShowConfirm(card); return; }
      row.classList.add('removing');
      await new Promise(r => setTimeout(r, 300));
      row.remove();
      await cartChange(lineKey, 0);
      showToast('\u2713', 'Size removed');
      await fullCartRefresh();
    }

    async removeGroup(card) {
      if (!card) return;
      startLoading(card);
      const cardData = this.getCardData(card);
      if (!cardData) return;
      const updates = {};
      cardData.items.forEach(it => { updates[it.key] = 0; });
      card.style.transition = 'opacity 0.3s, transform 0.3s';
      card.style.opacity = '0'; card.style.transform = 'translateX(-20px)';
      await cartUpdate(updates);
      showToast('\u2713', 'Group removed');
      await fullCartRefresh();
    }

    toggleAddColor(card) {
      const form = card.querySelector('[data-add-color-form]');
      if (form) form.classList.toggle('open');
    }

    cancelAddColor(card) {
      const form = card.querySelector('[data-add-color-form]');
      if (form) form.classList.remove('open');
      const colorSel = card.querySelector('[data-add-color-select]');
      if (colorSel) colorSel.value = '';
      const sizeSel = card.querySelector('[data-add-color-size-select]');
      if (sizeSel) { sizeSel.innerHTML = '<option value="">-- Pick a color first --</option>'; sizeSel.disabled = true; }
      const qInput = card.querySelector('[data-add-color-qty]');
      if (qInput) qInput.value = '1';
      const preview = card.querySelector('[data-add-color-preview]');
      if (preview) preview.textContent = 'Select a color to see pricing';
      const swatch = card.querySelector('[data-color-preview-swatch]');
      if (swatch) { swatch.classList.remove('visible'); swatch.style.background = ''; }
    }

    populateColorSizes(card) {
      const colorSel = card.querySelector('[data-add-color-select]');
      const sizeSel = card.querySelector('[data-add-color-size-select]');
      const swatch = card.querySelector('[data-color-preview-swatch]');
      if (!colorSel || !sizeSel) return;
      const selectedColor = colorSel.value;
      if (!selectedColor) {
        sizeSel.innerHTML = '<option value="">-- Pick a color first --</option>';
        sizeSel.disabled = true;
        if (swatch) { swatch.classList.remove('visible'); swatch.style.background = ''; }
        this.updateAddColorPreview(card);
        return;
      }
      const selectedOption = colorSel.querySelector('option[value="' + CSS.escape(selectedColor) + '"]');
      if (swatch && selectedOption) {
        const hex = selectedOption.dataset.hex;
        const hex2 = selectedOption.dataset.hex2;
        if (hex) {
          swatch.style.background = hex2 ? 'linear-gradient(135deg, ' + hex + ' 50%, ' + hex2 + ' 50%)' : hex;
          swatch.classList.add('visible');
        } else { swatch.classList.remove('visible'); swatch.style.background = ''; }
      }
      const cardData = this.getCardData(card);
      if (!cardData || !cardData.available_color_variants) return;
      const variants = cardData.available_color_variants.filter(v => v.color === selectedColor);
      let html = '<option value="">-- Select a size --</option>';
      variants.forEach(v => { html += '<option value="' + v.variant_id + '" data-size="' + v.size + '" data-price="' + v.price + '">' + v.size + ' \u2014 ' + money(v.price) + '</option>'; });
      sizeSel.innerHTML = html;
      sizeSel.disabled = false;
      this.updateAddColorPreview(card);
    }

    updateAddColorPreview(card) {
      const colorSel = card.querySelector('[data-add-color-select]');
      const sizeSel = card.querySelector('[data-add-color-size-select]');
      const qInput = card.querySelector('[data-add-color-qty]');
      const preview = card.querySelector('[data-add-color-preview]');
      if (!preview) return;
      if (!colorSel?.value) { preview.textContent = 'Select a color to see pricing'; return; }
      if (!sizeSel?.value) { preview.textContent = 'Select a size to see pricing'; return; }
      const option = sizeSel.querySelector('option[value="' + sizeSel.value + '"]');
      const price = parseInt(option?.dataset.price) || 0;
      const sizeName = option?.dataset.size || '';
      const qty = Math.max(1, parseInt(qInput?.value) || 1);
      const colorName = colorSel.value;
      preview.innerHTML = '<strong>' + colorName + ' / ' + sizeName + '</strong> \u2014 <strong>' + money(price) + ' ea</strong> \u00b7 ' + money(price * qty) + ' total';
    }

    async confirmAddColor(card) {
      const colorSel = card.querySelector('[data-add-color-select]');
      const sizeSel = card.querySelector('[data-add-color-size-select]');
      const qInput = card.querySelector('[data-add-color-qty]');
      if (!colorSel?.value) { showToast('\u26a0', 'Select a color first'); return; }
      const variantId = parseInt(sizeSel?.value);
      if (!variantId) { showToast('\u26a0', 'Select a size first'); return; }
      const qty = Math.max(1, parseInt(qInput?.value) || 1);
      showCartSkeleton();
      const cardData = this.getCardData(card);
      const firstItem = cardData?.items?.[0];
      const properties = firstItem ? { ...firstItem.properties } : {};
      if (properties['_cartImg']) properties['_cartImg'] = cleanImgixUrl(properties['_cartImg']);
      await cartAdd([{ id: variantId, quantity: qty, properties }]);
      this.cancelAddColor(card);
      showToast('\u2713', 'Color added');
      await fullCartRefresh();
    }

    async patchFromServer() { await fullCartRefresh(); }
    patchFromDoc(doc) { SharedCardMethods.sharedPatchFromDoc.call(this, doc, '.blank-card'); }
  }

  if (!customElements.get('blank-card-controller')) {
    customElements.define('blank-card-controller', BlankCardController);
  }

  /* ================================================================
     DEFAULT CARD CONTROLLER
     Handles single-item cards (supplies, gang sheets, etc.)
     ================================================================ */
  class DefaultCardController extends HTMLElement {
    connectedCallback() { this.init(); }
    init() {
      this.addEventListener('click', e => this.handleClick(e));
      this.addEventListener('input', e => {
        if (e.target.matches('.dc-qty-num')) SharedCardMethods.sharedHandleQtyTyped.call(this, e.target, '.default-card');
      });
    }

    handleClick(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const card = btn.closest('.default-card');
      if (!card) return;
      const action = btn.dataset.action;
      switch (action) {
        case 'qty-plus':
        case 'qty-minus': SharedCardMethods.sharedChangeQty.call(this, card.querySelector('.dc-size-row'), action === 'qty-plus' ? 1 : -1); break;
        case 'show-confirm-delete': SharedCardMethods.sharedShowConfirm(card); break;
        case 'hide-confirm-delete': SharedCardMethods.sharedHideConfirm(card); break;
        case 'confirm-remove': this.removeItem(card); break;
      }
    }

    async removeItem(card) {
      const row = card.querySelector('.dc-size-row');
      if (!row) return;
      startLoading(card);
      const key = row.dataset.lineKey;
      card.style.transition = 'opacity 0.3s, transform 0.3s';
      card.style.opacity = '0'; card.style.transform = 'translateX(-20px)';
      try {
        await cartChange(key, 0);
        showToast('\u2713', 'Item removed');
        await fullCartRefresh();
      } catch (err) {
        card.style.opacity = '1'; card.style.transform = 'none';
      }
    }

    async patchFromServer() { await fullCartRefresh(); }
    patchFromDoc(doc) { SharedCardMethods.sharedPatchFromDoc.call(this, doc, '.default-card'); }
  }

  if (!customElements.get('default-card-controller')) {
    customElements.define('default-card-controller', DefaultCardController);
  }

})();
