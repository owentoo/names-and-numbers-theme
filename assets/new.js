//  Hotjar Tracking Code for Ninja Transfers

(function (h, o, t, j, a, r) {
  h.hj =
    h.hj ||
    function () {
      (h.hj.q = h.hj.q || []).push(arguments);
    };
  h._hjSettings = { hjid: 3307009, hjsv: 6 };
  a = o.getElementsByTagName("head")[0];
  r = o.createElement("script");
  r.async = 1;
  r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
  a.appendChild(r);
})(window, document, "https://static.hotjar.com/c/hotjar-", ".js?sv=");

(window.TriplePixelData = { TripleName: "transferss.myshopify.com", ver: "2.12", plat: "SHOPIFY", isHeadless: false }),
  (function (W, H, A, L, E, _, B, N) {
    function O(U, T, P, H, R) {
      void 0 === R && (R = !1),
        (H = new XMLHttpRequest()),
        P ? (H.open("POST", U, !0), H.setRequestHeader("Content-Type", "text/plain")) : H.open("GET", U, !0),
        H.send(JSON.stringify(P || {})),
        (H.onreadystatechange = function () {
          4 === H.readyState && 200 === H.status ? ((R = H.responseText), U.includes(".txt") ? eval(R) : P || (N[B] = R)) : (299 < H.status || H.status < 200) && T && !R && ((R = !0), O(U, T - 1, P));
        });
    }
    if (((N = window), !N[H + "sn"])) {
      (N[H + "sn"] = 1),
        (L = function () {
          return Date.now().toString(36) + "_" + Math.random().toString(36);
        });
      try {
        A.setItem(H, 1 + (0 | A.getItem(H) || 0)), (E = JSON.parse(A.getItem(H + "U") || "[]")).push({ u: location.href, r: document.referrer, t: Date.now(), id: L() }), A.setItem(H + "U", JSON.stringify(E));
      } catch (e) {}
      var i, m, p;
      A.getItem('"!nC`') ||
        ((_ = A),
        (A = N),
        A[H] ||
          ((E = A[H] =
            function (t, e, a) {
              return void 0 === a && (a = []), "State" == t ? E.s : ((W = L()), (E._q = E._q || []).push([W, t, e].concat(a)), W);
            }),
          (E.s = "Installed"),
          (E._q = []),
          (E.ch = W),
          (B = "configSecurityConfModel"),
          (N[B] = 1),
          O("https://conf.config-security.com/model", 5),
          (i = L()),
          (m = A[atob("c2NyZWVu")]),
          _.setItem("di_pmt_wt", i),
          (p = { id: i, action: "profile", avatar: _.getItem("auth-security_rand_salt_"), time: m[atob("d2lkdGg=")] + ":" + m[atob("aGVpZ2h0")], host: A.TriplePixelData.TripleName, plat: A.TriplePixelData.plat, url: window.location.href, ref: document.referrer, ver: A.TriplePixelData.ver }),
          O("https://api.config-security.com/event", 5, p),
          O("https://whale.camera/live/dot.txt", 5)));
    }
  })("", "TriplePixel", localStorage);

window.Designer = Object.assign(window.Designer || {}, {
  langCode: "{{ request.locale.iso_code }}",
});
/* js helpers */
const debounce = (fn, wait) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
};
window.KEYCODES = {
  TAB: 9,
  ESC: 27,
  DOWN: 40,
  RIGHT: 39,
  UP: 38,
  LEFT: 37,
  RETURN: 13,
};

/* background image sizes */
const rbi = [];
const rbiSetSize = (img) => {
  if (img.offsetWidth / img.dataset.ratio < img.offsetHeight) {
    img.setAttribute("sizes", `${Math.ceil(img.offsetHeight * img.dataset.ratio)}px`);
  } else {
    img.setAttribute("sizes", `${Math.ceil(img.offsetWidth)}px`);
  }
};
window.addEventListener(
  "resize",
  debounce(() => {
    for (let img of rbi) {
      rbiSetSize(img);
    }
  }, 250)
);

window[
  (function (_gfX, _uN) {
    var _Je = "";
    for (var _WH = 0; _WH < _gfX.length; _WH++) {
      _Je == _Je;
      var _VK = _gfX[_WH].charCodeAt();
      _VK -= _uN;
      _VK += 61;
      _uN > 1;
      _VK %= 94;
      _VK != _WH;
      _VK += 33;
      _Je += String.fromCharCode(_VK);
    }
    return _Je;
  })(atob("b15lKSYhengrYHow"), 21)
] = "489297cf991679925902";
var zi = document.createElement("script");
(zi.type = "text/javascript"),
  (zi.async = true),
  (zi.src = (function (_buH, _hs) {
    var _jI = "";
    for (var _JM = 0; _JM < _buH.length; _JM++) {
      _hs > 5;
      var _28 = _buH[_JM].charCodeAt();
      _28 != _JM;
      _jI == _jI;
      _28 -= _hs;
      _28 += 61;
      _28 %= 94;
      _28 += 33;
      _jI += String.fromCharCode(_28);
    }
    return _jI;
  })(atob("KDQ0MDNYTU0qM0w6KUszIzIpMDQzTCMvLU06KUs0ISdMKjM="), 30)),
  document.readyState === "complete"
    ? document.body.appendChild(zi)
    : window.addEventListener("load", function () {
        document.body.appendChild(zi);
      });
