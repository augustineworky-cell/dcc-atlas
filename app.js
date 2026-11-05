/* DCC Atlas: one sign-in (Staffly Employee ID + password), every company app. */
(function () {
  "use strict";
  var CFG = window.ATLAS_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "atlas.session";
  var db = {
    rpc: async function (fn, args) {
      try {
        var res = await fetch(CFG.stafflyUrl + "/rest/v1/rpc/" + fn, { method: "POST", headers: { "Content-Type": "application/json", apikey: CFG.stafflyKey, Authorization: "Bearer " + CFG.stafflyKey }, body: JSON.stringify(args) });
        if (!res.ok) return { error: { status: res.status }, data: null };
        return { data: await res.json(), error: null };
      } catch (e) { return { error: e, data: null }; }
    }
  };
  var S = null; // session
  var deferredInstall = null;

  var ICONS = {
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    stock: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    cart: '<path d="M3 4h2l2.2 11h10.6L20 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    wallet: '<path d="M3 7a2 2 0 012-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16.5" cy="13.5" r="1.2"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };
  function icon(name, color, size) {
    return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function initials(n) { var p = String(n || "?").trim().split(/\s+/); return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); }
  function toast(m) { var t = $("toast"); t.textContent = m; t.classList.remove("hidden"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.add("hidden"); }, 3200); }
  function appById(id) { return CFG.apps.filter(function (a) { return a.id === id; })[0]; }
  function originOf(u) { try { return new URL(u).origin; } catch (e) { return null; } }

  /* ---------- session ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  async function signIn(eid, pw) {
    var r = await db.rpc("app_login", { p_employee_id: eid, p_password: pw });
    if (r.error) throw new Error("Cannot reach the server. Check your internet and try again.");
    var d = r.data || {};
    if (d.status === "SUCCESS") return d;
    if (d.status === "LOCKED") throw new Error("Too many wrong tries. Try again in " + (d.retry_after_minutes || 15) + " minutes.");
    if (d.status === "APP_PAUSED") throw new Error(d.message || "Sign-in is paused right now. Please try later.");
    throw new Error("Employee ID or password is wrong.");
  }
  async function validate(s) {
    if (!s || !s.token) return null;
    if (s.expires_at && new Date(s.expires_at) < new Date()) return null;
    try {
      var r = await db.rpc("app_whoami", { p_token: s.token });
      if (r.error) return s; // offline: keep for now
      var d = r.data || {};
      if (d.status !== "SUCCESS") return null;
      s.employee_id = d.employee_id; s.employee_name = d.employee_name; s.role = d.role;
      return s;
    } catch (e) { return s; }
  }
  async function signOut() {
    var t = S && S.token;
    S = null; clear();
    try { if (t) await db.rpc("app_logout", { p_token: t }); } catch (e) {}
    $("frFrame").src = "about:blank";
    location.hash = "";
    route();
  }

  /* ---------- views ---------- */
  function show(which) {
    $("login").classList.toggle("hidden", which !== "login");
    $("app").classList.toggle("hidden", which !== "home");
    $("frameView").classList.toggle("hidden", which !== "frame");
  }

  function renderLoginApps() {
    $("loginApps").innerHTML = CFG.apps.slice(0, 3).map(function (a) {
      var live = a.status === "live";
      return '<div class="sapp ' + (live ? "" : "soon") + '"><i style="background:' + a.tint + '">' + icon(a.icon, a.color) + "</i><div><b>" + esc(a.name) + "</b><small>" + esc(live ? "One login opens this" : "Coming soon") + "</small></div>" + (live ? '<span class="tag">Live</span>' : '<span class="tag g">Soon</span>') + "</div>";
    }).join("");
  }

  function globeHtml() {
    var pins = CFG.apps.slice(0, 5).map(function (a, i) {
      var pos = [["left:6px;top:36px"], ["right:-4px;top:96px"], ["left:30px;top:228px"], ["right:30px;top:280px"], ["left:130px;top:350px"]][i][0];
      var live = a.status === "live";
      return '<a class="pin ' + (live ? "" : "soon") + '" style="' + pos + '" ' + (live ? 'href="#/app/' + a.id + '"' : "") + '><i style="background:' + a.tint + '">' + icon(a.icon, a.color, 18) + "</i><div>" + esc(a.name) + "<small>" + (live ? "Open" : "Coming soon") + "</small></div></a>";
    }).join("");
    return '<div class="globe" aria-hidden="true">' +
      '<svg viewBox="0 0 520 440" fill="none">' +
      '<circle cx="260" cy="220" r="150" fill="#fff" stroke="#e2e2db"/>' +
      '<g class="mer"><ellipse cx="260" cy="220" rx="150" ry="150"/><ellipse cx="260" cy="220" rx="105" ry="150" style="animation-delay:-4s"/><ellipse cx="260" cy="220" rx="60" ry="150" style="animation-delay:-8s"/></g>' +
      '<path d="M110 220h300M130 150h260M130 290h260" stroke="#e8e8e2"/>' +
      '<g class="orb1"><ellipse cx="260" cy="220" rx="215" ry="70" stroke="#d6d6cf" stroke-dasharray="3 6" transform="rotate(-18 260 220)"/><circle cx="475" cy="220" r="5" fill="#c8102e" transform="rotate(-18 260 220)"/></g>' +
      '<g class="orb2"><ellipse cx="260" cy="220" rx="185" ry="48" stroke="#d6d6cf" stroke-dasharray="3 6" transform="rotate(24 260 220)"/><circle cx="75" cy="220" r="4" fill="#0f766e" transform="rotate(24 260 220)"/></g>' +
      '<circle class="pg" cx="300" cy="170" r="6" fill="#c8102e" fill-opacity=".3"/><circle cx="300" cy="170" r="4" fill="#c8102e"/>' +
      '<circle class="pg" cx="215" cy="262" r="6" fill="#0f766e" fill-opacity=".3" style="animation-delay:-1.4s"/><circle cx="215" cy="262" r="4" fill="#0f766e"/>' +
      '<path d="M215 262 Q 250 170 300 170" stroke="#c8102e" stroke-opacity=".55" stroke-width="1.3" stroke-dasharray="4 6" style="animation:flow 4s linear infinite"/>' +
      "</svg>" + pins + "</div>";
  }

  function tile(a, i) {
    var live = a.status === "live";
    var tag = live ? '<span class="chip ok">Live</span>' : '<span class="chip">Coming soon</span>';
    var inner = '<div class="row"><span class="ic" style="background:' + a.tint + '">' + icon(a.icon, a.color) + "</span>" + tag + "</div>" +
      "<div><div class=\"nm\">" + esc(a.name) + '</div><div class="ds">' + esc(a.desc) + "</div></div>" +
      (live ? '<div class="open">Open <span>→</span></div>' : "");
    return live
      ? '<a class="card beam rise" style="--i:' + i + '" href="#/app/' + a.id + '">' + inner + "</a>"
      : '<div class="card soon rise" style="--i:' + i + '">' + inner + "</div>";
  }

  function renderHome(filter) {
    var q = (filter || "").toLowerCase();
    var list = CFG.apps.filter(function (a) { return !q || (a.name + " " + a.desc).toLowerCase().indexOf(q) > -1; });
    var h = new Date().getHours();
    var hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    var first = String(S.employee_name || "").split(" ")[0];
    var live = list.filter(function (a) { return a.status === "live"; });
    var soon = list.filter(function (a) { return a.status !== "live"; });
    var html = '<section class="hero">' + globeHtml() +
      '<div class="eyebrow rise">DCC SUPPLY CHAIN &amp; DISTRIBUTION</div>' +
      '<h1 class="rise" style="--i:1">' + esc(hello) + (first ? ",<br>" + esc(first) + "." : ".") + "</h1>" +
      '<p class="sub rise" style="--i:2">Every company app in one place. You are already signed in, so open any app and start working.</p></section>';
    if (!list.length) html += '<div class="empty">No app matches that.</div>';
    if (live.length) html += '<div class="sec"><b>Your apps</b><span class="mut" style="font-size:13px">' + live.length + " available</span></div><div class=\"grid\">" + live.map(tile).join("") + "</div>";
    if (soon.length) html += '<div class="sec"><b>On the way</b></div><div class="grid">' + soon.map(function (a, i) { return tile(a, i + live.length); }).join("") + "</div>";
    html += '<div class="panel beam" id="installCard" style="margin-top:46px;' + (deferredInstall ? "" : "display:none") + '"><div style="flex:1;min-width:220px"><b>Install Atlas on this device</b><div class="ds">Opens like a normal app, with its own icon. Works on PC and phone.</div></div><button class="btn" id="installBtn" type="button">Install</button></div>';
    html += '<div class="foot"><span>Signed in as ' + esc(S.employee_name || "") + " · " + esc(S.employee_id || "") + "</span></div>";
    $("view").innerHTML = html;
    var ib = $("installBtn");
    if (ib) ib.onclick = doInstall;
  }

  function openFrame(id) {
    var a = appById(id);
    if (!a || a.status !== "live") { location.hash = "#/home"; return; }
    if (!a.url) { toast(a.name + " has no web address yet. Add it in config.js."); location.hash = "#/home"; return; }
    show("frame");
    $("frIcon").style.background = a.tint; $("frIcon").innerHTML = icon(a.icon, a.color, 18);
    $("frName").textContent = a.name;
    $("frNew").href = a.url;
    $("frAv").textContent = initials(S.employee_name);
    $("swPop").innerHTML = CFG.apps.map(function (x) {
      var live = x.status === "live";
      return '<a href="' + (live ? "#/app/" + x.id : "#") + '" class="' + (live ? "" : "soon") + '"><span style="width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:' + x.tint + '">' + icon(x.icon, x.color, 15) + "</span>" + esc(x.name) + (live ? "" : ' <small class="mut">soon</small>') + "</a>";
    }).join("");
    var f = $("frFrame");
    if (f.dataset.app !== id) { f.dataset.app = id; f.src = a.url; }
    document.title = a.name + " · Atlas";
  }

  /* hand the signed-in person to the app inside the frame (the app must listen for this) */
  function sendSession(target) {
    var a = appById($("frFrame").dataset.app);
    if (!a || !S) return;
    var o = originOf(a.url);
    if (!o || !$("frFrame").contentWindow) return;
    $("frFrame").contentWindow.postMessage({
      type: "atlas:session",
      employee_id: S.employee_id, employee_name: S.employee_name, role: S.role,
      staffly: { url: CFG.stafflyUrl, token: S.token, expires_at: S.expires_at }
    }, o);
  }
  window.addEventListener("message", function (e) {
    var a = appById($("frFrame").dataset.app);
    if (!a || e.source !== $("frFrame").contentWindow || e.origin !== originOf(a.url)) return;
    if (e.data && e.data.type === "atlas:ready") sendSession();
    if (e.data && e.data.type === "atlas:home") location.hash = "#/home";
  });
  $("frFrame").addEventListener("load", function () { if ($("frFrame").src !== "about:blank") sendSession(); });

  /* ---------- routing ---------- */
  function route() {
    var h = location.hash || "";
    $("swPop").classList.add("hidden");
    if (!S) { show("login"); document.title = "Atlas · DCC Supply Chain"; return; }
    $("meName").textContent = S.employee_name || ""; $("meSub").textContent = S.employee_id || "";
    $("meAv").textContent = initials(S.employee_name);
    var m = h.match(/^#\/app\/([\w-]+)/);
    if (m) return openFrame(m[1]);
    show("home"); document.title = "Atlas · DCC Supply Chain";
    renderHome($("gs").value);
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ---------- install (PWA) ---------- */
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; var c = $("installCard"); if (c) c.style.display = ""; });
  window.addEventListener("appinstalled", function () { deferredInstall = null; var c = $("installCard"); if (c) c.style.display = "none"; toast("Atlas installed"); });
  async function doInstall() {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) {}
    deferredInstall = null; var c = $("installCard"); if (c) c.style.display = "none";
  }

  /* ---------- events ---------- */
  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var b = $("loginBtn"), er = $("loginErr");
    er.textContent = ""; b.disabled = true; b.textContent = "Signing in…";
    try {
      var d = await signIn($("eid").value.trim(), $("pw").value);
      S = { token: d.token, expires_at: d.expires_at, employee_id: d.employee_id, employee_name: d.employee_name, role: d.role };
      save(S); $("pw").value = "";
      location.hash = "#/home"; route();
    } catch (x) { er.textContent = x.message; }
    b.disabled = false; b.textContent = "Sign in";
  });
  $("signOut").addEventListener("click", signOut);
  $("gs").addEventListener("input", function () { renderHome($("gs").value); });
  $("gs").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var a = CFG.apps.filter(function (x) { return x.status === "live" && (x.name + " " + x.desc).toLowerCase().indexOf($("gs").value.toLowerCase()) > -1; })[0]; if (a) location.hash = "#/app/" + a.id; }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && S) { e.preventDefault(); if (location.hash.indexOf("#/app/") === 0) location.hash = "#/home"; setTimeout(function () { $("gs").focus(); }, 30); }
  });
  $("swBtn").addEventListener("click", function (e) { e.stopPropagation(); var p = $("swPop"); p.classList.toggle("hidden"); $("swBtn").setAttribute("aria-expanded", String(!p.classList.contains("hidden"))); });
  document.addEventListener("click", function () { $("swPop").classList.add("hidden"); });

  /* ---------- start ---------- */
  (async function boot() {
    renderLoginApps();
    S = await validate(load());
    if (S) save(S); else clear();
    route();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  })();
})();
