(function () {
  const modalRoot = document.querySelector('[data-grt-global-quick-buy-modal]');
  if (!modalRoot) {
    return;
  }

  const dialog = modalRoot.querySelector('[data-grt-global-quick-buy-dialog]');
  const form = modalRoot.querySelector('[data-grt-modal-form]');
  const formTemplate = modalRoot.querySelector('[data-grt-modal-form-template]');
  const ratingTemplate = modalRoot.querySelector('[data-grt-modal-rating-template]');
  const variantContainer = modalRoot.querySelector('[data-grt-modal-variant-options]');
  const ratingEl = modalRoot.querySelector('[data-grt-modal-rating]');
  const titleEl = modalRoot.querySelector('[data-grt-modal-title]');
  const productLinkEl = modalRoot.querySelector('[data-grt-modal-product-link]');
  const descriptionEl = modalRoot.querySelector('[data-grt-modal-description]');
  const priceEl = modalRoot.querySelector('[data-grt-modal-price]');
  const compareEl = modalRoot.querySelector('[data-grt-modal-compare-price]');
  const imageEl = modalRoot.querySelector('[data-grt-modal-image-preview]');
  const sizeGrid = modalRoot.querySelector('[data-grt-modal-size-grid]');
  const sizeGridLabel = modalRoot.querySelector('[data-grt-modal-size-label]');
  const loadingEl = modalRoot.querySelector('[data-grt-modal-loading]');
  const loadingTextEl = modalRoot.querySelector('[data-grt-modal-loading-text]');
  const qtyInput = modalRoot.querySelector('[data-grt-qty-input]');
  const closeTriggers = modalRoot.querySelectorAll('[data-grt-global-quick-buy-close]');
  const currency = modalRoot.dataset.grtGlobalQuickBuyCurrency || 'USD';
  const qtyWrap = modalRoot.querySelector('[data-qty-wrap]');

  let currentProduct = null;
  let currentVariant = null;
  let selections = {};
  let hiddenIdInput = null;
  let currentVariantMap = {};
  let currentQuickBuyMetaPayload = null;
  let currentQuickBuyContext = null;
  let parentChildState = null;
  const productCache = {};
  const variantImageCache = {};
  const quickBuyMetaRequestCache = {};
  const quickBuyMetaPayloadCache = {};
  const modalSizeRequestCache = {};
  const modalSizePayloadCache = {};

  variantContainer.addEventListener('click', (event) => {
    const colorToggle = event.target.closest('[data-grt-parent-color-toggle]');
    if (colorToggle) {
      event.preventDefault();
      const group = colorToggle.closest('[data-grt-parent-color-group]');
      const palette = group?.querySelector('[data-grt-parent-color-palette]');
      const isExpanded = group?.classList.contains('is-color-expanded');
      if (isExpanded) {
        group.classList.remove('is-color-expanded');
        if (parentChildState) {
          applyStoredParentColorRowsLimit(parentChildState);
        }
      } else {
        group?.classList.add('is-color-expanded');
        palette?.querySelectorAll('.grt-global-quick-buy-modal__color-pill-hidden').forEach((pill) => {
          pill.classList.remove('grt-global-quick-buy-modal__color-pill-hidden');
        });
        colorToggle.textContent = 'See less';
      }
      return;
    }
    if (!parentChildState) return;
    const colorControl = event.target.closest('[data-grt-parent-color-key]');
    if (!colorControl) return;
    event.preventDefault();
    selectParentChildColor(colorControl.dataset.grtParentColorKey, parentChildState, currentProduct);
  });

  const formatMoney = (cents) => {
    if (typeof cents !== 'number') {
      return '--';
    }
    return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
      style: 'currency',
      currency
    }).format(cents / 100);
  };

  const updateParentChildColorLabel = (state, colorData) => {
    if (!state || !state.colorNameEl) return;
    const labelValue = String(colorData?.name || colorData?.key || '-').trim() || '-';
    state.colorNameEl.textContent = labelValue;
    state.colorNameEl.setAttribute('data-selected-color', labelValue);
  };

  const getParentColorMaxRows = () => {
    if (window.matchMedia && window.matchMedia('(max-width: 749px)').matches) {
      return 4;
    }
    return 2;
  };

  const clearParentColorRowsLimit = (state) => {
    const group = state?.colorGroupEl;
    const palette = state?.paletteEl;
    if (!group || !palette) return;
    group.querySelector('[data-grt-parent-color-toggle]')?.remove();
    group.classList.remove('is-color-expanded');
    palette.querySelectorAll('.grt-global-quick-buy-modal__color-pill-hidden').forEach((pill) => {
      pill.classList.remove('grt-global-quick-buy-modal__color-pill-hidden');
    });
  };

  const appendParentColorToggle = (state, totalColors, expanded) => {
    const group = state?.colorGroupEl;
    if (!group) return;
    group.querySelector('[data-grt-parent-color-toggle]')?.remove();
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'grt-global-quick-buy-modal__color-toggle';
    toggle.dataset.grtParentColorToggle = 'true';
    toggle.textContent = expanded ? 'See less' : `See all ${totalColors} colors`;
    group.appendChild(toggle);
  };

  const applyStoredParentColorRowsLimit = (state) => {
    const palette = state?.paletteEl;
    if (!palette) return;
    clearParentColorRowsLimit(state);

    const hiddenKeys = Array.isArray(state.hiddenColorKeys) ? state.hiddenColorKeys : [];
    if (!hiddenKeys.length) {
      applyParentColorRowsLimit(state);
      return;
    }

    let hiddenCount = 0;
    hiddenKeys.forEach((key) => {
      const pill = palette.querySelector(`[data-grt-parent-color-key="${CSS.escape(key)}"]`);
      if (!pill) return;
      pill.classList.add('grt-global-quick-buy-modal__color-pill-hidden');
      hiddenCount += 1;
    });

    if (hiddenCount > 0) {
      appendParentColorToggle(state, palette.querySelectorAll('[data-grt-parent-color-key]').length, false);
    }
  };

  const applyParentColorRowsLimit = (state) => {
    const group = state?.colorGroupEl;
    const palette = state?.paletteEl;
    if (!group || !palette) return;

    clearParentColorRowsLimit(state);

    const pills = Array.from(palette.querySelectorAll('[data-grt-parent-color-key]'));
    const totalColors = pills.length;
    if (!totalColors) return;

    const maxRows = getParentColorMaxRows();
    const rowTops = [];
    let hiddenStartTop = null;

    for (const pill of pills) {
      const top = Math.round(pill.offsetTop || 0);
      const exists = rowTops.some((rowTop) => Math.abs(rowTop - top) <= 2);
      if (!exists) {
        rowTops.push(top);
        if (rowTops.length === maxRows + 1) {
          hiddenStartTop = top;
          break;
        }
      }
    }

    if (hiddenStartTop == null) return;

    let hiddenCount = 0;
    state.hiddenColorKeys = [];
    pills.forEach((pill) => {
      const top = Math.round(pill.offsetTop || 0);
      if (top >= hiddenStartTop - 1) {
        pill.classList.add('grt-global-quick-buy-modal__color-pill-hidden');
        state.hiddenColorKeys.push(String(pill.dataset.grtParentColorKey || '').trim());
        hiddenCount += 1;
      }
    });

    if (!hiddenCount) return;
    appendParentColorToggle(state, totalColors, false);
  };

  const scheduleParentColorRowsLimit = (state) => {
    if (!state) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        applyParentColorRowsLimit(state);
      });
    });
  };

  const normalizeColorKey = (value) => String(value || '').trim().toLowerCase();

  const getSizeOptionMeta = (product) => {
    const options = Array.isArray(product?.options) ? product.options : [];
    let index = 0;
    options.some((optionName, optionIndex) => {
      if (String(optionName || '').trim().toLowerCase().includes('size')) {
        index = optionIndex;
        return true;
      }
      return false;
    });
    if (!options[index] && options.length > 1) {
      index = 1;
    }
    return {
      index,
      name: options[index] || 'Variant'
    };
  };

  const setModalLoading = (isLoading, message) => {
    modalRoot.classList.toggle('is-loading', Boolean(isLoading));
    if (loadingEl) {
      loadingEl.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
    }
    if (loadingTextEl && message) {
      loadingTextEl.textContent = message;
    }
  };

  const resetModalState = () => {
    parentChildState = null;
    selections = {};
    currentVariant = null;
    currentQuickBuyMetaPayload = null;
    currentQuickBuyContext = null;
    variantContainer.innerHTML = '';
    if (ratingEl) {
      ratingEl.classList.remove('has-yotpo-widget');
      ratingEl.innerHTML = '';
    }
    titleEl.textContent = 'Product Title';
    if (productLinkEl) {
      productLinkEl.setAttribute('href', '#');
    }
    descriptionEl.textContent = '';
    priceEl.textContent = '---';
    compareEl.textContent = '';
    compareEl.style.display = 'none';
    imageEl.removeAttribute('srcset');
    imageEl.src = imageEl.getAttribute('src') || imageEl.src;
    qtyInput.value = 1;
    hideSizeGrid();
  };

  const waitForImageLoad = (src) => {
    if (!src) return Promise.resolve();
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve();
      probe.onerror = () => resolve();
      probe.src = src;
      if (probe.complete) {
        resolve();
      }
    });
  };

  const getCardRatingSources = (trigger, product) => {
    const candidateCards = [];
    const triggerCard = trigger?.closest('.product-item');
    if (triggerCard) {
      candidateCards.push(triggerCard);
    }

    const handle = String(product?.handle || '').trim();
    if (handle) {
      document.querySelectorAll('[data-grt-quick-buy-trigger]').forEach((candidate) => {
        const candidateHandle = String(candidate.dataset.grtProductHandle || '').trim();
        const candidateCard = candidate.closest('.product-item');
        if (!candidateCard || candidateHandle !== handle || candidateCards.includes(candidateCard)) {
          return;
        }
        candidateCards.push(candidateCard);
      });
    }

    for (const card of candidateCards) {
      const yotpoWrapper = card.querySelector('#yotpoProductReviews');
      if (yotpoWrapper && yotpoWrapper.innerHTML.trim()) {
        return { card, yotpoWrapper };
      }

      const yotpoWidget = card.querySelector('.yotpo-widget-instance');
      if (yotpoWidget) {
        return { card, yotpoWidget };
      }
    }

    for (const card of candidateCards) {
      const nativeRating = card.querySelector('.product-item__ratings');
      if (nativeRating && nativeRating.innerHTML.trim()) {
        return { card, nativeRating };
      }
    }

    return {};
  };

  const getCardRatingMarkup = (trigger, product) => {
    const ratingSources = getCardRatingSources(trigger, product);
    if (ratingSources.nativeRating) {
      return {
        type: 'native',
        html: ratingSources.nativeRating.innerHTML
      };
    }

    return { type: '', html: '' };
  };

  function loadQuickBuyYotpo(productId) {
    const el = document.getElementById('quick-buy-yotpo');
    if (!el) return;

    el.setAttribute('data-yotpo-product-id', String(productId));
    el.innerHTML = '';

    if (window.yotpoWidgetsContainer && typeof window.yotpoWidgetsContainer.initWidgets === 'function') {
      window.yotpoWidgetsContainer.initWidgets();
      return;
    }

    if (window.yotpo && typeof window.yotpo.initWidgets === 'function') {
      window.yotpo.initWidgets();
    }
  }

  const buildModalYotpoMarkup = (productId, shirtStyle) => {
    if (!ratingTemplate || !productId) return '';
    const templateContent = ratingTemplate.content.cloneNode(true);
    const shell = templateContent.querySelector('[data-grt-modal-yotpo-shell]');
    const widget = templateContent.querySelector('#quick-buy-yotpo');
    if (shell && shirtStyle) {
      shell.classList.add(`style-${String(shirtStyle).trim()}`);
    }
    if (widget) {
      widget.setAttribute('data-yotpo-product-id', String(productId));
    }
    const container = document.createElement('div');
    container.appendChild(templateContent);
    return container.innerHTML;
  };

  const renderModalRating = (trigger, product) => {
    if (!ratingEl) return;
    if (product?.id) {
      const resolvedShirtStyle = String(currentQuickBuyMetaPayload?.shirt_style || currentQuickBuyContext?.shirtStyle || '').trim();
      ratingEl.classList.add('has-yotpo-widget');
      ratingEl.innerHTML = buildModalYotpoMarkup(product.id, resolvedShirtStyle);
      loadQuickBuyYotpo(product.id);
      return;
    }

    const ratingMarkup = getCardRatingMarkup(trigger, product);
    ratingEl.innerHTML = ratingMarkup.html || '';
  };

  const readVariantOption = (variant, index) => {
    if (variant.options && variant.options[index] !== undefined) {
      return variant.options[index];
    }
    return variant[`option${index + 1}`];
  };

  const findVariant = (product, selectionMap) => {
    if (!product || !product.variants) return null;
    return product.variants.find((variant) => {
      return product.options.every((optionName, index) => {
        const selectedValue = selectionMap[optionName];
        if (!selectedValue) return true;
        const optionValue = readVariantOption(variant, index);
        return selectedValue.toString() === (optionValue || '').toString();
      });
    });
  };

  const collectOptionValues = (product, index) => {
    const values = new Set();
    product.variants.forEach((variant) => {
      const optionValue = variant[`option${index + 1}`];
      if (optionValue) {
        values.add(optionValue);
      }
    });
    return Array.from(values);
  };

  const buildParentChildState = (metaPayload) => {
    const colorMap = new Map();
    const variantLookup = new Map();
    const metaColors = Array.isArray(metaPayload?.colors) ? metaPayload.colors : [];

    metaColors.forEach((color) => {
      const colorKey = normalizeColorKey(color.key || color.name || color.query);
      if (!colorKey || colorMap.has(colorKey)) return;
      colorMap.set(colorKey, {
        key: colorKey,
        name: String(color.name || color.query || color.key || colorKey).trim(),
        colorHex: normalizeHex(color.colorHex || '#000000') || '#000000',
        colorSecondaryHex: normalizeHex(color.colorSecondaryHex || ''),
        colorQuery: String(color.query || color.name || color.key || '').trim(),
        colorVariantId: String(color.variantId || '').trim(),
        variants: [],
        sizeRows: []
      });
      if (color.colorVariantId) {
        variantLookup.set(String(color.colorVariantId).trim(), { colorKey });
      }
    });

    if (!metaColors.length) {
      return { colorMap, variantLookup, paletteEl: null, sizeListEl: null, activeColorKey: '', selectedVariantId: '' };
    }

    return { colorMap, variantLookup, paletteEl: null, activeColorKey: '', selectedVariantId: '' };
  };

  const normalizeHex = (hex) => {
    const value = String(hex || '').trim();
    if (!value) return '';
    return value.charAt(0) === '#' ? value : `#${value}`;
  };

  const toHsl = (hex) => {
    const clean = normalizeHex(hex);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
    if (!result) return [0, 0, 0];

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const getColorCategory = (hue, saturation) => {
    if (saturation < 0.2) return 'grayscale';
    if ((hue >= 330 && hue <= 360) || (hue >= 0 && hue <= 16)) return 'red';
    if (hue > 16 && hue <= 42) return 'orange';
    if (hue > 42 && hue <= 65) return 'yellow';
    if (hue > 65 && hue <= 165) return 'green';
    if (hue > 165 && hue <= 190) return 'cyan';
    if (hue > 190 && hue <= 255) return 'blue';
    if (hue > 255 && hue <= 295) return 'violet';
    if (hue > 295 && hue < 330) return 'magenta';
    return 'other';
  };

  const getSortedColorEntries = (state) => {
    if (!state?.colorMap) return [];
    const groups = {
      grayscale: [],
      red: [],
      orange: [],
      yellow: [],
      green: [],
      cyan: [],
      blue: [],
      violet: [],
      magenta: [],
      other: []
    };

    state.colorMap.forEach((colorData) => {
      const [hue, saturation, lightness] = toHsl(colorData.colorHex);
      const category = getColorCategory(hue, saturation);
      groups[category].push({ colorData, lightness });
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.lightness - a.lightness);
    });

    return ['grayscale', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'violet', 'magenta', 'other']
      .flatMap((key) => groups[key])
      .map((entry) => entry.colorData);
  };

  const getModalSizeRequestKey = (handle, fetchValue) => {
    if (!handle || !fetchValue) return '';
    return `${handle}::${fetchValue}`;
  };

  const showSizeGridLoading = () => {
    if (!sizeGrid) return;
    sizeGrid.innerHTML = '<div class="grt-global-quick-buy-modal__loading-inline">Loading sizes...</div>';
    sizeGrid.style.display = '';
    if (sizeGridLabel) {
      sizeGridLabel.style.display = 'none';
    }
    if (qtyWrap) {
      qtyWrap.style.display = 'none';
    }
  };

  const parseRowsFromModalSizes = (html) => {
    const results = [];
    if (!html) return results;
    const container = document.createElement('div');
    container.innerHTML = html;
    container.querySelectorAll('.variant-price-2').forEach((card) => {
      const labelEl = card.querySelector('label');
      const sizeLabel = labelEl ? labelEl.textContent.trim() : 'Size';
      const inputEl = card.querySelector('.itemQuantity');
      if (!inputEl) return;
      const maxAttr = parseInt(inputEl?.dataset?.max || '0', 10);
      if (Number.isNaN(maxAttr) || maxAttr <= 0) return;
      const variantId = inputEl?.dataset?.id ? String(inputEl.dataset.id).trim() : '';
      const priceAttr = parseInt(inputEl?.dataset?.price || '0', 10);
      const tierPricing = String(inputEl?.dataset?.tiers || inputEl?.dataset?.tp || '').trim();
      results.push({
        id: variantId,
        size: sizeLabel || 'Size',
        basePrice: Number.isNaN(priceAttr) ? 0 : priceAttr,
        inventory: Number.isNaN(maxAttr) ? 0 : maxAttr,
        tierPricing
      });
    });
    return results;
  };

  const requestModalSizeRows = (handle, fetchValue) => {
    const requestKey = getModalSizeRequestKey(handle, fetchValue);
    if (!requestKey) {
      return Promise.reject(new Error('Missing modal size request key'));
    }
    if (modalSizePayloadCache[requestKey]) {
      return Promise.resolve(modalSizePayloadCache[requestKey]);
    }
    if (modalSizeRequestCache[requestKey]) {
      return modalSizeRequestCache[requestKey];
    }
    const endpoint = `/products/${handle}?view=get_handle_modal&variant=${encodeURIComponent(fetchValue)}`;
    modalSizeRequestCache[requestKey] = fetch(endpoint, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Size data request failed (${response.status})`);
        }
        return response.json();
      })
      .then((payload) => {
        const rows = parseRowsFromModalSizes(payload?.sizes || '');
        modalSizePayloadCache[requestKey] = rows;
        delete modalSizeRequestCache[requestKey];
        return rows;
      })
      .catch((error) => {
        delete modalSizeRequestCache[requestKey];
        throw error;
      });
    return modalSizeRequestCache[requestKey];
  };

  const setCurrentProductState = (product) => {
    currentProduct = product || null;
    currentVariantMap = {};
    if (!product || !Array.isArray(product.variants)) return;
    product.variants.forEach((variant) => {
      currentVariantMap[String(variant.id)] = variant;
    });
  };

  const fetchVariantImage = (variantId) => {
    const cleanVariantId = String(variantId || '').trim();
    if (!cleanVariantId) {
      return Promise.resolve('');
    }
    if (variantImageCache[cleanVariantId] !== undefined) {
      return Promise.resolve(variantImageCache[cleanVariantId]);
    }

    return fetch(`/variants/${encodeURIComponent(cleanVariantId)}.js`, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Variant image request failed (${response.status})`);
        }
        return response.json();
      })
      .then((payload) => {
        const src = String(
          payload?.featured_image?.src ||
          payload?.featured_media?.preview_image?.src ||
          ''
        ).trim();
        variantImageCache[cleanVariantId] = src;
        return src;
      })
      .catch(() => {
        variantImageCache[cleanVariantId] = '';
        return '';
      });
  };

  const getColorFetchValue = (colorData, variantId) => {
    if (!colorData) return '';
    const base = String(colorData.colorQuery || colorData.name || colorData.key || '').trim();
    if (!base) return '';
    const resolvedVariantId = String(variantId || '').trim();
    if (resolvedVariantId) {
      return `${base}_${resolvedVariantId}`;
    }
    return base;
  };

  const getSizeRowsFromVariants = (colorData) => {
    if (!colorData || !Array.isArray(colorData.variants)) return [];
    const seenIds = new Set();
    const rows = [];
    colorData.variants.forEach((variant) => {
      const variantId = String(variant.id || '').trim();
      if (!variantId || seenIds.has(variantId)) return;
      seenIds.add(variantId);
      const label = String(variant.sizeLabel || variant.sizeValue || variant.title || variant.option2 || variant.option3 || variant.option1 || 'Size').trim();
      const basePrice = parseInt(variant.price || 0, 10);
      let inventory = parseInt(
        variant.inventory_quantity ?? variant.inventory ?? 0,
        10
      );
      if (Number.isNaN(inventory)) {
        inventory = 0;
      }
      const tierPricing = variant.tier_pricing || (variant?.metafields?.custom?.tier_pricing || '');
      rows.push({
        id: variantId,
        size: label || 'Size',
        basePrice: Number.isNaN(basePrice) ? 0 : basePrice,
        inventory,
        tierPricing,
        isOut: variant.available === false
      });
    });
    return rows;
  };

  const getSizeRowsForColor = (colorData) => {
    if (!colorData) return [];
    if (Array.isArray(colorData.sizeRows) && colorData.sizeRows.length) {
      return colorData.sizeRows;
    }
    return getSizeRowsFromVariants(colorData);
  };

  const loadParentChildColorSizes = (colorData, fetchValue) => {
    if (!colorData || !fetchValue) return Promise.resolve(null);
    const handle = String(currentQuickBuyContext?.parentHandle || currentProduct?.handle || '').trim();
    if (!handle) return Promise.resolve(null);
    if (colorData.sizeRows && colorData.sizeRows.length) {
      return Promise.resolve(colorData.sizeRows);
    }
    showSizeGridLoading();
    return requestModalSizeRows(handle, fetchValue)
      .then((rows) => {
        colorData.sizeRows = rows;
        buildSizeQtyGridForColor(colorData);
        return rows;
      })
      .catch((error) => {
        console.error('Quick buy size fetch failed', error);
        buildSizeQtyGridForColor(colorData);
        return null;
      });
  };

  const highlightActiveSizeRow = (variantId) => {
    if (!sizeGrid) return;
    sizeGrid.querySelectorAll('[data-size-row]').forEach((row) => {
      row.classList.toggle('is-active', row.dataset.sizeId === variantId);
    });
  };

  const selectParentChildSize = (variantId, state, product) => {
    if (!state) return;
    const resolvedId = String(variantId || '').trim();
    if (!resolvedId) return;
    state.selectedVariantId = resolvedId;
    highlightActiveSizeRow(resolvedId);
    const variantObj = currentVariantMap[resolvedId];
    if (variantObj) {
      updateSelectedVariant(product, variantObj);
    }
  };

  const hydrateParentChildProduct = (colorData, preferredVariantId) => {
    const handle = String(colorData?.handle || currentQuickBuyContext?.sourceHandle || '').trim();
    if (!handle) {
      return Promise.resolve({
        product: currentProduct,
        variant: currentVariant
      });
    }

    return fetchProduct(handle)
      .then((product) => {
        setCurrentProductState(product);
        const resolvedVariantId = String(preferredVariantId || colorData?.colorVariantId || '').trim();
        const variant = product?.variants?.find((item) => String(item.id) === resolvedVariantId) || product?.selected_or_first_available_variant || product?.variants?.[0] || null;
        if (variant) {
          updateSelectedVariant(product, variant);
        }
        return { product, variant };
      })
      .catch((error) => {
        console.error('Quick buy color product fetch failed', error);
        return {
          product: currentProduct,
          variant: currentVariant
        };
      });
  };

  const selectParentChildColor = (colorKey, state, product, options = {}) => {
    if (!state || !colorKey) return;
    let resolvedColorKey = colorKey;
    if (!state.colorMap.has(resolvedColorKey)) {
      const nextKey = state.colorMap.keys().next();
      resolvedColorKey = nextKey.done ? '' : nextKey.value;
    }
    const colorData = state.colorMap.get(resolvedColorKey);
    if (!colorData) return;
    state.activeColorKey = colorData.key;
    updateParentChildColorLabel(state, colorData);
    state.paletteEl?.querySelectorAll('[data-grt-parent-color-key]').forEach((btn) => {
      const isActive = btn.dataset.grtParentColorKey === colorData.key;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const candidateVariantId = (options.initialVariantId && state.variantLookup.get(String(options.initialVariantId))?.colorKey === colorData.key)
      ? options.initialVariantId
      : (state.selectedVariantId && state.variantLookup.get(String(state.selectedVariantId))?.colorKey === colorData.key)
        ? state.selectedVariantId
        : String(colorData.variants[0]?.id || colorData.colorVariantId || '');
    state.selectedVariantId = candidateVariantId;
    const colorImageVariantId = String(colorData.colorVariantId || candidateVariantId || '').trim();
    return hydrateParentChildProduct(colorData, candidateVariantId)
      .then((resolvedState) => {
        const resolvedProduct = resolvedState?.product || product;
        const resolvedVariantId = String(resolvedState?.variant?.id || candidateVariantId || '').trim();
        if (resolvedVariantId) {
          state.selectedVariantId = resolvedVariantId;
          colorData.colorVariantId = resolvedVariantId;
        }
        buildSizeQtyGridForColor(colorData);
        const fetchValue = getColorFetchValue(colorData, resolvedVariantId);
        const loadPromise = fetchValue ? loadParentChildColorSizes(colorData, fetchValue) : Promise.resolve(null);
        if (resolvedVariantId) {
          selectParentChildSize(resolvedVariantId, state, resolvedProduct);
        }
        const imagePromise = colorImageVariantId
          ? fetchVariantImage(colorImageVariantId).then((src) => {
            if (src) {
              imageEl.src = src;
              imageEl.alt = colorData.name || resolvedProduct?.title || '';
            }
          })
          : Promise.resolve();
        return Promise.all([loadPromise, imagePromise]);
      });
  };

  const renderParentChildControls = (product, context, initialVariant, metaPayload) => {
    currentQuickBuyMetaPayload = metaPayload || {};
    parentChildState = buildParentChildState(metaPayload);
    if (!parentChildState.colorMap.size) {
      variantContainer.innerHTML = '';
      return Promise.resolve();
    }
    variantContainer.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'grt-global-quick-buy-modal__color-label';
    label.innerHTML = 'Selected color: <span class="grt-global-quick-buy-modal__color-name" data-grt-parent-color-name aria-live="polite">-</span>';
    const colorGroup = document.createElement('div');
    colorGroup.className = 'grt-global-quick-buy-modal__color-group';
    colorGroup.dataset.grtParentColorGroup = 'true';
    colorGroup.appendChild(label);
    variantContainer.appendChild(colorGroup);
    const palette = document.createElement('div');
    palette.className = 'grt-global-quick-buy-modal__color-palette';
    palette.dataset.grtParentColorPalette = 'true';
    getSortedColorEntries(parentChildState).forEach((colorData) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'grt-global-quick-buy-modal__color-pill';
      button.dataset.grtParentColorKey = colorData.key;
      button.setAttribute('title', colorData.name || colorData.key);
      button.style.setProperty('--grt-color-chip', colorData.colorSecondaryHex
        ? `repeating-linear-gradient(90deg, ${colorData.colorHex}, ${colorData.colorHex} 15px, ${colorData.colorSecondaryHex} 15px, ${colorData.colorSecondaryHex} 30px)`
        : colorData.colorHex);
      palette.appendChild(button);
    });
    colorGroup.appendChild(palette);
    parentChildState.paletteEl = palette;
    parentChildState.colorGroupEl = colorGroup;
    parentChildState.colorNameEl = label.querySelector('[data-grt-parent-color-name]');
    const initialVariantId = String(initialVariant?.id || '');
    const initialColorKeyFromContext = normalizeColorKey(context?.initialColorName);
    parentChildState.selectedVariantId = initialVariantId || '';
    const initialEntry = parentChildState.variantLookup.get(initialVariantId);
    const initialColorKey = (
      (normalizeColorKey(metaPayload?.selected_color_key) && parentChildState.colorMap.has(normalizeColorKey(metaPayload?.selected_color_key)) && normalizeColorKey(metaPayload?.selected_color_key)) ||
      (initialColorKeyFromContext && parentChildState.colorMap.has(initialColorKeyFromContext) && initialColorKeyFromContext) ||
      initialEntry?.colorKey ||
      parentChildState.colorMap.keys().next().value
    );
    scheduleParentColorRowsLimit(parentChildState);
    return selectParentChildColor(initialColorKey, parentChildState, product, { initialVariantId });
  };

  const RETAIL_PRICE_MULTIPLIER = 1.96;
  let sizeGridRefreshTimer = null;
  const htmlEscape = (str) => String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const parseTierPricing = (tierPricingRaw) => {
    if (!tierPricingRaw) return [];
    const tierBreaks = [99, 150, 250, 500, 1000, 1750, 3800];
    const normalize = (values) => {
      if (!values || !values.length) return [];
      return values
        .map((v) => parseInt(String(v).trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
    };

    if (Array.isArray(tierPricingRaw)) {
      return normalize(tierPricingRaw);
    }

    if (typeof tierPricingRaw === 'object') {
      const objectTiers = [];
      for (let i = 0; i < tierBreaks.length; i++) {
        const key = String(tierBreaks[i]);
        if (tierPricingRaw[key] != null) objectTiers.push(tierPricingRaw[key]);
      }
      if (objectTiers.length) return normalize(objectTiers);
      return normalize(Object.keys(tierPricingRaw).map((k) => tierPricingRaw[k]));
    }

    const raw = String(tierPricingRaw).trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalize(parsed);
      if (parsed && typeof parsed === 'object') {
        const parsedTiers = [];
        for (let j = 0; j < tierBreaks.length; j++) {
          const parsedKey = String(tierBreaks[j]);
          if (parsed[parsedKey] != null) parsedTiers.push(parsed[parsedKey]);
        }
        if (parsedTiers.length) return normalize(parsedTiers);
        return normalize(Object.keys(parsed).map((k) => parsed[k]));
      }
    } catch (e) {
      // ignore
    }

    if (raw.indexOf(':') > -1) {
      const valueMatches = raw.match(/:\s*"?([0-9]+)"?/g) || [];
      if (valueMatches.length) {
        return normalize(
          valueMatches.map((chunk) => {
            const parts = chunk.split(':');
            return parts.length > 1 ? parts[1].replace(/"/g, '').trim() : '';
          })
        );
      }
    }

    return normalize(raw.split(','));
  };

  const getTierLevel = (virtualTotal) => {
    if (virtualTotal >= 3800) return 7;
    if (virtualTotal >= 1750) return 6;
    if (virtualTotal >= 1000) return 5;
    if (virtualTotal >= 500) return 4;
    if (virtualTotal >= 250) return 3;
    if (virtualTotal >= 150) return 2;
    if (virtualTotal >= 99) return 1;
    return 0;
  };

  const getTierPrice = (basePrice, tierPricingRaw, tierLevel) => {
    const tiers = parseTierPricing(tierPricingRaw);
    if (tierLevel > 0 && tiers.length >= tierLevel) return tiers[tierLevel - 1];
    return basePrice;
  };

  const getCartTotalPrice = () => {
    return fetch('/cart.js')
      .then((response) => response.json())
      .then((data) => {
        const total = parseInt((data && data.total_price) || 0, 10);
        return Number.isNaN(total) ? 0 : total;
      })
      .catch(() => 0);
  };

  const hideSizeGrid = () => {
    if (sizeGrid) {
      sizeGrid.innerHTML = '';
      sizeGrid.style.display = 'none';
    }
    if (sizeGridLabel) {
      sizeGridLabel.style.display = 'none';
    }
    if (qtyWrap) {
      qtyWrap.style.display = '';
    }
    if (sizeGridRefreshTimer) {
      clearTimeout(sizeGridRefreshTimer);
      sizeGridRefreshTimer = null;
    }
  };

  const buildSizeQtyGridForColor = (colorData) => {
    if (!sizeGrid || !sizeGridLabel || !qtyWrap) return;
    if (!colorData) {
      hideSizeGrid();
      return;
    }
    const rows = getSizeRowsForColor(colorData);
    if (!rows.length) {
      hideSizeGrid();
      return;
    }
    const labelText = currentQuickBuyMetaPayload?.size_option_name || getSizeOptionMeta(currentProduct).name || 'Variant';
    sizeGridLabel.textContent = labelText;
    sizeGridLabel.style.display = '';
    let html = '';
    let hasPurchasableRows = false;
    rows.forEach((row) => {
      const basePrice = Number.isNaN(row.basePrice) ? 0 : row.basePrice;
      const inventory = Number.isNaN(row.inventory) ? 0 : row.inventory;
      const hasInput = !row.isOut && row.id;
      const retailPrice = Math.round(basePrice * RETAIL_PRICE_MULTIPLIER);
      html += `<div class="grt-global-quick-buy-modal__size-row${hasInput ? '' : ' is-out'}" data-size-row data-size-id="${row.id}" data-base-price="${basePrice}" data-tier-pricing="${htmlEscape(row.tierPricing)}">`;
      html += `<div class="grt-global-quick-buy-modal__size-row-size"><span class="grt-global-quick-buy-modal__size-row-value">${htmlEscape(row.size)}</span></div>`;
      html += '<div class="grt-global-quick-buy-modal__size-row-qty">';
      if (hasInput) {
        html += `<input class="grt-global-quick-buy-modal__size-input" data-grt-size-qty-input data-size-qty-input type="number" min="0" max="${inventory}" value="" data-id="${row.id}" data-base-price="${basePrice}" data-tier-pricing="${htmlEscape(row.tierPricing)}" data-max="${inventory}" aria-label="Quantity for size ${htmlEscape(row.size)}">`;
        hasPurchasableRows = true;
      } else {
        html += '<div class="grt-global-quick-buy-modal__size-row-out">OUT</div>';
      }
      html += '</div>';
      if (hasInput) {
        html += `<div class="grt-global-quick-buy-modal__size-row-price-wrap"><div class="grt-global-quick-buy-modal__size-row-compare" data-size-compare-price>${formatMoney(retailPrice)}</div><div class="grt-global-quick-buy-modal__size-row-price" data-size-unit-price>${formatMoney(basePrice)}</div></div>`;
      } else {
        html += '<div class="grt-global-quick-buy-modal__size-row-price-wrap"></div>';
      }
      html += '</div>';
    });
    sizeGrid.innerHTML = html;
    sizeGrid.style.display = '';
    qtyWrap.style.display = 'none';
    const submitButton = modalRoot.querySelector('[data-grt-modal-submit]');
    if (submitButton) {
      submitButton.disabled = !hasPurchasableRows;
    }
    highlightActiveSizeRow(parentChildState?.selectedVariantId || '');
    scheduleSizeGridPriceRefresh();
  };

  const scheduleSizeGridPriceRefresh = () => {
    if (sizeGridRefreshTimer) {
      clearTimeout(sizeGridRefreshTimer);
    }
    sizeGridRefreshTimer = setTimeout(() => {
      refreshSizeGridPrices();
    }, 200);
  };

  const refreshSizeGridPrices = () => {
    if (!sizeGrid) return;
    const rows = sizeGrid.querySelectorAll('[data-size-row]');
    if (!rows.length) return;
    getCartTotalPrice().then((cartTotal) => {
      let formTotalOriginal = 0;
      rows.forEach((row) => {
        const $input = row.querySelector('[data-grt-size-qty-input]');
        if (!$input) return;
        const qty = parseInt($input.value || '0', 10);
        if (Number.isNaN(qty) || qty < 1) return;
        const base = parseInt(row.dataset.basePrice || '0', 10);
        if (!Number.isNaN(base) && base > 0) {
          formTotalOriginal += base * qty;
        }
      });
      const virtualTotal = (cartTotal + formTotalOriginal) / 100;
      const tierLevel = getTierLevel(virtualTotal);
      rows.forEach((row) => {
        const tierPricing = row.dataset.tierPricing || '';
        const rowBase = parseInt(row.dataset.basePrice || '0', 10);
        const priceEl = row.querySelector('[data-size-unit-price]');
        const compareEl = row.querySelector('[data-size-compare-price]');
        let unitPrice = rowBase;
        if (!Number.isNaN(rowBase) && rowBase > 0) {
          unitPrice = getTierPrice(rowBase, tierPricing, tierLevel);
        }
        if (compareEl) compareEl.textContent = formatMoney(Math.round(unitPrice * RETAIL_PRICE_MULTIPLIER));
        if (priceEl) priceEl.textContent = formatMoney(unitPrice);
      });
    });
  };

  if (sizeGrid) {
    sizeGrid.addEventListener('input', (event) => {
      const target = event.target.closest('[data-grt-size-qty-input]');
      if (!target) return;
      const value = parseInt(target.value || '0', 10);
      const max = parseInt(target.getAttribute('data-max') || '0', 10);
      if (!Number.isNaN(max) && max > 0 && value > max) {
        target.value = max;
      }
      if (value < 0) {
        target.value = 0;
      }
      scheduleSizeGridPriceRefresh();
    });
  }

  const showGridMessage = (message) => {
    if (typeof window.toast === 'function') {
      window.toast('Quick buy', message, 'red');
    } else {
      console.warn(message);
    }
  };

  const addItemsToCart = (items) => {
    if (!items.length) {
      showGridMessage('Select at least one size');
      return Promise.reject(new Error('No items selected'));
    }
    const submitButton = modalRoot.querySelector('[data-grt-modal-submit]');
    const originalHtml = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = 'Adding...';
    }
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ items })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to add to cart');
        }
        return response.json();
      })
      .then(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalHtml;
        }
        if (typeof window.refreshCart === 'function') {
          window.refreshCart('notOpen');
        } else {
          document.dispatchEvent(new Event('cart:updated'));
        }
        if (typeof window.toast === 'function') {
          window.toast('Added to cart', 'Your selections were added');
        }
        hideSizeGrid();
        sizeGrid?.querySelectorAll('[data-grt-size-qty-input]').forEach((input) => {
          input.value = '';
        });
        closeDialog();
      })
      .catch((error) => {
        console.error('Quick buy add to cart error', error);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalHtml;
        }
        showGridMessage('Unable to add to cart');
      });
  };

  const renderVariantControls = (product, initialVariant, context) => {
    if (!product || !product.options) {
      variantContainer.innerHTML = '';
      return Promise.resolve();
    }
    const renderStandardControls = () => {
      parentChildState = null;
      hideSizeGrid();
      selections = {};
      variantContainer.innerHTML = '';

      product.options.forEach((optionName, optionIndex) => {
        const select = document.createElement('select');
        select.className = 'grt-global-quick-buy-modal__option';
        select.dataset.grtOptionName = optionName;

        const availableValues = collectOptionValues(product, optionIndex);
        availableValues.forEach((value) => {
          const optionElement = document.createElement('option');
          optionElement.value = value;
          optionElement.textContent = value;
          select.appendChild(optionElement);
        });

        const label = document.createElement('label');
        label.textContent = optionName;
        label.className = 'grt-global-quick-buy-modal__option-label';

        const wrapper = document.createElement('div');
        wrapper.className = 'grt-global-quick-buy-modal__option-wrapper';
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        variantContainer.appendChild(wrapper);

        select.addEventListener('change', () => {
          selections[optionName] = select.value;
          updateSelectedVariant(product);
        });

        const defaultValue = initialVariant?.options[optionIndex] || select.options[0].value;
        select.value = defaultValue;
        selections[optionName] = defaultValue;
      });

      updateSelectedVariant(product, initialVariant);
      return Promise.resolve();
    };

    return requestMergedQuickBuyMeta(context, product)
      .then((metaPayload) => {
        const isParentChildFlow = Boolean(
          context?.shirtStyle ||
          metaPayload?.shirt_style ||
          (Array.isArray(metaPayload?.colors) && metaPayload.colors.length)
        );
        if (isParentChildFlow) {
          return renderParentChildControls(product, context, initialVariant, metaPayload);
        }
        return renderStandardControls();
      })
      .catch((error) => {
        console.error('Quick buy meta preflight failed', error);
        return renderStandardControls();
      });
  };

  const updateSelectedVariant = (product, forcedVariant) => {
    const variant = forcedVariant || findVariant(product, selections) || product.variants[0];
    if (!variant) return;
    currentVariant = variant;
    updatePrice(variant);
    updateImage(variant, product);
    updateHiddenInput(variant);
    renderSizeGrid(variant);
  };

  const updatePrice = (variant) => {
    if (!variant) return;
    priceEl.textContent = formatMoney(variant.price);
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      compareEl.textContent = formatMoney(variant.compare_at_price);
      compareEl.style.display = 'inline-block';
    } else {
      compareEl.style.display = 'none';
    }
  };

  const updateHiddenInput = (variant) => {
    if (!variant) return;
    if (!hiddenIdInput && formTemplate) {
      const templateContent = formTemplate.content.cloneNode(true);
      hiddenIdInput = templateContent.querySelector('input[name="id"]');
      form.insertBefore(templateContent, form.firstElementChild);
    }
    if (hiddenIdInput) {
      hiddenIdInput.value = variant.id;
    }
  };

  const updateImage = (variant, product) => {
    const featuredImage = variant?.featured_image?.src
      || variant?.featured_media?.preview_image?.src
      || variant?.image?.src
      || '';
    const productFeaturedImage = typeof product?.featured_image === 'string'
      ? product.featured_image
      : product?.featured_image?.src || product?.featured_media?.preview_image?.src || '';
    const fallbackProductImage = Array.isArray(product?.images) && product.images.length
      ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.src || '')
      : '';
    const imageSrc = featuredImage || productFeaturedImage || fallbackProductImage;
    if (!imageSrc) return;
    imageEl.src = imageSrc;
    imageEl.alt = variant?.name || product?.title || '';
  };

  const renderSizeGrid = (variant) => {
    if (!variant) {
      sizeGrid.textContent = '';
      return;
    }
    if (!parentChildState) {
      sizeGrid.innerHTML = '';
      sizeGrid.style.display = 'none';
    }
  };

  const openDialog = () => {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.documentElement.classList.add('grt-modal-open');
    document.body.classList.add('grt-modal-open');
  };

  const closeDialog = () => {
    if (!dialog) return;
    setModalLoading(false);
    if (dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    document.documentElement.classList.remove('grt-modal-open');
    document.body.classList.remove('grt-modal-open');
  };

  const bindClose = () => {
    closeTriggers.forEach((trigger) => {
      trigger.addEventListener('click', closeDialog);
    });
    if (dialog) {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) {
          closeDialog();
        }
      });
    }
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    });
  };

  const fetchProduct = (handle) => {
    if (!handle) {
      return Promise.reject(new Error('Missing handle'));
    }
    if (productCache[handle]) {
      return Promise.resolve(productCache[handle]);
    }

    const endpoint = `/products/${handle}.js`;
    return fetch(endpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load product data');
        }
        return response.json();
      })
      .then((payload) => {
        productCache[handle] = payload;
        return payload;
      });
  };

  const requestQuickBuyMeta = (handle, colorValue) => {
    const requestKey = `${handle}::${String(colorValue || '').trim()}`;
    if (quickBuyMetaPayloadCache[requestKey]) {
      console.log('[grt-quick-buy] meta cache hit', {
        handle,
        colorValue: String(colorValue || '').trim(),
        requestKey
      });
      return Promise.resolve(quickBuyMetaPayloadCache[requestKey]);
    }
    if (quickBuyMetaRequestCache[requestKey]) {
      console.log('[grt-quick-buy] meta request in flight', {
        handle,
        colorValue: String(colorValue || '').trim(),
        requestKey
      });
      return quickBuyMetaRequestCache[requestKey];
    }
    const endpoint = `/products/${handle}?view=grt_global_quick_buy&variant=${encodeURIComponent(String(colorValue || '').trim())}`;
    console.log('[grt-quick-buy] requesting meta', {
      handle,
      colorValue: String(colorValue || '').trim(),
      requestKey,
      endpoint
    });
    quickBuyMetaRequestCache[requestKey] = fetch(endpoint, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Quick buy meta request failed (${response.status})`);
        }
        return response.json();
      })
      .then((payload) => {
        quickBuyMetaPayloadCache[requestKey] = payload;
        delete quickBuyMetaRequestCache[requestKey];
        return payload;
      })
      .catch((error) => {
        delete quickBuyMetaRequestCache[requestKey];
        throw error;
      });
    return quickBuyMetaRequestCache[requestKey];
  };

  const mergeColorMetaPayloads = (payloads) => {
    const merged = {
      shirt_style: '',
      size_option_name: '',
      selected_color_key: '',
      colors: []
    };
    const seenColorKeys = new Set();

    payloads.forEach((payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (!merged.shirt_style && payload.shirt_style) {
        merged.shirt_style = String(payload.shirt_style || '').trim();
      }
      if (!merged.size_option_name && payload.size_option_name) {
        merged.size_option_name = String(payload.size_option_name || '').trim();
      }
      if (!merged.selected_color_key && payload.selected_color_key) {
        merged.selected_color_key = normalizeColorKey(payload.selected_color_key);
      }
      const colors = Array.isArray(payload.colors) ? payload.colors : [];
      colors.forEach((color) => {
        const colorKey = normalizeColorKey(color?.key || color?.name || color?.query);
        if (!colorKey || seenColorKeys.has(colorKey)) return;
        seenColorKeys.add(colorKey);
        merged.colors.push(color);
      });
    });

    return merged;
  };

  const requestMergedQuickBuyMeta = (context, product) => {
    const handles = [];
    const sourceHandle = String(context?.sourceHandle || product?.handle || '').trim();
    const parentHandle = String(context?.parentHandle || '').trim();

    if (sourceHandle) handles.push(sourceHandle);
    if (parentHandle && parentHandle !== sourceHandle) handles.push(parentHandle);

    if (!handles.length) {
      console.warn('[grt-quick-buy] no handles available for meta request', {
        context,
        productHandle: product?.handle || ''
      });
      return Promise.resolve({});
    }

    console.log('[grt-quick-buy] merged meta handles', {
      sourceHandle,
      parentHandle,
      handles,
      initialColorName: String(context?.initialColorName || '').trim()
    });

    return Promise.all(
      handles.map((handle) => requestQuickBuyMeta(handle, context?.initialColorName).catch(() => null))
    ).then((payloads) => mergeColorMetaPayloads(payloads));
  };

  const getTriggerContext = (source) => {
    const dataset = source?.dataset || {};
    return {
      sourceHandle: String(dataset.grtProductHandle || dataset.grtProduct || '').trim(),
      parentHandle: String(dataset.grtParentProductHandle || dataset.grtProductHandle || dataset.grtProduct || '').trim(),
      shirtStyle: String(dataset.grtShirtStyle || '').trim(),
      initialColorName: String(dataset.grtInitialColorName || '').trim()
    };
  };

  const openFromTrigger = (trigger) => {
    const handle = trigger.dataset.grtProductHandle || trigger.dataset.grtProduct || '';
    if (!handle) {
      console.warn('Quick buy trigger missing product handle');
      return;
    }
    const variantId = trigger.dataset.grtDefaultVariant;
    const context = getTriggerContext(trigger);
    openQuickBuy(handle, variantId, context, trigger);
  };

  const openQuickBuy = (handle, variantId, context = null, trigger = null) => {
    const resolvedContext = {
      sourceHandle: String(context?.sourceHandle || handle || '').trim(),
      parentHandle: String(context?.parentHandle || handle || '').trim(),
      shirtStyle: String(context?.shirtStyle || '').trim(),
      initialColorName: String(context?.initialColorName || '').trim()
    };
    console.log('[grt-quick-buy] open modal', {
      handle,
      variantId: String(variantId || '').trim(),
      context: resolvedContext
    });
    resetModalState();
    currentQuickBuyContext = resolvedContext;
    setModalLoading(true, 'Loading product...');
    openDialog();
    fetchProduct(handle)
      .then((displayProduct) => {
        setCurrentProductState(displayProduct);
        titleEl.textContent = displayProduct.title || 'Product';
        renderModalRating(trigger, displayProduct);
        if (productLinkEl) {
          productLinkEl.href = displayProduct.url || `/products/${displayProduct.handle}`;
        }
        //descriptionEl.textContent = product.body_html ? product.body_html.replace(/<[^>]+>/g, '') : '';
        const initialVariant = displayProduct.variants.find((variant) => String(variant.id) === String(variantId || ''));
        return renderVariantControls(
          displayProduct,
          initialVariant,
          resolvedContext
        ).then(() => waitForImageLoad(imageEl.currentSrc || imageEl.src));
      })
      .then(() => {
        setModalLoading(false);
      })
      .catch((error) => {
        console.error('Quick buy could not open', error);
        setModalLoading(false);
        closeDialog();
      });
  };

  const bindTriggers = () => {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-grt-quick-buy-trigger]');
      if (!trigger) return;
      event.preventDefault();
      openFromTrigger(trigger);
    });
  };

  const bindQuantityButtons = () => {
    const minus = modalRoot.querySelector('[data-grt-qty-minus]');
    const plus = modalRoot.querySelector('[data-grt-qty-plus]');
    minus?.addEventListener('click', () => {
      const value = Math.max(1, (qtyInput.value * 1 || 1) - 1);
      qtyInput.value = value;
    });
    plus?.addEventListener('click', () => {
      const value = (qtyInput.value * 1 || 1) + 1;
      qtyInput.value = value;
    });
  };

  const bindSharedOpenEvent = () => {
    document.addEventListener('grt-global-quick-buy:open', (event) => {
      const detail = event.detail || {};
      const handle = String(detail.handle || '').trim();
      if (!handle) return;
      const context = {
        sourceHandle: String(detail.sourceHandle || handle).trim(),
        parentHandle: String(detail.parentHandle || handle).trim(),
        shirtStyle: String(detail.shirtStyle || '').trim(),
        initialColorName: String(detail.initialColorName || '').trim()
      };
      openQuickBuy(handle, detail.variantId, context, detail.trigger || null);
    });
  };

  const submitHandler = (event) => {
    event.preventDefault();
    if (!currentVariant) {
      return;
    }
    const rows = sizeGrid?.querySelectorAll('[data-size-row]') || [];
    if (rows.length) {
      const items = [];
      rows.forEach((row) => {
        const input = row.querySelector('[data-grt-size-qty-input]');
        if (!input) return;
        const qty = parseInt(input.value || '0', 10);
        if (Number.isNaN(qty) || qty < 1) return;
        const variantId = row.dataset.sizeId;
        if (!variantId) return;
        items.push({ id: variantId, quantity: qty });
      });
      if (!items.length) {
        showGridMessage('Enter quantity for at least one size');
        return;
      }
      addItemsToCart(items);
      return;
    }
    const quantity = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    const formBody = new URLSearchParams(new FormData(form)).toString();

    if (typeof window.handleAddToCart === 'function') {
      const submitButton = modalRoot.querySelector('[data-grt-modal-submit]');
      submitButton?.classList.add('working');
      window.handleAddToCart(
        formBody,
        quantity,
        {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        () => {
          submitButton?.classList.remove('working');
        }
      );
    } else {
      form.submit();
    }
  };

  form.addEventListener('submit', submitHandler);
  bindClose();
  bindTriggers();
  bindQuantityButtons();
  bindSharedOpenEvent();

  if (dialog) {
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('grt-modal-open');
      document.body.classList.remove('grt-modal-open');
    });
  }
})();
