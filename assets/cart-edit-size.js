/* cart-edit-size.js — Edit Size popup for DTF / UV by-size cart items */
(function () {
  'use strict';

  var _data          = null;  // active item data while modal is open
  var _activeTab     = 'custom';
  var _lockingAspect = false; // prevent re-entrancy in syncPairedDim

  /* ─── MONEY ─── */
  function money(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  /* ─── ASPECT RATIO ─── */
  function ntGetAspectRatio() {
    if (!_data) return 0;
    // Edit mode: use the original item dims
    if (_data.width && _data.height) return _data.width / _data.height;
    // Add mode: derive from image pixel dimensions once loaded
    if (_data.imgPx && _data.imgPx.w && _data.imgPx.h) return _data.imgPx.w / _data.imgPx.h;
    return 0;
  }

  /*
   * Fit bounding-box (bw × bh) to the artwork's original aspect ratio.
   * Updates nt-edit-w / nt-edit-h (silently) and updates the selected
   * option label to show the fitted dimensions.
   */
  function ntApplyPopularSize(bw, bh) {
    var ar = ntGetAspectRatio();
    var w, h;
    if (ar > 0) {
      if (ar >= bw / bh) { w = bw;    h = bw / ar; }
      else               { h = bh;    w = bh * ar;  }
    } else {
      w = bw; h = bh;
    }

    // Clamp to product limits
    var minDim = _data.minDim || 0.25;
    var maxDim = _data.maxDim || 22;
    if (w > maxDim || h > maxDim) {
      var scale = Math.min(maxDim / w, maxDim / h);
      w *= scale; h *= scale;
    }
    w = Math.max(minDim, w);
    h = Math.max(minDim, h);

    // Push fitted dims into custom inputs (silently — tab stays on popular)
    document.getElementById('nt-edit-w').value = w.toFixed(2);
    document.getElementById('nt-edit-h').value = h.toFixed(2);

    // Update selected option label to show fitted dimensions
    var sel = document.getElementById('nt-popular-select');
    if (sel) {
      // Reset all options to their original labels first
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].dataset.originalLabel) {
          sel.options[i].textContent = sel.options[i].dataset.originalLabel;
        }
      }
      // Update selected option with fitted dimensions
      var selOpt = sel.options[sel.selectedIndex];
      if (selOpt && selOpt.dataset.originalLabel) {
        var origLabel = selOpt.dataset.originalLabel;
        var descPart  = origLabel.indexOf(' – ') !== -1 ? origLabel.split(' – ').slice(1).join(' – ') : '';
        selOpt.textContent = w.toFixed(2) + '" x ' + h.toFixed(2) + '"' +
                             (descPart ? ' – ' + descPart : '');
      }
    }

    // Smart Sizing label
    var smartSized = (Math.abs(w - bw) > 0.01 || Math.abs(h - bh) > 0.01);
    var label = document.getElementById('nt-smart-label');
    if (label) label.style.display = smartSized ? 'flex' : 'none';

    return { w: w, h: h };
  }

  /*
   * Sync the paired dimension input when user types in Custom tab.
   * Mirrors Cart V2's syncPairedDimension.
   */
  function ntSyncPairedDim(changedInput) {
    if (_lockingAspect) return;
    var ar = ntGetAspectRatio();
    if (!ar) return;

    var isWidth = (changedInput.id === 'nt-edit-w');
    var val = parseFloat(changedInput.value);
    if (!val || val <= 0) return;

    _lockingAspect = true;

    // Sync only — no clamping here. Clamping happens on blur so the user
    // sees the out-of-range message before their value gets corrected.
    var paired     = isWidth ? val / ar : val * ar;
    var pairedInput = document.getElementById(isWidth ? 'nt-edit-h' : 'nt-edit-w');
    if (pairedInput) pairedInput.value = paired.toFixed(2);

    _lockingAspect = false;
  }

  /* ─── DISCOUNT TIER PARSING ─── */
  function parseDiscountTiers(encodedInput) {
    if (!encodedInput) return [];
    try {
      var decoded = decodeURIComponent(decodeURIComponent(decodeURIComponent(encodedInput)));
      var entries = decoded.split('#').filter(Boolean);
      var raw = entries.map(function (entry) {
        var parts = entry.split('-');
        var min = parseInt((parts[0] || '').replace(/[^0-9]/g, ''), 10) || 0;
        var pct = parseInt((parts[1] || '').replace(/[^0-9]/g, ''), 10) || 0;
        return { min: min, pct: pct };
      }).sort(function (a, b) { return a.min - b.min; });
      var cleaned = [];
      for (var i = raw.length - 1; i >= 0; i--) {
        if (cleaned.length === 0 || raw[i].pct < cleaned[0].pct) cleaned.unshift(raw[i]);
      }
      return cleaned;
    } catch (e) { return []; }
  }

  function getCurrentTier(tiers, totalQty) {
    var current = { min: 0, pct: 0 };
    for (var i = 0; i < tiers.length; i++) {
      if (totalQty >= tiers[i].min) current = tiers[i];
      else break;
    }
    return current;
  }

  /* ─── LIVE CART QTY REFRESH ─── */
  // Fetch /cart.js and recalculate totalDtfQty from live data so the popup
  // always shows the correct discount tier, even after stepper qty changes.
  function ntRefreshTotalDtfQty(callback) {
    if (!_data) { if (callback) callback(); return; }
    // Find this item's _discount_name from its props
    var discName = '';
    for (var i = 0; i < (_data.props || []).length; i++) {
      if (_data.props[i].k === '_discount_name') { discName = _data.props[i].v; break; }
    }
    fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
    .then(function (r) { return r.json(); })
    .then(function (cart) {
      var total = 0;
      for (var j = 0; j < cart.items.length; j++) {
        var it = cart.items[j];
        var ip = it.properties || {};
        // Must have an upload property, _discount_input, and matching _discount_name
        var hasUpload = false;
        var hasDiscInput = false;
        var hasMatchingDn = false;
        var pKeys = Object.keys(ip);
        for (var k = 0; k < pKeys.length; k++) {
          var pk = pKeys[k].toLowerCase();
          if (pk.indexOf('upload') === 0 && pk.charAt(0) !== '_' && ip[pKeys[k]]) hasUpload = true;
          if (pKeys[k] === '_discount_input' && ip[pKeys[k]]) hasDiscInput = true;
          if (pKeys[k] === '_discount_name' && ip[pKeys[k]] === discName) hasMatchingDn = true;
        }
        if (hasUpload && hasDiscInput && hasMatchingDn) total += it.quantity;
      }
      _data.totalDtfQty = total;
      if (callback) callback();
    })
    .catch(function () { if (callback) callback(); });
  }

  /* ─── VARIANT LOOKUP by sqIn ─── */
  function findVariantForSqIn(variants, sqIn) {
    // Pass 1: range titles ("Style #1-9"), available only
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (!v.title || !v.available) continue;
      var m = v.title.match(/(\d+)\s*-\s*(\d+)/);
      if (m && sqIn >= parseInt(m[1], 10) && sqIn <= parseInt(m[2], 10)) return v;
    }
    // Pass 2: same, ignore availability
    for (var j = 0; j < variants.length; j++) {
      var v2 = variants[j];
      if (!v2.title) continue;
      var m2 = v2.title.match(/(\d+)\s*-\s*(\d+)/);
      if (m2 && sqIn >= parseInt(m2[1], 10) && sqIn <= parseInt(m2[2], 10)) return v2;
    }
    // Pass 3: max-number tier fallback
    var tiers = [];
    for (var k = 0; k < variants.length; k++) {
      var vk = variants[k];
      var nums = (vk.title || '').match(/\d+/g);
      if (nums && nums.length) tiers.push({ max: Math.max.apply(null, nums.map(Number)), variant: vk });
    }
    if (!tiers.length) return null;
    tiers.sort(function (a, b) { return a.max - b.max; });
    for (var t = 0; t < tiers.length; t++) {
      if (tiers[t].max >= sqIn) return tiers[t].variant;
    }
    return tiers[tiers.length - 1].variant;
  }

  /* ─── PRICING ─── */
  function ntUpdatePricing() {
    if (!_data) return;

    // Show dim limit message and bail if out of range — pricing stays blank
    // until the user corrects the value (clamp fires on blur)
    if (ntCheckDimLimits()) { ntClearPricing(); return; }

    // For BOTH tabs, dimensions come from nt-edit-w / nt-edit-h
    // (popular tab populates these via ntApplyPopularSize before pricing runs)
    var w = parseFloat(document.getElementById('nt-edit-w').value) || 0;
    var h = parseFloat(document.getElementById('nt-edit-h').value) || 0;

    if (_activeTab === 'custom') {
      // Update sq in display
      var sqIn  = (w && h) ? Math.round(w * h) : 0;
      var sqInEl = document.getElementById('nt-edit-sqin');
      if (sqIn > 0) { sqInEl.textContent = sqIn + ' sq in'; sqInEl.style.color = '#555'; }
      else           { sqInEl.textContent = '— sq in';       sqInEl.style.color = '#aaa'; }
      if (!w || !h) { ntClearPricing(); return; }
    } else {
      var sel = document.getElementById('nt-popular-select');
      if (!sel || !sel.value) { ntClearPricing(); return; }
      if (!w || !h) { ntClearPricing(); return; }
    }

    // Minimum 1 sq in for variant tier lookup — anything under 1 sq in rounds up
    var sqInFinal = Math.max(1, Math.round(w * h));
    var found     = findVariantForSqIn(_data.variants, sqInFinal);
    var basePrice = found ? found.price : 0;
    if (!basePrice) { ntClearPricing(); return; }

    var qty           = _data.editQty;
    var tiers         = parseDiscountTiers(_data.discountInput);
    // In add mode _data.qty is null (no existing line being replaced) — treat as 0
    var existingQty   = _data.qty != null ? _data.qty : 0;

    // "Other items" qty = total DTF qty excluding this line item.
    // If Shopify already applied a higher discount than our raw count implies,
    // back-calculate the minimum other-items qty that explains it — so that
    // reducing THIS item's qty still correctly lowers (or removes) the discount.
    var rawOtherQty = _data.totalDtfQty - existingQty;
    var otherQty    = rawOtherQty;
    if (_data.itemPrice > 0 && _data.origBasePrice > 0) {
      var shopifyDiscPct = Math.round((1 - _data.itemPrice / _data.origBasePrice) * 100);
      if (shopifyDiscPct > 0) {
        // Find the minimum total qty that produces this discount in the tier table
        var minForShopifyDisc = 0;
        for (var ti = 0; ti < tiers.length; ti++) {
          if (tiers[ti].pct === shopifyDiscPct) { minForShopifyDisc = tiers[ti].min; break; }
        }
        // Other items must be at least (minForShopifyDisc - existingQty)
        if (minForShopifyDisc > 0) {
          otherQty = Math.max(rawOtherQty, minForShopifyDisc - existingQty);
        }
      }
    }

    var effectiveTotal= otherQty + qty;
    var tier          = getCurrentTier(tiers, effectiveTotal);
    var discPct       = tier.pct;

    // Match Shopify's line-total rounding: compute final directly, then derive discount
    var origTotal   = basePrice * qty;
    var totalCents  = discPct > 0 ? Math.round(origTotal * (100 - discPct) / 100) : origTotal;
    // Per-unit display: floor to cents (matches Shopify's display)
    var discEa      = qty > 0 ? Math.floor(totalCents / qty) : basePrice;

    var eaOrigEl  = document.getElementById('nt-price-ea-orig');
    var eaEl      = document.getElementById('nt-price-ea');
    var totOrigEl = document.getElementById('nt-total-orig');
    var totEl     = document.getElementById('nt-total');
    var badgeEl   = document.getElementById('nt-disc-badge');

    // Always populate orig lines — visibility controls whether they show
    // so the layout height never shifts between discount/no-discount states
    eaOrigEl.textContent       = money(basePrice) + ' ea';
    totOrigEl.textContent      = money(origTotal);
    eaEl.textContent           = money(discPct > 0 ? discEa : basePrice) + ' ea';
    totEl.textContent          = money(totalCents);

    if (discPct > 0) {
      eaOrigEl.style.display  = 'block';
      totOrigEl.style.display = 'block';
      badgeEl.textContent     = discPct + '% off';
      badgeEl.style.visibility = 'visible';
    } else {
      eaOrigEl.style.display  = 'none';
      totOrigEl.style.display = 'none';
      badgeEl.style.visibility = 'hidden';
    }
    ntSetError('');
    ntUpdateDpiWarning();
  }

  function ntClearPricing() {
    document.getElementById('nt-price-ea-orig').style.display = 'none';
    document.getElementById('nt-price-ea').textContent        = '';
    document.getElementById('nt-total-orig').style.display    = 'none';
    document.getElementById('nt-total').textContent           = '';
    document.getElementById('nt-disc-badge').style.visibility = 'hidden';
    ntHideDpiWarning();
  }

  /* ─── TAB SWITCHING ─── */
  function ntSwitchTab(tab) {
    _activeTab = tab;
    var customBtn   = document.getElementById('nt-tab-custom');
    var popularBtn  = document.getElementById('nt-tab-popular');
    var customView  = document.getElementById('nt-view-custom');
    var popularView = document.getElementById('nt-view-popular');

    if (tab === 'custom') {
      customBtn.style.color        = '#111';
      customBtn.style.fontWeight   = '600';
      customBtn.style.borderBottom = '2px solid #019AFF';
      popularBtn.style.color       = '#888';
      popularBtn.style.fontWeight  = '500';
      popularBtn.style.borderBottom= '2px solid transparent';
      customView.style.display     = 'block';
      popularView.style.display    = 'none';
    } else {
      popularBtn.style.color        = '#111';
      popularBtn.style.fontWeight   = '600';
      popularBtn.style.borderBottom = '2px solid #019AFF';
      customBtn.style.color         = '#888';
      customBtn.style.fontWeight    = '500';
      customBtn.style.borderBottom  = '2px solid transparent';
      customView.style.display      = 'none';
      popularView.style.display     = 'block';
    }
    ntSetError('');
    ntUpdatePricing();
  }

  /* ─── OPEN ─── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.nt-edit-size-btn');
    if (!btn) return;
    var block = btn.closest('.nt-size-block');
    if (!block) return;

    var propsEl    = block.querySelector('.nt-props-json');
    var variantsEl = block.querySelector('.nt-variants-json');
    var popularEl  = block.querySelector('.nt-popular-json');

    var props = [], variants = [], popularSizes = [];
    try { props        = JSON.parse(propsEl.textContent).p;    } catch (_) {}
    try { variants     = JSON.parse(variantsEl.textContent);   } catch (_) {}
    try { popularSizes = JSON.parse(popularEl.textContent);    } catch (_) {}

    var qty = parseInt(block.dataset.qty, 10) || 1;

    _data = {
      lineKey:       block.dataset.lineKey,
      qty:           qty,
      editQty:       qty,
      width:         parseFloat(block.dataset.width)  || 0,
      height:        parseFloat(block.dataset.height) || 0,
      productHandle: block.dataset.productHandle,
      variantId:     parseInt(block.dataset.variantId, 10),
      props:         props,
      variants:      variants,
      popularSizes:  popularSizes,
      discountInput: block.dataset.discountInput || '',
      totalDtfQty:   parseInt(block.dataset.totalDtfQty, 10) || qty,
      itemPrice:     parseInt(block.dataset.itemPrice, 10) || 0,
      origBasePrice: 0,
      isUv:          block.dataset.isUv === 'true',
      minDim:        parseFloat(block.dataset.minDim) || 0.25,
      maxDim:        parseFloat(block.dataset.maxDim) || 22
    };
    // Compute the base price at original dimensions so we can derive
    // the discount pct Shopify actually applied (in case our count is off)
    (function () {
      var origSqIn = Math.max(1, Math.round((_data.width || 0) * (_data.height || 0)));
      if (origSqIn > 0) {
        var ov = findVariantForSqIn(_data.variants, origSqIn);
        if (ov) _data.origBasePrice = ov.price;
      }
    }());

    // Pre-fill width / height
    document.getElementById('nt-edit-w').value = _data.width;
    document.getElementById('nt-edit-h').value = _data.height;

    // Qty
    document.getElementById('nt-qty-val').value = _data.editQty;
    document.getElementById('nt-qty-minus').disabled  = _data.editQty <= 1;

    // Populate popular sizes dropdown
    var sel = document.getElementById('nt-popular-select');
    sel.innerHTML = '<option value="">Select a popular size</option>';
    popularSizes.forEach(function (ps) {
      var opt = document.createElement('option');
      opt.value               = ps.w + ',' + ps.h;
      opt.dataset.variantId   = ps.id;
      opt.dataset.originalLabel = ps.label + (ps.desc ? ' – ' + ps.desc : '');
      opt.textContent         = opt.dataset.originalLabel;
      sel.appendChild(opt);
    });

    // Hide smart label
    var smartLabel = document.getElementById('nt-smart-label');
    if (smartLabel) smartLabel.style.display = 'none';

    // Immediate DPI warning: if the item was added to cart with a DPI warning
    // already active, show it right away (synchronous, no network needed).
    // The async dimension load below will then refine it based on current size.
    _data.imgPx = null;
    var _storedDpiWarning = false;
    for (var di = 0; di < props.length; di++) {
      if (props[di].k === 'DPI Warning' && props[di].v === 'Yes') {
        _storedDpiWarning = true; break;
      }
    }
    if (_storedDpiWarning) { ntShowDpiWarning(); } else { ntHideDpiWarning(); }

    // Async: load image pixel dimensions so we can recalculate DPI as the user
    // changes size. Fast path: imgix ?fm=json (tiny JSON, no image download).
    // Fallback: new Image() — always works, just slower.
    (function () {
      var uploadUrl = '';
      for (var pi = 0; pi < props.length; pi++) {
        if (props[pi].k.toLowerCase().indexOf('upload') !== -1 && props[pi].v) {
          uploadUrl = props[pi].v; break;
        }
      }
      if (!uploadUrl) return;
      var rawUrl = uploadUrl.split('?')[0];
      var ext = rawUrl.split('.').pop().toLowerCase();
      if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') return;
      var absUrl = (rawUrl.indexOf('//') === 0 ? 'https:' : '') + rawUrl;

      function onDims(w, h) {
        if (_data && w && h) {
          _data.imgPx = { w: w, h: h };
          ntUpdateDpiWarning();
        }
      }

      function imgFallback() {
        var img = new Image();
        img.onload  = function () { onDims(img.naturalWidth, img.naturalHeight); };
        img.onerror = function () { /* silent — stored-prop warning stays if active */ };
        img.src = absUrl;
      }

      // Try imgix JSON metadata first (fast — only fetches header metadata)
      if (absUrl.indexOf('imgix.net') !== -1) {
        fetch(absUrl + '?fm=json')
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (d) {
            if (d && d.PixelWidth && d.PixelHeight) {
              onDims(d.PixelWidth, d.PixelHeight);
            } else {
              imgFallback();
            }
          })
          .catch(function () { imgFallback(); });
      } else {
        imgFallback();
      }
    }());

    ntSwitchTab('custom');
    ntSetError('');
    ntClearDimError();
    ntSetConfirmState(false);
    // Fetch live cart to get accurate totalDtfQty before first pricing
    ntRefreshTotalDtfQty(function () { ntUpdatePricing(); });

    document.getElementById('nt-edit-modal').style.display = 'flex';
    ntAdjustModalHeight();
    if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      document.getElementById('nt-edit-w').focus();
    }
  });

  /* ─── CLICK EVENTS ─── */
  document.addEventListener('click', function (e) {
    // Tabs
    if (e.target.closest('#nt-tab-custom'))  { ntSwitchTab('custom');  return; }
    if (e.target.closest('#nt-tab-popular')) { ntSwitchTab('popular'); return; }

    var id = e.target.id;

    // Width steppers
    if (id === 'nt-w-minus') {
      var wIn = document.getElementById('nt-edit-w');
      wIn.value = Math.max(0.25, Math.round((parseFloat(wIn.value) || 0.25) * 4 - 1) / 4).toFixed(2);
      ntSyncPairedDim(wIn); ntUpdatePricing(); return;
    }
    if (id === 'nt-w-plus') {
      var wIn2 = document.getElementById('nt-edit-w');
      var maxDimW = _data ? (_data.maxDim || 22) : 22;
      wIn2.value = Math.min(maxDimW, (Math.round((parseFloat(wIn2.value) || 0) * 4 + 1) / 4)).toFixed(2);
      ntSyncPairedDim(wIn2); ntUpdatePricing(); return;
    }

    // Height steppers
    if (id === 'nt-h-minus') {
      var hIn = document.getElementById('nt-edit-h');
      hIn.value = Math.max(0.25, Math.round((parseFloat(hIn.value) || 0.25) * 4 - 1) / 4).toFixed(2);
      ntSyncPairedDim(hIn); ntUpdatePricing(); return;
    }
    if (id === 'nt-h-plus') {
      var hIn2 = document.getElementById('nt-edit-h');
      var maxDimH = _data ? (_data.maxDim || 22) : 22;
      hIn2.value = Math.min(maxDimH, (Math.round((parseFloat(hIn2.value) || 0) * 4 + 1) / 4)).toFixed(2);
      ntSyncPairedDim(hIn2); ntUpdatePricing(); return;
    }

    // Qty steppers
    if (id === 'nt-qty-minus') {
      if (!_data) return;
      _data.editQty = Math.max(1, _data.editQty - 1);
      document.getElementById('nt-qty-val').value = _data.editQty;
      document.getElementById('nt-qty-minus').disabled  = _data.editQty <= 1;
      ntUpdatePricing(); return;
    }
    if (id === 'nt-qty-plus') {
      if (!_data) return;
      _data.editQty++;
      document.getElementById('nt-qty-val').value = _data.editQty;
      document.getElementById('nt-qty-minus').disabled  = false;
      ntUpdatePricing(); return;
    }
  });

  /* ─── INPUT / CHANGE ─── */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'nt-qty-val') {
      if (!_data) return;
      var val = parseInt(e.target.value, 10);
      if (val >= 1) {
        _data.editQty = val;
        document.getElementById('nt-qty-minus').disabled = val <= 1;
        ntUpdatePricing();
      }
      return;
    }
    if (e.target.id === 'nt-edit-w' || e.target.id === 'nt-edit-h') {
      ntSyncPairedDim(e.target); // lock aspect ratio in custom mode
      ntUpdatePricing();
    }
  });

  // On blur: if qty input left empty or invalid, reset to 1
  document.addEventListener('blur', function (e) {
    if (e.target.id !== 'nt-qty-val') return;
    if (!_data) return;
    var val = parseInt(e.target.value, 10);
    if (!val || val < 1) {
      _data.editQty = 1;
      e.target.value = 1;
      document.getElementById('nt-qty-minus').disabled = true;
      ntUpdatePricing();
    }
  }, true);

  // On blur: clamp out-of-range typed values and re-price.
  // Handles both dims together so aspect ratio is preserved when scaling down.
  document.addEventListener('blur', function (e) {
    if (e.target.id !== 'nt-edit-w' && e.target.id !== 'nt-edit-h') return;
    if (!_data) return;
    var wEl    = document.getElementById('nt-edit-w');
    var hEl    = document.getElementById('nt-edit-h');
    var w      = parseFloat(wEl.value) || 0;
    var h      = parseFloat(hEl.value) || 0;
    var minDim = _data.minDim || 0.25;
    var maxDim = _data.maxDim || 22;
    var ar     = ntGetAspectRatio();
    var changed = false;

    // Max: scale both dims down proportionally so aspect ratio is preserved
    if (w > maxDim || h > maxDim) {
      if (ar > 0) {
        var scale = Math.min(maxDim / w, maxDim / h);
        w *= scale; h *= scale;
      } else {
        if (w > maxDim) w = maxDim;
        if (h > maxDim) h = maxDim;
      }
      changed = true;
    }

    // Min: floor each dim independently
    if ((w && w < minDim) || (h && h < minDim)) {
      if (w && w < minDim) w = minDim;
      if (h && h < minDim) h = minDim;
      changed = true;
    }

    if (changed) {
      wEl.value = w.toFixed(2);
      hEl.value = h.toFixed(2);
      ntUpdatePricing();
    }
  }, true); // capture — blur doesn't bubble

  document.addEventListener('change', function (e) {
    if (e.target.id === 'nt-popular-select') {
      var val = e.target.value;
      if (!val) return;
      var parts = val.split(',');
      var bw = parseFloat(parts[0]) || 0;
      var bh = parseFloat(parts[1]) || 0;
      if (!bw || !bh) return;
      // Fit to aspect ratio → push fitted dims into custom inputs (tab stays on popular)
      ntApplyPopularSize(bw, bh);
      ntUpdatePricing();
    }
  });

  /* ─── CONFIRM ─── */
  document.addEventListener('click', function (e) {
    if (e.target.id !== 'nt-edit-confirm') return;
    if (!_data) return;

    // Always read fitted values from the custom inputs (popular selection pre-fills them)
    var w = parseFloat(document.getElementById('nt-edit-w').value);
    var h = parseFloat(document.getElementById('nt-edit-h').value);

    if (!w || !h || w <= 0 || h <= 0) { ntSetError('Please enter valid width and height.'); return; }
    var cMin = _data.minDim || 0.25;
    var cMax = _data.maxDim || 22;
    if (w < cMin || h < cMin) { ntSetError('Minimum size for this product is ' + cMin + '".'); return; }
    if (w > cMax || h > cMax) { ntSetError('Maximum size for this product is ' + cMax + '".'); return; }

    ntSetConfirmState(true);
    ntSetError('');

    var sqIn      = Math.max(1, Math.round(w * h));
    var found     = findVariantForSqIn(_data.variants, sqIn);
    var variantId = found ? found.id : _data.variantId;

    // Build updated properties — preserve all, overwrite Width & Height
    // Use the exact key casing already in the item (could be 'width' or 'Width')
    var widthKey  = 'Width';
    var heightKey = 'Height';
    for (var i = 0; i < _data.props.length; i++) {
      if (_data.props[i].k.toLowerCase() === 'width')  widthKey  = _data.props[i].k;
      if (_data.props[i].k.toLowerCase() === 'height') heightKey = _data.props[i].k;
    }
    var properties = {};
    for (var j = 0; j < _data.props.length; j++) {
      properties[_data.props[j].k] = _data.props[j].v;
    }
    properties[widthKey]  = String(w);
    properties[heightKey] = String(h);

    /* ── Helper: find an existing cart line that matches variant + size dims + upload ── */
    function ntFindMatchingLine(cart, vid, props, excludeKey) {
      // Normalise a value for comparison — strip &amp; encoding layers, trim
      function norm(v) { var s = String(v || ''); while (s.indexOf('&amp;') !== -1) s = s.replace(/&amp;/g, '&'); return s.trim(); }
      // Extract upload base path (before query string) for comparison
      function uploadBase(v) { return norm(v).split('?')[0]; }

      /* New cart-adds write _width / _height (underscore-prefixed → hidden in
         checkout). Read those first; fall back to legacy width / Width keys so
         line items added before the rename keep working. */
      var newW = norm(props._width || props.width || props.Width || '');
      var newH = norm(props._height || props.height || props.Height || '');
      // Find the upload key (could be "Upload", "Upload (Vector Files Preferred)", etc.)
      var newUpload = '';
      var uploadKey = '';
      var pKeys = Object.keys(props);
      for (var k = 0; k < pKeys.length; k++) {
        if (pKeys[k].toLowerCase().indexOf('upload') === 0 && pKeys[k].charAt(0) !== '_') {
          newUpload = uploadBase(props[pKeys[k]]);
          uploadKey = pKeys[k];
          break;
        }
      }

      for (var i = 0; i < cart.items.length; i++) {
        var it = cart.items[i];
        if (it.variant_id !== vid) continue;
        if (excludeKey && it.key === excludeKey) continue;
        var ip = it.properties || {};
        // Match width + height (numeric)
        if (norm(ip.width || ip.Width || '') !== newW) continue;
        if (norm(ip.height || ip.Height || '') !== newH) continue;
        // Match upload base path
        if (uploadKey) {
          var existUpload = uploadBase(ip[uploadKey] || '');
          if (existUpload !== newUpload) continue;
        }
        return it;
      }
      return null;
    }

    if (_data.mode === 'add') {
      // Add Size — check for duplicate first, merge if found
      fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var existing = ntFindMatchingLine(cart, variantId, properties, null);
        if (existing) {
          // Merge: update existing line's quantity
          return fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id: existing.key, quantity: existing.quantity + _data.editQty })
          }).then(function (r) { return r.json(); });
        } else {
          // No duplicate — add new line
          return fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              items: [{ id: variantId, quantity: _data.editQty, properties: properties }]
            })
          }).then(function (r) { return r.json(); });
        }
      })
      .then(function (result) {
        if (result.status && result.status >= 400) throw new Error(result.description || 'Could not add size.');
        ntResetModalMode();
        window.location.reload();
      })
      .catch(function (err) {
        ntSetError(err.message || 'Something went wrong. Please try again.');
        ntSetConfirmState(false);
      });
      return;
    }

    // Edit Size — remove old line, then merge into existing or add new
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: _data.lineKey, quantity: 0 })
    })
    .then(function (r) { return r.json(); })
    .then(function (cart) {
      var existing = ntFindMatchingLine(cart, variantId, properties, null);
      if (existing) {
        // Merge into the existing line
        return fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: existing.key, quantity: existing.quantity + _data.editQty })
        }).then(function (r) { return r.json(); });
      } else {
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            items: [{ id: variantId, quantity: _data.editQty, properties: properties }]
          })
        }).then(function (r) { return r.json(); });
      }
    })
    .then(function (result) {
      if (result.status && result.status >= 400) throw new Error(result.description || 'Could not update size.');
      window.location.reload();
    })
    .catch(function (err) {
      ntSetError(err.message || 'Something went wrong. Please try again.');
      ntSetConfirmState(false);
    });
  });

  /* ─── DELETE ALL SIZES ─── */
  var _pendingDeleteGroupKey = null;

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.nt-delete-all-btn');
    if (!btn) return;
    _pendingDeleteGroupKey = btn.dataset.groupKey || null;
    var modal = document.getElementById('nt-delete-all-modal');
    if (modal) modal.style.display = 'flex';
  });

  document.addEventListener('click', function (e) {
    if (e.target.id === 'nt-delete-all-cancel' || e.target.id === 'nt-delete-all-modal') {
      var modal = document.getElementById('nt-delete-all-modal');
      if (modal) modal.style.display = 'none';
      _pendingDeleteGroupKey = null;
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.id !== 'nt-delete-all-confirm') return;
    var modal = document.getElementById('nt-delete-all-modal');
    if (!_pendingDeleteGroupKey) { if (modal) modal.style.display = 'none'; return; }

    var group = document.querySelector('.nt-design-group[data-group-key="' + _pendingDeleteGroupKey + '"]');
    var keys = [];
    if (group) {
      group.querySelectorAll('.nt-size-block[data-line-key]').forEach(function (el) {
        keys.push(el.dataset.lineKey);
      });
    }

    if (modal) modal.style.display = 'none';
    _pendingDeleteGroupKey = null;
    if (!keys.length) return;

    var updates = {};
    keys.forEach(function (k) { updates[k] = 0; });

    e.target.disabled = true;
    fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: updates })
    })
    .then(function () { window.location.reload(); })
    .catch(function () { window.location.reload(); });
  });

  /* ─── ADD SIZE OPEN ─── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.nt-add-size-btn');
    if (!btn) return;
    var firstKey = btn.dataset.firstKey;
    if (!firstKey) return;
    var block = document.querySelector('.nt-size-block[data-line-key="' + firstKey + '"]');
    if (!block) return;

    var propsEl    = block.querySelector('.nt-props-json');
    var variantsEl = block.querySelector('.nt-variants-json');
    var popularEl  = block.querySelector('.nt-popular-json');
    if (!propsEl || !variantsEl) return;

    var props        = JSON.parse(propsEl.textContent);
    var variants     = JSON.parse(variantsEl.textContent);
    var popularSizes = popularEl ? JSON.parse(popularEl.textContent) : [];

    _data = {
      lineKey:       null,
      qty:           null,
      editQty:       1,
      // Read existing item dims for aspect ratio sync — inputs are still cleared below
      width:         parseFloat(block.dataset.width)  || 0,
      height:        parseFloat(block.dataset.height) || 0,
      productHandle: block.dataset.productHandle,
      variantId:     parseInt(block.dataset.variantId),
      props:         props.p,
      variants:      variants,
      popularSizes:  popularSizes,
      discountInput: block.dataset.discountInput || '',
      totalDtfQty:   parseInt(block.dataset.totalDtfQty) || 0,
      isUv:          block.dataset.isUv === 'true',
      minDim:        parseFloat(block.dataset.minDim) || 0.25,
      maxDim:        parseFloat(block.dataset.maxDim) || 22,
      mode:          'add'
    };
    _data.tiers = parseDiscountTiers(_data.discountInput);

    // Put modal into "add" mode
    var modal = document.getElementById('nt-edit-modal');
    var titleEl   = document.getElementById('nt-modal-title');
    var confirmEl = document.getElementById('nt-edit-confirm');
    if (titleEl)   titleEl.textContent   = 'Add Size';
    if (confirmEl) confirmEl.textContent = 'Add to Cart';

    // Pre-fill with the first child item's dims as a default starting point
    document.getElementById('nt-edit-w').value  = _data.width  ? _data.width.toFixed(2)  : '';
    document.getElementById('nt-edit-h').value  = _data.height ? _data.height.toFixed(2) : '';
    document.getElementById('nt-qty-val').value = 1;
    document.getElementById('nt-qty-minus').disabled = true;

    // Populate popular sizes dropdown (same as edit open)
    var sel = document.getElementById('nt-popular-select');
    sel.innerHTML = '<option value="">Select a popular size</option>';
    popularSizes.forEach(function (ps) {
      var opt = document.createElement('option');
      opt.value                 = ps.w + ',' + ps.h;
      opt.dataset.variantId     = ps.id;
      opt.dataset.originalLabel = ps.label + (ps.desc ? ' \u2013 ' + ps.desc : '');
      opt.textContent           = opt.dataset.originalLabel;
      sel.appendChild(opt);
    });

    // Hide smart sizing label
    var smartLabel = document.getElementById('nt-smart-label');
    if (smartLabel) smartLabel.style.display = 'none';

    // Immediate DPI warning from stored property
    _data.imgPx = null;
    var _storedDpiWarning = false;
    var propsArr = props.p || [];
    for (var di = 0; di < propsArr.length; di++) {
      if (propsArr[di].k === 'DPI Warning' && propsArr[di].v === 'Yes') {
        _storedDpiWarning = true; break;
      }
    }
    if (_storedDpiWarning) { ntShowDpiWarning(); } else { ntHideDpiWarning(); }

    // Async: load image pixel dims for DPI warning + aspect ratio in add mode
    (function () {
      var uploadUrl = '';
      for (var pi = 0; pi < propsArr.length; pi++) {
        if (propsArr[pi].k.toLowerCase().indexOf('upload') !== -1 && propsArr[pi].v) {
          uploadUrl = propsArr[pi].v; break;
        }
      }
      if (!uploadUrl) return;
      var rawUrl = uploadUrl.split('?')[0];
      var ext = rawUrl.split('.').pop().toLowerCase();
      if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') return;
      var absUrl = (rawUrl.indexOf('//') === 0 ? 'https:' : '') + rawUrl;

      function onDims(w, h) {
        if (_data && w && h) {
          _data.imgPx = { w: w, h: h };
          ntUpdateDpiWarning();
        }
      }
      function imgFallback() {
        var img = new Image();
        img.onload  = function () { onDims(img.naturalWidth, img.naturalHeight); };
        img.onerror = function () {};
        img.src = absUrl;
      }
      if (absUrl.indexOf('imgix.net') !== -1) {
        fetch(absUrl + '?fm=json')
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (d) {
            if (d && d.PixelWidth && d.PixelHeight) { onDims(d.PixelWidth, d.PixelHeight); }
            else { imgFallback(); }
          })
          .catch(function () { imgFallback(); });
      } else {
        imgFallback();
      }
    }());

    ntSwitchTab('custom');
    ntSetError('');
    ntClearDimError();
    ntSetConfirmState(false);
    // Fetch live cart to get accurate totalDtfQty before first pricing
    ntRefreshTotalDtfQty(function () { ntUpdatePricing(); });
    modal.style.display = 'flex';
    ntAdjustModalHeight();
    if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      document.getElementById('nt-edit-w').focus();
    }
  });

  /* ─── CLOSE ─── */
  function ntResetModalMode() {
    var titleEl   = document.getElementById('nt-modal-title');
    var confirmEl = document.getElementById('nt-edit-confirm');
    if (titleEl)   titleEl.textContent   = 'Edit Size';
    if (confirmEl) confirmEl.textContent = 'Update';
  }

  document.addEventListener('click', function (e) {
    var modal = document.getElementById('nt-edit-modal');
    if (!modal) return;
    if (e.target.id === 'nt-edit-cancel' || e.target.id === 'nt-edit-close' || e.target.id === 'nt-edit-modal') {
      modal.style.display = 'none';
      ntResetModalHeight();
      ntResetModalMode();
      _data = null;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('nt-edit-modal');
      if (modal && modal.style.display !== 'none') { modal.style.display = 'none'; ntResetModalHeight(); ntResetModalMode(); _data = null; }
    }
  });

  /* ─── DPI / CLARITY WARNING ─── */
  var NT_MIN_DPI = 72;

  function ntUpdateDpiWarning() {
    if (!_data || !_data.imgPx) { ntHideDpiWarning(); return; }
    var w = parseFloat(document.getElementById('nt-edit-w').value) || 0;
    var h = parseFloat(document.getElementById('nt-edit-h').value) || 0;
    if (!w || !h) { ntHideDpiWarning(); return; }

    // Condition 1 (matches PDP): image is too small in absolute terms —
    // (W×H)/minDPI < 288 means the image has too few pixels to ever print cleanly.
    // Warn regardless of selected size; only fix is a better upload.
    if ((_data.imgPx.w * _data.imgPx.h) / NT_MIN_DPI < 288) {
      ntShowDpiWarning(); return;
    }

    // Condition 2: selected print area exceeds what the image can cover at min DPI
    var maxSqIn      = (_data.imgPx.w / NT_MIN_DPI) * (_data.imgPx.h / NT_MIN_DPI);
    var selectedSqIn = w * h;
    if (selectedSqIn > maxSqIn) { ntShowDpiWarning(); } else { ntHideDpiWarning(); }
  }

  function ntSetInputBorders(color) {
    var isWarning = color !== '#ddd';
    var width = isWarning ? '2.5px' : '1.5px';
    var wEl  = document.getElementById('nt-edit-w');
    var hEl  = document.getElementById('nt-edit-h');
    var selEl = document.getElementById('nt-popular-select');
    if (wEl  && wEl.parentElement)  { wEl.parentElement.style.borderColor  = color; wEl.parentElement.style.borderWidth  = width; }
    if (hEl  && hEl.parentElement)  { hEl.parentElement.style.borderColor  = color; hEl.parentElement.style.borderWidth  = width; }
    if (selEl) { selEl.style.borderColor = color; selEl.style.borderWidth = width; }
  }

  function ntShowDpiWarning() {
    var el = document.getElementById('nt-dpi-warning');
    if (el) el.style.display = 'block';
    ntSetInputBorders('#fea333');
  }

  function ntHideDpiWarning() {
    var el = document.getElementById('nt-dpi-warning');
    if (el) el.style.display = 'none';
    ntSetInputBorders('#ddd');
  }

  /* ─── DIMENSION LIMIT MESSAGES ─── */
  // Returns true if either dim is out of range (message shown), false if OK (message cleared).
  function ntCheckDimLimits() {
    if (!_data) return false;
    var w      = parseFloat(document.getElementById('nt-edit-w').value) || 0;
    var h      = parseFloat(document.getElementById('nt-edit-h').value) || 0;
    var minDim = _data.minDim || 0.25;
    var maxDim = _data.maxDim || 22;

    if ((w && w > maxDim) || (h && h > maxDim)) {
      ntSetDimError('Maximum size for this product is ' + maxDim + '"');
      return true;
    }
    if ((w && w < minDim) || (h && h < minDim)) {
      ntSetDimError('Minimum size for this product is ' + minDim + '"');
      return true;
    }
    ntClearDimError();
    return false;
  }

  function ntSetDimError(msg) {
    var el = document.getElementById('nt-dim-error');
    if (!el) return;
    el.textContent   = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function ntClearDimError() { ntSetDimError(''); }

  /* ─── INFO TOOLTIP (fixed position — escapes modal overflow:hidden) ─── */
  var _tipEl = null;
  var _tipText = 'We automatically scale your design to the largest dimension of the popular size you choose, ensuring you only pay for the space you need. For example, a 4"\xd78" upload becomes 1"\xd72" when you select a 2"\xd72" size.';

  function ntShowTip(iconEl) {
    if (!_tipEl) {
      _tipEl = document.createElement('div');
      _tipEl.style.cssText = 'position:fixed; background:#111; color:#fff; font-size:12px; line-height:1.5; border-radius:8px; padding:10px 12px; max-width:240px; z-index:99999; pointer-events:none; white-space:normal; box-shadow:0 4px 16px rgba(0,0,0,0.3);';
      _tipEl.textContent = _tipText;
      document.body.appendChild(_tipEl);
    }
    _tipEl.style.display = 'block';
    var rect = iconEl.getBoundingClientRect();
    var tw = 240;
    var th = _tipEl.offsetHeight || 110;
    var top = rect.top - th - 8;
    var left = rect.left;
    if (left + tw > window.innerWidth - 12) left = window.innerWidth - tw - 12;
    if (left < 12) left = 12;
    if (top < 12) top = rect.bottom + 8; // flip below if not enough space above
    _tipEl.style.top  = top  + 'px';
    _tipEl.style.left = left + 'px';
  }

  function ntHideTip() { if (_tipEl) _tipEl.style.display = 'none'; }

  document.addEventListener('mouseover',  function(e) { var ic = e.target.closest('.nt-info-icon'); if (ic) ntShowTip(ic); });
  document.addEventListener('mouseout',   function(e) { if (e.target.closest('.nt-info-icon')) ntHideTip(); });
  document.addEventListener('focusin',    function(e) { var ic = e.target.closest('.nt-info-icon'); if (ic) ntShowTip(ic); });
  document.addEventListener('focusout',   function(e) { if (e.target.closest('.nt-info-icon')) ntHideTip(); });
  document.addEventListener('focus', function(e) {
    var id = e.target.id;
    if (id !== 'nt-edit-w' && id !== 'nt-edit-h' && id !== 'nt-qty-val') return;
    var el = e.target;
    setTimeout(function() {
      var len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
  }, true);

  function ntAdjustModalHeight() {
    var modal = document.getElementById('nt-edit-modal');
    var box = document.getElementById('nt-modal-box');
    if (!modal || !box) return;
    var vv = window.visualViewport;
    var vh = vv ? vv.height : window.innerHeight;
    var offsetTop = vv ? vv.offsetTop : 0;
    var maxH = vh - 32;
    box.style.maxHeight = maxH + 'px';
    var actualH = box.offsetHeight;
    var topPad = Math.max(16, (vh - actualH) / 2) + offsetTop;
    modal.style.paddingTop = topPad + 'px';
  }
  function ntResetModalHeight() {
    var modal = document.getElementById('nt-edit-modal');
    var box = document.getElementById('nt-modal-box');
    if (box) box.style.maxHeight = '';
    if (modal) modal.style.paddingTop = '';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
      var modal = document.getElementById('nt-edit-modal');
      if (modal && modal.style.display !== 'none') ntAdjustModalHeight();
    });
  }

  /* ─── HELPERS ─── */
  function ntSetError(msg) {
    var el = document.getElementById('nt-edit-error');
    if (!el) return;
    el.textContent   = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function ntSetConfirmState(loading) {
    var btn = document.getElementById('nt-edit-confirm');
    var box = document.getElementById('nt-modal-box');
    if (!btn) return;
    btn.disabled    = loading;
    var isAdd = _data && _data.mode === 'add';
    btn.textContent = loading ? (isAdd ? 'Adding' : 'Updating') : (isAdd ? 'Add to Cart' : 'Update');
    btn.classList.toggle('nt-updating', loading);
    if (box) box.classList.toggle('nt-modal-updating', loading);
  }

})();
