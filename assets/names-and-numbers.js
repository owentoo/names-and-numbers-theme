/* Names & Numbers configurator — v2
 *
 * State management, jersey mockup, 22" gang-sheet packer, sq-in variant matcher,
 * presigned-S3 PNG upload at add-to-cart, and line-item-property handoff matching
 * the existing DTF property contract.
 */
(function () {
  'use strict';

  const EXPORT_DPI = 300;

  const PLACEHOLDER_NAME   = 'RIVERA';
  const PLACEHOLDER_NUMBER = '23';

  function bootAll() { document.querySelectorAll('.nn-page').forEach(boot); }

  function boot(root) {
    if (root.__nnInitialized) return;
    root.__nnInitialized = true;

    const fonts         = readJSON(root, '[data-nn-fonts]');
    const colors        = readJSON(root, '[data-nn-colors]');
    const nameHeights   = readJSON(root, '[data-nn-name-heights]');   // [{ id, label, inches }]
    const numberHeights = readJSON(root, '[data-nn-number-heights]'); // [{ id, label, inches }]
    const variants      = readJSON(root, '[data-nn-variants]') || [];

    const cfg = {
      sheetWidthIn:    numAttr(root, 'data-sheet-width-in', 22),
      sideMarginIn:    numAttr(root, 'data-side-margin-in', 0.25),
      horizGapIn:      numAttr(root, 'data-horiz-gap-in', 0.25),
      vertGapIn:       numAttr(root, 'data-vert-gap-in', 0.25),
      maxEntries:      numAttr(root, 'data-max-entries', 200),
      maxItemWidthIn:  numAttr(root, 'data-max-item-width-in', 12),
      apiUrl:          root.getAttribute('data-api-url'),
      imgixHost:       root.getAttribute('data-imgix-host'),
    };

    const state = {
      scope: 'both',
      fontId:   fonts[0]   ? fonts[0].id   : null,
      colorId:  colors[0]  ? colors[0].id  : null,
      customColorHex: '#ff00ff',
      shirtColorHex: '#000000',
      nameHeightId:   findClosestHeightId(nameHeights,   numAttr(root, 'data-default-name-height-in', 2)),
      numberHeightId: findClosestHeightId(numberHeights, numAttr(root, 'data-default-number-height-in', 8)),
      entries: [],
      focusedEntryId: null,
      activeTab: 'grid',
      editLineKey: null, // populated when editing an existing cart line
    };

    const dom = {
      root,
      scope:           root.querySelector('[data-nn-control="scope"]'),
      fontGrid:        root.querySelector('[data-nn-control="font"]'),
      swatchGrid:      root.querySelector('[data-nn-control="color"]'),
      heightName:      root.querySelector('[data-nn-control="height-name"]'),
      heightNumber:    root.querySelector('[data-nn-control="height-number"]'),
      heightNameGroup: root.querySelector('[data-nn-height-for="name"]'),
      heightNumGroup:  root.querySelector('[data-nn-height-for="number"]'),
      currentFont:     root.querySelector('[data-nn-current-font]'),
      currentColor:    root.querySelector('[data-nn-current-color]'),
      entries:         root.querySelector('[data-nn-entries]'),
      entriesCount:    root.querySelector('[data-nn-entries-count]'),
      addEntryBtn:     root.querySelector('[data-nn-add-entry]'),
      tabs:            root.querySelector('[data-nn-tabs]'),
      paneGrid:        root.querySelector('[data-pane="grid"]'),
      panePaste:       root.querySelector('[data-pane="paste"]'),
      paneCsv:         root.querySelector('[data-pane="csv"]'),
      bulkTextarea:    root.querySelector('[data-nn-bulk-text]'),
      pastePreview:    root.querySelector('[data-nn-paste-preview]'),
      pastePreviewRows:root.querySelector('[data-nn-paste-preview-rows]'),
      pasteCount:      root.querySelector('[data-nn-paste-count]'),
      pasteApplyBtn:   root.querySelector('[data-nn-paste-apply]'),
      pasteApplyLabel: root.querySelector('[data-nn-paste-apply-label]'),
      csvDrop:         root.querySelector('[data-nn-csv-drop]'),
      csvInput:        root.querySelector('[data-nn-csv-input]'),
      csvTemplate:     root.querySelector('[data-nn-csv-template]'),
      csvResult:       root.querySelector('[data-nn-csv-result]'),
      // Jersey preview lives in the LEFT column of the PDP (rendered by snippets/nn-preview-left.liquid),
      // which is a different DOM subtree than the configurator (.nn-page). Query at document level.
      chip:            document.querySelector('[data-nn-chip]'),
      jerseyName:      document.querySelector('[data-nn-jersey-name]'),
      jerseyNumber:    document.querySelector('[data-nn-jersey-number]'),
      jerseyShirt:     document.querySelector('[data-nn-shirt]'),
      dims:            root.querySelector('[data-nn-dimensions]'),
      sqin:            root.querySelector('[data-nn-sqin]'),
      price:           root.querySelector('[data-nn-price]'),
      ctaPrice:        root.querySelector('[data-nn-cta-price]'),
      warning:         root.querySelector('[data-nn-warning]'),
      submitBtn:       root.querySelector('[data-nn-submit]'),
      submitLabel:     root.querySelector('[data-nn-submit-label]'),
      variantInput:    root.querySelector('[data-nn-variant-id]'),
      // The product form is rendered by bySizeNew's buy_buttons block — outside .nn-page.
      // Query globally; tolerate it being missing while bySizeNew is mid-render.
      form:            document.querySelector('form[data-type="add-to-cart-form"]'),
      props: {
        scope:        root.querySelector('[data-nn-prop="scope"]'),
        font:         root.querySelector('[data-nn-prop="font"]'),
        color:        root.querySelector('[data-nn-prop="color"]'),
        nameHeight:   root.querySelector('[data-nn-prop="name-height"]'),
        numberHeight: root.querySelector('[data-nn-prop="number-height"]'),
        entriesCount: root.querySelector('[data-nn-prop="entries-count"]'),
        entries:      root.querySelector('[data-nn-prop="entries"]'),
        width:        root.querySelector('[data-nn-prop="width"]'),
        height:       root.querySelector('[data-nn-prop="height"]'),
        uploadImgix:  root.querySelector('[data-nn-prop="upload-imgix"]'),
        uploadS3:     root.querySelector('[data-nn-prop="upload-s3"]'),
      },
    };

    // Hydrate state from URL (?nn=<base64>&edit_line=<key>) if the customer
    // came back from the cart to edit an existing line item.
    hydrateFromUrl();

    renderFontGrid();
    renderSwatches();
    renderHeightPills(dom.heightName,   nameHeights,   state.nameHeightId);
    renderHeightPills(dom.heightNumber, numberHeights, state.numberHeightId);
    if (state.entries.length === 0) addEntry();
    else renderEntries();

    // Defensive ordering: wire the gallery-swap listener FIRST so any later wire
    // crash doesn't prevent the carousel→jersey swap from working.
    wireFirstInteraction();
    wireShirtColors();
    wireShirtView();
    wireScope();
    wireFonts();
    wireColors();
    wireHeights();
    wireEntries();
    wireRosterTools();
    wireTabs();
    wireBulk();
    wireCsv();
    wireForm();

    Promise.all(fonts.map(loadFont)).then(render);
    render();

    // ---- renderers ----

    function renderFontGrid() {
      dom.fontGrid.innerHTML = '';
      fonts.forEach(f => {
        const tile = el('div', 'nn-font-tile', { 'data-id': f.id, role: 'button', tabindex: '0', 'aria-label': `Choose font ${f.label}` });
        const sample = el('div', 'nn-font-tile__sample');
        sample.style.fontFamily = `"${f.family}", sans-serif`;
        sample.style.fontWeight = String(f.weight || 700);
        sample.innerHTML = `${escapeHTML(f.sample_letter || 'A')}<span class="nn-font-tile__sample-num">${escapeHTML(String(f.sample_number ?? 7))}</span>`;
        const label = el('span', 'nn-font-tile__label');
        label.textContent = f.label;
        tile.appendChild(sample);
        tile.appendChild(label);
        if (f.id === state.fontId) tile.classList.add('is-selected');
        dom.fontGrid.appendChild(tile);
      });
    }

    function renderSwatches() {
      dom.swatchGrid.innerHTML = '';
      colors.forEach(c => {
        const sw = el('div', 'nn-swatch', { 'data-id': c.id, role: 'button', tabindex: '0', 'aria-label': `Choose color ${c.label}`, title: c.label });
        sw.style.background = c.hex;
        if (isLightHex(c.hex)) sw.setAttribute('data-light', 'true');
        if (c.id === state.colorId) sw.classList.add('is-selected');
        dom.swatchGrid.appendChild(sw);
      });

      // Custom color tile: clicking the <label> opens the native color picker
      // attached to the hidden <input type="color">.
      const customTile = document.createElement('label');
      customTile.className = 'nn-swatch nn-swatch--custom';
      customTile.setAttribute('data-id', 'custom');
      customTile.setAttribute('title', 'Custom color');
      customTile.setAttribute('aria-label', 'Choose a custom color');
      customTile.innerHTML = `
        <span class="nn-swatch__plus" aria-hidden="true">+</span>
        <input type="color" data-nn-custom-color value="${state.customColorHex}">
      `;
      if (state.colorId === 'custom') {
        customTile.classList.add('is-selected');
        customTile.style.background = state.customColorHex;
      }
      dom.swatchGrid.appendChild(customTile);
    }

    function renderHeightPills(container, heightList, selectedId) {
      container.innerHTML = '';
      heightList.forEach(h => {
        const pill = el('div', 'nn-pill', { 'data-id': h.id, role: 'button', tabindex: '0', 'aria-label': `${h.inches} inch — ${h.label}` });
        const inches = el('span', 'nn-pill__inches');
        inches.textContent = `${h.inches}"`;
        const label = el('span', 'nn-pill__label');
        label.textContent = h.label;
        pill.appendChild(inches);
        pill.appendChild(label);
        if (h.id === selectedId) pill.classList.add('is-selected');
        container.appendChild(pill);
      });
    }

    function renderEntries() {
      dom.entries.innerHTML = '';
      state.entries.forEach((entry, idx) => {
        const isFocused = entry.id === state.focusedEntryId;
        const tr = el('tr', isFocused ? 'nn-roster__row is-focused' : 'nn-roster__row', { 'data-id': entry.id });
        tr.innerHTML = `
          <td class="nn-roster__idx">${idx + 1}</td>
          <td><input type="text" placeholder="${escapeHTML(PLACEHOLDER_NAME)}" maxlength="40" data-nn-field="name"></td>
          <td><input type="text" placeholder="${escapeHTML(PLACEHOLDER_NUMBER)}" maxlength="6" data-nn-field="number"></td>
          <td>
            <div class="nn-stepper">
              <button type="button" class="nn-stepper__btn" data-nn-qty-step="-1" aria-label="Decrease qty">−</button>
              <input type="number" min="1" max="999" step="1" value="${entry.qty || 1}" data-nn-field="qty" inputmode="numeric">
              <button type="button" class="nn-stepper__btn" data-nn-qty-step="1" aria-label="Increase qty">+</button>
            </div>
          </td>
          <td><button type="button" class="nn-roster__remove" data-nn-remove aria-label="Remove row">&times;</button></td>
        `;
        tr.querySelector('[data-nn-field="name"]').value   = entry.name || '';
        tr.querySelector('[data-nn-field="number"]').value = entry.number || '';
        tr.querySelector('[data-nn-field="qty"]').value    = entry.qty || 1;
        dom.entries.appendChild(tr);
      });
      applyScopeToRoster();
    }

    function applyScopeToRoster() {
      const showName   = state.scope !== 'numbers';
      const showNumber = state.scope !== 'names';
      dom.entries.querySelectorAll('[data-nn-field="name"]').forEach(i => i.style.display = showName   ? '' : 'none');
      dom.entries.querySelectorAll('[data-nn-field="number"]').forEach(i => i.style.display = showNumber ? '' : 'none');
    }

    // ---- wiring ----

    function wireScope() {
      dom.scope.addEventListener('click', e => {
        const btn = e.target.closest('.nn-toggle__btn');
        if (!btn) return;
        state.scope = btn.getAttribute('data-value');
        dom.scope.querySelectorAll('.nn-toggle__btn').forEach(b => {
          const sel = b === btn;
          b.classList.toggle('is-selected', sel);
          b.setAttribute('aria-checked', sel ? 'true' : 'false');
        });
        applyScopeToRoster();
        render();
      });
    }

    function wireFonts() {
      dom.fontGrid.addEventListener('click', e => {
        const tile = e.target.closest('.nn-font-tile');
        if (!tile) return;
        state.fontId = tile.getAttribute('data-id');
        dom.fontGrid.querySelectorAll('.nn-font-tile').forEach(t => t.classList.toggle('is-selected', t === tile));
        render();
      });
    }

    function wireColors() {
      dom.swatchGrid.addEventListener('click', e => {
        // The custom tile is a <label> wrapping a hidden color input — let the browser
        // open the native picker. We update state on the input's change event below.
        if (e.target.closest('input[type="color"]')) return;
        const sw = e.target.closest('.nn-swatch');
        if (!sw) return;
        if (sw.classList.contains('nn-swatch--custom')) {
          state.colorId = 'custom';
          dom.swatchGrid.querySelectorAll('.nn-swatch').forEach(s => s.classList.toggle('is-selected', s === sw));
          render();
          return;
        }
        state.colorId = sw.getAttribute('data-id');
        dom.swatchGrid.querySelectorAll('.nn-swatch').forEach(s => s.classList.toggle('is-selected', s === sw));
        render();
      });

      dom.swatchGrid.addEventListener('input', e => {
        if (!e.target.matches('[data-nn-custom-color]')) return;
        state.customColorHex = e.target.value;
        state.colorId = 'custom';
        const customTile = e.target.closest('.nn-swatch--custom');
        if (customTile) {
          customTile.style.background = state.customColorHex;
          dom.swatchGrid.querySelectorAll('.nn-swatch').forEach(s => s.classList.toggle('is-selected', s === customTile));
        }
        render();
      });
    }

    function wireHeights() {
      dom.heightName.addEventListener('click', e => {
        const pill = e.target.closest('.nn-pill');
        if (!pill) return;
        state.nameHeightId = pill.getAttribute('data-id');
        dom.heightName.querySelectorAll('.nn-pill').forEach(p => p.classList.toggle('is-selected', p === pill));
        render();
      });
      dom.heightNumber.addEventListener('click', e => {
        const pill = e.target.closest('.nn-pill');
        if (!pill) return;
        state.numberHeightId = pill.getAttribute('data-id');
        dom.heightNumber.querySelectorAll('.nn-pill').forEach(p => p.classList.toggle('is-selected', p === pill));
        render();
      });
    }

    function wireEntries() {
      dom.addEntryBtn.addEventListener('click', () => {
        if (state.entries.length >= cfg.maxEntries) return;
        addEntry();
        renderEntries();
        render();
      });

      // Any focus or click on a row moves the jersey preview to that row.
      const focusRow = id => {
        if (state.focusedEntryId === id) return;
        state.focusedEntryId = id;
        dom.entries.querySelectorAll('.nn-roster__row').forEach(r => {
          r.classList.toggle('is-focused', r.getAttribute('data-id') === id);
        });
        render();
      };
      dom.entries.addEventListener('focusin', e => {
        const row = e.target.closest('.nn-roster__row');
        if (row) focusRow(row.getAttribute('data-id'));
      });

      dom.entries.addEventListener('input', e => {
        const inp = e.target.closest('input[data-nn-field]');
        if (!inp) return;
        const row = inp.closest('.nn-roster__row');
        const id = row.getAttribute('data-id');
        const entry = state.entries.find(x => x.id === id);
        if (!entry) return;
        focusRow(id);
        const field = inp.getAttribute('data-nn-field');
        entry[field] = field === 'qty' ? Math.max(1, parseInt(inp.value, 10) || 1) : inp.value;
        render();
      });
      dom.entries.addEventListener('click', e => {
        const row = e.target.closest('.nn-roster__row');
        if (row) focusRow(row.getAttribute('data-id'));

        const stepBtn = e.target.closest('[data-nn-qty-step]');
        if (stepBtn) {
          const id = stepBtn.closest('.nn-roster__row').getAttribute('data-id');
          const entry = state.entries.find(x => x.id === id);
          if (!entry) return;
          const delta = parseInt(stepBtn.getAttribute('data-nn-qty-step'), 10);
          entry.qty = Math.max(1, Math.min(999, (parseInt(entry.qty, 10) || 1) + delta));
          stepBtn.closest('.nn-roster__row').querySelector('[data-nn-field="qty"]').value = entry.qty;
          render();
          return;
        }
        const removeBtn = e.target.closest('[data-nn-remove]');
        if (removeBtn) {
          const id = removeBtn.closest('.nn-roster__row').getAttribute('data-id');
          state.entries = state.entries.filter(x => x.id !== id);
          if (state.entries.length === 0) addEntry();
          // If we just removed the focused entry, focus the first remaining.
          if (state.focusedEntryId === id) state.focusedEntryId = state.entries[0]?.id || null;
          renderEntries();
          render();
        }
      });
    }

    function wireRosterTools() { /* no-op for now */ }

    function wireShirtColors() {
      const grid = document.querySelector('[data-nn-shirt-colors]');
      const bg   = document.querySelector('[data-nn-shirt-bg]');
      if (!grid || !bg) return;
      const apply = hex => {
        state.shirtColorHex = hex;
        bg.style.backgroundColor = hex;
        grid.querySelectorAll('.nn-shirt-swatch').forEach(s => {
          s.classList.toggle('is-selected', s.getAttribute('data-shirt-hex') === hex);
        });
      };
      grid.addEventListener('click', e => {
        if (e.target.closest('input[type="color"]')) return;
        const sw = e.target.closest('.nn-shirt-swatch');
        if (!sw) return;
        const hex = sw.getAttribute('data-shirt-hex');
        if (hex) apply(hex);
      });
      const customInput = grid.querySelector('[data-nn-shirt-custom]');
      if (customInput) {
        customInput.addEventListener('input', e => {
          apply(e.target.value);
          const tile = e.target.closest('.nn-shirt-swatch--custom');
          if (tile) tile.style.background = e.target.value;
        });
      }
    }

    function wireShirtView() {
      const toggle = document.querySelector('[data-nn-shirt-view]');
      const img    = document.querySelector('[data-nn-shirt-img]');
      if (!toggle || !img) return;
      toggle.addEventListener('click', e => {
        const btn = e.target.closest('.nn-shirt-view__btn');
        if (!btn) return;
        const view = btn.getAttribute('data-shirt-view');
        const src  = img.getAttribute(view === 'front' ? 'data-front-src' : 'data-back-src');
        if (src) img.src = src;
        toggle.querySelectorAll('.nn-shirt-view__btn').forEach(b => {
          b.classList.toggle('is-selected', b === btn);
        });
      });
    }

    function wireFirstInteraction() {
      // On the customer's first click or keystroke anywhere in the configurator,
      // swap the left-column gallery out for the live jersey mockup.
      const previewLeft = document.querySelector('.nn-preview-left');
      if (!previewLeft) return;
      const swap = () => {
        if (previewLeft.getAttribute('data-nn-left-mode') !== 'configuring') {
          previewLeft.setAttribute('data-nn-left-mode', 'configuring');
        }
      };
      root.addEventListener('click', swap, { once: true });
      root.addEventListener('input', swap, { once: true });
    }

    function wireTabs() {
      dom.tabs.addEventListener('click', e => {
        const btn = e.target.closest('.nn-tab');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab');
        state.activeTab = tab;
        dom.tabs.querySelectorAll('.nn-tab').forEach(b => b.classList.toggle('is-active', b === btn));
        dom.paneGrid.hidden  = tab !== 'grid';
        dom.panePaste.hidden = tab !== 'paste';
        if (dom.paneCsv) dom.paneCsv.hidden = tab !== 'csv';
      });
    }

    function wireBulk() {
      // Live preview: every keystroke re-parses and updates the preview table.
      dom.bulkTextarea.addEventListener('input', () => {
        const parsed = parseBulk(dom.bulkTextarea.value || '');
        renderPastePreview(parsed);
      });
      // Apply: replace roster with parsed rows and switch to grid.
      dom.pasteApplyBtn.addEventListener('click', () => {
        const parsed = parseBulk(dom.bulkTextarea.value || '');
        if (parsed.length === 0) return;
        state.entries = parsed.map(p => ({ ...p, id: makeId() }));
        state.focusedEntryId = state.entries[0]?.id || null;
        state.activeTab = 'grid';
        dom.tabs.querySelector('[data-tab="grid"]').click();
        renderEntries();
        render();
      });
    }

    function renderPastePreview(rows) {
      if (rows.length === 0) {
        dom.pastePreview.hidden = true;
        dom.pasteApplyBtn.disabled = true;
        dom.pasteApplyLabel.textContent = 'Apply 0 rows to roster';
        return;
      }
      dom.pastePreview.hidden = false;
      dom.pasteCount.textContent = String(rows.length);
      dom.pasteApplyBtn.disabled = false;
      dom.pasteApplyLabel.textContent = `Apply ${rows.length} row${rows.length === 1 ? '' : 's'} to roster`;
      dom.pastePreviewRows.innerHTML = rows.slice(0, 50).map((r, i) => `
        <tr>
          <td class="nn-roster__idx">${i + 1}</td>
          <td>${escapeHTML(r.name || '')}</td>
          <td>${escapeHTML(r.number || '')}</td>
          <td>${r.qty || 1}</td>
        </tr>
      `).join('');
      if (rows.length > 50) {
        dom.pastePreviewRows.insertAdjacentHTML('beforeend',
          `<tr><td colspan="4" class="nn-roster__truncated">+ ${rows.length - 50} more…</td></tr>`);
      }
    }

    function wireCsv() {
      if (!dom.csvDrop) return;
      const openPicker = () => dom.csvInput.click();
      // Click anywhere on the drop label (except the template button) opens the file picker.
      dom.csvDrop.addEventListener('click', e => {
        if (e.target.closest('[data-nn-csv-template]')) return;
        if (e.target === dom.csvInput) return;
        e.preventDefault();
        openPicker();
      });
      dom.csvDrop.addEventListener('dragover', e => { e.preventDefault(); dom.csvDrop.classList.add('is-dragover'); });
      dom.csvDrop.addEventListener('dragleave', () => dom.csvDrop.classList.remove('is-dragover'));
      dom.csvDrop.addEventListener('drop', e => {
        e.preventDefault();
        dom.csvDrop.classList.remove('is-dragover');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleCsvFile(file);
      });
      dom.csvInput.addEventListener('change', e => {
        const file = e.target.files && e.target.files[0];
        if (file) handleCsvFile(file);
      });
      dom.csvTemplate.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        downloadCsvTemplate();
      });
    }

    function handleCsvFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const rows = parseCsv(text);
        if (rows.length === 0) {
          showCsvResult(`Couldn't read any rows from <strong>${escapeHTML(file.name)}</strong>. Check the file is a CSV with name/number/qty columns.`, 'error');
          return;
        }
        state.entries = rows.map(r => ({ ...r, id: makeId() }));
        state.focusedEntryId = state.entries[0]?.id || null;
        state.activeTab = 'grid';
        dom.tabs.querySelector('[data-tab="grid"]').click();
        renderEntries();
        render();
        showCsvResult(`Imported <strong>${rows.length}</strong> row${rows.length === 1 ? '' : 's'} from <strong>${escapeHTML(file.name)}</strong>.`, 'success');
      };
      reader.readAsText(file);
    }

    function showCsvResult(html, kind) {
      if (!dom.csvResult) return;
      dom.csvResult.hidden = false;
      dom.csvResult.className = `nn-csv-result nn-csv-result--${kind}`;
      dom.csvResult.innerHTML = html;
    }

    function downloadCsvTemplate() {
      const csv = 'name,number,qty\nRivera,23,1\nChen,7,1\nOkafor,11,1\n';
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'names-and-numbers-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function wireForm() {
      // The submit button intercepts and drives /cart/add.js (bulk) entirely
      // via fetch — bypasses bySizeNew's product form to avoid double-id
      // collisions from its <template> clone.
      //
      // Each roster entry becomes its own cart line item, sized & priced by
      // the matched bySize-style variant. All lines from one configurator
      // session share `_design name` + `_Upload (Vector Files Preferred)`
      // so the cart UI groups them under one design header.
      dom.submitBtn.addEventListener('click', async e => {
        if (!dom.variantInput.value) return; // disabled state — let nothing happen
        e.preventDefault();
        const originalLabel = dom.submitLabel.textContent;
        dom.submitBtn.disabled = true;
        dom.submitLabel.textContent = 'Uploading artwork…';
        try {
          const fontDef = currentFont();
          const colorDef = currentColor();
          const printables = buildPrintables(state, nameHeights, numberHeights);
          measurePrintables(printables, cfg, fontDef);

          // Per-entry artwork: each roster entry gets its own tight PNG so
          // the cart can show individual line items each with their own
          // preview thumbnail. Uploaded in parallel via Promise.all.
          const entryPrintables = new Map();
          printables.forEach(p => {
            if (p.copyIdx === 0 && !entryPrintables.has(p.entryIdx)) {
              entryPrintables.set(p.entryIdx, p);
            }
          });
          const entryIdxs = [...entryPrintables.keys()];
          dom.submitLabel.textContent = `Rendering ${entryIdxs.length} prints…`;
          const uploads = await Promise.all(entryIdxs.map(async (idx) => {
            const p = entryPrintables.get(idx);
            const blob = await renderEntryPNG(p, cfg, fontDef, colorDef.hex);
            const urls = await uploadBlob(blob, cfg);
            return { idx, urls };
          }));
          const urlByEntryIdx = new Map(uploads.map(u => [u.idx, u.urls]));
          // The first entry's PNG also acts as the shared design thumbnail
          // (used by the cart's nt-design-group-header).
          const firstUrls = urlByEntryIdx.get(entryIdxs[0]);
          dom.props.uploadImgix.value = firstUrls.imgixUrl;
          dom.props.uploadS3.value    = firstUrls.sourceUrl;

          dom.submitLabel.textContent = state.editLineKey ? 'Updating cart…' : 'Adding to cart…';

          // File URL params. bySize uses `trim=colorUnlessAlpha` (which skips
          // transparent edges) — that's right for their files which have solid
          // color backgrounds. Our N&N PNGs ship with a transparent safety
          // pad around the ink to prevent anti-aliasing edge clipping, so we
          // use `trim=auto` which detects content boundaries and crops the
          // transparent border at imgix delivery time. Result: fulfillment
          // downloads a tight crop matching the customer's priced dimensions.
          const ORDER_PARAMS = 'trim=auto';
          const CART_PARAMS  = 'trim=auto&fm=png&auto=compress&q=50&h=100';

          // Shared properties — every line carries _design name so the cart
          // UI groups them under one design header even though each line has
          // a different upload URL.
          const designId = 'nn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
          const sharedProps = {
            'Style': 'Names & Numbers',
            '_design name': designId,
            'Scope': scopeLabel(state.scope),
            'Font': fontDef.label,
            'Color': colorDef.id === 'custom' ? `Custom (${colorDef.hex})` : colorDef.label,
            'Name Height': state.scope === 'numbers' ? '' : `${currentNameH().inches} in (${currentNameH().label})`,
            'Number Height': state.scope === 'names' ? '' : `${currentNumH().inches} in (${currentNumH().label})`,
            'Entries': serializeEntries(state),
            'Entries Count': String(state.entries.length),
            '_render_version': 'client-v5',
          };

          // bySize tier-quantity discount ladder (mirrors the prices-table at
          // snippets/portal-multiupload.liquid:498-540). Total qty across the
          // whole submission determines the active tier. We attach the FULL
          // ladder string + the active tier name to each line so the existing
          // cart Liquid (snippets/arrange-properties.liquid:31) renders the
          // discount badge correctly.
          const TIER_DISCOUNT_LADDER = '_discount_input=min_1-off_50#min_15-off_20#min_50-off_30#min_100-off_40#min_250-off_50#';
          // The ladder above is purely for cart display. The numbers actually
          // applied per tier come from this table:
          const TIER_TABLE = [
            { min:   1, max: 14,      off: 0,  name: '0%_off_for_1_transfers'    },
            { min:  15, max: 49,      off: 20, name: '20%_off_for_15_transfers'  },
            { min:  50, max: 99,      off: 30, name: '30%_off_for_50_transfers'  },
            { min: 100, max: 249,     off: 40, name: '40%_off_for_100_transfers' },
            { min: 250, max: Infinity, off: 50, name: '50%_off_for_250_transfers' },
          ];
          const totalQty = state.entries.reduce((sum, e) => sum + Math.max(1, parseInt(e.qty, 10) || 1), 0);
          const activeTier = TIER_TABLE.find(t => totalQty >= t.min && totalQty <= t.max) || TIER_TABLE[0];
          const discountInputProp = `min_${activeTier.min}-off_${activeTier.off}`;
          const discountNameProp  = activeTier.name;

          const items = [];
          state.entries.forEach((entry, i) => {
            const p = entryPrintables.get(i);
            if (!p) return;
            const lineSqIn = Math.ceil((p.widthIn || 0) * (p.heightIn || 0));
            const variant = matchVariantBySqIn(variants, lineSqIn);
            if (!variant) return;
            const lineUrls = urlByEntryIdx.get(i) || firstUrls;
            const widthStr  = p.widthIn.toFixed(2);
            const heightStr = p.heightIn.toFixed(2);
            items.push({
              id: variant.id,
              quantity: Math.max(1, parseInt(entry.qty, 10) || 1),
              properties: {
                ...sharedProps,
                // File URLs match bySize PNG convention exactly:
                //   Upload (Vector Files Preferred) → imgix?trim=colorUnlessAlpha (production file)
                //   _Original Image                 → imgix?trim=colorUnlessAlpha (per [imgIx] order rule)
                //   _cartImg                        → imgix?trim=colorUnlessAlpha&fm=png&auto=compress&q=50&h=100
                'Upload (Vector Files Preferred)': lineUrls.imgixUrl + '?' + ORDER_PARAMS,
                '_Original Image':                 lineUrls.imgixUrl + '?' + ORDER_PARAMS,
                '_cartImg':                        lineUrls.imgixUrl + '?' + CART_PARAMS,
                'Name':   p.kind === 'pair' ? p.name : (p.kind === 'name' ? p.text : ''),
                'Number': p.kind === 'pair' ? p.number : (p.kind === 'number' ? p.text : ''),
                '_entry_idx': String(i),
                'width':  widthStr,
                'height': heightStr,
                '_Size':  `${widthStr}x${heightStr}`,
                '_Total Sq In': String(lineSqIn),
                '_discount_input': discountInputProp,
                '_discount_name':  discountNameProp,
              },
            });
          });
          if (items.length === 0) throw new Error('No valid roster entries to add');

          // Edit-line cleanup: if we came back from cart to edit, delete the
          // ENTIRE previous design group before adding the new bulk. We look
          // up the old design by either _design name (preferred) or the
          // editLineKey directly.
          let updatesPayload = null;
          if (state.editLineKey) {
            try {
              const cartRes = await fetch('/cart.js', { credentials: 'include' });
              const cart = await cartRes.json();
              const editingLine = (cart.items || []).find(it => it.key === state.editLineKey);
              const oldDesignId = editingLine && editingLine.properties && editingLine.properties['_design name'];
              const updates = {};
              (cart.items || []).forEach(it => {
                if (it.key === state.editLineKey) {
                  updates[it.key] = 0;
                } else if (oldDesignId && it.properties && it.properties['_design name'] === oldDesignId) {
                  updates[it.key] = 0;
                }
              });
              if (Object.keys(updates).length > 0) updatesPayload = { updates };
            } catch (cartErr) {
              console.warn('N&N: failed to read cart for edit-cleanup; falling back to single-line delete', cartErr);
              updatesPayload = { updates: { [state.editLineKey]: 0 } };
            }
          }

          const addRes = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ items }),
          });
          if (!addRes.ok) {
            const errText = await addRes.text().catch(() => '');
            throw new Error(`/cart/add.js HTTP ${addRes.status}: ${errText.slice(0, 200)}`);
          }
          if (updatesPayload) {
            const updRes = await fetch('/cart/update.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatesPayload),
            });
            if (!updRes.ok) console.warn('N&N: failed to remove old design group; cart may have duplicates');
          }
          window.location.href = '/cart';
        } catch (err) {
          console.error('N&N submit failed', err);
          dom.submitLabel.textContent = 'Submit failed — try again';
          dom.submitBtn.disabled = false;
          setTimeout(() => { dom.submitLabel.textContent = originalLabel; }, 3000);
        }
      });
    }

    function hydrateFromUrl() {
      const params = new URLSearchParams(location.search);
      const nn = params.get('nn');
      const editLine = params.get('edit_line');
      if (!nn) return;
      let data;
      try {
        data = JSON.parse(atob(nn));
      } catch (e) {
        console.warn('N&N: failed to decode `nn` param', e);
        return;
      }

      if (data.scope === 'Names only')      state.scope = 'names';
      else if (data.scope === 'Numbers only') state.scope = 'numbers';
      else if (data.scope === 'Names + Numbers') state.scope = 'both';

      if (data.font) {
        const f = fonts.find(x => x.label === data.font);
        if (f) state.fontId = f.id;
      }

      if (data.color) {
        const customMatch = /Custom\s*\(([^)]+)\)/.exec(data.color);
        if (customMatch) {
          state.customColorHex = customMatch[1].trim();
          state.colorId = 'custom';
        } else {
          const c = colors.find(x => x.label === data.color);
          if (c) state.colorId = c.id;
        }
      }

      const matchInches = s => {
        const m = /^([\d.]+)\s*in/.exec(s || '');
        return m ? parseFloat(m[1]) : null;
      };
      const nameIn = matchInches(data.nameHeight);
      const numIn  = matchInches(data.numberHeight);
      if (nameIn != null) state.nameHeightId   = findClosestHeightId(nameHeights, nameIn);
      if (numIn  != null) state.numberHeightId = findClosestHeightId(numberHeights, numIn);

      if (data.entries) {
        const lines = String(data.entries).split('\n').map(l => l.trim()).filter(Boolean);
        state.entries = lines.map(line => {
          const qm = /\s+[×x]\s*(\d+)\s*$/i.exec(line);
          const qty = qm ? parseInt(qm[1], 10) : 1;
          const cleaned = qm ? line.slice(0, qm.index).trim() : line;
          if (state.scope === 'names')   return { id: makeId(), name: cleaned, number: '',     qty };
          if (state.scope === 'numbers') return { id: makeId(), name: '',     number: cleaned, qty };
          const parts = cleaned.split('|');
          return { id: makeId(), name: (parts[0] || '').trim(), number: (parts[1] || '').trim(), qty };
        });
        if (state.entries.length > 0) state.focusedEntryId = state.entries[0].id;
      }

      if (editLine) state.editLineKey = editLine;

      // entry_idx focuses a specific roster row when the customer clicked
      // a per-line Edit link in the cart. Resolves to focusedEntryId after
      // entries have been parsed above.
      const entryIdxParam = params.get('entry_idx');
      if (entryIdxParam != null && state.entries.length > 0) {
        const idx = parseInt(entryIdxParam, 10);
        if (!isNaN(idx) && idx >= 0 && idx < state.entries.length) {
          state.focusedEntryId = state.entries[idx].id;
        }
      }
    }

    function addEntry() {
      if (state.entries.length >= cfg.maxEntries) return;
      const entry = { id: makeId(), name: '', number: '', qty: 1 };
      state.entries.push(entry);
      state.focusedEntryId = entry.id;
      renderEntries();
    }

    function currentFont()  { return fonts.find(f => f.id === state.fontId)   || fonts[0]  || { family: 'sans-serif', weight: 700, label: 'sans-serif' }; }
    function currentColor() {
      if (state.colorId === 'custom') return { id: 'custom', label: 'Custom', hex: state.customColorHex };
      return colors.find(c => c.id === state.colorId) || colors[0] || { hex: '#ffffff', label: 'White' };
    }
    function currentNameH() { return nameHeights.find(h => h.id === state.nameHeightId)     || nameHeights[0]; }
    function currentNumH()  { return numberHeights.find(h => h.id === state.numberHeightId) || numberHeights[0]; }

    function render() {
      const fontDef  = currentFont();
      const colorDef = currentColor();
      const nameH    = currentNameH();
      const numH     = currentNumH();

      // Show/hide height groups based on scope
      dom.heightNameGroup.style.display = state.scope === 'numbers' ? 'none' : '';
      dom.heightNumGroup.style.display  = state.scope === 'names'   ? 'none' : '';

      // Step labels
      dom.currentFont.textContent  = fontDef.label;
      dom.currentColor.textContent = colorDef.label;

      // Chip
      const chipParts = [];
      chipParts.push(fontDef.label);
      if (nameH && state.scope !== 'numbers') chipParts.push(`${nameH.inches}" name`);
      if (numH  && state.scope !== 'names')   chipParts.push(`${numH.inches}" number`);
      dom.chip.textContent = chipParts.join(' · ');

      // Jersey mockup — follow whichever entry the user last interacted with,
      // falling back to the first entry or placeholder samples.
      const focused = state.entries.find(e => e.id === state.focusedEntryId) || state.entries[0] || { name: '', number: '' };
      const previewEntry = {
        name:   (focused.name   || '').trim() || PLACEHOLDER_NAME,
        number: (focused.number || '').trim() || PLACEHOLDER_NUMBER,
      };
      updateJerseyMockup(previewEntry, fontDef, colorDef, nameH, numH);

      dom.entriesCount.textContent = String(state.entries.length);

      // Build printables, pack, price
      const printables = buildPrintables(state, nameHeights, numberHeights);
      const packed = packShelf(printables, cfg, fontDef);
      const empty = packed.placements.length === 0;

      if (empty) {
        dom.dims.textContent = '—';
        dom.sqin.textContent = '—';
        dom.price.textContent = '—';
        dom.ctaPrice.textContent = '';
        dom.submitBtn.disabled = true;
        dom.submitLabel.textContent = 'Add a name or number to start';
        dom.warning.hidden = true;
        dom.variantInput.value = '';
        return;
      }

      // Per-entry cart-line model: each roster entry becomes its own cart
      // line item, sized by its bounding box (or pair box for scope=both).
      // The configurator's displayed total is the sum of per-line prices so
      // the customer sees what they'll pay before adding to cart.
      const entryPrintables = new Map();   // entryIdx → representative printable (one copy)
      printables.forEach(p => {
        if (p.copyIdx === 0 && !entryPrintables.has(p.entryIdx)) {
          entryPrintables.set(p.entryIdx, p);
        }
      });
      let totalSqIn = 0;
      let totalCents = 0;
      let oversize = false;
      let lastVariantId = '';
      const lineSummary = [];
      const perEntryCents = new Map();   // entryIdx → line total cents
      state.entries.forEach((entry, i) => {
        const p = entryPrintables.get(i);
        if (!p) return;
        const qty = Math.max(1, parseInt(entry.qty, 10) || 1);
        const lineSqIn = Math.ceil((p.widthIn || 0) * (p.heightIn || 0));
        totalSqIn += lineSqIn * qty;
        const variant = matchVariantBySqIn(variants, lineSqIn);
        if (!variant) { oversize = true; return; }
        lastVariantId = variant.id;
        const lineCents = (variant.price || 0) * qty;
        totalCents += lineCents;
        perEntryCents.set(i, lineCents);
        lineSummary.push({ entryIdx: i, sqIn: lineSqIn, qty, variantId: variant.id, lineCents });
      });
      // Stash the per-line breakdown for the submit handler to consume.
      state._lineSummary = lineSummary;

      dom.dims.textContent = `${packed.sheetWidthIn.toFixed(2)}" × ${packed.totalHeightIn.toFixed(2)}"`;
      dom.sqin.textContent = `${totalSqIn} sq in`;

      if (oversize) {
        dom.variantInput.value = '';
        dom.price.textContent = '—';
        dom.ctaPrice.textContent = '';
        dom.submitBtn.disabled = true;
        dom.submitLabel.textContent = 'Item too large';
        dom.warning.hidden = false;
        dom.warning.textContent = `One of the names/numbers is larger than our biggest variant. Reduce its size or split into two orders.`;
      } else if (lineSummary.length === 0) {
        dom.variantInput.value = '';
        dom.price.textContent = '—';
        dom.ctaPrice.textContent = '';
        dom.submitBtn.disabled = true;
        dom.submitLabel.textContent = 'Add a name or number to start';
        dom.warning.hidden = true;
      } else {
        dom.variantInput.value = lastVariantId;   // satisfies the wireForm gate
        const totalFormatted = '$' + (totalCents / 100).toFixed(2);
        dom.price.textContent = totalFormatted;
        dom.ctaPrice.textContent = `· ${totalFormatted}`;
        dom.submitBtn.disabled = false;
        dom.submitLabel.textContent = state.editLineKey ? 'Update item' : 'Add to cart';
        dom.warning.hidden = true;
      }

      // Sync hidden properties
      dom.props.scope.value        = scopeLabel(state.scope);
      dom.props.font.value         = fontDef.label;
      dom.props.color.value        = colorDef.id === 'custom' ? `Custom (${colorDef.hex})` : colorDef.label;
      dom.props.nameHeight.value   = state.scope === 'numbers' ? '' : `${nameH.inches} in (${nameH.label})`;
      dom.props.numberHeight.value = state.scope === 'names'   ? '' : `${numH.inches} in (${numH.label})`;
      dom.props.entriesCount.value = String(state.entries.length);
      dom.props.entries.value      = serializeEntries(state);
      dom.props.height.value       = packed.totalHeightIn.toFixed(2);
    }

    function updateJerseyMockup(entry, fontDef, colorDef, nameH, numH) {
      const name   = (entry.name || '').trim();
      const number = (entry.number || '').trim();
      const showName   = state.scope !== 'numbers' && name;
      const showNumber = state.scope !== 'names'   && number;

      // Real-scale preview: 1 inch → SVG_UNITS_PER_INCH svg units. The shirt
      // back panel is ~20 inches wide in the back PNG and maps to 320 svg
      // units in the zone, so 16 units/inch keeps the printed art at the
      // same relative size the customer will get on their jersey. Big
      // designs overflow the back panel — that's intentional (Owen wants
      // an honest sense of how large the print will be).
      const SVG_UNITS_PER_INCH = 16;

      // Read the back-panel zone from the SVG's data attributes (defined in
      // snippets/nn-preview-left.liquid). The stack is positioned with its
      // top edge at zoneY and centered horizontally on the zone's center.
      const svg = dom.jerseyName && dom.jerseyName.ownerSVGElement;
      const zoneX = svg ? parseFloat(svg.getAttribute('data-nn-zone-x') || '80')  : 80;
      const zoneY = svg ? parseFloat(svg.getAttribute('data-nn-zone-y') || '140') : 140;
      const zoneW = svg ? parseFloat(svg.getAttribute('data-nn-zone-w') || '320') : 320;
      const centerX = zoneX + zoneW / 2;
      const gapU = cfg.vertGapIn * SVG_UNITS_PER_INCH;
      // Mirror the packer's maxItemWidthIn cap: if a name's natural width
      // exceeds this, both the print and the preview compress horizontally
      // (scaleX in the print, textLength squish in the SVG). Keeps the
      // mockup honest about what will actually fit on the jersey.
      const maxSvgWidth = (cfg.maxItemWidthIn || 12) * SVG_UNITS_PER_INCH;

      // Probe each text's actual bbox-to-em ratio so the rendered visible
      // glyph height matches the customer's heightIn — same convention the
      // printed art uses (measurePrintables scales by actualBoundingBox).
      // Uppercase block names have bbox ≈ 0.7em (no descenders), so we
      // upscale font-size by 1/ratio to make the visible height land at
      // heightIn × SVG_UNITS_PER_INCH instead of ~70% of it.
      const PROBE_PX = 768;
      const probeCtx = document.createElement('canvas').getContext('2d');
      const bboxEmRatio = (text) => {
        probeCtx.font = `${fontDef.weight || 700} ${PROBE_PX}px "${fontDef.family}", sans-serif`;
        const m = probeCtx.measureText(text || 'M');
        const ascent  = m.actualBoundingBoxAscent  || PROBE_PX * 0.78;
        const descent = m.actualBoundingBoxDescent || PROBE_PX * 0.22;
        return Math.max(0.4, (ascent + descent) / PROBE_PX);  // clamp to avoid runaway
      };

      const applyTextStyles = (node, text, heightIn) => {
        const ratio = bboxEmRatio(text);
        const px = Math.max(1, Math.round((heightIn * SVG_UNITS_PER_INCH) / ratio));
        node.textContent = text;
        node.setAttribute('x', String(centerX));
        node.setAttribute('font-size', String(px));
        node.style.fontFamily = `"${fontDef.family}", sans-serif`;
        node.setAttribute('font-weight', String(fontDef.weight || 700));
        node.setAttribute('fill', colorDef.hex);
        node.removeAttribute('textLength');
        node.removeAttribute('lengthAdjust');
        node.style.display = '';
        // Measure natural width and squish-fit if it exceeds maxItemWidthIn.
        try {
          const w = node.getComputedTextLength();
          if (w > maxSvgWidth) {
            node.setAttribute('textLength', String(maxSvgWidth));
            node.setAttribute('lengthAdjust', 'spacingAndGlyphs');
          }
        } catch { /* SVG not laid out yet on first render; skip */ }
      };

      // Stack the focused entry's pieces with their top edges at zoneY,
      // then name-bottom + vertGap → number-top. dominant-baseline="hanging"
      // (set in the Liquid markup) makes y= the top of the text rather than
      // the baseline, so adding heightIn lands at the next piece's top.
      let cursorY = zoneY;
      if (showName && nameH) {
        applyTextStyles(dom.jerseyName, name.toUpperCase(), nameH.inches);
        dom.jerseyName.setAttribute('y', String(cursorY));
        cursorY += nameH.inches * SVG_UNITS_PER_INCH;
        if (showNumber) cursorY += gapU;
      } else {
        dom.jerseyName.style.display = 'none';
      }

      if (showNumber && numH) {
        applyTextStyles(dom.jerseyNumber, number, numH.inches);
        dom.jerseyNumber.setAttribute('y', String(cursorY));
      } else {
        dom.jerseyNumber.style.display = 'none';
      }
    }
  }

  // ---------- packer ----------

  function buildPrintables(state, nameHeights, numberHeights) {
    const nameH = nameHeights.find(h => h.id === state.nameHeightId)     || nameHeights[0];
    const numH  = numberHeights.find(h => h.id === state.numberHeightId) || numberHeights[0];
    const out = [];
    state.entries.forEach((e, i) => {
      const qty = Math.max(1, parseInt(e.qty, 10) || 1);
      const name = (e.name   || '').trim().toUpperCase();
      const num  = (e.number || '').trim();
      const hasName = state.scope !== 'numbers' && name !== '';
      const hasNum  = state.scope !== 'names'   && num  !== '';
      if (!hasName && !hasNum) return;
      for (let k = 0; k < qty; k++) {
        if (state.scope === 'both' && hasName && hasNum) {
          // Combined per-entry printable: name above number, stacked. The
          // bounding box is what gets priced as a single cart line item.
          out.push({
            kind: 'pair',
            name,
            number: num,
            text: `${name} ${num}`,         // used by cart-line display
            nameHeightIn: nameH.inches,
            numHeightIn:  numH.inches,
            heightIn: nameH.inches + numH.inches,   // gap added in packShelf measurement
            entryIdx: i,
            copyIdx: k,
          });
        } else if (hasName) {
          out.push({ kind: 'name',   text: name, heightIn: nameH.inches, entryIdx: i, copyIdx: k });
        } else if (hasNum) {
          out.push({ kind: 'number', text: num,  heightIn: numH.inches,  entryIdx: i, copyIdx: k });
        }
      }
    });
    return out;
  }

  // Measure each printable's TIGHT INK bounding box. Sets widthIn / heightIn
  // to the visible glyph extent (not the em-square) so the canvas can be
  // cropped to "art only — nothing cut off, nothing added". Customer's chosen
  // letter height (e.g., "8 in number") is treated as the visible ink height.
  function measurePrintables(printables, cfg, fontDef) {
    if (printables.length === 0) return;
    const family = fontDef.family;
    const weight = fontDef.weight || 700;
    const mctx = document.createElement('canvas').getContext('2d');
    const maxWidth = cfg.maxItemWidthIn || Infinity;
    const measureInk = (text, heightIn) => {
      const PROBE_PX = heightIn * 96;
      mctx.font = `${weight} ${PROBE_PX}px "${family}", sans-serif`;
      const m = mctx.measureText(text);
      const ascentPx  = m.actualBoundingBoxAscent  || PROBE_PX * 0.78;
      const descentPx = m.actualBoundingBoxDescent || PROBE_PX * 0.22;
      const leftPx    = m.actualBoundingBoxLeft    || 0;
      const rightPx   = m.actualBoundingBoxRight   || m.width;
      // Scale so the actual ink height (ascent + descent) equals heightIn.
      const scale = heightIn / (ascentPx + descentPx);
      return {
        widthIn:   (leftPx + rightPx) * scale,
        ascentIn:  ascentPx  * scale,
        descentIn: descentPx * scale,
        leftIn:    leftPx    * scale,
        _probePx:  PROBE_PX,
        _scale:    scale,
      };
    };
    printables.forEach(p => {
      if (p.kind === 'pair') {
        const nameInk = measureInk(p.name,   p.nameHeightIn);
        const numInk  = measureInk(p.number, p.numHeightIn);
        const contentW = Math.max(nameInk.widthIn, numInk.widthIn);
        const contentH = (nameInk.ascentIn + nameInk.descentIn)
                       + cfg.vertGapIn
                       + (numInk.ascentIn  + numInk.descentIn);
        p.naturalWidthIn = contentW;
        p.widthIn  = Math.min(contentW, maxWidth);
        p.heightIn = contentH;
        p.scaleX   = contentW > maxWidth ? maxWidth / contentW : 1;
        p._nameInk = nameInk;
        p._numInk  = numInk;
      } else {
        const ink = measureInk(p.text, p.heightIn);
        p.naturalWidthIn = ink.widthIn;
        p.widthIn  = Math.min(ink.widthIn, maxWidth);
        p.heightIn = ink.ascentIn + ink.descentIn;
        p.scaleX   = ink.widthIn > maxWidth ? maxWidth / ink.widthIn : 1;
        p._ink     = ink;
      }
    });
  }

  function packShelf(printables, cfg, fontDef) {
    if (printables.length === 0) {
      return { placements: [], totalHeightIn: 0, sheetWidthIn: cfg.sheetWidthIn };
    }
    measurePrintables(printables, cfg, fontDef);

    const sorted = [...printables].sort((a, b) => {
      if (b.heightIn !== a.heightIn) return b.heightIn - a.heightIn;
      return b.widthIn - a.widthIn;
    });

    // First-Fit-Decreasing-Height (FFDH) shelf packing. Items drop into the
    // first existing shelf that's tall enough and still has horizontal room,
    // so 2" names tuck alongside 8" numbers instead of each height starting
    // its own short row. Items are bottom-aligned within their shelf so a
    // mixed-height row shares a baseline.
    const usableWidthIn = cfg.sheetWidthIn - 2 * cfg.sideMarginIn;
    const rightEdge = cfg.sheetWidthIn - cfg.sideMarginIn;
    const shelves = [];
    const placements = [];
    let nextY = cfg.sideMarginIn;
    for (const item of sorted) {
      const widthIn = Math.min(item.widthIn, usableWidthIn);
      let shelf = null;
      for (const s of shelves) {
        if (s.heightIn >= item.heightIn && s.cursorX + widthIn <= rightEdge) {
          shelf = s;
          break;
        }
      }
      if (!shelf) {
        shelf = { heightIn: item.heightIn, cursorX: cfg.sideMarginIn, y: nextY };
        shelves.push(shelf);
        nextY += item.heightIn + cfg.vertGapIn;
      }
      const itemY = shelf.y + (shelf.heightIn - item.heightIn);
      placements.push({ item, x: shelf.cursorX, y: itemY, w: widthIn, h: item.heightIn });
      shelf.cursorX += widthIn + cfg.horizGapIn;
    }

    const totalHeightIn = nextY - cfg.vertGapIn + cfg.sideMarginIn;
    // Crop the sheet width to the actual content extent so a single small
    // item doesn't ship padded out to the full 22" sheet. Wrapping during
    // packing still uses the full cfg.sheetWidthIn, so multi-row layouts
    // keep their wrap point — this is purely an output crop.
    const maxRightIn = Math.max(...placements.map(p => p.x + p.w));
    const croppedWidthIn = Math.min(cfg.sheetWidthIn, maxRightIn + cfg.sideMarginIn);
    return { placements, totalHeightIn, sheetWidthIn: croppedWidthIn };
  }

  async function renderExportPNG(packed, cfg, fontDef, colorHex) {
    const widthIn  = packed.sheetWidthIn;
    const heightIn = Math.max(packed.totalHeightIn, 1);
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(widthIn  * EXPORT_DPI);
    canvas.height = Math.round(heightIn * EXPORT_DPI);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(EXPORT_DPI, 0, 0, EXPORT_DPI, 0, 0);
    ctx.fillStyle = colorHex || '#ffffff';
    ctx.textBaseline = 'alphabetic';
    const family = fontDef.family;
    const weight = fontDef.weight || 700;
    // Draw a measured text piece. (x, y) is the TOP-LEFT of the ink bounding
    // box in context (inch) units. The glyph is shifted so its visible
    // left edge lands at x and its visible top lands at y.
    const drawInk = (text, x, y, ink, scaleX) => {
      ctx.font = `${weight} ${ink._probePx}px "${family}", sans-serif`;
      ctx.save();
      ctx.translate(x, y + ink.ascentIn);
      ctx.scale(ink._scale * scaleX, ink._scale);
      // Negative shift in probe-px so the bbox-left aligns to the translated origin.
      ctx.fillText(text, -ink.leftIn / ink._scale, 0);
      ctx.restore();
    };
    packed.placements.forEach(pl => {
      const scaleX = pl.item.scaleX || 1;
      if (pl.item.kind === 'pair') {
        const nameInk = pl.item._nameInk;
        const numInk  = pl.item._numInk;
        // Center each piece horizontally within the placement bounding box.
        const nameW = nameInk.widthIn * scaleX;
        const nameX = pl.x + (pl.w - nameW) / 2;
        drawInk(pl.item.name, nameX, pl.y, nameInk, scaleX);
        const numW = numInk.widthIn * scaleX;
        const numX = pl.x + (pl.w - numW) / 2;
        const numY = pl.y + nameInk.ascentIn + nameInk.descentIn + cfg.vertGapIn;
        drawInk(pl.item.number, numX, numY, numInk, scaleX);
        return;
      }
      const ink = pl.item._ink;
      const w   = ink.widthIn * scaleX;
      const tx  = pl.x + (pl.w - w) / 2;
      drawInk(pl.item.text, tx, pl.y, ink, scaleX);
    });
    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
  }

  // ---------- variant matching ----------

  function matchVariantBySqIn(variants, sqIn) {
    if (!Array.isArray(variants) || isNaN(sqIn)) return null;
    sqIn = Number(sqIn);
    for (const v of variants) {
      if (!v.option1) continue;
      if (v.available === false) continue;
      const m = v.option1.match(/(\d+)\s*[–-]\s*(\d+)/);
      if (!m) continue;
      const min = parseInt(m[1], 10);
      const max = parseInt(m[2], 10);
      if (sqIn >= min && sqIn <= max) return v;
    }
    return null;
  }

  // ---------- upload ----------

  // Render a single printable (name / number / pair) to its own tight PNG.
  // Adds a small safety pad around the ink so anti-aliasing at the canvas
  // edges doesn't clip the last letter or shave the descender. The ink
  // dimensions (printable.widthIn × printable.heightIn) remain authoritative
  // for pricing and variant matching — the pad only affects the PNG canvas.
  async function renderEntryPNG(printable, cfg, fontDef, colorHex) {
    const PAD_IN = 0.15;
    const fakePacked = {
      placements: [{ item: printable, x: PAD_IN, y: PAD_IN, w: printable.widthIn, h: printable.heightIn }],
      totalHeightIn: printable.heightIn + PAD_IN * 2,
      sheetWidthIn: printable.widthIn + PAD_IN * 2,
    };
    return renderExportPNG(fakePacked, cfg, fontDef, colorHex);
  }

  async function uploadBlob(blob, cfg) {
    const randomName = `names-and-numbers-${Date.now()}-${Math.floor(Math.random() * 1e6)}.png`;
    const presignUrl = `${cfg.apiUrl}/uploads/getPresignedUploadUrl?file_name=${encodeURIComponent(randomName)}&file_type=${encodeURIComponent('image/png')}`;
    const presignRes = await fetch(presignUrl);
    if (!presignRes.ok) throw new Error(`presign HTTP ${presignRes.status}`);
    const presign = await presignRes.json();
    if (!presign.url) throw new Error('presign response missing url');
    const put = await fetch(presign.url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/png' } });
    if (!put.ok) throw new Error(`S3 PUT HTTP ${put.status}`);
    const imgixUrl = `https://${cfg.imgixHost}/${randomName}`;
    return { imgixUrl, sourceUrl: presign.sourceUrl || imgixUrl };
  }

  // ---------- helpers ----------

  function readJSON(root, sel) {
    const node = root.querySelector(sel);
    if (!node) return [];
    try { return JSON.parse(node.textContent); } catch { return []; }
  }
  function numAttr(node, name, dflt) {
    const v = parseFloat(node.getAttribute(name));
    return Number.isFinite(v) ? v : dflt;
  }
  function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }
  function makeId() { return 'e' + Math.random().toString(36).slice(2, 9); }
  function isLightHex(hex) {
    if (!hex || hex[0] !== '#') return false;
    const x = hex.length === 4
      ? [parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), parseInt(hex[3] + hex[3], 16)]
      : [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    return (0.299 * x[0] + 0.587 * x[1] + 0.114 * x[2]) / 255 > 0.85;
  }
  function loadFont(font) {
    try {
      return document.fonts.load(`${font.weight || 700} 48px "${font.family}"`).then(() => font);
    } catch { return Promise.resolve(font); }
  }
  function scopeLabel(scope) {
    return scope === 'both' ? 'Names + Numbers' : scope === 'names' ? 'Names only' : 'Numbers only';
  }
  function serializeEntries(state) {
    return state.entries
      .filter(e => (e.name || '').trim() || (e.number || '').trim())
      .map(e => {
        const qty = Math.max(1, parseInt(e.qty, 10) || 1);
        const qtySuffix = qty > 1 ? ` ×${qty}` : '';
        if (state.scope === 'names')   return `${e.name || ''}${qtySuffix}`;
        if (state.scope === 'numbers') return `${e.number || ''}${qtySuffix}`;
        return `${e.name || ''}|${e.number || ''}${qtySuffix}`;
      })
      .join('\n');
  }
  function findClosestHeightId(heights, targetInches) {
    if (!heights || !heights.length) return null;
    let best = heights[0];
    let bestDiff = Math.abs(best.inches - targetInches);
    heights.forEach(h => {
      const diff = Math.abs(h.inches - targetInches);
      if (diff < bestDiff) { best = h; bestDiff = diff; }
    });
    return best.id;
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  }
  function parseCsv(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];
    // Detect header row (case-insensitive match on "name" or "number")
    const first = lines[0].toLowerCase();
    const hasHeader = /name|number|qty/.test(first);
    const dataLines = hasHeader ? lines.slice(1) : lines;
    // Determine column order from header if present
    let cols = ['name', 'number', 'qty'];
    if (hasHeader) {
      const headerCells = splitCsvLine(lines[0]).map(c => c.trim().toLowerCase());
      cols = headerCells.map(c => (c === 'name' || c === 'number' || c === 'qty') ? c : c);
    }
    return dataLines.map(line => {
      const cells = splitCsvLine(line);
      const row = { name: '', number: '', qty: 1 };
      cols.forEach((col, i) => {
        const val = (cells[i] || '').trim();
        if (col === 'name')   row.name = val;
        if (col === 'number') row.number = val;
        if (col === 'qty')    row.qty = Math.max(1, parseInt(val, 10) || 1);
      });
      return row;
    }).filter(r => r.name || r.number);
  }

  function splitCsvLine(line) {
    // Minimal RFC-4180 CSV splitter: supports quoted fields with embedded commas.
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  }

  function parseBulk(raw) {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => {
      // Accept formats: "Smith, 23" | "Smith,23" | "Smith 23" | "Smith\t23"
      const m = line.match(/^([^\d,;\t]+?)\s*[,;\t\s]+\s*(\d+)\s*(?:[x×]\s*(\d+))?$/i);
      if (m) {
        return { name: m[1].trim(), number: m[2], qty: m[3] ? parseInt(m[3], 10) : 1 };
      }
      // Number-only line
      const justNum = line.match(/^(\d+)\s*(?:[x×]\s*(\d+))?$/);
      if (justNum) {
        return { name: '', number: justNum[1], qty: justNum[2] ? parseInt(justNum[2], 10) : 1 };
      }
      // Name-only line
      return { name: line, number: '', qty: 1 };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
})();
