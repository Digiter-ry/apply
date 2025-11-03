/* jobs-ui.js - rebuilt minimal UI logic after accidental truncation */

(function(){
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const state = {
    lang: 'fi',
    targetLang: 'fi',
    privacyMode: true,
    step: 1,
    form: {
      jobTitle: '', jobUrl: '', adUrl: '', role: '',
      about: '', why: '', proof: '',
      draftNative: '', draftTarget: ''
    },
    summary: ''
  };

  const SESSION_TTL_HOURS = 12;
  const nowTs = () => Date.now();

  function setStatus(msg){ const el = $('#status'); if (el) el.textContent = String(msg||''); }
  function showBusy(message){ const el=$('#busy'), t=$('#busyText'); if(t) t.textContent=String(message||''); if(el) el.hidden=false; }
  function hideBusy(){ const el=$('#busy'); if(el) el.hidden=true; }
  function showProgress(){ const el=$('#progress'); if(el) el.hidden=false; }
  function hideProgress(){ const el=$('#progress'); if(el) el.hidden=true; }

  function persist(){
    if (state.privacyMode) return;
    try {
      const payload = { ...state, _meta: { savedAt: nowTs(), ttlHours: SESSION_TTL_HOURS } };
      sessionStorage.setItem('jobs-ui', JSON.stringify(payload));
    } catch {}
  }
  function restore(){
    if (state.privacyMode) return;
    try {
      const raw = sessionStorage.getItem('jobs-ui');
      if (!raw) return;
      const saved = JSON.parse(raw);
      const savedAt = saved?._meta?.savedAt || 0;
      const ttlH = saved?._meta?.ttlHours || SESSION_TTL_HOURS;
      if (savedAt && (nowTs() - savedAt) > ttlH*3600*1000) { try{ sessionStorage.removeItem('jobs-ui'); }catch{}; return; }
      Object.assign(state, saved);
      Object.entries(state.form).forEach(([k,v])=>{ const el = document.getElementById(k); if (el) el.value = v; });
      const langSel = $('#langSel'); const tgtSel=$('#targetLang');
      if (langSel && state.lang) langSel.value = state.lang;
      if (tgtSel && state.targetLang) tgtSel.value = state.targetLang;
      const priv = $('#privacyMode'); if (priv) priv.checked = !!state.privacyMode;
      setStatus((window.i18n?.t('status.restored')) || 'Palautettiin viimeisin istunto.');
      updateCounts();
    } catch {}
  }

  function updateCounts(){
    $$('[data-for]').forEach(span=>{
      const id = span.getAttribute('data-for');
      span.textContent = String(document.getElementById(id)?.value?.length || 0);
    });
  }

  // Hide target draft when languages are the same
  function syncTargetVisibility(){
    try {
      const same = String(state.targetLang||'').toLowerCase() === String(state.lang||'').toLowerCase();
      const lbl = document.querySelector('label[for="draftTarget"]');
      const ta  = document.getElementById('draftTarget');
      if (lbl) lbl.hidden = !!same;
      if (ta) ta.hidden = !!same;
    } catch {}
  }

  function scrollToSection(id){ const el = document.getElementById(id); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); }
  function tr(key, def){ try{ const v=window.i18n?.t(key); return (!v||v===key)?def:v; } catch{ return def; } }

  async function apiPost(path, body, timeoutMs=45000){
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), timeoutMs);
    try{
      const res = await fetch(path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      const json = await res.json().catch(()=>({}));
      return { ok: res.ok && json?.ok !== false, status: res.status, body: json };
    } catch(e){
      return { ok:false, status:0, body:{ ok:false, error:'network', message: String(e && e.name==='AbortError' ? 'timeout' : e) } };
    } finally { clearTimeout(t); }
  }

  // Bind inputs
  ;['jobTitle','jobUrl','adUrl','role','about','why','proof','draftNative','draftTarget'].forEach(id=>{
    const el = document.getElementById(id); if(!el) return;
    el.addEventListener('input', ()=>{ state.form[id] = el.value; updateCounts(); persist(); });
  });
  ;['jobTitle','jobUrl','adUrl','role'].forEach(id=>{
    const el = document.getElementById(id); if(!el) return;
    el.addEventListener('input', ()=>{ if (state.summary) { state.summary=''; setStatus(tr('status.scouting','Haetaan taustatietoja...')); } });
  });

  // Language selectors
  const langSel = $('#langSel'); if (langSel) { langSel.addEventListener('change', ()=>{
    state.lang = langSel.value; persist();
    if (window.i18n?.setLocale) {
      window.i18n.setLocale(langSel.value).then(()=>{
        try { window.i18n?.applyTranslations?.(document); } catch{}
        setStatus(window.i18n?.t('status.langSet', { name: langSel.options[langSel.selectedIndex].text }) || `Käyttöliittymän kieli: ${langSel.options[langSel.selectedIndex].text}`);
      }).catch(()=>{});
    }
    syncTargetVisibility();
  }); }
  const tgtSel = $('#targetLang'); if (tgtSel){ tgtSel.addEventListener('change', ()=>{ state.targetLang = tgtSel.value; persist(); syncTargetVisibility(); }); }

  // Privacy mode
  const privacyChk = $('#privacyMode'); const privacyTxt = $('#privacyModeText');
  if (privacyChk){ privacyChk.addEventListener('change', ()=>{
    state.privacyMode = !!privacyChk.checked;
    if (privacyTxt) privacyTxt.textContent = state.privacyMode ? (window.i18n?.t('privacy.on')||'Yksityisyystila päällä') : (window.i18n?.t('privacy.off')||'Yksityisyystila pois');
    if (state.privacyMode){ try{ sessionStorage.removeItem('jobs-ui'); }catch{} } else { persist(); }
  }); }

  // Terms gating
  const termsChk = $('#acceptTerms'); const termsWrap = $('.terms-accept');
  const gatedSelectors = '#toStep2,#toStep3,#exportDocx,#sendEmail,#clearAll';
  const gatedButtons = Array.from(document.querySelectorAll(gatedSelectors));
  function markGatedState(ok){ gatedButtons.forEach(b=>{ if(!b) return; b.setAttribute('aria-disabled', ok?'false':'true'); b.classList.toggle('is-disabled', !ok); }); }
  function nudgeTerms(){ setStatus(tr('status.termsRequired','Hyväksy käyttöehdot ennen jatkamista.')); if(termsWrap){ termsWrap.classList.add('attn'); setTimeout(()=>termsWrap.classList.remove('attn'),1200);} try{termsChk?.focus();}catch{} }
  function syncTerms(){ const ok = termsChk ? !!termsChk.checked : true; markGatedState(ok); if (ok && termsWrap) termsWrap.classList.remove('attn'); }
  document.addEventListener('click', (e)=>{ const el = e.target && (e.target.closest ? e.target.closest(gatedSelectors) : null); if(!el) return; const ok = termsChk ? !!termsChk.checked : true; if (!ok){ e.preventDefault(); e.stopPropagation(); nudgeTerms(); } }, true);
  if (termsChk){ termsChk.addEventListener('change', syncTerms); syncTerms(); } else { markGatedState(true); }

  // Step 1 -> 2 (Perplexity scout)
  let scoutInFlight = false;
  $('#toStep2')?.addEventListener('click', async ()=>{
    const anyFilled = ['jobTitle','jobUrl','adUrl','role'].some(id => !!state.form[id]?.trim());
    if (!anyFilled) { setStatus(window.i18n?.t('status.fillOne') || 'Täytä vähintään yksi kenttä vaiheessa 1.'); return; }
    if (scoutInFlight) return; if ((state.summary||'').trim()) return;
    const payload = { action:'perplexity_scout', jobTitle: state.form.jobTitle||'', jobUrl: state.form.jobUrl||'', adUrl: state.form.adUrl||'', role: state.form.role||'', lang: state.lang||'fi' };
    setStatus(tr('status.scouting','Haetaan taustatietoja...')); showProgress(); scoutInFlight = true;
    try{
      const res = await apiPost('api/answer.php', payload, 25000);
      if (res.ok && res.body && typeof res.body.summary === 'string') { state.summary = res.body.summary; setStatus(tr('status.scoutReady','Taustatiedot haettu.')); }
      else { setStatus(tr('status.scoutFailed','Taustatiedon haku epäonnistui:') + ' ' + (res.body?.message||res.body?.error||'virhe')); }
    } catch(e){ setStatus(tr('status.scoutFailed','Taustatiedon haku epäonnistui:') + ' ' + String(e)); }
    finally{ scoutInFlight=false; hideProgress(); }
    scrollToSection('step2-title');
  });

  // Step 2 -> 3 (Generate)
  let generateInFlight = false;
  $('#toStep3')?.addEventListener('click', async ()=>{
    if (generateInFlight) return; generateInFlight = true;
    const about = state.form.about||''; const why = state.form.why||''; const proof = state.form.proof||''; const summary = state.summary||'';
    const genMsg = tr('status.generating','Luodaan luonnosta...'); setStatus(genMsg); showBusy(genMsg); showProgress();
    const nativeLangNow = ($('#langSel')?.value || state.lang || 'fi'); const targetLangNow = ($('#targetLang')?.value || state.targetLang || nativeLangNow);
    const res = await apiPost('api/answer.php', { action:'generate_application', summary, about, why, proof, nativeLang: nativeLangNow, targetLang: targetLangNow }, 45000);
    if (res.ok && res.body){ const dn = String(res.body.draftNative||''); let dt = String(res.body.draftTarget||''); if (!dt && targetLangNow === nativeLangNow) { dt = dn; } state.form.draftNative=dn; state.form.draftTarget=dt; const dnEl=$('#draftNative'); const dtEl=$('#draftTarget'); if(dnEl) dnEl.value=dn; if(dtEl) dtEl.value=dt; setStatus(tr('status.draftCreated','Luonnos luotu.')); persist(); }
    else { setStatus(tr('status.generateFailed','Luonnoksen luonti epäonnistui:') + ' ' + (res.body?.message||res.body?.error||'virhe')); }
    hideBusy(); hideProgress(); generateInFlight=false; scrollToSection('step3-title');
  });

  // Export .txt
  $('#exportDocx')?.addEventListener('click', ()=>{
    const tchk = $('#acceptTerms'); if (tchk && !tchk.checked){ setStatus(window.i18n?.t('status.termsRequired')||'Hyväksy käyttöehdot ennen jatkamista.'); return; }
    const t = (k,vars={})=> window.i18n?.t(k, vars) || '';
    const content = [
      `${t('export.title') || 'Työpaikan nimi:'} ${state.form.jobTitle || '-'}`,
      `${t('export.website') || 'Työpaikan www:'} ${state.form.jobUrl || '-'}`,
      `${t('export.adUrl') || 'Ilmoituksen www:'} ${state.form.adUrl || '-'}`,
      `${t('export.role') || 'Ammattinimike:'} ${state.form.role || '-'}`,
      '', t('export.nativeHeader') || '--- Luonnos (oma kieli) ---', state.form.draftNative || '', '', t('export.targetHeader') || '--- Luonnos (kohdekieli) ---', state.form.draftTarget || ''
    ].join('\n');
    const blob = new Blob([content], { type:'text/plain;charset=utf-8' }); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(t('export.filename')||'tyohakemus-luonnos.txt'); a.click(); URL.revokeObjectURL(a.href); setStatus(t('status.draftDownloaded')||'Luonnos ladattu .txt-muodossa.');
  });

  // Send email
  $('#sendEmail')?.addEventListener('click', ()=>{
    const tchk = $('#acceptTerms'); if (tchk && !tchk.checked){ setStatus(window.i18n?.t('status.termsRequired')||'Hyväksy käyttöehdot ennen jatkamista.'); return; }
    const subject = encodeURIComponent(`${(window.i18n?.t('mail.subjectPrefix')||'Työhakemus:')} ${state.form.role || (window.i18n?.t('mail.subjectFallback')||'Hakemus')}`);
    const body = encodeURIComponent(`${state.form.draftTarget || state.form.draftNative || ''}\n\n${(window.i18n?.t('mail.footer')||'- Luotu Digiter Apply -sovelluksessa')}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });

  // Clear all
  $('#clearAll')?.addEventListener('click', ()=>{
    const ok = window.confirm(window.i18n?.t('confirm.clearAll')||'Tyhjennetäänkö lomake ja paikallinen välimuisti?'); if (!ok) return;
    Object.keys(state.form).forEach(k=>{ state.form[k]=''; const el=document.getElementById(k); if(el) el.value=''; }); state.step=1; try{ sessionStorage.removeItem('jobs-ui'); }catch{} updateCounts(); setStatus(window.i18n?.t('status.cleared')||'Lomake ja välimuisti tyhjennetty.');
  });

  // Init
  restore(); updateCounts(); syncTargetVisibility(); const yearEl=$('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
