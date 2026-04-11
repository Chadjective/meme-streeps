import type { VoteDirection } from './swipe';

const GALLERY_KEY = 'meme-streeps-gallery';
const GALLERY_VERSION_KEY = 'meme-streeps-gallery-v';
const CURRENT_VERSION = 1;
const MAX_ENTRIES = 200;

export interface GalleryEntry {
  id: string;
  quoteId: string;
  quoteText: string;      // streepified version displayed on card
  originalText: string;   // original quote (for share caption)
  attribution: string;
  imageUrl: string;
  vote: VoteDirection;
  votedAt: number;
}

function ensureVersion(): void {
  const v = localStorage.getItem(GALLERY_VERSION_KEY);
  if (v !== String(CURRENT_VERSION)) {
    localStorage.setItem(GALLERY_VERSION_KEY, String(CURRENT_VERSION));
  }
}

function readGallery(): GalleryEntry[] {
  ensureVersion();
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGallery(entries: GalleryEntry[]): void {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('[MemeStreeps] Gallery write failed (quota?):', err);
  }
}

/**
 * Add a new gallery entry. Newest-first ordering. Dedupes by quoteId
 * (if user revisits a quote they already rated, we keep the original entry).
 * Caps at MAX_ENTRIES with FIFO eviction of oldest.
 */
export function addGalleryEntry(
  entry: Omit<GalleryEntry, 'id' | 'votedAt'>
): GalleryEntry {
  const entries = readGallery();

  // Dedupe — if this quote already exists, return the existing entry
  const existing = entries.find((e) => e.quoteId === entry.quoteId);
  if (existing) return existing;

  const newEntry: GalleryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    votedAt: Date.now(),
  };

  // Newest-first
  const next = [newEntry, ...entries];

  // Cap at MAX_ENTRIES (drop oldest from the tail)
  const capped = next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next;

  writeGallery(capped);
  return newEntry;
}

export function getGalleryEntries(): GalleryEntry[] {
  return readGallery();
}

export function getGalleryEntry(id: string): GalleryEntry | undefined {
  return readGallery().find((e) => e.id === id);
}

export function getGalleryCount(): number {
  return readGallery().length;
}

export function clearGallery(): void {
  localStorage.removeItem(GALLERY_KEY);
}
