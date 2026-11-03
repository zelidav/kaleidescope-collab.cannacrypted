/* Site-wide feedback button.
 * Drop-in: <script src="/feedback.js" defer></script>
 * On send it emails the feedback plus exactly where the person was on the site
 * (page, tab, section in view, element under the screen centre, scroll position,
 * selected text, device). Delivery is FormSubmit for now (short-term), so there is
 * no backend to deploy. To change the destination, edit FEEDBACK_TO below.
 */
(function () {
  if (window.__jbFeedback) return;
  window.__jbFeedback = true;

  var FEEDBACK_TO = "zelidav@gmail.com";
  var ENDPOINT = "https://formsubmit.co/ajax/" + FEEDBACK_TO;

  function txt(el, n) {
    if (!el) return "";
    var s = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return s.length > (n || 120) ? s.slice(0, n || 120) + "…" : s;
  }

  function describe(el) {
    if (!el || el === document.body) return "";
    var parts = [];
    for (var i = 0; el && el !== document.body && i < 4; i++, el = el.parentElement) {
      var p = el.tagName.toLowerCase();
      if (el.id) { p += "#" + el.id; parts.unshift(p); break; }
      if (el.classList && el.classList.length) p += "." + Array.prototype.slice.call(el.classList, 0, 2).join(".");
      parts.unshift(p);
    }
    return parts.join(" > ");
  }

  // The last heading at or above the middle of the screen = the section they're reading.
  function sectionInView() {
    var mid = window.innerHeight / 2, best = null;
    var hs = document.querySelectorAll("h1,h2,h3,h4");
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.closest("#jbfb-root") || !h.offsetParent) continue;
      if (h.getBoundingClientRect().top <= mid) best = h; else break;
    }
    return best ? txt(best, 100) : "";
  }

  function capture() {
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var center = document.elementFromPoint(cx, cy);
    var card = center && center.closest ? center.closest(".card,[data-id],section,article,tr") : null;
    var tab = document.querySelector(".tab.active");
    var docH = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    var sel = "";
    try { sel = String(window.getSelection() || "").trim().slice(0, 500); } catch (e) {}
    return {
      "Page URL": location.href,
      "Page title": document.title,
      "Active tab": tab ? txt(tab.firstChild && tab.firstChild.nodeType === 3 ? { textContent: tab.firstChild.textContent } : tab, 80) : "",
      "Section in view": sectionInView(),
      "Element at screen centre": describe(center),
      "Block at screen centre": card ? txt(card.querySelector("h1,h2,h3,h4,.name,strong") || card, 140) : "",
      "Selected text": sel,
      "Scroll": Math.round(window.scrollY) + "px (" + Math.round(100 * window.scrollY / docH) + "% down)",
      "Viewport": window.innerWidth + "x" + window.innerHeight + " @" + (window.devicePixelRatio || 1) + "x",
      "Device": navigator.userAgent,
      "Referrer": document.referrer || "",
      "Local time": new Date().toString()
    };
  }

  var css = "" +
    "#jbfb-root{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
    "#jbfb-root *{box-sizing:border-box;font-family:inherit}" +
    "#jbfb-btn{position:fixed;right:16px;bottom:16px;z-index:2147483000;border:0;border-radius:999px;padding:11px 16px;" +
      "background:#111;color:#fff;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)}" +
    "#jbfb-btn:hover{background:#2A3B8E}" +
    "#jbfb-panel{position:fixed;right:16px;bottom:68px;z-index:2147483001;width:min(360px,calc(100vw - 32px));" +
      "background:#fff;color:#111;border-radius:12px;padding:14px;box-shadow:0 10px 40px rgba(0,0,0,.4);display:none}" +
    "#jbfb-panel.open{display:block}" +
    "#jbfb-panel h4{margin:0 0 4px;font-size:15px;font-weight:800}" +
    "#jbfb-where{font-size:12px;color:#555;margin:0 0 8px;line-height:1.4;word-break:break-word}" +
    "#jbfb-panel textarea,#jbfb-panel input{width:100%;font-size:16px;padding:9px 10px;border:1px solid #ccc;border-radius:8px;" +
      "color:#111;background:#fff;margin:0 0 8px;display:block}" +
    "#jbfb-panel textarea{min-height:110px;resize:vertical}" +
    "#jbfb-row{display:flex;gap:8px;justify-content:flex-end;align-items:center}" +
    "#jbfb-row button{border:0;border-radius:8px;padding:9px 14px;font-size:14px;font-weight:700;cursor:pointer}" +
    "#jbfb-cancel{background:#eee;color:#111}#jbfb-send{background:#2A3B8E;color:#fff}" +
    "#jbfb-send:disabled{opacity:.6;cursor:default}" +
    "#jbfb-msg{font-size:13px;margin-right:auto;color:#555}#jbfb-msg.err{color:#B3122C}#jbfb-msg.ok{color:#1a7f37}" +
    "@media print{#jbfb-root{display:none}}";

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function init() {
    var style = el("style", {}, css);
    var root = el("div", { id: "jbfb-root" });
    var btn = el("button", { id: "jbfb-btn", type: "button", "aria-label": "Send feedback" }, "💬 Feedback");
    var panel = el("div", { id: "jbfb-panel", role: "dialog", "aria-label": "Send feedback" },
      "<h4>Send feedback</h4>" +
      "<div id='jbfb-where'></div>" +
      "<textarea id='jbfb-text' placeholder='What should change here?' maxlength='5000'></textarea>" +
      "<input id='jbfb-name' type='text' placeholder='Your name (optional)' maxlength='120'>" +
      "<div id='jbfb-row'><span id='jbfb-msg'></span>" +
      "<button id='jbfb-cancel' type='button'>Cancel</button>" +
      "<button id='jbfb-send' type='button'>Send</button></div>");
    root.appendChild(panel); root.appendChild(btn);
    document.head.appendChild(style); document.body.appendChild(root);

    var $ = function (id) { return document.getElementById(id); };
    var where = null;
    try { $("jbfb-name").value = localStorage.getItem("jbfb.name") || ""; } catch (e) {}

    function open() {
      where = capture(); // snapshot BEFORE the panel covers anything
      var loc = [where["Page title"], where["Active tab"], where["Section in view"]].filter(Boolean).join(" › ");
      $("jbfb-where").textContent = "📍 " + (loc || location.pathname) + " (we'll include where you are)";
      $("jbfb-msg").textContent = ""; $("jbfb-msg").className = "";
      panel.classList.add("open");
      $("jbfb-text").focus();
    }
    function close() { panel.classList.remove("open"); }

    btn.addEventListener("click", function () { panel.classList.contains("open") ? close() : open(); });
    // Keep the text selection if they highlighted something before clicking.
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    $("jbfb-cancel").addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    $("jbfb-send").addEventListener("click", function () {
      var msg = $("jbfb-text").value.trim(), name = $("jbfb-name").value.trim();
      var m = $("jbfb-msg");
      if (!msg) { m.textContent = "Type something first."; m.className = "err"; return; }
      try { localStorage.setItem("jbfb.name", name); } catch (e) {}
      var payload = {
        _subject: "Site feedback: " + (where["Section in view"] || where["Page title"] || location.pathname),
        _template: "table",
        _captcha: "false",
        Feedback: msg,
        From: name || "(anonymous)"
      };
      for (var k in where) if (where[k]) payload[k] = where[k];
      var send = $("jbfb-send");
      send.disabled = true; m.textContent = "Sending…"; m.className = "";
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || String(res.j.success) === "false") throw new Error(res.j.message || "send failed");
          m.textContent = "Thanks! Sent."; m.className = "ok";
          $("jbfb-text").value = "";
          setTimeout(close, 1400);
        })
        .catch(function () {
          m.textContent = "Couldn't send. Try again in a moment."; m.className = "err";
        })
        .then(function () { send.disabled = false; });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
