/* ToolBOX – publicité (Google AdSense, annonces automatiques).
   Désactivée par défaut : tant que ADSENSE_CLIENT est vide, rien n'est chargé et aucune requête n'est envoyée.
   Pour l'activer : mets ton identifiant éditeur ci-dessous (de la forme "ca-pub-1234567890123456"), ajoute le fichier
   ads.txt à la racine du site (ligne fournie par AdSense), puis active les annonces automatiques dans ton compte AdSense.
   Le script publicitaire n'est chargé qu'après l'accord du visiteur dans la bannière de cookies, jamais avant,
   et jamais sur les pages légales. */
(function () {
  const ADSENSE_CLIENT = "";

  if (!ADSENSE_CLIENT || !/^ca-pub-\d{10,20}$/.test(ADSENSE_CLIENT)) return;
  if (/\/legal\//.test(location.pathname) || !window.ToolConsent) return;

  window.ToolConsent.onGrant(() => {
    if (document.querySelector("script[data-tb-ads]")) return;
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.dataset.tbAds = "1";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT);
    document.head.append(s);
  });
})();
