/* =========================================================
   DTF Upload Tabs — behaviors
   ---------------------------------------------------------
   Scope:
   - Tab switching (4 tabs).
   - Browse/drop proxy so drops anywhere inside Tab 1 hit
     the native #fileInput.
   - Source buttons (Canva/Dropbox/Drive/OneDrive) fire a
     "coming soon" toast. Wire real SDKs here when ready.
   - Tab 4 options open the Design Studio in a full-screen
     <dialog> iframe. "Skip and start from scratch" too.
   - A MutationObserver watches the native #uploadArea state
     and collapses the tabs once a file has been selected.
   - Tab 2 (Recent Designs) is rendered by the my-designs-panel
     snippet and bridged to the upload pipeline by
     snippets/product-page-popups.liquid (md-picker:use-designs
     event). This file is intentionally NOT involved.
   - Tab 3 (Create with AI) is rendered by the aiImageGenerator
     content-for; the native pink-box button launches the
     existing dialog unchanged.
   ========================================================= */

(function () {
  'use strict';

  if (window.__dtfUploadTabsInit) return;
  window.__dtfUploadTabsInit = true;

  /* Every prompt in this tab should:
       1. Show up to 3 canned (existing) results from getGenerativeAiUploads.
       2. Skip the batch generate-new POST if any canned came back.
       3. Otherwise let the native code generate a fresh batch (batchSize=3).
     We do this by intercepting both endpoints via fetch: cap the canned
     response to 3 items, set __dtfutSkipNewAIGeneration when that array is
     non-empty, and short-circuit postBatchGenerativeAiUpload when the flag
     is set. The flag is consumed once per submit. */
  if (!window.__dtfutFetchPatched && typeof window.fetch === 'function') {
    window.__dtfutFetchPatched = true;
    var origFetch = window.fetch;
    window.fetch = function (url, options) {
      try {
        var urlStr = typeof url === 'string' ? url : (url && url.url) || '';

        if (urlStr.indexOf('getGenerativeAiUploads.php') !== -1) {
          return origFetch.apply(this, arguments).then(function (resp) {
            return resp.clone().json().then(function (data) {
              var capped = Array.isArray(data) ? data.slice(0, 3) : [];
              if (capped.length > 0) {
                window.__dtfutSkipNewAIGeneration = true;
              }
              return new Response(JSON.stringify(capped), {
                status: resp.status,
                headers: { 'Content-Type': 'application/json' }
              });
            }).catch(function () { return resp; });
          });
        }

        if (window.__dtfutSkipNewAIGeneration && urlStr.indexOf('postBatchGenerativeAiUpload.php') !== -1) {
          window.__dtfutSkipNewAIGeneration = false;
          return Promise.resolve(new Response('[]', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (e) { /* fall through */ }
      return origFetch.apply(this, arguments);
    };
  }

  /* ---------------- Toast ---------------- */
  function toast(msg) {
    var t = document.getElementById('dtfut-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dtfut-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translate(-50%,10px);background:#111827;color:#fff;font:600 13px/1 "DM Sans",system-ui;padding:12px 18px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.2);opacity:0;transition:opacity .2s ease,transform .2s ease;z-index:9999;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () {
      t.style.opacity = '1';
      t.style.transform = 'translate(-50%,0)';
    });
    clearTimeout(t.__dtfutTimer);
    t.__dtfutTimer = setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translate(-50%,10px)';
    }, 2200);
  }

  /* ---------------- Tab switching ---------------- */
  function activateTab(root, name) {
    var tabs = root.querySelectorAll('[data-dtfut-tab]');
    var panels = root.querySelectorAll('[data-dtfut-panel]');
    var activeTitle = '';
    tabs.forEach(function (t) {
      var isActive = t.getAttribute('data-dtfut-tab') === name;
      t.classList.toggle('is-active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) activeTitle = t.getAttribute('data-dtfut-title-text') || '';
    });
    panels.forEach(function (p) {
      var isActive = p.getAttribute('data-dtfut-panel') === name;
      p.classList.toggle('is-active', isActive);
      if (isActive) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
    if (activeTitle) {
      var titleEl = root.querySelector('[data-dtfut-title]');
      if (titleEl) titleEl.textContent = activeTitle;
    }
    root.dispatchEvent(new CustomEvent('dtfut:tab-change', { detail: { name: name }, bubbles: true }));
  }

  function wireTabs(root) {
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-dtfut-tab]');
      if (!btn || !root.contains(btn)) return;
      activateTab(root, btn.getAttribute('data-dtfut-tab'));
    });
  }

  /* ---------------- Tab 1: drop forwarding ---------------- */
  /* If the user drops a file onto the panel (but outside the
     native dropzone inner circle), forward it to #fileInput so
     the existing change-listener picks it up. */
  function wireDropForward(root) {
    var host = root.querySelector('[data-dtfut-panel="upload"]');
    if (!host) return;

    host.addEventListener('dragover', function (e) {
      if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.indexOf('Files') > -1) {
        e.preventDefault();
      }
    });
    host.addEventListener('drop', function (e) {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      // If the drop already hit the native dropzone, let it handle.
      if (e.target.closest('#dropZoon')) return;
      e.preventDefault();
      var input = document.getElementById('fileInput');
      if (!input) return;
      try {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (_) {
        // Fallback: dispatch a synthetic drop on #dropZoon.
        var dz = document.getElementById('dropZoon');
        if (dz) {
          var ev = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: e.dataTransfer });
          dz.dispatchEvent(ev);
        }
      }
    });
  }

  /* ---------------- Canva / Dropbox / Drive / OneDrive ---------------- */

  /* Lazy-load the Dropbox Chooser script. Idempotent; parallel calls share
     one script tag. Rejects if the app key is missing or the script fails
     to load. */
  var dropboxLoaderPromise = null;
  function loadDropboxChooser(appKey) {
    if (window.Dropbox && typeof window.Dropbox.choose === 'function') {
      return Promise.resolve();
    }
    if (dropboxLoaderPromise) return dropboxLoaderPromise;
    dropboxLoaderPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.id = 'dropboxjs';
      s.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      s.setAttribute('data-app-key', appKey);
      s.onload = function () { resolve(); };
      s.onerror = function () {
        dropboxLoaderPromise = null;
        reject(new Error('Failed to load Dropbox Chooser'));
      };
      document.head.appendChild(s);
    });
    return dropboxLoaderPromise;
  }

  /* Fetch a remote file URL, wrap as a File, and hand it to the native
     upload pipeline (manageFiles on the newer upload-controls, uploadFile
     on the legacy path). Same pattern used by the AI-image figure click
     handler below. */
  function importRemoteFile(url, fileName) {
    var jq = window.jQuery || window.$;
    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Download failed: ' + response.status);
        var type = response.headers.get('Content-Type') || 'application/octet-stream';
        return response.arrayBuffer().then(function (ab) {
          return { type: type, buffer: ab };
        });
      })
      .then(function (data) {
        var blob = new Blob([data.buffer], { type: data.type });
        var file = new File([blob], fileName, { type: data.type });
        var isNewBySize = jq ? jq('upload-controls').length : 0;
        if (isNewBySize > 0 && typeof window.manageFiles === 'function') {
          window.manageFiles([file]);
        } else if (typeof window.uploadFile === 'function') {
          if (jq && jq('.step__2').hasClass('hidden')) {
            window.uploadFile(file);
          } else {
            window.uploadFile(file, 'second_image');
          }
        }
      });
  }

  function openDropboxChooser(appKey) {
    loadDropboxChooser(appKey).then(function () {
      window.Dropbox.choose({
        linkType: 'direct',
        multiselect: true,
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.svg', '.pdf'],
        success: function (files) {
          if (!files || !files.length) return;
          files.forEach(function (f) {
            importRemoteFile(f.link, f.name).catch(function (err) {
              console.error('Dropbox import error:', err);
              toast('Could not import ' + f.name);
            });
          });
        },
        cancel: function () {}
      });
    }).catch(function (err) {
      console.error(err);
      toast('Dropbox is temporarily unavailable');
    });
  }

  /* ---- Google Drive Picker ---- */
  /* Two scripts needed: Google Identity Services (for the OAuth token) and
     gapi (for the Picker API). Both are loaded lazily and de-duped. */
  var gisLoaderPromise = null;
  function loadGoogleIdentity() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      return Promise.resolve();
    }
    if (gisLoaderPromise) return gisLoaderPromise;
    gisLoaderPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        gisLoaderPromise = null;
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.head.appendChild(s);
    });
    return gisLoaderPromise;
  }

  var gapiLoaderPromise = null;
  function loadGapiPicker() {
    if (window.gapi && window.google && window.google.picker) {
      return Promise.resolve();
    }
    if (gapiLoaderPromise) return gapiLoaderPromise;
    gapiLoaderPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://apis.google.com/js/api.js';
      s.async = true;
      s.defer = true;
      s.onload = function () {
        window.gapi.load('picker', {
          callback: function () { resolve(); },
          onerror: function () {
            gapiLoaderPromise = null;
            reject(new Error('Failed to load Google Picker API'));
          }
        });
      };
      s.onerror = function () {
        gapiLoaderPromise = null;
        reject(new Error('Failed to load gapi'));
      };
      document.head.appendChild(s);
    });
    return gapiLoaderPromise;
  }

  /* Pull a Drive file's bytes using the access token, wrap as File, feed
     into the same manageFiles/uploadFile pipeline as Dropbox. */
  function fetchDriveFile(fileId, fileName, mimeType, accessToken) {
    var jq = window.jQuery || window.$;
    var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) +
              '?alt=media&supportsAllDrives=true';
    return fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Drive download failed: ' + response.status);
        return response.arrayBuffer();
      })
      .then(function (ab) {
        var type = mimeType || 'application/octet-stream';
        var blob = new Blob([ab], { type: type });
        var file = new File([blob], fileName, { type: type });
        var isNewBySize = jq ? jq('upload-controls').length : 0;
        if (isNewBySize > 0 && typeof window.manageFiles === 'function') {
          window.manageFiles([file]);
        } else if (typeof window.uploadFile === 'function') {
          if (jq && jq('.step__2').hasClass('hidden')) {
            window.uploadFile(file);
          } else {
            window.uploadFile(file, 'second_image');
          }
        }
      });
  }

  function openGoogleDrivePicker(clientId, apiKey, loginHint) {
    Promise.all([loadGoogleIdentity(), loadGapiPicker()]).then(function () {
      var tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        login_hint: loginHint || '',
        callback: function (tokenResponse) {
          if (!tokenResponse || !tokenResponse.access_token) {
            toast('Google sign-in was cancelled');
            return;
          }
          var accessToken = tokenResponse.access_token;
          var mimeTypes = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/tiff,application/pdf';
          var docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
            .setMimeTypes(mimeTypes)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(false);
          var uploadView = new window.google.picker.DocsUploadView();
          // Project number (AKA appId) is the numeric prefix of the OAuth
          // Client ID — required so drive.file scope recognizes picked files.
          var projectNumber = (clientId || '').split('-')[0];
          var picker = new window.google.picker.PickerBuilder()
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
            .setAppId(projectNumber)
            .setOAuthToken(accessToken)
            .setDeveloperKey(apiKey)
            .addView(docsView)
            .addView(uploadView)
            .setCallback(function (data) {
              if (data.action !== window.google.picker.Action.PICKED) return;
              var docs = data.docs || [];
              docs.forEach(function (doc) {
                fetchDriveFile(doc.id, doc.name, doc.mimeType, accessToken).catch(function (err) {
                  console.error('Drive import error:', err);
                  toast('Could not import ' + doc.name);
                });
              });
            })
            .build();
          picker.setVisible(true);
        }
      });
      tokenClient.requestAccessToken({ prompt: '' });
    }).catch(function (err) {
      console.error(err);
      toast('Google Drive is temporarily unavailable');
    });
  }

  /* ---- OneDrive File Picker (OneDrive.js v7.2) ---- */
  var oneDriveLoaderPromise = null;
  function loadOneDrivePicker() {
    if (window.OneDrive && typeof window.OneDrive.open === 'function') {
      return Promise.resolve();
    }
    if (oneDriveLoaderPromise) return oneDriveLoaderPromise;
    oneDriveLoaderPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://js.live.net/v7.2/OneDrive.js';
      s.async = true;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        oneDriveLoaderPromise = null;
        reject(new Error('Failed to load OneDrive picker'));
      };
      document.head.appendChild(s);
    });
    return oneDriveLoaderPromise;
  }

  function openOneDrivePicker(clientId, redirectUri) {
    loadOneDrivePicker().then(function () {
      window.OneDrive.open({
        clientId: clientId,
        action: 'download',
        multiSelect: true,
        openInNewWindow: true,
        advanced: {
          redirectUri: redirectUri,
          filter: '.png,.jpg,.jpeg,.gif,.webp,.svg,.tiff,.tif,.pdf'
        },
        success: function (response) {
          var files = (response && response.value) || [];
          files.forEach(function (f) {
            var url = f['@microsoft.graph.downloadUrl'] || f.downloadUrl;
            if (!url) return;
            importRemoteFile(url, f.name).catch(function (err) {
              console.error('OneDrive import error:', err);
              toast('Could not import ' + f.name);
            });
          });
        },
        cancel: function () {},
        error: function (err) {
          console.error('OneDrive picker error:', err);
          toast('OneDrive picker failed');
        }
      });
    }).catch(function (err) {
      console.error(err);
      toast('OneDrive is temporarily unavailable');
    });
  }

  function wireSources(root) {
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-dtfut-source]');
      if (!btn) return;
      var src = btn.getAttribute('data-dtfut-source');
      if (src === 'dropbox') {
        var appKey = root.getAttribute('data-dtfut-dropbox-key') || '';
        if (!appKey || appKey === 'REPLACE_WITH_DROPBOX_APP_KEY') {
          toast('Dropbox app key not configured');
          return;
        }
        openDropboxChooser(appKey);
        return;
      }
      if (src === 'drive') {
        var clientId = root.getAttribute('data-dtfut-google-client-id') || '';
        var apiKey = root.getAttribute('data-dtfut-google-api-key') || '';
        var loginHint = root.getAttribute('data-dtfut-customer-email') || '';
        if (!clientId || clientId === 'REPLACE_WITH_GOOGLE_CLIENT_ID' ||
            !apiKey || apiKey === 'REPLACE_WITH_GOOGLE_API_KEY') {
          toast('Google Drive is not configured');
          return;
        }
        openGoogleDrivePicker(clientId, apiKey, loginHint);
        return;
      }
      if (src === 'onedrive') {
        var odClientId = root.getAttribute('data-dtfut-onedrive-client-id') || '';
        var odRedirect = root.getAttribute('data-dtfut-shop-origin') || window.location.origin;
        if (!odClientId || odClientId === 'REPLACE_WITH_ONEDRIVE_CLIENT_ID') {
          toast('OneDrive is not configured');
          return;
        }
        openOneDrivePicker(odClientId, odRedirect);
        return;
      }
      toast((src === 'canva' ? 'Canva' : src) + ' import coming soon');
    });
  }

  /* ---------------- Tab 4: Design Studio (v0-editor overlay) ----------------
     The Ninja Design Studio is rendered into every page via layout/theme.liquid
     (-> snippet 'v0-editor'). It lives hidden as '.customTabelPopup__overlay-editor'.
     We open it the same way the native '.open-v0-editor' trigger does, except we
     SKIP the '.customTabelPopup__overlay-modal' intro popup (the "What would you
     like to create?" splash) because our Tab 4 already made that choice. After the
     overlay is open we click the matching toolbar button so the user lands
     directly in the intended flow (native file picker for upload, or the new
     text object + text options panel for text). */
  function openDesignStudio(mode) {
    var editorOverlay = document.querySelector('.customTabelPopup__overlay-editor');
    var introOverlay  = document.querySelector('.customTabelPopup__overlay-modal');
    if (!editorOverlay) return;

    // Render the studio inline inside the Create tab panel (so it's part of the product page,
    // not a fullscreen overlay). Tag the overlay with __inlineParent so the fullscreen toggle
    // knows where to put it back after lifting it to body for fullscreen.
    var createPanel = document.querySelector('.dtfut__panel[data-dtfut-panel="create"]');
    if (createPanel) {
      editorOverlay.__inlineParent = createPanel;
      if (editorOverlay.parentNode !== createPanel) {
        createPanel.appendChild(editorOverlay);
      }
      createPanel.classList.add('dtfut__panel--studio-open');
    }
    editorOverlay.classList.add('studio-inline');
    editorOverlay.classList.remove('studio-embedded');

    // Mirror '.open-v0-editor' side effects (minus the intro popup).
    editorOverlay.style.display = 'block';
    if (introOverlay) introOverlay.style.display = 'none';
    // NOTE: do NOT add `hide-chat` while inline — that class locks body scroll,
    // which is correct for the fullscreen overlay but wrong when the studio is
    // embedded inside the product page. The fullscreen toggle adds/removes it.

    // v0-editor init uses a transparent-canvas swatch click to seed state.
    var swatch = document.querySelector('.transparent-swatch.canvas-color-swatch');
    if (swatch && typeof swatch.click === 'function') {
      try { swatch.click(); } catch (_) {}
    }

    // Trigger the intended entry flow. Do this synchronously so we keep the
    // user-activation gesture — #add-image-btn forwards to #file-input.click(),
    // which needs a trusted gesture to open the native picker.
    if (mode === 'upload') {
      var uploadBtn = document.querySelector('#add-image-btn');
      if (uploadBtn) uploadBtn.click();
    } else if (mode === 'text') {
      var textBtn = document.querySelector('#add-text-btn');
      if (textBtn) textBtn.click();
    }
    // mode === 'blank' or anything else: just leave them on a clean canvas.

    // Mobile: set the studio to a fixed 38% zoom and pin it there so the
    // canvas lands centered without resizing. We pre-pin BEFORE the
    // fullscreen toggle fires (in wireCreateOptions) so the very first
    // paint targets the 38% layout. setStudioZoomWhenReady then defends
    // against fitCanvasToArea (which runs ASYNC via MutationObserver)
    // by re-asserting the target zoom for ~1.5s.
    var isMobile = window.matchMedia && window.matchMedia('(max-width: 749px)').matches;
    if (isMobile) {
      // Tag for fitCanvasToArea to short-circuit (see patch below).
      window.__dtfMobileZoomTarget = 38;
      // Apply right now if the API is already on window — first paint
      // will use this value instead of fitCanvasToArea's computed scale.
      if (typeof window.setStudioZoom === 'function') {
        try { window.setStudioZoom(38); } catch (_) {}
      }
      setStudioZoomWhenReady(38);
    }
  }

  // Waits for the studio's zoom state to be ready, then sets an exact target
  // percentage via window.setStudioZoom. Re-asserts for ~1.5s because
  // fitCanvasToArea runs on a MutationObserver and can override our initial set.
  function setStudioZoomWhenReady(targetPct) {
    if (typeof window.setStudioZoom !== 'function') {
      setTimeout(function () { setStudioZoomWhenReady(targetPct); }, 100);
      return;
    }
    try { window.setStudioZoom(targetPct); } catch (_) {}
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      var display = document.getElementById('zoom-display');
      var current = display && parseInt((display.textContent || '').replace('%', ''), 10);
      if (current && current > 0 && current !== targetPct) {
        window.setStudioZoom(targetPct);
      }
      if (attempts > 15 || (current === targetPct && attempts > 8)) {
        clearInterval(iv);
      }
    }, 100);
  }

  // Monkey-patch v0-script's `fitCanvasToArea` so that on mobile, when
  // we've pinned a target zoom, fitCanvasToArea defers to that value
  // instead of recomputing a "fit width" that briefly zooms the canvas
  // up before our setStudioZoom pulls it back to 38%. Runs once when
  // window.fitCanvasToArea is available.
  function installMobileFitOverride() {
    if (window.__dtfFitOverrideInstalled) return;
    if (typeof window.fitCanvasToArea !== 'function') {
      setTimeout(installMobileFitOverride, 100);
      return;
    }
    window.__dtfFitOverrideInstalled = true;
    var origFit = window.fitCanvasToArea;
    window.fitCanvasToArea = function () {
      var isMobileFs = window.matchMedia && window.matchMedia('(max-width: 749px)').matches;
      var target = window.__dtfMobileZoomTarget;
      if (isMobileFs && typeof target === 'number' && typeof window.setStudioZoom === 'function') {
        try { window.setStudioZoom(target); } catch (_) {}
        return;
      }
      return origFit.apply(this, arguments);
    };
  }
  installMobileFitOverride();

  // Keep fitting width until the layout stabilises. fitStudioWidth measures the
  // canvas-area width, so we want to re-measure as flex/containment settles.
  function fitStudioWidthWhenReady() {
    if (typeof window.fitStudioWidth !== 'function') {
      setTimeout(fitStudioWidthWhenReady, 100);
      return;
    }
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      window.fitStudioWidth();
      if (attempts >= 10) clearInterval(iv);
    }, 120);
  }

  function isMobileViewport() {
    return window.matchMedia && window.matchMedia('(max-width: 749px)').matches;
  }

  // On mobile fullscreen we want the floating pill (undo/redo/zoom) to sit inline
  // inside the top toolbar — flex handles vertical centering automatically. Move
  // it into .toolbar-right just before #fullscreen-toggle-btn when on mobile.
  function alignFloatingPillInTopBar() {
    if (!isMobileViewport()) return;
    var floating = document.querySelector('.customTabelPopup__overlay-editor .floating_tools');
    var toolbarRight = document.querySelector('.customTabelPopup__overlay-editor .editor-container .toolbar:not(._footer) .toolbar-right');
    var fsBtn = document.querySelector('#fullscreen-toggle-btn');
    if (!floating || !toolbarRight || !fsBtn) return;
    if (floating.parentNode === toolbarRight) return;
    toolbarRight.insertBefore(floating, fsBtn.nextSibling);
  }

  function wireCreateOptions(root) {
    // Auto-open the studio the moment the Create tab becomes active. On
    // mobile, also immediately lift it to fullscreen so the user lands
    // directly in the studio experience — the legacy "Give it a little
    // more room?" splash is gone. The fabric canvas is preserved across
    // tab switches so coming back resumes where they left off.
    root.addEventListener('dtfut:tab-change', function (e) {
      if (e.detail && e.detail.name !== 'create') return;

      // Set the mobile zoom target BEFORE openDesignStudio runs so the
      // monkey-patched fitCanvasToArea (in installMobileFitOverride)
      // already short-circuits to 38% on its first invocation.
      if (isMobileViewport()) {
        window.__dtfMobileZoomTarget = 38;
        if (typeof window.setStudioZoom === 'function') {
          try { window.setStudioZoom(38); } catch (_) {}
        }
      }

      var overlay = document.querySelector('.customTabelPopup__overlay-editor');
      var alreadyOpen = overlay && overlay.classList.contains('studio-inline') && overlay.offsetParent;
      if (!alreadyOpen) openDesignStudio('blank');

      if (isMobileViewport()) {
        // Trigger fullscreen synchronously in the SAME tick as
        // openDesignStudio so the browser never paints the inline state.
        var ov = document.querySelector('.customTabelPopup__overlay-editor');
        var btn = document.getElementById('fullscreen-toggle-btn');
        if (ov && btn && ov.classList.contains('studio-inline')) {
          btn.click();
        }
        // alignFloatingPillInTopBar still defers — it depends on fabric's
        // resize handler running, which DOES yield to the event loop.
        setTimeout(alignFloatingPillInTopBar, 200);
      }
    });

    root.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-dtfut-create]');
      if (!trigger) return;
      e.preventDefault();
      openDesignStudio(trigger.getAttribute('data-dtfut-create'));
    });

    // Mobile-only: clicking the X (fullscreen toggle while in fullscreen)
    // should close the studio AND switch back to the Upload tab. The fabric
    // canvas state stays intact (just hidden under the upload panel) so
    // re-entering Design Studio resumes where they left off.
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var btn = e.target.closest('#fullscreen-toggle-btn');
      if (!btn) return;
      if (!isMobileViewport()) return;
      var overlay = document.querySelector('.customTabelPopup__overlay-editor');
      if (!overlay) return;
      // Only intercept when currently fullscreen (no studio-inline class).
      if (overlay.classList.contains('studio-inline')) return;
      // Let the existing toggle handler run first (it returns the studio to
      // inline mode); on the next tick, activate the Upload tab in dtfut.
      setTimeout(function () {
        var uploadTab = root.querySelector('[data-dtfut-tab="upload"]');
        if (uploadTab) uploadTab.click();
      }, 50);
    }, false);
  }

  /* ---------------- Tab 2: images-per-row picker ---------------- */
  function wireColsPicker(root) {
    var panel = root.querySelector('.dtfut__panel[data-dtfut-panel="recent"]');
    if (!panel) return;
    var isMobile = window.matchMedia && window.matchMedia('(max-width: 749px)').matches;
    var initialCols = isMobile ? '2' : '4';
    panel.setAttribute('data-cols', initialCols);
    syncActiveCol(panel, initialCols);
    var mobileCols = panel.querySelector('.dtfut__cols--mobile');
    var filtersRow = panel.querySelector('.md-filters__row');
    if (mobileCols && filtersRow && !filtersRow.contains(mobileCols)) {
      filtersRow.appendChild(mobileCols);
    }
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('.dtfut__cols-btn');
      if (!btn) return;
      var cols = btn.getAttribute('data-dtfut-cols');
      if (!cols) return;
      panel.setAttribute('data-cols', cols);
      syncActiveCol(panel, cols);
    });
  }

  /* ---------------- Tab 2: search no-results state ----------------
     The shared my-designs-panel always renders upload-tile HTML in
     non-archive views, so its native .md-empty never fires in picker
     mode. Observe the grid's children + search input and toggle
     data-dtfut-empty-search on the panel; CSS shows .dtfut__no-results
     when the attribute is "true". */
  function wireNoResults(root) {
    var panel = root.querySelector('.dtfut__panel[data-dtfut-panel="recent"]');
    if (!panel) return;
    var search = panel.querySelector('.md-search-input');
    var grid = panel.querySelector('.md-grid');
    if (!search || !grid) return;

    function refresh() {
      var hasQuery = search.value.trim().length > 0;
      var hasCard = grid.querySelector('.md-card') !== null;
      panel.setAttribute('data-dtfut-empty-search', (hasQuery && !hasCard) ? 'true' : 'false');
    }

    search.addEventListener('input', refresh);
    var mo = new MutationObserver(refresh);
    mo.observe(grid, { childList: true });
    refresh();
  }
  function syncActiveCol(panel, cols) {
    panel.querySelectorAll('.dtfut__cols-btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-dtfut-cols') === cols);
    });
  }

  /* ---------------- Tab 2: hide tab when logged-in customer has 0 designs ----
     Logged-out customers see the login CTA inside the panel — keep the tab.
     Logged-in customers with zero designs after load → hide the tab so the
     row only shows what's actionable. If the recent tab was active when it
     gets hidden, fall back to the Upload tab. */
  function wireRecentTabVisibility(root) {
    var tabBtn = root.querySelector('[data-dtfut-tab="recent"]');
    var panel = root.querySelector('.dtfut__panel[data-dtfut-panel="recent"]');
    if (!tabBtn || !panel) return;
    var grid = panel.querySelector('.md-grid');
    if (!grid) return; // logged-out path: panel has login CTA, no grid

    function loadingVisible() {
      var loading = panel.querySelector('.md-loading');
      if (!loading) return false;
      var cs = getComputedStyle(loading);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      var inline = (loading.getAttribute('style') || '').toLowerCase();
      if (inline.indexOf('display:none') !== -1 || inline.indexOf('display: none') !== -1) return false;
      return true;
    }

    function refresh() {
      if (loadingVisible()) return;
      var search = panel.querySelector('.md-search-input');
      if (search && search.value.trim().length > 0) return; // search-filtered, not truly empty
      var hasCards = grid.querySelector('.md-card') !== null;
      var shouldHide = !hasCards;
      var currentlyHidden = tabBtn.style.display === 'none';
      // Hide / restore all `.access_old_data` ("Choose a previously
      // uploaded design") links — same empty-state condition applies on
      // the legacy PDP, where this link lives outside the tab strip.
      // Scoped to logged-in customers only; logged-out renders a Login
      // CTA inside .access_old_data, which should always be visible.
      var aods = document.querySelectorAll('.access_old_data');
      for (var i = 0; i < aods.length; i++) {
        var aod = aods[i];
        var isLoginCta = aod.querySelector('.basic_link, .basic__link') !== null;
        if (isLoginCta) continue;
        // `!important` is needed to beat the existing rule
        // `.dtfut .secondDropZone .access_old_data { display: block !important; }`.
        // Use `visibility: hidden` so the link's vertical space is
        // preserved (the upload card layout below stays put). The CSS
        // rule `.dtfut .secondDropZone .access_old_data { display: block
        // !important; }` already keeps the box laid out on v2; this just
        // makes the box invisible. On the legacy PDP this also reserves
        // the space below the upload area so nothing shifts up.
        if (shouldHide) {
          aod.style.setProperty('visibility', 'hidden', 'important');
        } else {
          aod.style.removeProperty('visibility');
        }
      }
      if (shouldHide === currentlyHidden) return;
      // The base CSS sets `display: inline-flex` on .dtfut__tab, which
      // overrides the HTML `hidden` attribute. Use inline display:none to
      // force visibility off; clear it to restore.
      tabBtn.style.display = shouldHide ? 'none' : '';
      tabBtn.hidden = shouldHide;
      if (shouldHide && tabBtn.classList.contains('is-active')) {
        activateTab(root, 'upload');
      }
    }

    // Observe the grid for card add/remove
    new MutationObserver(refresh).observe(grid, { childList: true });
    // Observe the loading element for any state change
    var loadingEl = panel.querySelector('.md-loading');
    if (loadingEl) {
      new MutationObserver(refresh).observe(loadingEl, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    }
    // Observe md-empty visibility (shown when zero designs after load completes)
    var emptyEl = panel.querySelector('.md-empty');
    if (emptyEl) {
      new MutationObserver(refresh).observe(emptyEl, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    }
    // Observe the panel itself for descendant additions (in case loading/empty get re-rendered)
    new MutationObserver(refresh).observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });

    refresh();
    // Initial polling fallback — catches any state change in the first 30s
    // regardless of how the my-designs JS chooses to signal load completion.
    var poll = 0;
    var pollIv = setInterval(function () {
      poll++;
      refresh();
      if (poll >= 30) clearInterval(pollIv);
    }, 1000);
  }

  /* ---------------- Tab 3: AI hero ----------------
     The chat UI markup + JS for Tab 3 ("Create with AI") lives in
     assets/ai-chat-sandbox.js. This file only retains the fetch patching
     at the top (cap getGenerativeAiUploads to 3, short-circuit the
     batch-generate POST when canned existed) so that whichever code drives
     the dialog form (legacy or the sandbox) gets the same behaviour. */

  /* ---------------- Move .promo below tabs wrapper ---------------- */
  /* The "Buy 5 Blanks = Get 10 FREE Transfers" block is a custom_liquid
     template block; its own script moves it beside .generative-ai-area,
     which puts it inside Tab 3 (Create with AI). We want it as a
     sibling immediately AFTER the .dtfut tabs wrapper so it sits
     between the upload box and the price calculator — outside the
     blue container. Set p.__moved = true so the template script
     leaves it alone, and drop the .promo--between class so its
     "between" CSS doesn't apply. */
  function placePromo(root) {
    if (!root.parentNode) return false;

    function attach() {
      var promo = document.querySelector('.promo');
      if (!promo) return false;
      if (promo.__dtfutPlaced && promo.previousElementSibling === root) return true;
      promo.classList.remove('promo--between');
      promo.classList.add('dtfut-promo');
      promo.__moved = true;
      promo.__dtfutPlaced = true;
      root.parentNode.insertBefore(promo, root.nextSibling);
      return true;
    }

    if (attach()) return true;

    var mo = new MutationObserver(function () {
      if (attach()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(attach, 600);
    setTimeout(attach, 2000);
    return false;
  }

  /* ---------------- Post-upload state observer ---------------- */
  /* Signals that mean "upload is done, show the order form":
       Legacy (non-multiupload) — #uploadArea gets `.hidden` class.
       Multiupload (b.enableSettings) — <master-upload> inside
         <upload-controls> gets `.hidden`; post-upload form lives
         inside <upload-controls><next-element>.
       Legacy .fileupload_custom — display toggled to block.
     Any of those → add `.is-upload-active` on root so the CSS
     strips the tab strip + panel chrome and the form renders
     clean, exactly like the pre-tabs layout. */
  function wireUploadStateObserver(root) {
    function sync() {
      var legacyArea = document.getElementById('uploadArea');
      var masterUpload = document.querySelector('upload-controls master-upload');
      var nextEl = document.querySelector('upload-controls next-element');
      var fileupload = document.querySelector('.fileupload_custom');

      var legacyHidden = legacyArea && legacyArea.classList.contains('hidden');
      var masterHidden = masterUpload && masterUpload.classList.contains('hidden');
      var nextShown = nextEl && !nextEl.classList.contains('hidden');
      var fileOpen = fileupload && (
        (fileupload.style && fileupload.style.display === 'block') ||
        (fileupload.offsetParent !== null && !fileupload.hasAttribute('hidden') &&
         getComputedStyle(fileupload).display !== 'none')
      );

      var active = !!(legacyHidden || masterHidden || nextShown || fileOpen);
      root.classList.toggle('is-upload-active', active);
    }

    sync();

    var observed = [];
    function watch(selector, filter) {
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el || observed.indexOf(el) > -1) return;
      observed.push(el);
      var mo = new MutationObserver(sync);
      mo.observe(el, { attributes: true, attributeFilter: filter || ['class'] });
    }

    watch('#uploadArea', ['class']);
    watch('upload-controls master-upload', ['class']);
    watch('upload-controls next-element', ['class']);
    watch('.fileupload_custom', ['class', 'style']);

    // upload-controls itself may swap its `current` attribute
    var controls = document.querySelector('upload-controls');
    if (controls) {
      var mo = new MutationObserver(sync);
      mo.observe(controls, { attributes: true, attributeFilter: ['current', 'class'] });
    }

    // Some elements might not exist at init time — watch the document
    // for them being added, then re-bind.
    var bodyObserver = new MutationObserver(function () {
      watch('#uploadArea', ['class']);
      watch('upload-controls master-upload', ['class']);
      watch('upload-controls next-element', ['class']);
      watch('.fileupload_custom', ['class', 'style']);
      sync();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('md-picker:use-designs', function () { setTimeout(sync, 300); });
    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'fileInput') setTimeout(sync, 300);
    });
  }

  /* ---------------- AI prompt guide overlay ---------------- */
  /* The inline AI tab hides #generative-ai-tips (Example Prompt / Output).
     Clicking "AI prompt guide" clones that content into an overlay that
     covers the Ninja AI Image Creator view within the tab. */
  function openAiGuide(root) {
    var host = root || document.querySelector('.dtfut__ai-host');
    var overlay = host && host.querySelector('[data-dtfut-ai-guide]');
    var body = overlay && overlay.querySelector('[data-dtfut-ai-guide-body]');
    var tips = document.getElementById('generative-ai-tips');
    if (!overlay || !body || !tips) return;
    body.innerHTML = '';
    var clone = tips.cloneNode(true);
    clone.removeAttribute('id');
    clone.style.display = 'block';
    body.appendChild(clone);
    overlay.hidden = false;
    overlay.classList.add('is-open');
  }
  function closeAiGuide(overlay) {
    var overlays = overlay ? [overlay] : document.querySelectorAll('[data-dtfut-ai-guide]');
    overlays.forEach(function (o) {
      o.classList.remove('is-open');
      o.hidden = true;
    });
  }
  function wireAiGuide() {
    if (document.__dtfutAiGuideWired) return;
    document.__dtfutAiGuideWired = true;
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-dtfut-ai-guide-open]');
      if (opener) {
        e.preventDefault();
        var host = opener.closest('.dtfut__ai-host');
        openAiGuide(host);
        return;
      }
      var closer = e.target.closest('[data-dtfut-ai-guide-close]');
      if (closer) {
        e.preventDefault();
        closeAiGuide(closer.closest('[data-dtfut-ai-guide]'));
        return;
      }
    });
  }

  /* ---------------- AI search: hide recent-search dropdown on submit ---------------- */
  /* The AI dialog's input shows a "Recent Searches" menu when focused;
     it's supposed to hide on blur, but clicking Generate keeps focus on
     the input (or hides too slowly) so the dropdown overlaps the results.
     Force-close it on submit and whenever Generate is clicked. */
  function wireAiSearchMenuClose() {
    if (document.__dtfutAiMenuWired) return;
    document.__dtfutAiMenuWired = true;

    function closeMenu() {
      var menu = document.getElementById('AISearchMenu');
      var input = document.getElementById('AISearchInput');
      if (menu) menu.classList.remove('active');
      if (input && typeof input.blur === 'function') input.blur();
    }

    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (form && form.closest && form.closest('#generative-ai-dialog')) {
        closeMenu();
      }
    }, true);

    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('#generative-ai-dialog form button[type="submit"]');
      if (btn) closeMenu();
    });
  }

  /* ---------------- Responsive collapse ----------------
     The desktop layout puts the "Upload Your Artwork" title to the
     left of the four tabs on a single row. Once the row can't fit
     (any collision), drop into a stacked layout: title above, tabs
     below with icons stacked over labels. If the stacked tabs row
     still can't fit the full labels, shorten them ("Previous Designs"
     → "Previous", "Create with AI" → "AI", "Design Studio" → "Studio").

     Container-driven via ResizeObserver — the tabs sit in a product
     column whose width depends on the page layout, not just viewport. */
  function wireResponsiveTabs(root) {
    var header = root.querySelector('.dtfut__header');
    var tabsEl = root.querySelector('.dtfut__tabs');
    var titleEl = root.querySelector('.dtfut__header-title');
    if (!header || !tabsEl) return;

    function sumNaturalTabsWidth(tabsList, gapPx) {
      var total = 0;
      for (var i = 0; i < tabsList.length; i++) {
        // scrollWidth on each tab is reliable because the labels
        // have `white-space: nowrap`, so tab.scrollWidth == content width
        // including padding, regardless of flex-shrink on the parent.
        total += tabsList[i].scrollWidth;
      }
      if (tabsList.length > 1) total += (tabsList.length - 1) * gapPx;
      return total;
    }

    // Measure the widest possible title text via an offscreen span. The title
    // text swaps per active tab ("Upload Your Artwork" → "Describe It, We'll
    // Design It" etc.); using `titleEl.scrollWidth` directly would shift the
    // collision threshold whenever the user switched tabs, causing the row
    // layout to flip into compact mode mid-interaction. Using the longest
    // possible title fixes the threshold so the layout is stable.
    function measureLongestTitleWidth() {
      if (!titleEl) return 0;
      var titles = [];
      var titled = root.querySelectorAll('[data-dtfut-title-text]');
      for (var i = 0; i < titled.length; i++) {
        var t = titled[i].getAttribute('data-dtfut-title-text');
        if (t) titles.push(t);
      }
      if (titles.length === 0) titles.push(titleEl.textContent || '');

      var measurer = document.createElement('span');
      var cs = getComputedStyle(titleEl);
      measurer.style.position = 'absolute';
      measurer.style.left = '-9999px';
      measurer.style.top = '0';
      measurer.style.visibility = 'hidden';
      measurer.style.whiteSpace = 'nowrap';
      measurer.style.fontFamily = cs.fontFamily;
      measurer.style.fontSize = cs.fontSize;
      measurer.style.fontWeight = cs.fontWeight;
      measurer.style.fontStyle = cs.fontStyle;
      measurer.style.letterSpacing = cs.letterSpacing;
      measurer.style.textTransform = cs.textTransform;
      document.body.appendChild(measurer);

      var maxW = 0;
      for (var j = 0; j < titles.length; j++) {
        measurer.textContent = titles[j];
        var w = measurer.getBoundingClientRect().width;
        if (w > maxW) maxW = w;
      }
      document.body.removeChild(measurer);
      return maxW;
    }

    var raf = 0;
    function recompute() {
      raf = 0;

      // Reset to row layout to measure natural widths.
      root.classList.remove('is-compact', 'is-narrow');
      void header.offsetWidth; // force reflow

      var tabs = tabsEl.querySelectorAll('.dtfut__tab');
      var tabsCs = getComputedStyle(tabsEl);
      var tabsGap = parseFloat(tabsCs.columnGap || tabsCs.gap || '0') || 0;
      var headerCs = getComputedStyle(header);
      var headerGap = parseFloat(headerCs.columnGap || headerCs.gap || '0') || 0;
      var padX = (parseFloat(headerCs.paddingLeft) || 0) + (parseFloat(headerCs.paddingRight) || 0);
      var avail = header.clientWidth - padX;

      var titleNatural = measureLongestTitleWidth();
      var tabsNatural = sumNaturalTabsWidth(tabs, tabsGap);
      var rowNatural = titleNatural + headerGap + tabsNatural;

      // Buffer (px) so we switch to compact slightly before an actual
      // edge-touch collision — anything closer feels cramped visually.
      var BUFFER = 16;

      if (rowNatural + BUFFER > avail) {
        root.classList.add('is-compact');
        void tabsEl.offsetWidth; // reflow under new flex-direction

        // In compact mode, each tab's scrollWidth becomes the wider of
        // its icon vs label (column flex-direction). If the sum still
        // can't fit the tabs strip's full width, swap to short labels.
        var stackedNatural = sumNaturalTabsWidth(tabs, tabsGap);
        if (stackedNatural > tabsEl.clientWidth - 1) {
          root.classList.add('is-narrow');
        }
      }

      // Mark as measured so the no-JS @media fallback steps aside.
      root.classList.add('is-measured');
    }

    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(recompute);
    }

    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(schedule);
      ro.observe(root);
    } else {
      window.addEventListener('resize', schedule);
    }

    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(schedule).catch(function () {});
    }

    schedule();
  }

  /* ---------------- Init ---------------- */
  function init(root) {
    if (root.__dtfutInit) return;
    root.__dtfutInit = true;

    wireTabs(root);
    wireDropForward(root);
    wireSources(root);
    wireCreateOptions(root);
    wireColsPicker(root);
    wireNoResults(root);
    wireRecentTabVisibility(root);
    placePromo(root);
    wireUploadStateObserver(root);
    wireAiSearchMenuClose();
    wireAiGuide();
    wireResponsiveTabs(root);
  }

  /* ---------------- Standalone access_old_data visibility ----------------
     The legacy PDP (/products/dtf-transfers, template multiupload_vividpopular)
     renders the my-designs grid + `.access_old_data` "Choose a previously
     uploaded design" link but does NOT render the `.dtfut` tabs wrapper.
     init() only fires for [data-dtfut] roots, so the empty-state hide
     wouldn't run there. This bootstrap is page-wide: if `.md-grid` and any
     `.access_old_data` exist, observe + poll just like wireRecentTabVisibility
     and toggle the link visibility. */
  function wireAccessOldDataGlobal() {
    if (document.__dtfutAodWired) return;
    var grid = document.querySelector('.md-grid');
    var aods = document.querySelectorAll('.access_old_data');
    if (!grid || aods.length === 0) return;
    document.__dtfutAodWired = true;

    var loading = grid.parentElement && grid.parentElement.querySelector('.md-loading');

    function loadingVisible() {
      if (!loading) return false;
      var cs = getComputedStyle(loading);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      var inline = (loading.getAttribute('style') || '').toLowerCase();
      if (inline.indexOf('display:none') !== -1 || inline.indexOf('display: none') !== -1) return false;
      return true;
    }

    function refresh() {
      if (loadingVisible()) return;
      var hasCards = grid.querySelector('.md-card') !== null;
      var shouldHide = !hasCards;
      var nodes = document.querySelectorAll('.access_old_data');
      for (var i = 0; i < nodes.length; i++) {
        var aod = nodes[i];
        var isLoginCta = aod.querySelector('.basic_link, .basic__link') !== null;
        if (isLoginCta) continue;
        // Use `visibility: hidden` so the link's vertical space is
        // preserved (the upload card layout below stays put). The CSS
        // rule `.dtfut .secondDropZone .access_old_data { display: block
        // !important; }` already keeps the box laid out on v2; this just
        // makes the box invisible. On the legacy PDP this also reserves
        // the space below the upload area so nothing shifts up.
        if (shouldHide) {
          aod.style.setProperty('visibility', 'hidden', 'important');
        } else {
          aod.style.removeProperty('visibility');
        }
      }
    }

    new MutationObserver(refresh).observe(grid, { childList: true });
    if (loading) {
      new MutationObserver(refresh).observe(loading, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    }
    refresh();
    var poll = 0;
    var pollIv = setInterval(function () {
      poll++;
      refresh();
      if (poll >= 30) clearInterval(pollIv);
    }, 1000);
  }

  function bootAll() {
    document.querySelectorAll('[data-dtfut]').forEach(init);
    wireAccessOldDataGlobal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }

  // Shopify theme editor re-render
  document.addEventListener('shopify:section:load', bootAll);
  document.addEventListener('shopify:block:select', bootAll);
})();
