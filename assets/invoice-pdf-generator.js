(function() {
  var logoUrl = window.__ntInvoiceLogoUrl || '';

  /* Match the my-designs/recent-designs preview pipeline: rewrite S3 → imgix and
     ask imgix to rasterize EPS/AI/PDF/SVG/TIFF/PSD to PNG so <img> can load it. */
  var IMGIX_HOST = 'ninjauploads-production.imgix.net';
  var S3_HOST = 'ninja-services-production-ninjauploadss3bucket-zks2mguobhe4.s3.amazonaws.com';
  var REMOTE_PREVIEW_EXTS = ['ai', 'eps', 'pdf', 'svg', 'tif', 'tiff', 'psd'];
  function needsRemotePreview(url) {
    try {
      var ext = url.split('?')[0].split('.').pop().toLowerCase();
      return REMOTE_PREVIEW_EXTS.indexOf(ext) > -1;
    } catch(e) { return false; }
  }
  function transformImgUrl(url) {
    if (!url) return url;
    var c = url.replace(S3_HOST, IMGIX_HOST);
    if (needsRemotePreview(url)) {
      var sep = c.indexOf('?') > -1 ? '&' : '?';
      return c + sep + 'fm=png&w=240&auto=compress&q=80';
    }
    return c;
  }

  /* Preload logo to get natural dimensions */
  var logoImg = null;
  var logoNatW = 0;
  var logoNatH = 0;
  if (logoUrl && logoUrl.indexOf('no_image') === -1) {
    logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = logoUrl;
    logoImg.onload = function() { logoNatW = logoImg.naturalWidth; logoNatH = logoImg.naturalHeight; };
  }

  /* Preload line-item images: call before generating so images are cached.
     Uses the same image_url order-details renders; if CORS blocks it we try
     a direct fetch → dataURI path. We never swap in a different image. */
  function preloadImages(items, callback) {
    var urls = [];
    (items || []).forEach(function(li) {
      var u = li.image_url || li.fallback_url || '';
      if (u && u.indexOf('//') === 0) u = 'https:' + u;
      u = transformImgUrl(u);
      if (u && u.indexOf('http') === 0 && urls.indexOf(u) === -1) urls.push(u);
    });
    if (urls.length === 0) return callback({});
    var loaded = {};
    var count = 0;
    var done = false;
    function finish() { if (!done) { done = true; callback(loaded); } }
    function tick() { count++; if (count >= urls.length) finish(); }
    function tryFetchDataUri(url, cb) {
      try {
        fetch(url, { mode: 'cors' })
          .then(function(res) { return res.ok ? res.blob() : null; })
          .then(function(blob) {
            if (!blob) return cb(null);
            var reader = new FileReader();
            reader.onloadend = function() {
              var img = new Image();
              img.onload = function() { cb(img); };
              img.onerror = function() { cb(null); };
              img.src = reader.result;
            };
            reader.onerror = function() { cb(null); };
            reader.readAsDataURL(blob);
          })
          .catch(function() { cb(null); });
      } catch (e) { cb(null); }
    }
    urls.forEach(function(url) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() { loaded[url] = img; tick(); };
      img.onerror = function() {
        tryFetchDataUri(url, function(dataImg) {
          if (dataImg) loaded[url] = dataImg;
          tick();
        });
      };
      img.src = url;
    });
    /* Safety timeout */
    setTimeout(finish, 6000);
  }

  function generateInvoice(data, imgCache) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF('p', 'pt', 'letter');
    var pageW = doc.internal.pageSize.getWidth();
    var margin = 50;
    var y = 50;

    /* ---- Header: Order # + INVOICE ---- */
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(data.order_name, margin, y);
    y += 20;
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text('INVOICE', margin, y);
    doc.setTextColor(0, 0, 0);

    /* ---- Logo (right side, natural aspect ratio) ---- */
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      try {
        var maxLogoW = 120;
        var maxLogoH = 60;
        var natW = logoImg.naturalWidth;
        var natH = logoImg.naturalHeight;
        var scale = Math.min(maxLogoW / natW, maxLogoH / natH);
        var drawW = natW * scale;
        var drawH = natH * scale;
        doc.addImage(logoImg, 'PNG', pageW - margin - drawW, 30, drawW, drawH);
      } catch(e) {}
    }

    /* ---- Divider ---- */
    y += 20;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(2);
    doc.line(margin, y, pageW - margin, y);

    /* ---- Address Block ---- */
    y += 30;
    var colW = (pageW - margin * 2) / 3;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('BILL TO', margin, y);
    doc.text('SHIP TO', margin + colW, y);
    doc.text('ORDER DETAILS', pageW - margin, y, { align: 'right' });
    y += 16;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30);

    var ba = data.billing_address || {};
    var baLines = [ba.name, ba.address1, ba.address2, [ba.city, ba.province].filter(Boolean).join(', '), [ba.zip, ba.country].filter(Boolean).join(' ')].filter(Boolean);
    baLines.forEach(function(l) { doc.text(l, margin, y); y += 13; });

    y = y - (baLines.length * 13);
    var sa = data.shipping_address || {};
    var saLines = [sa.name, sa.address1, sa.address2, [sa.city, sa.province].filter(Boolean).join(', '), [sa.zip, sa.country].filter(Boolean).join(' ')].filter(Boolean);
    saLines.forEach(function(l) { doc.text(l, margin + colW, y); y += 13; });

    var detailY = y - (saLines.length * 13);
    var detailX = pageW - margin;
    doc.setFont('helvetica', 'normal');
    doc.text('Order #: ' + data.order_name, detailX, detailY, { align: 'right' });
    detailY += 13;

    if (data.shipping_method) {
      var smText = 'Ship Method: ' + data.shipping_method;
      var smLines = doc.splitTextToSize(smText, colW - 10);
      smLines.forEach(function(line) {
        doc.text(line, detailX, detailY, { align: 'right' });
        detailY += 13;
      });
    }

    if (data.transactions && data.transactions.length > 0) {
      var payments = data.transactions.filter(function(t) {
        return t.kind === 'sale' || t.kind === 'capture';
      });
      if (payments.length === 0) payments = data.transactions;
      var gatewayNames = {
        'shopify_payments': 'Card',
        'gift_card': 'Gift Card',
        'store_credit': 'Store Credit',
        'manual': 'Manual',
        'paypal': 'PayPal',
        'cash': 'Cash',
        'money_order': 'Money Order'
      };
      payments.forEach(function(t) {
        if (!t.gateway) return;
        var label;
        if (t.card_last_four) {
          label = 'Card ending in ' + t.card_last_four;
        } else {
          label = gatewayNames[t.gateway] || t.gateway.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        }
        if (t.amount) label += ' - ' + t.amount;
        doc.text(label, detailX, detailY, { align: 'right' });
        detailY += 13;
      });
    }

    y = Math.max(y, detailY) + 20;

    /* ---- Invoice Date ---- */
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('INVOICE DATE', margin, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    doc.text('  ' + data.date, margin + 72, y);
    y += 25;

    /* ---- Line Items Table (with image thumbnails + dimensions + properties) ---- */
    var imgColW = 52;
    var tableBody = [];
    var rowImages = [];
    var rowData = [];
    function decodeHtml(s) {
      if (!s) return s;
      var el = document.createElement('textarea');
      el.innerHTML = s;
      return el.value;
    }
    function parseMoney(s) {
      if (!s || typeof s !== 'string') return 0;
      if (s.toUpperCase() === 'FREE') return 0;
      var n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
      return isNaN(n) ? 0 : n;
    }
    function formatMoney(n) {
      if (n < 0) return '-$' + Math.abs(n).toFixed(2);
      return '$' + n.toFixed(2);
    }
    var computedSubtotal = 0;
    (data.line_items || []).forEach(function(li, idx) {
      var title = decodeHtml(li.display_title || li.title);
      var _invVt = decodeHtml(li.variant_title || '');
      if (title && _invVt && _invVt !== 'Default Title') {
        var _invSuffix = ' - ' + _invVt;
        if (title.indexOf(_invSuffix) !== -1) {
          title = title.split(_invSuffix).join('').trim();
        }
      }
      if (title && title.indexOf('Style #') !== -1) {
        title = title.split('Style #')[0].replace(/\s*-\s*$/, '').trim();
      }
      var details = [];
      if (!li.is_style_variant) {
        var vt = decodeHtml(li.variant_title || '');
        if (vt && vt !== 'Default Title') details.push(vt);
      }
      if (li.width && li.height) {
        details.push(li.width + '" W x ' + li.height + '" H');
      } else if (li.width) {
        details.push('Width: ' + li.width + '"');
      } else if (li.height) {
        details.push('Height: ' + li.height + '"');
      }
      if (li.properties && li.properties.length) {
        for (var pp = 0; pp < li.properties.length; pp++) {
          var pk = decodeHtml(li.properties[pp].key || '');
          var pv = decodeHtml(li.properties[pp].value || '');
          if (!pk || !pv) continue;
          if (pk.toLowerCase().trim() === 'upload (vector files preferred)') continue;
          details.push(pk + ': ' + pv);
        }
      }
      var origPrice = li.price || '';
      var finPrice = li.final_price || li.price || '';
      var origLine = li.original_line_price || li.total || '';
      var finLine = li.total || '';
      var lineHasDiscount = (parseMoney(origPrice) > parseMoney(finPrice)) && parseMoney(origPrice) > 0;
      var pctOff = 0;
      var lineSavings = 0;
      if (lineHasDiscount) {
        pctOff = Math.round((parseMoney(origPrice) - parseMoney(finPrice)) / parseMoney(origPrice) * 100);
        lineSavings = parseMoney(origLine) - parseMoney(finLine);
      }
      computedSubtotal += parseMoney(finLine);
      rowData.push({ title: title || '', details: details, origPrice: origPrice, finPrice: finPrice, origLine: origLine, finLine: finLine, hasDiscount: lineHasDiscount, pctOff: pctOff, lineSavings: lineSavings });
      /* combined uses single \n so autoTable reserves minimal vertical space */
      var combined = title || '';
      if (details.length) combined += '\n' + details.join('\n');
      /* Reserve vertical space for the discount pill so it fits inside the cell border */
      if (lineHasDiscount) combined += '\n \n ';
      /* Empty unit price + total cells — drawn manually in didDrawCell so we can show strikethrough + new */
      tableBody.push(['', combined, String(li.quantity), '', '']);
      var imgUrl = li.image_url || li.fallback_url || '';
      if (imgUrl && imgUrl.indexOf('//') === 0) imgUrl = 'https:' + imgUrl;
      imgUrl = transformImgUrl(imgUrl);
      rowImages.push(imgCache[imgUrl] || null);
    });

    doc.autoTable({
      startY: y,
      head: [['', 'ITEM', 'QTY', 'UNIT PRICE', 'TOTAL']],
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: { top: 8, right: 8, bottom: 8, left: 8 }, lineColor: [220, 220, 220], lineWidth: 0.5, minCellHeight: 50, valign: 'top' },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, minCellHeight: 0 },
      columnStyles: {
        0: { cellWidth: imgColW, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50, halign: 'left' },
        3: { cellWidth: 80, halign: 'right' },
        4: { cellWidth: 70, halign: 'right' }
      },
      theme: 'grid',
      willDrawCell: function(hookData) {
        if (hookData.section === 'body' && (hookData.column.index === 1 || hookData.column.index === 3 || hookData.column.index === 4)) {
          /* Suppress default text rendering — we'll draw manually in didDrawCell */
          hookData.cell.text = [];
        }
      },
      didDrawCell: function(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          var img = rowImages[hookData.row.index];
          if (img) {
            try {
              var cellW = hookData.cell.width;
              var cellH = hookData.cell.height;
              var pad = 4;
              var maxW = cellW - pad * 2;
              var maxH = cellH - pad * 2;
              var iW = img.naturalWidth;
              var iH = img.naturalHeight;
              var sc = Math.min(maxW / iW, maxH / iH, 1);
              var dW = iW * sc;
              var dH = iH * sc;
              var cx = hookData.cell.x + (cellW - dW) / 2;
              var cy = hookData.cell.y + (cellH - dH) / 2;
              doc.addImage(img, 'PNG', cx, cy, dW, dH);
            } catch(e) {}
          }
        } else if (hookData.section === 'body' && hookData.column.index === 1) {
          var row = rowData[hookData.row.index];
          if (!row) return;
          var pad = 8;
          var innerX = hookData.cell.x + pad;
          var innerW = hookData.cell.width - pad * 2;
          var lineH = 11;
          var cursorY = hookData.cell.y + pad + 8;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30);
          var titleLines = doc.splitTextToSize(row.title || '', innerW);
          for (var ti = 0; ti < titleLines.length; ti++) {
            doc.text(titleLines[ti], innerX, cursorY);
            cursorY += lineH;
          }
          if (row.details && row.details.length) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            for (var di = 0; di < row.details.length; di++) {
              var detLines = doc.splitTextToSize(row.details[di], innerW);
              for (var dj = 0; dj < detLines.length; dj++) {
                doc.text(detLines[dj], innerX, cursorY);
                cursorY += lineH;
              }
            }
          }
          if (row.hasDiscount && row.pctOff > 0) {
            var pillText = row.pctOff + '% off for ' + (row.lineSavings < 0 ? '-$' + Math.abs(row.lineSavings).toFixed(2) : '$' + row.lineSavings.toFixed(2));
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            var pillTextW = doc.getTextWidth(pillText);
            var pillPadX = 6;
            var pillH = 13;
            var pillW = pillTextW + pillPadX * 2;
            var pillX = innerX;
            var pillY = cursorY - 1;
            doc.setFillColor(220, 252, 231);
            doc.roundedRect(pillX, pillY, pillW, pillH, 3, 3, 'F');
            doc.setTextColor(22, 163, 74);
            doc.text(pillText, pillX + pillPadX, pillY + pillH - 4);
          }
        } else if (hookData.section === 'body' && (hookData.column.index === 3 || hookData.column.index === 4)) {
          var prow = rowData[hookData.row.index];
          if (!prow) return;
          var ppad = 8;
          var rightX = hookData.cell.x + hookData.cell.width - ppad;
          /* Top-align baseline to match QTY column and title in column 1 */
          var topY = hookData.cell.y + ppad + 8;
          var origText = hookData.column.index === 3 ? prow.origPrice : prow.origLine;
          var finText = hookData.column.index === 3 ? prow.finPrice : prow.finLine;
          if (prow.hasDiscount && origText && finText && origText !== finText) {
            /* Original price strikethrough on top line */
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(150);
            var origW = doc.getTextWidth(origText);
            doc.text(origText, rightX, topY, { align: 'right' });
            doc.setLineWidth(0.6);
            doc.setDrawColor(150);
            doc.line(rightX - origW, topY - 3, rightX, topY - 3);
            /* New price on the line below in bold */
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30);
            doc.text(finText, rightX, topY + 12, { align: 'right' });
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(30);
            doc.text(finText || '', rightX, topY, { align: 'right' });
          }
        }
      }
    });

    y = doc.lastAutoTable.finalY + 20;

    /* ---- Totals ---- */
    var totalsX = pageW - margin - 150;
    var totalsValX = pageW - margin;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30);

    /* Subtotal = sum of new (post-discount) line totals */
    var subtotalToShow;
    if (data.subtotal === 'FREE' || data.subtotal === '$0.00') {
      subtotalToShow = data.subtotal;
    } else {
      subtotalToShow = formatMoney(computedSubtotal);
    }
    doc.text('Subtotal', totalsX, y);
    doc.text(subtotalToShow, totalsValX, y, { align: 'right' });
    y += 18;

    doc.text('Shipping', totalsX, y);
    doc.text(data.shipping, totalsValX, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(40);
    doc.setLineWidth(1);
    doc.line(totalsX, y, totalsValX, y);
    y += 16;

    if (data.tax && data.tax !== '$0.00' && data.tax !== 'FREE') {
      doc.text('Tax', totalsX, y);
      doc.text(data.tax, totalsValX, y, { align: 'right' });
      y += 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Total', totalsX, y);
    doc.text(data.total, totalsValX, y, { align: 'right' });
    y += 24;

    /* ---- Savings Tag (green discount badge) ---- */
    var savingsAmt = parseMoney(data.total_discounts);
    if (savingsAmt > 0 && data.total_discounts && data.total_discounts !== 'FREE') {
      var savText = 'You saved ' + data.total_discounts;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      var textW = doc.getTextWidth(savText);
      var iconW = 14;
      var padIn = 12;
      var gap = 8;
      var tagW = textW + iconW + padIn * 2 + gap;
      var tagH = 26;
      var tagX = pageW - margin - tagW;
      var tagY = y;
      /* Light green background */
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(tagX, tagY, tagW, tagH, 6, 6, 'F');
      /* Tag-shaped icon (price tag pointing left) */
      var iconCX = tagX + padIn + iconW / 2;
      var iconCY = tagY + tagH / 2;
      doc.setFillColor(22, 163, 74);
      doc.setDrawColor(22, 163, 74);
      var tw = 12, th = 12;
      var tagPath = [
        [4, -th / 2],
        [tw - 4, 0],
        [0, th],
        [-(tw - 4), 0],
        [-4, -th / 2]
      ];
      doc.lines(tagPath, iconCX - tw / 2, iconCY, [1, 1], 'F', true);
      /* Hole near pointed end */
      doc.setFillColor(255, 255, 255);
      doc.circle(iconCX - tw / 2 + 4.2, iconCY, 1.1, 'F');
      /* Savings text */
      doc.setTextColor(22, 163, 74);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(savText, tagX + tagW - padIn, iconCY + 4, { align: 'right' });
    }

    /* ---- Footer ---- */
    var footerY = doc.internal.pageSize.getHeight() - 60;
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageW - margin, footerY);
    footerY += 18;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Ninja Transfers  ·  2727 Commerce Way, Philadelphia, PA 19154', pageW / 2, footerY, { align: 'center' });
    footerY += 13;
    doc.text('(888) 356-3665  ·  service@ninjatransfers.com  ·  ninjatransfers.com', pageW / 2, footerY, { align: 'center' });

    /* ---- Status diagonal stamp (drawn last so it overlays everything) ----
       Cancelled takes precedence over reprint when both flags are set. */
    var stampText = '';
    var stampRgb = null;
    if (data.cancelled) {
      stampText = 'CANCELLED';
      stampRgb = { strong: [200, 30, 30], faded: [240, 200, 200] };
    } else if (data.is_reprint) {
      stampText = 'REPRINT ORDER';
      stampRgb = { strong: [20, 150, 60], faded: [190, 225, 200] };
    }
    if (stampText) {
      var stampCX = pageW / 2;
      var stampCY = doc.internal.pageSize.getHeight() / 2;
      var stampAngle = 30; /* counter-clockwise degrees */
      var gstateApplied = false;
      try {
        if (doc.GState) {
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.18 }));
          gstateApplied = true;
        }
      } catch(e) { gstateApplied = false; }
      var stampColor = gstateApplied ? stampRgb.strong : stampRgb.faded;
      doc.setTextColor(stampColor[0], stampColor[1], stampColor[2]);
      doc.setDrawColor(stampColor[0], stampColor[1], stampColor[2]);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text(stampText, stampCX, stampCY, { align: 'center', angle: stampAngle, baseline: 'middle' });
      if (gstateApplied) {
        try { doc.restoreGraphicsState(); } catch(e) {}
      }
    }

    var blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  window.__ntInvoice = function(el) {
    try {
      var handle = el.getAttribute('data-order-invoice');
      var scriptEl = document.querySelector('.ao-invoice-data[data-order="' + handle + '"]');
      if (!scriptEl) { alert('Invoice data not found.'); return; }
      var data = JSON.parse(scriptEl.textContent);
      /* Preload line-item images, then generate */
      preloadImages(data.line_items, function(imgCache) {
        generateInvoice(data, imgCache);
      });
    } catch(err) {
      console.error('Invoice generation error:', err);
      alert('Could not generate invoice. Please try again.');
    }
  };
})();
