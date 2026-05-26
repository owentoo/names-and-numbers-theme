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
      // The submit button intercepts and drives /cart/add.js + (optionally)
      // /cart/change.js entirely via fetch — bypasses bySizeNew's product
      // form to avoid double-id collisions from its <template> clone.
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
          const packed = packShelf(printables, cfg, fontDef);
          const blob = await renderExportPNG(packed, cfg, fontDef, colorDef.hex);
          const { imgixUrl, sourceUrl } = await uploadBlob(blob, cfg);
          dom.props.uploadImgix.value = imgixUrl;
          dom.props.uploadS3.value    = sourceUrl;

          dom.submitLabel.textContent = state.editLineKey ? 'Updating cart…' : 'Adding to cart…';

          // Build FormData ourselves so we control exactly which inputs go.
          const formData = new FormData();
          formData.set('id', dom.variantInput.value);
          formData.set('quantity', '1');
          root.querySelectorAll('[data-nn-prop]').forEach(inp => {
            if (inp.name) formData.set(inp.name, inp.value);
          });
          formData.set('properties[Style]', 'Names & Numbers');

          const addRes = await fetch('/cart/add.js', {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' },
          });
          if (!addRes.ok) {
            const errText = await addRes.text().catch(() => '');
            throw new Error(`/cart/add.js HTTP ${addRes.status}: ${errText.slice(0, 200)}`);
          }
          if (state.editLineKey) {
            const changeRes = await fetch('/cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: state.editLineKey, quantity: 0 }),
            });
            if (!changeRes.ok) console.warn('N&N: failed to remove old line; cart may have a duplicate');
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

      // Pricing is based on the SUM of each individual name/number's area
      // (width × height per printable). The packed sheet's whitespace/gaps
      // are NOT counted — we only charge for the printed ink area.
      const printAreaSqIn = printables.reduce((sum, p) => sum + ((p.widthIn || 0) * (p.heightIn || 0)), 0);
      const totalSqIn = Math.ceil(printAreaSqIn);
      dom.dims.textContent = `${cfg.sheetWidthIn}" × ${packed.totalHeightIn.toFixed(2)}"`;
      dom.sqin.textContent = `${totalSqIn} sq in`;

      const variant = matchVariantBySqIn(variants, totalSqIn);
      if (variant) {
        dom.variantInput.value = variant.id;
        dom.price.textContent = variant.price_formatted;
        dom.ctaPrice.textContent = `· ${variant.price_formatted}`;
        dom.submitBtn.disabled = false;
        dom.submitLabel.textContent = state.editLineKey ? 'Update item' : 'Add to cart';
        dom.warning.hidden = true;
      } else {
        dom.variantInput.value = '';
        dom.price.textContent = '—';
        dom.ctaPrice.textContent = '';
        dom.submitBtn.disabled = true;
        dom.submitLabel.textContent = 'Sheet too large';
        dom.warning.hidden = false;
        dom.warning.textContent = `This sheet (${totalSqIn} sq in) is larger than our biggest variant. Reduce sizes or split into two orders.`;
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

      // SVG scale: jersey body is ~22 inches wide → 380 svg units wide → 17.3 units per inch.
      // Real garments compress vertically a bit; using 16 looks right on a 480×560 viewBox.
      const SVG_UNITS_PER_INCH = 16;
      const maxSvgWidth = (cfg.maxItemWidthIn || 12) * SVG_UNITS_PER_INCH;

      const applyTextSquish = (node) => {
        // Measure natural width with textLength removed, then re-apply if it overflows.
        node.removeAttribute('textLength');
        node.removeAttribute('lengthAdjust');
        try {
          const w = node.getComputedTextLength();
          if (w > maxSvgWidth) {
            node.setAttribute('textLength', String(maxSvgWidth));
            node.setAttribute('lengthAdjust', 'spacingAndGlyphs');
          }
        } catch { /* SVG not in DOM yet; skip */ }
      };

      // Name text
      if (showName && nameH) {
        const px = Math.round(nameH.inches * SVG_UNITS_PER_INCH);
        dom.jerseyName.textContent = name.toUpperCase();
        dom.jerseyName.style.fontFamily = `"${fontDef.family}", sans-serif`;
        dom.jerseyName.setAttribute('font-weight', String(fontDef.weight || 700));
        dom.jerseyName.setAttribute('fill', colorDef.hex);
        dom.jerseyName.setAttribute('font-size', String(px));
        dom.jerseyName.style.display = '';
        applyTextSquish(dom.jerseyName);
      } else {
        dom.jerseyName.style.display = 'none';
      }

      // Number text
      if (showNumber && numH) {
        const px = Math.round(numH.inches * SVG_UNITS_PER_INCH);
        dom.jerseyNumber.textContent = number;
        dom.jerseyNumber.style.fontFamily = `"${fontDef.family}", sans-serif`;
        dom.jerseyNumber.setAttribute('font-weight', String(fontDef.weight || 700));
        dom.jerseyNumber.setAttribute('fill', colorDef.hex);
        dom.jerseyNumber.setAttribute('font-size', String(px));
        dom.jerseyNumber.style.display = '';
        applyTextSquish(dom.jerseyNumber);
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
      for (let k = 0; k < qty; k++) {
        if (state.scope !== 'numbers' && (e.name || '').trim() !== '') {
          out.push({ kind: 'name',   text: e.name.trim().toUpperCase(), heightIn: nameH.inches, entryIdx: i, copyIdx: k });
        }
        if (state.scope !== 'names' && (e.number || '').trim() !== '') {
          out.push({ kind: 'number', text: e.number.trim(),             heightIn: numH.inches,  entryIdx: i, copyIdx: k });
        }
      }
    });
    return out;
  }

  function packShelf(printables, cfg, fontDef) {
    if (printables.length === 0) {
      return { placements: [], totalHeightIn: 0, sheetWidthIn: cfg.sheetWidthIn };
    }
    const family = fontDef.family;
    const weight = fontDef.weight || 700;
    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');
    const maxWidth = cfg.maxItemWidthIn || Infinity;
    printables.forEach(p => {
      const probePx = p.heightIn * 96;
      mctx.font = `${weight} ${probePx}px "${family}", sans-serif`;
      const m = mctx.measureText(p.text);
      const naturalWidthIn = (m.width / 96) + (p.heightIn * 0.1);
      p.naturalWidthIn = naturalWidthIn;
      p.widthIn = Math.min(naturalWidthIn, maxWidth);
      p.scaleX = naturalWidthIn > maxWidth ? maxWidth / naturalWidthIn : 1;
    });

    const sorted = [...printables].sort((a, b) => {
      if (b.heightIn !== a.heightIn) return b.heightIn - a.heightIn;
      return b.widthIn - a.widthIn;
    });

    const usableWidthIn = cfg.sheetWidthIn - 2 * cfg.sideMarginIn;
    const placements = [];
    let cursorY = cfg.sideMarginIn;
    let i = 0;
    while (i < sorted.length) {
      const shelfHeightIn = sorted[i].heightIn;
      let cursorX = cfg.sideMarginIn;
      while (i < sorted.length && sorted[i].heightIn === shelfHeightIn) {
        const item = sorted[i];
        const widthIn = Math.min(item.widthIn, usableWidthIn);
        const overflow = cursorX !== cfg.sideMarginIn && (cursorX + widthIn > cfg.sheetWidthIn - cfg.sideMarginIn);
        if (overflow) {
          cursorY += shelfHeightIn + cfg.vertGapIn;
          cursorX = cfg.sideMarginIn;
        }
        placements.push({ item, x: cursorX, y: cursorY, w: widthIn, h: shelfHeightIn });
        cursorX += widthIn + cfg.horizGapIn;
        i++;
      }
      cursorY += shelfHeightIn + cfg.vertGapIn;
    }

    const totalHeightIn = cursorY - cfg.vertGapIn + cfg.sideMarginIn;
    return { placements, totalHeightIn, sheetWidthIn: cfg.sheetWidthIn };
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
    packed.placements.forEach(pl => {
      ctx.font = `${weight} ${pl.h}px "${family}", sans-serif`;
      const m = ctx.measureText(pl.item.text);
      const ascent  = m.actualBoundingBoxAscent  || pl.h * 0.78;
      const descent = m.actualBoundingBoxDescent || pl.h * 0.22;
      const measuredHeight = ascent + descent;
      const scale = pl.h / measuredHeight;
      const naturalDrawWidth = m.width * scale;
      // Compress horizontally if the item width was capped by the packer.
      const scaleX = pl.item.scaleX || 1;
      const drawWidth = naturalDrawWidth * scaleX;
      ctx.save();
      ctx.translate(pl.x + Math.max(0, (pl.w - drawWidth) / 2), pl.y + ascent * scale);
      ctx.scale(scale * scaleX, scale);
      ctx.fillText(pl.item.text, 0, 0);
      ctx.restore();
    });
    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
  }

  // ---------- variant matching ----------

  function matchVariantBySqIn(variants, sqIn) {
    if (!Array.isArray(variants) || isNaN(sqIn)) return null;
    sqIn = Number(sqIn);
    for (const v of variants) {
      if (!v.option1) continue;
      const m = v.option1.match(/(\d+)\s*[–-]\s*(\d+)/);
      if (!m) continue;
      const min = parseInt(m[1], 10);
      const max = parseInt(m[2], 10);
      if (sqIn >= min && sqIn <= max) return v;
    }
    return null;
  }

  // ---------- upload ----------

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
