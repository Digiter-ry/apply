/* jobs-ui.js — UI-logiikkaa ilman ulkoisia riippuvuuksia */

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

  // Timer for debouncing guide render calls
  let guideRenderTimer = null;

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

      // Täytä kentät
      Object.entries(state.form).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (el) el.value = v;
      });

      // Aseta kielivalinta
      const langSel = $('#langSel');
      const tgtSel = $('#targetLang');
      if (langSel && state.lang) langSel.value = state.lang;
      if (tgtSel && state.targetLang) tgtSel.value = state.targetLang;

      setStatus('Palautettiin viimeisin istunto.');
      updateCounts();
    } catch {
      /* ignore */
    }
  };

  const setStatus = (msg) => {
    const s = $('#status');
    if (s) s.textContent = msg;
  };

  const updateCounts = () => {
    $$('[data-for]').forEach(span => {
      const forId = span.getAttribute('data-for');
      span.textContent = String(document.getElementById(forId)?.value?.length || 0);
    });
  };

  /* ---------- Ohjeiden renderöinti ---------- */
  
  function renderGuide(step, force = false) {
    const cont = document.getElementById('guideContent');
    if (!cont) return;
    
    // Tarkista onko sama vaihe jo näkyvillä (vain jos ei pakotettu)
    if (!force && cont.dataset.currentStep === String(step)) {
      // vaikka vaihe olisi sama, varmista että käännökset ovat ajan tasalla
      if (force && window.i18n?.applyTranslations) {
        window.i18n.applyTranslations(cont);
      }
      return;
    }
    
    // Peruuta mahdollinen aiempi renderöinti
    if (guideRenderTimer) clearTimeout(guideRenderTimer);

    // Lisää fade-out
    cont.style.opacity = '0';

    guideRenderTimer = setTimeout(() => {
      try {
        // Hae ohjeet templaten avulla
        const template = document.getElementById(`tpl-guide-${step}`);
        if (!template) {
          console.error('Template puuttuu:', `tpl-guide-${step}`);
          cont.innerHTML = '<p>Ohjeiden lataus epäonnistui.</p>';
          return;
        }
        
        // Kloonaa template
        const content = template.content.cloneNode(true);
        
        // Tyhjennä container ja lisää uusi sisältö
        cont.innerHTML = '';
        cont.appendChild(content);
        
        // Merkitse nykyinen vaihe
        cont.dataset.currentStep = step;
        
        // Päivitä käännökset
        if (window.i18n?.applyTranslations) {
          window.i18n.applyTranslations(cont);
        }
        
        // Fade in
        cont.style.opacity = '1';
        
        // Päivitä tila
        state.step = step;
        persist();
        
      } catch (e) {
        console.error('Virhe ohjeiden renderöinnissä:', e);
        cont.innerHTML = '<p>Virhe ohjeiden lataamisessa.</p>';
      }
    }, 200);
  }

  /* ---------- Kenttien sidonta ---------- */

  // Input/textarea kenttien sidonta
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

  /* ---------- Kielen hallinta ---------- */

  const langSel = $('#langSel');
  if (langSel) {
    langSel.addEventListener('change', () => {
      state.lang = langSel.value;
      i18n.setLocale(langSel.value).then(() => {
        // Varmista että koko dokumentin käännökset päivittyvät
        try {
          if (window.i18n?.applyTranslations) {
            window.i18n.applyTranslations(document);
          }
        } catch (e) {
          console.warn('applyTranslations(document) epäonnistui:', e);
        }

        // Pakota ohjeiden päivitys (force = true)
        const currentStep = document.getElementById('guideContent')?.dataset.currentStep || '1';
        renderGuide(parseInt(currentStep, 10), true);
        setStatus(`Käyttöliittymän kieli: ${langSel.options[langSel.selectedIndex].text}`);
        console.log('Kieli asetettu:', langSel.value);
      }).catch(err => {
        console.error('i18n.setLocale epäonnistui:', err);
      });
      persist();
    });
  }

  const tgtSel = $('#targetLang');
  if (tgtSel) {
    // Kopioi kielet kohdekielivalikkoon
    if (langSel && !tgtSel.options.length) {
      Array.from(langSel.options).forEach(opt => {
        tgtSel.appendChild(opt.cloneNode(true));
      });
    }
    tgtSel.addEventListener('change', () => {
      state.targetLang = tgtSel.value;
      persist();
      setStatus(`Kohdekieli: ${tgtSel.options[tgtSel.selectedIndex].text}`);
    });
  }

  /* ---------- Vaiheiden seuranta ---------- */

  // Intersection Observer vaiheiden seuraamiseen
  let observerTimeout;
  const stepObserver = new IntersectionObserver((entries) => {
    // Tyhjennä mahdollinen aiempi timeout
    if (observerTimeout) {
      clearTimeout(observerTimeout);
    }
    
    // Etsi näkyvin otsikko
    let maxRatio = 0;
    let activeStep = null;
    
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
        maxRatio = entry.intersectionRatio;
        activeStep = parseInt(entry.target.id.replace('step', '').replace('-title', ''), 10);
      }
    });
    
    // Jos löydettiin aktiivinen vaihe, aseta pieni viive päivitykselle
    if (activeStep !== null) {
      observerTimeout = setTimeout(() => {
        renderGuide(activeStep);
      }, 100);
    }
  }, {
    root: null,
    rootMargin: '-20% 0px -60% 0px', // Vaihda vaihe kun otsikko on ylemmässä osassa ruutua
    threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] // Tarkempi seuranta
  });

  // Lisää seuranta step-otsikoille
  ['step1-title', 'step2-title', 'step3-title'].forEach(id => {
    const el = document.getElementById(id);
    if (el) stepObserver.observe(el);
  });

  /* ---------- Navigointi ---------- */

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Vaihe 1 -> 2
  $('#toStep2')?.addEventListener('click', () => {
    const anyFilled = ['jobTitle', 'jobUrl', 'adUrl', 'role']
      .some(id => !!state.form[id]?.trim());
      
    if (!anyFilled) {
      setStatus('Täytä vähintään yksi kenttä vaiheessa 1.');
      return;
    }
    
    scrollToSection('step2-title');
    setStatus('Siirryttiin vaiheeseen 2.');
  });

  // Vaihe 2 -> 3
  $('#toStep3')?.addEventListener('click', () => {
    // Täytä luonnokset
    const native = [
      state.form.about,
      state.form.why,
      state.form.proof
    ].filter(Boolean).join('\n\n');

    if (!state.form.draftNative) {
      state.form.draftNative = native;
      $('#draftNative').value = native;
    }
    if (!state.form.draftTarget) {
      state.form.draftTarget = native;
      $('#draftTarget').value = native;
    }

    scrollToSection('step3-title');
    setStatus('Luonnos luotu.');
  });

  /* ---------- Vienti ---------- */

  $('#exportDocx')?.addEventListener('click', () => {
    const content = [
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
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tyohakemus-luonnos.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('Luonnos ladattu .txt-muodossa.');
  });

  $('#sendEmail')?.addEventListener('click', () => {
    const subject = encodeURIComponent(`Työhakemus: ${state.form.role || 'Hakemus'}`);
    const body = encodeURIComponent(
      `${state.form.draftTarget || state.form.draftNative || ''}\n\n` +
      `— Luotu Digiter Apply -sovelluksessa`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  /* ---------- Alustus ---------- */

  // Lisää fade-transition tyylit
  const style = document.createElement('style');
  style.textContent = `
    #guideContent {
      transition: opacity 0.2s ease-in-out;
    }
  `;
  document.head.appendChild(style);

  restore();
  renderGuide(state.step || 1);

  // Automaattinen textarea-korkeus
  $$('.textarea').forEach(ta => {
    const resize = () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 800) + 'px';
    };
    ta.addEventListener('input', resize);
    resize();
  });

  // Vuosiluku
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();