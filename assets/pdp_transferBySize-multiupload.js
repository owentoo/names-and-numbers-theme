let ratio_width   =   0;
let ratio_height  =   0;
let file_width_global = 0; 
let file_height_global = 0;  
let uploadedFileWidth = 0; 
let uploadedFileHeight = 0;
currentSelectedOption = 'custom';          
selectedItemNo = 1;
let customItemHTML = '';
let popularItemHTML = ''; 
var onePercentOfPreview = 11.36363636363636;      
let isReadyToPress = false;
let FILE_DETAILS = "";
let isAIImage = false;
let isFileUpload = false;
let beforeUpScale__Width = 0;
let beforeUpScale__height = 0;
let isFileByURL = false;
let CUSTOM_TAB_CONTAINER = $("#fileupload_custom .custom_tab_container").html();
//console.log(CUSTOM_TAB_CONTAINER);
let anotherTransfer = false;
const apiURL = `https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production`;
const ninjaImgixHost = `ninjauploads-production.imgix.net`;
const ninjaS3Host2 = `ninja-services-production-ninjauploadss3bucket-zks2mguobhe4.s3.amazonaws.com`;
const ninjaS3Host = `ninjauploads-production.imgix.net`;
let lastUploadHeight = 0;
const filePreview = $( `file-preview` );

const uploadArea = document.querySelector('.master-upload  #uploadArea')

/* Guard against drag-drop / "Choose a previous design" triggering an
   upload (and an endless loading screen) on Puff / Spangle when the
   user hasn't picked a color yet. Mirrors the validation that already
   gates the cart-add path so all four entry points behave identically.
   Returns false (and surfaces the error) when color is missing. */
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

// Select Drop-Zoon Area
const dropZoon = document.querySelector('.master-upload #dropZoon');
 

// Slect File Input
const fileInput = document.querySelector('.master-upload #fileInput');
 

// ToolTip Data
const toolTipData = document.querySelector('.master-upload .upload-area__tooltip-data')??"";

let parentContainer = ".master-upload"

let isGangPage = false;
let isDTFPage = false
if(document.body.classList.contains("template-product-dtf-gang-sheet") || document.body.classList.contains("template-product-uv-gang-sheet"))
  isGangPage = true;

if(document.body.classList.contains("is-dtf-page"))
  isDTFPage = true;

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
 $( `.multiupload-popup-right precut-wrapper` ).html($( `.multiupload-popup-right precut-wrapper` ).html().replace("precutselected__","precutselected__2"));
                    $( `body` ).on("click",`.multiupload-popup-right precut-wrapper input`, function(){
                      $("#precutselected__").click();
                    })
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
   manageQuantities("", null, parentContainer);
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
    manageQuantities("", null, parentContainer);
  } catch ( err ) {
    console.log( `ERROR .customQtyFile__wrapper__plus`, err.message );
  }
})

.on(`keyup`, `.customQtyFile__qty`, function( e ) {
  let parentContainer = $(this).data("parent");
  if(parentContainer != ".master-upload"){
    reloadShippingBar();
  }
  try {
    e.stopImmediatePropagation();
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
        if ( getVal == 0 ) {
          $( this ).val( 1 ).addClass( `error` );
        } else {
          $( this ).removeClass( `error` ); 
          manageQuantities("", selectedVariant, parentContainer );
        }
      } else {
        $( this ).val( 1 ).addClass( `error` );
      }
    } else { 
     manageQuantities("", null, parentContainer );
    }
    setTimeout(() => {
      $( this ).removeClass( `error` );
    }, 1500);
  } catch ( err ) {
    console.log( `ERROR .customQtyFile__qty`, err.message );
  }
})

// PLUS MINUS QUANTITY END

.on(`click`, `product-variants .product-variant .product-variant__item.product-variant__item--radio`, function( e ) {
  try {
   
    let parentContainer = $(this).parents("li").attr("id")??".master-upload";
       if(parentContainer != ".master-upload"){
          parentContainer = "#"+parentContainer;
       } 
    e.stopImmediatePropagation();
    setTimeout(()=>{
      const vid = $( `.master-upload [name="id"]` ).val() * 1;
      if ( typeof customTabelManage === 'function' ) {
        customTabelManage( vid, 'applyImg',"", parentContainer );
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
  
    e.stopImmediatePropagation();
   // let parentContainer =  ".master-upload"; 
    // if($(".customTabelPopup__overlay-8").css("display") == "grid"){ }
     let parentContainer = $(this).parents("li").attr("id")??".master-upload";
       if(parentContainer != ".master-upload"){
          parentContainer = "#"+parentContainer;
       }
      if(typeof parentContainer == "undefined")
         parentContainer = ".master-upload"; 
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
        calculateDPI( 'popular', parentContainer );
      }
    } else {
      typeIs = 'notBySize';
    }
  try {
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
    let parentContainer = $(this).data("parent");
    if(parentContainer == ".master-upload"){
    e.stopImmediatePropagation();
    const designNote            =   $( this ).val();
    const isDesignNoteAvailable =   $( parentContainer+` product-form.product-form form textarea[name="properties[Design Notes]"]` ).length;
    if ( isDesignNoteAvailable > 0 ) {
      $( parentContainer+` product-form.product-form form textarea[name="properties[Design Notes]"]` ).val( designNote );
    } else {
      $( parentContainer+` product-form.product-form form` )
        .append( `
          <textarea name="properties[Design Notes]" style="display: none;">${ designNote }</textarea>
        ` );
    }
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
      getVariantsBySize(parentContainer);
      await ApplyDelay( 100 ); 
      manageQuantities( 'btnClicked', null, parentContainer);

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
    if(typeof $(this).parents(".multiupload-files") != "undefined"){
       qty = 0;
       $(".multiupload-files .customQtyFile__qty").each(function(){
          qty += $(this).val() * 1;
       })
    }
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
    await addDelay( 500 );
    readjustSelectedBar();
  } catch ( err ) {
    console.log( `ERROR .customTabelPlace__itemWrapViewAll`, err.message );
  }
})
.on(`click`, `.add-more-block .addmore_size`,async function( e ) {
 
     let parentContainer = $(this).data("parent"); 
    e.stopImmediatePropagation();
    let selectedTab = $( parentContainer+` .tab_header > a[href="#custom_size"].active` ).length;
    if ( selectedTab > 0 ) {
      currentSelectedOption = 'custom';
    } else {
      currentSelectedOption = 'popular';
    }
    const getAlreadyLen = $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).length;

    if ( getAlreadyLen == 0 ) {
      if ( currentSelectedOption == 'custom' && customItemHTML != '' ) {
        $( parentContainer+` sizes-blocks .widthHeight__customHeader` ).after( customItemHTML );
      } else if ( currentSelectedOption == 'popular' && popularItemHTML != '' ) {
        $( parentContainer+` sizes-blocks .add-more-block` ).before( popularItemHTML );
        await addDelay( 100 );
        const getSelectedVal = $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().find( `.popularSizes` ).val();
        $( parentContainer+` product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getSelectedVal }"]` ).click();
      } else {
        addMoreIfNotExist(parentContainer);
      }
    } else {
      const getHTML = $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().clone();
      $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().after( getHTML );
      $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().attr( `qty`, 1 ).find( `.customQtyFile__qty` ).val( 1 ).attr( `value`, 1 );
    }
    $( parentContainer+` sizes-blocks .widthHeight__custom[item]` ).each(function(i) {
      const itemNo = i + 1;
      $( this ).attr( `item`, itemNo );
    })
    selectedItemNo = $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).last().attr( `item` );
    calculateDPILineItem( currentSelectedOption, parentContainer ) 
    manageQuantities("", null, parentContainer );
  try { } catch ( err ) {
    console.log( `ERROR .add-more-block .addmore_size`, err.message );
  }
})
.on(`click`, `.del_item .del_item_cta`, function( e ) {
  let parentContainer = $(this).data("parent");
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
    $( parentContainer+` sizes-blocks .widthHeight__custom[item]` ).each(function(i) {
      $( this ).attr( `item`, `${ i + 1 }` );
    })
    currentSelectedOption = $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
    // selectedItemNo = 1; 
    manageQuantities("", null, parentContainer );
  } catch ( err ) {
    console.log( `ERROR .del_item .del_item_cta`, err.message );
  }
})
// ADD TO CART GROUP START

.on(`click`, `product-form .addToCartGroupItems`,async function( e ) {
 
    e.stopImmediatePropagation();
   var precutqty = pcutqty;
    let items = [];
    let parentContainer = "";
    if($(this).hasClass("._popup")){
      parentContainer = ".multiupload-files"
    }

    const formEle = $( `.product-actions.__manage-space product-form form[data-type="add-to-cart-form"]` );
    const getAllProperties = getFormProperties( formEle, ['Remove Background', 'Super Resolution', 'Precut', '_discount_input', '_discount_name',  'Upload (Vector Files Preferred)', '_Original Image'] );
    let missingSizesFound = 0;
    $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected]` ).each(function(i) {
      let vid;
      
       vid = $( this ).attr( `vid` ) * 1;
      const qty = $( this ).attr( `qty` ) * 1;
      let _title =  $( this ).attr( `title` );
      const cartNote = $( `textarea[name="properties[Design Notes]"]` ).val();
      let properties__;
      const width = $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val();
      const height = $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val();
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
         properties['Upload (Vector Files Preferred)'] = properties__['Upload (Vector Files Preferred)']??$( `.fileupload_hero`).attr("src");
      } else {
        properties['Upload (Vector Files Preferred)'] = $( `.fileupload_hero`).attr("src");
      }
      if ( typeof properties__['_Original Image'] !== 'undefined' && properties__['_Original Image'] ) {
        properties['_Original Image'] = properties__['_Original Image']??$( `.fileupload_hero`).attr("src");
      } else {
        properties['_Original Image'] = $( `.fileupload_hero`).attr("src"); 
      }
      properties['_Original Image'] = properties['Upload (Vector Files Preferred)'].replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
      
      if ( typeof $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() !== 'undefined' && Number($( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val()) > 0 && typeof $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() !== 'undefined' && Number($( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val()) > 0 ) {
        properties['_Size'] = `${ $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() }x${ $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() }`;
      }else if(typeof $( this ).find( `.popularSizes` ).val() !== 'undefined' && $( this ).find( `.popularSizes` ).val().indexOf(" x ") > -1 ){
         properties['_Size'] =  $( this ).find( `.popularSizes` ).val()
      }
      
      const dpiWarning = $( this ).find( `dpi-warning` ).hasClass( `active` );
      if ( typeof dpiWarning !== 'undefined' && dpiWarning ) {
        properties[`DPI Warning`] = `Yes`;
      }
      if ( isReadyToPress ) {
        properties['_Ready to Press'] = `Yes`;
      }
      // Spangle Colors — the spangle picker is rendered once globally
      // (snippets/__multipleSnippets.liquid contentFor='spangle'), so
      // every line item in the cart-add batch reads the same selected
      // colors. Without this, line items uploaded through the multi-
      // upload path land in the cart with no Spangle Colors property
      // attached.
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
   let proccessNext = false;
    if(typeof properties['_Size'] != "undefined"){
          proccessNext = true;
    }
    if(typeof properties['_Size'] == "undefined"){
        missingSizesFound++;
      }
    if ( typeof isAIImage !== 'undefined' && isAIImage ) {
        properties['AI Created'] = 'Yes';
      }

      if(typeof properties['Upload (Vector Files Preferred)'] != "undefined" && typeof properties['_Original Image'] != "undefined"  && properties['_Original Image'].indexOf("transparent.png") == -1  && proccessNext == true){
        if(properties['Upload (Vector Files Preferred)'].indexOf("https") > -1){

            items.push({
              id: vid,
              quantity: qty,
              properties
            });
        }
      }
    })
     if(missingSizesFound != 0){
        $(".missing_size_error").addClass("_active");
       setTimeout(function(){
           $(".missing_size_error").removeClass("_active");
           location.reload();
       },3500)
     }
    if ( items.length > 0 ) {
      const readyToPress = getFormProperties( formEle, ['_Ready to Press'] );
      // const attributes = readyToPress;
      const attributes = '';

      $( `body` )
      .append( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
      let rtn;
      await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items, attributes }),
      })
      .then((response) => {
        rtn = response.json();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
      refreshCart( 'notOpen' );
      resetAll();
      if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect && typeof anotherTransfer !== 'undefined' && anotherTransfer == false ) {
        location.href = `/cart`;
        await addDelay( 3000 );
        $( `.loadingScreen__` ).remove();
      } else if ( anotherTransfer == true ) {
      } else {
        await addDelay( 1000 );
        $( `.loadingScreen__` ).remove();
      }
    }
 try {  } catch ( err ) {
    console.log( `ERROR product-form .addToCartGroupItems`, err.message );
  }
}).on(`click`, `.addToCartGroupItems_popup`,async function( e ) {
   var precutqty = pcutqty;
   // e.stopImmediatePropagation();
    let items = [];
    let parentContainer = "";
    
      parentContainer = $(".multiupload-files");
    

    const formEle = parentContainer; 
    let missingSizesFound = 0;
   $(`.multiupload-files > li`).each(function(j) {
     j++;
     let _id = $(this).attr("id");
    const getAllProperties = getFormProperties( $( `#${_id}`), ['Design Notes','Remove Background', 'Super Resolution', 'Precut', '_discount_input', '_discount_name',  'Upload (Vector Files Preferred)', '_Original Image'] );
      
    $( `#${_id}  .widthHeight__custom[item][option-selected]` ).each(function(i) { 
      let vid;
     
       vid = $( this ).attr( `vid` ) * 1;
     let _title =  $( this ).attr( `title` );
      
      const qty = $( this ).attr( `qty` ) * 1;
      const cartNote = $( `textarea[name="properties[Design Notes]"]` ).val();
      let properties__;
      const width = $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val();
      const height = $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val();
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
      
    if ( typeof properties__['Design Notes'] !== 'undefined' && properties__['Design Notes'] ) {
        properties['Design Notes'] = properties__['Design Notes'];
      } else {
        delete properties['Design Notes'];
      }

        if ( typeof properties__['Precut'] !== 'undefined' && properties__['Precut'] ) {
        properties['Precut'] = properties__['Precut'];
        if(properties['Precut'] == "Yes"){
          precutqty += qty
        }
      } else {
        delete properties['Precut'];
      }
     // properties['Design Notes'] = cartNote;

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
         properties['Upload (Vector Files Preferred)'] = properties__['Upload (Vector Files Preferred)']??$( `#${_id} .fileupload_hero`).attr("src");
      } else {
        properties['Upload (Vector Files Preferred)'] = $( `#${_id} .fileupload_hero`).attr("src");
      }
      if ( typeof properties__['_Original Image'] !== 'undefined' && properties__['_Original Image'] ) {
        properties['_Original Image'] = properties__['_Original Image']??$( `#${_id} .fileupload_hero`).attr("src");
      } else {
        properties['_Original Image'] = $( `#${_id} .fileupload_hero`).attr("src"); 
      }
      properties['_Original Image'] = properties['Upload (Vector Files Preferred)'].replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
      
     if ( typeof $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() !== 'undefined' && Number($( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val()) > 0 && typeof $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() !== 'undefined' && Number($( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val()) > 0 ) {
        properties['_Size'] = `${ $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() }x${ $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() }`;
      }else if(typeof $( this ).find( `.popularSizes` ).val() !== 'undefined' && $( this ).find( `.popularSizes` ).val().indexOf(" x ") > -1 ){
         properties['_Size'] =  $( this ).find( `.popularSizes` ).val()
      }
      const dpiWarning = $( this ).find( `dpi-warning` ).hasClass( `active` );
      if ( typeof dpiWarning !== 'undefined' && dpiWarning ) {
        properties[`DPI Warning`] = `Yes`;
      }
      if ( isReadyToPress ) {
        properties['_Ready to Press'] = `Yes`;
      }
      // Spangle Colors — same global picker as the inline handler
      // above. Multi-upload popup line items were landing in the cart
      // without the colors property; mirror the single-upload spangle
      // serialization here so every uploaded design carries its
      // selected colors.
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

       let proccessNext = false;
    if(typeof properties['_Size'] != "undefined"){
          proccessNext = true;
    }

       if(typeof properties['_Size'] == "undefined"){
        missingSizesFound++;
      }

      if(typeof properties['Upload (Vector Files Preferred)'] != "undefined" && typeof properties['_Original Image'] != "undefined"  && properties['_Original Image'].indexOf("transparent.png") == -1  && proccessNext == true){
        if(properties['Upload (Vector Files Preferred)'].indexOf("https") > -1){
          if(vid != null)
            items.push({
              id: vid,
              quantity: qty,
              properties
            });
        }
      }
    })
  });
    if(missingSizesFound != 0){
        $(".missing_size_error").addClass("_active");
       setTimeout(function(){
           $(".missing_size_error").removeClass("_active");
       },3500)
     }
    if ( items.length > 0 ) {
      const readyToPress = getFormProperties( formEle, ['_Ready to Press'] );
      // const attributes = readyToPress;
      const attributes = '';

      $( `body` )
      .append( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
      let rtn;
      await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items, attributes }),
      })
      .then((response) => {
        rtn = response.json();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
      refreshCart();
      resetAll();
      if ( typeof afterAddtoCart_goCart_redirect !== 'undefined' && afterAddtoCart_goCart_redirect && typeof anotherTransfer !== 'undefined' && anotherTransfer == false ) {
        location.href = `/cart`;
        await addDelay( 3000 );
        //$( `.loadingScreen__` ).remove();
      } else if ( anotherTransfer == true ) {
      } else {
        await addDelay( 1000 );
        //$( `.loadingScreen__` ).remove();
      }
    }
 try {  } catch ( err ) {
    console.log( `ERROR product-form .addToCartGroupItems`, err.message );
  }
})
// ADD TO CART GROUP END
.on(`focus`, `sizes-blocks .widthHeight__value, sizes-blocks .customQtyFile__qty, sizes-blocks .popularSizes`, function( e ) {
  
    let parentContainer = $(this).data("parent");
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    $( this ).select();
    setImageDimensions(parentContainer);
  try { } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__value, sizes-blocks .customQtyFile__qty`, err.message );
  }
})
  .on(`click`, `sizes-blocks .widthHeight__custom.disabled[option-selected]`, function( e ) {
  try {
     let parentContainer = $(this).data("parent");
    e.stopImmediatePropagation();
    const tabIs = $( this ).attr( `option-selected` );
    const activeTabIs = $( parentContainer+` .size_selection .custom_tabs .tab_header a.active` ).attr( `href` );
    if ( tabIs == 'custom' && activeTabIs == '#popular_size' ) {
      console.log ( 'tab active popular', activeTabIs );
      $( parentContainer+` .size_selection .custom_tabs .tab_header a[href="#custom_size"]` ).click();
    } else if ( tabIs == 'popular' && activeTabIs == '#custom_size' ) {
      console.log ( 'tab active custom', activeTabIs );
      $( parentContainer+` .size_selection .custom_tabs .tab_header a[href="#popular_size"]` ).click();
    }
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__custom.disabled[option-selected="custom"]`, err.message );
  }
})
.on(`change`, `sizes-blocks .widthHeight__item__popular .popularSizes`,async function( e ) {
  try {
    let parentContainer = $(this).data("parent");
    e.stopImmediatePropagation();
    const getVal = $( this ).val();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    $( this ).closest( `.widthHeight__item__popular` ).find( `.popularSizes option` ).removeAttr( `selected` );
    console.log ( 'getVal', getVal );
    if ( typeof getVal !== 'undefined' && getVal ) {
      $( this ).find( `option[value="${ getVal }"]` ).attr( `selected`, `selected` );
      $( parentContainer +` product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getVal }"]` ).click();
    }
    const getItemsLen = $( parentContainer +` sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).length;
    if ( getItemsLen == 1 ) {
      await addDelay( 1000 );
      const isPreCutActive = $( `#precutselected__` ).is( `:checked` );
      let getValText = $( parentContainer +` product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getVal }"]` ).text().trim();
      const temp_variant = findObjectByKey( allVariants, 'option1', getValText, true );
      console.log ( 'getValText', getValText );
      if ( typeof temp_variant !== 'undefined' && temp_variant && temp_variant.length > 0 ) {
        temp_variant.forEach(el => {
          if ( typeof el.option2 !== 'undefined' && el.option2 && el.option2.includes( `No` ) ) {
            $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"][option-selected="popular"]` ).attr({
              "vid": el.id,
              "price": el.price
            });
          } else if ( typeof el.option2 !== 'undefined' && el.option2 && el.option2.includes( `Yes` ) ) {
            $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"][option-selected="popular"]` ).attr({
              "precut-vid": el.id,
              "precut-price": el.price
            });
          } else {
            $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"][option-selected="popular"]` ).attr({
              "vid": el.id,
              "title": el.title,
              "price": el.price
            });
          }
        });
        updatedPriceLogic(null, parentContainer);
      }
    }
    if ( parentContainer == '.master-upload' ) {
      $( `${ parentContainer } file-preview .horizontal_direction` ).attr( `x-is`, `${ getVal.split( `^` )[0] }` );
    }
    calculateDPILineItem( `popular`, parentContainer );
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__item__popular .popularSizes`, err.message );
  }
})
.on(`change`, `#precutselected__`, function( e ) {
  try {
    const isPreCutActivated = $( `#precutselected__` ).is( `:checked` );
    let preCutOptionText = '';
    
    if ( isPreCutActivated ) {
      $("product-form.product-form form .is_precut").val("Yes");
      $('.precut-cost').removeClass("nodisplay");
      //preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
    } else {
      $("product-form.product-form form .is_precut").val("No");
      $('.precut-cost').addClass("nodisplay");
      //preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
    }
    
  } catch ( err ) {
    console.log( `ERROR #precutselected__`, err.message );
  }
})

function resetAll() {
  try {
    selectedItemNo = 1;
    isReadyToPress = false;
     isAIImage = false;
    $( `.master-upload a#custom_size` ).click();
    $( `.master-upload #precutselected, #precutselected__` ).prop( `checked`, false );
    $( `.master-upload sizes-blocks .widthHeight__custom[item]` ).each(function(i) {
      if ( i != 0 ) {
        $( this ).remove();
      }
    })
    if ( typeof anotherTransfer !== 'undefined' && anotherTransfer ) {
      const isCustomItemEleAvailable = $( `.master-upload sizes-blocks .widthHeight__custom[option-selected="custom"]` ).length;
      if ( isCustomItemEleAvailable == 0 ) {
        $( `.master-upload sizes-blocks .widthHeight__custom[item]` ).remove();
        $( `.master-upload sizes-blocks .widthHeight__customHeader` ).after( customItemHTML );
        $( `sizes-blocks .widthHeight__custom[item]` ).attr( `item`, 1 );
        selectedItemNo = 1;
      }
    }
    $( `.master-upload textarea[name="properties[Design Notes]"]` ).val( `` );
    $( `.master-upload #designer_notes` ).prop( `checked`, false );
  } catch ( err ) {
    console.log( `ERROR resetAll`, err.message );
  }
}


function addMoreIfNotExist(parentContainer = ".master-upload") {
 
    const checkCurrentSelectedOptionItem = $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).length;
    if ( checkCurrentSelectedOptionItem == 0 ) {
      const getAlreadyLen = $( parentContainer+` sizes-blocks .widthHeight__custom[item]` ).length;
      const getHTML = $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ getAlreadyLen }"]` ).clone();
      $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ getAlreadyLen }"]` ).after( getHTML );
      $( parentContainer+` sizes-blocks .widthHeight__custom[item]` )
        .last()
        .attr({"item": getAlreadyLen + 1,"option-selected": currentSelectedOption, "qty": 1 })
        .find( `.customQtyFile__qty` )
        .val( 1 )
        .attr( `value`, 1 );
      selectedItemNo = getAlreadyLen + 1;
      if ( currentSelectedOption == 'popular' ) {
        modifyPopularItem(parentContainer);
      } else if ( currentSelectedOption == 'custom' ) {

      } 
      manageQuantities("", null, parentContainer );
    }
  try { } catch ( err ) {
    console.log( `ERROR addMoreIfNotExist()`, err.message );
  }
}


function modifyPopularItem(parentContainer = ".master-upload") {

  $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).remove();
    $( parentContainer+`sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).removeClass( `active` );

    
      if ( typeof allPopularVariants !== 'undefined' && allPopularVariants ) {
        $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
          .prepend( `
            <div class="widthHeight__item__popular">
              <select class="popularSizes" data-parent="${parentContainer}"></select>
            </div>
          ` );
          allPopularVariants.forEach(size => {
          let sizeOption = size.option1;
          if ( sizeOption.includes( `"` ) ) {
            sizeOption = sizeOption.replaceAll(  `"`, `^`  );
          }
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` )
            .append( `
              <option value='${ sizeOption }' vid="${ size.id }">${ size.option1 }</option>
            ` );
        });
      }
  
  /*  $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).remove();
    $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).removeClass( `active` );
    const refinedPopularList = findObjectByKey( allPopularVariants, `option2`, `No - Leave in a roll`, true ); 
    if ( typeof refinedPopularList !== 'undefined' && refinedPopularList ) {
      $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
        .prepend( `
          <div class="widthHeight__item__popular">
            <select class="popularSizes" data-parent="${parentContainer}"></select>
          </div>
        ` );
      refinedPopularList.forEach(size => {
        let sizeOption = size.option1;
        if ( sizeOption.includes( `"` ) ) {
          sizeOption = sizeOption.replaceAll(  `"`, `^`  );
        }
        $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` )
          .append( `
            <option value='${ sizeOption }' vid="${ size.id }">${ size.option1 }</option>
          ` );
      });
    }
  */
  try {  } catch ( err ) {
    console.log( `ERROR modifyPopularItem()`, err.message );
  }
}


function getFormProperties( mainSelector=null, propertiesArr=null ) {

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
   try { } catch ( err ) {
    console.log( `ERROR getFormProperties`, err.message );
  }
}


function removeUploadError() {

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
      if ( typeof reCalculateFreeShippingModule === 'function' ) {
        reCalculateFreeShippingModule();
      }
    }, 2000);
   try { } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function updatePropotionalSizes(parentContainer = ".master-upload") { 
    const isSizesBlock = $( parentContainer +` sizes-blocks` ).length;
    if ( isSizesBlock > 0 ) {
      const isPreCutActivated = $( `#precutselected__` ).is( `:checked` );
      const by = `width`;
      const getRatio = getNewRatio( parentContainer +` .fileupload_hero`, by );

      $( parentContainer +` sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).each(function( i ) {
        const getVal = $( this ).find( `.widthHeight__value[name="width__value"]` ).val() * 1;

        const newVal = calculateNewWidth_orNewHeight(getRatio, by, getVal);

        $( this ).find( `.widthHeight__value[name="height__value"]` ).val( newVal.toFixed( 2 ) );


        const getWidth = getVal;
        const getHeight = newVal;
        const currentSquareInches__ = Math.ceil( getWidth * getHeight );

        let sizeVariantOptionText = '';
        $( parentContainer +` product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
          const min = $( this ).attr( `min` ) * 1;
          const max = $( this ).attr( `max` ) * 1;
          if ( currentSquareInches__ >= min && currentSquareInches__ <= max ) {
            // isVariantMatched  =   true;
            sizeVariantOptionText = $( this ).find( `label` ).text().trim();
          }
        })
        let preCutOptionText = '';
        if ( isPreCutActivated ) {
           $(parentContainer +" product-form.product-form form .is_precut").val("Yes");
         // preCutOptionText = $( parentContainer +` product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
        } else {
           $(parentContainer +" product-form.product-form form .is_precut").val("No");
         // preCutOptionText = $( parentContainer +` product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
        } 
        const makeTitle = `${ sizeVariantOptionText } / ${ preCutOptionText }`;
        // const getVID = $( `product-form [name="id"]` ).val() * 1;
        const selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );
        let currentVariant__;
        if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
          currentVariant__ = selectedVariant__;

         let simpleVariant,getPrecutVariant;
          simpleVariant = currentVariant__;
          
      /*    if ( currentVariant__.option2.includes( `Yes` ) ) {
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


        // const item = $( this ).closest( `.widthHeight__custom[item]` );
        // selectedItemNo = item.attr( `item` );
        // let getVal = $( this ).val() * 1;
        // let by = $( this ).closest( `.widthHeight__item__action` ).attr( `by` );
        // if ( getVal > userDefinedMaxLength ) {
        //   $( this ).val( userDefinedMaxLength ).addClass( `error` );
        //   getVal = userDefinedMaxLength;
        // }

        // const newVal = calculateNewWidth_orNewHeight(getRatio, by, getVal);

        // if ( newVal > userDefinedMaxLength ) {
        //   if ( by == 'width' ) {
        //     item.find( `.widthHeight__item__action[by="height"] .widthHeight__value` ).val( userDefinedMaxLength ).attr( `value`, userDefinedMaxLength ).addClass( `error` );

        //     const getRatio = getNewRatio( `#fileupload_hero`, 'height' );

        //     const newVal = calculateNewWidth_orNewHeight(getRatio, 'height', userDefinedMaxLength);
        //     item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `error` );
        //   } else if ( by == 'height' ) {
        //     item.find( `.widthHeight__item__action[by="width"] .widthHeight__value` ).val( userDefinedMaxLength ).attr( `value`, userDefinedMaxLength ).addClass( `error` );
        //     const getRatio = getNewRatio( `#fileupload_hero`, 'width' );
        //     const newVal = calculateNewWidth_orNewHeight(getRatio, 'width', userDefinedMaxLength);
        //     item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `error` );
        //   }
        // } else {
        //   if ( by == 'width' ) {
        //     item.find( `.widthHeight__item__action[by="height"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) );
        //   } else if ( by == 'height' ) {
        //     item.find( `.widthHeight__item__action[by="width"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) );
        //   }
        // }

        // setTimeout(() => {
        //   item.find( `.widthHeight__item__action .widthHeight__value` ).removeClass( `error` );
        // }, 1500);





      // $( `sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).each(function() {
        // const getWidth = $( this ).find( `.widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
        // const getHeight = $( this ).find( `.widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
        // const currentSquareInches__ = Math.ceil( getWidth * getHeight );

        // let sizeVariantOptionText = '';
        // $( `product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
        //   const min = $( this ).attr( `min` ) * 1;
        //   const max = $( this ).attr( `max` ) * 1;
        //   if ( currentSquareInches__ >= min && currentSquareInches__ <= max ) {
        //     // isVariantMatched  =   true;
        //     sizeVariantOptionText = $( this ).find( `label` ).text().trim();
        //     console.log ( 'matched variant option1', $( this ).find( `label` ).text().trim() );
        //   }
        // })
        // let preCutOptionText = '';
        // if ( isPreCutActivated ) {
        //   preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
        // } else {
        //   preCutOptionText = $( `product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
        // }

        // const makeTitle = `${ sizeVariantOptionText } / ${ preCutOptionText }`;
        // // const getVID = $( `product-form [name="id"]` ).val() * 1;
        // const selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );
        // if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
        //   currentVariant = selectedVariant__;

        //   console.log ( 'currentVariant chaaaaaaaa', currentVariant );
        // }
      // })
    // }
     setTimeout(() => {
      $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__value` ).trigger('keyup');
    }, 1500);
 try {  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

async function manageQuantities( type = '', currentVariant = null, parentContainer = ".master-upload" ) { 
    let masterContainer =  null; 
     if($(".customTabelPopup__overlay-8").css("display") == "grid"){
       masterContainer =  ".customTabelPopup__overlay-8";
     }
    const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
    if ( isSizesBlock > 0 && currentSelectedOption == 'custom' ) {
      const getWidth    =   $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      const getHeight   =   $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
      currentSquareInches =   Math.ceil( getWidth * getHeight );

      let sizeVariantOptionText = '';
      $( parentContainer+` product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
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
          $("product-form.product-form form .is_precut").val("Yes")
        } else {
          $("product-form.product-form form .is_precut").val("No")
        }
      }
      

      //const makeTitle = `${ sizeVariantOptionText }${ preCutOptionText != '' ? ` / ${ preCutOptionText }` : '' }`;
      const makeTitle = `${ sizeVariantOptionText }${ preCutOptionText != '' ? `` : '' }`;
      // const getVID = $( `product-form [name="id"]` ).val() * 1;
      const selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );

      
      if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
        currentVariant = selectedVariant__;
      }
      calculateDPILineItem( 'custom', parentContainer );
    } else if ( isSizesBlock > 0 && currentSelectedOption == 'popular' && type == 'del' ) {
      console.log ( 'before currentVariant', currentVariant );
      if ( currentVariant === null ) {
        const getVID = $( parentContainer +` .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `vid` ) * 1;
        const selectedVariant__ = findObjectByKey( allVariants, `id`, getVID );
        if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
          currentVariant = selectedVariant__;
        }
      }
      console.log ( 'after currentVariant', currentVariant );
    } else if ( isSizesBlock > 0 && currentSelectedOption == 'popular' && typeof isDTFPage !== 'undefined' && isDTFPage ) {
      console.log ( 'before currentVariant', currentVariant );
      if ( currentVariant === null ) {
        const getVID = $( parentContainer +` .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `vid` ) * 1;
        const isPopularActive = $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
        if ( isPopularActive == 'popular' ) {
          const optionVal = $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` ).val();
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
    }    else {
      if ( currentVariant === null ) {
        // console.log ( 'mage chaaaaaaaaa',  );
        const getVID = $( `.master-upload product-form [name="id"]` ).val() * 1;  
        let selectedVariant__ = findObjectByKey( allVariants, `id`, getVID );
         if(parentContainer != ".master-upload"){
                         let sizeVariantOptionText =  $( parentContainer +` product-variants .product-variant[option="1"] input:checked`).val();  
                          let preCutOptionText = '';
           const isPreCutActivated = $( `#precutselected__` ).is( `:checked` );
                          if ( isPreCutActivated ) {
                            preCutOptionText = $( parentContainer +` product-variants .product-variant[option="2"] .product-variant__item` ).last().find( `.product-variant__input` ).val();
                          } else {
                            preCutOptionText = $( parentContainer +` product-variants .product-variant[option="2"] .product-variant__item` ).first().find( `.product-variant__input` ).val();
                          }
                        const makeTitle = `${ sizeVariantOptionText } / ${ preCutOptionText }`;
                      //  alert("makeTitle " + makeTitle);
                         selectedVariant__ = findObjectByKey( allVariants, `title`, makeTitle );
                      } 
        if ( typeof selectedVariant__ !== 'undefined' && selectedVariant__ ) {
          currentVariant = selectedVariant__;
        }
      }
    }

    // console.log ( 'currentVariant', currentVariant );

    const isCustomTablePlaceAvailable = $( `.customTabelPlaceWrap` ).length;
    if ( isCustomTablePlaceAvailable > 0 && typeof currentVariant !== 'undefined' && currentVariant ) { 
      $( `.customTabelPlaceWrap` ).attr( `base-price`, currentVariant.price );
      const checkItemLen = $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectedOption }"]` ).length;
      if ( checkItemLen > 0 ) {
        let simpleVariant, precutVariant;
        let preCutSelector = "Yes - Pre cut";
       // if(currentSelectedOption == "popular")
           //preCutSelector = "Yes - Pre cut ($0.30 extra each)";
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
            const getPrecutVariant = findObjectByKey( temp_variant, `option2`, preCutSelector ); 
            if ( typeof getPrecutVariant !== 'undefined' && getPrecutVariant ) {
              precutVariant = getPrecutVariant;
            }
          }
        }
        else {
          simpleVariant = currentVariant;
        }

        if ( currentSelectedOption == 'custom' && $( parentContainer+` .tab_header > a[href="#custom_size"].active` ).length > 0 ) {
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
             .attr({
              "title": simpleVariant.title,
              "vid": ( typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.id !== 'undefined' && simpleVariant.id ? simpleVariant.id : '' ),
              "precut-vid": ( typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.id !== 'undefined' && precutVariant.id ? precutVariant.id : '' ),
              "price": ( typeof simpleVariant !== 'undefined' && simpleVariant && typeof simpleVariant.price !== 'undefined' && simpleVariant.price ? simpleVariant.price : '' ),
              "precut-price": ( typeof precutVariant !== 'undefined' && precutVariant && typeof precutVariant.price !== 'undefined' && precutVariant.price ? precutVariant.price : '' ),
              "option-selected": currentSelectedOption
            });
        } else if ( currentSelectedOption == 'popular' && $( parentContainer+` .tab_header > a[href="#popular_size"].active` ).length > 0 ) {
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` )
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
      $( parentContainer+` product-variants popular-wrap` ).hide();
      if(masterContainer == null){
      $( parentContainer+` sizes-blocks .widthHeight__custom[item]` ).each(function() {
        const itemQty = $( this ).find( `.customQtyFile__qty` ).val() * 1;
        $( this ).attr( `qty`, itemQty );
        qty += itemQty;
      })
      }else{
        $( parentContainer+` sizes-blocks .widthHeight__custom[item]` ).each(function() {
        const itemQty = $( this ).find( `.customQtyFile__qty` ).val() * 1;
        $( this ).attr( `qty`, itemQty ); 
      }) 
        let getQty = 0; 
        $('.multiupload-files .customQtyFile__qty').each(function () { 
           getQty += Number($(this).val());
          }); 
        
         qty = getQty
       //  console.log("qty2=>",qty,getQty,alreadyCartItems[0].qty)
      }
      const getItemsLen = $( parentContainer+` sizes-blocks .widthHeight__custom[item]` ).length;
      if ( getItemsLen == 1 ) {
        $( parentContainer+` sizes-blocks .widthHeight__custom[item] .del_item` ).css({'opacity': 0, 'visibility': 'hidden'});
      } else {
        $( parentContainer+` sizes-blocks .widthHeight__custom[item] .del_item` ).removeAttr( `style` );
      }
    } else {
      qty = $( parentContainer+` .customQtyFile__qty` ).val();
    }
   if(masterContainer == null){
    if ( qty == '' ) {
      qty = 0;
    } else {
      qty = +qty;
    }
   
    if ( typeof getCalculatedQty__ !== 'undefined' && getCalculatedQty__ > 0 ) {
      qty = qty + getCalculatedQty__;
    }
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

    const isQtyEle = $( parentContainer+` .form__properties input[name="quantity"]` ).length;
    if ( isQtyEle > 0 ) {
      $( parentContainer+` .form__properties input[name="quantity"]` ).val( qty );
    } else {
      $( parentContainer+` .form__properties` ).append( `<input type="hidden" name="quantity" value="${ qty }">` );
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
        newQty = selectedCartItem[0].qty + qty; 

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
        if ( cart__msg.includes ( '[QTY]' ) ) {
          const takeNextMin = $( `.customTabelPlace .customTabelPlace__item.selected` ).next( `.customTabelPlace__item` ).attr( `min` );
          if ( typeof takeNextMin !== 'undefined' && takeNextMin ) {
            cart__msg = cart__msg.replace( `[QTY]`, getCumulativeQty(0, newQty, maxQtyOfRow) );
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
    if ( typeof imgPreview_priceTable !== 'undefined' && imgPreview_priceTable ) {
      newPriceTableLogic( selectedIndex, currentVariant, parentContainer );
    }
    manageProperties(parentContainer);
 try {  } catch ( err ) {
    console.log( `ERROR manageQuantities`, err.message );
  }
}


function readjustSelectedBar() {
 
     let parentContainer =  ".master-upload"; 
     if($(".customTabelPopup__overlay-8").css("display") == "grid"){
       parentContainer =  ".customTabelPopup__overlay-8";
     }
    const getHeight = $( parentContainer+` .customTabelPlace .customTabelPlace__item.selected` ).outerHeight();
    let getTopPosition = $( parentContainer+` .customTabelPlace .customTabelPlace__item.selected` ).position();

    if ( typeof getTopPosition !== 'undefined' && getTopPosition ) {
      getTopPosition = getTopPosition.top;
    }

    $( parentContainer+` .customTabelPlace__item__selectedBar` ).css({
      "top": `${ getTopPosition }px`,
      "height": `${ getHeight }px`
    }); 
  try { } catch ( err ) {
    console.log( `ERROR readjustSelectedBar()`, err.message );
  }
}


function newPriceTableLogic( selectedIndex, currentVariant, parentContainer = ".master-upload" ) { 

    let selectionType, currentWidth, currentHeight = '';
    const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
    const selectedTabIs = $(  parentContainer+` [data-id="size_selection"] .tab_header a.active` ).text().trim();
    if ( selectedTabIs.includes( `Custom` ) ) {
      selectionType = 'custom';
    } else {
      selectionType = 'popular';
    } 
    let precutOption;
    let getQty = 0;
    
    if ( isSizesBlock > 0 ) {
      precutOption = $(  `.precutWrapper #precutselected__` ).prop( `checked` );
      
      if(parentContainer != ".master-upload"){
        let qty = 0;
        $('.multiupload-files .customQtyFile__qty').each(function () { 
           getQty += Number($(this).val());
          });
       if(typeof alreadyCartItems[0] != "undefined")
            qty = getQty + alreadyCartItems[0].qty;
        else
          qty = getQty
       // console.log("qty22=>",qty,getQty,alreadyCartItems[0].qty);
        
      }else{
        getQty = $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic [name="quantity"]` ).val() * 1;
      }
    } else {
      precutOption = $( `.precutWrapper #precutselected` ).prop( `checked` );
      getQty = $(  ` precut-unit-logic [name="quantity"]` ).val() * 1;
    }
    let currentVariantPrice =  0;
    if(currentVariant.price && typeof currentVariant.price != "undefined")
        currentVariantPrice = currentVariant.price;
  
    selectedIndex = selectedIndex??1;
    if ( isSizesBlock > 0 ) {
      
      const discountedPercent = ($( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `off` )??0) * 1;
    // alert(currentVariantPrice+"---"+discountedPercent);
      $(  ` precut-unit-logic .precut-unit-logic__discount span` ).html( `${ discountedPercent != 0 ? `${ discountedPercent }% off` : '&nbsp;' }` );
      if($(  ` precut-unit-logic .precut-unit-logic__discount span` ).html() == "&nbsp;"){
        
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "8px","opacity":0});
        // $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__originalPrice ` ).hide();
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] popular-wrap price-calc .__discountedPrice` ).css({"position": "relative", "top": "-12px"});
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .price-calc__x,.price-calc__equal` ).css({"margin-top": "8px"});
        // $(".precut-unit-logic__discount").css({"margin-top": "24px"});
      } else{
        
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "14px","opacity":1});
        // $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).show();
        $( ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] popular-wrap price-calc .__discountedPrice`).css({"position": "static"});
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .price-calc__x,.price-calc__equal` ).css({"margin-top": "8px"});
        // $(".precut-unit-logic__discount").css({"margin-top": "24px"});
      }
      const discountAmount = (currentVariantPrice * discountedPercent) / 100;
      const finalPrice = currentVariantPrice - discountAmount;
      if ( selectionType == 'custom' ) {
        /* square inches Price Calculations */
        // $( `precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ ( currentVariant.price / currentSquareInches ).toFixed( 3 ) }` );
        // $( `precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).text( `$${ ( ( ( currentVariant.price - ( currentVariant.price * discountedPercent ) / 100 ) ) / currentSquareInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
    
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ currentVariantPrice }` );
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).text( `$${ ( ( ( currentVariantPrice - ( currentVariantPrice * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( currentVariantPrice * getQty ).toFixed( 2 ) }` );
        $(  ` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      } else if ( selectionType == 'popular' ) {
        let popularSqInches = currentVariant.option1.toLowerCase();
        popularSqInches = popularSqInches.replaceAll( '"', '' );
        if ( popularSqInches.includes( `x` ) ) {
          currentWidth = popularSqInches.split( `x` )[0] * 1;
          currentHeight = popularSqInches.split( `x` )[1] * 1;
          popularSqInches = currentWidth * currentHeight;
        }

        /* square inches Price Calculations */
        $(  ` price-calc .price-calc__priceIn .__originalPrice` ).text( `$${ ( currentVariantPrice / popularSqInches ).toFixed( 3 ) }` );
        $(  ` price-calc .price-calc__priceIn .__discountedPrice` ).text( `$${ ( ( ( currentVariantPrice - ( currentVariantPrice * discountedPercent ) / 100 ) ) / popularSqInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
        $(  ` price-calc .price-calc__each .__originalPrice` ).text( `$${ currentVariantPrice }` );
        $(  ` price-calc .price-calc__each .__discountedPrice` ).text( `$${ ( ( ( currentVariantPrice - ( currentVariantPrice * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $(  ` precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( currentVariantPrice * getQty ).toFixed( 2 ) }` );
        $(  ` precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      }

      updatedPriceLogic( selectedIndex, parentContainer );

    } else {
      const discountedPercent = ($( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `off` )??0) * 1;
      $(  ` precut-unit-logic .precut-unit-logic__discount` ).html( `${ discountedPercent != 0 ? `${ discountedPercent }% off` : '&nbsp;' }` );
      if($(  ` precut-unit-logic .precut-unit-logic__discount` ).html() == "&nbsp;"){
        $(  ` price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "8px","opacity":0});
        $(  ` precut-unit-logic .precut-unit-logic__total .__originalPrice ` ).hide();
        $( ` popular-wrap price-calc .__discountedPrice`).css({"position": "relative", "top": "-12px"});
        $( " .price-calc__x,.price-calc__equal").css({"margin-top": "8px"});
        $( " .precut-unit-logic__discount").css({"margin-top": "24px"});
      } else{
        $(  ` price-calc .price-calc__priceIn .__originalPrice, price-calc .price-calc__each .__originalPrice` ).css({"font-size": "14px","opacity":1});
        $(  ` precut-unit-logic .precut-unit-logic__total .__originalPrice ` ).show();
        $( ` popular-wrap price-calc .__discountedPrice`).css({"position": "static"});
        $( " .price-calc__x,.price-calc__equal").css({"margin-top": "8px"});
        $( " .precut-unit-logic__discount").css({"margin-top": "24px"});
      }
      const discountAmount = (currentVariantPrice * discountedPercent) / 100;
      const finalPrice = currentVariantPrice - discountAmount;
       
      if ( selectionType == 'custom' ) {
        /* square inches Price Calculations */
        $(  ` price-calc .price-calc__priceIn .__originalPrice` ).text( `$${ ( currentVariantPrice / currentSquareInches ).toFixed( 3 ) }` );
        $(  ` price-calc .price-calc__priceIn .__discountedPrice` ).text( `$${ ( ( ( currentVariantPrice - ( currentVariantPrice * discountedPercent ) / 100 ) ) / currentSquareInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
        $(  ` price-calc .price-calc__each .__originalPrice` ).text( `$${ currentVariantPrice }` );
        $(  ` price-calc .price-calc__each .__discountedPrice` ).text( `$${ ( ( ( currentVariantPrice - ( currentVariantPrice * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $(  ` precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( currentVariantPrice * getQty ).toFixed( 2 ) }` );
        $(  ` precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      } else if ( selectionType == 'popular' ) {
        let popularSqInches = currentVariant.option1.toLowerCase();
        popularSqInches = popularSqInches.replaceAll( '"', '' );
        if ( popularSqInches.includes( `x` ) ) {
          currentWidth = popularSqInches.split( `x` )[0] * 1;
          currentHeight = popularSqInches.split( `x` )[1] * 1;
          popularSqInches = currentWidth * currentHeight;
        }

        /* square inches Price Calculations */
        $(  ` price-calc .price-calc__priceIn .__originalPrice` ).text( `$${ ( currentVariantPrice / popularSqInches ).toFixed( 3 ) }` );
        $(  ` price-calc .price-calc__priceIn .__discountedPrice` ).text( `$${ ( ( ( currentVariantPrice - ( currentVariantPrice * discountedPercent ) / 100 ) ) / popularSqInches ).toFixed( 3 ) }` );
        /* Each Price Calculations */
        $(  ` price-calc .price-calc__each .__originalPrice` ).text( `$${ currentVariantPrice }` );
        $(  ` price-calc .price-calc__each .__discountedPrice` ).text( `$${ ( ( ( currentVariantPrice - ( currentVariantPrice * discountedPercent ) / 100 ) ) ).toFixed( 2 ) }` );
        /* total Price Calculations */
        $(  ` precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ ( currentVariantPrice * getQty ).toFixed( 2 ) }` );
        $(  ` precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).html( `$${ ( finalPrice * getQty ).toFixed( 2 ) }${ precutOption ? '<precut-text>w/ precut</precut-text>' : '' }` );
      }
    }
  try {
  } catch ( err ) {  
    console.log( `ERROR newPriceTableLogic()`, err.message ); 
  }
}


function updatedPriceLogic( selectedIndex = null, parentContainer = ".master-upload" ) {
  
    $( ` product-variants popular-wrap` ).hide();
    if ( selectedIndex == null ) {
      selectedIndex = $( `custom-table .customTabelPlace__item.selected` ).attr( `index` ) * 1;
    } else {
    }
    let getDiscountPercent = $( `custom-table .customTabelPlace__item[index="${ selectedIndex }"]` ).attr( `off` );
   let isPreCutActive = false; 
  // const isPreCutActive = $( `#precutselected__` ).is( `:checked` );
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
      $( ` sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).removeClass( `hidden` );
    } else {
      getDiscountPercent = 0;
      $(  ` sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).addClass( `hidden` );
    }

    let recheckDiscount = '&nbsp;';

    $(  ` sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).each(function() {
      const qty = $( this ).find( `precut-unit-logic .precut-unit-logic__qty .customQtyFile__qty` ).val() * 1;
      let unitPrice = ($( this ).attr( `price` )??0) * 1;
      if ( isPreCutActive ) {
        unitPrice = ($( this ).attr( `precut-price` )??0) * 1;
      } else {
        unitPrice = ($( this ).attr( `price` )??0) * 1;
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

    $( ` sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).each(function() {
      const qty = $( this ).find( `precut-unit-logic .precut-unit-logic__qty .customQtyFile__qty` ).val() * 1;
      let unitPrice = ($( this ).attr( `price` )??0) * 1;
      if ( isPreCutActive ) {
        unitPrice = ($( this ).attr( `precut-price` )??0) * 1;
      } else {
        unitPrice = ($( this ).attr( `price` )??0) * 1;
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

    if ( recheckDiscount == '&nbsp;' ) {
      $(  ` sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).addClass( `hidden` );
    } else {
      $(  ` sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__price .__originalPrice, sizes-blocks .widthHeight__custom[item] precut-unit-logic .precut-unit-logic__total .__originalPrice` ).removeClass( `hidden` );
    }

    readjustSelectedBar();
    setImageDimensions(parentContainer);
  if ( isPreCutActive ) {
      getVID = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `precut-vid` ) * 1;
    } else {
      getVID = $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `vid` ) * 1;
    }
    // console.log ( 'getVID', getVID, `isPreCutActive`, isPreCutActive );
    if ( typeof getVID !== 'undefined' && getVID ) {
      customTableReManage( getVID, isPreCutActive );
    }
  try {  } catch ( err ) {
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
 try {  } catch ( err ) {
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
function getRadioMaintain( by, parentContainer = ".master-upload"  ) { 
    let width, height;
    const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
    if ( isSizesBlock > 0 ) {
      width = document.querySelector( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="width__value"]` );
      height = document.querySelector( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="height__value"]` );
    } else {
      width = document.querySelector(  parentContainer +` .widthHeight__value[name="width__value"]` );
      height = document.querySelector(  parentContainer +` .widthHeight__value[name="height__value"]` );
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
      checkAutoChangeEle = $(  parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange .autoChange` ).length;
      if ( checkAutoChangeEle > 0 ) {
        const isEnabledAutoChange = $(  parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange .autoChange` ).is( ':checked' );
        if ( isEnabledAutoChange ) {
          autoChange  = true;
        }
      }
    } else {
      checkAutoChangeEle = $(  parentContainer +` .widthHeight__autoChange .autoChange` ).length;
      if ( checkAutoChangeEle > 0 ) {
        const isEnabledAutoChange = $(  parentContainer +` .widthHeight__autoChange .autoChange` ).is( ':checked' );
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
            $(  parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"]` ).addClass( `error` );
          } else {
            $(  parentContainer +` .widthHeight__item[by="height"]` ).addClass( `error` );
          }
        }
      } else if ( by == 'height' ) {
        width.value  = getWidth.toFixed(2);
        width.setAttribute( `value`, getWidth.toFixed(2) );
        if ( getWidth > userDefinedMaxLength ) {
          if ( isSizesBlock > 0 ) {
            $(  parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="width"]` ).addClass( `error` );
          } else {
            $(  parentContainer +` .widthHeight__item[by="width"]` ).addClass( `error` );
          }
        }
      }
    }

    getVariantsBySize(parentContainer);
  try { } catch ( err ) {
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
  if($(".customTabelPopup__overlay-8").css("display") != "grid"){
  let w       = document.querySelector( `.widthHeight__value[name="width__value"]` ).value;
  let h      = document.querySelector( `.widthHeight__value[name="height__value"]` ).value;

  let _w = Number(w.split(".")[1]);
  let _h = Number(h.split(".")[1]);
  w = roundOffNumbers(w);
  h = roundOffNumbers(h);
  // alert(w+"--"+h);

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

function reAdjustSizes(parentContainer = ".master-upload") { 
    const isSizesBlock = $(  parentContainer+` sizes-blocks` ).length;
    let width, height;
    if ( isSizesBlock > 0 ) {
      height    =   $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` );
      width     =   $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] input[name="width__value"]` );
    } else {
      height    =   $(  parentContainer+` input[name="height__value"]` );
      width     =   $(  parentContainer+` input[name="width__value"]` );
    }

    const heightVal =   height.val() * 1;
    const widthVal  =   width.val() * 1;

    if ( widthVal > userDefinedMaxLength || heightVal > userDefinedMaxLength ) {
      if ( widthVal == heightVal ) {
        if ( widthVal > userDefinedMaxLength ) {
          width
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'width', parentContainer );
          if ( isSizesBlock > 0 ) {
            $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).addClass( `error` );
          } else {
            $(  parentContainer+` .widthHeight__item` ).addClass( `error` );
          }
        }
      } else if ( widthVal > userDefinedMaxLength && heightVal > userDefinedMaxLength ) {
        if ( widthVal > heightVal ) {
          width
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'width', parentContainer );
          if ( isSizesBlock > 0 ) {
            $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
            $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="width"]` ).addClass( `error` );
          } else {
            $(  parentContainer+` .widthHeight__item` ).removeClass( `error` );
            $(  parentContainer+` .widthHeight__item[by="width"]` ).addClass( `error` );
          }
        } else if ( heightVal > widthVal ) {
          height
            .val( userDefinedMaxLength.toFixed(2) )
            .prop( userDefinedMaxLength.toFixed(2) );
          getRadioMaintain( 'height', parentContainer );
          if ( isSizesBlock > 0 ) {
            $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
            $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"]` ).addClass( `error` );
          } else {
            $(  parentContainer+` .widthHeight__item` ).removeClass( `error` );
            $(  parentContainer+` .widthHeight__item[by="height"]` ).addClass( `error` );
          }
        }
      } else if ( widthVal > userDefinedMaxLength && heightVal < userDefinedMaxLength ) {
        width
          .val( userDefinedMaxLength.toFixed(2) )
          .prop( userDefinedMaxLength.toFixed(2) );
        getRadioMaintain( 'width', parentContainer );
        if ( isSizesBlock > 0 ) {
          $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
          $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="width"]` ).addClass( `error` );
        } else {
          $(  parentContainer+` .widthHeight__item` ).removeClass( `error` );
          $(  parentContainer+` .widthHeight__item[by="width"]` ).addClass( `error` );
        }
      } else if ( heightVal > userDefinedMaxLength && widthVal < userDefinedMaxLength ) {
        height
          .val( userDefinedMaxLength.toFixed(2) )
          .prop( userDefinedMaxLength.toFixed(2) );
        getRadioMaintain( 'height', parentContainer );
        if ( isSizesBlock > 0 ) {
          $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` ).removeClass( `error` );
          $(  parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"]` ).addClass( `error` );
        } else {
          $(  parentContainer+` .widthHeight__item` ).removeClass( `error` );
          $(  parentContainer+` .widthHeight__item[by="height"]` ).addClass( `error` );
        }
      }
    } else {
      setTimeout(()=>{
        if ( isSizesBlock > 0 ) {
          $(  parentContainer+` .widthHeight__custom[item] .widthHeight__item` ).removeClass( `error` );
        } else {
          $(  parentContainer+` .widthHeight__item` ).removeClass( `error` );
        }
      }, 4000);
    }

    setTimeout(()=>{ 
      manageQuantities( `btnClicked`, null, parentContainer );
    }, 500);
  try { } catch ( err ) {
    console.log( `ERROR reAdjustSizes()`, err.message );
  }
}


async function getVariantsBySize(parentContainer = ".master-upload") { 
    const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
    let getWidth, getHeight;
    if ( isSizesBlock > 0 ) {
      getWidth    =   $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    } else {
      getWidth    =   $( parentContainer+` .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( parentContainer+` .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    }
    const getSquareIn =   Math.ceil( getWidth * getHeight );
    currentSquareInches = getSquareIn;
    let isVariantMatched  =   false;

    $( parentContainer+` product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""])` ).each(function() {
      const min = $( this ).attr( `min` ) * 1;
      const max = $( this ).attr( `max` ) * 1;
      if ( getSquareIn >= min && getSquareIn <= max ) {
        isVariantMatched  =   true;
        if($(parentContainer+` product-variants .product-variant[option="1"] .product-variant__item.product-variant__item--radio:not([min=""][max=""]) input:checked`).val() != $( this ).find( `input` ).val())
        if($(parentContainer+' [href="#custom_size"]').hasClass("active") == true){
          $( this ).find( `label` ).click();
          manageProperties(parentContainer);
        }
      }
    })

    if ( isVariantMatched ) {

      await ApplyDelay( 300 );
      if($(parentContainer+' [href="#custom_size"]').hasClass("active") == true){
        $( parentContainer+` .widthHeight__option.customOption` ).click();
        manageProperties(parentContainer);
      }

    } else if ( getSquareIn > allowedMaxInches && getWidth > userDefinedMaxLength || getSquareIn > allowedMaxInches && getHeight > userDefinedMaxLength ) {

      await ApplyDelay( 300 );
      $( parentContainer+` .widthHeight__item` ).addClass( `error` );
      if($(parentContainer+'  [href="#custom_size"]').hasClass("active") == true){
        $( parentContainer+` .widthHeight__option.customOption` ).click();
        manageProperties( parentContainer);
      }

      let autoChangeCheckbox;
      if ( isSizesBlock > 0 ) {
        autoChangeCheckbox = $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).is( `:checked` );
      } else {
        autoChangeCheckbox = $( parentContainer+` .widthHeight__autoChange #autoChange` ).is( `:checked` );
      }

      if ( autoChangeCheckbox == false ) {
        if ( isSizesBlock > 0 ) {
          $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).click();
        } else {
          $( parentContainer+` .widthHeight__autoChange #autoChange` ).click();
        }
        await ApplyDelay( 50 );

        if ( isSizesBlock > 0 ) {
          $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
        } else {
          $( parentContainer+` .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
        }

        await ApplyDelay( 100 );
        if ( isSizesBlock > 0 ) {
          $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange #autoChange` ).click();
        } else {
          $( parentContainer+` .widthHeight__autoChange #autoChange` ).click();
        }
      }
    } else {
      const isMinMax_available = $( parentContainer+` .product-variant__item.product-variant__item--radio[min="470"][max="509"]` ).length;
      if ( isMinMax_available > 0 ) {
        $( parentContainer+` .product-variant__item.product-variant__item--radio[min="470"][max="509"]` )
          .find( `label` )
          .click();
      } else {
        $( parentContainer+` .product-variant__item.product-variant__item--radio[min][max]` )
          .first( `label` )
          .click();
      }

      await ApplyDelay( 300 );

    }

    manageProperties(parentContainer);
 try {  } catch ( err ) {
    console.log( `ERROR getVariantsBySize()`, err.message );
  }
}

function manageProperties(parentContainer = ".master-upload") { 
    const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
    let getWidth, getHeight;
    if ( isSizesBlock > 0 ) {
      getWidth    =   $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    } else {
      getWidth    =   $( parentContainer+` .widthHeight__item__action .widthHeight__value[name="width__value"]` ).val() * 1;
      getHeight   =   $( parentContainer+` .widthHeight__item__action .widthHeight__value[name="height__value"]` ).val() * 1;
    }
    let detectedSize  =   $( parentContainer+` .widthHeight__option-detectedSize span[d-size]` ).text();
    detectedSize      =   detectedSize.replace( '"', '' ).replace( '"', '' ).replace( ' ', '' ).replace( ' ', '' );
    let getQty;
    if ( isSizesBlock > 0 ) {
      getQty = $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .customQtyFile__wrapper .customQtyFile__qty` ).val();
    } else {
      getQty = $( parentContainer+` .customQtyFile__wrapper .customQtyFile__qty` ).val();
    }

    let isPopularSizeSelected;
    const isTabPillDesign = $( parentContainer+` [data-id="size_selection"] .tab_header` ).length;
    if ( isTabPillDesign > 0 ) {
      isPopularSizeSelected = $( parentContainer+` [data-id="size_selection"] .tab_header a[href="#popular_size"].active` ).length;
    } else {
      isPopularSizeSelected = $( parentContainer+` .widthHeight__option.popularOption.selected` ).length;
    }

    if ( isPopularSizeSelected > 0 ) {
      $( parentContainer+` .form__properties` )
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
        $( parentContainer+` .form__properties` )
          .html( `
            <input type="hidden" name="properties[width]" value="${ getWidth }">
            <input type="hidden" name="properties[height]" value="${ getHeight }">
            <input type="hidden" name="quantity" value="${ getQty }">
          ` );
        $(parentContainer+" .horizontal_direction span").html(`${ parseFloat(getWidth).toFixed(2) }"`);
        $(parentContainer+" .verticle_direction span").html(`${ parseFloat(getHeight).toFixed(2) }"`);

        $(parentContainer+" .horizontal_direction").attr( `x-is`, `${ parseFloat(getWidth).toFixed(2) }`);
        $(parentContainer+" .verticle_direction").attr( `y-is`, `${ parseFloat(getHeight).toFixed(2) }`);

        dimensionsClassesApply( getWidth, getHeight, parentContainer );
        // <input type="hidden" name="properties[Detected Size]" value="${ detectedSize }">
      }
    }
    setTimeout(() => {
      if ( getWidth > getHeight && getWidth > userDefinedMaxLength ) {
        if ( isSizesBlock > 0 ) {
          $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="width__value"] + .widthHeight__item__action-plus` ).click();
        } else {
          $( parentContainer+` .widthHeight__custom .widthHeight__value[name="width__value"] + .widthHeight__item__action-plus` ).click();
        }
      } else if ( getWidth < getHeight && getHeight > userDefinedMaxLength ) {
        if ( isSizesBlock > 0 ) {
          $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="height__value"]` ).val( 21.5 );
          $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        } else {
          $( parentContainer+` .widthHeight__custom .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        }
      } else if ( getWidth == getHeight && getHeight > userDefinedMaxLength ) {
        if ( isSizesBlock > 0 ) {
          $( parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        } else {
          $( parentContainer+` .widthHeight__custom .widthHeight__value[name="height__value"] + .widthHeight__item__action-plus` ).click();
        }
      }
    }, 100);
    $(parentContainer+" .custom_tab_container").removeClass("is_disabled");
    if ( isSizesBlock > 0 ) {
      $(parentContainer+` .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action`).removeClass("disabled");
    } else {
      $(parentContainer+` .widthHeight__item__action`).removeClass("disabled");
    }
    // $(".easyzoom").removeClass("image-loading");
     $(parentContainer+" .custom_tab_container").removeClass("is_disabled");
    $(parentContainer+" .widthHeight__item__action").removeClass("disabled");
    $(parentContainer+" .split_design").removeClass("disabled");
    $(".flex-buttons").removeClass("is-disabled");
  reloadShippingBar();
 // alert($(".multiupload-files .easyzoom.image-loading").length);
  if($(".multiupload-files .easyzoom.image-loading").length == 0){
    $(".addToCartGroupItems_popup").prop("disabled", false);
  }
    //alert("hi");
 try { } catch ( err ) {
    console.log( `ERROR manageProperties()`, err.message );
  }
}
var timeout__;
$( document )
.on(`keyup`, `input[name="width__value"], input[name="height__value"]`,async function( e ) {
  let parentContainer = $(this).data("parent"); 
    e.stopImmediatePropagation();
    console.log ( 'parentContainer', parentContainer );
    $( `.addToCartGroupItems, .addToCartGroupItems_popup, .custom_tabs .tab_header` ).addClass( `disabled` );
    clearTimeout(timeout__);
    timeout__ = setTimeout(() => {
      const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
      if ( isSizesBlock > 0 ) {
        let dpiErr = false;
        const item = $( this ).closest( `.widthHeight__custom[item]` );
        selectedItemNo = item.attr( `item` );
        const selectedOption__ = item.attr( `option-selected` );
        let getVal = $( this ).val() * 1;
        let by = $( this ).closest( `.widthHeight__item__action` ).attr( `by` );
        let isWarningErrorActive = item.find( `dpi-warning` ).hasClass( `active` );
        if ( getVal < 0.25 ) {
          $( this ).val( `0.25` ).attr( `value`, `0.25` ).addClass( `minError` );
          getVal = 1;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        }
        if ( getVal > userDefinedMaxLength ) {
          $( this ).val( userDefinedMaxLength ).addClass( `error` );
          getVal = userDefinedMaxLength;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        }
        const getRatio = getNewRatio(  parentContainer+` .fileupload_hero`, by );
        const newVal = calculateNewWidth_orNewHeight(getRatio, by, getVal);

        if ( newVal > userDefinedMaxLength ) {
          if ( by == 'width' ) {
            item.find( `.widthHeight__item__action[by="height"] .widthHeight__value` ).val( userDefinedMaxLength ).attr( `value`, userDefinedMaxLength ).addClass( `error` );

            const getRatio = getNewRatio(  parentContainer+` .fileupload_hero`, 'height' );

            const newVal = calculateNewWidth_orNewHeight(getRatio, 'height', userDefinedMaxLength);  
            item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `error` );

            if ( isWarningErrorActive ) {
              item.find( `dpi-warning` ).removeClass( `active` );
              dpiErr = true;
            }
          } else if ( by == 'height' ) {
            item.find( `.widthHeight__item__action[by="width"] .widthHeight__value` ).val( userDefinedMaxLength ).attr( `value`, userDefinedMaxLength ).addClass( `error` );
            const getRatio = getNewRatio(  parentContainer+` .fileupload_hero`, 'width' );
            const newVal = calculateNewWidth_orNewHeight(getRatio, 'width', userDefinedMaxLength);
            item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `error` );

            if ( isWarningErrorActive ) {
              item.find( `dpi-warning` ).removeClass( `active` );
              dpiErr = true;
            }
          }
        } else if ( newVal < 0.25 ) {
          if ( by == 'width' ) {
            item.find( `.widthHeight__item__action[by="height"] .widthHeight__value` ).val( `0.25` ).attr( `value`, `0.25` ).addClass( `minError` );

            const getRatio = getNewRatio(  parentContainer+` .fileupload_hero`, 'height' );

            const newVal = calculateNewWidth_orNewHeight(getRatio, 'height', 1);
            item.find( `.widthHeight__item__action[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `minError` );

            if ( isWarningErrorActive ) {
              item.find( `dpi-warning` ).removeClass( `active` );
              dpiErr = true;
            }
          } else if ( by == 'height' ) {
            item.find( `.widthHeight__item__action[by="width"] .widthHeight__value` ).val( `0.25` ).attr( `value`, `0.25` ).addClass( `minError` );
            const getRatio = getNewRatio(  parentContainer+` .fileupload_hero`, 'width' );
            const newVal = calculateNewWidth_orNewHeight(getRatio, 'width', 1);
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
          calculateDPILineItem( selectedOption__, parentContainer );
        }, 1500); 
        manageQuantities("", null, parentContainer );
      }
       $( `.addToCartGroupItems, .addToCartGroupItems_popup, .custom_tabs .tab_header` ).removeClass( `disabled` );
    }, 500);
    // const wrapper       =   $( this ).closest( `.widthHeight__item__action` );
    // const getWidth      =   $( `.widthHeight__custom[item="${ selectedItemNo }"] input[name="width__value"]` ).attr( `last` );
    // const getHeight     =   $( `.widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` ).attr( `last` );
    // const byWidthHeight =   wrapper.attr( `by` );
    // const getVal        =   $( this ).val() * 1;
    // const getMin        =   $( this ).attr( `min` ) * 1;

    // console.log ( 'getVal -----', getVal );

    // getFileDemensions( `#fileupload_hero`, byWidthHeight );

    // if ( getVal < getMin ) {
    //   $( this ).val( getMin );
    // }
    // if ( getVal > userDefinedMaxLength ) {
    //   // $( this ).closest( `.widthHeight__item` ).addClass( `error` );
    //   console.log ( 'new chaaaa',  );
    //   wrapper.find( `.widthHeight__item` ).addClass( `error aaaaaaaa` );
    // }

    // setTimeout(()=>{
    //   getRadioMaintain( byWidthHeight );
    // }, 50);
    // setTimeout(()=>{
    //   reAdjustSizes();
    // }, 1000);

    // setTimeout(()=>{
    //   const getWidth      =   wrapper.find( `input[name="width__value"]` ).val() * 1;
    //   const getHeight     =   wrapper.find( `input[name="height__value"]` ).val() * 1;

    //   wrapper.find( `input[name="width__value"]` ).attr( `value`, getWidth );
    //   wrapper.find( `input[name="height__value"]` ).attr( `value`, getHeight );

    //   if ( getWidth > userDefinedMaxLength || getHeight > userDefinedMaxLength ) {
    //     if ( getWidth > getHeight ) {
    //       wrapper.find( `input[name="width__value"]` ).val( userDefinedMaxLength.toFixed(2) );
    //       getRadioMaintain( 'width' );
    //       reAdjustSizes();
    //     } else if ( getHeight > getWidth ) {
    //       wrapper.find( `input[name="height__value"]` ).val( userDefinedMaxLength.toFixed(2) );
    //       getRadioMaintain( 'height' );
    //       reAdjustSizes();
    //     }
    //   }
    //   calculateDPI();
    // }, 1050);
try {  } catch ( err ) {
    console.log( `ERROR input[name="width__value"], input[name="height__value"]`, err.message );
  }
})
;

function calculateDPILineItem(type = "custom", parentContainer = ".master-upload" ) { 
  if ( typeof fileExt !== 'undefined' && fileExt ) {
    if ( fileExt == 'png' || fileExt == 'jpg' || fileExt == 'jpeg' ) {

      let physicalWidthInInches = $(parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="width__value"]`).val();
      let physicalHeightInInches = $(parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__value[name="height__value"]`).val();
      let makeSqInchesForPopular, makeSqInchesForCustom, currentSqInches = 0;
      if ( type == 'popular' ) {
        physicalWidthInInches = Number($( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val().split( ` x ` )[0].replace( '"', '' ).replace( '^', '' ));
        physicalHeightInInches = Number($( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val().split( ` x ` )[1].replace('"','').replace( '^', '' ));

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
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
        } else if ( makeSqInchesForCustom > 288 && makeSqInchesForCustom > currentSqInches ) {
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).removeClass( `active` );
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `` );
        } else {
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
        }
      } else if ( type == 'popular' ) {
        const recommendedSqInches = ((uploadedFileWidth / 72) * (uploadedFileHeight / 72)); 
        if ( recommendedSqInches < 4 ) {
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
        } else if ( makeSqInchesForPopular < recommendedSqInches ) {
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).removeClass( `active` );
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `` );
        } else {
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] dpi-warning` ).addClass( `active` );
          $( parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `dpi-warning`, `Yes` );
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
async function executeNextStep(imgURL, removebg = true, file_name = false, forcesave = true, s3Key = null, defaultloader = true, file_crc = null, parentContainer = ".master-upload", directUpload = false, addPreloadedfile = false ) {
  const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
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
  if($(parentContainer+" .option_checkbox").prop("checked") == false && $(parentContainer+" .option_checkbox_upscale").prop("checked") == false){
    file_url = imgURL.split("?")[0];
  }else if($(parentContainer+" .option_checkbox").prop("checked") == true && $(parentContainer+" .option_checkbox_upscale").prop("checked") == false ){
      file_url = imgURL.split("?")[0];
    queryParamsObject.set( `bg-remove`, true );
   // queryParamsObject.set( 'trim', 'colorUnlessAlpha');
      // file_url = file_url+"?bg-remove=true&trim=color";
  }else if($(parentContainer+" .option_checkbox").prop("checked") == false && $(parentContainer+" .option_checkbox_upscale").prop("checked") == true ){
      file_url = imgURL.split("?")[0];
      queryParamsObject.set( `upscale`, true );
    //  queryParamsObject.set('trim', 'auto');
      // file_url = file_url+"?upscale=true&trim=auto";
  }else if($(parentContainer+" .option_checkbox").prop("checked") == true && $(parentContainer+" .option_checkbox_upscale").prop("checked") == true ){
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
      executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc, parentContainer);
      executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc, parentContainer );
    } else if ( fileExt == 'psd' || fileExt == 'eps' || fileExt == 'ai' ) {

      let getApiResponse;
      if ( fileExt == 'eps' || fileExt == 'ai' ) {
        getApiResponse  =   await sendApiRequest( `${ file_url }` );
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
      if(addPreloadedfile == true){
        //  file_width  =   Number($(`.master-upload sizes-blocks .widthHeight__custom[item="1"] [name="width__value"]` ).val()) * 300;
        //  file_height =   Number($(`.master-upload sizes-blocks .widthHeight__custom[item="1"] [name="height__value"]` ).val()) * 300;
      }  
      $( parentContainer +` .widthHeight__option.customOption .widthHeight__option-detectedSize` ).html( `Detected size: <span d-size>${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"</span>` );
      $(parentContainer +" .fileupload_info p").html(`<strong>Cropped size</strong> ${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"`);
      if ( isSizesBlock > 0 ) {
        $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` ).val( `${ (file_height / 72).toFixed(2) }` ).attr( `value`, `${ (file_height / 72).toFixed(2) }` );
        $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` ).val( `${ (file_width / 72).toFixed(2) }` ).attr( `value`, `${ (file_width / 72).toFixed(2) }` );
      } else {
        $( parentContainer +` .widthHeight__block [name="height__value"]` ).val( `${ (file_height / 72).toFixed(2) }` );
        $( parentContainer +` .widthHeight__block [name="width__value"]` ).val( `${ (file_width / 72).toFixed(2) }` );
      }

      if(isFileFromURL == true){
        $(parentContainer +" .fileupload_info p").html(`<strong>Cropped size</strong> 11.00" x 11.00"`);
        if ( isSizesBlock > 0 ) {
          $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` ).val( `11.00` ).attr( `value`, `11.00` );
          $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` ).val( `11.00` ).attr( `value`, `11.00` );
        } else {
          $( parentContainer +` .widthHeight__block [name="height__value"]` ).val( `11.00` );
          $( parentContainer +` .widthHeight__block [name="width__value"]` ).val( `11.00` );
        }
      }

      setTimeout(()=>{
        $( parentContainer +` variant-radios .product-form__input__wrapper[min=""][max=""]` )
          .first()
          .find( `> label` )
          .click();

        setTimeout(()=>{
          const file__W = ( file_width / 300 ).toFixed(2);
          const file__H = ( file_height / 300 ).toFixed(2);

          if ( file__H > file__W && file__H > 22 ) {
            if ( isSizesBlock > 0 ) {
              $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            } else {
              $( parentContainer +` .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            }
          } else if ( file__W > file__H && file__W > 22 ) {
            if ( isSizesBlock > 0 ) {
              $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
            } else {
              $( parentContainer +` .widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
            }
          } else if ( file__W > 22 && file__H > 22 ) {
            if ( isSizesBlock > 0 ) {
              $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            } else {
              $( parentContainer +` .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
            }
          }
        }, 100);
      }, 500);

      executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc, parentContainer, directUpload, addPreloadedfile  );
      executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc, parentContainer, directUpload, addPreloadedfile  );

    } else {
      let getApiResponse;
      let file_url_temp = file_url;
      if ( fileExt == 'pdf' ) {
       file_url_temp = file_url.replace(ninjaS3Host2,ninjaImgixHost).split("?")[0]+"?fm=png";
       let file_url1 = `${ file_url.split("?")[0] }`;
        getApiResponse  =   await sendApiRequest( `${ file_url1 }`, s3Key );
      }
      console.log("file_urlfile_url",file_url);
      
      getImageDimensions(file_url_temp, (dimensions, error) => {
        if (error) {
          console.error(error);
        } else {
          if ( fileExt == 'svg' ) {
            if ( typeof noWidthAndHeightForSVG !== 'undefined' && noWidthAndHeightForSVG ) {
              const getUnitForMultiple = 2480 / dimensions.width;
              file_width = dimensions.width * getUnitForMultiple;
              file_height = dimensions.height * getUnitForMultiple;
              $(parentContainer +` .fileupload_hero` ).addClass( `previewFullWidth` );
            } else {
              file_width = dimensions.width * 4.168067226890756;
              file_height = dimensions.height * 4.168067226890756;
            }
          }  else if ( fileExt == 'pdf' && typeof getApiResponse !== 'undefined' && getApiResponse ) {
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
              $( parentContainer +` .fileupload_bg_options .style3` ).last().hide();
            }
          }
           
          $( parentContainer +` .widthHeight__option.customOption .widthHeight__option-detectedSize` )
            .html( `Detected size: <span d-size>${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"</span>` );

          $(parentContainer +" .fileupload_info p span").html(`${ (file_width / 300).toFixed(2) }" x ${ (file_height / 300).toFixed(2) }"`);

          if ( isSizesBlock > 0 ) {
            $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="height__value"]` )
              .val( `${ (file_height / 300).toFixed(2) }` ).attr( `value`, `${ (file_height / 300).toFixed(2) }` );

            $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] [name="width__value"]` )
              .val( `${ (file_width / 300).toFixed(2) }` ).attr( `value`, `${ (file_height / 300).toFixed(2) }` );
          } else {
            $( parentContainer +` .widthHeight__block [name="height__value"]` )
              .val( `${ (file_height / 300).toFixed(2) }` );

            $( parentContainer +` .widthHeight__block [name="width__value"]` )
              .val( `${ (file_width / 300).toFixed(2) }` );
          }

          $( `.customUploaderWrapper__upload` ).addClass( `hidden` );

          $( `.color-background-1.gradient` ).removeClass( `adjustHeight` );

          if ( isSizesBlock > 0 ) {
            $(parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__autoChange .autoChange` )
              .prop( `checked`, true );
          } else {
            $( parentContainer +` .widthHeight__autoChange .autoChange` )
              .prop( `checked`, true );
          }

          if(parentContainer == ".master-upload"){  
              $( `.goToNextStep, .underCTA` ).removeClass( `hidden` ).click();
           }else{
              goToNextStep(parentContainer);  
           }

          setTimeout(()=>{
            const file__W = file_width / 300;
            const file__H = file_height / 300;

            if ( file__H > file__W && file__H > 22 ) {
              if ( isSizesBlock > 0 ) {
                $(  parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` )
                  .addClass( `error` );
                $(  parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
              } else {
                $(  parentContainer+` .widthHeight__item` )
                  .addClass( `error` );
                $(  parentContainer+` .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
              }
            } else if ( file__W > file__H && file__W > 22 ) {
              if ( isSizesBlock > 0 ) {
                $(  parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` )
                  .addClass( `error` );
                $(  parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
              } else {
                $(  parentContainer+` .widthHeight__item` )
                  .addClass( `error` );
                $(  parentContainer+` .widthHeight__item__action[by="width"] .widthHeight__item__action-plus` ).click();
              }
            } else if ( file__W > 22 && file__H > 22 ) {
              if ( isSizesBlock > 0 ) {
                $(  parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item` )
                  .addClass( `error` );
                $(  parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
              } else {
                $(  parentContainer+` .widthHeight__item` )
                  .addClass( `error` );
                $(  parentContainer+` .widthHeight__item__action[by="height"] .widthHeight__item__action-plus` ).click();
              }
            }
          }, 100);

          executeNextStep__helper( 'Y', 'N', defaultloader, file_url, forcesave, file_crc, parentContainer, directUpload, addPreloadedfile );
          executeNextStep__helper( 'N', 'Y', defaultloader, file_url, forcesave, file_crc,  parentContainer, directUpload, addPreloadedfile );
        }
      });
    }
  }
 // fileInput.value = '';
 // secondFile.value = '';
};
async function goToNextStep(parentContainer){ 
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
        });
        
        await ApplyDelay( 500 );
      }
 
      $(".customTabelPlace__item:first").addClass("selected");
      const height  = file_height / 300;
      const width   = file_width / 300; 
      calculateRatio( width.toFixed(2), height.toFixed(2), parentContainer );
      // console.log ( 'getFileRatio', getFileRatio );
      await ApplyDelay( 300 );
      getVariantsBySize(parentContainer);
      await ApplyDelay( 100 ); 
      manageQuantities( 'btnClicked', null, parentContainer  ); 
    } 
}
function executeNextStep__helper(firstOne='', secondOne='', defaultloader, file_url, forcesave, file_crc,  parentContainer = ".master-upload", directUpload = false, addPreloadedfile = false ) {
 
    if(typeof getfileExt == "undefined") {
      getfileExt = file_url.split('.').pop();
      if ( getfileExt.includes( `?` ) ) {
        getfileExt = getfileExt.split( `?` )[0];
      }
    }
    const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
    if ( firstOne == 'Y' ) {
      $( `[item-show-on]` )
        .addClass( `hidden` );

      $( `[item-show-on="afterUpload"]` )
        .removeClass( `hidden` );
      let interVal = setInterval(function(){
        if($(parentContainer+" .uploaded-file__counter").html() == "100%"){
        if(parentContainer == ".master-upload"){  
             $( `.goToNextStep, .underCTA` ).removeClass( `hidden` ).click();
           }else{
              goToNextStep(parentContainer);  
           }
            if ( typeof addSlickSlider__ === 'function' ) {
             addSlickSlider__();
            }
           if(defaultloader == true)
          //  $(parentContainer+" .easyzoom").removeClass("image-loading");
           if(directUpload == true || addPreloadedfile == true){
              setTimeout(function(){
                 // $(parentContainer+" .easyzoom").removeClass("image-loading");
              },1000)
           }
          
           if(addPreloadedfile == true){
              $(parentContainer+" .fileupload_hero").attr("src", $(".master-upload .fileupload_hero").attr("src"));
           }
              
            $(parentContainer+' .xzoom').jqZoom({
                selectorWidth: 30,
                selectorHeight: 30,
                viewerWidth: 400,
                viewerHeight: 400,
                position: 'right'
              });
            clearInterval(interVal);
        }
      },300)
      
     
      //   setTimeout(()=>{
      const fileVal = $(parentContainer +` input[name="properties[Upload (Vector Files Preferred)]"]` ).length;
       
      if ( fileVal > 0 ) {
        if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || originalUploadedFileURL.indexOf(".psd") > -1  || getfileExt == 'svg' ) {
          originalUploadedFileURL = originalUploadedFileURL.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
          $( parentContainer +` product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( originalUploadedFileURL );
        } else {
          $( parentContainer +` product-form.product-form form input[name="properties[Upload (Vector Files Preferred)]` ).val( file_url );
        }
        if(isGangPage == false)
          $( parentContainer +` product-form.product-form form input[name="properties[_Original Image]` ).val( ( typeof originalUploadedFileURL !== 'undefined' && originalUploadedFileURL ? originalUploadedFileURL : file_url.split("?")[0] ) );
      } else {
         
        if(isGangPage == true) {
          $( parentContainer +` product-form.product-form form` ).append( `<input type="hidden"  value="${ file_url }" name="properties[Upload (Vector Files Preferred)]"  />` );
        } else {
           
          if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' || originalUploadedFileURL.indexOf(".psd") > -1  || getfileExt == 'svg' ) {
            setTimeout(function() {
               let _originalUploadedFileURL = $(parentContainer +` .fileupload_hero`).attr("src").replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
                $( parentContainer +` product-form.product-form form` )
                  .append( `
                    <input type="hidden" value="${ _originalUploadedFileURL }" name="properties[Upload (Vector Files Preferred)]" />
                    <input type="hidden" value="${ _originalUploadedFileURL }" name="properties[_Original Image]" />
                  ` );
            },6000);
            
          } else {
            $( parentContainer +` product-form.product-form form` )
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
          $(parentContainer +" .viewer-box img").attr('src', `${ file_url.replace(ninjaS3Host2,ninjaS3Host) }?h=1500`);
          file_url = file_url.replace(ninjaS3Host2,ninjaS3Host)+"?h=1000&auto=compress&q=50";
          document.querySelector(parentContainer +" .fileupload_hero").setAttribute('src', file_url);
        }else{
          let imgix_file_url = file_url.replace(ninjaS3Host2,ninjaS3Host);
          if ( file_url.includes( `?` ) ) {
            console.log("===>1");
            
            if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' || getfileExt == 'svg' ) {
              document.querySelector(parentContainer +" .fileupload_hero").setAttribute('src', `${ imgix_file_url }&fm=png&w=2000`);
              $(parentContainer +" .viewer-box img").attr('src', `${ imgix_file_url }&fm=png&trim=color&w=2000`);
            } else {
              document.querySelector(parentContainer +" .fileupload_hero").setAttribute('src', `${ imgix_file_url }&fm=png`);
              $(parentContainer +" .viewer-box img").attr('src', `${ imgix_file_url }&fm=png`);
            }
          } else {
             console.log("===>2");
            if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || getfileExt == 'svg' ) {
              document.querySelector(parentContainer +" .fileupload_hero").setAttribute('src', `${ imgix_file_url }?fm=png&w=2000`);
              $(parentContainer +" .viewer-box img").attr('src', `${ imgix_file_url }?fm=png&trim=color&w=2000`);
            } else {
              document.querySelector(parentContainer +" .fileupload_hero").setAttribute('src', `${ imgix_file_url }?fm=png`);
              $(parentContainer +" .viewer-box img").attr('src', `${ imgix_file_url }?fm=png`);
            }
          }
        }
      },2000)
      $( `.uploaderFooterNoteSimpleLine` ).addClass( `hidden` );
      if(CUSTOMER_ID != null && forcesave == true){
        let w = $(parentContainer +' .product-variants > div:first-of-type input:checked').val();
        if ( typeof w !== 'undefined' && w ) {
          w = w.toLowerCase();
          if ( w.includes(' x ') ) {
            w = w.split(" x ")[0].replace('"',"")??0.00;
          }
        }
        let h = $(parentContainer +' .product-variants > div:first-of-type input:checked').val();
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
            const isPopularActive = $( parentContainer +` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
            $( parentContainer +` sizes-blocks .widthHeight__custom[item]` ).each(function( i ) {
              const j = i + 1;
              $( this ).attr( 'item', j );
            })

            if ( isPopularActive == 'custom' ) {
              selectedItemNo = 1;
            }
          }
          w =  $( parentContainer +` [option-selected="custom"].widthHeight__custom[item="1"] [name="width__value"]` ).val()??$(parentContainer +' .product-variants > div:first-of-type input:checked').data("width")??w??0.00;
          h = $( parentContainer +` [option-selected="custom"].widthHeight__custom[item="1"] [name="height__value"]` ).val()??$(parentContainer +' .product-variants > div:first-of-type input:checked').data("height")??h??0.00;
        } else {
          w =  $( parentContainer +` [data-id='custom_size'].widthHeight__block [name="width__value"]` ).val()??$(parentContainer +' .product-variants > div:first-of-type input:checked').data("width")??w??0.00;
          h = $( parentContainer +` [data-id='custom_size'] .widthHeight__block [name="height__value"]` ).val()??$(parentContainer +' .product-variants > div:first-of-type input:checked').data("height")??h??0.00;
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
                "file_name":document.querySelector(parentContainer +" .uploaded-file__name").innerHTML,
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
         setTimeout(function() {
      let uploadedImage = $(parentContainer +' [name="properties[Upload (Vector Files Preferred)]"]').val();
       if(uploadedImage.indexOf("?") > -1){
        // uploadedImage = uploadedImage + "&trim=colorUnlessAlpha"
      }else{
        // uploadedImage = uploadedImage + "?trim=colorUnlessAlpha"
      }
      if(uploadedImage.indexOf(ninjaS3Host2) > -1){
        if($(parentContainer +" .option_checkbox").prop("checked") == true)
          uploadedImage = $(parentContainer +' [name="properties[Upload (Vector Files Preferred)]"]').val().replace(ninjaS3Host2,ninjaS3Host)+"?fm=png&trim=colorUnlessAlpha&bg-remove=true";
        else if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf' || getfileExt == 'svg' ) 
          uploadedImage = $(parentContainer +' [name="properties[Upload (Vector Files Preferred)]"]').val().replace(ninjaS3Host2,ninjaS3Host)+"?&fm=png&trim=colorUnlessAlpha&w=2000";
        else
          uploadedImage = $(parentContainer +' [name="properties[Upload (Vector Files Preferred)]"]').val().replace(ninjaS3Host2,ninjaS3Host)+"?fm=png&trim=colorUnlessAlpha";
      }
         
         document.querySelector(parentContainer +" .fileupload_hero").setAttribute('src', `${ uploadedImage }`);
         
      if($(".customTabelPopup__overlay-8").css("display") != "grid"){
       $(".watermark_image").css({"opacity":1});
       $(".dtf_body_image  .watermark_image img").attr("src",uploadedImage);
      }
            $(parentContainer+" .easyzoom").removeClass("image-loading");
        $(parentContainer+" .fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
      }, 6500);     
      if($('[href="#custom_size"]').hasClass("active")  == true ){
          if($(".customTabelPopup__overlay-8").css("display") != "grid"){
           $(".product-gallery").hide();
           $(".dtf_imgix_images").show();
          }
      }
      calculateratioForImage(parentContainer);
    }else{
      if($('[href="#custom_size"]').hasClass("active") == true){
          if($(".customTabelPopup__overlay-8").css("display") != "grid"){
            $(".product-gallery").show();
            $(".dtf_imgix_images").hide();
          }
      }
    }
    setTimeout(() => {
      if ( typeof updatePropotionalSizes === 'function' ) {
        updatePropotionalSizes(parentContainer);
      }
      if(addPreloadedfile == true){
          // console.log(".master-upload .size_selection sizes-blocks=> "+$(`.master-upload .size_selection sizes-blocks`).html());
        let index_ = 0; 
         $(`.master-upload .size_selection sizes-blocks div[item]`).each(function(){
              index_++;
              $(`[addPreloadedfile='true'] div[item=${index_}] [name='width__value']`).val($(`.master-upload div[item=${index_}] [name='width__value']`).val()).change();
              $(`[addPreloadedfile='true'] div[item=${index_}] [name='height__value']`).val($(`.master-upload div[item=${index_}] [name='height__value']`).val()).change();
              $(`[addPreloadedfile='true'] div[item=${index_}] .customQtyFile__qty`).val($(`.master-upload div[item=${index_}] .customQtyFile__qty`).val()).change();
         
         }); 
         $(`[addPreloadedfile='true'] [id^="designer_notes-"]`).prop("checked", $(`.master-upload #designer_notes`).prop("checked"));
         $(`[addPreloadedfile='true'] [name="properties[Design Notes]"]`).val($(`.master-upload [name="properties[Design Notes]"]`).val());
      }
    }, 1500);
    manageProperties(parentContainer);
 
  try { } catch ( err ) {
    console.log( `ERROR executeNextStep__helper`, err.message );
  }
}

function checkSelectedSizeAndApply(parentContainer) {
  try {
    // let gangSelectedSize = $( this_ ).attr( `size-in-inches` ) * 1;
    let gangSelectedSize = $( parentContainer+` product-variants .product-variant .product-variant__container[option="1"] .product-variant__item.product-variant__item--radio .product-variant__input:checked` ).attr( `size-in-inches` ) * 1;
    gangSelectedSize = gangSelectedSize / 12;
    // $( `.verticle_direction span` ).text( `${ (gangSelectedSize * 12).toFixed( 2 ) }` );
    const newHeightApply = (gangSelectedSize * 12 ) * onePercentOfPreview;
    $( `apply-max-height preview-wrapper` ).css( `max-height`, `${ newHeightApply }px` );
  } catch ( err ) {
    console.log( `ERROR checkSelectedSizeAndApply()`, err.message );
  }
}

function dimensionsClassesApply( imgWidth, imgHeight, selectedBlock=null ) {
  try {
    let updatedFilePreview = filePreview;
    if ( typeof selectedBlock !== 'undefined' && selectedBlock ) {
      updatedFilePreview = $( selectedBlock ).find( `file-preview` );
    }
    updatedFilePreview.removeClass( `square img_wider img_tall` );

    imgWidth = updatedFilePreview.find( `preview-block .fileupload_hero` ).width();
    imgHeight = updatedFilePreview.find( `preview-block .fileupload_hero` ).height();

    if (imgWidth === imgHeight) {
      updatedFilePreview.addClass( `square` );
    } else if (imgWidth > imgHeight) {
      updatedFilePreview.addClass( `img_wider` );
    } else {
      updatedFilePreview.addClass( `img_tall` );
    }
  } catch ( err ) {
    console.log( `ERROR dimensionsClassesApply()`, err.message );
  }
}

$('body').on("click","#fileremove", function(e) {
 // alert("hiii"+$(this).data("parent"));
  if($(this).attr("data-parent") == ".master-upload")
     removeFile(e);  
});

function removeFile(e = "", parentContainer = ".master-upload") {
  isFileUpload = false;
  isReadyToPress = false;
  $( `.generative-ai-area` ).removeClass( `hidden` ).show();
    if($(".customTabelPopup__overlay-8").css("display") != "grid"){
  $(".product-gallery").show();
  $(".dtf_imgix_images").hide();
    }
  $(".watermark_image").css({"opacity":0});
  fileInput.value = '';
  $(parentContainer+" .custom_tab_container").removeClass("is_disabled");
  $(parentContainer+" .widthHeight__item__action").removeClass("disabled");
  $(parentContainer+" .easyzoom").removeClass("image-loading");
  $(parentContainer+" .upload_image_info").addClass("hidden");
  counter = 0;
  $( parentContainer+` [name="properties[Upload (Vector Files Preferred)]"]` ).val( '' );
  $(  parentContainer+` [name="properties[_Original Image]"]` ).val( '' );
  /* event detail contains the file reference */
  // let file = e.detail;
   if ( isDTFPage ) {
    $( `.size_selection .tab_header a[href="#custom_size"]` ).click();
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

  $( `.master-upload .fileupload_custom` )
    .hide();

  // Add Class (upload-area--open) On (uploadArea)
  uploadArea.classList.remove('upload-area--open');

  // Hide Loading-text (please-wait) Element
//  loadingText.style.display = "none";
  // Show Preview Image
 document.querySelector(parentContainer+ ' .previewImage').style.display = 'none';

  // Add Class (file-details--open) On (fileDetails)
   document.querySelector(parentContainer+ ' .file-details').classList.remove('file-details--open');
  // Add Class (uploaded-file--open) On (uploadedFile)
  document.querySelector(parentContainer+ ' .uploaded-file').classList.remove('uploaded-file--open');
  // Add Class (uploaded-file__info--active) On (uploadedFileInfo)
 document.querySelector(parentContainer+' .uploaded-file__info').classList.remove('uploaded-file__info--active');
  document.querySelector(".drop-zoon__icon").style.display = 'flex';
  document.querySelector(".drop-zoon__paragraph").style.display = 'block';
  //  previewImage.setAttribute('src', "");
  // document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/loader-2.gif?v=1723724647");
  $(parentContainer+" .viewer-box img").attr('src', "");
  document.querySelector(parentContainer+ '  .uploaded-file__counter').innerHTML = `0%`;
  $(".customTabelPopup__overlay-2").fadeOut(500);
  $(parentContainer+ "  .widthHeight__item__action").addClass("disabled");
  $( parentContainer+` .dpi_warning` ).removeClass( `active` );
  resetAll(parentContainer);
};


async function sendApiRequest(file_url, s3Key ) {
  try {
    if ( s3Key || file_url.indexOf(".pdf") > -1) {
      let rtn;
      let endCode = encodeURI( s3Key );
      if(file_url.indexOf(".pdf") > -1){
        let split_ = file_url.split("/");
         endCode = encodeURI( split_[split_.length - 1]);
      }
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
});
mainDropZone.addEventListener('drop', async (e) => { 

  e.preventDefault()
});

if(document.querySelector( `.secondDropZone` )){
  
  var secondryDropZone = document.querySelector( `.secondDropZone:not(._2)` );  
  secondryDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    secondryDropZone.classList.add( `active` );
    document.querySelector(".file-upload-overlay-2").classList.add("active");
    document.querySelector("body").classList.add("file-upload-overlay-2-active");
  });

  secondryDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
     anotherTransfer = false;
    // let ev = {};
     //   ev.files = [];
	//	ev.files.push($('.master-upload [name="properties[Upload (Vector Files Preferred)]"]').val());
   //  multiuploadHTML(ev, null, true, true);

    e.preventDefault();

    /* Puff / Spangle: refuse the drop if color isn't picked. Clean up the
       dragover overlay state so the page doesn't stay covered. */
    if ( !_ntPuffSpangleColorGate() ) {
      try { secondryDropZone.classList.remove( `active` ); } catch ( _e ) {}
      try {
        document.querySelector(".file-upload-overlay-2").classList.remove("active");
        document.querySelector("body").classList.remove("file-upload-overlay-2-active");
      } catch ( _e ) {}
      return;
    }

       let scroll_ = 0;
    let i = 0;
       $(`.multiupload-files > li`).each(function(index){
         i++;
         scroll_ += $(`.multiupload-files > li:nth-child(${i})`)[0].scrollHeight;
       });
       lastUploadHeight = scroll_;
    
     if(e.dataTransfer.files.length > 1){
       uploadFile(e.dataTransfer.files[0], "second_image",".master-upload",true);
       multiuploadHTML(e.dataTransfer);
     }else{  
        const file = e.dataTransfer.files[0];
    anotherTransfer = true; 
   
     uploadFile(file, "second_image");
     }
  
    
  });

  secondryDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    secondryDropZone.classList.remove( `active` );
    document.querySelector(".file-upload-overlay-2").classList.remove("active");
    document.querySelector("body").classList.remove("file-upload-overlay-2-active");
  });

  
   var secondryDropZone2 = document.querySelector( `.secondDropZone._2` );  
  var secondryDropZonePopup = document.querySelector( `.customTabelPopup__overlay-8 .multiupload-popup-left` );
  secondryDropZonePopup.addEventListener('dragover', (e) => {
    e.preventDefault();
    secondryDropZone2.classList.add( `active` );
    document.querySelector(".file-upload-overlay-3").classList.add("active");
    document.querySelector("body").classList.add("file-upload-overlay-3-active");
  });

  secondryDropZonePopup.addEventListener('drop', async (e) => {
    e.preventDefault();
    /* Puff / Spangle: refuse the drop on the popup zone too. Same overlay
       cleanup pattern as the inline secondaryDropZone above. */
    if ( !_ntPuffSpangleColorGate() ) {
      try { secondryDropZone2.classList.remove( `active` ); } catch ( _e ) {}
      try {
        document.querySelector(".file-upload-overlay-3").classList.remove("active");
        document.querySelector("body").classList.remove("file-upload-overlay-3-active");
      } catch ( _e ) {}
      return;
    }
      let scroll_ = 0;
    let i = 0;
       $(`.multiupload-files > li`).each(function(index){
         i++;
         scroll_ += $(`.multiupload-files > li:nth-child(${i})`)[0].scrollHeight;
       });
       lastUploadHeight = scroll_;
        multiuploadHTML(e.dataTransfer);
     secondryDropZone2.classList.remove( `active` );
    document.querySelector(".file-upload-overlay-3").classList.remove("active");
    document.querySelector("body").classList.remove("file-upload-overlay-3-active");
  });

  secondryDropZonePopup.addEventListener('dragleave', (e) => {
    e.preventDefault();
    secondryDropZone2.classList.remove( `active` );
    document.querySelector(".file-upload-overlay-3").classList.remove("active");
    document.querySelector("body").classList.remove("file-upload-overlay-3-active");
  });
  
}

$( document )
.ready(function () {
  if ( isGangPage ) {
    checkSelectedSizeAndApply();
    // $( `.easyzoom.zoom-box` ).wrap( `<apply-max-height></apply-max-height>` );
  }
})
$( document ).on(`change`, `#secondFile`, function( e ) { 
  e.stopImmediatePropagation(); 
  
 // let ev = {};
     //   ev.files = [];
	//	ev.files.push($('.master-upload [name="properties[Upload (Vector Files Preferred)]"]').val());
//  multiuploadHTML(ev, null, true, true); 
   
   if(e.currentTarget.files.length > 1){
     uploadFile(e.currentTarget.files[0], "second_image",".master-upload",true);
     let scroll_ = 0;
    let i = 0;
       $(`.multiupload-files > li`).each(function(index){
         i++;
         scroll_ += $(`.multiupload-files > li:nth-child(${i})`)[0].scrollHeight;
       });
       lastUploadHeight = scroll_;
  
   multiuploadHTML(e.currentTarget);
   }else{
      anotherTransfer = true;
      uploadFile( e.currentTarget.files[0], "second_image");
   }
 
})

  $( document ).on(`change`, `#secondFile2`, function( e ) {
  e.stopImmediatePropagation();  
       let scroll_ = 0;
    let i = 0;
       $(`.multiupload-files > li`).each(function(index){
         i++;
         scroll_ += $(`.multiupload-files > li:nth-child(${i})`)[0].scrollHeight;
       });
       lastUploadHeight = scroll_;
  multiuploadHTML(e.currentTarget); 
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

.on(`change`, `[data-id="popular_size"].active .product-variant__item.product-variant__item--radio[min=""][max=""] .product-variant__input`, function( e ) {
  
    e.stopImmediatePropagation();
     parentContainer =  "#"+$(this).parents("li[id^='upload-']").attr("id")??".master-upload";
    const isPreviousDesign_Active = $(parentContainer `+ .tab_header.previousDesign` ).length;
    
    if ( isPreviousDesign_Active > 0 ) {
      popularSizeID = $( this ).attr( `id` );
    }
 try { } catch ( err ) {
    console.log( `ERROR #popular_size.active .product-variant__item.product-variant__item--radio .product-variant__input`, err.message );
  }
})
;

function multiuploadHTML(event, second_image = null,  direct = null, addPreloadedfile = false){ 
  if(event.files.length > 10){
       document.querySelector('.customTabelPopup__overlay-13').style.display = 'flex';
     return false;
  }
  $(".customTabelPopup__overlay-8").show();
  $("body,html").css({"overflow":"hidden"});
   $(".addToCartGroupItems_popup").prop("disabled", true);
  let PRODUCT_VARIANTS = $(".master-upload product-variants").html();

  let index =  0;
      if($(".multiupload-files > li").length > 0)
        index = Number($(".multiupload-files > li:last-child").data("index"));
  
  let prevIndex =    index   
        for(let i = 0; i < event.files.length; i++){ 
        let file =   event.files[i];
        let file_type = "";
          if(file && typeof file.type != "undefined"){
            file_type = file.type;
          }else{
            file_type = file.split(".").pop().split("?")[0];
          }
        index++;
          let CUSTOM_TAB_CONTAINER_DATA = "";
        if(addPreloadedfile == true){           
            CUSTOM_TAB_CONTAINER_DATA = $("custom-table + .size_selection").html().replace(/designer_notes/g,`designer_notes-${index}`).replace(/.master-upload/g,`#upload-${index}`);  
        }else{
            CUSTOM_TAB_CONTAINER_DATA = CUSTOM_TAB_CONTAINER.replace(/designer_notes/g,`designer_notes-${index}`).replace(/.master-upload/g,`#upload-${index}`);
          }
          console.log("CUSTOM_TAB_CONTAINER_DATA",CUSTOM_TAB_CONTAINER_DATA);
         // CUSTOM_TAB_CONTAINER = $(CUSTOM_TAB_CONTAINER).find("precut-wrapper").remove();
       let htmlData = ` <li data-index="${index}" id="upload-${index}" addPreloadedfile="${addPreloadedfile}" >
                               <div class="fileupload_custom"  data-id="fileupload_custom">
                                    <div data-id="fileDetails" class="upload-area__file-details file-details">
                                        <div data-id="uploadedFile" class="uploaded-file">
                                           <div class="uploaded-file__icon-container">
                                              <i class="bx bxs-file-blank uploaded-file__icon"></i>
                                              <span class="uploaded-file__icon-text">image/png</span> <!-- Data Will be Comes From Js -->
                                           </div>
                                           <div data-id="uploadedFileInfo" class="uploaded-file__info uploaded-file__info--active">
                                              <span class="uploaded-file__namex">Uploading...</span>
                                              <div style="display: flex;flex-direction: column;justify-content: flex-end;align-items: end;position: relative;   top: -9px;   right: -10px;">
                                                 <span style="color: #03a3f7;cursor:pointer;font-weight: 600;font-size: 12px;" data-id="fileremove-2" data-parent="#upload-${index}">Cancel</span>
                                                 <span class="uploaded-file__counter">0%</span>
                                              </div>
                                              <span class="uploaded_progress_bar"  >
                                              <img src="https://cdn.shopify.com/s/files/1/0558/0265/8899/files/Bitmap.png?v=1727193962">
                                              </span>
                                           </div>
                                        </div>
                                        <div class="loading_messaage">
                                           <svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                              <path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 8c-.414 0-.75.336-.75.75v5.5c0 .414.336.75.75.75s.75-.336.75-.75v-5.5c0-.414-.336-.75-.75-.75zm-.002-3c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1z" fill-rule="nonzero"></path>
                                           </svg>
                                           <p>We're making sure your upload is perfect for printing. This may take a few seconds.</p>
                                        </div>
                                     </div>  
                                     <div class="split_design disabled oldFilePreview_"> 
                                        <div style="min-width:100%;" class="upload_image_info"> 
                                           <div class="fileupload_info"> 
                                              
                                             <span><p class="upload-counter-data" style="font-weight: 700;   margin-bottom: 5px;   font-size: 14px;"></p> </span>
                                              <span class="uploaded-file__name" style="display:none;">Unknown.jpg</span>
                                             <a href="" data-id="fileremove-2" data-parent="#upload-${index}" class=""> 
                                               Delete
                                                       </a>
                                           </div>
                                        </div>
                                        <div class="upload_image_info_box">
                                          <span class="zoom-text">Hover to Zoom | <a href="" style="color:#03a3f7" class="zoom_image" data-parent="#upload-${index}">Click</a> to enlarge</span>
                                          <file-preview
                                            data-id="filePreview"
                                            show-dimensions
                                          >
                                            <preview-block class="easyzoom zoom-box" data-parent="#upload-${index}">
                                              <div class="upload_tools">
                                                <a href="javascript://" removefile data-id="fileremove-2" data-parent="#upload-${index}">
                                                  <svg style="pointer-events:none" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v15.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill-rule="nonzero"/></svg>
                                                </a>
                                              </div>
                                              <div class="horizontal_direction" x-is="0">&nbsp;</div>
                                              <div class="verticle_direction" y-is="0">&nbsp;</div>
                                              <img class="xzoom fileupload_hero" id="" src="https://cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png?v=1728297951" onerror="this.src='//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png';$(this).parents('preview-block').addClass('image-loading')">
                                            </preview-block>
                                          </file-preview>
                                           <span class="previewText" style="font-size: 0.8rem;   width: 100%;   text-align: center;   display: block;"><span class="fw-600">Preview:</span> The image will print as shown above.</span>


                                          <!--
                                           <div class="fileupload_preview">
                                              <div class="verticle_direction">
                                                 <span>0.00"</span>
                                              </div>
                                              <div>
                                                 <div class="fileupload_bg_options" style="opacity: 1; pointer-events: all;">
                                              <span class="zoom-text">Hover to Zoom | Click to <a href="" style="color:#03a3f7" class="zoom_image"  data-parent="#upload-${index}" >enlarge</a></span>
                                           </div>
                                                 <div class="horizontal_direction">
                                                    <span>0.00"</span>
                                                 </div>
                                               <div class="easyzoom zoom-box image-loading" data-parent="#upload-${index}">
                                                      <div class="upload_tools">
                                                      </div>
                                                      <img class="xzoom fileupload_hero" src="https://cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png?v=1728297951" style="max-width:100%;display: block;   margin: auto;padding: 5px;" />
                                                    </div>
                                                
                                              </div>
                                           </div>
                                           -->
                                           ${DPI_WARNING}
                                          <div class="fileupload_bg_options _2" style="opacity: 0.5; pointer-events: none;padding-left:20px;">
                                               <div class="style3" style="min-width: 230px;">
                                                 <label class="switch" for="option_checkbox-${index}">
                                                    <input type="checkbox" class="option_checkbox" id="option_checkbox-${index}" checked="" data-parent="#upload-${index}">
                                                    <div class="slider round"></div>
                                                    &nbsp; Remove Background
                                                    <span>
                                                    <img src="//ninjatransfers.com/cdn/shop/t/329/assets/AI_Button.svg?auto=format,compress&v=59135951601723828791730570387" style="height: 14px; margin-left: 5px; top: 0px; position: relative;">
                                                    </span>
                                                 </label>
                                              </div>
                                              <div class="style3" style="min-width: 230px;">
                                                 <label class="switch" for="option_checkbox_upscale-${index}">
                                                    <input type="checkbox" class="option_checkbox_upscale" id="option_checkbox_upscale-${index}" data-parent="#upload-${index}">
                                                    <div class="slider round"></div>
                                                    &nbsp; Super Resolution
                                                    <span>
                                                    <img src="//ninjatransfers.com/cdn/shop/t/329/assets/AI_Button.svg?auto=format,compress&v=59135951601723828791730570387" style="height: 14px; margin-left: 5px; top: 0px; position: relative;">
                                                    </span>
                                                 </label>
                                              </div>
                                           </div>
                                        </div>
										<div class="custom_tab_container size_selection w3_bg" data-id="size_selection">
                                        ${CUSTOM_TAB_CONTAINER_DATA}
                                        
										</div>
                                     </div>
                                  </div>
                                   
                                            <product-form class="product-form" >
                                           <form>
                                             <div class="form__properties"></div> 
                                             <input type="hidden" value="Yes" name="properties[Remove Background]" class="remove_background">
<input type="hidden" value="No" name="properties[Super Resolution]" class="super_resolution">
<input type="hidden" value="No" name="properties[Precut]" class="is_precut" />
<input type="hidden" value="Yes" name="properties[_Ready to Press]" class="ready_to_press" disabled="">
<input type="hidden" id="discount_input-${index}" name="properties[_discount_input]" value="" />
<input type="hidden" id="discount_input--${index}" name="properties[_discount_name]" value="" />
                                            </form>
                                             </product-form>
                                            
                           </li>` ;
           
            $(".multiupload-files").append(htmlData);
          
          $(`#upload-${index}`).find("input.product-variant__input").each(function(){
            $(this).attr("id",index+"--"+$(this).attr("id"));
            $(this).next().attr("for",$(this).attr("id"));
          });
           $(`#discount_input-${index}`).val($(`.master-upload [name="properties[_discount_input]"]`).val());
          $(`#discount_input--${index}`).val($(`.master-upload [name="properties[_discount_name]"]`).val());
          $(`#upload-${index}`).find("precut-wrapper").remove();
           $(`#upload-${index}`).find(".tiggerWrapper").remove();
           $(`#upload-${index}`).find('[for="autoChange"]').remove();
          $(`#upload-${index}`).find('style').remove();
          $(`#upload-${index}`).find('script').remove();
          $(`#option_checkbox-${index}`).prop('checked',$(`.master-upload .option_checkbox`).prop("checked"));
          $(`#option_checkbox_upscale-${index}`).prop('checked',$(`.master-upload .option_checkbox_upscale`).prop("checked"));
       // $(`#upload-${index}`).html($(`#upload-${index}`).html().replace(/.master-upload/g,`#upload-${index}`));
          $(`#upload-${index}`).find(".tab_header  a").each(function(){
            $(this).attr("onclick","");
          })
          $(`#upload-${index} form`).append(`<label for="autoChange-${index}">
                          <input type="checkbox"  id="autoChange-${index}" class="autoChange" checked="">
                          </label>`);
         
         // $(`#upload-${index} product-variants .product-variants .product-variant[option="2"] input[value="No - Leave in a roll"]`).click();
          if(addPreloadedfile == true){
          //  $(`#upload-${index} .size_selection sizes-blocks`).html($(`.master-upload .size_selection sizes-blocks`).html()); 
            $(`#upload-${index} .fileupload_preview`).html($(`.master-upload .fileupload_preview`).html()) 
         //  $(`#upload-${index} sizes-blocks .widthHeight__custom[item="1"] [name="width__value"]` ).val($(`.master-upload sizes-blocks .widthHeight__custom[item="1"] [name="width__value"]` ).val());
         //  $(`#upload-${index} sizes-blocks .widthHeight__custom[item="1"] [name="height__value"]` ).val($(`.master-upload sizes-blocks .widthHeight__custom[item="1"] [name="height__value"]` ).val());
          }
                if (file_type == 'image/svg+xml') {
                  const reader = new FileReader();
                  reader.onload = function(e) {
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(e.target.result, 'image/svg+xml');
                    const svgElement = svgDoc.documentElement;
                    const width = svgElement.getAttribute('width');
                    const height = svgElement.getAttribute('height');
                    if ( width == null && height == null ) {
                      noWidthAndHeightForSVG = true;
                      console.log ( `SVG NO Width and Height` );
                    } else {
                      noWidthAndHeightForSVG = false;
                      console.log ( 'SVG `Width: ${width}, Height: ${height}`', `Width: ${width}, Height: ${height}` );
                    }
                    // document.getElementById('output').innerText = `Width: ${width}, Height: ${height}`;
                  };
                  reader.readAsText(file);
                }
              
                // Call Function uploadFile(), And Send To Her The Dropped File :)
                let parentDiv = `#upload-${index}`;
                if(direct == null){  
                  console.log("inner===>",file,second_image,parentDiv)
                uploadFile(file,second_image,parentDiv);
                } else{

                    let getfileExt = file.split('.').pop().split("?")[0]; 
                    if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || getfileExt.indexOf(".psd") > -1  || getfileExt.indexOf(".svg") > -1) {
                       if(file.indexOf("fm=png") == -1){
                         //document.querySelector(`#upload-${index} .fileupload_hero`).setAttribute('src', file+"&fm=png");
                      }
                    } 
                   console.log("inner===>11",file,second_image,parentDiv,getfileExt)
                     if ( getfileExt == 'psd' || getfileExt == 'eps' || getfileExt == 'ai' || getfileExt == 'pdf'  || getfileExt == 'svg'  ) {
                          $( `#upload-${index} .fileupload_bg_options .style3` ).last().hide();
                          $( `#upload-${index} .option_checkbox, #upload-${index} .option_checkbox_upscale` ).prop( `checked`, false );
                        } else {
                          $( `#upload-${index} .fileupload_bg_options .style3` ).show();
                        }
                                    
                  originalUploadedFileURL = file;
                  executeNextStep(file, false, false, false, null, false, null, parentDiv, true, addPreloadedfile );
                  progressMove("quick", 0, parentDiv );
                }
        };

             if(prevIndex > 0){
          setTimeout(function(){
            if(window.innerWidth > 700){
              $('.multiupload-popup-left').animate({
                scrollTop: lastUploadHeight
              }, 500);
            }else{
                 $('.customTabelPopup__overlay-8').animate({
                  scrollTop: lastUploadHeight
                }, 500);
            }  
            },1000)
           }
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
//alert(event.dataTransfer.files.length);    
  // Select The Dropped File
  if(event.dataTransfer.files.length > 1){
       multiuploadHTML(event.dataTransfer);
  }else{
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
        console.log ( `SVG NO Width and Height` );
      } else {
        noWidthAndHeightForSVG = false;
        console.log ( 'SVG `Width: ${width}, Height: ${height}`', `Width: ${width}, Height: ${height}` );
      }
      // document.getElementById('output').innerText = `Width: ${width}, Height: ${height}`;
    };
    reader.readAsText(file);
  }

  // Call Function uploadFile(), And Send To Her The Dropped File :)
  uploadFile(file);
  }
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
   if(event.target.files.length > 1){
       multiuploadHTML(event.target);
  }else{
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
   }
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
function uploadFile(file, uploadtype = null, parentContainer = ".master-upload", avoidMainImage = false) {
  isFileUpload = true;
  // FileReader()
  // console.log ( 'upload file start',  );
  const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
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
      $(parentContainer+ " .option_checkbox").prop("checked",false);
      $(parentContainer+ " .remove_background").val("No");
    }else{
      $(parentContainer+ " .option_checkbox").prop("checked",true);
      $(parentContainer+ " .remove_background").val("Yes");
    }
    $(parentContainer+ " .option_checkbox_upscale").prop("checked",false);
    $(parentContainer+ " .custom_tab_container").addClass("is_disabled");
    $(parentContainer+ " .widthHeight__item__action").addClass("disabled");
    $(parentContainer+ " .fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(parentContainer+ " .easyzoom").addClass("image-loading");
    // alert(uploadtype);
    if(uploadtype == "second_image"){
        if($(".customTabelPopup__overlay-8").css("display") != "grid"){
         $(".product-gallery").show();
          $(".dtf_imgix_images").hide();
        }
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
      $( parentContainer+ ` [name="properties[Design Notes]"]` ).val( `` );
     if(avoidMainImage == false)
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

      $( parentContainer+` .customQtyFile__qty` ).val(parseInt($( `.customQtyFile__qty` ).attr("min")));
      $("product-form .add-to-cart").addClass("second-tranfer-btn")
      return false;
    }
    // Add Class (drop-zoon--Uploaded) on (drop-zoon)
    dropZoon.classList.add('drop-zoon--Uploaded');
    document.body.classList.add('image-uploaded');

    // Show Loading-text
  //  loadingText.style.display = "block";
    // Hide Preview Image
    //  previewImage.style.display = 'none';

    // Remove Class (uploaded-file--open) From (uploadedFile)
    document.querySelector(parentContainer+ ' .uploaded-file').classList.remove('uploaded-file--open');
    // Remove Class (uploaded-file__info--active) from (uploadedFileInfo)
 document.querySelector(parentContainer+' .uploaded-file__info').classList.remove('uploaded-file__info--active');

    // After File Reader Loaded
    fileReader.addEventListener('load', async function () {
      // After Half Second
      // setTimeout(function () {
      // Add Class (upload-area--open) On (uploadArea)
      uploadArea.classList.add('upload-area--open');

      // Hide Loading-text (please-wait) Element
    //  loadingText.style.display = "none";
      // Show Preview Image
      //  previewImage.style.display = 'block';

      // Add Class (file-details--open) On (fileDetails)
      document.querySelector(parentContainer+ ' .file-details').classList.add('file-details--open');
      // Add Class (uploaded-file--open) On (uploadedFile)
      document.querySelector(parentContainer+ ' .uploaded-file').classList.add('uploaded-file--open');
      // Add Class (uploaded-file__info--active) On (uploadedFileInfo)
      document.querySelector(parentContainer+' .uploaded-file__info').classList.add('uploaded-file__info--active');
      // document.querySelector(".drop-zoon__icon").style.display = 'none';
      // document.querySelector(".drop-zoon__paragraph").style.display = 'none';
      // executeNextStep(filePath, true, true);
      // }, 500); // 0.5s

      // Add The (fileReader) Result Inside (previewImage) Source
      // previewImage.setAttribute('src', fileReader.result);
      
      if(file.name.indexOf(".pdf") > -1 || file.name.indexOf(".psd") > -1 || file.name.indexOf(".eps") > -1 || file.name.indexOf(".svg") > -1 || file.name.indexOf(".ai") > -1 ) {
       document.querySelector(parentContainer+ " .fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png?v=1728297951");
      } else {
        if (isGangPage) {
         document.querySelector(parentContainer+ " .fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png?v=1728297951");
        } else {
          // document.querySelector("#fileupload_hero").setAttribute('src', fileReader.result);
        }
      }
      //document.querySelector("#fileupload_hero").setAttribute('src', "https://cdn.shopify.com/s/files/1/0558/0265/8899/files/loader-2.gif?v=1723724647");

      // Add File Name Inside Uploaded File Name
      document.querySelector(parentContainer+'  .uploaded-file__name').innerHTML = file.name;
      if(parentContainer == ".master-upload")
         document.querySelector(parentContainer+".fileupload_custom").style.display = "block";
      else  
        document.querySelector(parentContainer+" .fileupload_custom").style.display = "block";
       progressMove("",fileSize, parentContainer);

      document.querySelector("#uploadArea").classList.add("hidden");
      // Call Function progressMove();
      // Configure AWS SDK with your credentials

      const randomName = file.name.split('.')[0].replace(/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '-')+"____"+'image_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.' + file.name.split('.').pop();

      getfileExt = randomName.split('.').pop();
      if ( getfileExt == 'psd' || getfileExt == 'eps' || getfileExt == 'ai' || getfileExt == 'pdf'  || getfileExt == 'svg'  ) {
         $( parentContainer+ ` .fileupload_bg_options .style3` ).last().hide();
        $( parentContainer+ " .option_checkbox, "+parentContainer +" .option_checkbox_upscale" ).prop( `checked`, false );
      } else {
        $( parentContainer+ ` .fileupload_bg_options .style3` ).show();
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
          document.querySelector(parentContainer+ " .fileupload_hero").setAttribute('src', filePath+"?h=1000&auto=compress&q=50&fm=png");
        }else{
            document.querySelector(parentContainer+ " .fileupload_hero").setAttribute('src', `${ filePath }`);
          
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
          executeNextStep(filePath, true, true, true, randomName, true, file_crc, parentContainer);
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

$("body").on("click",".option_checkbox", function(){
  let dataParent = $(this).data("parent"); 
  let applicationFiles = $(dataParent+` input[name="properties[Upload (Vector Files Preferred)]"]`).val();
  originalUploadedFileURL = applicationFiles;
    const isPopularActive = $( dataParent+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
  if ( typeof isDTFPage !== 'undefined' && isDTFPage && isPopularActive == 'popular' ) {
    onlyImgUpdate(dataParent);
  } else {
  let switchImages = true;
   isFileUpload = false;
  let time = 3000;
  $(dataParent+" .fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
  $(dataParent+" .easyzoom").addClass("image-loading");
  if($(this).is(":checked") == true){
    console.log('file_url changed due because BG set to TRUE');
    $(dataParent+" .remove_background").val("Yes");
    $(dataParent+" .fileupload_info p strong").html("Cropped size");
    $(dataParent+" .easyzoom,"+dataParent+" .viewer-box").removeClass("no-bg");
    if(switchImages)
    executeNextStep(applicationFiles, true, true, false, null, false, null, dataParent );
  }else{
    console.log('file_url changed due because BG set to FALSE');
    $(dataParent+" .remove_background").val("No");
   // $('[href="#custom_size"]').click();
    $(dataParent+" .fileupload_info p strong").html("Original size");
   $(dataParent+" .easyzoom,"+dataParent+" .viewer-box").addClass("no-bg");
    if(switchImages)
    executeNextStep(applicationFiles, false, false, false, null, false, null, dataParent );
  }

   $(dataParent+" .fileupload_hero").on("load", function() {
 // if($(this).attr("src").indexOf("trim=") > -1){
    let inter =  setInterval(function(){
      if($(dataParent+" .uploaded-file__counter").html() == "100%"){
        $(dataParent+" .easyzoom").removeClass("image-loading");
        $(dataParent+" .fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
        clearInterval(inter);
      }
    },100)
 // }
});
  }
});


function onlyImgUpdate(parentContainer) {
  try {
    const bgRemoveState = $( parentContainer+` .option_checkbox` ).is( `:checked` );
    const superResState = $( parentContainer+` .option_checkbox_upscale` ).is( `:checked` );
    let getUploadedFile = $(parentContainer+` input[name="properties[Upload (Vector Files Preferred)]"]`).val();
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
    $(parentContainer+" .fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(parentContainer+" .easyzoom").addClass("image-loading");

    $( parentContainer+` file-preview .fileupload_hero` ).attr( `src`, `${ getUploadedFile }?${ makeParams }` );
    $( parentContainer+` file-preview .viewer-box img` ).attr( `src`, `${ getUploadedFile }?${ makeParams }` );

    console.log ( 'getUploadedFile', getUploadedFile, `makeParams`, makeParams );
  } catch ( err ) {
    console.log( `ERROR onlyImgUpdate()`, err.message );
  }
}

$("body").on("click",".option_checkbox_upscale", function(){
  let dataParent = $(this).data("parent"); 
  let applicationFiles = $(dataParent+` input[name="properties[Upload (Vector Files Preferred)]"]`).val();
   originalUploadedFileURL = applicationFiles;
   const isPopularActive = $( dataParent+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
  if ( typeof isDTFPage !== 'undefined' && isDTFPage && isPopularActive == 'popular' ) {
    onlyImgUpdate(dataParent);
  } else {
  let switchImages = true;
  let time = 3000;
    isFileUpload = false;
  const isCustomSizeActive = $( dataParent+` .size_selection .tab_header a[href="#custom_size"]` ).hasClass( `active` );
  const isOptionChecked = $( this ).is( `:checked` );
  console.log ( 'applicationFiles', applicationFiles );
  if ( isCustomSizeActive && isOptionChecked ) {
    beforeUpScale__Width = $( dataParent+`.fileupload_preview .horizontal_direction > span` ).text().trim();
    beforeUpScale__height = $( dataParent+` .fileupload_preview .verticle_direction > span` ).text().trim();
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
  
  $(dataParent+" .fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
   $(dataParent+" .easyzoom").addClass("image-loading");
  if($(this).is(":checked") == true){
    console.log('file_url changed due because UPSCAL set to TRUE');

    $(dataParent+" .super_resolution").val("Yes");
    if(switchImages)
    executeNextStep(applicationFiles, true, true, false, null, false, null, dataParent );
  }else{
  console.log('file_url changed due because UPSCAL set to FALSE');

     $(dataParent+" .super_resolution").val("No");
   // $('[href="#custom_size"]').click();
    if(switchImages)
    executeNextStep(applicationFiles, false, false, false, null, false, null, dataParent );
  }
 

  $(dataParent+" .fileupload_hero").on("load", function() {
//  if($(this).attr("src").indexOf("trim=") > -1){
    let inter =  setInterval(function(){
      if($(dataParent+" .uploaded-file__counter").html() == "100%"){
        $(dataParent+" .easyzoom").removeClass("image-loading");
        $(dataParent+" .fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
        clearInterval(inter);
      }
    },100)

//  }
});
  }
})

// Progress Counter Increase Function
function progressMove( filePath, fileSize = 550, parentContainer = ".master-upload" ) {
  
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
        const isCompleted = $( parentContainer +` .easyzoom` ).hasClass("image-loading");
        if ( isCompleted == false ) {
          clearInterval(counterIncrease);
          document.querySelector(".drop-zoon__icon").style.display = 'none';
          document.querySelector(".drop-zoon__paragraph").style.display = 'none';
          if($( parentContainer +' [href="#custom_size"]').hasClass("active") == true){
            $(parentContainer +' [href="#custom_size"]').click();
          }
          $(parentContainer +" .upload_image_info").removeClass("hidden");

          $(parentContainer +" .fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
          $(parentContainer +" .upload-area__file-details").removeClass("file-details--open");
          $(parentContainer +" .uploaded-file").removeClass("uploaded-file--open");
        }
      } else {
        counter = counter + 1;
        $(parentContainer +" .uploaded_progress_bar").css({"width":counter+"%"});
         document.querySelector(parentContainer+ '  .uploaded-file__counter').innerHTML = `${counter}%`
      }
    }, fileSize);
     
  },100);

 
};


// Simple File Validate Function
function fileValidate(fileType, fileSize, file, parentContainer = ".master-upload") {
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
    document.querySelector(parentContainer +' .uploaded-file__icon-text').innerHTML = 'jpg';
  } else { // else
    // Add Inisde (uploadedFileIconText) The Uploaded File Type
   document.querySelector(parentContainer +' .uploaded-file__icon-text').innerHTML = isImage[0];
    
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
    if( document.querySelector(".file-upload-overlay-3"))
      document.querySelector(".file-upload-overlay-3").classList.remove("active");
      document.querySelector("body").classList.remove("file-upload-overlay-3-active");
    return false
  };
};

$('body').on("click",'[href="#popular_size"]', function(){
  let dataParent = $(this).data("parent")??".master-upload";
  console.log ( 'selectedItemNo', selectedItemNo );
  setTimeout(function(){
    let val = $(dataParent+" select.custom-variant-selector.product-variant__container").val().split(" x ")[0].replace('"','');

    console.log ( 'val', val );

    $(dataParent+" .horizontal_direction span").html(val+`.00"`);
    $(dataParent+" .verticle_direction span").html(`<b style='display:inline-block;line-height:1.6;font-size:9px;'>Proportional<br/>Height</b>`);

    $(dataParent+" .horizontal_direction").attr( `x-is`, parseFloat(val) );
    $(dataParent+" .verticle_direction").attr( `y-is`, `Proportional Height`);

    console.log ( 'dataParent', dataParent );

    if ( dataParent == `.master-upload` ) {
      const isAvailablePopularRow = $( `sizes-blocks .widthHeight__custom[option-selected="popular"]` ).length;
      if ( isAvailablePopularRow > 0 ) {
        let getSizeWidth = $( `sizes-blocks .widthHeight__custom[option-selected="popular"]` ).last().attr( `title` );
        getSizeWidth = getSizeWidth.split( `x` )[0];
        getSizeWidth = getSizeWidth.replace( `"`, `` ).trim();
        $(dataParent+" .horizontal_direction").attr( `x-is`, `${ getSizeWidth }.00`).find( `span` ).html( `${ getSizeWidth }.00"` );
      }
    }

    console.log ( '$(dataParent+" select.custom-variant-selector.product-variant__container").val()', $(dataParent+" select.custom-variant-selector.product-variant__container").val() );

    dimensionsClassesApply( val, $(dataParent+" select.custom-variant-selector.product-variant__container").val().split(" x ")[1].replace('"',''), dataParent );

    manageProperties(dataParent);
  },500);
});


$('body').on("click",'[href="#custom_size"]', function(){
   let dataParent = $(this).data("parent")??".master-upload";
  setTimeout(function(){
    //let size = $(".widthHeight__option-detectedSize [d-size]").html().replace(" x ","x").split("x");
    if ( dataParent == `.master-upload` ) {
      const isAvailableCustomRow = $( `sizes-blocks .widthHeight__custom[option-selected="custom"]` ).length;
      if ( isAvailableCustomRow > 0 ) {
        $(dataParent+" .horizontal_direction span").html(parseFloat($(dataParent+' input[name="width__value"]').val()).toFixed(2)+'"');
        $(dataParent+" .verticle_direction span").html(parseFloat($(dataParent+' input[name="height__value"]').val()).toFixed(2)+'"');

        $(dataParent+" .horizontal_direction").attr( `x-is`, parseFloat($(dataParent+' input[name="width__value"]').val()).toFixed(2) );
        $(dataParent+" .verticle_direction").attr( `y-is`, parseFloat($(dataParent+' input[name="height__value"]').val()).toFixed(2) );
      }
    } else {
      $(dataParent+" .horizontal_direction span").html(parseFloat($(dataParent+' input[name="width__value"]').val()).toFixed(2)+'"');
      $(dataParent+" .verticle_direction span").html(parseFloat($(dataParent+' input[name="height__value"]').val()).toFixed(2)+'"');

      $(dataParent+" .horizontal_direction").attr( `x-is`, parseFloat($(dataParent+' input[name="width__value"]').val()).toFixed(2) );
      $(dataParent+" .verticle_direction").attr( `y-is`, parseFloat($(dataParent+' input[name="height__value"]').val()).toFixed(2) );
    }

    dimensionsClassesApply( parseFloat($(dataParent+' input[name="width__value"]').val()), parseFloat($(dataParent+' input[name="height__value"]').val()), dataParent );

    manageProperties(dataParent);
  },500);
});

async function reloadShippingBar(){
    let cartTotal = 0; 
        setTimeout(function(){         
            cartTotal = Number($("#AjaxCartSubtotal .cart__total strong span").html().replace("$",""));
            $(".multiupload-files .precut-unit-logic__total").each(function(){
               cartTotal += Number($(this).find(".__discountedPrice").html().replace("$",""))
            }) 
          
        },500)
       await ApplyDelay( 1000 );
            
        await fetch( `/cart?view=shipping-bar&price=${ cartTotal }` )
          .then(response => {
              // When the page is loaded convert it to text
              return response.text()
            })
            .then(html => { 
             // console.log("html",html);
               $("#free-shipping-bysize").html(html)
            }) 
        
      }
function setImageDimensions(parentContainer = ".master-upload") {
  try {
    
    let activeTabIs = '';
    const selectedTab = $( parentContainer+` .tab_header > a[href="#popular_size"].active` ).length;
    if ( selectedTab > 0 ) {
      activeTabIs = 'popular';
    } else {
      activeTabIs = 'custom';
    }

    if ( activeTabIs == 'popular' ) {
      const isRowAvailable = $(  parentContainer+` sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"]` ).length;
      if ( isRowAvailable > 0 ) {
        let currentSelectedOptionVal = $(  parentContainer+` sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val();
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
 
      
            $(  parentContainer+` .fileupload_preview .horizontal_direction span` ).text( `${ getSelectedWidth.toFixed( 2 ) }"` );
            $(  parentContainer+` .fileupload_preview .verticle_direction span` ).html( `<b style='display:inline-block;line-height:1;font-size:12px;font-weight: 400;'>Proportional Height</b>` );

            $(  parentContainer+` .fileupload_preview .horizontal_direction` ).attr( `x-is`, `${ getSelectedWidth.toFixed( 2 ) }` );
            $(  parentContainer+` .fileupload_preview .verticle_direction` ).attr( `y-is`, `Proportional Height` );

            dimensionsClassesApply( getSelectedWidth, getSelectedHeight, parentContainer );
          }
        }
      } else {
        $(  parentContainer+` .fileupload_preview .horizontal_direction span` ).text( `--` );
        $(  parentContainer+` .fileupload_preview .verticle_direction span` ).text( `--` );
      }
    } else if ( activeTabIs == 'custom' ) {
      const isRowAvailable = $(  parentContainer+` sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"]` ).length;
      if ( isRowAvailable > 0 ) {
        let getSelectedWidth, getSelectedHeight;
        const isActiveRowAvailable = $(  parentContainer+` sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"][item="${ selectedItemNo }"]` ).length;
        if ( isActiveRowAvailable > 0 ) {
          getSelectedWidth = $(  parentContainer+` sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"][item="${ selectedItemNo }"] .widthHeight__item__action[by="width"] .widthHeight__value` ).val() * 1;
          getSelectedHeight = $(  parentContainer+` sizes-blocks .widthHeight__custom[option-selected="${ activeTabIs }"][item="${ selectedItemNo }"] .widthHeight__item__action[by="height"] .widthHeight__value` ).val() * 1;

          $(  parentContainer+` .fileupload_preview .horizontal_direction span` ).text( `${ getSelectedWidth.toFixed( 2 ) }"` );
          $(  parentContainer+` .fileupload_preview .verticle_direction span` ).text( `${ getSelectedHeight.toFixed( 2 ) }"` );

          $(  parentContainer+` .fileupload_preview .horizontal_direction` ).attr( `x-is`, `${ getSelectedWidth.toFixed( 2 ) }` );
          $(  parentContainer+` .fileupload_preview .verticle_direction` ).attr( `y-is`, `${ getSelectedHeight.toFixed( 2 ) }` );
        }
      } else {
        $(  parentContainer+` .fileupload_preview .horizontal_direction span` ).text( `--` );
        $(  parentContainer+` .fileupload_preview .verticle_direction span` ).text( `--` );
      }
    } else {
      $(  parentContainer+` .fileupload_preview .horizontal_direction span` ).text( `--` );
      $(  parentContainer+` .fileupload_preview .verticle_direction span` ).text( `--` );
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

    $(".horizontal_direction").attr( `x-is`, `${ parseFloat(size[0]).toFixed(2)}`);
    $(".verticle_direction").attr( `y-is`, `Proportional Height`);
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

$("body").on("click",".tab_header:not(.upload_files_tab_header) > a", function(e){
  e.preventDefault();
  let item_1 = $(this).parents(".custom_tabs").find(".tab_header:not(.upload_files_tab_header) > a");
    $(item_1).removeClass("active");
   let item_2 = $(this).parents(".custom_tabs").find(".tab_body:not(.upload_files_tab_data) > div");
     $(item_2).removeClass("active");
  $(this).addClass("active");
  let activeClass = $(this).attr("href").replace("#","");
  let item_3 = $(this).parents(".custom_tabs").find(".tab_body:not(.upload_files_tab_data) > div[data-id="+activeClass+"]")
    $(item_3).addClass("active"); 
});

$(".tab_header.upload_files_tab_header > a").on("click", function(e){
  e.preventDefault();
  $(".tab_header.upload_files_tab_header > a,.tab_body.upload_files_tab_data > div").removeClass("active");
  $(this).addClass("active");
  $(".tab_body.upload_files_tab_data > div"+$(this).attr("href")).addClass("active");
});

$(".custom-variant-selector").on("change", function(){
  let value = $(this).val();
  parentContainer =  "#"+$(this).parents("li[id^='upload-']").attr("id")??".master-upload";
  $(parentContainer+" .product-variant__item.product-variant__item--radio input[value='"+value+"']").click();
});


$("body").on("click","[data-id='fileremove-2']",function(e) {
  e.preventDefault();
  let parent = $(this).data("parent");
  $("#fileremove").attr("onclick",`removeSingleItem('${parent}')`);
  $("#fileremove").attr("data-parent",parent);
  $(".customTabelPopup__overlay-2").fadeIn(500);
});

function removeSingleItem(parentItem){
  event.preventDefault();
    $(parentItem).remove();
    manageQuantities("", null, ".multiupload-files" );
  $(".customTabelPopup__overlay-2").fadeOut(500);
  if($(".multiupload-files > li").length == 0)
    reloadEntirePage()
}

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

$(".purchase_from_previous").on("click", function(e){
  e.preventDefault();
  e.stopImmediatePropagation();

  /* Puff / Spangle color-gate fires ONLY for a `second_upload` trigger.
     The first-upload "Choose a previously uploaded design" link is the
     user's entry point — they may legitimately pick a design BEFORE
     picking a color. Blocking it here would make the link appear
     locked. */
  if ( $(this).data("type") === "second_upload" ) {
    if ( !_ntPuffSpangleColorGate() ) return;
  }

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
                <input type="checkbox" class="popupinput checkbox-field" id="select---${i}" data-src="${data[i].file}" data-name="${file_name}" />
                <div class="checkbox-input checkbox-block">
                 <label for="select---${i}">
                   <i></i>
                 </label> 
                </div>
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
                 <input type="checkbox" class="popupinput checkbox-field" id="select--${i}" data-src="${data[i].file}" data-name="${file_name}" />
                <div class="checkbox-input checkbox-block">
                 <label for="select--${i}">
                   <i></i>
                 </label> 
                </div>
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
$("body").on("click", ".use_designes_bulk", function(e){
  e.preventDefault();
  
  
  if($(this).parents(".image_containers").find(".customer_designes input.popupinput:checked").length < 2 && $(".customTabelPopup__overlay-8").css("display") != "grid"){
    $(this).parents(".image_containers").find(".customer_designes input.popupinput:checked").parents("li").find(".use_design").click();
  }else{
    $(".customTabelPopup__overlay-3").hide();
    let ev = {};
        ev.files = [];
        $(this).parents(".image_containers").find(".customer_designes input.popupinput:checked").each(function(){ 
             ev.files.push($(this).data("src"));
        }); 
       multiuploadHTML(ev,null,"direct")
  }
  $(this).prop("disabled",true);
});

$("body").on("click", ".customer_designes li input", function(e){
  if($(this).parents(".customer_designes").find("input:checked").length > 0){
    $(this).parents(".customer_designes").next().find(".use_designes_bulk").prop("disabled",false);
  }else{
    $(this).parents(".customer_designes").next().find(".use_designes_bulk").prop("disabled",true);
  }
})

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
    },2000)
  }
  $( `.generative-ai-area` ).addClass( `hidden` );
  dropZoon.classList.add('drop-zoon--Uploaded');
  document.body.classList.add('image-uploaded');
 // loadingText.style.display = "block";
  uploadedFile.classList.remove('uploaded-file--open');
  uploadedFileInfo.classList.remove('uploaded-file__info--active');
  uploadArea.classList.add('upload-area--open');
  //loadingText.style.display = "none";
  // fileDetails.classList.add('file-details--open');
  // uploadedFile.classList.add('uploaded-file--open');
	uploadedFileInfo.classList.add('uploaded-file__info--active');
	document.querySelector(".fileupload_hero").setAttribute('src', datapath);
  $(".watermark_image").css({"opacity":1});
    $(".watermark_image img").attr("src",datapath);
	//uploadedFileName.innerHTML = $(this).data("name");
	document.querySelector(".fileupload_custom").style.display = "block";
	progressMove("quick",0);
	document.querySelector("#uploadArea").classList.add("hidden");
	executeNextStep(datapath, true, true, false);


  const checkPropertyEle = $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).length;
  let _originalUploadedFileURL = datapath.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0];
  let getfileExt = _originalUploadedFileURL.split('.').pop(); 
  let vector = datapath;
  let org = _originalUploadedFileURL;
  if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || _originalUploadedFileURL.indexOf(".psd") > -1  || _originalUploadedFileURL.indexOf(".svg") > -1) {
    vector = org;
    if(datapath.indexOf("fm=png") == -1){
    document.querySelector(".fileupload_hero").setAttribute('src', datapath+"&fm=png");
    }
  } 
   if ( getfileExt == 'psd' || getfileExt == 'eps' || getfileExt == 'ai' || getfileExt == 'pdf'  || getfileExt == 'svg'  ) {
       $( `.fileupload_bg_options .style3` ).last().hide();
        $( `#option_checkbox, #option_checkbox_upscale` ).prop( `checked`, false );
        $( `product-form .remove_background, product-form .super_resolution` ).val( `No` );
      } else {
        $( `.fileupload_bg_options .style3` ).show();
      }
  if ( checkPropertyEle == 0 ) {
    $( `product-form.product-form form` )
      .append( `
        <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${ vector }">
        <input type="hidden" name="properties[_Original Image]" value="${ org }">
      ` );
  } else {
    $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).val( `${ vector }` );
    $( `product-form.product-form form [name="properties[_Original Image]"]` ).val( `${ org }` );
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
  if($(this).hasClass("customTabelPopup__overlay-8")){
    document.querySelector('.customTabelPopup__overlay-8').style.display = 'grid';
    document.querySelector('.customTabelPopup__overlay-12').style.display = 'grid';
    document.querySelector('html').style.overflow = 'hidden';
  }else{
   $(this).hide();
    }
   $("body").removeAttr("style");
  
});

$("body").on("click",".zoom-box,.zoom_image", function(e){
   let dataParent = $(this).data("parent"); 
  e.preventDefault();
  if(e.target.tagName != "A" || e.target.style.length > 0){
    if($(dataParent+" .easyzoom.zoom-box").hasClass("no-bg")){
      $(".customTabelPopup__overlay-5").removeClass("no-transparant-bg");
    }else{
      $(".customTabelPopup__overlay-5").addClass("no-transparant-bg");
    }
    $(".customTabelPopup__overlay-5 img").attr("src",$(dataParent+" .zoom-box > img").attr("src").replace("h=300&auto=compress&q=50",""));
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
})
*/

try {
  if (location.search.indexOf("file=") === -1) {
    const urlParams = new URLSearchParams(window.location.search);
    const selectionParam = urlParams.get("my_designs_selection");
    if (selectionParam) {
      const sharedSelection = JSON.parse(decodeURIComponent(selectionParam));
      /* Bridge my-designs picker selections into the "design re-used"
         attribution maps. ninja-multiupload.js reads these at cart-add
         time and stamps properties[design re-used] = "previously on
         order # NT-…". Only items sourced from a purchased order
         carry .orderName; uploads have none and skip this. */
      try {
        if (Array.isArray(sharedSelection) && sharedSelection.length) {
          window.__designReUsedByUrl  = window.__designReUsedByUrl  || {};
          window.__designReUsedByName = window.__designReUsedByName || {};
          sharedSelection.forEach(function (it) {
            if (!it || typeof it !== "object" || !it.orderName) return;
            var ord = String(it.orderName).trim();
            if (!ord) return;
            var tag = "previously on order # " + ord;
            var url = it.fileURL ? String(it.fileURL).split("?")[0] : "";
            if (url) {
              window.__designReUsedByUrl[url] = tag;
              if (typeof ninjaS3Host2 !== "undefined" && typeof ninjaS3Host !== "undefined") {
                window.__designReUsedByUrl[url.split(ninjaS3Host2).join(ninjaS3Host)] = tag;
                window.__designReUsedByUrl[url.split(ninjaS3Host).join(ninjaS3Host2)] = tag;
              }
            }
            var basename = url ? url.split("/").pop() : (it.name || "");
            if (basename) window.__designReUsedByName[basename] = tag;
          });
        }
      } catch (_bridgeErr) { /* never block load */ }
      if (sharedSelection.length > 1) {
        urlParams.delete("my_designs_selection");
        const nextUrl = window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");
        window.history.replaceState({}, "", nextUrl);
        multiuploadHTML({
          files: sharedSelection.map(function(item) {
            return typeof item === "string" ? item : item.fileURL;
          }).filter(Boolean)
        }, null, "direct");
      }
    }
  }
} catch (err) {
  console.log("ERROR loading my designs bulk selection", err.message);
}

if(location.search.indexOf("file=") > -1) {
  if(document.querySelector("#ready_to_press"))
    document.querySelector("#ready_to_press").disabled = false;
    //let datapath = location.search.split("file=")[1];
    const urlParams = new URLSearchParams(window.location.search);
    let datapath = urlParams.get("file") || "";
    datapath = decodeURIComponent(datapath).split("&")[0];
    dropZoon.classList.add('drop-zoon--Uploaded');
    document.body.classList.add('image-uploaded');
   // loadingText.style.display = "block";
    uploadedFile.classList.remove('uploaded-file--open');
    uploadedFileInfo.classList.remove('uploaded-file__info--active');
    uploadArea.classList.add('upload-area--open');
   // loadingText.style.display = "none";
    // fileDetails.classList.add('file-details--open');
    // uploadedFile.classList.add('uploaded-file--open');
    uploadedFileInfo.classList.add('uploaded-file__info--active');
    document.querySelector(".master-upload .fileupload_hero").setAttribute('src', datapath);
    $(".viewer-box img").attr('src', datapath);
    document.querySelector(".fileupload_custom").style.display = "block";
    progressMove("quick",0);
    document.querySelector("#uploadArea").classList.add("hidden");
  $( `.generative-ai-area` ).addClass( `hidden` );
    console.log ( 'datapath on load', datapath );
    // https://ninjatransfers.com/products/dtf-transfers?file=https://s3.amazonaws.com/ninja-imgix/Ready%20to%20Press%20Designs/%234005%20American%20Bow%20Tie%20sticker.png&preview_theme_id=129481310291
    let getfileExt = datapath.split("?")[0];
    getfileExt = getfileExt.split(".").pop();
   originalUploadedFileURL = location.search.split("file=")[1];
   

        console.log("getfileExt",getfileExt);
  if(getfileExt ==  "png" || getfileExt == "svg" || getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || originalUploadedFileURL.indexOf(".psd") > -1  || originalUploadedFileURL.indexOf(".svg") > -1){
      $(" .option_checkbox").prop("checked",false);
      $(" .remove_background").val("No");
      $( `.fileupload_bg_options .style3` ).last().hide();
        $( `.option_checkbox, .option_checkbox_upscale` ).prop( `checked`, false );
    }else{
      $(" .option_checkbox").prop("checked",true);
      $(" .remove_background").val("Yes");
    }
    $(" .option_checkbox_upscale").prop("checked",false);
    $(" .custom_tab_container").addClass("is_disabled");
    $(" .widthHeight__item__action").addClass("disabled");
    $(" .fileupload_bg_options").css({"opacity":0.5,"pointer-events":"none"});
    $(" .easyzoom").addClass("image-loading");

  
    isReadyToPress = true;
    executeNextStep(datapath, true, true, false);
  //  uploadedFileName.innerHTML = location.search.split("file=")[1].replace("https://","").split("/")[1];
    
    let _originalUploadedFileURL = originalUploadedFileURL.replace(ninjaImgixHost,ninjaS3Host2).split("?")[0]; 
 // let getfileExt = _originalUploadedFileURL.split('.').pop(); 
  let vector = originalUploadedFileURL;
  let org = _originalUploadedFileURL;  
   if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || _originalUploadedFileURL.indexOf(".psd") > -1  || _originalUploadedFileURL.indexOf(".svg") > -1) {
        vector = org;
    }
  
  setTimeout(function() { 
 const checkPropertyEle = $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).length; 
 if ( checkPropertyEle == 0 ) {
    $( `product-form.product-form form` )
      .append( `
        <input type="hidden" name="properties[Upload (Vector Files Preferred)]" value="${ vector }">
        <input type="hidden" name="properties[_Original Image]" value="${ org }">
      ` );
  } else {
    $( `product-form.product-form form [name="properties[Upload (Vector Files Preferred)]"]` ).val( `${ vector }` );
    $( `product-form.product-form form [name="properties[_Original Image]"]` ).val( `${ org }` );
  }
   },6000)
 /*   if ( getfileExt == 'ai' || getfileExt == 'eps' || getfileExt == 'pdf'  || datapath.indexOf(".psd") > -1) {
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
    } */
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
$(".master-upload .fileupload_hero").on("load", function() {
  if ( typeof isDTFPage !== 'undefined' && isDTFPage ) {
    let imgSrc = document.querySelector( `.master-upload .fileupload_hero` );
    imgSrc = imgSrc.getAttribute( `src` );
    if ( imgSrc.includes( `//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png` ) == false ) {
     waitForImageLoadById('.master-upload .fileupload_hero')
        .then(() => {
          const isPopularActive = $( `.master-upload sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
          if ( isPopularActive == 'popular' ) {
            $( `.master-upload sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item__popular .popularSizes` ).trigger(`change`);
          }
          $(".master-upload .fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
          $( `.product__cart-functions .step__2` ).removeClass( `hidden` );
          console.log('✅ Image loaded');
        //  $(".master-upload .easyzoom").removeClass("image-loading");
          // Do stuff after successful load
        })
        .catch((err) => {
          console.error('❌ Image failed to load', err);
          // Handle error or show fallback
        })
        .finally(() => {
         // $(".master-upload .easyzoom").removeClass("image-loading");
          $( `.loadingScreen__` ).remove();
          console.log('🎯 Done checking image, moving forward');
          // This runs no matter what — cleanups, UI updates, enabling buttons, etc.
        });
    }
  } else {
    if($(this).attr("src").indexOf("trim=") > -1){
      let inter =  setInterval(function(){
        if($(".uploaded-file__counter").html() == "100%"){
         // $(".easyzoom").removeClass("image-loading");
        //  $(".fileupload_bg_options").css({"opacity":1,"pointer-events":"all"});
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
  const img = document.querySelector(id);

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
          //  img.src = retrySrc;
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
       // img.src = '';
      //  img.src = initialSrc;
      }
    });
  }

  return tryLoadImage(0);
}

function calculateDPI(type = "custom", parentContainer = ".master-upload") {
  const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
  if ( isSizesBlock == 0 ) {
    if ( typeof fileExt !== 'undefined' && fileExt ) {
      if ( fileExt == 'png' || fileExt == 'jpg' || fileExt == 'jpeg' ) {

        let physicalWidthInInches = $(parentContainer+` .widthHeight__value[name="width__value"]`).val();
        let physicalHeightInInches = $(parentContainer+` .widthHeight__value[name="height__value"]`).val();
        let makeSqInchesForPopular, makeSqInchesForCustom, currentSqInches = 0;
        if ( type == 'popular' ) {
          physicalWidthInInches =  Number($(parentContainer+" popular-wrap input:checked").val().split(" x ")[0].replace('"',''));
          physicalHeightInInches =  Number($(parentContainer+" popular-wrap input:checked").val().split(" x ")[1].replace('"',''));

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
            $(parentContainer+" .dpi_warning").addClass("active");
            $( parentContainer+` .dpi_warning recommended-size` ).text( `Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }` );
          } else if ( makeSqInchesForCustom > 288 && makeSqInchesForCustom > currentSqInches ) {
            $(parentContainer+" .dpi_warning").removeClass("active");
          } else {
            $(parentContainer+" .dpi_warning").addClass("active");
            $( parentContainer+` .dpi_warning recommended-size` ).text( `Maximum recommended size is ${ (uploadedFileWidth / 72).toFixed(2) } x ${ (uploadedFileHeight / 72).toFixed(2) }` );
          }

        } else if ( type == 'popular' ) {
          const recommendedSqInches = ((uploadedFileWidth / 72) * (uploadedFileHeight / 72));
          if ( recommendedSqInches < 4 ) {
            $( parentContainer+` .dpi_warning recommended-size` ).html( `<span style="color: #d00;">Please upload larger size image</span>` );
            $(parentContainer+" .dpi_warning").addClass("active");
          } else if ( makeSqInchesForPopular < recommendedSqInches ) {
            $(parentContainer+" .dpi_warning").removeClass("active");
          } else {
            $( parentContainer+` .dpi_warning recommended-size` ).text( `Maximum recommended square inches are ${ Math.trunc( recommendedSqInches ) }` );
            $(parentContainer+" .dpi_warning").addClass("active");
          }
        } else {
          $( parentContainer+` .dpi_warning recommended-size` ).text( `` );
        }
      }
    }
  }
}


$('body').on("click", '[href="#popular_size"]', async function(){
  let parentContainer = $(this).data("parent");
  currentSelectedOption = 'popular';
  const isDtfImgixEle = $( `.dtf_imgix_images` ).length;
  if ( isDtfImgixEle > 0 ) {
    $( `.dtf_imgix_images` ).hide();
    $( `.gallery_position.product-gallery[data-js-product-gallery]` ).show();
  }
  addMoreIfNotExist(parentContainer);
  $( parentContainer+` .add-more-block .addmore_size popular--size` ).removeClass( `hidden` );
  $( parentContainer+` .add-more-block .addmore_size custom--size` ).addClass( `hidden` );
  $(  parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).addClass( `disabled` );
  $(  parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).removeClass( `disabled` );
  const isPopularEle = $(  parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="popular"]` );
  if ( isPopularEle.length > 0 ) {
    const getLastPopulatItemVal = isPopularEle.last().find( `.popularSizes` ).val(); 
   // $(  `.master-upload product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getLastPopulatItemVal }"]` ).click();
    $(  parentContainer+` product-variants .product-variant__container .product-variant__item .product-variant__label[val="${ getLastPopulatItemVal }"]` ).click();
    selectedItemNo = isPopularEle.last().attr( `item` );
  }
  await addDelay( 1000 );
  const isSizesBlock = $(  parentContainer+` sizes-blocks` ).length;
  if ( isSizesBlock > 0 ) {
    calculateDPILineItem("popular", parentContainer);
  } else {
    calculateDPI("popular", parentContainer);
  }
});

$(`body`).on("click",'[href="#custom_size"]',async function(){
  let parentContainer = $(this).data("parent");
  const isDtfImgixEle = $( `.dtf_imgix_images` ).length;
  if ( isDtfImgixEle > 0 ) {
      if($(".customTabelPopup__overlay-8").css("display") != "grid"){
    $( `.dtf_imgix_images` ).show();
    $( `.gallery_position.product-gallery[data-js-product-gallery]` ).hide();
      }
  }
  currentSelectedOption = 'custom';
  // addMoreIfNotExist();
  $( parentContainer+` .add-more-block .addmore_size popular--size` ).addClass( `hidden` );
  $( parentContainer+` .add-more-block .addmore_size custom--size` ).removeClass( `hidden` );
  $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="custom"]` ).removeClass( `disabled` );
  $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="popular"]` ).addClass( `disabled` );
  const isCustomEle = $( parentContainer+` sizes-blocks .widthHeight__custom[item][option-selected="custom"]` );
  if ( isCustomEle.length > 0 ) {
    selectedItemNo = isCustomEle.first().attr( `item` );
  } else {
    currentSelectedOption = 'popular';
  }
  await addDelay( 1000 );
  const isSizesBlock = $( parentContainer+` sizes-blocks` ).length;
  if ( isSizesBlock > 0 ) {
    calculateDPILineItem( currentSelectedOption, parentContainer );
  } else {
    calculateDPI( currentSelectedOption, parentContainer );
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

function reloadEntirePage(){
  $( `body` ).append( `<div class="loadingScreen__"><img src="https://cdn.shopify.com/s/files/1/0558/0265/8899/files/loader-2.gif?v=1723724647"></div>` );
  location.reload();
}

 $('body').on("keyup click change",'[name="properties[Design Notes]"]', function (){ 
  $(this).val($(this).val().replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, ''));
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
