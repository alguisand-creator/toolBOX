/* ToolBOX – moteur commun des outils texte : formulaire + résultats copiables.
   Une page appelle ToolIA.init({ fields, generate, example, button }).
   generate(valeurs) renvoie une chaîne, un tableau de chaînes, ou { items, labels, note, error }. */
(function () {
  const $ = s => document.querySelector(s);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const lines = s => String(s || "").split("\n").map(l => l.trim()).filter(Boolean);
  const csv = s => String(s || "").split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " et " + a[a.length - 1];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function copy(text, btn) {
    const label = btn.textContent;
    const done = () => { btn.textContent = "Copié ✓"; setTimeout(() => { btn.textContent = label; }, 1500); };
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
      document.body.append(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (_) { btn.textContent = "Copie impossible"; }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  function init(cfg) {
    const form = $("#form"), out = $("#out");
    const el = id => document.getElementById("f-" + id);

    form.innerHTML = cfg.fields.map(f => {
      const id = "f-" + f.id;
      const cls = "field" + (f.half ? " half" : "") + (f.type === "checkbox" ? " check" : "");
      let ctl;
      if (f.type === "textarea") ctl = `<textarea id="${id}" placeholder="${esc(f.placeholder || "")}"${f.rows ? ` style="min-height:${f.rows * 1.7}rem"` : ""}></textarea>`;
      else if (f.type === "select") ctl = `<select id="${id}">${f.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`;
      else if (f.type === "checkbox") ctl = `<input id="${id}" type="checkbox"${f.checked ? " checked" : ""}>`;
      else ctl = `<input id="${id}" type="${f.type || "text"}"${f.min !== undefined ? ` min="${f.min}"` : ""} autocomplete="off" placeholder="${esc(f.placeholder || "")}">`;
      const label = `<label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>`;
      return `<div class="${cls}" data-f="${f.id}">${f.type === "checkbox" ? ctl + label : label + ctl}</div>`;
    }).join("") +
      `<div class="actions"><button type="submit" class="btn">${esc(cfg.button || "Générer")}</button>` +
      `<button type="button" class="btn ghost" id="again" hidden>Autre version</button>` +
      (cfg.example ? `<button type="button" class="btn ghost" id="example">Voir un exemple</button>` : "") +
      `<button type="button" class="btn ghost" id="clear">Effacer</button></div>`;

    const defaults = () => cfg.fields.forEach(f => { if (f.value !== undefined) el(f.id).value = f.value; });
    defaults();

    const values = () => {
      const v = {};
      cfg.fields.forEach(f => { const e = el(f.id); v[f.id] = f.type === "checkbox" ? e.checked : e.value.trim(); });
      return v;
    };

    const refresh = () => {
      const v = values();
      cfg.fields.forEach(f => { form.querySelector(`[data-f="${f.id}"]`).hidden = !!f.when && !f.when(v); });
    };

    function fail(msg) {
      out.innerHTML = "";
      const box = document.createElement("div"); box.className = "result err";
      const big = document.createElement("div"); big.className = "big"; big.textContent = msg;
      box.append(big); out.append(box);
    }

    function render(res) {
      if (typeof res === "string") res = { items: [res] };
      else if (Array.isArray(res)) res = { items: res };
      out.innerHTML = "";
      const items = res.items || [];
      items.forEach((t, i) => {
        const box = document.createElement("div"); box.className = "outbox";
        if (items.length > 1 || res.labels) {
          const h = document.createElement("div"); h.className = "lbl";
          h.textContent = (res.labels && res.labels[i]) || `Proposition ${i + 1}`; box.append(h);
        }
        const pre = document.createElement("pre"); pre.textContent = t; box.append(pre);
        const meta = document.createElement("div"); meta.className = "meta";
        const n = t.trim().split(/\s+/).filter(Boolean).length;
        const c = document.createElement("span"); c.textContent = `${n} mot${n > 1 ? "s" : ""} · ${t.length} caractères`;
        const b = document.createElement("button"); b.type = "button"; b.className = "btn ghost"; b.textContent = "Copier";
        b.addEventListener("click", () => copy(t, b));
        meta.append(c, b); box.append(meta); out.append(box);
      });
      if (res.note) { const p = document.createElement("p"); p.className = "ia-note"; p.textContent = res.note; out.append(p); }
    }

    // generate() peut renvoyer une promesse (appel à l'IA) : on affiche alors un message d'attente
    let busy = false;
    async function run() {
      if (busy) return;
      const v = values();
      const missing = cfg.fields.filter(f => f.required && (!f.when || f.when(v)) && !v[f.id]);
      if (missing.length) return fail("Remplis : " + missing.map(f => f.label).join(", ") + ".");
      const submit = form.querySelector('[type="submit"]');
      busy = true; submit.disabled = true;
      let res;
      try {
        res = cfg.generate(v);
        if (res && typeof res.then === "function") {
          out.innerHTML = "";
          const p = document.createElement("p"); p.className = "ia-note"; p.textContent = "L'IA rédige la réponse, un instant…";
          out.append(p);
          res = await res;
        }
      } catch (e) {
        busy = false; submit.disabled = false;
        return fail("Une erreur est survenue. Vérifie les champs.");
      }
      busy = false; submit.disabled = false;
      if (res && res.error) return fail(res.error);
      render(res);
      $("#again").hidden = false;
    }

    form.addEventListener("submit", e => { e.preventDefault(); run(); });
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    $("#again").addEventListener("click", run);
    $("#clear").addEventListener("click", () => { form.reset(); defaults(); out.innerHTML = ""; $("#again").hidden = true; refresh(); });
    if (cfg.example) $("#example").addEventListener("click", () => {
      Object.entries(cfg.example).forEach(([k, val]) => {
        const e = el(k); if (!e) return;
        if (e.type === "checkbox") e.checked = !!val; else e.value = val;
      });
      refresh(); run();
    });
    refresh();
    const y = document.getElementById("y"); if (y) y.textContent = new Date().getFullYear();
  }

  window.ToolIA = { init, pick, shuffle, cap, lines, csv, list };
})();
