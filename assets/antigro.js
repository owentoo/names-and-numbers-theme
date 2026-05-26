/**
 * author: Piotr Klaja
 * version: '23.04.05',
 */

/**
 * @typedef {object} Designer
 * @property {{ productCode: string, templateBindingType?: string }} [productParams] - parametry produktu dodawane na podstronie produktu.
 */

/**
 * @typedef {object} UpdateCartUrlGetParams
 * @property {string} [clientDesignId]
 * @property {string} [projectIds]
 * @property {string} [projectVolumes]
 * @property {string} [projectVariantIds]
 */

/**
 * @typedef {object} CartItem
 * @property {string} key
 * @property {number} variant_id
 * @property {number} quantity
 * @property {object} properties
 * @property {string} [properties._clientDesignId]
 * @property {string} [properties._projectId]
 */

/**
 * @typedef {object} CartItemAddable
 * @property {number} id
 * @property {number} quantity
 * @property {object} properties
 * @property {string} [properties._clientDesignId]
 * @property {string} [properties._projectId]
 */

/**
 * @typedef {object} Cart
 * @property {CartItem[]} items
 */

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {number} variantId
 * @property {number} volume
 */

/**
 * @type Designer
 */
window.Designer = Object.assign(window.Designer || {},
  (function () {

    var config = {
      creatorUrl: 'https://designer.antigro.com',
      apiUrl: 'https://designer.antigro.com',
      shopifyCartUrl: '/cart',
      langCode: 'en',
      shopifyId: 'transferss',
      loaderSrc: 'https://dsi3m4nj2ri0m.cloudfront.net/external/shopify-loader-gray.svg',
    }

    function loadCart () {
      return fetch('/cart.js', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json;'
        },
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (cart) {
          return cart;
        })
        .catch(function (err) {
          throw err;
        })
    }

    /**
     *
     * @param {CartItemAddable[]} cartItemsToAdd
     * @returns {Promise<any>}
     */
    function addCartItems (cartItemsToAdd) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;'
        },
        body: JSON.stringify({ items: cartItemsToAdd.reverse() })
      })
        .then(function (response) {
          return response.json();
        })
    }

    /**
     *
     * @param {string} clientDesignId
     * @param {Project[]} projects
     * @returns {CartItemAddable[]}
     */
    function generateCartItems (clientDesignId, projects) {
      return projects.map(function (project) {
        return {
          id: project.variantId,
          quantity: project.volume,
          properties: {
            _clientDesignId: clientDesignId,
            _projectId: project.id,
          }
        }
      })
    }

    /**
     *
     * @param {Object.<string, number>} cartItemsToUpdateQuantity
     * @returns {Promise<void>}
     */
    function updateCartItemsQuantity (cartItemsToUpdateQuantity) {
      if (Object.keys(cartItemsToUpdateQuantity).length === 0) {
        return Promise.resolve();
      }

      return fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;'
        },
        body: JSON.stringify({   updates: cartItemsToUpdateQuantity })
      })
        .then(function (response) {
          // return response.json();
        })
    }

    function getAbsoluteShopifyCartUrl () {
      if (config.shopifyCartUrl[0] === '/') {
        return window.location.origin + config.shopifyCartUrl;
      }

      return config.shopifyCartUrl;
    }

    /**
     * @param {CartItem[]} cartItems
     * @param {string[]} projectIds
     * @returns {string[]}
     */
    function getKeysOfCartItemsRemovedFromProjects (cartItems, projectIds) {
      return cartItems
        .filter(function (item) {
          return projectIds.indexOf(item.properties._projectId) === -1;
        })
        .map(function (item) {
          return item.key;
        });
    }

    /**
     * @param {string} clientDesignId
     * @param {CartItem[]} cartItems
     * @returns {CartItem[]}
     */
    function findCartItemsByClientDesignId (clientDesignId, cartItems) {
      return cartItems.filter(function (item) {
        return item.properties && item.properties._clientDesignId === clientDesignId
      });
    }

    /**
     * @param {CartItem[]} cartItems
     * @param {string} projectId
     * @returns {CartItem | undefined}
     */
    function findCartItemByProjectId (cartItems, projectId) {
      return cartItems.find(function (item) {
        return item.properties._projectId === projectId
      });
    }

    function parseUrlQueryString (queryString) {
      return queryString.split('&').reduce(function (acc, current) {
        if (current === '') {
          return acc;
        }

        var pair = current.split('=');
        var name = pair[0];
        var value = pair[1];

        if (name === 'thumbUrl') {
          value = decodeURIComponent(value);
        }

        acc[name] = value;

        return acc;
      }, {});
    }

    function getUrlQueryString (url) {
      var questionMarkIndex = url.indexOf('?');

      if (questionMarkIndex < 0) {
        return '';
      }

      return url.substring(questionMarkIndex + 1);
    }

    /**
     * @param {UpdateCartUrlGetParams} getParams
     * @returns {Project[]}
     */
    function getProjectsFromUrlGet (getParams) {
      if (!getParams.projectIds || !getParams.projectVolumes || !getParams.projectVariantIds) {
        console.error('DESIGNER: no required url parameters');
        return [];
      }

      var projectIds = getParams.projectIds.split(',');
      var projectVolumes = getParams.projectVolumes.split(',');
      var projectVariantIds = getParams.projectVariantIds.split(',');

      if (projectIds.length !== projectVolumes.length || projectIds.length !== projectVariantIds.length) {
        console.error('DESIGNER: not equal number of url parameters');
        return [];
      }

      return projectIds.map(function (projectId, index) {
        return {
          id: projectId,
          variantId: parseInt(projectVariantIds[index], 10),
          volume: parseInt(projectVolumes[index]),
        }
      });
    }

    /**
     * @param {string} clientDesignId
     * @returns {string}
     */
    function getCreatorLink (clientDesignId) {
      return config.creatorUrl + '/' + config.langCode + '/?clientDesignId=' + clientDesignId;
    }

    /**
     * @param {number} variantId
     * @param {number} volume
     * @returns {Promise<any>}
     */
    function createClientDesign (variantId, volume) {
      return fetch(config.apiUrl + '/api/shopify-backend/variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;'
        },
        body: JSON.stringify({
          shopifyId: config.shopifyId,
          shopifyVariantId: variantId.toString(),
          volume: volume,
          returnUrl: getAbsoluteShopifyCartUrl()
        })
      })
        .then(function (e) {
          if (e.status !== 200) {
            throw new Error('Cant create clientDesign');
          }
          return e.json()
        })
    }

    /**
     * Przeniesienie do kreatora
     * @param {string} clientDesignId
     */
    function redirectToCreator (clientDesignId) {
      if (!clientDesignId) {
        return;
      }
      window.location.href = getCreatorLink(clientDesignId);
    }

    return {
      /**
       * Czy produkt jest personalizowany
       * @returns {boolean}
       */
      isCustomizableProduct: function () {
        return Boolean(Designer.productParams);
      },

      /**
       * Synchronizacja koszyka z parametrami przekazanymi w urlu
       * @param {string} url
       */
      synchronizeCart: function (url) {
        /** @type UpdateCartUrlGetParams */
        var getParams = parseUrlQueryString(getUrlQueryString(url));
        if (!getParams.clientDesignId) {
          return;
        }

        var projectsFromUrl = getProjectsFromUrlGet(getParams);
        if (projectsFromUrl.length === 0) {
          console.log('DESIGNER: no projects from url');
          return;
        }

        loadCart()
          .then(function (cart) {
            var projectIds = projectsFromUrl.map(function (project) {
              return project.id
            });
            var designerCartItems = findCartItemsByClientDesignId(getParams.clientDesignId, cart.items);
            /** @type {Object.<string, number>} */
            var updateQuantity = {};
            var keysOfCartItemsToRemove = getKeysOfCartItemsRemovedFromProjects(designerCartItems, projectIds);
            var addItems = false;

            projectsFromUrl.forEach(function (project) {
              var cartItem = findCartItemByProjectId(designerCartItems, project.id);
              if (!cartItem) {
                // brak projektu w koszyku
                addItems = true;
              } else if (cartItem.variant_id !== project.variantId) {
                // zmienił się projekt i jego wariantId w kreatorze, musimy podmienić pozycję w koszyku
                addItems = true;
              } else if (cartItem.quantity !== project.volume) {
                updateQuantity[cartItem.key] = project.volume;
              }
            })

            keysOfCartItemsToRemove.forEach(function (itemKey) {
              updateQuantity[itemKey] = 0;
            });

            // Gdy jest projekt do dodania, to usuwamy wszystkie pozycje powiązane z clientDesignId i dodajemy je na nowo (aby były zawsze obok siebie)
            if (addItems) {
              designerCartItems.forEach(function (cartItem) {
                updateQuantity[cartItem.key] = 0;
              });
            }

            function successUpdate () {
              // reload cart to remove get params
              window.location.href = getAbsoluteShopifyCartUrl();
            }

            return updateCartItemsQuantity(updateQuantity)
              .then(function () {
                if (addItems) {
                  return addCartItems(generateCartItems(getParams.clientDesignId, projectsFromUrl))
                    .then(successUpdate)
                } else {
                  successUpdate()
                }
              })
          })
          .catch(function (err) {
            console.error(err);
          })
      },

      /**
       * Tworzy clientDesign i przekierowuje użytkownika do kreatora
       * @param {number} variantId
       * @param {number} quantity
       * @returns {Promise<void>}
       */
      initializeCreator: function (variantId, quantity) {
        return new Promise(function (resolve, reject) {
          createClientDesign(variantId, quantity)
            .then(function (response) {
              redirectToCreator(response.id)
              resolve();
            })
            .catch(function (err) {
              reject(err);
            })
        })
      },

      /**
       * Przeniesienie do kreatora
       * @param {string} clientDesignId
       */
      redirectToCreator: redirectToCreator,

      /**
       * Usuwanie wszystkich pozycji z koszyka z podanym clientDesignId
       * @param {string} clientDesignId
       */
      removeCartItemsByClientDesignId: function (clientDesignId) {
        if (!clientDesignId) {
          return;
        }

        if (!confirm('Do you really want to delete these gang sheets?')) {
          return;
        }

        loadCart()
          .then(function (cart) {
            var cartItems = findCartItemsByClientDesignId(clientDesignId, cart.items);
            /** @type {Object.<string, number>} */
            var updateQuantity = {};
            var keysOfCartItemsToRemove = getKeysOfCartItemsRemovedFromProjects(cartItems, []);

            keysOfCartItemsToRemove.forEach(function (itemKey) {
              updateQuantity[itemKey] = 0;
            });

            function successUpdate () {
              // reload cart
              window.location.href = getAbsoluteShopifyCartUrl();
            }

            return updateCartItemsQuantity(updateQuantity)
              .then(function () {
                successUpdate()
              })
          })
          .catch(function (err) {
            console.error(err);
          })
      },

      /**
       * Podmiana miniaturki pozycji w koszyku na loader, a następnie na naszą miniaturkę, gdy zostanie wygenerowana.
       * @param {HTMLImageElement} dom
       * @param {string} thumbUrl
       */
      monitorThumb: function (dom, thumbUrl) {
        if (!thumbUrl || dom.src === thumbUrl || typeof dom.dataset.replaced !== 'undefined') {
          return;
        }
        dom.dataset.replaced = 'false';
        var originalSrc = dom.src;
        var loaderSrc = config.loaderSrc;
        var TRY_LIMIT = 30;

        var loadThumb = function (tryNumber) {
          var img = new Image();
          img.onload = function () {
            dom.src = thumbUrl;
            dom.dataset.replaced = 'true';
          }

          img.onerror = function () {
            if (tryNumber === 1) {
              dom.src = loaderSrc;
            }
            if (tryNumber < TRY_LIMIT) {
              setTimeout(function () {
                loadThumb(tryNumber + 1)
              }, 2000 * tryNumber);
            } else {
              dom.src = originalSrc;
            }
          }

          img.src = thumbUrl;
        }

        loadThumb(1);
      }
    }
  })()
);

Designer.synchronizeCart(window.location.href);
