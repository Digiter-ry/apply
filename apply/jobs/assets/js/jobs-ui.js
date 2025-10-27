/* jobs-ui.js — UI-logiikkaa ilman ulkoisia riippuvuuksia
   - Ei verkko-/API-kutsuja: vain käyttöliittymä
   - Tallennus localStorageen (opt-in) parempaa käyttökokemusta varten
   - WCAG: live-alueet, merkkilaskurit, fokusjärjestys
*/

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    lang: 'fi',
    targetLang: 'fi',
    step: 1,
    form: {
      jobTitle: '',
      jobUrl: '',
      adUrl: '',
      role: '',
      about: '',
      why: '',
      proof: '',
      draftNative: '',
      draftTarget: ''
    }
  };

  /* ---------- Helpers ---------- */

  const persist = () => {
    try { localStorage.setItem('jobs-ui', JSON.stringify(state)); }
    catch { /* private mode / storage blocked */ }
  };

  const restore = () => {
    try {
      const raw = localStorage.getItem('jobs-ui');
      if (!raw) return;
      const saved = JSON.parse(raw);
      Object.assign(state, saved);

      // Refill simple fields
      Object.entries(state.form).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (el) el.value = v;
      });

      // Lang selects
      const langSel = $('#lang');
      const tgtSel = $('#targetLang');
      if (langSel && state.lang) langSel.value = state.lang;
      if (tgtSel && state.targetLang) tgtSel.value = state.targetLang;

      setStatus('Palautettiin viimeisin istunto.');
      updateCounts();
    } catch {
      /* ignore */
    }
    renderGuide(state.step || 1);
  };

  const setStatus = (msg) => {
    const s = $('#status');
    if (s) s.textContent = msg;
  };

  const characterCountFor = (id) => {
    const el = document.getElementById(id);
    return el ? (el.value || '').length : 0;
  };

  const updateCounts = () => {
    $$('[data-for]').forEach(span => {
      const forId = span.getAttribute('data-for');
      span.textContent = String(characterCountFor(forId));
    });
  };

  const year = new Date().getFullYear();
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = year;

  /* ---------- Bind fields ---------- */

  // Bind text inputs/textareas to state + character counters
  ['jobTitle', 'jobUrl', 'adUrl', 'role', 'about', 'why', 'proof',
   'draftNative', 'draftTarget'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state.form[id] = el.value;
      updateCounts();
      persist();
    });
  });

  // Language controls
  const langSel = $('#lang');
  if (langSel) {
    langSel.addEventListener('change', () => {
      state.lang = langSel.value;
      persist();
      setStatus(`Käyttöliittymän kieli: ${langSel.options[langSel.selectedIndex].text}`);
    });
  }

  const tgtSel = $('#targetLang');
  if (tgtSel) {
    tgtSel.addEventListener('change', () => {
      state.targetLang = tgtSel.value;
      persist();
      setStatus(`Kohdekieli luonnokselle: ${tgtSel.options[tgtSel.selectedIndex].text}`);
    });
  }

 /* ---------- Dynaamisen ohjepalstan renderöinti ---------- */
function renderGuide(step) {
  const tpl = document.getElementById(`tpl-guide-${step}`) || document.getElementById('tpl-guide-1');
  const cont = document.getElementById('guideContent');
  if (tpl && cont) {
    cont.innerHTML = tpl.innerHTML;
    // siirrä fokus otsikkoon, jos käyttäjä siirtyi näppäimistöllä
    const title = document.getElementById('guide-title');
    if (title && document.activeElement?.id?.startsWith('toStep')) {
      title.tabIndex = -1; 
      title.focus();
    }
  }
}

/* ---------- Step navigation (UI only) ---------- */

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Siirrä fokus otsikkoon näppäimistö- ja ruudunlukijaystävällisesti
      const h = $('h2', el);
      if (h) h.tabIndex = -1, h.focus();
    }
  };

  const validateStep1 = () => {
    const anyFilled = ['jobTitle', 'jobUrl', 'adUrl', 'role'].some(id => !!state.form[id]?.trim());
    if (!anyFilled) {
      setStatus('Täytä vähintään yksi kenttä vaiheessa 1.');
      return false;
    }
    return true;
  };

  $('#toStep2')?.addEventListener('click', () => {
    if (!validateStep1()) return;
    state.step = 2; persist();
    renderGuide(2);
    scrollToSection('step2-title');
    setStatus('Siirryttiin vaiheeseen 2.');
  });

  $('#toStep3')?.addEventListener('click', () => {
    state.step = 3; persist();

    // Tässä kohtaa normaalisti kutsuttaisiin taustapalvelua / paikallista
    // generaattoria. Nyt luodaan pelkkä UI-esitäyttö demoamista varten.
    const native = [
      state.form.about,
      state.form.why,
      state.form.proof
    ].filter(Boolean).join('\n\n');

    if (!state.form.draftNative) {
      state.form.draftNative = native;
      const dn = $('#draftNative');
      if (dn) dn.value = native;
    }
    if (!state.form.draftTarget) {
      // Emme tee käännöstä täällä; kopioidaan pohja toiseen laatikkoon
      state.form.draftTarget = native;
      const dt = $('#draftTarget');
      if (dt) dt.value = native;
    }
    persist();
    renderGuide(3);
    scrollToSection('step3-title');
    setStatus('Luonnos luotu selaimessa (paikallisesti).');
  });

  /* ---------- Export & send (client side only) ---------- */

  // .docx export: rakennetaan yksinkertainen tekstipohjainen docx-korvike .txt:ksi
  // (varsinainen docx luodaan myöhemmin palvelupolussa; pysytään nyt UI:ssa).
  $('#exportDocx')?.addEventListener('click', () => {
    const lines = [
      `Työpaikan nimi: ${state.form.jobTitle || '-'}`,
      `Työpaikan www: ${state.form.jobUrl || '-'}`,
      `Ilmoituksen www: ${state.form.adUrl || '-'}`,
      `Ammattinimike: ${state.form.role || '-'}`,
      '',
      '--- Luonnos (oma kieli) ---',
      state.form.draftNative || '',
      '',
      '--- Luonnos (kohdekieli) ---',
      state.form.draftTarget || ''
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tyohakemus-luonnos.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('Luonnos ladattu .txt-muodossa.');
  });

  // Mailto-esitäyttö (ei palvelinlähetystä)
  $('#sendEmail')?.addEventListener('click', () => {
    const subject = encodeURIComponent(`Työhakemus: ${state.form.role || 'Hakemus'}`);
    const body = encodeURIComponent(
      `${state.form.draftTarget || state.form.draftNative || ''}\n\n` +
      `— Luotu Digiter Apply -sovelluksessa (paikallinen luonnos)`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  /* ---------- Progressive enhancement ---------- */

  // Textarea auto-resize (yksinkertainen)
  $$('.textarea').forEach(ta => {
    const auto = () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 800) + 'px';
    };
    ta.addEventListener('input', auto);
    auto();
  });

  // Palauta mahdollinen aiempi istunto
  restore();
  renderGuide(state.step || 1);
})();
