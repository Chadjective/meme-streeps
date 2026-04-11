import { splitMemeText, STREEP_REGEX } from './meme-card';
import type { GalleryEntry } from './gallery';

type RenderOpts = {
  width: number;
  height: number;
};

const DEFAULTS: RenderOpts = { width: 1080, height: 1350 };
const GOLD = '#D4AF37';
const WHITE = '#FFFFFF';
const SMOKE = '#141414';
const WHITE_MUTED = 'rgba(255, 255, 255, 0.5)';

const TEXT_PADDING_X = 60;
const TEXT_PADDING_Y = 40;
const ATTRIBUTION_HEIGHT_RATIO = 0.12;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Test a token against the Streep regex without consuming global regex state.
 */
function isGoldToken(token: string): boolean {
  // Reset lastIndex because STREEP_REGEX is global
  STREEP_REGEX.lastIndex = 0;
  return STREEP_REGEX.test(token);
}

/**
 * Greedy word-wrap using measureText with given font.
 */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draw a single line with per-token coloring (gold for Streep/Meryl tokens).
 * Applies black outline and white glow.
 */
function drawLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  centerX: number,
  y: number,
  fontSize: number
): void {
  // Tokenize preserving whitespace/punctuation
  const tokens = line.split(/(\s+)/);

  // Measure total width to center the line
  const widths = tokens.map((t) => ctx.measureText(t).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  let x = centerX - totalWidth / 2;

  // Outline settings
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(3, fontSize * 0.11);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // First pass: draw outlines (no shadow for outline to avoid blur)
  ctx.save();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  let xCursor = x;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.trim()) {
      ctx.strokeText(t, xCursor, y);
    }
    xCursor += widths[i];
  }
  ctx.restore();

  // Second pass: draw fills with glow, per-token color
  xCursor = x;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.trim()) {
      const gold = isGoldToken(t);
      ctx.save();
      if (gold) {
        ctx.fillStyle = GOLD;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.55)';
        ctx.shadowBlur = fontSize * 0.35;
      } else {
        ctx.fillStyle = WHITE;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = fontSize * 0.3;
      }
      ctx.fillText(t, xCursor, y);
      ctx.restore();
    }
    xCursor += widths[i];
  }
}

function computeFontSize(text: string, height: number): number {
  const base = height * 0.058;
  if (text.length > 160) return base * 0.55;
  if (text.length > 120) return base * 0.65;
  if (text.length > 70) return base * 0.82;
  return base;
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  maxWidth: number,
  anchor: 'top' | 'bottom',
  topY: number,
  bottomY: number
): void {
  if (!text) return;

  const imageHeight = bottomY - topY;
  const fontSize = computeFontSize(text, imageHeight);
  const lineHeight = fontSize * 1.15;
  const fontString = `900 ${fontSize}px Impact, "Arial Black", "Oswald", sans-serif`;

  ctx.font = fontString;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left'; // drawLine handles manual centering

  const lines = wrapLines(ctx, text.toUpperCase(), maxWidth);

  // Recompute font if total height exceeds available space (split between top/bottom)
  const maxBlockHeight = imageHeight * 0.42;
  let scaled = fontSize;
  if (lines.length * lineHeight > maxBlockHeight) {
    scaled = fontSize * (maxBlockHeight / (lines.length * lineHeight));
    ctx.font = `900 ${scaled}px Impact, "Arial Black", "Oswald", sans-serif`;
  }
  const scaledLineHeight = scaled * 1.15;
  const relines = wrapLines(ctx, text.toUpperCase(), maxWidth);

  let y: number;
  if (anchor === 'top') {
    y = topY + TEXT_PADDING_Y;
  } else {
    // bottom-anchored
    y = bottomY - TEXT_PADDING_Y - relines.length * scaledLineHeight + scaled * 0.15;
  }

  for (const line of relines) {
    drawLine(ctx, line, centerX, y, scaled);
    y += scaledLineHeight;
  }
}

function drawAttributionBar(
  ctx: CanvasRenderingContext2D,
  attribution: string,
  width: number,
  barTop: number,
  barHeight: number
): void {
  ctx.fillStyle = SMOKE;
  ctx.fillRect(0, barTop, width, barHeight);

  const fontSize = barHeight * 0.32;
  ctx.font = `${fontSize}px "Courier New", "Courier", monospace`;
  ctx.fillStyle = WHITE_MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillText(`— ${attribution}`, width / 2, barTop + barHeight / 2);
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const fontSize = height * 0.018;
  ctx.font = `700 ${fontSize}px "Oswald", Impact, sans-serif`;
  ctx.fillStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  const padding = height * 0.012;
  ctx.fillText('MEME STREEPS', width - padding, height - padding);
}

/**
 * Renders a meme to an off-screen canvas and returns a PNG Blob.
 * Target: 1080 × 1350 (Instagram portrait 4:5).
 */
export async function renderMemeToCanvas(
  entry: Pick<GalleryEntry, 'quoteText' | 'attribution' | 'imageUrl'>,
  opts: Partial<RenderOpts> = {}
): Promise<Blob> {
  const { width, height } = { ...DEFAULTS, ...opts };

  // Wait for fonts (best-effort)
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading errors
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Paint background
  ctx.fillStyle = SMOKE;
  ctx.fillRect(0, 0, width, height);

  // 2. Load and draw image (cover-fit into top region, reserving bottom for attribution)
  const attributionHeight = Math.round(height * ATTRIBUTION_HEIGHT_RATIO);
  const imageTop = 0;
  const imageBottom = height - attributionHeight;
  const imageAreaH = imageBottom - imageTop;

  try {
    const img = await loadImage(entry.imageUrl);
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(width / iw, imageAreaH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (width - dw) / 2;
    const dy = imageTop + (imageAreaH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } catch {
    // Fallback gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#141414');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, imageBottom);
  }

  // 3. Draw meme text (split top/bottom using the same logic as the card)
  const { top, bottom } = splitMemeText(entry.quoteText);
  const maxTextWidth = width - TEXT_PADDING_X * 2;

  if (top) {
    drawTextBlock(ctx, top, width / 2, maxTextWidth, 'top', imageTop, imageBottom);
  }
  if (bottom) {
    drawTextBlock(ctx, bottom, width / 2, maxTextWidth, 'bottom', imageTop, imageBottom);
  }

  // 4. Attribution bar
  drawAttributionBar(ctx, entry.attribution, width, imageBottom, attributionHeight);

  // 5. Watermark
  drawWatermark(ctx, width, height);

  // 6. Export
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas export failed'));
      },
      'image/png',
      0.95
    );
  });
}
