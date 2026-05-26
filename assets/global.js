//#########  Set Reset Cookie value  ##########
function getCook(cookiename) {
	var cookiestring = RegExp("" + cookiename + "[^;]+").exec(document.cookie);
	return decodeURIComponent(!!cookiestring ? cookiestring.toString().replace(/^[^=]+./, "") : "");
}

function setCookie(name, value, days) {
  let expires = "";

  if (typeof days === "number" && days > 0) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  } else if (days === "session") {
    expires = "";
  } else {
    console.warn("Invalid 'days' parameter. Use a number for days or 'session' for session-based cookies.");
  }
  document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=None; Secure; domain=${window.location.hostname};`;
}


function findObjectByKey(array, key, value, multiple) {
  try {
    let rtn = [];
    for (var i = 0; i < array.length; i++) {
      if (array[i][key] === value) {
        if ( multiple ) {
          rtn.push( array[i] );
        } else {
          return array[i];
        }
      }
    }
    if ( multiple && rtn.length > 0 ) {
      return rtn;
    } else {
      return null;
    }
  }
  catch ( err ) {
    console.log( `ERROR findObjectByKey`, err.message );
  }
}

function ElementAvailibility ( selectorIs, functionName, timer, args='' ) {
  try {
    var divCheckingInterval                   =   setInterval( function() {
      if ( document.querySelector( selectorIs ) ) {
        clearInterval( divCheckingInterval );
        if ( typeof functionName !== 'undefined' && functionName ) {
          window[functionName]( args ? args : '' );
        }
        return true;
      }
    }, timer != '' ? timer : 250);
    return false;
  } catch ( err ) {
    console.log( `ERROR checkingElement`, err.message );
  }
}

function getParam( paramIs ) {
  try {
    const url = location.href;
    const objURL = new URL(url);
    const c = objURL.searchParams.get( paramIs );
    return c;
  }
  catch ( err ) {
    console.log ( 'ERROR getParam', err.message );
  }
}


function cartStickyFunc() {
  setTimeout(function(){
    if($(window).outerHeight() > 600){
      $("#site-cart-sidebar").addClass("enable_cart_sticky");
    }else{
      $("#site-cart-sidebar").removeClass("enable_cart_sticky");
    }
  })
}

$(function () {
  cartStickyFunc();
  $(window).resize(function(){
    cartStickyFunc();
  });
  
  if($(".order-tab").length){
    $(".order-tab").click(function() {
      var _index = $(this).index();
      $(".order-tab").removeClass("active");
      $(".orderlist_block").addClass("nodisplay");
      $(".order-tab").eq(_index).addClass("active");
      $(".orderlist_block").eq(_index).removeClass("nodisplay");
    })
  }
})

async function getRequest( url ) {
  try {
    let productObject;
    await fetch( url )
    .then(response => response.json())
    .then(data => {
      productObject               =   data;
    });
    return productObject;
  }
  catch ( err ) {
    console.log ( 'Error getRequest', err.message );
  }
}

document.addEventListener("DOMContentLoaded", function() {
    const popupOverlay = document.querySelector('.popup-overlay');
    const closeButton = document.querySelector('.close-button');
    if (closeButton){
      closeButton.addEventListener('click', function() {
          popupOverlay.classList.add('popup-overlay-hidden')
      });
    }
});

var addDelay = ms => new Promise(res => setTimeout(res, ms));

function toast( title, msg, color='green', timer=5000 ) {
  try {
    $( `.toast` ).remove();
    $( `body` )
      .append( `
        <div class="toast ${ color }">
          <div class="toast-content">
            <svg class="fas fa-solid fa-check check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 22l-10-10.598 2.798-2.859 7.149 7.473 13.144-14.016 2.909 2.806z"/></svg>
              <div class="message">
              <span class="text text-1">${ title }</span>
              <span class="text text-2">${ msg }</span>
            </div>
          </div>
          <svg class="fa-solid fa-xmark close" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18" stroke="#000" stroke-linecap="round"></path><path d="M18 6L6.00001 18" stroke="#000" stroke-linecap="round"></path></svg>

          <div class="progress active"></div>
        </div>
        ` );

        setTimeout(() => {
          $( `.toast` ).addClass( `active` );
        }, 50);

    setTimeout(() => {
      $( `.toast` ).removeClass( `active` );
    }, timer);
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function createThumbnail(imageUrl, thumbnailWidth, callback) {
  const img = new Image();
  img.crossOrigin = 'Anonymous'; // This is important for cross-origin images
  img.onload = function() {
    const aspectRatio = img.height / img.width;
    const thumbnailHeight = thumbnailWidth * aspectRatio;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set the canvas dimensions to the thumbnail size
    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;

    // Draw the image onto the canvas, scaling it to fit the thumbnail dimensions
    ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);

    // Get the data URL of the thumbnail image
    const thumbnailUrl = canvas.toDataURL('image/png');

    // Call the callback function with the thumbnail URL
    callback(thumbnailUrl);
  };
  img.src = imageUrl;
}

// gtag file_upload function triggered

/*
document.addEventListener("DOMContentLoaded", () => {
    const dropZoneElement = document.querySelector("#dropZoon");
    if (dropZoneElement) {
        dropZoneElement.addEventListener("click", () => {
            if (typeof gtag === 'function') {
                gtag('event', 'file_upload', {
                    event_category: 'User Actions',
                });
                console.log("GA event 'file_upload' triggered.");
            } else {
                console.error("gtag is not defined. Google Analytics is not set up.");
            }
            if (window.dataLayer && Array.isArray(window.dataLayer)) {
                // console.log("Current dataLayer entries:");
                window.dataLayer.forEach(item => {
                    // console.log(item);
                });
                // console.log("Last dataLayer entry:", window.dataLayer[window.dataLayer.length - 1]);
            }
        });
    }
});
*/

$(function () {
  $(".openmodalbox").click(function () {
    var _tnode = $(this).attr("data-target");
    $(_tnode).show();
  })
  
  $(".focuselement").click(function(){
      var target = $(this).data("tnode");
    console.log("target: ",target)
      if ($(target).length) {
          $('html, body').animate({
              scrollTop: $(target).offset().top
          }, 500);
      }
  });
  
  $(document).on(`click`, `.customTabelPopup__close`, function( e ) {
    try {
      e.stopImmediatePropagation();
      $(this).parents(".customTabelPopup__overlay").fadeOut();
    } catch ( err ) {
      console.log( `ERROR .customTabelPopup__close`, err.message );
    }
  })

  /* Drives the loading spinner overlay on .cart-preview while the
     full-size design image downloads. Toggles an `is-loading` class on
     the modal — CSS provides the spinner ::after pseudo + dims the
     img-container. Uses a detached `new Image()` preloader because it
     shares the HTTP cache with the visible <img>, fires onload when
     bytes are ready, and lets us bail safely on errors / 10s timeout. */
  function ntStartPreviewLoading($modal, src) {
    if (!$modal || !$modal.length || !src) return;
    $modal.addClass('is-loading');
    var safety = setTimeout(function () { $modal.removeClass('is-loading'); }, 10000);
    var preloader = new Image();
    preloader.onload = function () { clearTimeout(safety); $modal.removeClass('is-loading'); };
    preloader.onerror = function () { clearTimeout(safety); $modal.removeClass('is-loading'); };
    preloader.src = src;
    if (preloader.complete) { clearTimeout(safety); $modal.removeClass('is-loading'); }
  }
  window.ntStartPreviewLoading = ntStartPreviewLoading;

  $(document).on(`click`, `.preview-modal:not(.cartPropertyImg)`,function () {
    var _tnode = $(this).attr("data-target");
    var _previmg = $(this).attr("data-src");
    var bgtype = $(this).attr("data-bgtype");
    $(_tnode).removeClass("prv")
    /* Reset to spacer before swapping in the new src — see
       .cartPropertyImg handler below for rationale. */
    var $previewImg = $(_tnode).find(".previewimg");
    var spacerSrc = $previewImg.attr("data-spacer-src") || "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/spacer.gif?v=1740766267";
    if (!$previewImg.attr("data-spacer-src")) $previewImg.attr("data-spacer-src", spacerSrc);
    $previewImg.attr("src", spacerSrc);
    void $previewImg[0].offsetHeight;
    $previewImg.attr("src", _previmg);
    if(bgtype == "yes"){
      $(_tnode).addClass("prv");
    }
    if(_previmg != ""){
      $(_tnode).show();
      ntStartPreviewLoading($(_tnode), _previmg);
    }
  })
  .on(`click`, `.preview-modal.cartPropertyImg`, function( e ) {
    try {
      e.stopImmediatePropagation();
      const getTarget = $( this ).attr( `data-target` );
      let parentEle = $( this ).closest( `.cart-form-item` );
      if ( parentEle.length == 0 ) {
        parentEle = $( this ).closest( `.cart-item` );
      }
      let getImg = parentEle.find( `.preview-modal img` ).attr( `src` );
      if ( typeof getImg !== 'undefined' && getImg ) {
        const urlObj = new URL( getImg );
        urlObj.searchParams.delete( 'w' );
        urlObj.searchParams.delete( 'h' );
        /* Use URL API to set w=2000 — this handles URLs with OR
           without an existing query string correctly. Previously
           used `${getImg}&w=2000` which produced `.../design.png&w=2000`
           (no ?) for raw URLs, breaking the preview load for
           gang-sheet items added before the upstream fix. */
        urlObj.searchParams.set( 'w', '2000' );
        $( this ).attr( `data-src`, urlObj.toString() );
      }

      var _tnode = $( this ).attr( `data-target` );
      var _previmg = $( this ).attr( `data-src` );
      if ( _previmg ) {
        try {
          const _u = new URL( _previmg );
          _u.searchParams.delete( 'h' );
          _u.searchParams.delete( 'w' );
          _u.searchParams.set( 'w', '2000' );
          _previmg = _u.toString();
        } catch (_) {}
      }
      var bgtype = $( this ).attr( `data-bgtype` );
      $( _tnode ).removeClass( `prv` )
      /* Reset .previewimg to the spacer placeholder BEFORE swapping in
         the new src. Without this, when the customer closes one item's
         preview and immediately opens another, the modal momentarily
         shows the PREVIOUS item's cached image (since the new image
         hasn't downloaded yet and the <img> still has the old src).
         Setting src to the spacer first clears the visible bitmap,
         then assigning the new URL kicks off the fresh download. */
      var $previewImg = $( _tnode ).find( `.previewimg` );
      var spacerSrc = $previewImg.attr( 'data-spacer-src' ) || 'https://cdn.shopify.com/s/files/1/0558/0265/8899/files/spacer.gif?v=1740766267';
      if (!$previewImg.attr( 'data-spacer-src' )) $previewImg.attr( 'data-spacer-src', spacerSrc );
      $previewImg.attr( `src`, spacerSrc );
      /* Force a reflow so the browser flushes the spacer paint before
         we swap to the new URL — without this Chrome batches both src
         changes into one network request and still shows the old
         image briefly. */
      void $previewImg[0].offsetHeight;
      $previewImg.attr( `src`, _previmg );
      if ( bgtype == `yes` ) {
        $( _tnode ).addClass( `prv` );
      }
      if ( _previmg != `` ) {
        $( _tnode ).show();
        ntStartPreviewLoading( $( _tnode ), _previmg );
      }
    } catch ( err ) {
      console.log( `ERROR .preview-modal.cartPropertyImg`, err.message );
    }
  });
  $('.hide_overlay').on('click', function(e) {
      if (!$(e.target).closest('.customTabelPopup').length) {
          $('.customTabelPopup__overlay').hide();
      }
  });
})

$( document )
.mouseup(function( e ) {
  try {
    const container		=		$( `#site-cart-sidebar` );
    if ( !container.is( e.target ) && container.has( e.target ).length === 0 ) {
      const cartStatus = container.hasClass( `sidebar--opened` );
      if ( cartStatus ) {
        container.find( `.sidebar__header .sidebar__close` ).click();
      }
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
});
document.addEventListener('DOMContentLoaded', function () {
  const frames = document.querySelectorAll('.scroll-pinned-frame');
  const triggerOffset = window.innerHeight * 0.3;

  function updateActiveFrame() {
    frames.forEach((frame, index) => {
      const rect = frame.getBoundingClientRect();
      if (rect.top <= triggerOffset && rect.bottom >= triggerOffset) {
        frame.classList.add('active');
      } else {
        frame.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveFrame);
  updateActiveFrame();

  $(".nav-transfer-cta").click(function(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    $(".grt-c-submenu-drawer").toggleClass("grt-c-active");
  })

});

function globalModal( modalContent, modalWidth = 650 ) {
  try {
    const modalHTML = `
      <div class="globalModal active">
        <div class="globalModal_overlay" onclick="$(this).closest('.globalModal').remove();"></div>
        <div class="globalModal_content setWidth_${ modalWidth }">
          <div class="globalModal_close" onclick="$(this).closest('.globalModal').remove();">&times;</div>

          ${ modalContent }
        </div>
      </div>
    `;
    $( `body` ).append( modalHTML );
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function getMatchingVariantBySqInches(variants, sqInches) {
  if (!Array.isArray(variants) || isNaN(sqInches)) return null;

  sqInches = Number(sqInches);

  for (const variant of variants) {
    if (!variant.option1) continue;

    // Extract numbers from "Style #4465–4608" or "Style #4465-4608"
    const match = variant.option1.match(/(\d+)\s*[–-]\s*(\d+)/);

    if (!match) continue;

    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);

    if (sqInches >= min && sqInches <= max) {
      return variant; // ✅ FOUND
    }
  }

  return null; // ❌ No match
}

/* ================================================================
   Tap-to-toggle for hover-only info tooltips.
   ----------------------------------------------------------------
   Several tooltip patterns across the theme rely purely on `:hover`
   to reveal their popup content (e.g. `.widthHeight__option-toolTip`,
   `.tooltip`/`.tooltiptext`, `.precut .openmodalbox`). Touch devices
   don't fire hover, so the info icons appear inert on mobile.

   This handler:
     1. Injects an `.is-open` selector that mirrors each `:hover` rule,
        so adding `.is-open` to a tooltip wrapper reveals its content.
     2. Delegates clicks at document-level. Tap on a tooltip wrapper:
          - Closes any other open tooltip
          - Toggles `.is-open` on the tapped one
          - Calls preventDefault to stop label[for=...] from toggling
            the linked checkbox (e.g. "Add Free Design Notes" sits
            inside a label).
     3. Tap outside any open tooltip closes them all.

   Hover behavior on desktop is unaffected — both `:hover` and `.is-open`
   rules apply.
   ================================================================ */
(function () {
  if (window.__infoTooltipTapInit) return;
  window.__infoTooltipTapInit = true;

  function injectStyles() {
    if (document.getElementById('__info-tooltip-tap-style')) return;
    var s = document.createElement('style');
    s.id = '__info-tooltip-tap-style';
    /* Base styles: support `.is-open` as a click-toggled equivalent of
       `:hover`, and the `.is-overflowing` modifier (added by JS when a
       tooltip's natural absolute position would overflow the viewport)
       which forces a centered fixed popup. Fixed positioning is applied
       only when overflow is detected, so desktop with plenty of room
       still gets the trigger-anchored hover tooltip. */
    s.textContent = [
      /* Tap-toggle parity for hover-only tooltips. */
      '.widthHeight__option-toolTip, .tooltip { cursor: pointer; }',
      /* Force-visible open tooltips, with the familiar dark pill styling
         and a sky-high z-index. !important everywhere so we beat the base
         `.tooltip .tooltiptext { visibility: hidden; opacity: 0 }` plus any
         per-product inline overrides. */
      '.tooltip.is-open .tooltiptext {',
      '  display: block !important;',
      '  visibility: visible !important;',
      '  opacity: 1 !important;',
      '  background-color: #000 !important;',
      '  color: #fff !important;',
      '  z-index: 2147483646 !important;',
      '  transition: none !important;',
      '}',
      '.tooltip.is-open .tooltiptext::after {',
      '  border-color: #000 transparent transparent transparent !important;',
      '}',
      '.widthHeight__option-toolTip.is-open .widthHeight__option-toolTip__content {',
      '  display: block !important;',
      '  z-index: 2147483646 !important;',
      '  transition: none !important;',
      '}',
      /* The open .tooltip wrapper itself escapes its parent stacking context
         so the absolute-positioned popup paints above siblings. */
      '.tooltip.is-open, .widthHeight__option-toolTip.is-open {',
      '  z-index: 2147483646 !important;',
      '  position: relative !important;',
      '}',
      /* Cart contexts on MOBILE: the icon sits near the top of a clipped
         container; default `bottom: 125%` puts the popup ABOVE the icon,
         which is hidden by the cart header. Flip below the icon. Also
         make the popup responsive so long copy never clips its first
         letter on each wrapped line. */
      '@media (max-width: 1023px) {',
      '  sidebar-drawer .tooltip.is-open .tooltiptext,',
      '  body.template-cart .tooltip.is-open .tooltiptext {',
      '    bottom: auto !important;',
      '    top: 125% !important;',
      '    margin-top: 0 !important;',
      '    width: 260px !important;',
      '    max-width: calc(100vw - 32px) !important;',
      '    box-sizing: border-box !important;',
      '    padding: 10px 12px !important;',
      '    text-align: left !important;',
      '    line-height: 1.35 !important;',
      '    word-wrap: break-word !important;',
      '    overflow-wrap: break-word !important;',
      '    hyphens: none !important;',
      '  }',
      '  sidebar-drawer .tooltip.is-open .tooltiptext::after,',
      '  body.template-cart .tooltip.is-open .tooltiptext::after {',
      '    top: auto !important;',
      '    bottom: 100% !important;',
      '    border-color: transparent transparent #000 transparent !important;',
      '    margin-top: 0 !important;',
      '  }',
      '  /* widthHeight__option-toolTip (Free Design Notes etc.) on mobile:',
      '     position the popup so its BOTTOM EDGE sits AT the icon — popup',
      '     extends upward over what was above. User can tap the popup',
      '     content (which now sits over the icon area) to dismiss. Also',
      '     constrain width so it always fits the viewport. */',
      '  .widthHeight__option-toolTip.is-open .widthHeight__option-toolTip__content {',
      '    bottom: -2px !important;',
      '    top: auto !important;',
      '    left: 50% !important;',
      '    transform: translateX(-50%) !important;',
      '    width: 320px !important;',
      '    max-width: calc(100vw - 32px) !important;',
      '    box-sizing: border-box !important;',
      '    text-align: left !important;',
      '    line-height: 1.35 !important;',
      '    word-wrap: break-word !important;',
      '    overflow-wrap: break-word !important;',
      '  }',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }

  /* After opening a tooltip:
     1. Walk up the DOM from the wrapper. If any ancestor has overflow:hidden
        or overflow:clip, temporarily set it to visible. We remember the
        original value on the element so we can restore on close. Without
        this, the popup gets clipped by the cart drawer / cart-notice /
        free-shipping-bysize wrappers that use overflow:hidden for their
        progress-bar gradient.
     2. Measure the popup. If it would clip the left/right viewport edge,
        nudge it via inline margin-left (additive over the popup's existing
        centering margin-left). */
  function applyOverflowFix(wrapper) {
    if (!wrapper) return;
    unclipAncestors(wrapper);
    var content = wrapper.querySelector(
      '.widthHeight__option-toolTip__content, .tooltiptext'
    );
    if (!content) return;
    content.style.marginLeft = '';
    var rect = content.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var GUTTER = 16;
    var nudgeX = 0;
    if (rect.left < GUTTER) nudgeX = GUTTER - rect.left;
    else if (rect.right > vw - GUTTER) nudgeX = (vw - GUTTER) - rect.right;
    if (nudgeX !== 0) {
      var existing = parseFloat(getComputedStyle(content).marginLeft) || 0;
      content.style.marginLeft = (existing + nudgeX) + 'px';
    }
  }

  function clearOverflowFix(wrapper) {
    if (!wrapper) return;
    restoreAncestors(wrapper);
    var content = wrapper.querySelector(
      '.widthHeight__option-toolTip__content, .tooltiptext'
    );
    if (content) {
      content.style.marginLeft = '';
    }
  }

  /* For each ancestor up to <body>, if its computed overflow-x or
     overflow-y is 'hidden' or 'clip', remember the original inline style and
     set both to 'visible'. We tag the element with a data attribute so
     restoreAncestors() can find them and put the original style back. */
  function unclipAncestors(wrapper) {
    var el = wrapper.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      var cs = getComputedStyle(el);
      var ox = cs.overflowX, oy = cs.overflowY;
      var needs = ox === 'hidden' || ox === 'clip' || oy === 'hidden' || oy === 'clip';
      if (needs && !el.hasAttribute('data-__tt-unclipped')) {
        el.setAttribute('data-__tt-unclipped', '1');
        el.setAttribute('data-__tt-prev-ox', el.style.overflowX || '');
        el.setAttribute('data-__tt-prev-oy', el.style.overflowY || '');
        el.style.setProperty('overflow-x', 'visible', 'important');
        el.style.setProperty('overflow-y', 'visible', 'important');
      }
      el = el.parentElement;
    }
  }

  function restoreAncestors(wrapper) {
    /* Look at all currently-unclipped nodes; restore any that are an
       ancestor of this wrapper AND aren't an ancestor of any OTHER
       currently-open tooltip (so two simultaneously-open tooltips on the
       same branch don't fight each other). */
    var unclipped = document.querySelectorAll('[data-__tt-unclipped="1"]');
    var otherOpen = document.querySelectorAll('.tooltip.is-open, .widthHeight__option-toolTip.is-open');
    for (var i = 0; i < unclipped.length; i++) {
      var el = unclipped[i];
      if (!el.contains(wrapper)) continue;
      var stillNeeded = false;
      for (var j = 0; j < otherOpen.length; j++) {
        if (otherOpen[j] === wrapper) continue;
        if (el.contains(otherOpen[j])) { stillNeeded = true; break; }
      }
      if (stillNeeded) continue;
      var prevOx = el.getAttribute('data-__tt-prev-ox') || '';
      var prevOy = el.getAttribute('data-__tt-prev-oy') || '';
      if (prevOx) el.style.overflowX = prevOx; else el.style.removeProperty('overflow-x');
      if (prevOy) el.style.overflowY = prevOy; else el.style.removeProperty('overflow-y');
      el.removeAttribute('data-__tt-unclipped');
      el.removeAttribute('data-__tt-prev-ox');
      el.removeAttribute('data-__tt-prev-oy');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  var WRAPPER_SELECTOR = '.widthHeight__option-toolTip, .tooltip';
  var CONTENT_SELECTOR = '.widthHeight__option-toolTip__content, .tooltiptext';

  function closeAllExcept(except) {
    var open = document.querySelectorAll('.widthHeight__option-toolTip.is-open, .tooltip.is-open');
    for (var i = 0; i < open.length; i++) {
      if (open[i] !== except) {
        open[i].classList.remove('is-open');
        clearOverflowFix(open[i]);
      }
    }
  }

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    /* Tap inside a tooltip popup itself — close all (lets users dismiss
       by tapping the popup content). Avoids racing with link clicks
       inside a tooltip body, which we don't currently use. */
    if (e.target.closest(CONTENT_SELECTOR)) {
      closeAllExcept(null);
      return;
    }

    var tooltip = e.target.closest(WRAPPER_SELECTOR);
    if (tooltip) {
      /* Tooltip trigger tapped. Stop the label[for=...] default so the
         underlying checkbox doesn't toggle, and stop propagation so
         outside-click closers (cart drawer, etc.) don't fire. */
      e.preventDefault();
      e.stopPropagation();
      var wasOpen = tooltip.classList.contains('is-open');
      closeAllExcept(tooltip);
      if (wasOpen) {
        tooltip.classList.remove('is-open');
        clearOverflowFix(tooltip);
      } else {
        tooltip.classList.add('is-open');
        /* Defer overflow check to next frame so the browser has applied
           the `.is-open` styles (which make the content visible) and the
           getBoundingClientRect call returns the actual rendered size. */
        requestAnimationFrame(function () { applyOverflowFix(tooltip); });
      }
      return;
    }

    /* Tap outside any tooltip — close all open ones. */
    closeAllExcept(null);
  });
})();


