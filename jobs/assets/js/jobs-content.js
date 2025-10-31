// ---- Konfiguraatio ----
const STRAPI_URL = 'http://localhost:1337';
const STRAPI_TOKEN = ''; // (valinnainen) read-only token devissä

const content = { jobs: null, tips: [] }; // globaali tila

function authHeaders() {
  return STRAPI_TOKEN ? { 'Authorization': `Bearer ${STRAPI_TOKEN}` } : {};
}

async function strapiGet(path) {
  const res = await fetch(`${STRAPI_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Strapi ${res.status} @ ${path}`);
  return res.json();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

// ---- Renderöinnit ----
function renderJobsPage(attrs) {
  const h1 = document.getElementById('hero-title');
  const p  = document.getElementById('hero-intro');
  if (h1) h1.textContent = attrs.heroTitle || 'Työpaikat';
  if (p)  p.innerHTML = (attrs.heroIntro || '').toString().replace(/\n/g,'<br>');
}

function renderTips(items) {
  const ul = document.getElementById('tips-list');
  if (!ul) return;
  if (!items.length) { ul.innerHTML = '<li>Ei vinkkejä vielä.</li>'; return; }
  ul.innerHTML = items.map(it => {
    const a = it.attributes || {};
    const t = escapeHtml(a.shortTip || 'Vinkki');
    const c = a.context ? `<br><span>${escapeHtml(a.context)}</span>` : '';
    return `<li><strong>${t}</strong>${c}</li>`;
  }).join('');
}

// ---- Haku + init ----
async function loadContent() {
  try {
    const [jobsJson, tipsJson] = await Promise.all([
      strapiGet('/api/jobs-page'),
      strapiGet('/api/tips?sort=createdAt:desc&pagination[pageSize]=5')
    ]);

    content.jobs = jobsJson?.data?.attributes || {};
    content.tips = tipsJson?.data || [];

    renderJobsPage(content.jobs);
    renderTips(content.tips);

    // Ilmoita UI:lle, jos se haluaa reagointia
    window.dispatchEvent(new CustomEvent('jobsContentLoaded', { detail: content }));
  } catch (err) {
    console.warn('Sisällön haku epäonnistui:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadContent);

// Tarvittaessa UI voi lukea tilan:
window.JobsContent = content;
window.addEventListener('jobsContentLoaded', (e) => {
  console.log('Tips ladattu:', e.detail.tips?.length || 0);
});