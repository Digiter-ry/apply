// /assets/js/i18n.js
(() => {
  // --- Defaults (work even without manifest.json) ---
  const FALLBACK_SUPPORTED = ["fi","en","sv","so"];
  const FALLBACK_DEFAULT   = "fi";

  const LS_KEY   = "kanavana_lang";
  const RES_BASE = "/assets/i18n";  // JSON-käännökset ja manifesti tänne

  // --- Runtime state ---
  const cache = new Map();          // lang -> dict
  let manifest = null;              // { default, languages:[{code,name,nativeName,dir}] }
  let allowed  = FALLBACK_SUPPORTED.slice();
  let current  = null;
  let dict     = {};
  let langMeta = new Map();         // Map<code, {code,name,nativeName,dir}>

  // --- Helpers ---
  const baseOf = (tag) => String(tag||"").toLowerCase().split("-")[0];
  const hasOwn = (o,k) => Object.prototype.hasOwnProperty.call(o,k);

  // RTL-heuristiikka jos manifestissa ei ole dir:tä
  const RTL_BASES = new Set(["ar","he","fa","ur","ps","dv","sd","ug","yi","ckb"]);
  const isRtlByHeuristic = (lang) => RTL_BASES.has(baseOf(lang));

  async function ensureManifest(){
    if (manifest) return;
    try {
      const res = await fetch(`${RES_BASE}/manifest.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      const m = await res.json();

      if (!m || !Array.isArray(m.languages)) throw new Error("invalid manifest");

      // Normalisoi kielet (pienet kirjaimet koodille ja dir:lle)
      m.languages = m.languages.map(l => ({
        ...l,
        code: String(l.code || "").toLowerCase(),
        dir:  String(l.dir  || "ltr").toLowerCase()
      }));

      manifest = m;
      allowed  = m.languages.map(l => l.code).filter(Boolean);
      if (!allowed.length) allowed = FALLBACK_SUPPORTED.slice();

      // default kieli
      if (typeof m.default === "string") {
        m.default = baseOf(m.default);
        if (!allowed.includes(m.default)) m.default = FALLBACK_DEFAULT;
      } else {
        m.default = FALLBACK_DEFAULT;
      }

      // Rakenna metahakukartta
      langMeta = new Map(manifest.languages.map(l => [l.code, l]));

    } catch {
      // Fallback ilman manifestia
      manifest = {
        default: FALLBACK_DEFAULT,
        languages: FALLBACK_SUPPORTED.map(code => ({ code, name: code, nativeName: code, dir: "ltr" }))
      };
      allowed  = FALLBACK_SUPPORTED.slice();
      langMeta = new Map(manifest.languages.map(l => [l.code, l]));
    }
  }

  function valid(tag){
    if (!tag) return false;
    const b = baseOf(tag);
    return allowed.includes(b);
  }

  function pickFromNavigator(){
    // Esim. ["fi-FI","en-US","sv"] → valitse ensimmäinen tuettu base-kieli
    const prefs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : (navigator.language ? [navigator.language] : []);
    for (const p of prefs) {
      const b = baseOf(p);
      if (valid(b)) return b;
    }
    return null;
  }

  function detect(){
    const url = new URL(location.href);
    const fromUrl = baseOf(url.searchParams.get("lang") || "");
    if (valid(fromUrl)) return fromUrl;

    const saved = baseOf(localStorage.getItem(LS_KEY) || "");
    if (valid(saved)) return saved;

    const nav = pickFromNavigator();
    if (nav) return nav;

    return manifest?.default || FALLBACK_DEFAULT;
  }

  async function loadDict(lang){
    const b = baseOf(lang);
    if (!valid(b)) return;
    if (cache.has(b)) { dict = cache.get(b); current = b; return; }
    const res = await fetch(`${RES_BASE}/${b}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`i18n: fetch ${b}.json failed ${res.status}`);
    const json = await res.json();
    dict = (json && typeof json === "object") ? json : {};
    cache.set(b, dict);
    current = b;
  }

  function setHtmlLangDir(lang){
    const b = baseOf(lang);
    document.documentElement.setAttribute("lang", b);

    // dir manifestista, muuten heuristiikka
    let dir = "ltr";
    const meta = langMeta.get(b);
    if (meta && meta.dir) {
      dir = (meta.dir === "rtl") ? "rtl" : "ltr";
    } else if (isRtlByHeuristic(b)) {
      dir = "rtl";
    }
    document.documentElement.setAttribute("dir", dir);

    // Jos sivulla on <select id="langSel">, päivitä sen arvo nykyiseksi
    const sel = document.getElementById("langSel");
    if (sel && sel.value !== b) {
      try { sel.value = b; } catch {}
    }
  }

  function t(key, vars={}){
    if (!key) return "";
    const segs = String(key).split(".");
    let v = dict;
    for (const s of segs) {
      if (v && typeof v === "object" && hasOwn(v, s)) v = v[s];
      else { v = undefined; break; }
    }
    if (typeof v !== "string") return key; // fallback: näytä avain
    return v.replace(/\{(\w+)\}/g, (_,k)=> (k in vars ? String(vars[k]) : `{${k}}`));
  }

  function applyTranslations(root=document){
    root.querySelectorAll("[data-i18n]").forEach(el=>{
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });
    // attribuutit: data-i18n-attr="placeholder:search.placeholder|aria-label:search.aria"
    root.querySelectorAll("[data-i18n-attr]").forEach(el=>{
      const map = (el.getAttribute("data-i18n-attr") || "")
        .split("|").map(s=>s.trim()).filter(Boolean);
      map.forEach(pair=>{
        const [attr, key] = pair.split(":").map(s=>s && s.trim());
        if (!attr || !key) return;
        const val = t(key);
        if (val && typeof val === "string") el.setAttribute(attr, val);
      });
    });
  }

  async function setLocale(lang){
    await ensureManifest();
    const b = valid(lang) ? baseOf(lang) : (manifest.default || FALLBACK_DEFAULT);
    await loadDict(b);
    localStorage.setItem(LS_KEY, b);
    setHtmlLangDir(b);
    applyTranslations();
  }

  function getLocale(){ return current || manifest?.default || FALLBACK_DEFAULT; }

  // Perus Intl-formatoijat
  function fmtDate(d){
    try { return new Intl.DateTimeFormat(getLocale(), { dateStyle:"medium", timeStyle:"short" }).format(d); }
    catch { try { return new Date(d).toLocaleString(); } catch { return String(d); } }
  }
  function fmtNumber(n, opt){
    try { return new Intl.NumberFormat(getLocale(), opt).format(n); }
    catch { return String(n); }
  }

  // --- Init: manifest -> locale -> dict ---
  (async () => {
    try {
      await ensureManifest();

      // Jos #langSel on tyhjä, voit täyttää sen manifestista (EI pakollinen)
      const sel = document.getElementById("langSel");
      if (sel && !sel.options.length && Array.isArray(manifest.languages)) {
        manifest.languages.forEach(l => {
          const opt = document.createElement("option");
          opt.value = l.code;
          opt.textContent = l.nativeName || l.name || l.code;
          if (l.dir === "rtl") opt.dir = "rtl";
          sel.appendChild(opt);
        });
      }

      await setLocale(detect());
    } catch (e) {
      // Jos i18n epäonnistuu, älä kaada sivua
      document.documentElement.setAttribute("lang", FALLBACK_DEFAULT);
      document.documentElement.setAttribute("dir", "ltr");
      // console.warn("i18n init failed:", e);
    }
  })();

  // --- Public API ---
  window.i18n = {
    t,
    setLocale,
    getLocale,
    applyTranslations,
    fmtDate,
    fmtNumber,
    // Seuraavat hyödyllisiä laajennuksiin:
    get SUPPORTED() { return allowed.slice(); }, // dynaaminen lista (manifest tai fallback)
    getManifest()   { return manifest ? JSON.parse(JSON.stringify(manifest)) : null; }
  };
})();
