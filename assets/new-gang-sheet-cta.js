(function () {
  'use strict';

  function init() {
    var wrapper = document.querySelector('.new-gang-sheet-cta-wrapper');
    if (!wrapper) return;
    var button = wrapper.querySelector('[data-gsb-new-cta]');
    var dataScript = wrapper.querySelector('.new-gang-sheet-cta-variants');
    var proxyPath = wrapper.getAttribute('data-gsb-proxy-path') || '/apps/ninja-gang-sheet';
    if (!button || !dataScript) return;

    var variants = [];
    try { variants = JSON.parse(dataScript.textContent) || []; } catch (e) { variants = []; }
    var variantsById = {};
    variants.forEach(function (v) { variantsById[String(v.id)] = v; });

    function updateHref(variant) {
      var params = [];
      if (variant && variant.id) params.push('variant=' + encodeURIComponent(variant.id));
      button.href = proxyPath + (params.length ? '?' + params.join('&') : '');
    }

    // Determine initial variant: URL ?variant= takes priority, then first variant in list
    var initial = null;
    try {
      var urlVariant = new URLSearchParams(window.location.search).get('variant');
      if (urlVariant && variantsById[urlVariant]) initial = variantsById[urlVariant];
    } catch (e) { /* noop */ }
    if (!initial && variants.length) initial = variants[0];
    if (initial) updateHref(initial);

    // VARIANT_CHANGE is dispatched non-bubbling on <product-variants>; use capture phase.
    document.addEventListener('VARIANT_CHANGE', function (e) {
      var el = e.target;
      if (el && el.currentVariant) updateHref(el.currentVariant);
    }, true);

    function trackCtaClick() {
      try {
        window.optimizely = window.optimizely || [];
        window.optimizely.push({ type: 'event', eventName: 'gsb_cta_click' });
      } catch (err) { /* noop */ }
    }

    button.addEventListener('click', trackCtaClick);

      // Mirror tracking on the old (control) CTA so the same Optimizely event
      // captures click-throughs for both variations. Bind directly to the
      // builder button (not the wrapper) — the wrapper carries role="button"
      // at runtime, which made closest() match incidental clicks anywhere
      // inside the block and inflated control CTR.
      var oldButton = document.querySelector('[data-gsb-variant="old"] #gs-builder-btn');
      if (oldButton) {
        oldButton.addEventListener('click', trackCtaClick);
      }
    }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
