document.addEventListener("DOMContentLoaded", function () {
  function sendGAEvent(facetType, facetValue) {
    if (typeof gtag !== "undefined") {
      gtag("event", "product_list_filtered", {
        facet_type: facetType,
        facet_value: facetValue,
      });
    }
  }

  document.body.addEventListener("change", function (event) {
    if (event.target.classList.contains("snize-product-filters-checkbox")) {
      let facetType = event.target.getAttribute("data-se-facet-default-title");
      let facetValue = event.target.getAttribute("data-se-facet-value-title");
      if (event.target.checked) {
        sendGAEvent(facetType, facetValue);
      }
    }
  });
});
