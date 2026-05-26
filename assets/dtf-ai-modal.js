/* =========================================================
   DTF AI Modal — shell driver
   ---------------------------------------------------------
   On pages where the legacy pink "Create a design with Ninja AI"
   box is rendered (via the aiImageGenerator content-for), clicks
   on that box open this modal instead of the legacy
   <dialog id="generative-ai-dialog">.

   The chat UI inside the modal is the same .ai-chat panel used on
   /pages/ai-image-creator and the dtfut Tab 3 — it is driven by
   ai-chat-sandbox.js via instanceKey="dtfut", which routes
   "Use this design" clicks through the local cart/manage upload
   pipeline. This file owns ONLY the modal shell — open/close,
   focus restore, scroll-lock body class, and the post-select
   dismiss when a tile is used.
   ========================================================= */

(function () {
  'use strict';

  if (window.__dtfAiModalInit) return;
  window.__dtfAiModalInit = true;

  /* Relocate the modal element to <body> so it escapes any ancestor
     stacking context. The snippet is rendered deep inside bySizeNew.liquid
     (sections often have transforms / filters / will-change) which traps
     position:fixed children — visually that means the site header (which
     has its own z-index) can render *over* the modal. Moving #dtf-ai-modal
     to be a direct child of <body> gives our z-index: 100000 a clean
     stacking context. Done once, idempotent. */
  function relocateModalToBody() {
    var el = document.getElementById('dtf-ai-modal');
    if (!el) return;
    if (el.parentNode === document.body) return;
    document.body.appendChild(el);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', relocateModalToBody);
  } else {
    relocateModalToBody();
  }

  /* Same fetch interception used in dtf-upload-tabs.js so the AI
     submit shows up to 3 cached canned results immediately and
     skips the slower postBatchGenerativeAiUpload when canned came
     back. Set once per page; safe to dedupe by checking the flag. */
  if (!window.__dtfutFetchPatched && typeof window.fetch === 'function') {
    window.__dtfutFetchPatched = true;
    var origFetch = window.fetch;
    window.fetch = function (url, options) {
      try {
        var urlStr = typeof url === 'string' ? url : (url && url.url) || '';

        if (urlStr.indexOf('getGenerativeAiUploads.php') !== -1) {
          return origFetch.apply(this, arguments).then(function (resp) {
            return resp.clone().json().then(function (data) {
              var capped = Array.isArray(data) ? data.slice(0, 3) : [];
              if (capped.length > 0) {
                window.__dtfutSkipNewAIGeneration = true;
              }
              return new Response(JSON.stringify(capped), {
                status: resp.status,
                headers: { 'Content-Type': 'application/json' }
              });
            }).catch(function () { return resp; });
          });
        }

        if (window.__dtfutSkipNewAIGeneration && urlStr.indexOf('postBatchGenerativeAiUpload.php') !== -1) {
          window.__dtfutSkipNewAIGeneration = false;
          return Promise.resolve(new Response('[]', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (e) { /* fall through */ }
      return origFetch.apply(this, arguments);
    };
  }

  /* ---------------- Modal open/close ---------------- */
  var modal = null;
  var lastFocused = null;

  function openModal() {
    if (!modal) modal = document.getElementById('dtf-ai-modal');
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    /* Force a reflow so the transition runs from opacity:0. */
    void modal.offsetHeight;
    modal.classList.add('is-open');
    document.body.classList.add('dtf-ai-modal-open');
    var input = modal.querySelector('[data-ai-prompt]');
    if (input) {
      try { input.focus(); } catch (_) {}
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('dtf-ai-modal-open');
    setTimeout(function () {
      if (!modal.classList.contains('is-open')) modal.hidden = true;
    }, 220);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (_) {}
    }
  }

  /* Capture-phase listener so it runs before generative-ai-image-modal.js's
     delegated jQuery handler on .generative-ai-area, which would otherwise
     call .showModal() on the legacy <dialog>. We stopImmediatePropagation()
     to short-circuit both other capture handlers and the bubble-phase
     jQuery delegation. */
  document.addEventListener('click', function (e) {
    var area = e.target && e.target.closest && e.target.closest('.generative-ai-area');
    if (!area) return;
    /* If the click is inside our modal, ignore — our modal contains the
       hidden .generative-ai-area from aiImageGenerator and we don't want
       a self-trigger. (CSS hides it; this is belt-and-braces.) */
    if (e.target.closest && e.target.closest('.dtf-ai-modal')) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    openModal();
  }, true);

  document.addEventListener('click', function (e) {
    if (!modal || modal.hidden) return;
    if (e.target.closest('[data-dtf-ai-modal-close]')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  /* When a tile is clicked inside the modal, ai-chat-sandbox.js handles the
     async upload via the cart pipeline. We just need to dismiss the modal
     so the user lands on the upload-state UI behind it. The upload runs in
     parallel — closing the modal does not cancel it. */
  document.addEventListener('click', function (e) {
    if (!modal || modal.hidden) return;
    var tile = e.target && e.target.closest && e.target.closest('.ai-pop-tile');
    if (!tile) return;
    if (!modal.contains(tile)) return;
    /* Skeleton/loading tiles aren't real picks. */
    if (tile.classList.contains('is-skeleton')) return;
    closeModal();
  });

  /* Same dismissal when the selection-bar "Use Design" / "Use Designs" CTA
     fires (multi/single-select via Recently Generated). The CTA's own
     handler in ai-chat-sandbox.js calls `stopPropagation()` to block the
     document-level outside-click closer for `#ai-panel` — that also
     prevents this listener from seeing the click in the bubble phase.
     Capture phase runs BEFORE the target's stopPropagation takes effect,
     so the modal closes synchronously and the CTA's own handler still
     does the upload. */
  document.addEventListener('click', function (e) {
    if (!modal || modal.hidden) return;
    var cta = e.target && e.target.closest && e.target.closest('.ai-chat-history-selection-bar__cta, [data-ai-selection-cta]');
    if (!cta) return;
    if (!modal.contains(cta)) return;
    closeModal();
  }, true);

  /* ---------------- Reload-and-restore for multi-AI selection ----------------
     When the user has an active upload (round-1 design) and picks 2+ AI images,
     the desired UX is: add the round-1 design to cart, RELOAD the product page,
     and re-open the multi-upload modal pre-populated with the 2+ AI images.
     We achieve this by intercepting `md-picker:use-designs` in the capture
     phase (before the bridge handler in product-page-popups-multiupload.liquid),
     stashing the items in sessionStorage, calling singleFileAddToCart, and
     reloading. On the next page load we read the stash and re-dispatch the
     event — without an active upload this time — so the bridge handler routes
     the URLs into multiFilesManageByURL.
     ----------------------------------------------------------------------- */
  var STASH_KEY = 'dtf:ai-multi-reload:v1';
  var LOADING_FLAG = 'dtf:ai-multi-reload:loading';
  var OVERLAY_ID = '__dtf-ai-multi-reload-overlay';

  /* Full-screen white loading overlay shown from the moment the user clicks
     "Use Designs" through the page reload until the multi-upload modal is
     ready. The overlay is rendered by injecting a fixed-position div with a
     very high z-index. We also suppress the legacy `.toast` and
     `.loadingScreen__` (singleFileAddToCart's own UI) via CSS — they have
     very high z-index values and would otherwise paint above the overlay. */
  function showLoadingOverlay() {
    if (!document.getElementById('__dtf-ai-hide-legacy-loaders')) {
      var hideStyle = document.createElement('style');
      hideStyle.id = '__dtf-ai-hide-legacy-loaders';
      hideStyle.textContent = '.toast, .loadingScreen__ { display: none !important; }';
      (document.head || document.documentElement).appendChild(hideStyle);
    }
    if (document.getElementById(OVERLAY_ID)) return;
    var ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    ov.style.cssText = 'position:fixed;inset:0;background:#ffffff;z-index:2147483647;display:flex;align-items:center;justify-content:center;font:600 16px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;';
    ov.innerHTML =
      '<div style="text-align:center;">' +
        '<div class="__dtf-ai-spinner" style="width:48px;height:48px;border:4px solid #e2e8f0;border-top-color:#46aae3;border-radius:50%;animation:__dtfSpin 0.8s linear infinite;margin:0 auto 16px;"></div>' +
        '<div>Loading designs…</div>' +
      '</div>';
    /* Inject keyframes once. */
    if (!document.getElementById('__dtf-ai-spinner-style')) {
      var s = document.createElement('style');
      s.id = '__dtf-ai-spinner-style';
      s.textContent = '@keyframes __dtfSpin { to { transform: rotate(360deg); } }';
      (document.head || document.documentElement).appendChild(s);
    }
    (document.body || document.documentElement).appendChild(ov);
  }

  function hideLoadingOverlay() {
    var ov = document.getElementById(OVERLAY_ID);
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    var hideStyle = document.getElementById('__dtf-ai-hide-legacy-loaders');
    if (hideStyle && hideStyle.parentNode) hideStyle.parentNode.removeChild(hideStyle);
    try { sessionStorage.removeItem(LOADING_FLAG); } catch (_) {}
  }

  /* If a previous page set the loading flag (i.e. we're returning from a
     reload triggered by stashAndReload), render the overlay synchronously
     so the user never sees the bare product page. */
  try {
    if (sessionStorage.getItem(LOADING_FLAG) === '1') {
      if (document.body) {
        showLoadingOverlay();
      } else {
        document.addEventListener('DOMContentLoaded', showLoadingOverlay);
      }
    }
  } catch (_) {}

  function hasActiveUpload() {
    /* If the multi-upload-wrapper is already active, the user is in multi-mode
       — new selections should merge into the existing wrapper, not trigger a
       reload. Bail out early. */
    if (document.querySelector('multi-upload-wrapper.active')) return false;

    /* Single-upload mode: detect via uploadType (lives in different scopes
       depending on which JS bundle the product loads — bySize.js /
       bySize_popular.js / pdp_transferBySize-multiupload.js — `let` at script
       top level is in the global lexical environment but NOT on window, so
       we probe both). Fall back to the master-upload hidden class which is
       set whenever a round-1 design is currently active. */
    try {
      if (typeof uploadType !== 'undefined' && uploadType === 'single') return true;
    } catch (_) {}
    if (typeof window.uploadType !== 'undefined' && window.uploadType === 'single') return true;
    var jq = window.jQuery || window.$;
    if (jq && jq('upload-controls master-upload').hasClass('hidden')) return true;
    return false;
  }

  function stashAndReload(items) {
    try {
      sessionStorage.setItem(STASH_KEY, JSON.stringify({
        items: items,
        ts: Date.now()
      }));
      sessionStorage.setItem(LOADING_FLAG, '1');
    } catch (_) {}

    /* Show the overlay BEFORE kicking off addToCart so the user sees one
       continuous loading screen rather than the live cart UI flashing
       through "Product Added to cart" + scroll animation. */
    showLoadingOverlay();

    var addToCartPromise = (typeof window.singleFileAddToCart === 'function')
      ? Promise.resolve(window.singleFileAddToCart())
      : Promise.resolve();

    addToCartPromise
      .catch(function (err) { console.error('singleFileAddToCart failed', err); })
      .then(function () {
        /* Small defer so the cart fetch settles before navigation. */
        setTimeout(function () { window.location.reload(); }, 100);
      });
  }

  /* Capture-phase intercept — runs BEFORE the document-bound bridge handler in
     product-page-popups-multiupload.liquid (which is bubble-phase by default). */
  document.addEventListener('md-picker:use-designs', function (e) {
    var items = (e.detail && e.detail.items) || [];
    if (items.length < 2) return;          /* single → existing flow loads new design in place */

    if (!hasActiveUpload()) {
      /* No active single-upload, but possibly in multi-upload mode. Let the
         bridge handler in product-page-popups-multiupload.liquid run, then
         auto-scroll the multi-upload-wrapper to the first new block. Mirrors
         the focus behaviour `.use_designes_bulk` already does for the
         previous-uploads picker. */
      if (document.querySelector('multi-upload-wrapper.active')) {
        var jq = window.jQuery || window.$;
        var beforeBlocks = jq ? jq('multi-upload uploaded-files-block').length : 0;
        setTimeout(function () {
          if (typeof window.setFocusOfMultiUpload === 'function') {
            window.setFocusOfMultiUpload(beforeBlocks);
          }
        }, 700);
      }
      return;
    }

    e.stopImmediatePropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();

    stashAndReload(items);
  }, true);

  /* On page load, if a stash exists from a prior reload, drive the multi-upload
     pipeline directly (createFileObjectFromUrl → multiFilesManageByURL) so the
     `isAIImage` flag is preserved on each file detail. The bridge handler in
     product-page-popups-multiupload.liquid also handles this event, but it
     doesn't set isAIImage; calling the helpers directly avoids that gap.
     We wait (poll) for the upload helpers to load. */
  function getHelper(name) {
    if (typeof window[name] === 'function') return window[name];
    /* Helpers declared as `async function foo` at script top level are also
       window-attached; helpers stored in `let`/`const` would not be. Try the
       bare global as a last resort, suppressing the ReferenceError if absent. */
    try { /* eslint-disable-next-line no-eval */ return (0, eval)(name); } catch (_) { return null; }
  }

  function rehydrateFromStash() {
    var raw;
    try { raw = sessionStorage.getItem(STASH_KEY); } catch (_) { hideLoadingOverlay(); return; }
    if (!raw) { hideLoadingOverlay(); return; }
    try { sessionStorage.removeItem(STASH_KEY); } catch (_) {}

    var data;
    try { data = JSON.parse(raw); } catch (_) { hideLoadingOverlay(); return; }
    if (!data || !data.items || data.items.length < 2) { hideLoadingOverlay(); return; }

    var attempts = 0;
    function tryProcess() {
      attempts++;
      var createFn = getHelper('createFileObjectFromUrl');
      var multiFn = getHelper('multiFilesManageByURL');
      if ((!createFn || !multiFn) && attempts < 60) {
        setTimeout(tryProcess, 200);
        return;
      }

      if (createFn && multiFn) {
        var files = data.items.map(function (it) {
          var url = it.file || it.url;
          if (!url) return null;
          var detail = createFn(url);
          detail.fileURL = url;
          detail.isAIImage = true;
          return detail;
        }).filter(Boolean);
        if (files.length) {
          multiFn(files);
          waitForMultiUploadAndHideOverlay();
        } else {
          hideLoadingOverlay();
        }
        return;
      }

      /* Fallback: dispatch the event so the bridge handler can process it. */
      document.dispatchEvent(new CustomEvent('md-picker:use-designs', {
        bubbles: true,
        detail: { items: data.items }
      }));
      waitForMultiUploadAndHideOverlay();
    }

    /* Poll briefly for the multi-upload-wrapper to land in the DOM, then hide
       the loading overlay. Capped at ~6s in case something goes wrong; we
       still want to give the user back control of the page. */
    function waitForMultiUploadAndHideOverlay() {
      var jq = window.jQuery || window.$;
      var waitAttempts = 0;
      function check() {
        waitAttempts++;
        var ready = jq
          ? (jq('multi-upload-wrapper').length > 0)
          : !!document.querySelector('multi-upload-wrapper');
        if (ready || waitAttempts >= 60) {
          hideLoadingOverlay();
          return;
        }
        setTimeout(check, 100);
      }
      check();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryProcess);
    } else {
      tryProcess();
    }
  }

  rehydrateFromStash();
})();
