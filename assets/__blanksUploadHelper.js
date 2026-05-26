const apiURL = `https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production`;
// const apiURL = `https://7rfb214pth.execute-api.us-east-1.amazonaws.com/production`;
const baseAmazonUrl = `s3.amazonaws.com`;
const ninjaImgixHost = `ninjauploads-production.imgix.net`;
const ninjaS3Host2 = `ninja-services-production-ninjauploadss3bucket-pj1r4ls6dsdh.s3.amazonaws.com`;
const ninjaS3Host = `ninjauploads-production.imgix.net`;

let uploadArea;
let fileInput;
const productURL = `/products/dtf-transfers`;
selectedItemNo = 1;
let selectedBlockNo = 1;
var timeout__;
const AI_DAILY_LIMIT = 50;
const AI_STATES = {
  ORIGINAL: "original",
  PROCESSING: "processing",
  RESULT: "result",
  RESULT_ORG: "result-org"
};
let designtype = false;
let grt_photo_id = '';
const imgParamsSettings = [
  {
    "fileType": "png",
    "preview": "trim=colorUnlessAlpha&w=2000",
    "cart": "trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100",
    "order": "[imgIx]trim=colorUnlessAlpha",
    "bgRemover": true,
    "superRes": true,
    "byDefaultBgRemover": false,
    "byDefaultSuperRes": false
  },
  {
    "fileType": "jpg",
    "preview": "trim=colorUnlessAlpha&fm=png&w=2000",
    "cart": "trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100",
    "order": "[imgIx]trim=colorUnlessAlpha",
    "bgRemover": true,
    "superRes": true,
    "byDefaultBgRemover": true,
    "byDefaultSuperRes": false
  },
  {
    "fileType": "ai",
    "preview": "trim=colorUnlessAlpha&fm=png&w=2000",
    "cart": "trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100",
    "order": "[BOTH_S3]",
    "bgRemover": false,
    "superRes": false,
    "byDefaultBgRemover": false,
    "byDefaultSuperRes": false
  },
  {
    "fileType": "eps",
    "preview": "fm=png&w=2000",
    "cart": "trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100",
    "order": "[BOTH_S3]",
    "bgRemover": false,
    "superRes": false,
    "byDefaultBgRemover": false,
    "byDefaultSuperRes": false
  },
  {
    "fileType": "pdf",
    "preview": "trim=colorUnlessAlpha&fm=png&w=2000",
    "cart": "trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100",
    "order": "[BOTH_S3]",
    "bgRemover": false,
    "superRes": false,
    "byDefaultBgRemover": false,
    "byDefaultSuperRes": false
  },
  {
    "fileType": "tif",
    "preview": "trim=colorUnlessAlpha&w=2000",
    "cart": "trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100",
    "order": "[imgIx]fm=png",
    "bgRemover": true,
    "superRes": false,
    "byDefaultBgRemover": false,
    "byDefaultSuperRes": false
  },
  {
    "fileType": "svg",
    "preview": "trim=colorUnlessAlpha&fm=png&w=2000",
    "cart": "trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100",
    "order": "[BOTH_S3]",
    "bgRemover": false,
    "superRes": false,
    "byDefaultBgRemover": false,
    "byDefaultSuperRes": false
  }
]

function initBlanksUploadBox() {
  uploadArea = document.querySelector('.uploadBox .uploadBox__layout');
  fileInput = document.querySelector('.uploadBox #fileInput');
  if (!uploadArea || !fileInput) return;
  if (uploadArea.dataset.uploadBound === 'true') return;
  uploadArea.dataset.uploadBound = 'true';

  fileInput.addEventListener('change', async (e) => {
    manageFiles( e.target.files );
  });
  uploadArea.addEventListener('click', function (e) {
    // if ( $( e.target ).closest( `a` ).length > 0 ) {
    //   return;
    // }
    fileInput.click();
  });
  uploadArea.addEventListener('dragover', function (event) {
    event.preventDefault();

    uploadArea.classList.add('drop-zone--over');
  });
  uploadArea.addEventListener('dragleave', function (event) {
    uploadArea.classList.remove('drop-zone--over');
  });
  uploadArea.addEventListener('drop', function (event) {
    event.preventDefault();
    uploadArea.classList.remove('drop-zone--over');
    const files = event.dataTransfer.files;
    manageFiles( files );
  });
}

window.initBlanksUploadBox = initBlanksUploadBox;
initBlanksUploadBox();

// Bridge: My Designs picker selection → blanks multi-upload modal.
// The picker fires `md-picker:use-designs` with `{items: [{file, fileName, id}, ...]}`.
// We fetch each URL into a File and feed it through the existing
// multiFilesManage pipeline so designs appear as new blocks alongside
// any files the user already added — same UX as a fresh upload.
if (!window.__blanksMdPickerBridgeBound) {
  window.__blanksMdPickerBridgeBound = true;
  document.addEventListener('md-picker:use-designs', async function (e) {
    try {
      var items = (e.detail && e.detail.items) || [];
      if (!items.length) return;
      if (typeof multiFilesManage !== 'function') return;

      var overlay = document.querySelector('.customTabelPopup__overlay-3');
      if (overlay) overlay.style.setProperty('display', 'none', 'important');

      // Make sure the multi-upload modal exists (it gets created on first upload).
      // If user picks designs without uploading first, activateMultiupload sets it up.
      if (!document.querySelector('body multi-upload-wrapper') && typeof activateMultiupload === 'function') {
        await activateMultiupload();
      }

      var filesCounter = $(`multi-upload file-blocks-area uploaded-files-block`).length;
      var beforeUploadAvailableBlocks = filesCounter;

      for (var i = 0; i < items.length; i++) {
        var url = (items[i] && items[i].file) ? String(items[i].file) : '';
        if (!url) continue;
        if (url.indexOf('?') > -1) url = url.split('?')[0];
        if (typeof ninjaS3Host2 !== 'undefined' && typeof ninjaS3Host !== 'undefined') {
          url = url.split(ninjaS3Host2).join(ninjaS3Host);
        }

        try {
          var response = await fetch(url);
          if (!response.ok) continue;
          var blob = await response.blob();
          var nameFromUrl = items[i].fileName || url.split('/').pop();
          if (!nameFromUrl || !nameFromUrl.includes('.')) {
            nameFromUrl = 'design_' + Date.now() + '.png';
          }
          var file = new File([blob], nameFromUrl, { type: blob.type || 'image/png' });

          filesCounter++;
          await multiFilesManage(file, filesCounter);
        } catch (err) {
          console.log('ERROR fetching design from picker', url, err && err.message);
        }
      }

      // Scroll the multi-upload modal's scroll container so the first
      // newly-added block lands at the top of view. Direct scrollTop
      // animation on `multi-upload upload-area` (the actual scroll
      // container — confirmed via getComputedStyle: overflow-y auto,
      // scrollHeight > clientHeight) is more reliable here than
      // Element.scrollIntoView, which can no-op inside the fixed-position
      // modal wrapper.
      setTimeout(function () {
        var $newest = $(`multi-upload file-blocks-area uploaded-files-block`).eq(beforeUploadAvailableBlocks);
        var $ua = $(`multi-upload upload-area`);
        if ($newest.length && $ua.length) {
          $ua.animate({ scrollTop: $newest[0].offsetTop }, 500);
        }
      }, 500);
    } catch (err) {
      console.log('ERROR md-picker:use-designs (blanks)', err && err.message);
    }
  });
}

$(document)
.ready(function () {
  $( `#fileInput` ).val(``);
})
// ANOTHER UPLOAD START
.on(`click`, `multi-upload another-upload-multi`, function( e ) {
  try {
    // The "Choose a previously uploaded design" link lives inside the
    // dropzone (.access_old_data > .purchase_from_previous). Without
    // this guard, clicks on that link bubble up to here, get
    // stopImmediatePropagation()'d, and then fire the file input —
    // i.e. the user clicks "previous designs" and gets the native file
    // picker instead. Let the link's own handler take the click.
    if ( e.target.closest( `.access_old_data, .purchase_from_previous` ) ) {
      return;
    }
    e.stopImmediatePropagation();
    $( `#anotherFileMultiple` ).click();
  } catch ( err ) {
    console.log( `ERROR multi-upload another-upload-multi`, err.message );
  }
})
.on(`click`, `.purchase_from_previous`, function( e ) {
  try {
    e.preventDefault();
    e.stopImmediatePropagation();
    const $overlay = $( `.customTabelPopup__overlay-3` );
    if ( $overlay.length === 0 ) return;
    $overlay.attr( `data-type`, $( this ).data( `type` ) || `` );
    $overlay.fadeIn( 500 );
  } catch ( err ) {
    console.log( `ERROR .purchase_from_previous (blanks)`, err.message );
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
  } catch ( err ) {
    console.log( `ERROR multi-upload #anotherFileMultiple`, err.message );
  }
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
// ANOTHER UPLOAD END
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
// CUSTOM SIZE INCREASE DECREASE START
.on(`click`, `sizes-blocks .widthHeight__value-minus`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom` ).attr( `item` );
    const getVal = $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).val() * 1;
    const getStep = $( this ).closest( `.widthHeight__item_inputWrapper` ).find( `.widthHeight__value` ).attr( `step` ) * 1;

    if ( uploadType == 'multi' ) {
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
    if ( uploadType == 'multi' ) {
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
.on(`keyup`, `upload-controls sizes-blocks input[name="width__value"], upload-controls sizes-blocks input[name="height__value"], multi-upload sizes-blocks input[name="width__value"], multi-upload sizes-blocks input[name="height__value"]`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    if ( uploadType == 'multi' ) {
      $( `multi-upload .addToCartGroupItemsMultiple` ).addClass( `disabled` );
    }

    clearTimeout( timeout__ );
    timeout__ = setTimeout(() => {
      let isSizesBlock = $( `upload-controls sizes-blocks` ).length;
      if ( uploadType == 'multi' ) {
        isSizesBlock = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks` ).length;
      }
      if ( isSizesBlock > 0 ) {
        let dpiErr = false;
        const item = $( this ).closest( `.widthHeight__custom[item]` );
        const selectedOption__ = item.attr( `option-selected` );
        let getVal = $( this ).val() * 1;
        console.log ( 'getVal', getVal );
        let otherVal = 0;
        let by = $( this ).closest( `.widthHeight__item` ).attr( `by` );
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
        if ( definedMaxWidth == definedMaxHeight ) {
          largerDefinedVal = definedMaxWidth;
        } else if ( definedMaxWidth > definedMaxHeight ) {
          largerDefinedVal = definedMaxWidth;
        } else if ( definedMaxHeight > definedMaxWidth ) {
          largerDefinedVal = definedMaxHeight;
        }
        if ( getVal == otherVal && getVal > definedMaxWidth ) {
          console.log ( 'this condition true',  );
        }
        if ( by == 'width' && getVal > definedMaxWidth ) {
          $( this ).val( definedMaxWidth ).addClass( `error` );
          getVal = definedMaxWidth;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( by == 'height' && getVal > definedMaxHeight ) {
          $( this ).val( definedMaxHeight ).addClass( `error` );
          getVal = definedMaxHeight;
          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        }
        let getRatio;
        if ( uploadType == 'multi' ) {
          getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, by );
        }

        const newVal = calculateNewWidth_orNewHeight( getRatio, by, getVal );

        console.log ( 'newVal', newVal );

        if ( by == 'height' && newVal > definedMaxWidth ) {
          item.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( definedMaxWidth ).attr( `value`, definedMaxWidth ).addClass( `error` );

          let getRatio;
          if ( uploadType == 'multi' ) {
            getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, 'width' );
          }

          const newVal_ = calculateNewWidth_orNewHeight( getRatio, 'width', definedMaxWidth );
          console.log ( 'newVal_ H', newVal_ );
          item.find( `.widthHeight__item[by="${ by }"] .widthHeight__value` ).val( newVal_.toFixed( 2 ) ).attr( `value`, newVal_.toFixed( 2 ) ).addClass( `error` );

          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( by == 'width' && newVal > definedMaxHeight ) {
          item.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( definedMaxHeight ).attr( `value`, definedMaxHeight ).addClass( `error` );
          let getRatio;
          if ( uploadType == 'multi' ) {
            getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, 'height' );
          }
          const newVal_ = calculateNewWidth_orNewHeight( getRatio, 'height', definedMaxHeight );
          console.log ( 'newVal_ W', newVal_ );
          item.find( `.widthHeight__item[by="${ by }"] .widthHeight__value` ).val( newVal_.toFixed( 2 ) ).attr( `value`, newVal_.toFixed( 2 ) ).addClass( `error` );

          if ( isWarningErrorActive ) {
            item.find( `dpi-warning` ).removeClass( `active` );
            dpiErr = true;
          }
        } else if ( newVal < definedMinWidth ) {
          if ( by == 'width' ) {
            item.find( `.widthHeight__item[by="height"] .widthHeight__value` ).val( definedMinWidth ).attr( `value`, definedMinWidth ).addClass( `minError` );
            let getRatio;
            if ( uploadType == 'multi' ) {
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
            if ( uploadType == 'multi' ) {
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
          if ( uploadType == 'multi' ) {
            updatedWidth = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] input[name="width__value"]` ).val();
            updatedHeight = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] input[name="height__value"]` ).val();
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
              console.log ( 'matchedVariant', matchedVariant );
              matched_variant = matchedVariant;
              if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
                applyImgToPreviewBox( fileDetails, matchedVariant, false, selectedBlockNo, `no` );
              }
            }
            console.log ( 'fileDetails', fileDetails );
            if ( uploadType == 'multi' ) {
              $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr({
                "w": updatedWidth,
                "h": updatedHeight,
                "size": `${ updatedWidth }x${ updatedHeight }`
              });
            }
          }

          console.log ( 'updatedWidth', updatedWidth );
          console.log ( 'updatedHeight', updatedHeight );

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
      if ( uploadType == 'multi' ) {
        $( `multi-upload .addToCartGroupItemsMultiple` ).removeClass( `disabled` );
      }
      setActiveRow();
    }, 300);
  } catch ( err ) {
    console.log( `ERROR upload-controls input[name="width__value"], upload-controls input[name="height__value"]`, err.message );
  }
})
.on(`keyup`, `upload-controls sizes-blocks .customQtyFile__qty, multi-upload sizes-blocks .customQtyFile__qty`, function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    if ( uploadType == 'multi' ) {
      $( `multi-upload .addToCartGroupItemsMultiple` ).addClass( `disabled` );
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
      if ( uploadType == 'multi' ) {
        $( `multi-upload .addToCartGroupItemsMultiple` ).removeClass( `disabled` );
      }
      setActiveRow();
    }, 300);
  } catch ( err ) {
    console.log( `ERROR upload-controls sizes-blocks .customQtyFile__qty`, err.message );
  }
})
.on(`change`, `multi-upload tab-controls .tabOptionName`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
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
.on(`change`, `multi-upload sizes-blocks .popularSizes`,async function( e ) {
  try {
    e.stopPropagation();
    console.clear();

    console.log ( 'chaaaaaaa',  );

    const selectedVal = $(this).val();
    if (!selectedVal) return;

    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );

    console.log ( 'selectedBlockNo', selectedBlockNo );
    console.log ( 'selectedItemNo', selectedItemNo );

    const $row      = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` );

    // let activeOption = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
    let fileDetails = getFileDetailsFunction( selectedBlockNo );
    if ( typeof fileDetails !== 'undefined' && fileDetails ) {
      let largerIs = Math.ceil(fileDetails.fileWidth) >= Math.ceil(fileDetails.fileHeight) ? 'width' : 'height';
      // let largerIs =fileDetails.fileHeight ? 'width' : 'height';

      console.log ( 'fileDetails', fileDetails );

      console.log ( 'largerIs', largerIs );

      const matchedVariant = getMatchingVariant( fileDetails, selectedBlockNo );

      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        console.log ( 'matchedVariant', matchedVariant );

        if ( typeof smartSizing !== 'undefined' && smartSizing ) {
          console.log ( 'yes it is',  );
          let width  = 0;
          let height = 0;
          if ( matchedVariant && matchedVariant.option1_converted ) {
            const dim = getWidthHeight_popularSize( matchedVariant.option1_converted );
            if (dim) {
              width  = dim.width;
              height = dim.height;
            }
          }

          console.log ( 'width', width, 'height', height );

          let updatedDim = {};

          if ( largerIs == 'width' ) {
            console.log ( 'its by width', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
            updatedDim = getProportionalSize( width, 'width', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
          } else {
            console.log ( 'its by height', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
            updatedDim = getProportionalSize( height, 'height', Math.ceil(fileDetails.fileWidth), Math.ceil(fileDetails.fileHeight) );
          }

          width = updatedDim.width;
          height = updatedDim.height;

          console.log ( 'updatedDim', updatedDim );

          const $select = $(this);

          resetPopularOptionLabels($select);

          const $option = $select.find('option:selected');
          const originalLabel = $option.data('original-label') || $.trim($option.text());

          console.log ( 'originalLabel', originalLabel );

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

          console.log ( 'matchedPricingVariant', matchedPricingVariant );

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
// ADD SIZES ROW START
.on(`click`, `multi-upload .addmore_size`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'multi' ) {
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
// REMOVE ITEM START
.on(`click`, `multi-upload sizes-blocks .del_item_cta`, async function(e) {
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
// REMOVE ITEM END
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
.on(`click`, `file-remove-wrapper .fileRemoveBlock__removeFile, file-remove-wrapper-multi .fileRemoveBlock__removeFile`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'multi' ) {
      const totalBlocks = $( `multi-upload uploaded-files-block` ).length;
      if ( totalBlocks == 1 ) {
        $( `multi-upload-wrapper` ).remove();
        $( `file-remove-wrapper-multi` ).remove();
        uploadType = '';
      } else {
        $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"]` ).remove();
        resetItemNo();
        applyItemNo( 'custom', selectedBlockNo );
        $( `file-remove-wrapper-multi` ).remove();
      }
    }
  } catch ( err ) {
    console.log( `ERROR file-remove-wrapper .fileRemoveBlock__removeFile, file-remove-wrapper-multi .fileRemoveBlock__removeFile`, err.message );
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
.on(`click`, `file-remove-wrapper-multi .removeAllBlocks`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `multi-upload-wrapper` ).remove();
    $( `file-remove-wrapper-multi` ).remove();
    fileInput.value = '';
    uploadType = '';
  } catch ( err ) {
    console.log( `ERROR file-remove-wrapper-multi .removeAllBlocks`, err.message );
  }
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
.on(`click`, `multi-upload prices-table .pricesTable__table_viewAll`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const isShowAll = $( this ).closest( `.pricesTable__items` ).hasClass( `showAll` );
    if ( isShowAll ) {
      $( this ).closest( `.pricesTable__items` ).removeClass( `showAll` );
      $( this ).addClass( `view` );
    } else {
      $( this ).closest( `.pricesTable__items` ).addClass( `showAll` );
      $( this ).removeClass( `view` );
    }
  } catch ( err ) {
    console.log( `ERROR multi-upload prices-table .pricesTable__table_viewAll`, err.message );
  }
})
.on(`change`, `multi-upload toggle-options .toggleOption`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    if ( uploadType == 'multi' ) {
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
    console.log( `ERROR multi-upload toggle-options .toggleOption`, err.message );
  }
})
.on(`click`, `.edit-with-ai .edit-with-aiFlex`, function( e ) {
  try {
    e.stopImmediatePropagation();
    const $uploadedBlock = $(this).closest('uploaded-files-block');

    if ( uploadType == 'multi' ) {
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
      setAIState(AI_STATES.ORIGINAL);
    }
  } catch ( err ) {
    console.log( `ERROR .edit-with-ai .edit-with-aiFlex`, err.message );
  }
})
.on('click', '#ai_generate_image_2', async function () {
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
    } else {
      $btn.prop('disabled', true);
      $aiPrompt_2.prop('disabled', false);
      $btn.data('busy', '0');
    }
  }
})
.on('click', '#use_ai_image', async function () {
  const $btn = $(this);
  const $status = $('#ai_status_message');
  let isSuccess = false;

  console.log ( 'uploadtype', uploadType, 'selectedBlockNo', selectedBlockNo);

  try {
    $('.customTabelPopup__overlay-ai').addClass('ai-overlay-locked');

    const aiImageUrl = $('#ai_image_preview').attr('src');
    if (!aiImageUrl) {
      return;
    }

    const originalBtnText = $btn.data('original-text') || $btn.html();
    $btn.data('original-text', originalBtnText);
    $btn.prop('disabled', true);
    $btn.html('Applying...');

    if ( typeof uploadType !== 'undefined' && uploadType === 'multi') {
      if ( typeof selectedBlockNo !== 'undefined' && selectedBlockNo ) {
        if ( $( `uploaded-files-block[block-no="${ selectedBlockNo }"] toggle-options[show-bg-option="true"] .bgRemover .toggleOption` ).length > 0 ) {
          $( `uploaded-files-block[block-no="${ selectedBlockNo }"] toggle-options[show-bg-option="true"] .bgRemover .toggleOption` ).prop( 'checked', true );
          await addDelay( 200 );
        }
        const uploaded = await processFileOrUrl(aiImageUrl, selectedBlockNo);
        console.log ( 'uploaded', uploaded );

        const fileDetail = {
          originalFile: uploaded.originalFile || aiImageUrl,        // keep S3 here for internal stuff
          imgIxFile: uploaded.imgIxFile || uploaded.originalFile || aiImageUrl,
          file_crc: uploaded.file_crc,
          fileName: uploaded.fileName || 'ai-image.png',
          fileURL: uploaded.originalFile || aiImageUrl,
          isAIEdit: true,
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
      }
    }

  } catch (err) {
    console.log('ERROR #use_ai_image click', err);
    $status.show().text('Error: ' + (err.message || 'Something went wrong while applying the AI image.'));
  } finally {
    $('.customTabelPopup__overlay-ai').removeClass('ai-overlay-locked');
    $('.customTabelPopup__overlay-ai').hide();
    if (!isSuccess) {
      $btn.prop('disabled', false);
    } else {
      $btn.prop('disabled', true);
    }
    $btn.prop('disabled', false);

    const originalBtnText = $btn.data('original-text') || 'Apply AI Edit';
    $btn.html(originalBtnText);
    $("body").removeClass("lock-page");
  }
})
.on(`click`, `upload-controls .zoom_image, multi-upload .zoom_image`, function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'multi' ) {
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
// ADD TO CART START
.on(`click`, `multi-upload proceed-to-checkout .addToCartGroupItemsMultiple`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'multi' ) {
      $( this ).addClass( `working` );
      const items = await multiFilesAddToCart();
      $( this ).removeClass( `working` );
    }
  } catch ( err ) {
    console.log( `ERROR multi-upload proceed-to-checkout .addToCartGroupItemsMultiple`, err.message );
  }
})
// ADD TO CART END
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
;
async function multiFilesAddToCart() {
  try {
    let items = [];
    const uploadControl = $( `multi-upload` );
    const discountInputProperty = uploadControl.find( `prices-table discount-properties` ).attr( `discount-input` );
    const discountNameProperty = uploadControl.find( `prices-table discount-properties` ).attr( `discount-name` );
    $($( `multi-upload sizes-blocks .widthHeight__custom[item]` ).get().reverse()).each(function( i ) {
      const blockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
      const fileDetail = getFileDetailsFunction( blockNo );
      const VID = $( this ).attr( `vid` ) * 1;
      const qty = $( this ).attr( `qty` ) * 1;
      const option = $( this ).attr( `option-selected` );
      const dpi = $( this ).attr( `dpi-warning` );
      const precut = $( this ).attr( `precut` );
      const width = $( this ).attr( `w` );
      const height = $( this ).attr( `h` );
      const size = $( this ).attr( `size` );
      const bgRemover = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .bgRemover .toggleOption` ).is( `:checked` );
      const superRes = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] toggle-options .superRes .toggleOption` ).is( `:checked` );
      const designNote = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] designer-notes .designNotes` ).val().trim();
      const properties = {};

      const orderProperty = parseOrderString( fileDetail.imgIxFile, fileDetail.originalFile, fileDetail.order, fileDetail.currentOptions );
      if ( typeof orderProperty !== 'undefined' && orderProperty ) {
        if ( orderProperty.imgIx ) {
          properties['Upload (Vector Files Preferred)'] = `${ orderProperty.imgIx_params != '' ? orderProperty.imgIx_params : `` }`;
          console.log("designtype: ",designtype, " :grt_photo_id:",grt_photo_id);
          if(designtype && grt_photo_id != ""){
            properties['design re-used'] = `${grt_photo_id}`;
          }
          if(designtype == 1 && ordername != ""){
            properties['design re-used'] = `previously on order # ${ordername}`;
          }
        }
        if ( orderProperty.s3 ) {
          if ( typeof fileDetail.isReadyToPress !== 'undefined' && fileDetail.isReadyToPress == 'Yes' ) {
            properties['Upload (Vector Files Preferred)'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
            console.log("designtype: ",designtype, " :grt_photo_id:",grt_photo_id);
            if(designtype && grt_photo_id != ""){
              properties['design re-used'] = `${grt_photo_id}`;
            }
            if(designtype == 1 && ordername != ""){
              properties['design re-used'] = `previously on order # ${ordername}`;
            }
          } else {
            properties['_Original Image'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
          }
        }
      }

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
      properties['_Size'] = size;

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
      // $( `body` )
      // .append( `
      //   <div class="loadingScreen__">
      //     <img src="${ loaderGif }">
      //   </div>
      // ` );
      const getData = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items, attributes }),
      })
      .then((response) => {
        toast('', 'Added to cart Successfully');
        return response.json();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
      refreshCart();
      updateCartItemCount();
      loadCartItemsCount();
      flushSingleFileData();

      // location.href = `/cart`;
      await addDelay( 3000 );
      $( `.loadingScreen__` ).remove();
    }
  } catch ( err ) {
    console.log( `ERROR multiFilesAddToCart()`, err.message );
  }
}
async function flushSingleFileData() {
  try {
    uploadType = '';
    fileInput.value = '';
    $( `multi-upload-wrapper` ).remove();
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
    grt_photo_id = '';
  } catch ( err ) {
    console.log( `ERROR `, err.message );
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

function updateFileDetailsFunction( fileDetails, blockNo ) {
  try {
    if ( typeof uploadType === 'undefined' || uploadType == 'multi' ) {
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview file-details` ).text( JSON.stringify( fileDetails ) );
      return true;
    }
    return false;
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}
async function processFileOrUrl(fileOrUrl, blockNo) {
  let file;

  if (fileOrUrl instanceof File) {
    file = fileOrUrl;
  } else if (typeof fileOrUrl === "string") {
    const url = fileOrUrl;

    if (url.includes("amazonaws.com")) {
      return {
        originalFile: url,
        imgIxFile: url.replace(ninjaS3Host2, ninjaImgixHost),
        file_crc: null,
        fileName: url.split("/").pop().split("?")[0]
      };
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch external file");

    const blob = await response.blob();

    const urlParts = url.split("/");
    let nameFromUrl = urlParts[urlParts.length - 1].split("?")[0];
    if (!nameFromUrl.includes(".")) {
      nameFromUrl = "file_" + Date.now() + ".jpg";
    }

    file = new File([blob], nameFromUrl, { type: blob.type || "application/octet-stream" });
  } else {
    throw new Error("Invalid input: must be File or URL string");
  }

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
    if (uploadType == "multi") {
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
function setAIState(state) {
  const $box = $(".ai-preview-box");

  $box.addClass("ai-fade");
  setTimeout(() => $box.removeClass("ai-fade"), 250);

  $( `
    #customer_image_preview,
    #ai_image_preview,
    .ai-processing,
    .ai-prompt-box,
    .ai-action-box,
    .black-bg,
    .ai-action-box .button
  ` ).hide();
  $( `.ai-tabs, .ai-tab`).removeClass( `active` );
  $( `.ai-modal` ).removeClass( `ai-is-processing` );

  if ( state === AI_STATES.ORIGINAL ) {
    $( `.ai-tab[data-tab="original"]` ).addClass( `active` );
    $( `#customer_image_preview, .ai-prompt-box` ).show();
  }

  if ( state === AI_STATES.PROCESSING ) {
    $( `.ai-processing` ).show();
    $( `.ai-modal` ).addClass( `ai-is-processing` );
  }

  if ( state === AI_STATES.RESULT ) {
    $( `.ai-tabs, .ai-tab[data-tab="ai"]` ).addClass( `active` );
    $( `#ai_image_preview, .ai-action-box, .ai-action-box .button#use_ai_image` ).show();
    $( `.black-bg` ).css({"display":"flex"});
  }

  if ( state === AI_STATES.RESULT_ORG ) {
    $( `.ai-tabs, .ai-tab[data-tab="original"]` ).addClass( `active` );
    $( `#customer_image_preview, .ai-action-box, .ai-action-box .button:not(#use_ai_image)` ).show();
    $( `.black-bg` ).hide();
  }
}
function getCurrentPreviewImageUrl() {
  try {
    if ( typeof uploadType !== 'undefined' && uploadType === 'multi' ) {
      if ( typeof selectedBlockNo !== 'undefined' && selectedBlockNo ) {
        const src3 = $(`multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`).attr('src');
        if ( src3 ) return src3;
      }
    }
    return '';
  } catch (err) {
    console.log('ERROR getCurrentPreviewImageUrl()', err.message);
    return '';
  }
}
function canUseAiRequest() {
  const usage = getAiUsage();
  return usage.count < AI_DAILY_LIMIT;
}
function getAiUsage() {
  const day = getLocalDayKey();
  const raw = localStorage.getItem('nanoBananaUsage');
  let obj = {};
  try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }

  if (!obj || obj.day !== day) obj = { day, count: 0 };
  return obj;
}
function getLocalDayKey() {
  // YYYY-MM-DD in USER'S local timezone
  const d = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
async function selectAvailableTier( blockNo ) {
  try {
    if ( uploadType == 'multi' && blockNo ) {
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
function getVariantForSmartSize(width, height) {
  try {
    let totalInches = parseFloat(width) * parseFloat(height);

    if (totalInches < 1) {
      totalInches = 1;
    }
    totalInches = Math.ceil(totalInches);

    const customVariants = bySizeVariants.filter(style => style.isCustom);
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
function formatInchesValue(value) {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return parseFloat(num.toFixed(2)).toString().replace(/\.00$/, '');
  } catch (err) {
    console.log('ERROR formatInchesValue', err.message);
    return value;
  }
}
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
function updateLineItemData( w, h, blockNo ) {
  try {
    if ( uploadType == 'multi' ) {
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
function calculateDPILineItem( blockNo ) {
  if ( uploadType == 'multi' ) {
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

function updatePreviewBoxSizes() {
  try {
    if ( uploadType == 'multi' ) {
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
async function manageFiles(files) {
  console.clear();
  console.log ( 'files', files.length );
  // if ( files.length > 1 ) {
  await activateMultiupload();
  // }
  let filesCounter = 1;
  for (const file of files) {
    multiFilesManage( file, filesCounter );
    filesCounter++;
  }
}

async function multiFilesManage( file, fileIndex ) {
  try {
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
      if ( typeof hideToggleForVectors !== 'undefined' && hideToggleForVectors && ( fileExt == 'ai' || fileExt == 'eps' || fileExt == 'pdf' || fileExt == 'svg' ) ) {
        console.log ( 'selectedParamsObject before', selectedParamsObject );
        selectedParamsObject.bgRemover = false;
        selectedParamsObject.superRes = false;
        selectedParamsObject.byDefaultBgRemover = false;
        selectedParamsObject.byDefaultSuperRes = false;
        console.log ( 'selectedParamsObject after', selectedParamsObject );

        $( `multi-upload uploaded-files-block[block-no="${ fileIndex }"] toggle-options` ).attr({
          "show-bg-option": false,
          "show-superres-option": false
        });
      }
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
        }
      }
      setActiveRow();
    } else {
      lastAddedBlock.addClass( `drop-disabled-type` );
      // setTimeout(function(){
      //   lastAddedBlock.find( `preview-box preview-block` ).removeClass( `drop-disabled-type` );
      // },2000);
    }
    console.log ( 'lastAddedBlock', lastAddedBlock );
  } catch ( err ) {
    console.log( `ERROR multiFilesManage( file )`, err.message );
  }
}
async function saveFileToUser( blockNo ) {
  try {
    if ( typeof CUSTOMER_ID !== 'undefined' && CUSTOMER_ID ) {
      let fileDetails;
      if ( uploadType == 'multi' ) {
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

async function updatePreviewImgAndLineItems( blockNo ) {
  try {
    if ( uploadType == 'multi' ) {
      const optionParams = getToggleOptionParams( blockNo );
      const fileDetails = getFileDetailsFunction( blockNo );
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
      const isImageLoaded =  await imgLoaded( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .fileupload_hero` );
      if ( typeof isImageLoaded !== 'undefined' && isImageLoaded ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block .viewer-box > img` ).attr( `src`, `${ fileDetails.imgIxFile }?${ fileDetails.preview }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        console.log ( 'image loaded', isImageLoaded );

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
          console.log ( '----- matchedVariant', matchedVariant );
        })

        calculatePrices();
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
      }
    }
  } catch ( err ) {
    console.log( `ERROR getToggleOptionParams()`, err.message );
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
function getRatioFunc(height, width) {
  function gcd(x, y) {
      return y === 0 ? x : gcd(y, x % y);
  }
  const greatestCommonDivisor = gcd(height, width);
  const ratioHeight = height / greatestCommonDivisor;
  const ratioWidth = width / greatestCommonDivisor;

  return `${ratioHeight}:${ratioWidth}`;
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
async function applyImgToPreviewBox( fileDetails, matchedVariant, updateImg = false, blockNo, isFileUploading = 'no' ) {
  try {
    if ( uploadType == 'multi' ) {
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
    if ( uploadType == 'multi' ) {
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
      console.log ( 'totalPrice', totalPrice );
      shippingBarData( totalPrice );
    }
  } catch ( err ) {
    console.log( `ERROR calculatePrices( fileDetails, matchedVariant = null )`, err.message );
  }
}
async function shippingBarData( total ) {
  try {
    console.log ( 'total', total );
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
async function pricesTable() {
  try {
    console.log ( 'pricesTable()' );
    if ( uploadType == 'multi' ) {
    }
  } catch ( err ) {
    console.log( `ERROR pricesTable()`, err.message );
  }
}
async function applySizes( fileDetails, matchedVariant = null, blockNo, isFileUploading ) {
  try {
    if ( uploadType == 'multi' ) {
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
function getToggleOptionParams( blockNo ) {
  try {
    let bgRemoveState = false;
    let superResState = false;
    if ( uploadType == 'multi' ) {
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
async function toggleOptionActiveWhileFileProcessing( fileDetails, blockNo ) {
  try {
    if ( uploadType == 'multi' ) {
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
async function checkAndAddNewSizeRow( blockNo ) {
  try {
    let rtn = false;
    if ( uploadType == 'multi' ) {
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
async function applyItemNo( type, blockNo ) {
  try {
    if ( uploadType == 'multi' ) {
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
async function calculateTotalQty() {
  try {
    console.log ( 'calculateTotalQty();',  );
    if ( uploadType == 'multi' ) {
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
function pricesTableSelectedBar() {
  try {
    console.log ( 'pricesTableSelectedBar()',  );
    if ( uploadType == 'multi' ) {
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
function getCumulativeQty() {
  try {
    if ( uploadType == 'multi' ) {
      const pageQty = $( `multi-upload prices-table` ).attr( `total-qty` ) * 1;
      const cartQty = $( `multi-upload prices-table` ).attr( `already-in-cart` ) * 1;
      const max = $( `multi-upload prices-table .pricesTable__items .pricesTable__item.selected` ).attr( `max` ) * 1;

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



function getMatchingVariant( fileDetail = null, blockNo ) {
  try {
    if ( uploadType == 'multi' ) {
      let activeTab = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] tab-controls .tabOptionName:checked` ).val();
      console.log ( 'fileDetail', fileDetail );
      let fileDetails = fileDetail;
      if ( fileDetail == null ) {
        fileDetails = getFileDetailsFunction( blockNo );
      }
      if ( activeTab == `custom` ) {
        let totalInches = parseFloat(fileDetails.currentWidth) * parseFloat(fileDetails.currentHeight);
        if ( totalInches < 1 ) {
          totalInches = 1;
        }
        totalInches = Math.ceil( totalInches );

        const highestMaxInches = Math.max(...bySizeVariants.filter(style => style.isCustom).map(style => style.maxInches));
        if ( totalInches > highestMaxInches ) {
          const highestObject = bySizeVariants.filter(style => style.isCustom).reduce((maxObj, current) => {
            return current.maxInches > maxObj.maxInches ? current : maxObj;
          });
          // console.log('Object with highest maxInches:', highestObject);
          return highestObject;
        } else {
          const matchedStyle = bySizeVariants.slice().reverse().find(obj =>
            obj.isCustom &&
            totalInches >= obj.minInches &&
            totalInches <= obj.maxInches
          );
          return matchedStyle ?? null;
        }
      } else if ( activeTab == 'popular' ) {
        const getVal = $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).val();
        const matchedVariant = findObjectByKey( bySizeVariants, `option1_converted`, getVal );
        return matchedVariant ?? null;
      }
    }
  } catch ( err ) {
    console.log( `ERROR getMatchingVariant( fileDetails )`, err.message );
  }
}
function getFileDetailsFunction( blockNo ) {
  try {
    let fileDetails = '';
    if ( uploadType == 'multi' ) {
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

function setActiveRow() {
  try {
    if ( uploadType == 'multi' ) {
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

            file_width  =   file_width * 4.167;
            file_height =   file_height * 4.167;

            file_width  =   file_width * 300;
            file_height =   file_height * 300;
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
  } catch ( err ) {
    console.log( `ERROR fileDimensions( fileDetails )`, err.message );
  }
}
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
async function loadCartItemsCount() {
  try {
    const res = await getRequest( `${ productURL }?view=itemsInCart__cumulative` );
    if ( typeof res !== 'undefined' && res ) {
      if ( uploadType == 'multi' ) {
        $( `multi-upload prices-table` ).attr( `already-in-cart`, `${ res.count }` );
      }
    }
  } catch ( err ) {
    console.log( `ERROR loadCartItemsCount()`, err.message );
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
      if ( uploadType == 'multi' ) {
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview` ).removeClass( `img_square img_wide img_tall` );
        $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] preview-box file-preview` ).addClass( classByDimension );
      }
    }
  } catch ( err ) {
    console.log( `ERROR applyClassByDimension( fileDetails = null )`, err.message );
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
function imgPreviewBox( act, fileExt, blockNo ) {
  try {
    if ( act == 'active' ) {
      if ( uploadType == 'multi' ) {
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
    }
  } catch ( err ) {
    console.log( `ERROR imgPreviewBox( act )`, err.message );
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
    if ( uploadType == 'multi' ) {
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

function fileProcessBar( act ) {
  try {
    if ( act == 'start' ) {
    } else if ( act == 'reset' ) {
      $( `#fileupload_custom` ).hide();
      $( `upload-controls file-preview #fileupload_hero, file-preview .viewer-box` ).attr( `src`, transpareImg );
      uploadArea.classList.remove('upload-area--open');
      loadingText.style.display = `block`;
      fileDetails.classList.remove('file-details--open');
      uploadedFile.classList.remove('uploaded-file--open');
      uploadedFileInfo.classList.remove('uploaded-file__info--active');
      uploadArea.classList.remove( `hidden` );
      // aiImgGenerator.classList.remove( `hidden` );
    }
  } catch ( err ) {
    console.log( `ERROR fileProcessBar()`, err.message );
  }
}
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
      if ( uploadType == 'multi' ) {
        isCompleted = $( selector ).closest( `uploaded-files-block` ).find( `preview-box .easyzoom` ).hasClass( `image-loading` );
        if ( isCompleted == false ) {
          clearInterval( counterIncrease );
          return 'completed';
        }
      }
    } else {
      if ( uploadType == 'multi' ) {
        counter = counter + 1;
        $( selector ).find( `.fileProgress__bar` ).css({
          "width": `${ counter }%`
        });
        $( selector ).find( `.loadingPercent__counter` ).text( `${ counter }%` );
      }
    }
  }, fileSize);
};
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

