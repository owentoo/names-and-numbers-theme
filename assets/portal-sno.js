/* ===== Start a New Order – Upload & AI Handlers ===== */
(function() {
  var AI_HOST = 'https://www.rushordertees.com/design';
  var BATCH_SIZE = 3;
  var MAX_IMAGES = 21;
  var IMG_SIZE = 10;
  var BRANDING = 'ninjatransfers.com';

  /* --- Wait for bySize.js functions to load (defer) --- */
  function waitForBySize(cb, n) {
    n = n || 0;
    if (typeof window.activateMultiupload === 'function' && typeof window.multiFilesManage === 'function') return cb();
    if (n > 150) { console.warn('Portal: bySize.js functions not found after 15s'); return; }
    setTimeout(function() { waitForBySize(cb, n + 1); }, 100);
  }

  /* --- Open multi-upload modal directly on the portal page --- */
  function openMultiUpload(files) {
    waitForBySize(function() {
      activateMultiupload();
      var filesArr = Array.isArray(files) ? files : Array.from(files);
      for (var i = 0; i < filesArr.length; i++) {
        multiFilesManage(filesArr[i], i + 1);
      }
    });
  }

  /* --- Upload Box --- */
  var uploadCard = document.getElementById('sno-upload-card');
  var uploadBtn = document.getElementById('sno-upload-btn');
  var fileInput = document.getElementById('sno-file-input');

  if (uploadCard && fileInput) {
    uploadBtn.addEventListener('click', function(e) { e.stopPropagation(); fileInput.click(); });
    uploadCard.addEventListener('click', function(e) {
      if (e.target.closest('#sno-upload-btn')) return;
      fileInput.click();
    });
    fileInput.addEventListener('change', function() { if (this.files.length) handleFiles(this.files); });

    uploadCard.addEventListener('dragover', function(e) { e.preventDefault(); uploadCard.classList.add('sno-dragover'); });
    uploadCard.addEventListener('dragleave', function() { uploadCard.classList.remove('sno-dragover'); });
    uploadCard.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadCard.classList.remove('sno-dragover');
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
  }

  function handleFiles(files) {
    openMultiUpload(files);
    /* reset file input so the same file(s) can be re-selected */
    if (fileInput) fileInput.value = '';
  }

  /* --- AI Dialog --- */
  var aiCard = document.getElementById('sno-ai-card');
  var aiDialog = document.getElementById('generative-ai-dialog');
  if (!aiCard || !aiDialog) return;

  aiCard.addEventListener('click', function() { aiDialog.showModal(); });

  aiDialog.querySelector('header button').addEventListener('click', function() { aiDialog.close(); });

  var form = aiDialog.querySelector('form');
  var imagesEl = document.getElementById('generative-ai-images');
  var loaderEl = document.getElementById('generative-ai-dialog-loader');
  var tipsEl = document.getElementById('generative-ai-tips');
  var remainingEl = document.getElementById('generative-ai-remaining-searches');
  var generatingEl = document.getElementById('generative-ai-generating');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var prompt = form.querySelector('input[name="prompt"]').value;
    if (!prompt) return;

    loaderEl.classList.add('show');
    imagesEl.innerHTML = '';
    remainingEl.textContent = '';
    if (tipsEl) tipsEl.innerHTML = '';
    form.setAttribute('disabled', 'disabled');

    var remaining = Number.MAX_SAFE_INTEGER;
    var existing = [];

    try {
      var results = await Promise.allSettled([
        fetch(AI_HOST + '/generative-stats.php?type=clipart').then(function(r) { return r.json(); }),
        fetch(AI_HOST + '/studio/getGenerativeAiUploads.php?prompt=' + encodeURIComponent(prompt), { credentials: 'include' }).then(function(r) { return r.json(); })
      ]);
      var stats = results[0].status === 'fulfilled' ? results[0].value : {};
      existing = results[1].status === 'fulfilled' ? results[1].value : [];
      remaining = stats.remainingRequest ? Math.ceil(stats.remainingRequest / BATCH_SIZE) : remaining;
    } catch(ex) { console.error('AI stats error:', ex); }

    if (remaining > 0 && remaining <= 5) remainingEl.textContent = 'You have ' + remaining + ' more AI searches remaining.';
    else if (remaining <= 0) remainingEl.textContent = 'You have no more AI searches remaining. Please try again later.';

    existing.forEach(function(img) { imagesEl.appendChild(makeFigure(img)); });

    if (remaining > 0 && existing.length < MAX_IMAGES) {
      try {
        var count = Math.min(MAX_IMAGES - existing.length, BATCH_SIZE);
        generatingEl.textContent = '(Generating ' + count + ' New Images)';
        var newImgs = await fetch(AI_HOST + '/studio/postBatchGenerativeAiUpload.php', {
          method: 'POST',
          body: JSON.stringify({ prompt: prompt, batchSize: BATCH_SIZE, brandingName: BRANDING })
        }).then(function(r) { return r.json(); });
        generatingEl.textContent = '';
        newImgs.forEach(function(img) { imagesEl.appendChild(makeFigure(img)); });
      } catch(ex) { console.error('AI generate error:', ex); }
    }

    loaderEl.classList.remove('show');
    form.removeAttribute('disabled');
  });

  imagesEl.addEventListener('click', async function(e) {
    var fig = e.target.closest('figure');
    if (!fig || !fig.dataset.url) return;

    loaderEl.classList.add('show');
    form.setAttribute('disabled', 'disabled');

    try {
      var resp = await fetch(fig.dataset.url);
      var type = resp.headers.get('Content-Type');
      var buf = await resp.arrayBuffer();
      var blob = new Blob([buf], { type: type });
      var file = new File([blob], fig.dataset.fileName, { type: type });
      file.isAIImage = true;

      /* Close AI dialog and open multi-upload modal directly */
      aiDialog.close();
      openMultiUpload([file]);
    } catch(ex) {
      console.error('AI image select error:', ex);
    }

    loaderEl.classList.remove('show');
    form.removeAttribute('disabled');
  });

  function makeFigure(image) {
    var fig = document.createElement('figure');
    var img = document.createElement('img');
    var cap = document.createElement('figcaption');
    img.src = image.thumbnailUrl;
    cap.textContent = 'Use this image';
    fig.dataset.fileName = image.fileName;
    fig.dataset.url = image.url.replace('/unsafe/', '/unsafe/' + (IMG_SIZE * 300) + 'x0/');
    fig.appendChild(img);
    fig.appendChild(cap);
    return fig;
  }
})();
