let ratio_width   =   0;
let ratio_height  =   0;
let file_width_global = 0;
let file_height_global = 0;
let uploadedFileWidth = 0;
let uploadedFileHeight = 0;
currentSelectedOption = 'custom';
selectedItemNo = 1;
anotherTransfer = false;
let customItemHTML = '';
let popularItemHTML = '';
var onePercentOfPreview = 11.36363636363636;
let isReadyToPress = false;
let anotherPuff = false;
let definedMinQty = 1;
let isAIImage = false;
let isFileUpload = false;
let beforeUpScale__Width = 0;
let beforeUpScale__height = 0;
if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
  definedMinQty = 10;
} else if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
  definedMinQty = 6;
} else if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct ) {
  definedMinQty = 100;
} else if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct && typeof definedQty__metafield !== 'undefined' && definedQty__metafield ) {
  definedMinQty = definedQty__metafield;
}
let keyUpTimeOut = null;
const filePreview = $( `file-preview` );

const apiURL = `https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production`;
const ninjaImgixHost = `ninjauploads-production.imgix.net`;
const ninjaS3Host2 = `ninja-services-production-ninjauploadss3bucket-zks2mguobhe4.s3.amazonaws.com`;
const ninjaS3Host = `ninjauploads-production.imgix.net`;

const uploadArea = document.querySelector('#uploadArea')

// Select Drop-Zoon Area
const dropZoon = document.querySelector('#dropZoon');

// Loading Text
const loadingText = document.querySelector('#loadingText');

// Slect File Input
const fileInput = document.querySelector('#fileInput');

// Select Preview Image
const previewImage = document.querySelector('#previewImage');

// File-Details Area
const fileDetails = document.querySelector('#fileDetails');

// Uploaded File
const uploadedFile = document.querySelector('#uploadedFile');

// Uploaded File Info
const uploadedFileInfo = document.querySelector('#uploadedFileInfo');

// Uploaded File  Name
const uploadedFileName = document.querySelector('.uploaded-file__name');

// Uploaded File Icon
const uploadedFileIconText = document.querySelector('.uploaded-file__icon-text');

// Uploaded File Counter
const uploadedFileCounter = document.querySelector('.uploaded-file__counter');

// ToolTip Data
const toolTipData = document.querySelector('.upload-area__tooltip-data')??"";

let isGangPage = false;
let isDTFPage = false;
let isDTFPage__uv = false;
if(document.body.classList.contains("template-product-dtf-gang-sheet") || document.body.classList.contains("template-product-uv-gang-sheet"))
  isGangPage = true;

if(document.body.classList.contains("is-dtf-page")) {
  isDTFPage = true;
  const hasUV = Array.from(document.body.classList).some(cls => cls.includes('uv'));
  if (hasUV) {
    console.log ( 'hasUV', hasUV );
    isDTFPage__uv = true;
  }
}

var imagesTypes = ["image/png","image/jpg","image/jpeg","image/tiff","application/pdf","image/vnd.adobe.photoshop","application/postscript","application/vnd.adobe.photoshop","application/x-photoshop","application/photoshop","image/svg+xml"];

// Images Types
if ( isGangPage ) {
  imagesTypes = ["image/png","application/pdf","application/postscript"];
}
var toast = document.querySelector(".toast");
const closeIcon = document.querySelector(".toast .close");
const progress = document.querySelector(".toast .progress");

let timer1, timer2;

function getImageDimensions(url, callback) {
  const img = new Image();
  img.onload = function() {
    const dimensions = {
        width: img.width,
        height: img.height
    };
    callback(dimensions);
  };
  img.onerror = function() {
    callback(null, 'Failed to load image.');
  };
  img.src = url;
}

$( document )
.ready(function() {

  $('[data-block="appendtobottom"]').each(function() {
    var _cpopup = $(this);
    $("body").append(_cpopup.clone(true));
    _cpopup.remove();
  })
})

// PLUS MINUS QUANTITY START
.on(`click`, `.customQtyFile__wrapper__minus`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    const main  =   $( this ).closest( `.customQtyFile__wrapper` );
    let qty     =   main.find( `.customQtyFile__qty` ).val() * 1;
    if ( qty > 1 ) {
      qty--;
      const winScreen = $( window ).width();
      if ( winScreen > 550 ) {
        main.find( `.customQtyFile__qty` ).val( qty ).focus();
      } else {
        main.find( `.customQtyFile__qty` ).val( qty );
      }
    }
    manageQuantities();
  } catch ( err ) {
    console.log( `ERROR .customQtyFile__wrapper__minus`, err.message );
  }
})

.on(`click`, `.customQtyFile__wrapper__plus`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    const main = $( this ).closest( `.customQtyFile__wrapper` );
    let qty     =   main.find( `.customQtyFile__qty` ).val() * 1;
    qty++;
    const winScreen = $( window ).width();
    if ( winScreen > 550 ) {
      main.find( `.customQtyFile__qty` ).val( qty ).focus();
    } else {
      main.find( `.customQtyFile__qty` ).val( qty );
    }
    manageQuantities();
  } catch ( err ) {
    console.log( `ERROR .customQtyFile__wrapper__plus`, err.message );
  }
})
  
.on(`keyup`, `#precutselected__`, function( e ) {
})

.on(`keyup`, `.customQtyFile__qty`, function( e ) {
  try {
    e.stopImmediatePropagation();
    clearTimeout( keyUpTimeOut );
    keyUpTimeOut = setTimeout(() => {
      const isSizesBlock = $( `sizes-blocks` ).length;
      if ( isSizesBlock > 0 ) {
        selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );

        const isPopularEle = $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` );
        let selectedRowTitle = $( this ).closest( `.widthHeight__custom[item]` ).attr( `title` );
        let selectedVariant = $( this ).closest( `.widthHeight__custom[item]` ).attr( `vid` ) * 1;
        let precutSelected = false;
        if ( typeof isPopularEle !== 'undefined' && isPopularEle == 'popular' && typeof selectedRowTitle !== 'undefined' && selectedRowTitle ) {
          if ( typeof precutOptionAvailable !== 'undefined' && precutOptionAvailable ) {
            precutSelected = $( `#precutselected__` ).is( `:checked` );
            selectedVariant = $( this ).closest( `.widthHeight__custom[item]` ).attr( `precut-vid` ) * 1;
          }
          selectedVariant = findObjectByKey( allVariants, `id`, selectedVariant );
        }

        const getVal = $( this ).val() * 1;
        var pattern = /^[0-9]+$/; // Pattern: only numbers
        if ( pattern.test( getVal ) ) {
          if ( getVal < definedMinQty ) {
            $( this ).val( definedMinQty ).addClass( `error` );
            if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
              manageQuantities('', selectedVariant);
            }
          } else {
            $( this ).removeClass( `error` );
            manageQuantities('', selectedVariant);
          }
        } else {
          $( this ).val( definedMinQty ).addClass( `error` );
        }
      } else {
        manageQuantities();
      }
      setTimeout(() => {
        $( this ).removeClass( `error` );
      }, 1500);
    }, 500);
  } catch ( err ) {
    console.log( `ERROR .customQtyFile__qty`, err.message );
  }
})

// PLUS MINUS QUANTITY END

.on(`click`, `product-variants .product-variant .product-variant__item.product-variant__item--radio`, function( e ) {
  try {
    e.stopImmediatePropagation();
    setTimeout(()=>{
      const vid = $( `[name="id"]` ).val() * 1;
      if ( typeof customTabelManage === 'function' ) {
        customTabelManage( vid, 'applyImg' );
      }
    }, 300);
  } catch ( err ) {
    console.log( `ERROR product-variants .product-variant .product-variant__item.product-variant__item--radio`, err.message );
  }
})
.on(`click`, `product-variants .product-variant .product-variant__container[option="1"] .product-variant__item.product-variant__item--radio label`, function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( isGangPage ) {
      checkSelectedSizeAndApply( this );
    }
  } catch ( err ) {
    console.log( `ERROR product-variants .product-variant .product-variant__item.product-variant__item--radio`, err.message );
  }
})
.on(`change`, `product-variants .product-variant .product-variant__item.product-variant__item--radio .product-variant__input`, function( e ) {
  try {
    e.stopImmediatePropagation();
    let typeIs = $( this ).closest( `.product-variant__item.product-variant__item--radio` ).attr( `min` );
    let takeWidth, takeheight;
    if ( typeof typeIs !== 'undefined' && typeIs ) {
      typeIs = 'custom';
    } else if ( typeof typeIs !== 'undefined' && typeIs == '' ) {
      typeIs = 'popular';
      let takeVal = $( this ).val();
      takeVal = takeVal.replaceAll( `"`, `` );
      takeVal = takeVal.replaceAll( ` `, `` );
      takeVal = takeVal.toLowerCase();
      if ( takeVal.includes( `x` ) ) {
        takeWidth = takeVal.split( `x` )[0] * 1;
        takeheight = takeVal.split( `x` )[1] * 1;
        calculateDPI( 'popular' );
      }
    } else {
      typeIs = 'notBySize';
    }
  } catch ( err ) {
    console.log( `ERROR product-variants .product-variant .product-variant__item.product-variant__item--radio .product-variant__input`, err.message );
  }
})


.on(`click`, `.customVariants .viewAllVariants a`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const isShowAllAvailable = $( this ).closest( `.customVariants` ).hasClass( `showAll` );
    // console.log ( 'isShowAllAvailable', isShowAllAvailable );
    if ( isShowAllAvailable ) {
      $( this )
        .closest( `.customVariants` )
        .find( `[visible]` )
        .attr( `visible`, 'hide' );
      $( this )
        .closest( `.customVariants` )
        .removeClass( `showAll` );
      $( this )
        .text( viewAllText );
    } else {
      $( this )
        .closest( `.customVariants` )
        .find( `[visible="hide"]` )
        .attr( `visible`, '' );
      $( this )
        .closest( `.customVariants` )
        .addClass( `showAll` );
      $( this )
        .text( viewLessText );
    }
    setTimeout(()=>{
      const vid = $( `[name="id"]` ).val() * 1;
      if ( typeof customTabelManage === 'function' ) {
        customTabelManage( vid, 'applyImg' );
      }
    }, 300);
  } catch ( err ) {
    console.log( `ERROR .customVariants .viewAllVariants a`, err.message );
  }
})

.on(`click`, `.customVariant`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const modal     =   $( `.customVariant__modal` );
    const isActive  =   modal.hasClass( `active` );
    if ( isActive ) {
      modal.removeClass( `active` );
    } else {
      modal
        .find( `.customVariant__modal__centerCenter input[type="radio"], .customVariant__modal__centerCenter input[type="radio"] .visually-hidden` )
        .remove();
      modal.addClass( `active` );
    }
  } catch ( err ) {
    console.log( `ERROR .customVariant`, err.message );
  }
})

.on(`click`, `.customVariant__modal__close`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this ).closest( `.customVariant__modal` ).removeClass( `active` );
  } catch ( err ) {
    console.log( `ERROR .customVariant__modal__close`, err.message );
  }
})

.on(`click`, `.customQtyFile .customQtyFile__upload`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    const newUploadField_available    =   $( `.customUploaderWrapper__upload` ).length;
    if ( newUploadField_available == 0 ) {
      const uploadFieldId             =   $( `.filepond--browser` ).attr( `id` );
      $( `.filepond--browser` )
        .attr( `title`, `` )
        .wrap( `<div class="customUploaderWrapper__upload hidden"></div>` );
    }
    await manageSteps( 1, 2 );
    await setSteps( 2, 1 );

    uploaderDataManage();

    $( `html, body` ).animate({
      scrollTop: $( `.customStep2_upload` ).offset().top
    }, 1000);

    setTimeout(()=>{
      const fileVal = $( `input[name="properties[Upload (Vector Files Preferred)]"]` ).length;

      if ( fileVal > 0 ) {
        $( `.customUploaderWrapper__upload` ).addClass( `hidden` );
        $( `product-form.product-form, .uploaderFooterNote, .designerNote` ).show();

        $( `.uploaderFooterNoteSimpleLine` )
          .addClass( `hidden` );

        $( `.color-background-1.gradient` ).removeClass( `adjustHeight` );
      } else {
        $( `product-form.product-form, .uploaderFooterNote, .designerNote` ).hide();
        $( `.customUploaderWrapper__upload` ).removeClass( `hidden` );
        $( `.color-background-1.gradient` ).addClass( `adjustHeight` );
      }
    }, 1000);
  } catch ( err ) {
    console.log( `ERROR .customQtyFile .customQtyFile__upload`, err.message );
  }
})

.on(`change`, `.filepond--browser`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `.customUploaderWrapper__upload` ).addClass( `hidden` );
    $( `.color-background-1.gradient` ).removeClass( `adjustHeight` );
    $( `.fileUploading_inprocess` ).addClass( `active` );
  } catch ( err ) {
    console.log( `ERROR .filepond--browser`, err.message );
  }
})

.on(`click`, `back-btn`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this )
      .closest( `.product` )
      .removeClass( `changeLayout` );
    $( `.step__2` )
      .addClass( `hidden` );

    $( `[item-show-on]` ).addClass( `hidden` );
    $( `[item-show-on="afterUpload"]` ).removeClass( `hidden` );
    // $( `.customTabelPlace__item.selected` ).removeClass( `selected` );
  } catch ( err ) {
    console.log( `ERROR back-btn`, err.message );
  }
})
.on(`click`, `variant-radios .js.product-form__input label`, function( e ) {
  try {
    e.stopImmediatePropagation();
    setTimeout(()=>{
      const vid = $( `[name="id"]` ).val() * 1;
      if ( typeof customTabelManage === 'function' ) {
        customTabelManage( vid, 'applyImg' );
      }
    }, 300);
  } catch ( err ) {
    console.log( `ERROR variant-radios .js product-form__input label`, err.message );
  }
})
.on(`click`, `.customPrecut__fieldset label`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this )
      .closest( `.customPrecut__fieldset` )
      .find( `label` )
      .removeClass( `selectedOption` );

    $( this )
      .addClass( `selectedOption` );

    setTimeout(()=>{
      const vid = $( `[name="id"]` ).val() * 1;
      if ( typeof customTabelManage === 'function' ) {
        // customTabelManage( vid, 'applyImg' );
      }
    }, 300);
  } catch ( err ) {
    console.log( `ERROR .customPrecut__fieldset label`, err.message );
  }
})
.on(`keyup`, `[name="properties[Design Notes]"]`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const designNote            =   $( this ).val();
    const isDesignNoteAvailable =   $( `product-form.product-form form textarea[name="properties[Design Notes]"]` ).length;
    if ( isDesignNoteAvailable > 0 ) {
      $( `product-form.product-form form textarea[name="properties[Design Notes]"]` ).val( designNote );
    } else {
      $( `product-form.product-form form` )
        .append( `
          <textarea name="properties[Design Notes]" style="display: none;">${ designNote }</textarea>
        ` );
    }
  } catch ( err ) {
    console.log( `ERROR [name="properties[Design Notes]"]`, err.message );
  }
})
.on(`click`, `.uploaderStep2FooterBtn`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const qty = $( `[name="quantity"]` ).val();
    const vid = $( `[name="id"]` ).val();
    const getFile = $( `[name="properties[Upload (Vector Files Preferred)]"]` ).val();
    const fileName = $( `.filepond--list-scroller .filepond--list .filepond--item .filepond--file-wrapper legend` ).text().trim();
    $( `.shopify-block.shopify-app-block [data-upload-field]` )
      .hide()
      .after( `
        <div class="afterUploadAdd2Cart">
          File<br>
          <ul class="afterUploadAdd2Cart__files ${ fileName == '' ? 'hidden' : '' }">
            <li class="afterUploadAdd2Cart__filesItem">
              <div class="text__">
                ${ fileName }
              </div>
              <div class="del__">
                <svg enable-background="new 0 0 32 32" id="Glyph" version="1.1" viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M6,12v15c0,1.654,1.346,3,3,3h14c1.654,0,3-1.346,3-3V12H6z M12,25c0,0.552-0.448,1-1,1s-1-0.448-1-1v-9  c0-0.552,0.448-1,1-1s1,0.448,1,1V25z M17,25c0,0.552-0.448,1-1,1s-1-0.448-1-1v-9c0-0.552,0.448-1,1-1s1,0.448,1,1V25z M22,25  c0,0.552-0.448,1-1,1s-1-0.448-1-1v-9c0-0.552,0.448-1,1-1s1,0.448,1,1V25z" id="XMLID_237_"/><path d="M27,6h-6V5c0-1.654-1.346-3-3-3h-4c-1.654,0-3,1.346-3,3v1H5C3.897,6,3,6.897,3,8v1c0,0.552,0.448,1,1,1h24  c0.552,0,1-0.448,1-1V8C29,6.897,28.103,6,27,6z M13,5c0-0.551,0.449-1,1-1h4c0.551,0,1,0.449,1,1v1h-6V5z" id="XMLID_243_"/></svg>
              </div>
            </li>
          </ul>
          <form action="/cart/add">
            <div class="afterUploadAdd2Cart__noteWrap">
              Leave a note for designer<br>
              <textarea name="note" class="afterUploadAdd2Cart__note" placeholder="Hint text"></textarea>
            </div>
            <input type="hidden" name="quantity" value="${ qty }">
            <input type="hidden" name="id" value="${ vid }">
            <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${ getFile }">
            <input type="hidden" name="properties[_Original Image]" value="${ getFile.split("?")[0]}">

            <button class="afterUploadAdd2Cart__btn">
              Add to cart
            </button>
          </form>
        </div>
      ` );
    manageSteps( 2, 3 );
    $( `.customStep2_upload back-btn` )
      .attr({
        "show-step": 2,
        "hide-step": 3
      });
  } catch ( err ) {
    console.log( `ERROR .uploaderStep2FooterBtn`, err.message );
  }
})
.on(`click`, `.afterUploadAdd2Cart__filesItem .del__`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `.filepond--list-scroller .filepond--list .filepond--item .filepond--file-wrapper .filepond--file-action-button.filepond--action-remove-item` ).click();
    $( this )
      .closest( `.afterUploadAdd2Cart__files` )
      .remove();
    $( `.uploaderStep2FooterBtn` ).remove();
    $( `[name="properties[Upload (Vector Files Preferred)]"]` ).val( '' );
    $( `[name="properties[_Original Image]"]` ).val( '' );
    $( `.customQtyFile__upload` ).click();
    $( `.afterUploadAdd2Cart` ).remove();
  } catch ( err ) {
    console.log( `ERROR .afterUploadAdd2Cart__filesItem .del__`, err.message );
  }
})
.on(`click`, `.step__1 .goToNextStep`,async function( e ) {
  try {
    e.stopImmediatePropagation();

    $( `.step__2` ).addClass( `loader` );

    $( `product-form button.add-to-cart[data-js-product-add-to-cart] .button__text` )
      .text( KROWN.settings.locales.products_add_to_cart_button );
    if ( isGangPage == false ) {

      if ( typeof file_height === 'undefined' ) {
        await getMeta(uploadedFile, (err, img) => {
          if(typeof img == "undefined"){
            file_width  =   file_width_global;
            file_height =    file_height_global;
          } else {
            file_width  =   img.naturalWidth;
            file_height =   img.naturalHeight;
          }
          if ( $( `sizes-block` ).length > 0 ) {
            $( `sizes-block [name="height__value"]` )
            .val( `${ (file_height / 300).toFixed(2) }` );
            $( `sizes-block [name="width__value"]` )
              .val( `${ (file_width / 300).toFixed(2) }` );
          } else {
            $( `.widthHeight__block [name="height__value"]` )
              .val( `${ (file_height / 300).toFixed(2) }` );
            $( `.widthHeight__block [name="width__value"]` )
              .val( `${ (file_width / 300).toFixed(2) }` );
          }
        });
        await ApplyDelay( 500 );
      }

      $( this )
        .closest( `.product` )
        .addClass( `changeLayout` );

      $(".customTabelPlace__item:first").addClass("selected");
      const height  = file_height / 300;
      const width   = file_width / 300;


      setTimeout(() => {
        $( `.step__2` )
          .removeClass( `hidden` );
      }, 100);
      $( `[item-show-on]` )
        .addClass( `hidden` );

      $( `[item-show-on="finalStep"], [item-show-on="onAll"]` )
        .removeClass( `hidden` );

      if ( $( `sizes-block` ).length > 0 ) {
        $( `sizes-block [name="height__value"]` )
          .val( height.toFixed(2) )
          .attr( `last`, height.toFixed(2) );

        $( `sizes-block [name="width__value"]` )
          .val( width.toFixed(2) )
          .attr( `last`, width.toFixed(2) );
      } else {
        $( `.widthHeight__block [name="height__value"]` )
          .val( height.toFixed(2) )
          .attr( `last`, height.toFixed(2) );

        $( `.widthHeight__block [name="width__value"]` )
          .val( width.toFixed(2) )
          .attr( `last`, width.toFixed(2) );
      }

      calculateRatio( width.toFixed(2), height.toFixed(2) );
      await ApplyDelay( 300 );
      getVariantsBySize();
      await ApplyDelay( 100 );
      manageQuantities( 'btnClicked' );

      $( `.step__2` )
        .removeClass( `loader` );

      $( `.fileUploading_inprocess` ).removeClass( `active` );

      if ( typeof customUploaderView === 'function' ) {
        customUploaderView();
      }
    } else {
      setTimeout(() => {
        $( `.step__2` ).removeClass( `hidden` );
      }, 100);
      $( `[item-show-on]` ).addClass( `hidden` );

      $( `[item-show-on="finalStep"], [item-show-on="onAll"]` ).removeClass( `hidden` );
      $( `.step__2` ).removeClass( `loader` );

      $( `.fileUploading_inprocess` ).removeClass( `active` );
      $(".goToNextStep").addClass( `hidden` );
    }
    /*
    $( `html, body` ).animate({
      scrollTop: $( `[data-upload-field],[data-upload-lift]` ).offset().top - 100
    }, 500);
    */
  } catch ( err ) {
    console.log( `ERROR .step__1 .goToNextStep`, err.message );
  }
  calculateratioForImage();
})
.on(`click`, `.product-form .add-to-cart[data-main-product-add-to-cart]`,async function( e ) {
  if(document.body.classList.contains("template-product-uv-gang-sheet") == true &&  typeof anotherTransfer == "undefined" ){
    $( `body` )
      .append( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
    $( `sidebar-drawer#site-cart-sidebar` )
      .css( 'opacity', '0 !important' );
    setTimeout(function(){
        location.href = "/cart";
    },1000)
  }else{
  try {
    if ( typeof ElementAvailibility === 'function' ) {
      if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect ) {
        $( `body` )
          .append( `
            <div class="loadingScreen__">
              <img src="${ loaderGif }">
            </div>
          ` );
        $( `sidebar-drawer#site-cart-sidebar` )
          .css( 'opacity', '0 !important' );
      }

      if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect && anotherTransfer == false ) {
        $( `sidebar-drawer#site-cart-sidebar` )
          .css( 'opacity', '0 !important' );
        ElementAvailibility ( `#site-cart-sidebar.sidebar.sidebar--opened`, 'removeUploadError', 30 );
      }
      if ( typeof reCalculateFreeShippingModule === 'function' ) {
        reCalculateFreeShippingModule();
      }
    }
  } catch ( err ) {
    console.log( `ERROR product-form__submit`, err.message );
  }
  }
})
.on(`click`, `.customTabelPlace__itemWrapViewAll`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    const isViewAll = $( this ).closest( `.customTabelPlace__itemsWrap.vAll` ).length;
    let qty = $( `.customQtyFile__qty` ).val() * 1;
    if ( typeof alreadyCartItems !== 'undefined' && alreadyCartItems.length > 0 ) {
      // selectedCartItem = findObjectByKey( alreadyCartItems, 'pid', currentPID );
      selectedCartItem = alreadyCartItems;
      if ( typeof selectedCartItem !== 'undefined' && selectedCartItem && typeof isTitleMatched !== 'undefined' && isTitleMatched ) {
        if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
          qty = qty;
        } else if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
          qty = qty + selectedCartItem[0].spangleQty;
        } else if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
          qty = qty + selectedCartItem[0].stickersQty;
        } else {
          qty = qty + selectedCartItem[0].qty;
        }
      }
    }

    if ( typeof getCalculatedQty__ !== 'undefined' && getCalculatedQty__ > 0 ) {
      qty = getCalculatedQty__ + qty;
    }

    if ( typeof rowIndex__1 !== 'undefined' && rowIndex__1 ) {
      rowIndex__1 = rowIndex__1 * 1;
    } else {
      rowIndex__1 = 14;
    }

    if ( qty > rowIndex__1 ) {
      $( this ).removeClass( `hidden` );
      if ( isViewAll > 0 ) {
        $( this ).closest( `.customTabelPlace__itemsWrap.vAll` ).removeClass( `vAll` );
        $( `.customTabelPlace__itemWrapViewAll > span` ).text( `hide` );
      } else {
        $( this ).closest( `.customTabelPlace__itemsWrap` ).addClass( `vAll` );
        $( `.customTabelPlace__itemWrapViewAll > span` ).text( `view all` );
      }

      await addDelay( 250 );
      const getHeight = $( `.customTabelPlace .customTabelPlace__item.selected` ).outerHeight();
      let getTopPosition = $( `.customTabelPlace .customTabelPlace__item.selected` ).position().top;

      $( `.customTabelPlace__item__selectedBar` ).css({
        "top": `${ getTopPosition }px`,
        "height": `${ getHeight }px`
      });
    } else {
      $( this ).addClass( `hidden` );
    }
    await addDelay( 500 );
    readjustSelectedBar();
  } catch ( err ) {
    console.log( `ERROR .customTabelPlace__itemWrapViewAll`, err.message );
  }
})
.on(`click`, `.add-more-block .addmore_size`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    let selectedTab = $( `.tab_header > a[href="#custom_size"].active` ).length;
    if ( selectedTab > 0 ) {
      currentSelectedOption = 'custom';
    } else {
      currentSelectedOption = 'popular';
    }
    const getAlreadyLen = $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).length;

    if ( getAlreadyLen == 0 ) {
      if ( currentSelectedOption == 'custom' && customItemHTML != '' ) {
        $( `sizes-blocks .widthHeight__customHeader` ).after( customItemHTML );
      } else if ( currentSelectedOption == 'popular' && popularItemHTML != '' ) {
        $( `sizes-blocks .add-more-block` ).before( popularItemHTML );
        await addDelay( 100 );
        const getSelectedVal = $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().find( `.popularSizes` ).val();
        $( `product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getSelectedVal }"]` ).click();
      } else {
        addMoreIfNotExist();
      }
    } else {
      const getHTML = $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().clone();
      $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().after( getHTML );
      $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().attr( `qty`, definedMinQty ).find( `.customQtyFile__qty` ).val( definedMinQty ).attr( `value`, definedMinQty );
    }
    $( `sizes-blocks .widthHeight__custom[item]` ).each(function(i) {
      const itemNo = i + 1;
      $( this ).attr( `item`, itemNo );
    })
    selectedItemNo = $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().attr( `item` );
    calculateDPILineItem( currentSelectedOption )
    manageQuantities();
  } catch ( err ) {
    console.log( `ERROR .add-more-block .addmore_size`, err.message );
  }
})
.on(`click`, `.del_item .del_item_cta`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const checkItemOption = $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` );
    if ( checkItemOption == 'custom' && customItemHTML == '' ) {
      const HTML_inner = $( this ).closest( `.widthHeight__custom[item]` ).html();
      const HTML_vid = $( this ).closest( `.widthHeight__custom[item]` ).attr( `vid` );
      const HTML_price = $( this ).closest( `.widthHeight__custom[item]` ).attr( `price` );
      customItemHTML = `<div class="widthHeight__custom" item="0" option-selected="custom" vid="${ HTML_vid }" price="${ HTML_price }" qty="1">${ HTML_inner }</div>`;
      if ( customItemHTML.includes( `w3_bg` ) ) {
        customItemHTML = customItemHTML.replaceAll( `w3_bg`, `` );
      }
      if ( customItemHTML.includes( `disabled` ) ) {
        customItemHTML = customItemHTML.replaceAll( `disabled`, `` );
      }
    } else if ( checkItemOption == 'popular' && popularItemHTML == '' ) {
      const HTML_inner = $( this ).closest( `.widthHeight__custom[item]` ).html();
      const HTML_vid = $( this ).closest( `.widthHeight__custom[item]` ).attr( `vid` );
      const HTML_price = $( this ).closest( `.widthHeight__custom[item]` ).attr( `price` );
      popularItemHTML = `<div class="widthHeight__custom" item="0" option-selected="popular" vid="${ HTML_vid }" price="${ HTML_price }" qty="1">${ HTML_inner }</div>`;
      if ( popularItemHTML.includes( `w3_bg` ) ) {
        popularItemHTML = popularItemHTML.replaceAll( `w3_bg`, `` );
      }
      if ( popularItemHTML.includes( `disabled` ) ) {
        popularItemHTML = popularItemHTML.replaceAll( `disabled`, `` );
      }
    }
    $( this ).closest( `.widthHeight__custom[item]` ).remove();
    $( `sizes-blocks .widthHeight__custom[item]` ).each(function(i) {
      $( this ).attr( `item`, `${ i + 1 }` );
    })
    currentSelectedOption = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
    // selectedItemNo = 1;
    // console.log ( 'selectedItemNo before', selectedItemNo );
    if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
      const isSelectedItemAvailable = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).length;
      if ( isSelectedItemAvailable == 0 ) {
        selectedItemNo = $( `sizes-blocks .widthHeight__custom[item]` ).length;
      }
    }
    // console.log ( 'selectedItemNo after', selectedItemNo );
    manageQuantities( `del` );
  } catch ( err ) {
    console.log( `ERROR .del_item .del_item_cta`, err.message );
  }
})
// ADD TO CART GROUP START
.on(`click`, `product-form .addToCartGroupItems`,async function( e ) {
  try {
    e.stopImmediatePropagation();
      var precutqty = pcutqty;
    let items = [];
    const formEle = $( `.product-actions.__manage-space product-form form[data-type="add-to-cart-form"]` );
    const getAllProperties = getFormProperties( formEle, ['Remove Background', 'Super Resolution', 'Precut', '_discount_input', '_discount_name', 'Upload (Vector Files Preferred)', '_Original Image'] );
   let missingSizesFound = 0;
    $($( `sizes-blocks .widthHeight__custom[item][option-selected]` ).get().reverse()).each(function( i ) {
      let vid;
      vid = $( this ).attr( `vid` ) * 1;
      const qty = $( this ).attr( `qty` ) * 1;
      let _title =  $( this ).attr( `title` );
      const cartNote = $( `textarea[name="properties[Design Notes]"]` ).val();
      let properties__;

      if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
        console.log(" cutom widget 3")
        let getDimension = $( this ).find( `.popularSizes_puff` ).val();
        if ( typeof getDimension !== 'undefined' && getDimension ) {
          getDimension = getDimension.replaceAll( ` `, `` );
          getDimension = getDimension.replaceAll( `^`, `` );

          if ( getDimension.includes( `x` ) ) {
            let width = getDimension.split( `x` )[0];
            let height = getDimension.split( `x` )[1];
            if ( typeof getAllProperties !== 'undefined' && getAllProperties ) {
              properties__ = getAllProperties;
              if ( typeof width !== 'undefined' && width ) {
                properties__._width = width;
              } else {
                if ( typeof properties__._width !== 'undefined' && properties__._width ) {
                  delete properties__._width;
                }
              }
              if ( typeof height !== 'undefined' && height ) {
                properties__._height = height;
              } else {
                if ( typeof properties__._height !== 'undefined' && properties__._height ) {
                  delete properties__._height;
                }
              }
            }
          }
        }
        const isColorSelected = $( this ).find( `.widthHeight__dropdown` ).attr( `selected-color` );
        if ( typeof isColorSelected !== 'undefined' && isColorSelected == '' ) {
          $( this ).find( `.widthHeight__dropdown` ).addClass( `noColorSelected` );
          $( `html, body` ).animate({
            scrollTop: $( this ).find( `.widthHeight__dropdown` ).offset().top - 100
          }, 500);
          return;
        }
      } else if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
        console.log(" cutom widget 2")
        let width = $( this ).find( `.popularSizes_sticker` ).attr( `w` );
        let height = $( this ).find( `.popularSizes_sticker` ).attr( `h` );
        if ( typeof width !== 'undefined' && width && typeof height !== 'undefined' && height ) {
          properties__ = getAllProperties;
          if ( typeof width !== 'undefined' && width ) {
            properties__._width = width;
          }
          if ( typeof height !== 'undefined' && height ) {
            properties__._height = height;
          }
        }
      } else {
        console.log(" cutom widget 1",$( this ))
        let width = $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val();
        let height = $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val();
        if ( typeof getAllProperties !== 'undefined' && getAllProperties ) {
          properties__ = getAllProperties;
          if ( typeof width !== 'undefined' && width ) {
            properties__._width = width;
          } else {
            if ( typeof properties__._width !== 'undefined' && properties__._width ) {
              delete properties__._width;
            }
          }
          if ( typeof height !== 'undefined' && height ) {
            properties__._height = height;
          } else {
            if ( typeof properties__._height !== 'undefined' && properties__._height ) {
              delete properties__._height;
            }
          }
        }
      }
      const properties = {};
      if ( typeof properties__._width !== 'undefined' && properties__._width ) {
        properties._width = properties__._width;
      } else {
        delete properties._width;
      }
      if ( typeof properties__._height !== 'undefined' && properties__._height ) {
        properties._height = properties__._height;
      } else {
        delete properties._height;
      }
      if ( typeof properties__['Remove Background'] !== 'undefined' && properties__['Remove Background'] ) {
        properties['Remove Background'] = properties__['Remove Background'];
      } else {
        delete properties['Remove Background'];
      }
      if ( typeof properties__['Super Resolution'] !== 'undefined' && properties__['Super Resolution'] ) {
        properties['Super Resolution'] = properties__['Super Resolution'];
      } else {
        delete properties['Super Resolution'];
      }
      if ( typeof properties__['Precut'] !== 'undefined' && properties__['Precut'] ) {
        properties['Precut'] = properties__['Precut'];
        if(properties['Precut'] == "Yes"){
          precutqty += qty
        }
      } else {
        delete properties['Precut'];
      }

      properties['Design Notes'] = cartNote;

      // if ( typeof properties__['_Ready to Press'] !== 'undefined' && properties__['_Ready to Press'] ) {
      //   properties['_Ready to Press'] = properties__['_Ready to Press'];
      // } else {
      //   delete properties['_Ready to Press'];
      // }
      if ( typeof properties__['_discount_input'] !== 'undefined' && properties__['_discount_input'] ) {
        properties['_discount_input'] = properties__['_discount_input'];
      } else {
        delete properties['_discount_input'];
      }
      if ( typeof properties__['_discount_name'] !== 'undefined' && properties__['_discount_name'] ) {
        properties['_discount_name'] = properties__['_discount_name'];
      } else {
        delete properties['_discount_name'];
      }
     if ( typeof properties__['Upload (Vector Files Preferred)'] !== 'undefined' && properties__['Upload (Vector Files Preferred)'] ) {
         properties['Upload (Vector Files Preferred)'] = properties__['Upload (Vector Files Preferred)']??$( `#fileupload_hero`).attr("src");
      } else {
        properties['Upload (Vector Files Preferred)'] = $( `#fileupload_hero`).attr("src");
      }
      if ( typeof properties__['_Original Image'] !== 'undefined' && properties__['_Original Image'] ) {
        properties['_Original Image'] = properties__['_Original Image']??$( `#fileupload_hero`).attr("src");
      } else {
        properties['_Original Image'] = $( `#fileupload_hero`).attr("src"); 
      }
      properties['_Original Image'] = properties['Upload (Vector Files Preferred)'].replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
      
      if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
        let getDimension = $( this ).find( `.popularSizes_puff` ).val();
        if ( typeof getDimension !== 'undefined' && getDimension ) {
          getDimension = getDimension.replaceAll( ` `, `` );
          getDimension = getDimension.replaceAll( `^`, `` );

          if ( getDimension.includes( `x` ) ) {
            let width = getDimension.split( `x` )[0];
            let height = getDimension.split( `x` )[1];
            properties['_Size'] = `${ width }x${ height }`;
          }
        }
      } else {
        if ( typeof $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() !== 'undefined' && typeof $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() !== 'undefined' ) {
          properties['_Size'] = `${ $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() }x${ $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() }`;
        }else if(typeof $( this ).find( `.popularSizes` ).val() !== 'undefined' && $( this ).find( `.popularSizes` ).val().indexOf(" x ") > -1 ){
         properties['_Size'] =  $( this ).find( `.popularSizes` ).val();
      }
      }
      const dpiWarning = $( this ).find( `dpi-warning` ).hasClass( `active` );
      if ( typeof dpiWarning !== 'undefined' && dpiWarning ) {
        properties[`DPI Warning`] = `Yes`;
      }
      if ( isReadyToPress ) {
        properties['_Ready to Press'] = `Yes`;
      }

      
      if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
        const selectedColorsArr = [];
        $( `spangle-colors .spangle__colorOption` ).each(function(i) {
          let color_ = $( this ).find( `.spangle__dropdown .spangle__dropbtn > span` ).text();
          if ( typeof color_ !== 'undefined' && color_ ) {
            color_ = color_.trim();
            selectedColorsArr.push( color_ );
          }
        })
        const isError = $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown` ).hasClass( `pickColor` );
        if ( isError ) {
          $( `html, body` ).animate({
            scrollTop: $( `spangle-colors .spangle__colorOption[item="1"]` ).offset().top - 100
          }, 1000);
          $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown` ).addClass( `error` );
          $( `.loadingScreen__` ).remove();
          return;
        }
        const selectedColorsString = selectedColorsArr.join(', ');
        if ( typeof selectedColorsString !== 'undefined' && selectedColorsString ) {
          properties['Spangle Colors'] = selectedColorsString;
        }
      }
      if ( typeof isAIImage !== 'undefined' && isAIImage ) {
        properties['AI Created'] = 'Yes';
      }

      let optionErr = false;
      if ( typeof enableOption1 !== 'undefined' && enableOption1 ) {
        let isError = false;
        const isFirstOption = $( `.customStickerOption[item="1"]` ).length;
        if ( isFirstOption > 0 ) {
          const isChecked = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
          if ( isChecked == false ) {
            isError = true;
            optionErr = true;
            $( `.customStickerOption[item="1"] .customStickerOption__error` ).removeClass( `hidden` );
          } else {
            const firstVal = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
            $( `.customStickerOption[item="1"] .customStickerOption__error` ).addClass( `hidden` );
            const firstOptionName = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
            properties[firstOptionName] = firstVal;
            // console.log ( 'firstVal', firstVal );
          }
        }
      }

      if ( typeof enableOption2 !== 'undefined' && enableOption2 ) {
        let isError = false;
        const isSecondOption = $( `.customStickerOption[item="2"]` ).length;
        if ( isSecondOption > 0 ) {
          const isChecked = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
          if ( isChecked == false ) {
            isError = true;
            optionErr = true;
            $( `.customStickerOption[item="2"] .customStickerOption__error` ).removeClass( `hidden` );
          } else {
            const secondVal = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
            $( `.customStickerOption[item="2"] .customStickerOption__error` ).addClass( `hidden` );
            const secondOptionName = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
            properties[secondOptionName] = secondVal;
            // console.log ( 'secondVal', secondVal );
          }
        }
      }

      if ( typeof enableOption3 !== 'undefined' && enableOption3 ) {
        let isError = false;
        const isThirdOption = $( `.customStickerOption[item="3"]` ).length;
        if ( isThirdOption > 0 ) {
          const isChecked = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
          if ( isChecked == false ) {
            isError = true;
            optionErr = true;
            $( `.customStickerOption[item="3"] .customStickerOption__error` ).removeClass( `hidden` );
          } else {
            const thirdVal = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
            $( `.customStickerOption[item="3"] .customStickerOption__error` ).addClass( `hidden` );
            const thirdOptionName = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
            properties[thirdOptionName] = thirdVal;
            // console.log ( 'thirdVal', thirdVal );
          }
        }
      }

      if ( typeof enableOption4 !== 'undefined' && enableOption4 ) {
        let isError = false;
        const isFourthOption = $( `.customStickerOption:not(.hidden)[item="4"]` ).length;
        if ( isFourthOption > 0 ) {
          const inputVal = $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__input` ).val();
          if ( typeof inputVal !== 'undefined' && inputVal ) {
            $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).addClass( `hidden` );
            const fourthOptionName = $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__input` ).attr( `p-name` );
            properties[fourthOptionName] = inputVal;
            // console.log ( 'inputVal', inputVal );
          } else {
            $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).removeClass( `hidden` );
            isError = true;
            optionErr = true;
          }
        }
      }

      if ( optionErr ) {
        return;
      }
 
      if(isDTFPage){

         let proccessNext = false; 
    if(typeof properties['_Size'] != "undefined"){
          proccessNext = true;
    } 
    if(typeof properties['_Size'] == "undefined"){
        missingSizesFound++;
      } 
          if(missingSizesFound != 0){
        $(".missing_size_error").addClass("_active");
       setTimeout(function(){
           $(".missing_size_error").removeClass("_active");
           location.reload();
       },3500)
     }
      if(typeof properties['Upload (Vector Files Preferred)'] != "undefined" && typeof properties['_Original Image'] != "undefined" && properties['_Original Image'].indexOf("transparent.png") == -1 && proccessNext == true){
        if(properties['Upload (Vector Files Preferred)'].indexOf("https") > -1){
      items.push({
        id: vid,
        quantity: qty,
        properties
      });
           }
      }
      }else{
         items.push({
        id: vid,
        quantity: qty,
        properties
      });
      }
    })

    if ( items.length > 0 ) {
      isReadyToPress = false;
      // const readyToPress = getFormProperties( formEle, ['_Ready to Press'] );
      // const attributes = readyToPress;
      const attributes = '';

      $( `body` )
      .append( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
      let rtn;
      console.log(JSON.stringify({ items, attributes }),"  JSON.stringify",pcutqty,precutqty)
      const getData = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items, attributes }),
      })
      .then((response) => {
        return response.json();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
      refreshCart();
      resetAll();
      if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect && typeof anotherTransfer !== 'undefined' && anotherTransfer == false ) {
        $( `sidebar-drawer#site-cart-sidebar .sidebar__header .sidebar__close` ).click();
        
        location.href = `/cart`;
        await addDelay( 15000 );
        $( `.loadingScreen__` ).remove();
      } else if ( anotherTransfer == true ) {
      } else {
        await addDelay( 1000 );
        $( `.loadingScreen__` ).remove();
      }
    }
  } catch ( err ) {
    console.log( `ERROR product-form .addToCartGroupItems`, err.message );
  }
})
// ADD TO CART GROUP END
.on(`focus`, `sizes-blocks .widthHeight__value, sizes-blocks .customQtyFile__qty, sizes-blocks .popularSizes, sizes-blocks .widthHeight__item__popular .popularSizes_sticker`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    $( this ).select();
    setImageDimensions();
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__value, sizes-blocks .customQtyFile__qty`, err.message );
  }
})

.on(`click`, `sizes-blocks .widthHeight__custom.disabled[option-selected]`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const tabIs = $( this ).attr( `option-selected` );
    const activeTabIs = $( `#size_selection .custom_tabs .tab_header a.active` ).attr( `href` );
    if ( tabIs == 'custom' && activeTabIs == '#popular_size' ) {
      console.log ( 'tab active popular', activeTabIs );
      $( `#size_selection .custom_tabs .tab_header a[href="#custom_size"]` ).click();
    } else if ( tabIs == 'popular' && activeTabIs == '#custom_size' ) {
      console.log ( 'tab active custom', activeTabIs );
      $( `#size_selection .custom_tabs .tab_header a[href="#popular_size"]` ).click();
    }
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__custom.disabled[option-selected="custom"]`, err.message );
  }
})

.on(`change`, `sizes-blocks .widthHeight__item__popular .popularSizes`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    const getVal = $( this ).val();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    $( this ).closest( `.widthHeight__item__popular` ).find( `.popularSizes option` ).removeAttr( `selected` );
    console.log ( 'getVal', getVal );
    if ( typeof getVal !== 'undefined' && getVal ) {
      $( this ).find( `option[value="${ getVal }"]` ).attr( `selected`, `selected` );
      $( `product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getVal }"]` ).click();
    }
    const getItemsLen = $( `sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).length;
    if ( getItemsLen == 1 ) {
      await addDelay( 1000 );
      const isPreCutActive = $( `#precutselected__` ).is( `:checked` );
      let getValText = $( `product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getVal }"]` ).text().trim();
      const temp_variant = findObjectByKey( allVariants, 'option1', getValText, true );
      console.log ( 'getValText', getValText );
      if ( typeof temp_variant !== 'undefined' && temp_variant && temp_variant.length > 0 ) {
        temp_variant.forEach(el => {
          if ( typeof el.option2 !== 'undefined' && el.option2 && el.option2.includes( `No` ) ) {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"][option-selected="popular"]` ).attr({
              "vid": el.id,
              "price": el.price
            });
          } else if ( typeof el.option2 !== 'undefined' && el.option2 && el.option2.includes( `Yes` ) ) {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"][option-selected="popular"]` ).attr({
              "precut-vid": el.id,
              "precut-price": el.price
            });
          } else {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"][option-selected="popular"]` ).attr({
              "vid": el.id,
              "title": el.title,
              "price": el.price
            });
          }
        });
        updatedPriceLogic();
      }
    }
    calculateDPILineItem( `popular` );
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__item__popular .popularSizes`, err.message );
  }
})
// POPULAR SIZE PUFF START
.on(`change`, `sizes-blocks .widthHeight__item__popular .popularSizes_puff`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const getVal = $( this ).val();
    $( this ).closest( `.widthHeight__item__popular` ).find( `.popularSizes option` ).removeAttr( `selected` );
    if ( typeof getVal !== 'undefined' && getVal ) {
      $( this ).find( `option[value="${ getVal }"]` ).attr( `selected`, `selected` );
      puffImgPreviewSize();
      $( `product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getVal }"]` ).click();
    }
    // calculateDPILineItem( `popular` );
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__item__popular .popularSizes`, err.message );
  }
})
// POPULAR SIZE PUFF END
// POPULAR SIZE BUMPER STICKER START

.on(`change`, `sizes-blocks .widthHeight__item__popular .popularSizes_sticker`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    const getVal = $( this ).val();
    const currentSize = getVal.match(/([\d.]+)\s*in\s*x\s*([\d.]+)\s*in/);
    let getWidth = 0;
    let getHeight = 0;
    if ( currentSize ) {
      getWidth = currentSize[1]; // First captured group
      getHeight = currentSize[2]; // Second captured group
    }
    $( this ).attr({
      "w": getWidth,
      "h": getHeight
    })
    // console.log ( 'getVal', getVal );
    $( this ).closest( `.widthHeight__item__popular` ).find( `.popularSizes_sticker option` ).removeAttr( `selected` );
    if ( typeof getVal !== 'undefined' && getVal ) {
      $( this ).find( `option[value="${ getVal }"]` ).attr( `selected`, `selected` );
      puffImgPreviewSize();
      $( `product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getVal }"]` ).click();
    }
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__item__popular .popularSizes_sticker`, err.message );
  }
})
// POPULAR SIZE BUMPER STICKER END
  
// PUFF COLOR DROPDOWN START
.on(`click`, `sizes-blocks .widthHeight__dropdown`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    $( this ).addClass( `open` );
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__dropdown`, err.message );
  }
})
.on(`mouseleave`, `sizes-blocks .widthHeight__dropdown`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this ).removeClass( `open` );
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__dropdown`, err.message );
  }
})
.on(`click`, `sizes-blocks .widthHeight__dropdown .widthHeight__dropdown-content span`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const getVal = $( this ).attr( `val` );
    let getColorVal = $( this ).find( `selected-color` ).length;
    let colorVal, imgVal;
    // console.log ( 'colorVal', colorVal );
    // console.log ( 'imgVal', imgVal );
    if ( getColorVal > 0 ) {
      colorVal = $( this ).find( `selected-color` ).attr( `style` );
    } else {
      imgVal = $( this ).find( `img` ).attr( `src` );
    }
    if ( typeof getVal !== 'undefined' && getVal ) {
      $( this ).closest( `.widthHeight__dropdown` ).attr( `selected-color`, getVal ).removeClass( `noColorSelected` );
      $( this ).closest( `.widthHeight__dropdown-content` ).find( `span` ).removeClass( `selected` );
      $( this ).addClass( `selected` );
      if ( typeof imgVal !== 'undefined' && imgVal ) {
        console.log ( 'imgVal', imgVal );
        $( this ).closest( `.widthHeight__dropdown` ).find( `.widthHeight__dropbtn selected-color, .widthHeight__dropbtn img` ).remove();
        $( this ).closest( `.widthHeight__dropdown` ).find( `.widthHeight__dropbtn` ).prepend( `<img src="${ imgVal }">` );
      } else if ( typeof colorVal !== 'undefined' && colorVal ) {
        console.log ( 'colorVal', colorVal );
        $( this ).closest( `.widthHeight__dropdown` ).find( `.widthHeight__dropbtn selected-color, .widthHeight__dropbtn img` ).remove();
        $( this ).closest( `.widthHeight__dropdown` ).find( `.widthHeight__dropbtn` ).prepend( `<selected-color style="${ colorVal }"></selected-color>` );
      }
      $( this ).closest( `.widthHeight__dropdown` ).removeClass( `open` ).find( `.widthHeight__dropbtn span` ).text( getVal );

      const getSelectedTierOp_1 = $( this ).closest( `.widthHeight__custom` ).find( `.popularSizes_puff` ).val();

      $( `product-variants .product-variant[option="1"] .product-variant__container .product-variant__item .product-variant__label[val="${ getSelectedTierOp_1 }"]` ).prev( `.product-variant__input` ).prop( `checked`, true );

      $( `product-variants .product-variant[option="2"] .product-variant__container .product-variant__item .product-variant__input[value="${ getVal }"]` ).next( `label` ).click();
    }
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__dropdown .widthHeight__dropdown-content span`, err.message );
  }
})
// PUFF COLOR DROPDOWN END

  
.on(`change`, `#precutselected__`, function( e ) {
  try {
    const isPreCutActivated = $( `#precutselected__` ).is( `:checked` );
    let preCutOptionText = '';
    
    if ( isPreCutActivated ) {
      $("product-form.product-form form #is_precut").val("Yes");
      $('.precut-cost').removeClass("nodisplay");
      //preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
    } else {
      $("product-form.product-form form #is_precut").val("No");
      $('.precut-cost').addClass("nodisplay");
      //preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
    }
    
  } catch ( err ) {
    console.log( `ERROR #precutselected__`, err.message );
  }
})
  // Precut change event
;

function puffImgPreviewSize() {
  try {
    if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
      let getWidth = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `w` ) * 1;
      $( `.horizontal_direction span` ).html( `${ getWidth.toFixed( 2 ) }"` );
      $( `.verticle_direction span` ).html( `<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>` );
    } else {
      const getVal = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes_puff` ).val();
      if ( typeof getVal !== 'undefined' && getVal && getVal.includes( `x` ) ) {
        let getWidth = getVal.split( `x` )[0];
        getWidth = getWidth.replace( `^`, `` );
        getWidth = getWidth.replace( ` `, `` );
        $(".horizontal_direction span").html( `${ getWidth }.00"` );
        $(".verticle_direction span").html(`<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>`);
      }
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}


function resetAll() {
  try {
    selectedItemNo = 1;
    isReadyToPress = false;
    isAIImage = false;
    $( `sidebar-drawer#site-cart-sidebar .sidebar__header .sidebar__close` ).click();
    if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
      $( `.popularSizes_puff option` ).removeAttr( `selected` );
      // const getFirstOptionVal = $( `.popularSizes_puff option` ).first().attr( `value` );
      // $( `.popularSizes_puff` ).val( getFirstOptionVal );

      $( `sizes-blocks .widthHeight__custom.puffPage .widthHeight__dropdown` )
        .attr( `selected-color`, `` )
        .removeClass( `noColorSelected` )
        .find( `.widthHeight__dropdown-content span` )
        .removeClass( `selected` );
      // $( '.widthHeight__dropdown-content span' ).first().click();
    }
    if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
      $( `
        spangle-colors .spangle__colorOption[item="2"],
        spangle-colors .spangle__colorOption[item="3"],
        spangle-colors .spangle__colorOption[item="1"] .spangle__dropbtn selected-color,
        spangle-colors .spangle__colorOption[item="1"] .spangle__dropbtn img,
        spangle-colors .spangle__colorOption[item="1"] .spangle__dropbtn > span,
        spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown-content > span
      ` ).remove();
      $( `spangle-colors .spangle__addAnother` ).removeClass( `hidden` );
      $( `spangle-colors .spangle__colorOption[item="1"] .optionDel` ).addClass( `hidden` );
      $( `spangle-colors .spangle__numberOfColors > select` ).val( 1 );
      $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown` ).addClass( `pickColor` );

      $( `html, body` ).animate({
        scrollTop: $( `spangle-colors .spangle__colorOption[item="1"]` ).offset().top - 100
      }, 1000);

      if ( typeof allSpangleColors !== 'undefined' && allSpangleColors ) {
        allSpangleColors.forEach((el, i) => {
          if ( i == 0 ) {
            if ( el.colorCode_or_img.includes( `#` ) ) {
              $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropbtn` ).prepend( `<span pick-color style="grid-column: 1/3;">Pick a Color</span>` );
            } else {
              $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropbtn` ).prepend( `<span pick-color style="grid-column: 1/3;">Pick a Color</span>` );
            }
            // $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropbtn > span` ).text( el.colorName );
            // $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown-content` ).append( `
            //   <span class="selected" val="${ el.colorName }">
            //     ${ el.colorCode_or_img.includes( `#` ) ? `<selected-color style="background-color: ${ el.colorCode_or_img };">&nbsp;</selected-color>` : `<img src="${ el.colorCode_or_img }">` }
            //     ${ el.colorName }
            //   </span>
            // ` );
          }
          //  else {
            $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown-content` ).append( `
              <span val="${ el.colorName }">
                ${ el.colorCode_or_img.includes( `#` ) ? `<selected-color style="background-color: ${ el.colorCode_or_img };">&nbsp;</selected-color>` : `<img src="${ el.colorCode_or_img }">` }
                ${ el.colorName }
              </span>
            ` );
          // }
        });
      }
    } else if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct ) {
      $( `.customStickerOption[item] .customStickerOption__optionInput` ).prop('checked', false);
      $( `.customStickerOption[item] .customStickerOption__input` ).val( `` );
    }
    if ( typeof enableOption1 !== 'undefined' && enableOption1 || typeof enableOption2 !== 'undefined' && enableOption2 || typeof enableOption3 !== 'undefined' && enableOption3 || typeof enableOption4 !== 'undefined' && enableOption4 ) {
      $( `.customStickerOption[item] .customStickerOption__optionInput` ).prop('checked', false);
      $( `.customStickerOption[item] .customStickerOption__input` ).val( `` );
    }
    updateCartItemCount();
    $( `#precutselected, #precutselected__` ).prop( `checked`, false );
    $( `a#custom_size` ).click();
    $( `sizes-blocks .widthHeight__custom[item]` ).each(function(i) {
      if ( i != 0 ) {
        $( this ).remove();
      }
    })
    if ( typeof anotherTransfer !== 'undefined' && anotherTransfer ) {
      const isCustomItemEleAvailable = $( `sizes-blocks .widthHeight__custom[option-selected="custom"]` ).length;
      if ( isCustomItemEleAvailable == 0 ) {
        $( `sizes-blocks .widthHeight__custom[item]` ).remove();
        $( `sizes-blocks .widthHeight__customHeader` ).after( customItemHTML );
        $( `sizes-blocks .widthHeight__custom[item]` ).attr( `item`, 1 );
        selectedItemNo = 1;
      }
    }
    $( `textarea[name="properties[Design Notes]"]` ).val( `` );
    if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
    } else {
      $( `#designer_notes` ).prop( `checked`, false );
    }
  } catch ( err ) {
    console.log( `ERROR resetAll`, err.message );
  }
}
function updateCartItemCount() {
  try {
    $.get(`/cart?view=cartItemsCount`, function ( res ) {
      $( `.header-container .area--cart` ).html( res );
    });
  } catch ( err ) {
    console.log( `ERROR updateCartItemCount()`, err.message );
  }
}

function addMoreIfNotExist() {
  try {
    const checkCurrentSelectedOptionItem = $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).length;
    if ( checkCurrentSelectedOptionItem == 0 ) {
      const getAlreadyLen = $( `sizes-blocks .widthHeight__custom[item]` ).length;
      const getHTML = $( `sizes-blocks .widthHeight__custom[item="${ getAlreadyLen }"]` ).clone();
      $( `sizes-blocks .widthHeight__custom[item="${ getAlreadyLen }"]` ).after( getHTML );
      $( `sizes-blocks .widthHeight__custom[item]` )
        .last()
        .attr({"item": getAlreadyLen + 1,"option-selected": currentSelectedOption, "qty": definedMinQty })
        .find( `.customQtyFile__qty` )
        .val( definedMinQty )
        .attr( `value`, definedMinQty );
      selectedItemNo = getAlreadyLen + 1;
      if ( currentSelectedOption == 'popular' ) {
        modifyPopularItem();
      } else if ( currentSelectedOption == 'custom' ) {

      }
      manageQuantities();
    }
  } catch ( err ) {
    console.log( `ERROR addMoreIfNotExist()`, err.message );
  }
}


function modifyPopularItem() {
  try {
    $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).remove();
    $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).removeClass( `active` );

    
      if ( typeof allPopularVariants !== 'undefined' && allPopularVariants ) {
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
          .prepend( `
            <div class="widthHeight__item__popular">
              <select class="popularSizes"></select>
            </div>
          ` );
          allPopularVariants.forEach(size => {
          let sizeOption = size.option1;
          if ( sizeOption.includes( `"` ) ) {
            sizeOption = sizeOption.replaceAll(  `"`, `^`  );
          }
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` )
            .append( `
              <option value='${ sizeOption }' vid="${ size.id }">${ size.option1 }</option>
            ` );
        });
      }
    /*
    if ( precutOptionAvailable ) {
      const refinedPopularList = findObjectByKey( allPopularVariants, `option2`, `No - Leave in a roll`, true );
      if ( typeof refinedPopularList !== 'undefined' && refinedPopularList ) {
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
          .prepend( `
            <div class="widthHeight__item__popular">
              <select class="popularSizes"></select>
            </div>
          ` );
        refinedPopularList.forEach(size => {
          let sizeOption = size.option1;
          if ( sizeOption.includes( `"` ) ) {
            sizeOption = sizeOption.replaceAll(  `"`, `^`  );
          }
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` )
            .append( `
              <option value='${ sizeOption }' vid="${ size.id }">${ size.option1 }</option>
            ` );
        });
      }
    } else {
      debugger;
      if ( typeof allPopularVariants !== 'undefined' && allPopularVariants ) {
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
          .prepend( `
            <div class="widthHeight__item__popular">
              <select class="popularSizes"></select>
            </div>
          ` );
          allPopularVariants.forEach(size => {
          let sizeOption = size.option1;
          if ( sizeOption.includes( `"` ) ) {
            sizeOption = sizeOption.replaceAll(  `"`, `^`  );
          }
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` )
            .append( `
              <option value='${ sizeOption }' vid="${ size.id }">${ size.option1 }</option>
            ` );
        });
      }
    }
    */
  } catch ( err ) {
    console.log( `ERROR modifyPopularItem()`, err.message );
  }
}

function getFormProperties( mainSelector=null, propertiesArr=null ) {
  try {
    const collectProperties = {};
    if ( mainSelector != '' && propertiesArr.length > 0 ) {
      propertiesArr.forEach(p => {
        const getPropertyVal = mainSelector.find( `[name="properties[${ p }]"]:not([disabled])` ).val();
        if ( typeof getPropertyVal !== 'undefined' && getPropertyVal ) {
          collectProperties[`${ p }`] = getPropertyVal;
        }
      });
      return collectProperties;
    }
    return null;
  } catch ( err ) {
    console.log( `ERROR getFormProperties`, err.message );
  }
}


function removeUploadError() {
  try {
    $( `.cl-upload--errors.open` ).remove();
    if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect && anotherTransfer == false ) {
      $( `#site-cart-sidebar.sidebar.sidebar--opened` ).removeClass( `sidebar--opened` );
      anotherTransfer = false;

      location.href = '/cart';

      setTimeout(() => {
        $( `sidebar-drawer#site-cart-sidebar` )
          .css( 'opacity', '1' );
        if ( typeof reCalculateFreeShippingModule === 'function' ) {
          reCalculateFreeShippingModule();
        }
      }, 2000);
      setTimeout(() => {
        $( `.loadingScreen__` ).remove();
      }, 8000);

    } else {
      anotherTransfer = false;
      setTimeout(() => {
        $( `sidebar-drawer#site-cart-sidebar` )
          .css( 'opacity', '1' );
        $( `.loadingScreen__` ).remove();
        if ( typeof reCalculateFreeShippingModule === 'function' ) {
          reCalculateFreeShippingModule();
        }
      }, 2000);
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function updatePropotionalSizes() {
  try {
    const isSizesBlock = $( `sizes-blocks` ).length;
    if ( isSizesBlock > 0 ) {
      const isPreCutActivated = $( `#precutselected__` ).is( `:checked` );
      const by = `width`;
      const getRatio = getNewRatio( `#fileupload_hero`, by );

      $( `sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).each(function( i ) {
        const getVal = $( this ).find( `.widthHeight__value[name="width__value"]` ).val() * 1;

        const newVal = calculateNewWidth_orNewHeight(getRatio, by, getVal);

        $( this ).find( `.widthHeight__value[name="height__value"]` ).val( newVal.toFixed( 2 ) );


        const getWidth = getVal;
        const getHeight = newVal;
        const currentSquareInches__ = Math.ceil( getWidth * getHeight );

        let sizeVariantOptionText = '';
        $( `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
          const min = $( this ).attr( `min` ) * 1;
          const max = $( this ).attr( `max` ) * 1;
          if ( currentSquareInches__ >= min && currentSquareInches__ <= max ) {
            // isVariantMatched  =   true;
            sizeVariantOptionText = $( this ).find( `label` ).text().trim();
          }
        })
        let preCutOptionText = '';
        
          if ( isPreCutActivated ) {
            $("product-form.product-form form #is_precut").val("Yes");
            //preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
          } else {
            $("product-form.product-form form #is_precut").val("No");
            //preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
          }

        const makeTitle = `${ sizeVariantOptionText }`;
        // const getVID = $( `product-form [name="id"]` ).val() * 1;
        const selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );
        let currentVariant__;
        if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
          currentVariant__ = selectedVariant__;
          let simpleVariant,getPrecutVariant;
          simpleVariant = currentVariant__;
          
/*
          let simpleVariant, precutVariant;
          if ( currentVariant__.option2.includes( `Yes` ) ) {
            precutVariant = currentVariant__;
            const temp_variant = findObjectByKey( allVariants, `option1`, precutVariant.option1, true );
            if ( typeof temp_variant !== 'undefined' && temp_variant ) {
              const getSimpleVariant = findObjectByKey( temp_variant, `option2`, `No - Leave in a roll` );
              if ( typeof getSimpleVariant !== 'undefined' && getSimpleVariant ) {
                simpleVariant = getSimpleVariant;
              }
            }
          } else if ( currentVariant__.option2.includes( `No` ) ) {
            simpleVariant = currentVariant__;
            const temp_variant = findObjectByKey( allVariants, `option1`, simpleVariant.option1, true );
            if ( typeof temp_variant !== 'undefined' && temp_variant ) {
              const getPrecutVariant = findObjectByKey( temp_variant, `option2`, `Yes - Pre cut` );
              if ( typeof getPrecutVariant !== 'undefined' && getPrecutVariant ) {
                precutVariant = getPrecutVariant;
              }
            }
          }
*/
          $( this ).attr({
            "title": simpleVariant.title,
            "vid": typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.id !== 'undefined' && simpleVariant.id ? simpleVariant.id : '',
            "precut-vid": typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.id !== 'undefined' && precutVariant.id ? precutVariant.id : '',
            "price": typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.price !== 'undefined' && simpleVariant.price ? simpleVariant.price : '',
            "precut-price": typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.price !== 'undefined' && precutVariant.price ? precutVariant.price : '',
            "option-selected": 'custom'
          });
        }
      });
    }
    setTimeout(() => {
      $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__value` ).trigger('keyup');
    }, 1500);
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

async function manageQuantities( type = '', currentVariant = null ) {
  try {
    // console.log ( 'manageQuantities function',  );
    const isSizesBlock = $( `sizes-blocks` ).length;
    if ( isSizesBlock > 0 && currentSelectedOption == 'custom' ) {
      const getWidth    =   $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      const getHeight   =   $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
      currentSquareInches =   Math.ceil( getWidth * getHeight );

      let sizeVariantOptionText = '';
      $( `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
        const min = $( this ).attr( `min` ) * 1;
        const max = $( this ).attr( `max` ) * 1;
        if ( currentSquareInches >= min && currentSquareInches <= max ) {
          // isVariantMatched  =   true;
          sizeVariantOptionText = $( this ).find( `label` ).text().trim();
        }
      })

      const isPreCutActivated = $( `#precutselected__` ).is( `:checked` );
      let preCutOptionText = '';
      if ( precutOptionAvailable ) {
        if ( isPreCutActivated ) {
          $("product-form.product-form form #is_precut").val("Yes")
        } else {
          $("product-form.product-form form #is_precut").val("No")
        }
      }

      //const makeTitle = `${ sizeVariantOptionText }${ preCutOptionText != '' ? ` / ${ preCutOptionText }` : '' }`;
      const makeTitle = `${ sizeVariantOptionText }${ preCutOptionText != '' ? `` : '' }`;
      // const getVID = $( `product-form [name="id"]` ).val() * 1;
      const selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );
      
      if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
        currentVariant = selectedVariant__;
      }
      if ( typeof isPuffProduct !== 'undefined' && isPuffProduct && typeof anotherPuff !== 'undefined' && anotherPuff ) {
        currentVariant = allVariants[0];
        anotherPuff = false;
      }
      calculateDPILineItem( 'custom' );
    } else if ( isSizesBlock > 0 && currentSelectedOption == 'popular' && type == 'del' ) {
      console.log ( 'before currentVariant', currentVariant );
      if ( currentVariant === null ) {
        const getVID = $( `.widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `vid` ) * 1;
        const selectedVariant__ = findObjectByKey( allVariants, `id`, getVID );
        if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
          currentVariant = selectedVariant__;
        }
      }
      console.log ( 'after currentVariant', currentVariant );
    } else if ( isSizesBlock > 0 && currentSelectedOption == 'popular' && typeof isDTFPage !== 'undefined' && isDTFPage ) {
      console.log ( 'before currentVariant', currentVariant );
      if ( currentVariant === null ) {
        const getVID = $( `.widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `vid` ) * 1;
        const isPopularActive = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
        if ( isPopularActive == 'popular' ) {
          const optionVal = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` ).val();
          const selectedVariant__ = findObjectByKey( allVariants, `option1_converted`, optionVal );
          if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
            currentVariant = selectedVariant__;
          }
        } else {
          console.log ( 'getVID', getVID );
          const selectedVariant__ = findObjectByKey( allVariants, `id`, getVID );
          if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
            currentVariant = selectedVariant__;
          }
        }
      }
      console.log ( 'after currentVariant', currentVariant );
    } else {
      if ( currentVariant === null ) {
        // console.log ( 'mage chaaaaaaaaa', currentVariant );
        const getVID = $( `product-form [name="id"]` ).val() * 1;
        const selectedVariant__ = findObjectByKey( allVariants, `id`, getVID );
        if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
          currentVariant = selectedVariant__;
        }
      }
    }

    // console.log ( 'currentVariant', currentVariant );

    const isCustomTablePlaceAvailable = $( `.customTabelPlaceWrap` ).length;
    if ( isCustomTablePlaceAvailable > 0 && typeof currentVariant !== 'undefined' && currentVariant ) {
      $( `.customTabelPlaceWrap` ).attr( `base-price`, currentVariant.price );
      const checkItemLen = $( `sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).length;
      if ( checkItemLen > 0 ) {
        let simpleVariant, precutVariant;
        if ( typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.option2 !== 'undefined' && currentVariant.option2 && currentVariant.option2.includes( `Yes` ) ) {
          precutVariant = currentVariant;
          const temp_variant = findObjectByKey( allVariants, `option1`, precutVariant.option1, true );
          if ( typeof temp_variant !== 'undefined' && temp_variant ) {
            const getSimpleVariant = findObjectByKey( temp_variant, `option2`, `No - Leave in a roll` );
            if ( typeof getSimpleVariant !== 'undefined' && getSimpleVariant ) {
              simpleVariant = getSimpleVariant;
            }
          }
        } else if ( typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.option2 !== 'undefined' && currentVariant.option2 && currentVariant.option2.includes( `No` ) ) {
          simpleVariant = currentVariant;
          const temp_variant = findObjectByKey( allVariants, `option1`, simpleVariant.option1, true );
          if ( typeof temp_variant !== 'undefined' && temp_variant ) {
            const getPrecutVariant = findObjectByKey( temp_variant, `option2`, `Yes - Pre cut` );
            if ( typeof getPrecutVariant !== 'undefined' && getPrecutVariant ) {
              precutVariant = getPrecutVariant;
            }
          }
        } else {
          simpleVariant = currentVariant;
        }

        if ( currentSelectedOption == 'custom' && $( `.tab_header > a[href="#custom_size"].active` ).length > 0 ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
            .attr({
              "title": simpleVariant.title,
              "vid": ( typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.id !== 'undefined' && simpleVariant.id ? simpleVariant.id : '' ),
              "precut-vid": ( typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.id !== 'undefined' && precutVariant.id ? precutVariant.id : '' ),
              "price": ( typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.price !== 'undefined' && simpleVariant.price ? simpleVariant.price : '' ),
              "precut-price": ( typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.price !== 'undefined' && precutVariant.price ? precutVariant.price : '' ),
              "option-selected": currentSelectedOption
            });
        } else if ( currentSelectedOption == 'popular' && $( `.tab_header > a[href="#popular_size"].active` ).length > 0 ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
            .attr({
              "title": simpleVariant.title,
              "vid": ( typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.id !== 'undefined' && simpleVariant.id ? simpleVariant.id : '' ),
              "precut-vid": ( typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.id !== 'undefined' && precutVariant.id ? precutVariant.id : '' ),
              "price": ( typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.price !== 'undefined' && simpleVariant.price ? simpleVariant.price : '' ),
              "precut-price": ( typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.price !== 'undefined' && precutVariant.price ? precutVariant.price : '' ),
              "option-selected": currentSelectedOption
            });
        }
        // console.log ( 'currentSelectedOptioncurrentSelectedOption', currentSelectedOption );
        // $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
        //   .attr({
        //     "vid": simpleVariant.id,
        //     "precut-vid": precutVariant.id,
        //     "price": simpleVariant.price,
        //     "precut-price": precutVariant.price,
        //     "option-selected": currentSelectedOption
        //   });
      }
    }
    if ( isGangPage ) {
      checkSelectedSizeAndApply();
    }
    let qty = 0;
    if ( isSizesBlock > 0 ) {
      $( `product-variants popular-wrap` ).hide();
      $( `sizes-blocks .widthHeight__custom[item]` ).each(function() {
        const itemQty = $( this ).find( `.customQtyFile__qty` ).val() * 1;
        $( this ).attr( `qty`, itemQty );
        qty += itemQty;
      })
      const getItemsLen = $( `sizes-blocks .widthHeight__custom[item]` ).length;
      if ( getItemsLen == 1 ) {
        $( `sizes-blocks .widthHeight__custom[item] .del_item` ).css({'opacity': 0, 'visibility': 'hidden'});
      } else {
        $( `sizes-blocks .widthHeight__custom[item] .del_item` ).removeAttr( `style` );
      }
    } else {
      qty = $( `.customQtyFile__qty` ).val();
    }
    if ( qty == '' ) {
      qty = 0;
    } else {
      qty = +qty;
    }
    if ( typeof getCalculatedQty__ !== 'undefined' && getCalculatedQty__ > 0 ) {
      qty = qty + getCalculatedQty__;
    }
    let selectedIndex = 0;
    $( `preCutPrice` ).text( `` );
    const isPreCutActive = $( `#precutselected` ).is( `:checked` );
    let preCutPrice, selectedCartItem;

    if ( typeof alreadyCartItems !== 'undefined' && alreadyCartItems.length > 0 ) {
      if ( currentTitle.includes( alreadyCartItems.matchingTitle ) ) {
      }
      // selectedCartItem = findObjectByKey( alreadyCartItems, 'pid', currentPID );
      selectedCartItem = alreadyCartItems;
    }
    if ( typeof selectedCartItem !== 'undefined' && selectedCartItem && typeof isTitleMatched !== 'undefined' && isTitleMatched ) {
      // qty = qty + 1;
    }

    const isQtyEle = $( `.form__properties input[name="quantity"]` ).length;
    if ( isQtyEle > 0 ) {
      $( `.form__properties input[name="quantity"]` ).val( qty );
    } else {
      $( `.form__properties` ).append( `<input type="hidden" name="quantity" value="${ qty }">` );
    }
    $( `.customTabelPlace.rowList .customTabelPlace__item` ).each(function() {
      const min     = $( this ).attr( `min` ) * 1;
      const max     = $( this ).attr( `max` ) * 1;
      const indexNo = $( this ).attr( `index` ) * 1;
      if ( qty >= min && qty <= max ) {
        selectedIndex = indexNo;
        const percentage  = $( this ).find( `.customTabelPlace__item_2` ).text().trim();
        let getDiscountedPricenly = $( this ).find( `.customTabelPlace__item_3 discount` ).text().trim();
        let unitPrice   = $( this ).find( `.customTabelPlace__item_3` ).text().trim();
        let unitPriceStrikeOut = '';

        if ( isPreCutActive ) {
          preCutPrice = $( this ).attr( `pre-cut` );
          //$( `pre-cut` ).text( `($${ preCutPrice } each)` );
          preCutPrice = preCutPrice * 1;
          getDiscountedPricenly_ = getDiscountedPricenly * 1;

          let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
          // together = together * 1;

          unitPrice = unitPrice.replace( getDiscountedPricenly, together );
        } else {
          //$( `pre-cut` ).text( `` );
        }
        if ( percentage !== '' ) {
          const getBasePrice = $( `.customTabelPlace__item[index="1"] .customTabelPlace__item_3` ).text().trim();
          unitPriceStrikeOut = `<div style="text;text-decoration: line-through;font-weight: 400; font-size: 14px; opacity: 0.6;">${ getBasePrice }</div>`;
        }
        $( `.customQtyFile__selectedData.percentage` ).html( `${ percentage !== '' ? percentage : `&nbsp;` }` );
        $( `.customQtyFile__selectedData.unitPrice > span` ).html( `${ unitPrice !== '' ? `${ unitPriceStrikeOut }${ unitPrice }${ typeof isPreCutActive !== 'undefined' && isPreCutActive ? ` <span style="font-weight: 400; font-size: small;">with precut</span>` : `` }${ typeof textUnderPrice !== 'undefined' && textUnderPrice ? `<div style="font-weight: normal; font-size: 0.8rem;">${ textUnderPrice }</div>` : '' }` : `&nbsp;` }` );
      }
    })

    $( `.customTabelPlace.colList .customTabelPlace__item` ).each(function() {
      const min     = $( this ).attr( `min` ) * 1;
      const max     = $( this ).attr( `max` ) * 1;
      const indexNo = $( this ).attr( `index` ) * 1;
      if ( qty >= min && qty <= max ) {
        selectedIndex = indexNo;
        let percentage  = $( this ).find( `.customTabelPlace__item_2 .customTabelPlace__item_discount` ).text().trim();
        let getDiscountedPricenly = $( this ).find( `.customTabelPlace__item_2 discount` ).text().trim();
        let unitPrice   = $( this ).find( `.customTabelPlace__item_2 .customTabelPlace__item_price` ).text().trim();

        if ( isPreCutActive ) {
          preCutPrice = $( this ).attr( `pre-cut` );
          //$( `pre-cut` ).text( `($${ preCutPrice } each)` );
          preCutPrice = preCutPrice * 1;
          getDiscountedPricenly_ = getDiscountedPricenly * 1;

          let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
          // together = together * 1;

          unitPrice = unitPrice.replace( getDiscountedPricenly, together );
        } else {
          //$( `pre-cut` ).text( `` );
        }
        if ( percentage == '-' ) {
          percentage = '';
        }
        $( `.customQtyFile__selectedData.percentage` ).html( `${ percentage !== '' ? percentage : `&nbsp;` }` );
        $( `.customQtyFile__selectedData.unitPrice > span` ).html( `${ unitPrice !== '' ? `${ unitPrice }${ typeof isPreCutActive !== 'undefined' && isPreCutActive ? ` <span style="font-weight: 400; font-size: small;">with precut</span>` : `` }${ typeof textUnderPrice !== 'undefined' && textUnderPrice ? `<div style="font-weight: normal; font-size: 0.8rem;">${ textUnderPrice }</div>` : '' }` : `&nbsp;` }` );
      }
    })
    // if ( type != 'btnClicked' ) {
      let newQty;
      if ( typeof selectedCartItem !== 'undefined' && selectedCartItem && typeof isTitleMatched !== 'undefined' && isTitleMatched ) {
        // console.log ( 'selectedCartItem', selectedCartItem );
        if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
          newQty = qty;
        } else if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
          newQty = selectedCartItem[0].spangleQty + qty;
        } else if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
          newQty = selectedCartItem[0].stickersQty + qty;
        } else {
          newQty = selectedCartItem[0].qty + qty;
        }

        // console.log ( 'newQty', newQty );

        $( `.customTabelPlace.rowList .customTabelPlace__item` ).each(function() {
          const min     = $( this ).attr( `min` ) * 1;
          const max     = $( this ).attr( `max` ) * 1;
          const indexNo = $( this ).attr( `index` ) * 1;
          if ( newQty >= min && newQty <= max ) {
            selectedIndex = indexNo;
            const percentage  = $( this ).find( `.customTabelPlace__item_2` ).text().trim();
            let getDiscountedPricenly = $( this ).find( `.customTabelPlace__item_3 discount` ).text().trim();
            let unitPrice   = $( this ).find( `.customTabelPlace__item_3` ).text().trim();
            let unitPriceStrikeOut = '';

            if ( isPreCutActive ) {
              preCutPrice = $( this ).attr( `pre-cut` );
              //$( `pre-cut` ).text( `($${ preCutPrice } each)` );
              preCutPrice = preCutPrice * 1;
              getDiscountedPricenly_ = getDiscountedPricenly * 1;

              let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
              // together = together * 1;

              unitPrice = unitPrice.replace( getDiscountedPricenly, together );
            } else {
              //$( `pre-cut` ).text( `` );
            }
            if ( percentage !== '' ) {
              const getBasePrice = $( `.customTabelPlace__item[index="1"] .customTabelPlace__item_3` ).text().trim();
              unitPriceStrikeOut = `<div style="text;text-decoration: line-through;font-weight: 400; font-size: 14px; opacity: 0.6;">${ getBasePrice }</div>`;
            }
            $( `.customQtyFile__selectedData.percentage` ).html( `${ percentage !== '' ? percentage : `&nbsp;` }` );
            $( `.customQtyFile__selectedData.unitPrice > span` ).html( `${ unitPrice !== '' ? `${ unitPriceStrikeOut }${ unitPrice }${ typeof isPreCutActive !== 'undefined' && isPreCutActive ? ` <span style="font-weight: 400; font-size: small;">with precut</span>` : `` }${ typeof textUnderPrice !== 'undefined' && textUnderPrice ? `<div style="font-weight: normal; font-size: 0.8rem;">${ textUnderPrice }</div>` : '' }` : `&nbsp;` }` );
          }
        })

        $( `.customTabelPlace.colList .customTabelPlace__item` ).each(function() {
          const min     = $( this ).attr( `min` ) * 1;
          const max     = $( this ).attr( `max` ) * 1;
          const indexNo = $( this ).attr( `index` ) * 1;
          if ( newQty >= min && newQty <= max ) {
            selectedIndex = indexNo;

            let percentage  = $( this ).find( `.customTabelPlace__item_2 .customTabelPlace__item_discount` ).text().trim();
            let getDiscountedPricenly = $( this ).find( `.customTabelPlace__item_2 discount` ).text().trim();
            let unitPrice   = $( this ).find( `.customTabelPlace__item_2 .customTabelPlace__item_price` ).text().trim();

            if ( isPreCutActive ) {
              preCutPrice = $( this ).attr( `pre-cut` );
              //$( `pre-cut` ).text( `($${ preCutPrice } each)` );
              preCutPrice = preCutPrice * 1;
              getDiscountedPricenly_ = getDiscountedPricenly * 1;

              let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
              // together = together * 1;

              unitPrice = unitPrice.replace( getDiscountedPricenly, together );
            } else {
              //$( `pre-cut` ).text( `` );
            }
            if ( percentage == '-' ) {
              percentage = '';
            }
            $( `.customQtyFile__selectedData.percentage` ).html( `${ percentage !== '' ? percentage : `&nbsp;` }` );
            $( `.customQtyFile__selectedData.unitPrice > span` ).html( `${ unitPrice !== '' ? `${ unitPrice }${ typeof isPreCutActive !== 'undefined' && isPreCutActive ? ` <span style="font-weight: 400; font-size: small;">with precut</span>` : `` }${ typeof textUnderPrice !== 'undefined' && textUnderPrice ? `<div style="font-weight: normal; font-size: 0.8rem;">${ textUnderPrice }</div>` : '' }` : `&nbsp;` }` );
          }
        })

      } else {
        newQty = qty;
      }

      $( `.customTabelPlace .customTabelPlace__item` ).removeClass( `selected` ).find( `qty-counter` ).text( `` );
      $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).addClass( `selected` ).find( `qty-counter` ).text( `${ newQty } pcs` );
      // $( `.customTabelPlace .customTabelPlace__itemsWrap` ).removeClass( `vAll` );
      $( `.customTabelPlace .customTabelPlace__item` ).removeClass( `barSelected` );
      $( `.customTabelPlace.rowList .customTabelPlace__item__msg` ).remove();

      const maxQtyOfRow = $( `.customTabelPlace .customTabelPlace__item.selected` ).attr( `max` ) * 1;

      let cart__msg = '';

      if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'Cumulative' ) {
        if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
          isLastMinumum = 1999;
        } else {
          isLastMinumum = 249;
        }
      }

      if ( typeof selectedCartItem !== 'undefined' && selectedCartItem && newQty < ( isLastMinumum + 1 ) ) {
        if ( newCartMsgs.itemsAvailableInCart.includes ( '[QTY]' ) ) {
          if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
            cart__msg = newCartMsgs.itemsAvailableInCart.replace( `[QTY]`, getCumulativeQty(0, qty, maxQtyOfRow) );
          } else if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
            cart__msg = newCartMsgs.itemsAvailableInCart.replace( `[QTY]`, getCumulativeQty(selectedCartItem[0].spangleQty, qty, maxQtyOfRow) );
          } else if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
            cart__msg = newCartMsgs.itemsAvailableInCart.replace( `[QTY]`, getCumulativeQty(selectedCartItem[0].stickersQty, qty, maxQtyOfRow) );
          } else {
            cart__msg = newCartMsgs.itemsAvailableInCart.replace( `[QTY]`, getCumulativeQty(selectedCartItem[0].qty, qty, maxQtyOfRow) );
          }
          // console.log (`Function: ${cart__msg} || PageQty: ${qty}  || CartQty: ${selectedCartItem.qty} || Max qty: ${ maxQtyOfRow }`);
        }
        if ( cart__msg.includes( '[NEXT_DISCOUNT]' ) ) {
          const nextDiscount = $( `.customTabelPlace .customTabelPlace__item.selected` ).attr( `next-off` );
          cart__msg = cart__msg.replace( `[NEXT_DISCOUNT]`, nextDiscount );
        }
      } else if ( newQty > isLastMinumum ) {
        cart__msg = newCartMsgs.maxDiscount;
      } else {
        cart__msg = newCartMsgs.emptyCart;
        if ( cart__msg.includes ( '[QTY]' ) ) {
          const takeNextMin = $( `.customTabelPlace .customTabelPlace__item.selected` ).next( `.customTabelPlace__item` ).attr( `min` );
          if ( typeof takeNextMin !== 'undefined' && takeNextMin ) {
            if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
              cart__msg = cart__msg.replace( `[QTY]`, getCumulativeQty(0, newQty, maxQtyOfRow) );
            } else if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
              cart__msg = cart__msg.replace( `[QTY]`, getCumulativeQty(0, newQty, maxQtyOfRow) );
            } else {
              cart__msg = cart__msg.replace( `[QTY]`, getCumulativeQty(0, newQty, maxQtyOfRow) );
            }
          }
        }
        if ( cart__msg.includes( '[NEXT_DISCOUNT]' ) ) {
          const nextDiscount = $( `.customTabelPlace .customTabelPlace__item.selected` ).attr( `next-off` );
          cart__msg = cart__msg.replace( `[NEXT_DISCOUNT]`, nextDiscount );
        }
      }

      // newCartMsgs.emptyCart;
      // newCartMsgs.itemsAvailableInCart;
      // newCartMsgs.maxDiscount;
      if ( typeof rowIndex__1 !== 'undefined' && rowIndex__1 ) {
        rowIndex__1 = rowIndex__1 * 1;
      } else {
        rowIndex__1 = 14;
      }
      if ( typeof rowIndex__2 !== 'undefined' && rowIndex__2 ) {
        rowIndex__2 = rowIndex__2 * 1;
      } else {
        rowIndex__2 = 49;
      }
      if ( typeof rowIndex__3 !== 'undefined' && rowIndex__3 ) {
        rowIndex__3 = rowIndex__3 * 1;
      } else {
        rowIndex__3 = 99;
      }
      if ( typeof rowIndex__4 !== 'undefined' && rowIndex__4 ) {
        rowIndex__4 = rowIndex__4 * 1;
      } else {
        rowIndex__4 = 249;
      }
      if ( typeof rowIndex__5 !== 'undefined' && rowIndex__5 ) {
        rowIndex__5 = rowIndex__5 * 1;
      } else {
        rowIndex__5 = 499;
      }
      if ( typeof rowIndex__6 !== 'undefined' && rowIndex__6 ) {
        rowIndex__6 = rowIndex__6 * 1;
      } else {
        rowIndex__6 = 999;
      }
      if ( typeof rowIndex__7 !== 'undefined' && rowIndex__7 ) {
        rowIndex__7 = rowIndex__7 * 1;
      } else {
        rowIndex__7 = 1999;
      }
      if ( typeof rowIndex__8 !== 'undefined' && rowIndex__8 ) {
        rowIndex__8 = rowIndex__8 * 1;
      } else {
        rowIndex__8 = 2999;
      }
      if ( typeof rowIndex__9 !== 'undefined' && rowIndex__9 ) {
        rowIndex__9 = rowIndex__9 * 1;
      } else {
        rowIndex__9 = 3999;
      }
      if ( typeof rowIndex__10 !== 'undefined' && rowIndex__10 ) {
        rowIndex__10 = rowIndex__10 * 1;
      } else {
        rowIndex__10 = 2999;
      }
      if ( typeof rowIndex__11 !== 'undefined' && rowIndex__11 ) {
        rowIndex__11 = rowIndex__11 * 1;
      } else {
        rowIndex__11 = 2999;
      }
      if ( typeof rowIndex__12 !== 'undefined' && rowIndex__12 ) {
        rowIndex__12 = rowIndex__12 * 1;
      } else {
        rowIndex__12 = 3999;
      }
      if ( typeof rowIndex__13 !== 'undefined' && rowIndex__13 ) {
        rowIndex__13 = rowIndex__13 * 1;
      } else {
        rowIndex__13 = 3999;
      }
      if ( typeof rowIndex__14 !== 'undefined' && rowIndex__14 ) {
        rowIndex__14 = rowIndex__14 * 1;
      } else {
        rowIndex__14 = 3999;
      }


      if ( newQty > rowIndex__1 ) {
        $( `.customTabelPlace__itemWrapViewAll` ).removeClass( `hidden` );
      } else {
        $( `.customTabelPlace__itemWrapViewAll` ).addClass( `hidden` );
      }

      // console.log ( 'selectedIndex, newQty, cart__msg', selectedIndex, newQty, cart__msg );

      barSelectedFunc( selectedIndex, newQty, cart__msg );

      setTimeout(() => {
        $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).addClass( `selected` );
      }, 100);

      readjustSelectedBar();
    // }
    const getEliteDiscount = $( `.customTabelPlace__item.selected .customTabelPlace__item_4` ).text().trim();
    if ( typeof customerIsMember !== 'undefined' && customerIsMember && typeof getEliteDiscount !== 'undefined' && getEliteDiscount ) {
      $( `.customQtyFile__selectedData.unitPrice > span` ).html( `${ getEliteDiscount !== '' ? `${ getEliteDiscount }${ typeof textUnderPrice !== 'undefined' && textUnderPrice ? `<div style="font-weight: normal; font-size: 0.8rem;">${ textUnderPrice }</div>` : '' }` : `&nbsp;` }` );
    }


    if ( typeof _qtyupdate === 'function' ) {
      _qtyupdate();
    }

    const isPhysicalFileAvailable = $( `.cl-upload--wrapper .filepond--data` ).html();
    if ( typeof isPhysicalFileAvailable !== 'undefined' && isPhysicalFileAvailable ) {
    } else {
      $( `.customTabelPlace__item.selected` )
        .removeClass( `selected` );
    }
    if ( typeof imgPreview_priceTable !== 'undefined' && imgPreview_priceTable ) {
      newPriceTableLogic( selectedIndex, currentVariant );
    }
    manageProperties();
  } catch ( err ) {
    console.log( `ERROR manageQuantities`, err.message );
  }
}


function readjustSelectedBar() {
  try {
    if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
      const isSelectedAvailable = $( `.customTabelPlace .customTabelPlace__item.selected` ).length;
      let getHeight, getTopPosition;
      if ( isSelectedAvailable > 0 ) {
        getHeight = $( `.customTabelPlace .customTabelPlace__item.selected` ).outerHeight();
        getTopPosition = $( `.customTabelPlace .customTabelPlace__item.selected` ).position();
      } else {
        getHeight = $( `.customTabelPlace .customTabelPlace__item[index="1"]` ).outerHeight();
        getTopPosition = $( `.customTabelPlace .customTabelPlace__item[index="1"]` ).position();
      }

      if ( typeof getTopPosition !== 'undefined' && getTopPosition ) {
        getTopPosition = getTopPosition.top;
      }

      $( `.customTabelPlace__item__selectedBar` ).css({
        "top": `${ getTopPosition }px`,
        "height": `${ getHeight }px`
      });
    } else {
      const getHeight = $( `.customTabelPlace .customTabelPlace__item.selected` ).outerHeight();
      let getTopPosition = $( `.customTabelPlace .customTabelPlace__item.selected` ).position();

      if ( typeof getTopPosition !== 'undefined' && getTopPosition ) {
        getTopPosition = getTopPosition.top;
      }

      $( `.customTabelPlace__item__selectedBar` ).css({
        "top": `${ getTopPosition }px`,
        "height": `${ getHeight }px`
      });
    }
  } catch ( err ) {
    console.log( `ERROR readjustSelectedBar()`, err.message );
  }
}


function newPriceTableLogic( selectedIndex, currentVariant ) {
  try {
    let selectionType, currentWidth, currentHeight = '';
    const isSizesBlock = $( `sizes-blocks` ).length;
    const selectedTabIs = $( `#size_selection .tab_header a.active` ).text().trim();
    if ( selectedTabIs.includes( `Custom` ) ) {
      selectionType = 'custom';
    } else {
      selectionType = 'popular';
    }
    let precutOption, getQty;
    if ( isSizesBlock > 0 ) {
      if ( precutOptionAvailable ) {
        precutOption = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .precutWrapper #precutselected__` ).prop( `checked` );
      } else {
        precutOption =  false;
      }
      getQty = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic [name="quantity"]` ).val() * 1;
    } else {
      precutOption = $( `.precutWrapper #precutselected` ).prop( `checked` );
      getQty = $( `precut-unit-logic [name="quantity"]` ).val() * 1;
    }

    //console.log(selectedIndex, currentVariant," ----selectedIndex, currentVariant")
    if ( isSizesBlock > 0 ) {
      if ( currentVariant == null ) {
        let getSelectedTierVID = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `vid` );
        if ( typeof getSelectedTierVID !== 'undefined' && getSelectedTierVID ) {
          getSelectedTierVID = getSelectedTierVID * 1;
          const tempObj = findObjectByKey( allVariants, 'id', getSelectedTierVID );
          if ( typeof tempObj !== 'undefined' && tempObj ) {
            currentVariant = tempObj;
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr({
              "price": currentVariant.price
            });
          }
        }
      }
      const discountedPercent = $( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `off` ) * 1;
      $( `precut-unit-logic .precut-unit-logic__discount span` ).html( `${ discountedPercent != 0 ? `${ discountedPercent }% off` : '&nbsp;' }` );
      if($( `precut-unit-logic .precut-unit-logic__discount span` ).html() == "&nbsp;"){
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "8px","opacity":0});
        // $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__originalPrice ` ).hide();
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] popular-wrap price-calc .__discountedPrice` ).css({"position": "relative", "top": "-12px"});
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .price-calc__x,.price-calc__equal` ).css({"margin-top": "8px"});
        // $(".precut-unit-logic__discount").css({"margin-top": "24px"});
      } else{
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "14px","opacity":1});
        // $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).show();
        $(`sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] popular-wrap price-calc .__discountedPrice`).css({"position": "static"});
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .price-calc__x,.price-calc__equal` ).css({"margin-top": "8px"});
        // $(".precut-unit-logic__discount").css({"margin-top": "24px"});
      }
      const discountAmount = ((typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) * discountedPercent) / 100;
      const finalPrice = ( typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) - discountAmount;
      if ( selectionType == 'custom' ) {
        /* square inches Price Calculations */
        // $( `precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ ( currentVariant.price / currentSquareInches ).toFixed( 3 ) }` );
        // $( `precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).text( `$${ ( ( ( currentVariant.price - ( currentVariant.price * discountedPercent ) / 100 ) ) / currentSquareInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) }` );
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).text( `$${ ( ( ( (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) - ( (typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) * getQty ).toFixed( 2 ) }` );
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      } else if ( selectionType == 'popular' ) {
        let popularSqInches = currentVariant.option1.toLowerCase();
        popularSqInches = popularSqInches.replaceAll( '"', '' );
        if ( popularSqInches.includes( `x` ) ) {
          currentWidth = popularSqInches.split( `x` )[0] * 1;
          currentHeight = popularSqInches.split( `x` )[1] * 1;
          popularSqInches = currentWidth * currentHeight;
        }

        /* square inches Price Calculations */
        $( `price-calc .price-calc__priceIn .__originalPrice` ).text( `$${ ( (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) / popularSqInches ).toFixed( 3 ) }` );
        $( `price-calc .price-calc__priceIn .__discountedPrice` ).text( `$${ ( ( ( (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) - ( (typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) * discountedPercent ) / 100 ) ) / popularSqInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
        $( `price-calc .price-calc__each .__originalPrice` ).text( `$${ (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) }` );
        $( `price-calc .price-calc__each .__discountedPrice` ).text( `$${ ( ( ( (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) - ( (typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( (typeof currentVariant !== 'undefined' && currentVariant && typeof currentVariant.price !== 'undefined' && currentVariant.price ? currentVariant.price : 0) * getQty ).toFixed( 2 ) }` );
        $( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      }
      // console.log ( 'new price logic 1',  );
      updatedPriceLogic( selectedIndex );
      // console.log ( 'new price logic 2',  );

    } else {
      const discountedPercent = $( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `off` ) * 1;
      $( `precut-unit-logic .precut-unit-logic__discount` ).html( `${ discountedPercent != 0 ? `${ discountedPercent }% off` : '&nbsp;' }` );
      if($( `precut-unit-logic .precut-unit-logic__discount` ).html() == "&nbsp;"){
        $( `price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "8px","opacity":0});
        $( `precut-unit-logic .precut-unit-logic__total .__originalPrice ` ).hide();
        $(`popular-wrap price-calc .__discountedPrice`).css({"position": "relative", "top": "-12px"});
        $(".price-calc__x,.price-calc__equal").css({"margin-top": "8px"});
        $(".precut-unit-logic__discount").css({"margin-top": "24px"});
      } else{
        $( `price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "14px","opacity":1});
        $( `precut-unit-logic .precut-unit-logic__total .__originalPrice ` ).show();
        $(`popular-wrap price-calc .__discountedPrice`).css({"position": "static"});
        $(".price-calc__x,.price-calc__equal").css({"margin-top": "8px"});
        $(".precut-unit-logic__discount").css({"margin-top": "24px"});
      }
      const discountAmount = (currentVariant.price * discountedPercent) / 100;
      const finalPrice = currentVariant.price - discountAmount;
      if ( selectionType == 'custom' ) {
        /* square inches Price Calculations */
        $( `price-calc .price-calc__priceIn .__originalPrice` ).text( `$${ ( currentVariant.price / currentSquareInches ).toFixed( 3 ) }` );
        $( `price-calc .price-calc__priceIn .__discountedPrice` ).text( `$${ ( ( ( currentVariant.price - ( currentVariant.price * discountedPercent ) / 100 ) ) / currentSquareInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
        $( `price-calc .price-calc__each .__originalPrice` ).text( `$${ currentVariant.price }` );
        $( `price-calc .price-calc__each .__discountedPrice` ).text( `$${ ( ( ( currentVariant.price - ( currentVariant.price * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( currentVariant.price * getQty ).toFixed( 2 ) }` );
        $( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      } else if ( selectionType == 'popular' ) {
        let popularSqInches = currentVariant.option1.toLowerCase();
        popularSqInches = popularSqInches.replaceAll( '"', '' );
        if ( popularSqInches.includes( `x` ) ) {
          currentWidth = popularSqInches.split( `x` )[0] * 1;
          currentHeight = popularSqInches.split( `x` )[1] * 1;
          popularSqInches = currentWidth * currentHeight;
        }

        /* square inches Price Calculations */
        $( `price-calc .price-calc__priceIn .__originalPrice` ).text( `$${ ( currentVariant.price / popularSqInches ).toFixed( 3 ) }` );
        $( `price-calc .price-calc__priceIn .__discountedPrice` ).text( `$${ ( ( ( currentVariant.price - ( currentVariant.price * discountedPercent ) / 100 ) ) / popularSqInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
        $( `price-calc .price-calc__each .__originalPrice` ).text( `$${ currentVariant.price }` );
        $( `price-calc .price-calc__each .__discountedPrice` ).text( `$${ ( ( ( currentVariant.price - ( currentVariant.price * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( currentVariant.price * getQty ).toFixed( 2 ) }` );
        $( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      }
    }

  } catch ( err ) {
    console.log( `ERROR newPriceTableLogic()`, err.message );
  }
}


async function updatedPriceLogic( selectedIndex = null ) {
  try {
    // console.log ( 'updatedPriceLogic',  );
    
    let getVID;
    $( `product-variants popular-wrap` ).hide();
    if ( selectedIndex == null ) {
      selectedIndex = $( `custom-table .customTabelPlace__item.selected` ).attr( `index` ) * 1;
    } else {
    }
    let getDiscountPercent = $( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `off` );
    let isPreCutActive = false;
    /*
    if ( precutOptionAvailable ) {
      isPreCutActive = $( `#precutselected__` ).is( `:checked` );
    }
    */
    let preCutPrice = 0;
    if ( isPreCutActive ) {
      preCutPrice = $( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `pre-cut` );
      if ( typeof preCutPrice !== 'undefined' && preCutPrice ) {
        $( `precut-wrapper pre-cut` ).text( `($${ preCutPrice } each)` );
      } else {
        $( `precut-wrapper pre-cut` ).text( `` );
      }
    } else {
      $( `precut-wrapper pre-cut` ).text( `` );
    }
    preCutPrice = 0;
    if ( typeof getDiscountPercent !== 'getDiscountPercent' && getDiscountPercent ) {
      getDiscountPercent = getDiscountPercent * 1;
      $( `sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).removeClass( `hidden` );
    } else {
      getDiscountPercent = 0;
      $( `sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).addClass( `hidden` );
    }

    let recheckDiscount = '&nbsp;';

    // console.log ( 'isPreCutActive', isPreCutActive );
    // console.log ( 'recheckDiscount', recheckDiscount );
    // console.log ( 'getDiscountPercent', getDiscountPercent );

    $( `sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).each(function() {
      const qty = $( this ).find( `precut-unit-logic .precut-unit-logic__qty .customQtyFile__qty` ).val() * 1;
      let unitPrice = $( this ).attr( `price` ) * 1;
      if ( isPreCutActive ) {
        unitPrice = $( this ).attr( `precut-price` ) * 1;
      } else {
        unitPrice = $( this ).attr( `price` ) * 1;
      }

      if ( recheckDiscount == '&nbsp;' ) {
        const isDiscountAvailable = $( this ).find( `precut-unit-logic .precut-unit-logic__discount span` ).text().trim();
        if ( typeof isDiscountAvailable !== 'undefined' && isDiscountAvailable ) {
          recheckDiscount = isDiscountAvailable;
        }
      }

      unitPrice = unitPrice + preCutPrice;

      let unitDiscountPrice = (unitPrice * getDiscountPercent) / 100;
      unitDiscountPrice = unitPrice - unitDiscountPrice;

      $( this ).find( `precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ unitPrice.toFixed( 2 ) }` );
      $( this ).find( `precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).html( `$${ unitDiscountPrice.toFixed( 2 ) }<span>ea.</span>` );

      $( this ).find( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ (unitPrice * qty).toFixed(2) }` );
      $( this ).find( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).text( `$${ (unitDiscountPrice * qty).toFixed(2) }` );
    })

    $( `sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).each(function() {
      const qty = $( this ).find( `precut-unit-logic .precut-unit-logic__qty .customQtyFile__qty` ).val() * 1;
      let unitPrice = $( this ).attr( `price` ) * 1;
      if ( isPreCutActive ) {
        unitPrice = $( this ).attr( `precut-price` ) * 1;
      } else {
        unitPrice = $( this ).attr( `price` ) * 1;
      }

      if ( recheckDiscount == '&nbsp;' ) {
        const isDiscountAvailable = $( this ).find( `precut-unit-logic .precut-unit-logic__discount span` ).text().trim();
        if ( typeof isDiscountAvailable !== 'undefined' && isDiscountAvailable ) {
          recheckDiscount = isDiscountAvailable;
        }
      }

      unitPrice = unitPrice + preCutPrice;

      let unitDiscountPrice = (unitPrice * getDiscountPercent) / 100;
      unitDiscountPrice = unitPrice - unitDiscountPrice;

      $( this ).find( `precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ unitPrice.toFixed( 2 ) }` );
      $( this ).find( `precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).html( `$${ unitDiscountPrice.toFixed( 2 ) }<span>ea.</span>` );

      $( this ).find( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ (unitPrice * qty).toFixed(2) }` );
      $( this ).find( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).text( `$${ (unitDiscountPrice * qty).toFixed(2) }` );
    })

    if ( recheckDiscount == '&nbsp;' || recheckDiscount == 'NaN% off' ) {
      $( `sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).addClass( `hidden` );
      $( `sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__discount > span` ).css( `opacity`, 0 );
    } else {
      $( `sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).removeClass( `hidden` );
      $( `sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__discount > span` ).css( `opacity`, 1 );
    }

    if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
      await addDelay( 1000 );
    }
    readjustSelectedBar();
    setImageDimensions();
    if ( isPreCutActive ) {
      getVID = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `precut-vid` ) * 1;
    } else {
      getVID = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `vid` ) * 1;
    }
    // console.log ( 'getVID', getVID, `isPreCutActive`, isPreCutActive );
    if ( typeof getVID !== 'undefined' && getVID ) {
      customTableReManage( getVID, isPreCutActive );
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function customTableReManage( vid, isPreCutActive ) {
  try {
    if ( typeof vid !== 'undefined' && vid ) {
      let vPrice;
      if ( isPreCutActive ) {
        vPrice = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `precut-price` ) * 1;
      } else {
        vPrice = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `price` ) * 1;
      }
      const percent_100 = 100;
      $( `custom-table .customTabelPlace .customTabelPlace__itemsWrap .customTabelPlace__item` ).each(function() {
        let getOff = $( this ).attr( `off` );
        if ( typeof getOff !== 'undefined' && getOff ) {
          getOff = getOff * 1;
        } else {
          getOff = 0;
        }
        getOff      = ( percent_100 - getOff ) / 100;

        let eliteDiscount = $( this ).attr( `elite-discount` ) * 1;
        eliteDiscount = ( percent_100 - eliteDiscount ) / 100;

        $( this )
          .find( `discount` )
          .text( `${ ( vPrice * getOff ).toFixed(2) }` );

        $( this )
          .find( `elite-discount` )
          .text( `${ (( vPrice * getOff ) * eliteDiscount ).toFixed(2) }` );
      })
    }
  } catch ( err ) {
    console.log( `ERROR customTableReManage()`, err.message );
  }
}

function barSelectedFunc( selectedIndex, newQty, cart__msg ) {
  try {
    if ( typeof totalRow === 'undefined' ) {
      totalRow = $( `.customTabelPlace .customTabelPlace__item` ).length;
    }
    for (let i = 0; i < selectedIndex; i++) {
      const index__ = i;
      $( `.customTabelPlace .customTabelPlace__item[index="${ index__ }"]` ).addClass( `barSelected` )
    }
    $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).append( `<div class="customTabelPlace__item__msg">${ cart__msg }</div>` );
    if ( selectedIndex == 1 ) {
      $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"] .customTabelPlace__item_qtyPercent` ).css( `width`, `${ newQty * 2.5 }%` );
    } else if ( selectedIndex == totalRow ) {
      $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"] .customTabelPlace__item_qtyPercent` ).css( `width`, `52.73%` );
    } else {
      if ( selectedIndex == 1 ) {
      } else if ( selectedIndex == 2 ) {
      } else if ( selectedIndex == 3 ) {
      } else if ( selectedIndex == 4 ) {
      } else if ( selectedIndex == 5 ) {
      } else if ( selectedIndex == 6 ) {
      } else if ( selectedIndex == 7 ) {
      } else if ( selectedIndex == 8 ) {
      } else if ( selectedIndex == 9 ) {
      } else if ( selectedIndex == 10 ) {
      } else if ( selectedIndex == 11 ) {
      } else if ( selectedIndex == 12 ) {
      } else if ( selectedIndex == 13 ) {
      } else if ( selectedIndex == 14 ) {
      }
    }
  } catch ( err ) {
    console.log( `ERROR barSelectedFunc()`, err.message );
  }
}


function getCumulativeQty(cartQty, pageQty, max) {
  let cartState =  cartQty + pageQty;
  let x = max - cartState;
  if ( pageQty === 1 ) return (max + 2) - cartState;
  if(x === 0 ) return 1;
  x = max - cartState;
  return x + 1
}
function getRadioMaintain( by ) {
  try {
    let width, height;
    const isSizesBlock = $( `sizes-blocks` ).length;
    if ( isSizesBlock > 0 ) {
      width = document.querySelector( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="width__value"]` );
      height = document.querySelector( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="height__value"]` );
    } else {
      width = document.querySelector( `.widthHeight__value[name="width__value"]` );
      height = document.querySelector( `.widthHeight__value[name="height__value"]` );
    }

    // let widthMax    = width.getAttribute( `max` ) * 1;
    // let heightMax   = height.getAttribute( `max` ) * 1;

    // let widthLast   = width.getAttribute( `last` );
    // let heightLast  = height.getAttribute( `last` );

    const widthVal  = parseFloat(width.value);
    const heightVal = parseFloat(height.value);

    const getWidth  = ratioBy( 'w', widthVal, heightVal );
    const getHeight = ratioBy( 'h', widthVal, heightVal );

    let autoChange  = false;
    let checkAutoChangeEle;
    if ( isSizesBlock > 0 ) {
      checkAutoChangeEle = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange .autoChange` ).length;
      if ( checkAutoChangeEle > 0 ) {
        const isEnabledAutoChange = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange .autoChange` ).is( ':checked' );
        if ( isEnabledAutoChange ) {
          autoChange  = true;
        }
      }
    } else {
      checkAutoChangeEle = $( `.widthHeight__autoChange .autoChange` ).length;
      if ( checkAutoChangeEle > 0 ) {
        const isEnabledAutoChange = $( `.widthHeight__autoChange .autoChange` ).is( ':checked' );
        if ( isEnabledAutoChange ) {
          autoChange  = true;
        }
      }
    }


    if ( typeof autoChange !== 'undefined' && autoChange ) {
      if ( by == 'width' ) {
        height.value = getHeight.toFixed(2);
        height.setAttribute( `value`, getHeight.toFixed(2) );
        if ( getHeight > userDefinedMaxLength ) {
          if ( isSizesBlock > 0 ) {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"]` ).addClass( `error` );
          } else {
            $( `.widthHeight__item[by="height"]` ).addClass( `error` );
          }
        }
      } else if ( by == 'height' ) {
        width.value  = getWidth.toFixed(2);
        width.setAttribute( `value`, getWidth.toFixed(2) );
        if ( getWidth > userDefinedMaxHeight ) {
          if ( isSizesBlock > 0 ) {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="width"]` ).addClass( `error` );
          } else {
            $( `.widthHeight__item[by="width"]` ).addClass( `error` );
          }
        }
      }
    }

    getVariantsBySize();
  } catch ( err ) {
    console.log( `ERROR getRadioMaintain`, err.message );
  }
}


function getRadioMaintainImg( by,width,height ) {
  try {

    const widthVal  = parseFloat(width);
    const heightVal = parseFloat(height);

    const getWidth  = ratioBy( 'w', widthVal, heightVal );
    const getHeight = ratioBy( 'h', widthVal, heightVal );

    if ( by == 'width' ) {
      return roundOffNumbers(getHeight.toFixed(2).toString());
    } else if ( by == 'height' ) {
      return roundOffNumbers(getWidth.toFixed(2).toString());
    }

  } catch ( err ) {
    console.log( `ERROR getRadioMaintainImg`, err.message );
  }
}

function roundOffNumbers(w){
  /* let _w = Number(w.split(".")[1]);
  if(w.indexOf(".") != -1){
  if(_w <= 25 ){
    w = w.split(".")[0]+".00";
  }else if(_w > 25 && _w < 65){
    w = w.split(".")[0]+".50";
  }else if(_w >= 65 && _w <= 85){
    w = w.split(".")[0]+".75";
  }else{
    w = Number(w.split(".")[0]);
    w = (Number(w)+1)+".00";
  }
  } */
  return w;
}
function calculateratioForImage(){
  if(isDTFPage == true){
  let w       = document.querySelector( `.widthHeight__value[name="width__value"]` ).value;
  let h      = document.querySelector( `.widthHeight__value[name="height__value"]` ).value;

  let _w = Number(w.split(".")[1]);
  let _h = Number(h.split(".")[1]);
  w = roundOffNumbers(w);
  h = roundOffNumbers(h);
  // alert(w+"--"+h);

  if ( typeof isUVProduct !== 'undefined' && isUVProduct ) {
    if ( h > w ) {
      let w__ = getRadioMaintainImg('height',w,6);
      if ( w__ <= 3 )
        $(".dtf_body_image ._first span").html(getRadioMaintainImg('height',w,6)+'" x 6"');
      else
        $(".dtf_body_image ._first span").html('3" x '+getRadioMaintainImg('width',3,h)+'"');
    } else {
      $(".dtf_body_image ._first span").html('3" x '+getRadioMaintainImg('width',3,h)+'"');
    }
    if ( h > w ) {
      let w__ = getRadioMaintainImg('height',w,4);
      if ( w__ <= 2 )
        $(".dtf_body_image ._second span").html(getRadioMaintainImg('height',w,4)+'" x 4"');
      else
        $(".dtf_body_image ._second span").html('2" x '+getRadioMaintainImg('width',2,h)+'"');
    } else {
      $(".dtf_body_image ._second span").html('2" x '+getRadioMaintainImg('width',2,h)+'"');
    }

    if ( h > w ) {
      let w__ = getRadioMaintainImg('height',w,11);
      if ( w__ <= 9 )
        $(".dtf_body_image ._third span").html(getRadioMaintainImg('height',w,11)+'" x 11"');
      else
        $(".dtf_body_image ._third span").html('9" x '+getRadioMaintainImg('width',9,h)+'"');
    } else {
      $(".dtf_body_image ._third span").html('9" x '+getRadioMaintainImg('width',9,h)+'"');
    }

    if ( h > w ) {
      let w__ = getRadioMaintainImg('height',w,2.5);
      if ( w__ <= 2.5 )
        $(".dtf_body_image ._forth span").html(getRadioMaintainImg('height',w,2.5)+'" x 2.5"');
      else
        $(".dtf_body_image ._forth span").html('2.5" x '+getRadioMaintainImg('width',2.5,h)+'"');
    } else if ( h == w ) {
      $(".dtf_body_image ._forth span").html('2.5" x 2.5"');
    } else {
      $(".dtf_body_image ._forth span").html('2.5" x '+getRadioMaintainImg('width',2.5,h)+'"');
    }

    if ( h > w ) {
      let w__ = getRadioMaintainImg('height',w,9);
      if ( w__ <= 11 )
        $(".dtf_body_image ._fifth span").html(getRadioMaintainImg('height',w,9)+'" x 9"');
      else
        $(".dtf_body_image ._fifth span").html('11" x '+getRadioMaintainImg('width',11,h)+'"');
    } else {
      let h__ = getRadioMaintainImg('width',11,h);
      if ( h__ <= 9 )
        $(".dtf_body_image ._fifth span").html('11" x '+getRadioMaintainImg('width',11,h)+'"');
      else
        $(".dtf_body_image ._fifth span").html(getRadioMaintainImg('height',w,9)+'" x 9"');
    }

    if ( h > w ) {
      let w__ = getRadioMaintainImg('height',w,7.5);
      if ( w__ <= 6 )
        $(".dtf_body_image ._sixth span").html(getRadioMaintainImg('height',w,7.5)+'" x 7.5"');
      else
        $(".dtf_body_image ._sixth span").html('6" x '+getRadioMaintainImg('width',6,h)+'"');
    } else {
      $(".dtf_body_image ._sixth span").html('6" x '+getRadioMaintainImg('width',6,h)+'"');
    }
  } else {
    if(h > w){
      let w__ = getRadioMaintainImg('height',w,20);
      if(w__ <= 11 )
        $(".dtf_body_image ._first span").html(getRadioMaintainImg('height',w,20)+'" x 20"');
      else
        $(".dtf_body_image ._first span").html('11" x '+getRadioMaintainImg('width',11,h)+'"');
    } else {
      $(".dtf_body_image ._first span").html('11" x '+getRadioMaintainImg('width',11,h)+'"');
    }
    if( h > w ){
      let w__ = getRadioMaintainImg('height',w,2.5);
      if(w__ <= 5 )
        $(".dtf_body_image ._second span").html(getRadioMaintainImg('height',w,2.5)+'" x 2.5"');
      else
        $(".dtf_body_image ._second span").html('5" x '+getRadioMaintainImg('width',5,h)+'"');
    } else {
      let h__ = getRadioMaintainImg('width',5,h);
      if(h__ <= 2.5)
        $(".dtf_body_image ._second span").html('5" x '+getRadioMaintainImg('width',5,h)+'"');
      else
      $(".dtf_body_image ._second span").html(getRadioMaintainImg('height',w,2.5)+'" x 2.5"');
    }

    if(h > w){
      let w__ = getRadioMaintainImg('height',w,6);
      if(w__ <= 3.5 )
        $(".dtf_body_image ._third span").html(getRadioMaintainImg('height',w,6)+'" x 6"');
      else
        $(".dtf_body_image ._third span").html('3.5" x '+getRadioMaintainImg('width',3.5,h)+'"');
    } else {
      $(".dtf_body_image ._third span").html('3.5" x '+getRadioMaintainImg('width',3.5,h)+'"');
    }

    if(h > w){
      let w__ = getRadioMaintainImg('height',w,9);
      if(w__ <= 7 )
        $(".dtf_body_image ._forth span").html(getRadioMaintainImg('height',w,9)+'" x 9"');
      else
          $(".dtf_body_image ._forth span").html('7" x '+getRadioMaintainImg('width',7,h)+'"');
    } else {
      $(".dtf_body_image ._forth span").html('7" x '+getRadioMaintainImg('width',7,h)+'"');
    }


    if(h > w){
      let w__ = getRadioMaintainImg('height',w,9);
      if(w__ <= 11 )
        $(".dtf_body_image ._fifth span").html(getRadioMaintainImg('height',w,9)+'" x 9"');
      else
        $(".dtf_body_image ._fifth span").html('11" x '+getRadioMaintainImg('width',11,h)+'"');
    } else {
      let h__ = getRadioMaintainImg('width',11,h);
      if(h__ <= 9)
        $(".dtf_body_image ._fifth span").html('11" x '+getRadioMaintainImg('width',11,h)+'"');
      else
        $(".dtf_body_image ._fifth span").html(getRadioMaintainImg('height',w,9)+'" x 9"');
    }


    if(h > w){
      let w__ = getRadioMaintainImg('height',w,10);
      if(w__ <= 5 )
        $(".dtf_body_image ._sixth span").html(getRadioMaintainImg('height',w,10)+'" x 10"');
      else
        $(".dtf_body_image ._sixth span").html('5" x '+getRadioMaintainImg('width',5,h)+'"');
    }else{
      $(".dtf_body_image ._sixth span").html('5" x '+getRadioMaintainImg('width',5,h)+'"');
    }
  }
  }
}

function reAdjustSizes() {
  try {
    const isSizesBlock = $( `sizes-blocks` ).length;
    let width, height;
    if ( isSizesBlock > 0 ) {
      height    =   $( `.widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` );
      width     =   $( `.widthHeight__custom[item="${ selectedItemNo }"] input[name="width__value"]` );
    } else {
      height    =   $( `input[name="height__value"]` );
      width     =   $( `input[name="width__value"]` );
    }

    const heightVal =   height.val() * 1;
    const widthVal  =   width.val() * 1;

    if ( widthVal > userDefinedMaxLength || heightVal > userDefinedMaxHeight ) {
      if ( widthVal == heightVal ) {
        if ( widthVal > userDefinedMaxLength ) {
          width
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'width' );
          if ( isSizesBlock > 0 ) {
            $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).addClass( `error` );
          } else {
            $( `.widthHeight__item` ).addClass( `error` );
          }
        }
      } else if ( widthVal > userDefinedMaxLength && heightVal > userDefinedMaxHeight ) {
        if ( widthVal > heightVal ) {
          width
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'width' );
          if ( isSizesBlock > 0 ) {
            $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
            $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="width"]` ).addClass( `error` );
          } else {
            $( `.widthHeight__item` ).removeClass( `error` );
            $( `.widthHeight__item[by="width"]` ).addClass( `error` );
          }
        } else if ( heightVal > widthVal ) {
          height
            .val( userDefinedMaxHeight.toFixed(2) )
            .prop( userDefinedMaxHeight.toFixed(2) );
          getRadioMaintain( 'height' );
          if ( isSizesBlock > 0 ) {
            $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
            $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"]` ).addClass( `error` );
          } else {
            $( `.widthHeight__item` ).removeClass( `error` );
            $( `.widthHeight__item[by="height"]` ).addClass( `error` );
          }
        }
      } else if ( widthVal > userDefinedMaxLength && heightVal < userDefinedMaxHeight ) {
        width
          .val( userDefinedMaxLength.toFixed(2) )
          .prop( userDefinedMaxLength.toFixed(2) );
        getRadioMaintain( 'width' );
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="width"]` ).addClass( `error` );
        } else {
          $( `.widthHeight__item` ).removeClass( `error` );
          $( `.widthHeight__item[by="width"]` ).addClass( `error` );
        }
      } else if ( heightVal > userDefinedMaxHeight && widthVal < userDefinedMaxLength ) {
        height
          .val( userDefinedMaxHeight.toFixed(2) )
          .prop( userDefinedMaxHeight.toFixed(2) );
        getRadioMaintain( 'height' );
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"]` ).addClass( `error` );
        } else {
          $( `.widthHeight__item` ).removeClass( `error` );
          $( `.widthHeight__item[by="height"]` ).addClass( `error` );
        }
      }
    } else {
      setTimeout(()=>{
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item] .widthHeight__item` ).removeClass( `error` );
        } else {
          $( `.widthHeight__item` ).removeClass( `error` );
        }
      }, 4000);
    }

    setTimeout(()=>{
      manageQuantities( `btnClicked` );
    }, 500);
  } catch ( err ) {
    console.log( `ERROR reAdjustSizes()`, err.message );
  }
}


async function getVariantsBySize() {
  try {
    const isSizesBlock = $( `sizes-blocks` ).length;
    let getWidth, getHeight;
    if ( isSizesBlock > 0 ) {
      getWidth    =   $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    } else {
      getWidth    =   $( `.widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( `.widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    }
    const getSquareIn =   Math.ceil( getWidth * getHeight );
    currentSquareInches = getSquareIn;
    let isVariantMatched  =   false;

    $( `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
      const min = $( this ).attr( `min` ) * 1;
      const max = $( this ).attr( `max` ) * 1;
      if ( getSquareIn >= min && getSquareIn <= max ) {
        isVariantMatched  =   true;
        if($(`product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""]) input:checked`).val() != $( this ).find( `input` ).val())
        if($('[href="#custom_size"]').hasClass("active") == true){
          $( this ).find( `label` ).click();
          manageProperties();
        }
      }
    })

    if ( isVariantMatched ) {

      await ApplyDelay( 300 );
      if($('[href="#custom_size"]').hasClass("active") == true){
        $( `.widthHeight__option.customOption` ).click();
        manageProperties();
      }

    } else if ( userDefinedMaxLength != userDefinedMaxHeight && getSquareIn > allowedMaxInches && getWidth > userDefinedMaxLength || userDefinedMaxLength != userDefinedMaxHeight && getSquareIn > allowedMaxInches && getHeight > userDefinedMaxHeight ) {
      console.log ( 'error here 11',  );
      await ApplyDelay( 300 );
      $( `.widthHeight__item` ).addClass( `error` );
      if($('[href="#custom_size"]').hasClass("active") == true){
        $( `.widthHeight__option.customOption` ).click();
        manageProperties();
      }

      let autoChangeCheckbox;
      if ( isSizesBlock > 0 ) {
        autoChangeCheckbox = $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).is( `:checked` );
      } else {
        autoChangeCheckbox = $( `.widthHeight__autoChange #autoChange` ).is( `:checked` );
      }

      if ( autoChangeCheckbox == false ) {
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).click();
        } else {
          $( `.widthHeight__autoChange #autoChange` ).click();
        }
        await ApplyDelay( 50 );

        if ( isSizesBlock > 0 ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__value` ).trigger( `keyup` );
          // $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
        } else {
          $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
        }

        await ApplyDelay( 100 );
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).click();
        } else {
          $( `.widthHeight__autoChange #autoChange` ).click();
        }
      }
    } else if ( getSquareIn > allowedMaxInches && getWidth > userDefinedMaxLength || getSquareIn > allowedMaxInches && getHeight > userDefinedMaxHeight ) {

      await ApplyDelay( 300 );
      $( `.widthHeight__item` ).addClass( `error` );
      if($('[href="#custom_size"]').hasClass("active") == true){
        $( `.widthHeight__option.customOption` ).click();
        manageProperties();
      }

      let autoChangeCheckbox;
      if ( isSizesBlock > 0 ) {
        autoChangeCheckbox = $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).is( `:checked` );
      } else {
        autoChangeCheckbox = $( `.widthHeight__autoChange #autoChange` ).is( `:checked` );
      }

      if ( autoChangeCheckbox == false ) {
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).click();
        } else {
          $( `.widthHeight__autoChange #autoChange` ).click();
        }
        await ApplyDelay( 50 );

        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
        } else {
          $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
        }

        await ApplyDelay( 100 );
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).click();
        } else {
          $( `.widthHeight__autoChange #autoChange` ).click();
        }
      }
    } else {
      const isMinMax_available = $( `.product-variant__item.product-variant__item--radio[min="470"][max="509"]` ).length;
      if ( isMinMax_available > 0 ) {
        $( `.product-variant__item.product-variant__item--radio[min="470"][max="509"]` )
          .find( `label` )
          .click();
      } else {
        $( `.product-variant__item.product-variant__item--radio[min][max]` )
          .first( `label` )
          .click();
      }

      await ApplyDelay( 300 );

    }

    manageProperties();
  } catch ( err ) {
    console.log( `ERROR getVariantsBySize()`, err.message );
  }
}

function manageProperties() {
  try {
    const isSizesBlock = $( `sizes-blocks` ).length;
    let getWidth, getHeight;
    if ( isSizesBlock > 0 ) {
      getWidth    =   $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    } else {
      getWidth    =   $( `.widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( `.widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    }
    let detectedSize  =   $( `.widthHeight__option-detectedSize span[d-size]` ).text();
    detectedSize      =   detectedSize.replace( '"', '' ).replace( '"', '' ).replace( ' ', '' ).replace( ' ', '' );
    let getQty;
    if ( isSizesBlock > 0 ) {
      getQty = $( `.widthHeight__custom[item="${ selectedItemNo }"] .customQtyFile__wrapper .customQtyFile__qty` ).val();
    } else {
      getQty = $( `.customQtyFile__wrapper .customQtyFile__qty` ).val();
    }

    let isPopularSizeSelected;
    const isTabPillDesign = $( `#size_selection .tab_header` ).length;
    if ( isTabPillDesign > 0 ) {
      isPopularSizeSelected = $( `#size_selection .tab_header a[href="#popular_size"].active` ).length;
    } else {
      isPopularSizeSelected = $( `.widthHeight__option.popularOption.selected` ).length;
    }

    if ( isPopularSizeSelected > 0 ) {
      $( `.form__properties` )
        .html( `
          <input type="hidden" name="quantity" value="${ getQty }">
        ` );
        // .html( `
        //   <textarea style="display: none;" name="properties[_specialNote]">Detected Size: ${ typeof detectedSize !== 'undefined' && detectedSize ? detectedSize : null }</textarea>
        // ` );
    } else {
      // console.log ( 'getWidth', getWidth );
      if ( typeof getWidth !== 'undefined' && getWidth ) {
        // console.log ( 'getWidth chaa', getWidth );
        // console.log ( 'getHeight', getHeight );
        $( `.form__properties` )
          .html( `
            <input type="hidden" name="properties[_width]" value="${ getWidth }">
            <input type="hidden" name="properties[_height]" value="${ getHeight }">
            <input type="hidden" name="quantity" value="${ getQty }">
          ` );
        if ( typeof isPuffProduct !== 'undefined' && isPuffProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
          puffImgPreviewSize();
        } else {
          $(".horizontal_direction span").html(`${ parseFloat(getWidth).toFixed(2) }"`);
          $(".verticle_direction span").html(`${ parseFloat(getHeight).toFixed(2) }"`);
        }
        // <input type="hidden" name="properties[Detected Size]" value="${ detectedSize }">
      }
    }
    setTimeout(() => {
      if ( getWidth > getHeight && getWidth > userDefinedMaxLength ) {
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="width__value"] + .widthHeight__item__action-plus` ).click();
        } else {
          $( `.widthHeight__custom .widthHeight__value[name="width__value"] + .widthHeight__item__action-plus` ).click();
        }
      } else if ( getWidth < getHeight && getHeight > userDefinedMaxHeight ) {
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="height__value"]` ).val( 21.5 );
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        } else {
          $( `.widthHeight__custom .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        }
      } else if ( getWidth == getHeight && getHeight > userDefinedMaxHeight ) {
        if ( isSizesBlock > 0 ) {
          $( `.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        } else {
          $( `.widthHeight__custom .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        }
      }
    }, 100);
    $(".custom_tab_container").removeClass("is_disabled");
    if ( isSizesBlock > 0 ) {
      $(`.widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action`).removeClass("disabled");
    } else {
      $(`.widthHeight__item__action`).removeClass("disabled");
    }
    // $(".easyzoom").removeClass("image-loading");
    //alert("hi");
  } catch ( err ) {
    console.log( `ERROR manageProperties()`, err.message );
  }
}
var timeout__;
$( document )
.on(`keyup`, `input[name="width__value"], input[name="height__value"]`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `.addToCartGroupItems, .custom_tabs .tab_header` ).addClass( `disabled` );
    clearTimeout( timeout__ );
    timeout__ = setTimeout(() => {
      const isSizesBlock = $( `sizes-blocks` ).length;
      if ( isSizesBlock > 0 ) {
        let dpiErr = false;
        const item = $( this ).closest( `.widthHeight__custom[item]` );
        selectedItemNo = item.attr( `item` );
        const selectedOption__ = item.attr( `option-selected` );
        let getVal = $( this ).val() * 1;
        console.log ( 'getVal', getVal );
        let otherVal = 0;
        let by = $( this ).closest( `.widthHeight__item__action` ).attr( `by` );
        if ( by == 'width' ) {
          otherVal = $( this ).closest( `.widthHeight__custom` ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() * 1;
        } else if ( by == 'height' ) {
          otherVal = $( this ).closest( `.widthHeight__custom` ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() * 1;
        }
        let isWarningErrorActive = item.find( `dpi-warning` ).hasClass( `active` );
        if ( getVal < userDefinedMinWidth ) {
          $( this ).val( userDefinedMinWidth ).attr( `value`, userDefinedMinWidth ).addClass( `minError` );
          getVal = userDefinedMinWidth;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        }
        let largerDefinedVal;
        if ( userDefinedMaxLength == userDefinedMaxHeight ) {
          largerDefinedVal = userDefinedMaxLength;
        } else if ( userDefinedMaxLength > userDefinedMaxHeight ) {
          largerDefinedVal = userDefinedMaxLength;
        } else if ( userDefinedMaxHeight > userDefinedMaxLength ) {
          largerDefinedVal = userDefinedMaxHeight;
        }
        if ( getVal == otherVal && getVal > userDefinedMaxLength ) {
          console.log ( 'this condition true',  );
        }
        console.log ( 'bybyby', by );
        if ( by == 'width' && getVal > userDefinedMaxLength ) {
          $( this ).val( userDefinedMaxLength ).addClass( `error` );
          getVal = userDefinedMaxLength;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( by == 'height' && getVal > userDefinedMaxHeight ) {
          $( this ).val( userDefinedMaxHeight ).addClass( `error` );
          getVal = userDefinedMaxHeight;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        }
        const getRatio = getNewRatio( `#fileupload_hero`, by );
        const newVal = calculateNewWidth_orNewHeight( getRatio, by, getVal );

        console.log ( 'newVal', newVal );

        if ( by == 'height' && newVal > userDefinedMaxLength ) {
          item.find( `.widthHeight__item__action[by="width"] .widthHeight__value` ).val( userDefinedMaxLength ).attr( `value`, userDefinedMaxLength ).addClass( `error` );

          const getRatio = getNewRatio( `#fileupload_hero`, 'width' );

          const newVal_ = calculateNewWidth_orNewHeight( getRatio, 'width', userDefinedMaxLength );
          console.log ( 'newVal_ H', newVal_ );
          item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal_.toFixed( 2 ) ).attr( `value`, newVal_.toFixed( 2 ) ).addClass( `error` );

          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( by == 'width' && newVal > userDefinedMaxHeight ) {
          item.find( `.widthHeight__item__action[by="height"] .widthHeight__value` ).val( userDefinedMaxHeight ).attr( `value`, userDefinedMaxHeight ).addClass( `error` );
          const getRatio = getNewRatio( `#fileupload_hero`, 'height' );
          const newVal_ = calculateNewWidth_orNewHeight( getRatio, 'height', userDefinedMaxHeight );
          console.log ( 'newVal_ W', newVal_ );
          item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal_.toFixed( 2 ) ).attr( `value`, newVal_.toFixed( 2 ) ).addClass( `error` );

          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( newVal < userDefinedMinWidth ) {
          if ( by == 'width' ) {
            item.find( `.widthHeight__item__action[by="height"] .widthHeight__value` ).val( userDefinedMinWidth ).attr( `value`, userDefinedMinWidth ).addClass( `minError` );

            const getRatio = getNewRatio( `#fileupload_hero`, 'height' );

            const newVal = calculateNewWidth_orNewHeight( getRatio, 'height', userDefinedMinWidth );
            item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `minError` );

            if ( isWarningErrorActive ) {
              item.find( `dpi-warning` ).removeClass( `active` );
              dpiErr = true;
            }
          } else if ( by == 'height' ) {
            item.find( `.widthHeight__item__action[by="width"] .widthHeight__value` ).val( userDefinedMinWidth ).attr( `value`, userDefinedMinWidth ).addClass( `minError` );
            const getRatio = getNewRatio( `#fileupload_hero`, 'width' );
            const newVal = calculateNewWidth_orNewHeight( getRatio, 'width', userDefinedMinWidth );
            item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `minError` );

            if ( isWarningErrorActive ) {
              item.find( `dpi-warning` ).removeClass( `active` );
              dpiErr = true;
            }
          }
        } else {
          if ( by == 'width' ) {
            item.find( `.widthHeight__item__action[by="height"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) );
          } else if ( by == 'height' ) {
            item.find( `.widthHeight__item__action[by="width"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) );
          }
        }

        setTimeout(() => {
          item.find( `.widthHeight__item__action .widthHeight__value` ).removeClass( `error minError` );
          if ( dpiErr ) {
            item.find( `dpi-warning` ).addClass( `active` );
            dpiErr = false;
          }
          calculateDPILineItem( selectedOption__ );
        }, 1500);
        manageQuantities();
      }
      $( `.addToCartGroupItems, .custom_tabs .tab_header` ).removeClass( `disabled` );
    }, 1000);
  } catch ( err ) {
    console.log( `ERROR input[name="width__value"], input[name="height__value"]`, err.message );
  }
})
;

function calculateDPILineItem(type = "custom") {
  // console.log ( 'type', type );
  if ( typeof fileExt !== 'undefined' && fileExt ) {
    if ( fileExt == 'png' || fileExt == 'jpg' || fileExt == 'jpeg' ) {

      let physicalWidthInInches = $(`sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="width__value"]`).val();
      let physicalHeightInInches = $(`sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="height__value"]`).val();
      if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
        physicalWidthInInches = $( `sizes-blocks .widthHeight__custom.bumperStickers[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `w` ) * 1;
        physicalHeightInInches = $( `sizes-blocks .widthHeight__custom.bumperStickers[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `h` ) * 1;
      }
      let makeSqInchesForPopular, makeSqInchesForCustom, currentSqInches = 0;
      if ( type == 'popular' ) {
        physicalWidthInInches = Number($( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val().split( ` x ` )[0].replace( '"', '' ).replace( '^', '' ));
        physicalHeightInInches = Number($( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val().split( ` x ` )[1].replace('"','').replace( '^', '' ));

        makeSqInchesForPopular = physicalWidthInInches * physicalHeightInInches;
      } else if ( type == 'custom' ) {
        makeSqInchesForCustom = (uploadedFileWidth * uploadedFileHeight) / 72;
        currentSqInches = ( physicalWidthInInches * physicalHeightInInches ) * 72;
      }

      const pixelWidth = uploadedFileWidth;
      const pixelHeight = uploadedFileHeight;
      // Calculate DPI
      const dpiWidth = pixelWidth / physicalWidthInInches;
      const dpiHeight = pixelHeight / physicalHeightInInches;

      let dpi =  (parseFloat(dpiWidth) + parseFloat(dpiHeight)) / 2;

      if ( type == 'custom' ) {
        if ( makeSqInchesForCustom < 288 ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
        } else if ( makeSqInchesForCustom > 288 && makeSqInchesForCustom > currentSqInches ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).removeClass( `active` );
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `` );
        } else {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
        }
      } else if ( type == 'popular' ) {
        const recommendedSqInches = ((uploadedFileWidth / 72) * (uploadedFileHeight / 72));
        // console.log ( 'recommendedSqInches', recommendedSqInches );
        // console.log ( 'makeSqInchesForPopular', makeSqInchesForPopular );
        if ( recommendedSqInches < 4 ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
        } else if ( makeSqInchesForPopular < recommendedSqInches ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).removeClass( `active` );
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `` );
        } else {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
        }
      } else {
        // $( `.dpi_warning recommended-size` ).text( `` );
      }
    }
  }
}

function calculateNewWidth_orNewHeight(ratio, by, widthOrHeight) {
  if ( by == 'width' ) {
    const [ratioWidth, ratioHeight] = ratio.split(':').map(Number);
    const newWidth = (widthOrHeight * ratioWidth) / ratioHeight;
    return newWidth;
  } else if ( by == 'height' ) {
    const [ratioHeight, ratioWidth] = ratio.split(':').map(Number);
    const newWHeight = (widthOrHeight * ratioHeight) / ratioWidth;
    return newWHeight;
  }
}

function getRatioFunc(height, width) {
  function gcd(x, y) {
      return y === 0 ? x : gcd(y, x % y);
  }

  const greatestCommonDivisor = gcd(height, width);
  const ratioHeight = height / greatestCommonDivisor;
  const ratioWidth = width / greatestCommonDivisor;

  return `${ratioHeight}:${ratioWidth}`;
}

function getNewRatio( selector, by ) {
  const getWidth = $( selector ).width() * 1;
  const getHeight = $( selector ).height() * 1;

  let getRatio;
  if ( by == 'height' ) {
    getRatio = getRatioFunc( getWidth, getHeight );
  } else if ( by == 'width' ) {
    getRatio = getRatioFunc( getHeight, getWidth );
  } else {
    getRatio = null;
  }
  return getRatio;
}

function ratioBy( type, w, h ) {
  try {
    if ( type == 'w' ) {

      let aspectRatio   =   ratio_width / ratio_height;
      return parseFloat( ( h * aspectRatio ).toFixed(2) );

    } else if ( type == 'h' ) {
      let aspectRatio   =   ratio_width / ratio_height;
      return parseFloat( ( w / aspectRatio ).toFixed(2) );
    }
  } catch ( err ) {
    console.log( `ERROR ratioBy`, err.message );
  }
}

async function cartItems() {
  try {
    await $.get('/cart?view=ajax', async function ( r ) {
      $( `cart-drawer.drawer` )
        .removeClass( `is-empty` )
        .find( `.drawer__inner` )
        .html( r );
    });
  } catch ( err ) {
    console.log( `ERROR cartItems()`, err.message );
  }
}

async function add2Cart( obj ) {
  try {
    let rtn;
    await $.post(`/cart/add.js`, obj, function ( r ) {
      rtn   =   r;
    },"json");
    return rtn;
  } catch ( err ) {
    console.log( `ERROR add2Cart`, err.message );
  }
}

function calculateRatio( num_1, num_2 ) {
  num_1 = num_1 * 1;
  num_2 = num_2 * 1;

  for(num=num_2; num>1; num--) {
    if((num_1 % num) == 0 && (num_2 % num) == 0) {
      num_1=num_1/num;
      num_2=num_2/num;
    }
  }
  ratio_width   =   num_1 * 1;
  ratio_height  =   num_2 * 1;
}

// ************
async function executeNextStep(imgURL, removebg = true, file_name = false, forcesave = true, s3Key = null, defaultloader = true, file_crc = null ) {
  const isSizesBlock = $( `sizes-blocks` ).length;
  let isFileFromURL = false;
  if(location.search.indexOf("file=") > -1){
    isFileFromURL = true
  }


  /**
  * Generating Search Query Params
  */
  const queryParamsObject = new URLSearchParams();

   queryParamsObject.set('trim', 'colorUnlessAlpha');
  
 // queryParamsObject.set( 'trim', 'color');
  var file_url = imgURL;
  if($("#option_checkbox").prop("checked") == false && $("#option_checkbox_upscale").prop("checked") == false){
    file_url = imgURL.split("?")[0];
  }else if($("#option_checkbox").prop("checked") == true && $("#option_checkbox_upscale").prop("checked") == false ){
      file_url = imgURL.split("?")[0];
    queryParamsObject.set( `bg-remove`, true );
   // queryParamsObject.set( 'trim', 'colorUnlessAlpha');
      // file_url = file_url+"?bg-remove=true&trim=color";
  }else if($("#option_checkbox").prop("checked") == false && $("#option_checkbox_upscale").prop("checked") == true ){
      file_url = imgURL.split("?")[0];
      queryParamsObject.set( `upscale`, true );
     // queryParamsObject.set('trim', 'colorUnlessAlpha');
      // file_url = file_url+"?upscale=true&trim=auto";
  }else if($("#option_checkbox").prop("checked") == true && $("#option_checkbox_upscale").prop("checked") == true ){
      file_url = imgURL.split("?")[0];
      queryParamsObject.set('bg-remove', true);
      queryParamsObject.set('upscale', true);
    //  queryParamsObject.set('trim', 'colorUnlessAlpha');
      // file_url =  imgURL.split("?")[0];
      // file_url = file_url+"?bg-remove=true&upscale=true&trim=color";
  }

  file_url = queryParamsObject.toString().length > 0 ?  `${ file_url }?${ queryParamsObject.toString() }` : file_url

  if(isGangPage == true){
    file_url = imgURL.split("?")[0].replace(ninjaImgixHost,ninjaS3Host2);
  }
  /* print file on console to see all attributes */

  /* url contains the link to the file */
  //uploadedFile = file_url;

  if ( file_url != '' ) {

    fileExt = file_url.split('.').pop();

    if ( fileExt.includes( `?` ) ) {
      fileExt = fileExt.split( `?` )[0];
    }
    fileExt = fileExt.toLowerCase();

    if(isGangPage == true){
      executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc );
      executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc );
    } else if ( fileExt == 'psd' || fileExt == 'eps' || fileExt == 'ai' ) {

      let getApiResponse;
      if ( fileExt == 'eps' || fileExt == 'ai' ) {
        getApiResponse  =   await sendApiRequest( `${ file_url }?trim=colorUnlessAlpha` );
      } else {
        getApiResponse  =   await sendApiRequest( `${ file_url }`, s3Key );
      }
      if ( typeof getApiResponse !== 'undefined' && getApiResponse.success === true ) {
        if ( typeof getApiResponse.data.dimensions !== 'undefined' && getApiResponse.data.dimensions ) {
          if ( fileExt == 'eps' || fileExt == 'ai' ) {
            file_width  =   ( getApiResponse.data.dimensions.width * 4.166666666666667 ) * 300;
            file_height =   ( getApiResponse.data.dimensions.height * 4.166666666666667 ) * 300;
          } else {
            file_width  =   getApiResponse.data.dimensions.width * 300;
            file_height =   getApiResponse.data.dimensions.height * 300;
          }
        }

      } else {
        file_width  =   300;
        file_height =   300;
      }

      $( `.widthHeight__option.customOption .widthHeight__option-detectedSize` ).html( `Detected size: <span d-size>${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"</span>` );
      $(".fileupload_info p").html(`<strong>Cropped size</strong> ${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"`);
      if ( isSizesBlock > 0 ) {
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` ).val( `${ (file_height / 72).toFixed(2) }` ).attr( `value`, `${ (file_height / 72).toFixed(2) }` );
        $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` ).val( `${ (file_width / 72).toFixed(2) }` ).attr( `value`, `${ (file_width / 72).toFixed(2) }` );
      } else {
        $( `.widthHeight__block [name="height__value"]` ).val( `${ (file_height / 72).toFixed(2) }` );
        $( `.widthHeight__block [name="width__value"]` ).val( `${ (file_width / 72).toFixed(2) }` );
      }

      if(isFileFromURL == true){
        $(".fileupload_info p").html(`<strong>Cropped size</strong> 11.00" x 11.00"`);
        if ( isSizesBlock > 0 ) {
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` ).val( `11.00` ).attr( `value`, `11.00` );
          $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` ).val( `11.00` ).attr( `value`, `11.00` );
        } else {
          $( `.widthHeight__block [name="height__value"]` ).val( `11.00` );
          $( `.widthHeight__block [name="width__value"]` ).val( `11.00` );
        }
      }

      setTimeout(()=>{
        $( `variant-radios .product-form__input__wrapper[min=""][max=""]` )
          .first()
          .find( `> label` )
          .click();

        setTimeout(()=>{
          const file__W = ( file_width / 300 ).toFixed(2);
          const file__H = ( file_height / 300 ).toFixed(2);

          if ( file__H > file__W && file__H > userDefinedMaxHeight ) {
            if ( isSizesBlock > 0 ) {
              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            } else {
              $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            }
          } else if ( file__W > file__H && file__W > userDefinedMaxLength ) {
            if ( isSizesBlock > 0 ) {
              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
            } else {
              $( `.widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
            }
          } else if ( file__W > userDefinedMaxLength && file__H > userDefinedMaxHeight ) {
            if ( isSizesBlock > 0 ) {
              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            } else {
              $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            }
          }
        }, 100);
      }, 500);

      executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc );
      executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc );

    } else {
      let getApiResponse;
      if ( fileExt == 'pdf' ) {
        file_url = `${ file_url }?fm=png`;
        getApiResponse  =   await sendApiRequest( `${ file_url }`, s3Key );
      }
      getImageDimensions(file_url, (dimensions, error) => {
        if (error) {
          console.error(error);
        } else {
          if ( fileExt == 'svg' ) {
            if ( typeof noWidthAndHeightForSVG !== 'undefined' && noWidthAndHeightForSVG ) {
              const getUnitForMultiple = 2480 / dimensions.width;
              file_width = dimensions.width * getUnitForMultiple;
              file_height = dimensions.height * getUnitForMultiple;
              $( `#fileupload_hero` ).addClass( `previewFullWidth` );
            } else {
              file_width = dimensions.width * 4.168067226890756;
              file_height = dimensions.height * 4.168067226890756;
            }
          } else if ( fileExt == 'pdf' && typeof getApiResponse !== 'undefined' && getApiResponse ) {
            if ( getApiResponse.data.dimensions.width > getApiResponse.data.dimensions.height ) {
              let makeMultiplier = getApiResponse.data.dimensions.height / ( dimensions.height / 300 );
              // console.log ( 'makeMultiplier', makeMultiplier );

              file_width = dimensions.width * makeMultiplier;
              file_height = dimensions.height * makeMultiplier;
            } else {
              let makeMultiplier = getApiResponse.data.dimensions.width / ( dimensions.width / 300 );
              // console.log ( 'makeMultiplier', makeMultiplier );

              file_width = dimensions.width * makeMultiplier;
              file_height = dimensions.height * makeMultiplier;
            }
          } else {
            if ( beforeUpScale__Width != 0 && beforeUpScale__height != 0 ) {
              file_width = beforeUpScale__Width;
              file_height = beforeUpScale__height;
              beforeUpScale__Width = 0;
              beforeUpScale__height = 0;
            } else {
              file_width = dimensions.width;
              file_height = dimensions.height;
            }

            // console.log ( 'file_width', file_width );
            // console.log ( 'file_height', file_height );

            // if ( file_width == file_height ) {
            //   file_height = file_height - 100;
            // }

            // console.log ( 'file_width', file_width );
            // console.log ( 'file_height', file_height );

            const getTotalPixels = dimensions.width * dimensions.height;
            uploadedFileWidth = dimensions.width;
            uploadedFileHeight = dimensions.height;
            if ( file_width == file_height ) {
              uploadedFileHeight = uploadedFileHeight;
            }
            if ( getTotalPixels > 1000000 && isFileUpload ) {
              $( `.fileupload_bg_options .style3` ).last().hide();
            }
          }

          dimensionsClassesApply( uploadedFileWidth, uploadedFileHeight );

          $( `.widthHeight__option.customOption .widthHeight__option-detectedSize` )
            .html( `Detected size: <span d-size>${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"</span>` );

          $(".fileupload_info p span").html(`${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"`);

          if ( isSizesBlock > 0 ) {
            if ( file_width == file_height ) {
              uploadedFileHeight = uploadedFileHeight;
            }
            if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct ) {
              const stickerWidth = (file_width / 300).toFixed(2) / 2;
              console.log ( 'stickerWidth divisionBy', stickerWidth );
              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` )
              .val( `${ ((file_height / 300) / stickerWidth).toFixed( 2 ) }` ).attr( `value`, `${ ((file_height / 300) / stickerWidth).toFixed( 2 ) }` );

              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` )
                .val( `2` ).attr( `value`, `2` );
            } else {
              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` )
                .val( `${ (file_height / 300).toFixed(2) - 0.1 }` ).attr( `value`, `${ (file_height / 300).toFixed(2) - 0.1 }` );

              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` )
                .val( `${ (file_width / 300).toFixed(2) }` ).attr( `value`, `${ (file_height / 300).toFixed(2) }` );
            }
          } else {
            $( `.widthHeight__block [name="height__value"]` )
              .val( `${ (file_height / 300).toFixed(2) }` );

            $( `.widthHeight__block [name="width__value"]` )
              .val( `${ (file_width / 300).toFixed(2) }` );
          }

          $( `.customUploaderWrapper__upload` ).addClass( `hidden` );

          $( `.color-background-1.gradient` ).removeClass( `adjustHeight` );

          if ( isSizesBlock > 0 ) {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange .autoChange` )
              .prop( `checked`, true );
          } else {
            $( `.widthHeight__autoChange .autoChange` )
              .prop( `checked`, true );
          }

          $( `.goToNextStep, .underCTA` ).removeClass( `hidden` ).click();

          setTimeout(()=>{
            const file__W = file_width / 300;
            const file__H = file_height / 300;

            if ( file__H > file__W && file__H > userDefinedMaxHeight ) {
              // console.log ( 'this is the case 11111111111',  );
              if ( isSizesBlock > 0 ) {
                $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` )
                  .addClass( `error` );
                $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
              } else {
                $( `.widthHeight__item` )
                  .addClass( `error` );
                $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
              }
            } else if ( file__W > file__H && file__W > userDefinedMaxLength ) {
              // console.log ( 'this is the case 2222222222',  );
              if ( isSizesBlock > 0 ) {
                $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` )
                  .addClass( `error` );
                $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
              } else {
                $( `.widthHeight__item` )
                  .addClass( `error` );
                $( `.widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
              }
            } else if ( file__W > userDefinedMaxLength && file__H > userDefinedMaxHeight ) {
              // console.log ( 'this is the case 3333333333333333333',  );
              if ( isSizesBlock > 0 ) {
                $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` )
                  .addClass( `error` );
                if ( file__W == file__H && userDefinedMaxLength != userDefinedMaxHeight ) {
                  if ( userDefinedMaxLength > userDefinedMaxHeight ) {
                    $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__item__action-minus` ).click();
                  } else if ( userDefinedMaxHeight > userDefinedMaxLength ) {
                    $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-minus` ).click();
                  }
                } else {
                  $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
                }
              } else {
                $( `.widthHeight__item` )
                  .addClass( `error` );
                $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
              }
            } else {
              console.log ( 'this is the case 44444444444444',  );
            }
          }, 100);

          executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc );
          executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc );
        }
      });
    }
  }
  fileInput.value = '';
  if(typeof secondFile != "undefined")
  secondFile.value = '';
};

function executeNextStep__helper(firstOne='', secondOne='', defaultloader, file_url, forcesave, file_crc ) {
  try {
     if(typeof getfileExt == "undefined")
       getfileExt = file_url.split('.').pop().split("?")[0];
    const isSizesBlock = $( `sizes-blocks` ).length;
    if ( firstOne == 'Y' ) {
      $( `[item-show-on]` )
        .addClass( `hidden` );

      $( `[item-show-on="afterUpload"]` )
        .removeClass( `hidden` );
      let interVal = setInterval(function(){
        if($(".uploaded-file__counter").html() == "100%"){
          $( `.goToNextStep, .underCTA` ).removeClass( `hidden` ).click();
          if ( typeof addSlickSlider__ === 'function' && isGangPage == false ) {
            addSlickSlider__();
          }
          if(defaultloader == true)
            // $(".easyzoom").removeClass("image-loading");
            clearInterval(interVal);
        }
      },300);
      setTimeout(() => {
        $(".easyzoom").removeClass("image-loading");
        clearInterval(interVal);
      }, 5000);
     
$( `form input[name="properties[Upload (Vector Files Preferred)]` ).val( file_url );
      //   setTimeout(()=>{
      const fileVal = $( `input[name="properties[Upload (Vector Files Preferred)]"]` ).length;

      if ( fileVal > 0 ) {
        if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || originalUploadedFileURL.indexOf(".psd") > -1 || originalUploadedFileURL.indexOf(".svg") > -1) {
          $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( originalUploadedFileURL );
        } else {
          $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( file_url );
        }
        if(isGangPage == false)
          $( `product-form.product-form form input[name="properties[_Original Image]` ).val( ( typeof originalUploadedFileURL !== 'undefined' && originalUploadedFileURL ? originalUploadedFileURL : file_url.split("?")[0] ) );
      } else {
        if(isGangPage == true) {
          $( `product-form.product-form form` ).append( `<input type="hidden"  value="${ file_url }" name="properties[Upload (Vector Files Preferred)]"  />` );
        } else {
          if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' || originalUploadedFileURL.indexOf(".psd") > -1 ||  originalUploadedFileURL.indexOf(".svg") > -1) {
            $( `product-form.product-form form` )
              .append( `
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[Upload (Vector Files Preferred)]" />
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[_Original Image]" />
              ` );
          } else {
            $( `product-form.product-form form` )
              .append( `
                <input type="hidden" value="${ file_url }" name="properties[Upload (Vector Files Preferred)]" />
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[_Original Image]" />
              ` );
          }
        }
      }
      // }, 500);
    }

    if ( secondOne == 'Y' ) {
      //  document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/loader-2.gif?v=1723724647");
      // $(".widthHeight__item__action").removeClass("disabled");
    
      
      
       setTimeout(function(){
        if(isGangPage == true){ 
          $(".viewer-box img").attr('src', `${ file_url.replace(ninjaS3Host2,ninjaS3Host) }?h=1500`);
          file_url = file_url.replace(ninjaS3Host2,ninjaS3Host)+"?h=1000&auto=compress&q=50";
          document.querySelector("#fileupload_hero").setAttribute('src', file_url);
        }else{
          if ( file_url.includes( `?` ) ) {
            if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' ) {
              if ( getfileExt == 'pdf' ) {
                let file_urlNew = file_url.split( `?` )[0];
                document.querySelector("#fileupload_hero").setAttribute('src', `${ file_urlNew }?trim=colorUnlessAlpha&fm=png&w=800`);
                $(".viewer-box img").attr('src', `${ file_urlNew }?fm=png&trim=color&w=2000`);
              } else {
                document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png&w=800`);
                $(".viewer-box img").attr('src', `${ file_url }&fm=png&trim=color&w=2000`);
              }
              // document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png&w=800`);
              // $(".viewer-box img").attr('src', `${ file_url }&fm=png&trim=color&w=2000`);
            } else {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png`);
              $(".viewer-box img").attr('src', `${ file_url }&fm=png`);
            }
          } else {
            if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' ) {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }?fm=png&w=800`);
              $(".viewer-box img").attr('src', `${ file_url }?fm=png&trim=color&w=2000`);
            } else {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }?fm=png`);
              $(".viewer-box img").attr('src', `${ file_url }?fm=png`);
            }
          }
        }
      },2000)
      
      $( `.uploaderFooterNoteSimpleLine` ).addClass( `hidden` );
      if(CUSTOMER_ID != null && forcesave == true){
        let w = $('.product-variants > div:first-of-type input:checked').val();
        if ( typeof w !== 'undefined' && w ) {
          w = w.toLowerCase();
          if ( w.includes(' x ') ) {
            w = w.split(" x ")[0].replace('"',"")??0.00;
          }
        }
        let h = $('.product-variants > div:first-of-type input:checked').val();
        if ( typeof h !== 'undefined' && h ) {
          h = h.toLowerCase();
          if ( h.includes(' x ') ) {
            h = h.split(" x ")[1].replace('"',"")??0.00;
          }
        }
        // let w = $('.product-variants > div:first-of-type input:checked').val().toLowerCase().split(" x ")[0].replace('"',"")??0.00;
        // let h = $('.product-variants > div:first-of-type input:checked').val().toLowerCase().split(" x ")[1].replace('"',"")??0.00;
        if ( isSizesBlock ) {
          if ( selectedItemNo == '0' && isDTFPage ) {
            const isPopularActive = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
            $( `sizes-blocks .widthHeight__custom[item]` ).each(function( i ) {
              const j = i + 1;
              $( this ).attr( 'item', j );
            })

            if ( isPopularActive == 'custom' ) {
              selectedItemNo = 1;
            }
          }
          w =  $( `#custom_size sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` ).val()??$('.product-variants > div:first-of-type input:checked').data("width")??w??0.00;
          h = $( `#custom_size sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` ).val()??$('.product-variants > div:first-of-type input:checked').data("height")??h??0.00;
        } else {
          w =  $( `#custom_size .widthHeight__block [name="width__value"]` ).val()??$('.product-variants > div:first-of-type input:checked').data("width")??w??0.00;
          h = $( `#custom_size .widthHeight__block [name="height__value"]` ).val()??$('.product-variants > div:first-of-type input:checked').data("height")??h??0.00;
        }

        setTimeout(function(){
          $.ajax({
            url: apiURL+"/uploads/saveData",
            method:"post",
            dataType:"json",
            data: JSON.stringify([{
                "variant_title":  w+"x"+h,
                "file": file_url,
                "customer_id": CUSTOMER_ID,
                "file_name":document.querySelector(".uploaded-file__name").innerHTML,
                "file_crc":file_crc,
                "product_id":PRODUCT_ID,
                "gangsheet": isGangPage
              }])
          });
        },5000)
      }

      // await ApplyDelay( 1000 );
      // showFinalStep();
      const getStep = $( `back-btn` ).attr( `show-step` );

      if ( typeof getStep !== 'undefined' && getStep ) {
        $( `product-form.product-form, .uploaderFooterNote, .designerNote` ).show();
      }
    }
    if(isDTFPage == true){
      let uploadedImage = $('[name="properties[Upload (Vector Files Preferred)]"]').val();
      if(uploadedImage.indexOf("?") > -1){
       //  uploadedImage = uploadedImage + "&trim=colorUnlessAlpha"
      }else{
       //  uploadedImage = uploadedImage + "?trim=colorUnlessAlpha"
      }
      if(uploadedImage.indexOf(ninjaS3Host2) > -1){
        uploadedImage = $('[name="properties[Upload (Vector Files Preferred)]"]').val().replace(ninjaS3Host2,ninjaS3Host)+"?bg-remove=true&fm=png";
      }

      
      $(".watermark_image").css({"opacity":1});
      $(".dtf_body_image  .watermark_image img").attr("src",uploadedImage); 
      if($('[href="#custom_size"]').hasClass("active")  == true ){
        $(".product-gallery").hide();
        $(".dtf_imgix_images").show();
      }
      calculateratioForImage();
    }else{
      if($('[href="#custom_size"]').hasClass("active") == true){
        $(".product-gallery").show();
        $(".dtf_imgix_images").hide();
      }
    }
    setTimeout(() => {
      if ( typeof updatePropotionalSizes === 'function' ) {
        updatePropotionalSizes();
      }
    }, 1500);
    manageProperties();
    $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
  } catch ( err ) {
    console.log( `ERROR executeNextStep__helper`, err.message );
  }
}

function checkSelectedSizeAndApply() {
  try {
    // let gangSelectedSize = $( this_ ).attr( `size-in-inches` ) * 1;
    let gangSelectedSize = $( `product-variants .product-variant .product-variant__container[option="1"] .product-variant__item.product-variant__item--radio .product-variant__input:checked` ).attr( `size-in-inches` ) * 1;
    gangSelectedSize = gangSelectedSize / 12;
    // $( `.verticle_direction span` ).text( `${ (gangSelectedSize * 12).toFixed( 2 ) }` );
    const newHeightApply = (gangSelectedSize * 12 ) * onePercentOfPreview;
    $( `apply-max-height preview-wrapper` ).css( `max-height`, `${ newHeightApply }px` );
  } catch ( err ) {
    console.log( `ERROR checkSelectedSizeAndApply()`, err.message );
  }
}

function dimensionsClassesApply( imgWidth, imgHeight ) {
  try {
    filePreview.removeClass( `square img_wider img_tall` );

    if (imgWidth === imgHeight) {
      filePreview.addClass( `square` );
    } else if (imgWidth > imgHeight) {
      filePreview.addClass( `img_wider` );
    } else {
      filePreview.addClass( `img_tall` );

      // const filePreviewWidth = filePreview.width() / 2;
      // const uploadedFileWidth = filePreview.find( `#fileupload_hero` ).width() / 2;
      // $( `.verticle_direction` ).css( `left`, `-${ ( filePreviewWidth - uploadedFileWidth ) + 20 }px` );
      // $( `.zoom-container` ).css( `left`, `-${ filePreviewWidth }px` );
    }
  } catch ( err ) {
    console.log( `ERROR dimensionsClassesApply()`, err.message );
  }
}

document.querySelector('#fileremove').addEventListener('click', function(e) {
  removeFile(e);
  $(".delivery-block.print-ready-box").removeClass("print-ready-box-hide");
});
function removeFile(e = "") {
  isFileUpload = false;
  isReadyToPress = false;
  $(".product-gallery").show();
  $(".dtf_imgix_images").hide();
  $( `.generative-ai-area` ).removeClass( `hidden` ).show();
  $(".watermark_image").css({"opacity":0});
  fileInput.value = '';
  $(".custom_tab_container").removeClass("is_disabled");
  $(".widthHeight__item__action").removeClass("disabled");
  $(".easyzoom").removeClass("image-loading");
  $(".upload_image_info").addClass("hidden");
  counter = 0;
  $( `[name="properties[Upload (Vector Files Preferred)]"]` ).val( '' );
  $( `[name="properties[_Original Image]"]` ).val( '' );
  /* event detail contains the file reference */
  // let file = e.detail;
  if ( isDTFPage ) {
    $( `#size_selection .tab_header a[href="#custom_size"]` ).click();
  }
  $( `.goToNextStep` )
    .addClass( `hidden` );

  $( `[item-show-on]` )
    .addClass( `hidden` );

  $( `[item-show-on="beforeUpload"], [item-show-on="onAll"]` )
    .removeClass( `hidden` );

  $( `.customTabelPlace__item.selected` )
    .removeClass( `selected` );

  /* $( `.customQtyFile__qty` )
    .val( 1 )
    .prop( 1 ); */

  $( `.product` )
    .removeClass( `changeLayout` );

  $( `.step__2` )
    .addClass( `hidden` );

  $( `.fileupload_custom` )
    .hide();

  // Add Class (upload-area--open) On (uploadArea)
  uploadArea.classList.remove('upload-area--open');

  // Hide Loading-text (please-wait) Element
  loadingText.style.display = "none";
  // Show Preview Image
  previewImage.style.display = 'none';

  // Add Class (file-details--open) On (fileDetails)
  fileDetails.classList.remove('file-details--open');
  // Add Class (uploaded-file--open) On (uploadedFile)
  uploadedFile.classList.remove('uploaded-file--open');
  // Add Class (uploaded-file__info--active) On (uploadedFileInfo)
  uploadedFileInfo.classList.remove('uploaded-file__info--active');
  document.querySelector(".drop-zoon__icon").style.display = 'flex';
  document.querySelector(".drop-zoon__paragraph").style.display = 'block';
  //  previewImage.setAttribute('src', "");
  // document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/loader-2.gif?v=1723724647");
  $(".viewer-box img").attr('src', "");
  uploadedFileCounter.innerHTML = `0%`;
  $(".customTabelPopup__overlay-2").fadeOut(500);
  $(".widthHeight__item__action").addClass("disabled");
  $( `.dpi_warning` ).removeClass( `active` );
  resetAll();
};


async function sendApiRequest(file_url, s3Key ) {
  try {
    if ( s3Key ) {
      let rtn;
      const endCode = encodeURI( s3Key );
      await $.get(`${ apiURL + "/calculateInches?s3Key=" + endCode }`, function ( res ) {
        rtn   =   res;
      });
      return rtn;
    }
    else if ( file_url ) {
      let rtn;
      const endCode = encodeURI( file_url );
      await $.get(`${ apiURL + "/calculateInches?url=" + endCode }`, function ( res ) {
        rtn   =   res;
      });
      return rtn;
    }
  } catch ( err ) {
    console.log( `ERROR sendApiRequest`, err.message );
  }
}


async function getPresignedUploadUrl(file_name, file_type ) {
  try {
    let rtn;
    await $.get(`${apiURL}/uploads/getPresignedUploadUrl?file_name=${encodeURIComponent(file_name)}&file_type=${encodeURIComponent(file_type)}`, function ( res ) {
      rtn   =   res;
    });
    return rtn;
  } catch ( err ) {
    console.log( `ERROR getPresignedUploadUrl`, err.message );
  }
}


function selectCurrentImage( o ) {
  try {
    $( `.product__mainImg` )
      .attr( `src`, o.large )
      .fadeIn();

    $( `.product__mainImgWrap iframe` )
      .fadeOut();

    $( `media-gallery .product__thumbItem` )
      .removeClass( `selected` );

    $( `.product__thumbItem.currentVariant` )
      .attr( `img`, o.large )
      .addClass( `selected` )
      .find( `img` )
      .attr( `src`, o.thumb );

  } catch ( err ) {
    console.log( `ERROR selectCurrentImage`, err.message );
  }
}

const getMeta = async (url, cb) => {
  const img   =   new Image();
  img.onload  =   () => cb(null, img);
  img.onerror =   (err) => cb(err);
  img.src     =   url;
};

async function manageSteps( hideStep, showStep ) {
  try {
    const step_1_elements = '.pdp__block.customTitle, .customReviews, .pdp__block.customDescription, .customBadgesPlace, .customBadgesPlace+hr, .customVariants, .customContent, .product-form__input.product-form__quantity, .customTabelPlace, .customPrecut, .customQtyFile, .customTabelPlaceWrap';
    const step_2_elements = '.fileupload_custom';
    const step_3_elements = '.afterUploadAdd2Cart, .customStep2_upload_title, .customStep2_upload_description, .customStep2_upload_list';
    if ( hideStep == 1 ) {
      $( step_1_elements )
        .hide();
    } else if ( hideStep == 2 ) {
      $( step_2_elements )
        .hide();
    } else if ( hideStep == 3 ) {
      $( step_3_elements )
        .hide();
    }

    if ( showStep == 1 ) {
      $( step_1_elements )
        .show();
    } else if ( showStep == 2 ) {
      $( step_2_elements )
        .show();
    } else if ( showStep == 3 ) {
      $( step_3_elements )
        .show();
    }

  } catch ( err ) {
    console.log( `ERROR manageSteps`, err.message );
  }
}

async function setSteps( hideStep, showStep ) {
  try {
    $( `.customStep2_upload back-btn` )
      .attr({
        "show-step": showStep,
        "hide-step": hideStep
      });
    if ( showStep == 1 ) {
      $( `.customStep2_upload back-btn` )
        .removeClass( `makeItHide` );
    } else {
      $( `.customStep2_upload back-btn` )
        .addClass( `makeItHide` );
    }
  } catch ( err ) {
    console.log( `ERROR setSteps`, err.message );
  }
}


function showFinalStep() {
  try {

    // const checkFooterLine = $( `.uploaderStep2FooterBtn` ).length;
    // if ( checkFooterLine == 0 ) {
    //   $( `.shopify-block.shopify-app-block [data-upload-field]` )
    //   .append( `
    //     <div class="uploaderStep2FooterBtn">
    //       Next Step
    //     </div>
    //   ` );
    // }
    // console.log ( 'yes got value' );
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function checkingFieldVal( selectorIs, functionName, timer, args='' ) {
  try {
    var divCheckingInterval                   =   setInterval( function() {
      if ( document.querySelector( selectorIs ).value != '' ) {
        clearInterval( divCheckingInterval );
        if ( typeof functionName !== 'undefined' && functionName ) {
          window[functionName]( args ? args : '' );
        }
        return true;
      }
    }, timer != '' ? timer : 250);
    return false;
  } catch ( err ) {
    console.log( `ERROR checkingFieldVal`, err.message );
  }
}

function checkingElement( selectorIs, functionName, timer, args='' ) {
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

async function add2Cart( obj ) {
  try {
    let rtn;
    await $.post(`/cart/add.js`, obj, function ( r ) {
      rtn = r;
    },"json");
    return rtn;
  }
  catch ( err ) {
    console.log( `ERROR add2Cart`, err.message );
  }
}

var ApplyDelay = ms => new Promise(res => setTimeout(res, ms));

function uploaderDataManage() {
  if ( typeof uploadData !== 'undefined' && uploadData ) {
    const isSimpleLineAvailable = $( `.uploaderFooterNoteSimpleLine` ).length;
    if ( isSimpleLineAvailable == 0 ) {
      // $( `.cl-upload--input-field` )
      // .before( `
      //   <div class="uploaderFooterNoteSimpleLine">${ uploadData.beforeFileUpoadNote }</div>
      // ` );
    }
    if ( typeof uploadData.underUploaderNote !== 'undefined' && uploadData.underUploaderNote ) {
      const uploaderStep2FooterBtn    =   $( `.uploaderStep2FooterBtn` ).length;
      const checkFooterLine           =   $( `.uploaderFooterNote` ).length;
      if ( checkFooterLine == 0 ) {
        const getDesignNote           =   $( `[name="properties[Design Notes]"]` ).val();
        $( `[name="properties[Design Notes]"]` )
          .prop( 'disabled', true )
          .attr( `type`, `hidden` )
          .before( `
            <div class="uploaderFooterNote">
              ${ uploadData.underUploaderNote }
            </div>
            <textarea class="designerNote" name="properties[Design Notes]" placeholder="ex. Remove background & make sure design is 3.5\" wide">${ getDesignNote }</textarea>
          ` );
      }
    }
  }

  const selectedQty = $( `.customQtyFile__qty` ).val();
  const isQtyElement = $( `product-form.product-form form[action="/cart/add"] [name="quantity"]` ).length;
  if ( isQtyElement == 0 ) {
    $( `product-form.product-form form[action="/cart/add"]` )
      .append( `
        <input type="hidden" name="quantity" value="${ selectedQty }">
      ` );
  } else {
    $( `product-form.product-form form[action="/cart/add"] [name="quantity"]` ).val( selectedQty );
  }
}

function getData( type ) {
  try {
    const dataArr = [['1 - 9', '0%', 'discount']];
    $( `.quantity-breaks-now-discount-table .qb-discount-table-row` ).each(function(i) {
      let collobj = [];
      $( this ).find( `td` ).each(function() {
        const text = $( this ).text().trim();
        collobj.push( text )
      })

      dataArr.push( collobj );
    })

    let tableHTML = '';
    dataArr.forEach(el => {
      tableHTML +=  `<div class="customTabelPlace__item">`;
        el.forEach((col, i) => {
          tableHTML +=  `<div class="customTabelPlace__item_${ i + 1 }">${ col }</div>`;
        });
      tableHTML +=  `</div>`;
    });

    $(`.customTabelPlace.colList` )
      .attr( `items`, dataArr.length )
      .html( tableHTML )
      .removeClass( `hide` );

    if ( type != 'onLoad' ) {
      const getOp_1 = $( `.product-form__input[op="1"] input:checked` ).val();
      const getOp_2 = $( `.product-form__input[op="2"] input:checked` ).val();

      if ( typeof getOp_1 !== 'undefined' && getOp_1 && typeof getOp_2 !== 'undefined' && getOp_2 && typeof allVariants !== 'undefined' && allVariants && typeof findObjectByKey === 'function' ) {
        const selectedVariant_ob = findObjectByKey( allVariants, 'title', `${ getOp_1 } / ${ getOp_2 }` );
        if ( typeof selectedVariant_ob.id !== 'undefined' && selectedVariant_ob.id ) {
          $( `[name="id"]` ).val( selectedVariant_ob.id );

          $( `.product__mainImg` )
            .attr( `src`, selectedVariant_ob.large )
            .fadeIn();
          $( `.product__mainImgWrap iframe` )
            .fadeOut();
          $( `media-gallery .product__thumbItem` )
            .removeClass( `selected` );
          $( `.product__thumbItem.currentVariant` )
            .attr( `img`, selectedVariant_ob.large )
            .addClass( `selected` )
            .find( `img` )
            .attr( `src`, selectedVariant_ob.thumb );
        }
      }
    }
  } catch ( err ) {
    console.log( `ERROR getData()`, err.message );
  }
}

// MODAL EVENTS START
$( document )
.on(`click`, `.customBadgesPlace__item[popup="true"]`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const getBlockID = $( this ).attr( `block` );
    $( `.modalDialog[block="${ getBlockID }"]` ).fadeIn();
    const isIframeAvailable = $( `.modalDialog[block="${ getBlockID }"] .modalDialog__centerCenter__content--detail iframe` ).length;
    const isIframeOldSrcAvailable = $( `.modalDialog[block="${ getBlockID }"] .modalDialog__centerCenter__content--detail iframe[src-old]` ).length;
    if ( isIframeAvailable > 0 && isIframeOldSrcAvailable > 0 ) {
      const videoSrc = $( `.modalDialog[block="${ getBlockID }"] .modalDialog__centerCenter__content--detail iframe` ).attr( `src-old` );
      $( `.modalDialog[block="${ getBlockID }"] .modalDialog__centerCenter__content--detail iframe` )
        .removeAttr( `src-old` )
        .attr( `src`, videoSrc );
    }
  } catch ( err ) {
    console.log( `ERROR .customBadgesPlace__item[popup="true"]`, err.message );
  }
})
.on(`click`, `.modalDialog__centerCenter__close`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this ).closest( `.modalDialog` ).fadeOut();
    const isIframeAvailable = $( this ).closest( `.modalDialog` ).find( `.modalDialog__centerCenter__content--detail iframe` ).length;
    if ( isIframeAvailable > 0 ) {
      const videoSrc = $( this ).closest( `.modalDialog` ).find( `.modalDialog__centerCenter__content--detail iframe` ).attr( `src` );
      $( this ).closest( `.modalDialog` ).find( `.modalDialog__centerCenter__content--detail iframe` )
        .removeAttr( `src` )
        .attr( `src-old`, videoSrc );
    }
  } catch ( err ) {
    console.log( `ERROR .modalDialog__centerCenter__close`, err.message );
  }
})
;
// MODAL EVENTS END

function cartCountUpdate() {
  try {
    $.get(`/cart?view=itemsCount`, function ( res ) {
      $( `#cart-icon-bubble` ).html( res );
    });
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

let field__;

// listener to get a reference to the upload field
window.addEventListener('upload:ready', function(e) {
  // store field reference
  field__ = e.detail;
});




const mainDropZone = document.querySelector( "body" );
mainDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  // document.querySelector( `.uploaderOverlay` ).classList.add( `active` );
});
mainDropZone.addEventListener('drop', async (e) => {
  // field__.uploadFile( e.dataTransfer.files[0] ).then(function(file) {
  //   secondryDropZone.classList.remove( `active` );
  //   console.debug('got file upload: ', file);
  //   // document.querySelector( `.uploaderOverlay` ).classList.remove( `active` );
  // });

  e.preventDefault()
});
if(document.querySelector( `.secondDropZone` )){
  var secondryDropZone = document.querySelector( `.secondDropZone` );
  secondryDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    secondryDropZone.classList.add( `active` );
    document.querySelector(".file-upload-overlay-2").classList.add("active");
    document.querySelector("body").classList.add("file-upload-overlay-2-active");
  });

  secondryDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    anotherTransfer = true;
    if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
      anotherPuff = true;
    }
    uploadFile(file, "second_image");
  });

  secondryDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    secondryDropZone.classList.remove( `active` );
    document.querySelector(".file-upload-overlay-2").classList.remove("active");
    document.querySelector("body").classList.remove("file-upload-overlay-2-active");
  });
}
$( document )
.ready(function () {
  if ( isGangPage ) {
    checkSelectedSizeAndApply();
    // $( `.easyzoom.zoom-box` ).wrap( `<apply-max-height></apply-max-height>` );
  }
})
.on(`change`, `#secondFile`, function( e ) {
  e.stopImmediatePropagation();
  if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
    const isColorSelected = $( `sizes-blocks .widthHeight__custom.puffPage .widthHeight__dropdown` ).attr( `selected-color` );
    if ( typeof isColorSelected !== 'undefined' && isColorSelected == '' ) {
      $( `sizes-blocks .widthHeight__custom.puffPage .widthHeight__dropdown` ).addClass( `noColorSelected` );
      $( `html, body` ).animate({
        scrollTop: $( `sizes-blocks .widthHeight__custom.puffPage .widthHeight__dropdown` ).offset().top - 100
      }, 500);
      return;
    }
  }
  if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
    const isError = $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown` ).hasClass( `pickColor` );
    if ( isError ) {
      $( `html, body` ).animate({
        scrollTop: $( `spangle-colors .spangle__colorOption[item="1"]` ).offset().top - 100
      }, 1000);
      $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown` ).addClass( `error` );
      $( `.loadingScreen__` ).remove();
      $( this ).val( `` );
      return;
    }
  }
  let optionErr = false;
  if ( typeof enableOption1 !== 'undefined' && enableOption1 ) {
    let isError = false;
    const isFirstOption = $( `.customStickerOption[item="1"]` ).length;
    if ( isFirstOption > 0 ) {
      const isChecked = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
      if ( isChecked == false ) {
        isError = true;
        optionErr = true;
        $( `.customStickerOption[item="1"] .customStickerOption__error` ).removeClass( `hidden` );
      } else {
        const firstVal = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
        $( `.customStickerOption[item="1"] .customStickerOption__error` ).addClass( `hidden` );
        console.log ( 'firstVal', firstVal );
      }
    }
  }
  if ( typeof enableOption2 !== 'undefined' && enableOption2 ) {
    let isError = false;
    const isSecondOption = $( `.customStickerOption[item="2"]` ).length;
    if ( isSecondOption > 0 ) {
      const isChecked = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
      if ( isChecked == false ) {
        isError = true;
        optionErr = true;
        $( `.customStickerOption[item="2"] .customStickerOption__error` ).removeClass( `hidden` );
      } else {
        const secondVal = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
        $( `.customStickerOption[item="2"] .customStickerOption__error` ).addClass( `hidden` );
        console.log ( 'secondVal', secondVal );
      }
    }
  }
  if ( typeof enableOption3 !== 'undefined' && enableOption3 ) {
    let isError = false;
    const isThirdOption = $( `.customStickerOption[item="3"]` ).length;
    if ( isThirdOption > 0 ) {
      const isChecked = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
      if ( isChecked == false ) {
        isError = true;
        optionErr = true;
        $( `.customStickerOption[item="3"] .customStickerOption__error` ).removeClass( `hidden` );
      } else {
        const thirdVal = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
        $( `.customStickerOption[item="3"] .customStickerOption__error` ).addClass( `hidden` );
        console.log ( 'thirdVal', thirdVal );
      }
    }
  }
  if ( typeof enableOption4 !== 'undefined' && enableOption4 ) {
    let isError = false;
    const isFourthOption = $( `.customStickerOption:not(.hidden)[item="4"]` ).length;
    if ( isFourthOption > 0 ) {
      const inputVal = $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__input` ).val();
      if ( typeof inputVal !== 'undefined' && inputVal ) {
        $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).addClass( `hidden` );
        console.log ( 'inputVal', inputVal );
      } else {
        $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).removeClass( `hidden` );
        isError = true;
        optionErr = true;
      }
    }
  }
  if ( optionErr ) {
    $( this ).val( `` );
    return;
  }
  // if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct ) {
  //   let isError = false;
  //   const isFirstOption = $( `.customStickerOption[item="1"]` ).length;
  //   if ( isFirstOption > 0 ) {
  //     const isChecked = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
  //     if ( isChecked == false ) {
  //       isError = true;
  //       $( `.customStickerOption[item="1"] .customStickerOption__error` ).removeClass( `hidden` );
  //     } else {
  //       const firstVal = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
  //       $( `.customStickerOption[item="1"] .customStickerOption__error` ).addClass( `hidden` );
  //       console.log ( 'firstVal', firstVal );
  //     }
  //   }
  //   const isSecondOption = $( `.customStickerOption[item="2"]` ).length;
  //   if ( isSecondOption > 0 ) {
  //     const isChecked = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
  //     if ( isChecked == false ) {
  //       isError = true;
  //       $( `.customStickerOption[item="2"] .customStickerOption__error` ).removeClass( `hidden` );
  //     } else {
  //       const secondVal = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
  //       $( `.customStickerOption[item="2"] .customStickerOption__error` ).addClass( `hidden` );
  //       console.log ( 'secondVal', secondVal );
  //     }
  //   }
  //   const isThirdOption = $( `.customStickerOption[item="3"]` ).length;
  //   if ( isThirdOption > 0 ) {
  //     const isChecked = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
  //     if ( isChecked == false ) {
  //       isError = true;
  //       $( `.customStickerOption[item="3"] .customStickerOption__error` ).removeClass( `hidden` );
  //     } else {
  //       const thirdVal = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
  //       $( `.customStickerOption[item="3"] .customStickerOption__error` ).addClass( `hidden` );
  //       console.log ( 'thirdVal', thirdVal );
  //     }
  //   }
  //   const isFourthOption = $( `.customStickerOption:not(.hidden)[item="4"]` ).length;
  //   if ( isFourthOption > 0 ) {
  //     const inputVal = $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__input` ).val();
  //     if ( typeof inputVal !== 'undefined' && inputVal ) {
  //       $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).addClass( `hidden` );
  //       console.log ( 'inputVal', inputVal );
  //     } else {
  //       $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).removeClass( `hidden` );
  //       isError = true;
  //     }
  //   }
  //   console.log ( 'customStickersError', isError );
  //   if ( isError ) {
  //     $( this ).val( `` );
  //     return;
  //   }
  // }
  anotherTransfer = true;
  if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
    anotherPuff = true;
  }
  uploadFile( e.currentTarget.files[0], "second_image");
  /* Reset so re-picking the same file fires `change` again — without this,
     the browser sees no value change for an identical filename and skips
     the event entirely, breaking subsequent Upload Another clicks. */
  e.currentTarget.value = '';
})

.on(`click`, `.cart-item__actions .qty-button.qty-plus[aria-label="Increase quantity"], .cart-item__actions .qty-button.qty-minus[aria-label="Decrease quantity"], .cart-item__actions .remove.cleanup-task`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    alreadyCartItemsFunc();
  } catch ( err ) {
    console.log( `ERROR .cart-item__actions .qty-button.qty-plus[aria-label="Increase quantity"], .cart-item__actions .qty-button.qty-minus[aria-label="Decrease quantity"], .cart-item__actions .remove.cleanup-task`, err.message );
  }
})
.on(`keyup`, `.cart-item__actions ._cart__quantity.qty.qty-selector`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    alreadyCartItemsFunc();
  } catch ( err ) {
    console.log( `ERROR .cart-item__actions ._cart__quantity.qty.qty-selector`, err.message );
  }
})

.on(`change`, `#popular_size.active .product-variant__item.product-variant__item--radio[min=""][max=""] .product-variant__input`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const isPreviousDesign_Active = $( `.tab_header.previousDesign` ).length;
    if ( isPreviousDesign_Active > 0 ) {
      popularSizeID = $( this ).attr( `id` );
    }
  } catch ( err ) {
    console.log( `ERROR #popular_size.active .product-variant__item.product-variant__item--radio .product-variant__input`, err.message );
  }
})
;


async function alreadyCartItemsFunc() {
  try {
    await ApplyDelay(1000);
    if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'cartTotal' ) {
      const getCartTotalObj = await getRequest( `/cart?view=pdpCartObject` );
      if ( typeof getCartTotalObj !== 'undefined' && getCartTotalObj ) {
        getCartTotal = getCartTotalObj.getCartTotal;
        const getTableFirstRowPrice = $( `.customTabelPlaceWrap` ).attr( `base-price` ) * 1;
        let getCalculatedQty = getCartTotal / getTableFirstRowPrice;
        getCalculatedQty__ = Math.floor( getCalculatedQty );
      }
    }

    alreadyCartItems = await getRequest( `/cart?view=pdpCartItem&pid=${ typeof currentPID !== 'undefined' && currentPID ? currentPID : '' }` );
    if (
      typeof alreadyCartItems !== 'undefined' && alreadyCartItems && typeof alreadyCartItems.qty !== 'undefined' && alreadyCartItems.qty > 0 ||
      typeof isSpangleProduct !== 'undefined' && isSpangleProduct && typeof alreadyCartItems !== 'undefined' && alreadyCartItems && typeof alreadyCartItems.spangleQty !== 'undefined' && alreadyCartItems.spangleQty > 0 ||
      typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct && typeof alreadyCartItems !== 'undefined' && alreadyCartItems && typeof alreadyCartItems.stickersQty !== 'undefined' && alreadyCartItems.stickersQty > 0 ||
      typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct && typeof alreadyCartItems !== 'undefined' && alreadyCartItems && typeof alreadyCartItems.stickersQty !== 'undefined' && alreadyCartItems.stickersQty > 0
    ) {
      if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'Cumulative' ) {
        alreadyCartItems = [alreadyCartItems];
      } else if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'cartTotal' ) {
        alreadyCartItems = [];
      } else {
        alreadyCartItems = [];
      }
    } else {
      alreadyCartItems = [];
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}




// Append Images Types Array Inisde Tooltip Data
toolTipData.innerHTML = [...imagesTypes].join(', .');

// When (drop-zoon) has (dragover) Event
uploadArea.addEventListener('dragover', function (event) {
  // Prevent Default Behavior
  event.preventDefault();

  // Add Class (drop-zoon--over) On (drop-zoon)
  uploadArea.classList.add('drop-zoon--over');
  document.querySelector(".file-upload-overlay-1").classList.add("active");
  document.querySelector("body").classList.add("file-upload-overlay-1-active");
});

// When (drop-zoon) has (dragleave) Event
uploadArea.addEventListener('dragleave', function (event) {
  // Remove Class (drop-zoon--over) from (drop-zoon)
  uploadArea.classList.remove('drop-zoon--over');
  document.querySelector(".file-upload-overlay-1").classList.remove("active");
  document.querySelector("body").classList.remove("file-upload-overlay-1-active");
});

// When (drop-zoon) has (drop) Event
uploadArea.addEventListener('drop', function (event) {
  // Prevent Default Behavior
  event.preventDefault();

  // Remove Class (drop-zoon--over) from (drop-zoon)
  uploadArea.classList.remove('drop-zoon--over');
  document.querySelector(".file-upload-overlay-1").classList.remove("active");
  document.querySelector("body").classList.remove("file-upload-overlay-1-active");

  // Select The Dropped File
  const file = event.dataTransfer.files[0];

  if (file.type == 'image/svg+xml') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(e.target.result, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      const width = svgElement.getAttribute('width');
      const height = svgElement.getAttribute('height');
      if ( width == null && height == null ) {
        noWidthAndHeightForSVG = true;
      } else {
        noWidthAndHeightForSVG = false;
      }
      // document.getElementById('output').innerText = `Width: ${width}, Height: ${height}`;
    };
    reader.readAsText(file);
  }

  // Call Function uploadFile(), And Send To Her The Dropped File :)
  uploadFile(file);
});

// When (drop-zoon) has (click) Event
uploadArea.addEventListener('click', function (event) {
  // Click The (fileInput)
  if ( typeof btnTextUpdated !== 'undefined' && btnTextUpdated ) {
    $( `.product__cart-functions .add-to-cart[data-main-product-add-to-cart] .button__text[data-js-product-add-to-cart-text]` ).text( btnTextUpdated );
    KROWN.settings.locales.products_add_to_cart_button = btnTextUpdated;
  }
  fileInput.click();
});

// When (fileInput) has (change) Event
fileInput.addEventListener('change', function (event) {
  // Select The Chosen File
  if ( typeof btnTextUpdated !== 'undefined' && btnTextUpdated ) {
    $( `.product__cart-functions .add-to-cart[data-main-product-add-to-cart] .button__text[data-js-product-add-to-cart-text]` ).text( btnTextUpdated );
    KROWN.settings.locales.products_add_to_cart_button = btnTextUpdated;
  }
  $( `#fileupload_hero` ).addClass( `previewFullWidth` );
  $( `.pricingTable` ).addClass( `hidden` );
  const file = event.target.files[0];
  if (file.type == 'image/svg+xml') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(e.target.result, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      const width = svgElement.getAttribute('width');
      const height = svgElement.getAttribute('height');
      if ( width == null && height == null ) {
        noWidthAndHeightForSVG = true;
        // console.log ( `NO Width and Height` );
      } else {
        noWidthAndHeightForSVG = false;
        // console.log ( '`Width: ${width}, Height: ${height}`', `Width: ${width}, Height: ${height}` );
      }
      // document.getElementById('output').innerText = `Width: ${width}, Height: ${height}`;
    };
    reader.readAsText(file);
  }

  // Call Function uploadFile(), And Send To Her The Chosen File :)
  uploadFile(file);
  /* Reset so re-picking the same file fires `change` again — without this,
     the browser sees no value change for an identical filename and skips
     the event entirely. */
  event.target.value = '';
});

async function getAsByteArray(file) {
  return new Uint8Array(await readFile(file));
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.addEventListener("loadend", (e) => resolve(e.target.result));
    reader.addEventListener("error", reject);
    reader.readAsArrayBuffer(file);
  });
}

if(location.search == "?rtype=another"){
  toast.classList.add("active");
  timer1 = setTimeout(() => {
    toast.classList.remove("active");
  }, 5000);

  timer2 = setTimeout(() => {
  }, 5300);
  $('html, body').animate({
    scrollTop: ($("product-variants").offset().top - 80)
  }, 500);
}
// Upload File Function
function uploadFile(file, uploadtype = null) {
  // FileReader()
  isFileUpload = true;
  if($(".delivery-block.print-ready-box").length){
    $(".delivery-block.print-ready-box").addClass("print-ready-box-hide");
  }
  if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
    $( `.verticle_direction, .horizontal_direction` ).addClass( `hidden` );
  } else {
    $( `.verticle_direction, .horizontal_direction` ).removeClass( `hidden` );
  }
  // console.log ( 'upload file start',  );
  const isSizesBlock = $( `sizes-blocks` ).length;
  const fileReader = new FileReader();
  // File Type
  const fileType = file.type;
 //alert(fileType);
  // File Size
  const fileSize = file.size;
  $( `.generative-ai-area` ).addClass( `hidden` );
  // If File Is Passed from the (File Validation) Function
  if (fileValidate(fileType, fileSize, file)) {
    if(fileType.indexOf("image/png") > -1 || fileType.indexOf("image/svg+xml")  > -1 || fileType.indexOf("application/") > -1){
      $("#option_checkbox").prop("checked",false);
      $("#remove_background").val("No");
    }else{
      $("#option_checkbox").prop("checked",true);
      $("#remove_background").val("Yes");
    }
    $("#option_checkbox_upscale").prop("checked",false);
    $(".custom_tab_container").addClass("is_disabled");
    $(".widthHeight__item__action").addClass("disabled");
    $(".fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(".easyzoom").addClass("image-loading");
    // alert(uploadtype);
    if(uploadtype == "second_image"){
      $(".product-gallery").show();
      $(".dtf_imgix_images").hide();
      $(".watermark_image").css({"opacity":0});
      // alert("inner"+uploadtype);
      if ( $( `.loadingScreen__` ).length == 0 ) {
        $( `body` ).prepend( `<div class="loadingScreen__"><img src="${ loaderGif }"></div>` );
      }
      document.body.classList.add("processing-second-upload");
      secondryDropZone.classList.remove( `active` );
      document.querySelector(".file-upload-overlay-2").classList.remove("active");
      document.querySelector("body").classList.remove("file-upload-overlay-2-active");
      // $( `.anotherTransfer` ).click();
      if ( isSizesBlock > 0 ) {
        addAnotherTransfer( `#${ mainSectionID } .addToCartGroupItems` );
      } else {
        addAnotherTransfer( `#${ mainSectionID } .product__cart-functions .add-to-cart[data-main-product-add-to-cart]` );
      }
      $("#fileremove").click();
      $( `[name="properties[Design Notes]"]` ).val( `` );
      uploadFile(file);
      toast.classList.add("active");
      timer1 = setTimeout(() => {
        toast.classList.remove("active");
        if(document.querySelector("#ready_to_press"))
          document.querySelector("#ready_to_press").disabled = true;
      }, 5000);

      timer2 = setTimeout(() => {
      }, 5300);

      setTimeout(function(){
        document.body.classList.remove("processing-second-upload");
      },2000);

      $( `.customQtyFile__qty` ).val(parseInt($( `.customQtyFile__qty` ).attr("min")));
      $("product-form .add-to-cart").addClass("second-tranfer-btn")
      return false;
    }
    // Add Class (drop-zoon--Uploaded) on (drop-zoon)
    dropZoon.classList.add('drop-zoon--Uploaded');

    // Show Loading-text
    loadingText.style.display = "block";
    // Hide Preview Image
    //  previewImage.style.display = 'none';

    // Remove Class (uploaded-file--open) From (uploadedFile)
    uploadedFile.classList.remove('uploaded-file--open');
    // Remove Class (uploaded-file__info--active) from (uploadedFileInfo)
    uploadedFileInfo.classList.remove('uploaded-file__info--active');

    // After File Reader Loaded
    fileReader.addEventListener('load', async function () {
      // After Half Second
      // setTimeout(function () {
      // Add Class (upload-area--open) On (uploadArea)
      uploadArea.classList.add('upload-area--open');

      // Hide Loading-text (please-wait) Element
      loadingText.style.display = "none";
      // Show Preview Image
      //  previewImage.style.display = 'block';

      // Add Class (file-details--open) On (fileDetails)
      fileDetails.classList.add('file-details--open');
      // Add Class (uploaded-file--open) On (uploadedFile)
      uploadedFile.classList.add('uploaded-file--open');
      // Add Class (uploaded-file__info--active) On (uploadedFileInfo)
      uploadedFileInfo.classList.add('uploaded-file__info--active');
      // document.querySelector(".drop-zoon__icon").style.display = 'none';
      // document.querySelector(".drop-zoon__paragraph").style.display = 'none';
      // executeNextStep(filePath, true, true);
      // }, 500); // 0.5s

      // Add The (fileReader) Result Inside (previewImage) Source
      // previewImage.setAttribute('src', fileReader.result);
      if(file.name.indexOf(".pdf") > -1 || file.name.indexOf(".psd") > -1 || file.name.indexOf(".eps") > -1 || file.name.indexOf(".svg") > -1 || file.name.indexOf(".ai") > -1 ) {
        document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png?v=1728297951");
      } else {
        if (isGangPage) {
          document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png?v=1728297951");
        } else {
          // document.querySelector("#fileupload_hero").setAttribute('src', fileReader.result);
        }
      }
      //document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/loader-2.gif?v=1723724647");

      // Add File Name Inside Uploaded File Name
      uploadedFileName.innerHTML = file.name;
      document.querySelector(".fileupload_custom").style.display = "block";
      progressMove("",fileSize);

      document.querySelector("#uploadArea").classList.add("hidden");
      // Call Function progressMove();
      // Configure AWS SDK with your credentials

      const randomName = file.name.split('.')[0].replace(/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '-')+"____"+'image_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.' + file.name.split('.').pop();

      getfileExt = randomName.split('.').pop();
      if ( getfileExt == 'psd' || getfileExt == 'eps' || getfileExt == 'ai' || getfileExt == 'pdf'  || getfileExt == 'svg'  ) {
        $( `.fileupload_bg_options .style3` ).hide();
        $( `#option_checkbox, #option_checkbox_upscale` ).prop( `checked`, false );
      } else {
        $( `.fileupload_bg_options .style3` ).show();
      }

      const presignData = await getPresignedUploadUrl(randomName, file.type);
      if ( presignData.url ) {
        originalUploadedFileURL = presignData.sourceUrl;
        const response = await fetch(presignData.url, {
          method: 'PUT',
          body: file
        });

        let filePath = `https://${ninjaImgixHost}/${randomName}`;
        if (isGangPage){
          filePath = `https://${ninjaImgixHost}/${randomName}`;
          document.querySelector("#fileupload_hero").setAttribute('src', filePath+"?h=1000&auto=compress&q=50&fm=png");
        }else{
          document.querySelector("#fileupload_hero").setAttribute('src', `${ filePath }`);
        }

        let file_crc = "";
        try {
          const byteArr = await getAsByteArray(file);
          file_crc = (CRC32.buf(byteArr)>>>0).toString(16);
        }
        catch (error) {
          console.log("Unable to calculate file crc: " + error)
        }

        setTimeout(function(){
          executeNextStep(filePath, true, true, true, randomName, true, file_crc);
        },10)
      }
      else alert('Error uploading file.');
    });

    // Read (file) As Data Url
    fileReader.readAsDataURL(file);
   // document.querySelector("#fileupload_hero").setAttribute('src', fileReader.path);
  } else { // Else

    this; // (this) Represent The fileValidate(fileType, fileSize) Function

  };
};

$("#option_checkbox").on("click", function(){
  let applicationFiles = $(`input[name="properties[Upload (Vector Files Preferred)]"]`).val();
  const isPopularActive = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
  if ( typeof isDTFPage !== 'undefined' && isDTFPage && isPopularActive == 'popular' ) {
    onlyImgUpdate();
  } else {
    let switchImages = true;
    isFileUpload = false;
    let time = 3000;
    $(".fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(".easyzoom").addClass("image-loading");
    if($(this).is(":checked") == true){
      $("#remove_background").val("Yes");
      $(".fileupload_info p strong").html("Cropped size");
      $(".easyzoom,.viewer-box").removeClass("no-bg");
      if(switchImages)
      executeNextStep(applicationFiles, true, true, false, null, false);
    }else{
      $("#remove_background").val("No");
     // $('[href="#custom_size"]').click();
      $(".fileupload_info p strong").html("Original size");
      $(".easyzoom,.viewer-box").addClass("no-bg");
      if(switchImages)
      executeNextStep(applicationFiles, false, false, false, null, false);
    }
  
    setTimeout(function(){
      // $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
      // $(".easyzoom").removeClass("image-loading");
    },time)
  }
});

function onlyImgUpdate() {
  try {
    const bgRemoveState = $( `#option_checkbox` ).is( `:checked` );
    const superResState = $( `#option_checkbox_upscale` ).is( `:checked` );
    let getUploadedFile = $(`input[name="properties[Upload (Vector Files Preferred)]"]`).val();
    if ( getUploadedFile.includes( `?` ) ) {
      getUploadedFile = getUploadedFile.split( `?` )[0];
    }
    // getUploadedFile = getUploadedFile.replace(ninjaImgixHost,ninjaS3Host2);
    let makeParams = ``;
    if ( fileExt == 'png' ) {
      makeParams = `trim=colorUnlessAlpha`;
    } else if ( fileExt == 'jpeg' || fileExt == 'jpg' || fileExt == 'tif' || fileExt == 'tiff' || fileExt == 'pdf' || fileExt == 'ai' || fileExt == 'eps' || fileExt == 'svg' ) {
      makeParams = `fm=png`;
    }

    if ( bgRemoveState ) {
      makeParams = `${ makeParams }&bg-remove=true`;
    }
    if ( superResState ) {
      makeParams = `${ makeParams }&upscale=true`;
    }
    $(".fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(".easyzoom").addClass("image-loading");

    const imgixBgRemoveUrl = `${ getUploadedFile }?${ makeParams }`;
    $( `file-preview #fileupload_hero` ).attr( `src`, imgixBgRemoveUrl );
    $( `file-preview .viewer-box img` ).attr( `src`, imgixBgRemoveUrl );

    console.log ( 'getUploadedFile', getUploadedFile, `makeParams`, makeParams );

    // Multi-model background removal: kick off Bria + Pixelcut in parallel,
    // score against imgix, and show tabs if alternatives are meaningfully
    // different. Only runs when Remove Background is on.
    if ( bgRemoveState && window.NinjaBgRemoval ) {
      window.NinjaBgRemoval.showLoading();
      window.NinjaBgRemoval.run( getUploadedFile, imgixBgRemoveUrl )
        .then( function ( result ) {
          window.NinjaBgRemoval.renderTabs( result, function ( chosen ) {
            // Apply the chosen candidate's URL to the preview and save it as
            // the property. Keep the original imgix URL as a fallback in the
            // hidden input — fal.ai output URLs may be ephemeral.
            $( `file-preview #fileupload_hero` ).attr( `src`, chosen.url );
            $( `file-preview .viewer-box img` ).attr( `src`, chosen.url );
            $( `.fileupload_bg_options` ).css( { opacity: 1, "pointer-events": "all" } );
            $( `.easyzoom` ).removeClass( `image-loading` );
          });
        })
        .catch( function ( err ) {
          console.warn( '[bg-removal-multi] failed, sticking with imgix:', err.message );
          window.NinjaBgRemoval.hide();
        });
    } else if ( window.NinjaBgRemoval ) {
      window.NinjaBgRemoval.hide();
    }
  } catch ( err ) {
    console.log( `ERROR onlyImgUpdate()`, err.message );
  }
}

$("#option_checkbox_upscale").on("click", function(){
  let applicationFiles = $(`input[name="properties[Upload (Vector Files Preferred)]"]`).val();
  const isPopularActive = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
  if ( typeof isDTFPage !== 'undefined' && isDTFPage && isPopularActive == 'popular' ) {
    onlyImgUpdate();
  } else {
    let switchImages = true;
    let time = 3000;
    isFileUpload = false;
    const isCustomSizeActive = $( `#size_selection .tab_header a[href="#custom_size"]` ).hasClass( `active` );
    const isOptionChecked = $( this ).is( `:checked` );
    console.log ( 'applicationFiles', applicationFiles );
    if ( isCustomSizeActive && isOptionChecked ) {
      beforeUpScale__Width = $( `.fileupload_preview .horizontal_direction > span` ).text().trim();
      beforeUpScale__height = $( `.fileupload_preview .verticle_direction > span` ).text().trim();
      if ( beforeUpScale__Width.includes( `"` ) ) {
        beforeUpScale__Width = beforeUpScale__Width.replace( `"`, `` );
      }
      beforeUpScale__Width = beforeUpScale__Width * 300;
      if ( beforeUpScale__height.includes( `"` ) ) {
        beforeUpScale__height = beforeUpScale__height.replace( `"`, `` );
      }
      beforeUpScale__height = beforeUpScale__height * 300;
      console.log ( 'beforeUpScale__Width', beforeUpScale__Width );
      console.log ( 'beforeUpScale__height', beforeUpScale__height );
    } else {
      beforeUpScale__Width = 0;
      beforeUpScale__height = 0;
    }
    $(".fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(".easyzoom").addClass("image-loading");
    if($(this).is(":checked") == true){
  
      $("#super_resolution").val("Yes");
      if(switchImages)
      executeNextStep(applicationFiles, true, true, false, null, false);
    }else{
  
      $("#super_resolution").val("No");
     // $('[href="#custom_size"]').click();
      if(switchImages)
      executeNextStep(applicationFiles, false, false, false, null, false);
    }
  
    setTimeout(function(){
      // $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
      // $(".easyzoom").removeClass("image-loading");
    },time)
  }
})

function updateImageSrc(selector, newSrc) {
  const img = $(selector);
  img.on('load', function () {
      console.log('Image has loaded successfully!');
  });

  img.attr('src', newSrc); // Update the src, which triggers the load event
}
// Example usage
// updateImageSrc('#myImage', 'https://example.com/new-image.jpg');


// Progress Counter Increase Function
function progressMove( filePath, fileSize = 550 ) {
 // document.body.classList.remove('upload-cancel');
  let counter = 0;
  if ( fileSize > 9000000 ) {
    fileSize = 250;
  } else if ( fileSize > 7000000 ) {
    fileSize = 150;
  } else if ( fileSize > 5000000 ) {
    fileSize = 120;
  } else if ( fileSize > 3000000 ) {
    fileSize = 90;
  } else if ( fileSize > 1000000 ) {
    fileSize = 80;
  } else {
    fileSize = 70;
  }
  fileSize = 50;
  if(filePath == "quick"){
    counter = 99
  }
  setTimeout(function() {
    if ( window.innerWidth > 500 ) {
      $('html, body').animate({
        scrollTop: ($("#fileupload_custom").offset().top - 150)
      }, 500);
    } else {
      $('html, body').animate({
        scrollTop: ($("#fileupload_custom").offset().top - 10)
      }, 500);
    }
  },500)

  setTimeout(function(){
    let counterIncrease = setInterval(() => {
      if (counter === 100) {
        const isCompleted = $( `.easyzoom` ).hasClass("image-loading");
        if ( isCompleted == false ) {
          clearInterval(counterIncrease);
          document.querySelector(".drop-zoon__icon").style.display = 'none';
          document.querySelector(".drop-zoon__paragraph").style.display = 'none';
          if($('[href="#custom_size"]').hasClass("active") == true){
            $('[href="#custom_size"]').click();
          }
          $(".upload_image_info").removeClass("hidden");

          $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
          $(".upload-area__file-details").removeClass("file-details--open");
          $("#uploadedFile").removeClass("uploaded-file--open");
        }
      } else {
        counter = counter + 1;
        $(".uploaded_progress_bar").css({"width":counter+"%"});
        uploadedFileCounter.innerHTML = `${counter}%`
      }
    }, fileSize);
  },100)
};


// Simple File Validate Function
function fileValidate(fileType, fileSize, file) {
  setTimeout(function(){
    $(".secondDropZone,#uploadArea").removeClass("drop-disabled-size");
    $(".secondDropZone,#uploadArea").removeClass("drop-disabled-type");
  },3500)
  // File Type Validation
// alert(fileType);
  let isImage = imagesTypes.filter((type) => fileType.indexOf(`${type}`) !== -1);

  // If The Uploaded File Type Is 'jpeg'
  if (isImage[0] === 'jpeg') {
    // Add Inisde (uploadedFileIconText) The (jpg) Value
    uploadedFileIconText.innerHTML = 'jpg';
  } else { // else
    // Add Inisde (uploadedFileIconText) The Uploaded File Type
    uploadedFileIconText.innerHTML = isImage[0];
  };

  // If The Uploaded File Is An Image
  if (isImage.length !== 0 ) {
    // Check, If File Size Is 2MB or Less
    if (fileSize <= 5368709120) { // 2MB :)
      return true;
    } else { // Else File Size
      $(".secondDropZone,#uploadArea").addClass("drop-disabled-size");
      return false;
    };
  } else { // Else File Type
    $(".secondDropZone,#uploadArea").addClass("drop-disabled-type");
    if(document.querySelector(".file-upload-overlay-2"))
      document.querySelector(".file-upload-overlay-2").classList.remove("active");
      document.querySelector("body").classList.remove("file-upload-overlay-2-active");
    if( document.querySelector(".file-upload-overlay-1"))
      document.querySelector(".file-upload-overlay-1").classList.remove("active");
      document.querySelector("body").classList.remove("file-upload-overlay-1-active");
    return false
  };
};

$(".popularOption").on("click", function(){
  setTimeout(function(){
    const isSizesBlock = $( `sizes-blocks` ).length;
    if ( isSizesBlock > 0 ) {
      setImageDimensions();
    } else {
      let val = $("select.custom-variant-selector.product-variant__container").val().split(" x ")[0].replace('"','');

      $(".horizontal_direction span").html(val+`.00"`);
      $(".verticle_direction span").html(`<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>`);
    }
    manageProperties();
  },500);
});


$(".customOption").on("click", function(){
  setTimeout(function(){
    const isSizesBlock = $( `sizes-blocks` ).length;
    if ( isSizesBlock > 0 ) {
      setImageDimensions();
    } else {
      //let size = $(".widthHeight__option-detectedSize [d-size]").html().replace(" x ","x").split("x");
      $(".horizontal_direction span").html(parseFloat($('input[name="width__value"]').val()).toFixed(2)+'"');
      $(".verticle_direction span").html(parseFloat($('input[name="height__value"]').val()).toFixed(2)+'"');
    }
    manageProperties();
  },500);
});

function setImageDimensions() {
  try {
    let activeTabIs = '';
    const selectedTab = $( `.tab_header > a[href="#popular_size"].active` ).length;
    if ( selectedTab > 0 ) {
      activeTabIs = 'popular';
    } else {
      activeTabIs = 'custom';
    }

    if ( activeTabIs == 'popular' ) {
      const isRowAvailable = $( `sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"]` ).length;
      if ( isRowAvailable > 0 ) {
        let currentSelectedOptionVal = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val();
        if ( typeof currentSelectedOptionVal !== 'undefined' && currentSelectedOptionVal ) {
          if ( currentSelectedOptionVal.includes( `"` ) ) {
            currentSelectedOptionVal = currentSelectedOptionVal.replaceAll( `"`, `` );
          }
          if ( currentSelectedOptionVal.includes( `^` ) ) {
            currentSelectedOptionVal = currentSelectedOptionVal.replaceAll( `^`, `` );
          }
          if ( currentSelectedOptionVal.includes( ` ` ) ) {
            currentSelectedOptionVal = currentSelectedOptionVal.replaceAll( ` `, `` );
          }
          let getSelectedWidth, getSelectedHeight;
          if ( currentSelectedOptionVal.includes( `x` ) ) {
            getSelectedWidth = currentSelectedOptionVal.split( `x` )[0];
            getSelectedHeight = currentSelectedOptionVal.split( `x` )[1];

            getSelectedWidth = getSelectedWidth * 1;
            getSelectedHeight = getSelectedHeight * 1;

            if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
            } else {
              $( `.fileupload_preview .horizontal_direction span` ).text( `${ getSelectedWidth.toFixed( 2 ) }"` );
              $( `.fileupload_preview .verticle_direction span` ).html( `<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>` );
              $( `file-preview preview-block .horizontal_direction` ).attr( `x-is`, getSelectedWidth.toFixed( 2 ) );
              $( `file-preview .verticle_direction` ).attr( `y-is`, getSelectedHeight.toFixed( 2 ) );
               $( `file-preview .verticle_direction` ).attr( `y-is`, `Proportional Height`);
            }
          }
        }
      } else {
        $( `.fileupload_preview .horizontal_direction span` ).text( `--` );
        $( `.fileupload_preview .verticle_direction span` ).text( `--` );
        $( `file-preview preview-block .horizontal_direction` ).attr( `x-is`, `0` );
        $( `file-preview .verticle_direction` ).attr( `y-is`, `0` );
      }
    } else if ( activeTabIs == 'custom' ) {
      const isRowAvailable = $( `sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"]` ).length;
      if ( isRowAvailable > 0 ) {
        let getSelectedWidth, getSelectedHeight;
        const isActiveRowAvailable = $( `sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"][item="${ selectedItemNo }"]` ).length;
        if ( isActiveRowAvailable > 0 ) {
          getSelectedWidth = $( `sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"][item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__value` ).val() * 1;
          getSelectedHeight = $( `sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"][item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__value` ).val() * 1;

          if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
          } else {
            $( `.fileupload_preview .horizontal_direction span` ).text( `${ getSelectedWidth.toFixed( 2 ) }"` );
            $( `.fileupload_preview .verticle_direction span` ).text( `${ getSelectedHeight.toFixed( 2 ) }"` );

            $( `file-preview preview-block .horizontal_direction` ).attr( `x-is`, getSelectedWidth.toFixed( 2 ) );
            $( `file-preview .verticle_direction` ).attr( `y-is`, getSelectedHeight.toFixed( 2 ) );

            dimensionsClassesApply( getSelectedWidth, getSelectedHeight );
          }
        }
      } else {
        $( `.fileupload_preview .horizontal_direction span` ).text( `--` );
        $( `.fileupload_preview .verticle_direction span` ).text( `--` );
      }
    } else {
      $( `.fileupload_preview .horizontal_direction span` ).text( `--` );
      $( `.fileupload_preview .verticle_direction span` ).text( `--` );
    }
    if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
      getSelectedWidth = $( `sizes-blocks .widthHeight__custom.bumperStickers[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `w` ) * 1;
      getSelectedHeight = $( `sizes-blocks .widthHeight__custom.bumperStickers[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `h` ) * 1;

      $( `.fileupload_preview .horizontal_direction span` ).text( `${ getSelectedWidth.toFixed( 2 ) }"` );
      $( `.fileupload_preview .verticle_direction span` ).html( `<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>` );

      $( `file-preview preview-block .horizontal_direction` ).attr( `x-is`, getSelectedWidth.toFixed( 2 ) );
      $( `file-preview .verticle_direction` ).attr( `y-is`, getSelectedHeight.toFixed( 2 ) );

      dimensionsClassesApply( getSelectedWidth, getSelectedHeight );
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

if( isGangPage == false ){
  $("product-variants input").on("click", function(){
    let size = $(this).val().replace(" x ","x").split("x");
    $(".horizontal_direction span").html(`${ parseFloat(size[0]).toFixed(2)}"`);
    $(".verticle_direction span").html(`<b style='display:inline-block;line-height:1.6;font-size:9px;'>Proportional<br/>Height</b>`);
  });
}

if(isGangPage){
  $('.product-variants > div:first-of-type  input').on("click", function(){

    let size = $(this).attr("data-width");
    let size_r = $(this).attr("data-height");
    let sizeInInches = $(this).attr("size-in-inches");
    $(".horizontal_direction span").html(`${ parseFloat(size).toFixed(2)}"`);
    if ( typeof sizeInInches !== 'undefined' && sizeInInches ) {
      $(".verticle_direction span").html(`${ parseFloat(sizeInInches).toFixed(2)}"`);
    } else {
      $(".verticle_direction span").html(`${ parseFloat(size_r).toFixed(2)}"`);
    }
  });
  $('.product-variants > div:first-of-type  input:checked').click();
}

$(".tab_header:not(.upload_files_tab_header) > a").on("click", function(e){
  e.preventDefault();
  $(".tab_header:not(.upload_files_tab_header) > a,.tab_body:not(.upload_files_tab_data) > div").removeClass("active");
  $(this).addClass("active");
  $(".tab_body:not(.upload_files_tab_data) > div"+$(this).attr("href")).addClass("active");
});

$(".tab_header.upload_files_tab_header > a").on("click", function(e){
  e.preventDefault();
  $(".tab_header.upload_files_tab_header > a,.tab_body.upload_files_tab_data > div").removeClass("active");
  $(this).addClass("active");
  $(".tab_body.upload_files_tab_data > div"+$(this).attr("href")).addClass("active");
});

$(".custom-variant-selector").on("change", function(){
  let value = $(this).val();
  $(".product-variant__item.product-variant__item--radio input[value='"+value+"']").click();
});


$("#fileremove-2").click(function() {
  $(".customTabelPopup__overlay-2").fadeIn(500);
  isReadyToPress = false;
});
$(".customTabelPopup__overlay-2 .close").click(function() {
  $(".customTabelPopup__overlay-2").fadeOut(500);
});

closeIcon.addEventListener("click", () => {
  toast.classList.remove("active");

  setTimeout(() => {
    progress.classList.remove("active");
  }, 300);

  clearTimeout(timer1);
  clearTimeout(timer2);
});
$(".basic_link").on("click", function(e){
  let nextUrl =  $(this).attr("href");
  $("#return_to_url").val(nextUrl)
  e.preventDefault();
  e.stopImmediatePropagation();
  if($(this).data("link") != ""){
    document.body.classList.add("processing-second-upload");
    document.body.classList.add("hide-loader");
    $(".loadingScreen__").css({"opacity":0});
    // $( `.anotherTransfer` ).click();
    // For by-size products (sizes-blocks present, e.g. Spangle / Puff /
    // DTF), use .addToCartGroupItems — see pdp_transferBySize.js for
    // full rationale. The legacy button drops Spangle Colors / other
    // JS-only properties.
    var _isSizesBlock = $( `sizes-blocks` ).length;
    if ( _isSizesBlock > 0 ) {
      addAnotherTransfer( `#${ mainSectionID } .addToCartGroupItems` );
    } else {
      addAnotherTransfer( `#${ mainSectionID } .product__cart-functions .add-to-cart[data-main-product-add-to-cart]` );
    }
    toast.classList.add("active");
    // progress.classList.add("active");
    timer1 = setTimeout(() => {
      toast.classList.remove("active");
      location.href = nextUrl;
    }, 1500); //1s = 1000 milliseconds
  } else {
    $(".customTabelPopup__overlay-6").show();
  }
});

$(".purchase_from_previous").on("click", function(e){
  e.preventDefault();
  e.stopImmediatePropagation();

  $(".customer_designes > img").show();
  $(".customer_designes ul").hide();
  $('.customTabelPopup__overlay-3').fadeIn(500);
  $('.customTabelPopup__overlay-3').attr("data-type",$(this).data("type"));
  $.ajax({
    url: apiURL+"/uploads/fetchDataNew?customer_id="+CUSTOMER_ID+"&gangsheet="+isGangPage,
    success:function(data){
      $(".customer_designes:not(._2) > img").hide();
      $(".customer_designes:not(._2) ul").show();
      let innerData = "";
      for(let i = 0; i < data.length; i++){
        let variantSize = data[i].variant_title;
        variantSize = variantSize.split("x");

        var file_name = data[i].file_name;
        if(file_name.indexOf("imgix.net") > -1){
          file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
        }else if(file_name.indexOf("ninja-services-production") > -1){
          file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
        }else if(file_name.indexOf("amazonaws") > -1){
          file_name = file_name.replace("https://","").split("?")[0].split("/")[2];
        }
        let filePathCompressed = data[i].file.replace(ninjaS3Host2,ninjaS3Host);
        if(filePathCompressed.indexOf("?") > -1){
          filePathCompressed = data[i].file+"&h=300&auto=compress&q=10&dpi=72";
        }else{
          filePathCompressed = data[i].file+"?h=300&auto=compress&q=10&dpi=72";
        }
        innerData += `
          <li data-date="${data[i].formatted_date}" data-name="${file_name.toLowerCase()	}"  >
            <div>
              <div class="upload_tools">
                <a href="#" onclick="downloadImage('${data[i].file}','${file_name}')" class="download--btn" >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 21l-8-9h6v-12h4v12h6l-8 9zm9-1v2h-18v-2h-2v4h22v-4h-2z"/></svg>
                </a>
                <a href="" data-id="${data[i].photo_id}">
                  <svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v15.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill-rule="nonzero"/></svg>
                </a>
              </div>
              <div class="img_container">
                <img src="${filePathCompressed}" />
                <div>
                  <a href="" class="use_design" data-src="${data[i].file}" data-name="${file_name}">Use this Design</a>
                </div>
              </div>
              <div class="img_info">
                <h4>${file_name	}</h4>
                <p>Size: <b>${Number(variantSize[0]).toFixed(2)}x${Number(variantSize[1]).toFixed(2)}</b><br/>
                  ${data[i].purchased_at.replace("Purchased","Uploaded")}
                </p>

              </div>
            </div>
          </li>
        `;
      }
      $(".customer_designes:not(._2) ul").html(innerData);
    },
    error: function(){
      $(".customer_designes:not(._2) > img").hide();
      $(".customer_designes:not(._2) ul").show();
      $(".customer_designes:not(._2) ul").html("<p style='text-align:center'>Sorry! No data found</p>");
    }
  });

  $.ajax({
    url: apiURL+"/uploads/orderDataNew?customer_id="+CUSTOMER_ID+"&gangsheet="+isGangPage,
    success:function(data){
      data = data.data;
      $(".customer_designes._2 > img").hide();
      $(".customer_designes._2 ul").show();
      let innerData = "";
      for(let i = 0; i < data.length; i++){
        let   file_name = data[i].file;
        if(file_name.indexOf("imgix.net") > -1){
          file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
          if(file_name.indexOf("____image") > -1){
            let ext = file_name.split('.').pop()
            file_name =  file_name.split("____image")[0]+"."+ext;
          }
        }else if(file_name.indexOf("upload.cloudlift.app") > -1){
          file_name =  file_name.split("transferss/")[1];
        }else if(file_name.indexOf("ninja-services-production") > -1){
          file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
        }else if(file_name.indexOf("amazonaws") > -1){
          file_name = file_name.replace("https://","").split("?")[0].split("/")[2];
        }
        let variantSize = data[i].variant_title.split(" / ")[0].toLowerCase();
        // variantSize = variantSize.split("x");
        let filePathCompressed = data[i].file.replace(ninjaS3Host2,ninjaS3Host);
        if(filePathCompressed.indexOf("?") > -1){
          filePathCompressed = data[i].file+"&h=300&auto=compress&q=10&dpi=72";
        }else{
          filePathCompressed = data[i].file+"?h=300&auto=compress&q=10&dpi=72";
        }
        innerData += `
          <li data-date="${data[i].formatted_date}" data-name="${file_name.toLowerCase()}"  >
            <div>
              <div class="upload_tools">
                <a href="#" onclick="downloadImage('${data[i].file}','${file_name}')"  class="download--btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 21l-8-9h6v-12h4v12h6l-8 9zm9-1v2h-18v-2h-2v4h22v-4h-2z"/></svg>
                </a>
              </div>
              <div class="img_container">
                <img src="${filePathCompressed}" />
                <div>
                  <a href="" class="use_design" data-src="${data[i].file}" data-name="${file_name}">Use this Design</a>
                </div>
              </div>
              <div class="img_info">
                <h4>${file_name}</h4>
                <p>Size: <b>${variantSize}</b><br/>
                  ${data[i].purchased_at}
                </p>
              </div>
            </div>
          </li>
        `;
      }
      $(".customer_designes._2 ul").html(innerData);
    },
    error: function(){
      $(".customer_designes._2 > img").hide();
      $(".customer_designes._2 ul").show();
      $(".customer_designes._2 ul").html("<p style='text-align:center'>Sorry! No data found</p>");
    }
  });
});

$("body").on("click", ".customer_designes ul a[data-id]", function(e){
  e.preventDefault();
  $(".customTabelPopup__overlay-4").show();
  $("#fileremove-single").data("id",$(this).data("id"));
});

$("#fileremove-single").on("click", function(){
  let id = $(this).data("id");
  $(".customer_designes ul a[data-id='"+id+"']").parents("li").css({"pointer-events":"none","opacity":0.5});
  $.ajax({
    url: apiURL+"/uploads/deleteData?customer_id="+CUSTOMER_ID+"&photo_id="+$(this).data("id"),
    success:function(data){
      $(".customer_designes ul a[data-id='"+id+"']").parents("li").remove();
      $(".customTabelPopup__overlay-4").hide();
    }
  });
});

$(".popup_tool_bar input").on("keyup", function(){
  let _this = $(this);
  let value = $(this).val().toLowerCase().trim();
  if(value != ""){
    _this.parents(".image_containers").find(".customer_designes li").show().filter(function() {
      return $(this).text().toLowerCase().trim().indexOf(value) == -1;
    }).hide();
  }else{
    _this.parents(".image_containers").find(".customer_designes li").show();
  }
});

$("body").on("click", ".use_design", function(e){
  e.preventDefault();
  $(".customTabelPopup__overlay-3").hide();
  let datapath = $(this).data("src");
  if($(this).parents(".customTabelPopup__overlay-3").attr("data-type") == "second_upload"){
    if ( $( `.loadingScreen__` ).length == 0 ) {
      $( `body` )
      .prepend( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
    }
    // secondryDropZone.classList.add( `secondFileAvailable` );
    document.body.classList.add("processing-second-upload");
    // $( `.anotherTransfer` ).click();
    // For by-size products (sizes-blocks present, e.g. Spangle / Puff /
    // DTF), use .addToCartGroupItems — see pdp_transferBySize.js for
    // full rationale.
    var _isSizesBlock = $( `sizes-blocks` ).length;
    if ( _isSizesBlock > 0 ) {
      addAnotherTransfer( `#${ mainSectionID } .addToCartGroupItems` );
    } else {
      addAnotherTransfer( `#${ mainSectionID } .product__cart-functions .add-to-cart[data-main-product-add-to-cart]` );
    }
    $("#fileremove").click();
    // field__.clearFiles();

    $( `[name="properties[Design Notes]"]` ).val( `` );
    toast.classList.add("active");
    // progress.classList.add("active");
    timer1 = setTimeout(() => {
      toast.classList.remove("active");
    }, 5000); //1s = 1000 milliseconds
    timer2 = setTimeout(() => {
      // progress.classList.remove("active");
    }, 5300);
    setTimeout(function(){
      document.body.classList.remove("processing-second-upload");
    },2000)
  }
  $( `.generative-ai-area` ).addClass( `hidden` );
  dropZoon.classList.add('drop-zoon--Uploaded');
  loadingText.style.display = "block";
  uploadedFile.classList.remove('uploaded-file--open');
  uploadedFileInfo.classList.remove('uploaded-file__info--active');
  uploadArea.classList.add('upload-area--open');
  loadingText.style.display = "none";
  // fileDetails.classList.add('file-details--open');
  // uploadedFile.classList.add('uploaded-file--open');
	uploadedFileInfo.classList.add('uploaded-file__info--active');
	document.querySelector("#fileupload_hero").setAttribute('src', datapath);
	uploadedFileName.innerHTML = $(this).data("name");
	document.querySelector(".fileupload_custom").style.display = "block";
	progressMove("quick",0);
	document.querySelector("#uploadArea").classList.add("hidden");
	executeNextStep(datapath, true, true, false);


  const checkPropertyEle = $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).length;
  if ( checkPropertyEle == 0 ) {
    $( `product-form.product-form form` )
      .append( `
        <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${ datapath }">
        <input type="hidden" name="properties[_Original Image]" value="${ datapath.split("?")[0]}">
      ` );
  } else {
    $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).val( `${ datapath }` );
    $( `product-form.product-form form [name="properties[_Original Image]"]` ).val( `${ datapath.split("?")[0]}` );
  }
})

async function downloadImage(imageSrc, file_name) {
  const image = await fetch(imageSrc)
  const imageBlob = await image.blob()
  const imageURL = URL.createObjectURL(imageBlob)

  const link = document.createElement('a')
  link.href = imageURL
  link.download = file_name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

$(".tool_sorting select").on("change", function(){
  let val = $(this).val();
  let _this = $(this);
  _this.parents(".image_containers").find(".customer_designes ul li").sort(function(left, right) {
    if(val == "date_asc")
      return parseInt($(left).attr("data-date")) < parseInt($(right).attr("data-date"));
    else if(val == "date_desc")
      return parseInt($(left).attr("data-date")) > parseInt($(right).attr("data-date"));
    else if(val == "file_name_asc")
      return $(left).attr("data-name") > $(right).attr("data-name") ? 1 : -1;
    else if(val == "file_name_desc")
      return $(left).attr("data-name") < $(right).attr("data-name") ? 1 : -1;
  }).each(function() {
    _this.parents(".image_containers").find(".customer_designes ul").append($(this));
  });
  setTimeout(function(){
    _this.parents(".image_containers").find(".customer_designes").animate({
      scrollTop: (_this.parents(".image_containers").find(".customer_designes").offset().top - 1800)
    }, 0);
  },400)
})

$(".nj-popup").on("click", function(e){
  if (e.target !== this)
    return;
  $(this).hide();
  $("body").removeAttr("style");
});

$(".zoom-box,.zoom_image").on("click", function(e){
  e.preventDefault();
  if(e.target.tagName != "A" || e.target.style.length > 0){
    if($(".easyzoom.zoom-box").hasClass("no-bg")){
      $(".customTabelPopup__overlay-5").removeClass("no-transparant-bg");
    }else{
      $(".customTabelPopup__overlay-5").addClass("no-transparant-bg");
    }
    let getImg = $( `.zoom-box .viewer-box img` ).attr( `src` );
    $(".customTabelPopup__overlay-5 img").attr( `src`, getImg );
    $(".customTabelPopup__overlay-5").show();
  }
});

if(location.search.indexOf("force=upload") > -1){
  $("#dropZoon .purchase_from_previous").click();
}
if(location.search.indexOf("force=login") > -1){
  $("#dropZoon .first__upload").click();
}

if(location.search.indexOf("file=") > -1) {
  if(document.querySelector("#ready_to_press"))
    document.querySelector("#ready_to_press").disabled = false;
    //let datapath = location.search.split("file=")[1];
    const urlParams = new URLSearchParams(window.location.search);
    let datapath = urlParams.get("file") || "";
    datapath = decodeURIComponent(datapath).split("&")[0];
    dropZoon.classList.add('drop-zoon--Uploaded');
    loadingText.style.display = "block";
    uploadedFile.classList.remove('uploaded-file--open');
    uploadedFileInfo.classList.remove('uploaded-file__info--active');
    uploadArea.classList.add('upload-area--open');
    loadingText.style.display = "none";
    // fileDetails.classList.add('file-details--open');
    // uploadedFile.classList.add('uploaded-file--open');
    uploadedFileInfo.classList.add('uploaded-file__info--active');
    document.querySelector("#fileupload_hero").setAttribute('src', datapath);
    $(".viewer-box img").attr('src', datapath);
    document.querySelector(".fileupload_custom").style.display = "block";
    progressMove("quick",0);
    document.querySelector("#uploadArea").classList.add("hidden");
    $( `.generative-ai-area` ).addClass( `hidden` );
    // https://ninjatransfers.com/products/dtf-transfers?file=https://s3.amazonaws.com/ninja-imgix/Ready%20to%20Press%20Designs/%234005%20American%20Bow%20Tie%20sticker.png&preview_theme_id=129481310291
    let getfileExt = datapath.split("?")[0];
    getfileExt = getfileExt.split(".").pop();
      console.log("getfileExt",getfileExt);
  if(getfileExt ==  "png" || getfileExt == "svg" ){
      $(" #option_checkbox").prop("checked",false);
      $(" #remove_background").val("No");
    }else{
      $(" #option_checkbox").prop("checked",true);
      $(" #remove_background").val("Yes");
    }
    $(" .option_checkbox_upscale").prop("checked",false);
    $(" .custom_tab_container").addClass("is_disabled");
    $(" .widthHeight__item__action").addClass("disabled");
    $(" .fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(" .easyzoom").addClass("image-loading");
  
    // console.log ( 'getfileExt', getfileExt );
    isReadyToPress = true;
    executeNextStep(datapath, true, true, false);
    uploadedFileName.innerHTML = location.search.split("file=")[1].replace("https://","").split("/")[1];
    const checkPropertyEle = $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).length;

  if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || datapath.indexOf(".psd") > -1 || datapath.indexOf(".svg") > -1 ) {
      datapath = datapath.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
    }

    if ( checkPropertyEle == 0 ) {
      $( `product-form.product-form form` )
        .append( `
          <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${ datapath }">
          <input type="hidden" name="properties[_Original Image]" value="${ datapath.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0]}">
        ` );
    } else {
      $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).val( `${ datapath }` );
      $( `product-form.product-form form [name="properties[_Original Image]"]` ).val( `${ datapath.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0]}` );
    }  
}

function resetLoading(){
  $("#fileremove").click();
  location.reload();
}

$(".gangsheet_terms input").on("click", function(){
  if($(this).prop("checked") == true){
    $(".terms_blocker,.gangsheet_terms p").removeClass("active");
  }else{
    $(".terms_blocker,.gangsheet_terms p").addClass("active");
  }
});

$(".terms_blocker.active").on("click", function(){
  $(".gangsheet_terms p").addClass("active");
});

function showAlert(e,cls){
  e.preventDefault();
  $(".warning-message-custom").addClass(cls);
  setTimeout(function(){
    $(".warning-message-custom").removeClass(cls);
    if(cls == "another_alert_by_size"){
      $("[href='#purchased_files_gang_sheet']").removeClass("active");
      $("[href='#purchased_files_by_size']").addClass("active");
    }else{
      $("[href='#purchased_files_gang_sheet']").addClass("active");
      $("[href='#purchased_files_by_size']").removeClass("active");
    }
  },4000);
  return false;
}
$("#fileupload_hero").on("load", function() {
  if ( typeof isDTFPage !== 'undefined' && isDTFPage ) {
    let imgSrc = document.getElementById( `fileupload_hero` );
    imgSrc = imgSrc.getAttribute( `src` );
    if ( imgSrc.includes( `//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png` ) == false ) {
      waitForImageLoadById('fileupload_hero')
        .then(() => {
          const isPopularActive = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
          if ( isPopularActive == 'popular' ) {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` ).trigger(`change`);
          }
          $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
          $( `.product__cart-functions .step__2` ).removeClass( `hidden` );
          console.log('✅ Image loaded');
          $(".easyzoom").removeClass("image-loading");
          // Do stuff after successful load
        })
        .catch((err) => {
          console.error('❌ Image failed to load', err);
          // Handle error or show fallback
        })
        .finally(() => {
          $(".easyzoom").removeClass("image-loading");
          console.log('🎯 Done checking image, moving forward');
          // This runs no matter what — cleanups, UI updates, enabling buttons, etc.
        });
    }
  } else {
    if($(this).attr("src").indexOf("trim=") > -1){
      let inter =  setInterval(function(){
        if($(".uploaded-file__counter").html() == "100%"){
          $(".easyzoom").removeClass("image-loading");
          $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
          clearInterval(inter);
          setTimeout(() => {
            $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__value` ).trigger('keyup');
          }, 500);
        }
      },100)
  
    }
  }
});

async function waitForImageLoadById(id, maxRetries = 3, retryDelay = 500) {
  const img = document.getElementById(id);

  if (!img) {
    throw new Error(`No image found with id "${id}"`);
  }

  const ignoredSrc = '//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png';

  if (img.src.includes(ignoredSrc)) {
    console.log('Image is transparent placeholder – skipping load check.');
    return null;
  }

  // Helper to try loading image
  function tryLoadImage(attempt) {
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (attempt < maxRetries) {
          console.warn(`Image failed to load (attempt ${attempt + 1}/${maxRetries}). Retrying...`);
          setTimeout(() => {
            // Bust cache by adding/replacing query param
            const retrySrc = img.src.split('?')[0] + `?retry=${Date.now()}`;
            img.src = retrySrc;
            tryLoadImage(attempt + 1).then(resolve).catch(reject);
          }, retryDelay);
        } else {
          reject(new Error(`Image failed to load after ${maxRetries} attempts.`));
        }
      };

      // Initial trigger in case it’s not loaded yet
      if (img.complete && img.naturalWidth !== 0) {
        resolve(img);
      } else {
        // Set src again to trigger load in some edge cases
        const initialSrc = img.src;
        img.src = '';
        img.src = initialSrc;
      }
    });
  }

  return tryLoadImage(0);
}


function calculateDPI(type = "custom") {
  const isSizesBlock = $( `sizes-blocks` ).length;
  if ( isSizesBlock == 0 && isGangPage == false ) {
    if ( typeof fileExt !== 'undefined' && fileExt ) {
      if ( fileExt == 'png' || fileExt == 'jpg' || fileExt == 'jpeg' ) {

        let physicalWidthInInches = $(`.widthHeight__value[name="width__value"]`).val();
        let physicalHeightInInches = $(`.widthHeight__value[name="height__value"]`).val();
        let makeSqInchesForPopular, makeSqInchesForCustom, currentSqInches = 0;
        if ( type == 'popular' ) {
          if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
            physicalWidthInInches = $( `sizes-blocks .widthHeight__custom.bumperStickers[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `w` ) * 1;
            physicalHeightInInches = $( `sizes-blocks .widthHeight__custom.bumperStickers[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `h` ) * 1;
          } else {
            physicalWidthInInches =  Number($("popular-wrap input:checked").val().split(" x ")[0].replace('"',''));
            physicalHeightInInches =  Number($("popular-wrap input:checked").val().split(" x ")[1].replace('"',''));
          }

          makeSqInchesForPopular = physicalWidthInInches * physicalHeightInInches;
        } else if ( type == 'custom' ) {
          makeSqInchesForCustom = (uploadedFileWidth * uploadedFileHeight) / 72;
          currentSqInches = ( physicalWidthInInches * physicalHeightInInches ) * 72;
        }

        // Get the pixel dimensions of the image
        const pixelWidth = uploadedFileWidth;
        const pixelHeight = uploadedFileHeight;
        // Calculate DPI
        const dpiWidth = pixelWidth / physicalWidthInInches;
        const dpiHeight = pixelHeight / physicalHeightInInches;
        // console.log(`DPI WIDTH ${uploadedFileWidth} -- ${uploadedFileHeight} -- ${dpiWidth} -- ${dpiHeight}`);
        let dpi =  (parseFloat(dpiWidth) + parseFloat(dpiHeight)) / 2;
        // console.log(`DPI DPI ${dpi} `);
        // console.log(`Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }`);
        if ( type == 'custom' ) {
          if ( makeSqInchesForCustom < 288 ) {
            $(".dpi_warning").addClass("active");
            $( `.dpi_warning recommended-size` ).text( `Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }` );
          } else if ( makeSqInchesForCustom > 288 && makeSqInchesForCustom > currentSqInches ) {
            $(".dpi_warning").removeClass("active");
          } else {
            $(".dpi_warning").addClass("active");
            $( `.dpi_warning recommended-size` ).text( `Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }` );
          }

        } else if ( type == 'popular' ) {
          const recommendedSqInches = ((uploadedFileWidth / 72) * (uploadedFileHeight / 72));
          if ( recommendedSqInches < 4 ) {
            $( `.dpi_warning recommended-size` ).html( `<span style="color: #d00;">Please upload larger size image</span>` );
            $(".dpi_warning").addClass("active");
          } else if ( makeSqInchesForPopular < recommendedSqInches ) {
            $(".dpi_warning").removeClass("active");
          } else {
            $( `.dpi_warning recommended-size` ).text( `Maximum recommended square inches are ${ Math.trunc( recommendedSqInches ) }` );
            $(".dpi_warning").addClass("active");
          }
        } else {
          $( `.dpi_warning recommended-size` ).text( `` );
        }
      }
    }
  }
}


$('[href="#popular_size"],popular-wrap .product-variant__item').on("click",async function(){
  currentSelectedOption = 'popular';
  const isDtfImgixEle = $( `.dtf_imgix_images` ).length;
  if ( isDtfImgixEle > 0 ) {
    $( `.dtf_imgix_images` ).hide();
    $( `.gallery_position.product-gallery[data-js-product-gallery]` ).show();
  }
  addMoreIfNotExist();
  $( `.add-more-block .addmore_size popular--size` ).removeClass( `hidden` );
  $( `.add-more-block .addmore_size custom--size` ).addClass( `hidden` );
  $( `sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).addClass( `disabled` );
  $( `sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).removeClass( `disabled` );
  const isPopularEle = $( `sizes-blocks .widthHeight__custom[item][option-selected="popular"]` );
  if ( isPopularEle.length > 0 ) {
    const getLastPopulatItemVal = isPopularEle.last().find( `.popularSizes` ).val();
    $( `product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getLastPopulatItemVal }"]` ).click();
    selectedItemNo = isPopularEle.last().attr( `item` );
  }
  await addDelay( 1000 );
  const isSizesBlock = $( `sizes-blocks` ).length;
  if ( isSizesBlock > 0 ) {
    calculateDPILineItem("popular");
  } else {
    calculateDPI("popular");
  }
});

$(`[href="#custom_size"]`).on("click",async function(){
  const isDtfImgixEle = $( `.dtf_imgix_images` ).length;
  if ( isDtfImgixEle > 0 ) {
    $( `.dtf_imgix_images` ).show();
    $( `.gallery_position.product-gallery[data-js-product-gallery]` ).hide();
  }
  currentSelectedOption = 'custom';
  // addMoreIfNotExist();
  $( `.add-more-block .addmore_size popular--size` ).addClass( `hidden` );
  $( `.add-more-block .addmore_size custom--size` ).removeClass( `hidden` );
  $( `sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).removeClass( `disabled` );
  $( `sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).addClass( `disabled` );
  const isCustomEle = $( `sizes-blocks .widthHeight__custom[item][option-selected="custom"]` );
  if ( isCustomEle.length > 0 ) {
    selectedItemNo = isCustomEle.first().attr( `item` );
  } else {
    currentSelectedOption = 'popular';
  }
  await addDelay( 1000 );
  const isSizesBlock = $( `sizes-blocks` ).length;
  if ( isSizesBlock > 0 ) {
    calculateDPILineItem( currentSelectedOption );
  } else {
    calculateDPI( currentSelectedOption );
  }
})


async function addAnotherTransfer( cartButtonSelector ) {
  try {
    anotherTransfer = true;
    // mainSectionID
    $( `${ cartButtonSelector }` )
      .click();

    if ( typeof getRequest === 'function' ) {
      await ApplyDelay( 1000 );
      alreadyCartItems = await getRequest( `/cart?view=pdpCartItem&pid=${ currentPID }` );
      if ( typeof alreadyCartItems !== 'undefined' && alreadyCartItems ) {
        if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'Cumulative' ) {
          alreadyCartItems = [alreadyCartItems];
        } else if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'cartTotal' ) {
          alreadyCartItems = [];
          const getCartTotalObj = await getRequest( `/cart?view=pdpCartObject` );
          if ( typeof getCartTotalObj !== 'undefined' && getCartTotalObj ) {
            getCartTotal = getCartTotalObj.original_total_price;
            const getTableFirstRowPrice = $( `.customTabelPlaceWrap` ).attr( `base-price` ) * 1;
            let getCalculatedQty = getCartTotal / getTableFirstRowPrice;
            getCalculatedQty__ = Math.floor( getCalculatedQty );
          }
        }
      }
    }

    if ( typeof ElementAvailibility === 'function' ) {
      ElementAvailibility ( `#site-cart-sidebar.sidebar.sidebar--opened`, 'refreshAllCart', 5 );
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

async function refreshAllCart() {
  try {
    isReadyToPress = false;
    const isSecondDropZone = $( `.secondDropZone.secondFileAvailable` ).length;
    if ( isSecondDropZone > 0 ) {
      $( `#site-cart-sidebar.sidebar.sidebar--opened` )
        .find( `.sidebar__close` )
        .click();
      // field__.clearFiles();
      $( `textarea.cl-upload--input` ).val( `` );
      $( `.secondDropZone` ).removeClass( `secondFileAvailable` );
        setTimeout(() => {
        $( `.loadingScreen__` ).remove();
      }, 1500);
    } else {
     // location.href = "?";
      $( `#site-cart-sidebar.sidebar.sidebar--opened` )
        .find( `.sidebar__close` )
        .click();
      $( `.css-slider-dot-navigation .css-slider-dot[data-index="0"]` ).click();
      $( `button.filepond--file-action-button.filepond--action-revert-item-processing` ).click();
      $( `.cl-upload--errors.open` ).remove();
      $( `#size_selection .custom_tabs .tab_header a[href="#custom_size"]` ).click();
    }
    setTimeout(() => {
      anotherTransfer = false;
      $( `#size_selection .custom_tabs .tab_header a[href="#custom_size"]` ).click();
      $( `.loadingScreen__` ).remove();
      if ( typeof reCalculateFreeShippingModule === 'function' ) {
        reCalculateFreeShippingModule();
      }
    }, 1500);
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

/*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com */
/* vim: set ts=2: */
/*exported CRC32 */
var CRC32;
(function (factory) {
	/*jshint ignore:start */
	/*eslint-disable */
	if(typeof DO_NOT_EXPORT_CRC === 'undefined') {
		if('object' === typeof exports) {
			factory(exports);
		} else if ('function' === typeof define && define.amd) {
			define(function () {
				var module = {};
				factory(module);
				return module;
			});
		} else {
			factory(CRC32 = {});
		}
	} else {
		factory(CRC32 = {});
	}
	/*eslint-enable */
	/*jshint ignore:end */
}(function(CRC32) {
  CRC32.version = '1.2.3';
  /*global Int32Array */
  function signed_crc_table() {
    var c = 0, table = new Array(256);

    for(var n =0; n != 256; ++n){
      c = n;
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      table[n] = c;
    }

    return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
  }

  var T0 = signed_crc_table();
  function slice_by_16_tables(T) {
    var c = 0, v = 0, n = 0, table = typeof Int32Array !== 'undefined' ? new Int32Array(4096) : new Array(4096) ;

    for(n = 0; n != 256; ++n) table[n] = T[n];
    for(n = 0; n != 256; ++n) {
      v = T[n];
      for(c = 256 + n; c < 4096; c += 256) v = table[c] = (v >>> 8) ^ T[v & 0xFF];
    }
    var out = [];
    for(n = 1; n != 16; ++n) out[n - 1] = typeof Int32Array !== 'undefined' ? table.subarray(n * 256, n * 256 + 256) : table.slice(n * 256, n * 256 + 256);
    return out;
  }
  var TT = slice_by_16_tables(T0);
  var T1 = TT[0],  T2 = TT[1],  T3 = TT[2],  T4 = TT[3],  T5 = TT[4];
  var T6 = TT[5],  T7 = TT[6],  T8 = TT[7],  T9 = TT[8],  Ta = TT[9];
  var Tb = TT[10], Tc = TT[11], Td = TT[12], Te = TT[13], Tf = TT[14];
  function crc32_bstr(bstr, seed) {
    var C = seed ^ -1;
    for(var i = 0, L = bstr.length; i < L;) C = (C>>>8) ^ T0[(C^bstr.charCodeAt(i++))&0xFF];
    return ~C;
  }

  function crc32_buf(B, seed) {
    var C = seed ^ -1, L = B.length - 15, i = 0;
    for(; i < L;) C =
      Tf[B[i++] ^ (C & 255)] ^
      Te[B[i++] ^ ((C >> 8) & 255)] ^
      Td[B[i++] ^ ((C >> 16) & 255)] ^
      Tc[B[i++] ^ (C >>> 24)] ^
      Tb[B[i++]] ^ Ta[B[i++]] ^ T9[B[i++]] ^ T8[B[i++]] ^
      T7[B[i++]] ^ T6[B[i++]] ^ T5[B[i++]] ^ T4[B[i++]] ^
      T3[B[i++]] ^ T2[B[i++]] ^ T1[B[i++]] ^ T0[B[i++]];
    L += 15;
    while(i < L) C = (C>>>8) ^ T0[(C^B[i++])&0xFF];
    return ~C;
  }

  function crc32_str(str, seed) {
    var C = seed ^ -1;
    for(var i = 0, L = str.length, c = 0, d = 0; i < L;) {
      c = str.charCodeAt(i++);
      if(c < 0x80) {
        C = (C>>>8) ^ T0[(C^c)&0xFF];
      } else if(c < 0x800) {
        C = (C>>>8) ^ T0[(C ^ (192|((c>>6)&31)))&0xFF];
        C = (C>>>8) ^ T0[(C ^ (128|(c&63)))&0xFF];
      } else if(c >= 0xD800 && c < 0xE000) {
        c = (c&1023)+64; d = str.charCodeAt(i++)&1023;
        C = (C>>>8) ^ T0[(C ^ (240|((c>>8)&7)))&0xFF];
        C = (C>>>8) ^ T0[(C ^ (128|((c>>2)&63)))&0xFF];
        C = (C>>>8) ^ T0[(C ^ (128|((d>>6)&15)|((c&3)<<4)))&0xFF];
        C = (C>>>8) ^ T0[(C ^ (128|(d&63)))&0xFF];
      } else {
        C = (C>>>8) ^ T0[(C ^ (224|((c>>12)&15)))&0xFF];
        C = (C>>>8) ^ T0[(C ^ (128|((c>>6)&63)))&0xFF];
        C = (C>>>8) ^ T0[(C ^ (128|(c&63)))&0xFF];
      }
    }
    return ~C;
  }
  CRC32.table = T0;
  // $FlowIgnore
  CRC32.bstr = crc32_bstr;
  // $FlowIgnore
  CRC32.buf = crc32_buf;
  // $FlowIgnore
  CRC32.str = crc32_str;
}));