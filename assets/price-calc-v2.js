/* ------------------------------------------------------------------
   price-calc-v2.js
   Wires up the new Price Calculator UI. Mirrors data between the new
   UI (.pcv2) and the legacy popup markup (.customTabelPopup__sizes,
   .customTabelPopup__item) so existing logic keeps running:
     - Width/Height from .pcv2 are synced to the legacy .widthHeight__value__
       inputs and trigger keyup — this leverages the existing price update
       flow that sets variant + updates .customTabelPopup__item <discount>.
     - Tier cards are built from the legacy .customTabelPopup__item rows
       (min/max/off data + per-unit price computed by existing JS).
     - Quantity input highlights the matching tier and the per-piece
       price is read from the active tier's <discount> text.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function formatCurrency(num) {
    if (isNaN(num)) return '$0.00';
    return '$' + Number(num).toFixed(2);
  }

  function getLegacyItems(popup) {
    return $$('.customTabelPopup__item', popup);
  }

  function parsePrice(row) {
    // The existing JS sets <discount>X.XX</discount> inside each row's <discount> tag
    var d = row.querySelector('discount');
    if (d && d.textContent) {
      var n = parseFloat(d.textContent.replace(/[^0-9.]/g, ''));
      if (!isNaN(n)) return n;
    }
    // Fallback: look for a price in the third column text
    var col3 = row.querySelector('.customTabelPopup__item_3');
    if (col3) {
      var m = col3.textContent.match(/[\d.]+/);
      if (m) return parseFloat(m[0]);
    }
    return NaN;
  }

  function labelFromItem(row) {
    var col1 = row.querySelector('.customTabelPopup__item_1');
    if (!col1) return '';
    var txt = (col1.textContent || '').trim();
    /* Strip trailing "pcs" or "pieces" */
    txt = txt.replace(/\s+pcs?$/i, '').replace(/\s+pieces?$/i, '');
    /* Normalize: keep "X-Y" as "X–Y" (en-dash), or "X+" */
    if (/\d+\s*-\s*\d+/.test(txt)) {
      var p = txt.split(/\s*-\s*/);
      return p[0].trim() + '–' + p[1].trim();
    }
    if (/\+$/.test(txt)) return txt;
    return txt + '+';
  }

  function offFromItem(row) {
    var offAttr = parseFloat(row.getAttribute('off'));
    if (!isNaN(offAttr)) {
      // off attr is a percentage (e.g., 20 for 20% off)
      return offAttr / 100;
    }
    var col2 = row.querySelector('.customTabelPopup__item_2');
    if (col2) {
      var m = col2.textContent.match(/(\d+)\s*%/);
      if (m) return parseFloat(m[1]) / 100;
    }
    return 0;
  }

  function tierRangeFromItem(row) {
    return {
      min: parseInt(row.getAttribute('min'), 10) || 1,
      max: parseInt(row.getAttribute('max'), 10) || 999999
    };
  }

  function findActiveTier(rows, qty) {
    for (var i = 0; i < rows.length; i++) {
      var r = tierRangeFromItem(rows[i]);
      if (qty >= r.min && qty <= r.max) return rows[i];
    }
    return rows[0] || null;
  }

  function renderTierCards(host) {
    var popup = host.closest ? host.closest('.customTabelPopup') : host.parentElement;
    if (!popup) return;
    var rows = getLegacyItems(popup);
    var tiersEl = $('[data-pcv2-tiers]', host);
    if (!tiersEl) return;

    // Build one row per legacy tier
    var cards = rows.map(function (row, i) {
      var label = labelFromItem(row) || (i + 1) + '+';
      var off = offFromItem(row);
      var price = parsePrice(row);
      var offTxt = off > 0 ? Math.round(off * 100) + '% off' : '—';
      var discClass = off > 0 ? ' has-discount' : '';
      return (
        '<button type="button" class="pcv2__tier' + discClass + '" data-pcv2-tier data-off="' + off +
        '" data-min="' + tierRangeFromItem(row).min + '" data-max="' + tierRangeFromItem(row).max + '">' +
        '<span class="pcv2__tierLabel">' + label + '</span>' +
        '<span class="pcv2__tierOff">' + offTxt + '</span>' +
        '<span class="pcv2__tierPrice">' + formatCurrency(price) + '</span>' +
        '</button>'
      );
    });

    tiersEl.innerHTML = cards.join('');

    // Wire up clicks — jump qty to tier min
    $$('[data-pcv2-tier]', tiersEl).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var min = parseInt(btn.getAttribute('data-min'), 10) || 1;
        var qtyInput = $('[data-pcv2-qty]', host);
        if (qtyInput) {
          qtyInput.value = min;
          updateActiveTier(host);
        }
      });
    });

    /* Apply MOQ (from first tier min) to the quantity input */
    applyMoqToQty(host, rows);
    updateActiveTier(host);
  }

  function applyMoqToQty(host, rows) {
    if (!rows) rows = getLegacyItems(host.closest('.customTabelPopup'));
    if (!rows.length) return;
    var firstMin = tierRangeFromItem(rows[0]).min;
    if (isNaN(firstMin) || firstMin < 1) return;
    var qtyInput = $('[data-pcv2-qty]', host);
    if (!qtyInput) return;
    /* Update min attribute to the MOQ */
    qtyInput.setAttribute('min', String(firstMin));
    /* If current value is below MOQ (or was the old default 1), bump to MOQ */
    var curVal = parseInt(qtyInput.value, 10);
    if (isNaN(curVal) || curVal < firstMin) {
      qtyInput.value = String(firstMin);
    }
  }

  function updateActiveTier(host) {
    var qtyInput = $('[data-pcv2-qty]', host);
    var qty = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
    var cards = $$('[data-pcv2-tier]', host);
    var activeCard = null;
    cards.forEach(function (c) {
      var min = parseInt(c.getAttribute('data-min'), 10);
      var max = parseInt(c.getAttribute('data-max'), 10);
      var active = qty >= min && qty <= max;
      c.classList.toggle('is-active', active);
      if (active) activeCard = c;
    });
    if (!activeCard && cards.length) activeCard = cards[0];

    // Update price display + badge
    var badge = $('[data-pcv2-badge]', host);
    var priceAfter = $('[data-pcv2-price-after]', host);
    var priceBefore = $('[data-pcv2-price-before]', host);
    if (!priceAfter || !priceBefore) return;

    var activeOff = activeCard ? parseFloat(activeCard.getAttribute('data-off')) || 0 : 0;
    var firstCard = cards[0];
    var basePrice = firstCard ? parseFloat((firstCard.querySelector('.pcv2__tierPrice') || {}).textContent.replace(/[^0-9.]/g, '') || '0') : 0;
    var unitPrice = activeCard ? parseFloat((activeCard.querySelector('.pcv2__tierPrice') || {}).textContent.replace(/[^0-9.]/g, '') || '0') : 0;

    priceAfter.textContent = formatCurrency(unitPrice);
    if (activeOff > 0) {
      priceAfter.classList.add('is-discount');
      priceBefore.textContent = formatCurrency(basePrice);
      priceBefore.classList.add('is-visible');
    } else {
      priceAfter.classList.remove('is-discount');
      priceBefore.textContent = '';
      priceBefore.classList.remove('is-visible');
    }

    /* Badge removed from markup; leave no-op if not present */
    if (badge) {
      if (activeOff > 0) {
        badge.textContent = Math.round(activeOff * 100) + '% off';
        badge.className = 'pcv2__badge pcv2__badge--discount';
      } else {
        badge.textContent = 'Add more to save';
        badge.className = 'pcv2__badge pcv2__badge--neutral';
      }
    }
  }

  function syncWidthHeightToLegacy(host) {
    var w = $('[data-pcv2-width]', host);
    var h = $('[data-pcv2-height]', host);
    var popup = host.closest ? host.closest('.customTabelPopup') : null;
    if (!popup) return;
    var legacyW = popup.querySelector('input[name="width__value"]');
    var legacyH = popup.querySelector('input[name="height__value"]');
    if (w && legacyW && legacyW.value !== w.value) {
      legacyW.value = w.value;
      var evW = new Event('keyup', { bubbles: true });
      legacyW.dispatchEvent(evW);
    }
    if (h && legacyH && legacyH.value !== h.value) {
      legacyH.value = h.value;
      var evH = new Event('keyup', { bubbles: true });
      legacyH.dispatchEvent(evH);
    }
  }

  function pullLimitsFromLegacy(host) {
    /* Copy min/max/step from legacy inputs onto the new UI inputs so the source of truth
       (widthHeight block in the schema) is respected. The legacy inputs get their min/max
       set both server-side in Liquid AND client-side by bySize JS (userDefinedMaxLength
       / userDefinedMaxHeight), so this runs after init + on mutations. */
    var popup = host.closest ? host.closest('.customTabelPopup') : null;
    if (!popup) return;
    var legacyW = popup.querySelector('input[name="width__value"]');
    var legacyH = popup.querySelector('input[name="height__value"]');
    var w = $('[data-pcv2-width]', host);
    var h = $('[data-pcv2-height]', host);
    ['min', 'max', 'step'].forEach(function (attr) {
      if (legacyW && w) {
        var v = legacyW.getAttribute(attr);
        if (v != null && w.getAttribute(attr) !== v) w.setAttribute(attr, v);
      }
      if (legacyH && h) {
        var v = legacyH.getAttribute(attr);
        if (v != null && h.getAttribute(attr) !== v) h.setAttribute(attr, v);
      }
    });
  }

  function mirrorLegacyBack(host) {
    /* After legacy keyup handler runs (it clamps values to min/max), mirror the
       clamped value back to the new UI so the user sees the enforced limit. */
    var popup = host.closest ? host.closest('.customTabelPopup') : null;
    if (!popup) return;
    var legacyW = popup.querySelector('input[name="width__value"]');
    var legacyH = popup.querySelector('input[name="height__value"]');
    var w = $('[data-pcv2-width]', host);
    var h = $('[data-pcv2-height]', host);
    if (legacyW && w && legacyW.value !== w.value) w.value = legacyW.value;
    if (legacyH && h && legacyH.value !== h.value) h.value = legacyH.value;
    /* Re-validate after mirror-back to clear any error state now that value is clamped */
    validateInput(host, 'width');
    validateInput(host, 'height');
  }

  function formatLimit(n) {
    /* Drop trailing .0 on whole numbers */
    var num = parseFloat(n);
    if (isNaN(num)) return n;
    if (num === Math.floor(num)) return String(Math.floor(num));
    return String(num);
  }

  var errorHoldTimers = {};
  var errorShownAt = {};
  var errorShowTimers = {};
  var MIN_ERROR_DISPLAY_MS = 1000;
  /* Keep this shorter than legacy clamp time (~500ms = 250 v2 sync + 250 legacy debounce)
     so the error shows before the value gets auto-clamped back to valid. */
  var SHOW_ERROR_DELAY_MS = 180;

  function validateInput(host, which, opts) {
    var map = {
      width:  { input: '[data-pcv2-width]',  errEl: '[data-pcv2-error-width]',  dim: 'Width' },
      height: { input: '[data-pcv2-height]', errEl: '[data-pcv2-error-height]', dim: 'Height' },
      qty:    { input: '[data-pcv2-qty]',    errEl: '[data-pcv2-error-qty]',    dim: 'Quantity' }
    };
    var cfg = map[which];
    if (!cfg) return;
    var input = $(cfg.input, host);
    var errEl = $(cfg.errEl, host);
    if (!input || !errEl) return;

    var raw = input.value;
    var valNum = parseFloat(raw);
    var min = parseFloat(input.getAttribute('min'));
    var max = parseFloat(input.getAttribute('max'));
    var msg = '';

    if (raw === '' || isNaN(valNum)) {
      /* leave empty state silent — user is still typing */
      msg = '';
    } else if (!isNaN(min) && valNum < min) {
      if (which === 'qty') {
        msg = 'Min quantity of ' + formatLimit(min);
      } else {
        msg = cfg.dim + ' must be at least ' + formatLimit(min) + ' inches';
      }
    } else if (!isNaN(max) && valNum > max) {
      msg = cfg.dim + ' cannot exceed ' + formatLimit(max) + (which === 'qty' ? '' : ' inches');
    }

    if (!host.__pcv2Id) host.__pcv2Id = 'pcv2-' + Math.random().toString(36).slice(2, 9);
    var key = host.__pcv2Id + ':' + which;
    var immediate = opts && opts.immediate;

    var stepper = input.closest('.pcv2__stepper');

    function showError() {
      errEl.textContent = msg;
      errEl.hidden = false;
      input.classList.add('is-error');
      if (stepper) stepper.classList.add('is-error');
      if (!errorShownAt[key]) errorShownAt[key] = Date.now();
      if (errorHoldTimers[key]) { clearTimeout(errorHoldTimers[key]); errorHoldTimers[key] = null; }
    }

    function hideError() {
      errEl.textContent = '';
      errEl.hidden = true;
      input.classList.remove('is-error');
      if (stepper) stepper.classList.remove('is-error');
      errorShownAt[key] = 0;
      if (errorHoldTimers[key]) { clearTimeout(errorHoldTimers[key]); errorHoldTimers[key] = null; }
    }

    function cancelPendingShow() {
      if (errorShowTimers[key]) { clearTimeout(errorShowTimers[key]); errorShowTimers[key] = null; }
    }

    if (msg) {
      /* Invalid — but wait until user stops typing before showing (unless already shown or immediate) */
      var alreadyShown = !errEl.hidden;
      if (immediate || alreadyShown) {
        showError();
      } else {
        cancelPendingShow();
        errorShowTimers[key] = setTimeout(function () {
          /* Re-check current value before showing — user might have corrected it */
          var v = parseFloat(input.value);
          var mn = parseFloat(input.getAttribute('min'));
          var mx = parseFloat(input.getAttribute('max'));
          var raw = input.value;
          var stillInvalid = raw !== '' && !isNaN(v) && ((!isNaN(mn) && v < mn) || (!isNaN(mx) && v > mx));
          if (stillInvalid) {
            /* Rebuild the message for the current value */
            var cfgDim = cfg.dim;
            var newMsg;
            if (!isNaN(mn) && v < mn) {
              if (which === 'qty') {
                newMsg = 'Min quantity of ' + formatLimit(mn);
              } else {
                newMsg = cfgDim + ' must be at least ' + formatLimit(mn) + ' inches';
              }
            } else {
              newMsg = cfgDim + ' cannot exceed ' + formatLimit(mx) + (which === 'qty' ? '' : ' inches');
            }
            errEl.textContent = newMsg;
            errEl.hidden = false;
            input.classList.add('is-error');
            if (!errorShownAt[key]) errorShownAt[key] = Date.now();
          }
          errorShowTimers[key] = null;
        }, SHOW_ERROR_DELAY_MS);
      }
    } else {
      cancelPendingShow();
      /* Valid — enforce minimum 1s display time if we previously showed an error */
      var shownAt = errorShownAt[key] || 0;
      var elapsed = shownAt ? Date.now() - shownAt : Infinity;
      if (elapsed >= MIN_ERROR_DISPLAY_MS) {
        hideError();
      } else {
        /* Schedule hide for the remainder of the hold time, re-check validity at that point */
        if (errorHoldTimers[key]) clearTimeout(errorHoldTimers[key]);
        errorHoldTimers[key] = setTimeout(function () {
          var v = parseFloat(input.value);
          var mn = parseFloat(input.getAttribute('min'));
          var mx = parseFloat(input.getAttribute('max'));
          var stillInvalid = !isNaN(v) && ((!isNaN(mn) && v < mn) || (!isNaN(mx) && v > mx));
          if (!stillInvalid) hideError();
          errorHoldTimers[key] = null;
        }, MIN_ERROR_DISPLAY_MS - elapsed);
      }
    }
  }

  function forceShowLimitError(host, which, kind) {
    /* kind: 'min' or 'max'. Renders the appropriate error and enforces 1s min display. */
    var map = {
      width:  { input: '[data-pcv2-width]',  errEl: '[data-pcv2-error-width]',  dim: 'Width' },
      height: { input: '[data-pcv2-height]', errEl: '[data-pcv2-error-height]', dim: 'Height' },
      qty:    { input: '[data-pcv2-qty]',    errEl: '[data-pcv2-error-qty]',    dim: 'Quantity' }
    };
    var cfg = map[which];
    if (!cfg) return;
    var input = $(cfg.input, host);
    var errEl = $(cfg.errEl, host);
    if (!input || !errEl) return;
    var limit = parseFloat(input.getAttribute(kind));
    if (isNaN(limit)) return;

    var msg;
    if (kind === 'min') {
      msg = which === 'qty'
        ? 'Min quantity of ' + formatLimit(limit)
        : cfg.dim + ' must be at least ' + formatLimit(limit) + ' inches';
    } else {
      msg = cfg.dim + ' cannot exceed ' + formatLimit(limit) + (which === 'qty' ? '' : ' inches');
    }

    var stepper = input.closest('.pcv2__stepper');
    errEl.textContent = msg;
    errEl.hidden = false;
    input.classList.add('is-error');
    if (stepper) stepper.classList.add('is-error');

    if (!host.__pcv2Id) host.__pcv2Id = 'pcv2-' + Math.random().toString(36).slice(2, 9);
    var key = host.__pcv2Id + ':' + which;
    errorShownAt[key] = Date.now();

    if (errorHoldTimers[key]) clearTimeout(errorHoldTimers[key]);
    errorHoldTimers[key] = setTimeout(function () {
      var curVal = parseFloat(input.value);
      var mn = parseFloat(input.getAttribute('min'));
      var mx = parseFloat(input.getAttribute('max'));
      var stillInvalid = !isNaN(curVal) && ((!isNaN(mn) && curVal < mn) || (!isNaN(mx) && curVal > mx));
      if (!stillInvalid) {
        errEl.hidden = true;
        errEl.textContent = '';
        input.classList.remove('is-error');
        if (stepper) stepper.classList.remove('is-error');
        errorShownAt[key] = 0;
      }
      errorHoldTimers[key] = null;
    }, MIN_ERROR_DISPLAY_MS);
  }

  function observeLegacyPrices(host, popup) {
    // When existing JS updates the legacy item prices, re-render the cards
    var target = popup.querySelector('.customTabelPopup__table');
    if (!target || !window.MutationObserver) return;
    var debounceId = null;
    var obs = new MutationObserver(function () {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(function () {
        renderTierCards(host);
        /* Prices just updated — exit loading state */
        host.classList.remove('is-loading');
      }, 100);
    });
    obs.observe(target, { childList: true, subtree: true, characterData: true });
  }

  function attach(host) {
    if (!host || host.__pcv2Init) return;
    host.__pcv2Init = true;
    var popup = host.closest('.customTabelPopup');
    if (!popup) return;
    popup.classList.add('pcv2-host');

    // Qty input
    var qty = $('[data-pcv2-qty]', host);
    if (qty) {
      var qtyClampTimer = null;
      function clampQtyToMin() {
        var min = parseInt(qty.getAttribute('min'), 10);
        var cur = parseInt(qty.value, 10);
        if (!isNaN(min) && !isNaN(cur) && cur < min) {
          qty.value = String(min);
          updateActiveTier(host);
        }
      }
      qty.addEventListener('input', function () {
        validateInput(host, 'qty');
        updateActiveTier(host);
        if (qtyClampTimer) clearTimeout(qtyClampTimer);
        qtyClampTimer = setTimeout(clampQtyToMin, 500);
      });
      qty.addEventListener('change', function () {
        validateInput(host, 'qty');
        updateActiveTier(host);
      });
      qty.addEventListener('blur', function () {
        validateInput(host, 'qty', { immediate: true });
        clampQtyToMin();
      });
    }

    // CTA — open file picker AND close popup (mirrors legacy .customTabelPopup__uploadArt handler)
    var cta = $('[data-pcv2-cta]', host);
    if (cta) {
      cta.addEventListener('click', function () {
        try {
          /* Trigger legacy upload flow (filepond) if present, then close the popup. */
          var filepondLabel = document.querySelector('.filepond--drop-label label');
          if (filepondLabel) filepondLabel.click();
          var closeBtn = popup.querySelector('.customTabelPopup__close');
          if (closeBtn) closeBtn.click();
        } catch (err) { /* no-op */ }
      });
    }

    // "Choose a previously uploaded design" — let the legacy .purchase_from_previous handler run,
    // but close the calculator popup first so the overlay isn't hidden behind it.
    var prevLink = $('[data-pcv2-prev-link]', host);
    if (prevLink) {
      prevLink.addEventListener('click', function () {
        try {
          var closeBtn = popup.querySelector('.customTabelPopup__close');
          if (closeBtn) closeBtn.click();
        } catch (err) { /* no-op */ }
        /* Do NOT stopPropagation — the legacy $(document).on('click', '.purchase_from_previous')
           handler needs to fire to open the previous-designs overlay. */
      });
    }

    // Dropzone drag-and-drop — forward dropped files to main file input
    var dropzone = $('[data-pcv2-dropzone]', host);
    if (dropzone) {
      var preventDefaults = function (e) { e.preventDefault(); e.stopPropagation(); };
      ['dragenter', 'dragover'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          preventDefaults(e);
          dropzone.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          preventDefaults(e);
          dropzone.classList.remove('is-dragover');
        });
      });
      dropzone.addEventListener('drop', function (e) {
        try {
          var files = e.dataTransfer && e.dataTransfer.files;
          if (!files || !files.length) return;
          var fileInput = document.querySelector('#fileInput') || document.querySelector('input[type="file"]#fileInput') || document.querySelector('.filepond--browser');
          if (fileInput) {
            var dt = new DataTransfer();
            for (var i = 0; i < files.length; i++) dt.items.add(files[i]);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            var fpLabel = document.querySelector('.filepond--drop-label label');
            if (fpLabel) fpLabel.click();
          }
          var closeBtn = popup.querySelector('.customTabelPopup__close');
          if (closeBtn) closeBtn.click();
        } catch (err) { /* no-op */ }
      });
    }

    // Stepper +/- buttons
    $$('[data-pcv2-step]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var which = btn.getAttribute('data-pcv2-step');
        var dir = parseInt(btn.getAttribute('data-pcv2-dir'), 10) || 1;
        var targetInput = which === 'qty'
          ? $('[data-pcv2-qty]', host)
          : (which === 'width' ? $('[data-pcv2-width]', host) : $('[data-pcv2-height]', host));
        if (!targetInput) return;
        var step = parseFloat(targetInput.getAttribute('step')) || 1;
        var min = parseFloat(targetInput.getAttribute('min'));
        var max = parseFloat(targetInput.getAttribute('max'));
        var cur = parseFloat(targetInput.value) || 0;
        var requested = cur + dir * step;
        var next = requested;
        var hitMin = false;
        var hitMax = false;
        if (!isNaN(min) && requested < min) { next = min; hitMin = true; }
        if (!isNaN(max) && requested > max) { next = max; hitMax = true; }
        /* Also trigger when user clicks − while already at min, or + while already at max */
        if (!hitMin && dir < 0 && !isNaN(min) && cur <= min) { next = min; hitMin = true; }
        if (!hitMax && dir > 0 && !isNaN(max) && cur >= max) { next = max; hitMax = true; }
        /* For width/height step (0.5), keep one decimal; for qty, integer */
        targetInput.value = (which === 'qty') ? String(Math.round(next)) : String(Number(next.toFixed(2)).toString());
        /* Trigger input event so existing handlers run */
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        /* Show error + flash red if the user hit a limit */
        if (hitMin) forceShowLimitError(host, which, 'min');
        else if (hitMax) forceShowLimitError(host, which, 'max');
      });
    });

    // Copy min/max/step from legacy to new inputs so source of truth is respected
    pullLimitsFromLegacy(host);

    // Width / Height
    var w = $('[data-pcv2-width]', host);
    var h = $('[data-pcv2-height]', host);
    var syncTimer = null;
    var loadingTimer = null;
    function setLoading(on) {
      host.classList.toggle('is-loading', !!on);
    }
    function fireSync() {
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
      syncWidthHeightToLegacy(host);
      /* Loading ends after legacy price settles (mirror-backs + mutations) */
      if (loadingTimer) clearTimeout(loadingTimer);
      setLoading(true);
      setTimeout(function () { mirrorLegacyBack(host); }, 300);
      setTimeout(function () { mirrorLegacyBack(host); }, 900);
      loadingTimer = setTimeout(function () { setLoading(false); }, 1200);
    }
    function scheduleSync() {
      if (syncTimer) clearTimeout(syncTimer);
      setLoading(true);
      syncTimer = setTimeout(fireSync, 250);
    }
    if (w) w.addEventListener('input', function () {
      validateInput(host, 'width');
      scheduleSync();
    });
    if (h) h.addEventListener('input', function () {
      validateInput(host, 'height');
      scheduleSync();
    });
    /* On blur, fire sync immediately (whichever is fastest: 250ms debounce OR blur) */
    if (w) w.addEventListener('blur', function () {
      validateInput(host, 'width', { immediate: true });
      fireSync();
      mirrorLegacyBack(host);
    });
    if (h) h.addEventListener('blur', function () {
      validateInput(host, 'height', { immediate: true });
      fireSync();
      mirrorLegacyBack(host);
    });

    // Initial render + validate
    renderTierCards(host);
    updateActiveTier(host);
    validateInput(host, 'width');
    validateInput(host, 'height');
    validateInput(host, 'qty');

    // Watch for legacy price updates + watch legacy input values for clamping
    observeLegacyPrices(host, popup);
    observeLegacyInputs(host, popup);
  }

  function observeLegacyInputs(host, popup) {
    /* Watch legacy width/height inputs for attribute/value changes so we can
       mirror back (when legacy clamps the value) and keep min/max in sync. */
    if (!window.MutationObserver) return;
    var legacyW = popup.querySelector('input[name="width__value"]');
    var legacyH = popup.querySelector('input[name="height__value"]');
    [legacyW, legacyH].forEach(function (el) {
      if (!el) return;
      var obs = new MutationObserver(function () {
        pullLimitsFromLegacy(host);
        mirrorLegacyBack(host);
      });
      obs.observe(el, { attributes: true, attributeFilter: ['min', 'max', 'step', 'value'] });
      /* Also listen to change events in case JS sets value without mutation */
      el.addEventListener('change', function () { mirrorLegacyBack(host); });
    });
  }

  function init() {
    $$('.pcv2').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Catch late-rendered popups
  setTimeout(init, 500);
  setTimeout(init, 1500);
})();
