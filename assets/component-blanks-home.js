
// Function to handle page load and set zipcode
function collectionItemsLoaded() {
  
  const getNextWorkDate = date => {
    let day = date.getDay(), add = 1;
    if (day === 6)           add = 2; else 
    if (day === 5)           add = 3;
    date.setDate(date.getDate() + add); // will correctly handle 31+1 > 32 > 1st next month
    return date;
  };
  const curDate = new Date();
  const cutoffDate = new Date(`${curDate.getMonth()+1}/${curDate.getDate()}/${curDate.getFullYear()} 16:30`);
  const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthsOfYear = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let shipDate = curDate;
  if (shipDate.getTime() >= cutoffDate.getTime()) shipDate = getNextWorkDate(shipDate);
  const nextWorkDate = getNextWorkDate(shipDate);
  const deliveryDateText = `${daysOfWeek[nextWorkDate.getDay()]}, ${monthsOfYear[nextWorkDate.getMonth()]} ${nextWorkDate.getDate()}`;

  $(".collection-page .product-item,.collection-page .card__text,#blank-collection-page .product-item").each(function () {
    const $productCard = $(this);
    $(".estimatedDeliveryDateText", $productCard).html(deliveryDateText);
    $(".estimatedDeliveryDate", $productCard).show();
  });
  
  
  /*
  $(".deliveryEstimateContainer").show();

  const locationPermissionDenied = window.localStorage.getItem(
    "locationPermissionDenied"
  );
  if (locationPermissionDenied === "true") {
    $(".deliveryEstimateZip").val("78701");
    estimateDeliveryDate();
  } else {
    const savedZipCode = window.localStorage.getItem("deliveryPostalCode");
    if (savedZipCode) {
      $(".deliveryEstimateZip").val(savedZipCode);
      estimateDeliveryDate();
    } else {
      $(".deliveryEstimateZip").val("78701");
      estimateDeliveryDate();
      fetchCurrentZipCodeFromGeolocation();
    }
  }
  */
  
}

// Function to fetch the current zipcode from geolocation and set it
function fetchCurrentZipCodeFromGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

        fetch(url)
          .then((response) => response.json())
          .then((data) => {
            if (data && data.address) {
              const address = data.address;
              const postalCode = address.postcode || address.zip;
              if (postalCode) {
                $(".deliveryEstimateZip").val(postalCode);
                estimateDeliveryDate();
                window.localStorage.setItem("deliveryPostalCode", postalCode);
                window.localStorage.removeItem("locationPermissionDenied");
              } else {
                $(".deliveryEstimateZip").val("78701");
                estimateDeliveryDate();
              }
            } else {
              $(".deliveryEstimateZip").val("78701");
              estimateDeliveryDate();
            }
          })
          .catch((error) => {
            $(".deliveryEstimateZip").val("78701");
            estimateDeliveryDate();
          });
      },
      (error) => {
        $(".deliveryEstimateZip").val("78701");
        estimateDeliveryDate();
        window.localStorage.setItem("locationPermissionDenied", "true");
      }
    );
  } else {
    $(".deliveryEstimateZip").val("78701");
    estimateDeliveryDate();
    window.localStorage.setItem("locationPermissionDenied", "true");
  }
}

// Function to handle resetting estimate delivery date popup
function resetEstimateDeliveryDate() {
  $(".popup-overlay").removeClass("popup-overlay-hidden");
}

// Function to get estimated delivery date from cache
function getEstimatedDeliveryDateCache(zipCode, masterHandle) {
  const cache = JSON.parse(
    window.sessionStorage.getItem("estimatedDeliveryDateCache-" + zipCode)
  );
  if (cache) return cache[masterHandle];
  return null;
}

// Function to update estimated delivery date cache
function updateEstimatedDeliveryDateCache(zipCode, masterHandle, response) {
  let cache = JSON.parse(
    window.sessionStorage.getItem("estimatedDeliveryDateCache-" + zipCode)
  );
  if (cache == null) cache = {};
  cache[masterHandle] = response;
  window.sessionStorage.setItem(
    "estimatedDeliveryDateCache-" + zipCode,
    JSON.stringify(cache)
  );
}

// Function to estimate delivery date
function estimateDeliveryDate() {
  $(".collection-page .estimatedDeliveryDate").hide();
  const masterHandles = [];
  $(".collection-page .card__text").each(function () {
    const urlParts = $(this).attr("href").split("/");
    const masterHandle = urlParts[urlParts.length - 1].split("?")[0];
    masterHandles.push(masterHandle);
  });

  function toggleLoading(isLoading) {
    if (isLoading) {
      $(".estimateDeliveryDateButton").addClass("working");
    } else {
      $(".estimateDeliveryDateButton").removeClass("working");
    }
  }

  function showError(error) {
    console.log("showError:", error);
    $(".deliveryEstimateError").html(error).show();
  }

  $(".deliveryEstimateError").hide();
  const deliveryPostalCode = $(".deliveryEstimateZip").val().trim();
  const validZipTest = /(^\d{5}$)|(^\d{5}-\d{4}$)/;

  if (!validZipTest.test(deliveryPostalCode)) {
    showError("Please enter a valid zip code");
    return;
  }

  toggleLoading(true);

   const validDeliveryDates = {};

  let firstShipmentFound = false;
 function processDeliveryDateResponse(response) {
  toggleLoading(false);

  if (response && response.success && response.estimatedDeliveryDates.length > 0) {
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const tomorrow = new Date(new Date().getTime() + 86400000);

    response.estimatedDeliveryDates.forEach((data) => {
      const estimatedDeliveryDate = data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate + "T00:00:00") : null;
      let day = estimatedDeliveryDate ? weekday[estimatedDeliveryDate.getDay()] : null;

      if (estimatedDeliveryDate && estimatedDeliveryDate.getDate() === tomorrow.getDate()) {
        day = "Tomorrow";
      }

      // Store valid delivery dates
      if (estimatedDeliveryDate) {
        validDeliveryDates[data.masterHandle] = `${day}, ${month[estimatedDeliveryDate.getMonth()]}. ${estimatedDeliveryDate.getDate()}`;
      }

      $(".collection-page .card__text").each(function () {
        const $productCard = $(this);
        const urlParts = $productCard.attr("href").split("/");
        const masterHandle = urlParts[urlParts.length - 1].split('?')[0];

        if (masterHandle === data.masterHandle) {
          const deliveryDateText = validDeliveryDates[masterHandle] || "Delivery date unavailable";
          $(".estimatedDeliveryDateText", $productCard).html(deliveryDateText);

          // Show the estimatedDeliveryDate section if there's a valid date
          if (deliveryDateText !== "Delivery date unavailable") {
            $(".estimatedDeliveryDate", $productCard).show(); // Show the delivery date div
          } else {
            $(".estimatedDeliveryDate", $productCard).hide(); // Hide if no valid date
          }
        }
      });
    });

    // Update products with null delivery dates
    $(".collection-page .card__text").each(function () {
      const $productCard = $(this);
      const urlParts = $productCard.attr("href").split("/");
      const masterHandle = urlParts[urlParts.length - 1].split('?')[0];

      if (!$(".estimatedDeliveryDateText", $productCard).html() || $(".estimatedDeliveryDateText", $productCard).html() === "Delivery date unavailable") {
        const firstValidDeliveryDate = Object.values(validDeliveryDates)[0];
        $(".estimatedDeliveryDateText", $productCard).html(firstValidDeliveryDate || "Delivery date unavailable");
        // Show if there's a valid first delivery date
        if (firstValidDeliveryDate) {
          $(".estimatedDeliveryDate", $productCard).show();
        }
      }
    });

    // Update the shipping zip code display
    $(".shippingToZipCode").html("Shipping to zip code " + deliveryPostalCode);
    $(".deliveryEstimateDate").show(); // Show the overall delivery estimate section
    window.localStorage.setItem("deliveryPostalCode", deliveryPostalCode);
    $(".popup-overlay").addClass('popup-overlay-hidden');
  }
}


  masterHandles.forEach((masterHandle) => {
    const cachedResponse = getEstimatedDeliveryDateCache(
      deliveryPostalCode,
      masterHandle
    );
    if (cachedResponse) {
      processDeliveryDateResponse(cachedResponse);
    } else {
      $.ajax({
        type: "POST",
         url: 'https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production/estimateDeliveryDates',
        data: JSON.stringify({
          masterHandles: [masterHandle],
          deliveryPostalCode,
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (response) {
          updateEstimatedDeliveryDateCache(
            deliveryPostalCode,
            masterHandle,
            response
          );
          processDeliveryDateResponse(response);
        },
        error: function (xhr, status, error) {
          console.error("Error fetching delivery dates:", status, error);
          console.error("Response text:", xhr.responseText);
          // showError("Estimated delivery date unavailable at the moment.);
          toggleLoading(false);
        },
      });
    }
  });
}

// Event listener for the getDirectionWrapperInner button
document
  .querySelector(".getDirectionWrapperInner")
  ?.addEventListener("click", () => {
    const locationPermissionDenied = window.localStorage.getItem(
      "locationPermissionDenied"
    );
    if (locationPermissionDenied === "true") {
      showError(
        "Location services are required to get your current zip code. Please enable location services in your browser."
      );
    } else {
      fetchCurrentZipCodeFromGeolocation();
    }
  });

// Function to show error messages
function showError(message) {
  $(".deliveryEstimateError").html(message).show();
}

// Call this function when the page loads
//$(document).ready(function () {
  collectionItemsLoaded();
//});
