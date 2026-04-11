const SHAKE_THRESHOLD = 25;
const COOLDOWN_MS = 1500;

let lastShakeTime = 0;
let lastAcc = { x: 0, y: 0, z: 0 };
let shakeCallback: (() => void) | null = null;

function handleMotion(e: DeviceMotionEvent) {
  const acc = e.accelerationIncludingGravity;
  if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

  const delta =
    Math.abs(acc.x - lastAcc.x) +
    Math.abs(acc.y - lastAcc.y) +
    Math.abs(acc.z - lastAcc.z);

  lastAcc = { x: acc.x, y: acc.y, z: acc.z };

  if (delta > SHAKE_THRESHOLD) {
    const now = Date.now();
    if (now - lastShakeTime > COOLDOWN_MS) {
      lastShakeTime = now;
      shakeCallback?.();
    }
  }
}

async function requestIOSPermission(): Promise<boolean> {
  const DME = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof DME.requestPermission === 'function') {
    try {
      const result = await DME.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  return true; // Non-iOS, no permission needed
}

export async function initShake(onShake: () => void): Promise<void> {
  shakeCallback = onShake;

  const permissionState = localStorage.getItem('meme-streeps-motion-permission');

  if (permissionState === 'granted') {
    window.addEventListener('devicemotion', handleMotion);
    return;
  }

  const needsPermission =
    typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';

  if (needsPermission && permissionState !== 'denied') {
    // Show iOS modal
    const modal = document.getElementById('motion-modal')!;
    const allowBtn = document.getElementById('motion-allow')!;
    modal.hidden = false;

    allowBtn.addEventListener('click', async () => {
      const granted = await requestIOSPermission();
      modal.hidden = true;
      if (granted) {
        localStorage.setItem('meme-streeps-motion-permission', 'granted');
        window.addEventListener('devicemotion', handleMotion);
      } else {
        localStorage.setItem('meme-streeps-motion-permission', 'denied');
      }
    });
  } else if (!needsPermission) {
    // Android/desktop — just listen
    window.addEventListener('devicemotion', handleMotion);
  }
}
