/* cache-bust: 2026-05-26-r92b-restore-desktop-real */
/* Pre-cut V3 upsell card injector — standalone asset to bypass the
   bySize_popular.js CDN cache issue on staging. Loaded directly by
   layout/theme.liquid on dtf-transfers + dtf-transfers-by-size-v2.

   Bound at script-load time (no DOMContentLoaded gate) so it runs as
   early as possible. Reads editable copy from window.__precutV3Settings
   (emitted by layout/theme.liquid from theme settings). */
(function () {
  /* V3 markup injection disabled for LIVE theme push (#146580111443).
     Live theme keeps the existing precut markup unchanged per user. */
  if (typeof window === 'undefined' || true /* live: keep existing precut */) return;
  if (typeof window === 'undefined' || window.__ntPrecutV3InjectedStandalone) return;

  function shouldInject() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function buildV3Markup(checkboxId) {
    var s = (typeof window !== 'undefined' && window.__precutV3Settings) || {};
    var titleDefault = s.titleDefault || 'Pre-cut your transfers?';
    var titleChecked = s.titleChecked || 'Pre-cutting added';
    var bullet1      = s.bullet1      || 'Comes Ready to Apply';
    var bullet2      = s.bullet2      || 'Save an hour per 50 transfers';
    var priceAmount  = s.priceAmount  || '+$0.19';
    var priceUnit    = s.priceUnit    || 'per transfer';
    var tooltip      = s.tooltip      || 'We trim each transfer to shape so you can press straight from the pack — no scissors, no weeding the excess film.';

    var checkSvg =
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="none">' +
        '<path d="M3.5 8.2l3 3 6-6.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    var bulletSvg =
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<path d="M3.5 8.2l3 3 6-6.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    return (
      '<label for="' + checkboxId + '" class="pc-upgrade__row">' +
        '<input type="checkbox" id="' + checkboxId + '" class="pc-upgrade__input">' +
        '<span class="pc-upgrade__check" aria-hidden="true">' + checkSvg + '</span>' +
        '<span class="pc-upgrade__main">' +
          '<span class="pc-upgrade__title">' +
            '<span class="pc-upgrade__title-text pc-upgrade__title-text--default">' + escapeHtml(titleDefault) + '</span>' +
            '<span class="pc-upgrade__title-text pc-upgrade__title-text--checked">' + escapeHtml(titleChecked) + '</span>' +
            '<span class="pc-upgrade__info" role="button" tabindex="0" aria-label="More info about pre-cut transfers" onclick="event.preventDefault();event.stopPropagation();">' +
              '<span class="pc-upgrade__tooltip" role="tooltip">' + escapeHtml(tooltip) + '</span>' +
            '</span>' +
          '</span>' +
          '<ul class="pc-upgrade__features">' +
            '<li>' + bulletSvg + ' ' + escapeHtml(bullet1) + '</li>' +
            '<li>' + bulletSvg + ' ' + escapeHtml(bullet2) + '</li>' +
          '</ul>' +
        '</span>' +
        '<span class="pc-upgrade__price">' +
          '<span class="pc-upgrade__price-amt">' + escapeHtml(priceAmount) + '</span>' +
          '<span class="pc-upgrade__price-unit">' + escapeHtml(priceUnit) + '</span>' +
        '</span>' +
        '<strong class="nodisplay precut-cost" hidden>$0.19 each</strong>' +
      '</label>'
    );
  }
  function transformOne(precutEl) {
    if (!precutEl || precutEl.classList.contains('pc-upgrade')) return;
    var existingCheckbox = precutEl.querySelector('input[type="checkbox"]');
    var checkboxId = existingCheckbox ? existingCheckbox.id : 'preCutOption';
    var wasChecked = existingCheckbox ? existingCheckbox.checked : false;
    precutEl.classList.add('pc-upgrade');
    precutEl.innerHTML = buildV3Markup(checkboxId);
    if (wasChecked) {
      var newInput = precutEl.querySelector('#' + checkboxId);
      if (newInput) {
        newInput.checked = true;
        try { newInput.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
      }
    }
  }
  function transformAll() {
    if (!shouldInject()) return;
    var nodes = document.querySelectorAll('precut:not(.pc-upgrade)');
    nodes.forEach(transformOne);
  }
  function init() {
    if (window.__ntPrecutV3InjectedStandalone) return;
    window.__ntPrecutV3InjectedStandalone = true;
    transformAll();
    var mo = new MutationObserver(function (muts) {
      var needsScan = false;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'PRECUT' || (n.querySelector && n.querySelector('precut:not(.pc-upgrade)'))) {
            needsScan = true;
            break;
          }
        }
        if (needsScan) break;
      }
      if (needsScan) transformAll();
    });
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        mo.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─── Combined info row: price | printed-by-ninja | reviews ────
   Default markup renders the reviews widget and the "As Low As"
   price as two stacked rows, with the "Printed Directly by Ninja"
   description as a 3rd row. Both desktop and mobile want all three
   on ONE row, separated by light-gray pipe dividers:
       [As Low As $0.02/sq in]  |  [🇺🇸 Printed by Ninja. Ships from USA]  |  [⭐⭐⭐⭐⭐ 20,643 Reviews]
   Mobile differences:
     • "As Low As" → "From"
     • Reviews widget: strip the trailing " Reviews" word so only
       stars + count remain (saves horizontal room).
   The standalone .product__description block is hidden by CSS — the
   pill in this row is the only place that copy appears now.
   Idempotent via __ntInfoRowV2. */
(function () {
  if (typeof window === 'undefined' || window.__ntInfoRowV2) return;
  function isMobile() { return window.innerWidth <= 1199; }
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  function flagSvg() {
    return '<svg width="18" height="13" viewBox="0 0 20 14" aria-hidden="true" ' +
           'style="border-radius:2px;flex-shrink:0;display:inline-block;vertical-align:middle;">' +
             '<rect width="20" height="14" fill="#B22234"/>' +
             '<rect y="1.077" width="20" height="1.077" fill="#fff"/>' +
             '<rect y="3.231" width="20" height="1.077" fill="#fff"/>' +
             '<rect y="5.385" width="20" height="1.077" fill="#fff"/>' +
             '<rect y="7.538" width="20" height="1.077" fill="#fff"/>' +
             '<rect y="9.692" width="20" height="1.077" fill="#fff"/>' +
             '<rect y="11.846" width="20" height="1.077" fill="#fff"/>' +
             '<rect width="8" height="7.538" fill="#3C3B6E"/>' +
           '</svg>';
  }
  function buildSeparator() {
    var s = document.createElement('span');
    s.className = 'nt-info-sep';
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'color:#d1d5db;font-weight:300;flex-shrink:0;font-size:18px;line-height:1;';
    s.textContent = '|';
    return s;
  }
  function buildPill(mobile) {
    var p = document.createElement('span');
    p.className = 'nt-printed-inline';
    /* Tier 1 (r79): render BOTH copy variants inline; CSS @media
       toggles which one is visible. That way resizing the browser
       between mobile and desktop swaps the text automatically
       without JS having to re-render the pill. */
    p.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:#000;' +
                      'font-weight:500;white-space:nowrap;flex-shrink:1;min-width:0;' +
                      'font-family:Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    p.innerHTML =
      '<span class="nt-pill-text-desktop">Printed by Ninja. Ships from </span>' +
      '<span class="nt-pill-text-mobile">Ships from </span>' +
      flagSvg();
    return p;
  }
  /* Add thousands separators (12345 → 12,345). */
  function commafy(numStr) {
    return String(numStr).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function formatReviewsText(mobile) {
    /* Yotpo's bottom-line text reads e.g. "20957 Reviews" or
       "20,957 Reviews" depending on locale. Format the number with
       comma separators on BOTH viewports. On MOBILE also strip the
       " Reviews" word and shrink the count font-size 5%. Yotpo
       re-renders periodically so we have to run after each render.
       Returns true when at least one node was successfully formatted
       so the caller can mark the widget visible. */
    var nodes = document.querySelectorAll(
      '.yotpo-sr-bottom-line-summary .yotpo-sr-bottom-line-text-2-text, ' +
      '.yotpo-sr-bottom-line-summary .yotpo-sr-bottom-line-text, ' +
      '.yotpo-sr-bottom-line-text'
    );
    var didAny = false;
    nodes.forEach(function (n) {
      var t = (n.textContent || '');
      var m = t.match(/(\d[\d,]*)\s*(Reviews?)/i);
      if (!m) return;
      var rawNum = m[1].replace(/,/g, '');
      var nice = commafy(rawNum);
      var target = mobile ? nice : (nice + ' ' + m[2]);
      if (n.textContent !== target) n.textContent = target;
      /* Match the row-wide font size + family (mobile 5% smaller). */
      n.style.setProperty('font-size', mobile ? '12.35px' : '16px', 'important');
      n.style.setProperty('font-family',
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'important');
      didAny = true;
    });
    if (didAny) {
      /* Mark the yotpo widget container ready so the CSS hide rule
         releases. Targets both the Yotpo widget instance and the
         Shopify app-block wrapper for safety. */
      var ctn = document.querySelectorAll(
        '.product-text .has-bg-style--primary .yotpo-widget-instance, ' +
        '.product-text .has-bg-style--primary .shopify-app-block'
      );
      ctn.forEach(function (el) { el.setAttribute('data-nt-yotpo-ready', '1'); });
    }
    return didAny;
  }
  function run() {
    if (window.__ntInfoRowV2) return;
    if (!shouldRun()) return;
    var reviews = document.querySelector('.product-text .has-bg-style--primary');
    var alow    = document.querySelector('.product-text ._flex-box');
    if (!reviews || !alow) return;
    window.__ntInfoRowV2 = true;

    var mobile = isMobile();
    var strong = alow.querySelector('._cost_value, strong');
    var priceSpan = alow.querySelector('._styledtext, span');
    /* Per-viewport font size — desktop matches Yotpo's natural 16px,
       mobile is 13px (14.4 × 0.95 — 5% smaller per design tweak).
       Everything in the row uses the SAME size + family so the text
       optically aligns. */
    var rowFont = mobile ? '12.35px' : '16px';
    var rowFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    /* Rewrite the price copy:
         Desktop: "As Low As" + "$0.02/sq in" (drop "per square inch")
         Mobile:  "From"      + "$0.02/sq in" */
    if (strong) {
      strong.textContent = mobile ? 'From ' : 'As Low As ';
      strong.style.setProperty('color', '#019AFF', 'important');
      strong.style.setProperty('font-weight', '600', 'important');
      strong.style.setProperty('font-size', rowFont, 'important');
      strong.style.setProperty('font-family', rowFamily, 'important');
    }
    if (priceSpan) {
      var raw = priceSpan.textContent || '';
      var match = raw.match(/\$[\d.]+/);
      priceSpan.innerHTML = '<strong>' + (match ? match[0] : '$0.02') + '/sq in</strong>';
      priceSpan.style.setProperty('color', '#000', 'important');
      priceSpan.style.setProperty('font-weight', '700', 'important');
      priceSpan.style.setProperty('margin-left', '4px', 'important');
      /* Override the section's `._styledtext { font-size: 0.9rem }`
         so this matches the rest of the row. */
      priceSpan.style.setProperty('font-size', rowFont, 'important');
      priceSpan.style.setProperty('font-family', rowFamily, 'important');
      var innerStrong = priceSpan.querySelector('strong');
      if (innerStrong) {
        innerStrong.style.setProperty('font-size', rowFont, 'important');
        innerStrong.style.setProperty('font-family', rowFamily, 'important');
      }
    }

    /* Lay out the reviews container as a single-line flex row. */
    reviews.style.display = 'flex';
    reviews.style.alignItems = 'center';
    reviews.style.justifyContent = 'flex-start';
    reviews.style.gap = mobile ? '8px' : '14px';
    reviews.style.flexWrap = 'nowrap';
    reviews.style.paddingLeft = '0';
    reviews.style.paddingRight = '0';
    reviews.style.width = '100%';
    reviews.style.boxSizing = 'border-box';
    reviews.style.margin = '4px 0 0';

    /* Price block layout — font-size/family sync'd with the rest of
       the row. */
    alow.style.flexShrink = '0';
    alow.style.margin = '0';
    alow.style.padding = '0';
    alow.style.fontSize = rowFont;
    alow.style.fontFamily = rowFamily;
    alow.style.lineHeight = '1.2';
    alow.style.whiteSpace = 'nowrap';

    /* Move price to the FIRST position and insert pipes + pill. */
    reviews.insertBefore(alow, reviews.firstChild);
    var sep1 = buildSeparator();
    var pill = buildPill(mobile);
    var sep2 = buildSeparator();
    alow.parentNode.insertBefore(sep1, alow.nextSibling);
    sep1.parentNode.insertBefore(pill, sep1.nextSibling);
    pill.parentNode.insertBefore(sep2, pill.nextSibling);

    /* yotpo widget keeps its layout; match the row's font size +
       family so the count text is rendered consistently. */
    var yotpo = reviews.querySelector('.yotpo-widget-instance, .shopify-app-block');
    if (yotpo) {
      yotpo.style.flex = '0 0 auto';
      yotpo.style.minWidth = '0';
      yotpo.style.fontSize = rowFont;
      yotpo.style.fontFamily = rowFamily;
    }

    /* Mark the row layout as transformed so the row-level FOUC rule
       releases. The yotpo widget itself stays hidden by a SEPARATE
       rule until we successfully format its text. */
    reviews.setAttribute('data-nt-info-row', '1');

    /* Format the review count immediately if Yotpo has already
       rendered. If not, install a MutationObserver on the row so
       we format the MOMENT Yotpo paints — no visible flash. */
    if (formatReviewsText(mobile)) return;
    var mo = new MutationObserver(function () {
      if (formatReviewsText(mobile)) {
        /* Keep observing for re-renders so the format sticks, but
           note success. */
      }
    });
    mo.observe(reviews, { childList: true, subtree: true, characterData: true });
    /* Hard stop after 20s to avoid leaks if Yotpo never loads. */
    setTimeout(function () { mo.disconnect(); }, 20000);
  }
  function init() {
    run();
    /* yotpo/widget elements hydrate async — watch for them appearing. */
    if (!window.__ntInfoRowV2) {
      var pt = document.querySelector('.product-text');
      if (pt) {
        var mo = new MutationObserver(function () {
          run();
          if (window.__ntInfoRowV2) mo.disconnect();
        });
        mo.observe(pt, { childList: true, subtree: true });
        setTimeout(function () { mo.disconnect(); }, 10000);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─── Mobile-only: shorten 4 selling points + lay out 2-per-row ──
   Default markup renders four `.iconTextBlock__item` rows stacked
   1-per-line on mobile. Reduce verbosity (e.g. "Works on Any Fabric
   or Color" → "Any fabric or color") and lay them out in a 2×2 grid
   so all four fit in two rows with their icons. CSS in theme.css
   handles the grid; this JS just rewrites the text. */
(function () {
  if (typeof window === 'undefined' || window.__ntSellingPointsShortened) return;
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    var isMob = window.innerWidth <= 1199;
    return isMob && (bc.indexOf('template-product-by-size-tabs') > -1 ||
                     bc.indexOf('template-product-by-size-bg-options') > -1);
  }
  /* Mapping from current copy to the shorter mobile version. Match
     by keyword so any tail variations still rewrite. The `kind` slot
     identifies which icon to use AND drives mobile reorder. */
  var REWRITES = [
    { kind: 'fabric',  match: /works on any fabric|any fabric or color/i,                              to: 'Any fabric or color' },
    { kind: 'vibrant', match: /vibrant colors|ultra-fine details|vibrant ultra-fine|colors\s*&\s*details/i, to: 'Vibrant Colors & Details' },
    { kind: 'washes',  match: /certified for 100\+ washes|certified 100\+ washes|100\+ washes/i,        to: '100+ Washes' },
    { kind: 'shield',  match: /100% satisfaction guaranteed|satisfaction guaranteed|100% guaranteed/i,   to: 'Satisfaction Guaranteed' }
  ];
  /* Rewrite ONLY the first text node child of .iconTextBlock__iconText,
     leaving the sibling popup div (info icon link) intact. */
  function setLabel(textBox, newLabel) {
    var first = null;
    var kids = textBox.childNodes;
    for (var k = 0; k < kids.length; k++) {
      if (kids[k].nodeType === 3 /* TEXT_NODE */ &&
          (kids[k].textContent || '').trim().length > 0) {
        first = kids[k];
        break;
      }
    }
    if (first) {
      first.textContent = newLabel + ' ';
    } else {
      /* No leading text node — prepend one without touching siblings. */
      textBox.insertBefore(document.createTextNode(newLabel + ' '), textBox.firstChild);
    }
  }
  function rewrite() {
    if (window.__ntSellingPointsShortened) return;
    if (!shouldRun()) return;
    var items = document.querySelectorAll('.product-text .iconTextBlock .iconTextBlock__item');
    if (!items.length) return;
    var matched = 0;
    var byKind = {};
    items.forEach(function (item) {
      var textBox = item.querySelector('.iconTextBlock__iconText');
      if (!textBox) return;
      var current = (textBox.textContent || '').trim();
      for (var i = 0; i < REWRITES.length; i++) {
        if (REWRITES[i].match.test(current)) {
          setLabel(textBox, REWRITES[i].to);
          item.setAttribute('data-nt-kind', REWRITES[i].kind);
          byKind[REWRITES[i].kind] = item;
          matched++;
          break;
        }
      }
    });
    /* NOTE: DOM reorder used to live here (insertBefore washes
       before vibrant) but CSS now handles the visual swap via
       `order: 1/3/2/4`. Doing both broke :nth-child label assignment
       — once JS moved washes to DOM position 2, my CSS ::before
       rules (keyed by :nth-child) put "Vibrant" on the washes item
       and "100+ Washes" on the vibrant item. CSS-only reorder keeps
       DOM stable so :nth-child stays mapped to the original items. */
    if (matched >= 4) window.__ntSellingPointsShortened = true;
  }
  function init() {
    rewrite();
    if (!window.__ntSellingPointsShortened) {
      var pt = document.querySelector('.product-text');
      if (pt) {
        var mo = new MutationObserver(function () {
          rewrite();
          if (window.__ntSellingPointsShortened) mo.disconnect();
        });
        mo.observe(pt, { childList: true, subtree: true });
        setTimeout(function () { mo.disconnect(); }, 10000);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─── Replace iconTextBlock icons with new rounded-square SVGs ────
   The default markup has `<img>` icons inside `.iconTextBlock__iconWrap`
   sourced from Shopify metafields. We override them with custom
   inline SVGs that render as a light-blue rounded square outline
   with a matching blue icon glyph inside (t-shirt / sparkle /
   washer / shield-check). Idempotent via __ntIconsReplacedV2.
   Matched by KIND attribute set by the selling-points block (when
   that runs on mobile), or by text content directly (desktop). */
(function () {
  if (typeof window === 'undefined' || window.__ntIconsReplacedV2) return;
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  var BLUE = '#019AFF';
  function svgFor(kind) {
    var head = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
               '<rect x="0.75" y="0.75" width="26.5" height="26.5" rx="5" stroke="' + BLUE + '" stroke-width="1.5"/>';
    var glyph = '';
    switch (kind) {
      case 'fabric':
        /* t-shirt */
        glyph = '<path d="M11 7c0 1.7 1.3 3 3 3s3-1.3 3-3M9 8L7 9v3l2 1v8h10v-8l2-1V9l-2-1-2-1h-2l-3 2-3-2H11L9 8z" ' +
                'stroke="' + BLUE + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
        break;
      case 'vibrant':
        /* sparkles / diamond */
        glyph = '<path d="M14 6.5l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6L14 6.5z" ' +
                'stroke="' + BLUE + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
                '<path d="M20 17.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6z" ' +
                'fill="' + BLUE + '"/>';
        break;
      case 'washes':
        /* washing machine */
        glyph = '<rect x="7" y="6.5" width="14" height="15" rx="2" stroke="' + BLUE + '" stroke-width="1.4"/>' +
                '<circle cx="14" cy="15" r="3.5" stroke="' + BLUE + '" stroke-width="1.4"/>' +
                '<circle cx="14" cy="15" r="1.2" stroke="' + BLUE + '" stroke-width="1.2"/>' +
                '<circle cx="10" cy="9" r="0.7" fill="' + BLUE + '"/>' +
                '<circle cx="12.5" cy="9" r="0.7" fill="' + BLUE + '"/>';
        break;
      case 'shield':
        /* shield with checkmark */
        glyph = '<path d="M14 6.5l5.5 2v4.5c0 4-2.5 6-5.5 7-3-1-5.5-3-5.5-7V8.5L14 6.5z" ' +
                'stroke="' + BLUE + '" stroke-width="1.4" stroke-linejoin="round" fill="none"/>' +
                '<path d="M11.5 13.5l1.7 1.7 3.3-3.3" ' +
                'stroke="' + BLUE + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
        break;
      default:
        return '';
    }
    return head + glyph + '</svg>';
  }
  /* Match by data-nt-kind first (set by selling-points block), or by
     keyword in the label text. */
  var TEXT_TO_KIND = [
    { match: /fabric|color/i,    kind: 'fabric' },
    { match: /vibrant|details/i, kind: 'vibrant' },
    { match: /washes/i,          kind: 'washes' },
    { match: /satisfaction|guaranteed/i, kind: 'shield' }
  ];
  function detectKind(item) {
    var attr = item.getAttribute('data-nt-kind');
    if (attr) return attr;
    var textBox = item.querySelector('.iconTextBlock__iconText');
    if (!textBox) return null;
    var t = (textBox.textContent || '').trim();
    for (var i = 0; i < TEXT_TO_KIND.length; i++) {
      if (TEXT_TO_KIND[i].match.test(t)) return TEXT_TO_KIND[i].kind;
    }
    return null;
  }
  function run() {
    if (window.__ntIconsReplacedV2) return;
    if (!shouldRun()) return;
    var items = document.querySelectorAll('.product-text .iconTextBlock .iconTextBlock__item');
    if (!items.length) return;
    var done = 0;
    items.forEach(function (item) {
      var wrap = item.querySelector('.iconTextBlock__iconWrap');
      if (!wrap) return;
      if (wrap.getAttribute('data-nt-icon-replaced') === '1') { done++; return; }
      var kind = detectKind(item);
      if (!kind) return;
      var html = svgFor(kind);
      if (!html) return;
      wrap.innerHTML = html;
      wrap.setAttribute('data-nt-icon-replaced', '1');
      /* Strip the section's circle bg so only OUR SVG border shows. */
      wrap.style.background = 'transparent';
      wrap.style.padding = '0';
      wrap.style.width = '28px';
      wrap.style.height = '28px';
      wrap.style.minWidth = '28px';
      wrap.style.borderRadius = '0';
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.style.justifyContent = 'center';
      done++;
    });
    if (done >= 4) window.__ntIconsReplacedV2 = true;
  }
  function init() {
    run();
    if (!window.__ntIconsReplacedV2) {
      var pt = document.querySelector('.product-text');
      if (pt) {
        var mo = new MutationObserver(function () {
          run();
          if (window.__ntIconsReplacedV2) mo.disconnect();
        });
        mo.observe(pt, { childList: true, subtree: true });
        setTimeout(function () { mo.disconnect(); }, 10000);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─── Polish the .delivery-block row ──────────────────────────────
   Two changes per design spec:
     1. Prepend a small package-box icon (matching the new selling-
        point icon family: light-blue rounded square + glyph) right
        before the "Fastest Delivery" text.
     2. Color the countdown <strong> (e.g. "22h 51m") blue — the
        FIRST <strong> ("May. 27") stays its default color.
   Idempotent via __ntDeliveryPolished. */
(function () {
  if (typeof window === 'undefined' || window.__ntDeliveryPolished) return;
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  var BLUE = '#019AFF';
  /* Clean package box (no outer rounded-square frame), 24×24. Stroke
     in blue, sized 24px so it reads bigger than the previous outlined
     22px version. Lucide-style package glyph. */
  function boxIconSvg() {
    /* 22.8px = 24 × 0.95 — 5% smaller per design tweak. */
    return '<svg class="nt-delivery-box-icon" width="22.8" height="22.8" viewBox="0 0 24 24" fill="none" aria-hidden="true" ' +
           'style="flex-shrink:0;display:inline-block;vertical-align:-5px;margin-right:6px;">' +
             '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="' + BLUE + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
             '<polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="' + BLUE + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
             '<line x1="12" y1="22.08" x2="12" y2="12" stroke="' + BLUE + '" stroke-width="1.8" stroke-linecap="round"/>' +
             '<path d="M16.5 9.4l-9-5.19" stroke="' + BLUE + '" stroke-width="1.8" stroke-linecap="round"/>' +
           '</svg>';
  }
  function run() {
    if (window.__ntDeliveryPolished) return;
    if (!shouldRun()) return;
    /* The visible delivery text lives DIRECTLY inside the custom
       element <fastest-deliver-placeholder>, not inside the inner
       .delivery-block > .textinfodel (which is display:none and
       holds the template strings the JS countdown copies from). */
    var ph = document.querySelector('fastest-deliver-placeholder');
    if (!ph) return;
    /* Remove the inner .delivery-block — it only renders my old
       (incorrectly placed) SVG and a hidden span. Cleaner to scrub it. */
    var oldBlock = ph.querySelector('.delivery-block');
    if (oldBlock) oldBlock.style.display = 'none';
    /* Prepend the new box icon as the FIRST child of the placeholder
       so it renders inline with the "Fastest Delivery" text. */
    if (!ph.querySelector(':scope > .nt-delivery-box-icon')) {
      ph.insertAdjacentHTML('afterbegin', boxIconSvg());
    }
    /* Color the LAST <strong> (countdown) blue. The countdown JS
       re-renders this <strong> every tick so we keep re-applying via
       the observer below. */
    var strongs = ph.querySelectorAll(':scope > strong');
    if (strongs.length >= 1) {
      var last = strongs[strongs.length - 1];
      last.style.setProperty('color', BLUE, 'important');
      last.style.setProperty('font-weight', '700', 'important');
    }
    window.__ntDeliveryPolished = true;
  }
  function init() {
    run();
    /* Keep observing — the countdown re-renders the placeholder
       periodically and would otherwise wipe our icon / strong color.
       Re-running run() is cheap (idempotent inserts via :scope check). */
    var pt = document.querySelector('.product-text');
    if (pt) {
      var mo = new MutationObserver(function () {
        /* Reset the flag so run() does its work again, then re-set. */
        window.__ntDeliveryPolished = false;
        run();
      });
      mo.observe(pt, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─── DISABLED: Standalone "Printed by Ninja" pill ────────────────
   The pill content was moved into the combined info row above (the
   __ntInfoRowV2 block). The original .product__description block is
   hidden via theme.css. This whole IIFE is short-circuited so the
   old pill never appears, but the code stays in place for reference
   in case we need to roll back to a separate row. */
(function () {
  if (typeof window === 'undefined' || true /* always skip */) return;
  if (typeof window === 'undefined' || window.__ntPrintedByNinjaBadge) return;
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  function run() {
    if (window.__ntPrintedByNinjaBadge) return;
    if (!shouldRun()) return;
    /* Find the description block. Match by the leading text so we
       don't accidentally replace some other RTE block on a future
       product variant. */
    var desc = document.querySelector('.product-text .product__description');
    if (!desc) return;
    var txt = (desc.textContent || '').trim();
    if (txt.indexOf('Printed') === -1) return;
    window.__ntPrintedByNinjaBadge = true;
    /* Build the badge markup. Inline styles so we don't depend on a
       CSS push landing — bg + radius + padding all set here. The
       SVG flag is inlined (works everywhere, no emoji rendering
       inconsistency between iOS / Android / desktop). */
    /* Desktop shows the single shorter phrase, mobile shows the
       3-part bulleted version. */
    var isMobile = window.innerWidth <= 1199;
    var inner = isMobile
      ? '<span>Printed by Ninja</span>' +
        '<span aria-hidden="true" style="color:#9aa0a6;">•</span>' +
        '<span>Never outsourced</span>' +
        '<span aria-hidden="true" style="color:#9aa0a6;">•</span>' +
        '<span>Ships from USA</span>'
      : '<span>Always Ships From USA</span>';
    var html =
      '<div class="nt-printed-badge" style="' +
        'display:inline-flex;align-items:center;gap:8px;' +
        'background:#f2f2f2;border-radius:999px;' +
        'padding:6px 14px;' +
        'font-family:Inter,-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;' +
        'font-size:12.35px;font-weight:600;color:#2B2B2B;' + /* 13px -5% */
        'line-height:1.2;white-space:nowrap;' +
      '">' +
        /* USA flag SVG — 20×14, rounded a touch, lightweight. */
        '<svg width="20" height="14" viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0;border-radius:2px;overflow:hidden;">' +
          '<rect width="20" height="14" fill="#B22234"/>' +
          '<rect y="1.077" width="20" height="1.077" fill="#fff"/>' +
          '<rect y="3.231" width="20" height="1.077" fill="#fff"/>' +
          '<rect y="5.385" width="20" height="1.077" fill="#fff"/>' +
          '<rect y="7.538" width="20" height="1.077" fill="#fff"/>' +
          '<rect y="9.692" width="20" height="1.077" fill="#fff"/>' +
          '<rect y="11.846" width="20" height="1.077" fill="#fff"/>' +
          '<rect width="8" height="7.538" fill="#3C3B6E"/>' +
        '</svg>' +
        inner +
      '</div>';
    desc.innerHTML = html;
    /* The container itself might have block layout / padding from the
       theme — make sure it stays inline so the pill sits naturally
       in the column flow. */
    desc.style.padding = '0';
    desc.style.margin = '8px 0 0';
    /* On narrow mobile viewports the row wraps to two lines if the
       text is too wide. Allow wrap by overriding nowrap on the pill
       when the viewport is below 420 px. */
    if (window.innerWidth < 420) {
      var pill = desc.querySelector('.nt-printed-badge');
      if (pill) {
        pill.style.whiteSpace = 'normal';
        pill.style.fontSize = '11.4px'; /* mobile-narrow 5% shrink */
        pill.style.padding = '6px 12px';
      }
    }
  }
  function init() {
    run();
    if (!window.__ntPrintedByNinjaBadge) {
      var pt = document.querySelector('.product-text');
      if (pt) {
        var mo = new MutationObserver(function () {
          run();
          if (window.__ntPrintedByNinjaBadge) mo.disconnect();
        });
        mo.observe(pt, { childList: true, subtree: true });
        setTimeout(function () { mo.disconnect(); }, 10000);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─── Repair VIVID AF badge position + text swap ─────────────────
   An earlier revision of this file moved `.titleBadge` out of the H1
   into the reviews row. That was reverted, but staging served the
   stale relocation JS for a while, so some browsers still have the
   badge displaced. Two responsibilities here:
     1. Ensure the badge lives inside the H1 (revert any displacement).
     2. On mobile (≤767px), swap the badge text from
        "FREE Upgrade to VIVID AF" → "VIVID AF" and mark the badge
        ready so the CSS `:not([data-nt-vivid-ready])` rule stops
        hiding it. The ready marker is also set on desktop so the
        full original text stays visible there.
   Idempotent via __ntVividBadgeRepaired. Runs as early as possible
   (head-loaded `defer` script + DOMContentLoaded fallback) to keep
   the hidden-then-revealed cycle imperceptible. */
(function () {
  if (typeof window === 'undefined' || window.__ntVividBadgeRepaired) return;
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  function repair() {
    var badge = document.querySelector('.titleBadge');
    if (!badge) return;
    var h1 = document.querySelector('.product-text h1.product__title');
    if (!h1) return;
    /* Move badge back into H1 if a stale revision displaced it. */
    if (badge.parentElement !== h1) {
      badge.removeAttribute('style');
      h1.appendChild(badge);
      var reviews = document.querySelector('.product-text .has-bg-style--primary');
      if (reviews) {
        ['display','alignItems','justifyContent','gap','flexWrap'].forEach(function(p){ reviews.style[p] = ''; });
        var yotpo = reviews.querySelector('.yotpo-widget-instance, .shopify-app-block');
        if (yotpo) ['flex','minWidth','overflow'].forEach(function(p){ yotpo.style[p] = ''; });
      }
    }
    /* Mobile text shorten. Only applies on dtf-transfers / -by-size-v2;
       gate via body class so other products that share the badge
       markup aren't affected. */
    if (shouldRun() && window.innerWidth <= 1199) {
      var t = (badge.textContent || '').trim();
      if (t && t !== 'VIVID AF') {
        badge.textContent = 'VIVID AF';
        badge.style.fontSize = '10.8px';
        badge.style.lineHeight = '1.2';
      }
    }
    /* Reveal — CSS hides badge until this attribute is present. */
    badge.setAttribute('data-nt-vivid-ready', '1');
    window.__ntVividBadgeRepaired = true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', repair);
  } else {
    repair();
  }
})();

/* ─── Mobile-only: rebuild the .buyMoreSave row as a 3-col card grid
   ──────────────────────────────────────────────────────────────────
   Default markup is a single-line row with three text segments
   separated by pipes ("Buy More & Save Up To 50% | Fastest Delivery
   May. 27 order in 22h 47m | No Minimum, Setup or Art Fees"). The
   redesigned mobile layout is a three-column grid where each
   column shows: [icon] / [bold blue primary text] / [grey caption].
   Strategy:
     • Pull values from the existing DOM:
         - the buyMoreSave link href (column 1)
         - the live <fastest-deliver-placeholder> (column 2 — moved
           wholesale into the new structure so the countdown JS
           keeps updating its <strong>s in place)
     • Replace .buyMoreSave's innerHTML with the new 3-col grid,
       slotting the original placeholder into column 2.
     • Set data-nt-bms-v2="1" so theme.css releases its mobile
       pre-paint visibility:hidden guard. */
(function () {
  if (typeof window === 'undefined' || window.__ntBmsV2) return;
  /* Tier 1 (r79): always BUILD the bms-v2 wrapper regardless of
     viewport at load, then let CSS @media handle desktop vs mobile
     visibility. This way resizing the window from desktop to mobile
     immediately reveals the card grid — no JS re-run required. */
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  var BLUE = '#019AFF';
  function tagSvg() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="' + BLUE + '" aria-hidden="true">' +
      '<path d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.84z"/>' +
      '<circle cx="7.5" cy="7.5" r="1.5" fill="#fff"/>' +
    '</svg>';
  }
  /* Per design: column 2 (countdown) uses the same package box icon
     as the desktop delivery row, not a lightning bolt. */
  function boltSvg() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + BLUE + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' +
      '<polyline points="3.27 6.96 12 12.01 20.73 6.96"/>' +
      '<line x1="12" y1="22.08" x2="12" y2="12"/>' +
      '<path d="M16.5 9.4l-9-5.19"/>' +
    '</svg>';
  }
  function dollarSvg() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + BLUE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/>' +
      '<path d="M16 8.5c-.83-.83-2-1.5-4-1.5-2.5 0-4 1.12-4 2.5s1.5 2.5 4 2.5 4 1.12 4 2.5-1.5 2.5-4 2.5c-2 0-3.17-.67-4-1.5"/>' +
      '<line x1="12" y1="5" x2="12" y2="19"/>' +
    '</svg>';
  }
  function run() {
    if (window.__ntBmsV2) return;
    if (!shouldRun()) return;
    var bms = document.querySelector('.product-text .buyMoreSave');
    if (!bms) return;
    if (bms.getAttribute('data-nt-bms-v2') === '1') return;
    /* Pull source values from the ORIGINAL markup. We intentionally
       DON'T replace .buyMoreSave's innerHTML — that would disconnect
       the <fastest-deliver-placeholder> custom element which holds
       the live countdown logic. Instead we build a NEW wrapper next
       to it and hide the original via display:none. The original
       placeholder keeps ticking; we mirror its <strong> values into
       the new spans. */
    /* The original "Buy More & Save Up To 50%" isn't an <a> — it's a
       <div class="buyMoreSave__title openPriceCalculator"> with a
       JS click handler on the openPriceCalculator class. Reuse that
       class on our column-1 anchor so the same calculator pops. */
    var bmLink = bms.querySelector('a.lnkcolor, a');
    var bmHref = (bmLink && bmLink.getAttribute('href')) || 'javascript:void(0)';
    var ph = bms.querySelector('fastest-deliver-placeholder');
    /* Build the new 3-col grid as a fresh wrapper that becomes the
       sibling sitting BEFORE .buyMoreSave. */
    var wrap = document.createElement('div');
    wrap.className = 'nt-bms-v2-wrap';
    wrap.setAttribute('data-nt-bms-v2-wrap', '1');
    wrap.innerHTML =
      '<div class="nt-bms-v2" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-items:start;width:100%;">' +
        '<a class="nt-bms-v2__col openPriceCalculator" href="' + bmHref + '" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;text-decoration:none;color:inherit;cursor:pointer;">' +
          '<div class="nt-bms-v2__icon" style="margin-bottom:2px;pointer-events:none;">' + tagSvg() + '</div>' +
          '<div class="nt-bms-v2__primary" style="font-size:14px;font-weight:700;color:' + BLUE + ';line-height:1.2;font-family:Inter,sans-serif;pointer-events:none;">Up to 50% off</div>' +
          '<div class="nt-bms-v2__caption" style="font-size:11px;color:#6b7280;font-weight:400;font-family:Inter,sans-serif;pointer-events:none;">buy more →</div>' +
        '</a>' +
        '<div class="nt-bms-v2__col" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;">' +
          '<div class="nt-bms-v2__icon" style="margin-bottom:2px;">' + boltSvg() + '</div>' +
          '<div class="nt-bms-v2__primary" data-nt-cd style="font-size:14px;font-weight:700;color:' + BLUE + ';line-height:1.2;font-family:Inter,sans-serif;"></div>' +
          '<div class="nt-bms-v2__caption" style="font-size:11px;color:#6b7280;font-weight:400;font-family:Inter,sans-serif;">arrives <span data-nt-cd-date></span></div>' +
        '</div>' +
        '<div class="nt-bms-v2__col" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;">' +
          '<div class="nt-bms-v2__icon" style="margin-bottom:2px;">' + dollarSvg() + '</div>' +
          '<div class="nt-bms-v2__primary" style="font-size:14px;font-weight:700;color:' + BLUE + ';line-height:1.2;font-family:Inter,sans-serif;">$0 Fees</div>' +
          '<div class="nt-bms-v2__caption" style="font-size:11px;color:#6b7280;font-weight:400;font-family:Inter,sans-serif;">min · setup · art</div>' +
        '</div>' +
      '</div>';
    /* Insert the new wrapper BEFORE the original .buyMoreSave so we
       preserve the live countdown placeholder untouched. */
    bms.parentNode.insertBefore(wrap, bms);
    /* Sync the original placeholder's live <strong> values into the
       new column-2 spans. The original .buyMoreSave is hidden by
       theme.css (data-nt-bms-v2 release attribute on .buyMoreSave is
       still set, but we ALSO add display:none below to fully
       collapse it). */
    if (ph) {
      var cdEl = wrap.querySelector('[data-nt-cd]');
      var dateEl = wrap.querySelector('[data-nt-cd-date]');
      function syncCountdown() {
        var strongs = ph.querySelectorAll(':scope > strong');
        if (strongs[0] && dateEl) dateEl.textContent = strongs[0].textContent.trim();
        if (strongs[1] && cdEl)   cdEl.textContent   = strongs[1].textContent.trim();
      }
      syncCountdown();
      /* Re-sync on every mutation inside the live placeholder. */
      var mo2 = new MutationObserver(syncCountdown);
      mo2.observe(ph, { childList: true, characterData: true, subtree: true });
      setInterval(syncCountdown, 1000);
    }
    /* Tag the original .buyMoreSave AND the new wrapper. CSS @media
       queries control which one is visible per viewport — no inline
       display:none anymore so resizing between mobile and desktop
       updates the layout automatically without JS. */
    bms.setAttribute('data-nt-bms-v2', '1');
    window.__ntBmsV2 = true;
  }
  function init() {
    run();
    if (!window.__ntBmsV2) {
      var pt = document.querySelector('.product-text');
      if (pt) {
        var mo = new MutationObserver(function () {
          run();
          if (window.__ntBmsV2) mo.disconnect();
        });
        mo.observe(pt, { childList: true, subtree: true });
        setTimeout(function () { mo.disconnect(); }, 10000);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ─── Atomic reveal: release the <html> .nt-pdp-init hide gate ────
   layout/theme.liquid adds .nt-pdp-init to <html> sync in <head>
   so theme.css hides .product-text on these templates until our
   redesign IIFEs have done their work. We GATE the release on the
   SYNC transforms (info row + icons replacement) being done; Yotpo
   reveals independently via its own data-attribute gate. This
   ensures the user sees H1 + info row + new icons all paint in
   the same frame, not staggered. The 4s failsafe in theme.liquid
   is the backup so the page is never left hidden forever. */
(function () {
  function shouldRun() {
    var bc = (document.body && document.body.className) || '';
    return bc.indexOf('template-product-by-size-tabs') > -1 ||
           bc.indexOf('template-product-by-size-bg-options') > -1;
  }
  function release() {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('nt-pdp-init');
  }
  function isReady() {
    /* Tier-1 atomic reveal: wait for EVERY redesign IIFE that paints
       inside .product-text before lifting the hide. Yotpo widget
       reveals via its own data-nt-yotpo-ready gate, independent of
       this (it's async / third-party and can't block the main
       reveal — would mean blank screen for 1–2s otherwise). */
    var mobile = window.innerWidth <= 1199;
    /* Both viewports */
    if (!window.__ntInfoRowV2)        return false;
    if (!window.__ntIconsReplacedV2)  return false;
    if (!window.__ntVividBadgeRepaired) return false;
    if (!window.__ntDeliveryPolished) return false;
    /* Mobile-only IIFEs */
    if (mobile && !window.__ntSellingPointsShortened) return false;
    if (mobile && !window.__ntBmsV2)  return false;
    return true;
  }
  function tryRelease(deadline) {
    if (!shouldRun()) { release(); return; }
    if (isReady()) { release(); return; }
    /* Poll every 30ms up to the deadline. The 4s failsafe in
       theme.liquid is a longer backstop. */
    var iv = setInterval(function () {
      if (isReady() || Date.now() > deadline) {
        clearInterval(iv);
        release();
      }
    }, 30);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      Promise.resolve().then(function () {
        tryRelease(Date.now() + 1500);
      });
    });
  } else {
    Promise.resolve().then(function () {
      tryRelease(Date.now() + 1500);
    });
  }
})();

