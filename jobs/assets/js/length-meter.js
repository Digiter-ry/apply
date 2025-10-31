// /assets/js/length-meter.js
(() => {
  const STEP2_SELECTOR = '#step-2, [data-step="2"]';
  const OK_RANGE_DEFAULT = [180, 360]; // fallback

  // i18n-backed labels with fallbacks
  const T = {
    short: () => (window.i18n?.t('assist.short') || 'Short'),
    ok: () => (window.i18n?.t('assist.ok') || 'Optimal'),
    long: () => (window.i18n?.t('assist.long') || 'Long'),
    chars: (n) => `${window.i18n?.fmtNumber ? window.i18n.fmtNumber(n) : n} ${window.i18n?.t('assist.chars') || 'characters'}`,
    tip: () => (window.i18n?.t('assist.tip') || 'Add one concrete example: "How did this show in results?"'),
    tipButton: () => (window.i18n?.t('assist.tipButton') || 'Show tip')
  };

  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  const createMeter = (ta, min, max) => {
    const wrap = document.createElement('div');
    wrap.className = 'lenmeter low';
    wrap.setAttribute('role', 'status');
    wrap.id = `${ta.id || `ta-${Math.random().toString(36).slice(2)}`}-meter`;

    const track = document.createElement('div');
    track.className = 'track';
    const fill = document.createElement('div');
    fill.className = 'fill';
    track.appendChild(fill);

    const legend = document.createElement('div');
    legend.className = 'legend';
    const left = document.createElement('span');
    const status = document.createElement('span');
    status.className = 'status';
    const right = document.createElement('span');
    legend.append(left, status, right);

    // Tip button
    const tipBtn = document.createElement('button');
    tipBtn.type = 'button';
    tipBtn.className = 'tip-button';
    tipBtn.textContent = T.tipButton();
    tipBtn.hidden = true;

    // Tooltip (tai pieni infoteksti)
    const tipText = document.createElement('div');
    tipText.className = 'tip-text';
    tipText.textContent = T.tip();
    tipText.hidden = true;

    tipBtn.addEventListener('click', () => {
      tipText.hidden = !tipText.hidden;
    });

    wrap.append(track, legend, tipBtn, tipText);
    ta.insertAdjacentElement('afterend', wrap);

    const update = () => {
      const value = (ta.value || '').trim();
      const n = value.length;

      let cls = 'low', label = T.short();
      if (n >= min && n <= max) { cls = 'ok'; label = T.ok(); }
      else if (n > max) { cls = 'high'; label = T.long(); }
      wrap.className = `lenmeter ${cls}`;

      const pct = Math.min(100, Math.round((n / (max * 1.4)) * 100));
      fill.style.width = `${pct}%`;

      left.textContent = T.chars(n);
      status.textContent = label;
      right.textContent = `${min}-${max}`;

      // Vihjenappi näkyviin vain "Sopiva"-tilassa
      tipBtn.hidden = cls !== 'ok';
      // Päivitä lokalisoidut tekstit aina
      tipBtn.textContent = T.tipButton();
      tipText.textContent = T.tip();
      tipText.hidden = cls !== 'ok' || tipText.hidden; // piilota jos ei enää sopiva
    };

    if (!ta.getAttribute('aria-describedby')) {
      ta.setAttribute('aria-describedby', wrap.id);
    }

    ta.addEventListener('input', update, { passive: true });
    update(); // init

    return update; // expose updater
  };

  onReady(() => {
    const step2 = document.querySelector(STEP2_SELECTOR) || document;
    const updaters = [];
    step2.querySelectorAll('textarea.answer').forEach(ta => {
      const min = parseInt(ta.dataset.optmin ?? OK_RANGE_DEFAULT[0], 10);
      const max = parseInt(ta.dataset.optmax ?? OK_RANGE_DEFAULT[1], 10);
      const upd = createMeter(ta, min, max);
      if (typeof upd === 'function') updaters.push(upd);
    });

    // Päivitä mittarit, kun sivun kieli vaihtuu (i18n asettaa <html lang="...">)
    try {
      const mo = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === 'attributes' && m.attributeName === 'lang') {
            updaters.forEach(fn => { try { fn(); } catch {} });
            break;
          }
        }
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    } catch {}
  });
})();

