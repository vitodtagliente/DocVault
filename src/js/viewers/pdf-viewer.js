/**
 * PDF viewer using pdfjs-dist (standalone build).
 *
 * Requires:
 *   src/assets/lib/pdf.mjs
 *   src/assets/lib/pdf.worker.mjs
 *
 * Download from: https://mozilla.github.io/pdf.js/getting_started/
 * or: https://unpkg.com/pdfjs-dist/build/pdf.min.mjs
 */

export async function renderPdfViewer(container, pdfData) {
  container.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <button class="btn-ghost text-sm px-2 py-1" id="pdf-prev">← Prec</button>
        <span class="text-sm text-[var(--color-text)]" id="pdf-page-info">1 / ?</span>
        <button class="btn-ghost text-sm px-2 py-1" id="pdf-next">Succ →</button>
        <button class="btn-ghost text-sm px-2 py-1" id="pdf-zoom-in">🔍+</button>
        <button class="btn-ghost text-sm px-2 py-1" id="pdf-zoom-out">🔍−</button>
      </div>
      <div class="flex-1 overflow-auto flex justify-center bg-[var(--color-surface)] p-4" id="pdf-canvas-container">
        <canvas id="pdf-canvas" class="shadow-lg"></canvas>
      </div>
    </div>
  `;

  let pdfjsLib;
  try {
    pdfjsLib = await import('../../assets/lib/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/assets/lib/pdf.worker.mjs', location.href).href;
  } catch {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-8 text-[var(--color-text-muted)] text-sm">
        <p>📄 Visualizzatore PDF non disponibile.</p>
        <p class="text-xs mt-1">Aggiungi pdf.mjs in src/assets/lib/</p>
      </div>
    `;
    return;
  }

  let pdfDoc, pageNum = 1, scale = 1.5;
  const canvas = container.querySelector('#pdf-canvas');
  const ctx = canvas.getContext('2d');

  const renderPage = async (num) => {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport }).promise;
    container.querySelector('#pdf-page-info').textContent = `${num} / ${pdfDoc.numPages}`;
  };

  try {
    pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
    await renderPage(pageNum);
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm p-4">Errore PDF: ${err}</p>`;
    return;
  }

  container.querySelector('#pdf-prev')?.addEventListener('click', async () => {
    if (pageNum <= 1) return;
    await renderPage(--pageNum);
  });
  container.querySelector('#pdf-next')?.addEventListener('click', async () => {
    if (pageNum >= pdfDoc.numPages) return;
    await renderPage(++pageNum);
  });
  container.querySelector('#pdf-zoom-in')?.addEventListener('click', async () => {
    scale = Math.min(scale + 0.25, 4);
    await renderPage(pageNum);
  });
  container.querySelector('#pdf-zoom-out')?.addEventListener('click', async () => {
    scale = Math.max(scale - 0.25, 0.5);
    await renderPage(pageNum);
  });
}
