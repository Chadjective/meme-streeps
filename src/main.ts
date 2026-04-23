import './style.css';
import { getRandomQuote, type Quote } from './quotes';
import { getRandomWalkenQuote } from './walken-quotes';
import { getRandomImage, getWalkenImage } from './images';
import { renderMemeCard, resetCard, flipCard, unflipCard, isFlipped, setCardMode } from './meme-card';

// ---------------------------------------------------------------------------
// V2 mode toggle. Visit /?v=walken to switch from Streep (default) to Walken.
// ---------------------------------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const MODE: 'streep' | 'walken' = urlParams.get('v') === 'walken' ? 'walken' : 'streep';
setCardMode(MODE);
document.documentElement.dataset.mode = MODE;

/**
 * Swaps every [data-streep][data-walken] element's text to the active mode.
 * This covers the header title, subtitle, vote counter labels, swipe badges,
 * swipe hints, gallery header, empty state, motion modal, and <title>.
 */
function applyModeLabels(mode: 'streep' | 'walken'): void {
  const attr = mode === 'walken' ? 'data-walken' : 'data-streep';
  document.querySelectorAll<HTMLElement>('[data-streep][data-walken]').forEach((el) => {
    const text = el.getAttribute(attr);
    if (text != null) el.textContent = text;
  });
}
applyModeLabels(MODE);
import { initSwipe, type VoteDirection } from './swipe';
import { initShake } from './shake';
import { recordVote, incrementSession, getSessionCounts } from './voting';
import { playShakeAnimation, playCardExit, playEdgeFlash } from './animations';
import { addGalleryEntry } from './gallery';
import { openGallery, initGalleryView } from './gallery-view';
import { shareMeme } from './share';

let currentQuote: Quote | null = null;
let currentImageUrl: string = '';
let isAnimating = false;

const cardEl = document.getElementById('meme-card')!;
const shakeBtn = document.getElementById('shake-btn')!;
const galleryBtn = document.getElementById('gallery-btn')!;
const shareBtn = document.getElementById('share-btn')!;
const countLeft = document.getElementById('count-left')!;
const countRight = document.getElementById('count-right')!;

function updateCounters() {
  const counts = getSessionCounts();
  countLeft.textContent = String(counts.for_the_streets);
  countRight.textContent = String(counts.streets_ahead);
}

async function generateMeme() {
  if (isAnimating) return;
  isAnimating = true;

  const quote = MODE === 'walken' ? getRandomWalkenQuote() : getRandomQuote();
  const image = MODE === 'walken' ? getWalkenImage(quote.id) : getRandomImage();
  currentQuote = quote;
  currentImageUrl = image;

  renderMemeCard(quote, image);
  await playShakeAnimation(cardEl);
  isAnimating = false;
}

async function handleVote(direction: VoteDirection) {
  if (isAnimating || !currentQuote) return;
  isAnimating = true;

  const side = direction === 'for_the_streets' ? 'left' : 'right';

  // Add to gallery BEFORE recordVote (which may no-op if already voted)
  addGalleryEntry({
    quoteId: currentQuote.id,
    quoteText: currentQuote.streepified || currentQuote.quote,
    originalText: currentQuote.quote,
    attribution: currentQuote.attribution,
    imageUrl: currentImageUrl,
    vote: direction,
  });

  // Record vote
  recordVote(currentQuote.id, direction);
  incrementSession(direction);
  updateCounters();

  // Animate
  playEdgeFlash(side);
  await playCardExit(cardEl, side);

  // Reset after delay
  setTimeout(() => {
    resetCard();
    currentQuote = null;
    currentImageUrl = '';
    isAnimating = false;
  }, 450);
}

// Wire up swipe
initSwipe(cardEl, {
  onVote: handleVote,
  onFlip: flipCard,
  onUnflip: unflipCard,
  isFlipped,
});

// Wire up shake button
shakeBtn.addEventListener('click', generateMeme);

// Wire up device shake
initShake(generateMeme);

// Wire up gallery button
galleryBtn.addEventListener('click', openGallery);
initGalleryView();

// Wire up share button on card front
shareBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!currentQuote || !currentImageUrl) return;
  shareBtn.classList.add('sharing');
  try {
    await shareMeme({
      id: currentQuote.id,
      quoteText: currentQuote.streepified || currentQuote.quote,
      attribution: currentQuote.attribution,
      imageUrl: currentImageUrl,
    });
  } catch (err) {
    console.warn('[MemeStreeps] Share failed:', err);
  } finally {
    shareBtn.classList.remove('sharing');
  }
});

// Prevent share button taps from triggering swipe gestures
['touchstart', 'mousedown', 'pointerdown'].forEach((ev) => {
  shareBtn.addEventListener(ev, (e) => e.stopPropagation());
});

// Aggressively unregister ANY existing service worker and nuke all caches.
// The previous SW poisoned returning visitors with stale content when we
// switched from root to /meme-streeps/ subpath. Keeping this cleanup in
// both dev and prod until the SW design is rewritten base-path-aware.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => { /* ignore */ });
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => { /* ignore */ });
  }
  // Register the kill-switch SW so any client still controlled by an old SW
  // picks up the self-destructing one on next navigation.
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    });
  }
}
