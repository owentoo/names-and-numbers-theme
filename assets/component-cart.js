/* ── Surgical subtotal update ──
   Instead of innerHTML-swapping #AjaxCartSubtotal (which destroys buttons/CTAs
   and causes visible flash), parse the new section HTML and patch only the
   values that actually change. Buttons, taxes text, structure stay untouched. */
function _patchSubtotalValues(newHTML) {
	var st = document.getElementById('AjaxCartSubtotal');
	if (!st) return;
	var tmp = document.createElement('div');
	tmp.innerHTML = newHTML;

	/* ── Price rows inside .cart__details ── */
	var newD = tmp.querySelector('.cart__details');
	var curD = st.querySelector('.cart__details');
	if (newD && curD) {
		/* Total */
		var nT = newD.querySelector('.cart__total strong:last-child');
		var cT = curD.querySelector('.cart__total strong:last-child');
		if (nT && cT) cT.innerHTML = nT.innerHTML;

		/* Subtotal + Discounts (only present when cart-level discounts exist) */
		['.cart__subtotal', '.cart__discounts'].forEach(function(sel) {
			var nR = newD.querySelector(sel);
			var cR = curD.querySelector(sel);
			if (nR && cR) {
			cR.innerHTML = nR.innerHTML;
			var dct = nR.getAttribute('data-cart-total');
			if (dct !== null) cR.setAttribute('data-cart-total', dct);
		}
			else if (nR && !cR) {
				/* Row appeared — insert before .cart-saving-row or .cart__total */
				var anchor = curD.querySelector('.cart-saving-row') || curD.querySelector('.cart__total');
				if (anchor) anchor.insertAdjacentElement('beforebegin', nR.cloneNode(true));
			} else if (!nR && cR) { cR.remove(); }
		});
	}

	/* ── Free shipping bars (full container swap) ──
	   Replaces the entire bars container so new bars (e.g. blanks bar appearing
	   for the first time) are inserted and removed bars are cleaned up.
	   Only targets .fullpage-cart (cart page); drawer bars live inside
	   #AjaxCartForm and are handled by the innerHTML swap above. */
	var nFC = tmp.querySelector('.sidebar-widget__content.fullpage-cart');
	var cFC = st.querySelector('.sidebar-widget__content.fullpage-cart');
	if (nFC && cFC) {
		cFC.innerHTML = nFC.innerHTML;
	} else if (nFC && !cFC) {
		var nWidget = nFC.closest('.sidebar-widget');
		var anchor = st.querySelector('.cart-consolidated-card');
		if (nWidget && anchor) anchor.insertAdjacentElement('beforebegin', nWidget.cloneNode(true));
	} else if (!nFC && cFC) {
		var cWidget = cFC.closest('.sidebar-widget');
		if (cWidget) cWidget.remove();
	}
	if (typeof reCalculateFreeShippingModule__recall === 'function') reCalculateFreeShippingModule__recall();

	/* ── Rewards: DO NOT swap innerHTML. The reward app populates the block
	   asynchronously; the fresh Liquid HTML has an empty placeholder that
	   flickers before it repopulates. The reward app recomputes on its own
	   when cart totals change, so leaving the current element alone is best. */

	/* ── Gift wrapping ── */
	var nGw = tmp.querySelector('.cart-gift-widget');
	var cGw = st.querySelector('.cart-gift-widget');
	if (nGw && cGw) cGw.innerHTML = nGw.innerHTML;
}

if ( typeof CartForm !== 'function' ) {
	class CartForm extends HTMLElement {
		constructor(){
			super();
			this.ajaxifyCartItems();
			// Delegated remove-click handler — survives DOM mutations from any source
			// (cart section re-renders, app scripts, patcher writes, etc.)
			this.addEventListener('click', (e) => {
				const removeEl = e.target.closest('.remove');
				if (!removeEl) return;
				if (!this.contains(removeEl)) return;
				// Skip JTL/Pre-cut branch (uses inline onclick for precut-confirm flow)
				if (removeEl.getAttribute('href') === 'javascript:void(0)') return;
				const item = removeEl.closest('[data-js-cart-item]');
				if (!item) return;
				e.preventDefault();
				e.stopImmediatePropagation();
				this.updateCartQty(item, 0);
			}, true); // capture phase so we beat any app-injected listeners
		}

		ajaxifyCartItems(){

			this.form = this.querySelector('form');

			this.querySelectorAll('[data-js-cart-item]').forEach(item=>{

				const remove = item.querySelector('.remove');
				if ( remove ) {
					remove.dataset.href = remove.getAttribute('href');
					remove.setAttribute('href', '');
					remove.addEventListener('click', (e)=>{
						e.preventDefault();
						this.updateCartQty(item, 0);
					})
				}

				const qty = item.querySelector('.qty');
				if ( qty ) {
					qty.addEventListener('input', debounce(e=>{
						e.preventDefault();
						e.target.blur();
						this.updateCartQty(item, parseInt(qty.value));
					}, 2000));
					qty.addEventListener('click', (e)=>{
						e.target.select();
					})
				}

				/* SOLO layout: [data-js-cart-item] is .nt-dg-solo-controls, which has
				   only qty buttons. The ._upsell_cta button + .propitems live in the
				   sibling .nt-dg-info (both inside .nt-dg-header). Fall back to the
				   enclosing header for both lookup and update scope. */
				const upsell = item.querySelector('._upsell_cta')
					|| item.closest('.nt-dg-header')?.querySelector('._upsell_cta');
				if ( upsell ) {
					upsell.addEventListener('click', (e)=>{
						var pNode = e.target.closest('._upsell_parent_block')
							|| upsell.closest('.nt-design-group');
						var qtyNode = pNode.querySelector('._discount-list');
						var qty_value = qtyNode.dataset.min;
						var scope = item;
						if (!item.querySelector('.propitems')) {
							var header = item.closest('.nt-dg-header');
							if (header) {
								if (!header.dataset.id) header.dataset.id = item.dataset.id;
								scope = header;
							}
						}
						this.updateUpsell(scope, parseInt(qty_value));
					})
				}
			})
            if (typeof _upsell_check === 'function') {
              _upsell_check();
            }
		}


		updateUpsell(item, newQty){
			let alert = null;
			let upsellSucceeded = false;
			this.form.classList.add('processing');
			this.classList.add('cart-refreshing');
			if ( this.querySelector('.alert') ) {
				this.querySelector('.alert').remove();
			}

			var propitems = item.querySelector(".propitems")
			var order_properties =  $.trim($(propitems).val());
			var _json_prop = {};
			if(order_properties != ""){
				_json_prop = JSON.parse(order_properties);
				$.each(_json_prop, function(key, value) {
					if(key == "_discount_name"){
						_json_prop[key] = decodeURIComponent(value);
					}
					if(key == "_discount_input"){
						_json_prop[key] = decodeURIComponent(value);
					}
					if(value.indexOf("https%3A%2F%2F") > -1){
						_json_prop[key] = decodeURIComponent(value);
					}
				});
			}
			const body = JSON.stringify({
				id: item.dataset.id,
				quantity: newQty,
				properties : _json_prop,
				sections: 'helper-cart',
				sections_url: window.location.pathname
			});

			fetch(KROWN.settings.routes.cart_change_url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/javascript' },
				body
				})
				.then(response => response.text().then(text => {
					try { return JSON.parse(text); } catch (e) { return { status: response.status }; }
				}))
				.then(response => {
					if ( response.status == 422 ) {
						alert = document.createElement('span');
						alert.classList.add('alert', 'alert--error');
						if ( typeof response.description === 'string' ) {
							alert.innerHTML = response.description;
						} else {
							alert.innerHTML = response.message;
						}
					}
					/* Use inline section from /cart/change response when available; fallback to
					   legacy GET only if the response didn't include sections. */
					if (response && response.sections && typeof response.sections['helper-cart'] === 'string') {
						return response.sections['helper-cart'];
					}
					return fetch('?section_id=helper-cart').then(r => r.text());
				})
				.then(text => {

					const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
					const sectionCartForm = sectionInnerHTML.getElementById('AjaxCartForm');
					const sectionSubtotal = sectionInnerHTML.getElementById('AjaxCartSubtotal');
					if ( !sectionCartForm || !sectionSubtotal ) { return; }
					upsellSucceeded = true;
					const cartFormInnerHTML = sectionCartForm.innerHTML;
					const cartSubtotalInnerHTML = sectionSubtotal.innerHTML;

					const cartItems = document.getElementById('AjaxCartForm');
					window.__ntCartCache = null;
					cartItems.style.minHeight = cartItems.offsetHeight + 'px';
					cartItems.innerHTML = cartFormInnerHTML;
					cartItems.ajaxifyCartItems();

					document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
						let _cartno = cartItems.querySelector('[data-cart-count]')?.textContent || '0';
						elm.textContent = _cartno;
						elm.setAttribute("data-count",_cartno);
					});
					document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
						elm.textContent = cartItems.querySelector('[data-cart-total]')?.textContent || '';
					});

					if ( alert !== null ) {
						this.form.prepend(alert);
					}

					_patchSubtotalValues(cartSubtotalInnerHTML);

					const event = new Event('cart-updated');
					this.dispatchEvent(event);

				})
				.catch(e => {
					console.log('updateCart error:', e);
					let alert = document.createElement('span');
					alert.classList.add('alert', 'alert--error');
					alert.textContent = KROWN.settings.locales.cart_general_error;
					this.form.prepend(alert);
				})
				.finally(() => {
					this.form.classList.remove('processing');
					/* Hold the dim until the patcher corrects tier prices — see updateCartQty comment */
					if (!upsellSucceeded) {
						this.classList.remove('cart-refreshing');
						_saving_update();
					}
                    if (typeof _upsell_check === 'function') {
                      _upsell_check();
					}
				});
      }


			updateCartQty(item, newQty){

				let alert = null;

				this.form.classList.add('processing');
				/* CSS targets the <cart-form> wrapper (cart-form#AjaxCartForm.cart-refreshing).
				   Add the class to `this` (the cart-form custom element) so dim+pointer-events:none
				   actually applies during the in-flight fetch, matching what the patcher removes. */
				this.classList.add('cart-refreshing');
				if ( this.querySelector('.alert') ) {
					this.querySelector('.alert').remove();
				}

				/* Merged-row delta translation: the patcher visually merges duplicate
				   Shopify lines (e.g. 51 primary + 5 ghost = 56 displayed). The .qty
				   input shows 56. When user clicks +, newQty is 57. But we must send
				   the delta relative to the PRIMARY's server qty (51+1=52), not the
				   merged display (57). data-server-qty holds the primary's real qty;
				   data-qty holds the displayed merged total. */
				const serverQty = parseInt(item.getAttribute('data-server-qty')) || 0;
				const displayedQty = parseInt(item.getAttribute('data-qty')) || 0;
				/* expectedDisplayQty = what the user expects to see after the update.
				   Saved before delta translation so we can pre-set it on the new DOM
				   immediately after innerHTML swap — avoids a flash of the raw server
				   qty (e.g. 52) before the patcher merges it back to the display total (57). */
				const expectedDisplayQty = newQty;
				if (newQty > 0 && serverQty > 0 && displayedQty > 0 && serverQty !== displayedQty) {
					const delta = newQty - displayedQty;
					newQty = Math.max(0, serverQty + delta);
				}

				/* Single round-trip: ask /cart/change to render the cart section in the same
				   response via Shopify's `sections` param. Saves the follow-up GET /?section_id=.
				   sections_url MUST be the current page path (not hardcoded '/cart') because
				   helper-cart.liquid branches on `template contains 'cart'` to decide between
				   cart-form-page (full page) vs cart-form (sidebar/drawer). Using '/cart' would
				   force page markup into the drawer on non-cart pages. */
				const body = JSON.stringify({
					id: item.dataset.id,
					quantity: newQty,
					sections: 'helper-cart',
					sections_url: window.location.pathname
				});

				/* Retry helper: on 429 (rate limited), wait and retry up to 2 times with backoff.
				   Without this, rapid qty changes silently fail and UI goes out of sync with cart. */
				const fetchWithRetry = (url, opts, retries = 2, delay = 500) => {
					return fetch(url, opts).then(r => {
						if (r.status === 429 && retries > 0) {
							return new Promise(res => setTimeout(res, delay))
								.then(() => fetchWithRetry(url, opts, retries - 1, delay * 2));
						}
						return r;
					});
				};

				/* Remember pre-click qty so we can revert the input if the update fails entirely */
				const prevQty = item.dataset.qty || '';
				const qtyInput = item.querySelector('.qty-selector, input[name="updates[]"]');
				let updateSucceeded = false;

				fetchWithRetry(KROWN.settings.routes.cart_change_url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'Accept': 'application/javascript' },
					body
				})
				.then(response => response.text().then(text => {
					/* Tolerate HTML response (some Shopify configs return HTML from /cart/change
					   even with Accept: application/javascript). Parse as JSON if possible,
					   otherwise return a stub — the section refetch is the source of truth. */
					const parsed = (() => { try { return JSON.parse(text); } catch (e) { return null; } })();
					return parsed || { status: response.status };
				}))
				.then(response => {
					if ( response.status == 422 ) {
						alert = document.createElement('span');
						alert.classList.add('alert', 'alert--error');
						if ( typeof response.description === 'string' ) {
							alert.innerHTML = response.description;
						} else {
							alert.innerHTML = response.message;
						}
					}
					/* Prefer the inline section returned by /cart/change. Fallback to the legacy
					   GET /?section_id= only if the change response didn't include sections (older
					   Shopify configs, or if request was rejected with no JSON body). */
					if (response && response.sections && typeof response.sections['helper-cart'] === 'string') {
						return response.sections['helper-cart'];
					}
					return fetchWithRetry('?section_id=helper-cart', {}).then(r => r.text());
				})
				.then(text => {

					const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
					const sectionCartForm = sectionInnerHTML.getElementById('AjaxCartForm');
					const sectionSubtotal = sectionInnerHTML.getElementById('AjaxCartSubtotal');
					/* Section fetch failed (429 after retries, auth redirect, etc.) — revert input
					   so it stays in sync with server state instead of showing the clicked-but-not-saved value. */
					if ( !sectionCartForm || !sectionSubtotal ) {
						if (qtyInput && prevQty) qtyInput.value = prevQty;
						return;
					}
					updateSucceeded = true;
					const cartFormInnerHTML = sectionCartForm.innerHTML;
					const cartSubtotalInnerHTML = sectionSubtotal.innerHTML;

					const cartItems = document.getElementById('AjaxCartForm');
					/* Freeze height before innerHTML swap to prevent layout shift —
					   rows changing count/visibility won't make the page jump. The
					   patcher clears minHeight after writing corrected prices. */
					window.__ntCartCache = null;
					cartItems.style.minHeight = cartItems.offsetHeight + 'px';
					cartItems.innerHTML = cartFormInnerHTML;
					cartItems.ajaxifyCartItems();

					/* Pre-set the expected merged qty on the primary row so the user
					   doesn't see the raw server qty (e.g. 52) flash before the patcher
					   merges it to the display total (e.g. 57). */
					if (expectedDisplayQty > 0 && serverQty > 0 && serverQty !== displayedQty) {
						var newPrimaryRow = cartItems.querySelector('[data-id="' + item.dataset.id + '"]');
						if (newPrimaryRow) {
							newPrimaryRow.querySelectorAll('.qty').forEach(function(inp) { inp.value = expectedDisplayQty; });
							newPrimaryRow.setAttribute('data-qty', String(expectedDisplayQty));
						}
					}

					document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
						let _cartno = cartItems.querySelector('[data-cart-count]')?.textContent || '0';
						elm.textContent = _cartno;
						elm.setAttribute("data-count",_cartno);
					});
					document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
						elm.textContent = cartItems.querySelector('[data-cart-total]')?.textContent || '';
					});

					if ( alert !== null ) {
						this.form.prepend(alert);
					}

					_patchSubtotalValues(cartSubtotalInnerHTML);
					if ( typeof reCalculateFreeShippingModule === 'function' ) {
						reCalculateFreeShippingModule();
					}
					const event = new Event('cart-updated');
					this.dispatchEvent(event);

				})
				.catch(e => {
					console.log('updateCartQty error:', e);
					/* Revert input to last-known server qty so UI stays in sync */
					if (qtyInput && prevQty) qtyInput.value = prevQty;
					let alert = document.createElement('span');
					alert.classList.add('alert', 'alert--error');
					alert.textContent = KROWN.settings.locales.cart_general_error;
					this.form.prepend(alert);
				})
				.finally(() => {
					this.form.classList.remove('processing');
					/* On success, do NOT remove cart-refreshing here — the blanks-price-patcher
					   will remove it after it has written the corrected tier prices into the DOM.
					   Lifting the dim before the patcher runs causes a visible flash of Shopify's
					   raw Liquid prices (compare_at_price etc.) that get overwritten a moment later.
					   On failure (updateSucceeded = false), the patcher won't run, so we un-dim now. */
					if (!updateSucceeded) {
						this.classList.remove('cart-refreshing');
						_saving_update();
					}
					/* On success, _saving_update is called by the patcher AFTER it
					   writes the correct tier savings into #moneySaved. Calling it
					   here would flash the stale Liquid-rendered value first. */
                    if (typeof _upsell_check === 'function') {
                      _upsell_check();
					}
				});
			}

		}


		if ( typeof customElements.get('cart-form') == 'undefined' ) {
			customElements.define('cart-form', CartForm);
		}

}

if ( typeof CartProductQuantity !== 'function' ) {

	class CartProductQuantity extends HTMLElement {
		constructor(){
			super();
			this.querySelector('.qty-minus').addEventListener('click', this.changeCartInput.bind(this));
			this.querySelector('.qty-plus').addEventListener('click', this.changeCartInput.bind(this));
		}
		changeCartInput(){
			/* Debounce rapid +/- clicks so large carts don't queue multiple section fetches.
			   Each click resets the timer; only the final value fires /cart/change. */
			var self = this;
			if ( this._changeTimer ) clearTimeout(this._changeTimer);
			this._changeTimer = setTimeout(function(){
				document.getElementById('AjaxCartForm').updateCartQty(self.closest('[data-js-cart-item]'), parseInt(self.querySelector('.qty').value));
			}, 300);
		}
	}

  if ( typeof customElements.get('cart-product-quantity') == 'undefined' ) {
		customElements.define('cart-product-quantity', CartProductQuantity);
	}

}

// method for apps to tap into and refresh the cart

if ( ! window.refreshCart ) {

	window.refreshCart = ( cartAct ) => {

		/* Silent mode ('notOpen'): called by background reconciliation flows
		   (precut sync in precut-func.liquid → handleCartAction → refreshCart('notOpen')).
		   The first shimmer (from updateCartQty) already covered the visible cart update;
		   firing a second shimmer here produces the "two load states" the user sees
		   after every qty change when precut reconciliation runs. Skip the shimmer
		   in silent mode — the brief DOM replacement is imperceptible and the patcher
		   still corrects tier prices immediately after. */
		var isSilent = (cartAct === 'notOpen');
		var cartEl = document.getElementById('AjaxCartForm');
		if (cartEl && !isSilent) cartEl.classList.add('cart-refreshing');
		var refreshSucceeded = false;

		fetch('?section_id=helper-cart')
			.then(response => response.text())
			.then(text => {

			const sectionInnerHTML = new DOMParser().parseFromString(text, 'text/html');
			const sectionCartForm = sectionInnerHTML.getElementById('AjaxCartForm');
			const sectionSubtotal = sectionInnerHTML.getElementById('AjaxCartSubtotal');
			if ( !sectionCartForm || !sectionSubtotal ) return;
			refreshSucceeded = true;
			const cartFormInnerHTML = sectionCartForm.innerHTML;
			const cartSubtotalInnerHTML = sectionSubtotal.innerHTML;

			const cartItems = document.getElementById('AjaxCartForm');
			/* Silent mode: still do the innerHTML swap so lines added/removed by
			   reconciliation (e.g. precut line appearing for the first time, JTL line
			   being added) actually render. But skip the shimmer overlay — the user
			   already saw the first shimmer from updateCartQty. A brief ~50ms flash of
			   Liquid-rendered raw prices during the swap is imperceptible compared to
			   a full second shimmer cycle. Invalidate cart cache so patcher reflects
			   the reconciled server state. */
			window.__ntCartCache = null;
			cartItems.style.minHeight = cartItems.offsetHeight + 'px';
			cartItems.innerHTML = cartFormInnerHTML;
			cartItems.ajaxifyCartItems();

			document.querySelectorAll('[data-header-cart-count]').forEach(elm=>{
				elm.textContent = cartItems.querySelector('[data-cart-count]')?.textContent || '0';
			});
			document.querySelectorAll('[data-header-cart-total').forEach(elm=>{
				elm.textContent = cartItems.querySelector('[data-cart-total]')?.textContent || '';
			})

			_patchSubtotalValues(cartSubtotalInnerHTML);
			if ( typeof reCalculateFreeShippingModule === 'function' ) {
				reCalculateFreeShippingModule();
			}
			if ( cartAct != 'notOpen' ) {
				document.querySelector('[data-js-site-cart-sidebar]').show();
			}

			/* Silent mode: skip recommendation regen — the existing recs are still valid
			   for this reconciliation-only refresh, and regenerating them triggers its
			   own visible load state. */
			if ( !isSilent && document.querySelector('cart-recommendations') ) {
				document.querySelector('cart-recommendations').innerHTML = '';
				document.querySelector('cart-recommendations').generateRecommendations();
			}
			/* _saving_update intentionally NOT called here — the patcher calls it
			   after writing correct tier savings. Calling here would flash the
			   stale Liquid-rendered value. */
            if (typeof _upsell_check === 'function') {
              _upsell_check();
            }
		})
		.finally(function() {
			/* On failure the patcher won't run, so clean up shimmer + height lock here.
			   On success the patcher handles cleanup for both cart-form and subtotal. */
			if (!refreshSucceeded) {
				var cf = document.getElementById('AjaxCartForm');
				if (cf) { cf.classList.remove('cart-refreshing'); cf.style.minHeight = ''; }
				_saving_update();
			}
		})
	}

}


$(function () {
  var cartWrappingForm = document.getElementById('cart-wrapping');
  $(document).on("click","#cart-gift-wrapping",function(){
    var _ischecked = $(this).is(":checked");
    if ( document.getElementById('site-cart-sidebar') ) {
      document.getElementById('site-cart-sidebar').scrollTo({top: 0, behavior: 'smooth'});
    }

    if ( _ischecked ) {
			const isVariantAvailable = $( `#cart-wrapping #add-to-cart- form [name="id"]` ).length;
			let vid = '';
			if ( isVariantAvailable == 0 ) {
				const getTempData = $( `#cart-wrapping #add-to-cart- form template` ).html();
				if ( typeof getTempData !== 'undefined' && getTempData ) {
					$( `#cart-wrapping #add-to-cart- form` ).append( getTempData );
				}
			}
			vid = $( `#cart-wrapping #add-to-cart- form [name="id"]` ).val() * 1;
			if ( typeof vid !== 'undefined' && vid ) {
				const items = [{
					id: vid,
					quantity: 1
				}];
				$.post(`/cart/add.js`, {items}, function ( r ) {
					const isCartDrawer = $( `sidebar-drawer#site-cart-sidebar` ).hasClass( `sidebar--opened` );
					if ( isCartDrawer ) {
						refreshCart();
					} else {
						location.reload();
					}
				},"json");
			}

      // $("#cart-wrapping #product-form- [data-js-product-add-to-cart]").trigger("click");
      //cartWrappingForm.querySelector('[data-js-product-add-to-cart]').trigger("click");
    } else {
      if(document.querySelector('.cart-item--gift-wrapping') ) {
        $('.cart-item--gift-wrapping .remove').get(0).click();

        $(".cart-item--gift-wrapping .product__quantity").val(0).trigger("blur");
        //document.querySelector('.cart-item--gift-wrapping .remove').click();
      }
    }
  })
})

/*
const cartWrappingForm = document.getElementById('cart-wrapping');
document.querySelector('[data-js-cart-wrapping-checkbox]').addEventListener('click', e=>{
  console.log(e.target.checked," ===e.target.checked")
  if ( document.getElementById('site-cart-sidebar') ) {
    document.getElementById('site-cart-sidebar').scrollTo({top: 0, behavior: 'smooth'});
  }
  if ( e.target.checked ) {
    cartWrappingForm.querySelector('[data-js-product-add-to-cart]').click();
  } else {
    if ( document.querySelector('.cart-item--gift-wrapping') ) {
      document.querySelector('.cart-item--gift-wrapping .remove').click();
    }
  }
})
*/
function _saving_update() {
  var _totalsaving = "- " + $("#moneySaved").val();
  var _savingnum = parseInt($("#moneySaved").attr("data"));
  /* Removed 500ms setTimeout wrappers — they caused a visible delay where the
     savings row showed stale data for ~1s after every qty change. The patcher
     now calls _saving_update() synchronously after computing correct savings,
     so the delay is unnecessary and was the main cause of the "flicker." */
  if(_savingnum <= 0){
    $("#_total_saving").parents(".cart__details--row").hide();
    $(".cart__subtotal.cart__details--row").hide();
    $(".cart__total.cart__details--row").addClass("blank-row");
    $("#_total_saving").html(_totalsaving);
  }else{
    $("#_total_saving").parents(".cart__details--row").css("display","flex");
    $(".cart__subtotal.cart__details--row").css("display","flex");
    $(".cart__total.cart__details--row").removeClass("blank-row");
    $("#_total_saving").html(_totalsaving);
  }
  var _subEls = document.querySelectorAll('.cart-subtotal-value');
  if (_subEls.length) {
    var _cartTotal = parseInt((_subEls[0].parentElement.getAttribute('data-cart-total') || '0'));
    var _subCents = _cartTotal + Math.max(_savingnum, 0);
    var _subFmt = '$' + (_subCents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    _subEls.forEach(function(el){ el.textContent = _subFmt; el.style.visibility = 'visible'; });
  }
  if(typeof cart__reward_func != "undefined"){
    //console.log("cart__reward_func");
    cart__reward_func();
  }
  
  if (typeof recheckcart === 'function') {
    recheckcart();
  }
  if (typeof cartStickyFunc === 'function') {
  	cartStickyFunc();
  }
  
  if (typeof cart__productblank === 'function') {
  	cart__productblank();
  }

  if (
    document.body &&
    document.body.classList.contains('template-cart') &&
    typeof window.refreshGRTUpsellBlocks === 'function'
  ) {
    try { window.refreshGRTUpsellBlocks(); } catch (e) {}
    setTimeout(function () {
      try { window.refreshGRTUpsellBlocks(); } catch (e) {}
    }, 200);
  }

  if (typeof updateCartItemCount === 'function') {
  	updateCartItemCount();
  }
  positionCartPageMobileFreeShipping();
}

function cart__productblank(){
	if($("#productblank").length > 0){
		var __productblank = $("#productblank").val() * 1;
		if(__productblank > 0){
			$(".grt__cartsection-suggetionblock").addClass("cartsection-suggetionblock");
		}else{
			$(".grt__cartsection-suggetionblock").removeClass("cartsection-suggetionblock");
		}
	}
}

_saving_update();
document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'cart-gift-wrapping') {
    setTimeout(_saving_update, 1000);
  }
});


function positionCartPageMobileFreeShipping() {
	if (
		!document.body ||
		!document.body.classList.contains('template-cart') ||
		window.innerWidth >= 768
	) {
		return;
	}

	const repositionElement = document.querySelector('.grt-cart-reposition');
	const repositionBlock = repositionElement ? repositionElement.closest('.sidebar-widget') : null;
	const lineItemContainer = document.querySelector('.grt-cart-line-item-container');
	if (!repositionBlock || !lineItemContainer || !lineItemContainer.parentNode) {
		return;
	}

	if (lineItemContainer.nextElementSibling === repositionBlock) {
		repositionBlock.style.order = '-1';
		return;
	}

	lineItemContainer.insertAdjacentElement('afterend', repositionBlock);
	repositionBlock.style.order = '-1';
}
