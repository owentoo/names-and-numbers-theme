/* cache-bust: force CDN refresh after delegated .purchase_from_previous fix landed */
let designtype = false;
let grt_photo_id = "";
let ordername = "";

/* Validate the order reference passed via URL / data-photoid before
   submitting properties[design re-used]. Real Shopify orders use the
   "NT-1234567" format. Earlier the API was returning a customer GraphQL
   ID (long hex like "a02f95a1d9d34d08c28954049be5c93c") which then
   leaked into the order admin as a meaningless string. Reject anything
   that doesn't look like an order name. */
function _ntIsValidOrderRef(v) {
  if (v === null || v === undefined) return false;
  var s = String(v).trim();
  if (!s) return false;
  s = s.replace(/^previously\s+on\s+order\s*#?\s*/i, '').trim();
  if (!s) return false;
  return /^[A-Z]{2,4}-?\d{4,}$/i.test(s);
}
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

let isAIImage = false;     // keep if you need it elsewhere
let isAIEdit  = false;     // ✅ new
let aiOriginalUrl = '';    // ✅ nano-banana URL for _Original Image

let isFileUpload = false;
let beforeUpScale__Width = 0;
let beforeUpScale__height = 0;
window.__aiEditOriginalUrl = '';
let stopProcessing = false;

/* Guard against drag-drop / "Choose a previous design" triggering an
   upload (and an endless loading screen) on Puff / Spangle when the
   user hasn't picked a color yet. Mirrors the validation that already
   gates the Browse click + `change #secondFile` path so all four
   entry points behave identically: scroll + flash the color picker,
   dismiss any loading overlay, return false to abort the caller.
   Browse + Proceed-to-checkout already short-circuit on the same
   conditions inside their own handlers; this helper centralizes the
   logic for the two paths that didn't have it. */
function _ntPuffSpangleColorGate() {
  if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
    var isColorSelected = $( `sizes-blocks .widthHeight__custom.puffPage .widthHeight__dropdown` ).attr( `selected-color` );
    if ( typeof isColorSelected !== 'undefined' && isColorSelected === '' ) {
      $( `sizes-blocks .widthHeight__custom.puffPage .widthHeight__dropdown` ).addClass( `noColorSelected` );
      var $tgt = $( `sizes-blocks .widthHeight__custom.puffPage .widthHeight__dropdown` );
      if ( $tgt.length && $tgt.offset() ) {
        $( `html, body` ).animate({ scrollTop: $tgt.offset().top - 100 }, 500);
      }
      $( `.loadingScreen__` ).remove();
      return false;
    }
  }
  if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
    var isError = $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown` ).hasClass( `pickColor` );
    if ( isError ) {
      var $sp = $( `spangle-colors .spangle__colorOption[item="1"]` );
      if ( $sp.length && $sp.offset() ) {
        $( `html, body` ).animate({ scrollTop: $sp.offset().top - 100 }, 1000);
      }
      $( `spangle-colors .spangle__colorOption[item="1"] .spangle__dropdown` ).addClass( `error` );
      $( `.loadingScreen__` ).remove();
      return false;
    }
  }
  return true;
}

/* Product-type guard for the "uploaded image replaces the product gallery"
   swap. Returns false everywhere — the user prefers the DTF-style behavior
   where the upload preview takes over from the variant gallery on upload
   (and the size-guide tshirt mockup is suppressed via CSS in bySize.liquid
   for non-DTF templates so only the clean file-preview shows). Kept as a
   function (vs deleting callsites) so future per-template overrides have
   a single switch point. */
function _ntKeepProductGalleryOnUpload() {
  return false;
}

if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
  definedMinQty = 10;
} else if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
  definedMinQty = 10;
} else if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct ) {
  definedMinQty = 100;
} else if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct && typeof definedQty__metafield !== 'undefined' && definedQty__metafield ) {
  definedMinQty = definedQty__metafield;
} else if ( typeof isMagnetProduct !== 'undefined' && isMagnetProduct ) {
  if ( typeof definedQtyFromMetafield !== 'undefined' && definedQtyFromMetafield ) {
    definedMinQty = definedQtyFromMetafield;
  } else {
    definedMinQty = 20;
  }
} else {
  if ( typeof definedQtyFromMetafield !== 'undefined' && definedQtyFromMetafield ) {
    definedMinQty = definedQtyFromMetafield;
  } else {
    definedMinQty = 1;
  }
}

const params = new URLSearchParams(window.location.search);
let grt_query_param = params.get("ordertype") || "";
if(grt_query_param != ""){
  designtype = 1;
  ordername = params.get("order_name") || "";
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
let isDTFPage = false
if(document.body.classList.contains("template-product-dtf-gang-sheet") || document.body.classList.contains("template-product-uv-gang-sheet") || document.body.classList.contains("template-product-dtf-gang-v2"))
  isGangPage = true;

if(document.body.classList.contains("is-dtf-page"))
  isDTFPage = true;

var imagesTypes = ["image/png","image/jpg","image/jpeg","application/postscript",".eps","application/pdf","image/tiff","image/svg+xml"];

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
        } else {
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
    const extraFields = Number(designtype) === 1 ? `<input type="hidden" name="properties[_Original Image]" value="previously on order # ${ ordername}">`: "";
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
            ${extraFields}
            ${ (typeof isAIEdit !== 'undefined' && isAIEdit) ? `<input type="hidden" name="properties[AI Edit]" value="Yes">` : `` }
            <input type="hidden" name="properties[_Original Image]" value="${ (typeof isAIEdit !== 'undefined' && isAIEdit && aiOriginalUrl) ? aiOriginalUrl : getFile.split("?")[0] }">

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

   // $( `.step__2` ).addClass( `loader` );

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
      console.log ( 'chaaa2',  );
      // $( `[item-show-on]` ).addClass( `hidden` );

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
  if(document.body.classList.contains("template-product-uv-gang-sheet") == true && typeof anotherTransfer == "undefined" ){
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
    },1000);
  } else {
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
    let items = [];

    const formEle = $( `.product-actions.__manage-space product-form form[data-type="add-to-cart-form"]` );
    const getAllProperties = getFormProperties( formEle, ['Remove Background', 'Super Resolution', '_discount_input', '_discount_name', 'Upload (Vector Files Preferred)','design re-used', '_Original Image'] );

    $($( `sizes-blocks .widthHeight__custom[item][option-selected]` ).get().reverse()).each(function( i ) {
      let vid;
      const isPreCutActive = $( `#precutselected__` ).is( `:checked` );
      if ( isPreCutActive ) {
        vid = $( this ).attr( `precut-vid` ) * 1;
      } else {
        vid = $( this ).attr( `vid` ) * 1;
      }
      const qty = $( this ).attr( `qty` ) * 1;
      let _title =  $( this ).attr( `title` );
      const cartNote = $( `textarea[name="properties[Design Notes]"]` ).val();
      let properties__;

      if ( typeof isPuffProduct !== 'undefined' && isPuffProduct ) {
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
                properties__.width = width;
              } else {
                if ( typeof properties__.width !== 'undefined' && properties__.width ) {
                  delete properties__.width;
                }
              }
              if ( typeof height !== 'undefined' && height ) {
                properties__.height = height;
              } else {
                if ( typeof properties__.height !== 'undefined' && properties__.height ) {
                  delete properties__.height;
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
        let width = $( this ).find( `.popularSizes_sticker` ).attr( `w` );
        let height = $( this ).find( `.popularSizes_sticker` ).attr( `h` );
        if ( typeof width !== 'undefined' && width && typeof height !== 'undefined' && height ) {
          properties__ = getAllProperties;
          if ( typeof width !== 'undefined' && width ) {
            properties__.width = width;
          }
          if ( typeof height !== 'undefined' && height ) {
            properties__.height = height;
          }
        }
      } else {
        let width = $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val();
        let height = $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val();
        if ( typeof getAllProperties !== 'undefined' && getAllProperties ) {
          properties__ = getAllProperties;
          if ( typeof width !== 'undefined' && width ) {
            properties__.width = width;
          } else {
            if ( typeof properties__.width !== 'undefined' && properties__.width ) {
              delete properties__.width;
            }
          }
          if ( typeof height !== 'undefined' && height ) {
            properties__.height = height;
          } else {
            if ( typeof properties__.height !== 'undefined' && properties__.height ) {
              delete properties__.height;
            }
          }
        }
      }
      const properties = {};
      if ( typeof properties__.width !== 'undefined' && properties__.width ) {
        properties.width = properties__.width;
      } else {
        delete properties.width;
      }
      if ( typeof properties__.height !== 'undefined' && properties__.height ) {
        properties.height = properties__.height;
      } else {
        delete properties.height;
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
        if (designtype == 1 && _ntIsValidOrderRef(ordername)) {
          properties['design re-used'] = `previously on order # ${ordername}`;
        }
      } else {
        properties['Upload (Vector Files Preferred)'] = $( `#fileupload_hero`).attr("src");
        if (designtype == 1 && _ntIsValidOrderRef(ordername)) {
          properties['design re-used'] = `previously on order # ${ordername}`;
        }
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
            // properties['_Size'] = `${ width }x${ height }`;
          }
        }
      } else {
        if ( typeof $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() !== 'undefined' && typeof $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() !== 'undefined' ) {
          // properties['_Size'] = `${ $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() }x${ $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() }`;
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

       if ( typeof isAIEdit !== 'undefined' && isAIEdit ) {
        properties['AI Edit'] = 'Yes';
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
        const isSecondOption = $( `.customStickerOption:not(.hidden)[item="2"]` ).length;
        if ( isSecondOption > 0 ) {
          const isChecked = $( `.customStickerOption:not(.hidden)[item="2"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
          if ( isChecked == false ) {
            isError = true;
            optionErr = true;
            $( `.customStickerOption:not(.hidden)[item="2"] .customStickerOption__error` ).removeClass( `hidden` );
          } else {
            const secondVal = $( `.customStickerOption:not(.hidden)[item="2"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
            $( `.customStickerOption:not(.hidden)[item="2"] .customStickerOption__error` ).addClass( `hidden` );
            const secondOptionName = $( `.customStickerOption:not(.hidden)[item="2"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
            properties[secondOptionName] = secondVal;
            // console.log ( 'secondVal', secondVal );
          }
        }
      }

      if ( typeof enableOption3 !== 'undefined' && enableOption3 ) {
        let isError = false;
        const isThirdOption = $( `.customStickerOption:not(.hidden)[item="3"]` ).length;
        if ( isThirdOption > 0 ) {
          const isChecked = $( `.customStickerOption:not(.hidden)[item="3"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
          if ( isChecked == false ) {
            isError = true;
            optionErr = true;
            $( `.customStickerOption:not(.hidden)[item="3"] .customStickerOption__error` ).removeClass( `hidden` );
          } else {
            const thirdVal = $( `.customStickerOption:not(.hidden)[item="3"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
            $( `.customStickerOption:not(.hidden)[item="3"] .customStickerOption__error` ).addClass( `hidden` );
            const thirdOptionName = $( `.customStickerOption:not(.hidden)[item="3"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
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

      if ( typeof enableOption5 !== 'undefined' && enableOption5 ) {
        let isError = false;
        const isFifthOption = $( `.customStickerOption[item="5"]` ).length;
        if ( isFifthOption > 0 ) {
          const isChecked = $( `.customStickerOption[item="5"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
          if ( isChecked == false ) {
            isError = true;
            optionErr = true;
            $( `.customStickerOption[item="5"] .customStickerOption__error` ).removeClass( `hidden` );
          } else {
            const thirdVal = $( `.customStickerOption[item="5"] .customStickerOption__option .customStickerOption__optionInput:checked` ).val();
            $( `.customStickerOption[item="5"] .customStickerOption__error` ).addClass( `hidden` );
            const fifthOptionName = $( `.customStickerOption[item="5"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
            properties[fifthOptionName] = thirdVal;
            // console.log ( 'thirdVal', thirdVal );
          }
        }
      }

      /* ===== NEW: Option 6 - Select Backing (Opaque + Translucent in one) ===== */
      if ( typeof enableOption6 !== 'undefined' && enableOption6 ) {
        let isError = false;
        const isSixthOption = $(`.customStickerOption[item="6"]`).length;
        if ( isSixthOption > 0 ) {
          const isChecked = $(`.customStickerOption[item="6"] .customStickerOption__option .customStickerOption__optionInput`).is(`:checked`);
          if ( isChecked == false ) {
            isError = true;
            optionErr = true;
            $(`.customStickerOption[item="6"] .customStickerOption__error`).removeClass(`hidden`);
          } else {
            const sixthVal = $(`.customStickerOption[item="6"] .customStickerOption__option .customStickerOption__optionInput:checked`).val();
            $(`.customStickerOption[item="6"] .customStickerOption__error`).addClass(`hidden`);
            const sixthOptionName = $(`.customStickerOption[item="6"] .customStickerOption__option .customStickerOption__optionInput:checked`).attr(`p-name`);
            properties[sixthOptionName] = sixthVal;
          }
        }
      }
      if ( optionErr ) {
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
      //       const firstOptionName = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
      //       properties[firstOptionName] = firstVal;
      //       // console.log ( 'firstVal', firstVal );
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
      //       const secondOptionName = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
      //       properties[secondOptionName] = secondVal;
      //       // console.log ( 'secondVal', secondVal );
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
      //       const thirdOptionName = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput:checked` ).attr( `p-name` );
      //       properties[thirdOptionName] = thirdVal;
      //       // console.log ( 'thirdVal', thirdVal );
      //     }
      //   }
      //   const isFourthOption = $( `.customStickerOption:not(.hidden)[item="4"]` ).length;
      //   if ( isFourthOption > 0 ) {
      //     const inputVal = $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__input` ).val();
      //     if ( typeof inputVal !== 'undefined' && inputVal ) {
      //       $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).addClass( `hidden` );
      //       const fourthOptionName = $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__input` ).attr( `p-name` );
      //       properties[fourthOptionName] = inputVal;
      //       // console.log ( 'inputVal', inputVal );
      //     } else {
      //       $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).removeClass( `hidden` );
      //       isError = true;
      //     }
      //   }
      //   if ( isError ) {
      //     return;
      //   }
      // }
      let proccessNext = false;
      if(_title.indexOf("Style") > -1 && properties['_Size'] != ""){
        proccessNext = true;
      }else if(_title.indexOf('x') > -1){
        proccessNext = true;
      }
      if(isDTFPage){
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
.on(`change`, `sizes-blocks .widthHeight__item__popular .popularSizes`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    const getVal = $( this ).val();
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
        console.log ( 'temp_variant', temp_variant );
        if ( typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
          temp_variant.forEach(el => {
            if ( typeof el.option2 !== 'undefined' && el.option2 ) {
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
              }
            } else {
              $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"][option-selected="popular"]` ).attr({
                "vid": el.id,
                "price": el.price
              });
            }
          });
        } else {
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
            }
          });
        }
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
      const getDimensions = extractDimensions( getVal );
      $( this ).attr( {"w": getDimensions.width, "h": getDimensions.height} );
      puffImgPreviewSize();
      $( `product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getVal }"]` ).click();
      
      const current3dPuffVariant = getCurrent3dPuffVariant( currentRow );
      if ( typeof current3dPuffVariant !== 'undefined' && current3dPuffVariant && current3dPuffVariant.id ) {
        applyCurrent3dPuffVariant( currentRow, current3dPuffVariant );
      }
      
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
.on(`change`, `#precutselected__`, function( e ) {
  try {
    e.stopImmediatePropagation();
    updatedPriceLogic();
  } catch ( err ) {
    console.log( `ERROR #precutselected__`, err.message );
  }
})
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

      const current3dPuffVariant = getCurrent3dPuffVariant( $( this ).closest( `.widthHeight__custom[item]` ) );
      if ( typeof current3dPuffVariant !== 'undefined' && current3dPuffVariant && current3dPuffVariant.id ) {
        applyCurrent3dPuffVariant( $( this ).closest( `.widthHeight__custom[item]` ), current3dPuffVariant );
      }
      
    }
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__dropdown .widthHeight__dropdown-content span`, err.message );
  }
})
;
// PUFF COLOR DROPDOWN END

// ANOTHER GANG SHEET FILE UPLOAD START
/* Validation gate: if the artwork-rights agreement checkbox is unchecked,
   block the file picker / drop and surface the existing
   "Please check the box above to continue" error instead. This applies
   to every entry point — direct click on the dropzone, drag-drop, AND the
   mobile sticky "Upload Another File" button (which clicks the dropzone).

   Originally this only checked for `.__validate_upload` (the wrapper class
   added on `upload:ready` when the checkbox is unchecked). But after
   `refreshAll_()` runs post-cart-commit it does
   `$(checkbox).prop('checked', false)` — which doesn't fire the change
   listener, so `.__validate_upload` never gets re-added. The user could
   then hit the dropzone between commits with an unchecked checkbox and
   bypass every existing gate.

   `__gateGangSheetUpload()` now ALSO inspects the rights checkbox
   directly. If it's unchecked, the function backfills the
   `.__validate_upload` wrapper around the add-to-cart button (so the
   existing inline error handler can render the message) and returns
   true — telling the caller to bail before opening the file picker. */
/* Expose to window so the dtf-upload-tabs.liquid capture-phase
   handler for `.anotherUploadGangSheet__choosePrev` can call the
   same gate. Defined immediately below as a function declaration. */
window.__gateGangSheetUpload = __gateGangSheetUpload;
function __gateGangSheetUpload() {
  /* The rights/agreement checkbox on gang-sheet PDPs is
     `#terms-buy_buttons` (`input[name="properties[_Terms Accepted]"]`)
     inside `.gangsheet_terms`. Fall back to common variants used by other
     product flows in case the selector ever drifts. */
  var rightsCheckbox = document.querySelector('.gangsheet_terms #terms-buy_buttons') ||
                       document.getElementById('terms-buy_buttons') ||
                       document.querySelector('input[name="properties[_Terms Accepted]"]') ||
                       document.querySelector('.product__cart-functions .cl-upload--input-field .cl-upload--input[type="checkbox"]') ||
                       document.querySelector('.cl-upload--input-field .cl-upload--input[type="checkbox"]') ||
                       document.querySelector('.cl-upload--input[type="checkbox"]');
  var rightsUnchecked = !!(rightsCheckbox && !rightsCheckbox.checked);
  /* Checkbox state is the single source of truth for whether to block.
     If the box is checked, clear any stale `.__validate_upload` wrapper
     left over from a previous failed gate check and let the action through.
     (The wrapper was previously used as a blocking signal, but no code
     removes it when the user later checks the box — so Add Another would
     stay broken after one failed attempt.) */
  if (!rightsUnchecked) {
    var stale = document.querySelector('.__validate_upload');
    if (stale) {
      var btn = stale.querySelector('.add-to-cart');
      if (btn && stale.parentElement) stale.parentElement.insertBefore(btn, stale);
      stale.remove();
    }
    return false;
  }
  /* Box is unchecked: ensure the wrapper exists so the inline error
     handler renders, click it to surface the message, and block. */
  var validateEl = document.querySelector('.__validate_upload');
  if (!validateEl) {
    var addToCartBtn = document.querySelector('.add-to-cart[data-main-product-add-to-cart]');
    if (addToCartBtn && addToCartBtn.parentElement && !addToCartBtn.parentElement.classList.contains('__validate_upload')) {
      var wrapper = document.createElement('div');
      wrapper.className = '__errorcase __validate_upload';
      addToCartBtn.parentElement.insertBefore(wrapper, addToCartBtn);
      wrapper.appendChild(addToCartBtn);
    }
    validateEl = document.querySelector('.__validate_upload');
  }
  if (validateEl && typeof validateEl.click === 'function') {
    validateEl.click();
  }
  return true;
}
$(document)
.on(`click`, `.anotherUploadGangSheet`, function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( __gateGangSheetUpload() ) return;
    $( `#anotherGangSheetFile` ).click();
  } catch ( err ) {
    console.log( `ERROR .anotherUploadGangSheet`, err.message );
  }
})
.on(`change`, `#anotherGangSheetFile`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    /* Defense-in-depth: if the validation gate is still active when the
       change fires (e.g. native file dialog was triggered by another path),
       clear the file input and surface the error. */
    if ( __gateGangSheetUpload() ) {
      document.getElementById('anotherGangSheetFile').value = null;
      return;
    }
    await gangSheetAddToCart();
    const file = e.target.files[0];
    uploadFile( file );
  } catch ( err ) {
    console.log( `ERROR #anotherGangSheetFile`, err.message );
  }
})
.on(`dragover`, `.anotherUploadGangSheet`, function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).addClass( `dragover` );
})
.on(`dragleave`, `.anotherUploadGangSheet`, function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).removeClass( `dragover` );
})
.on(`drop`, `.anotherUploadGangSheet`,async function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).removeClass( `dragover` );

  /* Defense-in-depth: block drop when agreement checkbox is unchecked. */
  if ( __gateGangSheetUpload() ) return;

  const file = e.originalEvent.dataTransfer.files[0];
  await gangSheetAddToCart();
  console.log ( 'files', file );
  uploadFile( file );
})
// ANOTHER GANG SHEET FILE UPLOAD END
;

// GANGSHEET ADD TO CART START

async function gangSheetAddToCart() {
  try {
    let vid = $( `product-form .form input[name="id"]` ).val();
    let qty = $( `customoptions-gangsheet.gangSheet [name="quantity"]` ).val();
    const isTermAndConditionChecked = $( `input[name="properties[_Terms Accepted]"]` ).is( `:checked` );
    const vecrotorFile = $( `input[name="properties[Upload (Vector Files Preferred)]"]` ).val();
    if (
      typeof vid !== 'undefined' && vid &&
      typeof qty !== 'undefined' && qty &&
      typeof isTermAndConditionChecked !== 'undefined' && isTermAndConditionChecked &&
      typeof vecrotorFile !== 'undefined' && vecrotorFile && vecrotorFile.indexOf( `https` ) > -1
    ) {
      vid = vid * 1;
      qty = qty * 1;
      const properties = {
        '_Terms Accepted': 'Yes',
        'Upload (Vector Files Preferred)': vecrotorFile
      };
      const items = [{
        id: vid,
        quantity: qty,
        properties
      }];
      $( `body` )
      .append( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
      let rtn;
      const getData = await fetch(window.Shopify.routes.root + 'cart/add.js', {
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
      refreshCart('notOpen');
      // RESET ALL FIELDS START
      $( `.toast` ).remove();
      $( `body` )
        .append( `
          <div class="toast green">
            <div class="toast-content">
              <svg class="fas fa-solid fa-check check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 22l-10-10.598 2.798-2.859 7.149 7.473 13.144-14.016 2.909 2.806z"/></svg>
              <div class="message">
                <span class="text text-2">Product Added to cart</span>
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
        $( `.toast` ).remove();
      }, 5000);

      $(`#fileremove`).click();

      $( `.loadingScreen__` ).remove();

      // RESET ALL FIELDS END
    }
  } catch ( err ) {
    console.log( `ERROR gangSheetAddToCart()`, err.message );
  }
}

// GANGSHEET ADD TO CART END


function puffImgPreviewSize() {
  try {
    if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
      let getWidth = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes_sticker` ).attr( `w` ) * 1;
      $( `.horizontal_direction span` ).html( `${ getWidth.toFixed( 2 ) }"` );
      $( `.verticle_direction span` ).html( `<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>` );
      $( `.horizontal_direction` ).attr( `x-is`, `${ getWidth.toFixed( 2 ) }` );
      $( `.verticle_direction` ).attr( `y-is`, `Proportional Height` );
    } else {
      const getWidth = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes_puff` ).attr( `w` );
      const getHeight = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes_puff` ).attr( `h` );

      if ( typeof getWidth !== 'undefined' && getWidth && typeof getHeight !== 'undefined' && getHeight ) {
        $(".horizontal_direction span").html( `${ getWidth }.00"` );
        $(".verticle_direction span").html(`<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>`);
        $( `.horizontal_direction` ).attr( `x-is`, getWidth );
        $( `.verticle_direction` ).attr( `y-is`, `Proportional Height` );
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
    isAIEdit = false;
    window.__aiEditOriginalUrl = '';
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

function isCurrent3dPuffTransfersProduct() {
  try {
    const currentPath = ( window.location.pathname || `` ).replace( /\/+$/, `` );
    return (
      (
        document.body.classList.contains( `template-product-puff-transfers` ) &&
        currentPath === `/products/3d-puff-transfers`
      ) ||
      (
        document.body.classList.contains( `template-product-puff-glitter` ) &&
        currentPath === `/products/3d-glitter-puff-transfers`
      )
    );
  } catch ( err ) {
    console.log( `ERROR isCurrent3dPuffTransfersProduct`, err.message );
    return false;
  }
}

function getCurrent3dPuffVariant( rowElement ) {
  try {
    if (
      isCurrent3dPuffTransfersProduct() === false ||
      typeof allVariants === 'undefined' || ! allVariants
    ) {
      return null;
    }

    const row = $( rowElement );
    if ( row.length === 0 || row.hasClass( `puffPage` ) === false ) {
      return null;
    }

    let selectedSize = row.find( `.popularSizes_puff option:selected` ).text().trim();
    if ( selectedSize == '' ) {
      selectedSize = row.find( `.popularSizes_puff` ).val() || '';
      if ( selectedSize ) {
        selectedSize = selectedSize.replaceAll( `^`, `"` ).trim();
      }
    }

    const selectedColor = ( row.find( `.widthHeight__dropdown` ).attr( `selected-color` ) || `` ).trim();
    if ( selectedSize == '' || selectedColor == '' ) {
      return null;
    }

    return findObjectByKey( allVariants, `title`, `${ selectedSize } / ${ selectedColor }` );
  } catch ( err ) {
    console.log( `ERROR getCurrent3dPuffVariant`, err.message );
    return null;
  }
}

function applyCurrent3dPuffVariant( rowElement, variant ) {
  try {
    if (
      isCurrent3dPuffTransfersProduct() === false ||
      typeof variant === 'undefined' || ! variant || ! variant.id
    ) {
      return;
    }

    const row = $( rowElement );
    if ( row.length === 0 || row.hasClass( `puffPage` ) === false ) {
      return;
    }
    let precutVariant = null;
    const siblingVariants = findObjectByKey( allVariants, `option1`, variant.option1, true );
    if ( typeof siblingVariants !== 'undefined' && siblingVariants && siblingVariants.length > 0 ) {
      precutVariant = findObjectByKey( siblingVariants, `option2`, `Yes - Pre cut` );
    }

    row.attr({
      "title": variant.title,
      "vid": variant.id,
      "price": variant.price,
      "precut-vid": ( typeof precutVariant !== 'undefined' && precutVariant && precutVariant.id ? precutVariant.id : row.attr( `precut-vid` ) || `` ),
      "precut-price": ( typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.price !== 'undefined' ? precutVariant.price : row.attr( `precut-price` ) || `` ),
      "option-selected": currentSelectedOption || row.attr( `option-selected` ) || `custom`
    });
  } catch ( err ) {
    console.log( `ERROR applyCurrent3dPuffVariant`, err.message );
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
          preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
        } else {
          preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
        }

        const makeTitle = `${ sizeVariantOptionText } / ${ preCutOptionText }`;
        // const getVID = $( `product-form [name="id"]` ).val() * 1;
        const selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );
        let currentVariant__;
        if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
          currentVariant__ = selectedVariant__;

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
    console.log ( 'manageQuantities function',  );
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
          preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
        } else {
          preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
        }
      }

      const makeTitle = `${ sizeVariantOptionText }${ preCutOptionText != '' ? ` / ${ preCutOptionText }` : '' }`;
      // const getVID = $( `product-form [name="id"]` ).val() * 1;
      let selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );
      const current3dPuffVariant = getCurrent3dPuffVariant( $( `.widthHeight__custom[item="${ selectedItemNo }"]` ) );
      if ( typeof current3dPuffVariant !== 'undefined' && current3dPuffVariant && current3dPuffVariant.id ) {
        selectedVariant__ = current3dPuffVariant;
      }
      if ( typeof isFloorProduct !== 'undefined' && isFloorProduct ) {
        let getUpdatedWidth = $( `.widthHeight__custom[item=${ selectedItemNo }] .widthHeight__value[name="width__value"]` ).val();
        getUpdatedWidth = parseFloat(getUpdatedWidth);
        let getUpdatedHeight = $( `.widthHeight__custom[item=${ selectedItemNo }] .widthHeight__value[name="height__value"]` ).val();
        getUpdatedHeight = parseFloat(getUpdatedHeight);
        const totalSqInches = Math.ceil( getUpdatedWidth * getUpdatedHeight );

        if (Number.isFinite(totalSqInches)) {
          console.log ( 'totalSqInches', totalSqInches );
          console.log ( 'getUpdatedWidth', getUpdatedWidth );
          console.log ( 'getUpdatedHeight', getUpdatedHeight );

          const currentSelectedVariant = getMatchingVariantBySqInches( allVariants, totalSqInches );
          console.log ( 'currentSelectedVariant', currentSelectedVariant );
          if ( typeof currentSelectedVariant !== 'undefined' && currentSelectedVariant ) {
            selectedVariant__ = currentSelectedVariant;
          }
        }
      }
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
    } else if ( isSizesBlock > 0 && currentSelectedOption == 'popular' && typeof isSpangleProduct !== 'undefined' && isSpangleProduct ) {
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
          $( `pre-cut` ).text( `($${ preCutPrice } each)` );
          preCutPrice = preCutPrice * 1;
          getDiscountedPricenly_ = getDiscountedPricenly * 1;

          let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
          // together = together * 1;

          unitPrice = unitPrice.replace( getDiscountedPricenly, together );
        } else {
          $( `pre-cut` ).text( `` );
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
          $( `pre-cut` ).text( `($${ preCutPrice } each)` );
          preCutPrice = preCutPrice * 1;
          getDiscountedPricenly_ = getDiscountedPricenly * 1;

          let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
          // together = together * 1;

          unitPrice = unitPrice.replace( getDiscountedPricenly, together );
        } else {
          $( `pre-cut` ).text( `` );
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
              $( `pre-cut` ).text( `($${ preCutPrice } each)` );
              preCutPrice = preCutPrice * 1;
              getDiscountedPricenly_ = getDiscountedPricenly * 1;

              let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
              // together = together * 1;

              unitPrice = unitPrice.replace( getDiscountedPricenly, together );
            } else {
              $( `pre-cut` ).text( `` );
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
              $( `pre-cut` ).text( `($${ preCutPrice } each)` );
              preCutPrice = preCutPrice * 1;
              getDiscountedPricenly_ = getDiscountedPricenly * 1;

              let together = (getDiscountedPricenly_ + preCutPrice).toFixed(2);
              // together = together * 1;

              unitPrice = unitPrice.replace( getDiscountedPricenly, together );
            } else {
              $( `pre-cut` ).text( `` );
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

      if ( typeof isLastMinumum === 'undefined' ) {
        isLastMinumum = $( `.customTabelPlace__itemsWrap .customTabelPlace__item` ).last().attr( `min` ) * 1;
      }

      if ( typeof isFloorProduct !== 'undefined' && isFloorProduct ) {
        isLastMinumum = $( `.customTabelPlace__itemsWrap .customTabelPlace__item` ).last().attr( `min` ) * 1;
      }

      if ( typeof newCartMsgs === 'undefined' ) {
        newCartMsgs = {
          "maxDiscount": '',
          "emptyCart": ''
        }
      }

      if ( typeof selectedCartItem !== 'undefined' && selectedCartItem && newQty < ( isLastMinumum + 1 ) ) {
        if ( typeof newCartMsgs !== 'undefined' && newCartMsgs.itemsAvailableInCart.includes ( '[QTY]' ) ) {
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
    if(typeof GetGangSheetPrice == "function"){
      GetGangSheetPrice();
    }
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
    if ( precutOptionAvailable ) {
      isPreCutActive = $( `#precutselected__` ).is( `:checked` );
    }
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
            <input type="hidden" name="properties[width]" value="${ getWidth }">
            <input type="hidden" name="properties[height]" value="${ getHeight }">
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
  /*  setTimeout(() => {
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
    }, 100); */
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
          const isZeroItem = $( `sizes-blocks .widthHeight__custom[item="0"]` ).length;
          if ( isZeroItem > 0 ) {
            $( `sizes-blocks .widthHeight__custom[item]` ).each(function( i ) {
              const j = i + 1;
              $( this ).attr( 'item', j );
            })
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
.on(`click`, `.uploadError__continue`, function( e ) {
  try {
    e.stopImmediatePropagation();
    // $( `#fileremove` ).click();
    // $( this ).closest( `.uploadError` ).addClass( `hidden` );
    // $( `#fileupload_custom, .sidebar-widget.sidebar-widget--none, .product__cart-functions` ).removeClass( `hidden` );
    // fileInput.value = '';
    // stopProcessing = false;
  } catch ( err ) {
    console.log( `ERROR .uploadError__continue`, err.message );
  }
})
;

function calculateDPILineItem(type = "custom") {
  // console.log ( 'type', type );
  var grt_min_dpi = grt_dpi_warning || 72
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
        makeSqInchesForCustom = (uploadedFileWidth * uploadedFileHeight) / grt_min_dpi;
        currentSqInches = ( physicalWidthInInches * physicalHeightInInches ) * grt_min_dpi;
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
        const recommendedSqInches = ((uploadedFileWidth / grt_min_dpi) * (uploadedFileHeight / grt_min_dpi));
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

function convertInchesToNewDPI(inches, fromDPI, toDPI) {
  const pixels = inches * fromDPI;
  const newInches = pixels / toDPI;
  return parseFloat(newInches.toFixed(2));
}

function convertPixelsToInches(pixels, dpi) {
  const inches = pixels / dpi;
  return parseFloat(inches.toFixed(2));
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

  console.log ( 'file_url', file_url );

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

    if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
      if ( fileExt == 'jpg' || fileExt === 'jpeg' ) {
        if ( file_url.includes( `?` ) ) {
          let file_url__ = file_url.split( `?` )[0];
          const isUpScale = $( `#option_checkbox_upscale` ).is( `:checked` );
          file_url = `${ file_url__ }?trim=colorUnlessAlpha${ isUpScale ? `&upscale=true`:`` }`;
        }
      }
    }

    if(isGangPage == true){
      console.clear();
      if ( fileExt == 'ai' || fileExt == 'eps' || fileExt == 'pdf' ) {
        gangsheetPNG = true;
        let getApiResponse;
        if ( fileExt == 'ai' || fileExt == 'eps' ) {
          file_url = `${ file_url }?trim=colorUnlessAlpha`;
        } else if ( fileExt == 'pdf' ) {
          file_url = `${ file_url }?fm=png`;
        }
        getApiResponse  =   await sendApiRequest( `${ file_url }`, s3Key );
        // getApiResponse = { success: false, error: "Could not download file" };

        if ( typeof getApiResponse !== 'undefined' && getApiResponse && typeof getApiResponse.success !== 'undefined' && getApiResponse.success ) {
          console.log ( 'getApiResponse', getApiResponse );
          if ( fileExt == 'png' ) {
            file_width = convertInchesToNewDPI(getApiResponse.data.dimensions.width, 72, 300);
            file_height = convertInchesToNewDPI(getApiResponse.data.dimensions.height, 72, 300);

            console.log ( 'file_width', file_width );
            console.log ( 'file_height', file_height );
          } else {
            file_width = getApiResponse.data.dimensions.width;
            file_height = getApiResponse.data.dimensions.height;
            gangSheetUploadError =  false;
          }
          selectVariantForGangPages( file_url, fileExt, file_width, file_height );
        }
      } else {
        console.log ( 'file_url chaaaaaaaaaaaa png', file_url );
        if(file_url.indexOf("ordertype=")){
          var nwimage = file_url.split("&ordertype=")[0];
          console.log(nwimage," :nwimage");
          file_url = nwimage;
        }

        // usage
        gangSheetImgURL = file_url.replace(ninjaS3Host2,ninjaImgixHost);

        console.log ( 'gangSheetImgURL', gangSheetImgURL );

        const gansheetImgMeta = await getImageMetaData( `${ gangSheetImgURL }?fm=png&q=1&h=2000` );

        console.log ( 'gansheetImgMeta', gansheetImgMeta );

        if ( typeof gansheetImgMeta !== 'undefined' && gansheetImgMeta ) {
          console.log("✅ Image Meta:", gansheetImgMeta);
          const tempWidth = gansheetImgMeta.width;
          const tempHeight = gansheetImgMeta.height;

          const actualWidth = await getImageMetaData( `${ gangSheetImgURL }?max-h=10&fm=png&fit=crop&q=1` );
          let actualHeight = 0;

          console.log ( 'actualWidth', actualWidth );

          if ( typeof actualWidth !== 'undefined' && actualWidth ) {
            actualHeight = (tempHeight * actualWidth.width) / tempWidth;
            actualHeight = Math.round(actualHeight);
          }


          file_width = convertPixelsToInches(actualWidth.width, 300);
          file_height = convertPixelsToInches(actualHeight, 300);

          console.log ( 'file_width', file_width, `file_height`, file_height );
          await selectVariantForGangPages( file_url, fileExt, file_width, file_height );
          if ( stopProcessing ) {
            return;
          }
          $(".easyzoom").removeClass("image-loading");
          if (isGangPage){
            $(`.step__2` ).removeClass( `hidden` );
          }
        }
      }
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
            $(".edit-with-ai").removeClass("_lift");
            $("#super_resolution").prop("disabled",false);
            /* Suppress the >1MP Upscale hide on puff / spangle / sticker /
               magnet / keychain templates: their toggle row uses a single
               flex parent whose layout collapses when one .style3 child gets
               inline display:none, taking Remove Background and Edit with AI
               down with it. The Upscale toggle is irrelevant for these
               product types anyway (no upscaling path on AOP-style prints). */
            if ( getTotalPixels > 1000000 && isFileUpload && !_ntKeepProductGalleryOnUpload() ) {
              $( `.fileupload_bg_options .style3` ).last().hide();
              $(".edit-with-ai").addClass("_lift");
              $("#super_resolution").prop("disabled",true);
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
async function waitForImage(selector) {
  const img = document.querySelector(selector);

  if (!img) {
    throw new Error(`Image not found: ${selector}`);
  }

  // Already loaded (cached)
  if (img.complete && img.naturalWidth !== 0) {
    return {
      width: img.naturalWidth,
      height: img.naturalHeight
    };
  }

  return new Promise((resolve, reject) => {
    img.addEventListener(
      'load',
      () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      },
      { once: true }
    );

    img.addEventListener(
      'error',
      () => reject(new Error('Image failed to load')),
      { once: true }
    );
  });
}


function executeNextStep__helper(firstOne='', secondOne='', defaultloader, file_url, forcesave, file_crc ) {
  try {
     if(typeof getfileExt == "undefined")
       getfileExt = file_url.split('.').pop().split("?")[0];
    const isSizesBlock = $( `sizes-blocks` ).length;
    if ( firstOne == 'Y' ) {
      console.log ( 'chaaa3',  );
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
          if (typeof window.refreshGRTUpsellBlocks === 'function') window.refreshGRTUpsellBlocks();
          if(defaultloader == true)
            // $(".easyzoom").removeClass("image-loading");
            clearInterval(interVal);
        }
      },300);
      setTimeout(() => {
        if ( isGangPage == false ) {
          $(".easyzoom").removeClass("image-loading");
        }
        clearInterval(interVal);
      }, 5000);
      
$( `form input[name="properties[Upload (Vector Files Preferred)]` ).val( file_url );
      //   setTimeout(()=>{
      const fileVal = $( `input[name="properties[Upload (Vector Files Preferred)]"]` ).length;

      // _cartImg drives the thumbnail in the cart page + cart drawer (see
      // cart-page-item.liquid / cart-item.liquid; both read `_cartImg` and
      // fall back to the variant image). For raster uploads we want the
      // processed file_url (matches what the customer just saw on the PDP).
      // For vector uploads (ai/eps/pdf/psd) the originalUploadedFileURL is the
      // S3 source — we tack on imgix params so the cart renders a small PNG
      // preview instead of the unrenderable vector binary.
      var _cartImgValue = (getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' || originalUploadedFileURL.indexOf(".psd") > -1)
        ? (originalUploadedFileURL.indexOf('?') > -1 ? originalUploadedFileURL : originalUploadedFileURL + '?fm=png&trim=colorUnlessAlpha&h=100')
        : file_url;

      if ( fileVal > 0 ) {
        if ( isGangPage ) {
          $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( `${ ( file_url.includes( `?` ) ? file_url.split( `?` )[0] : file_url ) }` );
        } else {
          if (window.__aiEditOriginalUrl && window.__aiEditOriginalUrl !== '') {
            // file_url is the edited S3 image
            $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` )
              .val( file_url );
          }
          else if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || originalUploadedFileURL.indexOf(".psd") > -1) {
            $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( originalUploadedFileURL );
          } else {
            $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( file_url );
          }
          if(isGangPage == false)
            $( `product-form.product-form form input[name="properties[_Original Image]` ).val( ( typeof originalUploadedFileURL !== 'undefined' && originalUploadedFileURL ? originalUploadedFileURL : file_url.split("?")[0] ) );
        }
        // Ensure _cartImg exists; create it if missing, otherwise update.
        var $cartImgField = $( `product-form.product-form form input[name="properties[_cartImg]"]` );
        if ( $cartImgField.length ) {
          $cartImgField.val( _cartImgValue );
        } else {
          $( `product-form.product-form form` ).append( `<input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />` );
        }
      } else {
        if(isGangPage == true) {
          $( `product-form.product-form form` ).append( `<input type="hidden" value="${ `${ ( file_url.includes( `?` ) ? file_url.split( `?` )[0] : file_url ) }` }" name="properties[Upload (Vector Files Preferred)]"  />` );
          $( `product-form.product-form form` ).append( `<input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />` );
        } else {
          if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' || originalUploadedFileURL.indexOf(".psd") > -1 ) {
            $( `product-form.product-form form` )
              .append( `
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[Upload (Vector Files Preferred)]" />
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[_Original Image]" />
                <input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />
              ` );
              if(designtype == 1 && _ntIsValidOrderRef(ordername)){
                $( `product-form.product-form form` ).append( `
                <input type="hidden" value="previously on order # ${ ordername}" name="properties[design re-used]" />
              ` );
              }
          } else {
            $( `product-form.product-form form` )
              .append( `
                <input type="hidden" value="${ file_url }" name="properties[Upload (Vector Files Preferred)]" />
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[_Original Image]" />
                <input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />
              ` );
              if(designtype == 1 && _ntIsValidOrderRef(ordername)){
                $( `product-form.product-form form` ).append( `
                <input type="hidden" value="previously on order # ${ ordername}" name="properties[design re-used]" />
              ` );
              }
          }
        }
      }
      // }, 500);
    }

    if ( secondOne == 'Y' ) {
      //  document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/loader-2.gif?v=1723724647");
      // $(".widthHeight__item__action").removeClass("disabled");
    
    
      
      setTimeout(function(){
        console.log ( 'file_url -- executeNextStep__helper', file_url );
        if ( isGangPage == true ) {
          let newFileURL_small = file_url.replace( ninjaS3Host2, ninjaS3Host );
          let newFileURL_large = file_url.replace( ninjaS3Host2, ninjaS3Host );
          if ( file_url.includes( `?` ) ) {
            newFileURL_small = newFileURL_small.split( `?` )[0];
            newFileURL_large = newFileURL_large.split( `?` )[0];
          }
          if ( fileExt == 'ai' || fileExt == 'eps' || fileExt == 'pdf' ) {
            newFileURL_small = `${ newFileURL_small }?fm=png&h=1000&q=50`;
            newFileURL_large = `${ newFileURL_large }?fm=png&h=1500&q=50`;
          } else if ( fileExt == 'png' ) {
            newFileURL_small = `${ newFileURL_small }?h=1000&q=50`;
            newFileURL_large = `${ newFileURL_large }?h=1500&q=50`;
          }

          document.querySelector("#fileupload_hero").setAttribute('src', newFileURL_small);
          $(".viewer-box img").attr('src', `${ newFileURL_large }`);
          /*
          if ( file_url.includes( `?` ) ) {
            file_url = `${ file_url.replace(ninjaS3Host2,ninjaS3Host) }&h=1000&auto=compress&q=50${ fileExt == 'ai' || fileExt == 'eps' ? `&fm=png` : `` }`;
          } else {
            file_url = `${ file_url.replace(ninjaS3Host2,ninjaS3Host) }?h=1000&auto=compress&q=50${ fileExt == 'ai' || fileExt == 'eps' ? `&fm=png` : `` }`;
          }
          document.querySelector("#fileupload_hero").setAttribute('src', file_url);
          */
        } else if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
          let newFileURL_small = file_url;
          let newFileURL_large = file_url;
          if ( newFileURL_small.includes( `?` ) ) {
            newFileURL_small = newFileURL_small.split( `?` )[0];
            newFileURL_large = newFileURL_large.split( `?` )[0];
          }
          if ( getfileExt == 'ai' || getfileExt == 'eps' || fileExt == 'pdf' ) {
            newFileURL_small = `${ newFileURL_small }?fm=png&trim=colorUnlessAlpha&w=800`;
            newFileURL_large = `${ newFileURL_large }?fm=png&trim=colorUnlessAlpha&w=2000`;
          } else if ( getfileExt == 'png' ) {
            newFileURL_small = `${ newFileURL_small }?trim=colorUnlessAlpha`;
            newFileURL_large = `${ newFileURL_large }?trim=colorUnlessAlpha`;
          } else if ( getfileExt == 'svg' ) {
            newFileURL_small = `${ newFileURL_small }?trim=colorUnlessAlpha&fm=png&w=800`;
            newFileURL_large = `${ newFileURL_large }?trim=colorUnlessAlpha&fm=png&w=2000`;
          } else if ( getfileExt == 'tif' || getfileExt == 'tiff' ) {
            newFileURL_small = `${ newFileURL_small }?trim=colorUnlessAlpha&fm=png&w=800`;
            newFileURL_large = `${ newFileURL_large }?trim=colorUnlessAlpha&fm=png&w=2000`;
          } else if ( getfileExt == 'jpg' || getfileExt == 'jpeg' ) {
            newFileURL_small = `${ newFileURL_small }?trim=colorUnlessAlpha`;
            newFileURL_large = `${ newFileURL_large }?trim=colorUnlessAlpha`;
          }
          const isUpScale = $( `#option_checkbox_upscale` ).is( `:checked` );
          if ( typeof isUpScale !== 'undefined' && isUpScale ) {
            newFileURL_small = `${ newFileURL_small }&upscale=true`;
            newFileURL_large = `${ newFileURL_large }&upscale=true`;
          }
          document.querySelector("#fileupload_hero").setAttribute('src', `${ newFileURL_small }`);
          $( `.viewer-box img` ).attr('src', `${ newFileURL_large }`);
          // if ( file_url.includes( `?` ) ) {
          //   if ( getfileExt == 'ai' || getfileExt == 'eps' ) {
          //     document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png&w=800`);
          //     $(".viewer-box img").attr('src', `${ file_url }&fm=png&trim=color&w=2000`);
          //   } else if ( getfileExt == 'pdf') {
          //     document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png&w=800`);
          //     $(".viewer-box img").attr('src', `${ file_url }&fm=png&trim=color&w=2000`);
          //   } else if ( fileExt == 'jpg' || fileExt === 'jpeg' ) {
          //     document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
          //     $(".viewer-box img").attr('src', `${ file_url }`);
          //   } else if ( fileExt == 'png' ) {
          //     document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
          //     $(".viewer-box img").attr('src', `${ file_url }`);
          //   }
          // } else {
          //   if ( getfileExt == 'ai' || getfileExt == 'eps' ) {
          //     document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }?fm=png&w=800`);
          //     $(".viewer-box img").attr('src', `${ file_url }?fm=png&trim=color&w=2000`);
          //   } else if ( fileExt == 'jpg' || fileExt === 'jpeg' ) {
          //     document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
          //     $(".viewer-box img").attr('src', `${ file_url }`);
          //   } else if ( fileExt == 'png' ) {
          //     document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
          //     $(".viewer-box img").attr('src', `${ file_url }`);
          //   }
          // }
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
              if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
                if ( fileExt == 'jpg' || fileExt === 'jpeg' ) {
                  document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
                  $(".viewer-box img").attr('src', `${ file_url }`);
                } else {
                  document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
                  $(".viewer-box img").attr('src', `${ file_url }`);
                }
                console.log ( 'fileExt', fileExt );
                console.log ( 'file_url', file_url );
              } else {
                document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png`);
                $(".viewer-box img").attr('src', `${ file_url }&fm=png`);
              }
            }
          } else {
            if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' ) {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }?fm=png&w=800`);
              $(".viewer-box img").attr('src', `${ file_url }?fm=png&trim=color&w=2000`);
            } else {
              if ( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
                if ( fileExt == 'jpg' || fileExt === 'jpeg' ) {
                  document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
                  $(".viewer-box img").attr('src', `${ file_url }`);
                } else {
                  document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }`);
                  $(".viewer-box img").attr('src', `${ file_url }`);
                }
              } else {
                document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }?fm=png`);
                $(".viewer-box img").attr('src', `${ file_url }?fm=png`);
              }
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
        // uploadedImage = uploadedImage + "&trim=colorUnlessAlpha"
      }else{
       //  uploadedImage = uploadedImage + "?trim=colorUnlessAlpha"
      }
    if(uploadedImage.indexOf(ninjaS3Host2) > -1){
        uploadedImage = $('[name="properties[Upload (Vector Files Preferred)]"]').val().replace(ninjaS3Host2,ninjaS3Host)+"?bg-remove=true&fm=png";
      }
      
      $(".watermark_image").css({"opacity":1});
      $(".dtf_body_image  .watermark_image img").attr("src",uploadedImage);
      if($('[href="#custom_size"]').hasClass("active")  == true && !_ntKeepProductGalleryOnUpload() ){
        $(".product-gallery").hide();
        $(".dtf_imgix_images").show();
      }
      calculateratioForImage();
    }else{
      if($('[href="#custom_size"]').hasClass("active") == true && !_ntKeepProductGalleryOnUpload() ){
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

async function selectVariantForGangPages( file, fileExt, file_width, file_height ) {
  try {
    if ( typeof gangSheetUploadError !== 'undefined' && gangSheetUploadError ) {
    } else {
      dimensionsClassesApply(file_width, file_height);
      console.log ( 'file_width', file_width );
      console.log ( 'file_height', file_height );
      let getDivision = file_width / 22;

      if ( fileExt == 'png' || ( typeof file !== 'undefined' && file && ( fileExt == 'ai' || fileExt == 'eps' || fileExt == 'pdf' ) ) ) {
        autoDetectedHeight = customRound( file_height );
      } else {
        autoDetectedHeight = customRound( file_height / getDivision );
      }
      if ( file_width < 21.5 || file_width > 22.5 ) {
        $( `.step__2 .terms_blocker` ).addClass( `disabledCheckout` );
        $( `.uploadError` ).removeClass( `hidden` );
        $( `#fileupload_custom, .sidebar-widget.sidebar-widget--none, .product__cart-functions` ).addClass( `hidden` );
        stopProcessing = true;
        return;
      } else {
        $( `.step__2 .terms_blocker` ).removeClass( `disabledCheckout` );
        $( `.uploadError` ).addClass( `hidden` );
        $( `#fileupload_custom, .sidebar-widget.sidebar-widget--none, .product__cart-functions` ).removeClass( `hidden` );
      }

      console.log ( 'autoDetectedHeight', autoDetectedHeight );
      let selectedVariantGangSheet = false;
      let selectedValue = '';
      $( `product-variants .product-variant[op="1"] .product-variant__container .product-variant__item` ).each(function() {
        let getHeight = $( this ).find( `.product-variant__input` ).attr( `data-height` ) * 1;
        if ( $( this ).find( `.product-variant__input[size-in-inches]` ).length > 0 ) {
          getHeight = $( this ).find( `.product-variant__input` ).attr( `size-in-inches` ) * 1;
          let addBuffer = 1;
          if ( getHeight < 12 ) {
            addBuffer = 1;
          } else if ( getHeight < 24 ) {
            addBuffer = 1.5;
          } else if ( getHeight < 60 ) {
            addBuffer = 2.5;
          } else if ( getHeight < 120 ) {
            addBuffer = 5;
          } else {
            addBuffer = 5;
          }
          getHeight = getHeight + addBuffer;
        }
        const getRounded = customRound( getDivision * getHeight );
        const getVal = $( this ).find( `.product-variant__input` ).val();
        console.log ( 'getDivision', getDivision );
          console.log ( 'getHeight', getHeight );
          console.log ( 'getRounded', getRounded );
        if ( autoDetectedHeight <= getHeight ) {
          console.log ( 'getDivision', getDivision );
          console.log ( 'getHeight', getHeight );
          console.log ( 'getRounded', getRounded );
          console.log ( 'selected size is ', getVal );
          selectedVariantGangSheet = $( `product-variants .product-variant__container .product-variant__item .product-variant__input[value="${ getVal }"]` );
          selectedValue = getVal;
          return false;
        }
      })

      $( `product-variants .product-variant__container .product-variant__item` ).removeClass( `disabledAll` );
      console.log ( 'selectedVariantGangSheet', selectedVariantGangSheet );
      if ( typeof selectedVariantGangSheet !== 'undefined' && selectedVariantGangSheet ) {
        const dropDown = $( `customoptions-gangsheet .gangSheet__item.selectedTier .gangSheet__dropdown` );
        if ( dropDown.length > 0 ) {
          // dropDown.find( `.gangSheet__dropbtn span` ).text( selectedValue );
          // dropDown.find( `.gangSheet__dropdown-content span` ).removeClass( `selected` );
          dropDown.find( `.gangSheet__dropdown-content span[val="${ selectedValue }"]` ).click();
          $( `customoptions-gangsheet .gangSheet__item.selectedTier` ).addClass( `autoSizeSelected` );
          console.log ( 'selectedValue', selectedValue );
        } else {
          selectedVariantGangSheet.click();
        }
      }
      setTimeout(() => {
        $( `product-variants .product-variant[op="1"] .product-variant__container .product-variant__item` ).addClass( `disabledAll` );
        selectedVariantGangSheet.closest( `.product-variant__item` ).removeClass( `disabledAll` );
        $( `.product-variant[op="1"] .product-variant__name` ).text( `Detected Size Selected` );
        if ( typeof file_width !== 'undefined' && file_width ) {
          $( `.horizontal_direction span` ).text( `${ file_width }"` );
          $( `.autoSizeSelected .gangSheet__item_widthWrapper[by="width"] > span` ).text( `${ file_width }"` );
        } else {
          $( `.horizontal_direction span` ).text( `22"` );
          $( `.autoSizeSelected .gangSheet__item_widthWrapper[by="width"] > span` ).text( `22"` );
        }
        $( `.verticle_direction span` ).text(`${ autoDetectedHeight }"`);
      }, 300);
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}
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
// async function waitForImageLoadById(id) {
//   const img = document.getElementById(id);

//   if (!img) {
//     throw new Error(`No image found with id ${id}`);
//   }

//   const ignoredSrc = '//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png';

//   // Skip waiting if src is the transparent placeholder
//   if (img.src.includes( ignoredSrc ) ) {
//     console.log('Image is transparent placeholder – skipping load check.');
//     return null;
//   }

//   // Check if image is already loaded
//   if (img.complete && img.naturalWidth !== 0) {
//     return img;
//   }

//   return new Promise((resolve, reject) => {
//     img.onload = () => resolve(img);
//     img.onerror = () => reject(new Error('Image failed to load'));
//   });
// }



function customRound(num) {
  const decimalPart = num - Math.floor(num);
  if (decimalPart <= 0.09) {
    return Math.floor(num);
  } else {
    return Math.ceil(num);
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

  /* Full hard reload after a USER-confirmed trash click. The previous
     JS state-reset (remove .image-uploaded + click Upload tab) wasn't
     enough — the user wants the page to look exactly like a fresh
     visit so nothing carries over (Previous Designs picker selection,
     mobile "Your Image / Size Guide" tabs, AI toolbar state, etc.).
     `e.isTrusted` distinguishes real user clicks (true) from the
     programmatic `$("#fileremove").click()` calls used internally
     (false) — those internal flows must NOT trigger a reload, or
     mid-upload retries / gang-sheet replace / resetLoading paths
     would break. */
  if (e.isTrusted) {
    setTimeout(function () {
      window.location.reload();
    }, 50);
  }
});
function removeFile(e = "") {
  isFileUpload = false;
  isReadyToPress = false;
  $(".product-gallery").show();
  $(".dtf_imgix_images").hide();
  $( `.generative-ai-area` ).removeClass( `hidden` ).show();
  $( `product-variants .product-variant .product-variant__container .product-variant__item` ).removeClass( `disabledAll` );
  $( `.qty-selector.product__quantity` ).val( $( `.qty-selector.product__quantity` ).attr( `min` ) );
  $( `customoptions-gangsheet .gangSheet__item.selectedTier` ).removeClass( `autoSizeSelected` );

  $(".watermark_image").css({"opacity":0});
  fileInput.value = '';
  $(".custom_tab_container").removeClass("is_disabled");
  $(".widthHeight__item__action").removeClass("disabled");
  $(".easyzoom").removeClass("image-loading");
  if (isGangPage){
    $(`.step__2` ).removeClass( `hidden` );
    $(`input[name="properties[_Terms Accepted]"]`).prop(`checked`, false);
  }
  $(".upload_image_info").addClass("hidden");
  counter = 0;
  $( `[name="properties[Upload (Vector Files Preferred)]"]` ).val( '' );
  $( `[name="properties[_Original Image]"]` ).val( '' );
  /* event detail contains the file reference */
  // let file = e.detail;
  $( `.goToNextStep` )
    .addClass( `hidden` );

  console.log ( 'chaaa4',  );
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
 // previewImage.style.display = 'none';

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

  /* Full page reset after trash — match the visible state to what the
     user sees on first page load:
       1. Drop body.image-uploaded so the mobile "Your Image / Size Guide"
          tab bar disappears (the .nt-mptabs rule keys off that class).
       2. Reset the dtfut tab strip back to the Upload panel — if the
          user picked a design from "Previous Designs" before hitting
          trash, the dtfut root is still parked on the recent panel and
          would re-render the picker behind the upload card.
     Guarded so this only fires on the tab templates that actually ship
     the dtfut UI; legacy PDPs keep the old behaviour. */
  document.body.classList.remove('image-uploaded');
  try {
    var dtfutRoot = document.querySelector('.dtfut[data-dtfut]') ||
                    document.querySelector('.dtfut');
    if (dtfutRoot) {
      var uploadTabBtn = dtfutRoot.querySelector('[data-dtfut-tab="upload"]');
      if (uploadTabBtn) uploadTabBtn.click();
    }
  } catch (_resetErr) { /* swallow — non-tab templates */ }

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

    /* Puff / Spangle: refuse the drop if color isn't picked yet. The
       drop overlay otherwise keeps spinning forever because uploadFile
       triggers the secondary preview pipeline before any of the
       downstream guards (`change #secondFile` / cart-add) can stop it.
       Clean up the dragover state so the page doesn't stay covered by
       the file-upload overlay. */
    if ( !_ntPuffSpangleColorGate() ) {
      try { secondryDropZone.classList.remove( `active` ); } catch ( _e ) {}
      try {
        document.querySelector(".file-upload-overlay-2").classList.remove("active");
        document.querySelector("body").classList.remove("file-upload-overlay-2-active");
      } catch ( _e ) {}
      return;
    }

      let optionErr = false;
  if ( typeof enableOption1 !== 'undefined' && enableOption1 ) {
    let isError = false;
    const isFirstOption = $( `.customStickerOption:not(.hidden)[item="1"]` ).length;
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
    const isSecondOption = $( `.customStickerOption:not(.hidden)[item="2"]` ).length;
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
    const isThirdOption = $( `.customStickerOption:not(.hidden)[item="3"]` ).length;
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
  //alert("optionErr=>"+optionErr)
  if ( optionErr ) { 
    secondryDropZone.classList.remove( `active` );
    document.querySelector(".file-upload-overlay-2").classList.remove("active");
    document.querySelector("body").classList.remove("file-upload-overlay-2-active");
    return;
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
    const isFirstOption = $( `.customStickerOption:not(.hidden)[item="1"]` ).length;
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
    const isSecondOption = $( `.customStickerOption:not(.hidden)[item="2"]` ).length;
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
    const isThirdOption = $( `.customStickerOption:not(.hidden)[item="3"]` ).length;
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
.on(`click`, `.disabledCheckout`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const modalDialogHTML = `
      <div class="dialogModal">
        <div class="dialogModal__overlay"></div>
        <div class="dialogModal__content">
          The uploaded file isn't 22" wide. Please <a href="?">upload a new file</a> that meets the size requirements.
        </div>
      </div>
    `;
    $( `body` )
      .append( modalDialogHTML );
  } catch ( err ) {
    console.log( `ERROR .disabledCheckout`, err.message );
  }
})
.on(`click`, `.dialogModal__overlay`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this ).closest( `.dialogModal` ).remove();
  } catch ( err ) {
    console.log( `ERROR .dialogModal__overlay`, err.message );
  }
})
;

async function getImageMetaData(url) {
  return new Promise((resolve, reject) => {
    // Create hidden <img>
    const $img = $("<img>", {
      src: url,
      class: "forMetaData",
      css: {
        position: "absolute",
        opacity: 0,
        pointerEvents: "none",
        width: "1px",
        height: "1px",
        zIndex: -1
      },
      crossOrigin: "anonymous"
    });

    // Append to body so it starts loading
    $("body").append($img);

    // On load
    $img.on("load", function () {
      const meta = {
        width: this.naturalWidth,
        height: this.naturalHeight,
        src: url
      };
      // $img.remove(); // cleanup
      resolve(meta);
    });

    // On error
    $img.on("error", function () {
      $img.remove();
      reject(new Error("❌ Failed to load image or cross-origin issue"));
    });
  });
}

async function getImageDimensionsFromURL(imageURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = function () {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      resolve({ width, height });
    };

    img.onerror = function () {
      reject(new Error('Image could not be loaded.'));
    };

    // If image is from another domain, prevent CORS issues (optional)
    img.crossOrigin = "anonymous";
    img.src = imageURL;
  });
}
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
  // Skip when click is on the "Choose a previously uploaded design" link or
  // any other anchor inside the drop-zone — those have their own jQuery
  // delegated handlers, and jQuery's stopImmediatePropagation can't stop
  // this native addEventListener on the parent. Without this guard, the
  // native file picker opens at the same time as the picker modal.
  if (event.target.closest('a, .purchase_from_previous, .access_old_data')) {
    return;
  }
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

  $(`input[name="properties[_Terms Accepted]"]`).prop(`checked`, false);

  // Call Function uploadFile(), And Send To Her The Chosen File :)
  uploadFile(file);
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
  if ( isGangPage ) {
    $('html, body').animate({
      scrollTop: ($("#uploadArea").offset().top - 130)
    }, 100);
  } else {
    $('html, body').animate({
      scrollTop: ($("product-variants").offset().top - 80)
    }, 500);
  }
}
// Upload File Function
function uploadFile(file, uploadtype = null) {
  // FileReader()
  isFileUpload = true;
  console.log(isFileUpload," =============isFileUpload=======")
  if($(".delivery-block.print-ready-box").length){
    $(".delivery-block.print-ready-box").addClass("print-ready-box-hide");
  }
  if ( typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct ) {
    // $( `.verticle_direction, .horizontal_direction` ).addClass( `hidden` );
    // $( `file-preview` ).removeAttr( `show-dimensions` );
  } else {
    $( `.verticle_direction, .horizontal_direction` ).removeClass( `hidden` );
    $( `file-preview` ).attr( `show-dimensions`, true );
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
    if(fileType.indexOf("image/png") > -1 || fileType.indexOf("image/svg+xml")  > -1 || fileType.indexOf("application/") > -1  || isCustomStickerProduct == true || isBumperStickerProduct == true || document.body.classList.contains("template-product-custom-magnets") || document.body.classList.contains("template-product-custom-keychains")){
      $("#option_checkbox").prop("checked",false);
      $("#remove_background").val("No");
    }else{
      $("#option_checkbox").prop("checked",true);
      $("#remove_background").val("Yes");
    }
    if( typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct  || document.body.classList.contains("template-product-custom-magnets") || document.body.classList.contains("template-product-custom-keychains")){
      $(" #remove_background").prop("disabled",true);
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
    document.body.classList.add('image-uploaded');

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
      if ( stopProcessing ) {
        return;
      }

      document.querySelector("#uploadArea").classList.add("hidden");
      // Call Function progressMove();
      // Configure AWS SDK with your credentials

      const randomName = file.name.split('.')[0].replace(/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '-')+"____"+'image_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.' + file.name.split('.').pop();

      getfileExt = randomName.split('.').pop();
      if ( getfileExt == 'psd' || getfileExt == 'eps' || getfileExt == 'ai' || getfileExt == 'pdf'  || getfileExt == 'svg'  ) {
        $( `.fileupload_bg_options .style3` ).hide();
        $(".edit-with-ai").addClass("_lift");
        $( `#option_checkbox, #option_checkbox_upscale` ).prop( `checked`, false );
      } else {
        $( `.fileupload_bg_options .style3` ).show();
        $(".edit-with-ai").removeClass("_lift");
      }

      stopProcessing = false;

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

function waitForHeroImageLoad() {
  const img = document.querySelector("#fileupload_hero");
  if (!img) return;

  const srcAtStart = img.src;

  const check = setInterval(() => {
    if (img.src && img.src !== srcAtStart) {
      clearInterval(check);

      img.onload = function () {
        file_width_global  = img.naturalWidth;
        file_height_global = img.naturalHeight;

        uploadedFileWidth  = img.naturalWidth;
        uploadedFileHeight = img.naturalHeight;

        // 🔥 THIS was missing
        if (typeof dimensionsClassesApply === "function") {
          dimensionsClassesApply();
        }

        $(".fileupload_bg_options").css({ opacity: 1, "pointer-events": "all" });
        $(".easyzoom").removeClass("image-loading");
      };
    }
  }, 100);
}



$("#option_checkbox").on("click", function(){
  let applicationFiles = $(`input[name="properties[Upload (Vector Files Preferred)]"]`).val();
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
});

$("#option_checkbox_upscale").on("click", function(){
  let applicationFiles = $(`input[name="properties[Upload (Vector Files Preferred)]"]`).val();
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
          // if (stopProcessing == false) {
          //   document.querySelector(".drop-zoon__icon").style.display = 'none';
          //   document.querySelector(".drop-zoon__paragraph").style.display = 'none';
          // }
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
        uploadedFileCounter.innerHTML = `${counter}%`;
        if($( `.fileProgress__bar` ) && $( `.fileProgress__bar` ).length > 0){
           $( `.fileProgress__bar` ).css({"width": `${ counter }%`});
           $(`.loadingPercent__counter`).html(`${counter}%`)
        }
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
              $( `file-preview .verticle_direction` ).attr( `y-is`, `Proportional Height` );
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
            $( `file-preview .verticle_direction` ).attr( `y-is`, `${ getSelectedHeight.toFixed( 2 ) }"` );

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
      $( `file-preview .verticle_direction` ).attr( `y-is`, `Proportional Height` );

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
    setTimeout(() => {
      let size = $(this).attr("data-width");
      let size_r = $(this).attr("data-height");
      let sizeInInches = $(this).attr("size-in-inches");
      $(".horizontal_direction span").html(`${ parseFloat(size)}"`);
      if ( typeof sizeInInches !== 'undefined' && sizeInInches ) {
        $(".verticle_direction span").html(`${ parseFloat(sizeInInches)}"`);
      } else {
        $(".verticle_direction span").html(`${ ( typeof autoDetectedHeight !== 'undefined' && autoDetectedHeight ? autoDetectedHeight : parseFloat(size_r) ) }"`);
      }
    }, 50);
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
    addAnotherTransfer( `#${ mainSectionID } .product__cart-functions .add-to-cart[data-main-product-add-to-cart]` );
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

$(document).on("click", ".access_old_data a:not(.purchase_from_previous)", function(e){
  e.stopImmediatePropagation();
});


// Delegated so this fires on .purchase_from_previous links that get
// added to the DOM later — e.g. the "Choose a previously uploaded
// design" link inside the multi-upload modal that's cloned out of a
// <template> when the user starts uploading. The non-delegated form
// only bound to elements present at $(document).ready() time and
// silently no-op'd on the cloned modal link.
$(document).on("click", ".purchase_from_previous", function(e){
  e.preventDefault();
  e.stopImmediatePropagation();

  /* Puff / Spangle color-gate fires ONLY for a `second_upload` trigger.
     The first-upload "Choose a previously uploaded design" link is the
     user's entry point — they may legitimately pick a design BEFORE
     picking a color. Blocking it here would make the link appear
     locked. Same scoping as the sticker-options validation below. */
  if ( $(this).data("type") === "second_upload" ) {
    if ( !_ntPuffSpangleColorGate() ) return;
  }

  // Validate sticker-options ONLY when this is a second_upload trigger
  // (where validation is actually needed to short-circuit the flow). For
  // a first_upload (the user clicking "Choose a previously uploaded
  // design" to BROWSE prior designs), the picker should just open —
  // running validation here used to reveal red error messages
  // ("Please Select Shape", etc.) as a side effect even though we then
  // proceeded to open the picker anyway.
  let optionErr = false;
  const triggerType = $(this).data("type");
  if (triggerType === "second_upload") {
    if ( typeof enableOption1 !== 'undefined' && enableOption1 ) {
      const isFirstOption = $( `.customStickerOption:not(.hidden)[item="1"]` ).length;
      if ( isFirstOption > 0 ) {
        const isChecked = $( `.customStickerOption[item="1"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
        if ( isChecked == false ) {
          optionErr = true;
          $( `.customStickerOption[item="1"] .customStickerOption__error` ).removeClass( `hidden` );
        } else {
          $( `.customStickerOption[item="1"] .customStickerOption__error` ).addClass( `hidden` );
        }
      }
    }
    if ( typeof enableOption2 !== 'undefined' && enableOption2 ) {
      const isSecondOption = $( `.customStickerOption:not(.hidden)[item="2"]` ).length;
      if ( isSecondOption > 0 ) {
        const isChecked = $( `.customStickerOption[item="2"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
        if ( isChecked == false ) {
          optionErr = true;
          $( `.customStickerOption[item="2"] .customStickerOption__error` ).removeClass( `hidden` );
        } else {
          $( `.customStickerOption[item="2"] .customStickerOption__error` ).addClass( `hidden` );
        }
      }
    }
    if ( typeof enableOption3 !== 'undefined' && enableOption3 ) {
      const isThirdOption = $( `.customStickerOption:not(.hidden)[item="3"]` ).length;
      if ( isThirdOption > 0 ) {
        const isChecked = $( `.customStickerOption[item="3"] .customStickerOption__option .customStickerOption__optionInput` ).is( `:checked` );
        if ( isChecked == false ) {
          optionErr = true;
          $( `.customStickerOption[item="3"] .customStickerOption__error` ).removeClass( `hidden` );
        } else {
          $( `.customStickerOption[item="3"] .customStickerOption__error` ).addClass( `hidden` );
        }
      }
    }
    if ( typeof enableOption4 !== 'undefined' && enableOption4 ) {
      const isFourthOption = $( `.customStickerOption:not(.hidden)[item="4"]` ).length;
      if ( isFourthOption > 0 ) {
        const inputVal = $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__input` ).val();
        if ( typeof inputVal !== 'undefined' && inputVal ) {
          $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).addClass( `hidden` );
        } else {
          $( `.customStickerOption:not(.hidden)[item="4"] .customStickerOption__error` ).removeClass( `hidden` );
          optionErr = true;
        }
      }
    }
    if ( optionErr ) {
      return;
    }
  }

  $(".customer_designes > img").show();
  $(".customer_designes ul").hide();
  $('.customTabelPopup__overlay-3').fadeIn(500);
  $('.customTabelPopup__overlay-3').attr("data-type",$(this).data("type"));
  if ( typeof isGangPage !== 'undefined' && isGangPage ) {
    $( `.upload_files_tab_header_inner [href="#purchased_files_by_size"]` ).removeClass( `active` ).hide();
    $( `.upload_files_tab_header_inner [href="#purchased_files_gang_sheet"]` ).addClass( `active` ).show().removeAttr( `style` );
  } else {
    $( `.upload_files_tab_header_inner [href="#purchased_files_gang_sheet"]` ).removeClass( `active` ).hide();
    $( `.upload_files_tab_header_inner [href="#purchased_files_by_size"]` ).addClass( `active` ).show().removeAttr( `style` );
  }

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
                  <a href="" class="use_design" data-src="${data[i].file}" data-photoid="previously on order # ${ data[i].order_name }" data-name="${file_name}">Use this Design</a>
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
$('.widthHeight__value').on('input', function () {
  let val = $(this).val();
  if (!/^-?\d*(\.\d*)?$/.test(val)) {
    // Invalid input — remove last entered char
    $(this).val(val.slice(0, -1));
  }
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


//------------------------------------------------------
// 🖼 Loader logic for dynamically set #fileupload_hero
//------------------------------------------------------
function setHeroImage(src) {
  var $img = $('#fileupload_hero');
  var $zoom = $img.closest('.easyzoom');

  // show loader
  $zoom.addClass('image-loading-2');

  // hide image while loading
 // $img.css('opacity', '0');

  // remove old handlers (prevents duplicates)
  $img.off('load error');

  // when image fully loads
  $img.on('load', function () {
    console.log('Hero image loaded:', src);
    $zoom.removeClass('image-loading-2');
    $img.css('opacity', '1');
  });

  // handle failed load
  $img.on('error', function () {
    console.warn('Hero image failed to load:', src);
    $zoom.removeClass('image-loading-2');
    $img.css('opacity', '1');
  });

  // now trigger the new load
  $img.attr('src', src);
}


$("body").on("click", ".use_design", function(e){
  e.preventDefault();
  designtype = 1;
  $(".customTabelPopup__overlay-3").hide();
  let datapath = $(this).data("src");
  if($(this).parents(".customTabelPopup__overlay-3").attr("data-type") == "second_upload"){
    /* Gang sheets have their own silent cart-add path
       (`gangSheetAddToCart`) that does cart/add.js via fetch, shows a
       "Product Added to cart" toast, and removes its own loadingScreen.
       The original `addAnotherTransfer` path waits for the cart sidebar
       to open and calls `refreshAllCart`, but the gang-sheet
       `.one("click")` cart-button handler bound in the section script
       performs a `location.href = '/cart'` redirect when the cart-add
       completes — that redirect breaks the desired "add first → toast
       → load new design in-place" flow. Branch on isGangPage so gang
       sheets get the silent fetch path, everything else keeps the
       puff/spangle/sticker addAnotherTransfer path. */
    if ( typeof isGangPage !== 'undefined' && isGangPage ) {
      /* Inline silent cart-add for gang sheets. We can't reuse
         gangSheetAddToCart() because it calls $("#fileremove").click()
         AFTER the fetch resolves — that fires removeFile() which wipes
         the form fields, #fileupload_hero src, and step__2 visibility
         AFTER the synchronous code below has already populated them
         with the newly-picked design. Net effect: the new design
         flashes in then gets blown away.

         Instead we capture a snapshot of the FIRST design's
         properties from the form BEFORE letting the synchronous code
         below mutate them for the NEW design, then fetch
         cart/add.js with that snapshot. The fetch is fully decoupled
         from the form by the time it resolves. */
      try {
        var _gsVid = parseInt($('product-form .form input[name="id"]').val(), 10);
        var _gsQty = parseInt($('customoptions-gangsheet.gangSheet [name="quantity"]').val(), 10);
        var _gsTerms = $('input[name="properties[_Terms Accepted]"]').is(':checked');
        var _gsFirstUrl = $('input[name="properties[Upload (Vector Files Preferred)]"]').val();
        var _gsFirstCartImg = $('input[name="properties[_cartImg]"]').val();

        if (_gsVid && _gsQty && _gsTerms && _gsFirstUrl && _gsFirstUrl.indexOf('https') > -1) {
          var _gsProps = {
            '_Terms Accepted': 'Yes',
            'Upload (Vector Files Preferred)': _gsFirstUrl
          };
          if (_gsFirstCartImg) _gsProps['_cartImg'] = _gsFirstCartImg;

          document.body.classList.add("processing-second-upload");
          if ($('.loadingScreen__').length === 0) {
            $('body').prepend('<div class="loadingScreen__"><img src="' + loaderGif + '"></div>');
          }

          /* Image-load promise. By the time fetch resolves, the
             synchronous code below this block has already set
             #fileupload_hero src to the NEW design. We preload that
             URL via a detached <img> — when its onload fires, the
             browser has the bytes (and so does the DOM <img> since
             they share the HTTP cache). That's the moment the user
             would visually see the new design — so we keep the
             loading screen up until BOTH cart-add and image are
             ready, eliminating the "old design visible → new design
             pops in" flicker. */
          function _gsWaitForNewHeroImage() {
            return new Promise(function (resolve) {
              var safetyT = setTimeout(resolve, 8000);
              /* Defer to next microtask so the synchronous src
                 assignment below this branch has a chance to run
                 first. */
              setTimeout(function () {
                var hero = document.getElementById('fileupload_hero');
                var src = hero && hero.getAttribute('src');
                if (!src || src.indexOf('https') === -1) {
                  clearTimeout(safetyT);
                  return resolve();
                }
                var preload = new Image();
                preload.onload = function () { clearTimeout(safetyT); resolve(); };
                preload.onerror = function () { clearTimeout(safetyT); resolve(); };
                preload.src = src;
                /* If already cached, onload may not fire. Guard with
                   .complete check. */
                if (preload.complete) { clearTimeout(safetyT); resolve(); }
              }, 0);
            });
          }

          var _gsFetchPromise = fetch(window.Shopify.routes.root + 'cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: _gsVid, quantity: _gsQty, properties: _gsProps }] })
          })
          .then(function (r) { return r.json(); })
          .catch(function (err) { console.log('use_design gang-sheet cart-add error', err); });

          Promise.all([_gsFetchPromise, _gsWaitForNewHeroImage()]).finally(function () {
            try { if (typeof refreshCart === 'function') refreshCart('notOpen'); } catch (_e) {}
            /* Second-upload previous-design pick: explicitly re-run
               variant selection here, AFTER the new hero image is
               loaded and the cart-add for the first design has
               resolved. The hero-load handler that handles the
               first-upload case (via `__gsPreviousDesignPick`) doesn't
               reliably fire on the second swap because the cart-add
               path interleaves multiple state mutations. Anchoring
               width at 22" + deriving height from the loaded hero
               aspect ratio is the same approach used by the load
               handler — robust against imgix thumbnail resizing. */
            try {
              var hero2 = document.getElementById('fileupload_hero');
              if (hero2 && hero2.naturalWidth && hero2.naturalHeight &&
                  typeof selectVariantForGangPages === 'function') {
                var h2w = 22;
                var h2h = 22 * (hero2.naturalHeight / hero2.naturalWidth);
                /* Clear `.autoSizeSelected` so the dropdown-option
                   click delegate in __multipleSnippets.liquid (which
                   is gated on `:not(.autoSizeSelected)`) can fire
                   again and actually update the dropdown text +
                   variant selection. Without this, the second-upload
                   pick measures correctly but the dropdown stays
                   stuck on the first upload's value. */
                $('customoptions-gangsheet .gangSheet__item').removeClass('autoSizeSelected');
                selectVariantForGangPages('', '', h2w, h2h);
              }
            } catch (_e) { /* never block the cleanup below */ }
            $('.toast').remove();
            $('body').append(
              '<div class="toast green">' +
                '<div class="toast-content">' +
                  '<svg class="fas fa-solid fa-check check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 22l-10-10.598 2.798-2.859 7.149 7.473 13.144-14.016 2.909 2.806z"/></svg>' +
                  '<div class="message"><span class="text text-2">Product Added to cart</span></div>' +
                '</div>' +
                '<svg class="fa-solid fa-xmark close" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18" stroke="#000" stroke-linecap="round"></path><path d="M18 6L6.00001 18" stroke="#000" stroke-linecap="round"></path></svg>' +
                '<div class="progress active"></div>' +
              '</div>'
            );
            setTimeout(function () { $('.toast').addClass('active'); }, 50);
            setTimeout(function () { $('.toast').remove(); }, 5000);
            $('.loadingScreen__').remove();
            setTimeout(function () { document.body.classList.remove("processing-second-upload"); }, 500);
          });
        }
      } catch (err) {
        console.log('use_design gang-sheet inline cart-add ERROR', err && err.message);
      }
      $( `[name="properties[Design Notes]"]` ).val( `` );
      /* Clear the upload error UI from the previous design's flow so a
         stale red error doesn't carry over. Terms checkbox uncheck is
         now handled at the end of the use_design handler (covers both
         first and second upload previous-design picks). */
      try {
        $('.__uploaderror').remove();
      } catch (_e) { /* never block */ }
    } else {
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
      addAnotherTransfer( `#${ mainSectionID } .product__cart-functions .add-to-cart[data-main-product-add-to-cart]` );
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
      },2000);
    }
  }
  $( `.generative-ai-area` ).addClass( `hidden` );
  dropZoon.classList.add('drop-zoon--Uploaded');
  document.body.classList.add('image-uploaded');
  loadingText.style.display = "block";
  uploadedFile.classList.remove('uploaded-file--open');
  uploadedFileInfo.classList.remove('uploaded-file__info--active');
  uploadArea.classList.add('upload-area--open');
  loadingText.style.display = "none";
  // fileDetails.classList.add('file-details--open');
  // uploadedFile.classList.add('uploaded-file--open');
	uploadedFileInfo.classList.add('uploaded-file__info--active');
	/* Gang-sheet previous-design pick — flag so the #fileupload_hero
	   load handler re-measures dimensions from the LOADED <img> (more
	   reliable than executeNextStep's network getImageMetaData fetch
	   for PNG picks). Without this, the second-upload "Choose previous
	   design" path kept the height from the FIRST upload because the
	   meta fetch wasn't completing before the variant selection logic
	   ran. Bug reported 2026-05-22 on premium-dtf-gang-sheets: 336"
	   image but dropdown stayed at 2 Feet. */
	if (typeof isGangPage !== 'undefined' && isGangPage) {
	  window.__gsPreviousDesignPick = true;
	}
	document.querySelector("#fileupload_hero").setAttribute('src', datapath);
  $(".easyzoom").addClass("image-loading-2");
  setTimeout(function(){
    $(".easyzoom").removeClass("image-loading-2");
  },2000)
	uploadedFileName.innerHTML = $(this).data("name");
  ordername = $(this).data("photoid");
	document.querySelector(".fileupload_custom").style.display = "block";
	progressMove("quick",0);
	document.querySelector("#uploadArea").classList.add("hidden");
	executeNextStep(datapath, true, true, false);
	// URL-based designs (previous design) never tick a real upload progress
	// counter, so the .underCTA reveal in executeNextStep__helper (gated on
	// .uploaded-file__counter == "100%") never fires. Reveal it directly.
	$('.goToNextStep, .underCTA').removeClass('hidden');
	if (typeof window.refreshGRTUpsellBlocks === 'function') window.refreshGRTUpsellBlocks();

  const checkPropertyEle = $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).length;
  /* _cartImg drives the cart thumbnail + the cart-page preview popup
     (see cart-page-item.liquid + arrange-properties.liquid). Without
     it gang-sheet preview links fall back to a path built from the
     filename alone — which 404s for nested S3 keys. Set _cartImg to
     the same URL we already wrote to the Upload property so both cart
     surfaces render the picked design.

     IMPORTANT: ensure the URL has a `?` query separator. The cart
     preview click handler in global.js + the cart-page-item.liquid
     template both append `&w=2000` to data-src without checking for
     an existing `?`. Raw API URLs like
     `https://ninjauploads-production.imgix.net/uploads/abc/design.png`
     lack any query string, so `URL&w=2000` becomes part of the path
     and the imgix request 404s. Adding baseline imgix params here
     guarantees a `?` exists for downstream `&w=2000` appends. */
  const _previousDesignCartImg = datapath && datapath.indexOf('?') > -1
    ? datapath
    : datapath + '?auto=compress&q=50&w=300';
  if ( checkPropertyEle == 0 ) {
    $( `product-form.product-form form` )
      .append( `
        <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${ datapath }">
        <input type="hidden" name="properties[_Original Image]" value="${ datapath.split("?")[0]}">
        <input type="hidden" name="properties[_cartImg]" value="${ _previousDesignCartImg }">
      ` );
    if(designtype == 1 && _ntIsValidOrderRef(ordername)){
      $( `product-form.product-form form` ).append( `
      <input type="hidden" value="previously on order # ${ ordername}" name="properties[design re-used]" />
    ` );
    }
  } else {
    $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).val( `${ datapath }` );
    $( `product-form.product-form form [name="properties[_Original Image]"]` ).val( `${ datapath.split("?")[0]}` );
    var $cartImgInput = $( `product-form.product-form form [name="properties[_cartImg]"]` );
    if ( $cartImgInput.length ) {
      $cartImgInput.val( _previousDesignCartImg );
    } else {
      $( `product-form.product-form form` ).append( `<input type="hidden" name="properties[_cartImg]" value="${ _previousDesignCartImg }">` );
    }
  }
  /* Uncheck the artwork-rights checkbox after EVERY previous-design
     pick (first AND second upload). Per design ask: each new design
     requires fresh consent before the customer can add to cart, same
     as the file-upload path which already unchecks at lines 5039 and
     5984. Scope to gang-sheet products since that's where the
     `properties[_Terms Accepted]` checkbox surfaces. */
  if ( typeof isGangPage !== 'undefined' && isGangPage ) {
    try {
      $( 'input[name="properties[_Terms Accepted]"]' ).prop( 'checked', false ).trigger( 'change' );
    } catch ( _e ) { /* never block */ }
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
  if($(this).hasClass("customTabelPopup__overlay-ai")){
    /* Gate the close on whether the user has typed anything into the
       prompt. Empty prompt → close immediately. Non-empty → keep the
       AI editor open and show the "Leave the AI Editor?" confirmation
       on top. This matches the dtf-transfers behavior in bySize_popular.js
       (window.closeEditWithAIPopup). Before this gate, clicking the
       backdrop with an empty prompt would still pop the confirmation,
       forcing an extra click for no reason. */
    var prompt = document.getElementById('ai_prompt_2');
    var hasPrompt = !!(prompt && prompt.value && prompt.value.trim().length);
    if (hasPrompt) {
      document.querySelector('.customTabelPopup__overlay-ai').style.display = 'grid';
      document.querySelector('.customTabelPopup__overlay-12-2').style.display = 'grid';
    } else {
      $(this).hide();
      $("body").removeAttr("style");
      document.querySelector('body').classList.remove("lock-page");
    }
    return;
  }
  $(this).hide();
  $("body").removeAttr("style");
  document.querySelector('body').classList.remove("lock-page");
});

$(document).on("click", ".zoom-box,.zoom_image", function (e) {
  // ✅ Don't open popup when clicking Edit-with-AI button or its children
  if ($(e.target).closest(".edit-with-ai").length) return;

  // On mobile gang-sheet PDPs, the image preview area (.zoom-box) is
  // intentionally not click-to-zoomable — tapping the artwork shouldn't
  // open the enlarge modal because the preview column is too narrow.
  // The explicit "Click to enlarge" link (.zoom_image) IS the intended
  // trigger though, so let those clicks through.
  const isMobile = window.innerWidth <= 768;
  if (isMobile && typeof isGangPage !== 'undefined' && isGangPage ) {
    if (!$(e.target).closest(".zoom_image").length) {
      return;
    }
  }

  // ✅ Don't open popup when clicking remove icon/link (and similar controls)
  // — but allow the .zoom_image link itself, which is the intended trigger.
  if (!$(e.target).closest(".zoom_image").length && $(e.target).closest("a, button, input, textarea, select, label").length) return;

  e.preventDefault();

  if ($(".easyzoom.zoom-box").hasClass("no-bg")) {
    $(".customTabelPopup__overlay-5").removeClass("no-transparant-bg");
  } else {
    $(".customTabelPopup__overlay-5").addClass("no-transparant-bg");
  }

  let getImg =
    $(`.zoom-box .viewer-box img`).attr("src") ||
    $(`.zoom-box img#fileupload_hero`).attr("src");

  /* Gang-sheet PDPs render the inline preview at q=50 (executeNextStep
     image-loader paths). Bump the modal copy to q=100 so the enlarged
     view shows the real artwork quality the customer uploaded. */
  if ( typeof isGangPage !== 'undefined' && isGangPage && typeof getImg === 'string' && getImg ) {
    getImg = getImg.replace(/([?&])q=50(\b)/g, '$1q=100$2');
  }

  /* Show the .preview-zoom-loader spinner (markup lives in
     snippets/product-page-popups.liquid) while the (potentially multi-MB)
     image streams in. One-shot load/error listener clears the loading
     class so a failed load doesn't leave the spinner stuck. */
  var $overlay5 = $(".customTabelPopup__overlay-5");
  var $zoomImg = $overlay5.find("img.zoomed-in-image, img").first();
  if ( typeof getImg === 'string' && getImg && $zoomImg.attr("src") !== getImg ) {
    $overlay5.addClass("is-loading");
    $zoomImg.off("load.previewZoom error.previewZoom").one("load.previewZoom error.previewZoom", function () {
      $overlay5.removeClass("is-loading");
    });
  }

  $zoomImg.attr("src", getImg);
  $overlay5.show();

  /* Lock body scroll while the zoom modal is open so swiping
     inside the overlay doesn't scroll the underlying page.
     The matching unlock lives on the close span's onclick in
     snippets/product-page-popups.liquid (also wired below for
     backdrop-click-to-close). On iOS Safari, overflow:hidden on
     body alone isn't always enough — pin scroll position with
     position:fixed/top so the page can't move. We stash the
     pre-lock scrollY on the body for the unlock to restore. */
  if (!document.body.classList.contains("preview-zoom-locked")) {
    var _scrollY = window.scrollY || window.pageYOffset || 0;
    document.body.dataset.previewZoomScrollY = String(_scrollY);
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = -_scrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.classList.add("preview-zoom-locked");
  }
});

/* Unified unlock helper — also bound to the .customTabelPopup__close
   inline onclick in product-page-popups.liquid, plus a backdrop click
   listener on overlay-5 below. */
window.__closePreviewZoom = function () {
  var o = document.querySelector(".customTabelPopup__overlay-5");
  if (o) {
    o.style.display = "none";
    o.classList.remove("is-loading");
  }
  if (document.body.classList.contains("preview-zoom-locked")) {
    var _y = parseInt(document.body.dataset.previewZoomScrollY || "0", 10) || 0;
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.classList.remove("preview-zoom-locked");
    delete document.body.dataset.previewZoomScrollY;
    window.scrollTo(0, _y);
  }
};

/* Backdrop click — close the modal when tapping outside the image.
   The popup card itself is .customTabelPopup; anywhere else on the
   .customTabelPopup__overlay-5 (the dimmed background) should close. */
$(document).on("click", ".customTabelPopup__overlay-5", function (e) {
  if ($(e.target).closest(".customTabelPopup").length) return;
  window.__closePreviewZoom();
});

/* Mobile tap-to-zoom on the Ninja Size Guide tiles. Desktop hover
   already scales these tiles up via CSS (#dtf_body_image *:hover);
   on mobile there's no hover so we toggle .is-tap-zoomed on the
   tapped tile. A second tap removes the zoom; tapping another tile
   moves the zoom to that tile; tapping outside the grid clears all
   zooms. Bound on document so it works regardless of when the
   size guide markup renders. */
(function () {
  var ZOOM_SEL =
    "#dtf_body_image > ._first, #dtf_body_image > ._second, " +
    "#dtf_body_image > ._third, #dtf_body_image > ._forth, " +
    "#dtf_body_image > ._fifth, #dtf_body_image > ._sixth";
  function clearAllZooms(except) {
    var grid = document.getElementById("dtf_body_image");
    if (!grid) return;
    var tiles = grid.querySelectorAll(".is-tap-zoomed");
    tiles.forEach(function (t) {
      if (t !== except) t.classList.remove("is-tap-zoomed");
    });
  }
  document.addEventListener(
    "click",
    function (e) {
      if (window.innerWidth > 768) return; // desktop already has hover
      var tile = e.target.closest(ZOOM_SEL);
      if (tile) {
        // Tapped a tile — toggle zoom on it, clear others
        var wasZoomed = tile.classList.contains("is-tap-zoomed");
        clearAllZooms(wasZoomed ? null : tile);
        tile.classList.toggle("is-tap-zoomed", !wasZoomed);
        return;
      }
      // Tap outside any tile — clear all zooms
      clearAllZooms(null);
    },
    false
  );
})();

/* iOS scroll-chain hard-stop. With body position:fixed the underlying
   page can't scroll, but iOS Safari sometimes still rubber-bands the
   viewport when the modal's own overflow has nothing to scroll (the
   artwork fits inside the screen). overscroll-behavior:contain on the
   overlay handles this in modern browsers; for older iOS we also
   preventDefault on touchmove whenever the overlay itself isn't
   actually scrollable at that gesture's vertical direction. The check
   is intentionally cheap so we don't kill the case where the user
   actually wants to scroll a tall gang-sheet preview. Bound passive:
   false so preventDefault works. */
(function () {
  var startY = 0;
  document.addEventListener(
    "touchstart",
    function (e) {
      var overlay = document.querySelector(".customTabelPopup__overlay-5");
      if (!overlay || overlay.style.display === "none") return;
      if (!overlay.contains(e.target)) return;
      startY = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchmove",
    function (e) {
      var overlay = document.querySelector(".customTabelPopup__overlay-5");
      if (!overlay || overlay.style.display === "none") return;
      if (!overlay.contains(e.target)) return;
      var currentY = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
      var deltaY = currentY - startY;
      var canScrollUp = overlay.scrollTop > 0;
      var canScrollDown =
        overlay.scrollTop + overlay.clientHeight < overlay.scrollHeight - 1;
      // Block the gesture when the overlay can't scroll in that direction.
      if (
        (deltaY > 0 && !canScrollUp) ||
        (deltaY < 0 && !canScrollDown) ||
        (!canScrollUp && !canScrollDown)
      ) {
        if (e.cancelable) e.preventDefault();
      }
    },
    { passive: false }
  );
})();

if(location.search.indexOf("force=upload") > -1){
  $("#dropZoon .purchase_from_previous").click();
}
if(location.search.indexOf("force=login") > -1){
  $("#dropZoon .first__upload").click();
}

if(location.search.indexOf("file=") > -1) {
  if(document.querySelector("#ready_to_press"))
    document.querySelector("#ready_to_press").disabled = false;
    // let datapath = location.search.split("file=")[1];
    const urlParams = new URLSearchParams(window.location.search);
    let datapath = urlParams.get("file") || "";
    datapath = decodeURIComponent(datapath).split("&")[0];
    dropZoon.classList.add('drop-zoon--Uploaded');
    document.body.classList.add('image-uploaded');
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

    if(getfileExt ==  "png" || getfileExt == "svg"  || typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct == true || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct == true  ){
      $(" #option_checkbox").prop("checked",false);
      $(" #remove_background").val("No");
    }else{
      $(" #option_checkbox").prop("checked",true);
      $(" #remove_background").val("Yes");
    }
    if(typeof isCustomStickerProduct !== 'undefined' && isCustomStickerProduct == true || typeof isBumperStickerProduct !== 'undefined' && isBumperStickerProduct == true){
      $(" #remove_background").prop("disabled",true);
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

  if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || datapath.indexOf(".psd") > -1) {
    datapath = datapath.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
  }

  if ( checkPropertyEle == 0 ) {
    $( `product-form.product-form form` )
      .append( `
        <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${ datapath }">
        <input type="hidden" name="properties[_Original Image]" value="${ datapath.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0]}">
      ` );
      if(designtype == 1 && _ntIsValidOrderRef(ordername)){
        $( `product-form.product-form form` ).append( `<input type="hidden" value="previously on order # ${ ordername}" name="properties[design re-used]" />` );
      }
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
    if ( cls == "another_alert_by_size" ) {
      $("[href='#purchased_files_gang_sheet']").removeClass("active");
      $("[href='#purchased_files_by_size']").addClass("active");
    } else {
      $("[href='#purchased_files_gang_sheet']").addClass("active");
      $("[href='#purchased_files_by_size']").removeClass("active");
    }
  },4000);
  return false;
}
$("#fileupload_hero").on("load", function() {
  /* Two trigger conditions for re-measuring the gang-sheet variant:
       1. `gangsheetPNG` — set for AI/EPS/PDF uploads or picks that need
          dimensions from the loaded raster image.
       2. `__gsPreviousDesignPick` — set when the customer picks a
          previous design (second-upload "Choose previous design"
          flow). Without this branch, PNG previous-design picks kept
          the variant from the FIRST upload because executeNextStep's
          network getImageMetaData fetch wasn't reliably completing
          before the variant logic ran. Reading naturalWidth /
          naturalHeight from the loaded <img> is synchronous and
          always correct. */
  var _isPrevPick = !!window.__gsPreviousDesignPick;
  if ( isGangPage && ( ( typeof gangsheetPNG !== 'undefined' && gangsheetPNG ) || _isPrevPick ) ) {
    let imgSrc = document.getElementById( `fileupload_hero` );
    imgSrc = imgSrc.getAttribute( `src` );
    if ( imgSrc.includes( `//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png` ) == false ) {
      waitForImageLoadById('fileupload_hero')
        .then(() => {
          /* For previous-design picks: derive dimensions from the
             ASPECT RATIO of the loaded hero <img>, not from its raw
             naturalWidth/Height. imgix serves resized thumbnails
             (e.g. ?h=300&auto=compress) so naturalWidth doesn't equal
             the original 6600px for a 22" gang sheet — dividing by
             300 DPI gives a tiny value like 0.065" and trips the
             `file_width < 21.5` warning in selectVariantForGangPages.

             Previous-design picks on gang sheets were already
             uploaded with the 22"-width gate enforced, so we can
             ANCHOR width at 22" and compute height from the loaded
             image's aspect ratio. This is the same approach the
             existing PNG measurement path uses (line ~4148 via
             actualWidth/tempHeight ratio) — just sourced from the
             loaded <img> instead of a separate getImageMetaData
             fetch, which is faster and more reliable. */
          if ( _isPrevPick ) {
            var hero = document.getElementById('fileupload_hero');
            var nw = hero && hero.naturalWidth ? hero.naturalWidth : 0;
            var nh = hero && hero.naturalHeight ? hero.naturalHeight : 0;
            var imgWidthIn  = 22;
            var imgHeightIn = ( nw > 0 && nh > 0 ) ? ( 22 * ( nh / nw ) ) : 0;
            /* Clear `.autoSizeSelected` BEFORE re-running the variant
               selection. The dropdown-option click handler in
               __multipleSnippets.liquid is delegated through
               `.gangSheet__item:not(.autoSizeSelected)`, so once that
               class lands from a prior pick, programmatic
               `.click()` on the new value silently no-ops — the
               dropdown text never updates. Removing the class lets
               the delegate fire again. */
            $( 'customoptions-gangsheet .gangSheet__item' ).removeClass( 'autoSizeSelected' );
            selectVariantForGangPages( '', '', imgWidthIn, imgHeightIn );
            window.__gsPreviousDesignPick = false;
          } else if ( typeof getWidthHeightFromImgSrc !== 'undefined' && getWidthHeightFromImgSrc ) {
            const imgWidth = $( `#fileupload_hero` ).width();
            const imgHeight = $( `#fileupload_hero` ).height();
            selectVariantForGangPages( '', '', imgWidth, imgHeight );

            getWidthHeightFromImgSrc = false;
            gangsheetPNG = false;
          }
          $( `.product__cart-functions .step__2` ).removeClass( `hidden` );
          console.log('✅ Image loaded');
          $(".easyzoom").removeClass("image-loading");
          if (isGangPage){
            $(`.step__2` ).removeClass( `hidden` );
          }
          // Do stuff after successful load
        })
        .catch((err) => {
          console.error('❌ Image failed to load', err);
          // Handle error or show fallback
        })
        .finally(() => {
          $(".easyzoom").removeClass("image-loading");
          if (isGangPage){
            $(`.step__2` ).removeClass( `hidden` );
          }
          console.log('🎯 Done checking image, moving forward');
          // This runs no matter what — cleanups, UI updates, enabling buttons, etc.
        });
    }
  } else {
    if($(this).attr("src").indexOf("trim=") > -1){
      let inter =  setInterval(function(){
        if($(".uploaded-file__counter").html() == "100%"){
          $(".easyzoom").removeClass("image-loading");
          if (isGangPage){
            $(`.step__2` ).removeClass( `hidden` );
          }
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
  if ( isDtfImgixEle > 0 && !_ntKeepProductGalleryOnUpload() ) {
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
function extractDimensions(input) {
  const match = input.match(/([\d.]+)\^?\s*x\s*([\d.]+)\^?/i);
  if (match) {
    return {
      width: parseFloat(match[1]),
      height: parseFloat(match[2])
    };
  }
  return null;
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

// --- Auto remove `.error` class from .widthHeight__item after 2 seconds ---
$(document).ready(function() {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        const el = mutation.target;
        if ($(el).hasClass("error") && $(el).hasClass("widthHeight__item")) {
          // Remove .error after 2 seconds
          setTimeout(() => {
            $(el).removeClass("error");
          }, 2000);
        }
      }
    }
  });

  // Observe all current .widthHeight__item elements
  $(".widthHeight__item").each(function() {
    observer.observe(this, { attributes: true, attributeFilter: ["class"] });
  });

  // Optional: handle dynamically added elements too
  const parentObserver = new MutationObserver(() => {
    $(".widthHeight__item").each(function() {
      if (!this.__errorObserved) {
        observer.observe(this, { attributes: true, attributeFilter: ["class"] });
        this.__errorObserved = true;
      }
    });
  });

  parentObserver.observe(document.querySelector("sizes-blocks"), {
    childList: true,
    subtree: true
  });
});


const AI_STATES = {
  ORIGINAL: "original",
  PROCESSING: "processing",
  RESULT: "result",
  RESULT_ORG: "result-org"
};

function setAIState(state) {
  const $box = $(".ai-preview-box");

  // Fade transition
  $box.addClass("ai-fade");
  setTimeout(() => $box.removeClass("ai-fade"), 250);

  // Reset UI
  $("#customer_image_preview, #ai_image_preview").hide();
  $(".ai-processing").hide();
  $(".ai-prompt-box").hide();
  $(".ai-action-box").hide();
  $(".ai-tabs").removeClass("active");
  $(".ai-tab").removeClass("active");
  $(".black-bg").hide();
  $(".ai-modal").removeClass("ai-is-processing");
  $(".ai-action-box .button").hide();

  // Tabs reset when needed
  if (state === AI_STATES.ORIGINAL) {    
    $('.ai-tab[data-tab="original"]').addClass("active");
    $("#customer_image_preview").show();
    $(".ai-prompt-box").show();
  }

  if (state === AI_STATES.PROCESSING) {  
    $(".ai-processing").show();
    $(".ai-modal").addClass("ai-is-processing");
  }

  if (state === AI_STATES.RESULT) { 
    $(".ai-tabs").addClass("active");
    $('.ai-tab[data-tab="ai"]').addClass("active");
    $("#ai_image_preview").show();
    $(".ai-action-box").show();
    $(".black-bg").css({"display":"flex"});
    $(".ai-action-box .button#use_ai_image").show();
  }

  if (state === AI_STATES.RESULT_ORG) { 
    $(".ai-tabs").addClass("active");
    $('.ai-tab[data-tab="original"]').addClass("active");
    $("#customer_image_preview").show();
    $(".ai-action-box").show();
    $(".black-bg").hide();
    $(".ai-action-box .button:not(#use_ai_image)").show();
  }
}

$(document).on("click", ".ai-tab", function () {

  $(".ai-tab").removeClass("active");
  $(this).addClass("active");

  const tab = $(this).data("tab");

  if (tab === "original") {
    setAIState(AI_STATES.RESULT_ORG);
  }

  if (tab === "ai") {
    setAIState(AI_STATES.RESULT);
  }
});

$("#ai_reset_editor").on("click", function () {
  $("#ai_prompt_2").val("");
  setAIState(AI_STATES.ORIGINAL);
});

let aiJobAbortController = null;
let aiJobCancelled = false;

const AI_DAILY_LIMIT = 50;

function getLocalDayKey() {
  // YYYY-MM-DD in USER'S local timezone
  const d = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAiUsage() {
  const day = getLocalDayKey();
  const raw = localStorage.getItem('nanoBananaUsage');
  let obj = {};
  try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }

  if (!obj || obj.day !== day) obj = { day, count: 0 };
  return obj;
}

function setAiUsage(obj) {
  localStorage.setItem('nanoBananaUsage', JSON.stringify(obj));
}

function canUseAiRequest() {
  const usage = getAiUsage();
  return usage.count < AI_DAILY_LIMIT;
}

// Call ONLY after API queue request succeeds
function consumeAiRequest() {
  const usage = getAiUsage();
  usage.count = (usage.count || 0) + 1;
  setAiUsage(usage);
  return usage.count;
}

function showRedToast(msg) {
  let $t = $('#ns_ai_toast');
  if (!$t.length) {
    $('body').append(`
      <div id="ns_ai_toast" style="
        position:fixed; left:50%; top:100px; transform:translateX(-50%);
        background:#c62828; color:#fff; padding:12px 16px; border-radius:10px;
        font-size:14px; font-weight:600; z-index:999999; display:none;
        box-shadow:0 10px 30px rgba(0,0,0,.18); max-width:92vw; text-align:center;
      "></div>
    `);
    $t = $('#ns_ai_toast');
  }
  $t.stop(true, true).text(msg).fadeIn(140);
  clearTimeout(window.__nsAiToastTimer);
  window.__nsAiToastTimer = setTimeout(() => $t.fadeOut(200), 3800);
}

function forceOriginalImageToNanoUrlIfAiEdit() {
  try {
    const nanoUrl = (window.__aiEditOriginalUrl || '').trim();
    if (!nanoUrl) return;

    const $form = $(`product-form.product-form form`);
    if (!$form.length) return;

    const $orig = $form.find(`[name="properties[_Original Image]"]`);
    if ($orig.length) {
      $orig.val(nanoUrl);
    } else {
      $form.append(`<input type="hidden" name="properties[_Original Image]" value="${nanoUrl}">`);
    }
  } catch (e) {
    console.log('ERROR forceOriginalImageToNanoUrlIfAiEdit()', e.message);
  }
}


function applyUploadPropertiesToProductForm(datapath, originalUrl, aiEdit) {
  try {
    const $form = $(`product-form.product-form form`);
    if (!$form.length) return;

    const $upload = $form.find(`[name="properties[Upload (Vector Files Preferred)]"]`);
    const $orig   = $form.find(`[name="properties[_Original Image]"]`);
    const $ai     = $form.find(`[name="properties[AI Edit]"]`);

    if (!$upload.length) {
      $form.append(`
        <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${datapath}">
        <input type="hidden" name="properties[_Original Image]" value="${originalUrl}">
      `);
    } else {
      $upload.val(datapath);
      $orig.val(originalUrl);
    }

    // AI Edit property (add/remove)
    if (aiEdit) {
      if ($ai.length) $ai.val('Yes');
      else $form.append(`<input type="hidden" name="properties[AI Edit]" value="Yes">`);
    } else {
      $ai.remove();
    }
  } catch (e) {
    console.log('ERROR applyUploadPropertiesToProductForm()', e.message);
  }
}


async function uploadAIUrlToS3AndGetImgix(aiUrl) {
  // 1) download nano-banana image and convert to File
  const resp = await fetch(aiUrl, { cache: 'no-store' });
  if (!resp.ok) throw new Error('Failed to fetch AI image: ' + resp.status);

  const blob = await resp.blob();
  const ext = (blob.type && blob.type.includes('jpeg')) ? 'jpg' : 'png';
  const file = new File([blob], `ai-edit.${ext}`, { type: blob.type || 'image/png' });

  // 2) your existing randomName logic (keep same as you use normally)
  const randomName = (typeof generateRandomName === 'function')
    ? generateRandomName(file.name)
    : (`ai_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`);

  // 3) presign + put upload (YOUR SAME PIPELINE)
  const presignData = await getPresignedUploadUrl(randomName, file.type);
  if (!presignData || !presignData.url) throw new Error('Presigned upload URL not returned');

  const originalUploadedFileURL = presignData.sourceUrl; // S3 source url

  const putResp = await fetch(presignData.url, {
    method: 'PUT',
    body: file
  });

  if (!putResp.ok) throw new Error('S3 upload failed: ' + putResp.status);

  // 4) build imgix path (YOUR SAME LOGIC)
  let filePath = `https://${ninjaImgixHost}/${randomName}`;

  // 5) crc if you use it (YOUR SAME LOGIC)
  let file_crc = "";
  try {
    const byteArr = await getAsByteArray(file);
    file_crc = (CRC32.buf(byteArr) >>> 0).toString(16);
  } catch (e) {
    console.log("Unable to calculate file crc:", e);
  }

  // return everything caller needs
  return {
    imgIxFile: filePath,
    s3File: originalUploadedFileURL,
    randomName,
    file_crc
  };
}



function getCurrentPreviewImageUrl() {
  try {
    // When using single upload
     
      const src1 = $(`file-preview preview-block #fileupload_hero`).attr('src');
      if (src1) return src1;

      // fallback if #fileupload_hero is directly on page
      const src2 = $(`#fileupload_hero`).attr('src');
      if (src2) return src2;
      

    return '';
  } catch (err) {
    console.log('ERROR getCurrentPreviewImageUrl()', err.message);
    return '';
  }
}

$(document).on("click", "#ai_stop_processing", function () {

  aiJobCancelled = true;

  try {
    if (aiJobAbortController) {
      aiJobAbortController.abort();
    }
  } catch(e){}

  // Reset UI safely
  setAIState(AI_STATES.ORIGINAL);
 
});

let originalBtnText = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 6.875C8.75 7.04076 8.81585 7.19973 8.93306 7.31694C9.05027 7.43415 9.20924 7.5 9.375 7.5C10.2038 7.5 10.9987 7.82924 11.5847 8.41529C12.1708 9.00134 12.5 9.7962 12.5 10.625C12.5 10.7908 12.5658 10.9497 12.6831 11.0669C12.8003 11.1842 12.9592 11.25 13.125 11.25C13.2908 11.25 13.4497 11.1842 13.5669 11.0669C13.6842 10.9497 13.75 10.7908 13.75 10.625C13.75 9.7962 14.0792 9.00134 14.6653 8.41529C15.2513 7.82924 16.0462 7.5 16.875 7.5C17.0408 7.5 17.1997 7.43415 17.3169 7.31694C17.4342 7.19973 17.5 7.04076 17.5 6.875C17.5 6.70924 17.4342 6.55027 17.3169 6.43306C17.1997 6.31585 17.0408 6.25 16.875 6.25C16.0462 6.25 15.2513 5.92076 14.6653 5.33471C14.0792 4.74866 13.75 3.9538 13.75 3.125C13.75 2.95924 13.6842 2.80027 13.5669 2.68306C13.4497 2.56585 13.2908 2.5 13.125 2.5C12.9592 2.5 12.8003 2.56585 12.6831 2.68306C12.5658 2.80027 12.5 2.95924 12.5 3.125C12.5 3.9538 12.1708 4.74866 11.5847 5.33471C10.9987 5.92076 10.2038 6.25 9.375 6.25C9.20924 6.25 9.05027 6.31585 8.93306 6.43306C8.81585 6.55027 8.75 6.70924 8.75 6.875Z" fill="white"/><path d="M8.125 15C8.125 15.1658 8.19085 15.3247 8.30806 15.4419C8.42527 15.5592 8.58424 15.625 8.75 15.625C9.08152 15.625 9.39946 15.7567 9.63388 15.9911C9.8683 16.2255 10 16.5435 10 16.875C10 17.0408 10.0658 17.1997 10.1831 17.3169C10.3003 17.4342 10.4592 17.5 10.625 17.5C10.7908 17.5 10.9497 17.4342 11.0669 17.3169C11.1842 17.1997 11.25 17.0408 11.25 16.875C11.25 16.5435 11.3817 16.2255 11.6161 15.9911C11.8505 15.7567 12.1685 15.625 12.5 15.625C12.6658 15.625 12.8247 15.5592 12.9419 15.4419C13.0592 15.3247 13.125 15.1658 13.125 15C13.125 14.8342 13.0592 14.6753 12.9419 14.5581C12.8247 14.4408 12.6658 14.375 12.5 14.375C12.1685 14.375 11.8505 14.2433 11.6161 14.0089C11.3817 13.7745 11.25 13.4565 11.25 13.125C11.25 12.9592 11.1842 12.8003 11.0669 12.6831C10.9497 12.5658 10.7908 12.5 10.625 12.5C10.4592 12.5 10.3003 12.5658 10.1831 12.6831C10.0658 12.8003 10 12.9592 10 13.125C10 13.4565 9.8683 13.7745 9.63388 14.0089C9.39946 14.2433 9.08152 14.375 8.75 14.375C8.58424 14.375 8.42527 14.4408 8.30806 14.5581C8.19085 14.6753 8.125 14.8342 8.125 15Z" fill="white"/><path d="M2.5 10.625C2.5 10.7908 2.56585 10.9497 2.68306 11.0669C2.80027 11.1842 2.95924 11.25 3.125 11.25C3.78804 11.25 4.42393 11.5134 4.89277 11.9822C5.36161 12.4511 5.625 13.087 5.625 13.75C5.625 13.9158 5.69085 14.0747 5.80806 14.1919C5.92527 14.3092 6.08424 14.375 6.25 14.375C6.41576 14.375 6.57473 14.3092 6.69194 14.1919C6.80915 14.0747 6.875 13.9158 6.875 13.75C6.875 13.087 7.13839 12.4511 7.60723 11.9822C8.07607 11.5134 8.71196 11.25 9.375 11.25C9.54076 11.25 9.69973 11.1842 9.81694 11.0669C9.93415 10.9497 10 10.7908 10 10.625C10 10.4592 9.93415 10.3003 9.81694 10.1831C9.69973 10.0658 9.54076 10 9.375 10C8.71196 10 8.07607 9.73661 7.60723 9.26777C7.13839 8.79893 6.875 8.16304 6.875 7.5C6.875 7.33424 6.80915 7.17527 6.69194 7.05806C6.57473 6.94085 6.41576 6.875 6.25 6.875C6.08424 6.875 5.92527 6.94085 5.80806 7.05806C5.69085 7.17527 5.625 7.33424 5.625 7.5C5.625 8.16304 5.36161 8.79893 4.89277 9.26777C4.42393 9.73661 3.78804 10 3.125 10C2.95924 10 2.80027 10.0658 2.68306 10.1831C2.56585 10.3003 2.5 10.4592 2.5 10.625Z" fill="white"/></svg><span>Edit Image</span>`;
$(document).ready(function () {
  // ---------- EDIT WITH AI: OPEN POPUP & RESET STATE ----------
  try {
    $("body").on('click', '.edit-with-ai .edit-with-aiFlex', function () {
       if (!canUseAiRequest()) {
        showRedToast('You have reached your AI generation limit for today.');
        return;
      }
      $("body").addClass("lock-page");
      const imgUrl = getCurrentPreviewImageUrl();
      console.log('imgUrl', imgUrl);

      // Set base image preview
      if (imgUrl) {
        $('#customer_image_preview').attr('src', imgUrl);
      } else {
        $('#customer_image_preview').attr('src', '');
      }

      // Reset AI result & status each time popup opens
      $('#ai_image_preview').attr('src', '');
      $('#ai_prompt_2').val('');
      $('#ai_status_message').hide().text('');

      // 1) Reset result container and success class
      $('.ai_result_output').hide();           // keep it hidden by default
      $('.ai-container').removeClass('_success');

      // 2) Reset Generate button (enable again for fresh run)
      const $btn = $('#ai_generate_image_2');
      $btn.prop('disabled', false);
      $btn.data('busy', '0');
     // const originalBtnText = decodeHTML($btn.data('original-text')) || 'Edit Image';
     // $btn.html(originalBtnText);
      isAIEdit = false;
      aiOriginalUrl = '';
      applyUploadPropertiesToProductForm(
        $(`product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]`).val() || '',
        $(`product-form.product-form form [name="properties[_Original Image]"]`).val() || '',
        false
      );
      window.__aiEditOriginalUrl = ''; 
      const $form = $(`product-form.product-form form`);
$form.find(`input[name="properties[AI Edit]"]`).remove();
setAIState(AI_STATES.ORIGINAL);
    });
  } catch (err) {
    console.log('ERROR init Edit-with-AI click handler', err.message);
  }

  // ---------- GENERATE IMAGE WITH NANO-BANANA ----------
  try {
    $(document).on('click', '#ai_generate_image_2', async function () {
       if (!canUseAiRequest()) {
        showRedToast('You have reached your AI generation limit for today.');
        return;
      }
      setAIState(AI_STATES.PROCESSING); 
        const $btn = $(this);
        const $aiPrompt_2 = $('#ai_prompt_2');
        const $status = $('#ai_status_message');
        let isSuccess = false;
        $('.ai-container').removeClass('_success');

        try {
          // LOCK POPUP
          $('.customTabelPopup__overlay-ai').addClass('ai-overlay-locked');
          $('.customTabelPopup__overlay-ai').addClass('processing-ai');
          const baseImageUrl = $('#customer_image_preview').attr('src');

          if (!baseImageUrl) {
            alert('No base image found. Please upload an image first.');
            return;
          }

          // PROMPT VALIDATION
          let promptText = ($('#ai_prompt_2').val() || '').trim();
          if (!promptText) {
            $status.show().text('Please enter a prompt to describe how you want to edit the image.');
            $('#ai_prompt_2').focus();
            return;
          }

          // UI: set loading state
          $btn.prop('disabled', true);
          $aiPrompt_2.prop('disabled', true);
          $btn.data('busy', '1');
        //  const originalBtnText = decodeHTML($btn.data('original-text')) || $btn.html();
        //  $btn.data('original-text', originalBtnText);
         // $btn.text('Generating...');
          $status.hide().text('');

          // Clear previous AI preview
          $('#ai_image_preview').attr('src', '');

          // CALL NANO-BANANA
          const newImageUrl = await nanoBananaEditRequest(baseImageUrl, promptText);

          // Update preview
          $('#ai_image_preview').attr('src', newImageUrl);
          $('.ai_result_output').show();
          $('.ai-container').addClass('_success');
          setAIState(AI_STATES.RESULT);
          isSuccess = true;
        } catch (err) {
          console.log('ERROR #ai_generate_image_2 click', err);
          $status.show().text('Error: ' + (err.message || 'Something went wrong while generating the image.'));
        } finally {
          // UNLOCK POPUP
          $('.customTabelPopup__overlay-ai').removeClass('ai-overlay-locked');
          $('.customTabelPopup__overlay-ai').removeClass('processing-ai');

          if (!isSuccess) {
            $btn.prop('disabled', false);
            $aiPrompt_2.prop('disabled', false);
            $btn.data('busy', '0');
          //  const originalBtnText = decodeHTML($btn.data('original-text')) || 'Edit Image';
          //  $btn.html(originalBtnText);
          } else {
            $btn.prop('disabled', true);
            $aiPrompt_2.prop('disabled', false);
            $btn.data('busy', '0');
          //  const originalBtnText = decodeHTML($btn.data('original-text')) || 'Edit Image';
          //  $btn.html(originalBtnText);
           // $('#ai_prompt_2').val("");
          }
        }
      });

  } catch (err) {
    console.log('ERROR init ai_generate_image_2 handler', err.message);
  }
});

function enableBgRemoveAfterAI() {
  const $bg = $('#option_checkbox');

  if (!$bg.length) return;

  // Force ON
  if (!$bg.is(':checked')) {
    //$bg.prop('checked', true);
  }

  // 🔥 IMPORTANT: re-trigger its logic
  $bg.click();
}

$(document).on('click', '#use_ai_image', async function () {
  const $btn = $(this);
  const $status = $('#ai_status_message');

  try {
    $('.customTabelPopup__overlay-ai').addClass('ai-overlay-locked');

    const nanoUrl = ($('#ai_image_preview').attr('src') || '').trim();
    if (!nanoUrl) return;

    $( `.split_design file-preview preview-block` ).addClass( `image-loading` );

    window.__aiEditOriginalUrl = nanoUrl;  // remember it globally
    isAIEdit = true;
    aiOriginalUrl = nanoUrl;
    //if (typeof isAIImage !== 'undefined') isAIImage = true;

    const btnOriginal = $btn.data('original-text') || $btn.html();
    $btn.data('original-text', btnOriginal);
    $btn.prop('disabled', true).html('Applying...');

    // 1) Upload AI image through your S3 + Imgix pipeline
    const uploaded = await uploadAIUrlToS3AndGetImgix(nanoUrl);

    const imgixUrl = uploaded.imgIxFile;        // ✅ use for hero + upload property
    const file_crc = uploaded.file_crc || '';
    const randomName = uploaded.randomName || '';

    // 2) update hero with imgix only (NOT nano url)
    if (isGangPage) {
      document.querySelector("#fileupload_hero")
        ?.setAttribute('src', imgixUrl + "?h=1000&auto=compress&q=50&fm=png");
    } else {
      document.querySelector("#fileupload_hero")
        ?.setAttribute('src', imgixUrl);
    }

    // 3) Build toggle params for Upload property (bg-remove/upscale/etc)
    let optionParams = '';
    try {
      if (typeof getToggleOptionParams === 'function') {
        optionParams = getToggleOptionParams() || '';
      }
    } catch (e) {}

    // ✅ Upload property must be IMGIX + params
    const uploadValue = imgixUrl + optionParams;
    
    // 4) Call your existing step flow (keep SAME signature you use)
    setTimeout(function () {
      executeNextStep(imgixUrl, true, true, true, randomName, true, file_crc);

      // ✅ executeNextStep overwrites _Original Image to S3, so force it back to nano
     // forceOriginalImageToNanoUrlIfAiEdit();

      // ✅ sometimes executeNextStep updates DOM async again, so do a small delayed re-apply
     // setTimeout(forceOriginalImageToNanoUrlIfAiEdit, 50);
     // setTimeout(forceOriginalImageToNanoUrlIfAiEdit, 250);
    }, 10);

setTimeout(function(){
    console.log("uploadValue, nanoUrl",uploadValue, originalUploadedFileURL)
    applyUploadPropertiesToProductForm(uploadValue, originalUploadedFileURL, true);
    },1000);

    // 5) Set form hidden inputs:
    //    Upload => imgix + params
    //    _Original Image => nano-banana URL
    //    AI Edit => Yes
    const $form = $(`product-form.product-form form`);
    if ($form.length) {
      // Upload (Vector Files Preferred)
      const $upload = $form.find(`[name="properties[Upload (Vector Files Preferred)]"]`);
      if ($upload.length) $upload.val(uploadValue);
      else $form.append(`<input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${uploadValue}">`);

      // ✅ Original Image should be nano-banana url (NOT S3)
      const $orig = $form.find(`[name="properties[_Original Image]"]`);
      if ($orig.length) $orig.val(nanoUrl);
      else $form.append(`<input type="hidden" name="properties[_Original Image]" value="${originalUploadedFileURL}">`);

      // ✅ AI Edit property
      const aiKey = `properties[AI Edit]`;
      const $ai = $form.find(`input[name="${aiKey}"]`);
      if ($ai.length) $ai.val('Yes');
      else $form.append(`<input type="hidden" name="${aiKey}" value="Yes">`);
    }

    // UI
    $('.ai_result_output').show();
    $('.ai-container').addClass('_success');

    $("body").removeClass("lock-page");

  } catch (err) {
    console.log('ERROR #use_ai_image click', err);
    $status.show().text('Error: ' + (err.message || 'Something went wrong while applying the AI image.'));
  } finally {
        $(".easyzoom").addClass("image-loading");

    setTimeout(function(){

      enableBgRemoveAfterAI();

      },700)
      
    $('.customTabelPopup__overlay-ai').removeClass('ai-overlay-locked').hide();
    $btn.prop('disabled', false).html($btn.data('original-text') || 'Use Ai Edited Image');
  }
});





async function nanoBananaEditRequest(imageUrl, promptText) {
  aiJobCancelled = false;
  aiJobAbortController = new AbortController();
  const FAL_KEY = 'be8d6227-0af0-4f18-ac79-14111cef50cb:a8a72b50bf97f848e1144bd9c5481f0f';
  const AUTH_HEADER = 'Key ' + FAL_KEY;

  // 1. Submit job to queue
  const queueResponse = await fetch('https://queue.fal.run/fal-ai/nano-banana/edit', {
    method: 'POST',
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: promptText,
      num_images: 1,
      aspect_ratio: 'auto',
      output_format: 'png',
      image_urls: [imageUrl]
    })
  });

  if (!queueResponse.ok) {
    const txt = await queueResponse.text().catch(() => '');
    throw new Error('Failed to queue request (' + queueResponse.status + '): ' + txt);
  }

  const job = await queueResponse.json();

  if (!job.status_url || !job.response_url) {
    console.log('nanoBanana job payload:', job);
    throw new Error('Invalid response from nano-banana queue');
  }

  const statusUrl = job.status_url;
  const resultUrl = job.response_url;

  // 2. Poll status until COMPLETED
  let attempts = 0;
  const maxAttempts = 40; // ~80 seconds if interval = 2000ms

  while (attempts < maxAttempts) {
    attempts++;

    const statusResp = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': AUTH_HEADER
      },
      signal: aiJobAbortController.signal
    });

    if (!statusResp.ok) {
      const txt = await statusResp.text().catch(() => '');
      throw new Error('Failed to fetch status (' + statusResp.status + '): ' + txt);
    }

    const statusJson = await statusResp.json();
    // statuses: IN_QUEUE, IN_PROGRESS, COMPLETED, etc.
    if (statusJson.status === 'COMPLETED') {
      break;
    }

    if (statusJson.status === 'FAILED' || statusJson.status === 'CANCELLED' || statusJson.status === 'ERROR') {
      console.log('nanoBanana status error:', statusJson);
      throw new Error('nano-banana request failed with status: ' + statusJson.status);
    }

    // wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

   if (aiJobCancelled) {
    throw new Error("AI request cancelled by user");
  }

  // 3. Get final result
  const resultResp = await fetch(resultUrl, {
    method: 'GET',
    headers: {
      'Authorization': AUTH_HEADER
    }
  });

  if (!resultResp.ok) {
    const txt = await resultResp.text().catch(() => '');
    throw new Error('Failed to get result (' + resultResp.status + '): ' + txt);
  }

  const resultJson = await resultResp.json();
  console.log('nanoBanana resultJson:', resultJson);

  // ---- FLEXIBLE IMAGE EXTRACTION ----
  let images = [];

  // Your case: { images: [...] }
  if (Array.isArray(resultJson.images)) {
    images = resultJson.images;
  }

  // Fallbacks if they ever change the shape
  if (!images.length && resultJson.response && Array.isArray(resultJson.response.images)) {
    images = resultJson.response.images;
  }
  if (!images.length && resultJson.data && Array.isArray(resultJson.data.images)) {
    images = resultJson.data.images;
  }
  if (!images.length && resultJson.output && Array.isArray(resultJson.output.images)) {
    images = resultJson.output.images;
  }

  if (!images.length) {
    throw new Error('No images[] array found in nano-banana response');
  }

  const first = images[0] || {};
  const url = first.url || first.image_url || first.data_url || first.uri || '';

  if (!url) {
    console.log('nanoBanana first image object:', first);
    throw new Error('No image URL returned from nano-banana');
  }

  return url;
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


$(function(){
  $("#fileupload_hero").addClass("visibility_image");
  $("#fileupload_hero").on("load",function(){
    var curnode = $(this);
    setTimeout(function(){
      curnode.removeClass("visibility_image");
    })
  })
})
