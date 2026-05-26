const popUpHtmlCache = {};
$( document )
  .ready(function() {
  })
  .on(`click`, `upsell-popup .upsell__popUp__close`, function( e ) {
    try {
      e.stopImmediatePropagation();
      $( this ).closest( `.upsell__popUp` ).removeClass( `active` );
      $(`body`).removeClass(`set_Overlay`);
      $( `popup-main-screen` ).removeClass( `prod` ).addClass( `main` );
      $(`popup-product-data .popup-product-data`).html("");
    } catch ( err ) {
      console.log( `ERROR upsell-popup .upsell__popUp__close`, err.message );
    }
  })
  .on(`click`, `popup-product-data go-back-btn`, function( e ) {
    try {
      e.stopImmediatePropagation();
      $( `popup-main-screen` ).removeClass( `prod` ).addClass( `main` );
      $(`body`).removeClass(`set_Overlay`);
      $(`popup-product-data .popup-product-data`).html("");
    } catch ( err ) {
      console.log( `ERROR .popup-product-data go-back-btn`, err.message );
    }
  })
  .on(`click`, upsell_selector,async function( e ) {
    try {
      if($(window).outerWidth() > 768){
        e.stopImmediatePropagation();
        const isBlank = $( `#cart.cart__form [is-blank="true"]` ).length;
        $( `sidebar-drawer .cart__items .cart-item` ).each(function() {
          const getCartItemType = $( this ).attr( `data-product_type` );
          if ( getCartItemType.includes( `custom_transfers` ) ) {
            isEligibleForUpsell = true;
          } else if ( getCartItemType.includes( `puff_transfers` ) ) {
            isEligibleForUpsell = true;
          }
        })
        $( `#AjaxCartForm .cart-form__items .cart-form-item` ).each(function() {
          const getCartItemType = $( this ).attr( `data-product_type` );
          if ( getCartItemType.includes( `custom_transfers` ) ) {
            isEligibleForUpsell = true;
          } else if ( getCartItemType.includes( `puff_transfers` ) ) {
            isEligibleForUpsell = true;
          }
        })
  
        
        if ( isBlank == 0 && isEligibleForUpsell ) {
          console.log("1")
          var _upsell = getCook("blank_upsell");
          if( _upsell == `` ){
            e.preventDefault();
            const isListLoaded = $( `popup-main-screen popup-collection-data popup-prod-list` ).hasClass( `listLoaded` );
            if ( isListLoaded == false ) {
              $( `upsell-popup .upsell__popUp` ).addClass( `active` );
              setCookie("blank_upsell", 1, 1);
              $(`body`).addClass(`set_Overlay`);
              if ( typeof upsellData !== 'undefined' && upsellData ) {
                $( `popup-main-screen popup-collection-data popup-prod-list` )
                  .html( upsellData )
                  .addClass( `listLoaded` );
  
                removeReviewWord();
  
                console.log ( 'swiper slider start',  );
                $( `popup-main-screen popup-collection-data popup-prod-list` ).slick({
                  dots: false,
                  arrows: true,
                  prevArrow: '<button type="button" class="slick-prev pull-left"><svg width="7px" height="9px" viewBox="0 0 7 9" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><polygon id="Triangle" fill="#000000" transform="translate(3.5, 4.5) rotate(-90) translate(-3.5, -4.5)" points="3.5 1 8 8 -1 8"></polygon></g></svg></button>',
                  nextArrow: '<button type="button" class="slick-next pull-right"><svg width="7px" height="9px" viewBox="0 0 7 9" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><polygon id="Triangle" fill="#000000" transform="translate(3.5, 4.5) rotate(90) translate(-3.5, -4.5)" points="3.5 1 8 8 -1 8"></polygon></g></svg></button>',
                  infinite: false,
                  slidesToShow: 5.5,
                  slidesToScroll: 3,
                  adaptiveHeight:false,
                  autoplay: false,
                  autoplaySpeed: 10000,
                  responsive: [
                    {
                      breakpoint: 1200,
                      settings: {
                        slidesToShow: 4.5
                      }
                    },
                    {
                      breakpoint: 1000,
                      settings: {
                        slidesToShow: 3.75,
                        slidesToScroll: 2
                      }
                    },
                    {
                      breakpoint: 815,
                      settings: {
                        slidesToShow: 1.75,
                        slidesToScroll: 1
                      }
                    },
                    {
                      breakpoint: 768,
                      settings: {
                        slidesToShow: 4.5,
                        slidesToScroll: 3
                      }
                    },
                    {
                      breakpoint: 600,
                      settings: {
                        slidesToShow: 3.5,
                        slidesToScroll: 1
                      }
                    },
                    {
                      breakpoint: 500,
                      settings: {
                        slidesToShow: 2.8,
                        slidesToScroll: 1
                      }
                    },
                    {
                      breakpoint: 450,
                      settings: {
                        slidesToShow: 2.2,
                        slidesToScroll: 1
                      }
                    },
                    {
                      breakpoint: 360,
                      settings: {
                        slidesToShow: 2,
                        slidesToScroll: 1
                      }
                    }
                  ]
                });
                console.log ( 'swiper slider end',  );
              }
            } else {
              $( `upsell-popup .upsell__popUp` ).addClass( `active` );
            }
          }
        }
      }
    } catch ( err ) {
      console.log( `ERROR [{{ settings.selectorCriteria }}]`, err.message );
    }
  })
  .on(`click`, `popup-prod-list .prod__Item__triggerAction`, async function (e) {
    try {
      e.stopImmediatePropagation();
      //$( this ).closest( `.prod__Item` ).click();
      
        const yotpoHTML = $(this).closest(`.prod__Item`).find(`.prod__Item__yotpo`).html();
        var phandle = $(this).parents(".prod__Item").attr("handle")
        const showPopup = async(popupHTML) => {
          //if (! $(`body`).hasClass(`set_Overlay`)) $(`body`).addClass(`set_Overlay`);

          const $bottom__popUp = $(`<div class="bottom__popUp">${ popupHTML }</div>`);
          const currentPID = $bottom__popUp.find(`.prod_relatedpopup`).attr(`pid`);
          const isColorsLoaded = $bottom__popUp.find( `.prod_relatedpopup` ).hasClass( `colorsLoaded` );
          $(".popup-product-data").html($bottom__popUp);

          setTimeout(() => {
            const getHandlePart = $(`popup-prod-list .bottom__popUp #hf_productStyle`).val();
            $(`popup-prod-list .bottom__popUp .yotpoPlaceHolder`).html(yotpoHTML);
            const isSelectedColor = $(`popup-prod-list .bottom__popUp .colorOption.selected`).length;
            if (isSelectedColor > 0) {
              $(`popup-prod-list .bottom__popUp .colorOption.selected`).click();
            } else {
              //document.querySelector(`popup-prod-list .bottom__popUp .colorOption`).click();
              document.querySelector(`popup-product-data .colorOption`).click();
              
            }
  
            console.log('click on color');
          }, 200);
        }

        let popUpHtml = null;
        
        const shirtStyle = $(this).attr("data-style");
        const pvariant = $(this).attr("data-variant");
          if (popUpHtml == null) {
            //const url = `/products/dtf-transfers?variant=${shirtStyle}`;
            var url = `${phandle}?view=get_popup_struc`;
            if(pvariant != ""){
              url = url + `&variant=` + encodeURIComponent(pvariant);
            }
            const containerElement = $("<div></div>")          
  
            const $bottom__popUpSpinner = $(`<div class="bottom__popUp"><div style="width:100%;text-align:center;padding-top:50px;"><img src="https://cdn.shopify.com/s/files/1/0558/0265/8899/files/Spinner.gif?v=1704387886" style="width:50px;"></div></div>`);
            $(`popup-main-screen`).addClass("prod").find(` .popup-product-data`).append($bottom__popUpSpinner);
            
            containerElement.load(url + ' .popupContent__content', async () => { 
              $bottom__popUpSpinner.remove();
              popUpHtml = $(".popupContent__content",containerElement).html();
              popUpHtmlCache[shirtStyle] = popUpHtml;
              await showPopup(popUpHtml);
              $(".popupContent__content").parents(".related-pdp-box").addClass("colorsLoaded");
            });           
          }
          else {
            await showPopup(popUpHtml);
          }
      

      
    } catch ( err ) {
      console.log( `ERROR popup-prod-list .prod__Item__triggerAction`, err.message );
    }
  })
  .on(`click`, `popup-prod-list .prod__Item`,async function( e ) {
    try {
      e.stopImmediatePropagation();

      const yotpoHTML = $(this)
        .find(`.prod__Item__yotpo`)
        .html();

      const getPopupHTML = $(this).find(`.prod__Item__popUp`).html();
      const currentPID = $(this)
        .find(`.prod__Item__popUp .relatedPopup`)
        .attr(`pid`);

      $(`.popup-product-data`).html(`${ getPopupHTML }`);

      const isColorsLoaded = $( this ).find( `.prod__Item__popUp .relatedPopup` ).hasClass( `colorsLoaded` );

      if ( isColorsLoaded == false ) {
        const getHandle = $( this ).find( `.prod__Item__popUp .relatedPopup` ).attr( `p-handle` );
        const getPID = $( this ).find( `.prod__Item__popUp .relatedPopup` ).attr( `pid` );
        let getColors = await getRequest(`/products/${ getHandle }?view=get_handle`);

        if ( typeof getColors !== 'undefined' && getColors && typeof getColors.colors !== 'undefined' && getColors.colors ) {
          // await addDelay( 50 );
          getColors.colors = getColors.colors.replaceAll( `loadVariantsPopup`, `loadVariantsPopup__upsell` );
          // console.log ( 'getColors', getColors );
          $( this ).find( `.prod__Item__popUp .relatedPopup .relatedPopup__content__variants .colorOptions` ).html( getColors.colors );

          if ( typeof getColors.colorsList !== 'undefined' && getColors.colorsList.length > 0 ) {
            sortColors__upsellPopup( getPID, getColors.colorsList );
            $( this ).find( `.prod__Item__popUp .relatedPopup` ).addClass( `colorsLoaded` );
          }

          const prodCardHTML = $( this ).find( `.prod__Item__popUp .relatedPopup .relatedPopup__content__variants .colorOptions` ).html();
          $( `.popup-product-data .relatedPopup__content__variants .colorOptions` ).html( prodCardHTML );
          $( `.popup-product-data .relatedPopup` ).addClass( `colorsLoaded` );
        }
      }

      const getHandlePart = $(`.popup-product-data #hf_productStyle`).val();
      $(`.popup-product-data .yotpoPlaceHolder`).html( yotpoHTML );
      console.log($(`.popup-product-data .colorOption.selected`))
      $( `popup-main-screen` ).removeClass( `main` ).addClass( `prod` );

      await addDelay( 200 );
      $( `.popup-product-data .relatedPopup > go-back-btn .setTop` ).focus();
    } catch ( err ) {
      console.log( `ERROR popup-prod-list .prod__Item`, err.message );
    }
  })
  .on(`click`, `popup-main-screen popup-prod-list .slick-prevCustom`, function( e ) {
    try {
      e.stopImmediatePropagation();
      $( this ).closest( `popup-prod-list` ).find( `.slick-prev.slick-arrow` ).click();
    } catch ( err ) {
      console.log( `ERROR popup-main-screen popup-prod-list .slick-prevCustom`, err.message );
    }
  })
  .on(`click`, `popup-main-screen popup-collection-data popup-prod-list .slick-arrow`,async function( e ) {
    try {
      e.stopImmediatePropagation();
      await addDelay( 50 );
      __slickSlideChange();
    } catch ( err ) {
      console.log( `ERROR popup-main-screen popup-collection-data popup-prod-list .slick-arrow`, err.message );
    }
  })
  .on(`click`, `.addToCartThenCheckout`,async function( e ) {
    try {
      e.stopImmediatePropagation();
      if ( typeof addToCartPopup_upsell === 'function' ) {
        const items = [];
        $('.popup-product-data input.itemQuantity').each(function () {
          const quantity = parseInt($(this).val());
          const vid = $(this).attr(`data-id`) * 1;
          const color = $(this)
            .closest(`.relatedPopup__content__variants`)
            .find(`.colorOptions .colorOption .colorButton.selected`)
            .attr(`title`);

          if (quantity > 0) {
            items.push({
              id: vid,
              quantity: quantity,
              properties: {
                Color: `${color}`,
              },
            });
          }
        });
        if ( items.length > 0 ) {
          await addToCartPopup_upsell();
          location.href = `/checkout`;
        } else {
          location.href = `/checkout`;
        }
      }
    } catch ( err ) {
      console.log( `ERROR .addToCartThenCheckout`, err.message );
    }
  })
  ;

  $( document )
  .mouseup(function( e ) {
    try {
      const container = $( `upsell-popup .upsell__popUp.active` );
      if ( !container.is( e.target ) && container.has( e.target ).length === 0 ) {
        if ( $( `upsell-popup .upsell__popUp.active` ).length > 0 ) {
          $( `upsell-popup .upsell__popUp__close` ).click();
        }
      }
    } catch ( err ) {
      console.log( `ERROR `, err.message );
    }
  });

  function __slickSlideChange() {
    try {
      const isDisabled = $( `popup-prod-list .slick-prev.slick-arrow` ).hasClass( `slick-disabled` );
      if ( isDisabled ) {
        $( `popup-main-screen popup-prod-list .slick-prevCustom` ).addClass( `slick-disabled` );
      } else {
        $( `popup-main-screen popup-prod-list .slick-prevCustom` ).removeClass( `slick-disabled` );
      }
    } catch ( err ) {
      console.log( `ERROR __slickSlideChange()`, err.message );
    }
  }
  async function loadVariantsPopup__upsell(this_, color, productHandle) {
    try {
      const main = $(this_).closest(`.relatedPopup__content__variants`);
      const currentPID = $(this_).closest(`.relatedPopup`).attr(`pid`);

      const makeURL = `/pages/popup-blanks-pdp-helper?variant=${encodeURIComponent(color)}_0_${productHandle}`;
      console.log('makeURL', makeURL);

      const getData = await getRequest(`${makeURL}`);
      if (typeof getData !== 'undefined' && getData) {
        // console.log('getData', getData);
        if ( typeof getData.sizes !== 'undefined' && getData.sizes ) {
          main.find(`.variantsData`).html( getData.sizes );
        }

        const makeVarforMainImg = window[`swiperMain_${currentPID}`];

        let swiperMain = makeVarforMainImg;

        swiperMain = new Swiper(`.popup-product-data .main-slider[pid="${currentPID}"]`, {
          spaceBetween: 10,
          pagination: {
            clickable: true
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
          }
        });

        if (typeof getData.mainImgs !== 'undefined' && getData.mainImgs) {
          const getAvailableLength = $(
            `.popup-product-data .swiper-container.main-slider .swiper-wrapper .swiper-slide`
          ).length;
          for (let i = 0; i < getAvailableLength; i++) {
            swiperMain.removeSlide($(`.popup-product-data .main-slider[pid="${currentPID}"]`).length - 1);
          }
          getData.mainImgs.forEach((o) => {
            swiperMain.appendSlide(o.slide);
          });
        }
      }

      const getBtnStyles = $(this_).find(`.colorButton`).attr(`style`);

      main.find(`.selectedColor .style-name`).text(color);
      main.find(`.selectedColor [type="button"]`).attr(`style`, getBtnStyles);

      main.find(`.colorOptions .colorOption .colorButton`).removeClass(`selected `);

      $(this_).find(`.colorButton`).addClass(`selected`);
    } catch (err) {
      console.log(`ERROR loadVariantsPopup( this_, color, productHandle )`, err.message);
    }
  }

  function removeReviewWord() {
    try {
      $( `popup-collection-data yotpo-data-to-collect .yotpo___item` ).each(function() {
        let getReviewText = $( this ).find( `.yotpo-sr-bottom-line-summary .yotpo-sr-bottom-line-text.yotpo-sr-bottom-line-text--right-panel` ).text().trim();
        getReviewText = getReviewText.replace( ' ', '' );
        getReviewText = getReviewText.replace( 'Reviews', '' );
        getReviewText = getReviewText.replace( 'Review', '' );
        $( this ).find( `.yotpo-sr-bottom-line-summary .yotpo-sr-bottom-line-text.yotpo-sr-bottom-line-text--right-panel` ).text( getReviewText );
        const pidForYotpo = $( this ).attr( `pid` );
        const getYotpoHTML = $( this ).html();

        $( `popup-prod-list .prod__Item[pid="${ pidForYotpo }"] .prod__Item__yotpo` ).html( getYotpoHTML );
      })
      $( `popup-collection-data yotpo-data-to-collect` ).remove();
    } catch ( err ) {
      console.log( `ERROR removeReviewWord()`, err.message );
    }
  }

  function sortColors__upsellPopup ( pid='', colorsArr ) {
    const colorOptionElements = {};
    let colorSelector
    if ( pid != '' ) {
      colorSelector = `.underCTA .pdpRelatedProducts__pList .pdpRelatedProducts__pItem .relatedPopup[pid="${ pid }"] .colorOptions .colorOption`;
    }
    // console.log ( 'colorSelector', $( colorSelector ) );
    $( colorSelector ).each(function () {
      const $el = $(this);
      const colorHex = $el.attr("data-color");
      let elArr = colorOptionElements[colorHex];
      if (elArr == null) {
        elArr = [];
        colorOptionElements[colorHex] = elArr;
      }
      elArr.push($el.detach());
    })
    // console.log ( 'colorOptionElements', colorOptionElements );
    const sortedColors = getSortedColors__upsellPopup( colorsArr );
    // console.log ( 'sortedColorssortedColors', sortedColors.length );
    sortedColors.forEach((color) => {
      const elArr = colorOptionElements[color.hex];
      if (elArr) {
        elArr.forEach(($el) => {
          $( `.underCTA .pdpRelatedProducts__pList .pdpRelatedProducts__pItem .relatedPopup[pid="${ pid }"] .colorOptions` ).append($el);
        })
      }
    })
  }

  function getSortedColors__upsellPopup( colorsArr ) {
    let colorGroups = {
      grayscale: [],
      red: [],
      orange: [],
      yellow: [],
      green: [],
      cyan: [],
      blue: [],
      violet: [],
      magenta: [],
      other: [],
    };

    colorsArr.forEach((color) => {
      const [hue, saturation] = hsl__(color.hex);
      let colorCategory = findColorRange__( hue );
      if ( isGrayscale__( saturation ) ) {
        colorCategory = "grayscale";
      }
      colorGroups[colorCategory].push(color);
    });
    // console.log ( 'colorGroups', colorGroups );
    return Object.values(colorGroups).flatMap((colorGroup) => {
      // Sort colors by lightness - lightest first, darkest last
      return colorGroup.sort((a, b) => {
        const [_aHue, _aSaturation, aLightness] = hsl__(a.hex);
        const [_bHue, _bSaturation, bLightness] = hsl__(b.hex);
        return bLightness - aLightness;
      });
    });
  }
  if ( typeof saturationThreshold == 'undefined' ) {
    var saturationThreshold = 0.2; // 20% saturation
  }
  function isGrayscale__(saturation) {
    return saturation < saturationThreshold;
  }
  function hsl__ (hex) {
    try {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

      var r = parseInt(result[1], 16);
      var g = parseInt(result[2], 16);
      var b = parseInt(result[3], 16);

      r /= 255, g /= 255, b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;

      if(max == min){
          h = s = 0; // achromatic
      } else {
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch(max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
      }

      s = s*100;
      s = Math.round(s);
      l = l*100;
      l = Math.round(l);
      h = Math.round(360*h);
      return [h,s,l];
    }
    catch {
      return [0,0,0];
    }
  }
  const hueRanges__ = new Map([
    [[330, 360], "red"],
    [[0, 16], "red"],
    [[16, 42], "orange"],
    [[42, 65], "yellow"],
    [[65, 165], "green"],
    [[165, 190], "cyan"],
    [[190, 255], "blue"],
    [[255, 295], "violet"],
    [[295, 330], "magenta"],
  ]);
  function findColorRange__(hue) {
    for (let [[bottomHue, topHue], color] of hueRanges__.entries()) {
      if (hue >= bottomHue && hue <= topHue) {
        return color;
      }
    }
    return "other";
  }
  async function addToCartPopup_upsell() {
    const items = [];
    $('.popup-product-data input.itemQuantity').each(function () {
      const quantity = parseInt($(this).val());
      const vid = $(this).attr(`data-id`) * 1;
      const color = $(this)
        .closest(`.relatedPopup__content__variants`)
        .find(`.colorOptions .colorOption .colorButton.selected`)
        .attr(`title`);

      if (quantity > 0) {
        items.push({
          id: vid,
          quantity: quantity,
          properties: {
            Color: `${color}`,
          },
        });
      }
    });

    if (items.length > 0) {
      $(`.popup-product-data .addToCartSection span.button`).addClass(`working`);
      $(`.popup-product-data .errorMessages`).hide();
      console.log('lineItems +++', items);

      await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      })
        .then((response) => {
          return response.json();
        })
        .catch((error) => {
          console.error('Error:', error);
        });

      refreshCart( `notOpen` );

      setTimeout(() => {
        $(`.popup-product-data .addToCartSection span.button`).removeClass(`working`);
        const isToast = $( `upsell-popup .upsell__popUp .toast` ).length;
        if ( isToast > 0 ) {
          $( `upsell-popup .upsell__popUp .toast` ).addClass( `active` );

          setTimeout(() => {
            $( `upsell-popup .upsell__popUp .toast` ).removeClass( `active` );
          }, 5000);
        } else {
          $( `upsell-popup .upsell__popUp` )
            .prepend( `
              <div class="toast">
                <div class="toast-content">
                  <svg  class="fas fa-solid fa-check check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 22l-10-10.598 2.798-2.859 7.149 7.473 13.144-14.016 2.909 2.806z"/></svg>
                    <div class="message">
                    <span class="text text-1">Added</span>
                    <span class="text text-2">Product successfully added to your cart</span>
                  </div>
                </div>
                <svg class="fa-solid fa-xmark close" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18" stroke="#000" stroke-linecap="round"></path><path d="M18 6L6.00001 18" stroke="#000" stroke-linecap="round"></path></svg>

                <!-- Remove 'active' class, this is just to show in Codepen thumbnail -->
                <div class="progress active"></div>
              </div>
              ` );

              setTimeout(() => {
                $( `upsell-popup .upsell__popUp .toast` ).addClass( `active` );
              }, 50);

          setTimeout(() => {
            $( `upsell-popup .upsell__popUp .toast` ).removeClass( `active` );
            setTimeout(() => {
              $( `upsell-popup .upsell__popUp .toast` ).remove();
            }, 100);
          }, 5000);
        }
      }, 300);
    } else {
      $(`.popup-product-data .errorMessages`).show();
    }

    $( `.popup-product-data input.itemQuantity` ).val( '' );
  }


  

  async function addToCartPopup() {
    const items = [];
    $('popup-product-data input.itemQuantity').each(function () {
      const quantity = parseInt($(this).val());
      const vid = $(this).attr(`data-id`) * 1;
      const color = $(this)
        .closest(`.relatedPopup__content__variants`)
        .find(`.colorOptions .colorOption .colorButton.selected`)
        .attr(`title`);

      if (quantity > 0) {
        items.push({
          id: vid,
          quantity: quantity,
          properties: {
            Color: `${color}`,
          },
        });
      }
    });

    if (items.length > 0) {
      $(`popup-product-data .addToCartSection span.button`).addClass(`working`);
      $(`popup-product-data .errorMessages`).hide();
      console.log('lineItems +++', items);

      await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      })
        .then((response) => {
          return response.json();
        })
        .catch((error) => {
          console.error('Error:', error);
        });

      refreshCart( `notOpen` );

      setTimeout(() => {
        $(`popup-product-data .addToCartSection span.button`).removeClass(`working`);
        const isToast = $( `.bottom__popUp .toast` ).length;
        if ( isToast > 0 ) {
          $( `.bottom__popUp .toast` ).addClass( `active` );

          setTimeout(() => {
            $( `.bottom__popUp .toast` ).removeClass( `active` );
          }, 5000);
        } else {
          $( `.bottom__popUp` )
            .append( `
              <div class="toast">
                <div class="toast-content">
                  <svg  class="fas fa-solid fa-check check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 22l-10-10.598 2.798-2.859 7.149 7.473 13.144-14.016 2.909 2.806z"/></svg>
                    <div class="message">
                    <span class="text text-1">Added</span>
                    <span class="text text-2">Product successfully added to your cart</span>
                  </div>
                </div>
                <svg class="fa-solid fa-xmark close" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18" stroke="#000" stroke-linecap="round"></path><path d="M18 6L6.00001 18" stroke="#000" stroke-linecap="round"></path></svg>

                <!-- Remove 'active' class, this is just to show in Codepen thumbnail -->
                <div class="progress active"></div>
              </div>
              ` );

              setTimeout(() => {
                $( `.bottom__popUp .toast` ).addClass( `active` );
              }, 50);

          setTimeout(() => {
            $( `.bottom__popUp .toast` ).removeClass( `active` );
            setTimeout(() => {
              $( `.bottom__popUp .toast` ).remove();
            }, 100);
          }, 5000);
        }
      }, 300);
    } else {
      $(`popup-product-data .errorMessages`).show();
    }

    $( `popup-product-data input.itemQuantity` ).val( '' );
  }

  async function loadVariantsPopup(this_, color, productHandle) {
    try {
      const main = $(this_).closest(`.relatedPopup__content__variants`);
      const currentPID = $(this_).closest(`.relatedPopup`).attr(`pid`);

      //const makeURL = `/pages/popup-blanks-pdp-helper?variant=${encodeURIComponent(color)}_0_${productHandle}`;
      const makeURL = `/products/${productHandle}?view=get_handle&variant=${encodeURIComponent(color)}`;
      console.log('makeURL', makeURL);

      const getData = await getRequest(`${makeURL}`);
      if (typeof getData !== 'undefined' && getData) {
        console.log('getData', getData);
        if (typeof getData.sizes !== 'undefined' && getData.sizes) {
          main.find(`.variantsData`).html(getData.sizes);
        }

        $(this_).closest(`.relatedPopup`).addClass("colorsLoaded");
        const makeVarforMainImg = window[`swiperMain_${currentPID}`];
        // const makeVarforThumbImg = window[`swiperThumbs_${ currentPID }`];

        // let thumb = makeVarforThumbImg;
        let swiperMain = makeVarforMainImg;

        // thumb = new Swiper( `.bottom__popUp .swiper-container-thumbs[pid="${ currentPID }"]`, {
        //   spaceBetween: 10,
        //   slidesPerView: 4,
        //   freeMode: true,
        //   watchSlidesVisibility: true,
        //   watchSlidesProgress: true,
        // });

        swiperMain = new Swiper(`.bottom__popUp .main-slider[pid="${currentPID}"]`, {
          spaceBetween: 10,
          pagination: {
            clickable: true
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
          }
          // thumbs: {
          //   swiper: thumb
          // },
        });

        if (typeof getData.mainImgs !== 'undefined' && getData.mainImgs) {
          const getAvailableLength = $(
            `.bottom__popUp .swiper-container.main-slider .swiper-wrapper .swiper-slide`
          ).length;
          for (let i = 0; i < getAvailableLength; i++) {
            swiperMain.removeSlide($(`.bottom__popUp .main-slider[pid="${currentPID}"]`).length - 1);
            // thumb.removeSlide($( `.bottom__popUp .swiper-container-thumbs[pid="${ currentPID }"]` ).length-1);
          }
          getData.mainImgs.forEach((o) => {
            swiperMain.appendSlide(o.slide);
          });

          // getData.thumbnails.forEach(o => {
          //   thumb.appendSlide( o.slide );
          // });
          // main.find( `.variantsData` ).html( getData.sizes );
        }
      }

      const getBtnStyles = $(this_).find(`.colorButton`).attr(`style`);

      main.find(`.selectedColor .style-name`).text(color);
      main.find(`.selectedColor [type="button"]`).attr(`style`, getBtnStyles);

      main.find(`.colorOptions .colorOption .colorButton`).removeClass(`selected `);

      $(this_).find(`.colorButton`).addClass(`selected`);
    } catch (err) {
      console.log(`ERROR loadVariantsPopup( this_, color, productHandle )`, err.message);
    }
  }