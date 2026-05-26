/* ─── Universal trash hard-reload (capture phase) ──────────────────
   Binds immediately on script load (before DOMContentLoaded) so the
   listener is in place no matter when the user opens the trash modal.
   Capture phase fires BEFORE any jQuery delegated bubble handlers, so
   stopImmediatePropagation downstream in the chain can't cancel the
   reload. Gated on e.isTrusted so internal programmatic .click() calls
   (resetLoading, gang-sheet replace) still skip the reload and keep
   their lightweight state-reset behavior.
   Lives in this asset file (NOT in a section snippet) to bypass
   Shopify's section-render-cache — the asset URL gets a fresh version
   hash on every theme push, so the new code is GUARANTEED on the page
   on the next request. */
(function () {
  if (typeof window === 'undefined' || window.__ntTrashReloadBound) return;
  window.__ntTrashReloadBound = true;
  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest(
      '#fileremove, ' +
      'file-remove-wrapper .fileRemoveBlock__removeFile, ' +
      'file-remove-wrapper-multi .fileRemoveBlock__removeFile, ' +
      '.customTabelPopup__overlay-2 #fileremove'
    );
    if (!btn) return;
    /* Exclude the "delete a saved design from My Designs library"
       button — that runs an ajax delete and shouldn't reload. */
    if (btn.id === 'fileremove-single') return;
    setTimeout(function () { window.location.reload(); }, 60);
  }, true /* capture phase */);
})();

/* AI-page handoff stash consumer. Fresh-tile "Use this design" clicks on
   /pages/ai-image-creator route through ai-chat-sandbox.js stashAndHandoff,
   which writes sessionStorage[`dtf:pending-ai-uploads:v1`] and navigates here
   with no query param. Convert that stash into the same `?file=URL`
   (single) / `?my_designs_selection=JSON` (multi) shape this file's
   onLoadHandler already consumes (see ~line 2162). */
(function rehydrateAiHandoffStash() {
  try {
    var STASH_KEY = 'dtf:pending-ai-uploads:v1';
    var raw = sessionStorage.getItem(STASH_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    var items = parsed && Array.isArray(parsed.items) ? parsed.items : null;
    if (!items || !items.length) return;
    sessionStorage.removeItem(STASH_KEY);

    var u = new URL(window.location.href);
    /* Don't clobber an explicit handoff already on the URL. */
    if (u.searchParams.get('file') || u.searchParams.get('my_designs_selection')) return;

    if (items.length === 1) {
      var url = items[0] && (items[0].file || items[0].url);
      if (!url) return;
      u.searchParams.set('file', url);
    } else {
      var payload = items.map(function (it, i) {
        return {
          id: 'ai-stash-' + Date.now() + '-' + i,
          name: (it && it.fileName) || ('ai-image-' + (i + 1) + '.png'),
          fileURL: it && (it.file || it.url)
        };
      }).filter(function (e) { return !!e.fileURL; });
      if (!payload.length) return;
      u.searchParams.set('my_designs_selection', JSON.stringify(payload));
    }
    window.location.replace(u.toString());
  } catch (_) { /* sessionStorage / URL may be unavailable — fall through */ }
})();

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
  // strip optional "previously on order # " prefix that lives on
  // data-photoid attributes
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
let selectedBlockNo = 1;
anotherTransfer = false;
let customItemHTML = '';
let popularItemHTML = '';
var onePercentOfPreview = 11.36363636363636;
let isReadyToPress = false;
let anotherPuff = false;
let isAIImage = false;
let isFileUpload = false;
let beforeUpScale__Width = 0;
let beforeUpScale__height = 0;
let uploadType = '';
let isGangPage = false;
let suppressThumbClickHandler = false;
let keyUpTimeOut = null;
let singleProgressMove;
let singleUploadCustomEditDetected = false;
let singleUploadPopularEditDetected = false;
const multiUploadProcessingBlocks = new Set();

function refreshMultiUploadCheckoutState( shouldDisable = null ) {
  const $button = $( `multi-upload-wrapper proceed-to-checkout .addToCartGroupItemsMultiple` );
  if ( $button.length === 0 ) return;

  const isProcessing = multiUploadProcessingBlocks.size > 0;
  const nextDisabledState = shouldDisable === null ? isProcessing : ( shouldDisable || isProcessing );
  $button.toggleClass( `disabled`, nextDisabledState );
}

function beginMultiUploadProcessing( blockNo ) {
  if ( typeof blockNo === 'undefined' || blockNo === null ) return;
  multiUploadProcessingBlocks.add( `${ blockNo }` );
  refreshMultiUploadCheckoutState( true );
}

function endMultiUploadProcessing( blockNo ) {
  if ( typeof blockNo !== 'undefined' && blockNo !== null ) {
    multiUploadProcessingBlocks.delete( `${ blockNo }` );
  }
  refreshMultiUploadCheckoutState();
}

async function finalizeMultiUploadProcessing(blockNo) {
  endMultiUploadProcessing( blockNo );
  await addDelay( 400 );
  refreshMultiUploadCheckoutState( false );
}

function setSingleUploadCustomEditDetected( state ) {
  singleUploadCustomEditDetected = state === true;
  $( `upload-controls sizes-blocks` ).toggleClass( `has-custom-edit`, singleUploadCustomEditDetected );
}

function setSingleUploadPopularEditDetected( state ) {
  singleUploadPopularEditDetected = state === true;
  $( `upload-controls sizes-blocks` ).toggleClass( `has-popular-edit`, singleUploadPopularEditDetected );
}

// Track custom/popular edit state per multi-upload block so each file keeps its own visibility/filter state.
function setMultiUploadEditDetected( blockNo, type, state ) {
  const $sizesBlock = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks` );
  if ( $sizesBlock.length === 0 ) return;

  if ( type == `custom` ) {
    $sizesBlock.toggleClass( `has-custom-edit`, state === true );
    // console.log( `[multi-upload] block ${ blockNo } custom edit state: ${ state === true }` );
  } else if ( type == `popular` ) {
    $sizesBlock.toggleClass( `has-popular-edit`, state === true );
    // console.log( `[multi-upload] block ${ blockNo } popular edit state: ${ state === true }` );
  }
}

function logMultiUploadCustomSizeCap(blockNo, itemNo, dimension, requestedValue, appliedValue) {
  console.log(
    `[multi-upload custom-size cap] block=${ blockNo } item=${ itemNo } ${ dimension } requested=${ requestedValue } applied=${ appliedValue } max=22`
  );
}

function normalizeMultiUploadCustomDimensions(width, height, meta = {}) {
  const parsedWidth = parseFloat(width);
  const parsedHeight = parseFloat(height);

  if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight)) {
    return { width: parsedWidth, height: parsedHeight, clamped: false };
  }

  const maxSide = Math.max(parsedWidth, parsedHeight);
  if (maxSide <= 22) {
    return { width: parsedWidth, height: parsedHeight, clamped: false };
  }

  const scale = 22 / maxSide;
  const normalizedWidth = parseFloat((parsedWidth * scale).toFixed(2));
  const normalizedHeight = parseFloat((parsedHeight * scale).toFixed(2));

  if (meta.blockNo && meta.itemNo) {
    if (parsedWidth > 22) {
      logMultiUploadCustomSizeCap(meta.blockNo, meta.itemNo, `width`, parsedWidth, normalizedWidth);
    }
    if (parsedHeight > 22) {
      logMultiUploadCustomSizeCap(meta.blockNo, meta.itemNo, `height`, parsedHeight, normalizedHeight);
    }
  }

  return { width: normalizedWidth, height: normalizedHeight, clamped: true };
}

function syncMultiUploadCustomRowDimensions(blockNo, itemNo, width, height) {
  const $row = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom[item="${ itemNo }"]` );
  if ( $row.length === 0 ) return;

  $row.find( `input[name="width__value"]` ).val( width ).attr( `value`, width );
  $row.find( `input[name="height__value"]` ).val( height ).attr( `value`, height );
}

$(function(){
  const params = new URLSearchParams(window.location.search);
  let grt_query_param = params.get("ordertype") || "";
  if(grt_query_param != ""){
    designtype = 1;
    ordername = params.get("order_name") || "";
  }
})
const filePreview = $( `upload-controls file-preview` );
// let imagesTypes = ["image/png","image/jpg","image/jpeg","image/tiff","application/pdf","image/vnd.adobe.photoshop","application/postscript","application/vnd.adobe.photoshop","application/x-photoshop","application/photoshop","image/svg+xml"];

const apiURL = `https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production`;
const MY_DESIGNS_SELECTION_PARAM = `my_designs_selection`;
const baseAmazonUrl = `s3.amazonaws.com`;
const ninjaImgixHost = `ninjauploads-production.imgix.net`;
const ninjaS3Host2 = `ninja-services-production-ninjauploadss3bucket-zks2mguobhe4.s3.amazonaws.com`;
const ninjaS3Host = `ninjauploads-production.imgix.net`;

const transpareImg = `//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png?auto=format,compress&v=1728297951`;

const uploadArea = document.querySelector('upload-controls master-upload');
// const anotherUpload = document.querySelector('upload-controls another-upload');
const aiImgGenerator = $( `.generative-ai-area` );
// Select Drop-Zoon Area
const dropZoon = document.querySelector('#dropZoon');
// Loading Text
const loadingText = document.querySelector('#loadingText');
// Slect File Input
const fileInput = document.querySelector('upload-controls master-upload #fileInput');
// const anotherFile = document.querySelector('upload-controls #anotherFile');

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


uploadArea.addEventListener('click', function (e) {
  if ( $( e.target ).closest( `a` ).length > 0 ) {
    return;
  }
  fileInput.click();
});
fileInput.addEventListener('change', (e) => {
  manageFiles( e.target.files );
  /* Reset so re-picking the same file fires `change` again — without this,
     the browser sees no value change for an identical filename and skips
     the event entirely. */
  e.target.value = '';
});
uploadArea.addEventListener('dragover', function (event) {
  event.preventDefault();

  uploadArea.classList.add('drop-zoon--over');
});
uploadArea.addEventListener('dragleave', function (event) {
  uploadArea.classList.remove('drop-zoon--over');
});
uploadArea.addEventListener('drop', function (event) {
  event.preventDefault();
  uploadArea.classList.remove('drop-zoon--over');
  const files = event.dataTransfer.files;
  manageFiles( files );
});


/* -------------------------------------------
   HERO → PDP MULTI-FILE HANDOFF
-------------------------------------------- */
(function restoreHeroUploadFiles() {
  const url = new URL(window.location.href);

  /* Run ONLY if upload=direct */
  if (url.searchParams.get("upload") !== "direct") return;

  const stored = sessionStorage.getItem("hero_uploaded_files");
  if (!stored) return;

  let filesData;
  try {
    filesData = JSON.parse(stored);
  } catch (e) {
    sessionStorage.removeItem("hero_uploaded_files");
    return;
  }

  const dataTransfer = new DataTransfer();

  filesData.forEach(fileData => {
    const base64 = fileData.data;
    const byteString = atob(base64.split(",")[1]);
    const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], fileData.name, { type: mimeString });

    dataTransfer.items.add(file);
  });

  /* Call existing PDP logic */
  if (typeof manageFiles === "function") {
    manageFiles(dataTransfer.files);
  } else {
    console.warn("manageFiles() not found");
  }

  /* Cleanup */
  sessionStorage.removeItem("hero_uploaded_files");

  /* Remove upload=direct from URL */
  url.searchParams.delete("upload");
  window.history.replaceState({}, "", url.pathname + url.search);
})();


// EVENTS FOR SINGLE START
var timeout__;
$( document )
.ready(function() {
  $( `#fileInput` ).val( `` );
  const isBgRemovedByParam = getParam( `bg-removed` );
  if ( typeof isBgRemovedByParam !== 'undefined' && isBgRemovedByParam == 'Yes' ) {
    if ( typeof imgParamsSettings !== 'undefined' && imgParamsSettings ) {
      imgParamsSettings.forEach(extObj => {
        if ( typeof extObj.bgRemover !== 'undefined' && extObj.bgRemover ) {
          extObj.bgRemover = false;
        }
        if ( typeof extObj.byDefaultBgRemover !== 'undefined' && extObj.byDefaultBgRemover ) {
          extObj.byDefaultBgRemover = false;
        }
      });
    }
    removeQueryParam( `bg-removed` );
  }
})
.on(`click`, `upload-controls another-upload`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `#anotherFile` ).click();
  } catch ( err ) {
    console.log( `ERROR upload-controls another-upload`, err.message );
  }
})
.on(`change`, `upload-controls #anotherFile`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'single' ) {
      await singleFileAddToCart();
    }
    manageFiles( e.target.files );
    /* Reset so re-picking the same file fires `change` again — without this,
       the browser sees no value change for an identical filename and skips
       the event entirely, breaking subsequent Upload Another clicks. */
    e.target.value = '';
  } catch ( err ) {
    console.log( `ERROR upload-controls #anotherFile`, err.message );
  }
})
.on(`dragover`, `upload-controls another-upload`, function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).addClass( `dragover` );
})
.on(`dragleave`, `upload-controls another-upload`, function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).removeClass( `dragover` );
})
.on(`drop`, `upload-controls another-upload`,async function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).removeClass( `dragover` );

  const files = e.originalEvent.dataTransfer.files;
  // console.log ( 'files', files );
  if ( uploadType == 'single' ) {
    await singleFileAddToCart();
  }
  manageFiles( files );
})


.on(`dragover`, `multi-upload another-upload-multi`, function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).addClass( `dragover` );
})
.on(`dragleave`, `multi-upload another-upload-multi`, function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).removeClass( `dragover` );
})
.on(`drop`, `multi-upload another-upload-multi`, function (e) {
  e.preventDefault();
  e.stopPropagation();
  $( this ).removeClass( `dragover` );

  const files = e.originalEvent.dataTransfer.files;
  let beforeUploadAvailableBlocks = 0;
  let filesCounter = 0;
  if ( files.length ) {
    filesCounter = $( `multi-upload uploaded-files-block` ).length;
    beforeUploadAvailableBlocks = filesCounter;
    console.log ( 'filesCounter', filesCounter );
    for (const file of files) {
      filesCounter++;
      multiFilesManage( file, filesCounter );
    }
  }
  setTimeout(() => {
    setFocusOfMultiUpload( beforeUploadAvailableBlocks );
  }, 500);
})
.on(`click`, `precut .openmodalbox`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const precutHTML = $( `template[data-id="precutModal"]` ).html();
    $( `body` ).prepend( precutHTML );
  } catch ( err ) {
    console.log( `ERROR precut .openmodalbox`, err.message );
  }
})


// CUSTOM SIZE INCREASE DECREASE START
.on(`click`, `sizes-blocks .widthHeight__value-minus`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom` ).attr( `item` );
    const getVal = $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).val() * 1;
    const getStep = $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).attr( `step` ) * 1;

    if ( uploadType == 'single' ) {
      const activeTab = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
      if ( activeTab == 'popular' ) {
        $( `upload-controls tab-controls .tabOptionName[value="custom"]` ).prop( `checked`, true );
      }
    } else if ( uploadType == 'multi' ) {
      selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
      const activeTab = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
      if ( activeTab == 'popular' ) {
        $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName[value="custom"]` ).prop( `checked`, true );
      }
    }

    setActiveRow();

    $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).val( ( getVal - getStep ).toFixed( 2 ) ).trigger( `keyup` );
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__value-minus`, err.message );
  }
})
.on(`click`, `sizes-blocks .widthHeight__value-plus`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom` ).attr( `item` );
    const getVal = $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).val() * 1;
    const getStep = $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).attr( `step` ) * 1;
    if ( uploadType == 'single' ) {
      const activeTab = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
      if ( activeTab == 'popular' ) {
        $( `upload-controls tab-controls .tabOptionName[value="custom"]` ).prop( `checked`, true );
      }
    } else if ( uploadType == 'multi' ) {
      selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
      const activeTab = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
      if ( activeTab == 'popular' ) {
        $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName[value="custom"]` ).prop( `checked`, true );
      }
    }
    setActiveRow();
    $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).val( ( getVal + getStep ).toFixed( 2 ) ).trigger( `keyup` );
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__value-plus`, err.message );
  }
})
// CUSTOM SIZE INCREASE DECREASE END
.on('input', 'textarea.designNotes', function () {
  const clean = removeEmojis( $( this ).val() );
  if ( $( this ).val() !== clean ) {
    $( this ).val( clean );
  }
})

.on(`click`, `.purchase_from_previous`, function( e ) {
  try {
    e.preventDefault();
    e.stopImmediatePropagation();

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
      url: `${ apiURL }/uploads/fetchDataNew?customer_id=${ CUSTOMER_ID }&gangsheet=${ isGangPage }`,
      success: function( data ) {
        $( `.customer_designes:not(._2) > img` ).hide();
        $( `.customer_designes:not(._2) ul` ).show();
        let innerData = "";
        for ( let i = 0; i < data.length; i++ ) {
          let variantSize = data[i].variant_title;
          variantSize = variantSize.split("x");

                    let file_name = data[i].file;
          // console.log ( 'file_name', file_name );
          if ( file_name.indexOf( `imgix.net` ) > -1 ) {
            file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
            if ( file_name.indexOf("____image") > -1 ) {
              let ext = file_name.split('.').pop()
              file_name =  file_name.split("____image")[0]+"."+ext;
            }
          } else if ( file_name.indexOf( "upload.cloudlift.app" ) > -1 ) {
            file_name =  file_name.split("transferss/")[1];
          } else if ( file_name.indexOf("ninja-services-production") > -1 ) {
            file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
          } else if ( file_name.indexOf("amazonaws") > -1 ) {
            file_name = file_name.replace("https://","").split("?")[0].split("/")[2];
          }
          let filePathCompressed = data[i].file.replace( ninjaS3Host2, ninjaS3Host );
          const fileExt = getFileExt( file_name );
          const selectedParamsObject = findObjectByKey( fileParamsAccount, `fileType`, fileExt );
          if ( filePathCompressed.indexOf( `?` ) > -1 ) {
            filePathCompressed = `${ data[i].file }&${ selectedParamsObject.cart }`;
          } else {
            filePathCompressed = `${ data[i].file }?${ selectedParamsObject.cart }`;
          }
          innerData += `
            <li data-date="${ data[i].formatted_date }" data-photoid="${ data[i].photo_id }" data-name="${ file_name.toLowerCase() }" file-ext="${ fileExt }" selected-params="${ selectedParamsObject.cart }">
              <div>
                <div class="upload_tools">
                  <input type="checkbox" class="popupinput checkbox-field" id="select---${i}" data-src="${data[i].file}" data-w="${Number(variantSize[0]).toFixed(2)}" data-h="${Number(variantSize[1]).toFixed(2)}" data-name="${file_name}" />
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
                  <p>
                    ${data[i].purchased_at.replace("Purchased","Uploaded")}
                  </p>

                </div>
              </div>
            </li>
          `;
        }
        $( `.customer_designes:not(._2) ul` ).html( innerData );
      },
      error: function(){
        $( `.customer_designes:not(._2) > img` ).hide();
        $( `.customer_designes:not(._2) ul` ).show();
        $( `.customer_designes:not(._2) ul` ).html( `<p style='text-align:center'>Sorry! No data found</p>` );
      }
    });

    $.ajax({
      url: `${ apiURL }/uploads/orderDataNew?customer_id=${ CUSTOMER_ID }&gangsheet=${ isGangPage }`,
      success: function( data ) {
        data = data.data;

        console.log ( 'data', data );

        $( `.customer_designes._2 > img` ).hide();
        $( `.customer_designes._2 ul` ).show();
        let innerData = ``;
        for ( let i = 0; i < data.length; i++ ) {
          let file_name = data[i].file;
          // console.log ( 'file_name', file_name );
          if ( file_name.indexOf( `imgix.net` ) > -1 ) {
            file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
            if ( file_name.indexOf("____image") > -1 ) {
              let ext = file_name.split('.').pop()
              file_name =  file_name.split("____image")[0]+"."+ext;
            }
          } else if ( file_name.indexOf( "upload.cloudlift.app" ) > -1 ) {
            file_name =  file_name.split("transferss/")[1];
          } else if ( file_name.indexOf("ninja-services-production") > -1 ) {
            file_name = file_name.replace("https://","").split("?")[0].split("/")[1];
          } else if ( file_name.indexOf("amazonaws") > -1 ) {
            file_name = file_name.replace("https://","").split("?")[0].split("/")[2];
          }
          let variantSize = data[i].variant_title.split(" / ")[0].toLowerCase();
          let fileW, fileH;
          if ( typeof variantSize !== 'undefined' && variantSize ) {
            const getDimensions = extractDimensions( variantSize );
            if ( typeof getDimensions !== 'undefined' && getDimensions ) {
              fileW = getDimensions.width;
              fileH = getDimensions.height;
            }
          }
          // variantSize = variantSize.split("x");
          let filePathCompressed = data[i].file.replace(ninjaS3Host2,ninjaS3Host);
          const fileExt = getFileExt( file_name );
          // console.log ( 'fileExt', fileExt );
          const selectedParamsObject = findObjectByKey( fileParamsAccount, `fileType`, fileExt );

          if ( typeof selectedParamsObject !== 'undefined' && selectedParamsObject ) {
            if ( filePathCompressed.indexOf("?") > -1 ) {
              filePathCompressed = `${ data[i].file }&${ selectedParamsObject.cart }`;
            } else {
              filePathCompressed = `${ data[i].file }?${ selectedParamsObject.cart }`;
            }
            if ( filePathCompressed.includes( ninjaS3Host2 ) ) {
              filePathCompressed = filePathCompressed.replace( ninjaS3Host2, ninjaS3Host );
            }
            innerData += `
              <li data-date="${data[i].formatted_date}" data-photoid="previously on order # ${ data[i].order_name }" data-name="${ file_name.toLowerCase() }" file-ext="${ fileExt }" selected-params="${ selectedParamsObject.cart }" ${ data[i].file.includes( `upload.cloudlift.app` ? `style="display: none;"` : `` ) }>
                <div>
                  <div class="upload_tools">
                    <input
                      type="checkbox"
                      class="popupinput checkbox-field"
                      id="select--${i}"
                      data-src="${data[i].file}"
                      data-w="${ fileW }"
                      data-h="${ fileH }"
                      data-s3="${data[i].file}"
                      data-name="${file_name}"
                    />
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
                    <img src="${ filePathCompressed }" />
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
        }
        $( `.customer_designes._2 ul` ).html( innerData );
      },
      error: function(){
        $( `.customer_designes._2 > img` ).hide();
        $( `.customer_designes._2 ul` ).show();
        $( `.customer_designes._2 ul` ).html( `<p style='text-align:center'>Sorry! No data found</p>` );
      }
    });
    const buttonsHTML = `<div class="use_designes_bulk_btn"><button type="button" class="button button--solid button--product button--loader button--move use_designes_bulk" disabled>Use Designs</button></div>`;
    const isButtonAvailable_forPurchase = $( `#purchased_files .use_designes_bulk_btn` ).length;
    if ( isButtonAvailable_forPurchase == 0 ) {
      $( `#purchased_files` ).append( buttonsHTML );
    }
    const isButtonAvailable_forUpload = $( `#uploaded_files .use_designes_bulk_btn` ).length;
    if ( isButtonAvailable_forUpload == 0 ) {
      $( `#uploaded_files` ).append( buttonsHTML );
    }

  } catch ( err ) {
    console.log( `ERROR .purchase_from_previous`, err.message );
  }
})
.on(`click`, `.basic_link`, function( e ) {
  try {
    e.preventDefault();
    e.stopImmediatePropagation();
    $("#return_to_url").val( `${ productURL }?open=designModal` )
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
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
})
.on(`click`, `.customer_designes ul li`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const isChecked = $( this ).find( `.upload_tools .popupinput.checkbox-field` ).is( `:checked` );
    if ( isChecked ) {
      $( this ).find( `.upload_tools .popupinput.checkbox-field` ).prop( `checked`, false );
    } else {
      $( this ).find( `.upload_tools .popupinput.checkbox-field` ).prop( `checked`, true );
    }

    let selectedDesigns = 0;
    $( `.customer_designes ul li` ).each(function() {
      const isChecked = $( this ).find( `.upload_tools .popupinput.checkbox-field` ).is( `:checked` );
      if ( isChecked ) {
        selectedDesigns = selectedDesigns + 1;
      }
    })
    if ( selectedDesigns > 0 ) {
      $( `#purchased_files .use_designes_bulk_btn .use_designes_bulk, #uploaded_files .use_designes_bulk_btn .use_designes_bulk` ).prop( `disabled`, false );
    } else {
      $( `#purchased_files .use_designes_bulk_btn .use_designes_bulk, #uploaded_files .use_designes_bulk_btn .use_designes_bulk` ).prop( `disabled`, true );
    }
  } catch ( err ) {
    console.log( `ERROR .customer_designes ul li`, err.message );
  }
})
.on(`click`, `#purchased_files .use_designes_bulk:not([disabled]), #uploaded_files .use_designes_bulk:not([disabled])`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    const files = [];
    const isActivatedMultiUpload = $( `multi-upload-wrapper` ).length;
    let beforeUploadAvailableBlocks = 0;
    $( `.customer_designes ul li` ).each(function() {
      const isChecked = $( this ).find( `.upload_tools .popupinput.checkbox-field` ).is( `:checked` );
      if ( isChecked ) {
        const checkFileExt = $( this ).attr( `file-ext` );
        grt_photo_id = $( this ).attr(`data-photoid`);
        console.log("grt_photo_id: ",grt_photo_id,$( this ))
        let fileURL = $( this ).find( `.upload_tools .popupinput.checkbox-field` ).attr( `data-src` );
        if ( fileURL.includes( `?` ) ) {
          fileURL = fileURL.split( `?` )[0];
        }

        if ( fileURL.includes( ninjaS3Host2 ) ) {
          fileURL = fileURL.replace( ninjaS3Host2, ninjaS3Host );
        }
        const getFileDetail = createFileObjectFromUrl( fileURL );
        getFileDetail.fileURL = fileURL;

                const img = new Image();
        img.src = fileURL; // fileURL you already created
        img.onload = function() {
            // naturalWidth & naturalHeight available here
            calculateRatio(this.naturalWidth, this.naturalHeight);
            designtype = 1
            console.log("naturalWidth & naturalHeight",this.naturalWidth, this.naturalHeight,designtype)
            calculateratioForImage();
        };

        if ( typeof checkFileExt !== 'undefined' && (checkFileExt === 'ai' || checkFileExt === 'eps' || checkFileExt === 'pdf') ) {
          const getFileW = $( this ).find( `.upload_tools .popupinput.checkbox-field` ).attr( `data-w` );
          const getFileH = $( this ).find( `.upload_tools .popupinput.checkbox-field` ).attr( `data-h` );

          getFileDetail.designWidth = getFileW;
          getFileDetail.designHeight = getFileH;
        }

        console.log ( 'getFileDetail', getFileDetail );
        files.push( getFileDetail );
      }
    })
    // console.clear();
    // console.log ( 'files', files );

    // return;

    if ( files.length == 1 ) {
      if ( uploadType == 'single' ) {
        await singleFileAddToCart();

        singleFileManageByURL( files[0] );
      } else if ( uploadType == 'multi' ) {
        beforeUploadAvailableBlocks = $( `multi-upload uploaded-files-block` ).length;
        multiFilesManageByURL( files );
      } else if ( uploadType == '' ) {
        singleFileManageByURL( files[0] );
      }
      $( this ).closest( `.nj-popup` ).hide();
    } else if ( files.length > 1 ) {
      if ( uploadType == 'single' ) {
        await singleFileAddToCart();
      }
      beforeUploadAvailableBlocks = $( `multi-upload uploaded-files-block` ).length;
      multiFilesManageByURL( files );
      $( this ).closest( `.nj-popup` ).hide();
    }

    if ( uploadType == 'multi' ) {
      if ( isActivatedMultiUpload > 0 ) {
        setTimeout(() => {
          // const uploadContainerHeight = $( `multi-upload file-blocks-area` ).height();
          // const lastBlockHeight = $( `multi-upload file-blocks-area uploaded-files-block` ).last().height();
          // $( `multi-upload upload-area` ).animate({scrollTop: ( uploadContainerHeight - lastBlockHeight )}, 500);
          setFocusOfMultiUpload( beforeUploadAvailableBlocks );
        }, 500);
      }
    }
  } catch ( err ) {
    console.log( `ERROR #purchased_files .use_designes_bulk`, err.message );
  }
})
.on(`click`, `.tab_header.upload_files_tab_header > a`, function( e ) {
  try {
    e.stopImmediatePropagation();
    e.preventDefault();
    $(".tab_header.upload_files_tab_header > a,.tab_body.upload_files_tab_data > div").removeClass("active");
    $(this).addClass("active");
    $(".tab_body.upload_files_tab_data > div"+$(this).attr("href")).addClass("active");
  } catch ( err ) {
    console.log( `ERROR .tab_header.upload_files_tab_header > a`, err.message );
  }
})
.on(`click`, `.tab_header:not(.upload_files_tab_header) > a`, function(e){
  try {
    e.stopImmediatePropagation();
    e.preventDefault();
    console.log ( 'chaaa', $( this ).attr( `href` ) );
    let item_1 = $( this ).parents(".custom_tabs").find(".tab_header:not(.upload_files_tab_header) > a");
    $(item_1).removeClass("active");
    let item_2 = $(this).parents(".custom_tabs").find(".tab_body:not(.upload_files_tab_data) > div");
    $(item_2).removeClass("active");
    $(this).addClass("active");
    let activeClass = $(this).attr("href").replace("#","");
    let item_3 = $(this).parents(".custom_tabs").find(".tab_body:not(.upload_files_tab_data) > div[data-id="+activeClass+"]")
    $(item_3).addClass("active");
  } catch ( err ) {
    console.log( `ERROR .tab_header:not(.upload_files_tab_header) > a`, err.message );
  }
})
.on(`change`, `.tool_sorting select`, function( e ) {
  try {
    e.stopImmediatePropagation();
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
  } catch ( err ) {
    console.log( `ERROR .tool_sorting select`, err.message );
  }
})
.on(`click`, `.customer_designes ul a[data-id]`, function( e ) {
  try {
    e.stopImmediatePropagation();
    e.preventDefault();
    $(".customTabelPopup__overlay-4")
      .show()
      .find( `#fileremove-single` )
      .attr( `data-id`, $( this ).attr( `data-id` ) );

  } catch ( err ) {
    console.log( `ERROR .customer_designes ul a[data-id]`, err.message );
  }
})
.on(`click`, `#fileremove-single`, function( e ) {
  try {
    e.stopImmediatePropagation();
    let id = $( this ).attr( `data-id` );
    $( `.customer_designes ul a[data-id='${ id }']` ).parents( `li` ).css({"pointer-events":"none","opacity":0.5});
    $.ajax({
      url: `${ apiURL }/uploads/deleteData?customer_id=${ CUSTOMER_ID }&photo_id=${ id }`,
      // url: apiURL+"/uploads/deleteData?customer_id="+CUSTOMER_ID+"&photo_id="+$(this).data("id"),
      success:function(data){
        $( `.customer_designes ul a[data-id='${ id }']` ).parents( `li` ).remove();
        $( `.customTabelPopup__overlay-4` ).hide();
      }
    });
  } catch ( err ) {
    console.log( `ERROR #fileremove-single`, err.message );
  }
})
.on(`keyup`, `.popup_tool_bar input`, function( e ) {
  try {
    e.stopImmediatePropagation();
    let _this = $( this );
    let value = $(this).val().toLowerCase().trim();
    if ( value != `` ) {
      _this.parents( `.image_containers` ).find( `.customer_designes li` ).show().filter(function() {
        return $( this ).text().toLowerCase().trim().indexOf( value ) == -1;
      }).hide();
    } else {
      _this.parents( `.image_containers` ).find( `.customer_designes li` ).show();
    }
  } catch ( err ) {
    console.log( `ERROR .popup_tool_bar input`, err.message );
  }
})












.on(`change`, `upload-controls tab-controls .tabOptionName`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    const isAdded = await checkAndAddNewSizeRow();
    let activeOption = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
    if ( activeOption == 'custom' ) {
      const $popularSelect = $( `upload-controls sizes-blocks line-items-popular .popularSizes` );
      $popularSelect.removeClass( `error` ).removeAttr( `style` );
      $popularSelect.siblings( `.popularSizes_error` ).remove();
    }
    if ( isAdded ) {
      let fileDetails = getFileDetailsFunction();
      if ( typeof fileDetails !== 'undefined' && fileDetails ) {
        const matchedVariant = getMatchingVariant();
        console.log ( 'matchedVariant', matchedVariant );
        if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
          applyImgToPreviewBox( fileDetails, matchedVariant, false );

          if ( activeOption == 'custom' ) {
            updateLineItemData( fileDetails.currentWidth, fileDetails.currentHeight )
          } else if ( activeOption == 'popular' ) {
            const getDimension = getWidthHeight_popularSize( matchedVariant.option1_converted );
            updateLineItemData( getDimension.width, getDimension.height );
          }
        }
      }
    }
    let isRowSelected = false;
    if ( activeOption == 'custom' ) {
      const isAvailable = $( `upload-controls sizes-blocks line-items-custom .widthHeight__custom` ).length;
      if ( isAvailable > 0 ) {
        selectedItemNo = $( `upload-controls sizes-blocks line-items-custom .widthHeight__custom` ).last().attr( `item` );
      }
    } else if ( activeOption == 'popular' ) {
      const isAvailable = $( `upload-controls sizes-blocks line-items-popular .widthHeight__custom` ).length;
      if ( isAvailable > 0 ) {
        selectedItemNo = $( `upload-controls sizes-blocks line-items-popular .widthHeight__custom` ).last().attr( `item` );
      }
      const mediaID = $( `upload-controls sizes-blocks line-items-popular .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `media-id` );
      if ( typeof mediaID !== 'undefined' && mediaID ) {
        $( `product-page .product-gallery.product-gallery--slider .product-gallery-item[data-media-id="${ mediaID }"]` ).removeClass( `hidden` );

        const $thumb = $( `product-page .product-gallery.product-gallery--slider .thumbnail[data-thumb-id="${ mediaID }"]` ).removeClass( `hidden` );

        const thumbEl = $thumb.get(0);
        if ( thumbEl ) {
          suppressThumbClickHandler = true;      // tell the handler to ignore this one
          thumbEl.click();                       // native click → slider moves
        }
      }

    }

    pricesTable();
    updatePreviewBoxSizes();
    console.log ( 'selectedItemNo', selectedItemNo );
    setActiveRow();
  } catch ( err ) {
    console.log( `ERROR upload-controls tab-controls .tabOptionName`, err.message );
  }
})
.on(`change`, `upload-controls sizes-blocks .popularSizes`, async function( e ) {
  try {
    e.stopImmediatePropagation();

    // ignore placeholder: "Select a popular size"
    const selectedVal = $(this).val();
    if ( uploadType == 'single' ) {
      setSingleUploadPopularEditDetected( !!selectedVal );
    }
    if ( $( this ).hasClass( `error` ) && selectedVal ) {
      $( this ).removeClass( `error` ).removeAttr( `style` );
      $( this ).siblings( `.popularSizes_error` ).remove();
    }
    if (!selectedVal) return;

    selectedItemNo = $( this ).closest( `.widthHeight__custom` ).attr( `item` );
    const $row      = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` );
    $row.attr("pop-size", "Yes");
    const fileDetails = getFileDetailsFunction();

    if (typeof fileDetails === 'undefined' || !fileDetails) return;

    // 1) existing match by popular option (for media, etc.)
    let matchedPopularVariant = getMatchingVariant();

    // 2) get the "box" size from the popular option (4"x4", 9"x11", etc.)
    let width  = 0;
    let height = 0;
    if (matchedPopularVariant && matchedPopularVariant.option1_converted) {
      const dim = getWidthHeight_popularSize(matchedPopularVariant.option1_converted);
      if (dim) {
        width  = dim.width;
        height = dim.height;
      }
    }

    // 3) smart-fit the uploaded art into that box (DTF/UV pages only)
    if ( document.body.classList.contains('smart-sizing-true' ) ) {  
      const smart = getSmartSizedDimensions(width, height);
      width  = smart.width;
      height = smart.height;

      const $select = $(this);

      // RESET ALL OPTIONS FIRST ✔
      resetPopularOptionLabels($select);

      const $option = $select.find('option:selected');
      const originalLabel = $option.data('original-label') || $.trim($option.text());

      if (!$option.data('original-label')) {
        $option.data('original-label', originalLabel);
      }

      const parts = originalLabel.split('-');
      const desc  = parts.length > 1 ? '-' + parts.slice(1).join('-') : '';

      const wLabel = formatInchesValue(width);
      const hLabel = formatInchesValue(height);

      const newLabel = `${wLabel}" x ${hLabel}" ${desc}`;
      $option.text(newLabel);
      $select.parent().next().addClass("active");
    }

    // 4) store effective size on the row (used by DPI + cart)
    updateLineItemData(width, height);

    // also keep these on fileDetails for consistency if needed later
    fileDetails.currentWidth  = width;
    fileDetails.currentHeight = height;

    // 5) pick the pricing variant based on smart-sized area (same logic as Custom)
    const matchedPricingVariant = getVariantForSmartSize(width, height);

    if (matchedPricingVariant) {
      $row.attr({
        "title": matchedPricingVariant.title,
        "vid": matchedPricingVariant.id,
        "dpi-warning": '',
        "price": matchedPricingVariant.price,
        "media-id": matchedPricingVariant.media_id,
        "w": width,
        "h": height,
        "size": `${ width }x${ height }`
      });
    }

    // 6) update preview + price + DPI
    applyImgToPreviewBox(fileDetails, matchedPricingVariant || matchedPopularVariant, false);

    await calculatePrices(fileDetails, matchedPricingVariant);
    calculateDPILineItem();
    updatePreviewBoxSizes();
    setActiveRow();

    const mediaID = $row.attr(`media-id`);
    if (typeof mediaID !== 'undefined' && mediaID) {
      $( `product-page .product-gallery.product-gallery--slider .product-gallery__item[data-media-id="${ mediaID }"]` ).removeClass( `hidden` );
      $( `product-page .product-gallery.product-gallery--slider .product-thumbnails__item[data-thumb-id="${ mediaID }"]` ).removeClass( `hidden` ).click();
    }

  } catch ( err ) {
    console.log( `ERROR upload-controls sizes-blocks .popularSizes`, err.message );
  }
})
.on(`change`, `upload-controls #preCutOption`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const isPreCutActive = $( this ).is( `:checked` );
    if ( isPreCutActive ) {
      $( `upload-controls sizes-blocks .widthHeight__custom` ).attr( `precut`, `Yes` );
    } else {
      $( `upload-controls sizes-blocks .widthHeight__custom` ).attr( `precut`, `` );
    }
  } catch ( err ) {
    console.log( `ERROR upload-controls #preCutOption`, err.message );
  }
})
.on(`change`, `upload-controls toggle-options .toggleOption, multi-upload toggle-options .toggleOption`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    if ( uploadType == 'single' ) {
      $( `upload-controls file-preview preview-block.easyzoom` ).addClass( `image-loading` );
      await updatePreviewImgAndLineItems();
      updatePreviewBoxSizes();


      const getWidthOfPreview = $( `preview-block .horizontal_direction` ).attr( `x-is` );
      const getHeightOfPreview = $( `preview-block .verticle_direction` ).attr( `y-is` );

      console.log ( 'PREVIEW BOX WIDTH AND HEIGHT', getWidthOfPreview, getHeightOfPreview );

      const getSelectedRowWidth = $( `.widthHeight__custom[item="${ selectedItemNo }"] input[name="width__value"]` ).val();
      const getSelectedRowHeight = $( `.widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` ).val();

      console.log ( 'SELECTED ROW WIDTH AND HEIGHT', getSelectedRowWidth, getSelectedRowHeight );

      /* REINFORCE SIZE START */
      $( `line-items-custom .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"] input[name="height__value"]` ).trigger('keyup');
      /* REINFORCE SIZE END */

      $( `upload-controls file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
    } else if ( uploadType == 'multi' ) {
      await selectAvailableTier( selectedBlockNo );
      $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] file-preview preview-block.easyzoom` ).addClass( `image-loading` );
      await updatePreviewImgAndLineItems( selectedBlockNo );
      updatePreviewBoxSizes();

      /* REINFORCE SIZE START */
      $( `line-items-custom .widthHeight__custom[item="${ selectedItemNo }"] .widthHeight__item[by="height"] input[name="height__value"]` ).trigger('keyup');
      /* REINFORCE SIZE END */

      $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
    }
  } catch ( err ) {
    console.log( `ERROR upload-controls toggle-options .toggleOption, multi-upload toggle-options .toggleOption`, err.message );
  }
})
.on(`click`, `upload-controls sizes-blocks .del_item_cta, multi-upload sizes-blocks .del_item_cta`, async function(e) {
  try {
    e.stopImmediatePropagation();

    selectedBlockNo = $(this).closest(`uploaded-files-block`).attr(`block-no`) || 1;

    $(this).closest(`.widthHeight__custom`).remove();
    const type = $(this).closest(`line-items-popular`).length ? `popular` : `custom`;
    await applyItemNo(type, selectedBlockNo);

    await selectAvailableTier(selectedBlockNo);

    await calculateTotalQty();
    await calculatePrices(null, null, selectedBlockNo);
    if (uploadType == 'multi') {
      let totalPrice = 0;
      $(`multi-upload line-items sizes-blocks .widthHeight__custom[item]`).each(function() {
        const qty = $(this).find(`precut-unit-logic .precut-unit-logic__qty .customQtyFile__qty`).val() * 1;
        let unitPrice = $(this).attr(`price`) * 1;
        totalPrice += qty * unitPrice;
      });
      shippingBarData(totalPrice);
    }
  } catch (err) {
    console.log(`ERROR del_item_cta`, err.message);
  }
})
.on(`click`, `multi-upload .multiUpload__close`, function( e ) {
  try {
    e.stopImmediatePropagation();
    let fileRemoveHTML = $( `template[data-multi-id="fileRemove"]` ).html();
    fileRemoveHTML = fileRemoveHTML.replace( `fileRemoveBlock__removeFile`, `removeAllBlocks` );
    $( `body` ).append( fileRemoveHTML );
  } catch ( err ) {
    console.log( `ERROR multi-upload .multiUpload__close`, err.message );
  }
})
.on(`click`, `upload-controls .zoom_image, multi-upload .zoom_image,  upload-controls .fileupload_hero`, function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'single' ) {
      let getImg = $( `upload-controls preview-box .fileupload_hero` ).attr( `src` );
      $( `.customTabelPopup__overlay-5 img` ).attr( `src`, getImg );
      $( `.customTabelPopup__overlay-5` ).show();
    } else if ( uploadType == 'multi' ) {
      $( `.customTabelPopup__overlay-5 img` ).attr( `src`, `` );
      selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
      let optionParams = getToggleOptionParams( selectedBlockNo );
      let fileDetail = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] file-preview file-details` ).text();
      fileDetail = JSON.parse( fileDetail );
      $( `.customTabelPopup__overlay-5 img` ).attr( `src`, `${ fileDetail.imgIxFile }?${ fileDetail.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
      $( `.customTabelPopup__overlay-5` ).show();
    }
  } catch ( err ) {
    console.log( `ERROR upload-controls .zoom_image, multi-upload .zoom_image`, err.message );
  }
})
// ADD SIZES ROW START
.on(`click`, `upload-controls .addmore_size, multi-upload .addmore_size`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'single' ) {
      let activeOption = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
      $( `upload-controls sizes-blocks line-items-${ activeOption }` )
        .append( $( `upload-controls sizes-blocks template[data-id="${ activeOption }"]` ).html() )
        .addClass( `rowAdded` );
      await applyItemNo( activeOption );

      let fileDetails = getFileDetailsFunction();
      if ( typeof fileDetails !== 'undefined' && fileDetails ) {

        const matchedVariant = getMatchingVariant();
        console.log ( 'matchedVariant', matchedVariant );
        if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
          await applyImgToPreviewBox( fileDetails, matchedVariant, false );
          if ( activeOption == 'custom' ) {
            updateLineItemData( fileDetails.currentWidth, fileDetails.currentHeight );
            $( `.widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` ).keyup();
          } else if ( activeOption == 'popular' ) {
            const getDimension = getWidthHeight_popularSize( matchedVariant.option1_converted );
            updateLineItemData( getDimension.width, getDimension.height );
            updatePreviewSizeOnly( getDimension.width, `Proportional Height` );

            $( `.widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).change();
          }
        }
      }
    } else if ( uploadType == 'multi' ) {
      selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
      let activeOption = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
      $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks line-items-${ activeOption }` )
        .append( $( `#multiUploadTemplates template[data-multi-id="${ activeOption }"]` ).html() )
        .addClass( `rowAdded` );
      await applyItemNo( activeOption, selectedBlockNo );

      let fileDetails = getFileDetailsFunction( selectedBlockNo );
      if ( typeof fileDetails !== 'undefined' && fileDetails ) {

        const matchedVariant = getMatchingVariant( null, selectedBlockNo );
        console.log ( 'matchedVariant', matchedVariant );
        if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
          applyImgToPreviewBox( fileDetails, matchedVariant, false, selectedBlockNo, 'no' );
          if ( activeOption == 'custom' ) {
            updateLineItemData( fileDetails.currentWidth, fileDetails.currentHeight, selectedBlockNo )
          } else if ( activeOption == 'popular' ) {
            const getDimension = getWidthHeight_popularSize( matchedVariant.option1_converted );
            updateLineItemData( getDimension.width, getDimension.height, selectedBlockNo );
            console.log ( 'getDimension.height added new size', getDimension.height );
            updatePreviewSizeOnly( getDimension.width, getDimension.height, selectedBlockNo );
          }
        }
      }
    }
    setActiveRow();
  } catch ( err ) {
    console.log( `ERROR upload-controls .addmore_size, multi-upload .addmore_size`, err.message );
  }
})
// ADD SIZES ROW END
.on(`keyup`, `upload-controls sizes-blocks .customQtyFile__qty, multi-upload sizes-blocks .customQtyFile__qty`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    if ( uploadType == 'single' && $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` ) == `custom` ) {
      setSingleUploadCustomEditDetected( true );
    } else if ( uploadType == 'multi' && $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` ) == `custom` ) {
      // Mark this multi-upload block as having a custom edit so custom rows can stay visible for that block.
      setMultiUploadEditDetected( selectedBlockNo, `custom`, true );
    }
    if ( uploadType == 'single' ) {
      $( `upload-controls .addToCartGroupItems` ).addClass( `disabled` );
    } else if ( uploadType == 'multi' ) {
      refreshMultiUploadCheckoutState( true );
    }
    clearTimeout( timeout__ );
    timeout__ = setTimeout(() => {
      const getVal = $( this ).val() * 1;
      var pattern = /^[0-9]+$/;
      let isError = false;
      let setQty = 0;
      if ( pattern.test( getVal ) ) {
        if ( getVal < definedMinQty ) {
          isError = true;
          setQty = definedMinQty;
        } else {
          setQty = getVal;
        }
      } else {
        isError = true;
        setQty = definedMinQty;
      }
      if ( isError ) {
        $( this ).closest( `.widthHeight__custom` ).attr( `qty`, setQty );
        $( this ).val( setQty ).addClass( `error` );
      } else {
        $( this ).closest( `.widthHeight__custom` ).attr( `qty`, setQty );
        $( this ).removeClass( `error` );
        calculatePrices();
      }
      calculateTotalQty();
      setTimeout(() => {
        $( this ).removeClass( `error` );
      }, 1500);
      if ( uploadType == 'single' ) {
        $( `upload-controls .addToCartGroupItems` ).removeClass( `disabled` );
      } else if ( uploadType == 'multi' ) {
        refreshMultiUploadCheckoutState( false );
      }
      setActiveRow();
    }, 300);
  } catch ( err ) {
    console.log( `ERROR upload-controls sizes-blocks .customQtyFile__qty`, err.message );
  }
})

.on(`keyup`, `upload-controls sizes-blocks input[name="width__value"], upload-controls sizes-blocks input[name="height__value"], multi-upload sizes-blocks input[name="width__value"], multi-upload sizes-blocks input[name="height__value"]`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    if ( uploadType == 'single' && $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` ) == `custom` ) {
      setSingleUploadCustomEditDetected( true );
    } else if ( uploadType == 'multi' && $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` ) == `custom` ) {
      // Mark this multi-upload block as having a custom edit when width/height is changed.
      setMultiUploadEditDetected( selectedBlockNo, `custom`, true );
    }
    if ( uploadType == 'single' ) {
      $( `upload-controls .addToCartGroupItems` ).addClass( `disabled` );
    } else if ( uploadType == 'multi' ) {
      refreshMultiUploadCheckoutState( true );
    }

    clearTimeout( timeout__ );
    timeout__ = setTimeout(() => {
      let isSizesBlock = $( `upload-controls sizes-blocks` ).length;
      if ( uploadType == 'single' ) {
        isSizesBlock = $( `upload-controls sizes-blocks` ).length;
      } else if ( uploadType == 'multi' ) {
        isSizesBlock = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks` ).length;
      }
      if ( isSizesBlock > 0 ) {
        let dpiErr = false;
        const item = $( this ).closest( `.widthHeight__custom[item]` );
        const selectedOption__ = item.attr( `option-selected` );
        let getVal = $( this ).val() * 1;
        // console.log ( 'getVal', getVal );
        let otherVal = 0;
        let by = $( this ).closest( `.widthHeight__item` ).attr( `by` );
        const enforceMultiUploadCustom22Cap = uploadType == 'multi' && selectedOption__ == 'custom';
        const effectiveMaxWidth = enforceMultiUploadCustom22Cap ? Math.min( definedMaxWidth, 22 ) : definedMaxWidth;
        const effectiveMaxHeight = enforceMultiUploadCustom22Cap ? Math.min( definedMaxHeight, 22 ) : definedMaxHeight;
        if ( by == 'width' ) {
          otherVal = $( this ).closest( `.widthHeight__custom` ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val() * 1;
        } else if ( by == 'height' ) {
          otherVal = $( this ).closest( `.widthHeight__custom` ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() * 1;
        }
        let isWarningErrorActive = item.find( `dpi-warning` ).hasClass( `active` );
        if ( getVal < definedMinWidth ) {
          $( this ).val( definedMinWidth ).attr( `value`, definedMinWidth ).addClass( `minError` );
          getVal = definedMinWidth;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        }
        let largerDefinedVal;
        if ( effectiveMaxWidth == effectiveMaxHeight ) {
          largerDefinedVal = effectiveMaxWidth;
        } else if ( effectiveMaxWidth > effectiveMaxHeight ) {
          largerDefinedVal = effectiveMaxWidth;
        } else if ( effectiveMaxHeight > effectiveMaxWidth ) {
          largerDefinedVal = effectiveMaxHeight;
        }
        if ( getVal == otherVal && getVal > effectiveMaxWidth ) {
          // console.log ( 'this condition true',  );
        }
        if ( by == 'width' && getVal > effectiveMaxWidth ) {
          if ( enforceMultiUploadCustom22Cap ) {
            logMultiUploadCustomSizeCap( selectedBlockNo, selectedItemNo, `width`, getVal, effectiveMaxWidth );
          }
          $( this ).val( effectiveMaxWidth ).addClass( `error` );
          getVal = effectiveMaxWidth;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( by == 'height' && getVal > effectiveMaxHeight ) {
          if ( enforceMultiUploadCustom22Cap ) {
            logMultiUploadCustomSizeCap( selectedBlockNo, selectedItemNo, `height`, getVal, effectiveMaxHeight );
          }
          $( this ).val( effectiveMaxHeight ).addClass( `error` );
          getVal = effectiveMaxHeight;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        }
        let getRatio;
        if ( uploadType == 'single' ) {
          getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, by );
        } else if ( uploadType == 'multi' ) {
          getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, by );
        }

        const newVal = calculateNewWidth_orNewHeight( getRatio, by, getVal );

        // console.log ( 'newVal', newVal );

        if ( by == 'height' && newVal > effectiveMaxWidth ) {
          if ( enforceMultiUploadCustom22Cap ) {
            logMultiUploadCustomSizeCap( selectedBlockNo, selectedItemNo, `width`, newVal, effectiveMaxWidth );
          }
          item.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( effectiveMaxWidth ).attr( `value`, effectiveMaxWidth ).addClass( `error` );

          let getRatio;
          if ( uploadType == 'single' ) {
            getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, 'width' );
          } else if ( uploadType == 'multi' ) {
            getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, 'width' );
          }

          const newVal_ = calculateNewWidth_orNewHeight( getRatio, 'width', effectiveMaxWidth );
          // console.log ( 'newVal_ H', newVal_ );
          item.find( `.widthHeight__item[by="${ by }"] .widthHeight__value` ).val( newVal_.toFixed( 2 ) ).attr( `value`, newVal_.toFixed( 2 ) ).addClass( `error` );

          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( by == 'width' && newVal > effectiveMaxHeight ) {
          if ( enforceMultiUploadCustom22Cap ) {
            logMultiUploadCustomSizeCap( selectedBlockNo, selectedItemNo, `height`, newVal, effectiveMaxHeight );
          }
          item.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( effectiveMaxHeight ).attr( `value`, effectiveMaxHeight ).addClass( `error` );
          let getRatio;
          if ( uploadType == 'single' ) {
            getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, 'height' );
          } else if ( uploadType == 'multi' ) {
            getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, 'height' );
          }
          const newVal_ = calculateNewWidth_orNewHeight( getRatio, 'height', effectiveMaxHeight );
          // console.log ( 'newVal_ W', newVal_ );
          item.find( `.widthHeight__item[by="${ by }"] .widthHeight__value` ).val( newVal_.toFixed( 2 ) ).attr( `value`, newVal_.toFixed( 2 ) ).addClass( `error` );

          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( newVal < definedMinWidth ) {
          if ( by == 'width' ) {
            item.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( definedMinWidth ).attr( `value`, definedMinWidth ).addClass( `minError` );
            let getRatio;
            if ( uploadType == 'single' ) {
              getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, 'height' );
            } else if ( uploadType == 'multi' ) {
              getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, 'height' );
            }

            const newVal = calculateNewWidth_orNewHeight( getRatio, 'height', definedMinWidth );
            item.find( `.widthHeight__item[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `minError` );

            if ( isWarningErrorActive ) {
              item.find( `dpi-warning` ).removeClass( `active` );
              dpiErr = true;
            }
          } else if ( by == 'height' ) {
            item.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( definedMinWidth ).attr( `value`, definedMinWidth ).addClass( `minError` );
            let getRatio;
            if ( uploadType == 'single' ) {
              getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, 'width' );
            } else if ( uploadType == 'multi' ) {
              getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, 'width' );
            }
            const newVal = calculateNewWidth_orNewHeight( getRatio, 'width', definedMinWidth );
            item.find( `.widthHeight__item[by="${ by }"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) ).addClass( `minError` );

            if ( isWarningErrorActive ) {
              item.find( `dpi-warning` ).removeClass( `active` );
              dpiErr = true;
            }
          }
        } else {
          if ( by == 'width' ) {
            item.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) );
          } else if ( by == 'height' ) {
            item.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( newVal.toFixed( 2 ) ).attr( `value`, newVal.toFixed( 2 ) );
          }
        }

        setTimeout(() => {
          let updatedWidth, updatedHeight;
          if ( uploadType == 'single' ) {
            updatedWidth = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] input[name="width__value"]` ).val();
            updatedHeight = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` ).val();
          } else if ( uploadType == 'multi' ) {
            updatedWidth = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] input[name="width__value"]` ).val();
            updatedHeight = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` ).val();
            if ( $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` ) == `custom` ) {
              const normalizedDimensions = normalizeMultiUploadCustomDimensions( updatedWidth, updatedHeight, {
                blockNo: selectedBlockNo,
                itemNo: selectedItemNo
              } );
              updatedWidth = normalizedDimensions.width.toFixed( 2 );
              updatedHeight = normalizedDimensions.height.toFixed( 2 );
              syncMultiUploadCustomRowDimensions( selectedBlockNo, selectedItemNo, updatedWidth, updatedHeight );
            }
          }

          if ( typeof updatedWidth !== 'undefined' && updatedWidth && typeof updatedHeight !== 'undefined' && updatedHeight ) {
            let fileDetails = getFileDetailsFunction( selectedBlockNo );
            if ( typeof fileDetails !== 'undefined' && fileDetails ) {
              fileDetails.currentWidth = updatedWidth,
              fileDetails.currentHeight = updatedHeight

              if ( typeof fileDetails.vector_currentWidth !== 'undefined' && fileDetails.vector_currentWidth && typeof fileDetails.vector_currentHeight !== 'undefined' && fileDetails.vector_currentHeight ) {
                fileDetails.vector_currentWidth = updatedWidth
                fileDetails.vector_currentHeight = updatedHeight
              }

              const matchedVariant = getMatchingVariant( fileDetails, selectedBlockNo );
              // console.log ( 'matchedVariant', matchedVariant );
              matched_variant = matchedVariant;
              if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
                applyImgToPreviewBox( fileDetails, matchedVariant, false, selectedBlockNo, `no` );
              }
            }
            // console.log ( 'fileDetails', fileDetails ," typeof window.refreshGRTUpsellBlocks:",typeof window.refreshGRTUpsellBlocks);
            if (typeof window.refreshGRTUpsellBlocks == "function") {
              window.refreshGRTUpsellBlocks();
            }
            if ( uploadType == 'single' ) {
              $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr({
                "w": updatedWidth,
                "h": updatedHeight,
                "size": `${ updatedWidth }x${ updatedHeight }`
              });
            } else if ( uploadType == 'multi' ) {
              $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr({
                "w": updatedWidth,
                "h": updatedHeight,
                "size": `${ updatedWidth }x${ updatedHeight }`
              });
            }
          }

          // console.log ( 'updatedWidth', updatedWidth );
          // console.log ( 'updatedHeight', updatedHeight );

          calculateDPILineItem( selectedBlockNo )
        }, 500);

        setTimeout(() => {
          item.find( `.widthHeight__item .widthHeight__value` ).removeClass( `error minError` );
          if ( dpiErr ) {
            item.find( `dpi-warning` ).addClass( `active` );
            dpiErr = false;
          }
        }, 1500);
      }
      if ( uploadType == 'single' ) {
        $( `upload-controls .addToCartGroupItems` ).removeClass( `disabled` );
      } else if ( uploadType == 'multi' ) {
        refreshMultiUploadCheckoutState( false );
      }
      setActiveRow();
    }, 300);
  } catch ( err ) {
    console.log( `ERROR upload-controls input[name="width__value"], upload-controls input[name="height__value"]`, err.message );
  }
})
.on(`focus`, `upload-controls sizes-blocks .widthHeight__value, upload-controls sizes-blocks .customQtyFile__qty, upload-controls sizes-blocks .popularSizes`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    const selectedItemOption = $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` );
    const activeTab = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
    if ( activeTab == 'custom' && selectedItemOption == 'popular' ) {
      $( `upload-controls tab-controls .tabOptionName[value="${ selectedItemOption }"]` ).prop( `checked`, true );
    } else if ( activeTab == 'popular' && selectedItemOption == 'custom' ) {
      $( `upload-controls tab-controls .tabOptionName[value="${ selectedItemOption }"]` ).prop( `checked`, true );
    }
    pricesTable();
    updatePreviewBoxSizes();
    setActiveRow();
    $( this ).select();
  } catch ( err ) {
    console.log( `ERROR sizes-blocks .widthHeight__value, sizes-blocks .customQtyFile__qty`, err.message );
  }
})
.on(`click`, `#fileremove-2`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `.customTabelPopup__overlay-2` ).fadeIn(500);
    isReadyToPress = false;
  } catch ( err ) {
    console.log( `ERROR #fileremove-2`, err.message );
  }
})
.on(`click`, `upload-controls preview-box a[removefile]`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const fileRemoveHTML = $( `upload-controls template[data-id="fileRemove"]` ).html();
    $( `body` ).append( fileRemoveHTML );
  } catch ( err ) {
    console.log( `ERROR preview-box a[fileremove]`, err.message );
  }
})
.on(`click`, `file-remove-wrapper .fileRemoveBlock__removeFile, file-remove-wrapper-multi .fileRemoveBlock__removeFile`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    /* Capture the user-vs-programmatic distinction BEFORE we kick off
       the async cleanup. e.isTrusted is only true for real user clicks
       — synthetic .click() / .trigger() calls produce isTrusted=false.
       Gating the reload on this avoids breaking internal flows that
       remove a file as part of a larger sequence (resetLoading,
       gang-sheet replace, etc.) — those keep the existing state-reset
       behavior. */
    const __isUserClick = e.isTrusted;
    if ( uploadType == 'single' ) {
      flushSingleFileData();
    } else if ( uploadType == 'multi' ) {
      const totalBlocks = $( `multi-upload uploaded-files-block` ).length;
      if ( totalBlocks == 1 ) {
        multiUploadProcessingBlocks.clear();
        $( `multi-upload-wrapper` ).remove();
        $( `file-remove-wrapper-multi` ).remove();
        uploadType = '';
      } else {
        multiUploadProcessingBlocks.delete( `${ selectedBlockNo }` );
        $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"]` ).remove();
        resetItemNo();
        applyItemNo( 'custom', selectedBlockNo );
        $( `file-remove-wrapper-multi` ).remove();
      }
      refreshMultiUploadCheckoutState();
    }
    /* Full hard reload after a USER-confirmed trash. The user wants
       this on EVERY product page with an upload box, for both
       file-upload and Previous-Designs-picker flows. e.isTrusted
       distinguishes real user clicks (true) from internal
       programmatic .click() calls (false) so internal flows
       (resetLoading, gang-sheet replace, etc.) keep their existing
       state-reset behavior. The 50ms delay gives flushSingleFileData /
       multi-cleanup a tick to finish DOM teardown before reload. */
    if ( __isUserClick ) {
      setTimeout( function () { window.location.reload(); }, 50 );
    }
  } catch ( err ) {
    console.log( `ERROR file-remove-wrapper .fileRemoveBlock__removeFile, file-remove-wrapper-multi .fileRemoveBlock__removeFile`, err.message );
  }
})
.on(`click`, `file-remove-wrapper-multi .removeAllBlocks`, function( e ) {
  try {
    e.stopImmediatePropagation();
    multiUploadProcessingBlocks.clear();
    $( `multi-upload-wrapper` ).remove();
    $( `file-remove-wrapper-multi` ).remove();
    uploadType = '';
    refreshMultiUploadCheckoutState();
  } catch ( err ) {
    console.log( `ERROR file-remove-wrapper-multi .removeAllBlocks`, err.message );
  }
})

.on(`click`, `file-remove-wrapper .fileRemoveBlock__close, file-remove-wrapper .fileRemoveBlock__cancle`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this ).closest( `file-remove-wrapper` ).remove();
  } catch ( err ) {
    console.log( `ERROR file-remove-wrapper .fileRemoveBlock__close, file-remove-wrapper .fileRemoveBlock__cancle`, err.message );
  }
})
.on(`click`, `file-remove-wrapper-multi .fileRemoveBlock__close, file-remove-wrapper-multi .fileRemoveBlock__cancle`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( this ).closest( `file-remove-wrapper-multi` ).remove();
  } catch ( err ) {
    console.log( `ERROR file-remove-wrapper-multi .fileRemoveBlock__close, file-remove-wrapper-multi .fileRemoveBlock__cancle`, err.message );
  }
})
.on(`click`, `multi-upload another-upload-multi`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `#anotherFileMultiple` ).click();
  } catch ( err ) {
    console.log( `ERROR multi-upload another-upload-multi`, err.message );
  }
})
.on(`change`, `multi-upload #anotherFileMultiple`, function( e ) {
  try {
    e.stopImmediatePropagation();
    console.log ( 'e', e.target.files );
    let filesCounter = $( `multi-upload uploaded-files-block` ).length;
    let beforeUploadAvailableBlocks = filesCounter;
    for (const file of e.target.files) {
      filesCounter++;
      multiFilesManage( file, filesCounter );
    }

    setTimeout(() => {
      setFocusOfMultiUpload( beforeUploadAvailableBlocks );
    }, 500);
    /* Reset so re-picking the same file fires `change` again — without this,
       the browser sees no value change for an identical filename and skips
       the event entirely, breaking subsequent Upload Another clicks. */
    e.target.value = '';
  } catch ( err ) {
    console.log( `ERROR multi-upload #anotherFileMultiple`, err.message );
  }
})
// ADD TO CART START
.on(`click`, `upload-controls proceed-to-checkout .addToCartGroupItems`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'single' ) {
      const items = await singleFileAddToCart( `checkout` );
    }
  } catch ( err ) {
    console.log( `ERROR upload-controls proceed-to-checkout .addToCartGroupItems`, err.message );
  }
})
.on(`click`, `multi-upload-wrapper proceed-to-checkout .addToCartGroupItemsMultiple`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'multi' ) {
      refreshMultiUploadCheckoutState();
      const items = await multiFilesAddToCart();
    }
  } catch ( err ) {
    console.log( `ERROR multi-upload-wrapper proceed-to-checkout .addToCartGroupItemsMultiple`, err.message );
  }
})
// ADD TO CART END

// EVENTS FOR SINGLE END

// EVENTS FOR MULTIPLE START
.on(`click`, `multi-upload preview-box a[removefile], multi-upload item-no .itemNo__action a`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    const fileRemoveHTML = $( `template[data-multi-id="fileRemove"]` ).html();
    $( `body` ).append( fileRemoveHTML );
  } catch ( err ) {
    console.log( `ERROR preview-box a[fileremove], multi-upload item-no .itemNo__action a`, err.message );
  }
})
.on(`change`, `multi-upload sizes-blocks .popularSizes`,async function( e ) {
  try {
    e.stopPropagation();
    console.clear();

    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    const selectedVal = $(this).val();
    // Mark popular edit state for this block only when a real popular size is selected.
    setMultiUploadEditDetected( selectedBlockNo, `popular`, !!selectedVal );
    if ( $( this ).hasClass( `error` ) && selectedVal ) {
      $( this ).removeClass( `error` ).removeAttr( `style` );
      $( this ).siblings( `.popularSizes_error` ).remove();
    }
    if (!selectedVal) return;

    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    // console.log ( 'selectedBlockNo', selectedBlockNo );
    // console.log ( 'selectedItemNo', selectedItemNo );

    const $row      = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` );
    $row.attr("pop-size", "Yes");
    // let activeOption = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
    let fileDetails = getFileDetailsFunction( selectedBlockNo );
    if ( typeof fileDetails !== 'undefined' && fileDetails ) {
      let largerIs = Math.ceil(fileDetails.fileWidth) >= Math.ceil(fileDetails.fileHeight) ? 'width' : 'height';
      // let largerIs =fileDetails.fileHeight ? 'width' : 'height';

      // console.log ( 'fileDetails', fileDetails );

      // console.log ( 'largerIs', largerIs );

      const matchedVariant = getMatchingVariant( fileDetails, selectedBlockNo );

      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        // console.log ( 'matchedVariant', matchedVariant );

        if ( document.body.classList.contains('smart-sizing-true' ) ) {  
          // console.log ( 'yes it is',  );
          let width  = 0;
          let height = 0;
          if ( matchedVariant && matchedVariant.option1_converted ) {
            const dim = getWidthHeight_popularSize( matchedVariant.option1_converted );
            if (dim) {
              width  = dim.width;
              height = dim.height;
            }
          }

          // console.log ( 'width', width, 'height', height );

          // const smart = getSmartSizedDimensions(width, height);

          // console.log ( 'smart', smart );

          // width  = smart.width;
          // height = smart.height;

          let updatedDim = {};

          if ( largerIs == 'width' ) {
            // console.log ( 'its by width', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
            updatedDim = getProportionalSize( width, 'width', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
          } else {
            // console.log ( 'its by height', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
            updatedDim = getProportionalSize( height, 'height', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
          }

          width = updatedDim.width;
          height = updatedDim.height;
          const normalizedPopularDimensions = normalizeMultiUploadCustomDimensions( width, height, {
            blockNo: selectedBlockNo,
            itemNo: selectedItemNo
          } );
          width = normalizedPopularDimensions.width;
          height = normalizedPopularDimensions.height;

          // console.log ( 'updatedDim', updatedDim );

          const $select = $(this);

          resetPopularOptionLabels($select);

          const $option = $select.find('option:selected');
          const originalLabel = $option.data('original-label') || $.trim($option.text());

          // console.log ( 'originalLabel', originalLabel );

          if (!$option.data('original-label')) {
            $option.data('original-label', originalLabel);
          }

          const parts = originalLabel.split('-');
          const desc  = parts.length > 1 ? '-' + parts.slice(1).join('-') : '';

          const wLabel = formatInchesValue(width);
          const hLabel = formatInchesValue(height);

          const newLabel = `${wLabel}" x ${hLabel}" ${desc}`;
          $option.text(newLabel);

          fileDetails.currentWidth  = width;
          fileDetails.currentHeight = height;

          const matchedPricingVariant = getVariantForSmartSize(width, height);

          // console.log ( 'matchedPricingVariant', matchedPricingVariant );

          if (matchedPricingVariant) {
            $row.attr({
              "title": matchedPricingVariant.title,
              "vid": matchedPricingVariant.id,
              "dpi-warning": '',
              "price": matchedPricingVariant.price,
              "media-id": matchedPricingVariant.media_id,
              "w": width,
              "h": height,
              "size": `${ width }x${ height }`
            });
          }

          applyImgToPreviewBox( fileDetails, matchedPricingVariant, false, selectedBlockNo, `no` );
          updateLineItemData( width, height, selectedBlockNo );
        } else {
          applyImgToPreviewBox( fileDetails, matchedVariant, false, selectedBlockNo, `no` );
          const getDimension = getWidthHeight_popularSize( matchedVariant.option1_converted );
          if ( typeof getDimension !== 'undefined' && getDimension ) {
            updateLineItemData( getDimension.width, getDimension.height, selectedBlockNo );
          }
        }
      }
    }
    calculateDPILineItem( selectedBlockNo );
    updatePreviewBoxSizes();
    setActiveRow();
  } catch ( err ) {
    console.log( `ERROR upload-controls tab-controls .tabOptionName`, err.message );
  }
})
.on(`focus`, `multi-upload sizes-blocks .widthHeight__value, multi-upload sizes-blocks .customQtyFile__qty, multi-upload sizes-blocks .popularSizes`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    const selectedItemOption = $( this ).closest( `.widthHeight__custom[item]` ).attr( `option-selected` );
    const activeTab = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
    if ( activeTab == 'custom' && selectedItemOption == 'popular' ) {
      $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName[value="${ selectedItemOption }"]` ).prop( `checked`, true );
    } else if ( activeTab == 'popular' && selectedItemOption == 'custom' ) {
      $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName[value="${ selectedItemOption }"]` ).prop( `checked`, true );
    }
    pricesTable();
    updatePreviewBoxSizes();
    $( this ).select();
    setActiveRow();
  } catch ( err ) {
    console.log( `ERROR multi-upload sizes-blocks .widthHeight__value, multi-upload sizes-blocks .customQtyFile__qty, multi-upload sizes-blocks .popularSizes`, err.message );
  }
})
.on(`change`, `multi-upload tab-controls .tabOptionName`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    const nextOption = $( this ).val();
    const previousOption = nextOption == `custom` ? `popular` : `custom`;
    const $sizesBlock = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks` );
    const hasCustomEdit = $sizesBlock.hasClass( `has-custom-edit` );
    const hasPopularEdit = $sizesBlock.hasClass( `has-popular-edit` );
    console.log( `[multi-upload] block ${ selectedBlockNo } tab switch: ${ previousOption } -> ${ nextOption } | customEdit=${ hasCustomEdit } | popularEdit=${ hasPopularEdit }` );
    console.log( `[multi-upload] block ${ selectedBlockNo } sizes-blocks classes: ${ $sizesBlock.attr( `class` ) || `` }` );
    console.log ( 'selectedBlockNo', selectedBlockNo );
    const isAdded = await checkAndAddNewSizeRow( selectedBlockNo );
    console.log ( 'isAdded', isAdded );
    let activeOption = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
    if ( isAdded ) {
      let fileDetails = getFileDetailsFunction( selectedBlockNo );
      if ( typeof fileDetails !== 'undefined' && fileDetails ) {
        const matchedVariant = getMatchingVariant( fileDetails, selectedBlockNo );
        if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
          applyImgToPreviewBox( fileDetails, matchedVariant, false, selectedBlockNo );

          if ( activeOption == 'custom' ) {
            updateLineItemData( fileDetails.currentWidth, fileDetails.currentHeight, selectedBlockNo )
          } else if ( activeOption == 'popular' ) {
            const getDimension = getWidthHeight_popularSize( matchedVariant.option1_converted );
            updateLineItemData( getDimension.width, getDimension.height, selectedBlockNo );
          }
        }
      }
    }
    // let isRowSelected = false;
    if ( activeOption == 'custom' ) {
      const isAvailable = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks line-items-custom .widthHeight__custom` ).length;
      if ( isAvailable > 0 ) {
        selectedItemNo = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks line-items-custom .widthHeight__custom` ).last().attr( `item` );
      }
    } else if ( activeOption == 'popular' ) {
      const isAvailable = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks line-items-popular .widthHeight__custom` ).length;
      if ( isAvailable > 0 ) {
        selectedItemNo = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks line-items-popular .widthHeight__custom` ).last().attr( `item` );
      }
    }

    // pricesTable();
    updatePreviewBoxSizes();
    setActiveRow();
    // console.log ( 'selectedItemNo', selectedItemNo );
  } catch ( err ) {
    console.log( `ERROR multi-upload tab-controls .tabOptionName`, err.message );
  }
})
.on(`change`, `multi-upload #preCutOption_multi`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const isPreCutActive = $( this ).is( `:checked` );
    if ( isPreCutActive ) {
      $( `multi-upload sizes-blocks .widthHeight__custom` ).attr( `precut`, `Yes` );
    } else {
      $( `multi-upload sizes-blocks .widthHeight__custom` ).attr( `precut`, `` );
    }
  } catch ( err ) {
    console.log( `ERROR multi-upload #preCutOption_multi`, err.message );
  }
})

.on(`click`, `upload-controls prices-table .pricesTable__table_viewAll, multi-upload prices-table .pricesTable__table_viewAll`, function( e ) {
  try {
    e.stopImmediatePropagation();
    // if ( uploadType == 'single' ) {
      const isShowAll = $( this ).closest( `.pricesTable__items` ).hasClass( `showAll` );
      if ( isShowAll ) {
        $( this ).closest( `.pricesTable__items` ).removeClass( `showAll` );
        $( this ).addClass( `view` );
      } else {
        $( this ).closest( `.pricesTable__items` ).addClass( `showAll` );
        $( this ).removeClass( `view` );
      }
    // } else if ( uploadType == 'multi' ) {

    // }
  } catch ( err ) {
    console.log( `ERROR upload-controls prices-table .pricesTable__table_viewAll`, err.message );
  }
})

function resetPopularOptionLabels($select) {
  try {
    $select.find('option').each(function() {
      const $opt = $(this);
      const originalLabel = $opt.data('original-label');
      if (originalLabel) {
        $opt.text(originalLabel);
      }
    });
  } catch (err) {
    console.log("ERROR resetPopularOptionLabels", err.message);
  }
}

// EVENTS FOR MULTIPLE END

function extractDimensions(str) {
  // Match two numbers (integer or decimal), optionally separated by 'x' or '×' or 'X'
  const match = str.match(/([\d.]+)[^0-9.]*([\d.]+)/);
  if (match) {
    const width = match[1];
    const height = match[2];
    return { width, height };
  }
  return null;
}


// Main upload handler
async function manageFiles(files) {
  console.clear();
  /* Snapshot the FileList -> Array up front. `files` from
     `fileInput.change` is LIVE; activateMultiupload() can end up
     resetting #fileInput.value, which empties the FileList mid-flow
     and skips the loop below. See bySize.js manageFiles for the full
     diagnosis. */
  const filesArr = Array.from( files );
  console.log ( 'files', filesArr.length );
  if ( typeof productTypeIs !== 'undefined' && productTypeIs == 'bySize' ) {
    if ( filesArr.length > 1 ) {
      await activateMultiupload();
    }
    let filesCounter = 1;
    for (const file of filesArr) {
      if ( filesArr.length == 1 ) {
        await singleFileManage( file );
      } else {
        multiFilesManage( file, filesCounter );
        filesCounter++;
      }
    }
  }
}

function setFocusOfMultiUpload( beforeUploadAvailableBlocks ) {
  try {
    console.clear();
    console.log ( 'beforeUploadAvailableBlocks', beforeUploadAvailableBlocks );
    if ( beforeUploadAvailableBlocks == 0 ) {
      $( `multi-upload upload-area` ).animate({scrollTop: 0}, 500);
      return;
    }
    let actualTop = 0;
    $( `multi-upload file-blocks-area uploaded-files-block` ).each(function( i ) {
      const j = i + 1;
      if ( i < beforeUploadAvailableBlocks ) {
        const getBlockHeight = $( this ).outerHeight() + 20;
        actualTop = actualTop + getBlockHeight;
      }
    })
    $( `multi-upload upload-area` ).animate({scrollTop: ( actualTop )}, 500);
  } catch ( err ) {
    console.log( `ERROR setFocusOfMultiUpload( beforeUploadAvailableBlocks )`, err.message );
  }
}

function setActiveRow() {
  try {
    if ( uploadType == 'single' ) {
      $( `sizes-blocks .widthHeight__custom` ).removeClass( `active` );
      $( `sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).addClass( `active` );
    } else if ( uploadType == 'multi' ) {
      $( `multi-upload .widthHeight__custom` ).removeClass( `active` );
      $( `multi-upload .widthHeight__custom[item="${ selectedItemNo }"]` ).addClass( `active` );
    }

    // console.log("typeof _qtyupdate:",typeof _qtyupdate)
    if(typeof _qtyupdate == "function"){
      _qtyupdate();
      $(".grt_payment_icons").removeClass("hide");
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

async function shippingBarData( total ) {
  try {
    await fetch( `/cart?view=shipping-bar&price=${ total }` )
      .then(response => {
        return response.text()
      })
      .then(html => {
        $( `multi-upload multi-shipping-bar` ).html( html.replaceAll(`[AMOUNT]`,`$75`) )
      })
  } catch ( err ) {
    console.log( `ERROR shippingBarData( total )`, err.message );
  }
}

async function processFileOrUrl(fileOrUrl, blockNo) {
  let file;

  // CASE 1: It's already a File object (from input/drag-drop)
  if (fileOrUrl instanceof File) {
    file = fileOrUrl;
  }
  // CASE 2: It's a string (external URL or S3)
  else if (typeof fileOrUrl === "string") {
    const url = fileOrUrl;

    // ✅ If already in your S3 bucket → skip re-upload
    if (url.includes("amazonaws.com")) {
      return {
        originalFile: url,
        imgIxFile: url.replace(ninjaS3Host2, ninjaImgixHost),
        file_crc: null,
        fileName: url.split("/").pop().split("?")[0]
      };
    }

    // Otherwise → download and wrap as File
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch external file");

    const blob = await response.blob();

    // Extract filename
    const urlParts = url.split("/");
    let nameFromUrl = urlParts[urlParts.length - 1].split("?")[0];
    if (!nameFromUrl.includes(".")) {
      nameFromUrl = "file_" + Date.now() + ".jpg";
    }

    file = new File([blob], nameFromUrl, { type: blob.type || "application/octet-stream" });
  } else {
    throw new Error("Invalid input: must be File or URL string");
  }

  // --- Your original processFile logic ---
  let rtn = null;
  const fileReader = new FileReader();
  const fileType = file.type;
  const fileSize = file.size;

  const nameOnly = file.name
    .split(".")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const extension = file.name.split(".").pop();
  const randomName = `${nameOnly}____image_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;

  const presignData = await getPresignedUploadUrl(randomName, file.type);

  if (presignData && presignData.url) {
    fileProcessBar(`start`);
    if (uploadType == "single") {
      singleProgressMove = progressMove(`upload-controls file-progress`, ``, fileSize);
    } else if (uploadType == "multi") {
      progressMove(`multi-upload uploaded-files-block[block-no="${blockNo}"] file-progress`, ``, fileSize);
    }

    const originalUploadedFileURL = presignData.sourceUrl;
    const response = await fetch(presignData.url, {
      method: "PUT",
      body: file,
    });

    if (response.status == 200) {
      let filePath = `https://${ninjaImgixHost}/${randomName}`;
      const file_crc = await makeCRC(file);

      fileReader.readAsDataURL(file);
      rtn = {
        originalFile: originalUploadedFileURL,
        imgIxFile: filePath,
        file_crc: file_crc,
        fileName: randomName,
      };
    }
  }
  return rtn;
}


function initRatioFromImage(imageUrl, cb) {
  const img = new Image();
  // img.crossOrigin = "anonymous";

  img.onload = function () {
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    if (!w || !h) {
      console.error("Invalid image size", imageUrl);
      return;
    }

    calculateRatio(w, h);   // ← THIS was missing
    if (cb) cb();
  };

  img.onerror = function () {
    console.error("Failed to load image", imageUrl);
  };

  img.src = imageUrl;
}

$(document).ready(async function () {
  let sharedSelection = [];
  try {
    const sharedSelectionParam = getParam(MY_DESIGNS_SELECTION_PARAM);
    if (typeof sharedSelectionParam !== 'undefined' && sharedSelectionParam) {
      sharedSelection = JSON.parse(decodeURIComponent(sharedSelectionParam));
      removeQueryParam(MY_DESIGNS_SELECTION_PARAM);
    }
  } catch (err) {
    console.log(`ERROR reading my_designs_selection`, err.message);
    sharedSelection = [];
  }

  /* Bridge my-designs picker selections into the "design re-used"
     attribution maps. Items selected from a purchased order on the
     standalone /pages/my-designs page carry .orderName; those entries
     pre-populate window.__designReUsedByUrl + __designReUsedByName so
     ninja-multiupload.js can stamp properties[design re-used] on cart
     add. Items from "my uploads" lack .orderName and skip this.
     For single-design selections we ALSO set the legacy globals
     `window.ordername` + `window.grt_photo_id` because non-
     multiupload code paths (bySize.js / bySize_popular.js single-
     file branch) read those globals at cart-serialize time. */
  try {
    if (Array.isArray(sharedSelection) && sharedSelection.length) {
      window.__designReUsedByUrl  = window.__designReUsedByUrl  || {};
      window.__designReUsedByName = window.__designReUsedByName || {};
      sharedSelection.forEach(function (it) {
        if (!it || !it.orderName) return;
        var ord = String(it.orderName).trim();
        if (!ord) return;
        var tag = 'previously on order # ' + ord;
        var url = it.fileURL ? String(it.fileURL).split('?')[0] : '';
        if (url) {
          window.__designReUsedByUrl[url] = tag;
          if (typeof ninjaS3Host2 !== 'undefined' && typeof ninjaS3Host !== 'undefined') {
            window.__designReUsedByUrl[url.split(ninjaS3Host2).join(ninjaS3Host)] = tag;
            window.__designReUsedByUrl[url.split(ninjaS3Host).join(ninjaS3Host2)] = tag;
          }
        }
        var basename = url ? url.split('/').pop() : (it.name || '');
        if (basename) window.__designReUsedByName[basename] = tag;
      });
      if (sharedSelection.length === 1 && sharedSelection[0] && sharedSelection[0].orderName) {
        var soOrd = String(sharedSelection[0].orderName).trim();
        if (soOrd) {
          window.ordername    = soOrd;
          window.grt_photo_id = 'previously on order # ' + soOrd;
          designtype          = 1;
          ordername           = soOrd;
          grt_photo_id        = window.grt_photo_id;
        }
      }
    }
  } catch (_bridgeErr) { /* never block load */ }

  if (sharedSelection.length > 1) {
    await multiFilesManageByURL(sharedSelection);
    return;
  }

  if (sharedSelection.length === 1) {
    initRatioFromImage(sharedSelection[0].fileURL, function () {
      singleFileManageByURL(sharedSelection[0]);
    });
    return;
  }

  let fileURL = getParam(`file`);
  if (typeof fileURL !== 'undefined' && fileURL) {
    singleProgressMove = progressMove( `upload-controls file-progress`, `quick`);
    fileURL = fileURL.replace(`#`, `%23`);
    if (fileURL.includes(`?`)) {
      fileURL = fileURL.split(`?`)[0];
    }

    let fileDetail;

    // ✅ If it's your own S3 bucket → use existing shortcut
    if (fileURL.includes("amazonaws.com")) {
      fileDetail = createFileObjectFromUrl(fileURL);
      fileDetail.fileURL = fileURL;
    }
    // ✅ Otherwise: upload external URL to S3
    else {
      try {
        const uploaded = await processFileOrUrl(fileURL, 1); // blockNo = 1 for single
        fileDetail = {
          originalFile: uploaded.originalFile,
          imgIxFile: uploaded.imgIxFile,
          file_crc: uploaded.file_crc,
          fileName: uploaded.fileName,
          fileURL: uploaded.originalFile
        };
      } catch (err) {
        console.error("Error uploading external URL:", err);
        return;
      }
    }

    // Handle extra query params
    let isRTP = getParam(`rtp`);
    if (typeof isRTP !== 'undefined' && isRTP == 'Y') {
      fileDetail.isReadyToPress = 'Yes';
      removeQueryParam(`rtp`);
    }
    removeQueryParam(`file`);
    removeQueryParam(`order_name`);
    removeQueryParam(`ordertype`);

    let orderFileWidth = getParam( `orderFileWidth` );
    let orderFileHeight = getParam( `orderFileHeight` );
    if ( typeof orderFileWidth !== 'undefined' && orderFileWidth && typeof orderFileHeight !== 'undefined' && orderFileHeight ) {
      fileDetail.orderFileWidth = orderFileWidth;
      fileDetail.orderFileHeight = orderFileHeight;
      // removeQueryParam(`orderFileWidth`);
      // removeQueryParam(`orderFileHeight`);
    }

    let isDesignStudioParam = getParam(`_design_studio`);
    if (typeof isDesignStudioParam !== 'undefined' && isDesignStudioParam == 'Yes') {
      fileDetail.isDesignStudio = 'Yes';
      removeQueryParam(`_design_studio`);
    }

    // Pass into your existing flow
    initRatioFromImage(fileDetail.fileURL || fileDetail.imgIxFile, function () {
      singleFileManageByURL(fileDetail);
    });
  }

  const isDesignModal = getParam(`open`);
  if (typeof isDesignModal !== 'undefined' && isDesignModal == 'designModal') {
    removeQueryParam(`open`);
    $(`upload-controls master-upload .purchase_from_previous`).click();
  }
});


function removeQueryParam( param ) {
  const url = new URL(window.location.href);
  url.searchParams.delete( param );

  // Update the URL without reloading
  window.history.replaceState({}, '', url);
}

async function singleFileManageByURL( file ) {
  try {
    console.clear();
    uploadType = 'single';
    console.log ( 'file chaaa', file );
    const safeFileName = file.name || file.fileName || "unnamed_file";
    const fileExt = getFileExt(safeFileName);
    const selectedParamsObject = imgPreviewBox( `active`, fileExt );
    if ( typeof file.isReadyToPress !== 'undefined' && file.isReadyToPress == 'Yes' ) {
      selectedParamsObject.bgRemover = false;
      selectedParamsObject.superRes = false;
      selectedParamsObject.byDefaultBgRemover = false;
      selectedParamsObject.byDefaultSuperRes = false;
      selectedParamsObject.preview = ``;
      selectedParamsObject.cart = ``;
      selectedParamsObject.order = `[S3]`;
      $( `upload-controls toggle-options` ).attr({
        "show-bg-option": false,
        "show-superres-option": false
      });
    }
    // Design Studio handoffs: the user already had Remove BG / Upscale /
    // Edit with AI available inside Studio, so re-running them on the PDP
    // is at best redundant and at worst breaks the alpha-channel PNG that
    // came out of the canvas export. Mirror the isReadyToPress flag —
    // suppress the toggles + hide the AI edit button on this PDP load.
    if ( typeof file.isDesignStudio !== 'undefined' && file.isDesignStudio == 'Yes' ) {
      selectedParamsObject.bgRemover = false;
      selectedParamsObject.superRes = false;
      selectedParamsObject.byDefaultBgRemover = false;
      selectedParamsObject.byDefaultSuperRes = false;
      $( `upload-controls toggle-options` ).attr({
        "show-bg-option": false,
        "show-superres-option": false
      });
      $( `upload-controls .edit-with-ai, multi-upload .edit-with-ai` ).hide();
    }
    let svgFileStatus = false;
    if ( fileExt == 'svg' ) {
      svgFileStatus = preDeterminedSVGDimension( file );
    }
    const s3File = file.fileURL.replace( ninjaS3Host, ninjaS3Host2 );
    const imgIxFile = file.fileURL.replace( ninjaS3Host2, ninjaS3Host );

    const getFileDetails = {
      "originalFile": s3File,
      "imgIxFile": imgIxFile,
      "fileName": file.name,
      "fileExt": fileExt
    }
    if ( typeof file.isReadyToPress !== 'undefined' && file.isReadyToPress == 'Yes' ) {
      getFileDetails.isReadyToPress = file.isReadyToPress;
    }
    if ( typeof file.isDesignStudio !== 'undefined' && file.isDesignStudio == 'Yes' ) {
      getFileDetails.isDesignStudio = file.isDesignStudio;
    }

    if ( typeof file.isAIImage !== 'undefined' && file.isAIImage ) {
      getFileDetails.isAIImage = file.isAIImage;
    }

    if ( typeof file.isAIEdit !== 'undefined' && file.isAIEdit ) {
      getFileDetails.isAIEdit = file.isAIEdit;
    }

    if ( typeof file.aiOriginalUrl !== 'undefined' && file.aiOriginalUrl ) {
      getFileDetails.aiOriginalUrl = file.aiOriginalUrl;
    }

    if ( typeof file.originalUploadReference !== 'undefined' && file.originalUploadReference ) {
      getFileDetails.originalUploadReference = file.originalUploadReference;
    }

    if ( typeof selectedParamsObject !== 'undefined' && selectedParamsObject && typeof getFileDetails !== 'undefined' && getFileDetails ) {
      let fileDetails = { ...selectedParamsObject, ...getFileDetails };

      if ( fileDetails.bgRemover && fileDetails.byDefaultBgRemover ) {
        $( `upload-controls preview-box #bgRemover` ).prop( `checked`, true );
      }
      if ( fileDetails.superRes && fileDetails.byDefaultSuperRes ) {
        $( `upload-controls preview-box #superRes` ).prop( `checked`, true );
      }

      const optionParams = getToggleOptionParams();
      $( `upload-controls file-preview preview-block .fileupload_hero` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );

      if ( fileExt == 'png' || fileExt == 'jpg' || fileExt == 'svg' ) {
        // const getImgDimensions = await getOriginalImageSize( `upload-controls file-preview preview-block .fileupload_hero` );
        // const previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
        let previewParams_withoutWidthHeight = fileDetails.preview;
        if ( typeof fileDetails.isDesignStudio !== 'undefined' && fileDetails.isDesignStudio == 'Yes' ) {
          previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
        }
        const getImgDimensions = await getImageSizeFromUrl( `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        if ( typeof getImgDimensions !== 'undefined' && getImgDimensions ) {
          // const isValidDimension = validateAndScaleDimensions((getImgDimensions.width / 300).toFixed(2), (getImgDimensions.height / 300).toFixed(2));

          // if ( typeof isValidDimension !== 'undefined' && isValidDimension ) {
          //   console.log ( 'isValidDimension', isValidDimension );
          // }

          let widthIn = (getImgDimensions.width / 300).toFixed(2);
          let heightIn = (getImgDimensions.height / 300).toFixed(2);
          let widthPx = getImgDimensions.width;
          let heightPx = getImgDimensions.height;

          if ( widthIn > definedMaxWidth || heightIn > definedMaxHeight ) {
            if ( widthIn == heightIn ) {
              widthPx = definedMaxWidth * 300;
              heightPx = definedMaxHeight * 300;
              widthIn = definedMaxWidth;
              heightIn = definedMaxHeight;
            } else if ( widthIn > heightIn ) {
              const ratio = getRatioFunc( heightIn, widthIn );
              const newHeight = calculateNewWidth_orNewHeight( ratio, 'height', definedMaxWidth);
              widthIn = definedMaxWidth;
              heightIn = newHeight;
              widthPx = definedMaxWidth * 300;
              heightPx = newHeight * 300;
            } else if ( heightIn > widthIn ) {
              const ratio = getRatioFunc( widthIn, heightIn );
              const newWidth = calculateNewWidth_orNewHeight( ratio, 'width', definedMaxHeight );
              widthIn = newWidth;
              heightIn = definedMaxHeight;
              widthPx = newWidth * 300;
              heightPx = definedMaxHeight * 300;
            }
          }

          fileDetails.fileWidth = widthPx;
          fileDetails.fileHeight = heightPx;
          fileDetails.fileWidth_inch = ( widthPx / 300 ).toFixed( 2 );
          fileDetails.fileHeight_inch = ( heightPx / 300 ).toFixed( 2 );
          fileDetails.ratioBy_width = `${ widthPx / heightPx }`;
          fileDetails.ratioBy_height = `${ heightPx / widthPx }`;
          fileDetails.currentWidth = ( widthPx / 300 ).toFixed(2);
          fileDetails.currentHeight = ( heightPx / 300).toFixed(2);

          /* Mirror the fresh-upload img.onload path: seed the ratio_width
             / ratio_height globals that calculateratioForImage() reads when
             it labels the Ninja Size Guide tiles. Without this, picking a
             previous design (or any non-upload path that lands here) leaves
             the globals unset → aspectRatio = NaN → every "fixed W × derived
             H" tile prints "X\" x NaN\"". */
          if ( typeof calculateRatio === 'function' ) {
            calculateRatio( getImgDimensions.width, getImgDimensions.height );
          }
        }
      } else {
        // console.log ( 'definedMaxHeight, definedMaxWidth', definedMaxHeight, definedMaxWidth );
        if ( typeof file.designWidth !== 'undefined' && file.designWidth && typeof file.designHeight !== 'undefined' && file.designHeight ) {
          const isValidDimension = validateAndScaleDimensions(file.designWidth, file.designHeight);

          if ( typeof isValidDimension !== 'undefined' && isValidDimension && typeof isValidDimension.width !== 'undefined' && isValidDimension.width && typeof isValidDimension.height !== 'undefined' && isValidDimension.height ) {
            file.designWidth = isValidDimension.width;
            file.designHeight = isValidDimension.height;
          }
          // console.log ( 'isValidDimension', isValidDimension );
          // if ( file.designWidth > definedMaxWidth || file.designHeight )
          // console.log ( 'fileDetails chaaa here', fileDetails );
          const dimensionDetails = {
            "vector_fileWidth": (file.designWidth * 300).toFixed(2),
            "vector_fileHeight": (file.designHeight * 300).toFixed(2),
            "vector_fileWidth_inch": file.designWidth,
            "vector_fileHeight_inch": (file.designHeight / 300).toFixed(2),
            "vector_ratioBy_width": `${ file.designWidth / file.designHeight }`,
            "vector_ratioBy_height": `${ file.designHeight / file.designWidth }`,
            "vector_currentWidth": file.designWidth,
            "vector_currentHeight": file.designHeight,

            "fileWidth": (file.designWidth * 300).toFixed(2),
            "fileHeight": (file.designHeight * 300).toFixed(2),
            "fileWidth_inch": file.designWidth,
            "fileHeight_inch": file.designHeight,
            "ratioBy_width": `${ file.designWidth / file.designHeight }`,
            "ratioBy_height": `${ file.designHeight / file.designWidth }`,
            "currentWidth": file.designWidth,
            "currentHeight": file.designHeight
          }
          fileDetails = { ...fileDetails, ...dimensionDetails };

          if ( typeof calculateRatio === 'function' ) {
            calculateRatio( file.designWidth, file.designHeight );
          }

          // console.log ( 'fileDetails after', fileDetails );
        } else if ( typeof file.orderFileWidth !== 'undefined' && file.orderFileWidth && typeof file.orderFileHeight !== 'undefined' && file.orderFileHeight ) {
          // console.log ( 'fileDetails order here', fileDetails );
          const isValidDimension = validateAndScaleDimensions(file.orderFileWidth, file.orderFileHeight);
          if ( typeof isValidDimension !== 'undefined' && isValidDimension && typeof isValidDimension.width !== 'undefined' && isValidDimension.width && typeof isValidDimension.height !== 'undefined' && isValidDimension.height ) {
            file.orderFileWidth = isValidDimension.width;
            file.orderFileHeight = isValidDimension.height;
          }
          const dimensionDetails = {
            "vector_fileWidth": (file.orderFileWidth * 300).toFixed(2),
            "vector_fileHeight": (file.orderFileHeight * 300).toFixed(2),
            "vector_fileWidth_inch": file.orderFileWidth,
            "vector_fileHeight_inch": (file.orderFileHeight / 300).toFixed(2),
            "vector_ratioBy_width": `${ file.orderFileWidth / file.orderFileHeight }`,
            "vector_ratioBy_height": `${ file.orderFileHeight / file.orderFileWidth }`,
            "vector_currentWidth": file.orderFileWidth,
            "vector_currentHeight": file.orderFileHeight,

            "fileWidth": (file.orderFileWidth * 300).toFixed(2),
            "fileHeight": (file.orderFileHeight * 300).toFixed(2),
            "fileWidth_inch": file.orderFileWidth,
            "fileHeight_inch": file.orderFileHeight,
            "ratioBy_width": `${ file.orderFileWidth / file.orderFileHeight }`,
            "ratioBy_height": `${ file.orderFileHeight / file.orderFileWidth }`,
            "currentWidth": file.orderFileWidth,
            "currentHeight": file.orderFileHeight
          }
          fileDetails = { ...fileDetails, ...dimensionDetails };

          if ( typeof calculateRatio === 'function' ) {
            calculateRatio( file.orderFileWidth, file.orderFileHeight );
          }

          // console.log ( 'fileDetails order after', fileDetails );
        } else {
          const dimensionDetails = await fileDimensions( fileDetails );
          // console.log ( 'dimensionDetails', dimensionDetails );

          fileDetails = { ...fileDetails, ...dimensionDetails };
        }
      }
      $( `upload-controls file-progress` ).addClass( `hidden` );
      $( `upload-controls file-preview preview-block .viewer-box > img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
      $( `#dtf_body_image .watermark_image img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
      $( `body` ).addClass( `activeImgPreviewer` );

      await applyClassByDimension( fileDetails );
      $( `upload-controls file-preview file-details` ).text( JSON.stringify( fileDetails ) );
      console.log ( 'fileDetails', fileDetails );
      const matchedVariant = getMatchingVariant( fileDetails );
      console.log ( 'matchedVariant', matchedVariant );
      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        console.log ( 'matchedVariant', matchedVariant );
        await checkAndAddNewSizeRow();
        await toggleOptionActiveWhileFileProcessing( fileDetails );
        await applyImgToPreviewBox( fileDetails, matchedVariant, false );
        $( `upload-controls file-preview preview-block` ).removeClass( `image-loading` );
      }
      adjustSizeIfLargerThanDefined();
    }
    if ( typeof testingSlickSlider === 'function' ) {
      testingSlickSlider();
    }
        document.body.classList.add("image-uploaded");
    document.querySelector(".desktop-sticky-container") && (document.querySelector(".desktop-sticky-container").style.transform = "translate3d(0, 0, 0)");
    // URL-sourced designs (previous designs, Design Studio) skip imgLoaded(),
    // so the reward block gate in reward-point-info.liquid must be opened here.
    $("next-element").addClass("enablereward");
    if (typeof _qtyupdate === 'function') _qtyupdate();
    // URL-sourced flows also skip the upload-progress hook that reveals
    // grt-upsell-block ("Complete your order with Blanks"). Trigger refresh
    // here so it shows for previous-design / Design Studio picks too.
    if (typeof window.refreshGRTUpsellBlocks === 'function') window.refreshGRTUpsellBlocks();

  } catch ( err ) {
    console.log( `ERROR singleFileManageByURL( file )`, err.message );
  }
}

function validateAndScaleDimensions(fileWidth, fileHeight) {
  // Check if file dimensions are within limits
  if (fileWidth <= definedMaxWidth && fileHeight <= definedMaxHeight) {
    return true;
  }

  // Calculate scale ratio
  const widthRatio = definedMaxWidth / fileWidth;
  const heightRatio = definedMaxHeight / fileHeight;
  const scaleRatio = Math.min(widthRatio, heightRatio); // maintain aspect ratio

  // Calculate scaled dimensions
  const scaledWidth = parseFloat((fileWidth * scaleRatio).toFixed(2));
  const scaledHeight = parseFloat((fileHeight * scaleRatio).toFixed(2));

  return { width: scaledWidth, height: scaledHeight };
}


function adjustSizeIfLargerThanDefined() {
  try {
    if ( uploadType == 'single' ) {

    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

async function getImageSizeFromUrl( url ) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = function () {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = function () {
      reject(new Error('Failed to load image: ' + url));
    };

    img.src = url;
  });
}


async function multiFilesManageByURL( files ) {
  try {
    console.clear();
    uploadType = 'multi';
    const isActivatedMultiUpload = $( `multi-upload-wrapper` ).length;
    if ( files.length > 1 && isActivatedMultiUpload == 0 ) {
      await activateMultiupload();
      setFocusOfMultiUpload( 0 );
    }
    let filesCounter = 1;
    if ( isActivatedMultiUpload > 0 ) {
      filesCounter = $( `multi-upload uploaded-files-block` ).length;
      filesCounter = filesCounter + 1;
    }
    console.log ( 'filesCounter', filesCounter );
    for ( const file of files ) {
      addFilesASMultiBlock( file, filesCounter );
      filesCounter++;
    }
  } catch ( err ) {
    console.log( `ERROR multiFilesManageByURL( files )`, err.message );
  }
}


async function addFilesASMultiBlock( file, blockNo ) {
  try {
    beginMultiUploadProcessing( blockNo );
    selectedItemNo = '1-1';
    console.log ( 'MULTI FILES',  );
    const fileBlockHTML = $( `template[data-multi-id="fileBlock"]` ).html();
    $( `multi-upload file-blocks-area` ).append( fileBlockHTML );
    const lastAddedBlock = $( `multi-upload file-blocks-area uploaded-files-block` ).last();
    await setIndexNoToBlock( lastAddedBlock, blockNo );

    const fileExt = getFileExt( file.name );
    const selectedParamsObject = imgPreviewBox( `active`, fileExt, blockNo );
    let svgFileStatus = false;
    if ( fileExt == 'svg' ) {
      svgFileStatus = preDeterminedSVGDimension( file );
    }

    const s3File = file.fileURL.replace( ninjaS3Host, ninjaS3Host2 );
    const imgIxFile = file.fileURL.replace( ninjaS3Host2, ninjaS3Host );

    const getFileDetails = {
      "originalFile": s3File,
      "imgIxFile": imgIxFile,
      "fileName": file.name,
      "fileExt": fileExt
    }
    if ( typeof selectedParamsObject !== 'undefined' && selectedParamsObject && typeof getFileDetails !== 'undefined' && getFileDetails ) {
      let fileDetails = { ...selectedParamsObject, ...getFileDetails };

      if ( fileDetails.bgRemover && fileDetails.byDefaultBgRemover ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box .bgRemover .toggleOption` ).prop( `checked`, true );
      }
      if ( fileDetails.superRes && fileDetails.byDefaultSuperRes ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box .superRes .toggleOption` ).prop( `checked`, true );
      }

      const optionParams = getToggleOptionParams( blockNo );
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );

      if ( fileExt == 'png' || fileExt == 'jpg' || fileExt == 'svg' ) {
        const previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
        // const getImgDimensions = await getOriginalImageSize( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` );
        const getImgDimensions = await getImageSizeFromUrl( `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        if ( typeof getImgDimensions !== 'undefined' && getImgDimensions ) {
          console.log ( 'getImgDimensions ' + blockNo, getImgDimensions );
          fileDetails.fileWidth = getImgDimensions.width;
          fileDetails.fileHeight = getImgDimensions.height;
          fileDetails.fileWidth_inch = (getImgDimensions.width / 300).toFixed(2);
          fileDetails.fileHeight_inch = (getImgDimensions.height / 300).toFixed(2);
          fileDetails.ratioBy_width = `${ getImgDimensions.width / getImgDimensions.height }`;
          fileDetails.ratioBy_height = `${ getImgDimensions.height / getImgDimensions.width }`;
          fileDetails.currentWidth = (getImgDimensions.width / 300).toFixed(2);
          fileDetails.currentHeight = (getImgDimensions.height / 300).toFixed(2);
        }
      } else {
        console.log ( 'definedMaxHeight, definedMaxWidth', definedMaxHeight, definedMaxWidth );
        if ( typeof file.designWidth !== 'undefined' && file.designWidth && typeof file.designHeight !== 'undefined' && file.designHeight ) {
          console.log ( 'fileDetails chaaa here', fileDetails );
          const dimensionDetails = {
            "vector_fileWidth": (file.designWidth * 300).toFixed(2),
            "vector_fileHeight": (file.designHeight * 300).toFixed(2),
            "vector_fileWidth_inch": file.designWidth,
            "vector_fileHeight_inch": (file.designHeight / 300).toFixed(2),
            "vector_ratioBy_width": `${ file.designWidth / file.designHeight }`,
            "vector_ratioBy_height": `${ file.designHeight / file.designWidth }`,
            "vector_currentWidth": file.designWidth,
            "vector_currentHeight": file.designHeight,

            "fileWidth": (file.designWidth * 300).toFixed(2),
            "fileHeight": (file.designHeight * 300).toFixed(2),
            "fileWidth_inch": file.designWidth,
            "fileHeight_inch": file.designHeight,
            "ratioBy_width": `${ file.designWidth / file.designHeight }`,
            "ratioBy_height": `${ file.designHeight / file.designWidth }`,
            "currentWidth": file.designWidth,
            "currentHeight": file.designHeight
          }
          fileDetails = { ...fileDetails, ...dimensionDetails };

          await addDelay( 100 );

          console.log ( 'fileDetails after', fileDetails );
        } else if ( typeof file.orderFileWidth !== 'undefined' && file.orderFileWidth && typeof file.orderFileHeight !== 'undefined' && file.orderFileHeight ) {
          console.log ( 'fileDetails order here', fileDetails );
          const dimensionDetails = {
            "vector_fileWidth": (file.orderFileWidth * 300).toFixed(2),
            "vector_fileHeight": (file.orderFileHeight * 300).toFixed(2),
            "vector_fileWidth_inch": file.orderFileWidth,
            "vector_fileHeight_inch": (file.orderFileHeight / 300).toFixed(2),
            "vector_ratioBy_width": `${ file.orderFileWidth / file.orderFileHeight }`,
            "vector_ratioBy_height": `${ file.orderFileHeight / file.orderFileWidth }`,
            "vector_currentWidth": file.orderFileWidth,
            "vector_currentHeight": file.orderFileHeight,

            "fileWidth": (file.orderFileWidth * 300).toFixed(2),
            "fileHeight": (file.orderFileHeight * 300).toFixed(2),
            "fileWidth_inch": file.orderFileWidth,
            "fileHeight_inch": file.orderFileHeight,
            "ratioBy_width": `${ file.orderFileWidth / file.orderFileHeight }`,
            "ratioBy_height": `${ file.orderFileHeight / file.orderFileWidth }`,
            "currentWidth": file.orderFileWidth,
            "currentHeight": file.orderFileHeight
          }
          fileDetails = { ...fileDetails, ...dimensionDetails };

          console.log ( 'fileDetails order after', fileDetails );
        } else {
          const dimensionDetails = await fileDimensions( fileDetails );
          fileDetails = { ...fileDetails, ...dimensionDetails };
        }
      }
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-progress` ).addClass( `hidden` );
      // $( `upload-controls file-preview preview-block .viewer-box > img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.hover }${ optionParams ? optionParams : `` }` );

      // console.log ( 'chaaa' );

      await applyClassByDimension( fileDetails, blockNo );
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview file-details` ).text( JSON.stringify( fileDetails ) );
      // console.log ( 'fileDetails', fileDetails );
      const matchedVariant = getMatchingVariant( fileDetails, blockNo );
      // console.log ( 'matchedVariant', matchedVariant );
      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        console.log ( 'matchedVariant', matchedVariant );
        await checkAndAddNewSizeRow( blockNo );
        await toggleOptionActiveWhileFileProcessing( fileDetails, blockNo );
        await applyImgToPreviewBox( fileDetails, matchedVariant, false, blockNo, 'no' );
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block` ).removeClass( `image-loading` );
      }
      setActiveRow();
    }
    // URL-sourced designs (previous designs, Design Studio) skip imgLoaded(),
    // so the reward block gate in reward-point-info.liquid must be opened here.
    $("next-element").addClass("enablereward");
    if (typeof _qtyupdate === 'function') _qtyupdate();
    // Also refresh the "Complete your order with Blanks" grt-upsell block —
    // URL-sourced flows skip the upload-progress hook that normally reveals it.
    if (typeof window.refreshGRTUpsellBlocks === 'function') window.refreshGRTUpsellBlocks();
  } catch ( err ) {
    console.log( `ERROR addFilesASMultiBlock( file )`, err.message );
  } finally {
    await finalizeMultiUploadProcessing( blockNo );
  }
}



function createFileObjectFromUrl( url ) {
  const decodedUrl = decodeURIComponent( url );
  const fileName = decodedUrl.split('/').pop();

  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    pdf: 'application/pdf',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    ai: 'application/postscript',
    eps: 'application/postscript'
  };
  const fileType = mimeTypes[extension] || 'application/octet-stream';
  return new File([""], fileName, {
    type: fileType,
    lastModified: Date.now() // or use a fixed timestamp if needed
  });
}


async function activateMultiupload( files ) {
  try {
    $( `body multi-upload-wrapper` ).remove();
    const multiUploadHTML = $( `template[data-multi-id="main"]` ).html();
    $( `body` ).append( multiUploadHTML );
    loadCartItemsCount();

  } catch ( err ) {
    console.log( `ERROR activateMultiupload( files )`, err.message );
  }
}


async function singleFileManage( file ) {
  try {
    uploadType = 'single';
    console.log ( 'file', file );
    const isValidFile = fileValidate( file.type, file.size, file );
    if ( isValidFile ) {
      const fileExt = getFileExt( file.name );
      const selectedParamsObject = imgPreviewBox( `active`, fileExt );
      let svgFileStatus = false;
      if ( fileExt == 'svg' ) {
        svgFileStatus = preDeterminedSVGDimension( file );
      }
      console.log ( 'selectedParamsObject', selectedParamsObject );
      const getFileDetails = await processFile( file );
      console.log ( 'getFileDetails', getFileDetails );
      if ( typeof selectedParamsObject !== 'undefined' && selectedParamsObject && typeof getFileDetails !== 'undefined' && getFileDetails ) {
        getFileDetails['fileExt'] = fileExt;
        getFileDetails['currentOptions'] = '';
        if ( typeof file.isAIImage !== 'undefined' && file.isAIImage ) {
          getFileDetails.isAIImage = file.isAIImage;
        }
        if ( typeof file.isAIEdit !== 'undefined' && file.isAIEdit ) {
          getFileDetails.isAIEdit = file.isAIEdit;
        }
        let fileDetails = { ...selectedParamsObject, ...getFileDetails };
        // console.log ( 'fileDetails', fileDetails );
        const dimensionDetails = await fileDimensions( fileDetails );
        console.log ( 'func singleFileManage dimensionDetails', dimensionDetails );
        if ( typeof dimensionDetails !== 'undefined' && dimensionDetails ) {
          fileDetails = { ...fileDetails, ...dimensionDetails };
          console.log ( 'fileDetails', fileDetails );
          updateFileDetailsFunction( fileDetails );
          await addDelay( 50 );
          await applyClassByDimension( fileDetails );
          const matchedVariant = getMatchingVariant( fileDetails );
          if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
            console.log ( 'matchedVariant', matchedVariant );
            await checkAndAddNewSizeRow();
            await toggleOptionActiveWhileFileProcessing( fileDetails );
            await applyImgToPreviewBox( fileDetails, matchedVariant, true );
          }
        }
        await updatePreviewImgAndLineItems();
        if (
            typeof fileDetails.fileExt !== 'undefined' &&
            ['pdf', 'ai', 'eps'].includes( fileDetails.fileExt )
          ) {
          await addDelay( 1000 );
          $( `upload-controls .widthHeight__item[by="width"] .widthHeight__value` ).trigger( `keyup` );
        } else {
          await addDelay( 1000 );
          $( `upload-controls .widthHeight__item[by="width"] .widthHeight__value` ).trigger( `keyup` );
        }

        saveFileToUser();
        await addDelay( 200 );
        setSingleUploadCustomEditDetected( false );
        setSingleUploadPopularEditDetected( false );
      }
    } else {
      uploadArea.classList.add( `drop-disabled-type` );
      setTimeout(function(){
        uploadArea.classList.remove( `drop-disabled-type` );
      },2000);
    }
    if ( typeof testingSlickSlider === 'function' ) {
      testingSlickSlider();
    }
  } catch ( err ) {
    console.log( `ERROR singleFileManage( file )`, err.message );
  }
}

async function saveFileToUser( blockNo ) {
  try {
    if ( typeof CUSTOMER_ID !== 'undefined' && CUSTOMER_ID ) {
      let fileDetails;
      if ( uploadType == 'single' ) {
        fileDetails = getFileDetailsFunction();
      } else if ( uploadType == 'multi' ) {
        fileDetails = getFileDetailsFunction( blockNo );
      }

      if ( typeof fileDetails !== 'undefined' && fileDetails
        && typeof fileDetails.file_crc !== 'undefined' && fileDetails.file_crc
        && typeof fileDetails.fileName !== 'undefined' && fileDetails.fileName
        && typeof fileDetails.fileWidth_inch !== 'undefined' && fileDetails.fileWidth_inch
        && typeof fileDetails.fileHeight_inch !== 'undefined' && fileDetails.fileHeight_inch
        && typeof fileDetails.imgIxFile !== 'undefined' && fileDetails.imgIxFile
      ) {
        $.ajax({
          url: `${ apiURL }/uploads/saveData`,
          method: "post",
          dataType: "json",
          data: JSON.stringify([{
            "variant_title":  `${ fileDetails.fileWidth_inch }x${ fileDetails.fileHeight_inch }`,
            "file": fileDetails.imgIxFile,
            "customer_id": CUSTOMER_ID,
            "file_name": fileDetails.fileName,
            "file_crc": fileDetails.file_crc,
            "product_id": PRODUCT_ID,
            "gangsheet": isGangPage
          }])
        });
      }
    }
  } catch ( err ) {
    console.log( `ERROR saveFileToUser( blockNo )`, err.message );
  }
}

async function toggleOptionActiveWhileFileProcessing( fileDetails, blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      let collectCurrentOptions = ``;
      if ( fileDetails.bgRemover && fileDetails.byDefaultBgRemover ) {
        $( `upload-controls preview-box #bgRemover` ).prop( `checked`, true );
        collectCurrentOptions = `&bg-remove=true`;
      }
      const getTotalPixels = ( fileDetails.fileWidth * fileDetails.fileHeight );
      if ( fileDetails.superRes && fileDetails.byDefaultSuperRes && typeof isEnabledPixelsValidation !== 'undefined' && isEnabledPixelsValidation && definedMaxPixelsForSuperRes > getTotalPixels ) {
        $( `upload-controls preview-box #superRes` ).prop( `checked`, true );
        collectCurrentOptions = `${ collectCurrentOptions }&upscale=true`;
      }
      if ( typeof isEnabledPixelsValidation !== 'undefined' && isEnabledPixelsValidation && definedMaxPixelsForSuperRes < getTotalPixels ) {
        $( `upload-controls toggle-options` ).attr( `show-superres-option`, false );
      }
      if ( collectCurrentOptions != '' ) {
        fileDetails.currentOptions = collectCurrentOptions;
        $( `upload-controls preview-box file-details` ).text( JSON.stringify( fileDetails ) );
      } else {
        $( `upload-controls preview-box file-details` ).text( JSON.stringify( fileDetails ) );
      }
    } else if ( uploadType == 'multi' ) {
      let collectCurrentOptions = ``;
      if ( fileDetails.bgRemover && fileDetails.byDefaultBgRemover ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .bgRemover .toggleOption` ).prop( `checked`, true );
        collectCurrentOptions = `&bg-remove=true`;
      }
      const getTotalPixels = ( fileDetails.fileWidth * fileDetails.fileHeight );
      if ( fileDetails.superRes && fileDetails.byDefaultSuperRes && typeof isEnabledPixelsValidation !== 'undefined' && isEnabledPixelsValidation && definedMaxPixelsForSuperRes > getTotalPixels ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .superRes .toggleOption` ).prop( `checked`, true );
        collectCurrentOptions = `${ collectCurrentOptions }&upscale=true`;
      }
      if (  typeof isEnabledPixelsValidation !== 'undefined' && isEnabledPixelsValidation && definedMaxPixelsForSuperRes < getTotalPixels ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options` ).attr( `show-superres-option`, false );
      }
      if ( collectCurrentOptions != '' ) {
        fileDetails.currentOptions = collectCurrentOptions;
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-details` ).text( JSON.stringify( fileDetails ) );
      }
    }
  } catch ( err ) {
    console.log( `ERROR toggleOptionActiveWhileFileProcessing( blockNo )`, err.message );
  }
}

async function applyClassByDimension( fileDetails = null, blockNo ) {
  try {
    if ( typeof fileDetails !== 'undefined' && fileDetails ) {
      let classByDimension = '';
      if ( fileDetails.fileWidth == fileDetails.fileHeight ) {
        classByDimension = `img_square`;
      } else if ( fileDetails.fileWidth > fileDetails.fileHeight ) {
        classByDimension = `img_wide`;
      } else if ( fileDetails.fileWidth < fileDetails.fileHeight ) {
        classByDimension = `img_tall`;
      }
      if ( uploadType == 'single' ) {
        $( `upload-controls preview-box file-preview` ).removeClass( `img_square img_wide img_tall` );
        $( `upload-controls preview-box file-preview` ).addClass( classByDimension );
      } else if ( uploadType == 'multi' ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview` ).removeClass( `img_square img_wide img_tall` );
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview` ).addClass( classByDimension );
      }
    }
  } catch ( err ) {
    console.log( `ERROR applyClassByDimension( fileDetails = null )`, err.message );
  }
}


async function multiFilesManage( file, fileIndex ) {
  try {
    beginMultiUploadProcessing( fileIndex );
    uploadType = 'multi';
    selectedItemNo = '1-1';
    console.log ( 'MULTI FILES',  );
    const fileBlockHTML = $( `template[data-multi-id="fileBlock"]` ).html();
    $( `multi-upload file-blocks-area` ).append( fileBlockHTML );
    const lastAddedBlock = $( `multi-upload file-blocks-area uploaded-files-block` ).last();
    await setIndexNoToBlock( lastAddedBlock, fileIndex );

    const isValidFile = fileValidate( file.type, file.size, file );
    if ( isValidFile ) {
      const fileExt = getFileExt( file.name );
      const selectedParamsObject = imgPreviewBox( `active`, fileExt, fileIndex );
      let svgFileStatus = false;
      if ( fileExt == 'svg' ) {
        svgFileStatus = preDeterminedSVGDimension( file );
      }
      const getFileDetails = await processFile( file, fileIndex );
      // console.log ( 'getFileDetails', getFileDetails );
      if ( typeof selectedParamsObject !== 'undefined' && selectedParamsObject && typeof getFileDetails !== 'undefined' && getFileDetails ) {
        getFileDetails['fileExt'] = fileExt;
        getFileDetails['currentOptions'] = '';
        if ( typeof file.isAIImage !== 'undefined' && file.isAIImage ) {
          getFileDetails.isAIImage = file.isAIImage;
        }
        if ( typeof file.isAIEdit !== 'undefined' && file.isAIEdit ) {
          getFileDetails.isAIEdit = file.isAIEdit;
        }
        let fileDetails = { ...selectedParamsObject, ...getFileDetails };
        console.log ( 'fileDetails', fileDetails );
        const dimensionDetails = await fileDimensions( fileDetails );
        if ( typeof dimensionDetails !== 'undefined' && dimensionDetails ) {
          fileDetails = { ...fileDetails, ...dimensionDetails };
          console.log ( 'fileDetails after dimensions', fileDetails );
          await applyClassByDimension( fileDetails, fileIndex );
          const matchedVariant = getMatchingVariant( fileDetails, fileIndex );
          if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
            console.log ( 'matchedVariant', matchedVariant );
            await checkAndAddNewSizeRow( fileIndex );
            await toggleOptionActiveWhileFileProcessing( fileDetails, fileIndex );
            await applyImgToPreviewBox( fileDetails, matchedVariant, true, fileIndex, `yes` );

            await updatePreviewImgAndLineItems( fileIndex );

            saveFileToUser( fileIndex );
          }

          if (
              typeof fileDetails.fileExt !== 'undefined' &&
              ['pdf', 'ai', 'eps'].includes( fileDetails.fileExt )
            ) {
              console.log ( 'ext found',  );
            await addDelay( 1000 * fileIndex );
            $( `multi-upload uploaded-files-block[block-no="${ fileIndex }"] .widthHeight__item[by="width"] .widthHeight__value` ).trigger( `keyup` );
          } else {
            await addDelay( 1000 * fileIndex );
            $( `multi-upload uploaded-files-block[block-no="${ fileIndex }"] .widthHeight__item[by="width"] .widthHeight__value` ).trigger( `keyup` );
          }

          // Reset per-block edit state after scripted upload initialization so only real user edits turn it back on.
          await addDelay( 200 );
          setMultiUploadEditDetected( fileIndex, `custom`, false );
          setMultiUploadEditDetected( fileIndex, `popular`, false );
        }
      }
      setActiveRow();
    } else {
      lastAddedBlock.find( `preview-box preview-block` ).addClass( `drop-disabled-type` );
      setTimeout(function(){
        lastAddedBlock.find( `preview-box preview-block` ).removeClass( `drop-disabled-type` );
      },2000);
    }
  } catch ( err ) {
    console.log( `ERROR multiFilesManage( file )`, err.message );
  } finally {
    await finalizeMultiUploadProcessing( fileIndex );
  }
}


async function setIndexNoToBlock( selector, indexNo ) {
  try {
    selector.attr( `block-no`, indexNo );
    selector.find( `item-no .itemNo__name` ).text( `Upload ${ indexNo }` );
    selector.find( `preview-box file-preview` ).attr( `id`, `filePreview_${ indexNo }` );

    selector.find( `toggle-options .bgRemover .toggleOption` ).attr( `id`, `bgRemover_${ indexNo }` );
    selector.find( `toggle-options .bgRemover` ).attr( `for`, `bgRemover_${ indexNo }` );
    selector.find( `toggle-options .superRes .toggleOption` ).attr( `id`, `superRes_${ indexNo }` );
    selector.find( `toggle-options .superRes` ).attr( `for`, `superRes_${ indexNo }` );

    selector.find( `tab-controls .tabOptionName` ).attr( `name`, `tabOptionName_${ indexNo }` );
    selector.find( `tab-controls .tabOptionName[value="custom"]` ).attr( `id`, `tabOptionCustom_${ indexNo }` );
    selector.find( `tab-controls .tabLink[for*="tabOptionCustom_"]` ).attr( `for`, `tabOptionCustom_${ indexNo }` );
    selector.find( `tab-controls .tabOptionName[value="popular"]` ).attr( `id`, `tabOptionPopular_${ indexNo }` );
    selector.find( `tab-controls .tabLink[for*="tabOptionPopular_"]` ).attr( `for`, `tabOptionPopular_${ indexNo }` );
    selector.find( `designer-notes .popupinput` ).attr( `id`, `designerNotes_${ indexNo }` );
    selector.find( `designer-notes label` ).attr( `for`, `designerNotes_${ indexNo }` );
  } catch ( err ) {
    console.log( `ERROR setIndexNoToBlock( selector, indexNo )`, err.message );
  }
}

async function applyImgToPreviewBox( fileDetails, matchedVariant, updateImg = false, blockNo, isFileUploading = 'no' ) {
  try {
    if ( uploadType == 'single' ) {
      if ( updateImg ) {
        const optionParams = getToggleOptionParams();
        $( `upload-controls file-preview preview-block .fileupload_hero` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );

        const isImageLoaded = await imgLoaded( `upload-controls file-preview preview-block .fileupload_hero` );
        if ( typeof isImageLoaded !== 'undefined' && isImageLoaded ) {
          $( `upload-controls file-preview preview-block .viewer-box > img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
          $( `#dtf_body_image .watermark_image img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
          $( `body` ).addClass( `activeImgPreviewer` );
          console.log ( 'image loaded', isImageLoaded );

          const previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
          // $( `upload-controls file-preview preview-block .tempFile` ).attr( `src`, `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
          const getImgDimensions = await getImageSizeFromUrl( `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
          if ( typeof getImgDimensions !== 'undefined' && getImgDimensions ) {
            if (
                typeof fileDetails.fileExt !== 'undefined' &&
                ['pdf', 'ai', 'eps'].includes( fileDetails.fileExt ) &&
                typeof fileDetails.vector_fileWidth !== 'undefined' &&
                fileDetails.vector_fileWidth &&
                typeof fileDetails.vector_fileHeight !== 'undefined' &&
                fileDetails.vector_fileHeight
              ) {
              // console.log ( 'getImgDimensions', getImgDimensions );
              fileDetails.fileWidth = fileDetails.vector_fileWidth;
              fileDetails.fileHeight = fileDetails.vector_fileHeight;
              fileDetails.fileWidth_inch = (fileDetails.vector_fileWidth / 300).toFixed(2);
              fileDetails.fileHeight_inch = (fileDetails.vector_fileHeight / 300).toFixed(2);
              fileDetails.ratioBy_width = `${ fileDetails.vector_fileWidth / fileDetails.vector_fileHeight }`;
              fileDetails.ratioBy_height = `${ fileDetails.vector_fileHeight / fileDetails.vector_fileWidth }`;
              fileDetails.currentWidth = (fileDetails.vector_fileWidth / 300).toFixed(2);
              fileDetails.currentHeight = (fileDetails.vector_fileHeight / 300).toFixed(2);

              delete fileDetails.vector_fileWidth;
              delete fileDetails.vector_fileHeight;
              delete fileDetails.vector_fileWidth_inch;
              delete fileDetails.vector_fileHeight_inch;
              delete fileDetails.vector_ratioBy_width;
              delete fileDetails.vector_ratioBy_height;
              delete fileDetails.vector_currentWidth;
              delete fileDetails.vector_currentHeight;
            } else {
              console.log ( 'getImgDimensions', getImgDimensions );
              fileDetails.fileWidth = getImgDimensions.width;
              fileDetails.fileHeight = getImgDimensions.height;
              fileDetails.fileWidth_inch = (getImgDimensions.width / 300).toFixed(2);
              fileDetails.fileHeight_inch = (getImgDimensions.height / 300).toFixed(2);
              fileDetails.ratioBy_width = `${ getImgDimensions.width / getImgDimensions.height }`;
              fileDetails.ratioBy_height = `${ getImgDimensions.height / getImgDimensions.width }`;
              fileDetails.currentWidth = (getImgDimensions.width / 300).toFixed(2);
              fileDetails.currentHeight = (getImgDimensions.height / 300).toFixed(2);
            }
          }

          $( `upload-controls file-preview file-details` ).html( JSON.stringify( fileDetails ) );

          await applySizes( fileDetails, matchedVariant );
          await calculatePrices( fileDetails, matchedVariant );
          $( `upload-controls file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
          $( `upload-controls file-progress` ).addClass( `hidden` );
        }
      } else {
        await applySizes( fileDetails, matchedVariant );
        await calculatePrices( fileDetails, matchedVariant );
      }
      calculateratioForImage()
    } else if ( uploadType == 'multi' ) {
      if ( updateImg ) {
        const optionParams = getToggleOptionParams( blockNo );
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        const isImageLoaded =  await imgLoaded( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` );
        if ( typeof isImageLoaded !== 'undefined' && isImageLoaded ) {
          $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .viewer-box > img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }` );
          console.log ( 'image loaded', isImageLoaded );

          const previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
          const getImgDimensions = await getImageSizeFromUrl( `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
          if ( typeof getImgDimensions !== 'undefined' && getImgDimensions ) {
            if (
              typeof fileDetails.fileExt !== 'undefined' &&
              ['pdf', 'ai', 'eps'].includes( fileDetails.fileExt ) &&
              typeof fileDetails.vector_fileWidth !== 'undefined' &&
              fileDetails.vector_fileWidth &&
              typeof fileDetails.vector_fileHeight !== 'undefined' &&
              fileDetails.vector_fileHeight
            ) {
              // console.log ( 'getImgDimensions', getImgDimensions );
              fileDetails.fileWidth = fileDetails.vector_fileWidth;
              fileDetails.fileHeight = fileDetails.vector_fileHeight;
              fileDetails.fileWidth_inch = (fileDetails.vector_fileWidth / 300).toFixed(2);
              fileDetails.fileHeight_inch = (fileDetails.vector_fileHeight / 300).toFixed(2);
              fileDetails.ratioBy_width = `${ fileDetails.vector_fileWidth / fileDetails.vector_fileHeight }`;
              fileDetails.ratioBy_height = `${ fileDetails.vector_fileHeight / fileDetails.vector_fileWidth }`;
              fileDetails.currentWidth = (fileDetails.vector_fileWidth / 300).toFixed(2);
              fileDetails.currentHeight = (fileDetails.vector_fileHeight / 300).toFixed(2);

              delete fileDetails.vector_fileWidth;
              delete fileDetails.vector_fileHeight;
              delete fileDetails.vector_fileWidth_inch;
              delete fileDetails.vector_fileHeight_inch;
              delete fileDetails.vector_ratioBy_width;
              delete fileDetails.vector_ratioBy_height;
              delete fileDetails.vector_currentWidth;
              delete fileDetails.vector_currentHeight;
            } else {
              console.log ( 'getImgDimensions', getImgDimensions );
              fileDetails.fileWidth = getImgDimensions.width;
              fileDetails.fileHeight = getImgDimensions.height;
              fileDetails.fileWidth_inch = (getImgDimensions.width / 300).toFixed(2);
              fileDetails.fileHeight_inch = (getImgDimensions.height / 300).toFixed(2);
              fileDetails.ratioBy_width = `${ getImgDimensions.width / getImgDimensions.height }`;
              fileDetails.ratioBy_height = `${ getImgDimensions.height / getImgDimensions.width }`;
              fileDetails.currentWidth = (getImgDimensions.width / 300).toFixed(2);
              fileDetails.currentHeight = (getImgDimensions.height / 300).toFixed(2);
            }
          }

          $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview file-details` ).html( JSON.stringify( fileDetails ) );

          await applySizes( fileDetails, matchedVariant, blockNo, isFileUploading );
          await calculatePrices( fileDetails, matchedVariant );
          $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
          $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-progress` ).addClass( `hidden` );
        }
      } else {
        await applySizes( fileDetails, matchedVariant, blockNo, isFileUploading );
        await calculatePrices( fileDetails, matchedVariant, blockNo );
      }
    }
  } catch ( err ) {
    console.log( `ERROR applyImgToPreviewBox( fileDetails, matchedVariant )`, err.message );
  }
}


async function calculatePrices( fileDetails = null, matchedVariant = null, blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      await pricesTable();
      const selectedIndex = $( `upload-controls prices-table .pricesTable__items .pricesTable__item.selected` ).attr( `index` );
      const getSelectedTier = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` );
      let getVID = getSelectedTier.attr( `vid` ) * 1;
      let isPreCutActive = false;
      let recheckDiscount = ``;
      let preCutPrice = 0;
      let getDiscountPercent = $( `upload-controls prices-table .pricesTable__items .pricesTable__item[index="${ selectedIndex }"]` ).attr( `off` );
      let discountText = '';
      if ( getDiscountPercent == '' ) {
        getDiscountPercent = 0;
      } else {
        discountText = `${ getDiscountPercent }% off`;
      }
      if ( precutOptionAvailable ) {
        isPreCutActive = $( `upload-controls #preCutOption` ).is( `:checked` );
      }
      $( `upload-controls sizes-blocks .widthHeight__custom[item]` ).each(function() {
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

        $( this ).attr( `discount`, getDiscountPercent );
        $( this ).find( `precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ unitPrice.toFixed( 2 ) }` );
        $( this ).find( `precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).html( `$${ unitDiscountPrice.toFixed( 2 ) }<span>ea</span>` );

        $( this ).find( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ (unitPrice * qty).toFixed(2) }` );
        $( this ).find( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).text( `$${ (unitDiscountPrice * qty).toFixed(2) }` );
        $( this ).find( `precut-unit-logic .precut-unit-logic__discount > span` ).text( discountText );
      })
    } else if ( uploadType == 'multi' ) {
      await pricesTable();
      const selectedIndex = $( `multi-upload prices-table .pricesTable__items .pricesTable__item.selected` ).attr( `index` );
      console.log ( 'selectedIndex', selectedIndex );
      let getDiscountPercent = $( `multi-upload prices-table .pricesTable__items .pricesTable__item.selected` ).attr( `off` );
      console.log ( 'getDiscountPercent', getDiscountPercent );
      let discountText = '';
      if ( getDiscountPercent == '' || getDiscountPercent == '0' ) {
        getDiscountPercent = 0;
      } else {
        discountText = `${ getDiscountPercent }% off`;
      }

      let totalPrice = 0;
      $( `multi-upload line-items sizes-blocks .widthHeight__custom[item]` ).each(function() {
        const qty = $( this ).find( `precut-unit-logic .precut-unit-logic__qty .customQtyFile__qty` ).val() * 1;
        let unitPrice = $( this ).attr( `price` ) * 1;

        let unitDiscountPrice = (unitPrice * getDiscountPercent) / 100;
        unitDiscountPrice = unitPrice - unitDiscountPrice;

        $( this ).attr( `discount`, getDiscountPercent );
        $( this ).find( `precut-unit-logic .precut-unit-logic__price .__originalPrice` ).text( `$${ unitPrice.toFixed( 2 ) }` );
        $( this ).find( `precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).html( Number.isNaN(unitDiscountPrice) ? '$0.00<span>ea</span>' : `$${unitDiscountPrice.toFixed(2)}<span>ea</span>` );

        $( this ).find( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ (unitPrice * qty).toFixed(2) }` );
        // $( this ).find( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).text( `$${ (unitDiscountPrice * qty).toFixed(2) }` );
        $( this ).find( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).text( Number.isNaN(unitDiscountPrice) ? '$0.00' : `$${ (unitDiscountPrice * qty).toFixed(2) }` );
        $( this ).find( `precut-unit-logic .precut-unit-logic__discount > span` ).text( discountText );

        const total = qty * unitPrice;

        totalPrice = totalPrice + total;
      })

      shippingBarData( totalPrice );
    }
  } catch ( err ) {
    console.log( `ERROR calculatePrices( fileDetails, matchedVariant = null )`, err.message );
  }
}

function vivid_price(current_pprice){
  if(__printType == 0){
    console.log("vivid_parent_seprator:",vivid_parent_seprator," vivid_live_price:",vivid_live_price);
    if(vivid_parent_seprator && vivid_live_price === 'true'){
      setTimeout(function(){
        var vividp = (current_pprice * 1.75) - current_pprice;
        $(".printType__rightContent."+ vivid_parent_seprator +" .vividprice").html("<span class='vpink_price'>(+75%)</span><span>+$"+vividp.toFixed(2) + " ea</span>");
        console.log(current_pprice, " :current_pprice",$(".printType__rightContent."+ vivid_parent_seprator +" .vividprice"));
      })
    }
  }

  if(__printType == 1){
    console.log("vivid_parent_seprator:",vivid_parent_seprator," vivid_live_price:",vivid_live_price,"current_pprice:",current_pprice);
    if(vivid_parent_seprator && vivid_live_price === 'true'){
      setTimeout(function(){
        var grt_cprice = current_pprice * 1;
        var vividp = (current_pprice * 1.75) - current_pprice;
        var grt_nwprice = grt_cprice + vividp;
        //$(".printType__rightContent."+ vivid_parent_seprator +" .vividprice").html("<span class='vpink_price'>(+75%)</span><span>+$"+vividp.toFixed(2) + " ea</span>");
        $(".printType__block .grt_vividprice").html("$" + grt_cprice.toFixed(2) + " ea</span>");
        $(".printType__block .vividprice_base").html("$" + grt_nwprice.toFixed(2) + " ea</span>");
        console.log(current_pprice, " :current_pprice",$(".printType__rightContent."+ vivid_parent_seprator +" .vividprice"));
      })
    }
  }
}

async function selectAvailableTier( blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      const activeTab = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
      if ( activeTab == 'custom' ) {
        const isCustomTierAvailable = $( `upload-controls line-items-custom .widthHeight__custom` ).length;
        if ( isCustomTierAvailable > 0 ) {
          selectedItemNo = $( `upload-controls line-items-custom .widthHeight__custom` ).last().attr( `item` );
        } else {
          selectedItemNo = $( `upload-controls line-items-popular .widthHeight__custom` ).last().attr( `item` );
        }
      } else if ( activeTab == 'popular' ) {
        const isPopularTierAvailable = $( `upload-controls line-items-popular .widthHeight__custom` ).length;
        if ( isPopularTierAvailable > 0 ) {
          selectedItemNo = $( `upload-controls line-items-popular .widthHeight__custom` ).last().attr( `item` );
        } else {
          selectedItemNo = $( `upload-controls line-items-custom .widthHeight__custom` ).last().attr( `item` );
        }
      }
      const w = $( `upload-controls .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `w` );
      let h = $( `upload-controls .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `h` );
      const selectedOption = $( `upload-controls .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `option-selected` );
      if ( selectedOption == 'custom' ) {
        h = `${ h }"`;
      } else if ( selectedOption == 'popular' ) {
        h = `Proportional Height`;
      }
      updatePreviewSizeOnly( w, h );
    } else if ( uploadType == 'multi' && blockNo ) {
      const activeTab = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] tab-controls .tabOptionName:checked` ).val();
      if ( activeTab == 'custom' ) {
        const isCustomTierAvailable = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] line-items-custom .widthHeight__custom` ).length;
        if ( isCustomTierAvailable > 0 ) {
          selectedItemNo = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] line-items-custom .widthHeight__custom` ).last().attr( `item` );
        } else {
          selectedItemNo = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] line-items-popular .widthHeight__custom` ).last().attr( `item` );
        }
      } else if ( activeTab == 'popular' ) {
        const isPopularTierAvailable = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] line-items-popular .widthHeight__custom` ).length;
        if ( isPopularTierAvailable > 0 ) {
          selectedItemNo = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] line-items-popular .widthHeight__custom` ).last().attr( `item` );
        } else {
          selectedItemNo = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] line-items-custom .widthHeight__custom` ).last().attr( `item` );
        }
      }
    }
  } catch ( err ) {
    console.log( `ERROR updatePreviewSizeOnly( width, height, blockNo )`, err.message );
  }
}
async function updatePreviewSizeOnly( width, height, blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      $( `upload-controls file-preview#filePreview .horizontal_direction` ).attr( `x-is`, `${ width }` );
      $( `upload-controls file-preview#filePreview .verticle_direction` ).attr( `y-is`, `${ height }` );
    } else if ( uploadType == 'multi' ) {
      console.log ( 'height', height );
      if ( height == 'undefined' ) {
        height = `Proportional Height`;
      }
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview .horizontal_direction` ).attr( `x-is`, `${ width }` );
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview .verticle_direction` ).attr( `y-is`, `${ height }` );
    }
  } catch ( err ) {
    console.log( `ERROR updatePreviewSizeOnly( width, height, blockNo )`, err.message );
  }
}
async function applySizes( fileDetails, matchedVariant = null, blockNo, isFileUploading ) {
  try {
    // Defensive 22-inch clamp on the current custom size before we write
    // anything to the DOM. Fresh uploads go through singleFileManageByURL's
    // dimension clamp block, but the previous-design / Design-Studio / AI
    // paths can bypass it and land here with raw pixels/300 values (e.g.
    // 22 x 148.85 for a tall design previously saved at full pixel size).
    // Mirrors normalizeMultiUploadCustomDimensions: scales the longer side
    // down to 22, keeping aspect ratio. Skips vector files (PDF/AI/EPS)
    // which use their own vector_* fields and have a separate validation
    // path. Updates fileDetails in place so downstream price / variant
    // calculations also see the clamped values.
    function clampCurrentDimensionsTo22(fd) {
      if (!fd) return;
      var isVector = fd.fileExt && ['pdf', 'ai', 'eps'].indexOf(fd.fileExt) > -1;
      if (isVector) return;
      var w = parseFloat(fd.currentWidth);
      var h = parseFloat(fd.currentHeight);
      if (!Number.isFinite(w) || !Number.isFinite(h)) return;
      var maxSide = Math.max(w, h);
      if (maxSide <= 22) return;
      var scale = 22 / maxSide;
      var newW = parseFloat((w * scale).toFixed(2));
      var newH = parseFloat((h * scale).toFixed(2));
      console.log('[applySizes 22-cap] clamped ' + w + 'x' + h + ' -> ' + newW + 'x' + newH);
      fd.currentWidth = newW.toFixed(2);
      fd.currentHeight = newH.toFixed(2);
    }
    clampCurrentDimensionsTo22(fileDetails);

    if ( uploadType == 'single' ) {
      $( `upload-controls file-preview#filePreview .horizontal_direction` ).attr( `x-is`, `${ fileDetails.currentWidth }` );
      $( `upload-controls file-preview#filePreview .verticle_direction` ).attr( `y-is`, `${ fileDetails.currentHeight }"` );
      const getSelectedTier = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` );
      if (
        typeof fileDetails.fileExt !== 'undefined' &&
        ['pdf', 'ai', 'eps'].includes( fileDetails.fileExt ) &&
        typeof fileDetails.vector_currentWidth !== 'undefined' &&
        fileDetails.vector_currentWidth
      ) {
        getSelectedTier.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( fileDetails.vector_currentWidth );
        getSelectedTier.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( fileDetails.vector_currentHeight );
      } else {
        getSelectedTier.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( fileDetails.currentWidth );
        getSelectedTier.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( fileDetails.currentHeight );
      }

      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        getSelectedTier.attr({
          "title": matchedVariant.title,
          "vid": matchedVariant.id,
          "dpi-warning": '',
          "price": matchedVariant.price,
          "media-id": matchedVariant.media_id,
          "w": fileDetails.currentWidth,
          "h": fileDetails.currentHeight,
          "size": `${ fileDetails.currentWidth }x${ fileDetails.currentHeight }`
        });
      }
    } else if ( uploadType == 'multi' ) {
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview .horizontal_direction` ).attr( `x-is`, `${ fileDetails.currentWidth }` );
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview .verticle_direction` ).attr( `y-is`, `${ fileDetails.currentHeight }"` );
      let getSelectedTier;
      if ( isFileUploading == 'yes' ) {
        getSelectedTier = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom[item="${ blockNo }-1"]` );
      } else {
        getSelectedTier = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` );
      }

      if (
        typeof fileDetails.fileExt !== 'undefined' &&
        ['pdf', 'ai', 'eps'].includes( fileDetails.fileExt ) &&
        typeof fileDetails.vector_currentWidth !== 'undefined' &&
        fileDetails.vector_currentWidth
      ) {
        getSelectedTier.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( fileDetails.vector_currentWidth );
        getSelectedTier.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( fileDetails.vector_currentHeight );
      } else {
        getSelectedTier.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( fileDetails.currentWidth );
        getSelectedTier.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( fileDetails.currentHeight );
      }

      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        getSelectedTier.attr({
          "title": matchedVariant.title,
          "vid": matchedVariant.id,
          "dpi-warning": '',
          "price": matchedVariant.price,
          "media-id": matchedVariant.media_id,
          "w": fileDetails.currentWidth,
          "h": fileDetails.currentHeight,
          "size": `${ fileDetails.currentWidth }x${ fileDetails.currentHeight }`
        });
      }
    }
  } catch ( err ) {
    console.log( `ERROR applySizeToPreviewBox( fileDetails )`, err.message );
  }
}

function calculateDPILineItem( blockNo ) {
  if ( uploadType == 'single' ) {
    const fileDetail = getFileDetailsFunction();

    if ( fileDetail.fileType == 'png' || fileDetail.fileType == 'jpg' || fileDetail.fileType == 'jpeg' ) {
      const uploadedWidth = fileDetail.fileWidth;
      const uploadedHeight = fileDetail.fileHeight;
      $( `upload-controls sizes-blocks .widthHeight__custom` ).each(function() {
        const width = $( this ).attr( `w` ) * 1;
        const height = $( this ).attr( `h` ) * 1;

        const rowType = $( this ).attr( `option-selected` );

        let makeSqInchesForPopular, makeSqInchesForCustom, currentSqInches = 0;
        if ( rowType == 'custom' ) {
          makeSqInchesForCustom = (uploadedWidth * uploadedHeight) / 72;
          currentSqInches = ( width * height ) * 72;
        } else if ( rowType == 'popular' ) {
          makeSqInchesForPopular = width * height;
        }

        if ( rowType == 'custom' ) {
          if ( makeSqInchesForCustom < 288 ) {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          } else if ( makeSqInchesForCustom > 288 && makeSqInchesForCustom > currentSqInches ) {
            $( this ).find( `dpi-warning` ).removeClass( `active` );
            $( this ).attr( `dpi-warning`, `` );
          } else {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          }
        } else if ( rowType == 'popular' ) {
          const recommendedSqInches = ((uploadedWidth / 72) * (uploadedHeight / 72));
          if ( recommendedSqInches < 4 ) {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          } else if ( makeSqInchesForPopular < recommendedSqInches ) {
            $( this ).find( `dpi-warning` ).removeClass( `active` );
            $( this ).attr( `dpi-warning`, `` );
          } else {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          }
        }
      })
    }
    // pricesTable();
  } else if ( uploadType == 'multi' ) {
    const fileDetail = getFileDetailsFunction( blockNo );

    if ( fileDetail.fileType == 'png' || fileDetail.fileType == 'jpg' || fileDetail.fileType == 'jpeg' ) {
      const uploadedWidth = fileDetail.fileWidth;
      const uploadedHeight = fileDetail.fileHeight;
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom` ).each(function() {
        const width = $( this ).attr( `w` ) * 1;
        const height = $( this ).attr( `h` ) * 1;

        const rowType = $( this ).attr( `option-selected` );

        let makeSqInchesForPopular, makeSqInchesForCustom, currentSqInches = 0;
        if ( rowType == 'custom' ) {
          makeSqInchesForCustom = (uploadedWidth * uploadedHeight) / 72;
          currentSqInches = ( width * height ) * 72;
        } else if ( rowType == 'popular' ) {
          makeSqInchesForPopular = width * height;
        }

        if ( rowType == 'custom' ) {
          if ( makeSqInchesForCustom < 288 ) {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          } else if ( makeSqInchesForCustom > 288 && makeSqInchesForCustom > currentSqInches ) {
            $( this ).find( `dpi-warning` ).removeClass( `active` );
            $( this ).attr( `dpi-warning`, `` );
          } else {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          }
        } else if ( rowType == 'popular' ) {
          const recommendedSqInches = ((uploadedWidth / 72) * (uploadedHeight / 72));
          if ( recommendedSqInches < 4 ) {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          } else if ( makeSqInchesForPopular < recommendedSqInches ) {
            $( this ).find( `dpi-warning` ).removeClass( `active` );
            $( this ).attr( `dpi-warning`, `` );
          } else {
            $( this ).find( `dpi-warning` ).addClass( `active` );
            $( this ).attr( `dpi-warning`, `Yes` );
          }
        }
      })
    }
  }
}

async function imgLoaded(selector) {
  try {
    await waitForImageLoad(selector);
    console.log('✅ Image loaded successfully');
    return true;
  } catch (err) {
    console.error('❌ Image failed to load', err);
    return false;
  } finally {
    console.log('🎯 Done checking image, moving forward');
    $("next-element").addClass("enablereward");
    document.body.classList.add("image-uploaded");
    document.querySelector(".desktop-sticky-container") && (document.querySelector(".desktop-sticky-container").style.transform = "translate3d(0, 0, 0)");
  }
}

async function waitForImageLoad(imgSelector, maxRetries = 5, retryDelay = 3000, attemptTimeout = 10000) {
  const img = document.querySelector(imgSelector);
  if (!img) {
    throw new Error(`No image found with selector "${imgSelector}"`);
  }

  const ignoredSrc = '//cdn.shopify.com/s/files/1/0558/0265/8899/files/transparent.png';
  if (img.src.includes(ignoredSrc)) {
    console.log('Image is transparent placeholder – skipping load check.');
    return null;
  }

  function tryLoadImage(attempt) {
    return new Promise((resolve, reject) => {
      if (img.complete && img.naturalWidth !== 0) {
        return resolve(img);
      }

      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          console.warn(`Attempt ${attempt + 1}: image load timed out after ${attemptTimeout}ms`);
          if (attempt < maxRetries) {
            setTimeout(() => {
              tryLoadImage(attempt + 1).then(resolve).catch(reject);
            }, retryDelay);
          } else {
            reject(new Error(`Image timed out after ${maxRetries} attempts.`));
          }
        }
      }, attemptTimeout);

      const onLoad = () => {
        if (!settled) {
          settled = true;
          cleanup();
          clearTimeout(timeoutId);
          resolve(img);
        }
      };

      const onError = () => {
        if (!settled) {
          settled = true;
          cleanup();
          clearTimeout(timeoutId);
          if (attempt < maxRetries) {
            console.warn(`Attempt ${attempt + 1}: image failed to load. Retrying...`);
            setTimeout(() => {
              tryLoadImage(attempt + 1).then(resolve).catch(reject);
            }, retryDelay);
          } else {
            reject(new Error(`Image failed to load after ${maxRetries} attempts.`));
          }
        }
      };

      function cleanup() {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      }

      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
    });
  }

  return tryLoadImage(0);
}

function getVariantForSmartSize(width, height) {
  try {
    let totalInches = parseFloat(width) * parseFloat(height);

    if (totalInches < 1) {
      totalInches = 1;
    }
    totalInches = Math.ceil(totalInches);

    const customVariants = allVariants.filter(style => style.isCustom);
    if (!customVariants.length) return null;

    const highestMaxInches = Math.max(...customVariants.map(style => style.maxInches));

    if (totalInches > highestMaxInches) {
      // fall back to largest style
      return customVariants.reduce((maxObj, current) =>
        current.maxInches > maxObj.maxInches ? current : maxObj
      );
    }

    // find style whose min/max range contains this area
    return (
      customVariants
        .slice()
        .reverse()
        .find(
          (obj) => totalInches >= obj.minInches && totalInches <= obj.maxInches
        ) || null
    );
  } catch (err) {
    console.log('ERROR getVariantForSmartSize', err.message);
    return null;
  }
}


function getMatchingVariant( fileDetail = null, blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      let activeTab = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
      let fileDetails = fileDetail;
      // console.log ( 'fileDetails', fileDetails );
      if ( fileDetail == null ) {
        fileDetails = getFileDetailsFunction();
      }

      // console.log ( 'fileDetails after', fileDetails );
      // console.log ( 'fileDetails.currentWidth', fileDetails.currentWidth );
      // console.log ( 'fileDetails.currentHeight', fileDetails.currentHeight );

      if ( activeTab == `custom` ) {
        // console.log ( 'fileDetails.currentWidth', fileDetails.currentWidth );
        // console.log ( 'fileDetails.fileHeight_inch', fileDetails.fileHeight_inch );
        // console.log ( 'fileDetails.fileHeight', fileDetails.fileHeight );
        let totalInches = parseFloat( fileDetails.currentWidth ) * parseFloat( fileDetails.currentHeight );
        if ( totalInches < 1 ) {
          totalInches = 1;
        }
        totalInches = Math.ceil( totalInches );

        // console.log ( 'totalInches', totalInches );

        const highestMaxInches = Math.max(...allVariants.filter(style => style.isCustom).map(style => style.maxInches));
        if ( totalInches > highestMaxInches ) {
          const highestObject = allVariants.filter(style => style.isCustom).reduce((maxObj, current) => {
            return current.maxInches > maxObj.maxInches ? current : maxObj;
          });
          // console.log('Object with highest maxInches:', highestObject);
          return highestObject;
        } else {
          const matchedStyle = allVariants.slice().reverse().find(obj =>
            obj.isCustom &&
            totalInches >= obj.minInches &&
            totalInches <= obj.maxInches
          );
          return matchedStyle ?? null;
        }
      } else if ( activeTab == 'popular' ) {
        const getVal = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val();
        const matchedVariant = findObjectByKey( allVariants, `option1_converted`, getVal );
        return matchedVariant ?? null;
      }
    } else if ( uploadType == 'multi' ) {
      let activeTab = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] tab-controls .tabOptionName:checked` ).val();
      // console.log ( 'fileDetail', fileDetail );
      let fileDetails = fileDetail;
      if ( fileDetail == null ) {
        fileDetails = getFileDetailsFunction( blockNo );
      }
      if ( activeTab == `custom` ) {
        const normalizedDimensions = normalizeMultiUploadCustomDimensions( fileDetails.currentWidth, fileDetails.currentHeight, {
          blockNo,
          itemNo: selectedItemNo
        } );
        fileDetails.currentWidth = normalizedDimensions.width.toFixed(2);
        fileDetails.currentHeight = normalizedDimensions.height.toFixed(2);
        if ( typeof fileDetails.vector_currentWidth !== 'undefined' && typeof fileDetails.vector_currentHeight !== 'undefined' ) {
          fileDetails.vector_currentWidth = fileDetails.currentWidth;
          fileDetails.vector_currentHeight = fileDetails.currentHeight;
        }
        syncMultiUploadCustomRowDimensions( blockNo, selectedItemNo, fileDetails.currentWidth, fileDetails.currentHeight );
        let totalInches = parseFloat(fileDetails.currentWidth) * parseFloat(fileDetails.currentHeight);
        if ( totalInches < 1 ) {
          totalInches = 1;
        }
        totalInches = Math.ceil( totalInches );

        const highestMaxInches = Math.max(...allVariants.filter(style => style.isCustom).map(style => style.maxInches));
        if ( totalInches > highestMaxInches ) {
          const highestObject = allVariants.filter(style => style.isCustom).reduce((maxObj, current) => {
            return current.maxInches > maxObj.maxInches ? current : maxObj;
          });
          // console.log('Object with highest maxInches:', highestObject);
          return highestObject;
        } else {
          const matchedStyle = allVariants.slice().reverse().find(obj =>
            obj.isCustom &&
            totalInches >= obj.minInches &&
            totalInches <= obj.maxInches
          );
          return matchedStyle ?? null;
        }
      } else if ( activeTab == 'popular' ) {
        const getVal = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val();
        const matchedVariant = findObjectByKey( allVariants, `option1_converted`, getVal );
        return matchedVariant ?? null;
      }
    }
  } catch ( err ) {
    console.log( `ERROR getMatchingVariant( fileDetails )`, err.message );
  }
}


async function fileDimensions( fileDetails ) {
  try {
    let getApiResponse, file_width, file_height;
    if ( fileDetails.fileExt == 'psd' || fileDetails.fileExt == 'eps' || fileDetails.fileExt == 'ai' ) {
      if ( fileDetails.fileExt == 'eps' || fileDetails.fileExt == 'ai' ) {
        getApiResponse  =   await sendApiRequest( `${ fileDetails.imgIxFile }?trim=colorUnlessAlpha` );
      } else {
        getApiResponse  =   await sendApiRequest( `${ fileDetails.imgIxFile }`, true );
      }
      if ( typeof getApiResponse !== 'undefined' && getApiResponse.success === true ) {
        console.log ( 'getApiResponse', getApiResponse );
        if ( typeof getApiResponse.data.dimensions !== 'undefined' && getApiResponse.data.dimensions ) {
          if ( fileDetails.fileExt == 'eps' || fileDetails.fileExt == 'ai' ) {
            file_width  =   getApiResponse.data.dimensions.width;
            file_height =   getApiResponse.data.dimensions.height;

            // console.log ( 'simple file_width', file_width, file_height );

            file_width  =   file_width * 4.167;
            file_height =   file_height * 4.167;

            // console.log ( 'file_width 4.16', file_width, file_height );

            file_width  =   file_width * 300;
            file_height =   file_height * 300;


            // console.log ( 'file_width and 300', file_width, file_height );

            // file_width = file_width * 4.166666666666667;
            // file_height = file_height * 4.166666666666667;
          } else {
            file_width  =   getApiResponse.data.dimensions.width * 300;
            file_height =   getApiResponse.data.dimensions.height * 300;
          }
        }

        return {
          "vector_fileWidth": file_width,
          "vector_fileHeight": file_height,
          "vector_fileWidth_inch": (file_width / 300).toFixed(2),
          "vector_fileHeight_inch": (file_height / 300).toFixed(2),
          "vector_ratioBy_width": `${ file_width / file_height }`,
          "vector_ratioBy_height": `${ file_height / file_width }`,
          "vector_currentWidth": (file_width / 300).toFixed(2),
          "vector_currentHeight": (file_height / 300).toFixed(2),

          "fileWidth": file_width,
          "fileHeight": file_height,
          "fileWidth_inch": (file_width / 300).toFixed(2),
          "fileHeight_inch": (file_height / 300).toFixed(2),
          "ratioBy_width": `${ file_width / file_height }`,
          "ratioBy_height": `${ file_height / file_width }`,
          "currentWidth": (file_width / 300).toFixed(2),
          "currentHeight": (file_height / 300).toFixed(2)
        }
      } else {
        file_width  =   300;
        file_height =   300;
      }
      return {
        "fileWidth": file_width,
        "fileHeight": file_height,
        "fileWidth_inch": (file_width / 300).toFixed(2),
        "fileHeight_inch": (file_height / 300).toFixed(2),
        "ratioBy_width": `${ file_width / file_height }`,
        "ratioBy_height": `${ file_height / file_width }`,
        "currentWidth": (file_width / 300).toFixed(2),
        "currentHeight": (file_height / 300).toFixed(2)
      }
    } else {
      let setFileURL = fileDetails.imgIxFile;
      // console.log ( 'setFileURL', setFileURL );
      if ( fileDetails.fileExt == 'pdf' ) {
        setFileURL = `${ setFileURL }?trim=colorUnlessAlpha&fm=png`;
        console.log ( 'setFileURL', setFileURL );
        getApiResponse  =   await sendApiRequest( setFileURL, fileDetails.fileName );
      }

      const dimensions = await getImageDimensions( setFileURL );
      console.log('Image dimensions:', dimensions);


      if ( fileDetails.fileExt == 'svg' ) {
        if ( typeof noWidthAndHeightForSVG !== 'undefined' && noWidthAndHeightForSVG ) {
          const getUnitForMultiple = 2480 / dimensions.width;
          file_width = dimensions.width * getUnitForMultiple;
          file_height = dimensions.height * getUnitForMultiple;
        } else {
          file_width = dimensions.width * 4.168067226890756;
          file_height = dimensions.height * 4.168067226890756;
        }
      } else if ( fileDetails.fileExt == 'pdf' && typeof getApiResponse !== 'undefined' && getApiResponse ) {
        if ( typeof getApiResponse.data !== 'undefined' && getApiResponse.data && typeof getApiResponse.data.dimensions !== 'undefined' && getApiResponse.data.dimensions && typeof getApiResponse.data.dimensions.width !== 'undefined' && getApiResponse.data.dimensions.width && typeof getApiResponse.data.dimensions.height !== 'undefined' && getApiResponse.data.dimensions.height ) {
          file_width = getApiResponse.data.dimensions.width;
          file_height = getApiResponse.data.dimensions.height;

          return {
            "vector_fileWidth": ( file_width * 300),
            "vector_fileHeight": ( file_height * 300 ),
            "vector_fileWidth_inch": file_width,
            "vector_fileHeight_inch": file_height,
            "vector_ratioBy_width": `${ file_width / file_height }`,
            "vector_ratioBy_height": `${ file_height / file_width }`,
            "vector_currentWidth": file_width,
            "vector_currentHeight": file_height,
            "fileWidth": file_width,
            "fileHeight": file_height,
            "fileWidth_inch": file_width,
            "fileHeight_inch": file_height,
            "ratioBy_width": `${ file_width / file_height }`,
            "ratioBy_height": `${ file_height / file_width }`,
            "currentWidth": file_width,
            "currentHeight": file_height
          }
        } else {
          if ( getApiResponse.data.dimensions.width > getApiResponse.data.dimensions.height ) {
            let makeMultiplier = getApiResponse.data.dimensions.height / ( dimensions.height / 300 );

            file_width = dimensions.width * makeMultiplier;
            file_height = dimensions.height * makeMultiplier;
          } else {
            let makeMultiplier = getApiResponse.data.dimensions.width / ( dimensions.width / 300 );

            file_width = dimensions.width * makeMultiplier;
            file_height = dimensions.height * makeMultiplier;
          }
        }
      } else {
        file_width = dimensions.width;
        file_height = dimensions.height;
      }
      $(".dtf_body_image_labels").css({"opacity":0});
      calculateRatio( file_width, file_height);
      return {
        "fileWidth": file_width,
        "fileHeight": file_height,
        "fileWidth_inch": (file_width / 300).toFixed(2),
        "fileHeight_inch": (file_height / 300).toFixed(2),
        "ratioBy_width": `${ file_width / file_height }`,
        "ratioBy_height": `${ file_height / file_width }`,
        "currentWidth": (file_width / 300).toFixed(2),
        "currentHeight": (file_height / 300).toFixed(2)
      }
    }
    // console.log ( 'fileDetails getDimensions', fileDetails );
  } catch ( err ) {
    console.log( `ERROR fileDimensions( fileDetails )`, err.message );
  }
}

async function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image.'));
    };

    img.src = url;
  });
}

async function calculateTotalQty() {
  try {
    console.log ( 'calculateTotalQty();',  );
    if ( uploadType == 'single' ) {
      let totalQty = 0;
      $( `upload-controls sizes-blocks line-items-custom .widthHeight__custom` ).each(function( i ) {
        const q = $( this ).attr( `qty` ) * 1;
        totalQty = totalQty + q;
      })

      $( `upload-controls sizes-blocks line-items-popular .widthHeight__custom` ).each(function( i ) {
        const q = $( this ).attr( `qty` ) * 1;
        totalQty = totalQty + q;
      })
      console.log ( 'secondCountNo', totalQty );
      $( `upload-controls sizes-blocks` ).attr( `total-qty`, totalQty );
      const cartQty = $( `upload-controls prices-table` ).attr( `already-in-cart` ) * 1;
      $( `upload-controls prices-table` ).attr( `current-qty-plus-cart-qty`, `${ totalQty + cartQty }` );

      pricesTableSelectedBar();
    } else if ( uploadType == 'multi' ) {
      let totalQty = 0;
      $( `multi-upload file-blocks-area uploaded-files-block` ).each(function( main_i ) {
        let blockQty = 0;
        $( this ).find( `sizes-blocks line-items-custom .widthHeight__custom` ).each(function( i ) {
          const q = $( this ).attr( `qty` ) * 1;
          totalQty = totalQty + q;
          blockQty = blockQty + q;
        })

        $( this ).find( `sizes-blocks line-items-popular .widthHeight__custom` ).each(function( i ) {
          const q = $( this ).attr( `qty` ) * 1;
          totalQty = totalQty + q;
          blockQty = blockQty + q;
        })
        $( this ).find( `line-items sizes-blocks` ).attr( `total-qty`, blockQty );
      })
      $( `multi-upload file-blocks-area, multi-upload prices-table` ).attr( `total-qty`, totalQty );
      const cartQty = $( `multi-upload prices-table` ).attr( `already-in-cart` ) * 1;
      $( `multi-upload prices-table` ).attr( `current-qty-plus-cart-qty`, `${ totalQty + cartQty }` );

      pricesTableSelectedBar();
    }
  } catch ( err ) {
    console.log( `ERROR calculateTotalQty()`, err.message );
  }
}

function getCumulativeQty() {
  try {
    if ( uploadType == 'single' ) {
      const pageQty = $( `upload-controls sizes-blocks` ).attr( `total-qty` ) * 1;
      const cartQty = $( `upload-controls prices-table` ).attr( `already-in-cart` ) * 1;
      const max = $( `upload-controls prices-table .pricesTable__items .pricesTable__item.selected` ).attr( `max` ) * 1;

      // console.log ( 'pageQty', pageQty );
      // console.log ( 'cartQty', cartQty );
      // console.log ( 'max', max );

      let cartState =  cartQty + pageQty;
      let x = max - cartState;
      if ( pageQty === 1 ) return (max + 2) - cartState;
      if(x === 0 ) return 1;
      x = max - cartState;
      return x + 1
    } else if ( uploadType == 'multi' ) {
      const pageQty = $( `multi-upload prices-table` ).attr( `total-qty` ) * 1;
      const cartQty = $( `multi-upload prices-table` ).attr( `already-in-cart` ) * 1;
      const max = $( `multi-upload prices-table .pricesTable__items .pricesTable__item.selected` ).attr( `max` ) * 1;

      // console.log ( 'pageQty', pageQty );
      // console.log ( 'cartQty', cartQty );
      // console.log ( 'max', max );

      let cartState =  cartQty + pageQty;
      let x = max - cartState;
      if ( pageQty === 1 ) return (max + 2) - cartState;
      if(x === 0 ) return 1;
      x = max - cartState;
      return x + 1
    }
  } catch ( err ) {
    console.log( `ERROR getCumulativeQty()`, err.message );
  }
}

async function applyItemNo( type, blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      let countNo = 0;

      $( `upload-controls sizes-blocks line-items-custom .widthHeight__custom` ).each(function( i ) {
        const j = i + 1;
        $( this ).attr({
          "item": j
        });
        countNo = j;
      })
      let secondCountNo = countNo;
      $( `upload-controls sizes-blocks line-items-popular .widthHeight__custom` ).each(function( i ) {
        const j = countNo + ( i + 1 );
        $( this ).attr({
          "item": j
        });
        secondCountNo = j;
      })
      selectedItemNo = $( `upload-controls sizes-blocks line-items-${ type } .widthHeight__custom` ).last().attr( `item` );

      $( `upload-controls sizes-blocks` ).attr( `total-items`, secondCountNo );
      let precut = $( `upload-controls precut #preCutOption` ).is( `:checked` );
      if ( typeof precut !== 'undefined' && precut ) {
        precut = 'Yes';
      } else {
        precut = '';
      }
      $( `upload-controls sizes-blocks .widthHeight__custom` ).attr( `precut`, precut );
      calculateTotalQty();
    } else if ( uploadType == 'multi' ) {
      let totalQty = 0;
      $( `multi-upload file-blocks-area uploaded-files-block` ).each(function( main_i ) {
        let blockCountNo = 0;
        const newMain_index = main_i + 1;
        $( this ).find( `sizes-blocks line-items-custom .widthHeight__custom` ).each(function( i ) {
          const j = i + 1;
          $( this ).attr({
            "item": `${ newMain_index }-${ j }`
          });
          blockCountNo = j;
        })
        let secondCountNo = blockCountNo;
        $( this ).find( `sizes-blocks line-items-popular .widthHeight__custom` ).each(function( i ) {
          const j = blockCountNo + ( i + 1 );
          $( this ).attr({
            "item": `${ newMain_index }-${ j }`
          });
          secondCountNo = j;
        })
        $( this ).find( `sizes-blocks` ).attr( `total-items`, secondCountNo );
        totalQty = totalQty + secondCountNo;
      })
      selectedItemNo = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks line-items-${ type } .widthHeight__custom` ).last().attr( `item` );
      let precut = $( `multi-upload precut #preCutOption_multi` ).is( `:checked` );
      if ( typeof precut !== 'undefined' && precut ) {
        precut = 'Yes';
      } else {
        precut = '';
      }
      $( `multi-upload file-blocks-area` ).attr( `total-qty`, totalQty );
      $( `multi-upload sizes-blocks .widthHeight__custom` ).attr( `precut`, precut );
      calculateTotalQty();
    }
  } catch ( err ) {
    console.log( `ERROR applyItemNo( selector )`, err.message );
  }
}


async function checkAndAddNewSizeRow( blockNo ) {
  try {
    let rtn = false;
    if ( uploadType == 'single' ) {
      let activeOption = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
      const isActiveTierAvailable = $( `upload-controls sizes-blocks line-items-${ activeOption }` ).hasClass( `rowAdded` );
      if ( isActiveTierAvailable == false ) {
        $( `upload-controls sizes-blocks line-items-${ activeOption }:not(.rowAdded)` )
          .append( $( `upload-controls sizes-blocks template[data-id="${ activeOption }"]` ).html() )
          .addClass( `rowAdded`, activeOption );

        await applyItemNo( activeOption );
        //  $( `.widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).change();

        if (activeOption === 'popular') {
          const $popularSelect = $(
            `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes`
          );
          const val = $popularSelect.val();

          if (val) {
            $popularSelect.trigger('change');
          }
        }

        rtn = true;
      }
    } else if ( uploadType == 'multi' ) {
      let activeOption = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] tab-controls .tabOptionName:checked` ).val();
      const isActiveTierAvailable = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks line-items-${ activeOption }` ).hasClass( `rowAdded` );
      if ( isActiveTierAvailable == false ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks line-items-${ activeOption }:not(.rowAdded)` )
          .append( $( `#multiUploadTemplates template[data-multi-id="${ activeOption }"]` ).html() )
          .addClass( `rowAdded`, activeOption );

        await applyItemNo( activeOption, blockNo );
        rtn = true;
      }
    }
    return rtn;
  } catch ( err ) {
    console.log( `ERROR checkAndAddNewSizeRow( selector )`, err.message );
  }
}


async function preDeterminedSVGDimension( file ) {
  try {
    console.log ( 'file', file );
    if ( typeof file.fileURL !== 'undefined' && file.fileURL ) {
      noWidthAndHeightForSVG = true;
      return noWidthAndHeightForSVG;
    } else {
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
        // console.log ( 'SVG', `Width: ${width}, Height: ${height}` );
      };
      reader.readAsText(file);
      return noWidthAndHeightForSVG;
    }
  } catch ( err ) {
    console.log( `ERROR preDeterminedSVGDimension( file )`, err.message );
  }
}

function imgPreviewBox( act, fileExt, blockNo ) {
  try {
    if ( act == 'active' ) {
      if ( uploadType == 'single' ) {
        uploadArea.classList.add( `hidden` );
        aiImgGenerator.addClass( `hidden` );

        $( `upload-controls next-element` ).removeClass( `hidden` );
        $( `upload-controls preview-box file-preview preview-block` ).addClass( `image-loading` );

        if ( fileExt ) {
          const selectedParamsObject = findObjectByKey( imgParamsSettings, `fileType`, fileExt );
          $( `upload-controls preview-box toggle-options` ).attr({
            "show-bg-option": selectedParamsObject.bgRemover,
            "show-superres-option": selectedParamsObject.superRes
          });
          return selectedParamsObject;
        }
      } else if ( uploadType == 'multi' ) {
        if ( fileExt ) {
          $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview preview-block` ).addClass( `image-loading` );
          const selectedParamsObject = findObjectByKey( imgParamsSettings, `fileType`, fileExt );
          $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box toggle-options` ).attr({
            "show-bg-option": selectedParamsObject.bgRemover,
            "show-superres-option": selectedParamsObject.superRes
          });
          return selectedParamsObject;
        }
      }

    } else if ( act == 'inactive' ) {
      if ( uploadType == 'single' ) {
        $( `upload-controls preview-box file-preview preview-block` ).removeClass( `image-loading` );
      }
    }
  } catch ( err ) {
    console.log( `ERROR imgPreviewBox( act )`, err.message );
  }
}

async function processFile( file, blockNo ) {
  let rtn = null;
  const fileReader = new FileReader();
  const fileType = file.type;
  const fileSize = file.size;

  // const randomName = file.name.split('.')[0].replace(/[^a-z0-9\s]/gi, '').replace(/[_\s]/g, '-')+"____"+'image_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.' + file.name.split('.').pop();

  const nameOnly = file.name.split('.')[0]
  .toLowerCase()
  .replace(/[^a-z0-9]/gi, '-')        // Replace all non-alphanumerics with dash
  .replace(/-+/g, '-')                // Collapse multiple dashes
  .replace(/^-|-$/g, '');             // Trim leading/trailing dashes

  const extension = file.name.split('.').pop();

  const randomName = `${ nameOnly }____image_${ Date.now() }_${ Math.floor( Math.random() * 1000 ) }.${ extension }`;


  const presignData = await getPresignedUploadUrl( randomName, file.type );

  if ( typeof presignData !== 'undefined' && presignData && typeof presignData.url !== 'undefined' && presignData.url ) {
    fileProcessBar( `start` );
    if ( uploadType == 'single' ) {
      singleProgressMove = progressMove( `upload-controls file-progress`, ``, fileSize );
    } else if ( uploadType == 'multi' ) {
      progressMove( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-progress`, ``, fileSize );
    }
    const originalUploadedFileURL = presignData.sourceUrl;
    const response = await fetch(presignData.url, {
      method: 'PUT',
      body: file
    });

    if ( typeof response !== 'undefined' && response.status == 200 ) {
      let filePath = `https://${ ninjaImgixHost }/${ randomName }`;

      const file_crc = await makeCRC( file );

      fileReader.readAsDataURL( file );
      rtn = {
        "originalFile": originalUploadedFileURL,
        "imgIxFile": filePath,
        "file_crc": file_crc,
        "fileName": randomName
      }
    }
  }
  return rtn;
}
/*
async function progressMove( selector, filePath, fileSize = 550 ) {
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
    counter = 50
  }

  let counterIncrease = setInterval(() => {
    if (counter === 100) {
      let isCompleted;
      if ( uploadType == 'single' ) {
        isCompleted = $( selector ).closest( `upload-controls` ).find( `preview-box .easyzoom` ).hasClass( `image-loading` );
        if ( isCompleted == false ) {
          clearInterval( counterIncrease );
          return 'completed';
        }
      } else if ( uploadType == 'multi' ) {
        isCompleted = $( selector ).closest( `uploaded-files-block` ).find( `preview-box .easyzoom` ).hasClass( `image-loading` );
        if ( isCompleted == false ) {
          clearInterval( counterIncrease );
          return 'completed';
        }
      }
    } else {
      if ( uploadType == 'single' ) {
        counter = counter + 1;
        $( selector ).find( `.fileProgress__bar` ).css({
          "width": `${ counter }%`
        });
        $( selector ).find( `.loadingPercent__counter` ).text( `${ counter }%` );
      } else if ( uploadType == 'multi' ) {
        counter = counter + 1;
        $( selector ).find( `.fileProgress__bar` ).css({
          "width": `${ counter }%`
        });
        $( selector ).find( `.loadingPercent__counter` ).text( `${ counter }%` );
      }
    }
  }, fileSize);
};
*/

function progressMove(selector, filePath, fileSize = 550) {
  let counter = 0;
  let stopped = false;

  if (fileSize > 9000000) fileSize = 250;
  else if (fileSize > 7000000) fileSize = 150;
  else if (fileSize > 5000000) fileSize = 120;
  else if (fileSize > 3000000) fileSize = 90;
  else if (fileSize > 1000000) fileSize = 80;
  else fileSize = 70;

  fileSize = 50;

  if (filePath === "quick") counter = 50;

  const intervalId = setInterval(() => {
    if (stopped) {
      clearInterval(intervalId);
      return;
    }

    if (counter >= 100) {
      let isCompleted;

      if (uploadType === 'single') {
        isCompleted = $(selector)
          .closest(`upload-controls`)
          .find(`preview-box .easyzoom`)
          .hasClass(`image-loading`);
      } else {
        isCompleted = $(selector)
          .closest(`uploaded-files-block`)
          .find(`preview-box .easyzoom`)
          .hasClass(`image-loading`);
      }

      if (!isCompleted) {
        clearInterval(intervalId);
        return;
      }

    } else {
      counter++;

      $(selector).find(`.fileProgress__bar`).css({
        width: `${counter}%`
      });

      $(selector).find(`.loadingPercent__counter`).text(`${counter}%`);
    }

  }, fileSize);

  // 🔥 return controller
  return {
    stop: () => {
      stopped = true;
      clearInterval(intervalId);
    }
  };
}

function removeEmojis( str ) {
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
}

function resetLoading(){
  $( `[removefile]` ).click();
}

function getFileDetailsFunction( blockNo ) {
  try {
    let fileDetails = '';
    if ( uploadType == 'single' ) {
      fileDetails = $( `upload-controls preview-box file-preview file-details` ).text();

      // console.log ( 'fileDetails', fileDetails );
    } else if ( uploadType == 'multi' ) {
      fileDetails = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview file-details` ).text();
    }
    if ( typeof fileDetails !== 'undefined' && fileDetails ) {
      fileDetails = JSON.parse( fileDetails );
      return fileDetails;
    } else {
      return null;
    }
  } catch ( err ) {
    console.log( `ERROR getFileDetailsFunction()`, err.message );
  }
}

function updateFileDetailsFunction( fileDetails, blockNo ) {
  try {
    if ( typeof uploadType === 'undefined' || uploadType == 'single' ) {
      $( `upload-controls file-preview file-details` ).text( JSON.stringify( fileDetails ) );
      return true;
    } else if ( typeof uploadType === 'undefined' || uploadType == 'multi' ) {
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview file-details` ).text( JSON.stringify( fileDetails ) );
      return true;
    }
    return false;
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

function updateLineItemData( w, h, blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr({
        "w": w,
        "h": h,
        "size": `${ w }x${ h }`
      });
    } else if ( uploadType == 'multi' ) {
      const $row = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` );
      if ( $row.attr( `option-selected` ) == `custom` ) {
        const normalizedDimensions = normalizeMultiUploadCustomDimensions( w, h, {
          blockNo,
          itemNo: selectedItemNo
        } );
        w = normalizedDimensions.width;
        h = normalizedDimensions.height;
        syncMultiUploadCustomRowDimensions( blockNo, selectedItemNo, w, h );
      }
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr({
        "w": w,
        "h": h,
        "size": `${ w }x${ h }`
      });
    }
  } catch ( err ) {
    console.log( `ERROR updateLineItemData( w, h )`, err.message );
  }
}

function formatInchesValue(value) {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    // 2 decimal places, but strip trailing .00
    return parseFloat(num.toFixed(2)).toString().replace(/\.00$/, '');
  } catch (err) {
    console.log('ERROR formatInchesValue', err.message);
    return value;
  }
}

/**
 * Fit the uploaded design into the selected popular box
 * using max width/height while preserving aspect ratio.
 *
 * maxWidth, maxHeight come from the popular size (e.g. 4x4)
 * ratio_width / ratio_height come from original upload.
 */
function getSmartSizedDimensions(maxWidth, maxHeight) {
  try {
    const maxW = parseFloat(maxWidth);
    const maxH = parseFloat(maxHeight);

    if (!maxW || !maxH || !ratio_width || !ratio_height) {
      return { width: maxW, height: maxH };
    }

    const aspect = ratio_width / ratio_height; // design W/H

    // Candidate 1: use full width of box
    let widthFromWidth = maxW;
    let heightFromWidth = widthFromWidth / aspect;

    // Candidate 2: use full height of box
    let heightFromHeight = maxH;
    let widthFromHeight = heightFromHeight * aspect;

    let width, height;

    // Pick the one that fits inside the box
    if (heightFromWidth <= maxH) {
      width = widthFromWidth;
      height = heightFromWidth;
    } else {
      width = widthFromHeight;
      height = heightFromHeight;
    }

    width = parseFloat(width.toFixed(2));
    height = parseFloat(height.toFixed(2));

    return { width, height };
  } catch (err) {
    console.log('ERROR getSmartSizedDimensions', err.message);
    return { width: maxWidth, height: maxHeight };
  }
}


function getWidthHeight_popularSize( value ) {
  try {
    // Match formats like: 3^ x 2^, 3"x2.5, 3.5^x6.15", etc.
    const match = value.match(/^([\d.]+)[\^"]?\s*x\s*([\d.]+)[\^"]?$/i);
    if (match) {
      const width = parseFloat(match[1]);
      const height = parseFloat(match[2]);
      return { width, height };
    }
    return null; // return null if pattern doesn't match
  } catch ( err ) {
    console.log( `ERROR getWidthHeight_popularSize()`, err.message );
  }
}
function getToggleOptionParams( blockNo ) {
  try {
    let bgRemoveState = false;
    let superResState = false;
    if ( uploadType == 'single' ) {
      bgRemoveState = $( `upload-controls toggle-options .bgRemover .toggleOption` ).is( `:checked` );
      superResState = $( `upload-controls toggle-options .superRes .toggleOption` ).is( `:checked` );
    } else if ( uploadType == 'multi' ) {
      bgRemoveState = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .bgRemover .toggleOption` ).is( `:checked` );
      superResState = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .superRes .toggleOption` ).is( `:checked` );
    }
    if ( bgRemoveState || superResState ) {
      let optionParams = ``;
      if ( bgRemoveState ) {
        optionParams += bgRemoveState ? `&bg-remove=true` : ``;
      }
      if ( superResState ) {
        optionParams += superResState ? `&upscale=true` : ``;
      }
      return optionParams
    } else {
      return null;
    }
  } catch ( err ) {
    console.log( `ERROR getToggleOptionParams()`, err.message );
  }
}

async function updatePreviewImgAndLineItems( blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      const optionParams = getToggleOptionParams();
      const fileDetails = getFileDetailsFunction();
      $( `upload-controls file-preview preview-block .fileupload_hero` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
      const isImageLoaded =  await imgLoaded( `upload-controls file-preview preview-block .fileupload_hero` );
      if ( typeof isImageLoaded !== 'undefined' && isImageLoaded ) {
        $( `upload-controls file-preview preview-block .viewer-box > img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        $( `#dtf_body_image .watermark_image img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        $( `body` ).addClass( `activeImgPreviewer` );
        // console.log ( 'image loaded', isImageLoaded );

        const previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
        const getImgDimensions = await getImageSizeFromUrl( `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        let getActualWidth = null;
        let getActualHeight = null;
        if ( typeof getImgDimensions !== 'undefined' && getImgDimensions ) {
          getActualWidth = getImgDimensions.width;
          getActualHeight = getImgDimensions.height;
        }
    if (getActualWidth && getActualHeight) {
            calculateRatio(getActualWidth, getActualHeight);
          }
        const newRatio = getNewRatio( 'upload-controls file-preview preview-block .fileupload_hero', 'width', getActualWidth, getActualHeight );
        const getNewHeight = calculateNewWidth_orNewHeight( newRatio, `width`, fileDetails.fileWidth );
        fileDetails.fileHeight = Math.ceil( getNewHeight );
        fileDetails.fileHeight_inch = ( getNewHeight / 300 ).toFixed( 2 );
        fileDetails.currentHeight = ( getNewHeight / 300 ).toFixed( 2 );

        fileDetails.currentOptions = `${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }`;

        await applyClassByDimension( fileDetails );

        $( `upload-controls file-preview file-details` ).html( JSON.stringify( fileDetails ) );

        const activeTab = $(`upload-controls tab-controls .tabOptionName:checked`).val();
        if (activeTab === 'popular') {
          const $sel = $(`upload-controls sizes-blocks .widthHeight__custom[item="${selectedItemNo}"] .popularSizes`);
          if ($sel.length && $sel.val()) {
            $sel.trigger('change');
          }
        }

        $( `upload-controls sizes-blocks line-items-custom .widthHeight__custom` ).each(function() {
          const w = $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() * 1;
          const h = calculateNewWidth_orNewHeight( newRatio, `width`, w );
          const fileDetail = fileDetails;
          fileDetail.currentWidth = w.toFixed( 2 );
          fileDetail.currentHeight = h.toFixed( 2 );
          const totalInches = Math.ceil( w * h );
          const matchedVariant = allVariants.slice().reverse().find(obj =>
            obj.isCustom &&
            totalInches >= obj.minInches &&
            totalInches <= obj.maxInches
          );

          $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( h.toFixed( 2 ) );

          if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
            $( this ).attr({
              "vid": matchedVariant.id,
              "media-id": matchedVariant.media_id,
              "title": matchedVariant.title,
              "price": matchedVariant.price,
              "w": w.toFixed( 2 ),
              "h": h.toFixed( 2 ),
              "size": `${ w.toFixed( 2 ) }x${ h.toFixed( 2 ) }`
            });
          }
          // console.log ( '----- matchedVariant', matchedVariant );
        })

        calculatePrices();

        $( `upload-controls file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
      }
    } else if ( uploadType == 'multi' ) {
      const optionParams = getToggleOptionParams( blockNo );
      const fileDetails = getFileDetailsFunction( blockNo );
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
      const isImageLoaded =  await imgLoaded( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` );
      if ( typeof isImageLoaded !== 'undefined' && isImageLoaded ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .viewer-box > img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        // console.log ( 'image loaded', isImageLoaded );

        const previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
        const getImgDimensions = await getImageSizeFromUrl( `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        let getActualWidth = null;
        let getActualHeight = null;
        if ( typeof getImgDimensions !== 'undefined' && getImgDimensions ) {
          getActualWidth = getImgDimensions.width;
          getActualHeight = getImgDimensions.height;
        }
        const newRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero`, 'width', getActualWidth, getActualHeight );
        const getNewHeight = calculateNewWidth_orNewHeight( newRatio, `width`, fileDetails.fileWidth );
        fileDetails.fileHeight = Math.ceil( getNewHeight );
        fileDetails.fileHeight_inch = ( getNewHeight / 300 ).toFixed( 2 );
        fileDetails.currentHeight = ( getNewHeight / 300 ).toFixed( 2 );

        fileDetails.currentOptions = `${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }`;

        await applyClassByDimension( fileDetails, blockNo );

        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview file-details` ).html( JSON.stringify( fileDetails ) );

        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks line-items-custom .widthHeight__custom` ).each(function() {
          const itemNo = $( this ).attr( `item` );
          const w = $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val() * 1;
          const h = calculateNewWidth_orNewHeight( newRatio, `width`, w );
          const normalizedDimensions = normalizeMultiUploadCustomDimensions( w, h, {
            blockNo,
            itemNo
          } );
          const fileDetail = fileDetails;
          fileDetail.currentWidth = normalizedDimensions.width.toFixed( 2 );
          fileDetail.currentHeight = normalizedDimensions.height.toFixed( 2 );
          const totalInches = Math.ceil( normalizedDimensions.width * normalizedDimensions.height );
          const matchedVariant = allVariants.slice().reverse().find(obj =>
            obj.isCustom &&
            totalInches >= obj.minInches &&
            totalInches <= obj.maxInches
          );

          $( this ).find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( normalizedDimensions.width.toFixed( 2 ) );
          $( this ).find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( normalizedDimensions.height.toFixed( 2 ) );

          if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
            $( this ).attr({
              "vid": matchedVariant.id,
              "media-id": matchedVariant.media_id,
              "title": matchedVariant.title,
              "price": matchedVariant.price,
              "w": normalizedDimensions.width.toFixed( 2 ),
              "h": normalizedDimensions.height.toFixed( 2 ),
              "size": `${ normalizedDimensions.width.toFixed( 2 ) }x${ normalizedDimensions.height.toFixed( 2 ) }`
            });
          }
          // console.log ( '----- matchedVariant', matchedVariant );
        })

        calculatePrices();
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
      }
    }
  } catch ( err ) {
    console.log( `ERROR getToggleOptionParams()`, err.message );
  }
}

async function resetItemNo() {
  try {
    $( `multi-upload uploaded-files-block` ).each(function(i) {
      const j = i + 1;

      setIndexNoToBlock( $( this ), j );
    })
  } catch ( err ) {
    console.log( `ERROR resetItemNo()`, err.message );
  }
}





async function flushSingleFileData() {
  try {
    $( `upload-controls next-element` ).addClass( `hidden` );
    $( `
      upload-controls preview-box preview-block .fileupload_hero,
      upload-controls preview-box preview-block .viewer-box img
    ` ).attr( `src`, transpareImg );
    $( `upload-controls preview-box preview-block .horizontal_direction` ).attr( `x-is`, `` );
    $( `upload-controls preview-box preview-block .verticle_direction` ).attr( `y-is`, `` );
    $( `upload-controls preview-box file-details` ).empty();
    $( `upload-controls sizes-blocks` )
      .attr({"total-items": 1, "total-qty": 1})
      .find( `line-items-custom, line-items-popular` )
      .removeClass( `rowAdded` )
      .empty();
    $( `upload-controls toggle-options .toggleOption, upload-controls designer-notes #designerNotes` ).prop( `checked`, false );
    $( `upload-controls tab-controls #customSizeTabOption` ).prop( `checked`, true );
    $( `upload-controls master-upload, upload-controls file-progress` ).removeClass( `hidden` );
    $( `upload-controls file-progress .loadingPercent__counter` ).text( `0%` );
    $( `upload-controls file-progress .fileProgress__bar` ).css( `width`, `0%` );
    $( `upload-controls designer-notes .designNotes` ).val( `` );
    $( `file-remove-wrapper` ).remove();
    $( `#generative-ai-area` ).removeAttr( `style` ).removeClass( `hidden` );
    $( `.generative-ai-area` ).removeClass( `hidden` );
    $( `.grt_payment_icons` ).addClass( `hide` );
    $( `.customTabelPopup__overlay-2` ).hide();

    singleProgressMove.stop();
    $( `body` ).removeClass("image-uploaded")
    uploadType = '';
    setSingleUploadCustomEditDetected( false );
    setSingleUploadPopularEditDetected( false );
    fileInput.value = '';
    grt_photo_id = '';
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

async function singleFileAddToCart( act = `` ) {
  try {
    let items = [];
    const fileDetail = getFileDetailsFunction();
    const uploadControl = $( `upload-controls` );
    const currentSelectionMode = uploadControl.find( `tab-controls .tabOptionName:checked` ).val() || `unknown`;
    let rowSelector = `upload-controls sizes-blocks .widthHeight__custom[item][option-selected="${ currentSelectionMode }"]`;
    if ( currentSelectionMode == `popular` && singleUploadCustomEditDetected ) {
      rowSelector = `upload-controls sizes-blocks .widthHeight__custom[item]`;
    } else if ( currentSelectionMode == `custom` && singleUploadPopularEditDetected ) {
      rowSelector = `upload-controls sizes-blocks .widthHeight__custom[item]`;
    }
    
    console.log( `[singleFileAddToCart] current selection mode: ${ currentSelectionMode }` );
    console.log( `[singleFileAddToCart] singleUploadCustomEditDetected: ${ singleUploadCustomEditDetected }` );
    console.log( `[singleFileAddToCart] singleUploadPopularEditDetected: ${ singleUploadPopularEditDetected }` );
    console.log( `[singleFileAddToCart] rowSelector: ${ rowSelector }` );
    if ( currentSelectionMode == `popular` ) {
      const $popularSelect = uploadControl.find( `sizes-blocks line-items-popular .widthHeight__custom[item] .popularSizes` ).first();
      const popularValue = $popularSelect.val();
      if ( !$popularSelect.length || typeof popularValue === 'undefined' || popularValue === null || `${ popularValue }`.trim() === `` ) {
        $popularSelect.addClass( `error` ).css({
          "border": "1px solid #FF0000",
          "outline": "1px solid #FF0000",
          "box-shadow": "none"
        });
        if ( $popularSelect.siblings( `.popularSizes_error` ).length === 0 ) {
          $popularSelect.after( `<div class="popularSizes_error" style="display:block;color:#FF0000;font-size:12px;font-weight:500;margin-top:6px;">Please select a popular size.</div>` );
        }
        $popularSelect.trigger( `focus` );
        return;
      }
      $popularSelect.removeClass( `error` ).css({
        "border": "",
        "outline": "",
        "box-shadow": ""
      });
      $popularSelect.siblings( `.popularSizes_error` ).remove();
    }
    const discountInputProperty = uploadControl.find( `prices-table discount-properties` ).attr( `discount-input` );
    const discountNameProperty = uploadControl.find( `prices-table discount-properties` ).attr( `discount-name` );
    const bgRemover = uploadControl.find( `toggle-options #bgRemover` ).is( `:checked` );
    const superRes = uploadControl.find( `toggle-options #superRes` ).is( `:checked` );
    // The legacy <designer-notes> + .designNotes textarea was removed in
    // favor of the .nt-design-note collapsible (snippets/nt-design-note.liquid)
    // whose textarea uses name="properties[Design Notes]". Read both for
    // safety: prefer the new collapsible's textarea, fall back to the
    // legacy selector. `|| ''` keeps .trim() safe when neither element
    // exists (avoids TypeError on undefined that crashed cart-add).
    const designNote = (
      $( '.nt-design-note textarea[name="properties[Design Notes]"]' ).val()
      || uploadControl.find( `designer-notes .designNotes` ).val()
      || ''
    ).trim();
    $($( rowSelector ).get().reverse()).each(function( i ) {
      const VID = $( this ).attr( `vid` ) * 1;
      const qty = $( this ).attr( `qty` ) * 1;
      const option = $( this ).attr( `option-selected` );
      const dpi = $( this ).attr( `dpi-warning` );
      const precut = $( this ).attr( `precut` );
      const width = $( this ).attr( `w` );
      const height = $( this ).attr( `h` );
      const size = $( this ).attr( `size` );
      const popSize = $( this ).attr( `pop-size` ) || "";
      const properties = {};

      let orderOptionParams = ``;
      try {
        const live = getToggleOptionParams(); // single
        if (typeof live !== 'undefined' && live) {
          orderOptionParams = live;
        } else if (typeof fileDetail.currentOptions !== 'undefined' && fileDetail.currentOptions) {
          orderOptionParams = fileDetail.currentOptions;
        }
      } catch (err) {
        console.log('ERROR building order params (single):', err.message);
        if (typeof fileDetail.currentOptions !== 'undefined' && fileDetail.currentOptions) {
          orderOptionParams = fileDetail.currentOptions;
        }
      }

      const orderProperty = parseOrderString(
        fileDetail.imgIxFile,
        fileDetail.originalFile,
        fileDetail.order,
        orderOptionParams
      );

      if ( typeof orderProperty !== 'undefined' && orderProperty ) {
        if ( orderProperty.imgIx ) {
          properties['Upload (Vector Files Preferred)'] = `${ orderProperty.imgIx_params != '' ? orderProperty.imgIx_params : `` }`;
          console.log("designtype: ",designtype, " :grt_photo_id:",grt_photo_id);
          if(designtype && _ntIsValidOrderRef(grt_photo_id)){
            properties['design re-used'] = `${grt_photo_id}`;
            designtype = ordername = "";
          }
          if(designtype == 1 && _ntIsValidOrderRef(ordername)){
            properties['design re-used'] = `previously on order # ${ordername}`;
            designtype = ordername = "";
          }
        }
        if ( orderProperty.s3 ) {
          if ( typeof fileDetail.isReadyToPress !== 'undefined' && fileDetail.isReadyToPress == 'Yes' ) {
            properties['Upload (Vector Files Preferred)'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
          } else {
            // For AI edits, preserve the user's original upload in _Original Image.
            if (
              typeof fileDetail.isAIEdit !== 'undefined' && fileDetail.isAIEdit &&
              typeof fileDetail.originalUploadReference !== 'undefined' && fileDetail.originalUploadReference
            ) {
              properties['_Original Image'] = fileDetail.originalUploadReference;
            } else {
              properties['_Original Image'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
            }
          }
          if(designtype == 1 && _ntIsValidOrderRef(ordername)){
            properties['design re-used'] = `previously on order # ${ordername}`;
            designtype = ordername = "";
          }
        }
      }
      // properties['_cartImg'] = removeWandHParams( `${ fileDetail.imgIxFile }?${ fileDetail.cart }${ fileDetail.currentOptions }` );
      // properties['_cartImg'] = `${ fileDetail.imgIxFile }?${ fileDetail.cart }${ typeof fileDetail.currentOptions !== 'undefined' && fileDetail.currentOptions ? fileDetail.currentOptions : `` }`;

      // Prefer live toggle state for bg-remove / upscale in cart image URL
      let cartOptionParams = ``;
      try {
        const optionParams = getToggleOptionParams(); // uses uploadType == 'single'
        if ( typeof optionParams !== 'undefined' && optionParams ) {
          cartOptionParams = optionParams;
        } else if ( typeof fileDetail.currentOptions !== 'undefined' && fileDetail.currentOptions ) {
          cartOptionParams = fileDetail.currentOptions;
        }
      } catch (err) {
        console.log('ERROR building _cartImg options (single):', err.message);
        if ( typeof fileDetail.currentOptions !== 'undefined' && fileDetail.currentOptions ) {
          cartOptionParams = fileDetail.currentOptions;
        }
      }

      properties['_cartImg'] = `${ fileDetail.imgIxFile }?${ fileDetail.cart }${ cartOptionParams }`;

      if ( typeof bgRemover !== 'undefined' && bgRemover ) {
        properties['Remove Background'] = 'Yes';
      }else{
        properties['Remove Background'] = 'No';
      }
      if ( typeof superRes !== 'undefined' && superRes ) {
        properties['Super Resolution'] = 'Yes';
      }else{
        properties['Super Resolution'] = 'No';
      }
      if ( typeof designNote !== 'undefined' && designNote ) {
        properties['Design Notes'] = designNote;
      }
      if ( dpi != '' ) {
        properties[`DPI Warning`] = dpi;
      }

      if ( option == 'popular' && popSize != '' ) {
        properties[`_pop size`] = popSize;
      }
      if ( precut != '' ) {
        properties['Precut'] = precut;
      }
      if ( option == 'custom' ) {
        properties['_width'] = width;
        properties['_height'] = height;
      } else if ( option == 'popular' ) {
        properties['_width'] = width;
        properties['_height'] = height;
      }
      // properties['_Size'] = size;

      if ( typeof discountInputProperty !== 'undefined' && discountInputProperty ) {
        properties['_discount_input'] = discountInputProperty;
      }
      if ( typeof discountNameProperty !== 'undefined' && discountNameProperty ) {
        properties['_discount_name'] = discountNameProperty;
      }
      if ( typeof fileDetail.isReadyToPress !== 'undefined' && fileDetail.isReadyToPress == 'Yes' ) {
        properties['_Ready to Press'] = fileDetail.isReadyToPress;
      }
      if ( typeof fileDetail.isDesignStudio !== 'undefined' && fileDetail.isDesignStudio == 'Yes' ) {
        properties['_Design Studio'] = fileDetail.isDesignStudio;
      }
      if ( typeof fileDetail.isAIImage !== 'undefined' && fileDetail.isAIImage ) {
        properties['AI Created'] = 'Yes';
      }

      if ( typeof fileDetail.isAIEdit !== 'undefined' && fileDetail.isAIEdit ) {
        properties['AI Edit'] = 'Yes';
      }

      items.push({
        id: VID,
        quantity: qty,
        properties
      });
    })
    
    if ( items.length > 0 ) {
      const attributes = '';
      $( `body` )
      .append( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
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
      refreshCart( `notOpen` );
      updateCartItemCount();
      loadCartItemsCount();
      flushSingleFileData();

      if ( act == `checkout` ) {
        location.href = `/cart`;
        return;
      }
      toast( `title`, `Product Added to cart`);
      $( `html, body` ).animate({scrollTop: $( `upload-controls` ).offset().top-150}, 100);
      $( `.loadingScreen__` ).remove();
    }
  } catch ( err ) {
    console.log( `ERROR singleFileAddToCart()`, err.message );
  }
}


async function multiFilesAddToCart() {
  try {
    let items = [];
    const uploadControl = $( `multi-upload` );
    let $invalidPopularSelect = $();
    uploadControl.find( `uploaded-files-block` ).each(function() {
      const $block = $( this );
      const currentSelectionMode = $block.find( `tab-controls .tabOptionName:checked` ).val() || `unknown`;
      if ( currentSelectionMode == `popular` ) {
        const $popularSelect = $block.find( `sizes-blocks line-items-popular .widthHeight__custom[item] .popularSizes` ).first();
        const popularValue = $popularSelect.val();
        if ( !$popularSelect.length || typeof popularValue === 'undefined' || popularValue === null || `${ popularValue }`.trim() === `` ) {
          $invalidPopularSelect = $popularSelect;
          return false;
        }
      }
    });

    if ( $invalidPopularSelect.length > 0 ) {
      $invalidPopularSelect.addClass( `error` ).css({
        "border": "1px solid #FF0000",
        "outline": "1px solid #FF0000",
        "box-shadow": "none"
      });
      if ( $invalidPopularSelect.siblings( `.popularSizes_error` ).length === 0 ) {
        $invalidPopularSelect.after( `<div class="popularSizes_error" style="display:block;color:#FF0000;font-size:12px;font-weight:500;margin-top:6px;">Please select a popular size.</div>` );
      }
      $invalidPopularSelect.trigger( `focus` );
      return;
    }

    const discountInputProperty = uploadControl.find( `prices-table discount-properties` ).attr( `discount-input` );
    const discountNameProperty = uploadControl.find( `prices-table discount-properties` ).attr( `discount-name` );
    $($( `multi-upload sizes-blocks .widthHeight__custom[item]` ).get().reverse()).each(function( i ) {
      // Keep each multi-upload block independent: include hidden-side rows only if that same block was edited.
      const $block = $( this ).closest( `uploaded-files-block` );
      const $sizesBlock = $block.find( `sizes-blocks` );
      const activeMode = $block.find( `tab-controls .tabOptionName:checked` ).val() || `custom`;
      const hasCustomEdit = $sizesBlock.hasClass( `has-custom-edit` );
      const hasPopularEdit = $sizesBlock.hasClass( `has-popular-edit` );
      const blockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
      const fileDetail = getFileDetailsFunction( blockNo );
      const VID = $( this ).attr( `vid` ) * 1;
      const qty = $( this ).attr( `qty` ) * 1;
      const option = $( this ).attr( `option-selected` );
      const shouldIncludeRow = option == activeMode
        || ( activeMode == `popular` && option == `custom` && hasCustomEdit )
        || ( activeMode == `custom` && option == `popular` && hasPopularEdit );
      if ( shouldIncludeRow === false ) {
        return;
      }
      const dpi = $( this ).attr( `dpi-warning` );
      const precut = $( this ).attr( `precut` );
      const width = $( this ).attr( `w` );
      const height = $( this ).attr( `h` );
      const size = $( this ).attr( `size` );
      const popSize = $( this ).attr( `pop-size` ) || "";

      const bgRemover = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .bgRemover .toggleOption` ).is( `:checked` );
      const superRes = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .superRes .toggleOption` ).is( `:checked` );
      // Per-upload .nt-design-note lives inside this block-no's
      // uploaded-files-block. Scope the selector to the current upload
      // first; fall back to any unscoped .nt-design-note (single-upload
      // page mode); fall back to legacy <designer-notes>; default to ''.
      const designNote = (
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] .nt-design-note textarea[name="properties[Design Notes]"]` ).val()
        || $( '.nt-design-note textarea[name="properties[Design Notes]"]' ).first().val()
        || $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] designer-notes .designNotes` ).val()
        || ''
      ).trim();
      const properties = {};

      const orderProperty = parseOrderString( fileDetail.imgIxFile, fileDetail.originalFile, fileDetail.order, fileDetail.currentOptions );
      if ( typeof orderProperty !== 'undefined' && orderProperty ) {
        if ( orderProperty.imgIx ) {
          properties['Upload (Vector Files Preferred)'] = `${ orderProperty.imgIx_params != '' ? orderProperty.imgIx_params : `` }`;
          console.log("designtype: ",designtype, " :grt_photo_id:",grt_photo_id);
          if(designtype && _ntIsValidOrderRef(grt_photo_id)){
            properties['design re-used'] = `${grt_photo_id}`;
            designtype = ordername = "";
          }
          if(designtype == 1 && _ntIsValidOrderRef(ordername)){
            properties['design re-used'] = `previously on order # ${ordername}`;
            designtype = ordername = "";
          }
        }
        if ( orderProperty.s3 ) {
          if ( typeof fileDetail.isReadyToPress !== 'undefined' && fileDetail.isReadyToPress == 'Yes' ) {
            properties['Upload (Vector Files Preferred)'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
            console.log("designtype: ",designtype, " :grt_photo_id:",grt_photo_id);
            if(designtype && _ntIsValidOrderRef(grt_photo_id)){
              properties['design re-used'] = `${grt_photo_id}`;
              designtype = ordername = "";
            }
            if(designtype == 1 && _ntIsValidOrderRef(ordername)){
              properties['design re-used'] = `previously on order # ${ordername}`;
              designtype = ordername = "";
            }
          } else {
            if (
              typeof fileDetail.isAIEdit !== 'undefined' && fileDetail.isAIEdit &&
              typeof fileDetail.originalUploadReference !== 'undefined' && fileDetail.originalUploadReference
            ) {
              properties['_Original Image'] = fileDetail.originalUploadReference;
            } else {
              properties['_Original Image'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
            }
          }
        }
      }

      // properties['_cartImg'] = removeWandHParams( `${ fileDetail.imgIxFile }?${ fileDetail.cart }${ fileDetail.currentOptions }` );
      properties['_cartImg'] = `${ fileDetail.imgIxFile }?${ fileDetail.cart }${ typeof fileDetail.currentOptions !== 'undefined' && fileDetail.currentOptions ? fileDetail.currentOptions : `` }`;
      if ( typeof bgRemover !== 'undefined' && bgRemover ) {
        properties['Remove Background'] = 'Yes';
      }
      if ( typeof superRes !== 'undefined' && superRes ) {
        properties['Super Resolution'] = 'Yes';
      }
      if ( typeof designNote !== 'undefined' && designNote ) {
        properties['Design Notes'] = designNote;
      }
      if ( dpi != '' ) {
        properties[`DPI Warning`] = dpi;
      }

      if ( popSize != '' ){
        properties[`_pop size`] = popSize;
      }

      if ( precut != '' ) {
        properties['Precut'] = precut;
      }
      if ( option == 'custom' ) {
        properties['_width'] = width;
        properties['_height'] = height;
      } else {
        if ( typeof width !== 'undefined' && width ) {
          properties['_width'] = width;
        }
        if ( typeof height !== 'undefined' && height ) {
          properties['_height'] = height;
        }
      }

      // properties['_Size'] = size;

      if ( typeof discountInputProperty !== 'undefined' && discountInputProperty ) {
        properties['_discount_input'] = discountInputProperty;
      }
      if ( typeof discountNameProperty !== 'undefined' && discountNameProperty ) {
        properties['_discount_name'] = discountNameProperty;
      }
      if ( typeof fileDetail.isReadyToPress !== 'undefined' && fileDetail.isReadyToPress == 'Yes' ) {
        properties['_Ready to Press'] = fileDetail.isReadyToPress;
      }
      if ( typeof fileDetail.isAIImage !== 'undefined' && fileDetail.isAIImage ) {
        properties['AI Created'] = 'Yes';
      }

      if ( typeof fileDetail.isAIEdit !== 'undefined' && fileDetail.isAIEdit ) {
        properties['AI Edit'] = 'Yes';
      }

      items.push({
        id: VID,
        quantity: qty,
        properties
      });
    })

    if ( items.length > 0 ) {
      console.log ( 'items', items );
      const attributes = '';
      $( `body` )
      .append( `
        <div class="loadingScreen__">
          <img src="${ loaderGif }">
        </div>
      ` );
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
      refreshCart( `notOpen` );
      updateCartItemCount();
      loadCartItemsCount();
      flushSingleFileData();

      location.href = `/cart`;
      await addDelay( 3000 );
      $( `.loadingScreen__` ).remove();
    }
  } catch ( err ) {
    console.log( `ERROR multiFilesAddToCart()`, err.message );
  }
}

async function loadCartItemsCount() {
  try {
    const res = await getRequest( `${ productURL }?view=itemsInCart__cumulative` );
    if ( typeof res !== 'undefined' && res ) {
      if ( uploadType == 'single' ) {
        $( `upload-controls prices-table` ).attr( `already-in-cart`, `${ res.count }` );
      } else if ( uploadType == 'multi' ) {
        $( `multi-upload prices-table` ).attr( `already-in-cart`, `${ res.count }` );
      }
    }
  } catch ( err ) {
    console.log( `ERROR loadCartItemsCount()`, err.message );
  }
}


function removeWandHParams( query ) {
  try {
    let params = new URLSearchParams(query);
    // Delete 'w' and 'h' if they exist
    params.delete('w');
    params.delete('h');

    // Get the updated query string
    return params.toString();
  } catch ( err ) {
    console.log( `ERROR removeWandHParams( url )`, err.message );
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

function parseOrderString( imgIxURL, s3URL, order, selectedOptions = `` ) {
  const result = {
    imgIx: false,
    imgIx_params: "",
    s3: false,
    s3_params: ""
  };

  const parts = order.split( `&&` );

  // Normalize selectedOptions (remove leading ? or &)
  selectedOptions = selectedOptions.replace(/^[?&]+/, "");

  // Helper to normalize part like [imgIx]trim=true -> [imgIx]?trim=true
  const normalizePart = ( part ) => {
    return part.replace(/^(\[(?:imgIx|s3|both_imgix|both_s3)\])([^?].+)/i, '$1?$2');
  };

  // Helper to build full URL
  const buildUrl = ( baseURL, rawParams, appendSelected ) => {
    let url = baseURL;

    if ( rawParams ) {
      url += rawParams;
    }

    if ( appendSelected && selectedOptions ) {
      if ( rawParams.includes( `?` ) ) {
        url += `&` + selectedOptions;
      } else {
        url += `?` + selectedOptions;
      }
    }

    return url;
  };

  parts.forEach(rawPart => {
    const part = normalizePart( rawPart.trim() );
    const match = part.match(/\[(imgIx|s3|both_imgix|both_s3)\](\?[^\s]*)?/i);
    if ( match ) {
      const key = match[1].toLowerCase();
      const rawParams = match[2]?.trim() || "";

      if ( key === `imgix` ) {
        result.imgIx = true;
        result.imgIx_params = buildUrl(imgIxURL, rawParams, true);
      } else if ( key === `s3` ) {
        result.s3 = true;
        result.s3_params = buildUrl(s3URL, rawParams, false);
      } else if ( key === `both_imgix` ) {
        result.imgIx = true;
        result.s3 = true;
        result.imgIx_params = buildUrl(imgIxURL, rawParams, true);
        result.s3_params = buildUrl(imgIxURL, rawParams, true);
      } else if ( key === `both_s3` ) {
        result.imgIx = true;
        result.s3 = true;
        result.imgIx_params = buildUrl(s3URL, rawParams, false);
        result.s3_params = buildUrl(s3URL, rawParams, false);
      }
    }
  });

  return result;
}






async function pricesTable() {
  try {
//    console.log ( 'pricesTable()' );
    if ( uploadType == 'single' ) {
      const unitPrice = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `price` ) * 1;

      // console.log ( 'pricesTable() unitPrice', unitPrice );


      $( `upload-controls prices-table .pricesTable__items .pricesTable__item` ).each(function(i) {
        let offPercent = $( this ).attr( `off` ) * 1;
        let getOff = 1;
        if ( offPercent == '' || offPercent == 0 ) {
          offPercent = 1;
        } else {
          getOff = ( 100 - offPercent ) / 100;
        }
        if (Number.isNaN(unitPrice)) {
          $( this ).find( `.pricesTable__item_2 discount` ).text( `0.00` );
        } else {
          $( this ).find( `.pricesTable__item_2 discount` ).text( ( unitPrice * getOff ).toFixed( 2 ) );
        }
      })

      // vivid price
      setTimeout(function(){
        var pprice_val = $( `.pricesTable__items .pricesTable__item.selected discount`).text() * 1;
        if(pprice_val == 0){
          pprice_val = matched_variant.price * 1
        }
        vivid_price(pprice_val.toFixed(2));
      })
    } else if ( uploadType == 'multi' ) {
    }
  } catch ( err ) {
    console.log( `ERROR pricesTable()`, err.message );
  }
}

function updatePreviewBoxSizes() {
  try {
    if ( uploadType == 'single' ) {
      let activeTab = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
      const isRowAvailable = $( `upload-controls sizes-blocks .widthHeight__custom[option-selected="${ activeTab }"]` ).length;
      if ( isRowAvailable > 0 ) {
        const w = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `w` );
        let h = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `h` );
        if ( activeTab == 'custom' ) {
          h = `${ h }"`;
        } else if ( activeTab == 'popular' ) {
          //h = `Proportional Height`;
          if(typeof h == "undefined")
            h = `Proportional Height`;
          else
            h = `${ h }"`;
        }
        $( `upload-controls preview-box .horizontal_direction` ).attr( `x-is`, w );
        $( `upload-controls preview-box .verticle_direction` ).attr( `y-is`, h );
      }
    } else if ( uploadType == 'multi' ) {
      let activeTab = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
      const isRowAvailable = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[option-selected="${ activeTab }"]` ).length;
      if ( isRowAvailable > 0 ) {
        const w = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `w` );
        let h = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `h` );
        if ( activeTab == 'custom' ) {
          h = `${ h }"`;
        } else if ( activeTab == 'popular' ) {
          if ( typeof h == 'undefined' ) {
            h = `Proportional Height`;
          } else {
            h = `${ h }"`;
          }
          // h = `Proportional Height`;
        }
        $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .horizontal_direction` ).attr( `x-is`, w );
        $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .verticle_direction` ).attr( `y-is`, h );
      }
    }
  } catch ( err ) {
    console.log( `ERROR updatePreviewBoxSizes()`, err.message );
  }
}

var matched_variant = "";
function pricesTableSelectedBar() {
  try {
    console.log ( 'pricesTableSelectedBar()',  );
    if ( uploadType == 'single' ) {
      var $table = $( `upload-controls prices-table` );
      var totalQty = parseInt($table.attr( `current-qty-plus-cart-qty` ), 10);
      let selectedIndex;

      console.log ( 'totalQty', totalQty );

      $table.find( `.pricesTable__items .pricesTable__item` ).each(function () {
        const min     = $( this ).attr( `min` ) * 1;
        const max     = $( this ).attr( `max` ) * 1;
        const indexNo = $( this ).attr( `index` ) * 1;
        if ( totalQty >= min && totalQty <= max ) {
          selectedIndex = indexNo;
        }
      });
      if ( typeof selectedIndex !== 'undefined' && selectedIndex ) {
        $table.find( `.pricesTable__items .pricesTable__item` ).removeClass( `selected` );
        $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"]` ).addClass( `selected` );
      }

      const lastIndexNo = $table.find( `.pricesTable__items .pricesTable__item` ).last().attr( `index` ) * 1;
      const isLastMinumum = $table.find( `.pricesTable__items .pricesTable__item` ).last().attr( `min` ) * 1;

      if ( lastIndexNo == selectedIndex ) {
        const maxQtyMsg = $table.attr( `max-qty-msg` );
        $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"] .pricesTable__item__msg` ).html( maxQtyMsg );
      } else {
        let rowMsg = $table.attr( `items-msg` );
        const CumulativeQty = getCumulativeQty();
        if ( rowMsg.includes( `[QTY]` ) ) {
          rowMsg = rowMsg.replace( `[QTY]`, CumulativeQty );
        }
        if ( rowMsg.includes( `[NEXT_DISCOUNT]` ) ) {
          const nextOff = $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"]` ).attr( `next-off` );
          if ( typeof nextOff !== 'undefined' && nextOff ) {
            rowMsg = rowMsg.replace( `[NEXT_DISCOUNT]`, `${ nextOff }% off` );
          }
        }
        console.log ( 'CumulativeQty', CumulativeQty, `isLastMinumum`, isLastMinumum );
        $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"] .pricesTable__item__msg` ).html( rowMsg );
      }

    } else if ( uploadType == 'multi' ) {
      var $table = $( `multi-upload prices-table` );
      var totalQty = parseInt($table.attr( `current-qty-plus-cart-qty` ), 10);
      let selectedIndex;

      console.log ( 'totalQty', totalQty );

      $table.find( `.pricesTable__items .pricesTable__item` ).each(function () {
        const min     = $( this ).attr( `min` ) * 1;
        const max     = $( this ).attr( `max` ) * 1;
        const indexNo = $( this ).attr( `index` ) * 1;
        if ( totalQty >= min && totalQty <= max ) {
          selectedIndex = indexNo;
        }
      });
      if ( typeof selectedIndex !== 'undefined' && selectedIndex ) {
        $table.find( `.pricesTable__items .pricesTable__item` ).removeClass( `selected` );
        $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"]` ).addClass( `selected` );
      }

      const lastIndexNo = $table.find( `.pricesTable__items .pricesTable__item` ).last().attr( `index` ) * 1;
      const isLastMinumum = $table.find( `.pricesTable__items .pricesTable__item` ).last().attr( `min` ) * 1;

      if ( lastIndexNo == selectedIndex ) {
        const maxQtyMsg = $table.attr( `max-qty-msg` );
        $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"] .pricesTable__item__msg` ).html( maxQtyMsg );
      } else {
        let rowMsg = $table.attr( `items-msg` );
        const CumulativeQty = getCumulativeQty();
        if ( rowMsg.includes( `[QTY]` ) ) {
          rowMsg = rowMsg.replace( `[QTY]`, CumulativeQty );
        }
        if ( rowMsg.includes( `[NEXT_DISCOUNT]` ) ) {
          const nextOff = $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"]` ).attr( `next-off` );
          if ( typeof nextOff !== 'undefined' && nextOff ) {
            rowMsg = rowMsg.replace( `[NEXT_DISCOUNT]`, `${ nextOff }% off` );
          }
        }
        console.log ( 'CumulativeQty', CumulativeQty, `isLastMinumum`, isLastMinumum );
        $table.find( `.pricesTable__items .pricesTable__item[index="${ selectedIndex }"] .pricesTable__item__msg` ).html( rowMsg );
      }
    }
  } catch ( err ) {
    console.log( `ERROR pricesTableSelectedBar()`, err.message );
  }
}



function getNewRatio( selector, by, width, height ) {
  let getWidth = $( selector ).width() * 1;
  let getHeight = $( selector ).height() * 1;

  if ( width && height ) {
    getWidth = width;
    getHeight = height;
  }

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
function removeFile(e = "") {
  isFileUpload = false;
  isReadyToPress = false;
  fileInput.value = '';
  counter = 0;
  fileProcessBar( 'reset' );
  uploadedFileCounter.innerHTML = `0%`;
  $(".customTabelPopup__overlay-2").fadeOut(500);
};


function fileProcessBar( act ) {
  try {
    if ( act == 'start' ) {
      // uploadArea.classList.add('upload-area--open');
      // loadingText.style.display = "none";
      // fileDetails.classList.add('file-details--open');
      // uploadedFile.classList.add('uploaded-file--open');
      // uploadedFileInfo.classList.add('uploaded-file__info--active');
    } else if ( act == 'reset' ) {
      $( `#fileupload_custom` ).hide();
      $( `upload-controls file-preview #fileupload_hero, file-preview .viewer-box` ).attr( `src`, transpareImg );
      uploadArea.classList.remove('upload-area--open');
      loadingText.style.display = `block`;
      fileDetails.classList.remove('file-details--open');
      uploadedFile.classList.remove('uploaded-file--open');
      uploadedFileInfo.classList.remove('uploaded-file__info--active');
      uploadArea.classList.remove( `hidden` );
      aiImgGenerator.classList.remove( `hidden` );
    }
  } catch ( err ) {
    console.log( `ERROR fileProcessBar()`, err.message );
  }
}



function getFileExt( fileName ) {
  try {
    let fileExt = fileName.split('.').pop();
    fileExt = fileExt.toLowerCase();
    if ( fileExt == 'jpeg' ) {
      fileExt = 'jpg';
    } else if ( fileExt == 'tiff' ) {
      fileExt = 'tif';
    }
    return fileExt;
  } catch ( err ) {
    console.log( `ERROR getFileExt( fileName )`, err.message );
  }
}


function fileValidate(fileType, fileSize, file) {
  let isImage = imagesTypesNew.filter((type) => fileType.indexOf(`${type}`) !== -1);
  // If The Uploaded File Is An Image
  if (isImage.length !== 0 ) {
    // Check, If File Size Is 2MB or Less
    if (fileSize <= 5368709120) { // 2MB :)
      return true;
    } else { // Else File Size
      return false;
    };
  } else { // Else File Type
    return false
  }
}
async function getPresignedUploadUrl( file_name, file_type ) {
  try {
    let rtn;
    await $.get(`${ apiURL }/uploads/getPresignedUploadUrl?file_name=${ encodeURIComponent( file_name ) }&file_type=${ encodeURIComponent( file_type ) }`, function ( res ) {
      rtn   =   res;
    });
    return rtn;
  } catch ( err ) {
    console.log( `ERROR getPresignedUploadUrl`, err.message );
  }
}
async function getAsByteArray(file) {
  return new Uint8Array(await readFile(file));
}
async function makeCRC( file ) {
  try {
    const byteArr = await getAsByteArray( file );
    file_crc = (CRC32.buf(byteArr)>>>0).toString(16);
    return file_crc;
  }
  catch (error) {
    console.log("Unable to calculate file crc: " + error)
  }
}
function readFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.addEventListener("loadend", (e) => resolve(e.target.result));
    reader.addEventListener("error", reject);
    reader.readAsArrayBuffer(file);
  });
}

async function sendApiRequest( file_url, s3Key ) {
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

function showAlert( e, cls ){
  e.preventDefault();
  $( `.warning-message-custom` ).addClass( cls );
  setTimeout(function(){
    $( `.warning-message-custom` ).removeClass( cls );
    if ( cls == `another_alert_by_size` ) {
      $( `[href='#purchased_files_gang_sheet']` ).removeClass( `active` );
      $( `[href='#purchased_files_by_size']` ).addClass( `active` );
    } else {
      $( `[href='#purchased_files_gang_sheet']` ).addClass( `active` );
      $( `[href='#purchased_files_by_size']` ).removeClass( `active` );
    }
  }, 1000);
  return false;
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
  console.log("ratio_width=ratio_height",ratio_width,ratio_height);
}

function ratioBy(type, w, h) {
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

function getRadioMaintainImg( by,width,height ) {
  try {

    const widthVal  = parseFloat(width);
    const heightVal = parseFloat(height);

    const getWidth  = ratioBy( 'w', widthVal, heightVal );
    const getHeight = ratioBy( 'h', widthVal, heightVal );

    if ( by == 'width' ) {
      return roundOffNumbers(getHeight.toString());
    } else if ( by == 'height' ) {
      return roundOffNumbers(getWidth.toString());
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

function calculateratioForImage() {
  let w       = document.querySelector( `.widthHeight__custom[item="1"] .widthHeight__value[name="width__value"]` ).value;
  let h      = document.querySelector( `.widthHeight__custom[item="1"] .widthHeight__value[name="height__value"]` ).value;

  let _w = Number(w.split(".")[1]);
  let _h = Number(h.split(".")[1]);
  w = roundOffNumbers(w);
  h = roundOffNumbers(h);
   //alert(w+"--"+h);
let isUVProduct = false;
if(document.body.classList.contains("template-product-uv-dtf-by-size"))
  isUVProduct = true;

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
  $(".dtf_body_image_labels").css({"opacity":1});
}
let aiJobAbortController = null;
let aiJobCancelled = false;

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
  $(".ai-action-box .use__original").hide();

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



function getCurrentPreviewImageUrl() {
  try {
    // When using single upload
    if (typeof uploadType !== 'undefined' && uploadType === 'single') {
      const src1 = $(`upload-controls preview-box .fileupload_hero`).attr('src');
      if (src1) return src1;

      // fallback if #fileupload_hero is directly on page
      const src2 = $(`#fileupload_hero`).attr('src');
      if (src2) return src2;
    }

    // When using multi upload (use currently selected block)
    if (typeof uploadType !== 'undefined' && uploadType === 'multi') {
      if (typeof selectedBlockNo !== 'undefined' && selectedBlockNo) {
        const src3 = $(`multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`).attr('src');
        if (src3) return src3;
      }
    }

    return '';
  } catch (err) {
    console.log('ERROR getCurrentPreviewImageUrl()', err.message);
    return '';
  }
}



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
      const $uploadedBlock = $(this).closest('uploaded-files-block');
      const isMultiUpload = $uploadedBlock.length > 0;

      if (isMultiUpload) {
        selectedBlockNo = $uploadedBlock.attr('block-no');

        const $customItem = $uploadedBlock
          .find('line-items-custom .widthHeight__custom')
          .first();

        if ($customItem.length > 0) {
          selectedItemNo = $customItem.attr('item');
        } else {
          selectedItemNo = $uploadedBlock
            .find('line-items-popular .widthHeight__custom')
            .first()
            .attr('item');
        }
      }

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
   //   $btn.html(originalBtnText);
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
        const $btn = $(this);
        const $aiPrompt_2 = $('#ai_prompt_2');
        const $status = $('#ai_status_message');
        let isSuccess = false;
        $('.ai-container').removeClass('_success');
        setAIState(AI_STATES.PROCESSING); 
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
           // $btn.html(originalBtnText);
          } else {
            $btn.prop('disabled', true);
            $aiPrompt_2.prop('disabled', false);
            $btn.data('busy', '0');
          //  const originalBtnText = decodeHTML($btn.data('original-text')) || 'Edit Image';
           // $btn.html(originalBtnText);
           // $('#ai_prompt_2').val("");
          }
        }
      });

  } catch (err) {
    console.log('ERROR init ai_generate_image_2 handler', err.message);
  }
});

function enableBgRemoveAfterAI() {
  const $bg = $('#bgRemover');

  if (!$bg.length) return;

  // Force ON
  if (!$bg.is(':checked')) {
    $bg.prop('checked', true);
  }

  // 🔥 IMPORTANT: re-trigger its logic
  $bg.trigger('change');
}

$(document).on('click', '#use_ai_image', async function () {
  const $btn = $(this);
  const $status = $('#ai_status_message');
  let isSuccess = false;

  console.log ( 'uploadtype', uploadType, 'selectedBlockNo', selectedBlockNo);

  try {
    // LOCK POPUP
    $('.customTabelPopup__overlay-ai').addClass('ai-overlay-locked');

    const aiImageUrl = $('#ai_image_preview').attr('src');
    if (!aiImageUrl) {
    //  $status.show().text('Please generate an AI image first.');
      return;
    }

    const originalBtnText = $btn.data('original-text') || $btn.html();
    $btn.data('original-text', originalBtnText);
    $btn.prop('disabled', true);
    $btn.html('Applying...');
   // $status.show().text('Saving AI image and applying it to your design...');

    if ( typeof uploadType !== 'undefined' && uploadType === 'single' ) {
      let blockNo = 1;
      if (typeof uploadType !== 'undefined' && uploadType === 'multi' &&
          typeof selectedBlockNo !== 'undefined' && selectedBlockNo) {
        blockNo = selectedBlockNo;

        console.log ( 'uploadtype', uploadType, 'selectedBlockNo', selectedBlockNo);
      }

      const currentFileDetail = getFileDetailsFunction();
      const originalUploadReference = (
        currentFileDetail &&
        (currentFileDetail.originalUploadReference || currentFileDetail.originalFile)
      ) || '';
      const uploaded = await processFileOrUrl(aiImageUrl, blockNo);

      const fileDetail = {
        originalFile: uploaded.originalFile || aiImageUrl,        // keep S3 here for internal stuff
        imgIxFile: uploaded.imgIxFile || uploaded.originalFile || aiImageUrl,
        file_crc: uploaded.file_crc,
        fileName: uploaded.fileName || 'ai-image.png',
        fileURL: uploaded.originalFile || aiImageUrl,
        isAIEdit: true,
        originalUploadReference,
        aiOriginalUrl: aiImageUrl                                // 👉 nano-banana URL
      };

      if (typeof isAIImage !== 'undefined') isAIImage = true;

      await singleFileManageByURL(fileDetail);

    //  $status.show().text('AI image applied to your design.');
      isSuccess = true;
    } else if ( typeof uploadType !== 'undefined' && uploadType === 'multi') {
      if ( typeof selectedBlockNo !== 'undefined' && selectedBlockNo ) {
        if ( $( `uploaded-files-block[block-no="${ selectedBlockNo }"] toggle-options[show-bg-option="true"] .bgRemover .toggleOption` ).length > 0 ) {
          $( `uploaded-files-block[block-no="${ selectedBlockNo }"] toggle-options[show-bg-option="true"] .bgRemover .toggleOption` ).prop( 'checked', true );
          await addDelay( 200 );
        }
        const currentFileDetail = getFileDetailsFunction( selectedBlockNo );
        const originalUploadReference = (
          currentFileDetail &&
          (currentFileDetail.originalUploadReference || currentFileDetail.originalFile)
        ) || '';
        const uploaded = await processFileOrUrl(aiImageUrl, selectedBlockNo);
        console.log ( 'uploaded', uploaded );

        const fileDetail = {
          originalFile: uploaded.originalFile || aiImageUrl,        // keep S3 here for internal stuff
          imgIxFile: uploaded.imgIxFile || uploaded.originalFile || aiImageUrl,
          file_crc: uploaded.file_crc,
          fileName: uploaded.fileName || 'ai-image.png',
          fileURL: uploaded.originalFile || aiImageUrl,
          isAIEdit: true,
          originalUploadReference,
          aiOriginalUrl: aiImageUrl                                // 👉 nano-banana URL
        };

        const getFileDetail = getFileDetailsFunction( selectedBlockNo );

        const updatedObject = {...getFileDetail, ...fileDetail};

        const isUpdate = updateFileDetailsFunction( updatedObject, selectedBlockNo );
        if ( isUpdate ) {
          console.log ( 'Successfully Update' );
          $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] toggle-options .toggleOption` ).trigger( `change` );
        } else {
          console.log ( 'Unable to Update FileDetails' );
        }
        // addFilesASMultiBlock( file, filesCounter );
      }
    }

  } catch (err) {
    console.log('ERROR #use_ai_image click', err);
    $status.show().text('Error: ' + (err.message || 'Something went wrong while applying the AI image.'));
  } finally {

    // UNLOCK POPUP
    $('.customTabelPopup__overlay-ai').removeClass('ai-overlay-locked');
    $('.customTabelPopup__overlay-ai').hide();
    if (!isSuccess) {
      $btn.prop('disabled', false);
    } else {
      $btn.prop('disabled', true);
    }
    $btn.prop('disabled', false);
    if ( typeof uploadType !== 'undefined' && uploadType === 'single' ) {
      setTimeout(function(){
        enableBgRemoveAfterAI();
      },200);
    }

    const originalBtnText = $btn.data('original-text') || 'Apply AI Edit';
    $btn.html(originalBtnText);
    $("body").removeClass("lock-page");
  }
});


async function nanoBananaEditRequest(imageUrl, promptText) {
  aiJobCancelled = false;
  console.log ( 'promptText', promptText );
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
        'Authorization': AUTH_HEADER,
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

/* Close the Edit with AI modal. If the prompt textarea has any non-whitespace
   content, show the "Leave the AI Editor?" confirmation popup so the customer
   doesn't lose typed work. If the textarea is empty, close the modal directly —
   there's nothing to lose, so the warning is just friction. Used by both the
   backdrop click below and the inline X close button in login-popup-modal.liquid. */
window.closeEditWithAIPopup = function () {
  var prompt = document.getElementById('ai_prompt_2');
  var hasPrompt = !!(prompt && prompt.value && prompt.value.trim().length);
  if (hasPrompt) {
    document.querySelector('.customTabelPopup__overlay-12-2').style.display = 'grid';
  } else {
    document.body.classList.remove('lock-page');
    var ov = document.querySelector('.customTabelPopup__overlay-ai');
    if (ov) ov.style.display = 'none';
  }
};

$(".nj-popup").on("click", function(e){
  if (e.target !== this)
    return;
  if($(this).hasClass("customTabelPopup__overlay-ai")){
    window.closeEditWithAIPopup();
    return;
  }
  /* Skip the design-studio AI editor (-ai-2) and both "Leave the AI Editor?"
     confirmations (-12-2, -12-2-2) — they have dedicated handlers
     (closeEditWithAIPopup2 + the Exit/Cancel buttons inside) that gate
     closing on whether the user has unsaved prompt content. This generic
     $(this).hide() was clobbering those: clicking the AI-editor backdrop
     hid the editor at the same time the confirmation showed, so Cancel
     left the editor already gone. */
  if($(this).hasClass("customTabelPopup__overlay-ai-2") ||
     $(this).hasClass("customTabelPopup__overlay-12-2") ||
     $(this).hasClass("customTabelPopup__overlay-12-2-2")){
    if ($(this).hasClass("customTabelPopup__overlay-ai-2") && typeof window.closeEditWithAIPopup2 === 'function') {
      window.closeEditWithAIPopup2();
    }
    return;
  }
  $(this).hide();
  document.querySelector('body').classList.remove("lock-page");
});

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

function getProportionalSize(size, by, uploadedWidth, uploadedHeight) {
  let width, height, widthIn, heightIn;

  if (by === "width") {
    const ratio = size / uploadedWidth;
    width = size;
    height = parseFloat((uploadedHeight * ratio).toFixed(2));
  } else {
    const ratio = size / uploadedHeight;
    height = size;
    width = parseFloat((uploadedWidth * ratio).toFixed(2));
  }
  widthIn = (width/300).toFixed(2);
  heightIn = (height/300).toFixed(2);

  return { width, height, widthIn, heightIn };
}



