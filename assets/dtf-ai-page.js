/* dtf-ai-page.js
   Standalone-page glue for /pages/ai-image-creator.

   Two jobs:
     1. Strip out the legacy figure-click-to-upload behavior. On a product
        page, clicking a result figure downloads the image into the upload
        pipeline. On a standalone page that pipeline doesn't exist, so a
        stray click would just fail silently. We open the image in a new
        tab as a sane fallback.
     2. Cross-page Order-as-DTF. dtf-ai-history.js dispatches
        `md-picker:use-designs` when the user multi-selects history tiles
        and clicks the black bar. There's no upload bridge listening on
        this page, so we intercept the event, stash the payload in
        sessionStorage, and navigate to /products/dtf-transfers, where
        product-page-popups(-multiupload).liquid rehydrates the stash and
        re-dispatches the event into the real upload pipeline. */
(function () {
  'use strict';

  if (window.__dtfAiPageInit) return;
  window.__dtfAiPageInit = true;

  var STASH_KEY = 'dtf:pending-ai-uploads:v1';
  var TARGET_URL = '/products/dtf-transfers';

  function isStandalonePage() {
    /* Detect by presence of the host element so we don't accidentally
       hijack md-picker:use-designs on a normal product page that
       somehow loaded this script (defensive). */
    return !!document.querySelector('[data-dtf-ai-page]');
  }

  /* ---- 1. Capture md-picker:use-designs and hand off to product page ---- */
  function onUseDesigns(e) {
    if (!isStandalonePage()) return;
    var items = (e && e.detail && e.detail.items) || [];
    if (!items.length) return;

    /* Stop the event so dtf-ai-history.js's closeAiModalIfOpen path is
       the only side-effect; nothing else listens here, but other
       listeners may be added later. */
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }

    try {
      sessionStorage.setItem(STASH_KEY, JSON.stringify({
        items: items,
        ts: Date.now()
      }));
    } catch (err) { /* sessionStorage may be disabled — fall through */ }

    /* Visual hint while we navigate so the user knows something is
       happening on slow connections. */
    showHandoffToast(items.length);

    /* Defer the navigation a tick so the toast paints. */
    setTimeout(function () {
      window.location.assign(TARGET_URL);
    }, 250);
  }

  function showHandoffToast(count) {
    var t = document.createElement('div');
    t.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:32px',
      'transform:translateX(-50%)',
      'background:#0f172a',
      'color:#fff',
      'font:600 14px/1.2 "DM Sans",system-ui,sans-serif',
      'padding:14px 22px',
      'border-radius:999px',
      'box-shadow:0 12px 32px rgba(15,23,42,0.25)',
      'z-index:99999',
      'pointer-events:none'
    ].join(';');
    t.textContent = 'Sending ' + count + ' design' + (count === 1 ? '' : 's') +
      ' to your DTF order…';
    document.body.appendChild(t);
  }

  document.addEventListener('md-picker:use-designs', onUseDesigns, true);

  /* ---- 2. Open clicked figures in a new tab (no local upload pipeline) ---- */
  /* The native generative-ai-image-modal.js binds figure clicks inside
     #generative-ai-images to a download-and-add-to-upload handler. On a
     standalone page that handler will fail because there's no upload
     pipeline. Pre-empt it: capture-phase click on .dtfut__ai-chat-results
     figures opens the original asset URL in a new tab instead. We don't
     touch the history tiles — those still go through reuseItem which
     dispatches a hidden figure click into the legacy flow, which on a
     page with no upload pipeline will no-op. The selection-bar Order-as-DTF
     path is the recommended way to use a history image off this page. */
  document.addEventListener('click', function (e) {
    if (!isStandalonePage()) return;
    var fig = e.target && e.target.closest && e.target.closest('.dtfut__ai-chat-results figure');
    if (!fig) return;
    var url = fig.dataset && fig.dataset.url;
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener');
  }, true);
})();
