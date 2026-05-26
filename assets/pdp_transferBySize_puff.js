let ratio_width   =   0;
let ratio_height  =   0;
let file_width_global = 0;
let file_height_global = 0;

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
let isPuffPage = false;
if(document.body.classList.contains("template-product-puff-transfers"))
   isPuffPage = true;

if(document.body.classList.contains("template-product-dtf-gang-sheet") || document.body.classList.contains("template-product-uv-gang-sheet"))
   isGangPage = true;

 var imagesTypes = ["image/png","image/jpg","image/jpeg","image/tiff","application/pdf","image/vnd.adobe.photoshop","application/postscript","application/vnd.adobe.photoshop","application/x-photoshop","application/photoshop","image/svg+xml"];

// Images Types
if (isGangPage){
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
    manageQuantities();
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

        console.log ( 'show all ' );
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
    console.log ( 'chaaa__' );
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
          // console.log(img.naturalWidth, img.naturalHeight);
          if(typeof img == "undefined"){
            file_width  =   file_width_global;
            file_height =    file_height_global;
          } else {
            file_width  =   img.naturalWidth;
            file_height =   img.naturalHeight;
          }
          $( `.widthHeight__block [name="height__value"]` )
            .val( `${ (file_height / 300).toFixed(2) }` );
          $( `.widthHeight__block [name="width__value"]` )
            .val( `${ (file_width / 300).toFixed(2) }` );
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

      $( `.widthHeight__block [name="height__value"]` )
        .val( height.toFixed(2) )
        .attr( `last`, height.toFixed(2) );

      $( `.widthHeight__block [name="width__value"]` )
        .val( width.toFixed(2) )
        .attr( `last`, width.toFixed(2) );

      calculateRatio( width.toFixed(2), height.toFixed(2) );
      // console.log ( 'getFileRatio', getFileRatio );
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
      console.log("in-4");
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
})
.on(`click`, `.product-form .add-to-cart[data-main-product-add-to-cart]`,async function( e ) {
    console.log( 'hiiiiii vik 2', document.body.classList.contains("template-product-uv-gang-sheet"), typeof anotherTransfer);
  if(document.body.classList.contains("template-product-uv-gang-sheet") == true &&  typeof anotherTransfer == "undefined" ){
    console.log( 'hiiiiii vik 2' );
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
      console.log( 'function inn' );
      if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect ) {
        $( `body` )
          .append( `
            <div class="loadingScreen__">
              <img src="${ loaderGif }">
            </div>
          ` );
        $( `sidebar-drawer#site-cart-sidebar` )
          .css( 'opacity', '0 !important' );

        console.log( 'after cart redirect' );
      }

      console.log( 'anotherTransfer', anotherTransfer );

      if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect && anotherTransfer == false ) {
        $( `sidebar-drawer#site-cart-sidebar` )
          .css( 'opacity', '0 !important' );
        console.log("send to cart");
        console.log( 'another transfer' );
      }
      ElementAvailibility ( `#site-cart-sidebar.sidebar.sidebar--opened`, 'removeUploadError', 30 );
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
        qty = qty + selectedCartItem[0].qty;
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
  } catch ( err ) {
    console.log( `ERROR .customTabelPlace__itemWrapViewAll`, err.message );
  }
})
;


function removeUploadError() {
  try {
    $( `.cl-upload--errors.open` ).remove();

    if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect && anotherTransfer == false ) {
      $( `#site-cart-sidebar.sidebar.sidebar--opened` ).removeClass( `sidebar--opened` );
      anotherTransfer = false;
      location.href = '/cart';
    } else {
      anotherTransfer = false;
    }
    setTimeout(() => {
      $( `sidebar-drawer#site-cart-sidebar` )
        .css( 'opacity', '1' );
      $( `.loadingScreen__` ).remove();
    }, 2000);
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function manageQuantities( type = '', currentVariant = null ) {
  try {
    if ( currentVariant === null ) {
      const getVID = $( `product-form [name="id"]` ).val() * 1;
      const selectedVariant__ = findObjectByKey( allVariants, `id`, getVID );
      if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
        currentVariant = selectedVariant__;
      }
    }
    const isCustomTablePlaceAvailable = $( `.customTabelPlaceWrap` ).length;
    if ( isCustomTablePlaceAvailable > 0 && typeof currentVariant !== 'undefined' && currentVariant ) {
      $( `.customTabelPlaceWrap` ).attr( `base-price`, currentVariant.price );
    }
    console.log ( 'chaaa__', currentVariant );
    let qty         = $( `.customQtyFile__qty` ).val();
    if ( qty == '' ) {
      qty = 0;
    } else {
      qty = +qty;
    }
    if ( typeof getCalculatedQty__ !== 'undefined' && getCalculatedQty__ > 0 ) {
      console.log ( 'getCalculatedQty__', getCalculatedQty__ );
      qty = qty + getCalculatedQty__;
    }
    let selectedIndex = 0;
    $( `preCutPrice` ).text( `` );
    const isPreCutActive = $( `#precutselected` ).is( `:checked` );
    let preCutPrice, selectedCartItem;

    if ( typeof alreadyCartItems !== 'undefined' && alreadyCartItems.length > 0 ) {
      if ( currentTitle.includes( alreadyCartItems.matchingTitle ) ) {
        console.log ( 'horay title matched',  );
      }
      // selectedCartItem = findObjectByKey( alreadyCartItems, 'pid', currentPID );
      selectedCartItem = alreadyCartItems;
    }
    if ( typeof selectedCartItem !== 'undefined' && selectedCartItem && typeof isTitleMatched !== 'undefined' && isTitleMatched ) {
      console.log ( 'selectedCartItem is available' );
      // qty = qty + 1;
    }

    console.log ( 'qty', qty );
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
        console.log ( 'selectedCartItem ++++++++++++++++++', selectedCartItem );
        newQty = selectedCartItem[0].qty + qty;

        console.log ( 'newQty upadated', newQty );

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

      console.log ( 'newQty', newQty );
      console.log ( 'maxQtyOfRow', maxQtyOfRow );
      if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'Cumulative' ) {
        isLastMinumum = 249;
      }

      if ( typeof selectedCartItem !== 'undefined' && selectedCartItem && newQty < ( isLastMinumum + 1 ) ) {
        if ( newCartMsgs.itemsAvailableInCart.includes ( '[QTY]' ) ) {
          cart__msg = newCartMsgs.itemsAvailableInCart.replace( `[QTY]`, getCumulativeQty(selectedCartItem[0].qty, qty, maxQtyOfRow) );
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

      console.log ( 'selectedIndex', selectedIndex );

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
      console.log ( 'file available yes',  );
    } else {
      /* $( `.goToNextStep` )
        .addClass( `hidden` );

      $( `[item-show-on]` )
        .addClass( `hidden` );

      $( `[item-show-on="beforeUpload"], [item-show-on="onAll"]` )
        .removeClass( `hidden` );
      */
      $( `.customTabelPlace__item.selected` )
        .removeClass( `selected` );

      /* $( `.customQtyFile__qty` )
        .val( 1 )
        .prop( 1 ); */

      /*  $( `.product` )
        .removeClass( `changeLayout` ); */

      /*  $( `.step__2` )
        .addClass( `hidden` ); */

      /*  $( `.shopify-block.shopify-app-block [data-upload-field] .cl-upload--input-fields` )
        .hide();

      ratio_width   =   0;
      ratio_height  =   0; */

      // uploadedFile = '';
    }
    // console.log ( 'imgPreview_priceTable', imgPreview_priceTable );
    if ( typeof imgPreview_priceTable !== 'undefined' && imgPreview_priceTable ) {
      newPriceTableLogic( selectedIndex, currentVariant );
    }
  } catch ( err ) {
    console.log( `ERROR manageQuantities`, err.message );
  }
}


function readjustSelectedBar() {
  try {
    const getHeight = $( `.customTabelPlace .customTabelPlace__item.selected` ).outerHeight();
    let getTopPosition = $( `.customTabelPlace .customTabelPlace__item.selected` ).position().top;

    $( `.customTabelPlace__item__selectedBar` ).css({
      "top": `${ getTopPosition }px`,
      "height": `${ getHeight }px`
    });
  } catch ( err ) {
    console.log( `ERROR readjustSelectedBar()`, err.message );
  }
}


function newPriceTableLogic( selectedIndex, currentVariant ) {
  try {
    let selectionType, currentWidth, currentHeight = '';
    const selectedTabIs = $( `#size_selection .tab_header a.active` ).text().trim();
    if ( selectedTabIs.includes( `Custom` ) ) {
      selectionType = 'custom';
    } else {
      selectionType = 'popular';
    }
    let precutOption = $( `.precutWrapper #precutselected` ).prop( `checked` );
    const getQty = $( `precut-unit-logic [name="quantity"]` ).val() * 1;
    console.log ( 'newPriceTableLogic ** getQty', getQty );
    console.log ( 'selectedIndex', selectedIndex );
    console.log ( 'currentVariant', currentVariant );
    const discountedPercent = $( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `off` ) * 1;
    $( `precut-unit-logic .precut-unit-logic__discount` ).html( `${ discountedPercent != 0 ? `${ discountedPercent }% off` : '&nbsp;' }` );
    const discountAmount = (currentVariant.price * discountedPercent) / 100;
    const finalPrice = currentVariant.price - discountAmount;
    console.log ( 'finalPrice', finalPrice );
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
      console.log ( 'popularSqInches', popularSqInches );
      popularSqInches = popularSqInches.replaceAll( '"', '' );
      console.log ( 'popularSqInches', popularSqInches );
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
  } catch ( err ) {
    console.log( `ERROR newPriceTableLogic()`, err.message );
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
    // if ( selectedIndex == 1 ) {
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"] .customTabelPlace__item_qtyPercent` ).css( `width`, `${ newQty * 2.5 }%` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).append( `<div class="customTabelPlace__item__msg">${ cart__msg }</div>` );
    // } else if ( selectedIndex == 2 ) {
    //   // $( `.customTabelPlace .customTabelPlace__itemsWrap` ).addClass( `vAll` );
    //   // $( `.customTabelPlace__itemWrapViewAll > span` ).text( `view all` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="1"]` ).addClass( `barSelected` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"] .customTabelPlace__item_qtyPercent` ).css( `width`, `${ ( newQty - rowIndex__1 ) * 1.4 }%` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).append( `<div class="customTabelPlace__item__msg">${ cart__msg }</div>` );
    // } else if ( selectedIndex == 3 ) {
    //   // $( `.customTabelPlace .customTabelPlace__itemsWrap` ).addClass( `vAll` );
    //   // $( `.customTabelPlace__itemWrapViewAll > span` ).text( `view all` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="1"], .customTabelPlace .customTabelPlace__item[index="2"]` ).addClass( `barSelected` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"] .customTabelPlace__item_qtyPercent` ).css( `width`, `${ ( newQty - rowIndex__2 ) * 0.944 }%` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).append( `<div class="customTabelPlace__item__msg">${ cart__msg }</div>` );
    // } else if ( selectedIndex == 4 ) {
    //   // $( `.customTabelPlace .customTabelPlace__itemsWrap` ).addClass( `vAll` );
    //   // $( `.customTabelPlace__itemWrapViewAll > span` ).text( `view all` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="1"], .customTabelPlace .customTabelPlace__item[index="2"], .customTabelPlace .customTabelPlace__item[index="3"]` ).addClass( `barSelected` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"] .customTabelPlace__item_qtyPercent` ).css( `width`, `${ ( newQty - rowIndex__3 ) * 0.23 }%` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).append( `<div class="customTabelPlace__item__msg">${ cart__msg }</div>` );
    // }

    // else if ( selectedIndex == 5 ) {
    //   // $( `.customTabelPlace .customTabelPlace__itemsWrap` ).addClass( `vAll` );
    //   // $( `.customTabelPlace__itemWrapViewAll > span` ).text( `view all` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="1"], .customTabelPlace .customTabelPlace__item[index="2"], .customTabelPlace .customTabelPlace__item[index="3"], .customTabelPlace .customTabelPlace__item[index="4"]` ).addClass( `barSelected` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"] .customTabelPlace__item_qtyPercent` ).css( `width`, `52.73%` );
    //   $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).append( `<div class="customTabelPlace__item__msg">${ cart__msg }</div>` );
    // }
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
    let width       = document.querySelector( `.widthHeight__value[name="width__value"]` );
    let height      = document.querySelector( `.widthHeight__value[name="height__value"]` );

    let widthMax    = width.getAttribute( `max` ) * 1;
    let heightMax   = height.getAttribute( `max` ) * 1;

    let widthLast   = width.getAttribute( `last` );
    let heightLast  = height.getAttribute( `last` );

    const widthVal  = parseFloat(width.value);
    const heightVal = parseFloat(height.value);

    const getWidth  = ratioBy( 'w', widthVal, heightVal );
    const getHeight = ratioBy( 'h', widthVal, heightVal );

    let autoChange  = false;
    const checkAutoChangeEle = $( `.widthHeight__autoChange .autoChange` ).length;

    if ( checkAutoChangeEle > 0 ) {
      const isEnabledAutoChange = $( `.widthHeight__autoChange .autoChange` ).is( ':checked' );
      if ( isEnabledAutoChange ) {
        autoChange  = true;
      }
    }

    if ( typeof autoChange !== 'undefined' && autoChange ) { 
      if ( by == 'width' ) {
        height.value = getHeight.toFixed(2);
        if ( getHeight > userDefinedMaxLength ) {
          $( `.widthHeight__item[by="height"]` ).addClass( `error` );
        }
      } else if ( by == 'height' ) {
        width.value  = getWidth.toFixed(2);
        if ( getWidth > userDefinedMaxLength ) {
          $( `.widthHeight__item[by="width"]` ).addClass( `error` );
        }
      }
    }

    getVariantsBySize();
  } catch ( err ) {
    console.log( `ERROR getRadioMaintain`, err.message );
  }
}


function reAdjustSizes() {
  try {
    const height    =   $( `input[name="height__value"]` );
    const width     =   $( `input[name="width__value"]` );

    const heightVal =   height.val() * 1;
    const widthVal  =   width.val() * 1;

    if ( widthVal > userDefinedMaxLength || heightVal > userDefinedMaxLength ) {
      if ( widthVal == heightVal ) {
        if ( widthVal > userDefinedMaxLength ) {
          console.log ( '11111' );
          width
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'width' );
          $( `.widthHeight__item` ).addClass( `error` );
        }
      } else if ( widthVal > userDefinedMaxLength && heightVal > userDefinedMaxLength ) {
        if ( widthVal > heightVal ) {
          console.log ( '22222' );
          width
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'width' );
          $( `.widthHeight__item` ).removeClass( `error` );
          $( `.widthHeight__item[by="width"]` ).addClass( `error` );
        } else if ( heightVal > widthVal ) {
          console.log ( '33333' );
          height
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'height' );
          $( `.widthHeight__item` ).removeClass( `error` );
          $( `.widthHeight__item[by="height"]` ).addClass( `error` );
        }
      } else if ( widthVal > userDefinedMaxLength && heightVal < userDefinedMaxLength ) {
        console.log ( '44444' );
        width
          .val( userDefinedMaxLength.toFixed(2) )
          .prop( userDefinedMaxLength.toFixed(2) );
        getRadioMaintain( 'width' );
        $( `.widthHeight__item` ).removeClass( `error` );
        $( `.widthHeight__item[by="width"]` ).addClass( `error` );
      } else if ( heightVal > userDefinedMaxLength && widthVal < userDefinedMaxLength ) {
        console.log ( '55555' );
        height
          .val( userDefinedMaxLength.toFixed(2) )
          .prop( userDefinedMaxLength.toFixed(2) );
        getRadioMaintain( 'height' );
        $( `.widthHeight__item` ).removeClass( `error` );
        $( `.widthHeight__item[by="height"]` ).addClass( `error` );
      }
    } else {
      setTimeout(()=>{
        $( `.widthHeight__item` ).removeClass( `error` );
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
    const getWidth    =   $( `.widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
    const getHeight   =   $( `.widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    const getSquareIn =   Math.ceil( getWidth * getHeight );
    currentSquareInches = getSquareIn;
    console.log ( 'getSquareIn', getSquareIn );
    let isVariantMatched  =   false;

    $( `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
      const min = $( this ).attr( `min` ) * 1;
      const max = $( this ).attr( `max` ) * 1;
      if ( getSquareIn >= min && getSquareIn <= max ) {
        isVariantMatched  =   true;
        console.log ( 'matched variant id', $( this ).find( `label` ).attr( `for` ) );
        if($(`product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""]) input:checked`).val() != $( this ).find( `input` ).val())

        $( this ).find( `label` ).click();
      }
    })

    console.log ( 'isVariantMatched', isVariantMatched );

    if ( isVariantMatched ) {

      await ApplyDelay( 300 );
      $( `.widthHeight__option.customOption` ).click();

    } else if ( getSquareIn > allowedMaxInches && getWidth > userDefinedMaxLength || getSquareIn > allowedMaxInches && getHeight > userDefinedMaxLength ) {

      await ApplyDelay( 300 );
      $( `.widthHeight__item` ).addClass( `error` );
      $( `.widthHeight__option.customOption` ).click();

      const autoChangeCheckbox = $( `.widthHeight__autoChange #autoChange` ).is( `:checked` );

      if ( autoChangeCheckbox == false ) {
        $( `.widthHeight__autoChange #autoChange` ).click();
        await ApplyDelay( 50 );

        $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();

        await ApplyDelay( 100 );
        $( `.widthHeight__autoChange #autoChange` ).click();
      }
      console.log ( 'autoChangeCheckbox', autoChangeCheckbox );
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

      console.log ( 'no variant matched' );
    }

    manageProperties();
  } catch ( err ) {
    console.log( `ERROR getVariantsBySize()`, err.message );
  }
}

function manageProperties() {
  try {
    const getWidth    =   $( `.widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
    const getHeight   =   $( `.widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    let detectedSize  =   $( `.widthHeight__option-detectedSize span[d-size]` ).text();
    detectedSize      =   detectedSize.replace( '"', '' ).replace( '"', '' ).replace( ' ', '' ).replace( ' ', '' );

    const isPopularSizeSelected   =   $( `.widthHeight__option.popularOption.selected` ).length;

    if ( isPopularSizeSelected > 0 ) {
      $( `.form__properties` )
        .html( `` );
        // .html( `
        //   <textarea style="display: none;" name="properties[_specialNote]">Detected Size: ${ typeof detectedSize !== 'undefined' && detectedSize ? detectedSize : null }</textarea>
        // ` );
    } else {
      console.log ( 'getWidth', getWidth );
      if ( typeof getWidth !== 'undefined' && getWidth ) {
        console.log ( 'getWidth chaa', getWidth );
        console.log ( 'getHeight', getHeight );
        $( `.form__properties` )
          .html( `
            <input type="hidden" name="properties[_width]" value="${ getWidth }">
            <input type="hidden" name="properties[_height]" value="${ getHeight }">
          ` );
         $(".horizontal_direction span").html(`${ parseFloat(getWidth).toFixed(2) }"`);
        $(".verticle_direction span").html(`${ parseFloat(getHeight).toFixed(2) }"`);
          // <input type="hidden" name="properties[Detected Size]" value="${ detectedSize }">
      }
    }
    setTimeout(() => {
      if ( getWidth > getHeight && getWidth > userDefinedMaxLength ) {
        console.log ( 'chaaaaaaaa 111',  );
        $( `.widthHeight__custom .widthHeight__value[name="width__value"] + .widthHeight__item__action-plus` ).click();
      } else if ( getWidth < getHeight && getHeight > userDefinedMaxLength ) {
        $( `.widthHeight__custom .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        console.log ( 'chaaaaaaaa 222',  );
      } else if ( getWidth == getHeight && getHeight > userDefinedMaxLength ) {
        $( `.widthHeight__custom .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
      }
    }, 100);
  } catch ( err ) {
    console.log( `ERROR manageProperties()`, err.message );
  }
    $(".custom_tab_container").removeClass("is_disabled");
  $(".widthHeight__item__action").removeClass("disabled"); 
 // $(".easyzoom").removeClass("image-loading");
  //alert("hi");
}

function ratioBy( type, w, h ) {
  try {
    if ( type == 'w' ) {

      let aspectRatio   =   ratio_width / ratio_height;
      // console.log ( 'aspectRatio', aspectRatio );
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
  console.log("in-1");
  let isFileFromURL = false;
  if(location.search.indexOf("file=") > -1){
    isFileFromURL = true
  }
  /**
  * Generating Search Query Params
  */
  const queryParamsObject = new URLSearchParams();
 //  queryParamsObject.set( 'trim', 'color');
  var file_url = imgURL;
  if($("#option_checkbox").prop("checked") == false && $("#option_checkbox_upscale").prop("checked") == false){
    file_url = imgURL.split("?")[0];
  }else if($("#option_checkbox").prop("checked") == true && $("#option_checkbox_upscale").prop("checked") == false ){
      file_url = imgURL.split("?")[0];
    queryParamsObject.set( `bg-remove`, true );
    queryParamsObject.set( 'trim', 'colorUnlessAlpha');
      // file_url = file_url+"?bg-remove=true&trim=color";
  }else if($("#option_checkbox").prop("checked") == false && $("#option_checkbox_upscale").prop("checked") == true ){
      file_url = imgURL.split("?")[0];
      queryParamsObject.set( `upscale`, true );
      queryParamsObject.set('trim', 'auto');
      // file_url = file_url+"?upscale=true&trim=auto";
  }else if($("#option_checkbox").prop("checked") == true && $("#option_checkbox_upscale").prop("checked") == true ){
      file_url = imgURL.split("?")[0];
      queryParamsObject.set('bg-remove', true);
      queryParamsObject.set('upscale', true);
      queryParamsObject.set('trim', 'colorUnlessAlpha');
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

    console.log ( 'file_url', file_url );

    fileExt = file_url.split('.').pop();

    if ( fileExt.includes( `?` ) ) {
      fileExt = fileExt.split( `?` )[0];
    }
    fileExt = fileExt.toLowerCase();

    console.log ( 'fileExt', fileExt );

    if(isGangPage == true){
      executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc );
      executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc );
    } else if ( fileExt == 'psd' || fileExt == 'eps' || fileExt == 'ai' ) {

      let getApiResponse;
      if ( fileExt == 'eps' || fileExt == 'ai' ) {
        console.log ( 'request with ImgIx',  );
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

        console.log ( 'getApiResponse', getApiResponse );
      } else {
        file_width  =   300;
        file_height =   300;
      }

      $( `.widthHeight__option.customOption .widthHeight__option-detectedSize` ).html( `Detected size: <span d-size>${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"</span>` );
      $(".fileupload_info p").html(`<strong>Cropped size</strong> ${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"`);
      $( `.widthHeight__block [name="height__value"]` ).val( `${ (file_height / 72).toFixed(2) }` );
      $( `.widthHeight__block [name="width__value"]` ).val( `${ (file_width / 72).toFixed(2) }` );

      if(isFileFromURL == true){
        $(".fileupload_info p").html(`<strong>Cropped size</strong> 11.00" x 11.00"`);
        $( `.widthHeight__block [name="height__value"]` ).val( `11.00` );
        $( `.widthHeight__block [name="width__value"]` ).val( `11.00` );
      }

      setTimeout(()=>{
        $( `variant-radios .product-form__input__wrapper[min=""][max=""]` )
          .first()
          .find( `> label` )
          .click();

        setTimeout(()=>{
          const file__W = ( file_width / 300 ).toFixed(2);
          const file__H = ( file_height / 300 ).toFixed(2);

          console.log ( 'file__H', file__H );
          console.log ( 'file__W', file__W );

          if ( file__H > file__W && file__H > 22 ) {
            console.log ( 'chaaa height' );
            $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
          } else if ( file__W > file__H && file__W > 22 ) {
            console.log ( 'chaaa width' );
            $( `.widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
          } else if ( file__W > 22 && file__H > 22 ) {
            console.log ( 'chaaa height' );
            $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
          }
        }, 100);
      }, 500);

      executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc );
      executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc );

    } else {
      let getApiResponse;
      if ( fileExt == 'pdf' ) {
        file_url = `${ file_url }?fm=png&trim=colorUnlessAlpha`;
        getApiResponse  =   await sendApiRequest( `${ file_url }`, s3Key );
      }
      console.log ( 'condition active', fileExt, file_url );
      getImageDimensions(file_url, (dimensions, error) => {
        if (error) {
            console.error(error);
        } else {
          if ( fileExt == 'svg' ) {
            if ( noWidthAndHeightForSVG ) {
              const getUnitForMultiple = 2480 / dimensions.width;
              file_width = dimensions.width * getUnitForMultiple;
              file_height = dimensions.height * getUnitForMultiple;
              $( `#fileupload_hero` ).addClass( `previewFullWidth` );
            } else {
              file_width = dimensions.width * 4.168067226890756;
              file_height = dimensions.height * 4.168067226890756;
            }
            console.log(`svg Width: ${file_width}px, Height: ${file_height}px`);
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
            file_width = dimensions.width;
            file_height = dimensions.height;
            console.log(`Width: ${dimensions.width}px, Height: ${dimensions.height}px`);
            const getTotalPixels = dimensions.width * dimensions.height;
            uploadedFileWidth = dimensions.width;
            uploadedFileHeight = dimensions.height;
          }

          $( `.widthHeight__option.customOption .widthHeight__option-detectedSize` )
            .html( `Detected size: <span d-size>${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"</span>` );

          $(".fileupload_info p span").html(`${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"`);

          $( `.widthHeight__block [name="height__value"]` )
            .val( `${ (file_height / 300).toFixed(2) }` );

          $( `.widthHeight__block [name="width__value"]` )
            .val( `${ (file_width / 300).toFixed(2) }` );

          $( `.customUploaderWrapper__upload` ).addClass( `hidden` );

          $( `.color-background-1.gradient` ).removeClass( `adjustHeight` );

          $( `.widthHeight__autoChange .autoChange` )
            .prop( `checked`, true );

          $( `.goToNextStep, .underCTA` ).removeClass( `hidden` ).click();

          setTimeout(()=>{
            const file__W = file_width / 300;
            const file__H = file_height / 300;

            if ( file__H > file__W && file__H > 22 ) {
              console.log ( 'chaaa height' );
              $( `.widthHeight__item` )
                .addClass( `error` );
              $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            } else if ( file__W > file__H && file__W > 22 ) {
              console.log ( 'chaaa width' );
              $( `.widthHeight__item` )
                .addClass( `error` );
              $( `.widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
            } else if ( file__W > 22 && file__H > 22 ) {
              console.log ( 'chaaa height' );
              $( `.widthHeight__item` )
                .addClass( `error` );
              $( `.widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            }
          }, 100);

          executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc );
          executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc );
        }
      });
    }
  }
  fileInput.value = '';
};

function executeNextStep__helper(firstOne='', secondOne='', defaultloader, file_url, forcesave, file_crc ) {
  try {
    if ( firstOne == 'Y' ) {
      $( `[item-show-on]` )
        .addClass( `hidden` );

      $( `[item-show-on="afterUpload"]` )
        .removeClass( `hidden` );
      let interVal = setInterval(function(){
        if($(".uploaded-file__counter").html() == "100%"){
          console.log("hiii3333");
          console.log("in-3");
          $( `.goToNextStep, .underCTA` ).removeClass( `hidden` ).click();
            if ( typeof addSlickSlider__ === 'function' ) {
              addSlickSlider__();
            }
          if(defaultloader == true)
           // $(".easyzoom").removeClass("image-loading");
            clearInterval(interVal);
        }
      },300)

      console.log("in-2");

      //   setTimeout(()=>{
      const fileVal = $( `input[name="properties[Upload (Vector Files Preferred)]"]` ).length;

      console.log ( 'fileVal', fileVal );
      // _cartImg drives the thumbnail in the cart page + cart drawer (see
       // cart-page-item.liquid / cart-item.liquid; both read `_cartImg` and
       // fall through to the variant image when it's missing). Without it,
       // puff / glitter puff / spangle products render the variant photo
       // instead of the customer's uploaded design. file_url already has
       // imgix params (e.g. ?bg-remove=true&trim=...) so appending &w=2000
       // in the cart template works. For AI/EPS/PDF/PSD where file_url
       // isn't a viewable raster, fall back to originalUploadedFileURL with
       // a trim transform so imgix renders a flat PNG.
      var _cartImgValue = (getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' || originalUploadedFileURL.indexOf(".psd") > -1)
        ? (originalUploadedFileURL.indexOf('?') > -1 ? originalUploadedFileURL : originalUploadedFileURL + '?fm=png&trim=colorUnlessAlpha&h=100')
        : file_url;

      if ( fileVal > 0 ) {
        if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || originalUploadedFileURL.indexOf(".psd") > -1) {
          $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( originalUploadedFileURL );
        } else {
          $( `product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( file_url );
        }
        if(isGangPage == false)
          $( `product-form.product-form form input[name="properties[_Original Image]` ).val( ( typeof originalUploadedFileURL !== 'undefined' && originalUploadedFileURL ? originalUploadedFileURL : file_url.split("?")[0] ) );
        // Ensure _cartImg exists; create it if missing, otherwise update.
        var $cartImgField = $( `product-form.product-form form input[name="properties[_cartImg]"]` );
        if ( $cartImgField.length ) {
          $cartImgField.val( _cartImgValue );
        } else {
          $( `product-form.product-form form` ).append( `<input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />` );
        }
      } else {
        if(isGangPage == true) {
          $( `product-form.product-form form` ).append( `<input type="hidden"  value="${ file_url }" name="properties[Upload (Vector Files Preferred)]"  />` );
          $( `product-form.product-form form` ).append( `<input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />` );
        } else {
          if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || originalUploadedFileURL.indexOf(".psd") > -1) {
            $( `product-form.product-form form` )
              .append( `
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[Upload (Vector Files Preferred)]" />
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[_Original Image]" />
                <input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />
              ` );
          } else {
            $( `product-form.product-form form` )
              .append( `
                <input type="hidden" value="${ file_url }" name="properties[Upload (Vector Files Preferred)]" />
                <input type="hidden" value="${ originalUploadedFileURL }" name="properties[_Original Image]" />
                <input type="hidden" value="${ _cartImgValue }" name="properties[_cartImg]" />
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
          $(".viewer-box img").attr('src', file_url);
          file_url = file_url.replace(ninjaS3Host2,ninjaS3Host)+"?h=300&auto=compress&q=50";
          document.querySelector("#fileupload_hero").setAttribute('src', file_url);
        }else{
          if ( file_url.includes( `?` ) ) {
            if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' ) {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png&trim=colorUnlessAlpha`);
              $(".viewer-box img").attr('src', `${ file_url }&fm=png&trim=colorUnlessAlpha`);
            } else {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }&fm=png&trim=colorUnlessAlpha`);
              $(".viewer-box img").attr('src', `${ file_url }&fm=png`);
            }
          } else {
            if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' ) {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }?fm=png&trim=colorUnlessAlpha`);
              $(".viewer-box img").attr('src', `${ file_url }?fm=png&trim=colorUnlessAlpha`);
            } else {
              document.querySelector("#fileupload_hero").setAttribute('src', `${ file_url }?fm=png&trim=colorUnlessAlpha`);
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
        w =  $( `#custom_size .widthHeight__block [name="width__value"]` ).val()??$('.product-variants > div:first-of-type input:checked').data("width")??w??0.00;
        h = $( `#custom_size .widthHeight__block [name="height__value"]` ).val()??$('.product-variants > div:first-of-type input:checked').data("height")??h??0.00;
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
  } catch ( err ) {
    console.log( `ERROR executeNextStep__helper`, err.message );
  }
}



document.querySelector('#fileremove').addEventListener('click', function(e) {
  removeFile(e);
});
function removeFile(e = "") {
  if(isPuffPage == true){
   $(".disabled-cta").removeClass("active");
   $(".product-variant__container .__color-option input").prop("checked",false);
     $(".__variant-ink_color").html("");
  }
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

    console.log ( 'dataArr', dataArr );

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
    console.log ( 'isIframeAvailable', isIframeAvailable );
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
  // console.log ( 'main drop zone'  );
  // console.log ( 'e.dataTransfer', e.dataTransfer.files[0] );
  // console.log ( 'document.querySelector', $( `.filepond--browser` ).val() );
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
   uploadFile(file, "second_image"); 
});

secondryDropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  secondryDropZone.classList.remove( `active` );
  document.querySelector(".file-upload-overlay-2").classList.remove("active");
   document.querySelector("body").classList.remove("file-upload-overlay-2-active");
});

}
$( document ).on(`change`, `#secondFile`, function( e ) { 
    e.stopImmediatePropagation();
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
.on(`change`, `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio .product-variant__input`, function( e ) {
  try {
    e.stopImmediatePropagation();
    let typeIs = $( this ).closest( `.product-variant__item.product-variant__item--radio` ).attr( `min` );
    let takeWidth, takeheight;
    console.log ( 'typeIs ----------- Before', typeIs );
    if ( typeof typeIs !== 'undefined' && typeIs ) {
      typeIs = 'custom';
    } else if ( typeof typeIs !== 'undefined' && typeIs == '' ) {
      typeIs = 'popular';
      let takeVal = $( this ).val();
      console.log ( 'takeVal', takeVal );
      takeVal = takeVal.replaceAll( `"`, `` );
      takeVal = takeVal.replaceAll( ` `, `` );
      takeVal = takeVal.toLowerCase();
      calculateDPI( 'popular' );
    } else {
      typeIs = 'notBySize';
    }
    console.log ( 'typeIs ----------------- ', typeIs );
  } catch ( err ) {
    console.log( `ERROR product-variants .product-variant .product-variant__item.product-variant__item--radio .product-variant__input`, err.message );
  }
})
;

function calculateDPI(type = "custom") {
  if ( typeof fileExt !== 'undefined' && fileExt ) {
    if ( fileExt == 'png' || fileExt == 'jpg' || fileExt == 'jpeg' ) {
      let physicalWidthInInches = $(`.widthHeight__value[name="width__value"]`).val();
      let physicalHeightInInches = $(`.widthHeight__value[name="height__value"]`).val();
      let makeSqInchesForPopular, makeSqInchesForCustom, currentSqInches = 0;
      if ( type == 'popular' ) {
        physicalWidthInInches =  Number($( `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio .product-variant__input:checked` ).val().split(" x ")[0].replace('"',''));
        physicalHeightInInches =  Number($( `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio .product-variant__input:checked` ).val().split(" x ")[1].replace('"',''));

        makeSqInchesForPopular = physicalWidthInInches * physicalHeightInInches;
      } else if ( type == 'custom' ) {
        makeSqInchesForCustom = (uploadedFileWidth * uploadedFileHeight) / 72;
        currentSqInches = ( physicalWidthInInches * physicalHeightInInches ) * 72;
      }

      console.log ( 'physicalWidthInInches + physicalHeightInInches', physicalWidthInInches, physicalHeightInInches );

      // Get the pixel dimensions of the image
      const pixelWidth = uploadedFileWidth;
      const pixelHeight = uploadedFileHeight;
      // Calculate DPI
      const dpiWidth = pixelWidth / physicalWidthInInches;
      const dpiHeight = pixelHeight / physicalHeightInInches;
      console.log(`DPI WIDTH ${uploadedFileWidth} -- ${uploadedFileHeight} -- ${dpiWidth} -- ${dpiHeight}`);
      let dpi =  (parseFloat(dpiWidth) + parseFloat(dpiHeight)) / 2;
      console.log(`DPI DPI ${dpi} `);
      console.log(`Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }`);
      if ( type == 'custom' ) {
        if ( makeSqInchesForCustom < 288 ) {
          console.log ( 'con 1 very small size',  );
          $(".dpi_warning").addClass("active");
          $( `.dpi_warning recommended-size` ).text( `Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }` );
        } else if ( makeSqInchesForCustom > 288 && makeSqInchesForCustom > currentSqInches ) {
          console.log ( 'con 2',  );
          $(".dpi_warning").removeClass("active");
        } else {
          console.log ( 'con 3',  );
          $(".dpi_warning").addClass("active");
          $( `.dpi_warning recommended-size` ).text( `Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }` );
        }
      } else if ( type == 'popular' ) {
        console.log ( 'makeSqInchesForPopular', makeSqInchesForPopular );
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
async function alreadyCartItemsFunc() {
  try {
    await ApplyDelay(1000);
    if ( typeof tableDiscountType !== 'undefined' && tableDiscountType == 'cartTotal' ) {
      console.log ( 'alreadyCartItemsFunc() function running',  );
      const getCartTotalObj = await getRequest( `/cart?view=pdpCartObject` );
      if ( typeof getCartTotalObj !== 'undefined' && getCartTotalObj ) {
        getCartTotal = getCartTotalObj.getCartTotal;
        const getTableFirstRowPrice = $( `.customTabelPlaceWrap` ).attr( `base-price` ) * 1;
        let getCalculatedQty = getCartTotal / getTableFirstRowPrice;
        getCalculatedQty__ = Math.floor( getCalculatedQty );
      }
    }

    alreadyCartItems = await getRequest( `/cart?view=pdpCartItem&pid=${ currentPID }` );
    console.log ( 'alreadyCartItems *********************', alreadyCartItems );
    if ( typeof alreadyCartItems !== 'undefined' && alreadyCartItems && typeof alreadyCartItems.qty !== 'undefined' && alreadyCartItems.qty > 0 ) {
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

  // Call Function uploadFile(), And Send To Her The Dropped File :)
  uploadFile(file);
});

// When (drop-zoon) has (click) Event 
uploadArea.addEventListener('click', function (event) {
  // Click The (fileInput)
  fileInput.click();
});

// When (fileInput) has (change) Event 
fileInput.addEventListener('change', function (event) {
  // Select The Chosen File
  $( `#fileupload_hero` ).addClass( `previewFullWidth` );
  const file = event.target.files[0];
  console.log ( 'file.type *******', file.type );
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
  console.log("hii");
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
  const fileReader = new FileReader();
  // File Type
  const fileType = file.type;
 //alert(fileType);
  // File Size
  const fileSize = file.size;

  // If File Is Passed from the (File Validation) Function
  if (fileValidate(fileType, fileSize, file)) {
       if(fileType.indexOf("image/png") > -1 || fileType.indexOf("image/svg+xml")  > -1  || fileType.indexOf("application/") > -1){
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
      // alert("inner"+uploadtype);
      if ( $( `.loadingScreen__` ).length == 0 ) {
        $( `body` ).prepend( `<div class="loadingScreen__"><img src="${ loaderGif }"></div>` );
      }
      document.body.classList.add("processing-second-upload");
      secondryDropZone.classList.remove( `active` );
      document.querySelector(".file-upload-overlay-2").classList.remove("active");
      document.querySelector("body").classList.remove("file-upload-overlay-2-active");
      $( `.anotherTransfer` ).click();
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
      if ( getfileExt == 'psd' || getfileExt == 'eps' || getfileExt == 'ai' || getfileExt == 'pdf'  || getfileExt == 'svg' ) {
        $( `.fileupload_bg_options .style3` ).hide();
        $( `#option_checkbox, #option_checkbox_upscale` ).prop( `checked`, false );
      } else {
        $( `.fileupload_bg_options .style3` ).show();
      }

      console.log("Getting presigned url")
      const presignData = await getPresignedUploadUrl(randomName, file.type);
      console.log(presignData);
      if ( presignData.url ) {
        originalUploadedFileURL = presignData.sourceUrl; 
        const response = await fetch(presignData.url, {
          method: 'PUT',
          body: file
        });
        console.log("upload response: " + JSON.stringify(response));

        let filePath = `https://${ninjaImgixHost}/${randomName}`;
        if (isGangPage){
          filePath = `https://${ninjaImgixHost}/${randomName}`;
          document.querySelector("#fileupload_hero").setAttribute('src', filePath+"?h=300&auto=compress&q=50&fm=png");
        }else{
          document.querySelector("#fileupload_hero").setAttribute('src', `${ filePath }`);
        }
        console.log("Uploaded file url: " + filePath)

        let file_crc = "";
        try {
          const byteArr = await getAsByteArray(file);
          file_crc = (CRC32.buf(byteArr)>>>0).toString(16);
          console.log("file_crc: " + file_crc)
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
  let switchImages = true;
  let time = 3000;
  $(".fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
  $(".easyzoom").addClass("image-loading");
  if($(this).is(":checked") == true){
    console.log('file_url changed due because BG set to TRUE');
    $("#remove_background").val("Yes");
    $(".fileupload_info p strong").html("Cropped size");
    $(".easyzoom,.viewer-box").removeClass("no-bg");
    if(switchImages)
    executeNextStep(applicationFiles, true, true, false, null, true);
  }else{
    console.log('file_url changed due because BG set to FALSE');
    $("#remove_background").val("No");
    $('[href="#custom_size"]').click();
    $(".fileupload_info p strong").html("Original size");
    $(".easyzoom,.viewer-box").addClass("no-bg");
    if(switchImages)
    executeNextStep(applicationFiles, false, false, false, null, true);
  }

 /* setTimeout(function(){
    $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
    $(".easyzoom").removeClass("image-loading");
  },time) */
});

$("#option_checkbox_upscale").on("click", function(){
  let applicationFiles = $(`input[name="properties[Upload (Vector Files Preferred)]"]`).val();
  let switchImages = true;
  let time = 3000;
  $(".fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
  $(".easyzoom").addClass("image-loading");
  if($(this).is(":checked") == true){
    console.log('file_url changed due because UPSCAL set to TRUE');

    $("#super_resolution").val("Yes");
    if(switchImages)
    executeNextStep(applicationFiles, true, true, false, null, true);
  }else{
  console.log('file_url changed due because UPSCAL set to FALSE');

    $("#super_resolution").val("No");
    $('[href="#custom_size"]').click();
    if(switchImages)
    executeNextStep(applicationFiles, false, false, false, null, true);
  }

 /* setTimeout(function(){
    $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
    $(".easyzoom").removeClass("image-loading");
  },time) */
})

// Progress Counter Increase Function
function progressMove(filePath,fileSize = 550) { 
  if(isPuffPage == true){
   $(".disabled-cta").removeClass("active");
   $(".product-variant__container .__color-option input").prop("checked",false);
     $(".__variant-ink_color").html("");
  }
 // document.body.classList.remove('upload-cancel');
   let counter = 0; 
  if(fileSize > 9000000){
    fileSize = 250;
  }else if(fileSize > 7000000){
    fileSize = 150;
  }else if(fileSize > 5000000){
    fileSize = 120;
  }else if(fileSize > 3000000){
     fileSize = 90;
  }else if(fileSize > 1000000){
     fileSize = 80; 
  }else{
     fileSize = 70;
  } 
  fileSize = 50;
  if(filePath == "quick"){
    counter = 99
  }  
  setTimeout(function(){ 
    if(window.innerWidth > 500){
     $('html, body').animate({
           scrollTop: ($("#fileupload_custom").offset().top - 150) 
     }, 500);
    }else{
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

          $('[href="#custom_size"]').click();
          $(".upload_image_info").removeClass("hidden");

          $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
          $(".upload-area__file-details").removeClass("file-details--open");
          $("#uploadedFile").removeClass("uploaded-file--open");
        }
        calculateDPI( `popular` );
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
       let val = $("select.custom-variant-selector.product-variant__container").val().split(" x ")[0].replace('"','');
    
        $(".horizontal_direction span").html(val+`.00"`);
       $(".verticle_direction span").html(`<b style='display:inline-block;line-height:1.6;font-size:9px;'>Proportional<br/>Height</b>`);
    },500);  
});

$(".customOption").on("click", function(){
   setTimeout(function(){ 
   //let size = $(".widthHeight__option-detectedSize [d-size]").html().replace(" x ","x").split("x");
   $(".horizontal_direction span").html(parseFloat($('input[name="width__value"]').val()).toFixed(2)+'"');
   $(".verticle_direction span").html(parseFloat($('input[name="height__value"]').val()).toFixed(2)+'"');
     },500);    
});
  
  if(isGangPage == false){
$("product-variants .product-variants > div:first-of-type input").on("click", function(){
   let size = $(this).val().replace(" x ","x").split("x");
   $(".horizontal_direction span").html(`${ parseFloat(size[0]).toFixed(2)}"`);
        $(".verticle_direction span").html(`<b style='display:inline-block;line-height:1.6;font-size:9px;'>Proportional<br/>Height</b>`);
});
  }   

if(isGangPage){

   $('.product-variants > div:first-of-type  input').on("click", function(){
       
   let size = $(this).data("width");
   let size_r = $(this).data("height");
   $(".horizontal_direction span").html(`${ parseFloat(size).toFixed(2)}"`);
   $(".verticle_direction span").html(`${ parseFloat(size_r).toFixed(2)}"`);
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
   $( `.anotherTransfer` ).click(); 
    toast.classList.add("active");
         // progress.classList.add("active"); 
          timer1 = setTimeout(() => {
            toast.classList.remove("active");
           location.href = nextUrl;
          }, 1500); //1s = 1000 milliseconds
          
  }else{
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
                          console.log("data fetch=>",data); 
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
                                innerData += `<li data-date="${data[i].formatted_date}" data-name="${file_name.toLowerCase()	}"  >
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
                     </li> ` 
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
                           console.log("data=>",data.data); 
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
                                innerData += `<li data-date="${data[i].formatted_date}" data-name="${file_name.toLowerCase()}"  >
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
                     </li> ` 
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
    $( `.anotherTransfer` ).click();
    $("#fileremove").click();
    // field__.clearFiles();

    $( `[name="properties[Design Notes]"]` ).val( `` );
    toast.classList.add("active");
    // progress.classList.add("active");
    timer1 = setTimeout(() => {
    toast.classList.remove("active");
    }, 5000); //1s = 1000 milliseconds
    timer2 = setTimeout(() => {
    //     progress.classList.remove("active");
  }, 5300);
  setTimeout(function(){
    document.body.classList.remove("processing-second-upload");
  },2000)
  }
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

  console.log ( 'datapath', datapath );

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
          scrollTop:  (_this.parents(".image_containers").find(".customer_designes").offset().top - 1800)
        }, 0);
       },400) 
})

$(".nj-popup").on("click", function(e){
   if (e.target !== this)
     return;
   $(this).hide();
});

$(".zoom-box,.zoom_image").on("click", function(e){
  e.preventDefault();
 if(e.target.tagName != "A" || e.target.style.length > 0){
    if($(".easyzoom.zoom-box").hasClass("no-bg")){
      $(".customTabelPopup__overlay-5").removeClass("no-transparant-bg");
    }else{
      $(".customTabelPopup__overlay-5").addClass("no-transparant-bg");
    }
    $(".customTabelPopup__overlay-5 img").attr("src",$(".zoom-box > img").attr("src").replace("h=300&auto=compress&q=50",""));
    $(".customTabelPopup__overlay-5").show();
  }
});

if(location.search.indexOf("force=upload") > -1){
   $("#dropZoon .purchase_from_previous").click();
}
if(location.search.indexOf("force=login") > -1){
   $("#dropZoon .first__upload").click();
}
   /*
$("body").on("click",".template-product-uv-gang-sheet product-form .add-to-cart", function(){
  console.log("btn clicked");
   setTimeout(function(){
location.href = "/cart"
  
},1000) ;

if($("product-form .add-to-cart").hasClass("working")){
     if ( $( `.loadingScreen__` ).length == 0 ) {
                $( `body` ).prepend( `<div class="loadingScreen__"><img src="${ loaderGif }"></div>` );
              }else{
              $( `.loadingScreen__` ).show();
              } 
  let inter = setInterval(function(){
       if($("product-form .add-to-cart").hasClass("working")){
         
       }else{
         clearInterval(inter);
          //location.href = "/cart"
       }
  },100);
}


})  */

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
  // console.log ( 'datapath on load', datapath );
  executeNextStep(datapath, true, true, false);
  uploadedFileName.innerHTML = location.search.split("file=")[1].replace("https://","").split("/")[1];
  const checkPropertyEle = $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).length;
  let getfileExt = datapath.split("?")[0];
      getfileExt = getfileExt.split(".").pop();
  
   if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || datapath.indexOf(".psd") > -1) {
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
  console.log("hi");
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

$("body").on("click",".disabled-cta:not(.active)", function(){
     $(".cl-upload--error").css({"display":"block"});
    $( `html, body` ).animate({
      scrollTop: ($( `product-variants` ).offset().top - 200)
    }, 1000);
});

if(isPuffPage == true){
     $(".product-variant__container .__color-option input").on("click", function(){
         $(".cl-upload--error").css({"display":"none"});
         $(".disabled-cta").addClass("active");
     });
  }

console.log("isPuffPage",isPuffPage)
$("#fileupload_hero").on("load", function() {
     if($(this).attr("src").indexOf("trim=") > -1){
       let inter =  setInterval(function(){
          if($(".uploaded-file__counter").html() == "100%"){
            $(".easyzoom").removeClass("image-loading");
            $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
            clearInterval(inter);
          }
       },100)
        
     }
    });
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