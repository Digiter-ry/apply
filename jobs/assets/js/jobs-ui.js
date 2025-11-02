/* jobs-ui.js — UI-logiikkaa ilman ulkoisia riippuvuuksia */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    lang: 'fi',
    targetLang: 'fi',
    privacyMode: true,
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
    },
    summary: ''
  };

  // Timer for debouncing guide render calls
  let guideRenderTimer = null;

  /* ---------- Helpers ---------- */

  const SESSION_TTL_HOURS = 72;
  const nowTs = () => Date.now();

  const persist = () => {
    if (state.privacyMode) return; // ei pysyväistalletusta yksityisyystilassa
    try {
      const payload = { ...state, _meta: { savedAt: nowTs(), ttlHours: SESSION_TTL_HOURS } };
      localStorage.setItem('jobs-ui', JSON.stringify(payload));
    }
    catch { /* private mode / storage blocked */ }
  };

  const restore = () => {
    if (state.privacyMode) return;
    try {
      const raw = localStorage.getItem('jobs-ui');
      if (!raw) return;
      const saved = JSON.parse(raw);
      // TTL-tarkistus (yhteensopiva vanhan formaatin kanssa)
      const savedAt = saved?._meta?.savedAt || 0;
      const ttlH = saved?._meta?.ttlHours || SESSION_TTL_HOURS;
      if (savedAt && (nowTs() - savedAt) > ttlH * 3600 * 1000) {
        try { localStorage.removeItem('jobs-ui'); } catch {}
        return;
      }
      // Palauta tila, mutta älä ylikirjoita uusia kenttiä puuttuvilla
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
      // Yksityisyystilan kytkin arvo, jos on
      const priv = $('#privacyMode');
      if (priv) priv.checked = !!state.privacyMode;

      setStatus(window.i18n?.t('status.restored') || 'Palautettiin viimeisin istunto.');
      updateCounts();
    } catch {
      /* ignore */
    }
  };

  const setStatus = (msg) => {
    const s = $('#status');
    if (s) s.textContent = msg;
  };

  // Näytä/piilota kohdekielen kenttä, jos kielet samat
  function syncTargetVisibility(){
    try {
      const same = String(state.targetLang||'').toLowerCase() === String(state.lang||'').toLowerCase();
      const tEl = document.getElementById('draftTarget');
      const tField = tEl ? tEl.closest('.field') : null;
      if (tField) tField.hidden = !!same;
    } catch {}
  }

  // i18n helper: return default if translation missing
  function tr(key, defValue) {
    try {
      const v = window.i18n?.t(key);
      return (!v || v === key) ? defValue : v;
    } catch { return defValue; }
  }

  // Busy overlay helpers
  function showBusy(message) {
    const el = document.getElementById('busy');
    const txt = document.getElementById('busyText');
    if (txt && typeof message === 'string') txt.textContent = message;
    if (el) el.hidden = false;
  }
  function hideBusy() {
    const el = document.getElementById('busy');
    if (el) el.hidden = true;
  }

  // Progress bar helpers (indeterminate)
  function showProgress() {
    const p = document.getElementById('progress');
    if (p) p.hidden = false;
  }
  function hideProgress() {
    const p = document.getElementById('progress');
    if (p) p.hidden = true;
  }

  const updateCounts = () => {
    $$('[data-for]').forEach(span => {
      const forId = span.getAttribute('data-for');
      span.textContent = String(document.getElementById(forId)?.value?.length || 0);
    });
  };

  // Päivitä count-label elementtien käännökset
  const updateCountLabels = () => {
    $$('.count-label[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && window.i18n?.t) {
        const trans = window.i18n.t(key);
        if (trans && typeof trans === 'string') {
          el.textContent = trans;
        }
      }
    });
  };

  /* ---------- Ohjeiden renderöinti ---------- */
  
  function renderGuide(step, force = false) {
    const cont = document.getElementById('guideContent');
    const bar  = document.getElementById('guideBarContent');
    const panel = document.getElementById('guidePanelContent');
    if (!cont && !bar) return;
    
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

    // Lisää fade-out luokalla (CSP-ystävällinen)
    if (cont) { cont.classList.remove('fade-in'); cont.classList.add('fade-out'); }

    guideRenderTimer = setTimeout(() => {
      try {
        // Hae ohjeet templaten avulla
        const template = document.getElementById(`tpl-guide-${step}`);
        if (!template) {
          console.error('Template puuttuu:', `tpl-guide-${step}`);
          const msg = window.i18n?.t('guide.loadError') || 'Ohjeiden lataus epäonnistui.';
          cont.textContent = msg;
          return;
        }
        
        // Kloonaa template
        const content = template.content.cloneNode(true);
        
        // Tyhjennä container ja lisää uusi sisältö
        if (cont) {
          cont.innerHTML = '';
          cont.appendChild(content);
        }
        
        // Merkitse nykyinen vaihe
        if (cont) cont.dataset.currentStep = step;
        
        // Päivitä käännökset
        if (window.i18n?.applyTranslations && cont) {
          window.i18n.applyTranslations(cont);
        }

        // Päivitä mobiilipalkin teksti: käytä ensimmäistä tip-vinkkiä
        if (bar && window.i18n?.t) {
          const tips = window.i18n.t(`guide.step${step}.tips`);
          if (Array.isArray(tips) && tips.length) {
            bar.textContent = String(tips[0]);
          } else {
            bar.textContent = '';
          }
        }

        // Päivitä paneelin sisältö täydellä templaten sisällöllä
        if (panel) {
          const tpl = document.getElementById(`tpl-guide-${step}`);
          if (tpl) {
            const clone = tpl.content.cloneNode(true);
            panel.innerHTML = '';
            panel.appendChild(clone);
            if (window.i18n?.applyTranslations) {
              window.i18n.applyTranslations(panel);
            }
          }
        }
        
        // Fade in luokalla (CSP-ystävällinen)
        if (cont) { cont.classList.remove('fade-out'); cont.classList.add('fade-in'); }
        
        // Päivitä tila
        state.step = step;
        persist();
        
      } catch (e) {
        console.error('Virhe ohjeiden renderöinnissä:', e);
        const msg = window.i18n?.t('guide.loadError') || 'Virhe ohjeiden lataamisessa.';
        cont.textContent = msg;
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

  // Jos vaihe 1:n kenttiä muutetaan, nollaa aiempi taustayhteenveto
  ;(['jobTitle','jobUrl','adUrl','role']).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (state.summary) {
        state.summary = '';
        try { localStorage.removeItem('jobs-summary'); } catch {}
        setStatus(tr('status.scouting','Haetaan taustatietoja...'));
      }
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
          // Päivitä myös count-label elementit erikseen (pieni viive varmistaa että applyTranslations on valmis)
          setTimeout(() => {
            updateCountLabels();
          }, 50);
        } catch (e) {
          console.warn('applyTranslations(document) epäonnistui:', e);
        }

        // Pakota ohjeiden päivitys (force = true)
        const currentStep = document.getElementById('guideContent')?.dataset.currentStep || '1';
        renderGuide(parseInt(currentStep, 10), true);
        const name = langSel.options[langSel.selectedIndex].text;
        setStatus(window.i18n?.t('status.langSet', { name }) || `Käyttöliittymän kieli: ${name}`);
        console.log('Kieli asetettu:', langSel.value);
      }).catch(err => {
        console.error('i18n.setLocale epäonnistui:', err);
      });
      persist();
    });
  }

  // Yksityisyystilan kytkin
  const privacyChk = $('#privacyMode');
  const privacyTxt = $('#privacyModeText');
  if (privacyChk) {
    privacyChk.addEventListener('change', () => {
      state.privacyMode = !!privacyChk.checked;
      // Päivitä teksti
      if (privacyTxt) {
        if (state.privacyMode) {
          privacyTxt.textContent = (window.i18n?.t('privacy.on') || 'Yksityisyystila päällä');
        } else {
          privacyTxt.textContent = (window.i18n?.t('privacy.off') || 'Yksityisyystila pois');
        }
      }
      if (state.privacyMode) {
        // Poista pysyväistila heti
        try { localStorage.removeItem('jobs-ui'); } catch {}
      } else {
        persist();
      }
    });
  }

  /* ---------- API-avaimen hallinta ---------- */
  const userKeyEl = document.getElementById('userKey');
  const saveKeyBtn = document.getElementById('saveKey');
  const toggleKeyBtn = document.getElementById('toggleKey');
  const keyStatus = document.getElementById('keyStatus');

  function renderKeyStatus(){
    try {
      const has = !!localStorage.getItem('userApiKey');
      if (keyStatus) keyStatus.textContent = has ? tr('apikey.saved','Tallennettu') : '';
    } catch {}
  }

  if (userKeyEl) {
    try {
      const stored = localStorage.getItem('userApiKey');
      if (stored) {
        userKeyEl.value = stored;
      }
    } catch {}
    renderKeyStatus();
  }

  saveKeyBtn?.addEventListener('click', () => {
    if (!userKeyEl) return;
    const v = userKeyEl.value.trim();
    try {
      if (v) localStorage.setItem('userApiKey', v); else localStorage.removeItem('userApiKey');
      renderKeyStatus();
      setStatus(tr('apikey.savedMsg','API-avain tallennettu selaimeen.'));
    } catch (e) {
      setStatus(tr('apikey.saveFailed','Tallennus ep�onnistui.'));
    }
  });

  toggleKeyBtn?.addEventListener('click', () => {
    if (!userKeyEl) return;
    const type = userKeyEl.getAttribute('type') === 'password' ? 'text' : 'password';
    userKeyEl.setAttribute('type', type);
  });

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
      syncTargetVisibility();
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
    rootMargin: '-20% 0px -55% 0px', // hieman vähemmän alareunan marginaalia
    threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] // Tarkempi seuranta
  });

  // Lisää seuranta step-otsikoille
  ['step1-title', 'step2-title', 'step3-title'].forEach(id => {
    const el = document.getElementById(id);
    if (el) stepObserver.observe(el);
  });

  // Fallback: skrolli-/pohjaheuristiikka varmistaa vaiheen mobiilissa
  function computeActiveStepByPosition() {
    const headers = [
      document.getElementById('step1-title'),
      document.getElementById('step2-title'),
      document.getElementById('step3-title')
    ].filter(Boolean);
    if (!headers.length) return null;

    // Jos ollaan aivan pohjassa, valitse viimeinen
    const scrollBottom = window.scrollY + window.innerHeight;
    const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    if (docHeight - scrollBottom < 4) return 3;

    // Valitse otsikko, jonka etäisyys viewportin yläreunasta (offset 20%) on pienin
    const anchor = window.innerHeight * 0.2;
    let best = { step: null, dist: Infinity };
    headers.forEach(h => {
      const rect = h.getBoundingClientRect();
      const step = parseInt(h.id.replace('step','').replace('-title',''), 10);
      const dist = Math.abs(rect.top - anchor);
      if (dist < best.dist) best = { step, dist };
    });
    return best.step;
  }

  let scrollTimer = null;
  function onScrollCheck() {
    if (scrollTimer) cancelAnimationFrame(scrollTimer);
    scrollTimer = requestAnimationFrame(() => {
      const computed = computeActiveStepByPosition();
      if (computed && computed !== state.step) {
        renderGuide(computed);
      } else if (computed === 3 && state.step !== 3) {
        renderGuide(3);
      }
    });
  }

  window.addEventListener('scroll', onScrollCheck, { passive: true });
  window.addEventListener('resize', onScrollCheck);

  /* ---------- Navigointi ---------- */

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* ---------- Backend API helperit ---------- */

  const getUserApiKey = () => {
    try { return localStorage.getItem('userApiKey') || ''; } catch { return ''; }
  };

  async function apiPost(path, body, timeoutMs = 45000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const ukey = getUserApiKey();
      if (ukey) headers['X-App-API-Key'] = ukey;
      const res = await fetch(path, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json?.ok !== false, status: res.status, body: json };
    } catch (e) {
      return { ok: false, status: 0, body: { ok: false, error: 'network', message: String(e && e.name === 'AbortError' ? 'timeout' : e) } };
    } finally {
      clearTimeout(t);
    }
  }

  // Vaihe 1 -> 2
  $('#toStep2')?.addEventListener('click', () => {
    const anyFilled = ['jobTitle', 'jobUrl', 'adUrl', 'role']
      .some(id => !!state.form[id]?.trim());
      
    if (!anyFilled) {
      setStatus(window.i18n?.t('status.fillOne') || 'Täytä vähintään yksi kenttä vaiheessa 1.');
      return;
    }
    
    scrollToSection('step2-title');
    setStatus(window.i18n?.t('status.movedTo2') || 'Siirryttiin vaiheeseen 2.');
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
      setStatus(tr('status.draftCreated','Luonnos luotu.'));
  });

  /* ---------- Vienti ---------- */

  $('#exportDocx')?.addEventListener('click', () => {
    // Guard: require terms acceptance if present
    const tchk = document.getElementById('acceptTerms');
    if (tchk && !tchk.checked) {
      setStatus(window.i18n?.t('status.termsRequired') || 'Hyväksy käyttöehdot ennen jatkamista.');
      return;
    }
    const t = (k, vars={}) => window.i18n?.t(k, vars) || '';
    const content = [
      `${t('export.title') || 'Työpaikan nimi:'} ${state.form.jobTitle || '-'}`,
      `${t('export.website') || 'Työpaikan www:'} ${state.form.jobUrl || '-'}`,
      `${t('export.adUrl') || 'Ilmoituksen www:'} ${state.form.adUrl || '-'}`,
      `${t('export.role') || 'Ammattinimike:'} ${state.form.role || '-'}`,
      '',
      t('export.nativeHeader') || '--- Luonnos (oma kieli) ---',
      state.form.draftNative || '',
      '',
      t('export.targetHeader') || '--- Luonnos (kohdekieli) ---',
      state.form.draftTarget || ''
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (t('export.filename') || 'tyohakemus-luonnos.txt');
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus(t('status.draftDownloaded') || 'Luonnos ladattu .txt-muodossa.');
  });

  $('#sendEmail')?.addEventListener('click', () => {
    // Guard: require terms acceptance if present
    const tchk = document.getElementById('acceptTerms');
    if (tchk && !tchk.checked) {
      setStatus(window.i18n?.t('status.termsRequired') || 'Hyväksy käyttöehdot ennen jatkamista.');
      return;
    }
    const subject = encodeURIComponent(`${(window.i18n?.t('mail.subjectPrefix') || 'Työhakemus:')} ${state.form.role || (window.i18n?.t('mail.subjectFallback') || 'Hakemus')}`);
    const body = encodeURIComponent(
      `${state.form.draftTarget || state.form.draftNative || ''}\n\n` +
      `${(window.i18n?.t('mail.footer') || '- Luotu Digiter Apply -sovelluksessa')}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  /* ---------- Tyhjennys (lomake + välimuisti) ---------- */

  $('#clearAll')?.addEventListener('click', () => {
    const ok = window.confirm(window.i18n?.t('confirm.clearAll') || 'Tyhjennetäänkö lomake ja paikallinen välimuisti?');
    if (!ok) return;

    // Tyhjennä lomakekentät ja state.form
    Object.keys(state.form).forEach((k) => {
      state.form[k] = '';
      const el = document.getElementById(k);
      if (el) el.value = '';
    });

    // Palauta vaihe 1:een
    state.step = 1;

    // Poista talletettu istunto
    try { localStorage.removeItem('jobs-ui'); } catch {}

    updateCounts();
    renderGuide(1, true);
    setStatus(window.i18n?.t('status.cleared') || 'Lomake ja välimuisti tyhjennetty.');
  });

  /* ---------- Alustus ---------- */
// assets/js/jobs-ui.js
window.addEventListener('jobsContentLoaded', (e) => {
  console.log('[jobs-ui] content loaded', e.detail);
  // CSP-ystävällinen korostus: käytä luokkaa
  const h1 = document.getElementById('hero-title');
  if (h1) {
    h1.classList.add('hero-flash');
    setTimeout(() => h1.classList.remove('hero-flash'), 600);
  }
});


  // Siirretty CSS:ään (CSP-ystävällinen)

  restore();
  try { localStorage.removeItem('jobs-summary'); } catch {}
  // Alkuasetus kohdekentän näkyvyydelle
  setTimeout(syncTargetVisibility, 0);

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

  // Hae backendin UI-kokoonpano (esim. vaaditaanko käyttäjäavainta)
  (async () => {
    try {
      const res = await fetch('api/answer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'config' })
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j && j.ok && j.requireUserKey === false) {
        const group = document.querySelector('.apikey-group');
        if (group) group.hidden = true;
      }
    } catch {}
  })();

  /* ---------- Ohjepaneelin ohjaus (mobiili) ---------- */
  const guideToggle = $('#guideBarToggle');
  const guidePanel = $('#guidePanel');
  const guideClose = $('#guidePanelClose');
  const guideBackdrop = $('.guide-panel-backdrop');

  function openGuidePanel(){
    if (!guidePanel) return;
    guidePanel.hidden = false;
    if (guideToggle) guideToggle.setAttribute('aria-expanded', 'true');
    // Fokusta suljimeen
    setTimeout(() => { try { guideClose?.focus(); } catch {} }, 0);
  }

  function closeGuidePanel(){
    if (!guidePanel) return;
    guidePanel.hidden = true;
    if (guideToggle) guideToggle.setAttribute('aria-expanded', 'false');
    try { guideToggle?.focus(); } catch {}
  }

  guideToggle?.addEventListener('click', openGuidePanel);
  guideClose?.addEventListener('click', closeGuidePanel);
  guideBackdrop?.addEventListener('click', closeGuidePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !guidePanel.hidden) closeGuidePanel();
  });

  // Odota että i18n on valmis ja päivitä count-label elementit
  setTimeout(() => {
    if (window.i18n?.t) updateCountLabels();
  }, 300);

  /* ---------- Backend-kytkennät vaiheisiin 1 ja 3 ---------- */

      // Taustahaku Step 1 -> 2 (Perplexity)
  let scoutInFlight = false;
  document.getElementById('toStep2')?.addEventListener('click', () => {
    const anyFilled = ['jobTitle','jobUrl','adUrl','role'].some(id => !!state.form[id]?.trim());
    if (!anyFilled) return;
    if (scoutInFlight) return;
    if ((state.summary || '').trim()) return;

    const payload = {
      action: 'perplexity_scout',
      jobTitle: state.form.jobTitle,
      jobUrl: state.form.jobUrl,
      adUrl: state.form.adUrl,
      role: state.form.role,
      lang: state.lang
    };
    setStatus(tr('status.scouting','Haetaan taustatietoja...'));
    showProgress();
    scoutInFlight = true;
    apiPost('api/answer.php', payload, 30000).then((res) => {
      if (res.ok && res.body?.summary) {
        state.summary = String(res.body.summary);
        try { if (!state.privacyMode) localStorage.setItem('jobs-summary', state.summary); } catch {}
        persist();
        setStatus(tr('status.scoutReady','Taustatiedot haettu.'));
      } else {
        const msg = res.body?.message || res.body?.error || 'Scout-virhe';
        console.warn('perplexity_scout failed', res);
        setStatus(tr('status.scoutFailed','Taustatietojen haku epäonnistui:') + ' ' + msg);
      }
      hideProgress();
      scoutInFlight = false;
    });
  });


  // Generointi Step 2 -> 3 (OpenAI)
  let generateInFlight = false;
  document.getElementById('toStep3')?.addEventListener('click', async () => {
    if (generateInFlight) return;
    generateInFlight = true;
    const about = state.form.about || '';
    const why = state.form.why || '';
    const proof = state.form.proof || '';
    const summary = state.summary || (function(){ try { return localStorage.getItem('jobs-summary') || ''; } catch { return ''; } })();

    const genMsg = tr('status.generating','Luodaan luonnosta...');
    setStatus(genMsg);
    showBusy(genMsg);
    showProgress();
    // Natiivi- ja kohdekieli haetaan DOM:ista varmuuden vuoksi
    const nativeLangNow = (document.getElementById('langSel')?.value || state.lang || 'fi');
    const targetLangNow = (document.getElementById('targetLang')?.value || state.targetLang || nativeLangNow);
    const res = await apiPost('api/answer.php', {
      action: 'generate_application',
      summary,
      about,
      why,
      proof,
      nativeLang: nativeLangNow,
      targetLang: targetLangNow
    }, 45000);

    if (res.ok && res.body) {
      const dn = String(res.body.draftNative || '');
      const dt = String(res.body.draftTarget || '') || dn;
      state.form.draftNative = dn;
      state.form.draftTarget = dt;
      const dnEl = document.getElementById('draftNative');
      const dtEl = document.getElementById('draftTarget');
      if (dnEl) dnEl.value = dn;
      if (dtEl) dtEl.value = dt;
      setStatus(tr('status.draftCreated','Luonnos luotu.'));
      persist();
    } else {
      const msg = res.body?.message || res.body?.error || 'Virhe luonnoksen luonnissa';
      setStatus(tr('status.generateFailed','Luonnoksen luonti ep�onnistui:') + ' ' + msg);
    }
    hideBusy();
    hideProgress();
    generateInFlight = false;
  });

  /* ---------- Footer: Legal modal ---------- */
  const legalModal = document.getElementById('legalModal');
  const legalTitle = document.getElementById('legalModalTitle');
  const legalContent = document.getElementById('legalModalContent');
  const legalClose = document.getElementById('legalModalClose');
  const legalBackdrop = document.querySelector('.legal-modal-backdrop');

  function openLegal(kind){
    if (!legalModal) return;
    try {
      const t = (k)=> (window.i18n?.t(k));
      const title = t(`legal.${kind}.title`) || '';
      const body = t(`legal.${kind}.body`);
      legalTitle.textContent = title || '';
      legalContent.innerHTML = '';
      const esc = (s)=> String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      if (Array.isArray(body)) {
        legalContent.innerHTML = body.map(p => `<p>${esc(p)}</p>`).join('');
      } else if (typeof body === 'string') {
        legalContent.textContent = body;
      }
    } catch {}
    legalModal.hidden = false;
    try { legalClose?.focus(); } catch {}
  }
  function closeLegal(){ if (!legalModal) return; legalModal.hidden = true; }

  document.getElementById('legalAboutLink')?.addEventListener('click', (e)=>{ e.preventDefault(); openLegal('about'); });
  document.getElementById('legalAiLink')?.addEventListener('click', (e)=>{ e.preventDefault(); openLegal('ai'); });
  document.getElementById('legalPrivacyLink')?.addEventListener('click', (e)=>{ e.preventDefault(); openLegal('privacy'); });
  document.getElementById('legalTermsLink')?.addEventListener('click', (e)=>{ e.preventDefault(); openLegal('terms'); });
  document.getElementById('termsLinkInline')?.addEventListener('click', (e)=>{ e.preventDefault(); openLegal('terms'); });
  legalClose?.addEventListener('click', closeLegal);
  legalBackdrop?.addEventListener('click', closeLegal);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !legalModal?.hidden) closeLegal(); });

  // Terms acceptance: disable actions until accepted
  const termsChk = document.getElementById('acceptTerms');
  const termsWrap = document.querySelector('.terms-accept');
  const gatedSelectors = '#toStep2,#toStep3,#exportDocx,#sendEmail,#clearAll';
  const gatedButtons = Array.from(document.querySelectorAll(gatedSelectors));

  function markGatedState(ok){
    gatedButtons.forEach(b => {
      if (!b) return;
      b.setAttribute('aria-disabled', ok ? 'false' : 'true');
      b.classList.toggle('is-disabled', !ok);
    });
  }
  function nudgeTerms(){
    setStatus(tr('status.termsRequired','Hyväksy käyttöehdot ennen jatkamista.'));
    if (termsWrap) {
      termsWrap.classList.add('attn');
      setTimeout(() => termsWrap.classList.remove('attn'), 1200);
    }
    try { termsChk?.focus(); } catch {}
  }
  function syncTerms(){
    const ok = termsChk ? !!termsChk.checked : true;
    markGatedState(ok);
    if (ok && termsWrap) termsWrap.classList.remove('attn');
  }
  document.addEventListener('click', (e) => {
    const el = e.target && (e.target.closest ? e.target.closest(gatedSelectors) : null);
    if (!el) return;
    const ok = termsChk ? !!termsChk.checked : true;
    if (!ok) {
      e.preventDefault(); e.stopPropagation();
      nudgeTerms();
    }
  }, true); // capture to run before other handlers
  if (termsChk) {
    termsChk.addEventListener('change', syncTerms);
    syncTerms();
  } else {
    markGatedState(true);
  }

})();












