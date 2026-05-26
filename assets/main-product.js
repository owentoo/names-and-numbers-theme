function manageQuantities( type = '' ) {
  try {
    let qty         = $( `.customQtyFile__qty` ).val();
    if ( typeof qty !== 'undefined' && qty ) {
      qty = qty * 1;
    } else {
      const qty__ = $( `product-quantity .qty[name="quantity"]` ).val();
      if ( typeof qty__ !== 'undefined' && qty__ ) {
        qty = qty__ * 1;
      }
    }
    let selectedIndex = 0;
    $( `.customTabelPlace .customTabelPlace__item` ).each(function() {
      const min     = $( this ).attr( `min` ) * 1;
      const max     = $( this ).attr( `max` ) * 1;
      const indexNo = $( this ).attr( `index` ) * 1;
      if ( qty >= min && qty <= max ) {
        selectedIndex = indexNo;
        const percentage  = $( this ).find( `.customTabelPlace__item_2` ).text().trim();
        const unitPrice   = $( this ).find( `.customTabelPlace__item_3` ).text().trim();
        $( `.customQtyFile__selectedData.percentage` ).html( `${ percentage !== '' ? percentage : `&nbsp;` }` );
        $( `.customQtyFile__selectedData.unitPrice > span` ).html( `${ unitPrice !== '' ? unitPrice : `&nbsp;` }` );
      }
    })
    if ( type != 'btnClicked' ) {
      $( `.customTabelPlace .customTabelPlace__item` ).removeClass( `selected` );
      $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).addClass( `selected` );
    }
    const isQtyEle = $( `.form__properties input[name="quantity"]` ).length;
    if ( isQtyEle > 0 ) {
      $( `.form__properties input[name="quantity"]` ).val( qty );
    } else {
      $( `.form__properties` ).append( `<input type="hidden" name="quantity" value="${ qty }">` );
    }

    setSelectedRow( selectedIndex );
    // console.log ( 'selectedIndex', selectedIndex );

    if(typeof _qtyupdate != "undefined"){
      _qtyupdate();
    }

  } catch ( err ) {
    console.log( `ERROR manageQuantities`, err.message );
  }
}


function setSelectedRow( selectedIndex ) {
  try {
    if($( `.customTabelPlace`) && $( `.customTabelPlace`).length > 0){
    if ( selectedIndex == '') {
      selectedIndex = $( `.customTabelPlaceWrap .customTabelPlace__item.selected` ).attr( `index` );
    }
      console.log("selectedIndex",selectedIndex);
      if(typeof selectedIndex != "undefined" ){
    const getHeight = $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).outerHeight();
    let getTopPosition = $( `.customTabelPlace .customTabelPlace__item[index="${ selectedIndex }"]` ).position().top;

    $( `.customTabelPlace__item__selectedBar` ).css({
      "top": `${ getTopPosition }px`,
      "height": `${ getHeight }px`
    });
      }
    }
  } catch ( err ) {
    console.log( `ERROR setSelectedRow()`, err.message );
  }
}
