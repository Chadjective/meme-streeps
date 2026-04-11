import { renderMemeToCanvas } from './canvas-meme';
import type { GalleryEntry } from './gallery';

function buildCaption(entry: Pick<GalleryEntry, 'quoteText' | 'attribution'>): string {
  return `"${entry.quoteText}"\n— ${entry.attribution}\n\nvia Meme Streeps`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Share a meme as a PNG via Web Share API.
 * Falls back to downloading the file + copying caption to clipboard.
 */
export async function shareMeme(
  entry: Pick<GalleryEntry, 'quoteText' | 'attribution' | 'imageUrl' | 'id'>
): Promise<void> {
  const blob = await renderMemeToCanvas(entry as GalleryEntry);
  const filename = `meme-streeps-${entry.id || Date.now()}.png`;
  const file = new File([blob], filename, { type: 'image/png' });
  const caption = buildCaption(entry);

  // Try Web Share API with file support
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const shareData: ShareData = {
      files: [file],
      text: caption,
      title: 'Meme Streeps',
    };
    if (nav.canShare(shareData)) {
      try {
        await nav.share(shareData);
        return;
      } catch (err) {
        // User cancelled — no fallback needed
        if ((err as Error).name === 'AbortError') return;
        // Other errors: fall through to download
      }
    }
  }

  // Desktop fallback: download PNG + copy caption
  triggerDownload(blob, filename);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(caption).catch(() => {
      // Clipboard can fail silently; download already succeeded
    });
  }
}
