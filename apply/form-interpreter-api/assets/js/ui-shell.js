// assets/js/ui.js

(function () {
  const html = document.documentElement;
  const I18N_BASE_PATH = 'assets/i18n';
  const LANG_STORAGE_KEY = 'lt2_lang';

  let currentLang = 'fi';
  let translations = {};

  // --------- pientä apua avaimen hakuun ---------

  function getNested(obj, path) {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : undefined), obj);
  }

  function t(key) {
    const val = getNested(translations, key);
    return typeof val === 'string' ? val : '';
  }

  // --------- i18n: lataus & soveltaminen ---------

  async function loadTranslations(lang) {
    const url = `${I18N_BASE_PATH}/ui.${lang}.json`;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) {
      console.warn('Failed to load translations for lang:', lang);
      return;
    }
    translations = await res.json();
  }

function applyTranslations() {
  const nodes = document.querySelectorAll('[data-i18n]');
  nodes.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const value = t(key);
    if (!value) return;

    const targetAttr = el.getAttribute('data-i18n-attr');

    // Jos data-i18n-attr on määritelty, käännös menee attribuuttiin
    if (targetAttr) {
      el.setAttribute(targetAttr, value);
      return;
    }

    // Muuten oletus: teksti-elementti
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.hasAttribute('placeholder')) {
        el.placeholder = value;
      } else {
        el.value = value;
      }
    } else {
      el.textContent = value;
    }
  });
}


  async function setLanguage(lang, opts = {}) {
    const { save = true } = opts;
    currentLang = lang;

    try {
      await loadTranslations(lang);
      applyTranslations();
      html.setAttribute('lang', lang);
      if (save) {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      }
    } catch (err) {
      console.error('Error setting language', err);
    }
  }

  // --------- Legal modal (käyttöehdot, tietosuoja, saavutettavuus) ---------

  const legalConfig = {
    terms: { titleKey: 'legal.terms.title', bodyKey: 'legal.terms.body' },
    privacy: { titleKey: 'legal.privacy.title', bodyKey: 'legal.privacy.body' },
    accessibility: { titleKey: 'legal.accessibility.title', bodyKey: 'legal.accessibility.body' }
  };

  function openLegalModal(type) {
    const def = legalConfig[type];
    if (!def) return;

    const backdrop = document.getElementById('legalModal');
    const titleEl = document.getElementById('legalModalTitle');
    const bodyEl = document.getElementById('legalModalBody');

    if (!backdrop || !titleEl || !bodyEl) return;

    const title = t(def.titleKey) || '';
    const bodyRaw = t(def.bodyKey) || '';

    titleEl.textContent = title;

    // jaetaan kappaleisiin tyhjillä riveillä
    const paragraphs = bodyRaw.split('\n\n').map((p) => p.trim()).filter(Boolean);
    bodyEl.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');

    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
  }

  function closeLegalModal() {
    const backdrop = document.getElementById('legalModal');
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
  }

  // --------- Teemavaihto ---------

  function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const isDark = html.classList.contains('dark');
      html.classList.toggle('dark', !isDark);
      html.classList.toggle('light', isDark);
    });
  }

  // --------- Käyttöehtojen hyväksyntä ---------

  function initTermsBanner() {
    const checkbox = document.getElementById('termsCheckbox');
    const startButton = document.getElementById('startButton');
    const mainLayout = document.getElementById('mainLayout');
    const banner = document.getElementById('termsBanner');

    if (!checkbox || !startButton || !mainLayout || !banner) return;

    checkbox.addEventListener('change', () => {
      startButton.disabled = !checkbox.checked;
    });

    startButton.addEventListener('click', () => {
      if (!checkbox.checked) return;
      mainLayout.classList.remove('main-layout--locked');
      banner.style.display = 'none';
    });
  }

  // --------- Legal footer-linkit ---------

  function initLegalLinks() {
    const links = document.querySelectorAll('.footer-link');
    if (!links.length) return;

    links.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-legal');
        openLegalModal(type);
      });
    });

    const closeBtn = document.getElementById('legalModalClose');
    const backdrop = document.getElementById('legalModal');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeLegalModal);
    }

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeLegalModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLegalModal();
      }
    });
  }

  // --------- Kielen valitsin ---------

  function initLanguageSelector() {
    const select = document.getElementById('langSelect');
    if (!select) return;

    // alkuarvo localStoragesta tai oletuksena fi
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    const initial = saved === 'en' ? 'en' : 'fi';
    select.value = initial;

    // asetetaan kieli, mutta ei tallenneta uudestaan
    setLanguage(initial, { save: false });

    select.addEventListener('change', (e) => {
      const lang = e.target.value === 'en' ? 'en' : 'fi';
      setLanguage(lang, { save: true });
    });
  }

  // --------- Käynnistys ---------

  document.addEventListener('DOMContentLoaded', () => {
    initLanguageSelector();
    initThemeToggle();
    initTermsBanner();
    initLegalLinks();
  });
})();
