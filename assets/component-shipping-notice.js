if ( typeof ShippingNotice !== 'function' ) {

  class ShippingNotice extends HTMLElement {

    constructor() {
      super();
      this.init();
    }

    init() {
      var _con = 0;
      var _con_total = 0;
      var cartTotal = Number(this.getAttribute('data-cart-total'));
      
      /** Delivery custom logic **/
      $(".cart-notice").hide();
      $("[data-product_type]").each(function(){
        var _h = $(this).attr("data-product_type");
        switch(_h){
          case 'transfer_film':
          case 'powder':
          case 'ink':
            _con = 1
          break
          case 'custom_transfers':
          case 'customer_transfers_gang':
          case 'custom_transfers_gang':
          case 'uv_dtf':
          case 'spangles':
          case 'uv_dtf_gang':
          case 'spangles':
          case 'supplies':
          case 'ready_to_press':
            var lineItemPrice = Number($(this).find('[data-line-item-cost]').attr("data-line-item-cost"));
            _con_total += lineItemPrice;
            $(".cart-notice").show();
          break
        }
      })
      
      cartTotal = _con_total; 
      
      var _cartmsg = "";
      if(_con == 1){
          $(".cart-notice").hide();
      }
      /** ./Delivery custom logic **/

      
      
      const freeShippingThreshold = Math.round(Number(this.getAttribute('data-free-shipping')) * (Shopify.currency.rate ? Number(Shopify.currency.rate) : 1));
      const freeShippingRemaining = cartTotal - freeShippingThreshold;
      
      let cartSliderWidth = 0;
      
      if ( freeShippingRemaining < 0 ) {
        var _shMsg = window.KROWN.settings.locales.shipping_notice_remaining_to_free.replace('{{ remaining_amount }}', this._formatMoney(Math.abs(freeShippingRemaining), KROWN.settings.shop_money_format));
        //_shMsg = _shMsg + " " + _cartmsg;
        this.querySelector('[data-js-free-shipping-text]').innerHTML = _shMsg;
        cartSliderWidth = 100 - (Math.abs(freeShippingRemaining) * 100 / freeShippingThreshold);
      } else {
        
        var _shMsg = window.KROWN.settings.locales.shipping_notice_eligible_for_free;
        //_shMsg = _shMsg + " " + _cartmsg;
        
        this.querySelector('[data-js-free-shipping-text]').innerHTML = _shMsg;
        cartSliderWidth = 100;
      }
			if ( this.querySelector('[data-js-free-shipping-slider]') ) {
				this.querySelector('[data-js-free-shipping-slider]').style.width = `${cartSliderWidth}%`;
			}

    }
    
    _formatMoney(cents, format) {

			if (typeof cents === 'string') {
				cents = cents.replace('.', '');
			}
	
			let value = '';
			const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
			const formatString = format || moneyFormat;
	
			function formatWithDelimiters(number, precision, thousands, decimal) {
				thousands = thousands || ',';
				decimal = decimal || '.';
	
				if (isNaN(number) || number === null) {
					return 0;
				}
	
				number = (number / 100.0).toFixed(precision);
	
				const parts = number.split('.');
				const dollarsAmount = parts[0].replace(
					/(\d)(?=(\d\d\d)+(?!\d))/g,
					'$1' + thousands
				);
				const centsAmount = parts[1] ? decimal + parts[1] : '';
	
				return dollarsAmount + centsAmount;
			}
	
			switch (formatString.match(placeholderRegex)[1]) {
				case 'amount':
					value = formatWithDelimiters(cents, 2);
					break;
				case 'amount_no_decimals':
					value = formatWithDelimiters(cents, 0);
					break;
				case 'amount_with_comma_separator':
					value = formatWithDelimiters(cents, 2, '.', ',');
					break;
				case 'amount_no_decimals_with_comma_separator':
					value = formatWithDelimiters(cents, 0, '.', ',');
					break;
				case 'amount_no_decimals_with_space_separator':
					value = formatWithDelimiters(cents, 0, ' ');
					break;
				case 'amount_with_apostrophe_separator':
					value = formatWithDelimiters(cents, 2, "'");
					break;
			}
	
			return formatString.replace(placeholderRegex, value);
	
		}

  }

  if ( typeof customElements.get('shipping-notice') == 'undefined' ) {
    customElements.define('shipping-notice', ShippingNotice);
  }

}