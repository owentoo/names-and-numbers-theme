/* dtf-ai-history.js
   Local, browser-persisted history of this visitor's Ninja AI image generations.
   Items expire after 30 days. Used by the Create with AI tab inside
   dtf-upload-tabs.liquid AND the dtf-ai-modal modal — no backend, no
   cross-device sync.

   Flow:
     - A MutationObserver on #generative-ai-images (inside the native generative
       AI dialog) captures each <figure> the vendor script appends when a batch
       of images comes back. We pull the current #AISearchInput value for the
       prompt and record url / thumbnail / fileName / timestamp in localStorage.
     - On page load we render saved items as tiles under the hero. Each tile
       has a my-designs-style multi-select checkbox in the top-left corner.
     - Tile body click clones a matching <figure> back into #generative-ai-images
       and triggers click so the vendor's existing download-and-add-to-upload
       handler runs unchanged (single-image reuse).
     - Selecting one or more tiles via the checkbox shows a black floating
       "Order as DTF" bar that dispatches the standard `md-picker:use-designs`
       CustomEvent to route the chosen images into the multi-file upload
       pipeline (`multiFilesManageByURL`), the same bridge my-designs uses.
*/
(function () {
  'use strict';

  var STORAGE_KEY = 'dtfut:ai-history:v1';
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var MAX_ITEMS = 60;

  /* In-memory selection state. Tracks the *url* of each selected tile so
     selection survives re-renders (load() is the source of truth for items). */
  var selectedUrls = Object.create(null);
  var selectedCount = 0;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var cutoff = Date.now() - MAX_AGE_MS;
      return parsed.filter(function (item) {
        return item && item.ts && item.ts > cutoff && item.url && item.thumbnail;
      });
    } catch (_) {
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch (_) {}
  }

  function addItem(item) {
    var items = load().filter(function (i) { return i.url !== item.url; });
    items.unshift(item);
    save(items);
    render();
  }

  function removeItem(url) {
    save(load().filter(function (i) { return i.url !== url; }));
    if (selectedUrls[url]) {
      delete selectedUrls[url];
      selectedCount--;
      if (selectedCount < 0) selectedCount = 0;
    }
    render();
    updateSelectionBar();
  }

  function clearAll() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    clearSelection();
    render();
  }

  function clearSelection() {
    selectedUrls = Object.create(null);
    selectedCount = 0;
    updateSelectionBar();
  }

  function toggleSelection(url) {
    if (selectedUrls[url]) {
      delete selectedUrls[url];
      selectedCount--;
    } else {
      /* Enforce the per-product selection cap. Most products allow unlimited
         multi-select; vinyl stickers cap at 1 (each sticker order is a single
         design). When the cap is hit, adding a new url replaces the existing
         selection rather than rejecting the new one — this matches the user
         expectation that clicking another tile "moves" the selection. */
      var max = getMaxSelectCount();
      if (selectedCount >= max) {
        selectedUrls = Object.create(null);
        selectedCount = 0;
      }
      selectedUrls[url] = true;
      selectedCount++;
    }
    if (selectedCount < 0) selectedCount = 0;
  }

  var container = null;
  var grid = null;
  var scroller = null;
  var leftArrow = null;
  var rightArrow = null;

  /* No-op: tile + selection-bar styling now lives in ai-create.css (single
     source of truth across all 4 surfaces). The legacy css strings below are
     left for reference only — the early return prevents anything from being
     injected. Removing them entirely is a future cleanup. */
  function injectStyles() {
    return;
    if (document.getElementById('dtfut-ai-history-styles')) return;
    var css = [
      '.ai-chat-history-tile { position: relative; }',
      '.ai-chat-history-tile-select {',
      '  position: absolute; top: 8px; left: 8px; z-index: 4;',
      '  width: 22px; height: 22px;',
      '  border: 1.5px solid #cbd5e1; border-radius: 6px;',
      '  background: rgba(255,255,255,0.96);',
      '  cursor: pointer;',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  transition: all 0.15s;',
      '  box-shadow: 0 1px 3px rgba(15,23,42,0.08);',
      '  padding: 0;',
      '}',
      '.ai-chat-history-tile-select:hover { border-color: #019aff; }',
      '.ai-chat-history-tile-select svg { width: 13px; height: 13px; stroke: #fff; opacity: 0; transition: opacity 0.15s; }',
      '.ai-chat-history-tile-select.is-selected { border-color: #019aff; background: #019aff; }',
      '.ai-chat-history-tile-select.is-selected svg { opacity: 1; }',
      '.ai-chat-history-tile.is-selected { border-color: #019aff !important; box-shadow: 0 0 0 2px rgba(1,154,255,0.18), 0 12px 24px rgba(1,154,255,0.12); }',
      /* Floating selection bar — pinned to the bottom of the viewport
         (tabs context) or to the bottom of the modal panel (modal context).
         The --in-modal modifier overrides position/z-index so it sits inside
         the modal panel and is clipped to it. */
      '.ai-chat-history-selection-bar {',
      '  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(20px);',
      '  z-index: 100050;',
      '  background: #111827; color: #fff;',
      '  border-radius: 999px;',
      '  display: flex; align-items: center; gap: 14px;',
      '  padding: 10px 12px 10px 22px;',
      '  box-shadow: 0 18px 40px rgba(15,23,42,0.35), 0 4px 12px rgba(15,23,42,0.25);',
      '  font: 600 14px/1.2 inherit;',
      '  opacity: 0; pointer-events: none;',
      '  transition: opacity 0.2s ease, transform 0.2s ease;',
      '  max-width: calc(100vw - 32px);',
      '}',
      '.ai-chat-history-selection-bar.is-visible { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }',
      /* Force horizontal layout — defends against theme-level word-break /
         overflow-wrap rules that would otherwise squeeze the middle child
         (Deselect all) to a single-letter-wide column on narrow viewports. */
      '.ai-chat-history-selection-bar { flex-wrap: nowrap; }',
      /* In-modal: the bar lives inside .dtf-ai-modal__panel which is
         position:relative + overflow:hidden, so absolute bottom 16px keeps
         it pinned to the modal panel\'s bottom edge regardless of the inner
         scroll position. */
      '.ai-chat-history-selection-bar--in-modal {',
      '  position: absolute; bottom: 16px;',
      '  z-index: 6;',
      '  max-width: calc(100% - 24px);',
      '}',
      '.ai-chat-history-selection-bar__count {',
      '  font-weight: 700;',
      '  white-space: nowrap;',
      '  flex-shrink: 0;',
      '  word-break: keep-all;',
      '  overflow-wrap: normal;',
      '}',
      '.ai-chat-history-selection-bar__clear {',
      '  background: transparent; color: #cbd5e1; border: none;',
      '  font: 600 13px/1.2 inherit; cursor: pointer; padding: 6px 4px;',
      '  text-decoration: underline; text-underline-offset: 2px;',
      '  transition: color 0.15s;',
      '  white-space: nowrap;',
      '  flex-shrink: 0;',
      '  word-break: keep-all;',
      '  overflow-wrap: normal;',
      '}',
      '.ai-chat-history-selection-bar__clear:hover { color: #fff; }',
      '.ai-chat-history-selection-bar__cta {',
      '  background: #019aff; color: #fff; border: none;',
      '  border-radius: 999px; padding: 9px 18px;',
      '  font: 700 14px/1.2 inherit; cursor: pointer;',
      '  display: inline-flex; align-items: center; gap: 8px;',
      '  transition: background 0.15s, transform 0.15s;',
      '  white-space: nowrap;',
      '  flex-shrink: 0;',
      '  word-break: keep-all;',
      '  overflow-wrap: normal;',
      '}',
      '.ai-chat-history-selection-bar__cta:hover { background: #0079cc; }',
      '.ai-chat-history-selection-bar__cta:active { transform: scale(0.97); }',
      '.ai-chat-history-selection-bar__cta svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }',
      '@media (max-width: 600px) {',
      '  .ai-chat-history-selection-bar { gap: 8px; padding: 8px 10px 8px 14px; font-size: 13px; }',
      '  .ai-chat-history-selection-bar__clear { padding: 4px 2px; font-size: 12px; }',
      '  .ai-chat-history-selection-bar__cta { padding: 8px 14px; font-size: 13px; gap: 6px; }',
      '  .ai-chat-history-selection-bar__cta svg { width: 14px; height: 14px; }',
      '}',
      '@media (max-width: 380px) {',
      /* Ultra-narrow screens: hide the Deselect all link so the bar still
         fits without overflowing the modal panel. Tap-to-deselect a tile
         (or Clear all in the history head) remains available. */
      '  .ai-chat-history-selection-bar__clear { display: none; }',
      '  .ai-chat-history-selection-bar { gap: 12px; }',
      '}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'dtfut-ai-history-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function render() {
    if (!container || !grid) return;
    var items = load();
    if (!items.length) {
      container.hidden = true;
      grid.innerHTML = '';
      /* Drop selection of any items that no longer exist. */
      var hadSelection = selectedCount > 0;
      if (hadSelection) clearSelection();
      return;
    }
    container.hidden = false;

    /* Prune selection of any urls that no longer exist (e.g. expired). */
    var validUrls = Object.create(null);
    items.forEach(function (i) { validUrls[i.url] = true; });
    Object.keys(selectedUrls).forEach(function (u) {
      if (!validUrls[u]) {
        delete selectedUrls[u];
        selectedCount--;
      }
    });
    if (selectedCount < 0) selectedCount = 0;

    var frag = document.createDocumentFragment();
    items.forEach(function (item) {
      var isSelected = !!selectedUrls[item.url];

      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'ai-chat-history-tile' + (isSelected ? ' is-selected' : '');
      tile.title = item.prompt || 'Reuse this AI image';
      tile.dataset.url = item.url;

      var img = document.createElement('img');
      img.src = item.thumbnail;
      img.alt = item.prompt || '';
      img.loading = 'lazy';
      /* If the thumbnail 404s (server-side cleanup, etc) we drop the entry
         quietly so users don't stare at broken tiles. */
      img.addEventListener('error', function () { removeItem(item.url); });

      /* Multi-select checkbox — mirrors .md-card__select from my-designs.
         Always rendered. Per-product caps (e.g. vinyl stickers max 1)
         are enforced inside toggleSelection() so that selecting a new
         tile when at the cap replaces the existing selection. That keeps
         the UI affordance (a visible checkbox on every tile) consistent
         across products even when only one design can ship in an order. */
      var select = document.createElement('button');
      select.type = 'button';
      select.className = 'ai-chat-history-tile-select' + (isSelected ? ' is-selected' : '');
      select.setAttribute('aria-label', isSelected ? 'Deselect AI image' : 'Select AI image');
      select.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      select.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8 6.5 11 12.5 5"></polyline></svg>';
      select.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        toggleSelection(item.url);
        /* When the cap is 1, toggleSelection may have cleared a sibling
           tile's selection — re-render the whole grid so its is-selected
           classes update. Otherwise just update this tile in place to
           avoid scroll-jumping the strip. */
        if (getMaxSelectCount() === 1) {
          render();
        } else {
          var nowSelected = !!selectedUrls[item.url];
          select.classList.toggle('is-selected', nowSelected);
          select.setAttribute('aria-pressed', nowSelected ? 'true' : 'false');
          select.setAttribute('aria-label', nowSelected ? 'Deselect AI image' : 'Select AI image');
          tile.classList.toggle('is-selected', nowSelected);
        }
        updateSelectionBar();
      });

      var remove = document.createElement('span');
      remove.className = 'ai-chat-history-tile-remove';
      remove.setAttribute('role', 'button');
      remove.setAttribute('aria-label', 'Remove from history');
      remove.textContent = '\u00D7';
      remove.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        removeItem(item.url);
      });

      tile.appendChild(img);
      tile.appendChild(select);
      tile.appendChild(remove);

      if (item.prompt) {
        var caption = document.createElement('span');
        caption.className = 'ai-chat-history-tile-caption';
        caption.textContent = item.prompt;
        tile.appendChild(caption);
      }

      tile.addEventListener('click', function () {
        /* If anything is currently selected, treat the whole grid as selection
           mode and toggle this tile instead of single-image reuse — this
           matches my-designs's behaviour where the thumb is a selection
           target once you've started selecting. The per-product cap is
           enforced inside toggleSelection() (vinyl stickers replace the
           existing selection rather than accumulating). */
        if (selectedCount > 0) {
          toggleSelection(item.url);
          render();
          updateSelectionBar();
          return;
        }
        reuseItem(item);
      });
      frag.appendChild(tile);
    });
    grid.innerHTML = '';
    grid.appendChild(frag);

    updateSelectionBar();
    /* Defer to next frame so flex layout has settled before we measure
       scrollWidth for arrow visibility. We also re-check at 60ms and 240ms
       to catch late layout shifts (modal open transitions, font swaps,
       image decode triggering aspect-ratio reflow). updateArrows is
       idempotent so extra calls are cheap. */
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(updateArrows);
    } else {
      updateArrows();
    }
    setTimeout(updateArrows, 60);
    setTimeout(updateArrows, 240);
  }

  function reuseItem(item) {
    /* Re-use the vendor's existing figure-click handler: clone a figure into
       #generative-ai-images with the original url/fileName dataset, then click
       it. The delegated jQuery handler in generative-ai-image-modal.js downloads
       the image and feeds it into manageFiles()/uploadFile() unchanged. */
    var aiImages = document.getElementById('generative-ai-images');
    if (!aiImages) return;
    var figure = document.createElement('figure');
    figure.dataset.fileName = item.fileName || 'ai-image.png';
    figure.dataset.url = item.url;
    figure.style.display = 'none';
    var img = document.createElement('img');
    img.src = item.thumbnail;
    figure.appendChild(img);
    aiImages.appendChild(figure);
    if (window.jQuery) {
      window.jQuery(figure).trigger('click');
    } else {
      figure.click();
    }
  }

  /* ---------- Horizontal scroller arrows ---------- */

  /* Wrap the grid in a .ai-chat-history-scroller div and add left/right
     arrow buttons + edge fade gradients. The grid itself is the actual
     scroll container; the wrapper hosts the absolutely-positioned arrows. */
  function setupScroller() {
    if (!grid || scroller) return;
    var parent = grid.parentNode;
    if (!parent) return;
    scroller = document.createElement('div');
    scroller.className = 'ai-chat-history-scroller';
    parent.insertBefore(scroller, grid);
    scroller.appendChild(grid);

    leftArrow = makeArrow('left');
    rightArrow = makeArrow('right');
    /* Belt-and-suspenders: arrows default to opacity:0 in CSS, but if some
       earlier paint set is-visible we want a clean slate before the first
       updateArrows() call so they never flash on at zero scroll. */
    leftArrow.classList.remove('is-visible');
    rightArrow.classList.remove('is-visible');
    scroller.appendChild(leftArrow);
    scroller.appendChild(rightArrow);

    leftArrow.addEventListener('click', function (e) {
      e.preventDefault();
      scrollByAmount(-1);
    });
    rightArrow.addEventListener('click', function (e) {
      e.preventDefault();
      scrollByAmount(1);
    });
    grid.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    /* When the modal opens (or the panel becomes visible), the grid gains
       a real width — ResizeObserver catches that so the arrows update
       without us having to hook into the modal driver. */
    if (typeof window.ResizeObserver === 'function') {
      var ro = new window.ResizeObserver(updateArrows);
      ro.observe(grid);
    }
  }

  function makeArrow(dir) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-chat-history-arrow ai-chat-history-arrow--' + dir;
    btn.setAttribute('aria-label', dir === 'left' ? 'Scroll left' : 'Scroll right');
    /* Chevron pointing in the scroll direction. */
    var path = dir === 'left'
      ? '<polyline points="15 6 9 12 15 18"></polyline>'
      : '<polyline points="9 6 15 12 9 18"></polyline>';
    btn.innerHTML = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
    return btn;
  }

  function scrollByAmount(direction) {
    if (!grid) return;
    var amount = Math.max(160, grid.clientWidth * 0.8);
    if (typeof grid.scrollBy === 'function') {
      grid.scrollBy({ left: direction * amount, behavior: 'smooth' });
    } else {
      grid.scrollLeft += direction * amount;
    }
  }

  function updateArrows() {
    if (!grid || !scroller || !leftArrow || !rightArrow) return;
    /* Use a generous tolerance so sub-pixel scrollLeft from scroll-snap
       rounding, fractional zoom levels, and resize transitions don't make
       arrows flicker on at the very edges. If the grid can't scroll at all
       (max <= tolerance) we treat it as no overflow and hide both arrows. */
    var TOL = 4;
    var max = grid.scrollWidth - grid.clientWidth;
    var overflows = max > TOL;
    var atStart = !overflows || grid.scrollLeft <= TOL;
    var atEnd = !overflows || grid.scrollLeft >= max - TOL;
    var showLeft = overflows && !atStart;
    var showRight = overflows && !atEnd;
    leftArrow.classList.toggle('is-visible', showLeft);
    rightArrow.classList.toggle('is-visible', showRight);
    /* Edge fade gradients are gated on these classes too. */
    scroller.classList.toggle('is-scrolled-start', showLeft);
    scroller.classList.toggle('is-scrolled-end', showRight);
  }

  /* ---------- Selection bar ---------- */

  var bar = null;
  var barCountEl = null;
  var barCtaEl = null;
  /* When the bar is mounted inside the modal panel, we also toggle a class
     on the scrollable inner so it gets extra bottom padding while the bar
     is visible — keeps the bar from covering the last row of tiles. */
  var modalInnerForBar = null;

  /* Pick the right "Order as ..." CTA label based on the current product
     context.
       - UV DTF product pages (handle starts with `uv-dtf`) read
         "Order as UV DTF" — checked first so /products/uv-dtf-stickers-*
         doesn't fall into the sticker branch.
       - Sticker-family pages (vinyl-stickers, bumper-stickers,
         truck-stickers, indoor-/outdoor-floor-graphics,
         low-tac-wall-graphics, custom-stickers, window-clings,
         custom-magnets, custom-soft-vinyl-keychains, etc.) read the
         product title from the page heading, drop the marketing
         "Custom " prefix, and singularize
         "Stickers"/"Graphics"/"Decals"/"Clings"/"Magnets"/"Keychains"
         so the bar reads "Order as Bumper Sticker", "Order as Indoor
         Floor Graphic", "Order as Window Cling", "Order as Magnet",
         "Order as Soft Vinyl Keychain" — naturally derived from the
         live product name with no per-product hardcoding required.
       - Default everywhere else (regular DTF product pages, the
         standalone /pages/ai-image-creator page) is "Order as DTF". */
  function getOrderAsLabel() {
    try {
      var p = (window.location && window.location.pathname) || '';
      if (/\/products\/uv-dtf/i.test(p)) return 'Order as UV DTF';
      if (/\/products\/[^/]*(sticker|graphic|decal|cling|magnet|keychain)/i.test(p)) {
        var label = readStickerProductLabel();
        if (label) return 'Order as ' + label;
        /* If the h1 isn't on the page for some reason, keep the
           previous hardcoded vinyl-sticker label so we never
           regress to a generic "Order as DTF" on that one page. */
        if (/\/products\/vinyl-stickers/i.test(p)) return 'Order as Vinyl Sticker';
      }
    } catch (e) { /* defensive — fall through to default */ }
    return 'Order as DTF';
  }

  /* Pull the visible product title out of the product page heading and
     normalize it for the selection-bar CTA. The Liquid template renders
     `{{ product.title }}{{ b.addBadge }}` directly into the h1, so the
     element can have a sibling badge node tacked on after the title text
     — we read the leading text node specifically to avoid leaking badge
     copy ("New!", "Sale!") into the CTA. Returns '' if nothing usable. */
  function readStickerProductLabel() {
    var titleEl = document.querySelector('h1.product__title')
                || document.querySelector('[data-product-title]')
                || document.querySelector('h1');
    if (!titleEl) return '';
    var raw = '';
    var firstText = titleEl.firstChild;
    if (firstText && firstText.nodeType === 3 /* TEXT_NODE */) {
      raw = firstText.nodeValue || '';
    }
    if (!raw.trim()) raw = titleEl.textContent || '';
    raw = raw.trim()
      .replace(/^Custom\s+/i, '')
      .replace(/\bStickers\b/gi, 'Sticker')
      .replace(/\bGraphics\b/gi, 'Graphic')
      .replace(/\bDecals\b/gi, 'Decal')
      .replace(/\bClings\b/gi, 'Cling')
      .replace(/\bMagnets\b/gi, 'Magnet')
      .replace(/\bKeychains\b/gi, 'Keychain')
      .replace(/\s+/g, ' ')
      .trim();
    return raw;
  }

  /* Per-product selection cap. Most products allow unlimited multi-select
     (return Infinity). Vinyl stickers cap at 1 because each order is a
     single sheet of one design — the checkbox is still shown on every
     tile, but selecting a new tile while one is already selected
     replaces the previous selection (enforced in toggleSelection). */
  function getMaxSelectCount() {
    try {
      var p = (window.location && window.location.pathname) || '';
      if (/\/products\/vinyl-stickers/i.test(p)) return 1;
    } catch (e) { /* defensive — fall through to default */ }
    return Infinity;
  }

  function ensureSelectionBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'ai-chat-history-selection-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'AI image selection actions');

    barCountEl = document.createElement('span');
    barCountEl.className = 'ai-chat-history-selection-bar__count';
    barCountEl.textContent = '0 selected';

    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'ai-chat-history-selection-bar__clear';
    clearBtn.textContent = 'Deselect all';
    clearBtn.addEventListener('click', function () {
      clearSelection();
      render();
    });

    barCtaEl = document.createElement('button');
    barCtaEl.type = 'button';
    barCtaEl.className = 'ai-chat-history-selection-bar__cta';
    barCtaEl.innerHTML = '<span>' + getOrderAsLabel() + '</span><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>';
    barCtaEl.addEventListener('click', orderSelectedAsDtf);

    bar.appendChild(barCountEl);
    bar.appendChild(clearBtn);
    bar.appendChild(barCtaEl);

    /* If we're inside the modal context, mount the bar inside the modal
       panel so it floats over the modal\'s contents (matching the mockup)
       instead of sitting at the bottom of the viewport — where on shorter
       modals it ends up below the visible panel area. */
    var modalPanel = container && container.closest
      ? container.closest('.dtf-ai-modal__panel')
      : null;
    if (modalPanel) {
      bar.classList.add('ai-chat-history-selection-bar--in-modal');
      modalPanel.appendChild(bar);
      modalInnerForBar = modalPanel.querySelector('.dtf-ai-modal__inner');
    } else {
      document.body.appendChild(bar);
    }
    return bar;
  }

  function updateSelectionBar() {
    if (selectedCount <= 0) {
      if (bar) bar.classList.remove('is-visible');
      if (modalInnerForBar) modalInnerForBar.classList.remove('dtf-ai-modal__inner--has-selection-bar');
      return;
    }
    ensureSelectionBar();
    barCountEl.textContent = selectedCount === 1 ? '1 selected' : selectedCount + ' selected';
    bar.classList.add('is-visible');
    if (modalInnerForBar) modalInnerForBar.classList.add('dtf-ai-modal__inner--has-selection-bar');
  }

  function getSelectedItems() {
    var items = load();
    var out = [];
    items.forEach(function (i) {
      if (selectedUrls[i.url]) out.push(i);
    });
    return out;
  }

  function closeAiModalIfOpen() {
    /* Close the dtf-ai-modal shell if the selection was made from inside it,
       so the user lands back on the product page where the upload pipeline
       handles the rest. The modal driver also listens for ESC etc. but
       dispatching md-picker:use-designs from here is the cleanest signal
       we're done. */
    var modal = document.getElementById('dtf-ai-modal');
    if (modal && !modal.hasAttribute('hidden')) {
      modal.setAttribute('hidden', '');
    }
    if (document.body) {
      document.body.classList.remove('dtf-ai-modal-open');
    }
  }

  function orderSelectedAsDtf() {
    var items = getSelectedItems();
    if (!items.length) return;
    var payload = items.map(function (i) {
      return {
        file: i.url,
        fileName: i.fileName || 'ai-image.png',
        id: 'ai-' + (i.ts || Date.now())
      };
    });
    /* Match my-designs: dispatch from the closest container so it bubbles up
       through the document. The bridge listeners in product-page-popups.liquid
       and product-page-popups-multiupload.liquid both bind on document. */
    var src = container || document;
    src.dispatchEvent(new CustomEvent('md-picker:use-designs', {
      bubbles: true,
      detail: { items: payload }
    }));
    /* Clear selection + close the modal so the upload UI is the only thing
       on screen. The bridge handles the actual upload. */
    clearSelection();
    closeAiModalIfOpen();
    render();
  }

  /* ---------- MutationObserver ---------- */

  function startObserver() {
    var target = document.getElementById('generative-ai-images');
    if (!target) {
      setTimeout(startObserver, 600);
      return;
    }
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1 || node.tagName !== 'FIGURE') return;
          var url = node.dataset.url;
          var fileName = node.dataset.fileName;
          var imgEl = node.querySelector('img');
          var thumbnail = imgEl ? imgEl.src : '';
          if (!url || !thumbnail) return;
          /* Skip figures we injected via reuseItem — they're hidden. */
          if (node.style && node.style.display === 'none') return;
          var promptEl = document.getElementById('AISearchInput');
          var prompt = (promptEl && promptEl.value && promptEl.value.trim()) || '';
          addItem({
            url: url,
            thumbnail: thumbnail,
            fileName: fileName || '',
            prompt: prompt,
            ts: Date.now()
          });
        });
      });
    });
    obs.observe(target, { childList: true });
  }

  function init() {
    container = document.querySelector('[data-dtfut-ai-history]');
    grid = document.querySelector('[data-dtfut-ai-history-grid]');
    if (!container || !grid) return;
    injectStyles();
    setupScroller();
    var clearBtn = document.querySelector('[data-dtfut-ai-history-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (window.confirm('Remove all saved AI creations?')) clearAll();
      });
    }
    render();
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
