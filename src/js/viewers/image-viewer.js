/**
 * Image viewer — zoom, pan, rotate. No external deps.
 */

export function renderImageViewer(container, imageUrl) {
  container.innerHTML = `
    <div class="relative w-full h-full flex flex-col bg-[var(--color-surface)]">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <button class="btn-ghost text-sm px-2 py-1" id="iv-zoom-in">🔍+</button>
        <button class="btn-ghost text-sm px-2 py-1" id="iv-zoom-out">🔍−</button>
        <button class="btn-ghost text-sm px-2 py-1" id="iv-fit">⊡ Adatta</button>
        <button class="btn-ghost text-sm px-2 py-1" id="iv-rotate-l">↺</button>
        <button class="btn-ghost text-sm px-2 py-1" id="iv-rotate-r">↻</button>
      </div>
      <div class="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
           id="iv-area" style="min-height:200px">
        <img id="iv-img" src="${imageUrl}" alt="Documento"
             style="max-width:100%;max-height:100%;transform-origin:center center;user-select:none;"
             draggable="false" />
      </div>
    </div>
  `;

  const img = container.querySelector('#iv-img');
  let scale = 1;
  let rotation = 0;
  let tx = 0, ty = 0;
  let dragging = false;
  let startX, startY;

  const update = () => {
    img.style.transform = `translate(${tx}px,${ty}px) scale(${scale}) rotate(${rotation}deg)`;
  };

  container.querySelector('#iv-zoom-in')?.addEventListener('click', () => { scale = Math.min(scale * 1.2, 10); update(); });
  container.querySelector('#iv-zoom-out')?.addEventListener('click', () => { scale = Math.max(scale / 1.2, 0.1); update(); });
  container.querySelector('#iv-fit')?.addEventListener('click', () => { scale = 1; tx = 0; ty = 0; update(); });
  container.querySelector('#iv-rotate-l')?.addEventListener('click', () => { rotation -= 90; update(); });
  container.querySelector('#iv-rotate-r')?.addEventListener('click', () => { rotation += 90; update(); });

  // Drag to pan
  img.addEventListener('mousedown', (e) => {
    dragging = true; startX = e.clientX - tx; startY = e.clientY - ty;
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    tx = e.clientX - startX; ty = e.clientY - startY; update();
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  // Scroll to zoom
  container.querySelector('#iv-area')?.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = e.deltaY < 0 ? Math.min(scale * 1.1, 10) : Math.max(scale / 1.1, 0.1);
    update();
  }, { passive: false });
}
