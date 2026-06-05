/**
 * Markdown / plain text viewer.
 *
 * For Markdown: uses marked.js if available (src/assets/lib/marked.min.js),
 * falls back to raw <pre> display.
 */

export async function renderMdViewer(container, text, rawMode = false) {
  container.classList.add('p-4', 'overflow-auto');

  if (rawMode) {
    container.innerHTML = `<pre class="text-sm text-[var(--color-text)] whitespace-pre-wrap font-mono">${escHtml(text)}</pre>`;
    return;
  }

  // Try to load marked.js
  let html;
  try {
    const { marked } = await import('../../assets/lib/marked.min.js');
    // Basic sanitization: no script tags in output
    const raw = marked.parse(text, { breaks: true });
    html = raw.replace(/<script[\s\S]*?<\/script>/gi, '');
  } catch {
    // Fallback: render as plain text
    html = `<pre class="text-sm text-[var(--color-text)] whitespace-pre-wrap">${escHtml(text)}</pre>`;
  }

  container.innerHTML = `
    <div class="prose prose-sm max-w-none text-[var(--color-text)]
                [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold
                [&_h3]:font-semibold [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-4
                [&_ol]:list-decimal [&_ol]:pl-4 [&_code]:bg-[var(--color-border)]
                [&_code]:px-1 [&_code]:rounded [&_pre]:bg-[var(--color-surface)]
                [&_pre]:p-3 [&_pre]:rounded [&_blockquote]:border-l-4
                [&_blockquote]:border-[var(--color-primary)] [&_blockquote]:pl-4
                [&_blockquote]:text-[var(--color-text-muted)]">
      ${html}
    </div>
  `;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
