/* ToolBOX – application installable (PWA) : enregistre le service worker et gère le bouton « Installer l'app ».
   Un bouton <button data-install hidden> est affiché : directement quand le navigateur sait installer (Chrome, Edge, Brave),
   sinon après un court délai avec une explication adaptée au navigateur, dans l'élément #install-tip. */
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
  let installed = false;

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferred = e;
    if (!standalone()) show(true);
  });
  window.addEventListener("appinstalled", () => { deferred = null; installed = true; show(false); });

  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const firefox = /firefox|fxios/i.test(ua);
  const safariMac = !ios && /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edg|opr/i.test(ua);

  function help() {
    if (ios) return "Sur iPhone ou iPad : ouvre le menu Partager de ton navigateur, puis choisis « Sur l'écran d'accueil ».";
    if (firefox && android) return "Dans Firefox : ouvre le menu ⋮, puis choisis « Installer ».";
    if (firefox) return "Firefox sur ordinateur ne sait pas installer les applications web. Pour installer ToolBOX, utilise Chrome, Edge ou Brave ; sinon, ajoute le site à tes favoris avec Ctrl + D.";
    if (safariMac) return "Dans Safari : ouvre le menu Fichier, puis choisis « Ajouter au Dock ».";
    return "Ouvre le menu de ton navigateur et cherche « Installer ToolBOX » (ou « Installer l'application »). Si l'app est déjà installée, ouvre-la depuis ton bureau ou ton menu Démarrer.";
  }

  // Les navigateurs qui ne proposent pas l'installation d'eux-mêmes : on affiche quand même le bouton, avec l'explication.
  setTimeout(() => { if (!deferred && !installed && !standalone()) show(true); }, ios ? 0 : 2000);

  document.addEventListener("click", async e => {
    if (!e.target.closest("[data-install]")) return;
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch (_) {}
      deferred = null;
      show(false);
    } else {
      const tip = document.getElementById("install-tip");
      if (tip) { tip.textContent = help(); tip.hidden = !tip.hidden; }
    }
  });
})();
