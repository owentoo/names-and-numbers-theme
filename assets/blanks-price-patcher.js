/* Blanks Price Patcher v3 — Tier Pricing
   Uses the same tier pricing system as the quick-buy modal.
   Each blank variant has a tier_pricing metafield with exact prices per tier.
   Tier level is determined by cart total ($99/$150/$250/$500/$1000/$1750/$3800).

   Lightweight: no /cart.js fetch on non-cart pages until sidebar opens.
   Only patches is-blank="true" items with data-tier-pricing attributes. */
(function() {
  'use strict';

  /* ── Tier pricing functions (same logic as grt-global-quick-buy-modal.js) ── */
  function parseTierPricing(tierPricingRaw) {
    if (!tierPricingRaw) return [];
    var tierBreaks = [99, 150, 250, 500, 1000, 1750, 3800];
    function normalize(values) {
      if (!values || !values.length) return [];
      var out = [];
      for (var i = 0; i < values.length; i++) {
        var n = parseInt(String(values[i]).trim(), 10);
        if (!isNaN(n) && n > 0) out.push(n);
      }
      return out;
    }
    if (Array.isArray(tierPricingRaw)) return normalize(tierPricingRaw);
    if (typeof tierPricingRaw === 'object' && tierPricingRaw !== null) {
      var objectTiers = [];
      for (var i = 0; i < tierBreaks.length; i++) {
        var key = String(tierBreaks[i]);
        if (tierPricingRaw[key] != null) objectTiers.push(tierPricingRaw[key]);
      }
      if (objectTiers.length) return normalize(objectTiers);
      var keys = Object.keys(tierPricingRaw);
      return normalize(keys.map(function(k) { return tierPricingRaw[k]; }));
    }
    var raw = String(tierPricingRaw).trim();
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalize(parsed);
      if (parsed && typeof parsed === 'object') {
        var parsedTiers = [];
        for (var j = 0; j < tierBreaks.length; j++) {
          if (parsed[String(tierBreaks[j])] != null) parsedTiers.push(parsed[String(tierBreaks[j])]);
        }
        if (parsedTiers.length) return normalize(parsedTiers);
        return normalize(Object.keys(parsed).map(function(k) { return parsed[k]; }));
      }
    } catch (e) {}
    if (raw.indexOf(':') > -1) {
      var valueMatches = raw.match(/:\s*"?([0-9]+)"?/g) || [];
      if (valueMatches.length) {
        return normalize(valueMatches.map(function(chunk) {
          var parts = chunk.split(':');
          return parts.length > 1 ? parts[1].replace(/"/g, '').trim() : '';
        }));
      }
    }
    return normalize(raw.split(','));
  }

  function getTierLevel(virtualTotal) {
    if (virtualTotal >= 3800) return 7;
    if (virtualTotal >= 1750) return 6;
    if (virtualTotal >= 1000) return 5;
    if (virtualTotal >= 500) return 4;
    if (virtualTotal >= 250) return 3;
    if (virtualTotal >= 150) return 2;
    if (virtualTotal >= 99) return 1;
    return 0;
  }

  function getTierPrice(basePrice, tierPricingRaw, tierLevel) {
    var tiers = parseTierPricing(tierPricingRaw);
    if (tierLevel > 0 && tiers.length >= tierLevel) return tiers[tierLevel - 1];
    return basePrice;
  }

  /* ── Retail multiplier (same as grt-global-quick-buy-modal.js) ── */
  var RETAIL_PRICE_MULTIPLIER = 1.96;

  /* ── Utilities ── */
  function money(cents) { return '$' + (cents / 100).toFixed(2); }
  var _isCartPage = /\/cart\b/.test(window.location.pathname);
  var _patching = false;
  var _lastPatchAt = 0;
  var _pendingPatch = null;
  var PATCH_MIN_INTERVAL_MS = 1500; /* throttle: at most one /cart.json fetch per 1.5s */
  /* Cart-form MutationObserver — held in module scope so patcher writes can pause it
     to avoid feedback loop (patcher writes price spans → observer fires → patcher re-runs). */
  var _cartFormObserver = null;
  var _cartFormObserverTarget = null;
  var _CART_FORM_OBSERVE_OPTS = { childList: true, subtree: true };
  function _pauseCartObserver() { if (_cartFormObserver) _cartFormObserver.disconnect(); }
  function _resumeCartObserver() {
    if (_cartFormObserver && _cartFormObserverTarget) {
      _cartFormObserver.observe(_cartFormObserverTarget, _CART_FORM_OBSERVE_OPTS);
    }
  }

  /* Hide green upsell bar only when ALL child divs are actually hidden */
  function fixUpsellBars() {
    document.querySelectorAll('.cart-upsell-dtf-uv-block').forEach(function(bar) {
      var hasVisibleChild = false;
      for (var i = 0; i < bar.children.length; i++) {
        if (window.getComputedStyle(bar.children[i]).display !== 'none') {
          hasVisibleChild = true; break;
        }
      }
      bar.style.display = hasVisibleChild ? '' : 'none';
    });
  }

  /* ── Main patcher ── */
  function patchBlanksPrices() {
    /* Throttle: the MutationObserver on the cart form re-fires every time we
       setInnerHTML price spans, which would cause a feedback loop of /cart.json
       fetches and blow out Shopify's rate limit (429) on large carts. Enforce
       a minimum interval between real fetches; coalesce rapid calls. */
    if (_patching) return;
    var now = Date.now();
    var sinceLast = now - _lastPatchAt;
    if (sinceLast < PATCH_MIN_INTERVAL_MS) {
      if (_pendingPatch) return;
      _pendingPatch = setTimeout(function() {
        _pendingPatch = null;
        patchBlanksPrices();
      }, PATCH_MIN_INTERVAL_MS - sinceLast);
      return;
    }
    _patching = true;
    _lastPatchAt = now;

    /* ── Shared cart cache: avoid duplicate /cart.json fetches ──
       If another consumer (e.g. refreshCartPriceMap) just fetched cart data
       within the last 2 seconds, reuse it instead of hitting Shopify again. */
    var CACHE_TTL_MS = 2000;
    var cached = window.__ntCartCache;
    var cartPromise;
    if (cached && cached.data && (now - cached.ts) < CACHE_TTL_MS) {
      cartPromise = Promise.resolve(cached.data);
    } else {
      cartPromise = fetch('/cart.json').then(function(r) {
        /* Don't throw on non-JSON (e.g. 429 rate-limit HTML page). */
        if (!r || !r.ok) return null;
        var ct = r.headers && r.headers.get && r.headers.get('content-type') || '';
        if (ct.indexOf('json') === -1) return null;
        return r.text().then(function(t) { try { return JSON.parse(t); } catch(e) { return null; } });
      }).then(function(cart) {
        if (cart) window.__ntCartCache = { data: cart, ts: Date.now() };
        return cart;
      });
    }

    cartPromise.then(function(cart) {
      if (!cart) {
        /* /cart.json returned null (rate-limited, non-JSON, etc.). Release the
           patching lock AND clear cart-refreshing + height freeze so the cart
           doesn't sit under a shimmer forever waiting for a fetch that won't
           succeed. Next qty change will retry the patch. */
        _patching = false;
        var cf0 = document.querySelector('cart-form#AjaxCartForm');
        if (cf0) { cf0.classList.remove('cart-refreshing'); cf0.style.minHeight = ''; }
        return;
      }
      /* Pause the cart-form MutationObserver before we start writing price/qty spans —
         otherwise our own writes re-fire the observer, retriggering patchBlanksPrices()
         in a tight loop (mitigated only by the 1.5s throttle, which still wastes a /cart.json). */
      _pauseCartObserver();
      var cartTotal = cart.total_price || 0; /* cents */
      var tierLevel = getTierLevel(cartTotal / 100);
      var totalSavings = 0;

      /* First: count Liquid-rendered savings (Script Editor discounts) */
      cart.items.forEach(function(item) {
        if (item.original_price > 0 && item.final_price < item.original_price) {
          totalSavings += (item.original_price - item.final_price) * item.quantity;
        }
      });

      /* Shared helper: insert/update a strikethrough <del> above a line-total
         <strong>, wrapped in a stacking container. Used by both the blank-items
         loop and the non-blank compare_at pass below. */
      function patchTotalStrong(strong, rtl, tt) {
        if (!strong || strong.closest('.discounted-line-item-price')) return;
        strong.textContent = tt <= 0 ? 'FREE' : money(tt);
        strong.setAttribute('data-line-item-cost', String(tt));
        if (rtl > tt) {
          var existing = strong.closest('.line-total-wrap');
          if (existing) {
            existing.querySelector('del').textContent = money(rtl);
          } else {
            var wrapper = document.createElement('span');
            wrapper.className = 'line-total-wrap';
            strong.parentNode.insertBefore(wrapper, strong);
            var del = document.createElement('del');
            del.className = 'line-total-retail';
            del.textContent = money(rtl);
            wrapper.appendChild(del);
            wrapper.appendChild(strong);
          }
        }
      }

      /* Patch blank rows — use same pricing as quick-buy popup */
      cart.items.forEach(function(item) {
        /* Find ALL DOM rows for this item (page + sidebar) */
        document.querySelectorAll('[data-id="' + item.key + '"]').forEach(function(row) {
          if (row.getAttribute('is-blank') !== 'true') return;
          var basePrice = parseInt(row.getAttribute('data-base-price')) || item.original_price || 0;
          if (!basePrice) return;

          /* Get tier price (falls back to basePrice if no tier data) */
          var tierPricingRaw = row.getAttribute('data-tier-pricing');
          var tierPrice = tierPricingRaw ? getTierPrice(basePrice, tierPricingRaw, tierLevel) : basePrice;

          /* Retail/MSRP strikethrough — ×1.96 multiplier */
          var retailPrice = Math.round(tierPrice * RETAIL_PRICE_MULTIPLIER);

          /* Track retail savings (retail ×1.96 minus what they pay) */
          totalSavings += (retailPrice - tierPrice) * item.quantity;

          /* Build ea price HTML */
          var priceHTML = '<div><span><del><strong>' + money(retailPrice) + '</strong> ea</del></span></div>' +
            '<div class="seccolor"><strong>' + money(tierPrice) + '</strong> ea</div>';

          /* Patch ea price areas (grouped cards have multiple — one collapsed, one visible) */
          row.querySelectorAll('.discounted-line-item-price').forEach(function(wrap) {
            var inner = wrap.querySelector('div') || wrap;
            inner.innerHTML = priceHTML;
          });

          /* Patch the line total */
          var tierTotal = tierPrice * item.quantity;
          var retailTotal = retailPrice * item.quantity;

          row.querySelectorAll('strong[data-line-item-cost]').forEach(function(s) {
            patchTotalStrong(s, retailTotal, tierTotal);
          });

          /* Solo blank cards: price lives in the group header, not the item row */
          var group = row.closest('.nt-blank-group');
          if (group) {
            group.querySelectorAll('.nt-dg-solo-price .discounted-line-item-price').forEach(function(wrap) {
              var inner = wrap.querySelector('div') || wrap;
              inner.innerHTML = priceHTML;
            });
            group.querySelectorAll('.nt-dg-solo-price strong[data-line-item-cost]').forEach(function(s) {
              patchTotalStrong(s, retailTotal, tierTotal);
            });
          }
        });
      });

      /* Non-blank items: add strikethrough total for ANY item whose DOM
         already shows a strikethrough ea price (from Liquid's compare_at_price
         or from a line-level discount). Read the struck-through ea value from
         the DOM and multiply by qty — no Liquid changes needed. */
      cart.items.forEach(function(item) {
        document.querySelectorAll('[data-id="' + item.key + '"]').forEach(function(row) {
          if (row.getAttribute('is-blank') === 'true') return; /* blanks handled above */
          /* Solo DTF cards use a split DOM: the `data-js-cart-item` row is
             `.nt-dg-solo-controls` (qty buttons only), while the ea price and
             line total live in a SIBLING `.nt-dg-solo-price` inside the parent
             `.nt-design-group`. Multi-design cards put ea + total inside the
             row itself. Walk up to the design group when the row is a solo
             controls element so we can still find the ea-strike and patch the
             correct total strong. */
          var isSolo = row.classList.contains('nt-dg-solo-controls');
          var searchRoot = isSolo ? row.closest('.nt-design-group') : row;
          if (!searchRoot) return;
          /* Find the first struck-through ea price in the DOM */
          var eaDel = searchRoot.querySelector('.discounted-line-item-price del strong');
          if (!eaDel) eaDel = searchRoot.querySelector('.discounted-line-item-price del');
          if (!eaDel) return;
          var rawText = eaDel.textContent.replace(/[^0-9.]/g, '');
          var compareAtEa = Math.round(parseFloat(rawText) * 100);
          if (!compareAtEa || compareAtEa <= 0) return;
          var strikeTotal = compareAtEa * item.quantity;
          var actualTotal = item.final_line_price;
          if (strikeTotal > actualTotal && actualTotal > 0) {
            /* Solo: patch the strong inside `.nt-dg-solo-price`. Multi/standard:
               patch strongs inside the row itself. Never patch across sibling
               design-group rows — each line's strong belongs to exactly one row. */
            var patchTargets = isSolo
              ? searchRoot.querySelectorAll('.nt-dg-solo-price strong[data-line-item-cost]')
              : row.querySelectorAll('strong[data-line-item-cost]');
            patchTargets.forEach(function(s) {
              patchTotalStrong(s, strikeTotal, actualTotal);
            });
          }
        });
      });

      /* Fix upsell bar visibility */
      setTimeout(fixUpsellBars, 600);

      /* Update Total Savings — idempotent (computed fresh from cart data each time) */
      var msEl = document.getElementById('moneySaved');
      if (msEl) {
        var current = parseInt(msEl.getAttribute('data')) || 0;
        if (current !== totalSavings) {
          msEl.setAttribute('data', String(totalSavings));
          msEl.value = '<span class=money>' + money(totalSavings) + '</span>';
        }
        if (typeof _saving_update === 'function') _saving_update();
      }

      _patching = false;

      /* Reveal cart — remove shimmer + height lock applied during refresh */
      var cartForm = document.querySelector('cart-form#AjaxCartForm');
      if (cartForm) {
        cartForm.classList.remove('cart-refreshing');
        cartForm.style.minHeight = '';
      }

      /* Visually merge duplicate rows that Shopify refuses to consolidate
         (promo ghost tags with amount:0 etc). Same variant + same per-unit
         price + same visible props → one visible row with summed qty+total.
         FREE promo lines (different per-unit) stay separate. */
      mergeGhostDuplicates(cart);

      /* Dedup: merge duplicate variant line items (same variant + same properties) */
      if (_isCartPage) dedupCart(cart);

      /* Resume observer after all DOM writes are flushed. rAF defers past the current
         microtask so any pending mutations from our writes are coalesced before re-arming. */
      requestAnimationFrame(_resumeCartObserver);

    }).catch(function() {
      _patching = false;
      var cartForm = document.querySelector('cart-form#AjaxCartForm');
      if (cartForm) {
        cartForm.classList.remove('cart-refreshing');
        cartForm.style.minHeight = '';
      }
      _resumeCartObserver();
    });
  }

  /* ── Visually merge duplicate rows for the same variant + props ──
     Shopify's promo/tier allocator sometimes splits a single variant into
     multiple line items (either with ghost line_level_discount_allocations at
     amount:0, or with different per-unit prices when one sub-line missed the
     tier-discount threshold). This function picks a "primary" row and hides
     the rest via display:none.

     Grouping key: variant_id + visible-props (per-unit price intentionally
     omitted so tier-split lines — e.g. 51 @ $5.47 + 5 @ $5.61 of the same L
     variant — also collapse). FREE promo lines are protected by skipping any
     group that contains an item at $0 ea.

     Primary selection: lowest non-zero perUnit (so the visible ea shows the
     tier-discounted price), then fewest discount allocations, then highest qty.

     Quantity changes on the primary row route to the primary's line key only;
     ghost lines retain their qty server-side until dedupCart consolidates on
     the cart page. */
  function mergeGhostDuplicates(cart) {
    if (!cart || !cart.items) return;
    /* Properties starting with `_` are hidden from checkout (Shopify
       convention), but a few of them — the upload URL, the original
       image, and the cart thumbnail — are what actually distinguish
       two cart lines from each other. assets/hide-upload-property.js
       renames "Upload (Vector Files Preferred)" → "_Upload …" at
       cart-add, so without this allowlist two uploads with different
       URLs hash to the SAME empty-{} merge key and one gets hidden as
       a "ghost duplicate." Keep these specific keys in the merge
       fingerprint so genuinely-different uploads stay split. */
    var KEEP_UNDERSCORED = {
      '_Upload (Vector Files Preferred)': true,
      '_Original Image': true,
      '_cartImg': true
    };
    var groups = {};
    cart.items.forEach(function(item) {
      var visibleProps = {};
      Object.keys(item.properties || {}).forEach(function(k) {
        if (k.charAt(0) !== '_' || KEEP_UNDERSCORED[k]) {
          visibleProps[k] = item.properties[k];
        }
      });
      var key = item.variant_id + '|' + JSON.stringify(visibleProps);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    Object.keys(groups).forEach(function(k) {
      var g = groups[k];
      if (g.length < 2) return;
      /* Protect FREE promo lines (e.g. 365 @ $0.18 + 10 @ $0 FREE): if ANY
         item in this group is at $0 ea, leave the whole group split so the
         user still sees the free-item row distinctly. */
      var hasFree = g.some(function(i) {
        var pu = i.quantity > 0 ? Math.round((i.final_line_price || 0) / i.quantity) : 0;
        return pu === 0;
      });
      if (hasFree) return;
      /* Sort: lowest non-zero perUnit first (shows tier-discounted ea), then
         fewer line_level_discount_allocations, then higher qty. */
      g.sort(function(a, b) {
        var aPu = a.quantity > 0 ? Math.round((a.final_line_price || 0) / a.quantity) : 0;
        var bPu = b.quantity > 0 ? Math.round((b.final_line_price || 0) / b.quantity) : 0;
        if (aPu !== bPu) return aPu - bPu;
        var ad = (a.line_level_discount_allocations || []).length;
        var bd = (b.line_level_discount_allocations || []).length;
        if (ad !== bd) return ad - bd;
        return b.quantity - a.quantity;
      });
      var primary = g[0];
      var ghosts = g.slice(1);
      var totalQty = g.reduce(function(s, i) { return s + i.quantity; }, 0);
      /* Actual charged total across all sub-lines — keeps the visible $ truthful
         even if the tier ea × qty math looks slightly off. Server merge on
         cart page reconciles within a couple seconds. */
      var totalCost = g.reduce(function(s, i) { return s + (i.final_line_price || 0); }, 0);

      /* Update ALL DOM rows for primary (cart page + sidebar can coexist). */
      document.querySelectorAll('[data-id="' + primary.key + '"]').forEach(function(row) {
        var qtyInputs = row.querySelectorAll('.qty');
        qtyInputs.forEach(function(i) { i.value = totalQty; });
        /* data-server-qty = the primary's real qty on Shopify's server.
           data-qty = the displayed merged total.
           updateCartQty uses these to translate +/- clicks: if the user sees 56
           and clicks +, the delta is +1 applied to the server qty (51→52), not
           to the merged display (56→57 which would set the primary to 57). */
        row.setAttribute('data-server-qty', String(primary.quantity));
        row.setAttribute('data-qty', String(totalQty));
        /* Update ALL line-item-cost elements (cart-page-item has mobile + desktop). */
        var totalEls = row.querySelectorAll('[data-line-item-cost]');
        totalEls.forEach(function(el) {
          el.setAttribute('data-line-item-cost', String(totalCost));
          el.textContent = totalCost <= 0 ? 'FREE' : '$' + (totalCost / 100).toFixed(2);
        });
      });
      /* Hide ghost rows in BOTH cart page and sidebar. */
      ghosts.forEach(function(ghost) {
        document.querySelectorAll('[data-id="' + ghost.key + '"]').forEach(function(row) {
          row.style.display = 'none';
        });
      });
    });
  }

  /* ── Cart deduplication ── */
  var _deduping = false;
  var DEDUPE_RELOAD_KEY = 'bpp_last_dedupe_reload';
  var DEDUPE_RELOAD_COOLDOWN_MS = 10000;
  /* Per-group fingerprint cooldown: if Shopify re-splits the same set of line
     items right after we merge, we refuse to retry for a while. Separate from
     the global reload cooldown so merges of *different* variants still work. */
  var DEDUPE_FP_KEY = 'bpp_last_merge_fp';
  var DEDUPE_FP_COOLDOWN_MS = 30000;
  function _readFpMap() {
    try { return JSON.parse(sessionStorage.getItem(DEDUPE_FP_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function _writeFpMap(map) {
    /* Prune entries older than the cooldown so the map doesn't grow forever. */
    var now = Date.now();
    Object.keys(map).forEach(function(k) {
      if (now - map[k] > DEDUPE_FP_COOLDOWN_MS) delete map[k];
    });
    try { sessionStorage.setItem(DEDUPE_FP_KEY, JSON.stringify(map)); } catch (e) {}
  }

  function dedupCart(cart) {
    if (_deduping || !cart || !cart.items) return;

    /* Hard ceiling against infinite-reload: at most one dedupe reload per
       cooldown window per tab. Protects against any case where Shopify's
       /cart/update.js returns success but lines don't actually merge. */
    var lastReload = parseInt(sessionStorage.getItem(DEDUPE_RELOAD_KEY) || '0', 10);
    if (Date.now() - lastReload < DEDUPE_RELOAD_COOLDOWN_MS) return;

    /* Group items by variant_id */
    var groups = {};
    cart.items.forEach(function(item) {
      var vid = String(item.variant_id);
      if (!groups[vid]) groups[vid] = [];
      groups[vid].push(item);
    });

    /* Find mergeable duplicates (same variant + identical properties) */
    var updates = {};
    var needsMerge = false;
    var fpMap = _readFpMap();
    var now = Date.now();
    Object.keys(groups).forEach(function(vid) {
      var group = groups[vid];
      if (group.length < 2) return;

      /* Sub-group by properties only. Items with the same variant + same
         visible/hidden props merge, even when per-unit prices differ (i.e.
         tier-split blanks like 51 @ $5.47 + 5 @ $5.61 of the same L variant).
         FREE promo lines ($0 ea) are excluded below so the classic free-item
         split (365 @ $0.18 + 10 @ $0 FREE) stays visible and untouched. */
      var byProps = {};
      group.forEach(function(item) {
        var propsKey = JSON.stringify(item.properties || {});
        if (!byProps[propsKey]) byProps[propsKey] = [];
        byProps[propsKey].push(item);
      });

      Object.keys(byProps).forEach(function(pk) {
        var dupes = byProps[pk];
        if (dupes.length < 2) return;

        /* Protect FREE promo lines — skip this sub-group if ANY item is $0 ea. */
        var hasFree = dupes.some(function(d) {
          var pu = d.quantity > 0 ? Math.round((d.final_line_price || 0) / d.quantity) : 0;
          return pu === 0;
        });
        if (hasFree) return;

        /* Fingerprint cooldown: if we just tried to merge exactly this set of
           line-item keys and Shopify kept them split, don't retry for a while.
           Prevents reload thrash when Shopify's promo script re-splits post-merge. */
        var sortedKeys = dupes.map(function(d) { return d.key; }).sort().join(',');
        var fp = vid + '|' + pk + '|' + sortedKeys;
        if (fpMap[fp] && (now - fpMap[fp]) < DEDUPE_FP_COOLDOWN_MS) return;
        fpMap[fp] = now;

        /* Merge: first item gets total qty, rest get 0 */
        var totalQty = 0;
        dupes.forEach(function(d) { totalQty += d.quantity; });
        updates[dupes[0].key] = totalQty;
        for (var i = 1; i < dupes.length; i++) {
          updates[dupes[i].key] = 0;
        }
        needsMerge = true;
      });
    });

    /* Persist fingerprint map (with pruning) regardless of whether any merge
       actually fires — so a skipped-due-to-cooldown fingerprint still gets
       its timestamp refreshed for the prune pass. */
    _writeFpMap(fpMap);

    if (!needsMerge) return;
    _deduping = true;
    var prevCount = cart.items.length;

    fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: updates })
    }).then(function(resp) {
      _deduping = false;
      /* fetch() resolves on 4xx/5xx — don't reload on a failed POST. */
      if (!resp || !resp.ok) return;
      /* Verify the merge actually reduced line-item count. If Shopify
         kept lines separate, a reload would re-trigger dedupCart forever.
         Use text() + JSON.parse so an HTML response doesn't throw. */
      return fetch('/cart.json').then(function(r) {
        if (!r || !r.ok) return null;
        var ct = r.headers && r.headers.get && r.headers.get('content-type') || '';
        if (ct.indexOf('json') === -1) return null;
        return r.text().then(function(txt) {
          try { return JSON.parse(txt); } catch (e) { return null; }
        });
      }).then(function(newCart) {
        if (newCart && newCart.items && newCart.items.length < prevCount) {
          sessionStorage.setItem(DEDUPE_RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
        /* else: merge was a no-op OR verify fetch didn't return JSON — do not reload */
      }).catch(function() { /* swallow — never reload on verify failure */ });
    }).catch(function() { _deduping = false; });
  }

  /* ── Init ── */
  function init() {
    setTimeout(fixUpsellBars, 1000);

    if (_isCartPage) {
      patchBlanksPrices();
      var cartForm = document.querySelector('cart-form#AjaxCartForm');
      if (cartForm) {
        _cartFormObserverTarget = cartForm;
        _cartFormObserver = new MutationObserver(function(muts) {
          for (var i = 0; i < muts.length; i++) {
            if (muts[i].addedNodes.length) { patchBlanksPrices(); return; }
          }
        });
        _cartFormObserver.observe(cartForm, _CART_FORM_OBSERVE_OPTS);
      }
    } else {
      /* Sidebar / drawer: observe the cart-form inside the drawer using the
         same managed observer + pause/resume pattern as the cart page. The
         previous code watched #site-cart-sidebar with a style.display check,
         but that check breaks when sidebar-drawer.show() clears display to ''
         (empty string = falsy) instead of setting it to 'block'. Observing the
         cart-form directly avoids the display-check problem entirely and lets
         _pauseCartObserver prevent feedback loops during patcher DOM writes. */
      var sidebar = document.getElementById('site-cart-sidebar');
      var sidebarCartForm = sidebar ? sidebar.querySelector('cart-form#AjaxCartForm') : null;
      if (sidebarCartForm) {
        _cartFormObserverTarget = sidebarCartForm;
        _cartFormObserver = new MutationObserver(function(muts) {
          for (var i = 0; i < muts.length; i++) {
            if (muts[i].addedNodes.length) { patchBlanksPrices(); return; }
          }
        });
        _cartFormObserver.observe(sidebarCartForm, _CART_FORM_OBSERVE_OPTS);
      }
      /* Also run patcher once when sidebar first opens (attribute mutation on
         the sidebar element itself — catches the initial display:none → visible). */
      if (sidebar) {
        new MutationObserver(function() {
          /* sidebar-drawer.show() may set style.display OR toggle a class.
             Either way, if the sidebar now has visible content, patch. Only
             fire if not already patching (the throttle handles the rest). */
          if (!_patching) patchBlanksPrices();
        }).observe(sidebar, { attributes: true, attributeFilter: ['style', 'class'] });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
