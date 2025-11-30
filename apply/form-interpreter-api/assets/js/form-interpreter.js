/* ===========================================================
   FORM INTERPRETER 2.0 — FRONTEND LOGIC
   API_BASE → CloudShell port 8081
   =========================================================== */

// 🔧 Tunnista CloudShell-domain automaattisesti
function resolveApiBase() {
  const host = window.location.host;

  // CloudShell-formaatti:
  // 8080-<session>.cloudshell.dev
  if (host.includes("cloudshell.dev")) {
    const session = host.split("-").slice(1).join("-");
    return `https://8081-${session}`;
  }

  // Default: same origin as page
  return window.location.origin;
}

const API_BASE = resolveApiBase() || window.location.origin;
console.log("API_BASE =", API_BASE);

let currentPdfFile = null;
let currentPdfUrl = null;

/* ===========================================================
   I18N HELPERS
=========================================================== */

function getCurrentLang() {
  const select = document.querySelector(".lang-switch select");
  return select ? select.value : "fi";
}

/* ===========================================================
   ASSISTANT UI HELPERS
=========================================================== */

function setAssistantLoading(isLoading) {
  const panel = document.querySelector(".assistant-panel");
  if (!panel) return;

  panel.classList.toggle("loading", isLoading);

  if (isLoading) {
    panel.querySelector(".assistant-content").innerHTML =
      `<p>Ladataan…</p>`;
  }
}

function setAssistantError(text = "Virhe palvelussa.") {
  const panel = document.querySelector(".assistant-content");
  if (!panel) return;

  panel.innerHTML = `<p style="color:red">${text}</p>`;
}

function updateAssistantFromApi(result) {
  const root = document.querySelector(".assistant-content");
  if (!root) return;

  const ohje = result.explanation_target_lang || "";
  const miksi = result.instructions_target_lang || "";
  const esimerkki = result.example_target_lang || "";
  const vinkitRaw = result.tips_target_lang || "";
  const vinkit = (vinkitRaw && vinkitRaw.trim()) || "";
  const showVinkit = vinkit.length > 0;

  let html = `
    <section class="assistant-block">
      <h3>Selkokielinen ohje</h3>
      <p>${ohje}</p>
    </section>

    <section class="assistant-block assistant-block-note">
      <h3>Miksi tätä kysytään</h3>
      <p>${miksi}</p>
    </section>

    <section class="assistant-block assistant-block-info">
      <h3>Esimerkki</h3>
      <p>${esimerkki}</p>
    </section>
  `;

  if (showVinkit) {
    html += `
      <section class="assistant-block assistant-block-purpose">
        <h3>Vinkit</h3>
        <p>${vinkit}</p>
      </section>
    `;
  }

  root.innerHTML = html;
}

/* ===========================================================
   API CALL — /analyze-field
=========================================================== */

async function callAnalyzeField({ fieldLabel, sectionContext, fieldType }) {
  const targetLang = getCurrentLang();

  const payload = {
    field_context: fieldLabel,
    section_context: sectionContext,
    field_type: fieldType,
    target_lang: targetLang
  };

  const resp = await fetch(`${API_BASE}/analyze-field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  return resp.json();
}

/* ===========================================================
   PDF UPLOAD & PREVIEW
=========================================================== */

function renderPdfPreview(file) {
  const placeholder = document.querySelector(".pdf-placeholder");
  if (!placeholder || !file) return;

  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
  }
  currentPdfUrl = URL.createObjectURL(file);

  placeholder.innerHTML = "";

  const viewer = document.createElement("object");
  viewer.className = "pdf-preview";
  viewer.type = "application/pdf";
  viewer.data = currentPdfUrl;
  viewer.setAttribute("aria-label", file.name);
  viewer.textContent = "PDF-esikatselu ei latautunut.";

  placeholder.appendChild(viewer);
}

async function analyzePdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await fetch(`${API_BASE}/analyze-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const data = await resp.json();
  if (data.status !== "ok") {
    throw new Error(data.message || "PDF-analyysi epäonnistui.");
  }

  return data;
}

function initPdfUpload() {
  const fileInput = document.getElementById("pdfUpload");
  const uploadBtn = document.getElementById("uploadBtn");
  const pageIndicator = document.querySelector(".pdf-page-indicator");

  if (!fileInput || !uploadBtn) return;

  const setStatus = (text) => {
    if (pageIndicator) {
      pageIndicator.textContent = text;
    }
  };

  fileInput.addEventListener("change", (e) => {
    const [file] = e.target.files || [];
    currentPdfFile = file || null;

    if (currentPdfFile) {
      setStatus(currentPdfFile.name);
      if (!(window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions)) {
        renderPdfPreview(currentPdfFile);
      }
    } else {
      setStatus("Sivu 1 / -");
    }
  });

  uploadBtn.addEventListener("click", async () => {
    if (!currentPdfFile) {
      setStatus("Valitse PDF ensin.");
      return;
    }

    uploadBtn.disabled = true;
    const originalLabel = uploadBtn.textContent;
    uploadBtn.textContent = "Analysoidaan...";
    setStatus("Analysoidaan...");

    try {
      const data = await analyzePdf(currentPdfFile);
      const pages = data.page_count || 1;
      console.log("analyze-pdf result:", data);
      setStatus(`Sivu 1 / ${pages}`);
    } catch (err) {
      console.error("analyze-pdf error:", err);
      setStatus("PDF-analyysi epäonnistui.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = originalLabel;
    }
  });

  window.addEventListener("beforeunload", () => {
    if (currentPdfUrl) {
      URL.revokeObjectURL(currentPdfUrl);
    }
  });
}

/* ===========================================================
   DEMO: KENTÄN KLIKKAUS
=========================================================== */

function initFieldDemoClick() {
  const field = document.querySelector(".pdf-field-placeholder");
  if (!field) return;

  field.style.cursor = "pointer";

  field.addEventListener("click", async () => {
    const lang = getCurrentLang();

    const demoField = {
      fieldLabel: lang === "en" ? "First name" : "Etunimi",
      sectionContext: lang === "en" ? "Applicant details" : "Hakijan tiedot",
      fieldType: "text"
    };

    try {
      setAssistantLoading(true);
      const result = await callAnalyzeField(demoField);
      updateAssistantFromApi(result);
    } catch (err) {
      console.error("analyze-field error:", err);
      setAssistantError("Palvelu ei vastaa.");
    } finally {
      setAssistantLoading(false);
    }
  });
}

/* ===========================================================
   LANG SELECTOR
=========================================================== */
// Language handling lives in ui-shell.js; keep helper getCurrentLang() for API payloads.

/* ===========================================================
   TERMS ACCEPTANCE
=========================================================== */

function initTerms() {
  const checkbox = document.getElementById("termsCheckbox");
  const startButton = document.getElementById("startButton");
  const mainLayout = document.getElementById("mainLayout");
  const banner = document.getElementById("termsBanner");

  if (!checkbox || !startButton || !mainLayout || !banner) return;

  checkbox.addEventListener("change", () => {
    startButton.disabled = !checkbox.checked;
  });

  startButton.addEventListener("click", () => {
    if (!checkbox.checked) return;

    mainLayout.classList.remove("main-layout--locked");
    banner.style.display = "none";
  });
}

/* ===========================================================
   INIT ALL
=========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initFieldDemoClick();
  initPdfUpload();
  initTerms();
});
