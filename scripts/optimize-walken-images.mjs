#!/usr/bin/env node
/**
 * Reads data/walken/_image_mapping.json and for each mapping:
 *  1. Reads the source PNG from source_dir
 *  2. Resizes to MAX_WIDTH (keeps aspect ratio; no enlargement)
 *  3. Encodes as optimized JPEG (mozjpeg quality 78)
 *  4. Writes to public/images/<target>
 *
 * Idempotent: re-running overwrites existing targets. Safe to add new mappings
 * to the JSON and re-run.
 *
 * Usage: node scripts/optimize-walken-images.mjs
 */
import sharp from 'sharp';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAPPING_PATH = join(ROOT, 'data', 'walken', '_image_mapping.json');
const MAX_WIDTH = 800;
const JPEG_QUALITY = 78;

function resolveRelative(root, p) {
  return isAbsolute(p) ? p : join(root, p);
}

const mapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
const sourceDir = resolveRelative(ROOT, mapping.source_dir);
const targetDir = resolveRelative(ROOT, mapping.target_dir);

if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

console.log('Source : ' + sourceDir);
console.log('Target : ' + targetDir);
console.log('Images : ' + mapping.mappings.length);
console.log('');

let ok = 0;
let skipped = 0;
let failed = 0;

for (const m of mapping.mappings) {
  const src = join(sourceDir, m.source);
  const dst = join(targetDir, m.target);

  if (!existsSync(src)) {
    console.log('SKIP (missing source): ' + m.source);
    skipped++;
    continue;
  }

  try {
    const srcKb = Math.round(statSync(src).size / 1024);
    await sharp(src)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(dst);
    const outKb = Math.round(statSync(dst).size / 1024);

    const tag = m.entry_id ? '[' + m.entry_id + ']' : '[pool]';
    console.log(`${tag.padEnd(12)} ${m.source} (${srcKb}KB) -> ${m.target} (${outKb}KB)`);
    ok++;
  } catch (err) {
    console.log('FAIL ' + m.source + ' -> ' + m.target + ': ' + err.message);
    failed++;
  }
}

console.log('');
console.log('Summary: ' + ok + ' ok, ' + skipped + ' skipped, ' + failed + ' failed');
