// ---------------------------------------------------------------------------
// V1 — Meryl Streep image pool (kept so existing V1 quote cards still work)
// ---------------------------------------------------------------------------
const IMAGE_PATHS = [
  '/images/streep-01.jpg',
  '/images/streep-02.jpg',
  '/images/streep-03.jpg',
  '/images/streep-04.jpg',
  '/images/streep-05.jpg',
  '/images/streep-06.jpg',
  '/images/streep-07.jpg',
  '/images/streep-08.jpg',
  '/images/streep-09.jpg',
  '/images/streep-10.jpg',
  '/images/streep-11.jpg',
  '/images/streep-12.jpg',
  '/images/streep-13.jpg',
  '/images/streep-14.jpg',
  '/images/streep-15.jpg',
];

let lastImageIndex = -1;

export function getRandomImage(): string {
  if (IMAGE_PATHS.length === 0) return '';
  let index: number;
  do {
    index = Math.floor(Math.random() * IMAGE_PATHS.length);
  } while (index === lastImageIndex && IMAGE_PATHS.length > 1);
  lastImageIndex = index;
  return IMAGE_PATHS[index];
}

export function hasImages(): boolean {
  return IMAGE_PATHS.length > 0;
}

// ---------------------------------------------------------------------------
// V2 — Christopher Walken image pool + per-entry mapping
// ---------------------------------------------------------------------------

/** Shared Walken pool — randomly assigned to any entry without an explicit match. */
const WALKEN_POOL = [
  '/images/walken-01.jpg',
  '/images/walken-02.jpg',
  '/images/walken-03.jpg',
  '/images/walken-04.jpg',
  '/images/walken-05.jpg',
  '/images/walken-06.jpg',
  '/images/walken-07.jpg',
  '/images/walken-08.jpg',
  '/images/walken-09.jpg',
  '/images/walken-10.jpg',
  '/images/walken-11.jpg',
  '/images/walken-12.jpg',
  '/images/walken-13.jpg',
];

/**
 * Per-entry image matches. Source of truth: data/walken/_image_mapping.json.
 * Keep in sync when new images land in public/images/.
 */
const WALKEN_ENTRY_IMAGES: Record<string, string> = {
  'walk-024': '/images/walk-024.jpg', // Walking on eggshells
  'walk-040': '/images/walk-040.jpg', // Walk in love (dance leap)
  'walk-043': '/images/walk-043.jpg', // Peter walked on water (clouds & door)
  'walk-049': '/images/walk-049.jpg', // Devil walks as a roaring lion
  'walk-074': '/images/walk-074.jpg', // Walkening encyclopedia (floating books)
  'walk-077': '/images/walk-077.jpg', // Walken with Kings (crowned throne)
  'walk-094': '/images/walk-094.jpg', // Went out for a walk till sundown (forest)
  'walk-101': '/images/walk-101.jpg', // Walken the earth (Matrix corridor)
};

let lastWalkenIndex = -1;

/**
 * Returns an image URL for a Walken quote entry.
 *  - If the entry has a specific matched image, return it.
 *  - Otherwise return a random image from the shared pool (no two in a row).
 */
export function getWalkenImage(entryId?: string): string {
  if (entryId && WALKEN_ENTRY_IMAGES[entryId]) {
    return WALKEN_ENTRY_IMAGES[entryId];
  }
  if (WALKEN_POOL.length === 0) return '';
  let index: number;
  do {
    index = Math.floor(Math.random() * WALKEN_POOL.length);
  } while (index === lastWalkenIndex && WALKEN_POOL.length > 1);
  lastWalkenIndex = index;
  return WALKEN_POOL[index];
}

export function hasWalkenImages(): boolean {
  return WALKEN_POOL.length > 0 || Object.keys(WALKEN_ENTRY_IMAGES).length > 0;
}

export function hasWalkenImageFor(entryId: string): boolean {
  return entryId in WALKEN_ENTRY_IMAGES;
}
