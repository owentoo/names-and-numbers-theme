/*
 * Multi-model background removal.
 *
 * Flow:
 *   1. Caller provides (sourceUrl, imgixBgRemoveUrl) after upload.
 *   2. We fetch the imgix bg-remove result + Ideogram + Pixelcut in parallel
 *      via the AWS proxy Lambda (bg-removal-proxy).
 *   3. Each result is loaded into a canvas at SCORE_SIZE and scored on
 *      edge cleanliness, coverage sanity, cross-model agreement, content
 *      variance, and removal asymmetry.
 *   4. Best (lowest score) is the recommended default; all candidates are
 *      shown as Model 1 / 2 / 3 tabs so the user can override.
 *   5. User pick becomes the preview src + Size Guide mockups.
 *
 * API keys for Ideogram and fal.ai (Pixelcut) live in AWS Lambda env vars,
 * reached through API Gateway. The storefront only knows the proxy URL.
 */
(function () {
  'use strict';

  // All bg-removal API calls go through a single AWS Lambda (via API Gateway)
  // so the underlying fal.ai and Ideogram keys stay server-side. The Lambda
  // accepts { model, imageUrl } and returns { url } — uniform contract for
  // every model. CORS on API Gateway restricts callers to the storefront
  // domains, so even though this URL is visible to visitors in DevTools,
  // they can't make Ideogram/fal.ai calls outside those origins.
  var BG_REMOVAL_PROXY_URL = 'https://ruhg140mmf.execute-api.us-east-1.amazonaws.com/';

  // Fallback labels shown in tooltips. Tab labels themselves are rank-based
  // (Model 1 / 2 / 3), generated dynamically.
  var MODEL_LABELS = {
    imgix:    'imgix',
    bria:     'bria',
    pixelcut: 'pixelcut'
  };

  // Settings
  var SCORE_SIZE = 256;                  // alpha analysis canvas size (px)
  var IMGIX_SIMILARITY_THRESHOLD = 0.80; // alternates ≥80% similar to imgix are hidden
  var FAL_TIMEOUT_MS = 25000;            // give up on a model after 25s

  // Friendly labels for the "_BG Removal Service" line-item property shown
  // on the admin order detail page. The line-item property name itself is
  // intentionally not visible to customers (we don't show it in the cart UI).
  var BG_REMOVAL_SERVICE_NAMES = {
    imgix: 'Imgix',
    bria: 'Bria',
    pixelcut: 'PixelCut'
  };

  // Cache results per source URL so toggling Remove Background off/on doesn't
  // re-run fal.ai for the same uploaded file.
  var cache = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  // fal.ai calls
  // ─────────────────────────────────────────────────────────────────────────

  // Single uniform call to the AWS proxy. Storefront posts { model, imageUrl }
  // and gets back { url } regardless of which upstream service the Lambda hit.
  function callBgRemoval(model, imageUrl) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, FAL_TIMEOUT_MS);

    return fetch(BG_REMOVAL_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model, imageUrl: imageUrl }),
      signal: ctrl.signal
    }).then(function (resp) {
      clearTimeout(timer);
      if (!resp.ok) {
        return resp.text().then(function (t) {
          throw new Error(model + ' HTTP ' + resp.status + ': ' + t.slice(0, 200));
        });
      }
      return resp.json();
    }).then(function (data) {
      if (!data || !data.url) throw new Error(model + ' response missing url');
      return data.url;
    }).catch(function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Alpha-mask scoring
  // ─────────────────────────────────────────────────────────────────────────

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Failed to load: ' + url)); };
      img.src = url;
    });
  }


  function getAlphaMask(url) {
    return loadImage(url).then(function (img) {
      var canvas = document.createElement('canvas');
      canvas.width = SCORE_SIZE;
      canvas.height = SCORE_SIZE;
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, SCORE_SIZE, SCORE_SIZE);
      ctx.drawImage(img, 0, 0, SCORE_SIZE, SCORE_SIZE);
      var imgData;
      try {
        imgData = ctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE);
      } catch (e) {
        // CORS / tainted canvas — can't read pixels. Skip scoring this one.
        throw new Error('Canvas tainted (CORS) for ' + url);
      }
      var d = imgData.data;
      var alpha = new Uint8ClampedArray(SCORE_SIZE * SCORE_SIZE);
      for (var i = 0, n = alpha.length; i < n; i++) {
        alpha[i] = d[i * 4 + 3];
      }
      return alpha;
    });
  }

  // Count mid-alpha pixels (32–223). Lower = sharper edges = better.
  function scoreEdgeSharpness(alpha) {
    var c = 0;
    for (var i = 0; i < alpha.length; i++) {
      var a = alpha[i];
      if (a > 32 && a < 224) c++;
    }
    return c;
  }

  // Fraction of opaque pixels (alpha > 128). Penalize extreme values.
  function coveragePenalty(alpha) {
    var op = 0;
    for (var i = 0; i < alpha.length; i++) {
      if (alpha[i] > 128) op++;
    }
    var frac = op / alpha.length;
    if (frac < 0.02 || frac > 0.98) return 1e6; // basically remove from contention
    return 0;
  }

  // Average per-pixel absolute alpha difference between two masks (0–255).
  function alphaDiff(a, b) {
    if (a.length !== b.length) return 255;
    var sum = 0;
    for (var i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum / a.length;
  }

  // Load the ORIGINAL (pre-bg-remove) image as RGBA at SCORE_SIZE. Used as
  // a ground-truth reference so we can ask "what did this candidate delete
  // from the original?" — high-variance deletions (= colorful, varied content
  // like text/logos) are penalized far more than low-variance deletions
  // (= uniform background regions).
  function getOriginalRGBA(url) {
    return loadImage(url).then(function (img) {
      var canvas = document.createElement('canvas');
      canvas.width = SCORE_SIZE;
      canvas.height = SCORE_SIZE;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SCORE_SIZE, SCORE_SIZE);
      try { return ctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data; }
      catch (e) { return null; } // CORS-tainted
    });
  }

  // Variance of original RGB values in the candidate's "removed" region.
  // - Low variance: candidate removed uniform-colored pixels (likely real bg).
  // - High variance: candidate removed colorful/textured pixels (likely subject
  //   content — text, logo, gradient). PENALIZE HEAVILY.
  // This is the SINGLE most important signal for catching over-aggressive
  // subject-detection models that delete posters' text/borders.
  function removedRegionVariance(originalRGBA, mask) {
    if (!originalRGBA || !mask) return 0;
    var n = mask.length;
    var rSum = 0, gSum = 0, bSum = 0, cnt = 0;
    for (var i = 0; i < n; i++) {
      if (mask[i] < 32) { // candidate considers this transparent (removed)
        rSum += originalRGBA[i * 4];
        gSum += originalRGBA[i * 4 + 1];
        bSum += originalRGBA[i * 4 + 2];
        cnt++;
      }
    }
    if (cnt === 0) return 0; // nothing removed — no variance signal
    var rMean = rSum / cnt, gMean = gSum / cnt, bMean = bSum / cnt;
    var varSum = 0;
    for (var i = 0; i < n; i++) {
      if (mask[i] < 32) {
        var dr = originalRGBA[i * 4] - rMean;
        var dg = originalRGBA[i * 4 + 1] - gMean;
        var db = originalRGBA[i * 4 + 2] - bMean;
        varSum += dr * dr + dg * dg + db * db;
      }
    }
    // TOTAL squared deviation (not average). This makes the metric scale with
    // BOTH the amount of content removed AND its variance. Removing a small
    // patch of varied text contributes more than removing a large patch of
    // uniform background. Critical for catching subject-detection models
    // that delete colorful poster text. Normalized by total mask pixels so
    // it's comparable across different image sizes.
    return varSum / mask.length;
  }

  // Cross-model removal asymmetry. For each pixel, count how many candidates
  // KEPT it (alpha > 128). Then for this candidate:
  //   removedDespiteMajority: pixels this candidate removed where ≥2 others kept.
  //   keptDespiteMajority: pixels this candidate kept where ≥2 others removed.
  // Returned as fractions of total pixel count (0–1) for easy weighting.
  function crossModelAsymmetry(idx, masks) {
    var mask = masks[idx];
    if (!mask) return { removed: 0, kept: 0 };
    var n = mask.length;
    var removedDespite = 0;
    var keptDespite = 0;
    for (var i = 0; i < n; i++) {
      var countKept = 0;
      var countTotal = 0;
      for (var j = 0; j < masks.length; j++) {
        if (!masks[j]) continue;
        countTotal++;
        if (masks[j][i] > 128) countKept++;
      }
      if (countTotal < 2) continue; // need at least 2 to define "majority"
      var meKept = mask[i] > 128;
      var othersKeptMajority = (countKept - (meKept ? 1 : 0)) >= Math.ceil((countTotal - 1) / 2);
      var othersRemovedMajority = ((countTotal - 1) - (countKept - (meKept ? 1 : 0))) >= Math.ceil((countTotal - 1) / 2);
      if (!meKept && othersKeptMajority) removedDespite++;
      if (meKept && othersRemovedMajority) keptDespite++;
    }
    return { removed: removedDespite / n, kept: keptDespite / n };
  }

  // Final scoring. Lower = better. Signals weighted so the content-variance
  // check (asks: did this model delete information-rich pixels?) dominates,
  // because that's the only signal that's robust to "wrong models agreeing
  // with each other" (e.g., two AI subject-detectors both deleting poster
  // text and ranking each other highly).
  //
  // Conservative bias: keptDespiteMajority weight (×60) is much lower than
  // removedDespiteMajority weight (×400). Better to leave bg pixels than to
  // delete subject pixels — customers can crop, can't recover.
  function scoreCandidate(idx, masks, originalRGBA) {
    var mask = masks[idx];
    if (!mask) return Infinity;
    var sharpness = scoreEdgeSharpness(mask);
    var penalty = coveragePenalty(mask);

    // Cross-model agreement (kept for back-compat; reduced weight)
    var agreementSum = 0;
    var agreementCount = 0;
    for (var j = 0; j < masks.length; j++) {
      if (j !== idx && masks[j]) {
        agreementSum += alphaDiff(mask, masks[j]);
        agreementCount++;
      }
    }
    var avgDiff = agreementCount > 0 ? agreementSum / agreementCount : 0;

    // The two new signals
    var removedVariance = removedRegionVariance(originalRGBA, mask);
    var asymmetry = crossModelAsymmetry(idx, masks);

    var total = sharpness                       // 0–~10000  (edge fuzziness)
              + avgDiff * 20                     // 0–~5000   (raw disagreement)
              + penalty                          // 0 or 1e6  (broken result)
              + removedVariance * 0.6            // 0–~30000  (deleted high-info content)
              + asymmetry.removed * 400          // 0–~400    (over-aggressive)
              + asymmetry.kept * 60;             // 0–~60     (over-conservative)
    return {
      total: total,
      breakdown: {
        sharpness: Math.round(sharpness),
        avgDiffx20: Math.round(avgDiff * 20),
        penalty: penalty,
        variancex0_6: Math.round(removedVariance * 0.6),
        asymRemovedx400: Math.round(asymmetry.removed * 400),
        asymKeptx60: Math.round(asymmetry.kept * 60)
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Orchestration
  // ─────────────────────────────────────────────────────────────────────────

  function rank(candidates, originalUrl) {
    // candidates: [{ name, url, mask }] — mask is pre-loaded by loadCandidate.
    // originalUrl: source image URL (no bg-remove) — used for variance scoring.
    var originalP = originalUrl
      ? getOriginalRGBA(originalUrl).catch(function (e) {
          console.warn('[bg-removal-multi] original load failed:', e.message);
          return null;
        })
      : Promise.resolve(null);

    return originalP.then(function (originalRGBA) {
      var masks = candidates.map(function (c) { return c.mask; });
      // DIAGNOSTIC: log coverage stats per candidate so we can see if the
      // upstream actually produced transparency.
      candidates.forEach(function (c) {
        if (!c.mask) {
          console.log('  ', c.name, 'MASK=NULL (CORS-tainted? failed load?)');
          return;
        }
        var op = 0, tr = 0, mid = 0;
        for (var k = 0; k < c.mask.length; k++) {
          var a = c.mask[k];
          if (a > 200) op++;
          else if (a < 50) tr++;
          else mid++;
        }
        console.log('  ', c.name, 'coverage opaque=' +
          (op / c.mask.length * 100).toFixed(1) + '% transparent=' +
          (tr / c.mask.length * 100).toFixed(1) + '% mid=' +
          (mid / c.mask.length * 100).toFixed(1) + '%');
      });
      var scored = candidates.map(function (c, i) {
        var s = scoreCandidate(i, masks, originalRGBA);
        return {
          name: c.name,
          url: c.url,
          persistentUrl: c.persistentUrl,
          bareUrl: c.bareUrl,
          mask: c.mask,
          normalizedMask: c.normalizedMask,
          score: typeof s === 'number' ? s : s.total,
          breakdown: typeof s === 'object' ? s.breakdown : null
        };
      }).filter(function (c) {
        // Imgix is the north star — it's always Version 1, even if its mask
        // failed to load (in which case we just can't compute similarity).
        // Other candidates with no mask are filtered as broken.
        return c.name === 'imgix' || c.score !== Infinity;
      });
      // Return BOTH the similarity-filtered ranking (what we display by
      // default) and the unfiltered set (so the "See other results" link
      // has something to expand into when filtering hid V2/V3).
      var filtered = buildFinalRanking(scored);
      return { filtered: filtered, unfiltered: scored };
    });
  }

  // Track the customer's selected version on a window-level var so the
  // /cart/add interceptor below can read both the model name AND the
  // persistent imgix URL at request time. Mirror to a hidden form input as
  // defense-in-depth for any code path that does submit the standard form.
  //
  // For multi-upload we ALSO maintain a per-source-URL map so each line
  // item in the cart-add payload can be matched to its own chosen version.
  // Without this, all items get the LAST-picked URL written into Upload,
  // which makes Shopify merge them into a single line item.
  if (!window.__ntBgRemovalSelectionsByBareUrl) {
    window.__ntBgRemovalSelectionsByBareUrl = {};
  }
  function setBgRemovalProperty(chosen) {
    var modelKey = typeof chosen === 'string' ? chosen : (chosen && chosen.name);
    var friendlyName = BG_REMOVAL_SERVICE_NAMES[modelKey] || modelKey;
    var persistentUrl = chosen && typeof chosen === 'object' ? chosen.persistentUrl : null;
    var bareUrl = chosen && typeof chosen === 'object' ? chosen.bareUrl : null;
    var record = {
      modelName: friendlyName,
      modelKey: modelKey,
      persistentUrl: persistentUrl,
      bareUrl: bareUrl,
      selectedAt: Date.now()
    };
    window.__ntBgRemovalSelected = record;
    // Multi-upload key: source-image bareUrl (filename portion of the
    // imgix URL with query stripped). Lets the cart-add interceptor
    // look up the right candidate for each item independently.
    if (bareUrl) {
      var key = bareUrl.split('/').pop().toLowerCase();
      if (key) window.__ntBgRemovalSelectionsByBareUrl[key] = record;
    }
    var forms = document.querySelectorAll(
      'product-form.product-form form, form#cart, form[action*="/cart/add"]'
    );
    forms.forEach(function (form) {
      var input = form.querySelector('input[name="properties[_BG Removal Service]"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'properties[_BG Removal Service]';
        form.appendChild(input);
      }
      input.value = friendlyName;
    });

    // NOTE: we deliberately do NOT save the chosen version to the customer's
    // design library here. Tab clicks/auto-applies are exploratory — the
    // customer might pick V1, then V2, then V3. We only commit the chosen
    // version to the library when they Add to Cart (handled by the cart-add
    // interceptor). If they upload and bail without adding to cart, only the
    // original (saved by bySize_popular at upload time) ends up in their
    // library — which matches the existing behavior for non-bg-removal cases.
  }

  // Cart-add interceptor: bySize_popular.js (and similar templates) build the
  // /cart/add payload via JS rather than submitting the standard product
  // form, so hidden inputs don't reach Shopify. We hook fetch + XHR globally
  // and inject `properties[_BG Removal Service]` into any request hitting the
  // cart-add endpoint. Only runs once per page load.
  // Captures the most recent /uploads/saveData payload so we can re-fire it
  // with the customer's chosen-version URL after they pick. Without this,
  // saveData runs at upload-completion time (before any model has finished),
  // so the bare original URL is what hits the customer's design library —
  // not the bg-removed result they actually chose.
  var SAVE_DATA_URL = 'https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production/uploads/saveData';
  var DELETE_DATA_URL = 'https://hpz51rjda5.execute-api.us-east-1.amazonaws.com/production/uploads/deleteData';
  var capturedSavePayload = null;
  var capturedOriginalPhotoId = null;
  var capturedCustomerId = null;
  var lastResavedUrl = null;
  var resaveTimer = null;

  // Captures metadata when the customer picks a PREVIOUS design (Use this
  // Design). bySize_popular.js doesn\'t fire /uploads/saveData in that path —
  // the design already lives in the customer\'s library — so capturedSavePayload
  // stays null and our re-save bails. Watching the previous-design selection
  // gives us everything we need (photo_id, file URL, file name, dimensions)
  // to construct a save payload ourselves and update the library entry to the
  // bg-removed version when the customer adds to cart.
  var capturedPrevDesign = null; // { photoId, fileName, fileUrl, width, height }

  function setCapturedPrevDesign(data) {
    if (!data || !data.photoId) return;
    capturedPrevDesign = {
      photoId: String(data.photoId),
      fileName: data.fileName || '',
      fileUrl: (data.fileUrl || '').split('?')[0],
      width: data.width || '',
      height: data.height || ''
    };
    // Reset the resave bookkeeping so the next add-to-cart actually fires
    // (we may be on the same image as a prior selection but the user has
    // since toggled bg-remove and picked a different version).
    lastResavedUrl = null;
    capturedOriginalPhotoId = null;
    capturedSavePayload = null;
    console.log('[bg-removal-multi] captured previous-design selection', capturedPrevDesign);
  }

  // Delegated click listener — catches every UI path that selects a previous
  // design:
  //   - Legacy popup: `.customer_designes ul li[data-photoid]` with a
  //     checkbox + bulk "Use Designs" button (bySize_popular renders this).
  //   - Modern picker: `.md-card[data-design-id]` inside dtf-upload-tabs /
  //     my-designs-panel — clicking the card triggers a synthetic click on
  //     a fake `.use_design[data-photoid]` anchor created by
  //     product-page-popups.liquid.
  //   - The synthetic `.use_design[data-photoid]` anchor itself (in case it
  //     bubbles before being removed from the DOM).
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    // Modern picker card.
    var mdCard = t.closest('.md-card[data-design-id]');
    if (mdCard && !mdCard.classList.contains('md-card--selection-disabled')) {
      var id = mdCard.getAttribute('data-design-id');
      var imgEl = mdCard.querySelector('img');
      var nameEl = mdCard.querySelector('.md-card__name');
      setCapturedPrevDesign({
        photoId: id,
        fileName: nameEl ? (nameEl.getAttribute('data-tooltip') || nameEl.textContent) : '',
        fileUrl: imgEl ? imgEl.getAttribute('src') : '',
        width: '',
        height: ''
      });
      return;
    }
    // Synthetic .use_design[data-photoid] anchor.
    var useDesign = t.closest('.use_design[data-photoid]');
    if (useDesign) {
      setCapturedPrevDesign({
        photoId: useDesign.getAttribute('data-photoid'),
        fileName: useDesign.getAttribute('data-name') || '',
        fileUrl: useDesign.getAttribute('data-src') || '',
        width: '',
        height: ''
      });
      return;
    }
    // Legacy popup row.
    var li = t.closest('.customer_designes ul li');
    if (li) {
      if (t.closest('.upload_tools a[data-id]')) return; // trash icon
      var photoId = li.getAttribute('data-photoid');
      if (!photoId) return;
      var checkbox = li.querySelector('.upload_tools .popupinput.checkbox-field');
      var useLink = li.querySelector('.use_design');
      var dataSrc = (checkbox && checkbox.getAttribute('data-src')) ||
                    (useLink && useLink.getAttribute('data-src')) || '';
      setCapturedPrevDesign({
        photoId: photoId,
        fileName: (checkbox && checkbox.getAttribute('data-name')) ||
                  li.getAttribute('data-name') || '',
        fileUrl: dataSrc,
        width: checkbox && checkbox.getAttribute('data-w'),
        height: checkbox && checkbox.getAttribute('data-h')
      });
    }
  }, true);

  // Try to pull a photo_id out of whatever response shape the API returns.
  // We've seen JSON responses use `photo_id`, `id`, or wrap inside `data`,
  // and the request body itself is a single-element array — so the response
  // may follow either shape too. Returns null if nothing recognizable.
  function extractPhotoId(respText) {
    if (!respText) return null;
    try {
      var data = JSON.parse(respText);
      if (typeof data !== 'object' || data === null) return null;
      if (Array.isArray(data)) data = data[0] || {};
      return data.photo_id || data.id ||
             (data.data && (data.data.photo_id || data.data.id)) ||
             null;
    } catch (e) { return null; }
  }

  function injectBgRemovalInSavePayload(body) {
    // Capture the payload shape (so we can re-fire later with chosen URL)
    // and pull customer_id out of it for the eventual deleteData call.
    if (typeof body === 'string') {
      try {
        capturedSavePayload = JSON.parse(body);
        var firstItem = Array.isArray(capturedSavePayload) ? capturedSavePayload[0] : capturedSavePayload;
        if (firstItem && firstItem.customer_id) capturedCustomerId = firstItem.customer_id;
      } catch (e) { /* ignore */ }
    }

    var sel = window.__ntBgRemovalSelected;
    if (!sel || !sel.persistentUrl || !/^https?:\/\//.test(sel.persistentUrl)) return body;
    if (typeof isBgRemoveToggleOn === 'function' && !isBgRemoveToggleOn()) return body;
    var newFileUrl = sel.persistentUrl;
    if (typeof body === 'string') {
      try {
        var json = JSON.parse(body);
        if (Array.isArray(json)) {
          json.forEach(function (it) {
            if (it && typeof it === 'object') it.file = newFileUrl;
          });
        } else if (json && typeof json === 'object') {
          json.file = newFileUrl;
        }
        lastResavedUrl = newFileUrl;
        return JSON.stringify(json);
      } catch (e) { /* not JSON — pass through */ }
    }
    return body;
  }

  // Build a saveData payload from the captured previous-design selection.
  // Returns null if we don't have enough info. The shape mirrors
  // bySize_popular.js\'s saveFileToUser (single-element array) so the server
  // sees the same envelope. file_crc is intentionally empty — we don\'t have
  // it for previous designs, and an empty value still creates a usable
  // library entry; the dedupe path below removes the stale one anyway.
  // The site declares CUSTOMER_ID / PRODUCT_ID / isGangPage with `let`/`const`
  // in <script> tags (see snippets/bySize__js.liquid, layout/theme.liquid).
  // These live in the global LEXICAL environment — visible by name from any
  // script — but are NOT properties on `window`.
  //
  // Two-step lookup so we cover both the "let-declared global" case (visible
  // via direct lexical reference) and any weird case where new Function\'s
  // global lookup behaves differently.
  function readGlobal(name) {
    // Direct typeof — safe even if name is undeclared (typeof never throws).
    var direct;
    try {
      if (name === 'CUSTOMER_ID')      direct = typeof CUSTOMER_ID !== 'undefined' ? CUSTOMER_ID : undefined;
      else if (name === 'PRODUCT_ID')  direct = typeof PRODUCT_ID !== 'undefined' ? PRODUCT_ID : undefined;
      else if (name === 'isGangPage')  direct = typeof isGangPage !== 'undefined' ? isGangPage : undefined;
    } catch (e) { /* fall through to new Function fallback */ }
    if (typeof direct !== 'undefined' && direct !== null) return direct;
    try {
      return (new Function('return typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined;'))();
    } catch (e) { return undefined; }
  }

  function buildPrevDesignSavePayload(chosenUrl) {
    if (!capturedPrevDesign) return null;
    var pd = capturedPrevDesign;
    var cid = readGlobal('CUSTOMER_ID');
    if (!cid) {
      console.warn('[bg-removal-multi] no CUSTOMER_ID available — cannot resave previous design');
      return null;
    }
    var variantTitle = (pd.width && pd.height)
      ? (pd.width + 'x' + pd.height)
      : '';
    var pid = readGlobal('PRODUCT_ID') || '';
    var isGang = !!readGlobal('isGangPage');
    return [{
      variant_title: variantTitle,
      file: chosenUrl,
      customer_id: cid,
      file_name: pd.fileName || '',
      file_crc: '',
      product_id: pid,
      gangsheet: isGang
    }];
  }

  // Re-fire saveData with the currently chosen version's URL.
  //
  // Two trigger paths:
  //   - Tab pick (debounced 1500ms): customer clicked V2/V3 in the chooser.
  //     Debounce so rapid V1→V2→V3 only sends one call after they settle.
  //   - Cart add (immediate=true): customer is committing — they\'re about
  //     to navigate to checkout, so we send the request RIGHT NOW with
  //     keepalive:true so the browser doesn\'t cancel it mid-flight.
  //
  // Two source paths:
  //   1. Fresh upload — bySize_popular fired /uploads/saveData, which we
  //      intercepted and stashed in capturedSavePayload. We mutate it.
  //   2. Previous design — bySize_popular did NOT fire saveData (the design
  //      already exists). We build a payload from capturedPrevDesign and use
  //      its photoId as the original-to-delete.
  function maybeResaveWithChosen(immediate) {
    var sel = window.__ntBgRemovalSelected;
    if (!sel || !sel.persistentUrl || !/^https?:\/\//.test(sel.persistentUrl)) {
      console.log('[bg-removal-multi] resave SKIP: no valid persistentUrl', sel);
      return;
    }
    if (typeof isBgRemoveToggleOn === 'function' && !isBgRemoveToggleOn()) {
      console.log('[bg-removal-multi] resave SKIP: bg-remove toggle is off');
      return;
    }
    if (lastResavedUrl === sel.persistentUrl) {
      console.log('[bg-removal-multi] resave SKIP: already resaved this URL');
      return;
    }

    var hasFresh = !!capturedSavePayload;
    var hasPrev = !!capturedPrevDesign;
    if (!hasFresh && !hasPrev) {
      console.log('[bg-removal-multi] resave SKIP: no captured source (fresh upload or previous design)');
      return;
    }
    console.log('[bg-removal-multi] resave PROCEED:',
      'hasFresh=', hasFresh, 'hasPrev=', hasPrev,
      'capturedPrevDesign=', capturedPrevDesign,
      'CUSTOMER_ID=', readGlobal('CUSTOMER_ID'));

    function doResave() {
      var current = window.__ntBgRemovalSelected;
      if (!current || lastResavedUrl === current.persistentUrl) return;

      var modified;
      var photoIdToDelete;
      var customerId;
      if (hasFresh) {
        var src = capturedSavePayload;
        var arr = Array.isArray(src) ? src : [src];
        modified = arr.map(function (it) {
          if (!it || typeof it !== 'object') return it;
          var copy = {};
          for (var k in it) if (Object.prototype.hasOwnProperty.call(it, k)) copy[k] = it[k];
          copy.file = current.persistentUrl;
          return copy;
        });
        photoIdToDelete = capturedOriginalPhotoId;
        customerId = capturedCustomerId;
      } else {
        modified = buildPrevDesignSavePayload(current.persistentUrl);
        if (!modified) {
          console.warn('[bg-removal-multi] no previous-design payload to resave');
          return;
        }
        photoIdToDelete = capturedPrevDesign.photoId;
        customerId = readGlobal('CUSTOMER_ID') || null;
      }

      lastResavedUrl = current.persistentUrl;
      console.log('[bg-removal-multi] re-saving design with chosen URL',
        hasFresh ? '(fresh upload)' : '(previous design)',
        immediate ? '[immediate]' : '[debounced]',
        'payload=', modified);
      // keepalive:true lets the request survive page navigation — critical
      // when this fires from the cart-add path, since the user is usually
      // about to redirect to /cart or /checkout.
      fetch(SAVE_DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modified),
        credentials: 'omit',
        keepalive: true
      }).then(function (resp) {
        // CRITICAL: fetch() only rejects on network errors. 4xx/5xx come back
        // as resolved with resp.ok === false. We MUST check resp.ok before
        // deleting the original — otherwise a failed save followed by a
        // successful delete leaves the customer with no library entry at all.
        if (!resp.ok) {
          return resp.text().then(function (text) {
            console.error('[bg-removal-multi] saveData rejected', resp.status, text);
            // Rollback so the next attempt actually re-fires.
            lastResavedUrl = null;
            throw new Error('saveData HTTP ' + resp.status);
          });
        }
        if (!photoIdToDelete || !customerId) {
          console.log('[bg-removal-multi] resave done; skipping delete (no photo_id/customer_id)');
          return;
        }
        var delUrl = DELETE_DATA_URL +
          '?customer_id=' + encodeURIComponent(customerId) +
          '&photo_id=' + encodeURIComponent(photoIdToDelete);
        console.log('[bg-removal-multi] deleting original design photo_id=', photoIdToDelete);
        return fetch(delUrl, { credentials: 'omit', keepalive: true }).then(function (delResp) {
          if (!delResp.ok) {
            console.warn('[bg-removal-multi] deleteData rejected', delResp.status);
            return;
          }
          if (hasFresh) {
            capturedOriginalPhotoId = null;
          } else {
            capturedPrevDesign = null;
          }
        });
      }).catch(function (err) {
        console.warn('[bg-removal-multi] resave/delete failed:', err && err.message);
      });
    }

    if (resaveTimer) { clearTimeout(resaveTimer); resaveTimer = null; }
    if (immediate) doResave();
    else resaveTimer = setTimeout(doResave, 1500);
  }

  // Pull design-re-used photo_id and width/height out of a cart-add payload
  // and stash them into capturedPrevDesign so the resave has what it needs.
  // The site already writes these into the cart-add properties:
  //   properties['design re-used'] = grt_photo_id (when re-using a design)
  //   properties['_width'] / properties['_height'] = numeric inches
  // Underscore-prefixed so they stay hidden from the checkout UI. Legacy
  // width / height keys are still read for items added before the rename.
  // This is the safety net if our click listener missed the picker UI.
  function harvestPrevDesignFromCartAddProps(props) {
    if (!props || typeof props !== 'object') return;
    var reused = props['design re-used'];
    if (!reused || /^previously on order/i.test(String(reused))) return;
    var photoId = String(reused);
    if (!capturedPrevDesign) capturedPrevDesign = { photoId: photoId };
    else if (!capturedPrevDesign.photoId) capturedPrevDesign.photoId = photoId;
    var w = props._width || props.width;
    var h = props._height || props.height;
    if (w && !capturedPrevDesign.width) capturedPrevDesign.width = String(w);
    if (h && !capturedPrevDesign.height) capturedPrevDesign.height = String(h);
    // Reset bookkeeping so the upcoming resave actually fires.
    if (lastResavedUrl) lastResavedUrl = null;
  }

  function harvestFromCartAddBody(body) {
    try {
      if (typeof body === 'string') {
        var first = body.charAt(0);
        if (first === '{' || first === '[') {
          var json = JSON.parse(body);
          if (json && Array.isArray(json.items)) {
            json.items.forEach(function (it) { harvestPrevDesignFromCartAddProps(it && it.properties); });
          } else if (json) {
            harvestPrevDesignFromCartAddProps(json.properties);
          }
        } else {
          // Form-encoded. Reconstruct just the properties[*] entries.
          var p = new URLSearchParams(body);
          var props = {};
          p.forEach(function (v, k) {
            var m = k.match(/^properties\[(.+)\]$/);
            if (m) props[m[1]] = v;
          });
          harvestPrevDesignFromCartAddProps(props);
        }
      } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
        var fdProps = {};
        body.forEach(function (v, k) {
          var m = k.match(/^properties\[(.+)\]$/);
          if (m) fdProps[m[1]] = v;
        });
        harvestPrevDesignFromCartAddProps(fdProps);
      } else if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
        var upProps = {};
        body.forEach(function (v, k) {
          var m = k.match(/^properties\[(.+)\]$/);
          if (m) upProps[m[1]] = v;
        });
        harvestPrevDesignFromCartAddProps(upProps);
      }
    } catch (e) { /* ignore — best effort */ }
  }

  // Pull the source bareUrl out of a line item's properties so we can match
  // it against the per-source selection map. Looks for the upload property
  // (with or without leading underscore) and returns just the filename
  // portion (lowercased) — same key shape setBgRemovalProperty uses.
  function extractItemBareKey(props) {
    if (!props || typeof props !== 'object') return null;
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var lk = k.toLowerCase();
      if (lk.indexOf('upload') !== -1 && lk.indexOf('vector') !== -1) {
        var val = props[k];
        if (val && typeof val === 'string') {
          return val.split('?')[0].split('/').pop().toLowerCase();
        }
      }
    }
    return null;
  }

  // Look up the chosen selection for a given item (or fall back to the
  // last-picked global). Returns the candidate-like record with modelName /
  // modelKey / persistentUrl.
  function lookupSelectionForItem(props) {
    var key = extractItemBareKey(props);
    if (key && window.__ntBgRemovalSelectionsByBareUrl &&
        window.__ntBgRemovalSelectionsByBareUrl[key]) {
      return window.__ntBgRemovalSelectionsByBareUrl[key];
    }
    return window.__ntBgRemovalSelected || null;
  }

  function injectBgRemovalInPayload(body) {
    var sel = window.__ntBgRemovalSelected;
    if (!sel || !sel.modelName) {
      console.log('[bg-removal-multi] cart-add intercept: nothing selected, passing through');
      return body;
    }
    console.log('[bg-removal-multi] cart-add intercept fired; lastSel=', sel,
      'selectionsByBareUrl=', window.__ntBgRemovalSelectionsByBareUrl);
    // Pull design-re-used / width / height out of the cart-add payload so
    // capturedPrevDesign is fully populated even if our click listener
    // missed the picker. Then save the chosen version to the design library
    // IMMEDIATELY — the customer is about to navigate, so we use the
    // keepalive: true fetch inside maybeResaveWithChosen.
    harvestFromCartAddBody(body);
    console.log('[bg-removal-multi] after harvest, capturedPrevDesign=', capturedPrevDesign);
    maybeResaveWithChosen(true);

    // applyToProps is called per-item. It looks up the per-source selection
    // for that item via its Upload property, so each line item in a multi-
    // upload payload gets its OWN chosen URL (and thus survives in the cart
    // as a distinct line item instead of being merged with the others).
    //
    // Falls back to the last-picked global (window.__ntBgRemovalSelected) for
    // single-item payloads / form-encoded paths where per-item lookup isn\'t
    // available.
    function buildItemOverrides(itemSel) {
      itemSel = itemSel || sel;
      var overrideUpload = itemSel && itemSel.modelKey && itemSel.modelKey !== 'imgix' &&
                           itemSel.persistentUrl &&
                           /^https?:\/\//.test(itemSel.persistentUrl);
      var u = overrideUpload ? itemSel.persistentUrl : null;
      var c = u ? u + (u.indexOf('?') >= 0 ? '' : '?auto=compress') : null;
      // Apply the Super Resolution / Upscale toggle.
      if (u) u = withUpscaleIfOn(u);
      if (c) c = withUpscaleIfOn(c);
      return {
        modelName: (itemSel && itemSel.modelName) || sel.modelName,
        uploadUrl: u,
        cartImgUrl: c
      };
    }

    // Shopify renders line-item properties in the admin in the order they
    // appear in the payload. To place `_BG Removal Service` directly under
    // `Remove Background`, we rebuild the properties object with our key
    // inserted right after that one. Other keys keep their existing order.
    function applyToProps(props) {
      var perItem = buildItemOverrides(lookupSelectionForItem(props));
      var newUploadUrl = perItem.uploadUrl;
      var newCartImgUrl = perItem.cartImgUrl;
      var modelName = perItem.modelName;
      // assets/hide-upload-property.js renames "Upload (Vector Files
      // Preferred)" → "_Upload (Vector Files Preferred)" at the cart-add
      // request boundary, and re-installs its fetch/XHR wrap on a setTimeout
      // — so it can end up either inside OR outside our wrap. Write to BOTH
      // keys so whichever survives carries the chosen URL. The cart-form-
      // page.liquid thumbnail loop matches any property whose key contains
      // "upload" (case-insensitive), so both names get picked up.
      if (newUploadUrl) {
        props['Upload (Vector Files Preferred)'] = newUploadUrl;
        props['_Upload (Vector Files Preferred)'] = newUploadUrl;
      }
      if (newCartImgUrl) props['_cartImg'] = newCartImgUrl;

      // Build a new object inserting _BG Removal Service right after
      // Remove Background. We mutate `props` in place by deleting all keys
      // and re-adding them in the desired order — necessary because the
      // caller holds a reference to `props` (it\'s the item\'s properties
      // object inside the JSON payload).
      var keys = Object.keys(props);
      var ordered = [];
      var inserted = false;
      keys.forEach(function (k) {
        if (k === '_BG Removal Service') return; // we\'ll inject it explicitly
        ordered.push(k);
        if (k === 'Remove Background') {
          ordered.push('_BG Removal Service');
          inserted = true;
        }
      });
      // Fallback: if Remove Background wasn\'t in the payload, append at end.
      if (!inserted) ordered.push('_BG Removal Service');

      var values = {};
      ordered.forEach(function (k) {
        values[k] = k === '_BG Removal Service' ? modelName : props[k];
      });
      // Wipe + repopulate to preserve insertion order on the same reference.
      Object.keys(props).forEach(function (k) { delete props[k]; });
      ordered.forEach(function (k) { props[k] = values[k]; });
    }

    // For form-encoded payloads (URLSearchParams/FormData) the admin uses
    // the order entries appear in the body. URLSearchParams doesn\'t support
    // insertion mid-list, so we rebuild from scratch.
    // Form-encoded payloads are single-item by definition (Shopify\'s legacy
    // /cart/add.js form path), so we just use the last-picked global.
    function applyToParams(params) {
      var perItem = buildItemOverrides(sel);
      var newUploadUrl = perItem.uploadUrl;
      var newCartImgUrl = perItem.cartImgUrl;
      var modelName = perItem.modelName;
      var entries = [];
      params.forEach(function (v, k) {
        if (k === 'properties[_BG Removal Service]') return;
        entries.push([k, v]);
        if (k === 'properties[Remove Background]') {
          entries.push(['properties[_BG Removal Service]', modelName]);
        }
      });
      if (!entries.some(function (e) { return e[0] === 'properties[_BG Removal Service]'; })) {
        entries.push(['properties[_BG Removal Service]', modelName]);
      }
      // Apply Upload / _cartImg overrides on top of the rebuilt list.
      var byKey = {};
      entries.forEach(function (e, i) { byKey[e[0]] = i; });
      function setOrPush(key, val) {
        if (val == null) return;
        if (byKey.hasOwnProperty(key)) entries[byKey[key]][1] = val;
        else entries.push([key, val]);
      }
      // Set both visible and hidden Upload keys — see comment in applyToProps.
      setOrPush('properties[Upload (Vector Files Preferred)]', newUploadUrl);
      setOrPush('properties[_Upload (Vector Files Preferred)]', newUploadUrl);
      setOrPush('properties[_cartImg]', newCartImgUrl);

      // Clear all keys and re-add in computed order.
      var allKeys = [];
      params.forEach(function (_v, k) { allKeys.push(k); });
      allKeys.forEach(function (k) { params.delete(k); });
      entries.forEach(function (e) { params.append(e[0], e[1]); });
    }

    // FormData payload
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      applyToParams(body);
      return body;
    }
    // URLSearchParams payload
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
      applyToParams(body);
      return body;
    }
    // String payload — try JSON first, fall back to form-encoded
    if (typeof body === 'string') {
      try {
        var json = JSON.parse(body);
        if (typeof json === 'object' && json !== null) {
          if (Array.isArray(json.items)) {
            json.items.forEach(function (it) {
              it.properties = it.properties || {};
              applyToProps(it.properties);
            });
          } else {
            json.properties = json.properties || {};
            applyToProps(json.properties);
          }
          return JSON.stringify(json);
        }
      } catch (e) { /* not JSON — assume form-encoded */ }
      try {
        var params = new URLSearchParams(body);
        applyToParams(params);
        return params.toString();
      } catch (e) { /* give up and pass body through */ }
    }
    return body;
  }

  function installCartHook() {
    if (window.__ntCartHookInstalled) return;
    window.__ntCartHookInstalled = true;
    var matchesCartAdd = function (u) { return /\/cart\/add(\.js)?(\?|$)/.test(u || ''); };
    var matchesSaveData = function (u) { return /\/uploads\/saveData(\?|$)/.test(u || ''); };

    function rewriteBody(url, body) {
      if (matchesCartAdd(url)) return injectBgRemovalInPayload(body);
      if (matchesSaveData(url)) return injectBgRemovalInSavePayload(body);
      return body;
    }

    // Patch fetch
    if (typeof window.fetch === 'function') {
      var origFetch = window.fetch;
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var needsRewrite = matchesCartAdd(url) || matchesSaveData(url);
        if (needsRewrite && init && init.body) {
          init = Object.assign({}, init, { body: rewriteBody(url, init.body) });
        } else if (needsRewrite && input && typeof input === 'object' && input.body && init === undefined) {
          try {
            var reqInit = {
              method: input.method,
              headers: input.headers,
              body: rewriteBody(url, input.body),
              credentials: input.credentials
            };
            return origFetch.call(this, url, reqInit);
          } catch (e) { /* fall through */ }
        }
        return origFetch.call(this, input, init);
      };
    }

    // Patch XHR
    if (typeof XMLHttpRequest !== 'undefined') {
      var XP = XMLHttpRequest.prototype;
      var origOpen = XP.open;
      var origSend = XP.send;
      XP.open = function (method, url) {
        try { this.__ntInterceptUrl = url; } catch (e) {}
        return origOpen.apply(this, arguments);
      };
      XP.send = function (body) {
        try {
          var url = this.__ntInterceptUrl;
          if (body && (matchesCartAdd(url) || matchesSaveData(url))) {
            body = rewriteBody(url, body);
          }
          // Capture the photo_id from saveData responses so we can deleteData
          // the original after the chosen-version save lands.
          if (matchesSaveData(url)) {
            var self = this;
            this.addEventListener('load', function () {
              try {
                if (self.status >= 200 && self.status < 300) {
                  var pid = extractPhotoId(self.responseText);
                  // Only capture if we haven't started the resave flow yet —
                  // we want the ORIGINAL save's photo_id, not the resave's.
                  if (pid && !capturedOriginalPhotoId && !lastResavedUrl) {
                    capturedOriginalPhotoId = pid;
                  }
                }
              } catch (e) { /* ignore */ }
            });
          }
        } catch (e) {}
        return origSend.call(this, body);
      };
    }
  }
  installCartHook();

  // Intersection over Union (Jaccard similarity) on the kept regions of two
  // masks. Each pixel is "kept" if alpha > 128.
  //
  //   IoU = |A ∩ B| / |A ∪ B|
  //
  // This measures how much the two models AGREE on what to keep. Returns 1.0
  // if they kept identical regions, 0.0 if their kept regions are disjoint.
  //
  // Why not "% of pixels agreeing on keep-or-remove"? That metric counts the
  // large empty background as "agreement," so two models that kept totally
  // different subjects can still score 75%+ similar just because the bg
  // pixels match. IoU only credits agreement on the kept content — which is
  // what actually matters when deciding whether the outputs look the same.
  //
  // Naturally handles "one is taller / has different content": different
  // shapes mean smaller intersection, larger union, lower IoU.
  function imgixSimilarity(altMask, imgixMask) {
    if (!altMask || !imgixMask) return 0;
    var n = Math.min(altMask.length, imgixMask.length);
    if (n === 0) return 0;
    var intersection = 0;
    var union = 0;
    for (var i = 0; i < n; i++) {
      var altKept = altMask[i] > 128;
      var imgKept = imgixMask[i] > 128;
      if (altKept && imgKept) intersection++;
      if (altKept || imgKept) union++;
    }
    if (union === 0) return 1.0; // both fully transparent — vacuously equal
    return intersection / union;
  }

  // imgix is the north star. INVARIANT: imgix is ALWAYS Version 1 — even if
  // its mask failed to load, even if it scored badly, even if its alts
  // would otherwise outrank it. The user's mental model is "Version 1 is the
  // imgix result, the alternatives are if you want to try something different."
  //
  // Among alternates, hide:
  //   (a) any that's ≥80% similar to imgix (they'd be clones of V1)
  //   (b) any that's ≥80% similar to an already-included alt (clone of V2)
  // Alts are processed in best-score order so the higher-quality wins ties.
  function buildFinalRanking(ranked) {
    var imgix = ranked.find(function (c) { return c.name === 'imgix'; });
    var alts = ranked.filter(function (c) { return c.name !== 'imgix'; });

    if (!imgix) {
      // Imgix candidate completely absent (extreme failure case). Best we can
      // do is show alts in score order. Should be rare — we keep imgix in
      // `scored` even when its mask is null, so this only fires if the URL
      // didn't load at all.
      console.warn('[bg-removal-multi] imgix candidate missing from results');
      return alts.slice().sort(function (a, b) { return a.score - b.score; });
    }

    // Similarity uses the NORMALIZED mask (each candidate's subject scaled to
    // the same canvas), so dimension/aspect differences between models don't
    // wreck the IoU. Falls back to the untrimmed mask if normalizedMask is
    // null (edge case: image dimensions read failed).
    var imgixSimMask = imgix.normalizedMask || imgix.mask;
    if (!imgixSimMask) {
      console.warn('[bg-removal-multi] imgix mask unavailable — skipping similarity filter');
      alts.sort(function (a, b) { return a.score - b.score; });
      return [imgix].concat(alts);
    }

    // Normal path: imgix has a normalized mask, apply similarity-based deduping.
    alts.forEach(function (alt) {
      var altSimMask = alt.normalizedMask || alt.mask;
      alt.imgixSimilarity = altSimMask ? imgixSimilarity(altSimMask, imgixSimMask) : 0;
    });
    alts.sort(function (a, b) { return a.score - b.score; });

    var visibleAlts = [];
    alts.forEach(function (alt) {
      if (alt.imgixSimilarity >= IMGIX_SIMILARITY_THRESHOLD) return;
      for (var i = 0; i < visibleAlts.length; i++) {
        var altMask = alt.normalizedMask || alt.mask;
        var otherMask = visibleAlts[i].normalizedMask || visibleAlts[i].mask;
        if (!altMask || !otherMask) continue;
        var simToOther = imgixSimilarity(altMask, otherMask);
        if (simToOther >= IMGIX_SIMILARITY_THRESHOLD) return;
      }
      visibleAlts.push(alt);
    });
    return [imgix].concat(visibleAlts);
  }

  // Load a candidate image and return BOTH:
  //   - mask: alpha values at SCORE_SIZE for the UNTRIMMED image — used for
  //     scoring. We don't crop before scoring because (a) the variance check
  //     needs untrimmed pixels that align with the original image's pixels,
  //     and (b) cropping to alpha bbox always produces high-coverage masks
  //     which falsely fire the coverage penalty.
  //   - displayUrl: a data URL of the TRIMMED image — used for the preview
  //     and Size Guide mockups so the user sees tight crops, matching the
  //     visual goal of imgix's `trim=colorUnlessAlpha`.
  var ALPHA_TRIM_THRESHOLD = 16;
  function loadCandidate(url) {
    return loadImage(url).then(function (img) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) return { displayUrl: url, mask: null, normalizedMask: null };

      // Full-resolution canvas for trim bbox computation.
      var fullCanvas = document.createElement('canvas');
      fullCanvas.width = w; fullCanvas.height = h;
      var fctx = fullCanvas.getContext('2d');
      fctx.drawImage(img, 0, 0);
      var fullData;
      try { fullData = fctx.getImageData(0, 0, w, h).data; }
      catch (e) {
        console.warn('[bg-removal-multi] canvas tainted, using raw url for', url.slice(0, 80));
        return { displayUrl: url, mask: null, normalizedMask: null };
      }

      // Compute alpha bounding box for the trimmed display URL.
      var minX = w, maxX = -1, minY = h, maxY = -1;
      for (var y = 0; y < h; y++) {
        var rowStart = y * w * 4;
        for (var x = 0; x < w; x++) {
          if (fullData[rowStart + x * 4 + 3] > ALPHA_TRIM_THRESHOLD) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      var displayUrl = url;
      if (maxX >= 0 && (maxX - minX + 1 !== w || maxY - minY + 1 !== h)) {
        var tw = maxX - minX + 1, th = maxY - minY + 1;
        var out = document.createElement('canvas');
        out.width = tw; out.height = th;
        out.getContext('2d').drawImage(fullCanvas, minX, minY, tw, th, 0, 0, tw, th);
        displayUrl = out.toDataURL('image/png');
      }

      // Untrimmed mask at SCORE_SIZE — used for the sharpness/variance/
      // coverage signals that depend on the full image layout.
      var scoreCanvas = document.createElement('canvas');
      scoreCanvas.width = SCORE_SIZE;
      scoreCanvas.height = SCORE_SIZE;
      var sctx = scoreCanvas.getContext('2d');
      sctx.drawImage(img, 0, 0, SCORE_SIZE, SCORE_SIZE);
      var scoreData = sctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
      var alpha = new Uint8ClampedArray(SCORE_SIZE * SCORE_SIZE);
      for (var i = 0, n = alpha.length; i < n; i++) {
        alpha[i] = scoreData[i * 4 + 3];
      }

      // NORMALIZED mask: the trim bbox scaled to SCORE_SIZE. Used ONLY for
      // similarity comparisons (IoU) between candidates. Why: imgix, Bria,
      // Ideogram, and Pixelcut can each return images at different dimensions
      // and aspect ratios. The same subject extracted by two models will end
      // up at different positions/scales in their untrimmed masks — so IoU
      // on untrimmed masks penalizes alignment differences instead of actual
      // subject-shape differences. Normalizing each mask to its bbox makes
      // the comparison about "did they keep the same shape" rather than
      // "did they keep the same pixels at the same coordinates."
      var normalizedMask = null;
      if (maxX < 0) {
        // Fully transparent — use the untrimmed mask (all zeros).
        normalizedMask = alpha;
      } else if (maxX - minX + 1 === w && maxY - minY + 1 === h) {
        // No trim needed (subject fills the frame). Untrimmed mask is already
        // representative.
        normalizedMask = alpha;
      } else {
        var normCanvas = document.createElement('canvas');
        normCanvas.width = SCORE_SIZE;
        normCanvas.height = SCORE_SIZE;
        var nctx = normCanvas.getContext('2d');
        nctx.drawImage(
          fullCanvas,
          minX, minY, maxX - minX + 1, maxY - minY + 1,
          0, 0, SCORE_SIZE, SCORE_SIZE
        );
        var normData = nctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
        normalizedMask = new Uint8ClampedArray(SCORE_SIZE * SCORE_SIZE);
        for (var i = 0; i < normalizedMask.length; i++) {
          normalizedMask[i] = normData[i * 4 + 3];
        }
      }

      return { displayUrl: displayUrl, mask: alpha, normalizedMask: normalizedMask };
    }).catch(function (e) {
      console.warn('[bg-removal-multi] loadCandidate failed for', url.slice(0, 80), e.message);
      return { displayUrl: url, mask: null, normalizedMask: null };
    });
  }

  // Main entry. Returns { winner, alternatives, all } resolved when scoring is done.
  // Triggers a 'progress' event so callers can render loading state.
  function run(sourceUrl, imgixBgRemoveUrl, onProgress, onCandidateReady) {
    var cacheKey = sourceUrl;
    if (cache.has(cacheKey)) {
      var cached = cache.get(cacheKey);
      // Replay onCandidateReady so the UI re-paints from cache the same way
      // it does for a fresh run.
      if (onCandidateReady && cached.all) {
        cached.all.forEach(function (c) { try { onCandidateReady(c); } catch (e) {} });
      }
      return Promise.resolve(cached);
    }

    if (onProgress) onProgress({ phase: 'fetching' });

    // Each candidate is loaded once: we keep its UNTRIMMED alpha mask for
    // scoring (so variance/coverage signals reflect the model's actual
    // bg-removal choices) and a TRIMMED data URL for display (so the user
    // sees tight crops in the preview and Size Guide mockups).
    // persistentUrl is the imgix-served URL of the bg-removed output (for
    // imgix, the bg-remove URL itself; for Ideogram/Pixelcut, the imgix URL
    // returned by Lambda after it re-uploaded the output through the
    // storefront's S3-backed upload pipeline). This is what goes into the
    // cart property — guaranteed CDN-served and persistent.
    // url is the TRIMMED data URL used only for the thumbnail/preview visual.
    // bareUrl is the original (pre-bg-remove) source URL, used as a
    // last-resort fallback if both displayUrl and persistentUrl fail to
    // render in an <img> (e.g., imgix's bg-remove fails for an image type
    // it doesn't support — the bare upload still loads).
    function emitReady(cand) {
      if (onCandidateReady) {
        try { onCandidateReady(cand); } catch (e) { /* ignore */ }
      }
      return cand;
    }
    var promises = [
      loadCandidate(imgixBgRemoveUrl).then(function (d) {
        return emitReady({
          name: 'imgix',
          url: d.displayUrl,
          persistentUrl: imgixBgRemoveUrl,
          bareUrl: sourceUrl,
          mask: d.mask,
          normalizedMask: d.normalizedMask
        });
      }),
      callBgRemoval('bria', sourceUrl).then(function (persistentUrl) {
        return loadCandidate(persistentUrl).then(function (d) {
          return emitReady({ name: 'bria', url: d.displayUrl, persistentUrl: persistentUrl, bareUrl: sourceUrl, mask: d.mask, normalizedMask: d.normalizedMask });
        });
      }),
      callBgRemoval('pixelcut', sourceUrl).then(function (persistentUrl) {
        return loadCandidate(persistentUrl).then(function (d) {
          return emitReady({ name: 'pixelcut', url: d.displayUrl, persistentUrl: persistentUrl, bareUrl: sourceUrl, mask: d.mask, normalizedMask: d.normalizedMask });
        });
      })
    ];

    // Use allSettled so a single model failure doesn't kill the rest.
    return Promise.all(promises.map(function (p) {
      return p.then(
        function (v) { return { status: 'fulfilled', value: v }; },
        function (e) { return { status: 'rejected', reason: e }; }
      );
    })).then(function (settled) {
      var candidates = [];
      settled.forEach(function (s) {
        if (s.status === 'fulfilled') candidates.push(s.value);
        else console.warn('[bg-removal-multi] candidate failed:', s.reason && s.reason.message);
      });
      if (candidates.length === 0) throw new Error('All bg-removal candidates failed');

      if (onProgress) onProgress({ phase: 'scoring', count: candidates.length });
      return rank(candidates, sourceUrl);
    }).then(function (rankResult) {
      // rank() now returns { filtered, unfiltered }:
      //   filtered   — imgix-first with near-duplicates hidden (default view)
      //   unfiltered — every candidate that produced a result (for the
      //                "See other results" expand path)
      // Re-order unfiltered so imgix is always first, matching filtered.
      var filtered = rankResult.filtered;
      var winner = filtered[0];
      var alternatives = filtered.slice(1);
      var unfiltered = rankResult.unfiltered.slice().sort(function (a, b) {
        if (a.name === 'imgix') return -1;
        if (b.name === 'imgix') return 1;
        return a.score - b.score;
      });
      var result = {
        winner: winner,
        alternatives: alternatives,
        all: unfiltered
      };
      cache.set(cacheKey, result);
      return result;
    });
  }

  function clearCache() { cache.clear(); }

  // ─────────────────────────────────────────────────────────────────────────
  // Tab UI
  // ─────────────────────────────────────────────────────────────────────────

  function ensureStyles() {
    if (document.getElementById('__nt-bgr-tabs-style')) return;
    var s = document.createElement('style');
    s.id = '__nt-bgr-tabs-style';
    s.textContent = [
      '.nt-bgr-tabs {',
      '  display: none;',
      '  margin: 8px 0 0 0;',
      '  width: 100%;',
      '  flex-basis: 100%;',
      '}',
      '.nt-bgr-tabs.is-visible { display: flex; flex-direction: column; align-items: center; gap: 8px; }',
      '.nt-bgr-tabs__header-row {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '}',
      '.nt-bgr-tabs__header {',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  gap: 2px;',
      '  color: #334155;',
      '  letter-spacing: 0.01em;',
      '  text-align: center;',
      '}',
      // Line 1: icon + lead text. Slightly smaller, lighter color than line 2.
      '.nt-bgr-tabs__header-line {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  font-size: 13px;',
      '  font-weight: 500;',
      '  color: #475569;',
      '}',
      // Line 1 (lead): bold + slightly darker — primary attention line.
      '.nt-bgr-tabs__header-line--lead {',
      '  font-size: 12.5px;',
      '  font-weight: 700;',
      '  color: #1e293b;',
      '}',
      // Blue "NEW" pill badge in the chooser header.
      '.nt-bgr-tabs__header-badge {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 2px 8px;',
      '  background: #019AFF;',
      '  color: #ffffff;',
      '  font-size: 10px;',
      '  font-weight: 800;',
      '  letter-spacing: 0.06em;',
      '  border-radius: 999px;',
      '  line-height: 1.4;',
      '  flex-shrink: 0;',
      '}',
      // Long/short text variants for the chooser header lead line.
      // Desktop (>768px) shows the long form; mobile / narrow contexts
      // (≤768px, including multi-upload blocks) show the short form so
      // the line stays single-row.
      '.nt-bgr-tabs__header-text--short { display: none; }',
      '@media (max-width: 768px) {',
      '  .nt-bgr-tabs__header-text--full { display: none; }',
      '  .nt-bgr-tabs__header-text--short { display: inline; }',
      '}',
      // "Hide" link that collapses the expanded chooser back to the
      // "Best Match Found! + See other results" row. !important needed to
      // beat the site\'s global button color rules.
      '.nt-bgr-hide {',
      '  font-size: 12px !important;',
      '  font-weight: 600 !important;',
      '  color: #019AFF !important;',
      '  cursor: pointer;',
      '  text-decoration: underline !important;',
      '  text-underline-offset: 2px;',
      '  background: none !important;',
      '  border: 0 !important;',
      '  padding: 0 !important;',
      '}',
      '.nt-bgr-hide:hover { color: #017fd6 !important; }',
      '.nt-bgr-tabs__buttons {',
      '  display: flex;',
      '  flex-direction: row;',
      '  flex-wrap: wrap;',
      '  gap: 16px;',
      '  align-items: flex-end;',
      '}',
      // Version chooser: small thumbnail of the candidate output, with a
      // "Version N" caption beneath. Thumbnail is the actual model result.
      '.nt-bgr-tab {',
      '  background: none;',
      '  border: 0;',
      '  padding: 0;',
      '  cursor: pointer;',
      '  display: inline-flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  gap: 4px;',
      '  user-select: none;',
      '  flex-shrink: 0;',
      '}',
      '.nt-bgr-tab__thumb {',
      '  width: 76px;',
      '  height: 76px;',
      '  max-width: 76px;',
      '  max-height: 76px;',
      '  border-radius: 8px;',
      '  border: 1.5px solid #e2e8f0;',
      '  object-fit: contain;',
      // Match the site\'s standard transparency checkerboard (theme.css uses
      // this exact SVG for the cart preview modal). Two-gray pattern reads
      // clearly behind transparent areas.
      '  background: #f2f2f2 url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0M1QzVDNSIgZD0iTTAgMGg0djRIMHpNMCA4aDR2NEgwek0xNiA4aC00VjRoNHpNMTYgMTZoLTR2LTRoNHpNOCAwaDR2NEg4ek04IDhoNHY0SDh6TTggOEg0VjRoNHpNOCAxNkg0di00aDR6Ii8+PHBhdGggZmlsbD0iIzlCOUI5QiIgZD0iTTQgMGg0djRINHpNNCA4aDR2NEg0ek0xMiA4SDhWNGg0ek0xMiAxNkg4di00aDR6TTEyIDBoNHY0aC00ek0xMiA4aDR2NGgtNHpNNCA4SDBWNGg0ek00IDE2SDB2LTRoNHoiLz48L3N2Zz4=) center center;',
      '  transition: border-color 0.15s ease, transform 0.15s ease;',
      '}',
      '.nt-bgr-tab:hover .nt-bgr-tab__thumb { border-color: #94a3b8; }',
      '.nt-bgr-tab.is-active .nt-bgr-tab__thumb {',
      '  border-color: #019AFF;',
      '  border-width: 2px;',
      '}',
      // When imgix bg-removal fails we still show V1 (using the original
      // upload as visual fallback). Dashed amber border + amber label cues
      // the user that this version is the original, not bg-removed.
      '.nt-bgr-tab.is-failed .nt-bgr-tab__thumb {',
      '  border-style: dashed;',
      '  border-color: #f59e0b;',
      '}',
      '.nt-bgr-tab.is-failed .nt-bgr-tab__label { color: #b45309; }',
      '.nt-bgr-tab__label {',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '  color: #475569;',
      '  letter-spacing: 0.02em;',
      '  white-space: nowrap;',
      '}',
      '.nt-bgr-tab.is-active .nt-bgr-tab__label { color: #019AFF; }',
      // Loading state for Option 2 / Option 3 before their candidates
      // resolve. Same checker bg as a normal thumb; a small blue spinner
      // sits centered on top so the customer knows it\'s still loading.
      '.nt-bgr-tab.is-loading { cursor: progress; opacity: 0.92; }',
      '.nt-bgr-tab__thumb--loading {',
      '  position: relative;',
      '  display: inline-block;',
      '  width: 76px;',
      '  height: 76px;',
      '  border-radius: 8px;',
      '  border: 1.5px solid #e2e8f0;',
      '  background: #f2f2f2 url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0M1QzVDNSIgZD0iTTAgMGg0djRIMHpNMCA4aDR2NEgwek0xNiA4aC00VjRoNHpNMTYgMTZoLTR2LTRoNHpNOCAwaDR2NEg4ek04IDhoNHY0SDh6TTggOEg0VjRoNHpNOCAxNkg0di00aDR6Ii8+PHBhdGggZmlsbD0iIzlCOUI5QiIgZD0iTTQgMGg0djRINHpNNCA4aDR2NEg0ek0xMiA4SDhWNGg0ek0xMiAxNkg4di00aDR6TTEyIDBoNHY0aC00ek0xMiA4aDR2NGgtNHpNNCA4SDBWNGg0ek00IDE2SDB2LTRoNHoiLz48L3N2Zz4=) center center;',
      '}',
      '.nt-bgr-tab__spinner {',
      '  position: absolute;',
      '  top: 50%; left: 50%;',
      '  width: 32px;',
      '  height: 32px;',
      '  margin: -16px 0 0 -16px;',
      '  pointer-events: none;',
      '}',
      '.nt-bgr-tab__spinner svg {',
      '  width: 100%;',
      '  height: 100%;',
      '  animation: rotate 3s linear infinite;',
      '  transform-origin: center center;',
      '}',
      '.nt-bgr-tab__spinner circle {',
      '  stroke: #019AFF;',
      '  stroke-dasharray: 150, 200;',
      '  stroke-dashoffset: -10;',
      '  animation: dash 6s linear infinite;',
      '  stroke-linecap: round;',
      '}',
      // "Recommended" subtitle on the best-match candidate — appears below
      // the "Version N" label. Always shown (regardless of selection state)
      // so the customer can see which version we recommend.
      '.nt-bgr-tab__recommended {',
      '  font-size: 10.5px;',
      '  font-weight: 700;',
      '  color: #73D447;',
      '  letter-spacing: 0.02em;',
      '  text-transform: uppercase;',
      '  margin-top: -2px;',
      '  white-space: nowrap;',
      '}',
      // Wraps thumb + the small "best match" check badge so the badge can
      // be absolutely positioned in the top-right corner of the thumb.
      '.nt-bgr-tab__thumb-wrap {',
      '  position: relative;',
      '  display: inline-block;',
      '  line-height: 0;',
      '}',
      // Green check badge — shown only on the "best match" candidate when
      // the perfect-match-expanded view is open. Persists regardless of
      // which version is currently selected. Matches the on-state green
      // used by the Remove Background toggle slider (#73D447 in
      // portal-multiupload.liquid).
      '.nt-bgr-tab__best {',
      '  position: absolute;',
      '  top: -6px;',
      '  right: -6px;',
      '  width: 20px;',
      '  height: 20px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border-radius: 50%;',
      '  background: #73D447;',
      '  color: #ffffff;',
      '  font-size: 12px;',
      '  font-weight: 800;',
      '  line-height: 1;',
      '  box-shadow: 0 1px 3px rgba(0,0,0,0.15);',
      '  border: 2px solid #ffffff;',
      '  z-index: 2;',
      '  pointer-events: none;',
      '}',
      '.nt-bgr-loading {',
      '  display: inline-flex;',
      '  align-self: center;',
      '  align-items: center;',
      '  gap: 6px;',
      '  font-size: 12px;',
      '  color: #64748b;',
      '  padding: 6px 10px;',
      '}',
      '.nt-bgr-loading::before {',
      '  content: "";',
      '  width: 12px;',
      '  height: 12px;',
      '  border: 2px solid #cbd5e1;',
      '  border-top-color: #019AFF;',
      '  border-radius: 50%;',
      '  animation: nt-bgr-spin 0.8s linear infinite;',
      '}',
      '@keyframes nt-bgr-spin { to { transform: rotate(360deg); } }',
      // Layout row that holds the "Recommended Background Removal Selected"
      // badge + "See other results" link side by side when there are no
      // meaningful alternates.
      '.nt-bgr-perfect-row {',
      '  display: inline-flex;',
      '  align-self: center;',
      '  align-items: center;',
      '  gap: 12px;',
      '  flex-wrap: wrap;',
      '}',
      // The link defaults to align-self:flex-start (so it hugs the left
      // edge when used standalone in a column flex container). Inside the
      // perfect-row we want it vertically centered against the badge.
      '.nt-bgr-perfect-row .nt-bgr-see-other {',
      '  align-self: center !important;',
      '}',
      // "Best Match Found!" badge — static (no fade-out) when there\'s a
      // perfect match. align-self:flex-start keeps it hugging its text width.
      '.nt-bgr-success {',
      '  display: inline-flex;',
      '  align-self: flex-start;',
      '  width: fit-content;',
      '  max-width: max-content;',
      '  align-items: center;',
      '  gap: 6px;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: #065f46;',
      '  background: #ecfdf5;',
      '  border: 1px solid #a7f3d0;',
      '  padding: 6px 12px;',
      '  border-radius: 6px;',
      '  animation: nt-bgr-fade 0.3s ease-out;',
      '}',
      '.nt-bgr-success::before {',
      '  content: "\\2713";',
      '  font-weight: 700;',
      '  color: #73D447;',
      '}',
      '@keyframes nt-bgr-fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }',
      // "See other results" link shown after the toast when there\'s a perfect
      // match (no meaningful alternatives by IoU). Stays visible so the
      // customer can expand the chooser if they want to compare anyway.
      '.nt-bgr-see-other {',
      '  display: inline-flex;',
      '  align-self: flex-start;',
      '  width: fit-content;',
      '  font-size: 12px !important;',
      '  font-weight: 600 !important;',
      '  color: #019AFF !important;',
      '  cursor: pointer;',
      '  text-decoration: underline !important;',
      '  text-underline-offset: 2px;',
      '  background: none !important;',
      '  border: 0 !important;',
      '  padding: 0 !important;',
      '}',
      '.nt-bgr-see-other:hover { color: #017fd6 !important; }',
      // Loading overlay over the preview area while the multi-model run is
      // in progress AND while every candidate image hasn\'t finished
      // preloading. Hides all child elements so no transient/wrong image
      // ever flashes through. Self-contained checkered bg + min dimensions
      // so it\'s visible even when the preview wrapper collapses.
      '.nt-bgr-preview-loading {',
      '  position: relative !important;',
      '  min-height: 220px !important;',
      '  min-width: 220px !important;',
      '  background: repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 18px 18px !important;',
      '  border-radius: 6px;',
      '}',
      '.nt-bgr-preview-loading > *:not(.nt-bgr-spinner-svg) {',
      '  visibility: hidden !important;',
      '}',
      // Matches the site\'s standard blue Material-style spinner (used in
      // .button--loader). Reuses @keyframes rotate + @keyframes dash from
      // theme.css.
      '.nt-bgr-spinner-svg {',
      '  position: absolute;',
      '  top: 50%; left: 50%;',
      '  width: 60px;',
      '  height: 60px;',
      '  margin: -30px 0 0 -30px;',
      '  z-index: 51;',
      '  pointer-events: none;',
      '}',
      '.nt-bgr-spinner-svg svg {',
      '  width: 100%;',
      '  height: 100%;',
      '  animation: rotate 3s linear infinite;',
      '  transform-origin: center center;',
      '}',
      '.nt-bgr-spinner-svg circle {',
      '  stroke: #3eaeff;',
      '  stroke-dasharray: 150, 200;',
      '  stroke-dashoffset: -10;',
      '  animation: dash 6s linear infinite;',
      '  stroke-linecap: round;',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // Find or create the tabs container for a given upload block. The block is
  // the wrapper that contains both the preview img and the toggle-options
  // (.bgRemover). The tabs container is inserted in its OWN row above the
  // options row (toggles + Edit with AI), not as a sibling flex item — that
  // way it gets full width and the buttons don't get squished into letters.
  function getOrCreateTabsContainer(block) {
    block = block || document;
    var scope = block.querySelector ? block : document;
    var existing = scope.querySelector('.nt-bgr-tabs');
    if (existing) return existing;
    // Try the newer template first (toggle-options), then the legacy one.
    var anchor = scope.querySelector('toggle-options') ||
                 scope.querySelector('.fileupload_bg_options');
    if (!anchor) return null;
    var el = document.createElement('div');
    el.className = 'nt-bgr-tabs';
    // Step up one level so the tabs row is a SIBLING of the toggle row,
    // not a flex item inside it. Falls back to inserting before the anchor
    // if the parent isn't structured that way.
    var optionsRow = anchor.parentElement;
    if (optionsRow && optionsRow.parentElement) {
      optionsRow.parentElement.insertBefore(el, optionsRow);
    } else {
      anchor.parentNode.insertBefore(el, anchor);
    }
    return el;
  }

  function showLoading(block) {
    ensureStyles();
    var container = getOrCreateTabsContainer(block);
    if (!container) return;
    container.innerHTML = '<span class="nt-bgr-loading">Generating Background Removal Options</span>';
    container.classList.add('is-visible');
  }

  function hide(block) {
    var scope = block && block.querySelector ? block : document;
    var containers = scope.querySelectorAll('.nt-bgr-tabs');
    containers.forEach(function (c) {
      c.classList.remove('is-visible');
      c.innerHTML = '';
    });
  }

  // Build the full chooser UI (header + V1/V2/V3 buttons) for a given list
  // of candidates. Extracted so we can call it from both the normal path
  // (visible alternates) and the "See other results" expand path.
  //
  // opts:
  //   bestMatchName  — when set, the candidate with this `name` gets a green
  //                    checkmark badge on its thumb (regardless of which
  //                    version is the active selection). Used in the
  //                    perfect-match-expanded path so the customer can see
  //                    which one was deemed best.
  //   onHide         — when set, render a "Hide" button next to the header
  //                    that calls this callback. Used in the perfect-match-
  //                    expanded path to collapse back to the badge + link.
  function renderChooserButtons(container, candidates, onSelect, opts) {
    opts = opts || {};
    container.innerHTML = '';

    var headerRow = document.createElement('div');
    headerRow.className = 'nt-bgr-tabs__header-row';
    headerRow.appendChild(buildChooserHeader());

    if (typeof opts.onHide === 'function') {
      var hideBtn = document.createElement('button');
      hideBtn.type = 'button';
      hideBtn.className = 'nt-bgr-hide';
      hideBtn.textContent = 'Hide';
      hideBtn.addEventListener('click', function (e) {
        e.preventDefault();
        opts.onHide();
      });
      headerRow.appendChild(hideBtn);
    }
    container.appendChild(headerRow);

    var btnRow = document.createElement('div');
    btnRow.className = 'nt-bgr-tabs__buttons';
    container.appendChild(btnRow);

    // Decide which version is the active selection. Priority:
    //   1. opts.activeName  — caller\'s explicit choice (preserves V2/V3
    //      selection across Hide → See other results toggles).
    //   2. First candidate  — default for the initial render.
    var activeName = opts.activeName || (candidates[0] && candidates[0].name);

    candidates.forEach(function (cand, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      var isActive = cand.name === activeName;
      btn.className = 'nt-bgr-tab' + (isActive ? ' is-active' : '');
      btn.setAttribute('data-name', cand.name);
      // No title attribute — customers don\'t need to see the underlying
      // model name (imgix / bria / pixel) on hover.

      var thumbWrap = document.createElement('span');
      thumbWrap.className = 'nt-bgr-tab__thumb-wrap';

      var thumb = document.createElement('img');
      thumb.className = 'nt-bgr-tab__thumb';
      thumb.alt = 'Option ' + (idx + 1);
      thumb.loading = 'lazy';
      // Fallback chain: trimmed display URL → persistent (bg-remove) URL →
      // bare upload URL (last resort so V1 never renders a broken icon when
      // imgix\'s bg-removal endpoint fails — this only kicks in for imgix
      // because Ideogram/Pixelcut go through Lambda which already re-hosts
      // their outputs to imgix CDN).
      var fallbacks = [cand.url, cand.persistentUrl, cand.bareUrl].filter(function (u) {
        return u && typeof u === 'string';
      });
      var fbIdx = 0;
      thumb.onerror = function () {
        fbIdx++;
        while (fbIdx < fallbacks.length && fallbacks[fbIdx] === fallbacks[fbIdx - 1]) fbIdx++;
        if (fbIdx < fallbacks.length) {
          console.warn('[bg-removal-multi]', cand.name, 'thumb failed; trying fallback', fbIdx);
          thumb.src = fallbacks[fbIdx];
        } else {
          thumb.onerror = null;
        }
      };
      thumb.src = fallbacks[0] || '';
      thumbWrap.appendChild(thumb);
      btn.appendChild(thumbWrap);

      var label = document.createElement('span');
      label.className = 'nt-bgr-tab__label';
      label.textContent = 'Option ' + (idx + 1);
      btn.appendChild(label);

      // "Recommended" subtitle on the best-match candidate (always shown when
      // we know the best match, regardless of whether the customer has
      // currently selected this version). Replaces the corner check badge.
      if (opts.bestMatchName && cand.name === opts.bestMatchName) {
        var rec = document.createElement('span');
        rec.className = 'nt-bgr-tab__recommended';
        rec.textContent = 'Recommended';
        btn.appendChild(rec);
      }

      btn.addEventListener('click', function () {
        btnRow.querySelectorAll('.nt-bgr-tab').forEach(function (t) {
          t.classList.remove('is-active');
        });
        btn.classList.add('is-active');
        if (onSelect) onSelect(cand);
      });
      btnRow.appendChild(btn);
    });
    container.classList.add('is-visible');
  }

  // Two-line header used by both the scaffold render and the final chooser:
  //   Line 1: sparkle icon + "More background removal options for better results"
  //   Line 2: "Choose an Option and Continue:"
  // Returns a single .nt-bgr-tabs__header element with the lines stacked.
  function buildChooserHeader() {
    var header = document.createElement('div');
    header.className = 'nt-bgr-tabs__header';

    var line1 = document.createElement('div');
    line1.className = 'nt-bgr-tabs__header-line nt-bgr-tabs__header-line--lead';
    // Blue "NEW" pill badge in front of the lead text. Two text variants
    // share the slot — the long form for desktop, the short form for
    // narrow screens (mobile / multi-upload). CSS toggles which is shown
    // via the ≤768px media query.
    line1.innerHTML =
      '<span class="nt-bgr-tabs__header-badge" aria-hidden="true">NEW</span>' +
      '<span class="nt-bgr-tabs__header-text nt-bgr-tabs__header-text--full">More background removal options for better results</span>' +
      '<span class="nt-bgr-tabs__header-text nt-bgr-tabs__header-text--short">More background removal options</span>';
    header.appendChild(line1);

    var line2 = document.createElement('div');
    line2.className = 'nt-bgr-tabs__header-line';
    line2.textContent = 'Choose an Option and Continue:';
    header.appendChild(line2);

    return header;
  }

  // Render the chooser scaffold IMMEDIATELY — Option 1 (imgix) is populated
  // with the live preview URL, Options 2 & 3 show loading spinners until
  // their candidates resolve. Customer can see Option 1 and even pick it
  // while bria/pixel finish in the background.
  //
  // Order is always imgix → bria → pixelcut so slots match the labels even
  // when a candidate fails (it just stays in its loading state — the
  // updateScaffoldSlot call never fires for a failed candidate).
  function renderScaffold(container, imgixUrl, bareUrl, onSelect) {
    ensureStyles();
    container.innerHTML = '';
    container.classList.add('is-visible');

    var headerRow = document.createElement('div');
    headerRow.className = 'nt-bgr-tabs__header-row';
    headerRow.appendChild(buildChooserHeader());
    container.appendChild(headerRow);

    var btnRow = document.createElement('div');
    btnRow.className = 'nt-bgr-tabs__buttons';
    container.appendChild(btnRow);

    // Stub imgix candidate so the slot is selectable immediately. Real
    // candidate (with mask + trimmed displayUrl) replaces this via
    // updateScaffoldSlot when loadCandidate resolves.
    var imgixStub = {
      name: 'imgix',
      url: imgixUrl,
      persistentUrl: imgixUrl,
      bareUrl: bareUrl,
      mask: null,
      normalizedMask: null
    };

    var slotOrder = ['imgix', 'bria', 'pixelcut'];
    slotOrder.forEach(function (name, idx) {
      var slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'nt-bgr-tab' + (idx === 0 ? ' is-active' : '');
      slot.setAttribute('data-name', name);

      var thumbWrap = document.createElement('span');
      thumbWrap.className = 'nt-bgr-tab__thumb-wrap';

      // All three slots start in the loading state — Option 1 also shows
      // the spinner briefly so the chooser looks consistent while every
      // option resolves. The imgix slot still gets its stub candidate
      // attached so an early click (after is-loading is removed by
      // updateScaffoldSlot) still works.
      slot.classList.add('is-loading');
      var ph = document.createElement('span');
      ph.className = 'nt-bgr-tab__thumb nt-bgr-tab__thumb--loading';
      var spin = document.createElement('span');
      spin.className = 'nt-bgr-tab__spinner';
      spin.innerHTML = '<svg viewBox="25 25 50 50"><circle cx="50" cy="50" r="20" fill="none" stroke-width="4"></circle></svg>';
      ph.appendChild(spin);
      thumbWrap.appendChild(ph);
      if (idx === 0) slot.__ntCand = imgixStub;
      slot.appendChild(thumbWrap);

      var label = document.createElement('span');
      label.className = 'nt-bgr-tab__label';
      label.textContent = 'Option ' + (idx + 1);
      slot.appendChild(label);

      slot.addEventListener('click', function () {
        if (slot.classList.contains('is-loading')) return;
        btnRow.querySelectorAll('.nt-bgr-tab').forEach(function (t) {
          t.classList.remove('is-active');
        });
        slot.classList.add('is-active');
        var cand = slot.__ntCand;
        if (cand && onSelect) onSelect(cand);
      });
      btnRow.appendChild(slot);
    });
  }

  // Replace a scaffold slot\'s loading spinner with the resolved candidate\'s
  // thumb image. Called from the run() per-candidate-ready callback.
  function updateScaffoldSlot(container, cand) {
    if (!container || !cand) return;
    var slot = container.querySelector('.nt-bgr-tab[data-name="' + cand.name + '"]');
    if (!slot) return;
    slot.__ntCand = cand;
    var thumbWrap = slot.querySelector('.nt-bgr-tab__thumb-wrap');
    if (!thumbWrap) return;
    thumbWrap.innerHTML = '';
    var thumb = document.createElement('img');
    thumb.className = 'nt-bgr-tab__thumb';
    thumb.alt = (slot.querySelector('.nt-bgr-tab__label') || {}).textContent || cand.name;
    thumb.loading = 'lazy';
    var fallbacks = [cand.url, cand.persistentUrl, cand.bareUrl].filter(function (u) {
      return u && typeof u === 'string';
    });
    var fbIdx = 0;
    thumb.onerror = function () {
      fbIdx++;
      while (fbIdx < fallbacks.length && fallbacks[fbIdx] === fallbacks[fbIdx - 1]) fbIdx++;
      if (fbIdx < fallbacks.length) thumb.src = fallbacks[fbIdx];
      else thumb.onerror = null;
    };
    thumb.src = fallbacks[0] || '';
    thumbWrap.appendChild(thumb);
    slot.classList.remove('is-loading');
  }

  // Render the version chooser given the result. The "winner" is always imgix
  // (per the north-star rule); `alternatives` are alts <80% similar to imgix.
  //
  // Three paths:
  //   - 2+ visible candidates: render the full chooser immediately.
  //   - 1 visible + extras filtered as near-duplicates (perfect match):
  //     show a "See other results" link that expands to ALL candidates
  //     (result.all) when clicked.
  //   - Only 1 candidate total (rare — usually means models all failed):
  //     clear the container silently.
  function renderTabs(result, onSelect, block) {
    ensureStyles();
    var container = getOrCreateTabsContainer(block);
    if (!container) return;

    // Always show every successful candidate (imgix, bria, pixelcut) as
    // V1/V2/V3. No more "Recommended" / "See other results" collapse — the
    // customer picks from the full set every time.
    var allCandidates = (result.all && result.all.length)
      ? result.all
      : [result.winner].concat(result.alternatives);

    // Imgix is the default selection; record it for the cart-add interceptor.
    setBgRemovalProperty(allCandidates[0]);

    renderChooserButtons(container, allCandidates, onSelect);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  window.NinjaBgRemoval = {
    run: run,
    showLoading: showLoading,
    hide: hide,
    renderTabs: renderTabs,
    clearCache: clearCache,
    MODEL_LABELS: MODEL_LABELS
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-init: watch the upload input + Remove Background toggle and trigger
  // the multi-model run whenever a new image is uploaded or the toggle is
  // flipped on. Independent of which existing upload code path is active
  // (Popular vs. Custom size, etc.).
  // ─────────────────────────────────────────────────────────────────────────

  // Find all preview images on the page. The selector covers:
  //  - legacy: <file-preview> #fileupload_hero (id) and .viewer-box img
  //  - new (bySize_popular):
  //      upload-controls file-preview preview-block .fileupload_hero
  //      multi-upload uploaded-files-block file-preview preview-block .fileupload_hero
  function findPreviewImgs() {
    var nodes = document.querySelectorAll(
      '.fileupload_hero, #fileupload_hero, file-preview .viewer-box img'
    );
    // Filter to <img> elements (xzoom containers also use .fileupload_hero on
    // non-img wrappers).
    return Array.from(nodes).filter(function (n) {
      return n.tagName === 'IMG';
    });
  }

  // Module-level so applyChoice() can mark bareUrls as "already applied —
  // don't treat it as a new upload" alongside the polling's own tracking.
  var appliedBareUrls = new WeakMap(); // img -> Set of bareUrls applyChoice set

  // Helpers to put a loading overlay on the preview area for the duration of
  // a multi-model run. Without this the customer sees the imgix-only
  // bg-remove output (set by bySize_popular) for 2-5s before our final
  // selection is applied — confusing transient state.
  function getPreviewWrappers(block) {
    var scope = block && block.querySelectorAll ? block : document;
    // Apply the loading state to whichever of these is the closest visible
    // wrapper around the preview image. Try in order of specificity. The
    // first one with non-zero dimensions wins. Falls back to file-preview
    // (always there) so SOMETHING gets the loading state.
    var selectors = [
      '.viewer-box',
      'preview-block',
      'preview-box',
      'file-preview'
    ];
    var found = null;
    for (var i = 0; i < selectors.length; i++) {
      var nodes = scope.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        var r = n.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          found = n;
          break;
        }
        // Even 0-dim file-preview is acceptable as a last resort, since the
        // loading style forces min-height/min-width.
        if (!found && selectors[i] === 'file-preview') found = n;
      }
      if (found && found.getBoundingClientRect().width > 0) break;
    }
    return found ? [found] : (block ? [block] : []);
  }
  function setPreviewLoading(block, on) {
    getPreviewWrappers(block).forEach(function (w) {
      if (on) {
        w.classList.add('nt-bgr-preview-loading');
        if (!w.querySelector(':scope > .nt-bgr-spinner-svg')) {
          var spinner = document.createElement('div');
          spinner.className = 'nt-bgr-spinner-svg';
          spinner.innerHTML = '<svg viewBox="25 25 50 50"><circle cx="50" cy="50" r="20" fill="none" stroke-width="4"></circle></svg>';
          w.appendChild(spinner);
        }
      } else {
        w.classList.remove('nt-bgr-preview-loading');
        var spinner = w.querySelector(':scope > .nt-bgr-spinner-svg');
        if (spinner) spinner.remove();
      }
    });
  }

  // Apply the chosen URL to every preview image associated with this block
  // (or the whole page if no block context). Covers:
  //  - the main image preview (.fileupload_hero / #fileupload_hero / .viewer-box img)
  //  - the Ninja Size Guide mockups (#dtf_body_image .watermark_image img)
  //
  // Also records the chosen URL's bareUrl in `appliedBareUrls` so the polling
  // doesn't see this src change as a "new upload" and kick off another
  // multi-model run — important when the chosen URL has a different bareUrl
  // than the original source (e.g., V2/V3 outputs at fresh imgix paths
  // returned by the Lambda, or the no-trim case where displayUrl is the raw
  // imgix URL rather than a data URL).
  function applyChoice(chosenUrl, block) {
    var scope = block && block.querySelectorAll ? block : document;
    var imgs = scope.querySelectorAll(
      '.fileupload_hero, #fileupload_hero, .viewer-box > img, .viewer-box img'
    );
    var bareOfChosen = (typeof chosenUrl === 'string' && !/^data:/.test(chosenUrl))
      ? chosenUrl.split('?')[0]
      : null;
    // Track when ALL main-preview imgs finish loading the new src so we can
    // remove the loading overlay only after the new image is actually
    // visible. Wait at most 4s so a stuck load doesn't leave the spinner
    // running forever.
    var mainImgs = [];
    imgs.forEach(function (img) {
      if (img.tagName !== 'IMG') return;
      if (img.closest && img.closest('#dtf_body_image')) return; // size guide doesn't gate the loading state
      mainImgs.push(img);
      img.setAttribute('src', chosenUrl);
      if (bareOfChosen) {
        var seen = appliedBareUrls.get(img);
        if (!seen) { seen = new Set(); appliedBareUrls.set(img, seen); }
        seen.add(bareOfChosen);
      }
    });
    // Size Guide mockups live OUTSIDE the upload-controls block, so always
    // target them at document scope. (No polling watches these.)
    var sizeGuideImgs = document.querySelectorAll('#dtf_body_image .watermark_image img');
    sizeGuideImgs.forEach(function (img) {
      if (img.tagName === 'IMG') img.setAttribute('src', chosenUrl);
    });

    // Remove the preview loading overlay once the new src has rendered on
    // every visible main-preview img. For data URLs the load is synchronous
    // and `complete` is already true; for http(s) URLs we wait for the
    // `load` event. Hard timeout keeps the UI from getting stuck.
    if (mainImgs.length === 0) {
      setPreviewLoading(block, false);
      return;
    }
    var remaining = mainImgs.length;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      setPreviewLoading(block, false);
    }
    mainImgs.forEach(function (img) {
      var settle = function () {
        remaining--;
        if (remaining <= 0) finish();
        img.removeEventListener('load', settle);
        img.removeEventListener('error', settle);
      };
      if (img.complete && img.naturalWidth > 0) {
        // Already loaded (data URL or browser cache)
        settle();
      } else {
        img.addEventListener('load', settle);
        img.addEventListener('error', settle);
      }
    });
    setTimeout(finish, 4000);
  }

  // Force every candidate URL into the browser cache before we render any
  // <img> tags pointing at them. Once cached, the actual render is a synchronous
  // memory hit — so the user never sees a half-loaded or fallback-to-wrong
  // image flash through the thumbnails or the main preview.
  function preloadCandidateImages(candidates) {
    return Promise.all(candidates.map(function (c) {
      return new Promise(function (resolve) {
        var url = c && c.url;
        if (!url) { resolve(); return; }
        if (url.indexOf('data:') === 0) { resolve(); return; } // data URLs are instant
        var img = new Image();
        var done = false;
        function finish() { if (!done) { done = true; resolve(); } }
        img.onload = finish;
        img.onerror = finish;
        img.src = url;
        setTimeout(finish, 6000); // hard ceiling so a stuck URL doesn\'t hang the UI
      });
    }));
  }

  function trigger(bareUrl, imgixUrl, block) {
    console.log('[bg-removal-multi] trigger', { bareUrl: bareUrl, imgixUrl: imgixUrl });
    var container = getOrCreateTabsContainer(block);
    if (!container) return;

    // The chosen candidate handler — applies the URL to the preview, swaps
    // the chooser\'s active highlight, and records the selection for
    // cart-add. Used by both the scaffold and the final chooser.
    function onSelect(chosen) {
      console.log('[bg-removal-multi] applied', chosen.name);
      var visualUrl = chosen.persistentUrl
        ? (chosen.persistentUrl + (chosen.persistentUrl.indexOf('?') >= 0 ? '&' : '?') + 'trim=colorUnlessAlpha')
        : chosen.url;
      if (chosen.name === 'imgix' && chosen.persistentUrl) {
        visualUrl = chosen.persistentUrl;
      }
      visualUrl = withUpscaleIfOn(visualUrl);
      applyChoice(visualUrl, block);
      setBgRemovalProperty(chosen);
    }

    // Show the scaffold immediately so the customer sees Option 1 (imgix —
    // the URL the site already painted into the main preview) plus loading
    // spinners for Option 2 and Option 3 while bria/pixel resolve in the
    // background. Cuts perceived wait time dramatically.
    renderScaffold(container, imgixUrl, bareUrl, onSelect);

    // Seed the cart-add selection with imgix immediately so an Add-to-Cart
    // BEFORE bria/pixel finish still records the right URL + model name.
    setBgRemovalProperty({
      name: 'imgix',
      persistentUrl: imgixUrl,
      bareUrl: bareUrl
    });

    // Kick off the actual run. The per-candidate-ready callback replaces
    // each scaffold slot\'s spinner with the resolved thumb as it lands.
    run(bareUrl, imgixUrl, null, function (cand) {
      updateScaffoldSlot(container, cand);
    }).then(function (result) {
      // Per-signal breakdown for diagnostics.
      console.log('[bg-removal-multi] ranked (imgix forced first):');
      result.all.forEach(function (c) {
        var simStr = typeof c.imgixSimilarity === 'number'
          ? (c.imgixSimilarity * 100).toFixed(1) + '% sim to imgix'
          : '(imgix itself)';
        console.log('  ', c.name, 'score=' + Math.round(c.score), simStr);
      });
    }).catch(function (err) {
      console.warn('[bg-removal-multi] failed:', err && err.message);
      hide(block);
    });
  }

  // Is the Remove Background toggle currently on? Checks every plausible
  // selector across the templates we support (DTF Transfers uses the new
  // <toggle-options> + .bgRemover, legacy templates use #option_checkbox).
  // Returns true if ANY visible toggle is checked.
  function isBgRemoveToggleOn() {
    var selectors = [
      'upload-controls toggle-options .bgRemover .toggleOption',
      'multi-upload toggle-options .bgRemover .toggleOption',
      'toggle-options .bgRemover .toggleOption',
      '#option_checkbox'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j].checked) return true;
      }
    }
    return false;
  }

  // Mirror of getToggleOptionParams() in bySize_popular.js — checks every
  // selector variant the site uses for the Super Resolution / Upscale
  // toggle. When checked, the chosen bg-removal version\'s URL needs
  // `&upscale=true` appended so imgix CDN (which hosts the Lambda-uploaded
  // bria/pixel outputs as well as the original imgix bg-remove URL) actually
  // upscales when the cart property and admin link append `&w=2000`.
  function isUpscaleToggleOn() {
    var selectors = [
      'upload-controls toggle-options .superRes .toggleOption',
      'multi-upload toggle-options .superRes .toggleOption',
      'toggle-options .superRes .toggleOption',
      '#superRes'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j].checked) return true;
      }
    }
    return false;
  }

  // Append `upscale=true` to a URL if the Super Resolution toggle is on
  // and the URL doesn\'t already have it. data: URLs are left alone — they\'re
  // already pixel data, no transformation possible.
  function withUpscaleIfOn(url) {
    if (!url || typeof url !== 'string' || url.indexOf('data:') === 0) return url;
    if (!isUpscaleToggleOn()) return url;
    if (/[?&]upscale=true\b/.test(url)) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'upscale=true';
  }

  // Build the imgix candidate URL: append `bg-remove=true` + `fm=png` if the
  // src didn't already have them. This is what makes the imgix candidate
  // attempt background removal regardless of the upstream code path.
  // Required because the "use previous design" / "Create with AI" / "Design
  // Studio" paths may set the preview src to a URL that lacks bg-remove —
  // without this we'd score the original (background-intact) image as imgix.
  function ensureImgixBgRemoveParams(src) {
    if (!src) return src;
    // Append bg-remove=true if missing. We DO NOT add fm=png — the site\'s
    // own upload flow doesn\'t, and tacking it on produces a slightly
    // different URL that imgix can return as the original (not bg-removed),
    // which leaves the V1 thumb out of sync with the main preview.
    if (/[?&]bg-remove=true/.test(src)) return src;
    return src + (src.indexOf('?') >= 0 ? '&' : '?') + 'bg-remove=true';
  }

  function bareUrlFromSrc(src) {
    if (!src) return '';
    return src.split('?')[0];
  }

  // The "block" is the smallest container we can scope tabs + applyChoice to,
  // so multi-upload blocks each get their own UI. Falls back to document.
  function findBlock(imgEl) {
    if (!imgEl || !imgEl.closest) return null;
    return imgEl.closest('uploaded-files-block') ||
           imgEl.closest('upload-controls') ||
           imgEl.closest('file-preview') ||
           imgEl.parentElement ||
           null;
  }

  function autoInit() {
    console.log('[bg-removal-multi] auto-init starting');

    // lastSeen: per-img last src — used only to detect "did src change at all".
    // lastTriggered: per-img bareUrl we've already kicked off a run for.
    // Once triggered, we never re-trigger or hide for that img unless a NEW
    // imgix-with-bg-remove URL appears. This prevents the tab-click feedback
    // loop where applyChoice() sets a fal.ai URL and the polling thinks the
    // user toggled bg-removal off.
    var lastSeen = new WeakMap();
    var lastTriggered = new WeakMap();

    // Helper: is the src obviously not a real customer image?
    function isPlaceholderSrc(src) {
      if (!src) return true;
      if (/^data:/.test(src)) return false; // data URLs are our own picks, not placeholders
      // The site\'s default placeholder lives at cdn.shopify.com/.../transparent.png.
      // Treat any URL whose filename starts with `transparent.png` as a placeholder.
      var fname = src.split('?')[0].split('/').pop().toLowerCase();
      return fname.indexOf('transparent.png') === 0;
    }

    function tick() {
      var imgs = findPreviewImgs();
      if (imgs.length === 0) return;
      // Toggle state drives trigger eligibility (not the URL params), so
      // background removal fires on every source: new uploads, previous
      // designs, Create with AI, Design Studio.
      var toggleOn = isBgRemoveToggleOn();
      imgs.forEach(function (img) {
        var src = img.getAttribute('src') || '';
        var prev = lastSeen.get(img) || '';
        if (src === prev) return;
        lastSeen.set(img, src);

        // CLEANUP: when src goes empty / placeholder (customer hit the
        // delete button) or the toggle goes off, hide any chooser left
        // over from the previous image so it doesn\'t look stale next to
        // a freshly selected design. Also forget our trigger tracking so
        // the next non-placeholder src reliably re-triggers.
        if (!src || isPlaceholderSrc(src) || !toggleOn) {
          hide(findBlock(img));
          lastTriggered.delete(img);
          return;
        }

        // Skip tab-click-induced src changes (chosen candidate URLs):
        //  - fal.ai outputs are on fal.media or returned as data: URLs
        //  - our trimmed display URLs are data: URLs
        // Only an HTTP(S) source URL is a real upload/design change.
        if (/^data:/.test(src)) return;

        var bareUrl = bareUrlFromSrc(src);
        if (!bareUrl) return;
        if (lastTriggered.get(img) === bareUrl) return;
        // Skip if we previously applied this bareUrl via a version pick —
        // it's a chosen-version URL bubbling back through the src, not a
        // fresh upload / previous-design selection.
        var alreadyApplied = appliedBareUrls.get(img);
        if (alreadyApplied && alreadyApplied.has(bareUrl)) return;
        lastTriggered.set(img, bareUrl);

        // Defensive: clear any existing chooser before kicking off the new
        // run so the previous image\'s V1/V2/V3 never lingers next to the
        // loading indicator (showLoading also clears, but explicit hide
        // covers any edge case where the container reference differs).
        hide(findBlock(img));

        // Always pass an imgix URL with bg-remove params to the run() so the
        // imgix candidate actually performs background removal, even if the
        // source-setting code path (previous designs, AI, etc.) didn't append
        // the bg-remove flag to the displayed src.
        var imgixUrl = ensureImgixBgRemoveParams(src);
        trigger(bareUrl, imgixUrl, findBlock(img));
      });
    }

    setInterval(tick, 500);
    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
