import sharp from 'sharp';
import { readdir, stat, unlink, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'public', 'images');
const MAX_WIDTH = 800;
const JPEG_QUALITY = 78;

async function optimize() {
  const files = await readdir(IMAGES_DIR);
  const originals = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

  console.log(`Found ${originals.length} images to optimize`);

  let index = 1;
  for (const file of originals.sort()) {
    const src = join(IMAGES_DIR, file);
    const srcStat = await stat(src);
    const srcKb = Math.round(srcStat.size / 1024);

    // Rename sequentially
    const paddedIdx = String(index).padStart(2, '0');
    const tmpOut = join(IMAGES_DIR, `_tmp-streep-${paddedIdx}.jpg`);
    const finalOut = join(IMAGES_DIR, `streep-${paddedIdx}.jpg`);

    await sharp(src)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(tmpOut);

    const outStat = await stat(tmpOut);
    const outKb = Math.round(outStat.size / 1024);

    // Remove original and rename
    await unlink(src);
    await rename(tmpOut, finalOut);

    console.log(`  ${file} (${srcKb}KB) -> streep-${paddedIdx}.jpg (${outKb}KB)`);
    index++;
  }

  console.log('Done.');
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
