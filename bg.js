/* Atles background motion: mouse/touch tilts and rotates the scene, click gives it a spin, idle drift keeps it alive. Transforms only. */
(function () {
  var bg = document.getElementById("bg"), world = document.getElementById("bgw");
  if (!bg || !world) return;
  var layers = [].slice.call(world.querySelectorAll(".layer")), ds = layers.map(function (l) { return +l.getAttribute("data-d"); }), prev = [];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fv = document.getElementById("frameView"), running = false;
  var tx = 0, ty = 0, x = 0, y = 0, sw = 0, sv = 0, idleAt = 0, t0 = performance.now(), lastW = "";
  function aim(e) { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; idleAt = performance.now(); }
  window.addEventListener("pointermove", aim, { passive: true });
  window.addEventListener("pointerdown", function (e) {
    if (e.target.closest && e.target.closest("a,button,input,label,.card,.fc,.nav,.pin,.sapp,.panel,.bar,.frame,.pop")) return;
    aim(e); sv += (Math.random() < .5 ? -1 : 1) * (.55 + Math.random() * .35);
  }, { passive: true });
  function frame(now) {
    if (document.hidden || document.documentElement.classList.contains("inapp")) { running = false; return; }
    if (now - idleAt > 2500) { var t = (now - t0) / 1000; tx = Math.sin(t * .4) * .9; ty = Math.cos(t * .27) * .5; }
    x += (tx - x) * .07; y += (ty - y) * .07;
    sv += -sw * .012; sv *= .93; sw += sv;
    var w = "translate(-50%,-50%) rotate(" + (x * 1.6 + sw * 4).toFixed(3) + "deg) scale(1.2)";
    if (w !== lastW) { world.style.transform = w; lastW = w; }
    for (var i = 0; i < layers.length; i++) {
      var v = "translate3d(" + (-x * ds[i] * 26).toFixed(1) + "px," + (-y * ds[i] * 16).toFixed(1) + "px,0)";
      if (v !== prev[i]) { layers[i].style.transform = v; prev[i] = v; }
    }
    requestAnimationFrame(frame);
  }
  function start() { if (reduce || running) return; running = true; requestAnimationFrame(frame); }
  function sync() {
    var open = fv && !fv.classList.contains("hidden");
    document.documentElement.classList.toggle("inapp", !!open);
    if (!open) start();
  }
  if (fv) new MutationObserver(sync).observe(fv, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
  sync(); start();
})();
