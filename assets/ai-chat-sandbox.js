/* ==========================================================================
   Create with AI — chat panel (sandbox-derived)

   Direct port of `.sandbox/create-with-ai/script.js` with two surgery points
   wired to the live theme:

     1. mockGenerate(prompt) → realGenerate(prompt). Drives the existing
        #generative-ai-dialog form (which generative-ai-image-modal.js owns).
        Sets #AISearchInput value, dispatches submit, then waits for figures
        to land in #generative-ai-images. Reads {url, fileName} off each
        figure's dataset and returns them in the {newImages: [...]} shape
        the original sandbox produced.

     2. insertToCanvas(tile, image) → realInsertToCanvas(tile, image, instanceKey).
        Routes by `data-ai-instance` value:
          - `dtfut` → cart/manage path (singleFileAddToCart + manageFiles/uploadFile,
            close dialog). Used by tab 3 "Create with AI".
          - `ds`    → fabric canvas path (presign upload + fabric.Image.fromURL +
            window.addObjectToCanvas). Used by Design Studio overlay AI panel.
        Default falls back to the cart path.

   Boots whichever instance(s) the panel renders, idempotent re-init for
   Shopify section/block reloads.
   ========================================================================== */

(function () {
  'use strict';

  if (window.__aiChatSandboxInit) return;
  window.__aiChatSandboxInit = true;

  // ---------- Config ----------
  // 3 outputs at a time — design constraint, locks the grid to a tidy 3-up
  // (or stacked 3 on narrow). Mirrors live's batchSize and the cap applied
  // by the dtfut fetch patch in dtf-upload-tabs.js.
  var SKELETON_COUNT  = 3;
  var AI_BATCH_SIZE   = 3;
  var AI_MAX_IMAGES   = 3;

  // Sticker-style products that only accept ONE image at a time. On these
  // products the recent-designs grid behaves like a radio set — picking a
  // second design auto-deselects the first instead of accumulating.
  var SINGLE_SELECT_PATHS = [
    '/products/vinyl-stickers',
    '/products/bumper-stickers',
    '/products/truck-stickers',
    '/products/indoor-floor-graphics',
    '/products/outdoor-floor-graphics',
    '/products/window-clings',
    '/products/low-tac-wall-graphics',
    '/products/custom-magnets',
    '/products/custom-soft-vinyl-keychains'
  ];
  function isSingleSelectMode() {
    var path = (window.location && window.location.pathname) || '';
    // Strip any trailing slash so `/products/foo/` matches `/products/foo`.
    if (path.length > 1 && path.charAt(path.length - 1) === '/') {
      path = path.slice(0, -1);
    }
    for (var i = 0; i < SINGLE_SELECT_PATHS.length; i++) {
      if (path === SINGLE_SELECT_PATHS[i]) return true;
    }
    return false;
  }

  // ---------- Surgery point #1: real generate ----------
  // Drives #generative-ai-dialog form (lives in DOM via `aiImageGenerator`
  // content-for in dtf-upload-tabs.liquid). Returns the same shape as the
  // sandbox's mockGenerate: { stats, existing, newImages }. Resolves once
  // figures land in #generative-ai-images, or rejects on a stall.
  function realGenerate(prompt) {
    return new Promise(function (resolve, reject) {
      var nativeInput = document.getElementById('AISearchInput');
      var nativeForm  = document.querySelector('#generative-ai-dialog > form');
      var imagesEl    = document.getElementById('generative-ai-images');
      if (!nativeInput || !nativeForm || !imagesEl) {
        reject(new Error('AI dialog not in DOM'));
        return;
      }

      // Empty the figures up front — the native submit handler does this too,
      // but doing it here means our MutationObserver will fire when the next
      // batch lands instead of seeing pre-existing children and resolving
      // immediately.
      imagesEl.innerHTML = '';

      // Snapshot which URLs were already in history before this submit so we
      // can skip them when reading the figures (the native handler appends
      // both "existing" canned + "new" generated figures into the same node).
      // In practice imagesEl is empty after the native handler clears it,
      // but leave this in for defense.
      var preExisting = new Set();

      // Set up the observer FIRST so we don't miss the append.
      var resolved = false;
      var stallTimer = null;
      var settleTimer = null;

      function readFigures() {
        var figs = imagesEl.querySelectorAll('figure');
        var newImages = [];
        for (var i = 0; i < figs.length; i++) {
          var f = figs[i];
          var url = f.dataset.url;
          if (!url || preExisting.has(url)) continue;
          newImages.push({
            url: url,
            thumbnailUrl: (f.querySelector('img') && f.querySelector('img').src) || url,
            fileName: f.dataset.fileName || ('ai-image-' + Date.now() + '-' + i + '.png'),
            // Keep a reference to the original figure so the click flow can
            // dispatch through the native delegated handler if it wants — we
            // don't currently use it but it's cheap.
            __figure: f
          });
        }
        return newImages.slice(0, AI_MAX_IMAGES);
      }

      function finish() {
        if (resolved) return;
        resolved = true;
        clearTimeout(stallTimer);
        clearTimeout(settleTimer);
        try { mo.disconnect(); } catch (_) {}
        var newImages = readFigures();
        resolve({
          stats: { remainingRequest: Number.MAX_SAFE_INTEGER },
          existing: [],
          newImages: newImages
        });
      }

      var mo = new MutationObserver(function () {
        // Wait for the figures to settle — the native handler appends
        // existing canned figures, then later appends new generated ones.
        // Debounce briefly so we resolve once both batches are in.
        clearTimeout(settleTimer);
        if (imagesEl.querySelectorAll('figure').length === 0) return;
        // Also wait for the native loader to clear, indicating both stages
        // (existing + generate-new) are done.
        var loader = document.getElementById('generative-ai-dialog-loader');
        var loaderDone = !loader || !loader.classList.contains('show');
        var delay = loaderDone ? 50 : 350;
        settleTimer = setTimeout(finish, delay);
      });
      mo.observe(imagesEl, { childList: true });

      // Hard timeout (60s) so we don't leak the observer on a network failure.
      stallTimer = setTimeout(function () {
        if (resolved) return;
        resolved = true;
        try { mo.disconnect(); } catch (_) {}
        reject(new Error('AI generate timed out'));
      }, 60000);

      // Also resolve when the loader finishes — covers the case where existing
      // figures already filled the grid and no further mutation will happen.
      var loaderEl = document.getElementById('generative-ai-dialog-loader');
      if (loaderEl) {
        var loaderObs = new MutationObserver(function () {
          if (resolved) { loaderObs.disconnect(); return; }
          if (!loaderEl.classList.contains('show') &&
              imagesEl.querySelectorAll('figure').length > 0) {
            loaderObs.disconnect();
            finish();
          }
        });
        loaderObs.observe(loaderEl, { attributes: true, attributeFilter: ['class'] });
      }

      // Drive the form. The native handler's submit listener picks this up.
      nativeInput.value = prompt;
      nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      var jq = window.jQuery || window.$;
      try {
        if (jq && typeof jq(nativeForm).trigger === 'function') {
          jq(nativeForm).trigger('submit');
        } else if (typeof nativeForm.requestSubmit === 'function') {
          nativeForm.requestSubmit();
        } else {
          nativeForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      } catch (err) {
        if (resolved) return;
        resolved = true;
        clearTimeout(stallTimer);
        try { mo.disconnect(); } catch (_) {}
        reject(err);
      }
    });
  }

  // ---------- Surgery point #2: real insert action ----------
  // Branches on the instance's `data-ai-instance` value:
  //   * `dtfut`  → cart/manage path (singleFileAddToCart + manageFiles/uploadFile,
  //                close dialog). This is the tab-3 "Create with AI" panel — the
  //                generated image flows into the upload pipeline so the regular
  //                order-selection UI takes over.
  //   * `ds`     → canvas path (fabric.Image.fromURL + window.addObjectToCanvas).
  //                This is the Design Studio overlay AI panel — the generated
  //                image lands on the live fabric canvas, not the cart.
  // Default falls back to the cart path so older instances keep working.
  function realInsertToCanvas(tile, image, instanceKey, cascadeIndex) {
    if (tile.classList && tile.classList.contains('is-loading')) {
      return Promise.resolve();
    }
    if (tile.classList) tile.classList.add('is-loading');

    if (instanceKey === 'ds') {
      return insertOntoFabricCanvas(tile, image, cascadeIndex);
    }
    if (instanceKey === 'aipage') {
      return stashAndHandoff(image);
    }
    return insertViaCartPipeline(tile, image);
  }

  // Standalone AI page (/pages/ai-image-creator) has no upload pipeline —
  // stash the chosen image in sessionStorage and navigate to /products/dtf-transfers,
  // where dtf-upload-tabs.js consumes the stash and routes it into the real
  // upload pipeline. Mirrors the multi-select handler in dtf-ai-page.js but
  // for a single tile click.
  function stashAndHandoff(image) {
    try {
      sessionStorage.setItem('dtf:pending-ai-uploads:v1', JSON.stringify({
        items: [{
          url: image.url,
          thumbnailUrl: image.thumbnailUrl || image.url,
          fileName: image.fileName || ''
        }],
        ts: Date.now()
      }));
    } catch (_) {}
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:#0f172a;color:#fff;font:600 14px/1.2 "DM Sans",system-ui,sans-serif;padding:14px 22px;border-radius:999px;box-shadow:0 12px 32px rgba(15,23,42,0.25);z-index:99999;pointer-events:none;';
    t.textContent = 'Sending design to your DTF order…';
    document.body.appendChild(t);
    setTimeout(function () { window.location.assign('/products/dtf-transfers'); }, 250);
    return Promise.resolve();
  }

  // Cart/manage path (MULTI) — when the user multi-selects from Recently
  // Generated and hits "Use Designs", route each URL through the same picker
  // pipeline live uses for "Previous Designs" multi-select (see
  // snippets/product-page-popups-multiupload.liquid `md-picker:use-designs`):
  //   createFileObjectFromUrl(url) → stub File + .fileURL → multiFilesManageByURL(files)
  // multiFilesManageByURL auto-activates the multi-upload popup when files.length > 1
  // and works on BOTH desktop and mobile (the manageFiles path was desktop-only).
  function insertMultipleViaCartPipeline(entries) {
    var loader = document.getElementById('generative-ai-dialog-loader');
    var form = document.querySelector('#generative-ai-dialog > form');
    if (loader) loader.classList.add('show');
    if (form) form.setAttribute('disabled', 'disabled');

    return Promise.resolve().then(function () {
      var urls = entries.map(function (e) { return e.url; }).filter(Boolean);
      if (!urls.length) return;

      // Path A: live's URL-based multi pipeline (bySize_popular.js).
      if (typeof window.createFileObjectFromUrl === 'function' &&
          (typeof window.multiFilesManageByURL === 'function' ||
           typeof window.singleFileManageByURL === 'function')) {
        var files = urls.map(function (u) {
          var detail = window.createFileObjectFromUrl(u);
          detail.fileURL = u;
          detail.isAIImage = true;
          return detail;
        });
        var _uploadType = (typeof window.uploadType !== 'undefined') ? window.uploadType : '';
        var addToCart = function () {
          return (typeof window.singleFileAddToCart === 'function')
            ? Promise.resolve(window.singleFileAddToCart())
            : Promise.resolve();
        };
        if (files.length === 1) {
          if (_uploadType === 'multi' && typeof window.multiFilesManageByURL === 'function') {
            window.multiFilesManageByURL(files);
          } else if (typeof window.singleFileManageByURL === 'function') {
            return addToCart().then(function () { window.singleFileManageByURL(files[0]); });
          } else if (typeof window.multiFilesManageByURL === 'function') {
            window.multiFilesManageByURL(files);
          }
        } else if (typeof window.multiFilesManageByURL === 'function') {
          if (_uploadType === 'single') {
            return addToCart().then(function () { window.multiFilesManageByURL(files); });
          }
          window.multiFilesManageByURL(files);
        }
        return;
      }

      // Path B: fallback for PDPs without the URL-based helpers — fetch each
      // URL into a File blob and hand the array to manageFiles. Note: the
      // multi-upload popup may not engage on mobile via this path; only used
      // when Path A's helpers are absent (rare).
      return Promise.all(urls.map(function (u, i) {
        var entry = entries[i];
        var fileName = (entry && entry.fileName) ||
          ('ai-image-' + Date.now() + '-' + Math.floor(Math.random() * 10000) + '.png');
        return fetch(u).then(function (r) {
          var type = r.headers.get('Content-Type') || 'image/png';
          return r.arrayBuffer().then(function (ab) {
            var blob = new Blob([ab], { type: type });
            var file = new File([blob], fileName, { type: type });
            file.isAIImage = true;
            return file;
          });
        });
      })).then(function (files) {
        if (typeof window.manageFiles === 'function') {
          window.manageFiles(files);
        }
      });
    }).then(function () {
      window.isAIImage = true;
      var dialog = document.getElementById('generative-ai-dialog');
      if (dialog && typeof dialog.close === 'function') {
        try { dialog.close(); } catch (_) {}
      }
    }).catch(function (err) {
      console.error('ai-chat-sandbox multi-cart insert failed', err);
    }).then(function () {
      if (loader) loader.classList.remove('show');
      if (form) form.removeAttribute('disabled');
    });
  }

  // Cart/manage path — verbatim copy of the original tab-3 behavior.
  function insertViaCartPipeline(tile, image) {
    var loader = document.getElementById('generative-ai-dialog-loader');
    var form = document.querySelector('#generative-ai-dialog > form');
    if (loader) loader.classList.add('show');
    if (form) form.setAttribute('disabled', 'disabled');

    var jq = window.jQuery || window.$;
    var url = image.url;
    var fileName = image.fileName ||
      ('ai-image-' + Date.now() + '-' + Math.floor(Math.random() * 10000) + '.png');

    /* Multi-upload mode: just merge the chosen image into the existing
       multi-upload-wrapper. No addToCart (round-1 isn't a "single active
       design" — it's already represented in the wrapper as a block) and no
       singleFileManage replace. Skip the fetch+blob path entirely; route
       through the URL-based pipeline like the previous-uploads picker does
       in `.use_designes_bulk` for uploadType === 'multi'. After files land,
       auto-scroll the multi-upload-wrapper to the first new block, mirroring
       what `.use_designes_bulk` does at bySize.js:587–595. */
    if (document.querySelector('multi-upload-wrapper.active') &&
        typeof window.createFileObjectFromUrl === 'function' &&
        typeof window.multiFilesManageByURL === 'function') {
      try {
        var beforeBlocks = jq ? jq('multi-upload uploaded-files-block').length : 0;
        var detail = window.createFileObjectFromUrl(url);
        detail.fileURL = url;
        detail.isAIImage = true;
        window.multiFilesManageByURL([detail]);
        setTimeout(function () {
          if (typeof window.setFocusOfMultiUpload === 'function') {
            window.setFocusOfMultiUpload(beforeBlocks);
          }
        }, 600);
      } catch (e) {
        console.error('ai-chat-sandbox multi-mode insert failed', e);
      }
      if (loader) loader.classList.remove('show');
      if (form) form.removeAttribute('disabled');
      if (tile.classList) tile.classList.remove('is-loading');
      var dialog = document.getElementById('generative-ai-dialog');
      if (dialog && typeof dialog.close === 'function') {
        try { dialog.close(); } catch (_) {}
      }
      return Promise.resolve();
    }

    return fetch(url)
      .then(function (response) {
        var type = response.headers.get('Content-Type') || 'image/png';
        return response.arrayBuffer().then(function (ab) {
          return { type: type, buffer: ab };
        });
      })
      .then(function (data) {
        var blob = new Blob([data.buffer], { type: data.type });
        var file = new File([blob], fileName, { type: data.type });
        var addToCartPromise = Promise.resolve();
        if (jq && jq('upload-controls master-upload').hasClass('hidden') &&
            typeof window.singleFileAddToCart === 'function') {
          addToCartPromise = window.singleFileAddToCart();
        }
        return addToCartPromise.then(function () { return file; });
      })
      .then(function (file) {
        var isNewBySize = jq ? jq('upload-controls').length : 0;
        if (isNewBySize > 0 && typeof window.manageFiles === 'function') {
          file.isAIImage = true;
          window.manageFiles([file]);
        } else if (typeof window.uploadFile === 'function') {
          if (jq && jq('.step__2').hasClass('hidden')) {
            window.uploadFile(file);
          } else {
            window.uploadFile(file, 'second_image');
          }
        }
        window.isAIImage = true;
        var dialog = document.getElementById('generative-ai-dialog');
        if (dialog && typeof dialog.close === 'function') {
          try { dialog.close(); } catch (_) {}
        }
      })
      .catch(function (err) {
        console.error('ai-chat-sandbox cart insert failed', err);
      })
      .then(function () {
        if (loader) loader.classList.remove('show');
        if (form) form.removeAttribute('disabled');
        if (tile.classList) tile.classList.remove('is-loading');
      });
  }

  // Canvas path — fetches the generated image, presigns + uploads (so the URL
  // is on the studio's CDN), then drops a fabric.Image onto window.fabricCanvas
  // via window.addObjectToCanvas. Mirrors the legacy DS-panel `insertToCanvas`
  // that previously lived in v0-script.js.
  function insertOntoFabricCanvas(tile, image, cascadeIndex) {
    var url = image.url;
    var fileName = image.fileName ||
      ('ai-image-' + Date.now() + '-' + Math.floor(Math.random() * 10000) + '.png');
    /* When the user multi-selects from Recently Generated and hits "Use
       Designs", each tile lands at the same default canvas position which
       makes them perfectly overlap. Offset each subsequent image by 30px
       diagonally so all selections are visible after insertion. The first
       tile (index 0) lands at the default position. */
    var cascadeOffset = (cascadeIndex && cascadeIndex > 0) ? cascadeIndex * 30 : 0;

    return fetch(url)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var fileType = blob.type || 'image/png';
        if (typeof window.getPresignedUploadUrl !== 'function') {
          throw new Error('getPresignedUploadUrl unavailable');
        }
        return window.getPresignedUploadUrl(fileName, fileType).then(function (presign) {
          if (!presign || !presign.url || !presign.sourceUrl) {
            throw new Error('Invalid presigned URL');
          }
          return fetch(presign.url, {
            method: 'PUT',
            headers: { 'Content-Type': fileType },
            body: blob
          }).then(function (uploadRes) {
            if (!uploadRes.ok) throw new Error('Upload failed');
            return presign.sourceUrl;
          });
        });
      })
      .then(function (uploadedUrl) {
        var canvas = window.fabricCanvas;
        if (!canvas) throw new Error('Canvas not ready');
        if (typeof window.fabric === 'undefined' || !window.fabric.Image) {
          throw new Error('fabric.Image unavailable');
        }
        return new Promise(function (resolve, reject) {
          window.fabric.Image.fromURL(uploadedUrl, function (fabricImg) {
            if (!fabricImg) { reject(new Error('fabric.Image.fromURL returned null')); return; }
            var maxSize = 300;
            var scale = Math.min(maxSize / fabricImg.width, maxSize / fabricImg.height, 1);
            fabricImg.set({ scaleX: scale, scaleY: scale, selectable: true, hasControls: true });
            fabricImg._originalUrl = uploadedUrl;
            fabricImg._bgRemoved = false;
            fabricImg._aiGenerated = true;
            if (typeof window.addObjectToCanvas === 'function') {
              window.addObjectToCanvas(fabricImg, canvas);
            } else {
              canvas.add(fabricImg);
              canvas.setActiveObject(fabricImg);
              canvas.requestRenderAll();
            }
            /* Apply cascade offset AFTER addObjectToCanvas/canvas.add so we
               override the default centering. Each subsequent multi-select
               tile shifts 30px right + 30px down. */
            if (cascadeOffset > 0) {
              fabricImg.set({
                left: (fabricImg.left || 0) + cascadeOffset,
                top:  (fabricImg.top  || 0) + cascadeOffset
              });
              fabricImg.setCoords();
              canvas.requestRenderAll();
            }
            resolve();
          }, { crossOrigin: 'anonymous' });
        });
      })
      .catch(function (err) {
        console.error('ai-chat-sandbox canvas insert failed', err);
      })
      .then(function () {
        if (tile.classList) tile.classList.remove('is-loading');
      });
  }

  // ---------- localStorage history (shared across all AI instances) ----------
  // Both the DS overlay (instanceKey="ds") and the dtfut Tab-3 (instanceKey="dtfut")
  // read/write the same key so Recent Generated stays in sync between them.
  var HISTORY_KEY_BASE = 'ninjaAiHistory';
  var HISTORY_TTL_MS   = 30 * 24 * 60 * 60 * 1000;
  var HISTORY_MAX      = 30;

  // One-time migration: merge any old per-instance histories into the shared key
  // on first load, so users don't lose their existing Recent Generated entries.
  (function migrateLegacyHistory() {
    try {
      if (localStorage.getItem(HISTORY_KEY_BASE)) return;
      var merged = [];
      ['ds', 'dtfut', 'default'].forEach(function (k) {
        var raw = localStorage.getItem(HISTORY_KEY_BASE + ':' + k);
        if (!raw) return;
        try { merged = merged.concat(JSON.parse(raw) || []); } catch (_) {}
      });
      if (!merged.length) return;
      var seen = {};
      merged = merged.filter(function (e) {
        if (!e || !e.url || seen[e.url]) return false;
        seen[e.url] = 1;
        return true;
      });
      merged.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
      localStorage.setItem(HISTORY_KEY_BASE, JSON.stringify(merged.slice(0, HISTORY_MAX)));
    } catch (_) {}
  })();

  function loadHistory(_instanceKey) {
    try {
      var raw = localStorage.getItem(HISTORY_KEY_BASE);
      var list = raw ? JSON.parse(raw) : [];
      var cutoff = Date.now() - HISTORY_TTL_MS;
      return list.filter(function (e) { return e && e.savedAt && e.savedAt > cutoff; });
    } catch (_) { return []; }
  }
  function saveHistory(_instanceKey, list) {
    try {
      localStorage.setItem(HISTORY_KEY_BASE, JSON.stringify(list.slice(0, HISTORY_MAX)));
    } catch (_) {}
    // Notify any other AI instances on the same page so they re-render their
    // Recently Generated grid. localStorage writes don't fire `storage` events
    // in the originating page, so we use a custom event instead.
    try { document.dispatchEvent(new CustomEvent('ninjaAiHistory:changed')); } catch (_) {}
  }

  // ---------- Per-instance wiring ----------
  function attach(container) {
    if (container.__aiChatBound) return;
    container.__aiChatBound = true;

    var panel       = container.querySelector('[data-ai-panel]') || container;
    var textarea    = container.querySelector('[data-ai-prompt]');
    var errorBox    = container.querySelector('[data-ai-error]');
    var generateBtn = container.querySelector('[data-ai-generate]');
    var thread      = container.querySelector('[data-ai-thread]');
    var pillsRow    = container.querySelector('[data-ai-pills]');
    var history     = container.querySelector('[data-ai-history]');
    var historyGrid = container.querySelector('[data-ai-history-grid]');
    var historyClear= container.querySelector('[data-ai-history-clear]');
    var historyToggle = container.querySelector('[data-ai-history-toggle]');
    var historyToggleLabel = container.querySelector('[data-ai-history-toggle-label]');
    var clearBtn    = container.querySelector('[data-ai-clear]');
    if (!panel || !textarea || !generateBtn || !thread) return;
    var wrap = textarea.closest('.ai-chat-input-wrap');
    var instanceKey = container.getAttribute('data-ai-instance') || 'default';

    // ---------- Narrow-mode driver ----------
    // Single source of truth for narrow styling: the `.ai-chat--narrow` class
    // on the panel. JS toggles it based on the panel's own measured width.
    // Honors `data-ai-narrow-mode="force"` for panels that should always be
    // narrow regardless of width (the DS overlay panel is wide but UX-cramped
    // because of the canvas next to it, so it forces narrow). Mirrors
    // `.sandbox/create-with-ai/script.js` so sandbox + studio drive narrow
    // identically.
    var NARROW_BREAKPOINT = 500;
    var forceNarrow = panel.getAttribute('data-ai-narrow-mode') === 'force';
    function syncNarrow() {
      if (forceNarrow) {
        panel.classList.add('ai-chat--narrow');
        return;
      }
      var w = panel.getBoundingClientRect().width;
      panel.classList.toggle('ai-chat--narrow', w > 0 && w < NARROW_BREAKPOINT - 1);
    }
    syncNarrow();
    try { new ResizeObserver(syncNarrow).observe(panel); } catch (_) {}

    // History scroller wrap + arrows
    var leftArrow = null, rightArrow = null;
    if (historyGrid) {
      var scroller = document.createElement('div');
      scroller.className = 'ai-chat-history-scroller';
      historyGrid.parentNode.insertBefore(scroller, historyGrid);
      scroller.appendChild(historyGrid);
      leftArrow = document.createElement('button');
      leftArrow.type = 'button';
      leftArrow.className = 'ai-chat-history-arrow ai-chat-history-arrow--left';
      leftArrow.setAttribute('aria-label', 'Scroll left');
      leftArrow.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12L6 8l4-4"/></svg>';
      rightArrow = document.createElement('button');
      rightArrow.type = 'button';
      rightArrow.className = 'ai-chat-history-arrow ai-chat-history-arrow--right';
      rightArrow.setAttribute('aria-label', 'Scroll right');
      rightArrow.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';
      scroller.appendChild(leftArrow);
      scroller.appendChild(rightArrow);
      var stepFor = function () { return Math.max(160, Math.round(historyGrid.clientWidth * 0.6)); };
      leftArrow.addEventListener('click', function () { smoothScrollBy(historyGrid, -stepFor()); });
      rightArrow.addEventListener('click', function () { smoothScrollBy(historyGrid, stepFor()); });
      historyGrid.addEventListener('scroll', function () { updateArrowVisibility(); }, { passive: true });
      try { new ResizeObserver(function () { updateArrowVisibility(); }).observe(historyGrid); } catch (_) {}
    }
    function updateArrowVisibility() {
      if (!historyGrid || !leftArrow || !rightArrow) return;
      var max = historyGrid.scrollWidth - historyGrid.clientWidth;
      var x = historyGrid.scrollLeft;
      leftArrow.classList.toggle('is-visible', x > 4);
      rightArrow.classList.toggle('is-visible', max > 4 && x < max - 4);
    }
    function smoothScrollBy(el, delta) {
      var start = el.scrollLeft;
      var max = el.scrollWidth - el.clientWidth;
      var target = Math.max(0, Math.min(start + delta, max));
      var duration = 220;
      var startTime = performance.now();
      function step() {
        var t = Math.min(1, (performance.now() - startTime) / duration);
        var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        el.scrollLeft = start + (target - start) * ease;
        if (t < 1) setTimeout(step, 16);
        else updateArrowVisibility();
      }
      step();
    }

    function scrollThreadToBottom() {
      thread.scrollTop = thread.scrollHeight;
      // Mobile follow-up: the composer + Recently Generated history
      // sit OUTSIDE the .ai-chat-thread (they're siblings, not
      // children), so scrolling the thread doesn't bring them into
      // view if any ancestor is the active scroll container.
      // Walk up from the panel and scroll each scrollable ancestor
      // to its bottom so the input + history land in the viewport
      // on small screens. Scoped to ≤749px so desktop (where the
      // panel is a fixed-size sidebar) is unaffected.
      try {
        if (window.matchMedia && window.matchMedia('(max-width: 749px)').matches) {
          var node = panel;
          while (node && node !== document.body) {
            var cs = window.getComputedStyle(node);
            if (cs && (cs.overflowY === 'auto' || cs.overflowY === 'scroll')) {
              node.scrollTop = node.scrollHeight;
            }
            node = node.parentElement;
          }
          // Target the Recently Generated history (the LAST visible
          // element in the panel) so the user lands with the new
          // images, the input, AND the history toggle all in view.
          // Falls back to the composer, then the panel itself, if
          // history isn't in the DOM yet (e.g. on first render).
          var scrollTarget =
            panel.querySelector('[data-ai-history]') ||
            panel.querySelector('.ai-chat-history') ||
            panel.querySelector('.ai-chat-composer') ||
            panel.querySelector('[data-ai-prompt]');
          if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
            scrollTarget.scrollIntoView({ block: 'end', behavior: 'smooth' });
          }
        }
      } catch (_) { /* defensive — never block thread scroll on a follow-up failure */ }
    }

    function updateScrolledState() {
      var distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
      var isScrolled = thread.scrollTop > 4 && distanceFromBottom > 4;
      panel.classList.toggle('is-scrolled', isScrolled);
    }
    thread.addEventListener('scroll', updateScrolledState, { passive: true });

    function autosizeTextarea() {
      // Always set 'auto' first so the theme's global textarea height is overridden.
      textarea.style.height = 'auto';
      if (!textarea.value.trim()) {
        // Empty: leave height as 'auto' so CSS min-height:32px controls the size.
        if (wrap) {
          wrap.classList.remove('is-multiline');
          // Capture single-line baseline here — only valid when textarea is empty.
          if (!wrap.__singleLineHeight && textarea.scrollHeight > 0) {
            wrap.__singleLineHeight = textarea.scrollHeight;
          }
        }
        return;
      }
      if (!wrap) { textarea.style.height = textarea.scrollHeight + 'px'; return; }
      var singleH = wrap.__singleLineHeight || 32;
      // Always measure at row-mode (narrow) width to decide when to switch.
      // Strip is-multiline temporarily — reading scrollHeight forces a synchronous
      // reflow so the measurement is at narrow width. Then re-add if text wraps.
      // This way the trigger is "wraps in row mode" not "wraps at full width",
      // so the button moves below as soon as the user hits the second line.
      // No oscillation: intermediate class state is never painted (JS batches DOM
      // mutations; only the final state reaches the renderer).
      wrap.classList.remove('is-multiline');
      var rowH = textarea.scrollHeight;
      if (rowH > singleH + 4) {
        // Text wraps at row-mode width — switch to column, measure at full width.
        wrap.classList.add('is-multiline');
        textarea.style.height = textarea.scrollHeight + 'px';
      } else {
        // Fits on 1 line in row mode — stay row mode.
        textarea.style.height = rowH + 'px';
      }
    }

    var _typewriterTimer = null;
    function appendUserMessage(promptText) {
      var msg = document.createElement('div');
      msg.className = 'ai-chat-msg ai-chat-msg--user';
      var bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      bubble.textContent = promptText;
      msg.appendChild(bubble);
      thread.appendChild(msg);
      scrollThreadToBottom();
      return msg;
    }

    function appendAiMessage() {
      var msg = document.createElement('div');
      msg.className = 'ai-chat-msg ai-chat-msg--ai';
      var grid = document.createElement('div');
      grid.className = 'ai-pop-grid';
      for (var i = 0; i < SKELETON_COUNT; i++) {
        var sk = document.createElement('div');
        sk.className = 'ai-pop-tile is-skeleton';
        grid.appendChild(sk);
      }
      msg.appendChild(grid);
      thread.appendChild(msg);
      scrollThreadToBottom();
      return { msg: msg, grid: grid };
    }

    function appendAiTextMessage(text, onDone) {
      var msg = document.createElement('div');
      msg.className = 'ai-chat-msg ai-chat-msg--ai';
      var bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      msg.appendChild(bubble);
      thread.appendChild(msg);
      if (_typewriterTimer) clearTimeout(_typewriterTimer);
      var i = 0;
      var SPEED = 6;
      function step() {
        if (i >= text.length) { onDone && onDone(); return; }
        bubble.textContent = text.slice(0, ++i);
        scrollThreadToBottom();
        _typewriterTimer = setTimeout(step, SPEED);
      }
      step();
      return msg;
    }

    function fillGrid(grid, images, prompt) {
      grid.innerHTML = '';
      if (!images.length) {
        showGridError(grid, 'No images returned — try describing your design differently.', null);
        return;
      }
      images.forEach(function (img) { grid.appendChild(createTile(img)); });
      addToHistory(images, prompt);
    }

    // ---------- History strip ----------
    function addToHistory(images, prompt) {
      if (!history) return;
      var existing = loadHistory(instanceKey);
      // Dedupe by URL — newest copy wins. realGenerate returns
      // `existing + newImages`, and re-running the same prompt can return
      // already-stored URLs. Without this guard, history accumulates
      // duplicates of the same image, and selecting it once on the picker
      // drops every duplicate onto the fabric canvas at "Use Design" time
      // (the CTA filter matches every history row by URL).
      var next = images.map(function (img) {
        return {
          url: img.url,
          thumbnailUrl: img.thumbnailUrl || img.url,
          fileName: img.fileName || '',
          prompt: prompt || '',
          savedAt: Date.now()
        };
      }).concat(existing);
      var seen = {};
      next = next.filter(function (e) {
        if (!e || !e.url || seen[e.url]) return false;
        seen[e.url] = 1;
        return true;
      });
      saveHistory(instanceKey, next);
      renderHistory();
      // Auto-expand the Recently Generated section so the user sees the new
      // tile without having to click "Show". setHistoryCollapsed is defined
      // later in this scope but the function declaration is hoisted.
      setHistoryCollapsed(false);
    }

    var selection = new Set();

    function renderHistory() {
      if (!history || !historyGrid) return;
      var list = loadHistory(instanceKey);
      historyGrid.innerHTML = '';
      var urls = new Set(list.map(function (e) { return e.url; }));
      Array.from(selection).forEach(function (u) { if (!urls.has(u)) selection.delete(u); });
      if (!list.length) { updateSelectionBar(); return; }
      list.forEach(function (entry) {
        var tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'ai-chat-history-tile';
        tile.dataset.url = entry.url;
        if (selection.has(entry.url)) tile.classList.add('is-selected');

        var img = document.createElement('img');
        img.src = entry.thumbnailUrl;
        img.alt = 'AI generation';
        tile.appendChild(img);

        var select = document.createElement('button');
        select.type = 'button';
        select.className = 'ai-chat-history-tile-select';
        if (selection.has(entry.url)) {
          select.classList.add('is-selected');
          select.setAttribute('aria-pressed', 'true');
        } else {
          select.setAttribute('aria-pressed', 'false');
        }
        select.setAttribute('aria-label', selection.has(entry.url) ? 'Deselect AI image' : 'Select AI image');
        select.innerHTML =
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8 6.5 11 12.5 5"/></svg>';
        select.addEventListener('click', function (e) {
          e.stopPropagation();
          // Toggle classes + aria on the existing nodes only — full
          // renderHistory() rebuilds every <img> which makes thumbnails flash
          // on each click. The grid order doesn't change here, so a full
          // re-render is unnecessary.
          var isSelected;
          if (selection.has(entry.url)) {
            selection.delete(entry.url);
            isSelected = false;
          } else {
            // Sticker-style products only support a single image at a time
            // (no multi-design upload pipeline). Clear any previous selection
            // before adding the new pick — produces "radio-button" behavior.
            if (isSingleSelectMode() && selection.size > 0) {
              selection.clear();
              if (historyGrid) {
                historyGrid.querySelectorAll('.ai-chat-history-tile.is-selected').forEach(function (t) {
                  t.classList.remove('is-selected');
                  var sel = t.querySelector('.ai-chat-history-tile-select');
                  if (sel) {
                    sel.classList.remove('is-selected');
                    sel.setAttribute('aria-pressed', 'false');
                    sel.setAttribute('aria-label', 'Select AI image');
                  }
                });
              }
            }
            selection.add(entry.url);
            isSelected = true;
          }
          tile.classList.toggle('is-selected', isSelected);
          select.classList.toggle('is-selected', isSelected);
          select.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          select.setAttribute('aria-label', isSelected ? 'Deselect AI image' : 'Select AI image');
          updateSelectionBar();
        });
        tile.appendChild(select);

        var remove = document.createElement('span');
        remove.className = 'ai-chat-history-tile-remove';
        remove.setAttribute('role', 'button');
        remove.setAttribute('aria-label', 'Remove from history');
        remove.tabIndex = 0;
        remove.textContent = '\u00D7';
        var removeEntry = function (e) {
          e.stopPropagation();
          var next = loadHistory(instanceKey).filter(function (x) { return x.url !== entry.url; });
          saveHistory(instanceKey, next);
          selection.delete(entry.url);
          renderHistory();
        };
        remove.addEventListener('click', removeEntry);
        remove.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') removeEntry(e);
        });
        tile.appendChild(remove);

        // Click anywhere on the tile (image, padding, even the checkbox area)
        // toggles the checkbox. The X (remove) and the checkbox itself have
        // their own handlers with stopPropagation so they don't double-fire.
        tile.addEventListener('click', function () {
          var isSelected;
          if (selection.has(entry.url)) {
            selection.delete(entry.url);
            isSelected = false;
          } else {
            // Sticker-style products only support a single image at a time
            // (no multi-design upload pipeline). Clear any previous selection
            // before adding the new pick.
            if (isSingleSelectMode() && selection.size > 0) {
              selection.clear();
              if (historyGrid) {
                historyGrid.querySelectorAll('.ai-chat-history-tile.is-selected').forEach(function (t) {
                  t.classList.remove('is-selected');
                  var sel = t.querySelector('.ai-chat-history-tile-select');
                  if (sel) {
                    sel.classList.remove('is-selected');
                    sel.setAttribute('aria-pressed', 'false');
                    sel.setAttribute('aria-label', 'Select AI image');
                  }
                });
              }
            }
            selection.add(entry.url);
            isSelected = true;
          }
          tile.classList.toggle('is-selected', isSelected);
          select.classList.toggle('is-selected', isSelected);
          select.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          select.setAttribute('aria-label', isSelected ? 'Deselect AI image' : 'Select AI image');
          updateSelectionBar();
        });
        historyGrid.appendChild(tile);
      });
      updateSelectionBar();
      updateArrowVisibility();
    }

    // Build the destination URL for the aipage Order-as-DTF / UV-DTF CTAs.
    // Mirrors the my-designs-panel pattern (snippets/my-designs-panel.liquid):
    //   • 1 image  → ?file=<encoded URL>
    //   • 2+ images → ?my_designs_selection=<encoded JSON payload>
    // The destination products (/products/dtf-transfers and
    // /products/uv-dtf-stickers-decals-by-size) already handle both formats
    // because the my-designs flow uses the same query params.
    function buildHandoffUrl(productPath, entries) {
      if (entries.length === 1) {
        return productPath + '?file=' + encodeURIComponent(entries[0].url);
      }
      var payload = entries.map(function (e, i) {
        return {
          id: 'ai-' + Date.now() + '-' + i,
          name: e.fileName || ('ai-image-' + (i + 1) + '.png'),
          fileURL: e.url
        };
      });
      return productPath + '?my_designs_selection=' +
        encodeURIComponent(JSON.stringify(payload));
    }

    // Show a small floating toast while the navigation kicks off.
    function showHandoffToast(count) {
      var t = document.createElement('div');
      t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:#0f172a;color:#fff;font:600 14px/1.2 "DM Sans",system-ui,sans-serif;padding:14px 22px;border-radius:999px;box-shadow:0 12px 32px rgba(15,23,42,0.25);z-index:99999;pointer-events:none;';
      t.textContent = 'Sending ' + count + ' design' + (count === 1 ? '' : 's') + '…';
      document.body.appendChild(t);
    }

    function navigateToHandoff(productPath, entries) {
      var url = buildHandoffUrl(productPath, entries);
      showHandoffToast(entries.length);
      setTimeout(function () { window.location.assign(url); }, 250);
      return Promise.resolve();
    }

    var selectionBar = null;
    function ensureSelectionBar() {
      if (selectionBar) return selectionBar;
      var bar = document.createElement('div');
      bar.className = 'ai-chat-history-selection-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'AI image selection actions');
      // Order matters: the primary `.__cta` has `margin-left: auto` (see
      // v0-styles.css), which pushes it to the right edge of the bar.
      // Putting `.__cta-secondary` AFTER `.__cta` in the DOM means the
      // secondary lands flush against the primary's right side, producing
      // the [primary, secondary] right-aligned pair the design calls for.
      bar.innerHTML =
        '<span class="ai-chat-history-selection-bar__count" data-ai-selection-count>0 selected</span>' +
        '<button type="button" class="ai-chat-history-selection-bar__clear" data-ai-selection-clear>Deselect all</button>' +
        '<button type="button" class="ai-chat-history-selection-bar__cta" data-ai-selection-cta>' +
          '<span data-ai-selection-cta-label>Use Designs</span>' +
        '</button>' +
        '<button type="button" class="ai-chat-history-selection-bar__cta-secondary" data-ai-selection-cta-secondary style="display:none">' +
          '<span data-ai-selection-cta-secondary-label>Other Ordering Options</span>' +
        '</button>';
      history.appendChild(bar);
      bar.querySelector('[data-ai-selection-clear]').addEventListener('click', function () {
        selection.clear();
        renderHistory();
      });
      bar.querySelector('[data-ai-selection-cta]').addEventListener('click', function (ev) {
        ev.stopPropagation();
        var urls = Array.from(selection);
        if (!urls.length) return;
        // Dedupe by URL — older builds of addToHistory didn't dedupe, so a
        // user with prior duplicates in localStorage can have N rows for the
        // same URL. Without this, selecting that URL once routes N entries
        // through Use Design and drops N copies on the canvas / cart pipeline.
        var seenUrls = {};
        var entries = loadHistory(instanceKey).filter(function (e) {
          if (!e || !selection.has(e.url) || seenUrls[e.url]) return false;
          seenUrls[e.url] = 1;
          return true;
        });

        // Branch by instance:
        //  - aipage (/pages/ai-image-creator): primary CTA is "Order as DTF".
        //    Navigate to /products/dtf-transfers with `?file=URL` (single) or
        //    `?my_designs_selection=JSON` (multi) — same query-param shape
        //    the my-designs-panel uses, so the destination product handles
        //    both cases without needing a separate code path.
        //  - dtfut (Tab-3 Create with AI on the PDP): hand the full file array
        //    to window.manageFiles in ONE call.
        //  - ds (Design Studio overlay): each image lands on the fabric canvas
        //    independently, so parallel inserts via Promise.all is fine.
        var done = function () { selection.clear(); renderHistory(); };
        if (instanceKey === 'aipage') {
          navigateToHandoff('/products/dtf-transfers', entries).then(done);
        } else if (instanceKey === 'dtfut') {
          // Single-image picks (including all sticker-style products which
          // are forced single-select) route through insertViaCartPipeline
          // — the same path a single-tile click uses. That path uses
          // `manageFiles` / `uploadFile` and works on every variant-A
          // template (vinyl-stickers, magnets, etc.), whereas
          // insertMultipleViaCartPipeline depends on the URL-based
          // `singleFileManageByURL`/`multiFilesManageByURL` helpers from
          // bySize_popular.js which aren't loaded everywhere.
          if (entries.length === 1) {
            insertViaCartPipeline(document.createElement('div'), {
              url: entries[0].url,
              thumbnailUrl: entries[0].thumbnailUrl,
              fileName: entries[0].fileName,
              prompt: entries[0].prompt
            }).then(done);
          } else {
            // Route multi-select through `md-picker:use-designs` so the
            // unified interceptor in dtf-ai-modal.js can apply reload-and-restore
            // when an upload is active. When no upload is active, the bridge
            // handler in product-page-popups-multiupload.liquid takes over and
            // calls multiFilesManageByURL — same end-state as the legacy
            // insertMultipleViaCartPipeline path.
            document.dispatchEvent(new CustomEvent('md-picker:use-designs', {
              bubbles: true,
              detail: {
                items: entries.map(function (entry) {
                  return {
                    file: entry.url,
                    fileName: entry.fileName || 'ai-image.png',
                    id: 'ai-' + (entry.ts || Date.now()),
                    isAIImage: true
                  };
                })
              }
            }));
            done();
          }
        } else {
          /* Pass `idx` as cascadeIndex so each subsequent insert shifts 30px
             diagonally on the fabric canvas (Design Studio overlay). idx=0
             lands at default position, idx=1 at +30/+30, idx=2 at +60/+60, etc. */
          Promise.all(entries.map(function (entry, idx) {
            return realInsertToCanvas(document.createElement('div'), {
              url: entry.url,
              thumbnailUrl: entry.thumbnailUrl,
              fileName: entry.fileName,
              prompt: entry.prompt
            }, instanceKey, idx);
          })).then(done);
        }
      });
      // Secondary CTA — only meaningful for the aipage instance:
      //   1 selected → open the Other Ordering Options modal with that image
      //   2+ selected → navigate to /products/uv-dtf-stickers-decals-by-size
      //                 with `?my_designs_selection=JSON`
      // stopPropagation guards against any document-level click handlers
      // (e.g. md-picker:use-designs capture in dtf-ai-page.js) intercepting
      // the click and re-routing it to the DTF page.
      bar.querySelector('[data-ai-selection-cta-secondary]').addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (instanceKey !== 'aipage') return;
        var urls = Array.from(selection);
        if (!urls.length) return;
        // Same dedupe guard as the primary CTA above — without it, users
        // whose localStorage history has duplicate rows for one URL get
        // entries.length > 1 from a single visual selection, which routes
        // them into the multi-select navigateToHandoff branch (UV-DTF
        // by-size) instead of opening the Other Ordering Options modal.
        var seenUrls = {};
        var entries = loadHistory(instanceKey).filter(function (e) {
          if (!e || !selection.has(e.url) || seenUrls[e.url]) return false;
          seenUrls[e.url] = 1;
          return true;
        });
        var done = function () { selection.clear(); renderHistory(); };
        if (entries.length === 1) {
          document.dispatchEvent(new CustomEvent('aip-oo:open', {
            detail: { imageUrl: entries[0].url }
          }));
        } else {
          navigateToHandoff('/products/uv-dtf-stickers-decals-by-size', entries).then(done);
        }
      });
      selectionBar = bar;
      return bar;
    }
    function updateSelectionBar() {
      var count = selection.size;
      if (!count) {
        if (selectionBar) selectionBar.classList.remove('is-visible');
        if (history) history.classList.remove('is-selecting');
        return;
      }
      var bar = ensureSelectionBar();
      bar.querySelector('[data-ai-selection-count]').textContent = count + ' items selected';

      var primaryLabel = bar.querySelector('[data-ai-selection-cta-label]');
      var secondaryBtn = bar.querySelector('[data-ai-selection-cta-secondary]');
      var secondaryLabel = bar.querySelector('[data-ai-selection-cta-secondary-label]');

      if (instanceKey === 'aipage') {
        // Two-CTA layout exclusive to /pages/ai-image-creator.
        primaryLabel.textContent = 'Order as DTF';
        secondaryLabel.textContent = (count === 1) ? 'Other Ordering Options' : 'Order as UV DTF';
        secondaryBtn.style.display = '';
      } else {
        primaryLabel.textContent = (count === 1) ? 'Use Design' : 'Use Designs';
        secondaryBtn.style.display = 'none';
      }
      bar.classList.add('is-visible');
      history.classList.add('is-selecting');
    }

    function createTile(image) {
      var tile = document.createElement('div');
      tile.className = 'ai-pop-tile';
      tile.dataset.url = image.url;
      if (selection.has(image.url)) tile.classList.add('is-selected');
      var img = document.createElement('img');
      img.src = image.thumbnailUrl || image.url;
      img.alt = 'AI generation';
      tile.appendChild(img);
      // CTA label under each thumbnail. Clicks bubble to the tile's handler
      // so clicking the label does the same as clicking the image.
      var cta = document.createElement('span');
      cta.className = 'ai-pop-tile-cta';
      cta.innerHTML = 'Use this design'
        + '<svg class="ai-pop-tile-cta__arrow" viewBox="0 0 16 16" fill="none" '
        + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
        + 'stroke-linejoin="round" aria-hidden="true">'
        + '<path d="M3 8h10M9 4l4 4-4 4"/></svg>';
      tile.appendChild(cta);
      tile.addEventListener('click', function () {
        // On the standalone AI page, "Use this design" toggles the tile into
        // the same multi-select / selection-bar flow that Recently Generated
        // history tiles use. The selection bar's "Order as DTF" / "Other
        // Ordering Options" CTAs then drive the handoff — gives the user a
        // chance to review or add more before navigating.
        if (instanceKey === 'aipage') {
          var url = image.url;
          if (selection.has(url)) {
            selection.delete(url);
            tile.classList.remove('is-selected');
          } else {
            if (isSingleSelectMode() && selection.size > 0) {
              // Match history-tile radio behavior on sticker-style products.
              var prev = Array.from(selection);
              selection.clear();
              prev.forEach(function (u) {
                var t = document.querySelector('.ai-pop-tile[data-url="' + u + '"]');
                if (t) t.classList.remove('is-selected');
              });
            }
            selection.add(url);
            tile.classList.add('is-selected');
          }
          renderHistory(); /* sync the history strip's selection state */
          updateSelectionBar();
          return;
        }
        realInsertToCanvas(tile, image, instanceKey);
      });
      return tile;
    }

    function showGridError(grid, message, onRetry) {
      var msgEl = grid.parentNode;
      if (msgEl) msgEl.removeChild(grid);

      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:flex-start';

      var bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      bubble.textContent = message;
      wrap.appendChild(bubble);

      if (onRetry) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ai-chat-retry-btn';
        btn.textContent = 'Try again';
        btn.addEventListener('click', function () {
          if (msgEl) msgEl.removeChild(wrap);
          var newGrid = document.createElement('div');
          newGrid.className = 'ai-pop-grid';
          for (var i = 0; i < SKELETON_COUNT; i++) {
            var sk = document.createElement('div');
            sk.className = 'ai-pop-tile is-skeleton';
            newGrid.appendChild(sk);
          }
          if (msgEl) msgEl.appendChild(newGrid);
          onRetry(newGrid);
        });
        wrap.appendChild(btn);
      }

      if (msgEl) msgEl.appendChild(wrap);
      scrollThreadToBottom();
    }

    function runGenerationIntoGrid(prompt, grid) {
      var hadResults = false;
      realGenerate(prompt).then(function (res) {
        var stats = res.stats || {};
        var existing = res.existing || [];
        var newImages = res.newImages || [];
        var remaining = stats.remainingRequest
          ? Math.ceil(stats.remainingRequest / AI_BATCH_SIZE)
          : Number.MAX_SAFE_INTEGER;
        if (remaining <= 0) {
          showGridError(grid, "You've reached the AI generation limit. Try again later.", null);
          return;
        }
        var combined = existing.concat(newImages);
        fillGrid(grid, combined, prompt);
        hadResults = combined.length > 0;
        scrollThreadToBottom();
      }).catch(function (err) {
        console.error('AI chat generate failed', err);
        showGridError(grid, 'Generation failed — please try again.', function (newGrid) {
          generateBtn.classList.add('is-loading');
          generateBtn.disabled = true;
          runGenerationIntoGrid(prompt, newGrid);
        });
      }).then(function () {
        if (hadResults) {
          appendAiTextMessage(
            'Each prompt generates a completely new image. To make changes, describe the full image again with your updates.'
          );
        }
        generateBtn.classList.remove('is-loading');
        updateGenerateEnabled();
      });
    }

    function generate() {
      var prompt = (textarea.value || '').trim();
      if (errorBox) errorBox.textContent = '';
      if (!prompt) return;

      generateBtn.classList.add('is-loading');
      generateBtn.disabled = true;

      appendUserMessage(prompt);
      textarea.value = '';
      autosizeTextarea();

      appendAiTextMessage('Generating your Images');
      var ctx = appendAiMessage();
      runGenerationIntoGrid(prompt, ctx.grid);
    }

    function updateGenerateEnabled() {
      var hasText = !!textarea.value.trim();
      generateBtn.disabled = !hasText;
      generateBtn.classList.toggle('is-empty', !hasText);
      if (wrap) wrap.classList.toggle('has-text', hasText);
      if (clearBtn) clearBtn.hidden = !hasText;
    }

    // Pill flow: fetches cached AI generations from the same backend the live
    // site uses (`getGenerativeAiUploads.php`) so each pill shows its real
    // pre-generated designs (e.g. the floral "Mama" prompt returns the actual
    // floral Mama designs, not random images). Caps to 3 to match SKELETON_COUNT,
    // enforces a 1s minimum loading state so the skeleton is always visible,
    // and falls back to deterministic picsum tiles if the cache API is
    // unreachable (CORS, offline, etc.). Real textarea generations still go
    // through generate()/realGenerate() unchanged.
    function fakeGenerate(prompt, skeletonDelay) {
      generateBtn.classList.add('is-loading');
      generateBtn.disabled = true;
      appendUserMessage(prompt);
      textarea.value = '';
      autosizeTextarea();

      var startTime = Date.now();
      var MIN_LOAD_MS = skeletonDelay || 1000;
      var AI_HOST = 'https://www.rushordertees.com/design';
      var PILL_CAP = 3;

      var cachePromise = fetch(
        AI_HOST + '/studio/getGenerativeAiUploads.php?prompt=' + encodeURIComponent(prompt),
        { credentials: 'include' }
      )
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });

      appendAiTextMessage('Generating your Images');
      var ctx = appendAiMessage();
      var grid = ctx.grid;

      cachePromise.then(function (data) {
          var elapsed = Date.now() - startTime;
          var wait = Math.max(0, MIN_LOAD_MS - elapsed);
          setTimeout(function () {
            // Apply the same 30-day TTL the localStorage history uses so pill
            // cache results stay consistent with what we treat as "fresh"
            // elsewhere. created_at is in unix seconds.
            var cutoffSec = (Date.now() - HISTORY_TTL_MS) / 1000;
            var arr = (Array.isArray(data) ? data : [])
              .filter(function (img) { return !img.created_at || img.created_at > cutoffSec; })
              .slice(0, PILL_CAP);
            var images;
            if (arr.length) {
              images = arr.map(function (img) {
                return {
                  url: img.url,
                  thumbnailUrl: img.thumbnailUrl || img.url,
                  fileName: img.fileName || ''
                };
              });
            } else {
              // Fallback: deterministic picsum so the demo still works without
              // a live cache hit. Same prompt → same 3 images, every time.
              var seed = (prompt || 'demo').toLowerCase().replace(/\W+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'demo';
              images = [1, 2, 3].map(function (n) {
                var url = 'https://picsum.photos/seed/' + seed + '-' + n + '/512/512';
                return { url: url, thumbnailUrl: url, fileName: seed + '-' + n + '.jpg' };
              });
            }
            fillGrid(grid, images, prompt);
            appendAiTextMessage(
              'Each prompt generates a completely new image. To make changes, describe the full image again with your updates.'
            );
            generateBtn.classList.remove('is-loading');
            updateGenerateEnabled();
            scrollThreadToBottom();
          }, wait);
        });
    }

    // Wire up
    updateGenerateEnabled();
    autosizeTextarea();
    requestAnimationFrame(autosizeTextarea);
    renderHistory();
    // On first load, expand the section if there are saved designs so the
    // user sees them without needing to click "Show". Empty history stays
    // collapsed (and is also display:none via CSS :has empty grid).
    if (loadHistory(instanceKey).length > 0) {
      setHistoryCollapsed(false);
    }

    // Cross-instance history sync — re-render this panel's Recently Generated
    // grid whenever ANY AI instance on the page saves to history. Required so
    // a generation in the DS overlay shows up in the dtfut tab grid (and vice
    // versa) without a page reload.
    document.addEventListener('ninjaAiHistory:changed', renderHistory);

    if (pillsRow) {
      pillsRow.querySelectorAll('[data-ai-pill-prompt]').forEach(function (pill) {
        pill.addEventListener('click', function () {
          var prompt = pill.getAttribute('data-ai-pill-prompt') || '';
          fakeGenerate(prompt, 2500);
        });
      });
    }

    if (historyClear) {
      historyClear.addEventListener('click', function () {
        saveHistory(instanceKey, []);
        renderHistory();
      });
    }

    function setHistoryCollapsed(collapsed) {
      if (history) history.classList.toggle('is-collapsed', collapsed);
      panel.classList.toggle('is-history-open', !collapsed);
      if (!collapsed) {
        updateArrowVisibility();
        requestAnimationFrame(function () {
          requestAnimationFrame(updateArrowVisibility);
        });
      }
      if (!historyToggle) return;
      historyToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      historyToggle.setAttribute(
        'aria-label',
        collapsed ? 'Show recently generated' : 'Hide recently generated'
      );
      if (historyToggleLabel) {
        historyToggleLabel.textContent = collapsed ? 'Show' : 'Hide';
      }
    }
    if (historyToggle) {
      historyToggle.addEventListener('click', function () {
        setHistoryCollapsed(!history.classList.contains('is-collapsed'));
      });
    }
    // Make the whole "Recently Generated" header bar clickable, not just
    // the small Show/Hide toggle on the right. Excludes the toggle itself
    // (which has its own listener above) so we don't double-fire.
    var historyHead = container.querySelector('.ai-chat-history-head');
    if (historyHead && history) {
      historyHead.style.cursor = 'pointer';
      historyHead.addEventListener('click', function (e) {
        if (e.target.closest('[data-ai-history-toggle]')) return;
        setHistoryCollapsed(!history.classList.contains('is-collapsed'));
      });
    }

    if (wrap) {
      wrap.addEventListener('click', function (e) {
        if (e.target.closest('.ai-chat-send')) return;
        textarea.focus();
      });
    }
    generateBtn.addEventListener('click', function (e) { e.preventDefault(); generate(); });
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        textarea.value = '';
        autosizeTextarea();
        updateGenerateEnabled();
        textarea.focus();
      });
    }
    textarea.addEventListener('input', function () {
      autosizeTextarea();
      if (errorBox && errorBox.textContent) errorBox.textContent = '';
      updateGenerateEnabled();
    });
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); }
    });

    // Autofocus the textarea when this surface becomes visible.
    var instance = panel.getAttribute('data-ai-instance');
    function focusPrompt() {
      setTimeout(function () { try { textarea.focus(); } catch (_) {} }, 60);
    }
    if (instance === 'aipage') {
      // Standalone page: panel is immediately visible on load.
      focusPrompt();
    } else if (instance === 'dtfut') {
      // Product page tab: focus when the Create with AI tab activates.
      document.addEventListener('dtfut:tab-change', function (e) {
        if (e.detail && e.detail.name === 'ai') {
          requestAnimationFrame(function () {
            syncNarrow();
            autosizeTextarea();
            focusPrompt();
          });
        }
      });
    } else {
      // Design Studio panel and any future instances: focus when panel
      // transitions from not visible to visible.
      var _panelVisible = false;
      var _visObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !_panelVisible) {
            _panelVisible = true;
            focusPrompt();
            requestAnimationFrame(autosizeTextarea);
          } else if (!entry.isIntersecting) {
            _panelVisible = false;
          }
        });
      }, { threshold: 0.1 });
      _visObs.observe(panel);
    }
  }

  // Boot every instance on the page (idempotent).
  function bootAll() {
    document.querySelectorAll('.ai-chat[data-ai-instance]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
  // Shopify theme editor re-render
  document.addEventListener('shopify:section:load', bootAll);
  document.addEventListener('shopify:block:select', bootAll);
})();
