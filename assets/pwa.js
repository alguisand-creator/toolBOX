/* ToolBOX – application installable (PWA) : enregistre le service worker et gère le bouton « Installer l'app ».
   Un bouton <button data-install hidden> est affiché quand l'installation est possible.
   Sur iPhone/iPad (pas d'installation par bouton), il affiche l'astuce #install-tip. */
(function () {
  const src = document.currentScript && document.currentScript.src;
  const base = src ? src.replace(/assets\/pwa\.js.*$/, "") : "/";

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(base + "sw.js", { scope: base }).catch(() => {});
    });
  }

  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const show = on => document.querySelectorAll("[data-install]").forEach(b => { b.hidden = !on; });
  let deferred = null;

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferred = e;
    if (!standalone()) show(true);
  });
  window.addEventListener("appinstalled", () => { deferred = null; show(false); });

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !standalone()) show(true);

  document.addEventListener("click", async e => {
    if (!e.target.closest("[data-install]")) return;
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch (_) {}
      deferred = null;
      show(false);
    } else {
      const tip = document.getElementById("install-tip");
      if (tip) tip.hidden = !tip.hidden;
    }
  });
})();
