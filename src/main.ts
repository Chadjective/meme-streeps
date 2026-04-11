import './style.css';
import { getRandomQuote, type Quote } from './quotes';
import { getRandomImage } from './images';
import { renderMemeCard, resetCard, flipCard, unflipCard, isFlipped } from './meme-card';
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

  const quote = getRandomQuote();
  const image = getRandomImage();
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

// Register service worker (production only — dev caches cause stale assets)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed, app still works
      });
    });
  } else {
    // In dev, make sure no stale SW is hanging around
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }
}
