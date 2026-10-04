/* ToolBOX – petits plus présents sur les pages d'outils :
   1. une étoile « Favori » dans l'en-tête (la liste des favoris, gardée dans le stockage local de l'appareil
      sous "toolbox-favoris-v1", est épinglée en haut de l'accueil) ;
   2. un bouton « Partager mon résultat » (partage natif du téléphone, sinon copie dans le presse-papiers).
   Rien n'est envoyé à un serveur : le résultat n'est partagé que si la personne appuie sur le bouton. */
(function () {
  if (document.getElementById("drawers")) return;   // accueil : géré dans index.html

  const FKEY = "toolbox-favoris-v1";
  const path = location.pathname.replace(/^\//, "").replace(/\.html$/, "").replace(/\/index$/, "");
  const isTool = /^[a-z]+\/[\w-]+$/.test(path) && !/^legal\//.test(path);
  if (!isTool) return;

  const style = document.createElement("style");
  style.textContent =
    ".fav-top{font:600 .95rem var(--body,system-ui);color:var(--ink,#15212b);background:var(--surface,#fff);border:1px solid var(--line,#d3dae0);border-radius:99px;padding:.4rem .9rem;cursor:pointer;white-space:nowrap}" +
    ".fav-top:hover{border-color:var(--ink,#15212b)}" +
    ".fav-top[aria-pressed=\"true\"]{background:var(--accent,#ffc21a);color:var(--accent-ink,#15212b);border-color:var(--ink,#15212b)}";
  document.head.append(style);

  const read = () => { try { const s = JSON.parse(localStorage.getItem(FKEY) || "[]"); return Array.isArray(s) ? s.filter(k => typeof k === "string") : []; } catch (_) { return []; } };
  const write = list => { try { localStorage.setItem(FKEY, JSON.stringify(list.slice(0, 60))); } catch (_) {} };

  // 1. Étoile « Favori »
  const header = document.querySelector("header.top");
  if (header) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fav-top";
    const paint = () => {
      const on = read().includes(path);
      b.setAttribute("aria-pressed", on);
      b.textContent = on ? "★ Favori" : "☆ Favori";
      b.title = on ? "Retirer des favoris" : "Épingler en haut de l'accueil";
    };
    b.addEventListener("click", () => {
      const list = read();
      write(list.includes(path) ? list.filter(k => k !== path) : [path].concat(list));
      paint();
    });
    paint();
    header.append(b);
  }

  // 2. Partager mon résultat
  const tool = document.querySelector("section.tool");
  if (!tool || /^nutrition\/rappels$/.test(path)) return;
  const resultEl = () => tool.querySelector(".result");
  if (!resultEl() && !document.getElementById("out")) return;

  function summary() {
    // Convertisseur de recette : la liste d'ingrédients adaptée
    const tbl = document.getElementById("tbl");
    if (path === "cuisine/convertisseur-recette" && tbl) {
      const head = tbl.querySelectorAll("th")[2];
      const rows = [...tbl.querySelectorAll("tbody tr")].map(tr => { const c = tr.querySelectorAll("td"); return `${c[2].textContent} ${c[0].textContent}`.trim(); });
      return head && rows.length ? `${head.textContent} :\n${rows.join("\n")}` : "";
    }
    // Générateurs de texte : les textes produits
    const made = [...tool.querySelectorAll(".outbox pre")].map(p => p.textContent.trim()).filter(Boolean);
    if (made.length) return made.join("\n\n").slice(0, 700);
    // Portions : la liste copiée
    const out = document.getElementById("out");
    if (out && !resultEl()) return out.textContent.trim().split("\n").slice(0, 15).join("\n");
    const r = resultEl();
    if (!r || r.classList.contains("err")) return "";
    return r.innerText.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 2).join("\n");
  }

  const wrap = document.createElement("div");
  wrap.className = "actions";
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn ghost"; btn.textContent = "↗ Partager mon résultat";
  wrap.append(btn); tool.append(wrap);

  const flash = txt => { btn.textContent = txt; setTimeout(() => { btn.textContent = "↗ Partager mon résultat"; }, 1800); };
  btn.addEventListener("click", async () => {
    const sum = summary();
    if (!sum) { flash("Complète d'abord l'outil"); return; }
    const title = (document.querySelector("h1") || {}).textContent || "ToolBOX";
    const text = `${title}\n${sum}\nFait avec ToolBOX`;
    const url = location.origin + location.pathname;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }   // annulé : on ne fait rien ; autre erreur : copie
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); flash("Copié ✓ colle-le où tu veux"); }
    catch (_) { flash("Impossible de partager"); }
  });
})();
