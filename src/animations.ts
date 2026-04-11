export function playShakeAnimation(cardEl: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    cardEl.classList.add('shaking');
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      cardEl.classList.remove('shaking');
      resolve();
    };
    cardEl.addEventListener('animationend', function handler() {
      cardEl.removeEventListener('animationend', handler);
      done();
    });
    // Fallback in case animationend doesn't fire
    setTimeout(done, 700);
  });
}

export function playCardExit(cardEl: HTMLElement, direction: 'left' | 'right'): Promise<void> {
  return new Promise((resolve) => {
    const cls = direction === 'left' ? 'exit-left' : 'exit-right';
    cardEl.classList.add(cls);
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
    cardEl.addEventListener('animationend', function handler() {
      cardEl.removeEventListener('animationend', handler);
      done();
    });
    setTimeout(done, 500);
  });
}

export function playEdgeFlash(side: 'left' | 'right'): void {
  const el = document.querySelector(`.edge-flash--${side}`) as HTMLElement;
  if (!el) return;
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
  el.addEventListener('animationend', () => el.classList.remove('active'), { once: true });
  // Fallback
  setTimeout(() => el.classList.remove('active'), 500);
}
