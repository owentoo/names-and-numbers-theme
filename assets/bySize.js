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

$(function(){
  const params = new URLSearchParams(window.location.search);
  let grt_query_param = params.get("ordertype") || "";
  if(grt_query_param != ""){
    designtype = 1;
    ordername = params.get("order_name") || "";
  }
})

let keyUpTimeOut = null;
const filePreview = $( `upload-controls file-preview` );
// let imagesTypes = ["image/png","image/jpg","image/jpeg","image/tiff","application/pdf","image/vnd.adobe.photoshop","application/postscript","application/vnd.adobe.photoshop","application/x-photoshop","application/photoshop","image/svg+xml"];

const apiURL = `https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production`;
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

// EVENTS FOR SINGLE START
var timeout__;
$( document )
.ready(function() {
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
        $( `product-page .product-gallery.product-gallery--slider .thumbnail[data-thumb-id="${ mediaID }"]` ).removeClass( `hidden` ).click();
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
.on(`change`, `upload-controls sizes-blocks .popularSizes`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedItemNo = $( this ).closest( `.widthHeight__custom` ).attr( `item` );
    let activeOption = $( `upload-controls tab-controls .tabOptionName:checked` ).val();
    let fileDetails = getFileDetailsFunction();
    if ( typeof fileDetails !== 'undefined' && fileDetails ) {
      const matchedVariant = getMatchingVariant();
      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        applyImgToPreviewBox( fileDetails, matchedVariant, false );
        const getDimension = getWidthHeight_popularSize( matchedVariant.option1_converted );
        if ( typeof getDimension !== 'undefined' && getDimension ) {
          updateLineItemData( getDimension.width, getDimension.height );
        }
      }
    }
    calculateDPILineItem();
    updatePreviewBoxSizes();
    setActiveRow();
    const mediaID = $( `upload-controls sizes-blocks line-items-popular .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `media-id` );
    if ( typeof mediaID !== 'undefined' && mediaID ) {
      $( `product-page .product-gallery.product-gallery--slider .product-gallery-item[data-media-id="${ mediaID }"]` ).removeClass( `hidden` );
      $( `product-page .product-gallery.product-gallery--slider .thumbnail[data-thumb-id="${ mediaID }"]` ).removeClass( `hidden` ).click();
    }
  } catch ( err ) {
    console.log( `ERROR upload-controls tab-controls .tabOptionName`, err.message );
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
      $( `upload-controls file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
    } else if ( uploadType == 'multi' ) {
      await selectAvailableTier( selectedBlockNo );
      $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] file-preview preview-block.easyzoom` ).addClass( `image-loading` );
      await updatePreviewImgAndLineItems( selectedBlockNo );
      updatePreviewBoxSizes();
      $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] file-preview preview-block.easyzoom` ).removeClass( `image-loading` );
    }
  } catch ( err ) {
    console.log( `ERROR upload-controls toggle-options .toggleOption, multi-upload toggle-options .toggleOption`, err.message );
  }
})
.on(`click`, `upload-controls sizes-blocks .del_item_cta, multi-upload sizes-blocks .del_item_cta`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    $( this ).closest( `.widthHeight__custom` ).remove();
    await applyItemNo( selectedBlockNo );
    selectAvailableTier( selectedBlockNo );
    if ( uploadType == 'multi' ) {
      let totalPrice = 0;
      $( `multi-upload line-items sizes-blocks .widthHeight__custom[item]` ).each(function() {
        const qty = $( this ).find( `precut-unit-logic .precut-unit-logic__qty .customQtyFile__qty` ).val() * 1;
        let unitPrice = $( this ).attr( `price` ) * 1;
        const total = qty * unitPrice;
        totalPrice = totalPrice + total;
      })
      shippingBarData( totalPrice );
    }
  } catch ( err ) {
    console.log( `ERROR upload-controls sizes-blocks .del_item_cta, multi-upload sizes-blocks .del_item_cta`, err.message );
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
.on(`click`, `upload-controls .zoom_image, multi-upload .zoom_image`, function( e ) {
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
            updatePreviewSizeOnly( getDimension.width, `Proportional Height`, selectedBlockNo );
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
    if ( uploadType == 'single' ) {
      $( `upload-controls .addToCartGroupItems` ).addClass( `disabled` );
    } else if ( uploadType == 'multi' ) {
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
      if ( uploadType == 'single' ) {
        $( `upload-controls .addToCartGroupItems` ).removeClass( `disabled` );
      } else if ( uploadType == 'multi' ) {
        $( `multi-upload .addToCartGroupItemsMultiple` ).removeClass( `disabled` );
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
    if ( uploadType == 'single' ) {
      $( `upload-controls .addToCartGroupItems` ).addClass( `disabled` );
    } else if ( uploadType == 'multi' ) {
      $( `multi-upload .addToCartGroupItemsMultiple` ).addClass( `disabled` );
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
        if ( uploadType == 'single' ) {
          getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, by );
        } else if ( uploadType == 'multi' ) {
          getRatio = getNewRatio( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] preview-box .fileupload_hero`, by );
        }

        const newVal = calculateNewWidth_orNewHeight( getRatio, by, getVal );

        console.log ( 'newVal', newVal );

        if ( by == 'height' && newVal > definedMaxWidth ) {
          item.find( `.widthHeight__item[by="width"] .widthHeight__value` ).val( definedMaxWidth ).attr( `value`, definedMaxWidth ).addClass( `error` );

          let getRatio;
          if ( uploadType == 'single' ) {
            getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, 'width' );
          } else if ( uploadType == 'multi' ) {
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
          if ( uploadType == 'single' ) {
            getRatio = getNewRatio( `upload-controls preview-box .fileupload_hero`, 'height' );
          } else if ( uploadType == 'multi' ) {
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
      if ( uploadType == 'single' ) {
        $( `upload-controls .addToCartGroupItems` ).removeClass( `disabled` );
      } else if ( uploadType == 'multi' ) {
        $( `multi-upload .addToCartGroupItemsMultiple` ).removeClass( `disabled` );
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
    if ( uploadType == 'single' ) {
      flushSingleFileData();
    } else if ( uploadType == 'multi' ) {
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
.on(`click`, `file-remove-wrapper-multi .removeAllBlocks`, function( e ) {
  try {
    e.stopImmediatePropagation();
    $( `multi-upload-wrapper` ).remove();
    $( `file-remove-wrapper-multi` ).remove();
    uploadType = '';
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
.on(`click`, `multi-upload proceed-to-checkout .addToCartGroupItemsMultiple`,async function( e ) {
  try {
    e.stopImmediatePropagation();
    if ( uploadType == 'multi' ) {
      const items = await multiFilesAddToCart();
    }
  } catch ( err ) {
    console.log( `ERROR multi-upload proceed-to-checkout .addToCartGroupItemsMultiple`, err.message );
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
    e.stopImmediatePropagation();
    selectedBlockNo = $( this ).closest( `uploaded-files-block` ).attr( `block-no` );
    selectedItemNo = $( this ).closest( `.widthHeight__custom[item]` ).attr( `item` );
    let activeOption = $( `multi-upload uploaded-files-block[block-no="${ selectedBlockNo }"] tab-controls .tabOptionName:checked` ).val();
    let fileDetails = getFileDetailsFunction( selectedBlockNo );
    if ( typeof fileDetails !== 'undefined' && fileDetails ) {
      const matchedVariant = getMatchingVariant( fileDetails, selectedBlockNo );
      if ( typeof matchedVariant !== 'undefined' && matchedVariant ) {
        applyImgToPreviewBox( fileDetails, matchedVariant, false, selectedBlockNo, `no` );
        const getDimension = getWidthHeight_popularSize( matchedVariant.option1_converted );
        if ( typeof getDimension !== 'undefined' && getDimension ) {
          updateLineItemData( getDimension.width, getDimension.height, selectedBlockNo );
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
  /* `files` arrives as a LIVE FileList when the caller is
     `fileInput.addEventListener('change', e => manageFiles(e.target.files))`.
     A live FileList reflects the current state of its backing <input>, so
     the moment ANY code clears `#fileInput.value` the list also empties.
     `activateMultiupload()` below appends template HTML to body that
     contains an empty <input type="file">; some browsers/scripts in that
     append path end up resetting #fileInput's value, which drops the
     live FileList's length to 0 mid-flow. Then the `for...of files` loop
     iterates zero items, no `multiFilesManage` runs, and the multi-upload
     modal opens with an empty tile area. Snapshot to a plain Array once
     up-front so iteration uses a stable list. */
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
    console.log("typeof _qtyupdate:",typeof _qtyupdate)
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
        $( `multi-upload multi-shipping-bar` ).html( html )
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
      progressMove(`upload-controls file-progress`, ``, fileSize);
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


$(document).ready(async function () {
  let sharedSelection = [];
  try {
    const sharedSelectionParam = getParam(`my_designs_selection`);
    if (typeof sharedSelectionParam !== 'undefined' && sharedSelectionParam) {
      sharedSelection = JSON.parse(decodeURIComponent(sharedSelectionParam));
      removeQueryParam(`my_designs_selection`);
    }
  } catch (err) {
    console.log(`ERROR reading my_designs_selection`, err.message);
    sharedSelection = [];
  }

  /* Bridge my-designs picker selections into the "design re-used"
     attribution maps + legacy globals. See bySize_popular.js for the
     same shape. */
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
    singleFileManageByURL(sharedSelection[0]);
    return;
  }

  let fileURL = getParam(`file`);
  if (typeof fileURL !== 'undefined' && fileURL) {
    progressMove( `upload-controls file-progress`, `quick`);
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
    // removeQueryParam(`file`);

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
    singleFileManageByURL(fileDetail);
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
    // URL-sourced designs (previous designs, Design Studio) skip imgLoaded(),
    // so the reward block gate in reward-point-info.liquid must be opened here.
    $("next-element").addClass("enablereward");
    if (typeof _qtyupdate === 'function') _qtyupdate();
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
  } catch ( err ) {
    console.log( `ERROR addFilesASMultiBlock( file )`, err.message );
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
        let fileDetails = { ...selectedParamsObject, ...getFileDetails };
        // console.log ( 'fileDetails', fileDetails );
        const dimensionDetails = await fileDimensions( fileDetails );
        console.log ( 'func singleFileManage dimensionDetails', dimensionDetails );
        if ( typeof dimensionDetails !== 'undefined' && dimensionDetails ) {
          fileDetails = { ...fileDetails, ...dimensionDetails };
          console.log ( 'fileDetails', fileDetails );
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
      lastAddedBlock.find( `preview-box preview-block` ).addClass( `drop-disabled-type` );
      setTimeout(function(){
        lastAddedBlock.find( `preview-box preview-block` ).removeClass( `drop-disabled-type` );
      },2000);
    }
  } catch ( err ) {
    console.log( `ERROR multiFilesManage( file )`, err.message );
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
        $( this ).find( `precut-unit-logic .precut-unit-logic__price .__discountedPrice` ).html( `$${ unitDiscountPrice.toFixed( 2 ) }<span>ea</span>` );

        $( this ).find( `precut-unit-logic .precut-unit-logic__total .__originalPrice` ).text( `$${ (unitPrice * qty).toFixed(2) }` );
        $( this ).find( `precut-unit-logic .precut-unit-logic__total .__discountedPrice` ).text( `$${ (unitDiscountPrice * qty).toFixed(2) }` );
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
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview .horizontal_direction` ).attr( `x-is`, `${ width }` );
      $( `multi-upload uploaded-files-block[block-no="${ blockNo }"] file-preview .verticle_direction` ).attr( `y-is`, `${ height }` );
    }
  } catch ( err ) {
    console.log( `ERROR updatePreviewSizeOnly( width, height, blockNo )`, err.message );
  }
}
async function applySizes( fileDetails, matchedVariant = null, blockNo, isFileUploading ) {
  try {
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
        $( `.widthHeight__custom[item="${ selectedItemNo }"] .popularSizes` ).change();
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
      progressMove( `upload-controls file-progress`, ``, fileSize );
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
function updateLineItemData( w, h, blockNo ) {
  try {
    if ( uploadType == 'single' ) {
      $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr({
        "w": w,
        "h": h,
        "size": `${ w }x${ h }`
      });
    } else if ( uploadType == 'multi' ) {
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
        console.log ( 'image loaded', isImageLoaded );

        const previewParams_withoutWidthHeight = removeWandHParams( fileDetails.preview );
        const getImgDimensions = await getImageSizeFromUrl( `${ fileDetails.imgIxFile }?${ previewParams_withoutWidthHeight }${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }` );
        let getActualWidth = null;
        let getActualHeight = null;
        if ( typeof getImgDimensions !== 'undefined' && getImgDimensions ) {
          getActualWidth = getImgDimensions.width;
          getActualHeight = getImgDimensions.height;
        }
        const newRatio = getNewRatio( 'upload-controls file-preview preview-block .fileupload_hero', 'width', getActualWidth, getActualHeight );
        const getNewHeight = calculateNewWidth_orNewHeight( newRatio, `width`, fileDetails.fileWidth );
        fileDetails.fileHeight = Math.ceil( getNewHeight );
        fileDetails.fileHeight_inch = ( getNewHeight / 300 ).toFixed( 2 );
        fileDetails.currentHeight = ( getNewHeight / 300 ).toFixed( 2 );

        fileDetails.currentOptions = `${ typeof optionParams !== 'undefined' && optionParams ? optionParams : `` }`;

        await applyClassByDimension( fileDetails );

        $( `upload-controls file-preview file-details` ).html( JSON.stringify( fileDetails ) );

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
          console.log ( '----- matchedVariant', matchedVariant );
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
    uploadType = '';
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
    $($( `upload-controls sizes-blocks .widthHeight__custom[item]` ).get().reverse()).each(function( i ) {
      const VID = $( this ).attr( `vid` ) * 1;
      const qty = $( this ).attr( `qty` ) * 1;
      const option = $( this ).attr( `option-selected` );
      const dpi = $( this ).attr( `dpi-warning` );
      const precut = $( this ).attr( `precut` );
      const width = $( this ).attr( `w` );
      const height = $( this ).attr( `h` );
      const size = $( this ).attr( `size` );
      const properties = {};

      const orderProperty = parseOrderString( fileDetail.imgIxFile, fileDetail.originalFile, fileDetail.order, fileDetail.currentOptions );
      if ( typeof orderProperty !== 'undefined' && orderProperty ) {
        if ( orderProperty.imgIx ) {
          properties['Upload (Vector Files Preferred)'] = `${ orderProperty.imgIx_params != '' ? orderProperty.imgIx_params : `` }`;
          console.log("designtype: ",designtype, " :grt_photo_id:",grt_photo_id);
          if(designtype && grt_photo_id != "undefined" && _ntIsValidOrderRef(grt_photo_id)){
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
            if(designtype && grt_photo_id != "undefined" && _ntIsValidOrderRef(grt_photo_id)){
              properties['design re-used'] = `${grt_photo_id}`;
              designtype = ordername = "";
            }
            if(designtype == 1 && _ntIsValidOrderRef(ordername)){
              properties['design re-used'] = `previously on order # ${ordername}`;
              designtype = ordername = "";
            }
          } else {
            properties['_Original Image'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
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
      if ( precut != '' ) {
        properties['Precut'] = precut;
      }
      if ( option == 'custom' ) {
        properties['width'] = width;
        properties['height'] = height;
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
      if ( typeof fileDetail.isDesignStudio !== 'undefined' && fileDetail.isDesignStudio == 'Yes' ) {
        properties['_Design Studio'] = fileDetail.isDesignStudio;
      }
      if ( typeof fileDetail.isAIImage !== 'undefined' && fileDetail.isAIImage ) {
        properties['AI Created'] = 'Yes';
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
      // Per-upload .nt-design-note lives inside this block-no's
      // uploaded-files-block. Scope to it first; fall back to unscoped;
      // fall back to legacy <designer-notes>; default '' for safe .trim().
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
          if(designtype && grt_photo_id != "undefined" && _ntIsValidOrderRef(grt_photo_id)){
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
            if(designtype && grt_photo_id != "undefined" && _ntIsValidOrderRef(grt_photo_id)){
              properties['design re-used'] = `${grt_photo_id}`;
              designtype = ordername = "";
            }
            if(designtype == 1 && _ntIsValidOrderRef(ordername)){
              properties['design re-used'] = `previously on order # ${ordername}`;
              designtype = ordername = "";
            }
          } else {
            properties['_Original Image'] = `${ orderProperty.s3_params != '' ? orderProperty.s3_params : `` }`;
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
      if ( precut != '' ) {
        properties['Precut'] = precut;
      }
      if ( option == 'custom' ) {
        properties['width'] = width;
        properties['height'] = height;
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
        // const isDateEleAvailable = $( `multi-upload delivery-block date` ).length;
        // const isTimeEleAvailable = $( `multi-upload delivery-block time` ).length;
        // if ( isDateEleAvailable > 0 || isTimeEleAvailable > 0 ) {
        //   setInterval(() => {
        //     $( `multi-upload delivery-block date` ).text( getEvtDate );
        //     $( `multi-upload delivery-block time` ).text( eventTime_Variable );
        //   }, 1000);
        // }
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

    // const urlObj = new URL( url );
    // urlObj.searchParams.delete( 'w' );
    // urlObj.searchParams.delete( 'h' );
    // return urlObj.toString();
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
    console.log ( 'pricesTable()' );
    if ( uploadType == 'single' ) {
      const unitPrice = $( `upload-controls sizes-blocks .widthHeight__custom[item="${ selectedItemNo }"]` ).attr( `price` ) * 1;
      $( `upload-controls prices-table .pricesTable__items .pricesTable__item` ).each(function(i) {
        let offPercent = $( this ).attr( `off` ) * 1;
        let getOff = 1;
        if ( offPercent == '' || offPercent == 0 ) {
          offPercent = 1;
        } else {
          getOff = ( 100 - offPercent ) / 100;
        }
        $( this ).find( `.pricesTable__item_2 discount` ).text( ( unitPrice * getOff ).toFixed( 2 ) );
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
          h = `Proportional Height`;
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
          h = `Proportional Height`;
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

function calculateratioForImage(){ 
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
