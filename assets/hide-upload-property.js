/*
 * hide-upload-property.js  (v4 — multi-property + priority ordering)
 * ------------------------------------------------------------
 * Renames specific line item properties to "_"-prefixed names
 * right before the cart-add request is sent. Shopify auto-hides
 * properties whose names start with "_" from the cart, checkout,
 * and customer emails. Admin order detail still shows them.
 *
 * Currently renames:
 *   • "Upload (Vector Files Preferred)" → "_Upload (Vector Files Preferred)"
 *   • "Preview"                          → "_Preview"
 *   • "Edit"                             → "_Edit"
 *
 * In addition, when the renamed body is rebuilt we move
 * "_Upload (Vector Files Preferred)" to the FIRST position so it
 * shows at the top of the admin order detail (Shopify preserves
 * line item property submission order).
 *
 * Pre-submit JS that reads the fields by their visible names keeps
 * working — the rename + reorder happen only at the request boundary.
 */
(function () {
  'use strict';

  var PROPS_TO_HIDE = [
    'Upload (Vector Files Preferred)',
    'Preview',
    'Edit',
    'Remove Background',
    'Super Resolution',
    'design re-used',
    'reorder'
  ];

  /* Property whose RENAMED form (with leading "_") should appear first
     in the submitted payload so it's the top entry in the admin view.
     On gang-sheet-builder products we use a different priority key —
     see `getActivePriorityKey()` below. */
  var DEFAULT_PRIORITY_KEY = 'Upload (Vector Files Preferred)';

  /* After the priority key, properties are emitted in this order at the
     cart-add boundary. Anything not in this list falls through to the
     "rest" group and comes after the ordered ones. Shopify admin renders
     line-item properties in submission order, so this controls the
     display order on the order detail page.

     Keys are matched as `properties[<key>]` — both the renamed-hidden
     forms (e.g. `_Remove Background`) and the visible forms (e.g.
     `Remove Background`) are listed so the reorder still applies whether
     this script runs before or after `bg-removal-multi.js` does its
     `_BG Removal Service` injection. */
  var DEFAULT_DESIRED_ORDER = [
    '_Original Image',
    '_cartImg',
    'width', '_width',
    'height', '_height',
    'DPI Warning',
    'Remove Background', '_Remove Background',
    'Super Resolution', '_Super Resolution',
    '_BG Removal Service',
    'Design Notes',
    'AI Edit',
    'AI Created',
    '_Ready to Press'
  ];

  /* ===== Gang-sheet-builder product overrides =====
     For build-a-gang-sheet, build-a-gang-sheet-uv, combine-gang-sheets,
     transfer-builder, builder-v2, uv-dtf-sticker-builder, and
     names-and-numbers-builder templates, the user wants this specific
     property order in the Shopify admin order detail page. All six are
     already underscore-prefixed so they're auto-hidden from cart/checkout
     by Shopify — only the order matters here. */
  var BUILDER_TEMPLATE_CLASSES = [
    'template-product-build-a-gang-sheet',
    'template-product-build-a-gang-sheet-uv',
    'template-product-combine-gang-sheets',
    'template-product-transfer-builder',
    'template-product-builder-v2',
    'template-product-uv-dtf-sticker-builder',
    'template-product-names-and-numbers-builder'
  ];
  var BUILDER_DESIRED_ORDER = [
    '_Print Ready File',
    '_Preview',
    '_Admin Edit',
    '_Edit',
    '_Has Low Resolution',
    '_Design Name'
  ];
  var BUILDER_PRIORITY_KEY = '_Print Ready File';

  function isGangSheetBuilder() {
    var body = document.body;
    if (!body || !body.classList) return false;
    for (var i = 0; i < BUILDER_TEMPLATE_CLASSES.length; i++) {
      if (body.classList.contains(BUILDER_TEMPLATE_CLASSES[i])) return true;
    }
    return false;
  }

  /* These getters resolve the active ordering for the current page each
     time they're called (the body class is stable post-load). */
  function getActiveDesiredOrder() {
    return isGangSheetBuilder() ? BUILDER_DESIRED_ORDER : DEFAULT_DESIRED_ORDER;
  }
  function getActivePriorityKey() {
    return isGangSheetBuilder() ? BUILDER_PRIORITY_KEY : DEFAULT_PRIORITY_KEY;
  }

  /* PRIORITY_KEY / PRIORITY_HIDDEN_KEY / etc. need to be functions now
     so they read the current body-class context. To keep the existing
     code paths working with minimal churn, expose `PRIORITY_*` as
     getter-style helpers that callers invoke fresh. */
  function priorityKey()         { return getActivePriorityKey(); }
  function priorityHiddenKey()   { return priorityKey().charAt(0) === '_' ? priorityKey() : '_' + priorityKey(); }
  function priorityVisibleName() { return 'properties[' + priorityKey() + ']'; }
  function priorityHiddenName()  { return 'properties[' + priorityHiddenKey() + ']'; }

  function desiredIndex(name) {
    var order = getActiveDesiredOrder();
    for (var i = 0; i < order.length; i++) {
      if (name === 'properties[' + order[i] + ']') return i;
    }
    return -1;
  }

  /* Build name pairs for FormData / URLSearchParams / URL-encoded payloads */
  var NAME_PAIRS = PROPS_TO_HIDE.map(function (key) {
    return {
      visibleKey:  key,
      hiddenKey:   '_' + key,
      visibleName: 'properties[' + key + ']',
      hiddenName:  'properties[_' + key + ']'
    };
  });

  /* Return {hiddenName, value} if `name` is a visible property we rename,
     or {hiddenName: name, value} if it's already hidden, else null. */
  function renameLookup(name) {
    for (var i = 0; i < NAME_PAIRS.length; i++) {
      if (name === NAME_PAIRS[i].visibleName) {
        return { name: NAME_PAIRS[i].hiddenName, wasRenamed: true };
      }
      if (name === NAME_PAIRS[i].hiddenName) {
        return { name: name, wasRenamed: false };
      }
    }
    return null;
  }

  /* ---------- body rewriting ---------- */
  function rewriteBody(body) {
    try {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        return rewriteFormData(body);
      }
      if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
        return rewriteURLSearchParams(body);
      }
      if (typeof body === 'string') {
        var trimmed = body.replace(/^\s+/, '');
        if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
          try {
            var json = JSON.parse(body);
            renameAndReorderInJSON(json);
            return JSON.stringify(json);
          } catch (e) { /* not JSON */ }
        }
        return rewriteURLEncodedString(body);
      }
    } catch (e) { /* never block */ }
    return body;
  }

  /* Split `rest` into ordered (those whose name is in DESIRED_ORDER, sorted
     by their DESIRED_ORDER index) + leftover (everything else, original
     order preserved). Returns concatenated [orderedSorted, leftover]. */
  function reorderRest(rest) {
    var ordered = [];
    var leftover = [];
    rest.forEach(function (p) {
      var idx = desiredIndex(p[0]);
      if (idx >= 0) ordered.push({ idx: idx, pair: p });
      else leftover.push(p);
    });
    ordered.sort(function (a, b) { return a.idx - b.idx; });
    return ordered.map(function (o) { return o.pair; }).concat(leftover);
  }

  function rewriteFormData(body) {
    var PRIORITY_VISIBLE_NAME = priorityVisibleName();
    var PRIORITY_HIDDEN_NAME  = priorityHiddenName();
    var priority = null;
    var rest = [];
    var entries = [];
    body.forEach(function (value, name) { entries.push([name, value]); });
    entries.forEach(function (pair) {
      var name  = pair[0];
      var value = pair[1];
      if (name === PRIORITY_VISIBLE_NAME || name === PRIORITY_HIDDEN_NAME) {
        priority = [PRIORITY_HIDDEN_NAME, value];
        return;
      }
      var renamed = renameLookup(name);
      if (renamed) {
        rest.push([renamed.name, value]);
      } else {
        rest.push([name, value]);
      }
    });
    if (!priority) return body;
    rest = reorderRest(rest);
    var out = new FormData();
    out.append(priority[0], priority[1]);
    rest.forEach(function (p) { out.append(p[0], p[1]); });
    return out;
  }

  function rewriteURLSearchParams(body) {
    var PRIORITY_VISIBLE_NAME = priorityVisibleName();
    var PRIORITY_HIDDEN_NAME  = priorityHiddenName();
    var priority = null;
    var rest = [];
    body.forEach(function (value, name) {
      if (name === PRIORITY_VISIBLE_NAME || name === PRIORITY_HIDDEN_NAME) {
        priority = [PRIORITY_HIDDEN_NAME, value];
        return;
      }
      var renamed = renameLookup(name);
      if (renamed) {
        rest.push([renamed.name, value]);
      } else {
        rest.push([name, value]);
      }
    });
    if (!priority) return body;
    rest = reorderRest(rest);
    var out = new URLSearchParams();
    out.append(priority[0], priority[1]);
    rest.forEach(function (p) { out.append(p[0], p[1]); });
    return out;
  }

  function rewriteURLEncodedString(body) {
    var PRIORITY_VISIBLE_NAME = priorityVisibleName();
    var PRIORITY_HIDDEN_NAME  = priorityHiddenName();
    var encPriorityVisible = encodeURIComponent(PRIORITY_VISIBLE_NAME);
    var encPriorityHidden  = encodeURIComponent(PRIORITY_HIDDEN_NAME);
    var parts = body.split('&');
    var priorityPart = null;
    var rest = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var eq = part.indexOf('=');
      if (eq === -1) { rest.push(part); continue; }
      var encName = part.slice(0, eq);
      if (encName === encPriorityVisible || encName === encPriorityHidden) {
        priorityPart = encPriorityHidden + part.slice(eq);
        continue;
      }
      var rewritten = part;
      for (var j = 0; j < NAME_PAIRS.length; j++) {
        var encV = encodeURIComponent(NAME_PAIRS[j].visibleName);
        if (encName === encV) {
          rewritten = encodeURIComponent(NAME_PAIRS[j].hiddenName) + part.slice(eq);
          break;
        }
      }
      rest.push(rewritten);
    }
    if (!priorityPart) return body;
    /* Reorder `rest` so DESIRED_ORDER members lead. Each `part` is
       `encName=encVal`; we decode the name (which is `properties[...]`),
       look up its index, and sort with the same logic used for
       FormData / URLSearchParams. */
    var ordered = [];
    var leftover = [];
    rest.forEach(function (part) {
      var eq = part.indexOf('=');
      var encName = eq === -1 ? part : part.slice(0, eq);
      var decoded;
      try { decoded = decodeURIComponent(encName); }
      catch (_e) { decoded = encName; }
      var idx = desiredIndex(decoded);
      if (idx >= 0) ordered.push({ idx: idx, part: part });
      else leftover.push(part);
    });
    ordered.sort(function (a, b) { return a.idx - b.idx; });
    var reordered = ordered.map(function (o) { return o.part; }).concat(leftover);
    return [priorityPart].concat(reordered).join('&');
  }

  function renameAndReorderInJSON(obj) {
    if (!obj || typeof obj !== 'object') return;
    var PRIORITY_KEY        = priorityKey();
    var PRIORITY_HIDDEN_KEY = priorityHiddenKey();
    var DESIRED_ORDER       = getActiveDesiredOrder();
    if (obj.properties && typeof obj.properties === 'object' && !Array.isArray(obj.properties)) {
      var src = obj.properties;
      var priorityValue;
      var hasPriority = false;
      if (Object.prototype.hasOwnProperty.call(src, PRIORITY_KEY)) {
        priorityValue = src[PRIORITY_KEY];
        hasPriority = true;
        delete src[PRIORITY_KEY];
      } else if (Object.prototype.hasOwnProperty.call(src, PRIORITY_HIDDEN_KEY)) {
        priorityValue = src[PRIORITY_HIDDEN_KEY];
        hasPriority = true;
        delete src[PRIORITY_HIDDEN_KEY];
      }
      /* Rename remaining hidden-targets in place (preserves their relative order) */
      NAME_PAIRS.forEach(function (p) {
        if (p.visibleKey === PRIORITY_KEY) return;
        if (Object.prototype.hasOwnProperty.call(src, p.visibleKey)) {
          src[p.hiddenKey] = src[p.visibleKey];
          delete src[p.visibleKey];
        }
      });
      if (hasPriority) {
        var rebuilt = {};
        rebuilt[PRIORITY_HIDDEN_KEY] = priorityValue;
        /* Add DESIRED_ORDER members first (sorted), then leftovers in their
           original iteration order. `DESIRED_ORDER` strings here are the
           bare property key (no `properties[…]` wrapper) — JSON cart-add
           payloads store properties as an object whose keys are the bare
           property names. */
        DESIRED_ORDER.forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(src, key)) {
            rebuilt[key] = src[key];
          }
        });
        for (var k in src) {
          if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
          if (k === PRIORITY_HIDDEN_KEY) continue;
          if (DESIRED_ORDER.indexOf(k) !== -1) continue;
          rebuilt[k] = src[k];
        }
        obj.properties = rebuilt;
      }
    }
    if (Array.isArray(obj.items)) {
      obj.items.forEach(renameAndReorderInJSON);
    }
  }

  /* ---------- 1. Native form submits ---------- */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.action) return;
    if (form.action.indexOf('/cart/add') === -1) return;
    var PRIORITY_KEY = priorityKey();
    NAME_PAIRS.forEach(function (p) {
      var inputs = form.querySelectorAll('input[name="' + p.visibleName + '"]');
      Array.prototype.forEach.call(inputs, function (input) {
        if (input.disabled || !input.value) return;
        input.disabled = true;
        var hidden = document.createElement('input');
        hidden.type  = 'hidden';
        hidden.name  = p.hiddenName;
        hidden.value = input.value;
        /* For the priority property, insert at the START of the form so its
           field-order beats anything appended later. */
        if (p.visibleKey === PRIORITY_KEY && form.firstChild) {
          form.insertBefore(hidden, form.firstChild);
        } else {
          form.appendChild(hidden);
        }
      });
    });
  }, true);

  /* ---------- 2. fetch ---------- */
  function wrapFetch() {
    if (!window.fetch || window.fetch.__hupWrapped) return;
    var origFetch = window.fetch;
    var wrapped = function (input, init) {
      try {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (url.indexOf('/cart/add') !== -1 && init && init.body) {
          init = Object.assign({}, init, { body: rewriteBody(init.body) });
        }
      } catch (e) {}
      return origFetch.call(this, input, init);
    };
    wrapped.__hupWrapped = true;
    window.fetch = wrapped;
  }

  /* ---------- 3. XMLHttpRequest ---------- */
  function wrapXHR() {
    if (!window.XMLHttpRequest) return;
    if (XMLHttpRequest.prototype.send.__hupWrapped) return;
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    var wrappedOpen = function (method, url) {
      this.__hupUrl = url;
      return origOpen.apply(this, arguments);
    };
    wrappedOpen.__hupWrapped = true;
    XMLHttpRequest.prototype.open = wrappedOpen;
    var wrappedSend = function (body) {
      try {
        if (this.__hupUrl && this.__hupUrl.indexOf('/cart/add') !== -1 && body) {
          body = rewriteBody(body);
        }
      } catch (e) {}
      return origSend.call(this, body);
    };
    wrappedSend.__hupWrapped = true;
    XMLHttpRequest.prototype.send = wrappedSend;
  }

  /* ---------- 4. jQuery $.ajax ---------- */
  function wrapJQuery() {
    if (!window.jQuery || !window.jQuery.ajax || window.jQuery.ajax.__hupWrapped) return;
    var $ = window.jQuery;
    var origAjax = $.ajax;
    var wrappedAjax = function (urlOrOpts, opts) {
      try {
        var settings = (typeof urlOrOpts === 'object') ? urlOrOpts : (opts || {});
        var url = (typeof urlOrOpts === 'string') ? urlOrOpts : settings.url;
        if (url && url.indexOf('/cart/add') !== -1 && settings.data) {
          settings.data = rewriteBody(settings.data);
        }
      } catch (e) {}
      return origAjax.apply(this, arguments);
    };
    wrappedAjax.__hupWrapped = true;
    $.ajax = wrappedAjax;
  }

  function installAll() {
    wrapFetch();
    wrapXHR();
    wrapJQuery();
  }

  installAll();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installAll);
  }
  window.addEventListener('load', installAll);
  setTimeout(installAll, 250);
  setTimeout(installAll, 1000);
  setTimeout(installAll, 3000);
  setTimeout(installAll, 8000);
})();
