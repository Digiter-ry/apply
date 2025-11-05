// /assets/js/reward.js
(() => {
  // Mihin vaiheeseen reagoidaan (Vaihe 1 -konteinerin id tai data-attribuutti)
  const STEP1_SELECTOR = '#step-1, [data-step="1"]';

  // Näytetään vain kerran per sivulataus (ja per selaimen istunto)
  const SESSION_FLAG = 'jobapp:firstSuccessShown';

  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  onReady(() => {
    if (sessionStorage.getItem(SESSION_FLAG)) return;

    const step1 = document.querySelector(STEP1_SELECTOR);
    if (!step1) return;

    const inputs = step1.querySelectorAll('input, textarea, select');
    if (!inputs.length) return;

    let fired = false;
    const toast = document.getElementById('firstSuccessToast');

    // apu: tekstikenttä sisältää jotain “oikeaa”
    const hasMeaningfulValue = (el) => {
      if (!el) return false;
      const v = (el.value ?? '').trim();
      return v.length >= 2; // säädä tarvittaessa
    };

    const showToast = () => {
      if (!toast || fired) return;
      fired = true;
      sessionStorage.setItem(SESSION_FLAG, '1');

      // Näytä
      toast.hidden = false;
      // trigger reflow, jotta transition toimii
      // eslint-disable-next-line no-unused-expressions
      toast.offsetHeight;
      toast.classList.add('show');

      // kipinäanimaatiot
      toast.querySelectorAll('.spark').forEach((s, i) => {
        s.style.animation = `spark-burst 700ms ${50 * i}ms ease-out forwards`;
      });

      // Piilota automaattisesti
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => (toast.hidden = true), 250);
      }, 1800);
    };

    // Kuunnellaan ensimmäistä merkityksellistä syötettä
    const handler = (e) => {
      const el = e.target;
      if (hasMeaningfulValue(el)) {
        showToast();
        // jälkeenpäin ei tarvitse enää kuunnella
        inputs.forEach(inp => inp.removeEventListener('input', handler));
        inputs.forEach(inp => inp.removeEventListener('change', handler));
      }
    };

    inputs.forEach(inp => {
      inp.addEventListener('input', handler, { passive: true });
      inp.addEventListener('change', handler);
    });
  });
})();
