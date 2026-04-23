import type { Quote } from './quotes';

export const STREEP_REGEX = /\b(Streep\w*|Meryl\w*|Streepl\w*|aStreep\w*|Strept\w*)\b/gi;

/**
 * Matches any Walken* word (including internal-capital compounds like
 * sideWalken, jayWalken, Walkenman). Used in V2 mode instead of STREEP_REGEX.
 */
export const WALKEN_REGEX = /Walken\w*/g;

export type CardMode = 'streep' | 'walken';
let currentMode: CardMode = 'streep';
export function setCardMode(mode: CardMode): void { currentMode = mode; }
export function getCardMode(): CardMode { return currentMode; }
function activeRegex(): RegExp {
  return currentMode === 'walken' ? WALKEN_REGEX : STREEP_REGEX;
}

const card = () => document.getElementById('meme-card')!;
const memeImage = () => document.getElementById('meme-image')!;
const memeTextTop = () => document.getElementById('meme-text-top')!;
const memeTextBottom = () => document.getElementById('meme-text-bottom')!;
const memeAttribution = () => document.getElementById('meme-attribution')!;
const backOriginal = () => document.getElementById('back-original')!;
const backAttribution = () => document.getElementById('back-attribution')!;
const backSource = () => document.getElementById('back-source')!;
const backCategory = () => document.getElementById('back-category')!;
const backCollection = () => document.getElementById('back-collection')!;
const placeholder = () => document.getElementById('card-placeholder')!;

function highlightStreepWords(text: string): string {
  return text.replace(activeRegex(), (match) => {
    return `<span class="gold-word">${match}</span>`;
  });
}

/**
 * Split text into top and bottom portions for classic meme layout.
 * Short quotes (under ~60 chars) go centered (bottom only with .solo class).
 * Longer quotes split roughly in half at a sentence/clause boundary.
 */
export function highlightStreepWordsHTML(text: string): string {
  return highlightStreepWords(text);
}

export function splitMemeText(text: string): { top: string; bottom: string } {
  // Very short quotes (single short phrase, no natural break) —
  // put them at the BOTTOM only (classic meme format: single punchline below)
  if (text.length < 20 && !/[,;:]/.test(text)) {
    return { top: '', bottom: text };
  }

  // Try to split at sentence boundaries first (. ! ? ;)
  const sentenceBreaks = [...text.matchAll(/[.!?;]\s+/g)];
  if (sentenceBreaks.length > 0) {
    // Find the break closest to the middle
    const mid = text.length / 2;
    let bestBreak = sentenceBreaks[0];
    let bestDist = Math.abs((bestBreak.index! + bestBreak[0].length) - mid);
    for (const b of sentenceBreaks) {
      const dist = Math.abs((b.index! + b[0].length) - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestBreak = b;
      }
    }
    const splitAt = bestBreak.index! + bestBreak[0].length;
    return {
      top: text.substring(0, splitAt).trim(),
      bottom: text.substring(splitAt).trim(),
    };
  }

  // Fallback: split at comma or clause boundary nearest middle
  const clauseBreaks = [...text.matchAll(/[,\u2014\u2013]\s*/g)];
  if (clauseBreaks.length > 0) {
    const mid = text.length / 2;
    let bestBreak = clauseBreaks[0];
    let bestDist = Math.abs((bestBreak.index! + bestBreak[0].length) - mid);
    for (const b of clauseBreaks) {
      const dist = Math.abs((b.index! + b[0].length) - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestBreak = b;
      }
    }
    const splitAt = bestBreak.index! + bestBreak[0].length;
    return {
      top: text.substring(0, splitAt).trim(),
      bottom: text.substring(splitAt).trim(),
    };
  }

  // Last resort: split at the word boundary nearest the middle
  const mid = Math.floor(text.length / 2);
  const spaceAfter = text.indexOf(' ', mid);
  const spaceBefore = text.lastIndexOf(' ', mid);
  const splitAt = (spaceAfter !== -1 && (spaceAfter - mid) < (mid - spaceBefore))
    ? spaceAfter
    : spaceBefore;

  if (splitAt > 0) {
    return {
      top: text.substring(0, splitAt).trim(),
      bottom: text.substring(splitAt).trim(),
    };
  }

  return { top: '', bottom: text };
}

function collectionLabel(collection: string): string {
  return collection.replace(/_/g, ' ').replace(/\bto\b/g, '\u2192');
}

function applySizeClass(el: HTMLElement, text: string): void {
  el.classList.remove('text-sm', 'text-md');
  if (text.length > 120) {
    el.classList.add('text-sm');
  } else if (text.length > 70) {
    el.classList.add('text-md');
  }
}

export function renderMemeCard(quote: Quote, imageUrl: string): void {
  placeholder().classList.add('hidden');

  // Front face — image
  if (imageUrl) {
    memeImage().style.backgroundImage = `url(${imageUrl})`;
  } else {
    memeImage().style.backgroundImage = 'none';
    memeImage().style.background = `linear-gradient(135deg, ${getComputedStyle(document.documentElement).getPropertyValue('--smoke')} 0%, #1a1a1a 100%)`;
  }

  // Split text into top/bottom
  const displayText = quote.streepified || quote.quote;
  const { top, bottom } = splitMemeText(displayText);

  const topEl = memeTextTop();
  const bottomEl = memeTextBottom();

  // Always remove solo — short quotes now sit at the bottom, not centered
  bottomEl.classList.remove('solo');
  topEl.innerHTML = top ? highlightStreepWords(top) : '';
  bottomEl.innerHTML = highlightStreepWords(bottom);
  if (top) applySizeClass(topEl, top);
  applySizeClass(bottomEl, bottom);

  memeAttribution().textContent = `\u2014 ${quote.attribution}`;

  // Back face
  backOriginal().textContent = quote.quote;
  backAttribution().textContent = `\u2014 ${quote.attribution}`;
  backSource().textContent = quote.source;
  backCategory().textContent = quote.category;
  backCollection().textContent = collectionLabel(quote.collection);

  // Show card
  const c = card();
  c.classList.remove('flipped', 'exit-left', 'exit-right', 'snapping');
  c.style.transform = '';
  c.classList.add('visible');
}

export function flipCard(): void {
  card().classList.toggle('flipped');
}

export function isFlipped(): boolean {
  return card().classList.contains('flipped');
}

export function unflipCard(): void {
  card().classList.remove('flipped');
}

export function resetCard(): void {
  const c = card();
  c.classList.remove('visible', 'flipped', 'shaking', 'exit-left', 'exit-right', 'snapping', 'dragging');
  c.style.transform = '';
  placeholder().classList.remove('hidden');
}
