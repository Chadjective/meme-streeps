export type VoteDirection = 'streets_ahead' | 'for_the_streets';
export type SwipeCallbacks = {
  onVote: (direction: VoteDirection) => void;
  onFlip: () => void;
  onUnflip: () => void;
  isFlipped: () => boolean;
};

const VOTE_THRESHOLD = 70;
const FLIP_THRESHOLD = 60;
const LOCK_THRESHOLD = 10;
const ROTATION_FACTOR = 0.06;
const DOUBLE_TAP_DELAY = 300;

export function initSwipe(cardEl: HTMLElement, callbacks: SwipeCallbacks): void {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  let axis: 'h' | 'v' | null = null;
  let lastTapTime = 0;

  const badgeLeft = cardEl.querySelector('.swipe-badge--left') as HTMLElement;
  const badgeRight = cardEl.querySelector('.swipe-badge--right') as HTMLElement;

  function onStart(x: number, y: number) {
    if (cardEl.classList.contains('exit-left') || cardEl.classList.contains('exit-right')) return;
    isDragging = true;
    axis = null;
    startX = x;
    startY = y;
    currentX = 0;
    currentY = 0;
    cardEl.classList.add('dragging');
  }

  function onMove(x: number, y: number) {
    if (!isDragging) return;
    const dx = x - startX;
    const dy = y - startY;

    if (!axis) {
      if (Math.abs(dx) > LOCK_THRESHOLD) axis = 'h';
      else if (Math.abs(dy) > LOCK_THRESHOLD) axis = 'v';
      else return;
    }

    if (axis === 'h' && !callbacks.isFlipped()) {
      currentX = dx;
      const rotation = dx * ROTATION_FACTOR;
      cardEl.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;

      // Badge opacity
      if (dx < -10 && badgeLeft) {
        badgeLeft.style.opacity = String(Math.min(Math.abs(dx) / VOTE_THRESHOLD, 1));
      } else if (badgeLeft) {
        badgeLeft.style.opacity = '0';
      }

      if (dx > 10 && badgeRight) {
        badgeRight.style.opacity = String(Math.min(dx / VOTE_THRESHOLD, 1));
      } else if (badgeRight) {
        badgeRight.style.opacity = '0';
      }
    } else if (axis === 'v') {
      currentY = dy;
    }
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    cardEl.classList.remove('dragging');

    if (badgeLeft) badgeLeft.style.opacity = '0';
    if (badgeRight) badgeRight.style.opacity = '0';

    if (axis === 'h' && !callbacks.isFlipped()) {
      if (currentX < -VOTE_THRESHOLD) {
        callbacks.onVote('for_the_streets');
        return;
      } else if (currentX > VOTE_THRESHOLD) {
        callbacks.onVote('streets_ahead');
        return;
      }
      // Snap back
      cardEl.classList.add('snapping');
      cardEl.addEventListener('animationend', function handler() {
        cardEl.classList.remove('snapping');
        cardEl.style.transform = '';
        cardEl.removeEventListener('animationend', handler);
      });
    } else if (axis === 'v') {
      if (currentY < -FLIP_THRESHOLD && !callbacks.isFlipped()) {
        callbacks.onFlip();
      } else if (currentY > FLIP_THRESHOLD && callbacks.isFlipped()) {
        callbacks.onUnflip();
      }
    }

    cardEl.style.transform = '';
    axis = null;
  }

  // Double-tap detection
  cardEl.addEventListener('click', (e) => {
    const now = Date.now();
    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      if (callbacks.isFlipped()) {
        callbacks.onUnflip();
      } else {
        callbacks.onFlip();
      }
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  });

  // Touch events
  cardEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });

  cardEl.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
    if (axis === 'h') e.preventDefault();
  }, { passive: false });

  cardEl.addEventListener('touchend', () => onEnd());

  // Mouse events (desktop fallback)
  cardEl.addEventListener('mousedown', (e) => {
    onStart(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e) => {
    onMove(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', () => onEnd());
}
