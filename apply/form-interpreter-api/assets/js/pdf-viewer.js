/* ===========================================================
   PDF VIEWER (pdf.js) WITH CLICKABLE OVERLAY
   Uses textLayer for accurate positioning (no DocAI required)
=========================================================== */

(function () {
  let pdfDoc = null;
  let currentPage = 1;

  const pageTexts = new Map();
  let totalPages = 0;
  let currentFileName = "";

  function getElements() {
    return {
      fileInput: document.getElementById("pdfUpload"),
      prevBtn: document.querySelector(".pdf-controls-top .ghost-button:first-child"),
      nextBtn: document.querySelector(".pdf-controls-top .ghost-button:last-child"),
      pageIndicator: document.querySelector(".pdf-page-indicator"),
      controls: document.getElementById("pdfControls"),
      placeholder: document.querySelector(".pdf-placeholder"),
    };
  }

  function ensureViewerElements() {
    const { placeholder } = getElements();
    if (!placeholder) return {};

    let renderHost = placeholder.querySelector(".pdf-render");
    if (!renderHost) {
      placeholder.innerHTML = "";
      renderHost = document.createElement("div");
      renderHost.className = "pdf-render";
      placeholder.appendChild(renderHost);
    }

    let canvas = renderHost.querySelector("canvas.pdf-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "pdf-canvas";
      renderHost.appendChild(canvas);
    }

    let overlay = renderHost.querySelector(".pdf-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "pdf-overlay textLayer";
      renderHost.appendChild(overlay);
    }

    return { canvas, overlay, renderHost };
  }

  async function renderPage(pageNum) {
    if (!pdfDoc) return;
    const { canvas, overlay, renderHost } = ensureViewerElements();
    if (!canvas || !overlay || !renderHost) return;

    const page = await pdfDoc.getPage(pageNum);
    const placeholder = renderHost.closest(".pdf-placeholder");

    const baseViewport = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(
      300,
      (placeholder ? placeholder.clientWidth - 24 : baseViewport.width)
    );
    const viewport = page.getViewport({ scale: availableWidth / baseViewport.width });

    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    renderHost.style.width = `${viewport.width}px`;
    renderHost.style.height = `${viewport.height}px`;

    overlay.innerHTML = "";
    overlay.style.width = `${viewport.width}px`;
    overlay.style.height = `${viewport.height}px`;
    overlay.style.transform = "none";
    overlay.style.pointerEvents = "none";
    overlay.style.setProperty("--scale-factor", viewport.scale);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const textContent = await page.getTextContent();
    // Cache full text for context
    const combinedText = textContent.items.map((i) => i.str).join(" ");
    pageTexts.set(pageNum, combinedText);

    const textDivs = [];
    await pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: overlay,
      viewport,
      textDivs,
    }).promise;

    textDivs.forEach((el, idx) => {
      const content = textContent.items[idx]?.str || el.textContent || "";
      el.classList.add("pdf-field-box");
      el.style.pointerEvents = "auto";
      el.addEventListener("click", async () => {
        if (typeof callAnalyzeField !== "function") return;
        try {
          const formName = currentFileName || (document.querySelector("#pdfUpload")?.files?.[0]?.name) || "";
          const pageContext = pageTexts.get(currentPage) || "";
          const result = await callAnalyzeField({
            fieldLabel: content,
            sectionContext: `Page ${currentPage}`,
            formName,
            pageContext,
            fieldType: "text",
          });
          updateAssistantFromApi(result);
        } catch (err) {
          console.error("Field analyze failed:", err);
          setAssistantError("Palvelu ei vastaa.");
        }
      });
    });
  }

  function updateNav() {
    const { pageIndicator, prevBtn, nextBtn, controls } = getElements();
    if (pageIndicator && pdfDoc) {
      pageIndicator.textContent = `Sivu ${currentPage} / ${pdfDoc.numPages}`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = pdfDoc ? currentPage >= pdfDoc.numPages : true;
    if (controls) {
      controls.style.display = pdfDoc && pdfDoc.numPages > 1 ? "flex" : "none";
    }
  }

  async function loadPdf(arrayBuffer) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages = pdfDoc.numPages;
    currentPage = 1;
    updateNav();
    await renderPage(currentPage);
  }

  async function handleFile(file) {
    if (!file || file.type !== "application/pdf") return;
    currentFileName = file.name || "";
    const arrayBuffer = await file.arrayBuffer();
    await loadPdf(arrayBuffer);
  }

  function initControls() {
    const { fileInput, prevBtn, nextBtn, placeholder } = getElements();
    if (prevBtn) {
      prevBtn.addEventListener("click", async () => {
        if (!pdfDoc || currentPage <= 1) return;
        currentPage -= 1;
        updateNav();
        await renderPage(currentPage);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", async () => {
        if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
        currentPage += 1;
        updateNav();
        await renderPage(currentPage);
      });
    }
    if (fileInput) {
      fileInput.addEventListener("change", async (e) => {
        const [file] = e.target.files || [];
        if (!file) return;
        await handleFile(file);
      });
    }

    if (placeholder) {
      ["dragenter", "dragover"].forEach((evt) => {
        placeholder.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          placeholder.classList.add("is-dragover");
        });
      });
      ["dragleave", "drop"].forEach((evt) => {
        placeholder.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          placeholder.classList.remove("is-dragover");
        });
      });
      placeholder.addEventListener("drop", async (e) => {
        const file = e.dataTransfer.files?.[0];
        await handleFile(file);
      });
    }

    document.addEventListener("dragover", (e) => e.preventDefault());
    document.addEventListener("drop", (e) => e.preventDefault());
  }

  document.addEventListener("DOMContentLoaded", () => {
    initControls();
  });
})();
