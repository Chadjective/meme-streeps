import { getGalleryEntries, getGalleryEntry, type GalleryEntry } from './gallery';
import { splitMemeText, highlightStreepWordsHTML } from './meme-card';
import { shareMeme } from './share';

const screen = () => document.getElementById('gallery-screen')!;
const grid = () => document.getElementById('gallery-grid')!;
const countEl = () => document.getElementById('gallery-count')!;
const emptyEl = () => document.getElementById('gallery-empty')!;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTile(entry: GalleryEntry): string {
  const { top, bottom } = splitMemeText(entry.quoteText);
  const topHTML = top ? highlightStreepWordsHTML(escapeHtml(top)) : '';
  const bottomHTML = bottom ? highlightStreepWordsHTML(escapeHtml(bottom)) : '';
  const badgeClass = entry.vote === 'streets_ahead' ? 'gallery-item__badge--sa' : 'gallery-item__badge--fts';
  const badgeText = entry.vote === 'streets_ahead' ? 'STREETS AHEAD' : 'FOR THE STREETS';
  const sizeClass =
    entry.quoteText.length > 120
      ? ' gallery-item__text--sm'
      : entry.quoteText.length > 70
        ? ' gallery-item__text--md'
        : '';

  return `
    <article class="gallery-item" data-id="${escapeHtml(entry.id)}">
      <div class="gallery-item__image" style="background-image: url('${escapeHtml(entry.imageUrl)}')">
        ${top ? `<div class="gallery-item__text gallery-item__text--top${sizeClass}">${highlightStreepWordsHTML(escapeHtml(top))}</div>` : ''}
        <div class="gallery-item__text gallery-item__text--bottom${sizeClass}">${bottomHTML || topHTML}</div>
        <span class="gallery-item__badge ${badgeClass}">${badgeText}</span>
        <button class="gallery-item__share" aria-label="Share" data-share-id="${escapeHtml(entry.id)}">⇪</button>
      </div>
      <div class="gallery-item__attribution">— ${escapeHtml(entry.attribution)}</div>
    </article>
  `;
}

export function renderGalleryGrid(): void {
  const entries = getGalleryEntries();
  countEl().textContent = String(entries.length);

  if (entries.length === 0) {
    grid().innerHTML = '';
    emptyEl().hidden = false;
    return;
  }

  emptyEl().hidden = true;
  grid().innerHTML = entries.map(renderTile).join('');
}

export function openGallery(): void {
  renderGalleryGrid();
  screen().hidden = false;
  // Force reflow so the transform transition kicks in
  void screen().offsetWidth;
  screen().classList.add('gallery-screen--open');

  // Push history state so Android hardware back closes the gallery
  if (!history.state?.gallery) {
    history.pushState({ gallery: true }, '');
  }
}

export function closeGallery(): void {
  const s = screen();
  s.classList.remove('gallery-screen--open');
  // Hide after transition completes
  setTimeout(() => {
    if (!s.classList.contains('gallery-screen--open')) {
      s.hidden = true;
    }
  }, 350);

  // If we pushed a gallery state, pop it (but only if we're still on it)
  if (history.state?.gallery) {
    history.back();
  }
}

export function isGalleryOpen(): boolean {
  return screen().classList.contains('gallery-screen--open');
}

export function initGalleryView(): void {
  const backBtn = document.getElementById('gallery-back');
  backBtn?.addEventListener('click', closeGallery);

  // Event delegation for share buttons on tiles
  grid().addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const shareBtn = target.closest<HTMLElement>('.gallery-item__share');
    if (!shareBtn) return;
    e.stopPropagation();
    const id = shareBtn.getAttribute('data-share-id');
    if (!id) return;
    const entry = getGalleryEntry(id);
    if (!entry) return;

    shareBtn.classList.add('sharing');
    try {
      await shareMeme(entry);
    } catch (err) {
      console.warn('[MemeStreeps] Share failed:', err);
    } finally {
      shareBtn.classList.remove('sharing');
    }
  });

  // Android hardware back closes the gallery
  window.addEventListener('popstate', () => {
    if (isGalleryOpen()) {
      screen().classList.remove('gallery-screen--open');
      setTimeout(() => {
        if (!screen().classList.contains('gallery-screen--open')) {
          screen().hidden = true;
        }
      }, 350);
    }
  });
}
