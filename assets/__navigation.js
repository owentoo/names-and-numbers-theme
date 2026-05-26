loadNavigationData();
function loadNavigationData() {
  try {
    if ( collectMainNav.length > 0 ) {
      const parentElement = document.querySelector( `ninja-nav main-nav` );
      if ( parentElement ) {
        collectMainNav.forEach(el => {
          parentElement.insertAdjacentHTML('beforeend', `<a href="${ el.link }" e-type="${ el.event }" class="navItem ${ el.highlight ? `active` : `` } ${ el.align != 'leftAlign' ? el.align : `` }">${ el.linkLabel }</a>`);
        });
      }
    }
  } catch ( err ) {
    console.log( `ERROR `, err.message );
  }
}

$(document).ready(function () {
  console.log ( 'load navigation',  );
});
